# E.10.02 OpenAI 适配

| 项 | 内容 |
|---|---|
| 编号 | E.10.02 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引05 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 OpenAI 兼容 提供方适配：把统一的 `llm.Req` 转成该家的请求，把流式响应转回统一的 `Delta` / `Resp`。

## 2. 不做什么
- 不做重试和限流（`E.10.09`）
- 不在代码里写厂商特判（差异进 quirks，`E.10-R2`）

## 3. 继承的上级约束
`E.10-R1`–`R4`、`E.10.01`。

## 4. 接口
```go
func NewOpenAICompat(cfg ProviderConfig, secrets engine.SecretResolver, q quirks.Table) llm.Provider
```

## 5. 行为
- 覆盖 OpenAI 和所有提供 OpenAI 兼容接口的厂商、本地模型（DeepSeek、通义、Moonshot、智谱、vLLM、Ollama 等），通过 `base_url` 接入。
- 流式：解析 SSE；工具调用参数是按 `index` 分片的字符串，累积拼接，结束后再解析 JSON。
- 结构化输出：`response_format: {type: json_schema, json_schema: {name, schema, strict}}`；quirks 标记不支持时走第二 / 三级策略（`E.10.06`）。
- 用量：请求带 `stream_options.include_usage`；`prompt_tokens_details.cached_tokens` → `Cached`；`completion_tokens_details.reasoning_tokens` → `Reasoning`。
- 推理强度：`reasoning_effort`，取值按 quirks 映射（例如某些模型只接受 low / high / max，`medium` 自动映射为 high 并记 warn，`P.08.05`）。
- 图片：工作区引用读出后转 data URL。

## 6. 不变量
- 最后一个 Delta 带完整用量
- 原始响应脱敏后才写入 `Resp.Raw`（`S.03-R7`）

## 7. 错误处理
按 `引05` §5 错误表分类：网络 / 5xx / overloaded → transient；429 → rate_limited（带 Retry-After）；上下文超长 → user_input；401 / 403 → auth_denied（不重试，提示检查密钥）；内容拦截 → structural。

## 8. 验收标准
1. 契约测试全部通过（录放数据）
2. 流式工具参数拼接正确
3. 用量映射正确（含缓存和思考 token）
4. 错误映射表每一行一个用例

### 实施卡
- 要建 / 要改的文件：`engine/llm/openai/*.go`、`testdata/cassettes/openai/*.json`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1002-T1 契约测试`
  - `E1002-T2 流式拼接`
  - `E1002-T3 用量映射`
  - `E1002-T4 错误映射`
- 允许使用的依赖：`github.com/openai/openai-go`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
