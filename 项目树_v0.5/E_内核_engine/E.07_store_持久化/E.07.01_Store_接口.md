# E.07.01 Store 接口

| 项 | 内容 |
|---|---|
| 编号 | E.07.01 |
| 类型 | 实施 |
| 上级 | E.07 store 持久化 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引01§2 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义存储接口：所有持久化读写都通过它（`P.09` K34：合并 `引01` 与 `引04` 两版）；建 `schema/api.schema.json` 里存储和接口共用的 6 个结构（`P.09` K236）；写契约测试 `storetest`。

## 2. 不做什么
- 不包含业务逻辑：版本冲突以外的判断在 `engine/op`，状态机在 `engine/run`（`SetStatus` 不检查转换是否合法）。
- 不重放 Op：`Base` 只给出最近的全文和之后的 Op 记录，重放在 `engine/op`（`E.05`，`P.09` K237）。
- 本片不做的 8 个仓库见 `E.07-R6`。

## 3. 继承的上级约束
`E.07-R1`–`R6`、`C.06.01-R1`（seq 同事务分配）、`C.06.03-R1`、`R2`、INV-08、INV-17、INV-23、`G.02.05-R2`。

## 4. 接口
```go
// engine/store/store.go
type Store interface {
    Graphs() GraphRepo
    Ops() OpRepo
    Runs() RunRepo
    Events() EventRepo
    Checkpoints() CheckpointRepo
    ToolCalls() ToolCallRepo
    Settings() SettingsRepo
    Tx(ctx context.Context, fn func(Store) error) error   // fn 返回错误即回滚；嵌套调用复用外层事务
    Close() error
}

type GraphRepo interface {
    Create(ctx context.Context, meta gen.GraphMeta, doc *gen.Graph, by gen.Actor) error
    Meta(ctx context.Context, id string) (gen.GraphMeta, error)
    List(ctx context.Context, q GraphQuery) (Page[gen.GraphMeta], error)
    Commit(ctx context.Context, c Commit) error
    Base(ctx context.Context, id, branch string, version int64) (Snapshot, error)
    SoftDelete(ctx context.Context, id string, at time.Time) error
    Branches(ctx context.Context, id string) ([]gen.BranchMeta, error)
    CreateBranch(ctx context.Context, id string, b gen.BranchMeta) error
    DeleteBranch(ctx context.Context, id, name string, at time.Time) error
}
type Commit struct {
    GraphID, Branch string
    Ops    []gen.OpRecord      // 版本号从分支 head+1 起连续；每条的 GraphID、Branch 与外层相同
    Doc    *gen.Graph          // 非空时为最后一个版本存全文（engine/op 决定，每 50 个版本一次，E.07.02 §5）
    Hash   string              // 最后一个版本的图内容哈希（sha256:…）
    Title  string              // 提交后的标题与规模，写进 GraphMeta
    Stats  gen.GraphMetaStats
    At     time.Time
}
type Snapshot struct {
    Version int64             // Doc 的版本（≤ 请求的版本）
    Doc     *gen.Graph
    Ops     []gen.OpRecord    // Version 之后、到请求的版本为止的 Op，升序
}
type GraphQuery struct{ Limit int; Cursor string }   // updated_at 倒序、同时间按 id 倒序；不含已删除；Limit ≤ 0 时取 50，最多 200

type OpRepo interface {
    Range(ctx context.Context, graphID, branch string, after, upTo int64) ([]gen.OpRecord, error)  // after < version ≤ upTo，升序
    Get(ctx context.Context, opID string) (gen.OpRecord, error)
    Coalesce(ctx context.Context, opID string, payload json.RawMessage) error
    UndoPush(ctx context.Context, e UndoEntry) error
    UndoTop(ctx context.Context, graphID, branch, actorID string, undone bool) (UndoEntry, bool, error)
    UndoMark(ctx context.Context, e UndoEntry, undone bool) error
}
type UndoEntry struct{ GraphID, Branch, ActorID string; Seq int64; GroupID string; Undone bool }

type RunRepo interface {
    Create(ctx context.Context, m gen.RunMeta) (gen.RunMeta, error)  // 分配 no（这张图的第几次运行），返回写入的 RunMeta
    Get(ctx context.Context, id string) (gen.RunMeta, error)
    List(ctx context.Context, q RunQuery) (Page[gen.RunMeta], error)
    SetStatus(ctx context.Context, id string, s gen.RunStatus, endedAt *time.Time) error
    AddUsage(ctx context.Context, id string, u Usage) error
    SetProgress(ctx context.Context, id string, headline *gen.RunMetaHeadline, steps gen.RunSteps) error
    AcquireLease(ctx context.Context, id, owner string, now, until time.Time) (bool, error)
    RenewLease(ctx context.Context, id, owner string, until time.Time) error
    Unfinished(ctx context.Context) ([]gen.RunMeta, error)
    PutNodeStates(ctx context.Context, runID string, rows []gen.NodeStateRow) error
    NodeStates(ctx context.Context, runID string) ([]gen.NodeStateRow, error)
    PutView(ctx context.Context, runID string, seq int64, ref string) error
    ViewBefore(ctx context.Context, runID string, seq int64) (viewSeq int64, ref string, ok bool, err error)
}
type RunQuery struct{ GraphID, SessionID string; Kind string; Status gen.RunStatus; Limit int; Cursor string }
type Usage struct{ In, Out, Cached, CostMicros int64 }

type EventRepo interface {
    AppendRun(ctx context.Context, runID string, evs []gen.RunEvent) (last int64, err error)
    RunRange(ctx context.Context, runID string, after int64, limit int) ([]gen.RunEvent, error)
    RunByNode(ctx context.Context, runID, nodeID string, after int64) ([]gen.RunEvent, error)
    RunUntil(ctx context.Context, runID string, upTo int64) ([]gen.RunEvent, error)
    AppendSession(ctx context.Context, sessionID string, evs []gen.SessionEvent) (last int64, err error)
    SessionRange(ctx context.Context, sessionID string, after int64, limit int) ([]gen.SessionEvent, error)
}

type CheckpointRepo interface {
    Put(ctx context.Context, cp Checkpoint, keepHistory bool) error
    Latest(ctx context.Context, runID, execKey string) (Checkpoint, bool, error)
    At(ctx context.Context, runID, execKey string, seq int64) (Checkpoint, bool, error)
}
type Checkpoint struct{ RunID, ExecKey string; Seq int64; Executor string; StateRef string; TS time.Time }

type ToolCallRepo interface {
    Begin(ctx context.Context, r ToolCall) (existing *ToolCall, err error)
    Finish(ctx context.Context, idemKey, status, resultRef string, endedAt time.Time) error
    Get(ctx context.Context, idemKey string) (ToolCall, error)
}
type ToolCall struct {
    IdemKey, RunID, ExecKey, Tool string
    Risk      int
    Status    string      // started / succeeded / failed
    ArgsRef, ResultRef string
    StartedAt time.Time
    EndedAt   *time.Time
}

type SettingsRepo interface {
    Get(ctx context.Context, key string) (json.RawMessage, bool, error)
    Put(ctx context.Context, key string, value json.RawMessage, at time.Time) error
    All(ctx context.Context) (map[string]json.RawMessage, error)
}

type Page[T any] struct{ Items []T; NextCursor string }   // NextCursor 为空表示没有下一页；游标对调用方不透明

const ToolStarted, ToolSucceeded, ToolFailed = "started", "succeeded", "failed"
const DefaultLimit, MaxLimit, DefaultEventLimit = 50, 200, 1000
func ClampLimit(n int) int                                     // 列表的 Limit 规整到 1–200（≤ 0 时 50）

func IsDraftBranch(name string) bool                         // draft/…，与 op.schema.json 的 Branch 一致
func EncodeCursor(at time.Time, id string) string             // 键集游标：上一页最后一项的 (时间, id)，两种实现共用
func DecodeCursor(c string) (time.Time, string, error)        // 解不开：ErrBadCursor
var ErrBadCursor = errors.New("store: 游标无效")

// engine/store/errors.go
var (
    ErrNotFound  = errors.New("store: not found")
    ErrConflict  = errors.New("store: conflict")     // 唯一约束、版本不连续、分支已存在
    ErrLeaseHeld = errors.New("store: lease held")
)
```

