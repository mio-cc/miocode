# C.07 运行状态机

| 项 | 内容 |
|---|---|
| 编号 | C.07 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引03, 引14 |
| 最后修改 | 2026-11-22 |

> 本文是运行状态和节点状态的**唯一定义**，裁决了旧文档 03 号和 14 号的不一致（`P.09` K1）。其他文档只引用，不重写。

## 1. 职责
定义运行状态机和节点状态机：有哪些状态、允许哪些转换、谁能触发。

## 2. 运行状态
```
            ┌───────────── cancel ──────────────┐
            │                                   ▼
pending ──► running ◄──► paused            cancelled
            │   │                               ▲
            │   └──── 全部完成 ──► done          │
            └──────── 未处理的失败 ──► failed     │
    pending / running / paused ── cancel / estop ┘
```
| 状态 | 含义 | 进入条件 | 允许进入的下一个状态 |
|---|---|---|---|
| `pending` | 已创建，正在冻结快照，还没开始调度 | `POST /runs` 成功 | `running`、`cancelled` |
| `running` | 调度中。某些节点在等审批时，运行整体仍是 `running` | 快照冻结完成 | `paused`、`done`、`failed`、`cancelled` |
| `paused` | 不再派发新节点；正在执行的节点在下一个安全点停下 | 用户（或有权限的模型）请求暂停 | `running`、`cancelled` |
| `done` | 根图所有出口节点都是 `done` / `skipped` / `cached` | — | 终态 |
| `failed` | 出现未被处理的失败：失败沿升级路由冒到根图仍没有处理 | — | 终态 |
| `cancelled` | 已取消：所有节点都进入了终态 | 取消或急停，且传播完成 | 终态 |

- **C.07-R1** 运行状态只有上面 6 种（旧 03 号的 `created`、`cancelling`、`succeeded` 取消：`created` 并入 `pending`，`succeeded` 改名 `done`，`cancelling` 改为事件 `run.cancel_requested`）。
- **C.07-R2** "等待审批"不是运行状态。前端根据是否存在 `pending` 的审批显示"等待审批"（`U.14`）。
- **C.07-R3** 运行状态变化只通过事件 `run.status`（`C.06.02`）。

## 3. 节点状态
| 状态 | 含义 | 终态？ |
|---|---|---|
| `idle` | 还没轮到 | 否 |
| `queued` | 输入就绪，排队等资源 | 否 |
| `running` | 执行中 | 否 |
| `waiting` | 等人工、等审批、等外部回调 | 否 |
| `done` | 完成 | 是 |
| `failed` | 失败 | 是（但用户可以手动重试） |
| `cancelled` | 被取消 | 是 |
| `skipped` | 上游没激活，不执行 | 是 |
| `cached` | 命中缓存，直接用上次结果 | 是 |

### 3.1 合法转换
| 从 \ 到 | queued | running | waiting | done | failed | cancelled | skipped | cached |
|---|---|---|---|---|---|---|---|---|
| idle | ✔ 输入就绪 | | | | | ✔ | ✔ 上游未激活 | ✔ 命中缓存 |
| queued | | ✔ 拿到资源 | | | | ✔ | | |
| running | ✔ 重试回排 | | ✔ 需审批 / 人工 | ✔ | ✔ | ✔ | | |
| waiting | | ✔ 审批通过 / 回调到达 | | | ✔ 驳回 / 超时 | ✔ | | |
| failed | ✔ 用户手动重试 | | | | | | | |

其余转换都非法。

## 4. 规则
- **C.07-R4** **节点状态只能由调度器修改。** 执行器只能通过 `RunCtx` 提出请求（返回结果、请求审批、报告失败），由调度器统一写事件（`E.15`）。
- **C.07-R5** 非法转换不崩溃：拒绝这次转换，写一条 `engine.illegal_transition` 事件并告警。
- **C.07-R6** 节点状态按"一次节点执行"的唯一键（`C.06.05-R5`）分别记录。同一个节点在循环第 1 轮和第 2 轮是两次执行，各有各的状态。
- **C.07-R7** 运行进入终态时，所有非终态节点必须先进入终态：`done` 不可能出现（有未完成节点时不会 done）；`failed` / `cancelled` 时，剩下的节点转为 `cancelled`。
- **C.07-R8** 状态可以完全由事件日志重放得到（INV-11）：从空状态开始，依次应用 `run.status` 和 `node.state` 事件，结果与运行中内存里的状态一致。

## 5. 状态的界面名
| 状态 | 界面名 |
|---|---|
| `pending` | 准备中 |
| `running` | 运行中 |
| `paused` | 已暂停 |
| `done` | 已完成 |
| `failed` | 失败 |
| `cancelled` | 已取消 |
| 节点 `idle` | 待运行 |
| 节点 `queued` | 排队中 |
| 节点 `waiting` | 等待中（审批时显示"等待审批"） |
| 节点 `skipped` | 已跳过 |
| 节点 `cached` | 用缓存 |

## 6. 枚举与状态机表
`common.schema.json`：
```json
"RunStatus": { "enum": ["pending", "running", "paused", "done", "failed", "cancelled"] },
"NodeState": { "enum": ["idle", "queued", "running", "waiting", "done", "failed", "cancelled", "skipped", "cached"] }
```
`schema/builtin/state_machine.yaml` 是 §2、§3.1 的机器可读版，`C.14` 由它生成 Go 和 TS 的转换检查函数：
```yaml
run:
  states: [pending, running, paused, done, failed, cancelled]
  terminal: [done, failed, cancelled]
  transitions:          # 从 → 允许进入的状态；没写的状态没有出边
    pending: [running, cancelled]
    running: [paused, done, failed, cancelled]
    paused:  [running, cancelled]
node:
  states: [idle, queued, running, waiting, done, failed, cancelled, skipped, cached]
  terminal: [done, failed, cancelled, skipped, cached]
  transitions:
    idle:    [queued, cancelled, skipped, cached]
    queued:  [running, cancelled]
    running: [queued, waiting, done, failed, cancelled]
    waiting: [running, failed, cancelled]
    failed:  [queued]   # 用户手动重试
```
- **C.07-R9** `states` 的顺序与枚举相同；前端、后端都不手写这张表。

## 7. 验收标准
1. 状态机转换表做成数据 `schema/builtin/state_machine.yaml`，Go 和 TS 都从它生成转换检查函数；对 9×9 的每一格都有测试。
2. 重放测试：任意一次运行的事件日志重放后，节点状态与运行结束时内存里的状态完全一致。

### 实施卡
- 要建 / 要改的文件：`schema/common.schema.json`、`schema/builtin/state_machine.yaml`、`tools/schemacheck/state_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C07-T1 枚举`：`RunStatus`、`NodeState` 的值和顺序与 §2、§3 一致
  - `C07-T2 状态机表`：`state_machine.yaml` 的 `states` 与枚举相同；`transitions` 与 §2、§3.1 逐格一致（测试里照本文写一份 6×6、9×9 的期望表，每一格都比）；终态除 `failed → queued` 外没有出边
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 生成的转换检查函数逐格测试（§7 验收 1）：`C.14` 实施时加
  - 重放一致（§7 验收 2）：`E0901-T3`（`E.09.01`）、`Q.09`
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 新增 §6：`RunStatus`、`NodeState` 的 JSON 与 `state_machine.yaml` 的格式；实施卡改为机器可读写法，验收 1、2 的代码测试归 `C.14`、`E.09.01` | `P.09` K201、K204 |
