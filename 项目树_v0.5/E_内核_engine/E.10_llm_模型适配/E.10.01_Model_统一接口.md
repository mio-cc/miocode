# E.10.01 Model 统一接口

| 项 | 内容 |
|---|---|
| 编号 | E.10.01 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§2 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义统一的模型接口：消息、工具、结构化输出、流式、用量、能力描述、提供方注册。

## 2. 不做什么
- 不包含重试、限流、计量（`E.10.09` 包在外面）

## 3. 继承的上级约束
`E.10-R1`–`R4`、ADR-005。

## 4. 接口
```go
package llm

type Role string // system | user | assistant | tool
type Part struct { Type string; Text string; Ref string; Mime string }   // text | image | file
type Message struct {
    Role       Role
    Parts      []Part
    ToolCalls  []ToolCall      // assistant
    ToolCallID string          // tool
    Cache      bool            // 提示缓存断点
}
type ToolSpec struct { Name, Description string; Schema json.RawMessage }
type ToolCall struct { ID, Name string; Args json.RawMessage }
type OutputSpec struct { Name string; Schema json.RawMessage; Strict bool }

type Req struct {
    Model       string
    Messages    []Message
    Tools       []ToolSpec
    ToolChoice  string          // auto | none | required | <工具名>
    Output      *OutputSpec
    Temperature *float32
    MaxTokens   int
    Reasoning   string          // "" | low | medium | high | max；按 quirks 映射（E.10.05）
    Stop        []string
    Metadata    map[string]string
}
type Usage struct { In, Cached, Out, Reasoning int }
type Resp struct {
    Text       string
    ToolCalls  []ToolCall
    Structured json.RawMessage
    Finish     string          // stop | length | tool_calls | filtered
    Usage      Usage
    Model      string          // 厂商实际返回的模型版本
    Raw        json.RawMessage // 原始响应（脱敏后存工作区，供回放）
}
type Delta struct { Text string; ToolCall *ToolCallDelta; Done bool; Resp *Resp }
type Stream interface { Next() (Delta, error); Close() error }   // io.EOF 结束

type Client interface {
    Complete(ctx context.Context, r Req) (Stream, error)
    Caps() Caps
}
type Caps struct {
    Window, MaxOutput int
    NativeSchema, Tools, ParallelTools, Vision, PromptCache bool
    Tokenizer string
}
func Collect(s Stream) (*Resp, error)

type Provider interface {
    Kind() string                                     // openai_compat | anthropic | gemini | fake
    Client(model string, cfg ProviderConfig) (Client, error)
}
type Registry interface {
    Register(p Provider)
    Client(ref gen.ResourceRef) (Client, error)       // 资源节点的模型引用 → Client
}
```

## 5. 行为
- 资源节点的模型引用格式 `{provider: <设置里的提供方名>, model: <模型名>, sampling?, fallback?}`；提供方名对应设置 `models.providers`（`G.11`）。
- `Caps` 由 quirks 表 + 提供方配置覆盖得到（`E.10.05`）。

## 6. 不变量
- `Stream` 的最后一个 Delta 一定是 `Done=true` 并带完整 `Resp`（包括用量）

## 7. 错误处理
厂商错误统一映射为 `*llm.Error{Class, Status, Provider, RetryAfter}`，`Class` 取 `C.11` §4。

## 8. 验收标准
1. 三家适配都通过契约测试
2. `Collect` 对流式和非流式结果一致

### 实施卡
- 要建 / 要改的文件：`engine/llm/llm.go`、`engine/llm/registry.go`、`engine/llm/collect.go`、`engine/llm/contract/*.go（契约测试）`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1001-T1 Collect`
  - `E1001-T2 契约测试框架可被三家复用`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
