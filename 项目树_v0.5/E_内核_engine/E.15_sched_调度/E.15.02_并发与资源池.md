# E.15.02 并发与资源池

| 项 | 内容 |
|---|---|
| 编号 | E.15.02 |
| 类型 | 实施 |
| 上级 | E.15 sched 调度 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现全局并发上限和资源池：每个模型、每个工具一个池，同时限制"同时在飞的调用数"和"速率"。

## 2. 不做什么
- 不实现令牌桶算法本身（`E.15.03`）

## 3. 继承的上级约束
`引03` §3.4–§3.5、`G.11` `pools.global_concurrency`、`P.09` Q16。

## 4. 接口
```go
type Pool struct {
    Key         string                // llm:<provider>/<model> | tool:<id>
    Concurrency *semaphore.Weighted
    Rate        *RateLimiter          // E.15.03
    Waiting     atomic.Int64
}
func (p *Pool) Acquire(ctx context.Context) (release func(), err error)   // 阻塞；期间发 node.throttled
type Pools struct{ /* map + 配置热更新 */ }
func (ps *Pools) Get(key string) *Pool
func (ps *Pools) Reconfigure(cfg Config)                                  // 下一次运行生效（G.11-R4）
```

## 5. 行为
- 全局并发：所有运行共享一个信号量（默认 8）；派发节点前 `TryAcquire`，满了就停止派发。
- 资源池：执行器每次真正调用模型或工具时 `Acquire`（Agent 一次执行里可能多次）。派发时的 `TryTake` 只是粗过滤。
- 令牌不足时节点仍是 `running`，但发 `node.throttled{pool, waiting}`，界面显示"排队中 · 前面 N 个"。
- 节点参数可以把池的配额调小，不能调大。
- 多次运行同时进行：不限次数，共享全局并发上限（`P.09` Q16）。
- 背压：扇出、流式输出向下游传值走有界 channel（容量 = 下游并发 × 2），满时上游 `Emit` 阻塞。

## 6. 不变量
- 任何时刻在飞调用数不超过池的并发上限
- 全局在飞节点数不超过全局上限

## 7. 错误处理
ctx 取消时 `Acquire` 立即返回 ctx.Err()。

## 8. 验收标准
1. 20 个 Agent 并发，池上限 4：同时最多 4 个调用（-race）
2. 配额热更新在下一次运行生效
3. throttled 事件节流

### 实施卡
- 要建 / 要改的文件：`engine/sched/pool.go`、`engine/sched/pool_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1502-T1 并发上限`
  - `E1502-T2 全局上限`
  - `E1502-T3 热更新`
  - `E1502-T4 背压`
- 允许使用的依赖：标准库、`golang.org/x/sync`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
