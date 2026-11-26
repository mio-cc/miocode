# E.10.06 结构化输出与修复

| 项 | 内容 |
|---|---|
| 编号 | E.10.06 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引05 |
| 最后修改 | 2026-11-26 |

## 1. 职责
保证 Agent 拿到符合 `output_schema` 的结构化结果：三级策略选择、解析、宽松修正、带反馈重试。

## 2. 不做什么
- 不决定重试次数以外的业务策略（Agent 执行器配置，`E.14.02.03`）

## 3. 继承的上级约束
`C.13.03-R3`（类型生成 JSON Schema）、`引05` §3、`E.10.01` §5.1 第 5 步（`Req.Output` 时取出 `Structured`）、`P.09` K268。

## 4. 接口
```go
// engine/llm/structured
type Strategy string
const (
    Native     Strategy = "native_schema" // 协议原生的结构化输出（Req.Output，Caps.NativeSchema）
    ForcedTool Strategy = "tool_call"     // 强制调用 emit_<名字> 工具（Caps.Tools）
    TextParse  Strategy = "text_repair"   // 文本里找 JSON 再修复
)
func Pick(c llm.Caps) Strategy
func Next(s Strategy, c llm.Caps) (Strategy, bool)           // 降级：Native → ForcedTool（要 Tools）→ TextParse
func Prepare(req llm.Req, s Strategy, out llm.OutputSpec) llm.Req
type Validator interface{ Validate(v any) error }             // *jsonschema.Schema 满足它
type ValidationError struct{ Path, Message string }
type Result struct {
    JSON    json.RawMessage   // 修复、宽松修正之后的 JSON
    Repairs []string          // 做过的修复：code_fence、extract、comment、single_quote、trailing_comma、close、number_string、single_to_array、default:<路径>
    Errors  []ValidationError // 校验不通过的地方
}
func Decode(resp *llm.Resp, s Strategy, out llm.OutputSpec, v Validator) (Result, error)
func Repair(text string) (raw json.RawMessage, repairs []string, ok bool)
func Feedback(errs []ValidationError) llm.Message
const CodeNoJSON, CodeSchemaMismatch = "no_json", "schema_mismatch"
```

## 5. 行为
1. 选策略：`Caps.NativeSchema` → Native；否则 `Caps.Tools` → ForcedTool；否则 TextParse。Agent 执行器在结果不合格时可以按 `Next` 降级（写 `llm.fallback`，`E.14.02`）。
2. `Prepare`（返回副本）：Native 设 `Output`；ForcedTool 不设 `Output`，把 `llm.StructuredTool(&out)` 加进 `Tools`、`ToolChoice` 写它的名字（这样即使模型支持原生写法也能降级）；TextParse 不设 `Output`，在第一条 system 消息末尾（没有就在最前面加一条）加上"只输出一个 JSON 对象"和紧凑的 JSON Schema。
3. 取原始 JSON：Native 取 `Structured`；ForcedTool 取名字是 `emit_<名字>` 的工具调用的参数；取不到或 TextParse 时用 `Repair(resp.Text)`。
4. `Repair`：去掉首尾空白后本身是合法的 JSON 对象或数组 → 原样返回，不算修复；否则依次：取 ```` ``` ```` 代码块里的内容（`code_fence`）、从第一个 `{` 或 `[` 起取第一个完整的块（前后有别的文字记 `extract`）、去掉字符串外的 `//` 和 `/* */` 注释（`comment`）、单引号字符串改成双引号（`single_quote`）、去掉 `}`、`]` 前的逗号（`trailing_comma`）、补上没闭合的字符串和括号（`close`）；结果是合法 JSON 才算成功。
5. 宽松修正（按 `out.Schema` 原文，只看 `type`、`properties`、`items`、`default`）：类型是 `integer` / `number` 而值是能解析成数字的字符串 → 数字；类型是 `array` 而值不是数组 → 单元素数组；对象缺的属性有 `default` → 填默认值。
6. 校验：`v` 不为 nil 时用它校验；不通过时 `Result.Errors` 列出每处（路径、说明，最多 20 处），返回 `format_invalid`（`CodeSchemaMismatch`）。找不到 JSON 返回 `format_invalid`（`CodeNoJSON`）。
7. `Feedback` 生成一条 user 消息："上次的输出不符合要求"加每处的路径和说明，Agent 执行器决定是否追加它重试一次。
8. 修复、修正都记在 `Result.Repairs`，由调用方写进 `llm.call.strategy` 和事件（`E.14.02`）；指标 `hx_llm_repairs_total` 在 M5。

## 6. 不变量
- 修复不会改变合法 JSON 的语义

## 7. 错误处理
返回 `*llm.Error`，分类 `format_invalid`：`CodeNoJSON` 找不到 JSON；`CodeSchemaMismatch` 校验不通过（`Result.Errors` 带位置）。

## 8. 验收标准
1. 5 类常见错误各 3 个修复用例
2. 三种策略在 fake 模型下都能得到合法结果
3. 修复规则不改合法输入

### 实施卡
- 要建 / 要改的文件：`engine/llm/structured/structured.go`、`engine/llm/structured/repair.go`、`engine/llm/structured/structured_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/blob/`、`engine/obs/`、`engine/llm/` 下其他已有文件
- 测试用例：
  - `E1006-T1 修复向量`：代码块、没闭合、尾逗号、单引号、注释各 3 个，修复后与期望的 JSON 语义相同，`Repairs` 里有对应的名字；找不到 JSON 时失败
  - `E1006-T2 策略选择`：`Pick`、`Next` 的降级顺序；三种策略各用 fake 模型走一遍 `Prepare` → `Complete` → `Collect` → `Decode` 得到合法结果（ForcedTool 的请求带工具和 `ToolChoice`、TextParse 的请求有 system 说明）；宽松修正（数字字符串、单值转数组、默认值）；校验不通过时返回 `CodeSchemaMismatch` 和位置，`Feedback` 是 user 消息且写了位置
  - `E1006-T3 合法输入不变（rapid）`：随机生成的 JSON 对象序列化后 `Repair` 得到语义相同的 JSON、没有修复记录
- 允许使用的依赖：标准库、`engine/llm`、`github.com/santhosh-tekuri/jsonschema/v6`；测试另用 `engine/llm/fake`、`pgregory.net/rapid`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ⑤a 片（`m1-llm`）开工前复查：原生和强制工具的取值已在 `E.10.01`，本叶子加降级、强制工具的显式写法、文本解析、5 类修复、宽松修正、校验与反馈；`Pick` 只看 `Caps`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K268 |
