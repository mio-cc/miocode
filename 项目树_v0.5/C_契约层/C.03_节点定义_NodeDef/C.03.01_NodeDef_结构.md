# C.03.01 NodeDef 结构

| 项 | 内容 |
|---|---|
| 编号 | C.03.01 |
| 类型 | 实施 |
| 上级 | C.03 节点定义 NodeDef |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引02 |
| 最后修改 | 2026-11-25 |

## 1. 职责
定义 NodeDef 的结构，并列出 13 个原子节点的端口签名（这是前后端、画布、校验器都要用的数据）。

## 2. 不做什么
- 参数的完整清单、默认值、取值范围写在各执行器文档里（`E.14.*`），并以 `schema/builtin/nodedefs/*.yaml` 为准。本文只列端口。
- 不定义执行行为。

## 3. 继承的上级约束
INV-01、INV-02、`C.03-R1`–`R3`。

## 4. 定义
```json
{
  "$id": "https://anydoor.local/schema/nodedef.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "version", "kind", "category", "impl", "ports", "params"],
  "additionalProperties": false,
  "properties": {
    "name":        { "type": "string", "minLength": 1, "maxLength": 60 },
    "version":     { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "kind":        { "enum": ["atomic", "extension"] },
    "category":    { "enum": ["资源", "智能体", "状态", "工具", "拓扑", "聚合", "控制", "人工", "边界", "扩展"] },
    "description": { "type": "string", "maxLength": 200 },
    "icon":        { "type": "string", "description": "图标名，取自 U.08 图标表；扩展节点缺省为 扩展" },
    "impl":        { "$ref": "#/$defs/Impl" },
    "ports": {
      "type": "object",
      "required": ["inputs", "outputs"],
      "additionalProperties": false,
      "properties": {
        "inputs":  { "type": "object", "additionalProperties": { "$ref": "#/$defs/PortDef" }, "propertyNames": { "pattern": "^[a-z_][a-z0-9_]*$" } },
        "outputs": { "type": "object", "additionalProperties": { "$ref": "#/$defs/PortDef" }, "propertyNames": { "pattern": "^[a-z_][a-z0-9_]*$" } }
      }
    },
    "params":      { "type": "object", "additionalProperties": { "$ref": "#/$defs/ParamDef" }, "propertyNames": { "pattern": "^[a-z_][a-z0-9_]*$" } },
    "type_vars":   { "type": "object", "additionalProperties": { "type": "string" },
                     "description": "类型变量的来源，如 {\"T\": \"param:output_schema\"}，见 C.04.03" },
    "container":   { "enum": ["none", "required", "one_of"], "default": "none", "description": "与 container_rules.yaml 一致，见 C.02.04" },
    "kernel_rules":{ "type": "array", "items": { "type": "string" }, "description": "内核强制规则的编号，只用于展示，如 INV-07" },
    "examples":    { "type": "array", "items": { "type": "string" } },
    "dynamic_ports": { "$ref": "#/$defs/DynamicPorts" }
  },
  "$defs": {
    "PortDef": {
      "type": "object",
      "required": ["type"],
      "additionalProperties": false,
      "properties": {
        "type":     { "$ref": "types.schema.json#/$defs/TypeRef" },
        "category": { "$ref": "types.schema.json#/$defs/Category", "description": "显示类别；缺省由 type 推出（C.04.01）" },
        "label":    { "type": "string", "maxLength": 20 },
        "required": { "type": "boolean", "default": false },
        "multi":    { "type": "boolean", "default": false, "description": "允许多条连线，见 C.04.04" },
        "dynamic":  { "type": "boolean", "default": false, "description": "动态插口 in[0]、in[1]…" },
        "stream":   { "type": "boolean", "default": false, "description": "支持流式片段，见 E.16" },
        "lock":     { "enum": ["none", "kernel"], "default": "none" }
      }
    },
    "DynamicPorts": {
      "type": "object",
      "required": ["from_param"],
      "additionalProperties": false,
      "description": "从一个参数生成输入端口（C.03.05-R4）：文本参数按 {{变量}} 抽取；schema_from 对象参数按 C.03.02 §5 每个子参数一个",
      "properties": {
        "from_param": { "type": "string", "pattern": "^[a-z_][a-z0-9_]*$" },
        "type":       { "$ref": "types.schema.json#/$defs/TypeRef", "default": "任意", "description": "只用于文本变量；schema_from 展开的端口一律 任意" },
        "max":        { "type": "integer", "minimum": 1, "maximum": 32, "default": 8 }
      }
    },
    "Impl": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "enum": ["builtin", "prompt", "http", "mcp", "subgraph"] }
      },
      "description": "builtin：Go 执行器（原子节点和编译进程序的编程式扩展节点）；其余四种见 C.03.04"
    }
  }
}
```
`ParamDef` 的定义见 `C.03.02`。

