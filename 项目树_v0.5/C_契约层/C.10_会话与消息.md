# C.10 会话与消息

| 项 | 内容 |
|---|---|
| 编号 | C.10 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义会话、消息、消息里的卡片块，以及用户发消息时附带的画布选中内容。

## 2. 会话 Session
```json
"Session": {
  "type": "object",
  "required": ["id", "title", "created_at", "updated_at"],
  "additionalProperties": false,
  "properties": {
    "id":              { "$ref": "common.schema.json#/$defs/Ulid" },
    "title":           { "type": "string", "maxLength": 80, "description": "缺省由第一条消息生成" },
    "pinned":          { "type": "boolean", "default": false },
    "graph_ids":       { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Ulid" }, "uniqueItems": true, "default": [] },
    "active_graph_id": { "$ref": "common.schema.json#/$defs/Ulid", "description": "画布当前显示的图" },
    "mandates":        { "type": "array", "items": { "$ref": "mandate.schema.json#/$defs/MandateMount" }, "default": [], "description": "anchor 只能是 session" },
    "orchestrator_model": { "type": "string", "description": "对话 Agent 用的模型；缺省用设置里的默认（P.09 Q17）" },
    "orchestrator_effort": { "type": "object", "default": {}, "additionalProperties": { "enum": ["off", "minimal", "low", "medium", "high", "xhigh", "max"] },
                         "description": "按模型记住的思考强度：模型引用 → 强度（U.09.06-R7）；没有记录的模型用设置里的默认强度" },
    "last_location":   { "type": "object", "additionalProperties": false,
                         "properties": { "graph_id": { "$ref": "common.schema.json#/$defs/Ulid" }, "scope": { "type": "string", "pattern": "^(root|[0-9A-HJKMNP-TV-Z]{26})$", "description": "当前层：root = 根图，否则为所在容器节点的 ID（与 Selection.scope、前端路由 ?scope= 同一写法）" } },
                         "description": "用户上次在这个会话里所在的图和层，切回时恢复（U.09.04）" },
    "created_at":      { "$ref": "common.schema.json#/$defs/Timestamp" },
    "updated_at":      { "$ref": "common.schema.json#/$defs/Timestamp" },
    "deleted_at":      { "$ref": "common.schema.json#/$defs/Timestamp" }
  }
}
```
- **C.10-R1** 一个会话可以挂多张图；图是独立文档，会话只保存引用。删除会话不删除图（图可以被别的会话引用，或者在"所有图"里找到）。
- **C.10-R2** 画布居中的布局下（ADR-008），一个会话任何时候只有一张"当前图"（`active_graph_id`），显示在画布上。
- **C.10-R3** `last_location` 由前端在进入、离开某一层时更新（`PATCH /sessions/{id}`，节流 1 秒）；它只是界面现场，不写会话事件以外的任何记录，不影响图文档和运行。视图位置不在这里（存浏览器，`U.09.04` §2）。
- **C.10-R6** `orchestrator_effort` 由前端在用户选择思考强度时更新（`PATCH /sessions/{id}`）；对话 Agent 调用模型时取 `orchestrator_effort[orchestrator_model]`，没有记录时用设置里的默认强度（`U.09.06-R6`），模型不支持这一级时按 `E.10.05` 映射（`P.09` K74）。

## 3. 消息 Message
```json
"Message": {
  "type": "object",
  "required": ["id", "session_id", "role", "status", "created_at"],
  "additionalProperties": false,
  "properties": {
    "id":         { "$ref": "common.schema.json#/$defs/Ulid" },
    "session_id": { "$ref": "common.schema.json#/$defs/Ulid" },
    "role":       { "enum": ["user", "assistant", "system"] },
    "actor":      { "$ref": "common.schema.json#/$defs/Actor", "description": "assistant 消息为对话 Agent 的模型实例" },
    "content":    { "type": "string", "maxLength": 20000, "description": "Markdown" },
    "content_ref":{ "$ref": "common.schema.json#/$defs/WsRef", "description": "超长时内容放工作区" },
    "blocks":     { "type": "array", "items": { "$ref": "#/$defs/MessageBlock" }, "default": [] },
    "selection":  { "$ref": "#/$defs/Selection", "description": "只有 user 消息有：发送时附带的画布选中" },
    "refs":       { "type": "array", "items": { "$ref": "#/$defs/MessageRef" }, "maxItems": 20, "default": [], "description": "只有 user 消息有：对话框里 @ 引用和 + 附件（C.10-R7）" },
    "status":     { "enum": ["streaming", "done", "failed"] },
    "error":      { "type": "object", "properties": { "code": { "type": "string" }, "message": { "type": "string" } } },
    "usage":      { "type": "object", "properties": { "in": { "type": "integer" }, "out": { "type": "integer" }, "cost_micros": { "type": "integer" } } },
    "created_at": { "$ref": "common.schema.json#/$defs/Timestamp" }
  }
}
```

