# C.06.03 图事件目录

| 项 | 内容 |
|---|---|
| 编号 | C.06.03 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引14 |
| 最后修改 | 2026-11-23 |

## 1. 职责
图协同流的全部事件。

## 2. 事件
| kind | 级别 | SSE id | data |
|---|---|---|---|
| `op.applied` | P | 图版本号 | `version, op`（客户端据此增量更新本地图） |
| `op.coalesced` | P | 图版本号（不变） | `version, op_id, to` |
| `branch.updated` | P | — | `name, head, behind, ahead` |
| `proposal.created` | P | — | `proposal_id, patch_ref, summary, by` |
| `proposal.updated` | P | — | `proposal_id, status, base_version`（rebase 后或部分处理后） |
| `proposal.decided` | P | — | `proposal_id, accepted_op_ids, rejected_op_ids, status` |
| `mandate.changed` | P | — | `anchor, mandate_id, level, superseded_id?, cause: user\|rule` |
| `validate` | E | — | `version, diags` |
| `presence` | E | — | `actor, editing: [node_ids], cursor?: {x, y}, scope?` |
| `model.activity` | E | — | `actor, state: idle\|thinking\|editing\|waiting\|stopped, target?` — 驱动"模型正在编辑…"提示和 AI 光标 |

## 3. 规则
- **C.06.03-R1** 只有 `op.applied`、`op.coalesced` 带 SSE id（图版本号）。重连后，前端比较本地版本和响应头 `X-Graph-Version`，有缺口时调 `GET /graphs/{id}/ops?since_version=` 补齐。这两种事件的 `seq` 是图版本号（≥ 1）；其余事件 `seq` 写 0、SSE 帧不写 `id:`（`C.06.01-R8` 的例外，`P.09` K227）。
- **C.06.03-R2** 提议、授权的变化在重连后通过列表接口重新获取，不依赖补发。
- **C.06.03-R3** `presence` 的 `scope` 是用户当前所在的层（root 或容器节点 ID），用于嵌套导航时只显示同层的编辑者。
- **C.06.03-R4** `op.coalesced` 的 `op_id` 是被合并进去的那条原 Op（同一操作者、同一 `coalesce_key` 的第一条），`to` 是合并后这条 Op 的**完整新 `payload`**（`move_nodes` 为 `{moves}`，`set_param` 为 `{node, key, to}`）；客户端用它整体替换原 Op 的 payload 后重新应用（`W.05` §6.7，`P.09` K87）。

## 4. 验收标准
1. `graph-event.schema.json` 的枚举与本表一致。
2. 断线期间产生 5 个版本，重连后前端图与服务器一致。

### 实施卡
- 要建 / 要改的文件：`schema/graph-event.schema.json`、`schema/examples/graph_event_vectors.json`、`tools/schemacheck/graph_event_test.go`
- 向量格式：数组，每项 `{name, event, valid, error_at?}`，`error_at` 是 `valid` 为 false 时期望的报错位置；文件名以 `_vectors.json` 结尾，不登记示例清单（`C.01-R22`）。按 `graph-event.schema.json` 校验。
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0603-T1 事件名单`：`kind` 枚举恰好是 §2 的 10 个，级别与表一致
  - `C0603-T3 事件向量`：每个 kind 至少一个合法事件；反例：`op.applied` 的 `seq` 为 0、`proposal.created` 的 `seq` 不为 0、`op.applied.op` 不是合法 Op、`model.activity.state` 不在枚举、`data` 多出字段
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 断线期间产生 5 个版本、重连后前端图与服务器一致（§4 验收 2，`C0603-T2`）：`B0502-T1`（`B.05.02`）；前端部分在 `W.04.05` 的重连测试
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 新增 R4：`op.coalesced` 的 `to` 是完整新 payload | `P.09` K87：原表只写 `to`，不同 Op 的 `to` 含义不同，前端无法据此更新本地图 |
| 2026-11-23 | 第 4 片（`m0-contract-3`）开工前复查：R1 写明只有 Op 类事件的 `seq` 是图版本号，其余写 0；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K227 |
