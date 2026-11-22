# B.04.09 sessions 与 messages 会话

| 项 | 内容 |
|---|---|
| 编号 | B.04.09 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-23 |

## 1. 职责
会话和消息：会话的增删改、挂图、消息列表、发送消息（交给对话 Agent）、中止回复。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/sessions?q=&cursor=` | 列表（置顶在前，按更新时间倒序） | → `Page<Session>` |
| POST | `/sessions` | 新建 `{title?}` | → 201 `Session` |
| GET | `/sessions/{sid}` | 详情 | → `Session` |
| PATCH | `/sessions/{sid}` | 改标题、置顶、当前图、编排者模型、思考强度 `orchestrator_effort`（`C.10-R6`）、`last_location`（`C.10-R3`） | → `Session` |
| DELETE | `/sessions/{sid}` | 软删除（不删除图，`C.10-R1`） | → 204 |
| POST | `/sessions/{sid}/graphs` · DELETE `/sessions/{sid}/graphs/{gid}` | 挂上、取下图 | → `Session` |
| GET | `/sessions/{sid}/messages?cursor=&before=` | 消息（倒序分页，用于向上滚动加载） | → `Page<Message>` |
| POST | `/sessions/{sid}/messages` | 发送用户消息：`{content, selection?, refs?}`（`refs` 见 `C.10-R7`）；立即返回用户消息和"回复中"的助手消息，回复通过会话流推送 | → 202 `{user_message, assistant_message_id}` |
| POST | `/sessions/{sid}/messages/{mid}/stop` | 中止正在生成的回复 | → 204 |
| POST | `/sessions/{sid}/messages/{mid}/retry` | 重新生成这条回复 | → 202 |
| POST | `/sessions/{sid}/messages/clear` | 清空对话记录（软删除消息和会话摘要；图、运行不受影响） | → 204 |
| POST | `/sessions/{sid}/uploads` | 上传附件（multipart，单个 ≤ 20MB）到会话工作区 | → 201 `{ref, name, size}` |
| GET | `/sessions/{sid}/files?q=` | 可引用的文件：本会话上传的 + 允许目录里的（`S.06`），最多 50 条 | → `{items: [{path, name, size, source: session\|allowed}]}` |
| GET | `/sessions/{sid}/context?draft_chars=&selection=&refs=` | 估算下一次发送的上下文用量（按当前编排者模型的窗口和配方，`B.06.02.01`） | → `ContextUsage {window, used, parts[{kind, tokens}], auto_compact_at}` |
| POST | `/sessions/{sid}/compact` | 立即把较早的对话压缩成摘要（`digest`），并写一条系统消息 | → 202 |

## 5. 行为
- 发送消息：写入用户消息 → 写 `message.created` → 交给 `app/chat`（`B.06.02`）异步处理 → 返回 202。
- 同一会话同时只能有一条回复在生成：第二条消息排队（返回 202，前端显示"排队中"），或者用户先中止。
- 会话流见 `B.05.04`。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/sessions.go`、`internal/api/sessions_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0409-T1 会话增删改`
  - `B0409-T2 发送与流式回复`
  - `B0409-T3 中止`
  - `B0409-T4 同时只有一条回复`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | PATCH 可改 `orchestrator_effort` | `P.09` K74 |
| 2026-11-23 | §4 新增清空、上传、可引用文件、上下文估算、压缩五个接口；发送消息带 `refs` | 第 8 棒写 `W.07.07`；`P.09` K113 |
