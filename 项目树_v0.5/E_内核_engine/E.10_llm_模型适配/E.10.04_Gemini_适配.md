# E.10.04 Gemini 适配

| 项 | 内容 |
|---|---|
| 编号 | E.10.04 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引05 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 Gemini 提供方适配：把统一的 `llm.Req` 转成该家的请求，把流式响应转回统一的 `Delta` / `Resp`。

## 2. 不做什么
- 不做重试和限流（`E.10.09`）
- 不在代码里写厂商特判（差异进 quirks，`E.10-R2`）

## 3. 继承的上级约束
`E.10-R1`–`R4`、`E.10.01`。

## 4. 接口
```go
func NewGemini(cfg ProviderConfig, secrets engine.SecretResolver, q quirks.Table) llm.Provider
```

## 5. 行为
- 同一 SDK 支持 Gemini API 和 Vertex AI，由提供方配置 `backend: gemini_api | vertex` 切换。
- 角色只有 user 和 model；`SystemInstruction` 独立字段；工具结果放在 user 消息的 `FunctionResponse` part。
- 工具调用参数一次性给出完整对象，不需要拼接；强制调用用 `FunctionCallingConfig{Mode: ANY}`。
- 结构化输出：`ResponseMIMEType: application/json` + `ResponseJsonSchema`。Gemini 只支持 JSON Schema 子集：适配器先做降级转换（内联 `$ref`、判别联合展开成带 enum 判别字段的对象）；转换失败时在 Caps 里标记，该类型走第二 / 三级策略。
- 用量：`PromptTokenCount`、`CandidatesTokenCount`、`CachedContentTokenCount`、`ThoughtsTokenCount`（计入 `Reasoning`）。
- `FinishReason=SAFETY` 等映射为 `filtered`，失败类别 `structural`，不重试，走升级。

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
- 要建 / 要改的文件：`engine/llm/gemini/*.go`、`testdata/cassettes/gemini/*.json`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1004-T1 契约测试`
  - `E1004-T2 流式拼接`
  - `E1004-T3 用量映射`
  - `E1004-T4 错误映射`
- 允许使用的依赖：`google.golang.org/genai`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
