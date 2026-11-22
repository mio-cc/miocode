# C.06.01 事件信封

| 项 | 内容 |
|---|---|
| 编号 | C.06.01 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 草稿 |
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
    "seq":      { "type": "integer", "minimum": 1, "description": "流内单调递增；SSE 帧的 id。E 级事件不占序号，值为 0" },
    "ts":       { "$ref": "common.schema.json#/$defs/Timestamp" },
    "kind":     { "type": "string", "description": "事件名，按流各自的枚举约束" },
    "actor":    { "$ref": "common.schema.json#/$defs/Actor" },
    "run_id":   { "$ref": "common.schema.json#/$defs/Ulid", "description": "运行流必填" },
    "graph_id": { "$ref": "common.schema.json#/$defs/Ulid", "description": "图协同流必填" },
    "session_id": { "$ref": "common.schema.json#/$defs/Ulid", "description": "会话流必填" },
    "loc":      { "$ref": "common.schema.json#/$defs/Loc", "description": "节点级事件必填，见 C.06.05" },
    "cause_seq":{ "type": "integer", "description": "引起这条事件的上一条事件的 seq（同一流内），用于因果追踪" },
    "data":     { "type": "object" }
  }
}
```
运行流的事件在 `run-event.schema.json` 里用 `kind` 做判别联合，约束 `data` 的结构；另外两条流同理。

## 3. 字段规则
- **C.06.01-R1** `seq` 由写入方在**同一事务里**分配，保证无空洞；SSE 的 `id` 等于 `seq`，断线后浏览器带 `Last-Event-ID` 续传（`B.05.02`）。
- **C.06.01-R2** `actor` 必填。调度器产生的状态事件 actor 为 `runtime/sched`；模型调用产生的事件 actor 为对应模型实例；审批结果的 actor 是审批人。
- **C.06.01-R3** `cause_seq` 用于构建因果链：例如 `approval.resolved` 的 `cause_seq` 指向 `approval.requested`，`node.state(to=running)` 的 `cause_seq` 指向那条审批结果。可选，但下面几类必须填：审批结果、重试、安全点改图、急停引起的取消。
- **C.06.01-R4** `data` 里不放大内容：超过 4KB 的内容写进工作区（`E.08`），这里只放 `*_ref`。
- **C.06.01-R5** 事件里不能出现密钥（INV-22）。模型请求和响应写进工作区前要脱敏（`S.03`）。

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
- 要建的文件：`schema/run-event.schema.json`、`schema/graph-event.schema.json`、`schema/session-event.schema.json` 的公共部分（各自引用 `common.schema.json#/$defs/Event` 的结构，再按 `kind` 约束 `data`）。
- 测试用例：`C0601-T1`、`C0601-T2`。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4 登记两种控制帧 `resync`、`shutdown` 及其常量 | `P.09` K86：`B.05.02`、`B.05.03` 用到了，但 `C.06` 没有登记（`C.06-R7`） |
