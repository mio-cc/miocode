# E.10.01 统一接口与提供方配置

| 项 | 内容 |
|---|---|
| 编号 | E.10.01 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引01§2；用户 2026-11-24（像 NewAPI 的渠道一样可自定义） |
| 最后修改 | 2026-11-24 |

## 1. 职责
定义统一的模型接口（消息、工具、结构化输出、流式、用量、能力、错误），**模型提供方的配置格式**（协议、地址、鉴权、请求头、模型映射、请求体覆盖、能力覆盖），协议适配器要实现的 `Protocol` 接口，以及所有协议共用的部分：HTTP 传输与测试守卫、SSE 解析、请求体覆盖、错误分类、`Collect`、提供方注册表、契约测试框架。

## 2. 不做什么
- 不实现任何一种协议的编码和解码（`E.10.02`–`E.10.04`）
- 不存能力数据（`E.10.05`）
- 不做重试、限流、计量（`E.10.09`，M1）；不做结构化输出的修复（`E.10.06`，M1）
- 不读配置文件、不管连接的增删（调用方把提供方配置传进来；界面上的管理在 `C.16`）

## 3. 继承的上级约束
`E.10-R1`–`R7`、ADR-011、INV-05、INV-18、INV-19（`engine/llm` 可以用 `net/http`）、INV-22、`S.03-R3`、`Q.06-R2`、`E-R3`（不用全局注册）。

## 4. 接口

### 4.1 统一的请求与响应
```go
package llm

type Role string // system | user | assistant | tool
type Part struct {
	Type string // text | image | file
	Text string
	Mime string
	Data []byte // image / file 的内容：上层读出工作区引用后填，协议层不访问工作区
}
type Message struct {
	Role       Role
	Parts      []Part
	ToolCalls  []ToolCall // assistant
	ToolCallID string     // tool
	Cache      bool       // 提示缓存断点（协议支持时才生效）
}
type ToolSpec struct{ Name, Description string; Schema json.RawMessage }
type ToolCall struct{ ID, Name string; Args json.RawMessage }
type OutputSpec struct{ Name string; Schema json.RawMessage; Strict bool }

type Req struct {
	Model       string // 提供方配置里的模型 id（ModelEntry.ID）
	Messages    []Message
	Tools       []ToolSpec
	ToolChoice  string // auto | none | required | <工具名>
	Output      *OutputSpec
	Temperature *float32
	TopP        *float32
	MaxTokens   int
	Reasoning   string // "" | off | minimal | low | medium | high | xhigh | max（U.09.06-R5），按 E.10.05 映射
	Stop        []string
	Metadata    map[string]string // 只给调用方自己用，不发给上游
}
type Usage struct{ In, Cached, Out, Reasoning int }
type Resp struct {
	Text       string
	Thinking   string     // 上游返回的思考文本（有的协议有），不回传给模型
	ToolCalls  []ToolCall // 不含结构化输出用的强制工具
	Structured json.RawMessage
	Finish     string     // stop | length | tool_calls | filtered
	Usage      Usage
	Model      string     // 上游实际返回的模型名
	Raw        json.RawMessage // 上游响应的原始数据（SSE 的 data 逐条组成的 JSON 数组，最多 1 MB），供回放和排查
}
type ToolCallDelta struct {
	Index    int    // 同一次响应里第几个工具调用
	ID, Name string // 第一次出现时给
	Args     string // 参数片段，按到达顺序拼接
}
type Delta struct {
	Text, Thinking string
	ToolCall       *ToolCallDelta
	Done           bool
	Resp           *Resp // Done 时给完整结果
}
type Stream interface {
	Next() (Delta, error) // 结束时返回 io.EOF
	Close() error
}
type Client interface {
	Complete(ctx context.Context, r Req) (Stream, error)
	Caps() Caps
}
func Collect(s Stream) (*Resp, error) // 读完整个流，返回最后的 Resp
```

