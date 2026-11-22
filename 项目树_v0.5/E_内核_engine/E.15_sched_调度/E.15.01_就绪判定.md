# E.15.01 就绪判定

| 项 | 内容 |
|---|---|
| 编号 | E.15.01 |
| 类型 | 实施 |
| 上级 | E.15 sched 调度 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
判断一个节点执行是否可以开始、应该被跳过，还是继续等待；维护就绪队列的优先级。

## 2. 不做什么
- 不执行节点（`E.16.01` 的调度循环派发）

## 3. 继承的上级约束
`C.07` §3.1、`C.04.04-R2`、`E.15-R1`、`E.15-R2`。

## 4. 接口
```go
type Readiness int // NotReady | Ready | Skip
func (s *Scheduler) readiness(k ExecKey) Readiness
type prioKey struct { Escalation int; Critical int; Round int; UserPriority int; Seq int64 }   // 小者优先
```

## 5. 行为
节点就绪 = 以下全部满足：
1. 当前状态 `idle`（或重试中的 `queued`）。
2. 所有入边的上游都已到终态（done / skipped / cached / failed 中的 done、skipped、cached；上游 failed 时本节点按失败路由处理）。
3. 入边上游 skipped，或上游分支 / 人工没有激活该出口 → 这条边"未激活"。
4. 所有入边都未激活 → `Skip`（向下游传播）；必填端口的入边都未激活 → `Skip`；可选端口未激活 → 该端口为空。
5. 所在作用域（循环本轮、扇出某份）处于活动中。
6. 声明 `EarlyReady` 的执行器（汇合的 k_of_n / first / timeout）：满足其条件即可就绪，不必等全部上游（`E.14.06`）。
7. 没有入边的节点和根图入口在运行开始时就绪（`seed`）。

优先级（`引03` §3.3）：升级派生的优先 → 关键路径（冻结时预计算的下游节点数）→ 轮次小的优先（避免跨轮饥饿）→ 用户参数 `priority`（P0–P2）→ 入队序号。

## 6. 不变量
- 就绪判定对同一状态集合结果确定
- 每个节点执行在一次运行里最多进入就绪队列一次（重试除外）

## 7. 错误处理
无（异常状态写 `engine.illegal_transition`）。

## 8. 验收标准
1. 菱形图：汇合点等两个上游
2. 分支未激活的下游被 skipped 并向下传播
3. 可选端口未激活时为空值
4. k_of_n 提前就绪
5. 优先级排序

### 实施卡
- 要建 / 要改的文件：`engine/sched/ready.go`、`engine/sched/prio.go`、`engine/sched/ready_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1501-T1 菱形`
  - `E1501-T2 跳过传播`
  - `E1501-T3 可选端口`
  - `E1501-T4 EarlyReady`
  - `E1501-T5 优先级`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
