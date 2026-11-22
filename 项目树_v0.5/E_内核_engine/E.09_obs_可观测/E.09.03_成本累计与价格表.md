# E.09.03 成本累计与价格表

| 项 | 内容 |
|---|---|
| 编号 | E.09.03 |
| 类型 | 实施 |
| 上级 | E.09 obs 可观测 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引11 |
| 最后修改 | 2026-11-22 |

## 1. 职责
计算每次模型和工具调用的费用，按节点、子图、运行汇总；管理预算账户（预留、结算、告警）。

## 2. 不做什么
- 不实现价格表的编辑界面（`W.09.02`）

## 3. 继承的上级约束
`C.01-R9`（金额整数 micros）、`P.09` Q9（币种）、`S.01` T5。

## 4. 接口
```go
type PricingTable struct {
    Version string
    Models  map[string]Price     // "provider/model"，支持 "local/*" 通配
    Tools   map[string]int64     // 每次调用的 micros
}
type Price struct{ InMicrosPerM, CachedInMicrosPerM, OutMicrosPerM, ReasoningMicrosPerM int64 }
func (p PricingTable) Cost(model string, u Usage) (micros int64, priced bool)

type Account struct{ /* Limit、Used、Reserved、Parent */ }
func NewAccount(limit Budget, parent *Account) *Account
func (a *Account) Reserve(est Budget) (Reservation, error)   // 超出 → ErrBudgetExceeded
func (r Reservation) Commit(actual Budget)                   // 按实际结算，释放差额
func (a *Account) Carve(limit Budget) (*Account, error)      // 子图、子编排者从父级划拨（S.04-R5）
```

## 5. 行为
- 费用：`(in − cached) × in价 + cached × cached价 + out × out价 + reasoning × reasoning价`，全程整数运算，按百万换算（`引05` §6）。
- 价格表版本化：每条 `llm.call` 记录 `pricing_version`；改价不影响历史。未知模型按 0 计价，`priced=false`，界面标"未计价"。
- 预算三个来源取最小：授权书 `budget`、子图引用划拨额度、运行参数（`引11` §4.3）。
- 调用前按 `max_tokens + 输入估算` 预留，避免并发调用同时冲过预算线；调用后结算。
- 告警阈值 50% / 80% / 100% 各发一次 `budget.warn`；超出发 `budget.exceeded`。

## 6. 不变量
- 金额计算无浮点
- 子账户的 Used 同时计入父账户
- 并发预留不会超过限额

## 7. 错误处理
超预算：`ErrBudgetExceeded`（失败类别 `budget_exceeded`，走升级）。

## 8. 验收标准
1. 费用公式测试向量（含缓存、思考 token）
2. 100 个并发预留总和不超限（-race）
3. 划拨后父账户剩余正确
4. 告警各只发一次

### 实施卡
- 要建 / 要改的文件：`engine/obs/cost.go`、`engine/obs/budget.go`、`engine/obs/cost_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0903-T1 费用向量`
  - `E0903-T2 并发预留`
  - `E0903-T3 划拨`
  - `E0903-T4 告警`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