### 4.1 `schema/api.schema.json`（本叶子建，`P.09` K236）
`C.01` 的文件表把 `api.schema.json` 的正文放在 `B.04` 各文档；其中存储也要用的 6 个结构由本叶子先写进这个文件，`B.04` 复查时引用它们、只增不改（`C.01-R17`）。字段照 `W.04.04` §3.5 的最低要求，再加存储需要的。文件头按 `C.01-R1`、`R2`、`R21`（`x-version` 1.0），没有根结构，`$defs` 如下：
```json
{
  "GraphMeta": {
    "type": "object",
    "required": [
      "id",
      "title",
      "version",
      "stats",
      "created_at",
      "updated_at"
    ],
    "additionalProperties": false,
    "description": "图的元信息（GET /graphs，W.04.04 §3.5）",
    "properties": {
      "id": {
        "$ref": "common.schema.json#/$defs/Ulid"
      },
      "title": {
        "type": "string",
        "maxLength": 120,
        "description": "图标题；没有标题时为空串"
      },
      "version": {
        "type": "integer",
        "minimum": 0,
        "description": "main 分支的 head 版本"
      },
      "stats": {
        "type": "object",
        "required": [
          "layers",
          "subgraphs",
          "nodes"
        ],
        "additionalProperties": false,
        "description": "图的规模，提交时由 engine/op 算好写入",
        "properties": {
          "layers": {
            "type": "integer",
            "minimum": 0,
            "description": "嵌套层数（根图算 1）"
          },
          "subgraphs": {
            "type": "integer",
            "minimum": 0
          },
          "nodes": {
            "type": "integer",
            "minimum": 0,
            "description": "全部层的节点总数"
          }
        }
      },
      "created_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      },
      "updated_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      },
      "deleted_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      }
    }
  },
  "BranchMeta": {
    "type": "object",
    "required": [
      "name",
      "base_version",
      "head",
      "behind",
      "ahead",
      "created_at"
    ],
    "additionalProperties": false,
    "description": "分支（GET /graphs/{id}/branches，W.04.04 §3.5）",
    "properties": {
      "name": {
        "$ref": "op.schema.json#/$defs/Branch"
      },
      "base_version": {
        "type": "integer",
        "minimum": 0,
        "description": "从 main 的哪个版本分出；main 为 0"
      },
      "head": {
        "type": "integer",
        "minimum": 0,
        "description": "本分支的 head 版本"
      },
      "behind": {
        "type": "integer",
        "minimum": 0,
        "description": "main 在 base_version 之后又前进了几个版本；存储读出时算，main 为 0"
      },
      "ahead": {
        "type": "integer",
        "minimum": 0,
        "description": "本分支在 base_version 之后前进了几个版本；存储读出时算，main 为 0"
      },
      "created_by": {
        "$ref": "common.schema.json#/$defs/Actor"
      },
      "created_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      },
      "deleted_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      }
    }
  },
  "OpRecord": {
    "type": "object",
    "required": [
      "graph_id",
      "branch",
      "version",
      "op",
      "undone"
    ],
    "additionalProperties": false,
    "description": "Op 日志的一条（GET /graphs/{id}/ops，W.04.04 §3.5）",
    "properties": {
      "graph_id": {
        "$ref": "common.schema.json#/$defs/Ulid"
      },
      "branch": {
        "$ref": "op.schema.json#/$defs/Branch"
      },
      "version": {
        "type": "integer",
        "minimum": 1,
        "description": "这条 Op 应用后的图版本"
      },
      "op": {
        "$ref": "op.schema.json#/$defs/Op",
        "description": "完整的 Op，含服务器填写的 id、actor、target、group_id、inverse、ts"
      },
      "undone": {
        "type": "boolean",
        "description": "所在的组已被撤销（E.05.03）"
      }
    }
  },
  "RunSteps": {
    "type": "object",
    "required": [
      "done",
      "total"
    ],
    "additionalProperties": false,
    "description": "运行的步数：已完成 / 总数",
    "properties": {
      "done": {
        "type": "integer",
        "minimum": 0
      },
      "total": {
        "type": "integer",
        "minimum": 0
      }
    }
  },
  "RunMeta": {
    "type": "object",
    "required": [
      "id",
      "kind",
      "graph_id",
      "branch",
      "graph_version",
      "status",
      "no",
      "steps",
      "usage",
      "cost_micros",
      "last_seq",
      "started_by",
      "created_at"
    ],
    "additionalProperties": false,
    "description": "运行的元信息（GET /runs，W.04.04 §3.5）",
    "properties": {
      "id": {
        "$ref": "common.schema.json#/$defs/Ulid"
      },
      "kind": {
        "enum": [
          "run",
          "chat",
          "optimize"
        ],
        "description": "chat 是对话 Agent 的一条回复（P.09 K36）"
      },
      "session_id": {
        "$ref": "common.schema.json#/$defs/Ulid"
      },
      "graph_id": {
        "$ref": "common.schema.json#/$defs/Ulid"
      },
      "branch": {
        "$ref": "op.schema.json#/$defs/Branch"
      },
      "graph_version": {
        "type": "integer",
        "minimum": 0,
        "description": "运行冻结的图版本"
      },
      "snapshot_ref": {
        "$ref": "common.schema.json#/$defs/WsRef"
      },
      "registry_hash": {
        "type": "string"
      },
      "status": {
        "$ref": "common.schema.json#/$defs/RunStatus"
      },
      "no": {
        "type": "integer",
        "minimum": 1,
        "description": "这张图的第几次运行；存储在 Create 时分配"
      },
      "headline": {
        "type": "object",
        "required": [
          "kind"
        ],
        "additionalProperties": false,
        "description": "监控页一行摘要（B.04.03 §5）；由 engine/run 写入",
        "properties": {
          "kind": {
            "enum": [
              "failed_at",
              "waiting_at",
              "running_at",
              "steps"
            ]
          },
          "node_label": {
            "type": "string"
          },
          "steps": {
            "$ref": "#/$defs/RunSteps"
          }
        }
      },
      "steps": {
        "$ref": "#/$defs/RunSteps"
      },
      "usage": {
        "type": "object",
        "required": [
          "in",
          "out",
          "cached"
        ],
        "additionalProperties": false,
        "description": "累计 token 数（C.01-R10）",
        "properties": {
          "in": {
            "type": "integer",
            "minimum": 0
          },
          "out": {
            "type": "integer",
            "minimum": 0
          },
          "cached": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "cost_micros": {
        "type": "integer",
        "minimum": 0
      },
      "last_seq": {
        "type": "integer",
        "minimum": 0,
        "description": "运行流最后一条落库事件的 seq；AppendRun 同一事务更新"
      },
      "started_by": {
        "$ref": "common.schema.json#/$defs/Actor"
      },
      "replay_of": {
        "$ref": "common.schema.json#/$defs/Ulid"
      },
      "fork_of": {
        "$ref": "common.schema.json#/$defs/Ulid"
      },
      "fork_seq": {
        "type": "integer",
        "minimum": 0
      },
      "created_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      },
      "ended_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      }
    }
  },
  "NodeStateRow": {
    "type": "object",
    "required": [
      "exec_key",
      "node_id",
      "loc",
      "state",
      "attempt",
      "last_seq"
    ],
    "additionalProperties": false,
    "description": "节点执行状态的投影（GET /runs/{id}/nodes，W.04.04 §3.5）",
    "properties": {
      "exec_key": {
        "type": "string",
        "minLength": 1,
        "description": "一次节点执行的唯一键（C.06.05-R5）"
      },
      "node_id": {
        "$ref": "common.schema.json#/$defs/Ulid"
      },
      "loc": {
        "$ref": "common.schema.json#/$defs/Loc"
      },
      "state": {
        "$ref": "common.schema.json#/$defs/NodeState"
      },
      "attempt": {
        "type": "integer",
        "minimum": 1
      },
      "progress": {
        "type": "number",
        "minimum": 0,
        "maximum": 1
      },
      "round": {
        "type": "integer",
        "minimum": 1
      },
      "started_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      },
      "ended_at": {
        "$ref": "common.schema.json#/$defs/Timestamp"
      },
      "error": {
        "$ref": "run-event.schema.json#/$defs/NodeError"
      },
      "tokens": {
        "type": "integer",
        "minimum": 0
      },
      "cost_micros": {
        "type": "integer",
        "minimum": 0
      },
      "last_seq": {
        "type": "integer",
        "minimum": 0,
        "description": "更新这一行的最后一条事件的 seq"
      }
    }
  }
}
```