## 5. 规则
- **C.03.01-R1** `kind=atomic` 只能用于 13 个原子节点，并且只能出现在 `schema/builtin/nodedefs/`；扩展包里出现 `atomic` 时拒绝安装。
- **C.03.01-R2** 扩展节点的 `category` 只能是 `扩展`，或 13 个原子节点用过的分类之一（让扩展节点能放进节点库的同一分组）。
- **C.03.01-R3** 同一个 NodeDef 里，参数名不能和任何输入端口名、输出端口名重名（端口提升后参数名会变成输入端口名，`C.02.03-R6`）。输入端口和输出端口之间可以同名（如账本的 `value`）：连线总是从输出连到输入，`PortRef` 加上方向不会混淆（`P.09` K224）。
- **C.03.01-R4** 显示类别为 `ctx`、`tool`、`ref` 的输入端口（上下文包、工具端点、资源引用）类型必须严格匹配（`C.04.02`），NodeDef 不能放宽。
- **C.03.01-R5** 每个 NodeDef 最多 8 个输入端口、8 个输出端口（动态插口不计）。超过说明这个节点应该拆。

## 6. 13 个原子节点的端口签名
> 端口名、类型、类别是契约，前后端都按这张表实现。括号里 `多` = multi，`必` = required。

| 节点 | 分类 | 输入端口 | 输出端口 | 类型变量 | 容器 |
|---|---|---|---|---|---|
| 资源 | 资源 | —；`kind=提示词` 时模板里每个 `{{变量}}` 一个动态端口（`C.03.05`） | `ref`: 资源引用@1 · `items`: 列表[资源引用@1]（`kind=列表` 时每一项一个引用） | — | 否 |
| Agent | 智能体 | `context`: 上下文包@1（必）· `model`: 资源引用@1（必）· `prompt`: 资源引用@1 · `role`: 资源引用@1（角色卡）· `tools`: 工具端点@1（多） | `result`: $T | T ← `param:output_schema` | 否 |
| 上下文装配 | 状态 | `in`: 任意（多）· `model`: 资源引用@1 | `context`: 上下文包@1 · `dropped`: 列表[任意] | — | 否 |
| 工具 | 工具 | `request`: 任意 · 所选工具的每个入参一个动态端口（`C.03.02` §5） | `endpoint`: 工具端点@1 · `result`: $T | T ← `param:result_type`（缺省 任意） | 否 |
| 扇出 | 拓扑 | `items`: 列表[$T] · `shared`: 任意（多） | `results`: 列表[$U] | T ← `input:items.elem`，U ← `body:exit` | **必须** |
| 汇合 | 拓扑 | `in`: 任意（动态） | `collected`: 列表[任意] | — | 否 |
| 聚合 | 聚合 | `items`: 列表[$T] · `value`: 任意（单个结果：从参数 `list_field` 给出的字段取列表） | `result`: $U | T ← `input:items.elem \| field:value(list_field)`，U ← `op:op(T)` | 否 |
| 分支 | 控制 | `value`: $T（必） | `yes`: $T，类别 判定 · `no`: $T，类别 判定 | T ← `input:value` | 否 |
| 循环 | 控制 | `init`: $T | `final`: $T · `summary`: 简报@1 | T ← `input:init` | **必须** |
| 账本 | 状态 | `value`: 任意 | `value`: 状态@1 | — | 否 |
| 人工 | 人工 | `request`: $T（必） | `approved`: $T，类别 判定 · `rejected`: $T，类别 判定 | T ← `input:request` | 否 |
| 子图端口 | 边界 | `in`: $T | `out`: $T | T ← `input:in` | 否 |
| 子图引用 | 边界 | 由子图的 entry 端口节点决定 | 由子图的 exit / summary / escalation 端口节点决定 | 由子图推断 | **二选一** |

说明：
- 分支和人工的出口**传递输入的值**（被激活的那个出口带值，另一个不激活），显示类别为"判定"（`C.04.01`）。这修正了 demo 里"出口类型为判定、不带值"的写法（`P.09` K15）。
- 子图端口在父层不可见；它在子图内部的端口签名就是上表这一行。
- `简报@1`、`资源引用@1`、`上下文包@1`、`工具端点@1`、`状态@1` 是系统类型，定义在 `C.04.01`。

