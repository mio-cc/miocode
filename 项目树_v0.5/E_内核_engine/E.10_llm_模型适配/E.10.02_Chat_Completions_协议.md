# E.10.02 Chat Completions 协议

| 项 | 内容 |
|---|---|
| 编号 | E.10.02 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引05；OpenAI Chat Completions 接口文档 |
| 最后修改 | 2026-11-24 |

## 1. 职责
实现 `chat_completions` 协议（`POST {base_url}/chat/completions`，SSE 流式）：把统一的 `llm.Req` 编码成请求体，把流式响应解码成 `llm.Delta`。所有讲这种协议的服务都用它：OpenAI、Mistral、DeepSeek、通义、Moonshot、智谱、Gemini 的兼容接口、各种中转站、Ollama、vLLM、LM Studio……区别只在提供方配置里（`E.10.01` §4.3）。

## 2. 不做什么
- 不做重试和限流（`E.10.09`）
- 不知道自己连的是哪一家：差异进 quirks 表或提供方的 `override`（`E.10-R2`）

## 3. 继承的上级约束
`E.10-R1`–`R7`、`E.10.01`。

## 4. 接口
```go
package chat // engine/llm/protocol/chat
func New() llm.Protocol // Name() == "chat_completions"；默认路径 complete=/chat/completions、models=/models；默认鉴权 bearer
```

## 5. 行为
- **消息**：`system` / `user` / `assistant` / `tool` 四种角色原样对应；`Parts` 只有一段文本时 `content` 写字符串，否则写数组（`{type: text}`、`{type: image_url, image_url: {url: data:<mime>;base64,…}}`）；assistant 的 `ToolCalls` → `tool_calls: [{id, type: function, function: {name, arguments}}]`（`arguments` 是 JSON 字符串）；tool 消息带 `tool_call_id`。
- **工具**：`tools: [{type: function, function: {name, description, parameters}}]`；`ToolChoice`：`auto` / `none` / `required` 原样，工具名写成 `{type: function, function: {name}}`。
- **结构化输出**（`E.10.01` §5.1）：`NativeSchema` 时 `response_format: {type: json_schema, json_schema: {name, schema, strict}}`，结果取文本；否则强制工具 `emit_<名字>`，结果取它的参数。
- **其他参数**：`stream: true`、`stream_options: {include_usage: true}`、`model`（上游名）、`max_tokens`、`temperature`、`top_p`、`stop`；思考强度用 `reasoning_effort`（`llm.ResolveEffort` 的结果，"" 时不写）。上游字段名不同时用提供方的 `override` 改（例如 `max_tokens` → `max_completion_tokens`）。
- **流式解码**：每个 `data:` 是一个 chunk，`[DONE]` 结束；`choices[0].delta.content` → `Text`；`delta.reasoning_content` 或 `delta.reasoning`（有的服务用来放思考文本）→ `Thinking`；`delta.tool_calls[]` 按 `index` 拼：第一次出现时带 `id`、`function.name`，之后的 `function.arguments` 是片段，结束后整体解析成 JSON；`finish_reason`：`stop` → stop、`length` → length、`tool_calls` → tool_calls、`content_filter` → filtered；`model` 取最后一次出现的值。
- **用量**：`choices` 为空、带 `usage` 的那个 chunk：`prompt_tokens` → In、`prompt_tokens_details.cached_tokens` → Cached、`completion_tokens` → Out、`completion_tokens_details.reasoning_tokens` → Reasoning；整个流都没有用量时为 0 并记 warn。
- **错误体**：`{error: {message, type, code}}` → `code`（没有时用 `type`）和 `message`，交给 `E.10.01` §5.5 分类。
- **模型列表**：`GET /models` → `{data: [{id}]}`。
- 录放来源：用 Mistral（`https://api.mistral.ai/v1`，模型 `mistral-small-latest`）真实录制 `text`、`tool_call`、`tool_result`、`structured`、`models`；`usage`、`error_auth`、`error_rate` 按官方文档手写。上游在某个用例上不支持（例如不支持这种协议的结构化输出）时：在 `quirks.yaml` 写明能力，这个用例改用手写录放，`RELAY.md` 写明。

## 6. 不变量
- 最后一个 Delta 带完整用量
- 包里没有厂商名、模型名的字符串比较

## 7. 错误处理
SSE 里的 chunk 不是合法 JSON：`internal` 错误，说明里带第几个事件；流在 `[DONE]` 和 `finish_reason` 之前断开：`transient`。

## 8. 验收标准
1. 契约测试全部通过（录放数据）
2. 流式工具参数拼接正确，多个工具按 `index` 交错也正确
3. 用量映射正确（含缓存和思考 token）
4. 编码出的请求体和预期一致

### 实施卡
- 要建 / 要改的文件：`engine/llm/protocol/chat/chat.go`、`engine/llm/protocol/chat/encode.go`、`engine/llm/protocol/chat/decode.go`、`engine/llm/protocol/chat/chat_test.go`、`engine/llm/protocol/chat/testdata/`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`engine/store/`、`web/`、`engine/llm/protocol/responses/`、`engine/llm/protocol/messages/`
- 测试用例：
  - `E1002-T1 契约测试`：`contract.Run`，录放在 `testdata/cassettes/`
  - `E1002-T2 流式拼接`：工具参数分 5 片到达；两个工具按 `index` 交错；`[DONE]` 前断开 → transient
  - `E1002-T3 用量映射`：缓存和思考 token；没有用量 → 0 并记 warn
  - `E1002-T4 错误映射`：`{error: {code, message}}` 和只有 `type` 两种；`context_length_exceeded` 经 quirks 规则成 user_input
  - `E1002-T5 请求编码`：一个用到全部字段的 `Req`（多段内容、图片、工具、工具结果、强制工具、原生 schema、强度）编码结果与 `testdata/encode/*.json` 一致
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部；另：不引入 SDK（`E.10-R6`）
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑨ 片（`m0-llm`）开工前复查：改为 `chat_completions` 协议的实现（ADR-011），改名；不用 `openai-go`；写全编码、流式解码、用量、错误、录放来源（Mistral 真实录制）；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K250、K251 |
