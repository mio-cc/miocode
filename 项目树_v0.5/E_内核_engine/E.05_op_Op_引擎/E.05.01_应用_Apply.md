# E.05.01 应用 Apply

| 项 | 内容 |
|---|---|
| 编号 | E.05.01 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引08 |
| 最后修改 | 2026-11-25 |

## 1. 职责
实现 Op 流水线 `Submit` 和读图 `Read`、M1 收的每种 Op 的应用函数与逆操作计算（`E.05-R6`）、持久化接口 `Repo` 和它的适配器、格式升级写 `migrate` Op。

## 2. 不做什么
- 不实现授权判定本身（`authz.Checker`；M1 用固定放行的桩，`E.05.05`）
- 不实现作用对象、可交换判定和 rebase（`E.05.03`）、撤销重做与撤回（`E.05.02`）、拖动合并（`E.05.04`），只在流水线里调用
- 不实现 HTTP 接口（`B.04.02`）和事件推送（`B.05`）：广播交给调用方给的 `Bus`
- 不写审计（M3，`S.10`）；不维护图文档的 `packages` 字段（M2，扩展包）
- 不处理 `E.05-R6` 里 M2–M4 的 Op

## 3. 继承的上级约束
`C.05`、`C.05.01`–`C.05.04`、`C.03.03`、`C.06.03`（`op.applied`、R1）、`C.12-R2`、INV-08、INV-09、INV-23、`E.05-R1`–`R8`、`E.02-R2`、`E.07.01` §5、`E.03.03` §5（`Validate`、`ValidateIncremental`、`Touched`）。

## 4. 接口
```go
// pipeline.go
type Options struct {
    Repo       Repo
    View       schema.View         // 注册表的实时视图（Registry.Live()）
    Authz      authz.Checker       // M1 为 authz.Fixed{}（E.05.05）
    Estop      Estop               // 可为 nil：没有急停（E.06.04 实现，M3）
    Proposer   Proposer            // 可为 nil：不能转为提议（E.17.03 实现，M4）
    Bus        Bus                 // 可为 nil
    Runs       RunNotifier         // 可为 nil（E.16.02 实现）
    Now        func() time.Time    // 必填；返回 UTC（INV-23）
    NewID      func() string       // 必填；新的 ULID（op id、group id、自动加的节点 id）
    Migrations []migrate.Step      // nil 时用 migrate.Chain
    Logger     *slog.Logger        // nil 时不记
}
func New(o Options) *Pipeline      // Repo、View、Authz、Now、NewID 缺一个就 panic

type Batch struct {
    GraphID, Branch string
    BaseVersion     int64
    GroupID         string          // 空：整批共用一个新的
    Actor           gen.Actor       // 调用方按鉴权结果填（API 层 / 编排者 / 运行时）
    Approver        *gen.Actor      // 采纳提议时（M4）
    MandateID       string
    Taint           bool
    RunID           string          // 由运行引出时填；急停按运行判断
    Ops             []gen.Op
    mode            mode            // normal | undo | redo；只有 E.05.02 设（internal 批次）
}

type Result struct {
    Version  int64
    Applied  []string               // 落库的 op id，按版本顺序
    Rebased  bool
    IDMap    map[string]string      // M1 一直是空对象（临时 ID 在 M4，E.05.06）
    Diags    []gen.Diag             // 提交后整张图的全部诊断（error 与 warn）
    Proposal string                 // 非空：已转为提议（HTTP 202）
}

func (p *Pipeline) Submit(ctx context.Context, b Batch) (*Result, error)
// Read 读某个版本的图（version 为 Head，即 -1 时读 head；0 是建图时的版本）和它的全量诊断（error 与 warn）。
const Head int64 = -1
func (p *Pipeline) Read(ctx context.Context, graphID, branch string, version int64) (*graph.Graph, []gen.Diag, error)

type Estop interface{ Active(runID string) bool }                 // 全局或这个运行在急停中
type Proposer interface {                                         // 在同一个事务里存提议，返回提议 ID
    Propose(ctx context.Context, r Repo, b Batch, res []authz.Result) (string, error)
}
type Bus interface{ Publish(evs []gen.GraphEvent) }                // 事务提交之后调用；不能阻塞
type RunNotifier interface{ GraphChanged(graphID, branch string, version int64) }

// 应用函数（E.05-R8）：在 m 上应用一条 Op；可以补全 op.Payload（E.05-R7，补全后的写进日志）。
type applier func(m *mutable, op *gen.Op, env *env) (inverse []gen.Op, touched schema.Touched, err error)

// repo.go
type Repo interface {
    Tx(ctx context.Context, fn func(Repo) error) error
    Head(ctx context.Context, graphID, branch string) (int64, error)
    Base(ctx context.Context, graphID, branch string, version int64) (Snapshot, error)
    Range(ctx context.Context, graphID, branch string, after, upTo int64) ([]gen.OpRecord, error)
    Op(ctx context.Context, opID string) (gen.OpRecord, error)
    Commit(ctx context.Context, c Commit) error
    Coalesce(ctx context.Context, opID string, payload json.RawMessage) error
    UndoPush(ctx context.Context, e UndoEntry) error
    UndoTop(ctx context.Context, graphID, branch, actorID string, undone bool) (UndoEntry, bool, error)
    UndoMark(ctx context.Context, e UndoEntry, undone bool) error
}
type Snapshot struct { Version int64; Doc *gen.Graph; Ops []gen.OpRecord }
type Commit struct {
    GraphID, Branch string
    Ops             []gen.OpRecord
    Doc             *gen.Graph
    Hash, Title     string
    Stats           gen.GraphMetaStats
    At              time.Time
}
type UndoEntry struct { GraphID, Branch, ActorID string; Seq int64; GroupID string; Undone bool }
var ErrRepoNotFound, ErrRepoConflict = errors.New(…), errors.New(…)   // 适配器把 store.ErrNotFound、ErrConflict 换成它们

// engine/opstore.go（package engine）
func NewOpStore(s store.Store) op.Repo    // 方法一一转给 store；Head 取 Graphs().Branches() 里这个分支的 head
```

