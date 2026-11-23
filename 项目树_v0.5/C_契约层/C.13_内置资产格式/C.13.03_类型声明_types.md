# C.13.03 类型声明 types

| 项 | 内容 |
|---|---|
| 编号 | C.13.03 |
| 类型 | 实施 |
| 上级 | C.13 内置资产格式 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义业务数据类型的声明格式（`方案@1`、`任务卡@1` 这样的类型）。Agent 的 `output_schema`、连线检查、配方的字段路径都依赖它。

## 2. 定义
```json
{
  "$id": "https://anydoor.local/schema/typedef.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "major", "minor"],
  "oneOf": [ { "required": ["fields"] }, { "required": ["scalar"] } ],
  "additionalProperties": false,
  "properties": {
    "name":     { "type": "string", "pattern": "^[^@\\[\\]/\\s]{1,30}$" },
    "major":    { "type": "integer", "minimum": 1 },
    "minor":    { "type": "integer", "minimum": 0 },
    "description": { "type": "string", "maxLength": 300 },
    "extends":  { "$ref": "types.schema.json#/$defs/TypeRef", "description": "继承的父类型，子类型可以接到父类型端口（C.04.02 C5）" },
    "category": { "$ref": "types.schema.json#/$defs/Category", "default": "gen", "description": "业务类型只能是 gen" },
    "system":   { "type": "boolean", "default": false, "description": "系统类型（C.04.01 §4）：只有内置，扩展包不能声明" },
    "producer": { "$ref": "graph.schema.json#/$defs/NodeTypeRef", "description": "只能由这种节点产出（C.04.02 C2）；只用于系统类型" },
    "scalar":   { "enum": ["string", "integer", "number", "boolean"], "description": "标量类型（如 整数@1）；写了 scalar 就不写 fields" },
    "fields":   { "type": "array", "items": { "$ref": "#/$defs/Field" } },
    "migrate_from": { "type": "object", "additionalProperties": { "type": "string" },
                      "description": "旧主版本 → 迁移表达式（expr-lang），如 {\"1\": \"{title: v.name, ...v}\"}" }
  },
  "$defs": {
    "Field": {
      "type": "object",
      "required": ["name", "type"],
      "additionalProperties": false,
      "properties": {
        "name":      { "type": "string", "pattern": "^[a-z_][a-z0-9_]*$" },
        "type":      { "type": "string", "description": "string | integer | number | boolean | object | TypeRef | 列表[…]；object 和 列表[object] 用 fields 写成员" },
        "label":     { "type": "string", "maxLength": 20 },
        "required":  { "type": "boolean", "default": false },
        "inherit":   { "type": "boolean", "default": false, "description": "沿数据流向下游强制透传，配方不能排除（E.13.06）" },
        "max_chars": { "type": "integer", "minimum": 1 },
        "enum":      { "type": "array", "items": { "type": "string" } },
        "readonly_except": { "type": "array", "items": { "type": "string" }, "description": "写入账本时只有这些节点标签能改" },
        "append_only":     { "type": "boolean", "default": false },
        "require_reason":  { "type": "boolean", "default": false },
        "since_minor": { "type": "integer", "minimum": 0, "description": "第几个次版本加入的字段" },
        "fields":    { "type": "array", "items": { "$ref": "#/$defs/Field" }, "description": "type 为 object 或 列表[object] 时的成员字段" }
      }
    }
  }
}
```

## 3. 规则
- **C.13.03-R1** 次版本只能新增**可选**字段（`since_minor` 写上次版本号）；改字段、删字段、新增必填字段都必须升主版本，并提供 `migrate_from`。
- **C.13.03-R2** 系统类型（`C.04.01` §4）不能被继承、不能被覆盖。
- **C.13.03-R4** 内置类型（`P.09` K205）：系统类型 7 个——`资源引用@1`、`上下文包@1`、`工具端点@1`、`状态@1`、`简报@1`、`升级@1`、`整数@1`（`system: true`；前 6 个的 `producer` 见 `C.04.01` §4，`整数@1` 是 `scalar: integer`、没有 `producer`）；业务类型 10 个——`方案@1`、`簇标注@1`、`任务卡@1`、`执行结果@1`、`判定@1`、`目标@1`、`差距报告@1`、`聚合结果@1`、`统计@1`、`分歧报告@1`。字段内容在第 3 片开工前的复查里写进本文（参考 `架构设计_v0.2/原型/02_节点与类型库.html` 的类型库），本叶子在第 3 片实施。
- **C.13.03-R3** 每个类型同时生成一份 JSON Schema（运行时校验 Agent 输出用），由 `engine/schema` 在加载时生成并缓存，不手写。

## 4. 示例
```yaml
name: 任务卡
major: 1
minor: 1
description: 决策者分派给执行者的一项任务
fields:
  - { name: instruction, type: string, label: 任务, required: true, max_chars: 500 }
  - { name: purpose,     type: string, label: 目的, required: true }
  - { name: good_result, type: string, label: 好结果, required: true }
  - { name: checklist,   type: 列表[string], label: 检查项 }
  - { name: inputs,      type: 列表[任意], label: 必要输入 }
  - { name: constraints, type: 列表[string], label: 约束, inherit: true }
  - { name: dedupe_key,  type: string, since_minor: 1 }
```

## 5. 验收标准
1. 7 个内置业务类型通过校验，并能生成 JSON Schema。
2. 次版本里新增必填字段时加载失败。

### 实施卡
- 要建的文件：`schema/typedef.schema.json`；`schema/builtin/types/` 下 7 个业务类型和 6 个系统类型。
- 测试用例：`C1303-T1`、`C1303-T2`。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 加 `system`、`producer`、`scalar`，`Field` 可以嵌套 `fields`；新增 R4 内置类型清单（含 `整数@1` 和聚合输出的 3 个业务类型）；本叶子移到第 3 片 | `P.09` K205 |
