# E.15.03 令牌桶限流

| 项 | 内容 |
|---|---|
| 编号 | E.15.03 |
| 类型 | 实施 |
| 上级 | E.15 sched 调度 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引03 |
| 最后修改 | 2026-11-26 |

## 1. 职责
令牌桶限流：按每分钟请求数限制模型和工具的调用速率，支持 429 时临时降速。

## 2. 不做什么
- 不处理重试（`E.10.09`）

## 3. 继承的上级约束
`E.15-R3`、`引05` §5（429 降速 20%、5 分钟恢复）。

## 4. 接口
```go
// engine/sched/rate.go
type RateLimiter struct{ /* 令牌桶，基于注入的 Clock */ }
func NewRateLimiter(perMinute, burst int, clock Clock) *RateLimiter   // perMinute ≤ 0：不限速
func (r *RateLimiter) Wait(ctx context.Context) error
func (r *RateLimiter) TryTake() bool                                   // 有令牌就拿一个，不等待
func (r *RateLimiter) Ready() bool                                     // 有没有令牌（不拿），派发时的粗过滤
func (r *RateLimiter) Penalize(factor float64, d time.Duration)       // 例如 0.8、5 分钟
```

## 5. 行为
- 只有一种实现：令牌桶基于注入的 `Clock`，生产用 `RealClock`、测试用虚拟时钟，同一套代码，不用 `golang.org/x/time/rate`（`P.09` K265）。
- 令牌按 `perMinute / 60` 每秒补充，最多 `burst` 个（`burst` ≤ 0 时为 1）；开始时是满的。`Wait` 没有令牌时用 `clock.NewTimer` 等到下一个令牌，ctx 取消时立刻返回 `ctx.Err()`。
- `Penalize` 把速率乘以 `factor`，`d` 之后恢复；多次叠加取最低的速率、最晚的恢复时间。

## 6. 不变量
- 长期平均速率不超过配置值

## 7. 错误处理
`Wait` 只返回 ctx 的错误。

## 8. 验收标准
1. 60 rpm 下 1 分钟最多 60 + burst 次（虚拟时钟）
2. Penalize 后降速并按时恢复

### 实施卡
- 要建 / 要改的文件：`engine/sched/rate.go`、`engine/sched/rate_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/llm/`
- 测试用例：
  - `E1503-T1 速率`：60 rpm、burst 5，虚拟时钟下 1 分钟内成功拿到的令牌不超过 65 个；ctx 取消时 `Wait` 立刻返回
  - `E1503-T2 降速恢复`：`Penalize(0.5, 5m)` 后速率减半，5 分钟后恢复；两次叠加取最低
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ④ 片（`m1-base`）开工前复查：只用基于 `Clock` 的一种实现，不用 `x/time/rate`；加 `TryTake`、`Ready`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K265 |
