# E.15.04 虚拟时钟

| 项 | 内容 |
|---|---|
| 编号 | E.15.04 |
| 类型 | 实施 |
| 上级 | E.15 sched 调度 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引12 |
| 最后修改 | 2026-11-22 |

## 1. 职责
提供时钟接口和虚拟时钟，让所有时间相关逻辑可以在测试里瞬间完成且结果确定。

## 2. 不做什么
- 不用于生产以外的任何地方

## 3. 继承的上级约束
`E.15-R3`、`G.05.02-R7`（不用 time.Sleep）。

## 4. 接口
```go
type Clock interface {
    Now() time.Time
    After(d time.Duration) <-chan time.Time
    NewTimer(d time.Duration) Timer
    NewTicker(d time.Duration) Ticker
}
var RealClock Clock
func NewVirtualClock(start time.Time) *VirtualClock
func (v *VirtualClock) Advance(d time.Duration)     // 触发到期的所有定时器（按时间顺序）
func (v *VirtualClock) BlockUntil(n int)            // 等待有 n 个 goroutine 在等定时器（避免竞态）
```

## 5. 行为
- 内核所有包（sched、run、llm 重试、authz 过期、审批超时、blob GC）都通过 `Deps.Clock` 取时间。
- lint：`engine/` 下禁止直接调用 `time.Now`、`time.After`、`time.Sleep`、`time.NewTimer`（`forbidigo` 规则，`clock.go` 和测试文件豁免）。

## 6. 不变量
- 虚拟时钟下同样的测试每次结果相同

## 7. 错误处理
无。

## 8. 验收标准
1. 24 小时审批超时测试在 1 秒内完成
2. lint 对直接调用 time.Now 报错

### 实施卡
- 要建 / 要改的文件：`engine/sched/clock.go`、`engine/sched/vclock.go`、`engine/sched/vclock_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1504-T1 定时器顺序`
  - `E1504-T2 BlockUntil`
  - `E1504-T3 lint`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
