# C.13.02 角色卡 rolecard

| 项 | 内容 |
|---|---|
| 编号 | C.13.02 |
| 类型 | 实施 |
| 上级 | C.13 内置资产格式 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引06 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义角色卡格式：描述一个 Agent 角色的身份、使命、方法、好结果的标准、边界和卡住时怎么办。角色卡渲染进提示词的方式在 `E.13.05`。

## 2. 定义
```json
{
  "$id": "https://anydoor.local/schema/rolecard.schema.json",
  "x-version": "1.0",
  "type": "object",
  "required": ["name", "version", "identity", "mission"],
  "additionalProperties": false,
  "properties": {
    "name":        { "type": "string", "maxLength": 40 },
    "version":     { "type": "integer", "minimum": 1 },
    "extends":     { "type": "string", "pattern": "^[^@]+@\\d+$", "description": "继承的父角色卡" },
    "identity":    { "type": "string", "maxLength": 500, "description": "你是谁" },
    "mission":     { "type": "string", "maxLength": 1000, "description": "你要完成什么" },
    "method":      { "type": "array", "items": { "type": "string", "maxLength": 300 }, "maxItems": 12 },
    "good_output": { "type": "string", "maxLength": 1000, "description": "好结果长什么样" },
    "boundaries":  { "type": "array", "items": { "type": "string", "maxLength": 300 }, "maxItems": 12, "description": "不能做什么" },
    "when_stuck":  { "type": "string", "maxLength": 500, "description": "卡住时怎么上报" },
    "vars":        { "type": "array", "items": { "type": "string", "pattern": "^[a-z_][a-z0-9_]*$" }, "description": "模板变量，由上下文包提供" },
    "fit_models":  { "type": "array", "items": { "type": "string" }, "description": "适合的模型（只作提示）" },
    "examples":    { "type": "array", "items": { "$ref": "common.schema.json#/$defs/WsRef" }, "maxItems": 2 },
    "author":      { "$ref": "common.schema.json#/$defs/Actor" },
    "reason":      { "type": "string", "maxLength": 500, "description": "这一版改了什么" },
    "status":      { "enum": ["draft", "active", "archived"], "default": "active" }
  }
}
```

## 3. 继承规则
- **C.13.02-R1** 继承深度 ≤ 4，出现环时拒绝保存。
- **C.13.02-R2** 文字字段（`identity`、`mission`、`good_output`、`when_stuck`）：子卡非空时覆盖父卡。
- **C.13.02-R3** 列表字段（`method`、`boundaries`）：默认**追加**在父卡后面；子卡第一项写 `"!replace"` 时整体替换。
- **C.13.02-R4** 引用写 `名称@版本` 锁定版本，或 `名称@latest`；`@latest` 在冻结运行快照时解析成具体版本并记录下来。

## 4. 保存前检查（规则，前后端共用）
| 检查 | 不通过时 |
|---|---|
| `identity` 和 `mission` 都不为空 | 拒绝保存 |
| `boundaries` 至少 1 条 | 警告"建议写清楚不能做什么" |
| 没有"尽量""适当""可能的话"这类模糊词 | 警告并标出位置 |
| `vars` 里声明的变量在正文中出现，正文里的 `{{变量}}` 都已声明 | 拒绝保存 |
| 模型修改角色卡（`res.edit_rolecard`）时 `reason` 非空 | 拒绝保存 |

## 5. 验收标准
1. 继承链 A → B → C，`method` 按追加规则合并、`!replace` 生效。
2. 正文引用未声明变量时保存失败。

### 实施卡
- 要建的文件：`schema/rolecard.schema.json`；`schema/builtin/rolecards/*.yaml`（主脑、智囊、聚类员、决策者、执行者、验收者、编排者 7 个）。
- 测试用例：`C1302-T1`、`C1302-T2`（解析代码在 `E.13.05`）。
