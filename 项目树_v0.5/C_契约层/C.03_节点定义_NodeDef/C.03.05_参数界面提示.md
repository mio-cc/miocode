# C.03.05 参数界面提示

| 项 | 内容 |
|---|---|
| 编号 | C.03.05 |
| 类型 | 实施 |
| 上级 | C.03 节点定义 NodeDef |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | demo v0.5.2 |
| 最后修改 | 2026-11-23 |

## 1. 职责
在参数 schema（`C.03.02`）上增加界面提示字段，让节点上和右栏里的参数界面完全由声明生成；并规定"参数 ↔ 端口"的绑定关系（ComfyUI 的"控件可转为输入"做法）。

## 2. 不做什么
- 不规定控件长什么样（`U.10.07`、`U.11`）
- 不改变参数的取值和校验规则（`C.03.02`）

## 3. 继承的上级约束
`C.03.02`、`C.04`、INV-17（界面结构来自生成的类型）。

## 4. 接口
```json
"ParamUI": {
  "type": "object", "additionalProperties": false,
  "properties": {
    "group":     { "enum": ["常用", "高级"], "default": "高级", "description": "常用：显示在节点上；高级：只在右栏属性里" },
    "order":     { "type": "integer", "description": "同组内排序，小的在前" },
    "widget":    { "enum": ["auto", "input", "textarea", "stepper", "slider", "segmented", "select", "switch", "picker", "code", "model", "rolecard", "connection"], "default": "auto", "description": "auto 时按 C.03.02 §4 推出" },
    "rows":      { "type": "integer", "minimum": 2, "maximum": 12, "description": "textarea 的默认行数；节点上固定 3 行，右栏可拉高" },
    "placeholder": { "type": "string", "maxLength": 80 },
    "bind":      { "type": "string", "description": "同名输入端口。端口有连线时，参数显示为『由上游「X」提供』，运行时用上游的值" },
    "show_if":   { "type": "string", "description": "条件表达式（与分支节点同一套），为假时隐藏，如 kind == '提示词'" },
    "connection_type": { "type": "string", "description": "widget=connection 时可选的连接类型（C.16）" }
  }
}
```
NodeDef 的 `dynamic_ports`（定义在 `C.03.01`）从 `from_param` 指定的参数生成输入端口，有两种来源：文本参数按 `{{变量}}` 抽取，每个变量一个端口，类型取 `type`（缺省 `任意`），提示词节点用（资源节点 `kind=提示词`，`from_param: template`）；`schema_from` 对象参数按 `C.03.02` §5 每个子参数一个端口，工具节点用（`from_param: args`）。`help`（悬停提示）用 `ParamDef.help`，不在这里重复。

## 5. 行为
- **C.03.05-R1** 节点上最多显示 4 个"常用"参数；超出的自动降为"高级"并在校验里给提示（不报错）。
- **C.03.05-R2** `bind` 的端口必须在 NodeDef 的 `ports.inputs` 里声明，类型兼容参数类型。例外：文本参数可以绑定类型为 `资源引用@1` 的端口，运行时取上游提示词节点渲染出的文本（Agent 的 `instruction` ← `prompt`，`P.09` K213）。绑定后参数值保留，断开连线即恢复使用。
- **C.03.05-R3** 原来的"转为端口"（`promoted`，`C.02`）改名为"接线"，实现上等价于运行时给参数自动生成一个 `bind` 端口；两种写法并存，界面一致。
- **C.03.05-R4** `dynamic_ports` 生成的端口名：文本变量就是变量名，变量名只能是 `^[a-z_][a-z0-9_]*$`（与端口名同一规则，`C.02.03` §4），不合法的变量不生成端口，校验记 warn、渲染为空；`schema_from` 子参数按 `C.03.02-R8` 换算。变量改名、删除，或所选对象变化导致端口消失时，连到这些端口的连线随这次 `set_param` 一并删除，撤销时恢复（`C.05.02`、`C.05.03`）；v1 不做改名后自动迁移连线。
- **C.03.05-R5** Agent 节点参数的界面：`rolecard`（widget=rolecard，常用）、`instruction`（widget=textarea，常用，bind=prompt）、`output_schema`（常用）、`lifecycle`（常用），其余高级；参数本身见 `E.14.02`。
- **C.03.05-R6** 所有界面提示只影响显示，不进入执行；内核忽略它们（`E.03`）。

