# B.06.02.03 回复流式输出

| 项 | 内容 |
|---|---|
| 编号 | B.06.02.03 |
| 类型 | 实施 |
| 上级 | B.06.02 编排者对话 Agent |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 职责
把对话 Agent 的输出流式写回会话：文字片段、卡片块、完成、失败、中止。

## 2. 不做什么
- 不实现前端的流式渲染（`W.07.04`）

## 3. 继承的上级约束
`C.06.04`、`C.10` §3。

## 4. 接口
```go
type Reply struct{ /* message_id、会话流写入器、取消函数 */ }
func (r *Reply) Delta(text string)                    // message.delta（E 级），按 50ms 合并
func (r *Reply) Block(b gen.MessageBlock) error       // message.block_added（P 级）
func (r *Reply) Complete(usage gen.Usage) error       // 完整内容落库 + message.completed
func (r *Reply) Fail(code string, msg string) error   // message.failed
```

## 5. 行为
1. 收到用户消息：创建助手消息（status=streaming，content 为空）→ `message.created`。
2. Agent 的文字输出（模型流式 Delta）→ `Reply.Delta`；工具调用期间推 `chat.status{state: tool, note: "正在读取图"}`。
3. 卡片块随时追加。
4. 结束：完整文字写入消息（超过 20000 字存工作区，`content_ref`）、用量汇总 → `message.completed`。
5. 中止（`POST …/stop`）：取消这次内部运行的 context（`E.16.06`）→ 已生成的文字保留，末尾加"（已中止）"→ `message.completed`。草稿上的改动不提交。
6. 失败：`message.failed{code, message}`，前端显示"重试"。

## 6. 不变量
- 刷新页面后，已完成的回复内容完整；正在生成的回复可以通过重新拉取恢复

## 7. 错误处理
流写入失败（订阅者断开）不影响落库。

## 8. 验收标准
1. 流式片段合并
2. 中止后草稿不提交
3. 超长回复转引用
4. 失败与重试

### 实施卡
- 要建 / 要改的文件：`internal/app/chat/reply.go`、`internal/app/chat/reply_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B060203-T1 流式`
  - `B060203-T2 中止`
  - `B060203-T3 超长`
  - `B060203-T4 失败`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
