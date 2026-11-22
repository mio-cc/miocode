# E.14.11.02 超时与升级

| 项 | 内容 |
|---|---|
| 编号 | E.14.11.02 |
| 类型 | 实施 |
| 上级 | E.14.11 人工 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
处理审批和人工节点的超时，以及升级（`escalation`）的路由。

## 2. 不做什么
- 不实现通知推送（界面与 `B`）

## 3. 继承的上级约束
`S.04-R12`、`C.06.02` §7（escalation 事件）、`引03` §10。

## 4. 接口
```go
func (r *Run) expireApprovals(now time.Time)                    // 由调度器定时器触发（虚拟时钟可测）
func (r *Run) routeEscalation(e Escalation) (target gen.Loc, ok bool)
```

## 5. 行为
- 超时：默认 24 小时；到期写 `approval.resolved{outcome: expired}`，人工节点按 `on_timeout` 激活出口或失败；工具审批视为驳回。
- 升级来源：Agent 的 `escalate` 工具、执行器 `rc.Escalate`、预算超出、结构性失败。
- 路由：按子图端口（role=escalation）的 `routes` 配置在本层路由到某节点；没有配置则冒泡到上一层的子图引用节点的 `escalation` 输出；冒到根图仍无人处理 → 运行失败（`C.07` §2 failed 的条件）。
- 合并：相同 `merge_key` 的升级合并，写 `escalation.merged`。

## 6. 不变量
- 所有超时都由时钟驱动（可以用虚拟时钟测试）

## 7. 错误处理
无。

## 8. 验收标准
1. 24 小时超时（虚拟时钟）
2. 升级冒泡三层到根图导致失败
3. 本层路由
4. 合并

### 实施卡
- 要建 / 要改的文件：`engine/run/expire.go`、`engine/run/escalate.go`、`engine/run/escalate_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E141102-T1 超时`
  - `E141102-T2 冒泡`
  - `E141102-T3 路由`
  - `E141102-T4 合并`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
