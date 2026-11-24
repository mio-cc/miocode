# E.10.04 Responses 协议

| 项 | 内容 |
|---|---|
| 编号 | E.10.04 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引05；OpenAI Responses 接口文档 |
| 最后修改 | 2026-11-24 |

## 1. 职责
实现 `responses` 协议（`POST {base_url}/responses`，SSE 流式）。OpenAI 推荐新项目用它，Mistral 等也提供这种格式。本项目自己管理对话历史（事件日志，INV-11），所以**只用无状态的用法**：每次把完整的输入发过去，`store: false`，不用 `previous_response_id`。

## 2. 不做什么
- 不用服务端保存的会话状态、内置工具（网页搜索、文件检索等由本项目的工具做，`E.11`）
- 不做重试和限流（`E.10.09`）

## 3. 继承的上级约束
`E.10-R1`–`R7`、`E.10.01`。

## 4. 接口
```go
package responses // engine/llm/protocol/responses
func New() llm.Protocol // Name() == "responses"；默认路径 complete=/responses、models=/models；默认鉴权 bearer
```

## 5. 行为
- **输入**：所有 `system` 消息的文本按顺序用空行连接，放进 `instructions`；其余消息变成 `input` 里的条目：user → `{role: user, content: [{type: input_text, text}, {type: input_image, image_url: data:…}]}`；assistant 的文本 → `{role: assistant, content: [{type: output_text, text}]}`；assistant 的工具调用 → 每个一条 `{type: function_call, call_id, name, arguments}`；tool 消息 → `{type: function_call_output, call_id, output}`。
- **工具**：`tools: [{type: function, name, description, parameters, strict: false}]`；`tool_choice`：`auto` / `none` / `required`，工具名写成 `{type: function, name}`。
- **结构化输出**：`NativeSchema` 时 `text: {format: {type: json_schema, name, schema, strict}}`，结果取文本；否则强制工具。
- **其他参数**：`stream: true`、`store: false`、`model`、`max_output_tokens`、`temperature`、`top_p`；思考强度写 `reasoning: {effort}`。
- **流式解码**（按 `type` 字段，`event:` 行只作参考）：`response.output_text.delta` → `Text`；`response.reasoning_summary_text.delta`、`response.reasoning_text.delta` → `Thinking`；`response.output_item.added` 里 `item.type == function_call` → 开始一个工具调用（`Index` = `output_index`，带 `call_id`、`name`）；`response.function_call_arguments.delta` → 参数片段（按 `output_index` 对上）；`response.completed` → 结束，取 `response.usage`、`response.model`；`response.incomplete` → `incomplete_details.reason` 为 `max_output_tokens` 时 length、`content_filter` 时 filtered；`response.failed`、`error` → 按错误处理。不认识的事件忽略。`Finish`：有工具调用时 tool_calls，否则 stop。
- **用量**：`input_tokens` → In、`input_tokens_details.cached_tokens` → Cached、`output_tokens` → Out、`output_tokens_details.reasoning_tokens` → Reasoning。
- **错误体**：`{error: {message, type, code}}`，同 `E.10.02`。
- **模型列表**：`GET /models` → `{data: [{id}]}`。
- 录放来源：用 Mistral 真实录制 `text`、`tool_call`、`tool_result`、`structured`；`usage`、`error_auth`、`error_rate`、`models` 按官方文档手写。上游在某个用例上不支持（例如不支持这种协议的结构化输出）时：在 `quirks.yaml` 写明能力，这个用例改用手写录放，`RELAY.md` 写明。

## 6. 不变量
- 请求里总是 `store: false`，没有 `previous_response_id`
- 最后一个 Delta 带完整用量

## 7. 错误处理
事件不是合法 JSON：`internal`；`response.failed`：按其中的 `error.code` / `message` 分类；流在 `response.completed` / `incomplete` 之前断开：`transient`。

## 8. 验收标准
1. 契约测试全部通过（录放数据）
2. 多个工具调用按 `output_index` 拼接正确
3. 无状态：请求里没有服务端会话状态
4. 编码出的请求体和预期一致

### 实施卡
- 要建 / 要改的文件：`engine/llm/protocol/responses/responses.go`、`engine/llm/protocol/responses/encode.go`、`engine/llm/protocol/responses/decode.go`、`engine/llm/protocol/responses/responses_test.go`、`engine/llm/protocol/responses/testdata/`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`engine/store/`、`web/`、`engine/llm/protocol/chat/`、`engine/llm/protocol/messages/`
- 测试用例：
  - `E1004-T1 契约测试`：`contract.Run`，录放在 `testdata/cassettes/`
  - `E1004-T2 流式拼接`：两个工具调用的参数片段交错到达；不认识的事件被忽略；`completed` 前断开 → transient
  - `E1004-T3 用量映射`：缓存和思考 token
  - `E1004-T4 结束与错误`：`incomplete` 的两种原因；`response.failed`；`error` 事件；非 2xx 错误体
  - `E1004-T5 请求编码`：system 合并进 `instructions`、工具调用和工具结果的条目、图片、强制工具、原生 schema、强度、`store: false`，与 `testdata/encode/*.json` 一致
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部；另：不引入 SDK（`E.10-R6`）
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑨ 片（`m0-llm`）开工前复查：原来的 Gemini 适配改为 `responses` 协议的实现（用户决定 M0 做三种协议，Gemini 先走它的 Chat Completions 兼容接口，ADR-011）；改名；无状态用法；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K250、K251 |
| 2026-11-24 | 状态改为"冻结"：第 ⑨ 片（`m0-llm`）squash 合并进代码仓库 `main`，提交 `fdbda299d663789d112f4ecb124901e234b645f8`（`G.02.06-R21`） | `relay slice` 通过；整片评审 19 行，1 条不符合、3 条有疑问已修（`P.09` K252）并复核；按 `G.08-R3` 由验证者合并 |
