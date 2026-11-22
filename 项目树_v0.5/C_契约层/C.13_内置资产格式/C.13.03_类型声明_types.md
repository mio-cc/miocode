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
  "$id": "https://harness.local/schema/typedef.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "major", "minor", "fields"],
  "additionalProperties": false,
  "properties": {
    "name":     { "type": "string", "pattern": "^[^@\\[\\]/\\s]{1,30}$" },
    "major":    { "type": "integer", "minimum": 1 },
    "minor":    { "type": "integer", "minimum": 0 },
    "description": { "type": "string", "maxLength": 300 },
    "extends":  { "$ref": "types.schema.json#/$defs/TypeRef", "description": "继承的父类型，子类型可以接到父类型端口（C.04.02 C5）" },
    "category": { "$ref": "types.schema.json#/$defs/Category", "default": "gen", "description": "业务类型只能是 gen" },
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
        "type":      { "type": "string", "description": "string | integer | number | boolean | TypeRef | 列表[…]" },
        "label":     { "type": "string", "maxLength": 20 },
        "required":  { "type": "boolean", "default": false },
        "inherit":   { "type": "boolean", "default": false, "description": "沿数据流向下游强制透传，配方不能排除（E.13.06）" },
        "max_chars": { "type": "integer", "minimum": 1 },
        "enum":      { "type": "array", "items": { "type": "string" } },
        "readonly_except": { "type": "array", "items": { "type": "string" }, "description": "写入账本时只有这些节点标签能改" },
        "append_only":     { "type": "boolean", "default": false },
        "require_reason":  { "type": "boolean", "default": false },
        "since_minor": { "type": "integer", "minimum": 0, "description": "第几个次版本加入的字段" }
      }
    }
  }
}
```

## 3. 规则
- **C.13.03-R1** 次版本只能新增**可选**字段（`since_minor` 写上次版本号）；改字段、删字段、新增必填字段都必须升主版本，并提供 `migrate_from`。
- **C.13.03-R2** 系统类型（`C.04.01` §4）不能被继承、不能被覆盖。
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
