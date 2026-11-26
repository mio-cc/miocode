# E.13.04 溢出处理

| 项 | 内容 |
|---|---|
| 编号 | E.13.04 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引06 |
| 最后修改 | 2026-11-27 |

## 1. 职责
内容超出预算时按配方的 `on_overflow` 处理：指针、摘要、截断、拒绝；并做 `transform: summary` 段的摘要。

## 2. 不做什么
- 不自己调模型：摘要通过 `Summarizer` 接口完成；M1 由第 ⑥ 片的上下文装配执行器（`E.14.03`）提供，用内部 Agent 执行实现（`P.09` K32、K271），本叶子只用假实现测
- 不负责给 Agent 注入 `ws_read`：装配结果的 `Packet.Pointers` 为真时，Agent 执行器注入（`E.14.02`，第 ⑥ 片）

## 3. 继承的上级约束
`C.13.01`、`P.09` K32（摘要作为内部 Agent 执行）、INV-05。

## 4. 接口
```go
// engine/ctxasm/fit.go
type Part struct {
    Name, Text, Source string
    Ref                blob.Ref   // 原文引用；收缩时为空就把原文写进工作区
    Tokens, Priority   int
    Budget             float64    // 本段占总预算的比例；0 = 不单独限制
    Required, Locked   bool
    Summary            bool       // transform: summary
    Pointer            bool       // 已经是指针形式
    Taint              bool
    TaintSrc           []string
    Order              int        // 在包里的位置
}
type Dropped struct { Section string; Ref blob.Ref; Mode string; Saved int }   // Mode：pointer | summarize | truncate
type Summarizer interface {
    Summarize(ctx context.Context, text string, keep []string, maxTokens int) (string, error)
}
type FitEnv struct { Blobs blob.Store; Counter Counter; Summarizer Summarizer }
var ErrContextOverflow = errors.New(...)   // 包成 *Error{user_input, "context_overflow"}
func Fit(ctx context.Context, parts []Part, total int, mode string, env FitEnv) ([]Part, []Dropped, error)
func PointerText(name, text string, ref blob.Ref) string   // "【段名】一句摘要 [原文: ws://…]"
```

## 5. 行为
1. `Summary` 段先摘要到 `max(本段预算, 200)` token（没有 `Summarizer` 时返回 `internal`），记一条 `Dropped`（`summarize`）。
2. 每段受自己的 `Budget` 上限约束（`floor(Budget × total)`）：超出的非必需、非锁定段按模式收缩。
3. 总量仍超出：非必需、非锁定的段按优先级从低到高（数字大的先；同优先级时位置靠后的先）逐段收缩，直到不超出。必需段和锁定段不收缩：只剩它们还超出 → `ErrContextOverflow`（`C.13.01`：必需段被裁掉时直接失败）。
4. 模式（收缩一段，目标是让总量不超出）：
   - `pointer`（默认）：换成 `PointerText`；一句摘要取到第一个句号、问号、感叹号或换行，最多 80 字。
   - `summarize`：目标少于 50 token 时按 `pointer`；否则 `Summarizer.Summarize(原文, nil, 目标)`。
   - `truncate`：从段尾截断到目标以内，末尾加"…（已截断，原文: ws://…）"。
   - `reject`：第 2、3 步一出现超出就返回 `ErrContextOverflow`。
5. 每收缩一段记一条 `Dropped`，`Saved` 是省下的 token 数；收缩时 `Ref` 为空就把原文写进工作区。
6. 返回的段按 `Order` 排序。

## 6. 不变量
- 锁定段永远不会被收缩
- 摘要只会通过 `Summarizer` 产生（INV-05）
- 结果确定：同样的段、预算、模式和同样的摘要结果，输出相同

## 7. 错误处理
连必需段和锁定段都放不下、或 `reject` 模式超出：`ErrContextOverflow`（`user_input`）"上下文放不下必需内容，请提高预算或换更大窗口的模型"；工作区写入失败：`transient`；摘要失败原样返回。

## 8. 验收标准
1. 四种模式各自的用例
2. 优先级顺序
3. 锁定段、必需段不动
4. 摘要走 `Summarizer`（内部执行路径和 `llm.call` 事件在 `E.14.03` 测）

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/fit.go`、`engine/ctxasm/fit_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1304-T1 pointer`：超出时低优先级段变成"【段名】一句摘要 [原文: ws://…]"，`Ref` 能读回原文，`Dropped` 一条
  - `E1304-T2 summarize`：假 `Summarizer` 收到原文和目标 token 数；目标太小时改用 pointer；`transform: summary` 的段不超预算也摘要
  - `E1304-T3 truncate`：截断后不超出，末尾有原文引用
  - `E1304-T4 reject`：超出直接 `ErrContextOverflow`，类别 `user_input`
  - `E1304-T5 优先级与锁定`：先收缩优先级数字大的、同优先级先收缩靠后的；锁定段、必需段不动；只剩它们还超出时 `ErrContextOverflow`；段自己的 `Budget` 上限先生效
- 在其他叶子跑的测试用例：`E1403-T2`（`E.14.03`，摘要产生内部执行路径和 `llm.call` 事件）、`E1402-T5`（`E.14.02`，pointer 时自动注入 `ws_read`）
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ⑤b 片（`m1-tools-ctx`）开工前复查：`Summarizer` 由第 ⑥ 片提供、本叶子用假实现测；注入 `ws_read` 交给 Agent 执行器；必需段不收缩；写明每种模式的取法和顺序；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K271 |
| 2026-11-27 | 状态改为"冻结"：第 ⑤b 片（`m1-tools-ctx`） squash 合并进代码仓库 `main`，提交 `615eb8b1256f0420807f72afa2cc11c02490caab`（`G.02.06-R21`） | `relay slice` 通过；评审 18 条全部符合（第 18 行按 `P.09` K274 修复后由 Codex 复核）；按 `G.08-R3` 由验证者合并 |