## 5. 行为
- 所有方法第一个参数是 `ctx`；时间都由调用方给（`E.07-R5`），存储按 UTC 毫秒保存（INV-23）。
- **图**：
  - `Create`：写 `GraphMeta`（`version` 为 `doc.version`），建 `main` 分支（`base_version` 0、`head` 为 `doc.version`、`created_by` 为 `by`、`created_at` 为 `meta.created_at`），存 `doc.version` 的全文。ID 已存在：`ErrConflict`。
  - `Commit`：同一个事务里：图或分支不存在、分支已删除：`ErrNotFound`；`c.Ops` 为空、版本号不是从分支 head+1 起连续：`ErrConflict`（`engine/op` 据此知道要 rebase，`C.05.04`）；Op 的 `id` 重复：`ErrConflict`；出错时什么都不写；追加 Op 记录；存最后一个版本的哈希（`Doc` 非空时连全文）；分支 head 推进；`main` 分支时 `GraphMeta` 的 `version`、`title`、`stats`、`updated_at` 一起更新，其他分支只更新 `updated_at`。
  - `Base(v)`：取这个分支版本 ≤ v 的最近一份全文；草稿分支自己没有全文时取 main 在 `base_version` 及以前的最近全文，再接上 main 到 `base_version` 的 Op 和本分支的 Op。`v` 大于 head：`ErrNotFound`。
  - `List` 不含已删除；`Meta` 已删除的仍能读到（`deleted_at` 有值）。
  - `Branches`：按名字排序，不含已删除；`behind`、`ahead` 读出时算（`api.schema.json` 的说明）。`CreateBranch`：名字必须是 `draft/…`（否则 `ErrConflict`），`base_version` ≤ main 的 head，已存在（含已删除）：`ErrConflict`；`head` 取 `base_version`。`DeleteBranch` 不能删 `main`（`ErrConflict`），分支不存在或已删除：`ErrNotFound`；名字不是 `main` / `draft/…`：`ErrConflict`。