## 5. 行为

### 5.1 Submit
```
Submit(b):
 0. 整理与结构校验（不读库）
    - Ops 为空或超过 500 条 → ErrBadRequest
    - normal 批次每条按 kind 严格解码 payload（gen.DecodeAs：不认识的字段、类型不对都报错），取值范围按 §5.2 的前置条件查；
      整份请求体按 OpsRequest 的 JSON Schema 校验在 API 层（B.03；op.schema.json 没有根结构，View.DocSchema 校验不了 $defs/Op，P.09 K262 ①）；
      internal 批次（撤销、重做、撤回展开的）不再解码校验
    - kind 按 E.05-R6：还没收的、normal 批次里的 restore_nodes → ErrBadRequest（文案写里程碑）
    - revert_op、revert_to 只能单独成批，否则 ErrBadRequest；交给 expanders 展开（E.05.02 §5.5），展开后从这里接着走
    - 丢掉客户端填的 actor、approver、inverse、ts（target 在第 5 步重算）；没填 id 的生成；批内 id 重复 → ErrBadRequest
    - group_id：整批一个，取 Batch.GroupID，否则第一条 Op 填的，否则生成；Op 各自填了不同的 → ErrBadRequest
    - actor 为 model 时每条都要有 reason，否则 ErrBadRequest；taint：Batch.Taint 或 Op 自己是 true 就写 true
 1. 同一张图进程内串行（按 graphID 的互斥锁）；Repo.Tx 开始
 2. 取 head（§5.3 缓存）；分支不存在 → ErrNotFound。文档格式比迁移链的终点旧时先写一条 migrate Op（§5.5）
 3. BaseVersion > head → ErrBadRequest；< head：missed = Range(base, head)，Commutes（E.05.03）→ 能交换：Rebase，Result.Rebased=true；不能：ConflictError{Head, Missed, Conflicts}
 4. 拖动合并：coalescer 不为 nil 且处理了这一批 → 返回它的结果（E.05.04）
 5. 每条算 target（E.05.03 Target；和客户端填的不同时以计算结果为准，记一条日志）；授权钩子（E.05.05）：
    Deny → 对应的错误；Propose → Proposer 为 nil 时 ErrForbidden（"M1 还不能转为提议"），否则存提议并返回 Result{Proposal}
 6. 在 head 文档的副本上逐条应用（appliers），收集 inverse 和 touched；每条应用后文档 version + 1；任一失败 → ErrInvalid（第几条、为什么），回滚
 7. 校验：这一批只有 move_nodes、set_node_ui、add_note、update_note、remove_notes、set_graph_title、set_graph_meta 时沿用缓存里的诊断（这些不影响校验，P.09 K261）；
    否则 ValidateIncremental(缓存里的诊断, touched 的并集, Opts{ForRun: true})；
    和缓存里的诊断比，这一批新出现的 error 里有 V01、V03、V05、V06、V07、V09、V12、V14 的（C.05.02 前置条件要求的端口、类型、成环、参数值）→ InvalidGraphError{Diags: 这些}，回滚；
    其余 error（V02、V08、V10、V11、V16：图还没搭完）和 warn 不阻止，随 validate 事件发出（P.09 K262 ②；migrate 例外，§5.5）
 8. 落库（同一个事务）：
    - Repo.Commit：每条 Op 一个 OpRecord，版本号 head+1 起；Op 带服务器填的 id、actor、approver、mandate_id、reason、taint、target、group_id、coalesce_key、inverse、ts（Now）
      Hash = graph.Hash(最后的文档)，Title、Stats 见 §5.4；
      Doc：最后的版本 − 最近一份全文的版本 ≥ 50，且最后一条 Op 没有 coalesce_key 时给全文（有 coalesce_key 的版本以后可能被合并改掉，全文推到下一次，E.05.04）
    - 撤销栈（E.05.02 §5.1）：actor 是 user 或 model 时，normal、redo 批次把 group 推进 actor.id 的栈（栈顶已是这个 group 时不重复推）；normal 批次再把 actor.id + "#redo" 栈里还在的全部弹出；undo 批次不推
 9. 事务提交后：更新缓存；Bus.Publish 每条 Op 一个 op.applied（seq = 这条的版本号，data {op, version}，actor = 批次的 actor），
   再一条 validate（E 级，seq 0，data {version: 最后的版本, diags: 提交后的全部诊断}，C.06.03，P.09 K262 ④）；Runs.GraphChanged(graph, branch, 最后的版本)
```
- `Repo.Commit` 返回 `ErrRepoConflict`：返回 `ConflictError`（同一进程串行、单实例锁保证只有一个进程，正常不会出现）。
- `Result.Diags` 是提交后整张图的全部诊断（error 和 warn，K262 ④）；`Result.IDMap` 是空对象。

