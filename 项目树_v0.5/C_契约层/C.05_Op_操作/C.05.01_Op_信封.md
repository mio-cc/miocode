# C.05.01 Op 信封

| 项 | 内容 |
|---|---|
| 编号 | C.05.01 |
| 类型 | 实施 |
| 上级 | C.05 Op 操作 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引08, 引_关键决定 |
| 最后修改 | 2026-11-23 |

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
    "branch":       { "$ref": "#/$defs/Branch", "description": "由请求体决定" },
    "base_version": { "type": "integer", "minimum": 0, "description": "由请求体决定；同一批 Op 相同" },
    "actor":        { "$ref": "common.schema.json#/$defs/Actor", "description": "服务器根据鉴权结果填写，客户端填写的值被忽略" },
    "approver":     { "$ref": "common.schema.json#/$defs/Actor", "description": "采纳提议时由服务器填写：actor 是模型，approver 是用户" },
    "mandate_id":   { "$ref": "common.schema.json#/$defs/Ulid" },
    "reason":       { "type": "string", "maxLength": 500, "description": "actor 为 model 时必填" },
    "taint":        { "type": "boolean", "default": false, "description": "由外部内容引出（INV-16）" },
    "target":       { "$ref": "#/$defs/OpTarget" },
    "payload":      { "type": "object", "x-open": true, "description": "按 kind 判别（C.05.02 §6.1）" },
    "inverse":      { "type": "array", "items": { "$ref": "#/$defs/Op" }, "description": "逆操作（C.05.03），服务器应用时计算并写入；客户端填的值被忽略" },
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
```json
"OpKind": { "enum": ["add_node", "remove_nodes", "restore_nodes", "connect", "disconnect", "set_param", "promote_param", "demote_param",
                     "set_label", "set_tags", "set_lock", "group", "ungroup", "set_subgraph_ref",
                     "move_nodes", "set_node_ui", "add_note", "update_note", "remove_notes",
                     "set_graph_title", "set_graph_meta", "set_mandate",
                     "apply_patch", "import_apply", "revert_op", "revert_to", "migrate",
                     "create_branch", "delete_branch", "merge_branch"] },
"Branch":  { "type": "string", "pattern": "^(main|draft/[A-Za-z0-9][A-Za-z0-9_.-]{0,79})$" },
"TmpId":   { "type": "string", "pattern": "^tmp:[0-9]{1,4}$", "description": "GraphPatch 里的临时 ID（C.08-R1、R3）" }
```
`OpKind` 就是 `C.05.02` §2–§6 表里的 30 种。`payload` 的结构按 `kind` 判别，写法同 `C.03.04` 的 `Impl`：`Op` 的 `allOf` 里每种 kind 一条 `if {kind: const} then {properties: {payload: $ref}}`（`P.09` K226 前后的做法，`type` 写错时只在 `/kind` 报一处错）。本叶子只建信封和这三个定义，`payload` 先是开放对象；各 kind 的结构和 `allOf` 由 `C.05.02` 加（`P.09` K227）。

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
- `id_map`：只在应用 GraphPatch 时非空（模型用临时 ID，`C.08-R3`）；前端提交的 Op 自己生成 ULID，`id_map` 为空对象。
- 结构：
```json
"OpsRequest":  { "type": "object", "required": ["branch", "base_version", "ops"], "additionalProperties": false,
                 "properties": { "branch": { "$ref": "#/$defs/Branch" }, "base_version": { "type": "integer", "minimum": 0 },
                                 "group_id": { "$ref": "common.schema.json#/$defs/Ulid" },
                                 "ops": { "type": "array", "minItems": 1, "maxItems": 500, "items": { "$ref": "#/$defs/Op" } } } },
"OpsApplied":  { "type": "object", "required": ["version", "applied", "rebased", "id_map", "diags"], "additionalProperties": false,
                 "properties": { "version": { "type": "integer", "minimum": 0 },
                                 "applied": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Ulid" } },
                                 "rebased": { "type": "boolean" },
                                 "id_map":  { "type": "object", "propertyNames": { "$ref": "#/$defs/TmpId" }, "additionalProperties": { "$ref": "common.schema.json#/$defs/Ulid" } },
                                 "diags":   { "type": "array", "items": { "$ref": "errors.schema.json#/$defs/Diag" } } } },
"OpsProposed": { "type": "object", "required": ["proposal_id", "status"], "additionalProperties": false,
                 "properties": { "proposal_id": { "$ref": "common.schema.json#/$defs/Ulid" }, "status": { "const": "open" } } }
```
409 是 `errors.schema.json#/$defs/ErrorResponse`，`details` 见 `C.11` §3。

## 5. 验收标准
1. 模型提交的 Op 不带 `reason`，返回 400。
2. 客户端在 Op 里伪造 `actor: user`，落库的 actor 仍是鉴权得到的 model。
3. 一批 3 条 Op 中第 3 条校验失败，前 2 条也不落库（`C.05-R2` 同样适用于一批请求）。

### 实施卡
- 要建 / 要改的文件：`schema/op.schema.json`、`tools/schemacheck/op_test.go`
- 本叶子只建信封：`Op`、`OpTarget`、`OpKind`、`Branch`、`TmpId`、`OpsRequest`、`OpsApplied`、`OpsProposed`；`payload` 先是开放对象（§2）。
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0501-T4 信封`：`OpKind` 恰好是 `C.05.02` §2–§6 表里的 30 种（名单写在测试里）；最小 Op（只有 `kind`、`payload`）和全字段 Op 通过；反例：缺 `kind`、`kind` 不在枚举、多出顶层字段、`coalesce_key` 写 `push:…`、`branch` 写 `feature/x`、`id` 不是 ULID、`inverse` 里的 Op 缺 `payload`；`TmpId` 接受 `tmp:1`、`tmp:9999`，拒绝 `tmp:a`、`tmp:10000`
  - `C0501-T5 请求和响应`：`OpsRequest`、`OpsApplied`、`OpsProposed` 各一个正例；反例：`ops` 为空、超过 500 条、`base_version` 为 -1、`OpsProposed.status` 为 `applied`、`id_map` 的键不是临时 ID
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 模型提交的 Op 不带 `reason` 返回 400、伪造 `actor` 无效（§5 验收 1、2，`C0501-T1`、`C0501-T2`）：`E0501-T5`（`E.05.01`）
  - 一批 Op 中一条失败则整批不落库（§5 验收 3，`C0501-T3`）：`E0501-T4`（`E.05.01`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 第 4 片（`m0-contract-3`）开工前复查：`payload` 改为按 kind 判别的开放对象、加 `inverse`；写出 `OpKind`、`Branch`、`TmpId`、请求和响应的结构；`id_map` 只用于 GraphPatch；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K227 |
