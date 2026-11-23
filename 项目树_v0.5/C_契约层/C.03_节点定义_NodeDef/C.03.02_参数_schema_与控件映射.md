# C.03.02 参数 schema 与控件映射

| 项 | 内容 |
|---|---|
| 编号 | C.03.02 |
| 类型 | 实施 |
| 上级 | C.03 节点定义 NodeDef |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 设10 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义参数描述 `ParamDef`，以及每种参数在界面上用什么控件显示。前端根据这份映射自动生成属性面板和节点上的内联控件，不为每个节点类型手写界面。

## 2. 不做什么
- 不定义控件长什么样（`U.11`）、控件组件怎么实现（`W.08`）。

## 3. 定义（`nodedef.schema.json#/$defs/ParamDef`）
```json
{
  "type": "object",
  "required": ["type", "label"],
  "additionalProperties": false,
  "properties": {
    "type":       { "enum": ["integer", "number", "string", "text", "boolean", "enum", "type_ref", "recipe_ref", "rolecard_ref", "model_ref", "tool_ref", "expr", "object"] },
    "label":      { "type": "string", "maxLength": 20 },
    "help":       { "type": "string", "maxLength": 200 },
    "default":    {},
    "enum":       { "type": "array", "items": { "type": ["string", "number"] }, "minItems": 1 },
    "enum_labels":{ "type": "object", "additionalProperties": { "type": "string" }, "description": "枚举值 → 界面显示名" },
    "min":        { "type": "number" },
    "max":        { "type": "number" },
    "step":       { "type": "number" },
    "unit":       { "type": "string", "maxLength": 8, "description": "显示单位，如 s、%" },
    "max_length": { "type": "integer" },
    "schema":     { "type": "object", "description": "type=object 时的 JSON Schema" },
    "schema_from":{ "type": "string", "pattern": "^param:[a-z_][a-z0-9_]*$", "description": "type=object 时：结构取自另一个参数所选对象的入参 schema，如 param:tool，按 §5 展开" },
    "ui":         { "$ref": "#/$defs/ParamUI", "description": "界面提示：分组、控件、接线、条件显示（C.03.05）" },
    "promotable": { "type": "boolean", "default": true },
    "lock":       { "enum": ["none", "def", "kernel"], "default": "none" },
    "secret":     { "type": "boolean", "default": false, "description": "只能填密钥名，不能填密钥值（S.03）" }
  }
}
```

## 4. 控件映射（`ui.widget` 为 `auto` 时）
| 参数 type | 条件 | 控件 `widget` | 在节点上（`ui.group=常用`） |
|---|---|---|---|
| `integer` / `number` | 同时有 `min`、`max`，且 `max - min ≤ 100 × step` | 滑块 `slider` | 滑块 + 数值 |
| `integer` / `number` | 其他 | 数字步进 `stepper` | 步进 |
| `boolean` | — | 开关 `switch` | 开关 |
| `enum` | 选项 ≤ 4 个，且每个显示名 ≤ 6 个字 | 分段 `segmented` | 分段 |
| `enum` | 其他 | 下拉 `select` | 下拉 |
| `string` | — | 单行输入 `input` | 单行输入（截断显示） |
| `text` | — | 多行输入 `textarea` | 固定 3 行，超出滚动（`U.10.07-R1`） |
| `expr` | — | 代码输入 `code`（单行，带语法高亮和校验） | 单行 |
| `model_ref` | — | 模型选择 `model` | 显示所选名称 |
| `rolecard_ref` | — | 角色卡选择 `rolecard` | 显示所选名称 |
| 其余 `*_ref` | — | 选择列表 `picker`（搜索 + 列表） | 显示所选名称 |
| `object` | 有 `schema` 或 `schema_from` | 子表单：每个子字段按本表再推一次（`schema_from` 见 §5） | 对象本身不上节点；`schema_from` 展开出的子参数按 R8 |
| `object` | 都没有 | 代码输入 `code`（JSON） | 不上节点 |

