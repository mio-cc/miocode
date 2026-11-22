# E.10.07 Token 计数

| 项 | 内容 |
|---|---|
| 编号 | E.10.07 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引05 |
| 最后修改 | 2026-11-22 |

## 1. 职责
估算 token 数，用于上下文预算、预算预留；并用实际用量滚动校准估算系数。

## 2. 不做什么
- 不做计费（`E.09.03`）

## 3. 继承的上级约束
`引05` §4、`P.09` K33。

## 4. 接口
```go
type Counter interface {
    CountText(s string) int
    Count(msgs []llm.Message, tools []llm.ToolSpec) int
}
func For(tokenizer string, stats StatsRepo, model string) Counter
```

## 5. 行为
- `o200k_base` / `cl100k_base`：`tiktoken-go` + 离线词表（打进二进制，不联网下载）。
- `approx`：中文 1 字 ≈ 1.1 token、英文 4 字符 ≈ 1 token，乘 1.1 安全系数。
- 工具 schema：每个工具约 `len(json)/3.5`。
- 校准：实际用量返回后，按模型记录"估算 / 实际"比（指数滑动平均，存 `hx_model_stats`），之后估算乘以该比值；比值限制在 0.7–1.5。

## 6. 不变量
- 估算永远不会因为词表缺失而失败（回退到 approx）

## 7. 错误处理
无。

## 8. 验收标准
1. tiktoken 计数与官方测试向量一致
2. approx 对中英混合文本误差在 ±25% 内（对比 tiktoken）
3. 校准系数收敛

### 实施卡
- 要建 / 要改的文件：`engine/llm/tokens/*.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1007-T1 tiktoken 向量`
  - `E1007-T2 approx 误差`
  - `E1007-T3 校准`
- 允许使用的依赖：`pkoukk/tiktoken-go`、`pkoukk/tiktoken-go-loader`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
