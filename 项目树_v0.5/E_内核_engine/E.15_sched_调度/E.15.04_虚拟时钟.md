# E.15.04 虚拟时钟

| 项 | 内容 |
|---|---|
| 编号 | E.15.04 |
| 类型 | 实施 |
| 上级 | E.15 sched 调度 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引12 |
| 最后修改 | 2026-11-26 |

## 1. 职责
提供时钟接口和虚拟时钟，让所有时间相关逻辑可以在测试里瞬间完成且结果确定。

## 2. 不做什么
- 不用于生产以外的任何地方

## 3. 继承的上级约束
`E.15-R3`、`G.05.02-R7`（不用 time.Sleep）。

## 4. 接口
```go
// engine/sched/clock.go
type Clock interface {
    Now() time.Time
    After(d time.Duration) <-chan time.Time
    NewTimer(d time.Duration) Timer
    NewTicker(d time.Duration) Ticker
}
type Timer interface  { C() <-chan time.Time; Stop() bool; Reset(d time.Duration) bool }
type Ticker interface { C() <-chan time.Time; Stop() }
var RealClock Clock                                   // 包装 time 包

// engine/sched/vclock.go
func NewVirtualClock(start time.Time) *VirtualClock
func (v *VirtualClock) Advance(d time.Duration)     // 按到期时间顺序触发到期的定时器（同一时刻按创建顺序）
func (v *VirtualClock) BlockUntil(n int)            // 等到有 n 个定时器（After、Timer、Ticker）在等
```

## 5. 行为
- 内核的时间相关逻辑（sched、run、op、exec、obs）都通过注入的 `Clock` 或 `func() time.Time` 取时间。
- 虚拟时钟：`Now` 返回当前虚拟时间；`After`、`NewTimer`、`NewTicker` 登记定时器；`Advance` 把时间往前推，途中到期的定时器按到期时间依次触发（channel 容量 1，满了就丢，同 `time.Ticker`）；`Stop` 之后不再触发。
- 检查：`engine/sched`、`engine/run`、`engine/op`、`engine/exec`、`engine/obs` 的非测试文件不直接调用 `time.Now`、`time.After`、`time.Sleep`、`time.NewTimer`、`time.NewTicker`、`time.Tick`（`clock.go` 豁免）。用本包的一个测试扫描源码实现，不改 lint 配置；已冻结的 `engine/llm`、`engine/store` 不在范围内（`P.09` K265）。

## 6. 不变量
- 虚拟时钟下同样的测试每次结果相同

## 7. 错误处理
无。

## 8. 验收标准
1. 24 小时的等待在虚拟时钟下 1 秒内完成
2. 直接调用 `time.Now` 的文件被检查出来

### 实施卡
- 要建 / 要改的文件：`engine/sched/clock.go`、`engine/sched/vclock.go`、`engine/sched/vclock_test.go`、`engine/sched/clockcheck_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/llm/`
- 测试用例：
  - `E1504-T1 定时器顺序`：不同到期时间的 `After`、`Timer` 按时间顺序触发；`Stop` 之后不触发；`Reset`；`Ticker` 每个周期一次；24 小时的 `After` 在 `Advance` 后立刻触发
  - `E1504-T2 BlockUntil`：另一个 goroutine 登记定时器之后 `BlockUntil` 才返回
  - `E1504-T3 直接调用检查`：扫描上面 5 个包的非测试文件，没有直接调用；对一段写了 `time.Now()` 的源码文本能报出来
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ④ 片（`m1-base`）开工前复查：写全 `Timer`、`Ticker`、虚拟时钟的触发顺序；`time.Now` 检查改为本包测试扫描源码，只管 sched、run、op、exec、obs；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K265 |
| 2026-11-26 | 状态改为"冻结"：第 ④ 片（`m1-base`） squash 合并进代码仓库 `main`，提交 `b666abb35c90221e3389d7bfb487413c401bf8bb`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合（`-race` 留给 Linux CI）；按 `G.08-R3` 由验证者合并 |
