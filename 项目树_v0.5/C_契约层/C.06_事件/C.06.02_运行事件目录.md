# C.06.02 运行事件目录

| 项 | 内容 |
|---|---|
| 编号 | C.06.02 |
| 类型 | 实施 |
| 上级 | C.06 事件 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引14 |
| 最后修改 | 2026-11-23 |

## 1. 职责
运行流的全部事件。名字、级别、数据字段以本表为准；实现时生成常量（`gen.EvNodeState` 等）。

## 2. 运行级
| kind | 级别 | data | 产生方 |
|---|---|---|---|
| `run.created` | P | `snapshot_ref, graph_id, branch, graph_version, registry_hash, inputs_ref, budget` | run |
| `run.status` | P | `from, to, cause, at_safepoint?, cost?` — `to` 取值见 `C.07` §2 | run |
| `run.cancel_requested` | P | `by, reason: user\|estop\|budget\|timeout` | run（v0.5 新增：请求取消到全部节点停下之间，前端据此显示"正在取消"） |
| `run.graph_swapped` | P | `from_version, to_version, op_ids, scope_path, at_round?, source: user\|model` | run（安全点） |
| `engine.illegal_transition` | P | `from, to, cause, loc?` | 内核（状态机拒绝了一次转换，告警用，`C.07`） |

## 3. 节点级（都带 `loc`）
| kind | 级别 | data | 说明 |
|---|---|---|---|
| `node.state` | P | `from, to, attempt, cause` + 按 `to` 附加的字段（下表） | **唯一的节点状态事件** |
| `node.progress` | S | `pct?, note?, sub?` | 进度、"第 2 / 5 轮" |
| `node.chunk` | E | `port, delta` | 流式输出片段 |
| `node.input` | P | `port, value_ref` | 节点详情 |
| `node.output` | P | `port, value_ref, partial` | 节点详情、下游就绪判定 |
| `node.throttled` | S | `pool, waiting` | 在资源池排队 |
| `node.log` | P（info 及以上） | `level, msg, kv` | 监控页日志 |

`node.state` 按 `to` 附加的字段：
| to | 附加字段 |
|---|---|
| `queued` | `cause: ready\|retry\|resume\|manual_retry`；`retry` 时带 `error, idem_key, backoff_ms` |
| `running` | `inputs_ref` |
| `waiting` | `approval_id, reason` |
| `done` | `outputs_ref, active_outs?`（分支、人工被激活的出口），`cost: {tokens, cost_micros}`，`partial?` |
| `cached` | `outputs_ref, cache_key` |
| `failed` | `error: {class, code, message, retryable}`（`class` 见 `C.11` §4） |
| `cancelled` | `cause: user\|estop\|k_of_n_satisfied\|first_satisfied\|timeout\|budget` |
| `skipped` | `cause: inactive_edge\|upstream_skipped` |

## 4. 控制流
| kind | 级别 | data |
|---|---|---|
| `loop.round` | P | `round, max, exit?, carry_ref` |
| `checkpoint.saved` | P | `scope_path, round?, ref` |
| `ledger.changed` | P | `store, path, version, by` |

## 5. 模型、工具、上下文
| kind | 级别 | data |
|---|---|---|
| `llm.call` | P | `pool, provider, model, usage: {in, out, cached}, cost_micros, latency_ms, req_ref, resp_ref, strategy: native_schema\|tool_call\|text_repair` |
| `llm.fallback` | P | `from_strategy, to_strategy, reason` |
| `tool.intent` | P | `tool, risk, idem_key, req_ref` — **调用前**落库（INV-14） |
| `tool.call` | P | `tool, risk, idem_key, queued_ms, latency_ms, req_ref, result_ref, taint, status: ok\|error\|denied\|deduplicated` |
| `ctx.assembled` | P | `sections: [{name, tokens, source}], dropped: [], budget_tokens` |
| `prompt.rendered` | P | `segments: [{name, tokens, cache_break}], ref` |

`tool.intent` 是 v0.5 新增：旧文档只说"调用前先落意图事件"，没有给事件名。

## 6. 编排者
| kind | 级别 | data |
|---|---|---|
| `orch.started` | P | `orch_path, mode: design\|runtime\|post_run` |
| `orch.tool_call` | E | `tool, target_node?, ok` — 驱动画布上的 AI 光标 |
| `orch.expanded` | P | `patch_id, patch_ref, subgraph_ref, graph_version_before, graph_version_after` — **回放时据此复现，不再调用模型**（INV-13） |
| `orch.finished` | P | `result: patch\|proposal\|none, stats` |

