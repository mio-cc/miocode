# C.06.04 会话事件目录

| 项 | 内容 |
|---|---|
| 编号 | C.06.04 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引14 |
| 最后修改 | 2026-11-22 |

## 1. 职责
会话流的全部事件（旧文档只提到"新增 session.* 事件"但没有列出，本文首次定义）。

## 2. 事件
| kind | 级别 | data | 说明 |
|---|---|---|---|
| `session.updated` | P | `title?, pinned?, active_graph_id?, updated_at` | 会话元信息变化 |
| `session.graph_attached` | P | `graph_id, title` | 会话新挂了一张图 |
| `session.graph_detached` | P | `graph_id` | — |
| `message.created` | P | `message`（完整 `Message`，`C.10`）；助手消息此时 `status=streaming`、`content` 可以为空 | 新消息 |
| `message.delta` | E | `message_id, delta` | 助手回复的流式片段 |
| `message.block_added` | P | `message_id, block`（`MessageBlock`，`C.10`） | 回复里追加卡片（提议、审批、运行、错误） |
| `message.completed` | P | `message_id, content_ref?, usage?` | 回复结束；`content` 超过 4KB 时给 ref |
| `message.failed` | P | `message_id, error: {code, message}` | 回复失败 |
| `chat.status` | E | `state: idle\|thinking\|tool\|editing\|waiting\|stopped, note?` | 驱动对话框上的"思考中…"等状态 |

## 3. 规则
- **C.06.04-R1** 会话列表的增删（新建、删除会话）不走会话流，由前端在本地操作后刷新列表；会话流只描述**一个**会话内部的变化。
- **C.06.04-R2** `message.delta` 不落库；`message.completed` 时完整内容落库。重连后，`status=streaming` 的消息由前端重新拉取。
- **C.06.04-R3** 对话 Agent 改图时，画布变化仍然通过图协同流推送；会话流只推送文字回复和卡片。

## 4. 验收标准
1. `session-event.schema.json` 枚举与本表一致。
2. 回复过程中断网再恢复，最终显示的消息内容完整。

### 实施卡
- 要建的文件：`schema/session-event.schema.json`；`schema/examples/events/session/*.json`。
- 测试用例：`C0604-T1`、`C0604-T2`。
