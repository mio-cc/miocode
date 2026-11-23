# E.07.02 SQLite 表结构

| 项 | 内容 |
|---|---|
| 编号 | E.07.02 |
| 类型 | 实施 |
| 上级 | E.07 store 持久化 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引04 |
| 最后修改 | 2026-11-24 |

## 1. 职责
定义 SQLite 的表结构和索引（所有表在这里统一登记，旧文档"表归属分散在各文档"的做法取消），实现 SQLite 版的 `Store`（`E.07.01` 的 7 个仓库）。

## 2. 不做什么
- 不定义业务含义（字段含义见对应 C 文档和 `api.schema.json`）。
- 不写迁移执行器（`E.07.03`）和写队列（`E.07.04`），只用它们。

## 3. 继承的上级约束
`E.07-R1`–`R6`、`E.07.01` 全部、`E.07.03`、`E.07.04`、`C.07`（状态取值）、`C.01` §3（时间、金额、时长）。

## 4. 接口
```go
// engine/store/sqlite/store.go
type Options struct{ Logger *slog.Logger; BackupKeep int }   // BackupKeep ≤ 0 时为 3
func Open(ctx context.Context, path string, opt Options) (store.Store, error)
```
`Open`：打开（没有就新建）`path`；查当前 schema 版本，有要执行的迁移且版本 > 0 时先 `Backup`（`E.07.03`），再 `Migrate`；然后建写连接（`MaxOpenConns` 1，交给写队列，`E.07.04`）和读连接池（`MaxOpenConns` 8）。DSN 为 `<path>?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(ON)`（路径用正斜杠，不用 `file:` URI；`dsnFor`，在 `E.07.04` 的 `dsn.go`），驱动名 `sqlite`（`modernc.org/sqlite`）。时间列 TEXT（RFC 3339 UTC 毫秒，`2006-01-02T15:04:05.000Z`），JSON 列 TEXT（`encoding/json` 编码的原文）。

### 4.1 本片的表（`migrations/0001_init.sql`，`E.07.03` 建这个文件）
"全文"列是这一行对应的 `gen` 类型或存储结构的 JSON，读出时解码它；其余列是为了查询、排序、约束而冗余出来的，写入时和全文一起更新。
| 表 | 列（类型、约束） | 主键 | 索引 |
|---|---|---|---|
| `hx_graphs` | `id` TEXT，`updated_at` TEXT NOT NULL，`deleted_at` TEXT，`doc` TEXT NOT NULL（`GraphMeta`） | `id` | `(updated_at DESC, id DESC)` |
| `hx_branches` | `graph_id` TEXT NOT NULL → `hx_graphs`，`name` TEXT NOT NULL，`base_version` INTEGER NOT NULL，`head_version` INTEGER NOT NULL，`deleted_at` TEXT，`doc` TEXT NOT NULL（`BranchMeta`，`behind`、`ahead` 存 0） | `(graph_id, name)` | — |
| `hx_graph_versions` | `graph_id` TEXT NOT NULL → `hx_graphs`，`branch` TEXT NOT NULL，`version` INTEGER NOT NULL，`hash` TEXT NOT NULL，`doc` TEXT（全文 `Graph`，只有存全文的版本有） | `(graph_id, branch, version)` | — |
| `hx_ops` | `graph_id` TEXT NOT NULL → `hx_graphs`，`branch` TEXT NOT NULL，`version` INTEGER NOT NULL，`id` TEXT NOT NULL UNIQUE，`group_id` TEXT，`undone` INTEGER NOT NULL DEFAULT 0，`doc` TEXT NOT NULL（`OpRecord`） | `(graph_id, branch, version)` | `(group_id)` |
| `hx_undo_stack` | `graph_id` TEXT NOT NULL，`branch` TEXT NOT NULL，`actor_id` TEXT NOT NULL，`seq` INTEGER NOT NULL，`group_id` TEXT NOT NULL，`undone` INTEGER NOT NULL DEFAULT 0 | `(graph_id, branch, actor_id, seq)` | — |
| `hx_runs` | `id` TEXT，`graph_id` TEXT NOT NULL，`session_id` TEXT，`kind` TEXT NOT NULL，`status` TEXT NOT NULL，`no` INTEGER NOT NULL，`created_at` TEXT NOT NULL，`last_seq` INTEGER NOT NULL DEFAULT 0，`lease_owner` TEXT，`lease_until` TEXT，`doc` TEXT NOT NULL（`RunMeta`）；UNIQUE `(graph_id, no)` | `id` | `(graph_id, created_at DESC)`、`(status)`、`(session_id, kind)`、`(created_at DESC, id DESC)` |
| `hx_run_events` | `run_id` TEXT NOT NULL → `hx_runs`，`seq` INTEGER NOT NULL，`kind` TEXT NOT NULL，`node_id` TEXT（`loc.node_id`），`doc` TEXT NOT NULL（`RunEvent`） | `(run_id, seq)` | `(run_id, node_id, seq)` |
| `hx_session_events` | `session_id` TEXT NOT NULL，`seq` INTEGER NOT NULL，`kind` TEXT NOT NULL，`doc` TEXT NOT NULL（`SessionEvent`） | `(session_id, seq)` | — |
| `hx_run_node_state` | `run_id` TEXT NOT NULL → `hx_runs`，`exec_key` TEXT NOT NULL，`doc` TEXT NOT NULL（`NodeStateRow`） | `(run_id, exec_key)` | — |
| `hx_run_views` | `run_id` TEXT NOT NULL → `hx_runs`，`seq` INTEGER NOT NULL，`view_ref` TEXT NOT NULL | `(run_id, seq)` | — |
| `hx_checkpoints` | `run_id` TEXT NOT NULL，`exec_key` TEXT NOT NULL，`seq` INTEGER NOT NULL，`executor` TEXT NOT NULL，`state_ref` TEXT NOT NULL，`ts` TEXT NOT NULL | `(run_id, exec_key)` | — |
| `hx_checkpoint_history` | 同 `hx_checkpoints` | `(run_id, exec_key, seq)` | — |
| `hx_tool_calls` | `idem_key` TEXT，`run_id` TEXT NOT NULL，`exec_key` TEXT NOT NULL，`tool` TEXT NOT NULL，`risk` INTEGER NOT NULL，`status` TEXT NOT NULL，`args_ref` TEXT NOT NULL DEFAULT ''，`result_ref` TEXT NOT NULL DEFAULT ''，`started_at` TEXT NOT NULL，`ended_at` TEXT | `idem_key` | `(run_id)` |
| `hx_settings` | `key` TEXT，`value` TEXT NOT NULL，`updated_at` TEXT NOT NULL | `key` | — |
| `hx_migrations` | `version` INTEGER，`applied_at` TEXT NOT NULL（`E.07.03` 建） | `version` | — |