## 7. 授权、审批、升级、预算、急停
| kind | 级别 | data |
|---|---|---|
| `approval.requested` | P | `approval_id, kind: tool\|run\|elevation\|taint\|budget\|human_node, summary, detail_ref, options` |
| `approval.resolved` | P | `approval_id, outcome: approved\|rejected\|expired\|cancelled\|<人工节点自定义出口>, scope: once\|always, note?, value_ref?` |
| `escalation.raised` | P | `escalation_id, kind, severity, question, options, merge_key` |
| `escalation.merged` | P | `escalation_id, into, count` |
| `escalation.routed` | P | `escalation_id, to_path` |
| `escalation.resolved` | P | `escalation_id, outcome` |
| `budget.charged` | P | `scope_path, tokens, cost_micros` |
| `budget.warn` | P | `scope_path, ratio: 0.5\|0.8\|1.0` |
| `budget.exceeded` | P | `scope_path` |
| `estop.triggered` | P | `scope: global\|run` |
| `estop.released` | P | `scope` — actor 必须是 user（INV-10） |
| `brief.updated` | P | `goal_id, status, conclusion, criteria_check, cost, superseded` |

改动说明：`approval.requested.kind` 里旧的 `approval` 改为更明确的 `tool`（工具调用需要审批）和 `run`（启动运行需要审批）；`approval.resolved.scope` 的 `forever` 改为 `always`（界面文案"以后都允许"）。图结构修改需要审核时走提议，不走审批（`C.08`）。

## 8. 只广播
| kind | 频率 | data |
|---|---|---|
| `edge.flow` | 每次数据通过 | `edge_id` — 画布上的光点动画 |
| `pool.usage` | 每秒 1 次 | `pools: [{name, used, cap, queued}]` |

本节的事件都是 E 级。`resync` 不是事件，是控制帧（`C.06.01` §4，`P.09` K86）；`engine.illegal_transition` 要落库，放在 §2（`P.09` K227）。

## 9. 前端去向（实现参考 `W.04.02`、`W.06.15`）
| 事件 | 去向 |
|---|---|
| `node.state`、`node.progress`、`edge.flow`、`node.throttled`、`pool.usage` | 高频：按帧合并后直接画到画布，不进 React |
| `run.*`、`approval.*`、`escalation.*`、`brief.updated`、`estop.*`、`budget.warn` | 低频：进状态 store，驱动顶部条、审批卡片、提示 |
| `node.log`、`llm.call`、`tool.*`、`ctx.assembled`、`prompt.rendered` | 写进监控页和节点详情，大内容按需加载 |

## 10. 验收标准
1. `run-event.schema.json` 的 `kind` 枚举与本文 §2–§8 完全一致（脚本比对）。
2. 每个事件至少一个示例，写成测试向量 `schema/examples/run_event_vectors.json`（见实施卡；`P.09` K227 改为向量时这里漏改，K231）。

### 实施卡
- 要建 / 要改的文件：`schema/run-event.schema.json`、`schema/examples/run_event_vectors.json`、`tools/schemacheck/run_event_test.go`
- 向量格式：数组，每项 `{name, event, valid, error_at?}`，`error_at` 是 `valid` 为 false 时期望的报错位置；文件名以 `_vectors.json` 结尾，不登记示例清单（`C.01-R22`）。`event` 是完整事件，按 `run-event.schema.json` 校验。
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0602-T1 事件名单`：`kind` 枚举恰好是 §2–§8 的 39 个，每个的级别（P / S / E）与表一致（名单和级别写在测试里）
  - `C0602-T2 事件向量`：每个 kind 至少一个合法事件；反例至少有：缺必填字段、`data` 多出字段、E 级 `seq` 不为 0、P 级 `seq` 为 0、`node.state` 的 `to` 不在 `NodeState`、`run.status` 的 `to` 不在 `RunStatus`、`*_ref` 不是 `ws://` 引用；合法的都通过，不合法的在 `error_at` 下报错
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 旧称"运行页"统一为"监控页"（右侧栏第三个标签，`U.09.07`） | `P.09` K77 |
| 2026-11-23 | 第 4 片（`m0-contract-3`）开工前复查：`engine.illegal_transition` 是 P 级，移到 §2；`resync` 是控制帧，从 §8 去掉；写明 §8 都是 E 级；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K227 |
| 2026-11-23 | §10 验收 2 的示例位置改为向量文件，与实施卡一致 | `P.09` K231 |
| 2026-11-23 | 状态改为"冻结"：第 4 片（`m0-contract-3`）squash 合并进代码仓库 `main`，提交 `08f30f9eb52fa2a1b3d494eab0381c4b72313848`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 9 条，`C.10` 一条不符合（会话挂载点没有约束 `anchor` 为 `session`）已返工并复核；按 `G.08-R3` 由验证者合并 |
