# C.06.01 事件信封

| 项 | 内容 |
|---|---|
| 编号 | C.06.01 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引14 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义所有事件共用的外层结构。

## 2. 定义
```json
"Event": {
  "type": "object",
  "required": ["seq", "ts", "kind", "actor", "data"],
  "additionalProperties": false,
  "properties": {
    "seq":      { "type": "integer", "minimum": 0, "description": "流内单调递增；SSE 帧的 id。P、S 级从 1 开始；E 级事件不占序号，值为 0（R8）" },
    "ts":       { "$ref": "common.schema.json#/$defs/Timestamp" },
    "kind":     { "type": "string", "description": "事件名，按流各自的枚举约束" },
    "actor":    { "$ref": "common.schema.json#/$defs/Actor" },
    "run_id":   { "$ref": "common.schema.json#/$defs/Ulid", "description": "运行流必填" },
    "graph_id": { "$ref": "common.schema.json#/$defs/Ulid", "description": "图协同流必填" },
    "session_id": { "$ref": "common.schema.json#/$defs/Ulid", "description": "会话流必填" },
    "loc":      { "$ref": "common.schema.json#/$defs/Loc", "description": "节点级事件必填，见 C.06.05" },
    "cause_seq":{ "type": "integer", "description": "引起这条事件的上一条事件的 seq（同一流内），用于因果追踪" },
    "data":     { "type": "object", "x-open": true, "description": "按 kind 判别（R6）" }
  }
}
```
`Event` 放在 `event.schema.json#/$defs/Event`；各流怎么按 `kind` 约束 `data` 和 `seq` 见 R6–R8。

## 3. 字段规则
- **C.06.01-R1** `seq` 由写入方在**同一事务里**分配，保证无空洞；SSE 的 `id` 等于 `seq`，断线后浏览器带 `Last-Event-ID` 续传（`B.05.02`）。
- **C.06.01-R2** `actor` 必填。调度器产生的状态事件 actor 为 `runtime/sched`；模型调用产生的事件 actor 为对应模型实例；审批结果的 actor 是审批人。
- **C.06.01-R3** `cause_seq` 用于构建因果链：例如 `approval.resolved` 的 `cause_seq` 指向 `approval.requested`，`node.state(to=running)` 的 `cause_seq` 指向那条审批结果。可选，但下面几类必须填：审批结果、重试、安全点改图、急停引起的取消。
- **C.06.01-R4** `data` 里不放大内容：超过 4KB 的内容写进工作区（`E.08`），这里只放 `*_ref`。
- **C.06.01-R5** 事件里不能出现密钥（INV-22）。模型请求和响应写进工作区前要脱敏（`S.03`）。
- **C.06.01-R6** 三条流各一个 schema（`run-event`、`graph-event`、`session-event`）：根是 `allOf: [event.schema.json#/$defs/Event, …]`，`kind` 为本流的枚举，每个 kind 一条 `if {kind: const} then {data: $ref}`（同 `C.05.01` 的写法）。`data` 的定义名为 `Data` 加事件名的驼峰写法（`node.state` → `DataNodeState`），都是封闭对象（`P.09` K227）。各流的根另把本流必填的字段写进 `required`：运行流 `run_id`、图协同流 `graph_id`、会话流 `session_id`（§2）；节点级事件（`C.06.02` §3）的分支里要求 `loc`（`P.09` K231）。
- **C.06.01-R7** `data` 的字段照各目录的表：都写进 `properties`，不带 `?` 的必填（`node.state` 按 `to` 附加的字段都可选）。类型按名字和表里的写法定：`*_ref` 为 `WsRef`；`*_id` 为 `Ulid`、`*_ids` 为 `Ulid` 数组；`*_ms`、`*_micros`、`tokens`、`*_tokens`、`version`、`round`、`max`、`attempt`、`count`、`head`、`behind`、`ahead`、`waiting` 为 ≥ 0 的整数；`ratio` 为 0–1 的数（`C.01-R11`；`budget.warn` 再加 `enum`）；`pct` 为 0–100 的数；`*_at` 为 `Timestamp`；表里写成 `a\|b\|c` 的为这些值的枚举；`run.status` 的 `from`、`to` 为 `RunStatus`，`node.state` 的为 `NodeState`；可选的布尔字段写 `default: false`（`C.01-R12`）；写明类型的（`op`、`message`、`block`、`loc`、`error`）引用对应定义；补充（`P.09` K231）：名字以 `version` 结尾或以 `version_` 开头、含 `_version_` 的（`graph_version`、`from_version`、`base_version`、`graph_version_before` 等）和 `at_round` 也是 ≥ 0 的整数；`ref` 为 `WsRef`；`actor` 引用 `Actor`；`presence.scope` 为 `^(root|<ULID>)$`（`C.06.03-R3`）；`estop.released.scope` 同 `estop.triggered`；布尔字段是 `partial`、`at_safepoint`、`exit`、`taint`、`ok`、`superseded`、`retryable`、`pinned`；`node.state` 的 `error` 是 `run-event.schema.json#/$defs/NodeError`（`{class: FailureClass, code, message, retryable}`，都必填），`message.failed` 的 `error` 引用 `Message.error`；`node.state` 的 `cause` 在 `to` 为 `queued`、`cancelled`、`skipped` 时是 `C.06.02` §3 表里的枚举，其余不限；`approval.resolved.outcome` 含人工节点自定义出口，不写枚举。其余（如 `budget`、`stats`、`options`、`kv`、`usage`、`counts`、`delta`、`to`）写 `{}`，不再细分。
- **C.06.01-R8** `seq`：P、S 级事件 ≥ 1，E 级事件为 0（不占序号，SSE 帧不写 `id:`）；各流的 schema 在 kind 的分支里一并约束。图协同流的例外见 `C.06.03-R1`。schema 只表达"占不占序号"，P 和 S 的区别（S 级节流后落库）由 `E.07` 实现；各流测试的"级别与表一致"按 `seq` 的约束比对（`P.09` K231）。