## 4. 卡片块 MessageBlock
消息里除了文字，还可以带卡片。前端按 `kind` 渲染（`W.07.04` 对话、`W.07.09` 审批卡片）。
| kind | 字段 | 显示 |
|---|---|---|
| `graph` | `graph_id, version` | "已创建 / 已打开图"卡片，点击切换画布 |
| `proposal` | `proposal_id, summary, counts: {add, modify, remove}` | 提议卡片：采纳全部 / 拒绝全部 / 在画布上查看 |
| `applied` | `graph_id, version, op_ids, summary` | "已修改"卡片：撤销 / 在画布上定位 |
| `approval` | `approval_id, summary, kind` | 审批卡片：批准 / 驳回 |
| `run` | `run_id, status` | 运行卡片：状态、用时、费用，点击打开监控页 |
| `focus` | `graph_id, scope, node_ids` | "看这里"：点击后画布进入对应层并高亮节点 |
| `error` | `code, message` | 错误提示 |

```json
"MessageBlock": {
  "type": "object",
  "required": ["kind"],
  "oneOf": [ "…按上表每种 kind 一个子结构，用 kind 的 const 判别（C.14 §3）" ]
}
```

## 5. 选中附带 Selection
用户发消息时，对话框会附带当前的画布选中（界面上显示为"将附带选中"，`U.09`）。
```json
"Selection": {
  "type": "object",
  "required": ["graph_id", "version", "scope"],
  "additionalProperties": false,
  "properties": {
    "graph_id": { "$ref": "common.schema.json#/$defs/Ulid" },
    "version":  { "type": "integer" },
    "scope":    { "type": "string", "pattern": "^(root|[0-9A-HJKMNP-TV-Z]{26})$", "description": "用户当前所在的层" },
    "node_ids": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Ulid" }, "maxItems": 50 },
    "edge_ids": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Ulid" }, "maxItems": 50 },
    "run_id":   { "$ref": "common.schema.json#/$defs/Ulid", "description": "用户在看某次运行时附带" }
  }
}
```
- **C.10-R4** 即使没选中节点，也附带 `scope`（用户所在的层），让编排者知道用户在看哪一层。
- **C.10-R5** 选中超过 50 个节点时只附带前 50 个，并在 `content` 前加一句"（已选中 N 个节点，只附带前 50 个）"。

## 5.1 引用 MessageRef（新增，`P.09` K113）
```json
"MessageRef": {
  "type": "object", "required": ["kind"],
  "oneOf": [
    { "properties": { "kind": { "const": "node" },    "graph_id": { "$ref": "common.schema.json#/$defs/Ulid" }, "scope": { "type": "string" }, "node_id": { "$ref": "common.schema.json#/$defs/Ulid" } }, "required": ["graph_id", "scope", "node_id"] },
    { "properties": { "kind": { "const": "file" },    "ref": { "$ref": "common.schema.json#/$defs/WsRef", "description": "上传到会话工作区的文件" }, "path": { "type": "string", "description": "允许目录里的文件（S.06）" } } },
    { "properties": { "kind": { "const": "session" }, "session_id": { "$ref": "common.schema.json#/$defs/Ulid" } }, "required": ["session_id"] },
    { "properties": { "kind": { "const": "skill" },   "package_id": { "type": "string" } }, "required": ["package_id"] }
  ]
}
```
- **C.10-R7** 用户消息可以带最多 20 个引用（对话框的 `@` 引用与 `+` 附件，`U.09.06` §2）。`file` 必须恰好有 `ref` 或 `path` 之一；`path` 只能在允许目录内（`S.06`），越界的引用被拒绝（400）。引用只是告诉对话 Agent "用户指的是这些"，进上下文时由对话 Agent 按预算取用（`B.06.02.01`）。

## 6. 验收标准
1. 每种 MessageBlock 一个示例，通过校验。
2. 删除会话后，它挂的图仍可以通过 `GET /graphs/{id}` 读到。

### 实施卡
- 要建的文件：`schema/session.schema.json`；`schema/examples/session/*.json`。
- 测试用例：`C10-T1`、`C10-T2`。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `last_location.scope` 从"名称路径"改为 `root` 或容器节点 ID，与 `Selection.scope` 和路由一致；名称会重名、会改名 | `P.09` K68 | |
| 2026-11-23 | 新增 `orchestrator_effort` 和 R6：思考强度按"会话 × 模型"记住，原来没有地方存、发消息也带不上 | `P.09` K74 |
| 2026-11-23 | §5 的两条规则原编号与 §2 的 R3 重复，改为 R4、R5（这两条此前没有被引用） | `P.09` K78 |
| 2026-11-23 | Message 新增 `refs`；新增 §5.1 `MessageRef` 与 R7 | 第 8 棒写 `W.07.07`：对话框的 `@` 引用、附件没有契约；`P.09` K113 |
