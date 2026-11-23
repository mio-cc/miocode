# C.06.04 会话事件目录

| 项 | 内容 |
|---|---|
| 编号 | C.06.04 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引14 |
| 最后修改 | 2026-11-23 |

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
- 要建 / 要改的文件：`schema/session-event.schema.json`、`schema/examples/session_event_vectors.json`、`tools/schemacheck/session_event_test.go`
- 向量格式：数组，每项 `{name, event, valid, error_at?}`，`error_at` 是 `valid` 为 false 时期望的报错位置；文件名以 `_vectors.json` 结尾，不登记示例清单（`C.01-R22`）。按 `session-event.schema.json` 校验；`message`、`block` 引用 `session.schema.json`（`C.10`，同片先做）。
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0604-T1 事件名单`：`kind` 枚举恰好是 §2 的 9 个，级别与表一致
  - `C0604-T3 事件向量`：每个 kind 至少一个合法事件；反例：`message.created.message` 不是合法 Message、`message.delta` 的 `seq` 不为 0、`chat.status.state` 不在枚举、`data` 多出字段
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 回复过程中断网再恢复，消息内容完整（§4 验收 2，`C0604-T2`）：`B0502-T1`（`B.05.02`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 第 4 片（`m0-contract-3`）开工前复查：无内容改动；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K227 |
| 2026-11-23 | 状态改为"冻结"：第 4 片（`m0-contract-3`）squash 合并进代码仓库 `main`，提交 `08f30f9eb52fa2a1b3d494eab0381c4b72313848`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 9 条，`C.10` 一条不符合（会话挂载点没有约束 `anchor` 为 `session`）已返工并复核；按 `G.08-R3` 由验证者合并 |
