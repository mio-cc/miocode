# C.03.04 声明式节点格式

| 项 | 内容 |
|---|---|
| 编号 | C.03.04 |
| 类型 | 实施 |
| 上级 | C.03 节点定义 NodeDef |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引15 D7 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义四种声明式扩展节点的写法：不写代码，用 YAML 描述一个新节点。

## 2. 核心规则：声明式节点是"宏"
- **C.03.04-R1** 声明式节点在**冻结运行快照时**展开成由原子节点组成的子图，运行时只执行原子节点。
- 这样做的原因：
  1. 保证"只有 Agent 节点调用模型"（INV-05）、"所有工具调用都经过授权"（INV-09）不被扩展绕过。
  2. 运行路径、事件、授权、回放都和原子节点完全一致，不需要为扩展节点另写一套。
- **C.03.04-R2** 展开是确定性的：同一个 NodeDef 版本、同一组参数，展开结果完全相同（节点 ID 由 `父节点 ID + 模板内序号` 派生，算法见 `E.04`）。
- **C.03.04-R3** 在画布上，声明式节点显示为一个普通节点，不显示内部；运行详情里可以展开查看（只读）。

## 3. 四种写法
### 3.1 prompt：一次模型调用
```yaml
name: 翻译
version: "1.0"
kind: extension
category: 扩展
description: 把输入文本翻译成目标语言
impl:
  type: prompt
  rolecard: 翻译员@1          # 可选：角色卡（C.13.02）
  recipe: 翻译配方@1          # 可选：配方（C.13.01）；缺省用 "单输入直传" 内置配方
  template: |                 # 可选：没有角色卡时用的提示词模板，变量用 {{参数名}} / {{inputs.端口名}}
    把下面的内容翻译成{{target_lang}}，只输出译文。
    {{inputs.text}}
  output_schema: 译文@1
ports:
  inputs:
    text:   { type: 任意, required: true }
    model:  { type: 资源引用@1, required: true }
  outputs:
    result: { type: 译文@1 }
params:
  target_lang: { type: enum, label: 目标语言, enum: [英文, 日文, 中文], default: 英文, ui: { group: 常用 } }
```
**展开为**：`上下文装配`（配方）→ `Agent`（角色卡 / 模板、output_schema）。外部的 `model` 端口接到两者的 `model`。

### 3.2 http：一次 HTTP 调用
```yaml
name: 汇率查询
version: "1.0"
kind: extension
category: 工具
impl:
  type: http
  risk: L0                    # 必填：L0–L3（S.04）
  method: GET
  url: "https://api.example.com/rate?from={{from}}&to={{to}}"
  headers:
    Authorization: "Bearer {{secret:example_api}}"   # 只能用密钥名（C.03.02-R3）
  body: null
  response:
    map: "$.data.rate"        # JSONPath，取出的值作为 result
    result_type: 数值@1
  timeout_ms: 10000
ports:
  inputs:  { trigger: { type: 任意 } }
  outputs: { result: { type: 数值@1 } }
params:
  from: { type: string, label: 源币种, default: USD, ui: { group: 常用 } }
  to:   { type: string, label: 目标币种, default: CNY, ui: { group: 常用 } }
```
**展开为**：一个 `工具` 节点，`tool` 参数指向内核根据这份声明自动注册的工具 `ext:<包名>/汇率查询`。这个工具的风险等级取 `impl.risk`，URL 的主机名自动加入该工具的出站白名单（`S.07`）。

### 3.3 mcp：调用一个 MCP 工具
```yaml
name: 查询工单
version: "1.0"
kind: extension
category: 工具
impl:
  type: mcp
  server: jira                # 设置里配置的 MCP 服务器名
  tool: search_issues
  risk: L0                    # 必须 ≥ 服务器声明的风险等级；服务器没声明时必填
  args:                       # 参数映射，值可以引用 {{参数名}} 和 {{inputs.端口名}}
    jql: "project = {{project}} AND status = Open"
ports:
  inputs:  { trigger: { type: 任意 } }
  outputs: { result: { type: 任意 } }
params:
  project: { type: string, label: 项目, default: HX }
```
**展开为**：一个 `工具` 节点，`tool` 参数为 `mcp:jira/search_issues`。