### 4.2 能力
```go
type Caps struct {
	Window, MaxOutput int
	Tools, ParallelTools, Vision, PromptCache bool
	NativeSchema bool      // 协议原生的结构化输出（json_schema 等）
	Efforts      []string  // 支持的思考强度；空 = 不支持调节
	EffortMap    map[string]string
	EffortBudget map[string]int // 按 token 预算表达强度的协议用（anthropic_messages）
	Tokenizer    string
}
type CapsOverride struct { /* 和 Caps 同名的字段，都是指针或 nil 切片：只覆盖写了的 */ }
type CapsTable interface {
	Lookup(protocol, upstreamModel string) Caps          // E.10.05 的 quirks.Table 实现它
	ErrorClass(protocol string, status int, code, message string) (class string, ok bool)
}
func ResolveEffort(requested string, c Caps) (value string, warn string) // E.10.05 §5 的映射规则；"" 表示请求里不带
```

### 4.3 模型提供方配置
一个模型提供方 = 按一种接口协议接入的一个服务（相当于 NewAPI 里的"渠道"）。资源节点的模型引用 `{provider, model}`（`C.03.01` 资源节点 `value`）里的 `provider` 就是这里的 `name`，`model` 是 `models[].id`。
```go
type ProviderConfig struct {
	Name     string            `json:"name"`     // ^[a-z0-9][a-z0-9_-]{0,39}$，全局唯一
	Protocol string            `json:"protocol"` // chat_completions | responses | anthropic_messages
	BaseURL  string            `json:"base_url"` // 如 https://api.mistral.ai/v1；请求地址 = BaseURL + 路径
	Paths    map[string]string `json:"paths,omitempty"`   // 覆盖协议的默认路径：complete、models
	Auth     Auth              `json:"auth"`
	Headers  map[string]string `json:"headers,omitempty"` // 额外请求头；值里可以写 {{secret:名}}
	Models   []ModelEntry      `json:"models,omitempty"`  // 空：任何模型名都原样发给上游
	Override []BodyOp          `json:"override,omitempty"`// 协议编码之后、发出之前改请求体
	Caps     *CapsOverride     `json:"caps,omitempty"`    // 覆盖 quirks 表（对这个提供方的所有模型）
	TimeoutS int               `json:"timeout_s,omitempty"` // 整个请求的时限，缺省 120
	Proxy    string            `json:"proxy,omitempty"`     // http(s):// 代理；空用系统代理设置
	Vendor   string            `json:"vendor,omitempty"`    // 从哪个常用厂商填的（E.10.05），只用于显示

	// 预留给 M1（多密钥轮询、优先级、故障转移，P.09 K250）：M0 能解析、校验类型，不生效，写了就记一条 warn
	Keys     []string `json:"keys,omitempty"`     // 多个密钥名
	Priority int      `json:"priority,omitempty"`
	Weight   int      `json:"weight,omitempty"`
	Fallback []string `json:"fallback,omitempty"` // 其他提供方名
}
type Auth struct {
	Type   string `json:"type"`             // bearer | header | query | none；缺省按协议（bearer；anthropic_messages 是 header x-api-key）
	Name   string `json:"name,omitempty"`   // header / query 时的请求头名或参数名
	Secret string `json:"secret,omitempty"` // 密钥名（B.07.02），不是明文；none 时为空
}
type ModelEntry struct {
	ID       string        `json:"id"`                 // 对上层的名字
	Upstream string        `json:"upstream,omitempty"` // 实际发给上游的名字；空 = ID（"对外叫 A，实际发 B"）
	Caps     *CapsOverride `json:"caps,omitempty"`     // 只对这个模型
}
type BodyOp struct {
	Op     string          `json:"op"`              // set | delete | rename
	Path   string          `json:"path"`            // 点分路径，如 stream_options.include_usage、reasoning.effort；数组下标写数字
	To     string          `json:"to,omitempty"`    // rename 的新路径
	Value  json.RawMessage `json:"value,omitempty"` // set 的值（任意 JSON）
	Models []string        `json:"models,omitempty"`// 只对这些上游模型生效（可以用 *）；空 = 全部
}
func ParseProviders(raw json.RawMessage) ([]ProviderConfig, []string, error) // 解析 + 校验；第二个返回值是 warn
```
配置文件里的写法（`models.providers`，`G.11`；`C.16` 落地后存在连接里，格式不变）：
```yaml
models:
  providers:
    - name: mistral
      protocol: chat_completions
      base_url: https://api.mistral.ai/v1
      auth: { type: bearer, secret: mistral }
      models:
        - { id: small, upstream: mistral-small-latest }
      override:
        - { op: set, path: safe_prompt, value: false }
    - name: local
      protocol: chat_completions
      base_url: http://127.0.0.1:11434/v1
      auth: { type: none }
```