- **Op**：`Coalesce` 只替换原 Op 的 `payload`，版本号、`inverse` 以外的字段不变（`C.05.04` §4、`C.06.03-R4`）；`UndoPush` 的 `Seq` 由调用方给，同一 (图, 分支, actor) 递增；`UndoTop(undone=false)` 取 seq 最大且没撤销的一条，`undone=true` 取 seq 最大且已撤销的一条；`UndoMark` 同时把这个 `GroupID` 的全部 Op 记录的 `undone` 改成同样的值。
- **不存在的对象**：对不存在的图、运行调用写方法（`Commit`、`SoftDelete`、`CreateBranch`、`SetStatus`、`AddUsage`、`SetProgress`、`AcquireLease`、`RenewLease`、`PutNodeStates`、`PutView`、`AppendRun`）返回 `ErrNotFound`；`Checkpoints().Put`、`ToolCalls().Begin`、`AppendSession` 不检查运行或会话是否存在；读方法对不存在的运行返回空结果。
- **运行**：`Create` 的 `no` = 这张图已有运行的最大 `no` + 1，`last_seq` 为 0；`List` 按 `created_at` 倒序、同时间按 id 倒序（Limit 同 `GraphQuery`），四个过滤条件都是"等于"，空值表示不过滤；`Unfinished` 是 `pending`、`running`、`paused` 的，按 `created_at` 升序；`AcquireLease`：没有持有者、持有者就是 owner、或 `lease_until` ≤ now 时成功；`RenewLease` 不是持有者：`ErrLeaseHeld`；`PutNodeStates` 按 `exec_key` 覆盖写，`NodeStates` 按 `exec_key` 排序；`ViewBefore` 取 seq ≤ 给定值的最近一份。
- **事件**：
  - `AppendRun`：同一个事务里给每条事件填 `seq`（从这次运行的 `last_seq` + 1 起连续，`C.06.01-R1`），同时更新 `RunMeta.last_seq`；调用方只传 P、S 级（E 级不落库），`evs` 的元素被原地填写 `seq`；运行不存在：`ErrNotFound`。`AppendSession` 同理，从这个会话已有的最大 seq + 1 起。
  - `RunRange`、`SessionRange`：seq > after，升序，最多 `limit` 条（≤ 0 时 1000）。`RunByNode`：`loc.node_id` 等于给定值的。`RunUntil`：seq ≤ upTo（fork 用）。
  - **图协同流不进事件表**（`P.09` K237）：`op.applied`、`op.coalesced` 由 `Ops().Range` 重建（`C.06.03-R1`）；提议、分支、授权书的事件描述的状态由各自的仓库在同一事务里保存，重连后从列表接口重新取（`C.06.03-R2`）。