- `connection`（连接选择，`C.16`）只能由 `ui.widget` 显式指定，不由类型推出。
- `schema/builtin/widget_map.yaml` 是上表的机器可读版。节点上的控件（`W.06.03`、`W.06.10`）和右栏属性页（`W.07.03`）都读它的生成物 `WIDGET_MAP`，同一个参数在两处推出的控件相同（`P.09` K212）。

## 5. 参数结构取自所选对象（`schema_from`）
什么都能配置成节点：节点有哪些参数，由它背后的东西决定。工具节点选了哪个工具，参数就是那个工具的入参（`P.09` K211）。
- **C.03.02-R6** `type: object` 的参数可以写 `schema_from: param:<参数名>`：结构不写在 NodeDef 里，取自那个参数所选对象声明的入参 JSON Schema。v1 只有一种来源：`tool_ref` 参数选中的工具（`ToolDef.schema`，`B.04.08`；MCP 工具就是它的 `inputSchema`）。
- **C.03.02-R7** 只展开顶层 `properties`，每个属性成为这个对象参数下的一个子参数；值存在 `params.<对象参数名>.<属性名>`，属性名原样保存。映射规则前后端同一份，测试向量是 `schema/examples/schema_expand_vectors.json`：

| JSON Schema | 子参数 `type` | 其他字段 |
|---|---|---|
| `type: string`，有 `enum` | `enum` | `enum` 原样 |
| `type: string`，`maxLength` > 200 | `text` | `max_length` ← `maxLength` |
| `type: string` | `string` | `max_length` ← `maxLength` |
| `type: integer` | `integer` | `min` ← `minimum`，`max` ← `maximum`，`step` ← `multipleOf`（缺省 1） |
| `type: number` | `number` | `min` ← `minimum`，`max` ← `maximum`，`step` ← `multipleOf` |
| `type: boolean` | `boolean` | — |
| `type: object` 或 `array`；`oneOf`、`anyOf`、`allOf`（可空写法除外）；没写 `type` | `object` | 不再往下展开，用 `code`（JSON）编辑 |

  每一行都按：`label` ← `title`（缺省用属性名，超过 20 字截断）；`help` ← `description`（超过 200 字截断）；`default` ← `default`（值为 `null` 时不写）。

  可空写法先去掉 null 再查表：`type` 是数组、去掉 `"null"` 后只剩一种类型时按那一种；`anyOf` 或 `oneOf` 恰好两项、其中一项是 `{"type": "null"}` 时按另一项（字段取自那一项，`title`、`description`、`default` 外层写了就用外层的）。Python（Pydantic）生成的 MCP 工具，可选参数 `Optional[str]` 就是这种写法（`P.09` K226）。
- **C.03.02-R8** 子参数的分组：`required` 里的属性按声明顺序取前 4 个为"常用"，其余为"高级"（与 `C.03.05-R1` 同一个上限）。每个子参数都能接线：节点按 `dynamic_ports`（`C.03.01`）给每个子参数生成一个输入端口。端口名由属性名换算成 `^[a-z_][a-z0-9_]*$`：大写字母前加 `_` 再全部转小写，其余不合法的字符换成 `_`，数字开头加 `p_`，与已有端口或参数重名时依次加 `_2`、`_3`。端口类型一律 `任意`（v1 没有标量数据类型），值在运行时按子参数的类型校验，不符合时 `user_input`。
- **C.03.02-R9** 所选对象变了（换了工具，或工具的 schema 更新）：同名属性的值保留，不存在的属性去掉；连到消失端口的连线随这次 `set_param` 一并删除，撤销时恢复（`C.05.02`、`C.05.03`）。
- **C.03.02-R10** 无法展开：schema 不是对象、顶层没有 `properties`、属性超过 32 个时，不生成子参数和端口，整个对象参数用 `code`（JSON）编辑，校验记 warn。`C.15` §7 说的"无法展开"就是这种情况。
- http 声明式节点的参数写在它自己的 NodeDef 里（`C.03.04` §3.2），子图节点露出的参数用 `expose`（`C.03.04` §3.4），都不走本节。