### 4.4 协议与注册表
```go
type Protocol interface {
	Name() string                      // chat_completions 等
	DefaultPaths() map[string]string   // complete、models
	DefaultAuth() Auth
	DefaultHeaders() map[string]string // 如 anthropic_messages 的 anthropic-version
	Encode(r Req, upstream string, c Caps) (body map[string]any, err error) // 统一请求 → 协议请求体（流式）；之后再套 Override
	Decode(body io.Reader, c Caps) Stream                                   // 流式响应（SSE）→ Delta
	DecodeError(status int, body []byte) (code, message string)             // 从错误响应里取上游的错误码和说明
	DecodeModels(body []byte) ([]string, error)
}
type SecretResolver interface { Resolve(ctx context.Context, name string) (string, error) } // 组装处用 secret.Store（B.07.02）包一层实现它；llm 不 import 平台层
var ErrSecretLocked = errors.New("llm: 密钥库已锁定") // SecretResolver 在密钥库锁定时返回包着它的错误
type Options struct {
	Transport http.RoundTripper // nil：按提供方的 Proxy 建；测试里换成录放（E.10.08）
	Logger    *slog.Logger
}
type Registry struct{ /* 并发安全 */ }
func NewRegistry(protocols []Protocol, caps CapsTable, secrets SecretResolver, o Options) *Registry
func (r *Registry) SetProviders(ps []ProviderConfig) error            // 整体替换（配置热更新时）
func (r *Registry) Providers() []ProviderConfig
func (r *Registry) Client(provider, model string) (Client, error)      // 资源节点的模型引用 → Client
func (r *Registry) ListModels(ctx context.Context, provider string) ([]string, error) // "测试连接"用
```

### 4.5 错误
```go
type Error struct {
	Class      gen.FailureClass // C.11 §4
	Status     int              // HTTP 状态；网络错误为 0
	Provider   string
	Code       string           // 上游错误码
	Message    string           // 上游说明（截到 500 字，不含密钥）
	RetryAfter time.Duration
}
```

### 4.6 契约测试框架（`engine/llm/contract`）
```go
type Suite struct {
	Protocol  llm.Protocol
	Provider  llm.ProviderConfig // 协议的测试用提供方配置（BaseURL 指向录放，E.10.08）
	Model     string
	Cassettes string             // 录放目录
}
func Run(t *testing.T, s Suite) // 跑 §5.6 的全部用例；每个用例的录放文件名就是用例名
```

## 5. 行为

### 5.1 一次调用
1. `Client(provider, model)`：找到提供方和模型条目（`Models` 为空时任何名字都可以，`ID = Upstream = model`；不为空时不在列表里报错）；能力 = quirks 表 `Lookup(协议, 上游模型名)` → 提供方 `Caps` → 模型条目 `Caps`，后面覆盖前面写了的字段。
2. `Complete`：`Protocol.Encode` 得到请求体 → 按顺序执行 `Override`（`Models` 过滤后）→ 序列化。
3. 请求地址 `BaseURL` 去掉末尾的 `/` 加路径（`Paths` 覆盖协议默认值）；请求头依次是 `Content-Type: application/json`、`Accept: text/event-stream`、协议默认头、提供方 `Headers`、鉴权。`Headers` 里的 `{{secret:名}}` 和鉴权的密钥**在这一刻**用 `SecretResolver` 取（`E.10-R4`）。取不到时：错误满足 `errors.Is(err, llm.ErrSecretLocked)`（密钥库锁定；组装处把 `secret.ErrLocked` 包成它，`llm` 不 import 平台层）→ `*llm.Error{Class: auth_denied, Code: "secret_locked", Message: "密钥库已锁定，请先解锁"}`，上层（API、执行器）见到这个 `Code` 时对外报 `provider_unavailable`（`B.07.02` §5）；其他错误 → `auth_denied`，`Code` 为 `secret_missing`，说明"密钥 <名> 不存在"。
4. 2xx：`Protocol.Decode` 返回的流外面包一层：保证最后一个 Delta 是 `Done=true` 并带完整 `Resp`（拼好的文本、工具调用、用量），收集 `Raw`。非 2xx：读最多 64 KB 的响应体，按 §5.5 分类成 `*Error`。
5. 结构化输出（`Req.Output`）：协议按能力选写法：`NativeSchema` 为真用原生写法；否则 `Tools` 为真用强制工具（`emit_<名字>`，结果放进 `Resp.Structured`，不出现在 `ToolCalls` 里）；都不支持时返回 `user_input` 错误"这个模型不支持结构化输出"。修复和文本解析在 `E.10.06`（M1）。

