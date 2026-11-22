# C.06.03 图事件目录

| 项 | 内容 |
|---|---|
| 编号 | C.06.03 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 草稿 |
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
- **C.06.03-R1** 只有 `op.applied`、`op.coalesced` 带 SSE id（图版本号）。重连后，前端比较本地版本和响应头 `X-Graph-Version`，有缺口时调 `GET /graphs/{id}/ops?since_version=` 补齐。
- **C.06.03-R2** 提议、授权的变化在重连后通过列表接口重新获取，不依赖补发。
- **C.06.03-R3** `presence` 的 `scope` 是用户当前所在的层（root 或容器节点 ID），用于嵌套导航时只显示同层的编辑者。
- **C.06.03-R4** `op.coalesced` 的 `op_id` 是被合并进去的那条原 Op（同一操作者、同一 `coalesce_key` 的第一条），`to` 是合并后这条 Op 的**完整新 `payload`**（`move_nodes` 为 `{moves}`，`set_param` 为 `{node, key, to}`）；客户端用它整体替换原 Op 的 payload 后重新应用（`W.05` §6.7，`P.09` K87）。

## 4. 验收标准
1. `graph-event.schema.json` 的枚举与本表一致。
2. 断线期间产生 5 个版本，重连后前端图与服务器一致。

### 实施卡
- 要改的文件：`schema/graph-event.schema.json`；`schema/examples/events/graph/*.json`。
- 测试用例：`C0603-T1`、`C0603-T2`（后者在 `B.05`、`W.04.05` 跑）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 新增 R4：`op.coalesced` 的 `to` 是完整新 payload | `P.09` K87：原表只写 `to`，不同 Op 的 `to` 含义不同，前端无法据此更新本地图 |
