# E.09.04 指标

| 项 | 内容 |
|---|---|
| 编号 | E.09.04 |
| 类型 | 实施 |
| 上级 | E.09 obs 可观测 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引11 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义并暴露 Prometheus 指标（前缀统一 `hx_`，`P.09` K31）。

## 2. 不做什么
- 不暴露 HTTP 端点（`/metrics` 由 `B.04` 挂载）

## 3. 继承的上级约束
`G.04.05`（指标命名）、`E.09-R2`。

## 4. 接口
```go
type Meter interface { /* 下表每个指标一个方法，或暴露 prometheus.Registerer */ }
func NewPrometheus(reg prometheus.Registerer) Meter
var NopMeter Meter
```

## 5. 行为
| 指标 | 类型 | 标签 |
|---|---|---|
| `hx_runs_total` | counter | status |
| `hx_runs_active` | gauge | — |
| `hx_node_exec_ms` | histogram | type, status |
| `hx_sched_ready_queue` | gauge | — |
| `hx_pool_inflight` | gauge | pool |
| `hx_pool_wait_ms` | histogram | pool |
| `hx_llm_requests_total` | counter | provider, model, status |
| `hx_llm_latency_ms` | histogram | provider, model |
| `hx_llm_tokens_total` | counter | provider, model, dir（in / out / cached / reasoning） |
| `hx_llm_repairs_total` | counter | model, strategy |
| `hx_cost_micros_total` | counter | model |
| `hx_tool_calls_total` | counter | tool, risk, status |
| `hx_authz_decisions_total` | counter | action, effect |
| `hx_approvals_pending` | gauge | kind |
| `hx_estop_active` | gauge | scope |
| `hx_ops_total` | counter | kind, actor_kind |
| `hx_op_conflicts_total` | counter | — |
| `hx_sse_clients` | gauge | stream |
| `hx_events_written_total` | counter | kind |
| `hx_store_tx_ms` | histogram | op |

- **不允许**用 run_id、path、node_id、graph_id、session_id 作为标签（基数失控），这些放在 trace 和日志里。

## 6. 不变量
- 标签集合有限且可枚举

## 7. 错误处理
无。

## 8. 验收标准
1. 跑一次模板后 `/metrics` 输出包含上表全部指标
2. 标签里没有 ID 类值（脚本检查）

### 实施卡
- 要建 / 要改的文件：`engine/obs/metrics.go`、`engine/obs/metrics_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0904-T1 指标齐全`
  - `E0904-T2 标签基数检查`
- 允许使用的依赖：`prometheus/client_golang`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