- **检查点**：`Put` 覆盖 (运行, exec_key) 的当前检查点；`keepHistory` 时另存一份历史；`At` 取历史里 seq ≤ 给定值的最近一份。
- **工具调用**：`Begin` 幂等键已存在时不写，返回已有记录（INV-14）；`Finish` 只能从 `started` 改成 `succeeded` / `failed`，其余 `ErrConflict`。
- **设置**：键值，`value` 是任意 JSON；`All` 返回全部键。
- **分页游标**：按排序键做键集游标（`EncodeCursor`：上一页最后一项的 (时间, id)，下一页取排在它之后的），对调用方不透明；翻页期间没有写入时不重复、不遗漏；解不开时返回 `ErrBadCursor`。
- **Tx**：`fn` 里拿到的 `Store` 的所有读写都在同一个事务里，能读到自己的写入；`fn` 返回错误时回滚并原样返回；`fn` panic 时回滚并返回错误（`store: Tx 里 panic：…`，不再向上 panic）；嵌套调用复用外层事务，内层的错误由外层决定是否回滚。

## 6. 不变量
- 接口里没有"直接改图内容"的方法（`E.07-R4`）。
- 存储不读时钟、不生成 ID（`E.07-R5`）。
- 与前端共用的结构只用 `gen` 类型，不在 `engine/store` 里另写同样的结构（`G.02.05-R2`）；`Commit`、`Snapshot`、`UndoEntry`、`Usage`、`Checkpoint`、`ToolCall`、查询和分页只在存储内部和调用方之间用，不进 schema。