- 图协同流的事件不建表（`E.07.01` §5，`P.09` K237）；运行和会话事件的 `seq` 由仓库在写事务里分配。
- 外键（→）在删除时不级联：图、运行都只软删除或不删除，清理由 `B.09` 的维护任务做。`hx_checkpoints`、`hx_tool_calls`、`hx_session_events` 不加外键（检查点、工具调用会在运行行之前写的情况由调用方保证不出现；会话表还不存在）。
- **exec_key**：一次节点执行的唯一键字符串（`C.06.05-R5`）。
- SQL 只用 SQLite 与 Postgres 都支持的写法（`E.07.03` §5）：不用 `WITHOUT ROWID`、`AUTOINCREMENT`、`INSERT OR …`（用 `INSERT … ON CONFLICT … DO …`）。

### 4.2 以后加的表（草案，由第一个用到它的叶子定稿并写新的迁移文件，`E.07-R6`）
| 表 | 主键 | 主要字段 | 索引 |
|---|---|---|---|
| `hx_proposals` | id | graph_id, branch, base_version, patch, actor, session_id, run_id, status, decisions, fingerprint, created_at, decided_at | (graph_id, status) |
| `hx_approvals` | id | run_id, graph_id, exec_key, actor, action, target, kind, summary, detail_ref, reasons, status, scope, decided_by, decided_at, expires_at, created_at | (status, created_at) WHERE status='pending' |
| `hx_mandates` | id | name, level, body, created_by, created_at, revoked_at | — |
| `hx_mandate_mounts` | (anchor_kind, anchor_id, mandate_id) | priority, created_at | (anchor_kind, anchor_id) |
| `hx_audit` | seq（AUTOINCREMENT） | ts, actor, action, target, effect, mandate_id, reasons, op_id, approval_id, graph_version, taint, prev_hash, hash | (ts DESC) |
| `hx_ledger` | (scope, field, version) | value, taint, written_by, reason, ts | — |
| `hx_blobs` | hash | size, media_type, refcount, created_at, last_access | (refcount, last_access) |
| `hx_sessions` | id | title, pinned, active_graph_id, entry_graph_id（`C.10-R9`，`P.09` K233）, orchestrator_model, orchestrator_effort（JSON，`C.10-R6`）, last_location（JSON，`C.10`）, created_at, updated_at, deleted_at | (pinned DESC, updated_at DESC) |
| `hx_session_graphs` | (session_id, graph_id) | attached_at | — |
| `hx_messages` | id | session_id, role, actor, content, content_ref, blocks, selection, status, error, usage, created_at | (session_id, created_at) |
| `hx_library` | (name, version) | doc, description, created_by, created_at | — |
| `hx_extensions` | name | version, sign_state, enabled, perms, installed_at | — |
| `hx_idempotency` | key | request_hash, response, status_code, created_at | (created_at) |
| `hx_model_stats` | model | count_ratio, samples, updated_at | — |

