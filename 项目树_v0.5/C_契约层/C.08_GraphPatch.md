# C.08 GraphPatch

| 项 | 内容 |
|---|---|
| 编号 | C.08 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引10 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义模型修改图时提交的 GraphPatch，以及低档位时 GraphPatch 变成的"提议"（界面上显示为幽灵节点）。

## 2. GraphPatch（`graph_patch.schema.json`）
```json
{
  "$id": "https://anydoor.local/schema/graph_patch.schema.json",
  "x-version": "1.0",
  "title": "GraphPatch",
  "type": "object",
  "required": ["id", "base_version", "scope", "ops", "rationale", "origin"],
  "additionalProperties": false,
  "properties": {
    "id":           { "$ref": "common.schema.json#/$defs/Ulid" },
    "base_version": { "type": "integer", "minimum": 0 },
    "branch":       { "type": "string", "default": "main" },
    "scope":        { "type": "string", "pattern": "^(root|[0-9A-HJKMNP-TV-Z]{26})$", "description": "主要作用的子图" },
    "ops":          { "type": "array", "minItems": 1, "maxItems": 200, "items": { "$ref": "op.schema.json#/$defs/Op" } },
    "rationale":    { "type": "string", "minLength": 1, "maxLength": 2000, "description": "整体理由，给用户看" },
    "op_reasons":   { "type": "object", "additionalProperties": { "type": "string", "maxLength": 400 }, "description": "op 的 id → 单条理由" },
    "expected_effect": {
      "type": "object", "additionalProperties": false,
      "properties": { "quality": { "type": "string" }, "latency": { "type": "string" }, "cost": { "type": "string" }, "risk": { "type": "string" } }
    },
    "origin":       { "enum": ["design", "runtime", "post_run"] },
    "parent_patch": { "$ref": "common.schema.json#/$defs/Ulid" },
    "fingerprint":  { "type": "string", "pattern": "^sha256:[0-9a-f]{64}$", "description": "规范化 ops 的哈希；服务器计算，用于发现重复提议" }
  }
}
```

### 2.1 临时 ID
- **C.08-R1** GraphPatch 里新增的节点、连线、便签用临时 ID：`tmp:1`、`tmp:2`…（同一个 GraphPatch 内唯一）。后面的 Op 可以引用这些临时 ID（例如 `connect` 连到 `tmp:1`）。
- **C.08-R2** 应用时服务器把临时 ID 统一换成 ULID，在响应和 `proposal.decided` 事件里返回 `id_map`，前端据此把幽灵节点换成真实节点。
- **C.08-R3** 临时 ID 只能出现在 GraphPatch 和提议里，不能出现在图文档里。在 schema 里，GraphPatch 内的 `Ulid` 字段放宽为 `Ulid | ^tmp:[0-9]{1,4}$`。

## 3. 什么时候变成提议
- **C.08-R4** 一个 GraphPatch 里的每条子 Op 单独做授权判定（`C.09`）：
  - 全部 `allow` → 作为 `apply_patch` 直接应用（全成或全不成）。
  - 任一条 `deny` → 整个 GraphPatch 返回 403，列出被拒的子 Op。
  - 其余情况（有 `propose` 或 `ask`）→ **整个 GraphPatch 存为一个提议**，返回 202。不拆成"一部分生效、一部分提议"，避免图处在半改状态。
- **C.08-R5** 图结构的修改需要人审核时，一律走提议；审批（`approval`）只用于运行时动作（工具调用、启动运行、提权、预算、人工节点，`C.06.02` §7）。
- 这一条也适用于用户以外的其他 actor 直接提交的单条 Op：需要审核时变成只含一条 Op 的提议。

## 4. 提议 Proposal
```json
"Proposal": {
  "type": "object",
  "required": ["id", "graph_id", "branch", "base_version", "patch", "actor", "status", "created_at"],
  "additionalProperties": false,
  "properties": {
    "id":           { "$ref": "common.schema.json#/$defs/Ulid" },
    "graph_id":     { "$ref": "common.schema.json#/$defs/Ulid" },
    "branch":       { "type": "string" },
    "base_version": { "type": "integer" },
    "patch":        { "$ref": "#" },
    "actor":        { "$ref": "common.schema.json#/$defs/Actor" },
    "session_id":   { "$ref": "common.schema.json#/$defs/Ulid", "description": "来自对话 Agent 时填" },
    "run_id":       { "$ref": "common.schema.json#/$defs/Ulid", "description": "来自运行时编排时填" },
    "status":       { "enum": ["open", "partially_applied", "applied", "rejected", "stale"] },
    "decisions":    { "type": "object", "additionalProperties": { "enum": ["accepted", "rejected"] }, "description": "op id → 处理结果" },
    "created_at":   { "$ref": "common.schema.json#/$defs/Timestamp" },
    "decided_at":   { "$ref": "common.schema.json#/$defs/Timestamp" }
  }
}
```

### 4.1 提议状态
| 状态 | 含义 | 下一个状态 |
|---|---|---|
| `open` | 等待处理 | `partially_applied`、`applied`、`rejected`、`stale` |
| `partially_applied` | 处理了一部分（部分采纳或部分拒绝），还有未处理的 | `applied`、`rejected`、`stale` |
| `applied` | 全部处理完，至少采纳了一条 | 终态 |
| `rejected` | 全部被拒绝 | 终态 |
| `stale` | 图已经变了，提议无法再应用 | 终态（前端提示"已过期，请让模型重新生成"） |

### 4.2 逐条处理时的依赖
- **C.08-R6** 采纳一条 Op 时，它依赖的 Op 自动一起采纳（例如采纳 `connect tmp:1.out → n5.in`，`add_node tmp:1` 一起采纳）。拒绝一条 Op 时，依赖它的 Op 自动一起拒绝。依赖关系由临时 ID 的引用自动推出。
- **C.08-R7** 被采纳的 Op 走正常 Op 流水线：`actor` 记为模型，`approver` 记为用户；授权按**用户**判定（用户采纳等于用户亲自做）。
- **C.08-R8** 图版本前进后，服务器尝试把 `open` / `partially_applied` 的提议 rebase 到最新版本（`C.05.04`）；失败就标为 `stale`。

### 4.3 幽灵预览
`GET /proposals/{id}/preview` 返回在当前图上叠加提议后的视图，每个受影响的元素带标记：
```json
{ "ghost_graph": { "…": "…" },
  "marks": [
    { "target": { "node": "tmp:1" },  "ghost": "add",    "op_id": "01JOP…", "reason": "加一道人工复核" },
    { "target": { "node": "01JX…", "param": "concurrency" }, "ghost": "modify", "old": 3, "new": 5, "op_id": "01JOP…" },
    { "target": { "edge": "01JE…" },  "ghost": "remove", "op_id": "01JOP…" }
  ] }
```

## 5. 验收标准
1. GraphPatch 里有一条子 Op 需要 `propose`、其余 `allow`：整个变成提议，图不变。
2. 拒绝 `add_node tmp:1` 后，连到 `tmp:1` 的连线自动拒绝。
3. 采纳后 `op.applied` 事件里的 Op `actor=model`、`approver=user`。
4. 用户在提议打开期间删掉了提议要连接的节点：提议变为 `stale`。

### 实施卡
- 要建的文件：`schema/graph_patch.schema.json`（`GraphPatch`、`Proposal`、预览结构）。
- 测试用例：`C08-T1`…`T4`（§5，在 `E.17.01`、`E.17.03` 跑）。
