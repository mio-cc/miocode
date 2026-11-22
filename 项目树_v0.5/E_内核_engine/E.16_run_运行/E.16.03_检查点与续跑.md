# E.16.03 检查点与续跑

| 项 | 内容 |
|---|---|
| 编号 | E.16.03 |
| 类型 | 实施 |
| 上级 | E.16 run 运行 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引04 |
| 最后修改 | 2026-11-22 |

## 1. 职责
规定各执行器写检查点的时机和内容，实现检查点的存取，以及从检查点续跑。

## 2. 不做什么
- 不实现崩溃检测（`E.16.04`）

## 3. 继承的上级约束
`引04` §5、`C.06.05-R5`（exec_key）。

## 4. 接口
```go
type Checkpoint struct { RunID, ExecKey, Executor string; Seq int64; StateRef string; TS time.Time }
func (rc *runCtx) Checkpoint(state any) error         // 序列化 → 工作区 → hx_checkpoints + checkpoint.saved 事件，同一事务
func (rc *runCtx) LoadCheckpoint(into any) (bool, error)
```

## 5. 行为
| 执行器 | 写检查点时机 | 内容 |
|---|---|---|
| Agent | 每轮工具循环结束 | 消息历史引用、轮次、已完成的工具幂等键 |
| 扇出 | 每份完成 | `Done map[份号]Value` |
| 循环（rounds） | 每轮结束（`keepHistory=true`） | 轮次、携带状态、无进展计数 |
| 循环（event） | 每个事件处理完 | 队列游标、长驻 Agent 记忆引用 |
| 人工 | 进入等待时 | approval_id |
| 子图引用 | 子图入口完成 | 子作用域、预算剩余 |
| 其他 | 不写（快速或幂等，直接重跑） | — |

- 每个 `(run, exec_key)` 在 `hx_checkpoints` 只保留最新；`keepHistory=true` 的额外进 `hx_checkpoint_history`，用于"从这一轮重跑"（`E.16.05`）。
- 续跑：执行器实现 `Resumable` 时，调度器调用 `Resume(rc, in, cp)`；否则重新 `Run`（有副作用的工具靠幂等键不重复，`E.11.01`）。

## 6. 不变量
- 检查点和 `checkpoint.saved` 事件同时存在或同时不存在

## 7. 错误处理
序列化失败：节点失败（internal）。

## 8. 验收标准
1. 每种执行器的检查点内容可以往返
2. 事务一致性（注入故障）

### 实施卡
- 要建 / 要改的文件：`engine/run/checkpoint.go`、`engine/run/checkpoint_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1603-T1 往返`
  - `E1603-T2 一致性`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