- `hx_audit` 只追加；加它的迁移文件里为它建 `BEFORE UPDATE` / `BEFORE DELETE` 触发器直接 `RAISE(ABORT)`。

## 5. 行为
- 每个仓库方法：在 `Tx` 里时用那个事务（写方法外面包一个保存点，出错时只撤销这个方法的写入，和 memstore 一致）；否则写方法经写队列（`E.07.04`）各开一个事务，读方法用读连接池。`Tx` 的 `fn` 在写队列的 goroutine 上执行。
- 全文快照：每 50 个版本存一次全文（由 `engine/op` 在 `Commit.Doc` 里给出，`E.05`），其余版本只存哈希；`Base` 找 ≤ v 的最近全文再取之后的 Op（重放在 `E.05`）。
- 事件批量写入：由 `E.09.01` 的写入器攒批（最多 64 条或 20ms）一次 `AppendRun`；存储不再合并。
- 约束冲突（唯一键、主键）映射为 `ErrConflict`；查不到映射为 `ErrNotFound`。
- 行为与 memstore 完全一致（`E.07.01` 的契约测试，包括错误、排序、分页、seq）。

## 6. 不变量
- 所有表名 `hx_` 前缀。
- 表里冗余出来的列和全文一致。

## 7. 错误处理
约束冲突映射为 `ErrConflict`；`SQLITE_BUSY` 由写队列重试（`E.07.04`）；其余包装后返回。

## 8. 验收标准
1. 迁移后 `sqlite_master` 中的表、列、主键、索引与 §4.1 一致（脚本比对）。
2. 契约测试在 SQLite 上全部通过。

### 实施卡
- 要建 / 要改的文件：`engine/store/sqlite/store.go`（`Open`、`Tx`、公共的读写和编码函数）、`engine/store/sqlite/graphs.go`（图和 Op）、`engine/store/sqlite/runs.go`（运行和事件）、`engine/store/sqlite/misc.go`（检查点、工具调用、设置）、`engine/store/sqlite/sqlite_test.go`
- 不许碰的文件：`schema/`、`gen/`、`engine/store/store.go`、`engine/store/storetest/`、`engine/store/memstore/`、`engine/store/sqlite/writer.go`、`engine/store/sqlite/migrate.go`、`engine/store/sqlite/migrations/`
- 测试用例：
  - `E0702-T1 表结构比对`：`Open` 一个临时文件后，`sqlite_master` 和 `PRAGMA table_info` / `index_list` 读出的表、列、主键、索引与 §4.1 逐项相同（期望表写在测试里）
  - `E0702-T2 冗余列一致`：写入后直接查表，`hx_runs.status`、`hx_ops.undone`、`hx_graphs.updated_at` 与 `doc` 里的值相同
  - `E0702-T3 契约测试`：`storetest.Run(t, …)`，每个子测试 `Open` 一个新的临时文件（`E0701-T1`–`T3`）
  - `E0702-T4 重新打开`：写入后 `Close`、再 `Open` 同一个文件，读出相同；不再执行迁移、不再备份
- 允许使用的依赖：标准库、`gen`、`modernc.org/sqlite`（`G.10` 已登记，`E.07.04` 加进 `go.mod`）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `hx_sessions` 补 `last_location` 列（`C.10` 在树索引.6 已加该字段，本表漏改） | `P.09` K68 | |
| 2026-11-23 | `hx_sessions` 补 `orchestrator_effort` 列 | `P.09` K74 |
| 2026-11-24 | 第 6 片（`m0-store`）开工前复查：本片的 15 张表写全（列、类型、约束、索引），改为"JSON 全文 + 索引列"；图协同事件不建表；其余表移到 §4.2 作为草案，`hx_sessions` 补 `entry_graph_id`；不用 `sqlc`，手写 SQL；不用 `WITHOUT ROWID`；`Load` 的重放移到 `E.05`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K236、K237 |
