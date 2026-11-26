# E.11.02 结果裁剪与原文指针

| 项 | 内容 |
|---|---|
| 编号 | E.11.02 |
| 类型 | 实施 |
| 上级 | E.11 tools 工具 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引06 |
| 最后修改 | 2026-11-26 |

## 1. 职责
定义工具结果的类型（原始结果、裁剪后的结果、工具错误），把工具返回的大结果裁剪成摘要和相关片段放进上下文，原文存工作区并保留引用。

## 2. 不做什么
- 不决定上下文预算（`E.13.03`）：`MaxTokens` 由调用方给
- 不做 token 精确计数：用本包的 `Counter` 接口，`tokens.Counter`（`E.10.07`）满足它，由组装处传入（`tools` 不能 import `llm`，`P.09` K271）

## 3. 继承的上级约束
`C.03.03` §5（`keep_pointer` kernel 锁）、`引05` §8.3、`E.11-R2`。

## 4. 接口
```go
// engine/tools/result.go
type Raw struct {                 // 工具实现返回的原始结果
    Text      string              // 正文；为空时用 Data 的 JSON 文本
    Data      json.RawMessage     // 结构化结果（可选）
    MediaType string              // 默认 text/plain; charset=utf-8
    Sources   []string            // 来源：URL、文件路径、ws:// 引用（污染来源）
}
type Snippet struct { Text string; Offset int; Score float64 }   // Offset 是在原文里的字符（rune）位置
type Result struct {
    Summary  string               // 原文开头 ≤ 300 字
    Snippets []Snippet
    Data     json.RawMessage      // 原 Data 不超过 8KB 时保留，否则为空（在 Ref 里）
    Ref      blob.Ref             // 原文引用，永远非空
    Taint    bool
    TaintSrc []string
    Bytes    int                  // 原文字节数
    Tokens   int                  // Summary + Snippets 的 token 数
}
type Error struct { Class gen.FailureClass; Code, Msg string; Err error }   // 工具错误；Msg 不含密钥和完整参数
func (e *Error) Error() string
func (e *Error) Unwrap() error
func Errorf(class gen.FailureClass, code, format string, args ...any) *Error

// engine/tools/trim.go
type TrimMode string                       // relevant | head | none
type TrimOpts struct { Mode TrimMode; MaxTokens int; Query string }   // MaxTokens 为 0 时用 2000
type Counter interface { CountText(s string) int }                    // tokens.Counter 满足
func Trim(ctx context.Context, raw Raw, o TrimOpts, blobs blob.Store, cnt Counter) (Result, error)

// engine/tools/bm25.go
func chunks(text string, size int, cnt Counter) []chunk                 // 约 size token 一块，按段落、行切，超长段按字切
func bm25(query string, cs []chunk) []float64                          // k1=1.2，b=0.75；ASCII 词小写，中日韩字按相邻两字切
```

## 5. 行为
1. 原文（`Text`，为空时用 `Data`）先写进工作区（`blobs.Put`，媒体类型取 `MediaType`），得到 `Ref`；写失败返回 `*Error{Class: transient, Code: "blob_put"}`，不返回没有原文的结果。
2. `Summary` 取原文开头 300 个字（按 rune，去掉首尾空白）。
3. 模式：
   - `relevant`（默认）：原文按约 500 token 切块；用 `Query` 给每块打 BM25 分，按分数从高到低取块，直到加上下一块会超过 `MaxTokens`（至少取 1 块，太长时从块尾截到 `MaxTokens`）；取到的块按在原文里的位置排序输出。`Query` 为空或所有块都是 0 分时按 `head` 处理。
   - `head`：从开头按块取，直到 `MaxTokens`。
   - `none`：原文不超过 8KB 时整段作为一个片段；超过 8KB 时只留 `Summary` 和 `Ref`（转指针）。
4. `Tokens` = `Summary` 和所有片段的 token 数之和；`relevant`、`head` 模式下 `Tokens ≤ MaxTokens + Summary 的 token 数`。
5. `Taint`、`TaintSrc` 由调用方（`E.11.01` 的 `Handle`）填。

## 6. 不变量
- `Result.Ref` 永远非空
- 同样的输入、同样的选项，结果相同（块的切法、打分、并列时按位置排序都是确定的）

## 7. 错误处理
工作区写入失败：`transient`；`ctx` 已取消：`cancelled`。

## 8. 验收标准
1. 10 万字网页裁剪到 2000 token 以内且保留引用
2. BM25 选出包含关键词的片段
3. 三种模式都有 `Ref`；`none` 超过 8KB 转指针

### 实施卡
- 要建 / 要改的文件：`engine/tools/result.go`、`engine/tools/trim.go`、`engine/tools/bm25.go`、`engine/tools/trim_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1102-T1 裁剪长度`：10 万字的文本，`relevant` 和 `head` 裁到 `MaxTokens`=2000 以内，`Ref` 能读回原文
  - `E1102-T2 相关性`：只有第 37 块含"量子退火"，`Query`="量子退火 成本"时它排在片段里，片段按原文位置排序
  - `E1102-T3 引用必有`：三种模式 `Ref` 都非空；`none` 不超过 8KB 时整段返回，超过时只有 `Summary`；`Put` 失败返回 `transient`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ⑤b 片（`m1-tools-ctx`）开工前复查：结果类型和工具错误放进本叶子（`result.go`，`E.11.01` 在本叶子之后领取）；`Counter` 用本包的接口；写明切块、BM25、三种模式的取法；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K271 |
