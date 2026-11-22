# B.04 API 资源

| 项 | 内容 |
|---|---|
| 编号 | B.04 |
| 类型 | 实施 |
| 上级 | B 后端服务 |
| 下级 | B.04.01 graphs 图、B.04.02 ops 操作提交、B.04.03 runs 运行、B.04.04 approvals 审批、B.04.05 mandates 授权书、B.04.06 defs 节点库、B.04.07 models 模型与提供方、B.04.08 tools 与 MCP、B.04.09 sessions 与 messages 会话、B.04.10 settings 设置、B.04.11 audit 审计、B.04.12 extensions 扩展包、B.04.13 templates 模板、B.04.14 health 与诊断 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 这一组管什么
每组 HTTP 接口一份文档：路径、方法、请求与响应结构、错误码、示例。

## 2. 下级清单
| 编号 | 资源 | 前缀 |
|---|---|---|
| B.04.01 | 图 | `/graphs` |
| B.04.02 | 操作提交 | `/graphs/{id}/ops`、撤销、分支、提议 |
| B.04.03 | 运行 | `/runs` |
| B.04.04 | 审批 | `/approvals` |
| B.04.05 | 授权书与急停 | `/mandates`、`/authz`、`/estop` |
| B.04.06 | 节点库 | `/nodedefs`、`/types`、`/recipes`、`/rolecards`、`/library` |
| B.04.07 | 模型与提供方 | `/models`、`/providers` |
| B.04.08 | 工具与 MCP | `/tools`、`/mcp-servers` |
| B.04.09 | 会话与消息 | `/sessions` |
| B.04.10 | 设置 | `/settings` |
| B.04.11 | 审计 | `/audit` |
| B.04.12 | 扩展包 | `/extensions` |
| B.04.13 | 模板 | `/templates` |
| B.04.14 | 健康与诊断 | `/health`、`/diagnostics`、`/admin` |
| （B.05.04） | 三条事件流 | 各资源下的 `/events`、`/stream` |

## 3. 共同约束
- **B.04-R1** 每个接口登记在路由表（`B.03.06`），写明请求、响应 schema 和可能的错误码。
- **B.04-R2** 写图的接口只有 `B.04.02` 一组，全部走 `op.Pipeline`（INV-08）。其他资源里的"修改图"动作（例如采纳提议、实例化模板）内部也调用 Op 流水线。
- **B.04-R3** 每个接口至少一个成功用例和一个失败用例，响应按声明的 schema 校验（`B0306-T3`）。
- **B.04-R4** 标"仅用户"的接口，`Caller.Actor.Kind` 必须是 user（`B.03.05` 第 5 步）。
