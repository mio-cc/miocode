# E.14.09.01 轮次与停止条件

| 项 | 内容 |
|---|---|
| 编号 | E.14.09.01 |
| 类型 | 实施 |
| 上级 | E.14.09 循环 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现轮次推进和停止判断（rounds 模式），以及事件驱动的唤醒（event 模式）。

## 2. 不做什么
- 不实现轮间数据筛选（`E.14.09.02`）

## 3. 继承的上级约束
`E.14.09-R1`–`R3`。

## 4. 接口
```go
type loopCP struct { Round int; State json.RawMessage; StallCount int; LastMetric *float64; QueueCursor int64 }
```

## 5. 行为
rounds 模式：
```
for r = cp.Round + 1; ; r++:
    if r > max_rounds → 输出 final（exit=max_rounds）
    if 预算不足 → 输出 final（exit=budget），写 budget.exceeded 并升级
    rc.ApplyPendingPatch()                       // 安全点（E.16.02）
    写 loop.round{round: r, max}
    out = rc.Subgraph(children, carry(state), {Scope: {round: r}})
    state = next(state, out)                     // E.14.09.02
    if eval(exits, state) → 输出 final（exit=exits）
    if stall_metric: m = eval(stall_metric); if m 没有严格变好 → StallCount++，≥ stall_rounds → 输出 final（exit=stall）
    rc.Checkpoint(loopCP{r, state, …})
```
event 模式：
- 事件源：端口数据到达、账本 `watch`、子图升级、定时（v1 不支持外部回调）。事件进入循环自己的有界队列（容量 100），按 `queue` 策略排序和合并；一次处理一个。
- 每处理一个事件就是"一轮"（路径 `#eN`），处理完写检查点（含队列游标）。
- `idle_timeout_ms` 内没有新事件 → 输出 final（exit=idle）。
- `summary` 输出：每轮结束由子图里的 summary 端口产生简报时转发出去。

## 6. 不变量
- 轮次严格递增，路径 `#rN` 与 `loop.round` 事件一致
- 任何配置下都会在有限时间内结束（INV-06 的运行时保证）

## 7. 错误处理
子图失败：本轮失败即循环失败（不自动进入下一轮）；需要"失败也继续"时由子图内部的分支处理。

## 8. 验收标准
1. 闭环迭代第 2 轮通过验收后退出（与 demo 一致）
2. max_rounds 到达退出
3. 无进展退出
4. 崩溃后从第 3 轮继续
5. event 模式处理 5 个事件后空闲退出

### 实施卡
- 要建 / 要改的文件：`engine/exec/loop/rounds.go`、`engine/exec/loop/event.go`、`engine/exec/loop/loop_test.go`、`schema/builtin/nodedefs/循环.yaml`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E140901-T1 exits`
  - `E140901-T2 max_rounds`
  - `E140901-T3 stall`
  - `E140901-T4 恢复`
  - `E140901-T5 event 模式`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
