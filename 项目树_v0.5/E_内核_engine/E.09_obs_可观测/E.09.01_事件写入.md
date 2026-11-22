# E.09.01 事件写入

| 项 | 内容 |
|---|---|
| 编号 | E.09.01 |
| 类型 | 实施 |
| 上级 | E.09 obs 可观测 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引_关键决定 |
| 最后修改 | 2026-11-22 |

## 1. 职责
提供事件写入器：分配 seq、生成运行路径、攒批落库、落库后再广播；以及事件到投影（节点状态、时间线）的重放。

## 2. 不做什么
- 不实现 SSE 推送（`B.05`，它订阅这里的广播）

## 3. 继承的上级约束
INV-11、INV-24、`C.06.01`、`C.06.05`、`E-R4`。

## 4. 接口
```go
type Writer interface {
    Emit(ctx context.Context, evs ...gen.Event) error        // 返回时事件已落库（P/S 级）
    EmitEphemeral(ev gen.Event)                              // E 级：只广播
}
type Bus interface { Subscribe(stream store.StreamKey, since int64) (Sub, error) }
func NewWriter(s store.Store, bus *Hub, clock sched.Clock, opt WriterOpts) Writer

func PathOf(g *graph.Frozen, loc gen.Loc) string              // C.06.05 路径生成
func ExecKey(loc gen.Loc) string                              // C.06.05-R5

type Projector interface { Apply(e gen.Event) }
type NodeStateProj struct{ /* map[execKey]*NodeStateRow */ }
type TimelineProj  struct{ /* 节点区间、等待段、排队段 */ }
func Replay(evs []gen.Event, ps ...Projector)
```

## 5. 行为
1. `Emit`：填 `ts`（时钟）、校验 actor 非空 → 放入攒批缓冲 → 缓冲满 64 条或 20ms 后一次 `Events().Append`（seq 在事务中分配）→ 提交成功后把带 seq 的事件交给 Hub 广播 → 返回。
2. 调度器调用 `Emit` 后才更新内存状态（"先落事件再处理"）；外部输入（审批结果、人工输入）同样先 Emit 再投递给执行器。
3. S 级事件（`node.progress`、`node.throttled`）按节点节流：每个 exec_key 每秒最多 4 条，多余的只广播不落库。
4. 投影可以从事件全量重建；运行中每 2 秒或每 200 条事件把视图快照写入 `hx_run_views`，加速时间旅行查询（`引11` §3）。
5. 事件 `data` 大于 4KB 时转引用（`C.06.01-R4`）。

## 6. 不变量
- 广播出去的 P 级事件一定已经落库
- 重放全部事件得到的投影与运行中内存状态一致（`C07-T2`）

## 7. 错误处理
落库失败：返回错误给调度器，调度器把运行转为 failed（`internal` 类），不继续推进——宁可停下也不能出现"状态变了但没记录"。

## 8. 验收标准
1. 崩溃注入：在 Append 成功和广播之间杀进程，重启后事件不丢、不重复
2. 重放一致性
3. 路径生成测试向量（C0605-T1…T3）
4. 1 万条事件写入 < 1s

### 实施卡
- 要建 / 要改的文件：`engine/obs/writer.go`、`engine/obs/hub.go`、`engine/obs/path.go`、`engine/obs/project.go`、`engine/obs/obs_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0901-T1 先落库再广播`
  - `E0901-T2 节流`
  - `E0901-T3 重放一致`
  - `E0901-T4 路径向量`
  - `E0901-T5 BenchmarkEmit`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
