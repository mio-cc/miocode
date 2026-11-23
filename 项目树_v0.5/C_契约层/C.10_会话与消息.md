# C.10 会话与消息

| 项 | 内容 |
|---|---|
| 编号 | C.10 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 冻结 |
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
    "mandates":        { "type": "array", "items": { "$ref": "common.schema.json#/$defs/MandateMount" }, "default": [], "description": "anchor 只能是 session" },
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
    "error":      { "type": "object", "required": ["code", "message"], "additionalProperties": false, "properties": { "code": { "type": "string" }, "message": { "type": "string" } } },
    "usage":      { "type": "object", "additionalProperties": false, "properties": { "in": { "type": "integer", "minimum": 0 }, "out": { "type": "integer", "minimum": 0 }, "cost_micros": { "type": "integer", "minimum": 0 } } },
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
| `approval` | `approval_id, summary, approval_kind` | 审批卡片：批准 / 驳回 |
| `run` | `run_id, status` | 运行卡片：状态、用时、费用，点击打开监控页 |
| `focus` | `graph_id, scope, node_ids` | "看这里"：点击后画布进入对应层并高亮节点 |
| `error` | `code, message` | 错误提示 |

```json
"MessageBlock": {
  "type": "object",
  "required": ["kind"],
  "additionalProperties": true,
  "properties": { "kind": { "enum": ["graph", "proposal", "applied", "approval", "run", "focus", "error"] } },
  "allOf": [ { "if": { "required": ["kind"], "properties": { "kind": { "const": "graph" } } }, "then": { "$ref": "#/$defs/BlockGraph" } }, "…其余 6 种同样写" ]
}
```
- **C.10-R8** 写法同 `C.05.01` 的 Op：每种 kind 一个封闭的 `Block…` 定义（`BlockGraph`、`BlockProposal`、`BlockApplied`、`BlockApproval`、`BlockRun`、`BlockFocus`、`BlockError`），含 `kind` 的 `const` 和上表的字段，字段都必填。类型：`*_id` 为 `Ulid`，`op_ids`、`node_ids` 为 `Ulid` 数组（`node_ids` 最多 50 个），`version` 为 ≥ 0 的整数，`summary` 最多 200 字，`counts` 为封闭对象 `{add, modify, remove}`（≥ 0 的整数，都必填），`approval.approval_kind` 同 `approval.requested.kind`（字段不叫 `kind`：`kind` 是卡片块的判别字段，`P.09` K229）（`tool`、`run`、`elevation`、`taint`、`budget`、`human_node`），`run.status` 为 `RunStatus`，`focus.scope` 为 `^(root|<ULID>)$`，`code`、`message` 为字符串（`P.09` K227）。

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
  "type": "object", "required": ["kind"], "additionalProperties": true,
  "properties": { "kind": { "enum": ["node", "file", "session", "skill"] } },
  "allOf": [ { "if": { "required": ["kind"], "properties": { "kind": { "const": "node" } } }, "then": { "$ref": "#/$defs/RefNode" } }, "…其余 3 种同样写" ]
}
```
`RefNode` `{kind, graph_id, scope, node_id}`（`scope` 为 `^(root|<ULID>)$`）；`RefFile` `{kind, ref?, path?}`，`ref` 为 `WsRef`（上传到会话工作区的文件），`path` 为允许目录里的文件（最多 1000 字，`S.06`），两者恰好一个（`oneOf` 两个 `required`）；`RefSession` `{kind, session_id}`；`RefSkill` `{kind, package_id}`。四个都是封闭对象，除 `RefFile` 外字段都必填（`P.09` K227）。
- **C.10-R7** 用户消息可以带最多 20 个引用（对话框的 `@` 引用与 `+` 附件，`U.09.06` §2）。`file` 必须恰好有 `ref` 或 `path` 之一；`path` 只能在允许目录内（`S.06`），越界的引用被拒绝（400）。引用只是告诉对话 Agent "用户指的是这些"，进上下文时由对话 Agent 按预算取用（`B.06.02.01`）。

## 6. 验收标准
1. 每种 MessageBlock 一个示例，通过校验。
2. 删除会话后，它挂的图仍可以通过 `GET /graphs/{id}` 读到。

### 实施卡
- 要建 / 要改的文件：`schema/session.schema.json`、`schema/examples/session/session.json`、`schema/examples/session/message_assistant.json`、`schema/examples/session/message_user.json`、`schema/examples/manifest.yaml`、`tools/schemacheck/session_test.go`
- `Session`、`Message`、`MessageBlock`、`Block…`、`Selection`、`MessageRef`、`Ref…` 写在 `$defs` 里；三个示例登记进 `manifest.yaml`。
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C10-T1 示例`：3 个示例通过：会话（挂 2 张图，带 `last_location`、`orchestrator_effort`、一个 `session` 挂载点）；助手消息（7 种卡片块各一个，§6 验收 1）；用户消息（带 `selection` 和 4 种引用）
  - `C10-T3 反例`：卡片块 `kind` 为 `chart`；`proposal` 块缺 `counts`；`file` 引用同时有 `ref` 和 `path`；`file` 引用两个都没有；`refs` 21 个；`selection.node_ids` 51 个；`Session` 多出字段；`orchestrator_effort` 的值为 `extreme`；`Message.error` 多出字段；`last_location.scope` 写成名称路径
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 删除会话后它挂的图仍能读到（§6 验收 2，`C10-T2`）：`B.06` 的会话接口（复查 `B.06` 时写进它的实施卡）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `last_location.scope` 从"名称路径"改为 `root` 或容器节点 ID，与 `Selection.scope` 和路由一致；名称会重名、会改名 | `P.09` K68 | |
| 2026-11-23 | 新增 `orchestrator_effort` 和 R6：思考强度按"会话 × 模型"记住，原来没有地方存、发消息也带不上 | `P.09` K74 |
| 2026-11-23 | §5 的两条规则原编号与 §2 的 R3 重复，改为 R4、R5（这两条此前没有被引用） | `P.09` K78 |
| 2026-11-23 | Message 新增 `refs`；新增 §5.1 `MessageRef` 与 R7 | 第 8 棒写 `W.07.07`：对话框的 `@` 引用、附件没有契约；`P.09` K113 |
| 2026-11-23 | `mandates` 改为引用 `common.schema.json#/$defs/MandateMount` | `P.09` K203 |
| 2026-11-23 | 第 4 片（`m0-contract-3`）开工前复查：`MessageBlock`、`MessageRef` 写成按 kind 判别的封闭定义（R8）；`Message.error`、`usage` 封闭；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K227 |
| 2026-11-23 | 审批卡片块的审批类型字段改名 `approval_kind`（§4、R8） | `P.09` K229 |
| 2026-11-23 | 状态改为"冻结"：第 4 片（`m0-contract-3`）squash 合并进代码仓库 `main`，提交 `08f30f9eb52fa2a1b3d494eab0381c4b72313848`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 9 条，`C.10` 一条不符合（会话挂载点没有约束 `anchor` 为 `session`）已返工并复核；按 `G.08-R3` 由验证者合并 |
