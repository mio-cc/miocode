# G.04.04 API 与 JSON 字段命名

| 项 | 内容 |
|---|---|
| 编号 | G.04.04 |
| 类型 | 规范 |
| 上级 | G.04 命名规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-23 |

## 1. 规则
| 对象 | 规则 | 例子 |
|---|---|---|
| URL 前缀 | `/api/v1` | — |
| 资源路径 | 小写复数名词，多个单词用连字符 | `/graphs`、`/runs/{id}/events`、`/mcp-servers` |
| 路径参数 | `{id}`；有多个时写明：`{graph_id}` | `/graphs/{id}/ops/{op_id}/revert` |
| 动作 | 不能用标准方法表达时，用 `POST /资源/{id}/动词` | `POST /runs/{id}/pause` |
| 查询参数 | snake_case | `?since_version=40&path_prefix=` |
| JSON 字段 | snake_case（`C.01-R4`） | `base_version` |
| 时间、时长、金额 | 后缀 `_at`、`_ms`、`_micros`（`C.01` §3） | `created_at`、`latency_ms` |
| 自定义请求头 / 响应头 | 请求：`Idempotency-Key`；响应：`X-Request-Id`、`X-Graph-Version`、`X-Anydoor-Version`、`X-Schema-Version`（`B.03.01` §5）、`Idempotent-Replay`（`B.03.04`）；不再新增 `X-` 头，除非登记在本表 | — |
| 分页 | `?limit=&cursor=`，响应 `{items, next_cursor}` | — |

- **G.04.04-R1** 新接口的路径在 `B.04` 对应资源文档里登记；本表只定格式。
- **G.04.04-R2** 旧文档里的 `X-Actor`、`X-Mandate` 请求头取消：v1 只有本机用户，模型的操作由后端内部发起，不经过 HTTP 请求头传递身份（`B.03`）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 自定义头补登 `X-Anydoor-Version`、`X-Schema-Version`、`Idempotent-Replay` | `P.09` K92：`B.03.01`、`B.03.04` 已在用，本表漏登 |
