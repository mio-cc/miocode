# E.15.02 并发与资源池

| 项 | 内容 |
|---|---|
| 编号 | E.15.02 |
| 类型 | 实施 |
| 上级 | E.15 sched 调度 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引03 |
| 最后修改 | 2026-11-26 |

## 1. 职责
实现全局并发上限和资源池：每个模型、每个工具一个池，同时限制"同时在飞的调用数"和"速率"。

## 2. 不做什么
- 不实现令牌桶算法本身（`E.15.03`）

## 3. 继承的上级约束
`引03` §3.4–§3.5、`G.11` `pools.global_concurrency`、`P.09` Q16。

## 4. 接口
```go
// engine/sched/pool.go
type PoolConfig struct {
    Concurrency int   // ≤ 0：不限
    PerMinute   int   // ≤ 0：不限速
    Burst       int
}
type Config struct {
    Global  int                     // 全局并发，G.11 pools.global_concurrency，默认 8（≤ 0 时取 8）
    Default PoolConfig              // 没单独配的资源池用它
    Pools   map[string]PoolConfig   // 键：llm:<provider>/<model> | tool:<id>
}
type Pools struct{ /* 当前配置 + 键 → *Pool */ }
func NewPools(cfg Config, clock Clock) *Pools
func (ps *Pools) Reconfigure(cfg Config)          // 之后取的快照用新配置；已取的快照不变（G.11 "下次运行"）
func (ps *Pools) Snapshot() *PoolSet              // 一次运行开始时取一份

type PoolSet struct{ /* 一次运行看到的资源池 */ }
func (s *PoolSet) Global() *Gate                   // 全局并发
func (s *PoolSet) Get(key string) *Pool
type Gate struct{ /* 信号量 */ }
func (g *Gate) TryAcquire() (release func(), ok bool)

type Pool struct{ /* 并发信号量 + RateLimiter + 等待数 */ }
func (p *Pool) Key() string
func (p *Pool) Waiting() int64
func (p *Pool) Acquire(ctx context.Context, onWait func(waiting int64)) (release func(), err error)
func (p *Pool) Ready() bool                        // 派发时的粗过滤：并发和令牌都有余量（不占）
func (p *Pool) Penalize(factor float64, d time.Duration) // 临时降低速率（模型返回 429 时，E.10.09）；不限速的池什么也不做
```

## 5. 行为
- 全局并发：一份配置一个全局信号量，同一配置下取的快照共享它；`Reconfigure` 之后的快照用新的信号量。派发节点前 `TryAcquire`，满了就停止派发。多次运行同时进行，不限次数（`P.09` Q16）。
- 资源池：执行器每次真正调用模型或工具时 `Acquire`；先等并发、再等令牌（`E.15.03`）。同一个键在同一配置的所有快照里共享同一个池；配置改了以后新快照用新池（拿着旧池的运行用旧池跑完）。
- `limit` 是- 节点参数可以把配额调小、不能调大（`E.14` 的执行器自己用一个小信号量实现，本包只管池级的上限）。满或没有令牌）调一次 `onWait(当前等待数)`，由调用方发 `node.throttled`（落库节流在 `E.09.01`）；拿到后等待数减一。
- 背压（有界 channel）在运行里做（`E.16.01`，`P.09` K265）。

## 6. 不变量
- 任何时刻在飞调用数不超过池的并发上限
- 全局在飞节点数不超过全局上限

## 7. 错误处理
ctx 取消时 `Acquire` 立刻返回 ctx 的错误，不占名额。

## 8. 验收标准
1. 20 个调用并发、池上限 4：同时最多 4 个（`-race`）
2. 配额热更新在下一次运行（新快照）生效
3. 要等时回调等待数

### 实施卡
- 要建 / 要改的文件：`engine/sched/pool.go`、`engine/sched/pool_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/llm/`
- 测试用例：
  - `E1502-T1 并发上限`：20 个 goroutine 同时 `Acquire` 同一个池（上限 4），任何时刻在飞不超过 4；ctx 取消时立刻返回、不占名额
  - `E1502-T2 全局上限`：`TryAcquire` 到上限后失败，释放后成功；同一配置的两个快照共享
  - `E1502-T3 热更新`：`Reconfigure` 后旧快照仍用旧配置，新快照用新配置
  - `E1502-T4 等待回调`：并发满时 `onWait` 收到等待数；没有令牌时也回调
  - `E1502-T5 降速`：`Penalize(0.5, 1m)` 后（虚拟时钟）令牌补充变慢一半、1 分钟后恢复；不限速的池调用不出错
- 允许使用的依赖：标准库（信号量用有容量的 channel，不加 `golang.org/x/sync`）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ④ 片（`m1-base`）开工前复查：加 `Config`、`PoolSet` 快照（热更新在下一次运行生效）、等待回调；节点级上限由执行器自己做；背压移到 `E.16.01`；信号量用标准库；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K265 |
| 2026-11-26 | 状态改为"冻结"：第 ④ 片（`m1-base`） squash 合并进代码仓库 `main`，提交 `b666abb35c90221e3389d7bfb487413c401bf8bb`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合（`-race` 留给 Linux CI）；按 `G.08-R3` 由验证者合并 |
| 2026-11-26 | 第 ⑤a 片（`m1-llm`）复查：冻结后修改——加 `Pool.Penalize`（`E.10.09` 的 429 降速用）和 `E1502-T5`；状态改回"已审"（`G.02.06-R21`） | `P.09` K268 |
| 2026-11-26 | 状态改为"冻结"：第 ⑤a 片（`m1-llm`） squash 合并进代码仓库 `main`，提交 `cbf6568cb2822f9e406be96e3de91d1a71251fa8`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合（`-race` 留给 Linux CI）；按 `G.08-R3` 由验证者合并 |