自动接入的 MCP 工具不用这种写法：它们是工具节点的预设，参数按工具的 inputSchema 展开（`C.15-R2`、`C.03.02` §5）。mcp 声明式节点用于手工整理：改参数名、只露出一部分参数、固定其余参数的值。

### 3.4 subgraph：把一段子图打包成节点类型
```yaml
name: 生成与评审
version: "1.0"
kind: extension
category: 扩展
impl:
  type: subgraph
  ref: { name: 生成-评审, version: "1.0.0" }   # 子图库里的子图
  expose:                     # 把子图内部参数提升到节点上
    rounds: { node: 01JDN0000000000000000000B4, param: max_rounds }
ports:                        # 必须和子图入口 / 出口端口节点一致（V05）
  inputs:  { in:  { type: 任意 } }
  outputs: { out: { type: 方案@1 } }
params:
  rounds: { type: integer, label: 评审轮数, default: 2, min: 1, max: 5, ui: { group: 常用 } }
```
**展开为**：一个 `子图引用` 节点，`ref` 按 `pin: snapshot` 固定。

## 4. 规则
- **C.03.04-R4** 模板变量只能是 `{{参数名}}`、`{{inputs.端口名}}`、`{{secret:密钥名}}`。`secret:` 只能出现在 http 的 `headers` 和 `url` 的查询参数里，不能出现在 prompt 模板里（防止密钥进模型上下文，INV-22）。
- **C.03.04-R5** http、mcp 的 `risk` 必填；不允许声明比实际更低的风险（mcp 由服务器声明兜底；http 的 `POST/PUT/PATCH/DELETE` 方法最低 L2）。
- **C.03.04-R6** 编程式扩展节点（Go 实现 `Executor`）使用 `impl.type: builtin` 和 `impl.entry: <注册名>`，必须编译进程序；v1 不支持运行时加载 Go 代码，也不支持 Python / Node 脚本节点（旧文档的 `script` 类型取消，`P.09` K17）。

## 5. 验收标准
1. 4 个示例 YAML 都通过校验，展开结果是只包含原子节点的子图，并通过图校验。
2. prompt 模板里写 `{{secret:x}}` 时注册失败。
3. http `method: POST` 且 `risk: L0` 时注册失败。
4. 同一参数展开两次，得到的子图节点 ID 和内容完全相同。

### 实施卡
- 要建 / 要改的文件：`schema/nodedef.schema.json`、`schema/examples/nodedefs/翻译.json`、`schema/examples/nodedefs/汇率查询.json`、`schema/examples/nodedefs/查询工单.json`、`schema/examples/nodedefs/生成与评审.json`、`schema/examples/manifest.yaml`、`tools/schemacheck/impl_test.go`
- 示例文件用 JSON 写（示例清单只收 `.json`，`C.01-R22`），内容与 §3 的 YAML 一一对应，登记进 `manifest.yaml`（schema 为 `nodedef.schema.json`）
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0304-T1 四种写法`：§3 的 4 个示例都通过 `nodedef.schema.json`；`Impl` 按 `type` 判别（`oneOf` + `const`），子结构按 §3
  - `C0304-T2 Impl 反例`：http 缺 `risk`、http 用 `POST` 而 `risk` 为 `L0`（R5）、mcp 缺 `server`、subgraph 缺 `ref` 时校验失败（测试里内联）
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 展开成只含原子节点的子图并通过图校验、同一参数展开两次结果相同、prompt 模板里引用密钥时注册失败（§5 验收 1、2、4）：`E04-T6`（`E.04`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 示例里的 `inline: true` 改为 `ui: { group: 常用 }`；说明自动接入的 MCP 工具不走 mcp 写法；实施卡按 `G.02.06-R24` 重写，示例改用 JSON 文件 | `P.09` K211、K212 |
| 2026-11-23 | 状态改为"已审"：第 3 片（`m0-contract-2`）开工前复查完成（用户授权设计方自主裁决，2026-11-23 15:00） | `G.02.01-R2`；`P.09` K210 |
