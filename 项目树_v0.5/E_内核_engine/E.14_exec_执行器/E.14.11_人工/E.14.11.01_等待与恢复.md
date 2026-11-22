# E.14.11.01 等待与恢复

| 项 | 内容 |
|---|---|
| 编号 | E.14.11.01 |
| 类型 | 实施 |
| 上级 | E.14.11 人工 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引04 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现人工节点和工具审批的等待与恢复：等待期间进程可以重启，结果到达后继续。

## 2. 不做什么
- 不实现审批界面（`W.07.09`）

## 3. 继承的上级约束
INV-11（先落事件再处理）、`C.07` §3.1（waiting 转换）、`S.04-R13`。

## 4. 接口
```go
type AskRequest struct { Kind string; Summary string; DetailRef string; Options []string; InputSchema string; Timeout time.Duration; Risk *tools.Risk; TaintSrc []string }
type AskResponse struct { Outcome string; Scope string; Value json.RawMessage; By gen.Actor }
// RunCtx.Ask 的实现（engine/run/ask.go）
```

## 5. 行为
1. `rc.Ask(req)`：创建 `hx_approvals` 记录（pending）→ 写 `approval.requested` → 调度器把节点转为 `waiting` → 执行器 goroutine 阻塞在结果 channel 上；同时写检查点 `{approval_id}`。
2. 用户处理（`B.04.04`）：API 层**先写 `approval.resolved` 事件**，再更新记录，再通知运行（INV-11）。
3. 运行收到结果：节点 `waiting → running`，结果交给阻塞的执行器；人工节点按 outcome 设置 `active_outs`。
4. 进程重启（`E.16.04`）：重放事件后，`waiting` 的节点保持 waiting；如果事件日志里已经有对应的 `approval.resolved`（离线期间已处理），直接投递结果继续。
5. 同一运行内同类审批合并（`S.04-R10`）：同一工具、同一节点的待处理审批，界面上合并显示；后端仍是独立记录，"一次处理"会批量写多个 resolved 事件。

## 6. 不变量
- 审批结果一定先落事件再生效
- 重启不会丢失等待中的审批，也不会重复弹出已处理的审批

## 7. 错误处理
重复处理：409 `approval_closed`；运行已取消：审批标为 cancelled。

## 8. 验收标准
1. 等待中重启，批准后继续
2. 离线期间批准，重启后直接继续
3. 并发两次处理只有一次生效

### 实施卡
- 要建 / 要改的文件：`engine/run/ask.go`、`engine/exec/human/*.go`、`engine/run/ask_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E141101-T1 重启后批准`
  - `E141101-T2 离线批准`
  - `E141101-T3 并发处理`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
