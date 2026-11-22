# E.13.03 预算计算

| 项 | 内容 |
|---|---|
| 编号 | E.13.03 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引06 |
| 最后修改 | 2026-11-22 |

## 1. 职责
计算上下文装配可用的 token 预算。

## 2. 不做什么
- 不做 token 计数（`E.10.07`）

## 3. 继承的上级约束
`C.13.01-R3`、`引06` §4.1。

## 4. 接口
```go
func Budget(ratio float64, maxRatio float64, caps llm.Caps, reserveOutput int, overhead int) (tokens int, clamped bool)
```

## 5. 行为
```
装配预算      = floor(min(节点 budget 参数, 配方 max_ratio) × 模型窗口)
Agent 实际可用 = 窗口 − 输出预留（MaxOutput 默认值）− ①~⑤ 段估算 − 工具 schema 估算
最终预算      = min(装配预算, Agent 实际可用)；取后者时 clamped = true
```
- ①–⑤ 段估算：同一 Agent 节点上次渲染的实际 token 数（存在运行内存里）；首次用 1500。
- 上下文装配节点的 `model` 输入决定用哪个窗口；没连时取下游 Agent 的模型（冻结快照时解析）。
- `clamped=true` 时 `ctx.assembled` 事件带标记，界面预算条显示"被夹紧"。

## 6. 不变量
- 预算永远 ≥ 0

## 7. 错误处理
窗口未知（quirks 和配置都没有）：使用 8000 并记 warn。

## 8. 验收标准
1. 公式测试向量
2. 夹紧标记

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/budget.go`、`engine/ctxasm/budget_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1303-T1 公式`
  - `E1303-T2 夹紧`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