## 6. 规则
- **C.03.02-R1** 节点上显示哪些参数由 `ui.group` 决定，最多 4 个"常用"参数，多出的降为"高级"，只提示不报错（`C.03.05-R1`、`P.09` K95）。
- **C.03.02-R2** `ui.widget` 显式指定时必须和 `type` 兼容（例如 `switch` 只能用于 `boolean`），否则注册失败。
- **C.03.02-R3** `secret: true` 的参数只能是 `string`，值是密钥名（如 `openai_main`），校验器拒绝看起来像密钥值的内容（以 `sk-`、`AIza` 开头，或长度 > 40 且无空格的随机串）。
- **C.03.02-R4** `enum_labels` 里的显示名遵守 `P.06` 术语；没写时显示枚举值本身。
- **C.03.02-R5** `expr` 类型的参数使用 `expr-lang/expr` 语法（`E.14.08`），保存时做语法检查（诊断 V03）。

## 7. 例子
```yaml
params:
  concurrency:
    type: integer
    label: 并发
    default: 3
    min: 1
    max: 64
    step: 1
    ui: { group: 常用 }            # 64 > 100×1？否 → 64 - 1 = 63 ≤ 100 → 滑块
  collect:
    type: enum
    label: 汇合
    enum: [all, k_of_n, first, timeout]
    enum_labels: { all: 全部, k_of_n: 前 K 份, first: 第一份, timeout: 超时截止 }
    default: all
    ui: { group: 常用 }            # 4 个选项、显示名都 ≤ 6 字 → 分段
```

## 8. 验收标准
1. 映射函数对 §4 每一行都有测试，前端（TS）和后端（Go，生成属性面板描述时用）结果一致。
2. 带 6 个属性的工具 schema（2 个必填，含 camelCase 属性名和一个数组）展开出 6 个子参数、2 个常用、6 个合法端口名；数组属性用 JSON 编辑；schema 顶层不是对象时整个参数退回 JSON 编辑。

### 实施卡
- 要建 / 要改的文件：`schema/nodedef.schema.json`、`schema/builtin/widget_map.yaml`、`schema/examples/schema_expand_vectors.json`、`tools/schemacheck/param_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0302-T1 控件映射表`：`widget_map.yaml` 覆盖 §4 每一行；表里的控件名都在 `ParamUI.widget` 的枚举里（`C.03.05`）
  - `C0302-T2 展开向量`：`schema_expand_vectors.json` 每条（一段 JSON Schema，期望的子参数、常用参数、端口名）用按 §5 写的参考实现逐条比对；覆盖 §5 映射表每一行、camelCase 属性名、重名、数字开头、超过 32 个属性、顶层不是对象
  - `C0302-T3 ParamDef 反例`：`secret: true` 而 `type` 不是 `string`、`schema_from` 写在不是 `object` 的参数上、`enum` 为空数组时校验失败（测试里内联）
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `ui.widget` 与 `type` 不兼容、`secret` 参数的值像密钥值时注册失败（R2、R3）：`E0301-T7`（`E.03.01`）
  - 后端按展开向量生成动态端口（§5）：`E0302-T6`（`E.03.02`）
  - 前后端推出的控件与展开结果一致（§8 验收 1、2）：`W0610-T17`（`W.06.10`）、`W0703-T22`（`W.07.03`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 界面字段移到 `ParamDef.ui`（`C.03.05`），去掉 `widget`、`inline`、`advanced`；§4 控件名统一并写明 `widget_map.yaml` 前后端共用；新增 §5 `schema_from`（R6–R10）；R1 改为引用 K95；实施卡按 `G.02.06-R24` 重写 | `P.09` K211、K212 |
| 2026-11-23 | 状态改为"已审"：第 3 片（`m0-contract-2`）开工前复查完成（用户授权设计方自主裁决，2026-11-23 15:00） | `G.02.01-R2`；`P.09` K210 |
| 2026-11-23 | R7 加可空写法：去掉 null 后只剩一种类型就按那一种查表；`default: null` 不写 | 第 3 片整片评审；`P.09` K226 |
