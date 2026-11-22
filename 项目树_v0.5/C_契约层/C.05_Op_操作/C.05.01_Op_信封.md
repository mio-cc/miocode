# C.05.01 Op 信封

| 项 | 内容 |
|---|---|
| 编号 | C.05.01 |
| 类型 | 实施 |
| 上级 | C.05 Op 操作 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引08, 引_关键决定 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义所有 Op 共用的外层结构 `Op`。

## 2. 定义（`op.schema.json#/$defs/Op`）
```json
{
  "type": "object",
  "required": ["kind", "payload"],
  "additionalProperties": false,
  "properties": {
    "id":           { "$ref": "common.schema.json#/$defs/Ulid", "description": "客户端可以先生成；缺省由服务器生成" },
    "kind":         { "$ref": "#/$defs/OpKind" },
    "graph_id":     { "$ref": "common.schema.json#/$defs/Ulid", "description": "由请求路径决定，客户端可以不填" },
    "branch":       { "type": "string", "description": "由请求体决定" },
    "base_version": { "type": "integer", "minimum": 0, "description": "由请求体决定；同一批 Op 相同" },
    "actor":        { "$ref": "common.schema.json#/$defs/Actor", "description": "服务器根据鉴权结果填写，客户端填写的值被忽略" },
    "approver":     { "$ref": "common.schema.json#/$defs/Actor", "description": "采纳提议时由服务器填写：actor 是模型，approver 是用户" },
    "mandate_id":   { "$ref": "common.schema.json#/$defs/Ulid" },
    "reason":       { "type": "string", "maxLength": 500, "description": "actor 为 model 时必填" },
    "taint":        { "type": "boolean", "default": false, "description": "由外部内容引出（INV-16）" },
    "target":       { "$ref": "#/$defs/OpTarget" },
    "payload":      { "type": "object" },
    "group_id":     { "$ref": "common.schema.json#/$defs/Ulid" },
    "coalesce_key": { "type": "string", "pattern": "^(drag|step|slide):[0-9A-HJKMNP-TV-Z]{26}$" },
    "ts":           { "$ref": "common.schema.json#/$defs/Timestamp", "description": "服务器写入" }
  }
}
```
```json
"OpTarget": {
  "type": "object",
  "required": ["scope"],
  "additionalProperties": false,
  "description": "这个 Op 主要作用于哪里；用于授权和冲突检测。服务器会按 payload 重新计算并校验",
  "properties": {
    "scope": { "type": "string", "pattern": "^(root|[0-9A-HJKMNP-TV-Z]{26})$", "description": "root，或容器节点 ID" },
    "nodes": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Ulid" } },
    "edges": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Ulid" } },
    "notes": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Ulid" } }
  }
}
```
`payload` 的结构按 `kind` 判别，见 `C.05.02`。在 schema 里用 `oneOf` + `if/then` 按 `kind` 约束 `payload`（生成代码的处理方式见 `C.14`）。

## 3. 字段由谁填
| 字段 | 客户端 | 服务器 |
|---|---|---|
| `id` | 可以填（便于乐观更新时对应） | 没填就生成；填了就校验格式和未被占用 |
| `kind`、`payload` | 必填 | 校验 |
| `target` | 可以不填 | 总是重新计算；客户端填了但和计算结果不同时，以计算结果为准并记警告 |
| `actor`、`approver`、`ts` | 忽略 | 填写 |
| `reason` | 模型必填 | 模型没填时返回 400 `bad_request` |
| `taint` | 运行时和编排者填写 | 只能从 false 变 true，不能反过来 |
| `group_id` | 一次动作多条 Op 时填 | 缺省时整批请求共用一个 |
| `coalesce_key` | 连续拖动、步进、滑块时填 | 合并规则见 `C.05.04` §4 |

## 4. 请求和响应
```json
// POST /api/v1/graphs/{id}/ops
{ "branch": "main", "base_version": 42, "group_id": "01JE…", "ops": [ { "kind": "…", "payload": { … } } ] }

// 200 已应用
{ "version": 44, "applied": ["01JOP1…", "01JOP2…"], "rebased": false, "id_map": {}, "diags": [] }
// 202 已转为提议（档位或规则要求审核，C.08）
{ "proposal_id": "01JP…", "status": "open" }
// 409 版本冲突
{ "error": { "code": "graph_conflict", "details": { "head": 43, "missed_ops": [ … ], "conflicts": [ … ] } } }
```
- `id_map`：请求里使用临时 ID（`tmp:1`，见 `C.08`）时，返回临时 ID → ULID 的映射。

## 5. 验收标准
1. 模型提交的 Op 不带 `reason`，返回 400。
2. 客户端在 Op 里伪造 `actor: user`，落库的 actor 仍是鉴权得到的 model。
3. 一批 3 条 Op 中第 3 条校验失败，前 2 条也不落库（`C.05-R2` 同样适用于一批请求）。

### 实施卡
- 要建的文件：`schema/op.schema.json`（`Op`、`OpTarget`、`OpKind`、各 payload）。
- 测试用例：`C0501-T1`…`T3`（§5，在 `E.05.01` 流水线测试里跑）。
