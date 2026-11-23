# E.07.01 Store 接口

| 项 | 内容 |
|---|---|
| 编号 | E.07.01 |
| 类型 | 实施 |
| 上级 | E.07 store 持久化 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§2 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义存储接口：所有持久化读写都通过它（`P.09` K34：合并 `引01` 与 `引04` 两版）。

## 2. 不做什么
- 不包含业务逻辑（版本冲突判断在 `op`，状态机在 `run`）

## 3. 继承的上级约束
`E.07-R1`–`R4`、`C.06.01-R1`（seq 同事务分配）。

## 4. 接口
```go
type Store interface {
    Graphs() GraphRepo
    Ops() OpRepo
    Proposals() ProposalRepo
    Runs() RunRepo
    Events() EventRepo
    Checkpoints() CheckpointRepo
    ToolCalls() ToolCallRepo
    Approvals() ApprovalRepo
    Mandates() MandateRepo
    Audit() AuditRepo
    Ledger() LedgerRepo
    Sessions() SessionRepo          // 会话、消息、会话事件
    Library() LibraryRepo           // 子图库
    Settings() SettingsRepo         // 急停状态、键值设置
    Idempotency() IdemRepo          // API 幂等键（B.03.04）
    Tx(ctx context.Context, fn func(Store) error) error   // 嵌套调用复用外层事务
    Close() error
}

type GraphRepo interface {
    Create(ctx context.Context, m GraphMeta, doc *gen.Graph) error
    Meta(ctx context.Context, id string) (GraphMeta, error)
    List(ctx context.Context, q GraphQuery) (Page[GraphMeta], error)
    Head(ctx context.Context, id, branch string) (int64, error)
    Load(ctx context.Context, id, branch string, version int64) (*gen.Graph, error)  // 最近全文 + 重放
    SaveVersion(ctx context.Context, id, branch string, v int64, doc *gen.Graph, full bool) error
    SoftDelete(ctx context.Context, id string) error
    Branches(ctx context.Context, id string) ([]Branch, error)
    PutBranch(ctx context.Context, b Branch) error
}
type OpRepo interface {
    Append(ctx context.Context, rec []OpRecord) error            // 含 inverse、版本号
    Range(ctx context.Context, graphID, branch string, from, to int64) ([]OpRecord, error)
    Get(ctx context.Context, opID string) (OpRecord, error)
    Coalesce(ctx context.Context, opID string, to json.RawMessage, doc *gen.Graph) error
    UndoPush(ctx context.Context, e UndoEntry) error
    UndoTop(ctx context.Context, graphID, branch, actorID string, undone bool) (UndoEntry, bool, error)
    UndoMark(ctx context.Context, e UndoEntry, undone bool) error
}
type RunRepo interface {
    Create(ctx context.Context, m RunMeta) error
    Get(ctx context.Context, id string) (RunMeta, error)
    List(ctx context.Context, q RunQuery) (Page[RunMeta], error)
    SetStatus(ctx context.Context, id string, status gen.RunStatus, endedAt *time.Time) error
    AddUsage(ctx context.Context, id string, u obs.Usage) error
    AcquireLease(ctx context.Context, id, owner string, ttl time.Duration) (bool, error)
    RenewLease(ctx context.Context, id, owner string, ttl time.Duration) error
    Unfinished(ctx context.Context) ([]RunMeta, error)            // pending / running / paused
    PutNodeState(ctx context.Context, rows []NodeStateRow) error  // 投影缓存
    PutView(ctx context.Context, runID string, seq int64, ref string) error
    ViewBefore(ctx context.Context, runID string, seq int64) (int64, string, bool, error)
}
type EventRepo interface {
    Append(ctx context.Context, stream StreamKey, evs []gen.Event) (lastSeq int64, err error) // seq 由存储分配
    Range(ctx context.Context, stream StreamKey, sinceSeq int64, limit int) ([]gen.Event, error)
    ByLoc(ctx context.Context, runID, nodeID string, sinceSeq int64) ([]gen.Event, error)
    Until(ctx context.Context, runID string, seq int64) ([]gen.Event, error)                   // fork 用
}
type StreamKey struct{ Kind string; ID string }   // Kind: run | graph | session
type CheckpointRepo interface {
    Put(ctx context.Context, cp Checkpoint, keepHistory bool) error
    Latest(ctx context.Context, runID, execKey string) (Checkpoint, bool, error)
    At(ctx context.Context, runID, execKey string, seq int64) (Checkpoint, bool, error)
}
type ToolCallRepo interface {
    Begin(ctx context.Context, r ToolCallRecord) (existing *ToolCallRecord, err error) // 已存在返回原记录
    Finish(ctx context.Context, idemKey string, status string, resultRef string) error
}
// ApprovalRepo、MandateRepo、AuditRepo、LedgerRepo、SessionRepo、LibraryRepo、SettingsRepo、IdemRepo、ProposalRepo
// 的方法清单见 engine/store/store.go，结构与上面一致：Create / Get / List / 状态更新；字段对应 E.07.02 的表。
```

## 5. 行为
- 所有方法第一个参数是 `ctx`；所有 List 用游标分页 `Page[T]{Items, NextCursor}`。
- `Events().Append` 在同一事务里分配连续 seq（`C.06.01-R1`）；E 级事件不调用它。
- `Tx` 嵌套时复用外层事务；事务函数返回错误即回滚。

## 6. 不变量
- 接口里没有"直接改图内容"的方法（`E.07-R4`）
- 所有时间以 UTC 存储（INV-23）

## 7. 错误处理
统一的哨兵错误：`ErrNotFound`、`ErrConflict`（唯一约束、版本）、`ErrLeaseHeld`；其余为包装后的底层错误。

## 8. 验收标准
1. 契约测试在两种实现上全部通过
2. 事件 seq 无空洞（C0601-T1）

### 实施卡
- 要建 / 要改的文件：`engine/store/store.go`、`engine/store/types.go`、`engine/store/errors.go`、`engine/store/storetest/*.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0701-T1 契约测试全集（每个仓库至少 5 条）`
  - `E0701-T2 Tx 回滚`
  - `E0701-T3 seq 连续`：连续 1 万条 P 级事件 seq 从 1 到 10000 无空洞（`C0601-T1`）
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