### 5.2 请求体覆盖
- `set`：路径上缺的对象自动建；`delete`：路径不存在时什么也不做；`rename`：把值移到 `To`，原路径不存在时什么也不做。
- 只作用在 JSON 对象和数组上；路径穿过非对象时报错（配置错，`user_input`），错误里写出是第几条覆盖。
- 用途：去掉某家不认的字段、改字段名（如 `max_tokens` → `max_completion_tokens`）、加上某家特有的字段。这是"厂商特判"的唯一出口，写在数据里（INV-18）。

### 5.3 传输与测试守卫
- 缺省的传输：`http.Transport`，代理按 `Proxy`（空时 `http.ProxyFromEnvironment`），连接超时 10 秒，整个请求的时限 `TimeoutS`。
- 测试守卫（`E.10-R5`）：`testing.Testing()` 为真、且环境变量 `ANYDOOR_LLM_RECORD` 不是 `1` 时，目标主机不是回环地址（`127.0.0.1`、`::1`、`localhost`）的请求在发出前就失败，错误说明"测试中不允许调用真实模型"。`E.10.08` 的 `-record` 设置这个环境变量。
- `http://` 地址加非回环主机加鉴权时：允许（内网部署），但 `SetProviders` 记一条 warn"密钥会以明文发送"。

### 5.4 SSE
共用的读取器：按行读（单行最长 4 MB），`event:`、`data:`（多行 `data:` 用 `\n` 连接）、`id:`、以 `:` 开头的注释行忽略，空行结束一个事件。`data: [DONE]` 由协议自己判断。

### 5.5 错误分类
先查 quirks 表的错误规则（`CapsTable.ErrorClass`，按协议、状态、上游错误码、说明匹配）；没有命中再按下表：
| 情况 | Class |
|---|---|
| 网络错误、超时、408、5xx | transient |
| 429 | rate_limited；`Retry-After` 是秒数或 HTTP 日期都认 |
| 401、403 | auth_denied |
| 400、404、413、422 | user_input |
| 其他 | internal |
错误说明里出现密钥原文时替换成 `[REDACTED]`。

### 5.6 契约测试用例
每种协议各有一份录放，用例名固定：`text`（流式文本）、`tool_call`（一次工具调用，参数分片到达）、`tool_result`（带工具结果的第二轮）、`structured`（结构化输出）、`usage`（用量映射，含缓存和思考 token，有就测）、`error_auth`（401）、`error_rate`（429 带 Retry-After）、`models`（模型列表）。断言：拼好的文本、工具调用的 `ID`/`Name`/`Args`（解析成 JSON 比较）、`Structured` 能按 schema 校验、`Finish`、`Usage`、错误的 `Class`。

## 6. 不变量
- `Stream` 的最后一个 Delta 一定是 `Done=true` 并带完整 `Resp`（包括用量）
- 提供方配置、错误、日志、`Raw` 里都没有密钥原文（INV-22）
- 协议包里没有厂商名、模型名的字符串比较（`quirkscheck`）

## 7. 错误处理
配置错误（`ParseProviders`、`SetProviders`）：返回第一处错误，写明是哪个提供方、哪个字段；调用时的错误一律是 `*llm.Error`。

## 8. 验收标准
1. 同一份统一请求，换成另一种协议的提供方不改调用代码
2. 鉴权的四种方式、额外请求头、模型名映射、三种请求体覆盖都按配置生效
3. 测试里连不到真实地址
4. 三种协议用同一个契约测试框架

