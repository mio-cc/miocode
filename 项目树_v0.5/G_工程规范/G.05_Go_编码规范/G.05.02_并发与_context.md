# G.05.02 并发与 context

| 项 | 内容 |
|---|---|
| 编号 | G.05.02 |
| 类型 | 规范 |
| 上级 | G.05 Go 编码规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 规则
| 编号 | 规则 |
|---|---|
| G.05.02-R1 | **禁止裸 goroutine。** 每个 goroutine 必须有明确的所有者负责等待它结束：用 `errgroup.Group`、`sync.WaitGroup`，或项目里的 `engine/internal/task.Group`（带 recover 和命名） |
| G.05.02-R2 | 所有会阻塞或耗时的函数第一个参数是 `ctx context.Context`，并在阻塞点检查 `ctx.Done()` |
| G.05.02-R3 | 不把 context 存进结构体（`RunCtx` 是例外：它是一次节点执行的上下文对象，生命周期和执行完全一致） |
| G.05.02-R4 | 取消沿 context 树传播：运行 → 作用域 → 节点执行 → 模型 / 工具调用（`E.16.06`）。新建子 context 时一定要 `defer cancel()` |
| G.05.02-R5 | channel 只能由发送方关闭；有缓冲 channel 必须写明容量的理由（注释）；不用无界 channel |
| G.05.02-R6 | 共享可变状态要么只在一个 goroutine 里访问（推荐：调度器单线程循环修改节点状态，`C.07-R4`），要么用 `sync.Mutex` 保护，并在字段旁注释"由 mu 保护" |
| G.05.02-R7 | 不用 `time.Sleep` 等待条件；测试里也不用。需要时间的地方注入时钟接口（`engine/sched` 的虚拟时钟，`E.15.04`） |
| G.05.02-R8 | 程序退出时所有 goroutine 在 10 秒内结束；`anydoor` 的优雅关闭按 `B.02` 的顺序进行 |

## 2. 例子
```go
// 正例
g, ctx := errgroup.WithContext(ctx)
for _, it := range items {
    it := it
    g.Go(func() error { return work(ctx, it) })
}
return g.Wait()

// 反例
go work(it)        // R1：没人等它，panic 会让进程崩溃，取消也传不到
```

## 3. 检查方式
- `go vet`、`-race`（Linux CI 上所有测试都带 `-race`）。
- `forbidigo` 规则：`^go\s` 只允许出现在 `engine/internal/task` 包里（其他地方用 `task.Group.Go`）。
- `goleak`：内核各包的 `TestMain` 里检查测试结束时没有泄漏的 goroutine。