### 5.2 每种 Op 的应用（`C.05.02`、`C.05.03`）
通用规则：
- **文档规范化**（读进缓存时做一次，之后每次修改都保持）：每一层的 `nodes`、`edges`、`notes` 按 ID 排序，插入时放在排序位置；`promoted` 按名字排序；等于 schema 默认值的可选字段不写（`lock: none`、便签 `color: none`、空的 `title`）；节点参数里等于 NodeDef 默认值的键删掉（没有默认值时 `null` 当作没写；`Node.params` 本来就"只存和默认值不同的键"，P.09 K262 ③）。这样"应用再逆序应用逆操作"回到逐字节相同的文档（`C.05.03-R1`；`Removed` 里没有原来的数组位置）。
- 前置条件不满足 → `ErrInvalid`。端口存在、方向、类型兼容、成环、参数值合法交给第 7 步的校验（V03、V05–V07、V09；失败是 `InvalidGraphError`）。
- 删除类 Op 的 `touched` 带被删的 ID（增量校验因此退回全量，`P.09` K259）。
- internal 批次的逆操作可以用空值表示"删掉这个字段"：`set_label`、`set_graph_title` 的空串，`set_tags` 的 `[]`，`set_node_ui`、`set_graph_meta` 的 `{}`；客户端提交时同样按"删掉"处理（schema 允许的那些）。

