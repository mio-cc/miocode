# C.03.02 参数 schema 与控件映射

| 项 | 内容 |
|---|---|
| 编号 | C.03.02 |
| 类型 | 实施 |
| 上级 | C.03 节点定义 NodeDef |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设10 |
| 最后修改 | 2026-11-22 |

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
    "widget":     { "enum": ["auto", "stepper", "slider", "segmented", "select", "input", "textarea", "switch", "picker", "code"], "default": "auto" },
    "inline":     { "type": "boolean", "default": false, "description": "显示在节点卡片上" },
    "advanced":   { "type": "boolean", "default": false, "description": "属性面板里折叠到「高级」" },
    "promotable": { "type": "boolean", "default": true },
    "lock":       { "enum": ["none", "def", "kernel"], "default": "none" },
    "secret":     { "type": "boolean", "default": false, "description": "只能填密钥名，不能填密钥值（S.03）" }
  }
}
```

## 4. 控件映射（`widget: auto` 时）
| 参数 type | 条件 | 控件 | 节点上内联时 |
|---|---|---|---|
| `integer` / `number` | 同时有 `min`、`max`，且 `max - min ≤ 100 × step` | 滑块 slider | 滑块 + 数值 |
| `integer` / `number` | 其他 | 数字步进 stepper | 步进 |
| `boolean` | — | 开关 switch | 开关 |
| `enum` | 选项 ≤ 4 个，且每个显示名 ≤ 6 个字 | 分段 segmented | 分段 |
| `enum` | 其他 | 下拉 select | 下拉 |
| `string` | — | 单行输入 input | 单行输入（截断显示） |
| `text` | — | 多行输入 textarea | 不允许内联（显示前 1 行摘要） |
| `expr` | — | 代码输入 code（单行，带语法高亮和校验） | 单行 |
| `*_ref` | — | 选择器 picker（搜索 + 列表） | 显示所选名称 |
| `object` | — | 按 `schema` 生成子表单；没有 `schema` 时用 code（JSON） | 不允许内联 |

## 5. 规则
- **C.03.02-R1** 每个 NodeDef 最多 3 个 `inline: true` 参数（节点卡片高度受控，`U.10.02`）。
- **C.03.02-R2** `widget` 显式指定时必须和 `type` 兼容（例如 `switch` 只能用于 `boolean`），否则注册失败。
- **C.03.02-R3** `secret: true` 的参数只能是 `string`，值是密钥名（如 `openai_main`），校验器拒绝看起来像密钥值的内容（以 `sk-`、`AIza` 开头，或长度 > 40 且无空格的随机串）。
- **C.03.02-R4** `enum_labels` 里的显示名遵守 `P.06` 术语；没写时显示枚举值本身。
- **C.03.02-R5** `expr` 类型的参数使用 `expr-lang/expr` 语法（`E.14.08`），保存时做语法检查（诊断 V03）。

## 6. 例子
```yaml
params:
  concurrency:
    type: integer
    label: 并发
    default: 3
    min: 1
    max: 64
    step: 1
    inline: true            # 64 > 100×1？否 → 64 - 1 = 63 ≤ 100 → 滑块
  collect:
    type: enum
    label: 汇合
    enum: [all, k_of_n, first, timeout]
    enum_labels: { all: 全部, k_of_n: 前 K 份, first: 第一份, timeout: 超时截止 }
    default: all
    inline: true            # 4 个选项、显示名都 ≤ 6 字 → 分段
```

## 7. 验收标准
1. 映射函数对 §4 每一行都有测试，前端（TS）和后端（Go，生成属性面板描述时用）结果一致。
2. 4 个内联参数的 NodeDef 注册失败。

### 实施卡
- 要改的文件：`schema/nodedef.schema.json`（`ParamDef`）；新建 `schema/builtin/widget_map.yaml`（§4 表格的机器可读版，前后端都读它，不各写一份逻辑）。
- 测试用例：`C0302-T1`…`T10`（§4 每行一条）、`C0302-T11`（内联上限）、`C0302-T12`（secret 拒绝密钥值）。
