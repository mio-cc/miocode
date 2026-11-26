# E.09.01 事件写入

| 项 | 内容 |
|---|---|
| 编号 | E.09.01 |
| 类型 | 实施 |
| 上级 | E.09 obs 可观测 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引_关键决定 |
| 最后修改 | 2026-11-26 |

## 1. 职责
提供事件写入器：分配 seq、生成运行路径、攒批落库、落库后再广播；以及事件到投影（节点状态、时间线）的重放。

## 2. 不做什么
- 不实现 SSE 推送（`B.05`，它订阅这里的广播）

## 3. 继承的上级约束
INV-11、INV-24、`C.06.01`、`C.06.05`、`E-R4`。

## 4. 接口
```go
// engine/obs/writer.go。obs 只能 import gen（E.01 §1），存储、时钟都用本包的接口，由组装处接上
type EventStore interface {                                // store.EventRepo 满足它
    AppendRun(ctx context.Context, runID string, evs []gen.RunEvent) (int64, error)
    AppendSession(ctx context.Context, sessionID string, evs []gen.SessionEvent) (int64, error)
}
type WriterOpts struct {
    Now      func() time.Time   // 必填
    MaxData  int                // data 的上限，默认 4096 字节（C.06.01-R4）
    SPerSec  int                // S 级事件每个执行每秒最多落库几条，默认 4
}
type Writer struct{ /* … */ }
func NewWriter(s EventStore, hub *Hub, o WriterOpts) *Writer
func (w *Writer) EmitRun(ctx context.Context, runID string, evs ...gen.RunEvent) error          // 返回时 P 级、没被节流的 S 级已落库并广播
func (w *Writer) EmitSession(ctx context.Context, sessionID string, evs ...gen.SessionEvent) error
func (w *Writer) EphemeralRun(ev gen.RunEvent)             // E 级：seq 0，只广播
func (w *Writer) EphemeralSession(ev gen.SessionEvent)
var ErrNoActor, ErrDataTooLarge = errors.New(…), errors.New(…)

// engine/obs/hub.go
type StreamKey struct{ Kind, ID string }                   // Kind：run | session
type Sub struct{ C <-chan any; /* … */ }                   // 收到 gen.RunEvent 或 gen.SessionEvent
func (s *Sub) Close()
func (s *Sub) Lagged() bool                                // 订阅者太慢、被断开（缓冲满）：由订阅者重新同步（B.05）
func NewHub(buffer int) *Hub                               // 每个订阅者的缓冲，默认 256
func (h *Hub) Subscribe(k StreamKey) *Sub                  // 只收实时的；补发历史由订阅者从存储读（B.05.02）

// engine/obs/path.go（C.06.05）
type PathItem struct { NodeID, Label string; Iter gen.Iter; SameLabel bool }
func PathOf(chain []PathItem) string                       // chain 从外到内，最后一项是节点本身
func ExecKey(loc gen.Loc) string                            // C.06.05-R5
```

## 5. 行为
1. `EmitRun`：每条事件填 `ts`（`Now`）、`run_id`；`actor` 为空 → `ErrNoActor`；`data` 超过 `MaxData` → `ErrDataTooLarge`（大内容由调用方先写进工作区，只放 `*_ref`，`C.06.01-R4`）；一条都不写。
2. S 级事件（`node.progress`、`node.throttled`）按执行节流：同一个 `ExecKey(loc)` 每秒（按 `Now`）最多落库 `SPerSec` 条，多的只广播、seq 为 0。
3. 一次调用的事件一次 `AppendRun`（seq 在同一事务里分配，`C.06.01-R1`）；成功后按顺序交给 Hub 广播，再返回。不跨调用攒批：调度循环是单写者，每次就把手上的一批交给 `EmitRun`，跨调用攒批只会给每次状态变化加延迟（`P.09` K265）。
4. 落库失败：返回错误，不广播；调用方（调度循环）把运行转为 failed（`internal`）——宁可停下，也不能出现"状态变了但没记录"。
5. Hub：每个订阅者一个有界缓冲；广播时缓冲满的订阅者被断开（`Lagged` 为 true），不阻塞写入。
6. 状态投影（节点状态、时间线）、视图快照（`hx_run_views`）属于运行，移到 `E.16.01`（`P.09` K265）。

## 6. 不变量
- 广播出去的 P 级事件一定已经落库
- 落库失败的事件不广播

## 7. 错误处理
见 §5 第 1、4 条。

## 8. 验收标准
1. 先落库再广播；落库失败不广播
2. S 级节流
3. 路径生成测试向量（`C0605-T2`、`T3`）
4. 1 万条事件写入 < 1s（`ANYDOOR_PERF=1` 时判）

### 实施卡
- 要建 / 要改的文件：`engine/obs/writer.go`、`engine/obs/hub.go`、`engine/obs/path.go`、`engine/obs/obs_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/llm/`
- 测试用例：
  - `E0901-T1 先落库再广播`：订阅者收到的事件都已在存储里、seq 和存储一致；存储返回错误时订阅者什么也没收到；没有 actor、`data` 超长时一条都不写；`EmitSession` 同样
  - `E0901-T2 节流`：同一个执行 1 秒内 10 条 `node.progress` 只落库 4 条、广播 10 条；下一秒又能落库；不同执行各自计数；P 级不节流
  - `E0901-T4 路径向量`：`schema/examples/path_vectors.json` 每一条的 `path`、`key` 与 `PathOf`、`ExecKey` 相同（`C0605-T2`、`C0605-T3`）
  - `E0901-T5 BenchmarkEmit`：memstore 上 1 万条（100 批）；`ANYDOOR_PERF=1` 时断言 < 1s
  - `E0901-T6 Hub`：多个订阅者都收到；慢订阅者缓冲满后被断开且 `Lagged`，不阻塞写入；`Close` 后不再收到
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E0901-T3 重放一致`：投影移到 `E.16.01`，在那里跑（`C07-T2`）
- 允许使用的依赖：标准库、`gen`；测试另用 `engine/store/memstore`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ④ 片（`m1-base`）开工前复查：存储、时钟改为本包接口（obs 只能用 gen）；按流分 `EmitRun`、`EmitSession`，用 K237 的 `AppendRun` / `AppendSession`；不跨调用攒批；`data` 超长报错；`PathOf` 输入改为 `PathItem` 链；投影和视图快照移到 `E.16.01`；加 `E0901-T6`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K265 |