## 7. 错误处理
统一的哨兵错误：`ErrNotFound`、`ErrConflict`、`ErrLeaseHeld`，调用方用 `errors.Is` 判断；其余为包装后的底层错误（`fmt.Errorf("store: …: %w", err)`）。

## 8. 验收标准
1. 契约测试在两种实现上全部通过（`E.07-R3`）。
2. 事件 seq 无空洞（`C0601-T1`）。
3. `api.schema.json` 通过 `schemacheck`，生成的 `gen.GraphMeta` 等类型可直接用。

### 实施卡
- 要建 / 要改的文件：`schema/api.schema.json`、`tools/schemacheck/api_test.go`、`gen/types.go`、`gen/consts.go`、`gen/union.go`、`web/src/lib/protocol/generated/types.ts`、`web/src/lib/protocol/generated/consts.ts`、`web/src/lib/protocol/generated/wire.ts`、`engine/store/store.go`、`engine/store/errors.go`、`engine/store/storetest/storetest.go`、`engine/store/storetest/graphs.go`、`engine/store/storetest/ops.go`、`engine/store/storetest/runs.go`、`engine/store/storetest/events.go`、`engine/store/storetest/misc.go`
- 生成物（`gen/`、`generated/`）由验证者在加了 `api.schema.json` 之后运行 `go run ./tools/gen` 产出，实施者不手写（`G.02.05-R1`）；改不到的生成物不改。
- 不许碰的文件：`tools/gen/`、`tools/relay/`、`tools/build/`、`engine/store/memstore/`、`engine/store/sqlite/`、`internal/`、`cmd/`、`web/src/lib/protocol/mapping.ts`
- `storetest.Run(t *testing.T, newStore func(t *testing.T) store.Store)`：每个子测试用一个新的 `Store`；契约用例写成 `storetest` 里的子测试，子测试名以下面"在其他叶子跑"的编号开头（`storetest` 不是 `_test.go` 文件，由两种实现的测试调用）。
- 测试用例：
  - `E0701-T4 api.schema.json`：6 个结构各一个合法例、各两个以上反例（缺必填、多出字段、`no` 为 0、`progress` 为 1.5、`behind` 为 -1、时间不带 `Z`）
