# E.10.03 Anthropic 适配

| 项 | 内容 |
|---|---|
| 编号 | E.10.03 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引05 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 Anthropic 提供方适配：把统一的 `llm.Req` 转成该家的请求，把流式响应转回统一的 `Delta` / `Resp`。

## 2. 不做什么
- 不做重试和限流（`E.10.09`）
- 不在代码里写厂商特判（差异进 quirks，`E.10-R2`）

## 3. 继承的上级约束
`E.10-R1`–`R4`、`E.10.01`。

## 4. 接口
```go
func NewAnthropic(cfg ProviderConfig, secrets engine.SecretResolver, q quirks.Table) llm.Provider
```

## 5. 行为
- `system` 是独立字段：统一接口里所有 system 消息合并后放进去。
- 流式事件 `message_start / content_block_* / message_delta / message_stop`；工具参数 `input_json_delta.partial_json` 累积后解析；工具结果以 user 角色的 `tool_result` 块回传。
- 结构化输出：强制工具调用——构造工具 `emit_<类型名>`，`input_schema` 为输出 schema，`tool_choice` 指定它，取其参数为结果（第二级策略的原生形态）。
- 提示缓存：`Cache=true` 的消息末块加 `cache_control: {type: ephemeral}`；`cache_read_input_tokens` → `Cached`。
- 思考：`thinking` 块不回传给后续轮次以外的地方；思考 token 计入 `Reasoning`。

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
- 要建 / 要改的文件：`engine/llm/anthropic/*.go`、`testdata/cassettes/anthropic/*.json`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1003-T1 契约测试`
  - `E1003-T2 流式拼接`
  - `E1003-T3 用量映射`
  - `E1003-T4 错误映射`
- 允许使用的依赖：`github.com/anthropics/anthropic-sdk-go`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