## 4. SSE 帧格式
```
id: 118
event: node.progress
data: {"seq":118,"ts":"2026-11-22T10:02:03.120Z","kind":"node.progress","actor":{"kind":"runtime","id":"sched"},"run_id":"01JR…","loc":{"node_id":"01JX…","path":"根图/闭环迭代#r2/执行池/执行者#3","iter":{"round":2,"fan":3}},"data":{"pct":62}}

```
- E 级事件不写 `id:` 行。
- 服务器每 15 秒发一次注释帧 `: ping`。
- **控制帧**（`P.09` K86）：除事件外，流里只有两种控制帧，它们不是事件、没有信封、不落库：`event: resync`（`data: {"snapshot_url": "…"}`，落后太多时让前端改拉快照，`B.05.02` 第 3 步）和 `event: shutdown`（服务关闭前发出，`B.05.03` §4）。生成器为它们输出常量 `SseControl.Resync`、`SseControl.Shutdown`（Go：`SseResync`、`SseShutdown`），代码里不手写这两个名字（`G.02.05-R3`）。

## 5. 验收标准
1. 运行流里连续 10000 条 P 级事件，`seq` 从 1 到 10000 无空洞。
2. 事件里出现形如 `sk-` 开头的字符串时，测试失败（脱敏测试，`Q.04`）。

### 实施卡
- 要建 / 要改的文件：`schema/event.schema.json`、`tools/schemacheck/event_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0601-T3 事件信封`：正例：P 级（`seq` 1）、E 级（`seq` 0）、带 `loc` 和 `cause_seq`；反例：缺 `actor`、`seq` 为 -1、`data` 不是对象、多出顶层字段、`ts` 不以 `Z` 结尾
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 事件 seq 无空洞（§5 验收 1，`C0601-T1`）：`E0701-T3`（`E.07.01`）
  - 事件里没有密钥（§5 验收 2，`C0601-T2`）：`Q.04` 的脱敏扫描（复查 `Q.04` 时写明在哪个叶子跑）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4 登记两种控制帧 `resync`、`shutdown` 及其常量 | `P.09` K86：`B.05.02`、`B.05.03` 用到了，但 `C.06` 没有登记（`C.06-R7`） |
| 2026-11-23 | 第 4 片（`m0-contract-3`）开工前复查：`seq` 下限改为 0（E 级事件写 0，R8）；`Event` 放在 `event.schema.json`；新增 R6–R7：各流按 kind 判别 `data`、字段类型怎么定；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K227 |
| 2026-11-23 | R6 补各流必填字段；R7 补类型规则；R8 写明 schema 里级别只体现为 `seq` 约束 | `P.09` K231 |
| 2026-11-23 | 状态改为"冻结"：第 4 片（`m0-contract-3`）squash 合并进代码仓库 `main`，提交 `08f30f9eb52fa2a1b3d494eab0381c4b72313848`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 9 条，`C.10` 一条不符合（会话挂载点没有约束 `anchor` 为 `session`）已返工并复核；按 `G.08-R3` 由验证者合并 |
