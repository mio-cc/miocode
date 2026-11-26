# E.15.01 就绪判定

| 项 | 内容 |
|---|---|
| 编号 | E.15.01 |
| 类型 | 实施 |
| 上级 | E.15 sched 调度 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引03 |
| 最后修改 | 2026-11-26 |

## 1. 职责
判断一个节点执行是否可以开始、应该被跳过，还是继续等待；维护就绪队列的优先级。

## 2. 不做什么
- 不执行节点（`E.16.01` 的调度循环派发）

## 3. 继承的上级约束
`C.07` §3.1、`C.04.04-R2`、`E.15-R1`、`E.15-R2`。

## 4. 接口
```go
// engine/sched/ready.go：纯函数 Judge，运行的调度循环（E.16.01）每次有上游变化时调用
type Readiness int // NotReady | Ready | Skip
type InEdge struct {
    Port     string        // 本节点的输入端口
    Required bool          // 这个端口必填（PortDef.required）
    From     gen.NodeState // 上游这次执行的状态
    Active   bool          // 上游到终态时激活了这条线的源端口（分支、人工只激活一个出口）
}
type ReadyInput struct {
    State       gen.NodeState
    Retrying    bool                          // 重试中的 queued
    ScopeActive bool                          // 所在作用域（循环本轮、扇出某份）在活动中；根图总是 true
    In          []InEdge
    Early       func(arrived, total int) bool // 执行器声明的 EarlyReady（汇合的 k_of_n / first / timeout）；nil 表示没有
}
func Judge(in ReadyInput) (r Readiness, empty []string)   // empty：可选端口里没有激活连线的（按名字排序）

// engine/sched/prio.go
type Prio struct{ Escalation, Critical, Round, User int }  // 都是小者优先；Critical 取负的下游节点数
type Queue[T any] struct{ /* 堆 */ }
func (q *Queue[T]) Push(p Prio, v T)                       // 同优先级按入队顺序
func (q *Queue[T]) Pop() (T, bool)
func (q *Queue[T]) Len() int
```

## 5. 行为
`Judge` 按顺序判断：
1. `State` 不是 `idle`，也不是重试中的 `queued` → `NotReady`；`ScopeActive` 为 false → `NotReady`。
2. 没有入边 → `Ready`（`seed`）。
3. 有上游 `failed`、`cancelled` → `NotReady`：失败的路由（升级、冒到根图）由运行处理（`E.16.01`）。
4. 有上游还没到终态（不是 `done`、`cached`、`skipped`）：`Early` 不为 nil 且 `Early(已激活的入边数, 入边总数)` 为 true → `Ready`；否则 `NotReady`。
5. 上游都到了终态：一条线"激活"= 上游是 `done` / `cached` 且 `Active`。全部未激活 → `Skip`；某个必填端口的线全部未激活 → `Skip`；否则 `Ready`，没有激活连线的可选端口放进 `empty`。

优先级（`引03` §3.3）：升级派生的优先 → 关键路径（冻结时预计算的下游节点数多的优先）→ 轮次小的优先（避免跨轮饥饿）→ 用户参数 `priority`（P0–P2）→ 入队顺序。比较按字段顺序。

## 6. 不变量
- 就绪判定对同一输入结果确定
- 同优先级的出队顺序就是入队顺序

## 7. 错误处理
无。

## 8. 验收标准
1. 菱形图：汇合点等两个上游
2. 分支未激活的下游被 skipped（运行据此向下传播）
3. 可选端口未激活时为空值
4. k_of_n 提前就绪
5. 优先级排序

### 实施卡
- 要建 / 要改的文件：`engine/sched/ready.go`、`engine/sched/prio.go`、`engine/sched/ready_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/llm/`
- 测试用例：
  - `E1501-T1 菱形`：两个上游一个 `done` 一个 `running` → `NotReady`；都 `done` → `Ready`；没有入边 → `Ready`；不是 `idle` 或作用域不活动 → `NotReady`；上游 `failed` → `NotReady`
  - `E1501-T2 跳过传播`：唯一的入边未激活（分支没选这个出口）→ `Skip`；上游 `skipped` → `Skip`；必填端口未激活、可选端口激活 → `Skip`
  - `E1501-T3 可选端口`：必填端口激活、可选端口未激活 → `Ready`，`empty` 是那个可选端口
  - `E1501-T4 EarlyReady`：假的 `Early`（k_of_n，k = 2）：3 个上游里 2 个 `done` → `Ready`，1 个 → `NotReady`
  - `E1501-T5 优先级`：按升级、关键路径、轮次、用户优先级、入队顺序出队
- 允许使用的依赖：标准库、`gen`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ④ 片（`m1-base`）开工前复查：改为纯函数 `Ready`（运行每次上游变化时调用）和泛型优先队列；上游失败交给运行；`EarlyReady` 用函数传入，测试用假的；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K265 |
| 2026-11-26 | 判定函数改名为 `Judge`：原名 `Ready` 和枚举值 `Ready` 同名，编译不过（验证时发现） | `P.09` K266 |
| 2026-11-26 | 状态改为"冻结"：第 ④ 片（`m1-base`） squash 合并进代码仓库 `main`，提交 `b666abb35c90221e3389d7bfb487413c401bf8bb`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合（`-race` 留给 Linux CI）；按 `G.08-R3` 由验证者合并 |