### 6.1 定义文件的写法（`P.09` K224）
`schema/builtin/nodedefs/<节点>.yaml` 按下面写，执行器文档（`E.14.*`）的参数表里写不进 `ParamDef` 的地方以这里为准：
- `impl` 写 `{type: builtin}`；端口的 `label` 用 `U.10.07` §1 的中文名（上下文、模型、指令、工具、结果……）；`icon` 先不写（图标名随 `U.08` 定稿）。
- `type_vars` 的值照 §6，写成字符串，如 `"input:items.elem"`；聚合的 `op:op(T)` 表示"算子取参数 `op` 的值"（`C.04.03` §2）。
- 汇合的 `in` 只写 `dynamic: true`：`multi` 和 `dynamic` 不能同时为 true（`C.04.04-R4`），每条连线本来就是一个插口。
- 资源节点的 `items` 端口标签"列表项"；聚合的 `value` 端口标签"单个结果"，参数 `list_field`：`type: string`，标签"列表字段"，`help` 写"接「单个结果」时从它的这个字段取列表，如 labels"，`ui.group: 常用`；聚合的 `items` 不再是必填（两种接法二选一，`P.09` K258）。
- 子图引用的 `ports` 写成两个空对象：它的端口由子图的端口节点决定（`C.02.04-R3`）。
- 值是列表的参数（循环的 `carry_fields`、人工的 `options`、子图引用的 `writeback`、聚合的 `levels`）：`type: object`，`schema` 写数组的 JSON Schema，`ui.widget: code`。`ParamDef` 没有列表类型。
- 资源节点的 `kind` 有五种：模型、提示词、角色卡、列表、常量（`P.09` K233）。`kind=角色卡` 时用 `rolecard_ref` 参数 `rolecard`（`ui.show_if: kind == '角色卡'`），输出的 `ref` 是 `名称@版本`。资源节点的 `value`：`type: object`（任意 JSON，按 `kind` 不同），`ui.show_if: kind != '提示词' && kind != '角色卡'`；提示词模板单独一个 `text` 参数 `template`，`ui.show_if: kind == '提示词'`，`dynamic_ports` 从它里面抽取 `{{变量}}`（`from_param: template`，`C.03.05-R4`）。这样写提示词用的是多行文本框，不是 JSON 编辑框（`P.09` K226）。
- 参数表"说明"里写着"某种方式下才用"的参数（如扇出 `k` 只在 `collect` 为 `k_of_n` 时用），写 `ui.show_if`，条件照说明写；表里没有这一列，以说明为准（`P.09` K226）。
- 参数表里默认值随别的东西变化的（工具的 `risk`"取工具声明"、Agent 的 `max_output_tokens`"模型默认"、子图端口的 `port_name`"in / out"）不写 `default`；人工的 `on_timeout` 可以是 `rejected`、`fail` 或某个选项，写成 `string`，缺省 `rejected`。
- 表里写"内联"的参数为 `ui.group: 常用`，按表中顺序；"kernel 锁"的参数写 `lock: kernel` 和 `C.03.03` §5 的默认值；Agent 的 `context` 端口写 `lock: kernel`（INV-07）；Agent 的 `rolecard` 参数写 `ui.bind: role`：`role` 端口（标签"角色卡"）接了角色卡资源节点时用上游的，没接时用参数；端口不叫 `rolecard`，因为参数名和端口名不能重名（R3）（同 `instruction` ← `prompt`，`P.09` K233）。

## 7. 验收标准
1. `schema/builtin/nodedefs/` 下 13 个 YAML 全部通过 `nodedef.schema.json` 校验，端口与 §6 表格一致（脚本比对）。
2. 扩展包里 `kind: atomic` 的 NodeDef 安装失败，错误码 `extension_invalid`。
3. 参数名和端口名重复的 NodeDef 注册失败。

