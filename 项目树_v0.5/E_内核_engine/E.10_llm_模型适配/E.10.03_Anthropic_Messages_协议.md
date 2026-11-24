# E.10.03 Anthropic Messages 协议

| 项 | 内容 |
|---|---|
| 编号 | E.10.03 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引05；Anthropic Messages 接口文档 |
| 最后修改 | 2026-11-24 |

## 1. 职责
实现 `anthropic_messages` 协议（`POST {base_url}/messages`，SSE 流式）：Anthropic，以及提供这种兼容接口的服务。

## 2. 不做什么
- 不做重试和限流（`E.10.09`）
- 不用 Anthropic 的服务端工具（网页搜索、代码执行等由本项目的工具做）

## 3. 继承的上级约束
`E.10-R1`–`R7`、`E.10.01`。

## 4. 接口
```go
package messages // engine/llm/protocol/messages
func New() llm.Protocol // Name() == "anthropic_messages"；默认路径 complete=/messages、models=/models；
                        // 默认鉴权 header x-api-key；默认请求头 anthropic-version: 2023-06-01
```

## 5. 行为
- **消息**：所有 `system` 消息的文本按顺序用空行连接，放进顶层 `system`；其余按顺序变成 `messages`，相邻的同角色消息合并成一条（这个协议要求 user / assistant 交替）；tool 消息变成 user 消息里的 `{type: tool_result, tool_use_id, content}` 块；assistant 的工具调用变成 `{type: tool_use, id, name, input}` 块；图片 `{type: image, source: {type: base64, media_type, data}}`；`Cache=true` 的消息最后一块加 `cache_control: {type: ephemeral}`（`PromptCache` 为真时）。
- **工具**：`tools: [{name, description, input_schema}]`；`tool_choice`：`auto` → `{type: auto}`、`required` → `{type: any}`、`none` → `{type: none}`、工具名 → `{type: tool, name}`。
- **结构化输出**：用强制工具（`emit_<名字>`，`tool_choice: {type: tool}`），结果取它的 `input`；quirks 表把某个模型标成 `native_schema` 时也仍用强制工具（这个协议的原生写法以后再加，K251）。
- **其他参数**：`stream: true`、`model`、`max_tokens`（必填：请求里没有时用能力表的 `max_output`）、`temperature`、`top_p`、`stop_sequences`；思考强度：`thinking: {type: enabled, budget_tokens: <EffortBudget[级]>}`，`off` 或不支持时不写。
- **流式解码**：`message_start`（`message.usage.input_tokens`、`cache_read_input_tokens`、`model`）；`content_block_start`（`text`、`tool_use{id, name}`、`thinking`，`Index` = `index`）；`content_block_delta`（`text_delta` → Text、`input_json_delta.partial_json` → 参数片段、`thinking_delta` → Thinking）；`content_block_stop`；`message_delta`（`delta.stop_reason`、`usage.output_tokens`）；`message_stop` 结束；`ping` 忽略；`error` 事件按错误处理。`stop_reason`：`end_turn`、`stop_sequence` → stop，`max_tokens` → length，`tool_use` → tool_calls，`refusal` → filtered。
- **用量**：`input_tokens` → In、`cache_read_input_tokens` → Cached、`output_tokens` → Out；思考 token 这个协议不单独给，Reasoning 为 0。
- **错误体**：`{type: error, error: {type, message}}` → `code` = `error.type`；529（`overloaded_error`）经 quirks 规则成 transient。
- **模型列表**：`GET /models` → `{data: [{id}]}`。
- **思考块**：`Thinking` 只给上层显示，下一轮请求不回传（M0 不做"带签名的思考块回传"）。
- 录放来源：M0 还没有这种协议的测试密钥，全部用例先按 Anthropic 官方文档的示例手写（K251），`note` 写明文档地址；有密钥后用 `-record` 重录。上游在某个用例上不支持（例如不支持这种协议的结构化输出）时：在 `quirks.yaml` 写明能力，这个用例改用手写录放，`RELAY.md` 写明。

## 6. 不变量
- 发出的 `messages` 里 user / assistant 交替
- 最后一个 Delta 带完整用量

## 7. 错误处理
事件不是合法 JSON：`internal`；`error` 事件：按 `error.type` 分类；流在 `message_stop` 之前断开：`transient`。

## 8. 验收标准
1. 契约测试全部通过（手写录放）
2. 相邻同角色消息合并、工具结果放进 user 消息
3. 参数片段拼接正确
4. 编码出的请求体和预期一致

### 实施卡
- 要建 / 要改的文件：`engine/llm/protocol/messages/messages.go`、`engine/llm/protocol/messages/encode.go`、`engine/llm/protocol/messages/decode.go`、`engine/llm/protocol/messages/messages_test.go`、`engine/llm/protocol/messages/testdata/`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`engine/store/`、`web/`、`engine/llm/protocol/chat/`、`engine/llm/protocol/responses/`
- 测试用例：
  - `E1003-T1 契约测试`：`contract.Run`，录放在 `testdata/cassettes/`（手写）
  - `E1003-T2 流式拼接`：`input_json_delta` 分片；文本块和工具块交错；`ping` 忽略；`message_stop` 前断开 → transient
  - `E1003-T3 用量映射`：输入、缓存读、输出
  - `E1003-T4 错误映射`：`error` 事件；非 2xx 错误体；529 经 quirks 规则成 transient
  - `E1003-T5 请求编码`：system 合并、相邻同角色合并、工具结果、图片、`cache_control`、强制工具、`thinking` 预算、`max_tokens` 缺省，与 `testdata/encode/*.json` 一致
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部；另：不引入 SDK（`E.10-R6`）
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑨ 片（`m0-llm`）开工前复查：改为 `anthropic_messages` 协议的实现（ADR-011），改名；不用 `anthropic-sdk-go`；写全编码、流式解码、用量、错误；还没有测试密钥，录放先按官方文档手写；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K250、K251 |