| kind | 前置条件 | 应用 | 逆操作 |
|---|---|---|---|
| `add_node` | `scope` 存在（`root` 或容器节点）；`node.id` 全树没用过；`type` 已注册；不在 `gen.ContainerRules` 里的类型不能带 `children`、`ref` | 插入；类型的 `children` 是 `required` 或 `one_of`、而 `children`、`ref` 都没给时，放一对子图端口节点（`role` 为 `entry`、`exit`，ID 用 `NewID`，坐标在容器坐标左右各偏 240），写进这条 Op 的 `payload.node.children`（`E.05-R7`） | `remove_nodes{ids:[id]}` |
| `remove_nodes` | `ids` 都存在 | 删节点（连同子图）和所在层里两端任一是被删节点的连线 | `restore_nodes{removed}`：`nodes` 记 `{scope, node}`（含 `children`），`edges` 记 `{scope, edge}` |
| `restore_nodes` | 只在 internal 批次；ID 都没被占用；`scope` 存在 | 插回节点和连线 | `remove_nodes{ids: 节点 ID}` |
| `connect` | `edge.id` 没用过；两端节点存在且在同一层 | 插入；目标端口存在且不是多连（`schema.Ports` 的 `multi`）时，先删掉已经连到它的连线 | `disconnect{ids:[新 id]}`，有被替换的再加逐条 `connect{edge: 旧}` |
| `disconnect` | `ids` 都存在 | 删 | 逐条 `connect{edge}` |
| `set_param` | 节点存在；`key` 是这个类型的参数；参数锁不是 `def`、`kernel`（`C.03.03`）；`path` 只用于 `schema_from` 对象参数 | 有 `path` 时改这个对象参数的一个属性（`to` 为 `null` 时删掉属性）；新值等于默认值（规范化 JSON 比较）或参数没有默认值而新值是 `null` 时删键，否则写；比较修改前后的 `schema.Ports`，消失的动态端口上的连线一并删除 | `set_param{to: 整个参数的旧值}`（不带 `path`；旧值不存在时为默认值，没有默认值为 `null`，K262 ⑤），有一并删除的连线再加逐条 `connect` |
| `promote_param` | `promotable: true`；还没提升 | 加进 `promoted` | `demote_param` |
| `demote_param` | 已提升 | 移出；连到它生成的那个输入端口的连线删掉 | `promote_param` + 逐条 `connect` |
| `set_label`、`set_tags`、`set_lock` | 节点存在；`set_lock` 的 actor 在 `E.05.05` 检查 | 改字段（`set_lock` 为 `none` 时删字段） | 同 kind，`to` 换成旧值（没有时用上面的空值或 `none`） |
| `move_nodes` | 每个 `id` 存在 | 改 `pos` | `move_nodes`，旧坐标 |
| `set_node_ui` | 节点存在 | 整体替换 `ui` | `set_node_ui{to: 旧 ui 或 {}}` |
| `add_note` | `scope` 存在；`id` 没用过 | 插入 | `remove_notes{ids:[id]}` |
| `update_note` | 便签存在 | 改给出的字段 | `remove_notes{ids:[id]}` + `add_note{scope, note: 旧便签整份}`（旧便签没有 `size` 时 `update_note` 写不出"删掉 size"，`P.09` K261） |
| `remove_notes` | 都存在 | 删 | 逐条 `add_note` |
| `set_graph_title` | — | 改标题 | 旧值（没有时为空串） |
| `set_graph_meta` | — | 只改 `meta.description`（`to` 里没有时删掉它） | 旧值（没有时 `{}`） |
| `migrate` | actor 在 `E.05.05` 检查；`from_schema` 等于文档当前的 `schema_version` | 按迁移链升级（`json.Marshal` → `migrate.Apply` → 解回 `gen.Graph`） | 无（不可逆，不进撤销栈，`C.05.03` §2） |
| `revert_to` | internal（`E.05.02` 展开后） | 按顺序应用 `ops` 里的每一条 | `revert_to{version: 应用前的 head, ops: 子 Op 的逆操作倒序拼起来}` |

`touched`：被改的节点、连线（含一并删除和替换掉的）；`add_node`、`add_note` 写新的 ID；`migrate` 用"全部"（全量校验）。

