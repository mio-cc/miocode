# E.10.07 Token 计数

| 项 | 内容 |
|---|---|
| 编号 | E.10.07 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引05 |
| 最后修改 | 2026-11-26 |

## 1. 职责
估算 token 数，用于上下文预算、预算预留；并用实际用量滚动校准估算系数。

## 2. 不做什么
- 不做计费（`E.09.03`）

## 3. 继承的上级约束
`引05` §4、`P.09` K33、K268。

## 4. 接口
```go
// engine/llm/tokens
type Counter interface {
    CountText(s string) int
    Count(msgs []llm.Message, tools []llm.ToolSpec) int
}
func Approx(s string) int                                   // 未校准的估算
func For(tokenizer string, stats *Stats, model string) Counter   // M1：任何 tokenizer 都用 approx（K268）
type Stats struct{ /* 按模型的"实际 / 估算"比 */ }
func NewStats() *Stats
func (s *Stats) Observe(model string, estimated, actual int)
func (s *Stats) Ratio(model string) float64                 // 没有记录时为 1
```

## 5. 行为
- `Approx`：中日韩字符（汉字、平假名、片假名、谚文）每个 1.1，其余字符每 4 个 1；合计乘 1.1 的安全系数，向上取整；空串为 0。
- `Count`：每条消息另加 4；消息里的文本按 `Approx`；图片、文件部分各按 1000；工具调用按名字加参数文本；每个工具按 `name`、`description`、`schema` 序列化后的长度 ÷ 3.5（向上取整）。
- 校准：实际用量回来后调用方 `Observe(模型, 估算, 实际)`；比值 = 实际 ÷ 估算，指数滑动平均（旧值 × 0.8 + 新值 × 0.2，初值 1），限制在 0.7–1.5；`估算 ≤ 0` 或 `实际 ≤ 0` 时忽略。`For` 返回的 Counter 每次计数时取最新比值，结果 = 向上取整(未校准估算 × 比值)。
- 比值只存在内存里（存储里没有 `hx_model_stats`）；持久化和 tiktoken 精确计数在 M5 做（`P.09` K268）。

## 6. 不变量
- 估算永远不会失败；同样的输入、同样的比值，结果相同

## 7. 错误处理
无。

## 8. 验收标准
1. 估算公式的测试向量
2. 校准系数收敛，并限制在 0.7–1.5

### 实施卡
- 要建 / 要改的文件：`engine/llm/tokens/tokens.go`、`engine/llm/tokens/tokens_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/blob/`、`engine/obs/`、`engine/llm/` 下其他已有文件
- 测试用例：
  - `E1007-T2 approx 估算`：空串 0、`hello world` 4、`你好世界` 5、`你好 world` 5；`Count` 的消息开销、图片、工具 schema 按 §5 计算
  - `E1007-T3 校准`：比值 1.3 观察 50 次后在 1.28–1.32；比值 3 收在 1.5、0.1 收在 0.7；估算或实际为 0 时忽略；`For` 的计数随比值变化；不同模型互不影响
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E1007-T1 tiktoken 向量`：M5 加精确计数时跑（K268）
- 允许使用的依赖：标准库、`engine/llm`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ⑤a 片（`m1-llm`）开工前复查：M1 只做估算加校准，tiktoken 推到 M5；校准比值存在内存里；写全计数规则；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K268 |
| 2026-11-26 | 状态改为"冻结"：第 ⑤a 片（`m1-llm`） squash 合并进代码仓库 `main`，提交 `cbf6568cb2822f9e406be96e3de91d1a71251fa8`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合（`-race` 留给 Linux CI）；按 `G.08-R3` 由验证者合并 |
