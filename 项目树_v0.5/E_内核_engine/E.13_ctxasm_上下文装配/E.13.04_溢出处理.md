# E.13.04 溢出处理

| 项 | 内容 |
|---|---|
| 编号 | E.13.04 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引06 |
| 最后修改 | 2026-11-22 |

## 1. 职责
内容超出预算时按配方的 `on_overflow` 处理：指针、摘要、截断、拒绝。

## 2. 不做什么
- 不调用模型以外的外部服务

## 3. 继承的上级约束
`C.13.01`、`P.09` K32（摘要作为内部 Agent 执行）、INV-05。

## 4. 接口
```go
func Fit(parts []part, total int, mode string, sum Summarizer, cnt tokens.Counter) ([]part, []Dropped, error)
type Summarizer interface {   // 由 exec 提供：内部 Agent 执行
    Summarize(ctx context.Context, text string, keep []string, maxTokens int) (string, error)
}
```

## 5. 行为
1. 每段先受自己的 `budget` 上限约束（超出按模式收缩）。
2. 总量仍超出：按优先级从低到高（数字大的先）处理；锁定段和 `required` 段最后才动、锁定段永远不动。
3. 模式：
   - `pointer`（默认）：只留"标题 + 一句摘要 + `[原文: ws://…]`"。Agent 没连 `ws_read` 时，运行时自动给它注入只读的 `ws_read`（L0），并在图校验里给 warn。
   - `summarize`：作为**一次内部 Agent 执行**完成——运行路径 `<装配节点>/~摘要`，使用装配节点 `model` 输入的模型和内置角色卡"摘要员@1"，有自己的 `llm.call` 事件、授权判定和计费（`P.09` K32）。回放时用录制的摘要。
   - `truncate`：从段尾截断。
   - `reject`：直接返回 `ErrContextOverflow`。
4. 每处理一段记一条 `Dropped`。

## 6. 不变量
- 锁定段永远不会被收缩
- 摘要只会通过一次可追溯的 Agent 执行产生（INV-05）

## 7. 错误处理
连必需段都放不下：`ErrContextOverflow`。

## 8. 验收标准
1. 四种模式各自的用例
2. 优先级顺序
3. 锁定段不动
4. summarize 产生内部执行路径和 llm.call 事件
5. pointer 自动注入 ws_read

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/fit.go`、`engine/ctxasm/fit_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1304-T1 pointer`
  - `E1304-T2 summarize 内部执行`
  - `E1304-T3 truncate`
  - `E1304-T4 reject`
  - `E1304-T5 优先级与锁定`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