- 在其他叶子跑的测试用例（不算本叶子的完成条件；用例写在本叶子的 `storetest` 里）：
  - `E0701-T1 契约测试全集`：7 个仓库各至少 5 条，覆盖 §5 的每一条（`Commit` 的版本不连续、分支不存在、Op id 重复；`Base` 的全文 + 之后的 Op、草稿分支接 main；`Branches` 的 `behind`、`ahead`；`UndoTop` / `UndoMark` 同步 Op 的 `undone`；`Create` 分配 `no`；`List` 的过滤、排序、翻页不重不漏；`AcquireLease` 三种成功和一种失败；`AppendRun` 填 seq、运行不存在；`Begin` 幂等；`Finish` 状态限制；哨兵错误用 `errors.Is`）
  - `E0701-T2 Tx 回滚`：`fn` 返回错误、`fn` panic 两种情况下，`fn` 里做的图、运行、事件写入都不留下；嵌套 `Tx` 里的写入随外层一起提交或回滚
  - `E0701-T3 seq 连续`：一次运行分 100 批连续写 1 万条 P 级事件，`RunRange` 读出的 seq 从 1 到 10000 无空洞（`C0601-T1`）
  - 以上三条在 memstore 上跑：`E0705-T1`（`E.07.05`）；在 SQLite 上跑：`E0702-T3`（`E.07.02`）
  - `Base` + 重放得到正确的图（原 `E0702-T3`）：`E.05` 复查时写进它的实施卡
- 允许使用的依赖：标准库、`gen`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
| 2026-11-24 | 第 6 片（`m0-store`）开工前复查：本片只做 7 个仓库；方法清单写全；会发给前端的 6 个结构写进 `api.schema.json`、存储用 `gen` 类型；`Commit` 是图内容唯一的写法，`Base` 只取全文和之后的 Op（重放在 `engine/op`）；事件按流分方法，图协同流不进事件表；去掉 `obs.Usage`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K236、K237 |
| 2026-11-24 | 状态改为"冻结"：第 6 片（`m0-store`）squash 合并进代码仓库 `main`，提交 `89998584f1faadbb8d014b636230faea4bdd0c30`（`G.02.06-R21`） | `relay slice` 通过；评审 8 条全部符合；按 `G.08-R3` 由验证者合并 |