### 实施卡
- 要建 / 要改的文件：`schema/nodedef.schema.json`、`schema/builtin/nodedefs/资源.yaml`、`schema/builtin/nodedefs/Agent.yaml`、`schema/builtin/nodedefs/上下文装配.yaml`、`schema/builtin/nodedefs/工具.yaml`、`schema/builtin/nodedefs/扇出.yaml`、`schema/builtin/nodedefs/汇合.yaml`、`schema/builtin/nodedefs/聚合.yaml`、`schema/builtin/nodedefs/分支.yaml`、`schema/builtin/nodedefs/循环.yaml`、`schema/builtin/nodedefs/账本.yaml`、`schema/builtin/nodedefs/人工.yaml`、`schema/builtin/nodedefs/子图端口.yaml`、`schema/builtin/nodedefs/子图引用.yaml`、`tools/schemacheck/nodedef_test.go`
- 定义文件的内容：端口按 §6；参数按对应执行器文档的参数表（`E.14.01`–`E.14.13`），表里写"内联"的参数为 `ui.group: 常用`（按表中顺序），"kernel 锁"的参数为 `lock: kernel`、默认值取 `C.03.03` §5；执行器文档没写全的参数，取 demo v0.5（`画布_demo_v0.5.html` 的 `HX.DEF`）里同名节点的参数，并在 `RELAY.md` 本条列出。资源节点声明 `dynamic_ports: {from_param: template}`，工具节点的 `args` 写 `schema_from: param:tool` 并声明 `dynamic_ports: {from_param: args}`。之后执行器叶子要改参数时只改自己那一份（`P.09` K215）
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0301-T1 定义文件校验`：13 个文件都通过 `nodedef.schema.json`；文件名与 `name` 相同；`kind` 都是 `atomic`
  - `C0301-T2 端口签名`：端口名、类型、`required`、`multi`、`dynamic` 与 §6 一致（对照表写在测试里，不另存数据文件）
  - `C0301-T3 定义内部一致`：输入端口、输出端口、参数三者不重名（R3）；输入、输出各不超过 8 个，动态端口不计（R5）；`container` 与 `container_rules.yaml` 一致；`type_vars` 与 §6 一致
  - `C0301-T4 内核锁参数`：`C.03.03` §5 表里的 5 个参数都是 `lock: kernel`，默认值与表一致
  - `C0301-T5 动态端口`：只有资源、工具声明 `dynamic_ports`，`from_param` 指向存在的参数
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 扩展包里 `kind: atomic` 的 NodeDef 安装失败（§7 验收 2）：`E04-T6`（`E.04`）
  - 参数名和端口名重复的扩展 NodeDef 注册失败（§7 验收 3）：`E0301-T7`（`E.03.01`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | schema 加 `dynamic_ports`（`DynamicPorts`）；R4 措辞；§6 资源、工具补动态端口；实施卡按 `G.02.06-R24` 重写：逐个写出 13 个定义文件，检查放 `tools/schemacheck/`，参数来源改为 `E.14.*` + demo v0.5 | `P.09` K213、K214、K215 |
| 2026-11-23 | 状态改为"已审"：第 3 片（`m0-contract-2`）开工前复查完成（用户授权设计方自主裁决，2026-11-23 15:00） | `G.02.01-R2`；`P.09` K210 |
| 2026-11-23 | R3 允许输入、输出端口同名；§6 汇合只写动态、聚合补 `T`；新增 §6.1 定义文件的写法 | 第 3 片实施 `C.03.01` 时发现；`P.09` K224 |
| 2026-11-23 | §6.1 资源节点的提示词模板改为单独的 `template` 参数（`dynamic_ports` 从它抽变量）；写明 `show_if` 的来源 | 第 3 片整片评审；`P.09` K226 |
| 2026-11-23 | 状态改为"冻结"：第 3 片（`m0-contract-2`）squash 合并进代码仓库 `main`，提交 `2fd3c25a165e36565f95fa9b16fc3d22a0569ec6`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 14 条全部符合，两条"有疑问"由设计方裁决（`P.09` K226）、返工并复核；按 `G.08-R3` 由验证者合并 |
| 2026-11-23 | 冻结后修改，状态改回"已审"：Agent 加 `role` 端口（标签"角色卡"，参数 `rolecard` 绑定它）；资源节点加 `kind=角色卡` 和 `rolecard` 参数 | 用户决定角色卡可以通过连线给 Agent（含对话入口的 Agent）；`P.09` K233（`G.02.06-R21`） |
| 2026-11-23 | 状态改为"冻结"：修复片（`m0-fix-entry`，`P.09` K233）squash 合并进代码仓库 `main`，提交 `c2574ee2723dde9a4c704435c2160a18af255aed`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 4 条全部符合；按 `G.08-R3` 由验证者合并 |
| 2026-11-25 | 冻结后修改，状态改回"已审"：§6 资源加输出 `items`（列表[资源引用@1]）；聚合加输入 `value` 和参数 `list_field`，`items` 不再必填，`T` 加备选来源；§6.1 写明标签和参数 | `P.09` K258（闭环模板三根单值接列表的线；`G.02.06-R21`） |