## 6. 不变量
- 同一份 NodeDef 在节点上、右栏、命令面板里生成的参数界面一致
- `bind` 端口有连线时，运行使用上游值

## 7. 错误处理
`show_if` 表达式不合法：诊断 V19（警告），按"显示"处理。

## 8. 验收标准
1. Agent、提示词、工具三个节点的参数界面全部由声明生成，无手写界面
2. 提示词里写 `{{a}} {{b}} {{a}}` 生成 2 个端口
3. 接线后参数格显示"由上游提供"，断开后恢复原值
4. 工具节点选中一个工具后，参数按 `C.03.02` §5 展开，每个子参数都能接线

### 实施卡
- 要建 / 要改的文件：`schema/nodedef.schema.json`、`tools/schemacheck/paramui_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0305-T1 ParamUI 定义`：字段与 §4 一致、`additionalProperties: false`；`widget` 的取值 = `widget_map.yaml` 用到的控件名 + `auto`、`connection`；`group` 只有 `常用`、`高级`
  - `C0305-T2 ParamUI 反例`：未知字段、`rows` 超出 2–12、`group` 写别的值时校验失败（测试里内联）
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 提示词变量 `{{a}} {{b}} {{a}}` 生成 2 个端口、`schema_from` 子参数的端口（§8 验收 2、4）：`E0302-T6`（`E.03.02`）
  - 节点上的控件由声明生成、超过 4 个常用参数降为高级（§8 验收 1、R1）：`W0610-T17`（`W.06.10`）
  - 属性页由声明生成、接线显示"由上游提供"（§8 验收 1、3）：`W0703-T22`（`W.07.03`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 实施卡里前端文件路径改为 `canvas/core/render/widgets.ts` 与 `panels/inspector/` | `P.09` K95：节点上的控件由画布引擎直接写 DOM（`W.01` §3.3），`canvas/params/*.tsx` 不在目录表里 |
| 2026-11-23 | `widget` 统一为 `C.03.02` §4 的控件名，去掉 `help`；`dynamic_ports` 改为两种来源、schema 移到 `C.03.01`；R2 加文本参数绑定提示词的例外；R4 去掉不存在的 Op `rename_dynamic_port`；R5 补 `lifecycle`；实施卡只留契约文件，前端归 `W.06.03`、`W.06.10`、`W.07.03`，后端动态端口归 `E.03.02` | `P.09` K212、K213、K214 |
| 2026-11-23 | 状态改为"已审"：第 3 片（`m0-contract-2`）开工前复查完成（用户授权设计方自主裁决，2026-11-23 15:00） | `G.02.01-R2`；`P.09` K210 |
| 2026-11-23 | R4：模板变量名必须符合端口名的写法 | `P.09` K223 |
| 2026-11-23 | 实施卡补上测试文件 `tools/schemacheck/paramui_test.go`（漏写会让 `relay check` ① 白名单不通过） | 第 3 片领取时发现；`G.02.06-R24` |
| 2026-11-23 | 提示词节点的动态端口来源改为 `template` 参数 | `P.09` K226 |
| 2026-11-23 | 状态改为"冻结"：第 3 片（`m0-contract-2`）squash 合并进代码仓库 `main`，提交 `2fd3c25a165e36565f95fa9b16fc3d22a0569ec6`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 14 条全部符合，两条"有疑问"由设计方裁决（`P.09` K226）、返工并复核；按 `G.08-R3` 由验证者合并 |
