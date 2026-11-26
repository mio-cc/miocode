# E.13.03 预算计算

| 项 | 内容 |
|---|---|
| 编号 | E.13.03 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引06 |
| 最后修改 | 2026-11-26 |

## 1. 职责
计算上下文装配可用的 token 预算。

## 2. 不做什么
- 不做 token 计数（`E.10.07`）
- 不估算 ①–⑤ 段：估算值由调用方给（同一 Agent 上次渲染的实际 token 数，存在运行内存里，第 ⑥ 片）

## 3. 继承的上级约束
`C.13.01-R3`、`引06` §4.1。

## 4. 接口
```go
// engine/ctxasm/budget.go
type BudgetIn struct {
    Ratio    float64  // 配方 budget.ratio
    MaxRatio float64  // 配方 budget.max_ratio；0 = 不限
    Node     *float64 // 上下文装配节点的 budget 参数；nil = 用 Ratio
    Caps     llm.Caps // 下游 Agent 所用模型的能力（Window、MaxOutput）
    Overhead int      // ①–⑤ 段和工具 schema 的估算；≤ 0 时用 1500
}
type BudgetOut struct { Tokens int; Clamped bool; Window int; Warn string }
func Budget(in BudgetIn) BudgetOut
```

## 5. 行为
```
比例          = min(Node 或 Ratio, MaxRatio)            （MaxRatio 为 0 时不取 min）
窗口          = Caps.Window；为 0 时用 8000，并在 Warn 写"模型窗口未知，按 8000 计算"
输出预留      = Caps.MaxOutput；为 0 时用 min(4096, 窗口 / 4)
装配预算      = floor(比例 × 窗口)
Agent 实际可用 = 窗口 − 输出预留 − Overhead
Tokens        = max(0, min(装配预算, Agent 实际可用))；取后者时 Clamped = true
```
- 哪个模型的窗口：上下文装配节点 `model` 输入连了就用它，没连时用下游 Agent 的模型，由执行器解析后传 `Caps`（第 ⑥ 片）。
- `Clamped` 由装配结果带出（`E.13.02` 的 `Packet.Clamped`），界面预算条显示"被夹紧"。

## 6. 不变量
- 预算永远 ≥ 0
- 纯函数：不访问任何外部资源

## 7. 错误处理
无（窗口未知用 8000 并给 `Warn`）。

## 8. 验收标准
1. 公式测试向量
2. 夹紧标记
3. 窗口未知

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/budget.go`、`engine/ctxasm/budget_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1303-T1 公式`：比例 0.1、窗口 128000、输出 8192 → 12800；节点 0.3、上限 0.25 → 32000；`Overhead` 为 0 按 1500 算
  - `E1303-T2 夹紧`：窗口 8000、输出 4000、比例 0.5 → 2500 且 `Clamped`；实际可用为负 → 0
  - `E1303-T3 窗口未知`：`Window` 为 0 → 按 8000、`Warn` 非空；`MaxOutput` 为 0 → 预留 min(4096, 窗口/4)
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ⑤b 片（`m1-tools-ctx`）开工前复查：参数收成 `BudgetIn`；写明默认值；加 `E1303-T3`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K271 |
