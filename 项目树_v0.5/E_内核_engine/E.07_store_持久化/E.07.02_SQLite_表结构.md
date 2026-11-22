# E.07.02 SQLite 表结构

| 项 | 内容 |
|---|---|
| 编号 | E.07.02 |
| 类型 | 实施 |
| 上级 | E.07 store 持久化 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引04 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义 SQLite 的全部表结构和索引（所有表在这里统一登记，旧文档"表归属分散在各文档"的做法取消）。

## 2. 不做什么
- 不定义业务含义（字段含义见对应 C 文档）

## 3. 继承的上级约束
`E.07-R2`、`C.07`（状态取值）、`C.01` §3（时间、金额、时长）。

## 4. 接口
连接参数：`_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(ON)`。时间列 TEXT（RFC 3339 UTC 毫秒），JSON 列 BLOB（规范化 JSON 文本）。

| 表 | 主键 | 主要字段 | 索引 |
|---|---|---|---|
| `hx_graphs` | id | title, head_version, created_at, updated_at, deleted_at | (updated_at DESC) |
| `hx_graph_versions` | (graph_id, branch, version) | full, doc（full=1 时）, hash | — |
| `hx_ops` | (graph_id, branch, version) | id UNIQUE, kind, actor_kind, actor_id, approver, mandate_id, reason, taint, group_id, coalesce_key, target, payload, inverse, ts | (graph_id, branch, actor_id, version)、(group_id) |
| `hx_branches` | (graph_id, name) | base_version, head_version, created_by, deleted_at | — |
| `hx_undo_stack` | (graph_id, branch, actor_id, seq) | group_id, undone | — |
| `hx_proposals` | id | graph_id, branch, base_version, patch, actor, session_id, run_id, status, decisions, fingerprint, created_at, decided_at | (graph_id, status) |
| `hx_graph_events` | (graph_id, seq) | ts, kind, actor, data | — |
| `hx_runs` | id | kind（run / chat / optimize，`B.06.02`）, session_id, graph_id, branch, graph_version, snapshot_ref, registry_hash, status（`C.07` 六种）, started_by, replay_of, fork_of, fork_seq, last_seq, tokens_in, tokens_out, tokens_cached, cost_micros, owner_lease, lease_until, created_at, ended_at | (graph_id, created_at DESC)、(status)、(session_id, kind) |
| `hx_run_events` | (run_id, seq) WITHOUT ROWID | ts, kind, node_id, path, actor, cause_seq, data | (run_id, node_id, seq)、(run_id, kind, seq) |
| `hx_checkpoints` | (run_id, exec_key) | seq, executor, state_ref, ts | — |
| `hx_checkpoint_history` | (run_id, exec_key, seq) | state_ref, ts | — |
| `hx_run_node_state` | (run_id, exec_key) | node_id, path, state, attempt, started_at, ended_at, tokens, cost_micros, last_seq | (run_id, node_id) |
| `hx_run_views` | (run_id, seq) | view_ref | — |
| `hx_tool_calls` | idem_key | run_id, exec_key, tool, risk, status（started / succeeded / failed）, args_ref, result_ref, started_at, ended_at | (run_id) |
| `hx_approvals` | id | run_id, graph_id, exec_key, actor, action, target, kind, summary, detail_ref, reasons, status, scope, decided_by, decided_at, expires_at, created_at | (status, created_at) WHERE status='pending' |
| `hx_mandates` | id | name, level, body, created_by, created_at, revoked_at | — |
| `hx_mandate_mounts` | (anchor_kind, anchor_id, mandate_id) | priority, created_at | (anchor_kind, anchor_id) |
| `hx_audit` | seq（AUTOINCREMENT） | ts, actor, action, target, effect, mandate_id, reasons, op_id, approval_id, graph_version, taint, prev_hash, hash | (ts DESC) |
| `hx_ledger` | (scope, field, version) | value, taint, written_by, reason, ts | — |
| `hx_blobs` | hash | size, media_type, refcount, created_at, last_access | (refcount, last_access) |
| `hx_sessions` | id | title, pinned, active_graph_id, orchestrator_model, orchestrator_effort（JSON，`C.10-R6`）, last_location（JSON，`C.10`）, created_at, updated_at, deleted_at | (pinned DESC, updated_at DESC) |
| `hx_session_graphs` | (session_id, graph_id) | attached_at | — |
| `hx_messages` | id | session_id, role, actor, content, content_ref, blocks, selection, status, error, usage, created_at | (session_id, created_at) |
| `hx_session_events` | (session_id, seq) | ts, kind, actor, data | — |
| `hx_library` | (name, version) | doc, description, created_by, created_at | — |
| `hx_extensions` | name | version, sign_state, enabled, perms, installed_at | — |
| `hx_settings` | key | value, updated_at | — |
| `hx_idempotency` | key | request_hash, response, status_code, created_at | (created_at) |
| `hx_model_stats` | model | count_ratio, samples, updated_at | — |

- **exec_key**：一次节点执行的唯一键字符串（`C.06.05-R5`）。
- `hx_audit` 只追加；迁移文件里为它建 `BEFORE UPDATE` / `BEFORE DELETE` 触发器直接 `RAISE(ABORT)`。

## 5. 行为
- 全文快照：每 50 个版本存一次全文（`full=1`），其余只有 Op；`Load` 找 ≤ v 的最近全文再重放 Op。
- 事件批量写入：调度器攒批（最多 64 条或 20ms）一个事务提交（`引04` §3）。

## 6. 不变量
- 所有表名 `hx_` 前缀
- `hx_audit` 不能被 UPDATE / DELETE

## 7. 错误处理
约束冲突映射为 `ErrConflict`。

## 8. 验收标准
1. 迁移后 `sqlite_master` 中的表与本表一致（脚本比对）
2. `UPDATE hx_audit` 失败

### 实施卡
- 要建 / 要改的文件：`engine/store/sqlite/migrations/0001_init.sql`、`engine/store/sqlite/*.go`、`engine/store/sqlite/queries.sql（sqlc）`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0702-T1 表结构比对`
  - `E0702-T2 审计不可改`
  - `E0702-T3 Load 全文 + 重放正确`
- 允许使用的依赖：`modernc.org/sqlite`、`pressly/goose/v3`、sqlc（开发工具）
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `hx_sessions` 补 `last_location` 列（`C.10` 在树索引.6 已加该字段，本表漏改） | `P.09` K68 | |
| 2026-11-23 | `hx_sessions` 补 `orchestrator_effort` 列 | `P.09` K74 |