### 5.3 head 缓存与 Read
- 每个 (图, 分支) 缓存一份：`version`、规范化后的文档、`*graph.Graph`、诊断（`Opts{ForRun: true}` 的全量或增量结果）、最近一份全文的版本、上一次拖动合并的时间（`E.05.04`）。
- 没有缓存或版本对不上：`Repo.Base(head)` → 规范化全文 → 按 `Snapshot.Ops` 逐条重放（同一套应用函数，按日志里的 payload，不补全、不生成 ID）→ `graph.FromDoc` → `Validate`。
- `Read(v)`：`v` 为 `Head`（-1）或等于 head 时返回缓存；其他版本同样 `Base(v)` + 重放 + 全量校验，不进缓存。`v` 大于 head：`ErrNotFound`。
- 缓存只在事务提交后更新；事务回滚时丢掉这次的副本。

### 5.4 提交时写进元信息的
- `Title`：文档的 `title`，没有为空串。
- `Stats`：`nodes` 为全部层的节点数，`subgraphs` 为 `root` 以外的子图数，`layers` 为最大深度 + 1（`graph.Depth`）。

### 5.5 格式升级（`C.12-R2`）
- 建缓存后，文档的 `schema_version` 比迁移链终点（`Migrations` 最后一步的目标版本）旧：先以 `actor {kind: runtime, id: migrate}`、reason "格式升级" 提交一条 `migrate{from_schema, to_schema}`，版本号 + 1，历史版本不改写；迁移链为空时什么都不做。
- `migrate` 批次第 7 步做全量校验，结果进缓存，但 error 不阻止写入（图本来有问题不能让升级失败）。
- `Read` 历史版本时不迁移，原样返回。

## 6. 不变量
- 任意 M1 Op 序列：应用后再逆序应用逆操作，规范化哈希与原图相同（`C.05.03-R1`；`graph.Hash` 含 `version`，比较前两边的 `version` 设成相同）
- 重放日志得到的文档与提交时的文档逐字节相同（`E.05-R7`）
- 版本号在同一分支连续，无空洞（拖动合并不加版本）
- 失败的批次不留下任何写入，不发事件
- 每层的 `nodes`、`edges`、`notes` 按 ID 排序

## 7. 错误处理
`errors.go`，API 层（`internal/api/errors.go`，第 ⑦ 片）映射到 `C.11` §3：

| 错误 | HTTP / code | 带什么 |
|---|---|---|
| `ErrBadRequest` | 400 `bad_request` | 第几条、哪里不对 |
| `ErrInvalid` | 400 `bad_request` | 第几条、哪个前置条件不满足 |
| `ErrNotFound` | 404 `not_found` | 图、分支、Op |
| `*ConflictError`（`errors.Is(err, ErrConflict)`） | 409 `graph_conflict` | `head`、`missed_ops`、`conflicts`（`GraphConflictDetails`） |
| `*InvalidGraphError`（`ErrInvalidGraph`） | 422 `invalid_graph` | `diags` |
| `*DeniedError` 包着 `ErrForbidden` / `ErrNodeLocked` / `ErrEstopped` | 403 `forbidden` / 403 `node_locked` / 423 `estopped` | `reasons`；`node_locked` 另带 `node`、`lock`（`E.05.05`） |
| `ErrNothingToUndo` | 200 `{applied: []}`（不是错误，`E.05.02`） | — |

## 8. 验收标准
1. M1 收的每种 Op 正例应用成功、违反前置条件的报 `ErrInvalid`
2. 属性测试 1000 组逆操作往返
3. 100 个并发提交，版本连续、无丢失
4. 批次中第 3 条失败，前 2 条不落库、不发事件
5. 模型伪造 actor 无效，模型不带 reason 返回 400
6. 重放日志（跨过 50 版的全文）得到的图和提交时相同

