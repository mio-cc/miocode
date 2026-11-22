# E.15.03 令牌桶限流

| 项 | 内容 |
|---|---|
| 编号 | E.15.03 |
| 类型 | 实施 |
| 上级 | E.15 sched 调度 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
令牌桶限流：按每分钟请求数限制模型和工具的调用速率，支持 429 时临时降速。

## 2. 不做什么
- 不处理重试（`E.10.09`）

## 3. 继承的上级约束
`E.15-R3`、`引05` §5（429 降速 20%、5 分钟恢复）。

## 4. 接口
```go
type RateLimiter struct{ /* 包装 golang.org/x/time/rate，注入 Clock */ }
func NewRateLimiter(perMinute int, burst int, clock Clock) *RateLimiter
func (r *RateLimiter) Wait(ctx context.Context) error
func (r *RateLimiter) Penalize(factor float64, d time.Duration)   // 例如 0.8、5 分钟
```

## 5. 行为
- `x/time/rate` 本身用真实时间；为了虚拟时钟可测，包装一层：生产用 `rate.Limiter`，测试用基于 `Clock` 的简单实现，两者通过同一组行为测试。
- `Penalize` 多次叠加取最低值，到期恢复原速率。

## 6. 不变量
- 长期平均速率不超过配置值

## 7. 错误处理
无。

## 8. 验收标准
1. 60 rpm 下 1 分钟最多 60 + burst 次（虚拟时钟）
2. Penalize 后降速并按时恢复

### 实施卡
- 要建 / 要改的文件：`engine/sched/rate.go`、`engine/sched/rate_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1503-T1 速率`
  - `E1503-T2 降速恢复`
- 允许使用的依赖：`golang.org/x/time/rate`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
