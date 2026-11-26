# E.16.01 运行生命周期

| 项 | 内容 |
|---|---|
| 编号 | E.16.01 |
| 类型 | 实施 |
| 上级 | E.16 run 运行 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现运行的创建、快照冻结、调度循环、完成判定，以及 `RunCtx` 的具体实现。

## 2. 不做什么
- 不实现节点的执行逻辑（`E.14`）

## 3. 继承的上级约束
`C.07`、INV-11、INV-12、`E.15-R1`。

## 4. 接口
```go
type Manager struct{ /* 活动运行表 */ }
func (m *Manager) Start(ctx context.Context, req StartRequest) (*RunMeta, error)
type StartRequest struct {
    GraphID, Branch string; Version int64      // 0 = 最新
    Inputs  map[string]json.RawMessage        // 根图入口
    Budget  *obs.Budget
    By      gen.Actor
    ReplayOf, ForkOf string; ForkSeq int64; ForkLoc *gen.Loc   // E.16.05
}
func (m *Manager) Get(id string) (*Run, bool)
func (m *Manager) Pause(ctx context.Context, id string, by gen.Actor) error
func (m *Manager) Resume(ctx context.Context, id string, by gen.Actor) error
func (m *Manager) Cancel(ctx context.Context, id string, by gen.Actor, reason string) error

type Snapshot struct {
    GraphID string; GraphVersion int64
    Graph        *graph.Frozen          // 已展开：ref 子图按 pin 内联；声明式节点已展开（E.04）
    RegistryHash string
    Mandates     []gen.Mandate          // 运行开始时生效的授权书
    Inputs       map[string]json.RawMessage
    Budget       obs.Budget
    Seed         int64
}
```

## 5. 行为
1. **Start**：授权 `run.start`（`E.06.02`）→ 读图 → 全量校验（零 error，`E.03-R2`）→ 展开子图引用和声明式节点 → 冻结快照存工作区 → 创建 `hx_runs`（pending）→ 写 `run.created` → 取租约 → 启动调度 goroutine。
2. **冻结**完成 → `run.status: pending → running`。
3. **调度循环**（单写者）：`seed` → 循环 { 派发就绪节点（全局并发 + 资源池粗过滤）→ 等事件（执行器完成、审批结果、取消、定时器、安全点补丁）→ 先写事件再更新状态 → 重新判定受影响的下游 }。
4. **完成判定**：根图所有出口端口节点都到终态 → `done`；有未处理的失败沿升级冒到根图 → `failed`（剩余节点转 cancelled）；取消传播完成 → `cancelled`。
5. **暂停**：停止派发；执行器在下一次调用 `rc.LLM / Tool / Emit / Checkpoint` 时阻塞（安全点）；继续时释放。暂停超过 24 小时自动取消。
6. 结束：写 `run.status` 终态（带用量汇总）、释放租约、保存最终视图。

- **复查时并入（`P.09` K265）**：状态投影（节点状态、时间线）、`Replay`、视图快照（`hx_run_views`，每 2 秒或 200 条事件一份，存工作区）从 `E.09.01` 移来，`E0901-T3`（`C07-T2` 重放一致）在本叶子跑；背压（流式输出、扇出向下游传值走有界 channel，容量 = 下游并发 × 2）从 `E.15.02` 移来；用 `E.09.01` 的 `Writer`、`E.15` 的 `Judge`、`Queue`、`PoolSet`。M1 的验收改用假执行器跑直线图（闭环迭代模板要循环、扇出，M2）；没有执行器的节点在冻结时拒绝，错误码和文案复查时定（K256）。

## 6. 不变量
- 运行状态只按 `C.07` §2 转换
- 同一运行同时只有一个调度循环（租约保证）

## 7. 错误处理
快照冻结失败（校验 error）：返回 422 `invalid_graph`，不创建运行；执行器 panic：该节点 failed（internal），不影响其他节点（`G.05.01-R7`）。

## 8. 验收标准
1. 闭环迭代模板完整运行到 done（fake 模型）
2. 暂停与继续
3. 校验不通过时不创建运行
4. 执行器 panic 隔离
5. 终态时所有节点都在终态（C.07-R7）

### 实施卡
- 要建 / 要改的文件：`engine/run/manager.go`、`engine/run/run.go`、`engine/run/loop.go`、`engine/run/snapshot.go`、`engine/run/runctx.go`、`engine/run/run_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1601-T1 模板全流程`
  - `E1601-T2 暂停继续`
  - `E1601-T3 校验拦截`
  - `E1601-T4 panic 隔离`
  - `E1601-T5 终态一致`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