### 实施卡
- 要建 / 要改的文件：`engine/op/pipeline.go`、`engine/op/repo.go`、`engine/op/errors.go`、`engine/op/mutable.go`、`engine/op/cache.go`、`engine/op/migrate.go`、`engine/op/apply_node.go`、`engine/op/apply_edge.go`、`engine/op/apply_param.go`、`engine/op/apply_attr.go`、`engine/op/apply_view.go`、`engine/op/apply_graph.go`、`engine/opstore.go`、`engine/op/helpers_test.go`、`engine/op/pipeline_test.go`、`engine/op/apply_test.go`、`engine/op/prop_test.go`、`go.mod`、`go.sum`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/authz/`
- 测试用例：
  - `E0501-T1 每种 Op 正反例`：M1 收的每种 Op 一个正例、每个前置条件一个反例；模型提交 `set_lock` 返回 403；`connect` 到已有连线的非多连端口时替换旧连线、提交逆操作后恢复（`C0502-T2`、`C0502-T3`）
  - `E0501-T2 逆操作属性测试`：rapid，1000 组、每组 1–50 条随机的 M1 Op，逆序提交逆操作后规范化哈希相同（`C0503-T1`）
  - `E0501-T3 并发 100`：100 个 goroutine 同时提交，版本 1–100 连续、Op 都在；memstore 和 SQLite 各一遍（`C0504-T1`）
  - `E0501-T4 批次原子性`：第 3 条失败时前 2 条不落库、不发事件（`C0501-T3`）
  - `E0501-T5 actor 与 reason`：Op 里写 `actor: user` 而批次是模型，落库的是模型；模型不带 `reason` 返回 400（`C0501-T1`、`C0501-T2`）
  - `E0501-T6 不收的 kind`：`E.05-R6` 里 M2–M4 的每种 kind、客户端提交的 `restore_nodes` 返回 400，文案写里程碑
  - `E0501-T7 migrate Op`：测试专用的 `1.0 → 1.1` 迁移链：读到 `1.0` 的图时写出一条 `migrate` Op（actor `runtime/migrate`、版本 + 1），`Read` 旧版本仍是 `1.0`（`E0301-T12`、`C12-T1`）
  - `E0501-T8 增量与全量一致`：rapid，随机 M1 Op 序列逐个提交，每次缓存里的诊断与对同一张图 `Validate` 的结果相同（`E0303-T19`）
  - `E0501-T9 Base 加重放`：连续 120 个版本，抽查的每个版本 `Read(v)` 与当时提交后的文档相同；第 50、100 版存了全文；memstore 和 SQLite 各一遍（原 `E0702-T3`，`P.09` K237）
  - `E0501-T10 服务器补全写进日志`：`add_node` 加一个不带 `children` 的循环节点，日志里那条 Op 的 `payload.node.children` 有一对子图端口节点；清掉缓存重放得到同样的图
  - `E0501-T11 广播与通知`：提交后每条 Op 一个 `op.applied`、`seq` 是版本号；失败的批次不发；`RunNotifier` 收到最后的版本
  - `E0501-T12 rebase 等价性`：rapid，两组互不冲突的随机 Op，第二组以旧版本提交（自动 rebase）与以最新版本提交得到的图相同（`E0503-T2`）
  - `E0501-T13 提议与急停接线`：假 `Checker` 返回 `propose`：没有 `Proposer` 时 403，有假 `Proposer` 时返回 `Proposal` 且不落 Op；假 `Estop` 急停中模型的批次 423、用户的照常
- 允许使用的依赖：标准库、`gen`、`engine/graph`、`engine/schema`、`engine/schema/migrate`、`engine/authz`；`engine/opstore.go` 另用 `engine/store`；测试另用 `engine/store/memstore`、`engine/store/sqlite`、`pgregory.net/rapid`（`G.10` 已登记，加进 `go.mod`）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
| 2026-11-25 | 第 ③ 片（`m1-op`）开工前复查：只做 M1 收的 Op（`E.05-R6`，`group`、`ungroup` 到 M2、临时 ID 到 M4）；加 `Repo` 接口与适配器、`Read`、head 缓存、文档规范化、服务器补全写进日志、格式升级；每种 Op 的前置条件和逆操作写成表；只改视图的批次跳过增量校验；全文每 50 版且避开带 `coalesce_key` 的版本；补 `E0301-T12`、`E0303-T19`、`E0503-T2`、`Base` 加重放的用例；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K261 |
| 2026-11-25 | 写代码时补：第 0 步改为按 kind 严格解码（整份请求体的 schema 校验在 API 层）；第 7 步只拒绝新出现的 V01、V03、V05–V07、V09、V12、V14，其余 error 不阻止；提交后发 `validate` 事件；`Result.Diags` 是全部诊断；规范化删掉等于默认值的参数；`set_param` 的逆操作是整个参数的旧值；`Read` 用 `Head`（-1）表示读 head | `P.09` K262 |