### 实施卡
- 要建 / 要改的文件：`engine/llm/llm.go`、`engine/llm/provider.go`、`engine/llm/registry.go`、`engine/llm/transport.go`、`engine/llm/sse.go`、`engine/llm/body.go`、`engine/llm/errors.go`、`engine/llm/collect.go`、`engine/llm/effort.go`、`engine/llm/llm_test.go`、`engine/llm/provider_test.go`、`engine/llm/transport_test.go`、`engine/llm/contract/contract.go`、`engine/llm/contract/contract_test.go`、`tools/deps/allow.txt`
- `tools/deps/allow.txt` 去掉 `github.com/openai/openai-go`、`github.com/anthropics/anthropic-sdk-go`、`google.golang.org/genai` 三行（`G.10` 同步，ADR-011）
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`engine/store/`、`web/`
- 测试用例：
  - `E1001-T1 Collect`：文本分片拼接；两个工具调用按 `Index` 交错到达也拼对；最后一个 Delta 带完整 `Resp`；流在没有 Done 时提前结束 → 错误
  - `E1001-T2 契约测试框架`：用测试里写的一个最小协议（`httptest` 返回固定 SSE）跑 `contract.Run`，§5.6 的每个用例都执行到；缺录放文件时用例失败并说明文件名
  - `E1001-T3 提供方配置校验`：名字不合规、重名、未知协议、`base_url` 不是绝对地址、`header`/`query` 鉴权缺 `name`、需要密钥却没有 `secret`、`Override` 的 `op` 不认识、模型 `id` 重名各自报错并写明位置；`keys`、`priority`、`weight`、`fallback` 能解析，各记一条 warn；`http://` 加远程主机加鉴权记 warn
  - `E1001-T4 请求组装`：`httptest` 记下收到的请求：地址等于 `BaseURL` + 默认路径，`Paths` 覆盖生效；`bearer`、`header`、`query`、`none` 四种鉴权；`Headers` 里的 `{{secret:名}}` 被换成密钥；`SecretResolver` 在 `SetProviders` 时不被调用、每次请求调用一次；返回包着 `ErrSecretLocked` 的错误 → `Code` 为 `secret_locked`，返回其他错误 → `secret_missing`，两种都不发出请求；`upstream` 映射；`set`（含建中间对象）、`delete`、`rename`、`Models` 过滤；`Models` 不为空时用列表外的名字报错
  - `E1001-T5 错误分类`：§5.5 表每一行一个用例；`Retry-After` 秒数和 HTTP 日期两种；quirks 错误规则优先；错误说明里的密钥原文被替换
  - `E1001-T6 测试守卫`：在测试里请求 `https://example.invalid` 不发出网络请求、直接得到"测试中不允许调用真实模型"；回环地址照常；`ANYDOOR_LLM_RECORD=1` 时守卫放行（只断言守卫的判定，不真的联网）
  - `E1001-T7 能力合并与强度`：quirks → 提供方 → 模型条目三层覆盖；`ResolveEffort` 按 `E.10.05` §5 的规则（不在列表里先查映射，再取最接近的、一样近取较高；`off` 和不支持调节时返回 ""）
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 三种协议各自用 `contract.Run`：在 `E.10.02`、`E.10.03`、`E.10.04` 跑
- 允许使用的依赖：标准库、`github.com/oklog/ulid/v2`（不需要时不用）；测试里 `github.com/santhosh-tekuri/jsonschema/v6`（校验 `Structured`）
- 禁止事项：`G.02.05` 全部；另：不引入厂商 SDK 和聚合库（`E.10-R6`）；不 import `internal/`（INV-19）
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑨ 片（`m0-llm`）开工前复查：改名"统一接口与提供方配置"；按协议实现（ADR-011）：新增提供方配置（协议、地址、鉴权、请求头、模型映射、请求体覆盖、能力覆盖、预留多密钥字段）、`Protocol` 接口、注册表、传输与测试守卫、SSE、错误分类、契约测试框架；`Provider` 不再是适配器接口；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K250、K251 |
