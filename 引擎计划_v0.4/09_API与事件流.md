# 09 API 与事件流

> 基础路径 `/api/v1`。请求和响应都是 JSON（UTF-8），时间格式统一为 RFC3339 UTC。
> 后端 → 前端的推送只走 **SSE**（理由见 `_关键决定.md`）。

---

## 1. 通用约定

| 项 | 规则 |
|---|---|
| 鉴权 | **沿用宿主的鉴权**（cookie 或 Bearer），由 `host.Authenticator` 解析出主体；只有宿主没有鉴权时（本机开发）才退回到本地 token：harness 首次启动时生成，写入 `DataDir/token`；Next.js 通过环境变量 `HARNESS_TOKEN` 读取后由 BFF 透传。浏览器直连时，用 `GET /auth/session` 换一个 HttpOnly cookie |
| 幂等 | 所有 POST 都可以带 `Idempotency-Key: <ulid>`。服务器保留 24h，同一 key 重复请求时返回第一次的响应，并加 `Idempotent-Replay: true` 头 |
| 分页 | 游标分页：`?limit=50&cursor=<opaque>`，响应 `{items:[…], next_cursor:"…"}` |
| 版本 | 写图类接口必须带 `base_version`；响应头 `X-Graph-Version` 返回最新版本 |
| 操作者 | 模型发起的请求带 `X-Actor: model:<instance_id>` 和 `X-Mandate: <id>`；服务器会核验该模型实例确实属于当前会话 |
| 字段命名 | snake_case |

### 错误格式

```json
{
  "error": {
    "code": "graph_conflict",
    "message": "图已被修改，你的版本落后 2 个",
    "details": { "head": 42, "conflicts": [ { "op": "01J…", "reason": "同一参数被修改" } ] },
    "request_id": "01JD…"
  }
}
```

| HTTP | code | 场景 |
|---|---|---|
| 400 | `bad_request` | 结构校验失败 |
| 401 | `unauthorized` | token 无效 |
| 403 | `forbidden` | 授权拒绝（附 `details.decision`） |
| 404 | `not_found` | — |
| 409 | `graph_conflict` | 版本冲突，附 `missed_ops` |
| 409 | `idempotency_mismatch` | 同一个 key 对应了不同的请求体 |
| 422 | `invalid_graph` | 图检查失败，附 `diags[]` |
| 423 | `estopped` | 急停中，拒绝模型操作或启动运行 |
| 429 | `rate_limited` | 附 `Retry-After` |
| 202 | —（非错误） | 已转为提议或审批，返回 `{proposal_id}` / `{approval_id}` |

## 2. REST 接口清单

### 2.1 图 graphs

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/graphs?limit&cursor&q` | 列表 |
| POST | `/graphs` | 新建 `{title, template?}` |
| GET | `/graphs/{id}?branch=main&version=` | 读取图文档（默认读 head） |
| PATCH | `/graphs/{id}` | 只改元信息 `{title}` |
| DELETE | `/graphs/{id}` | 软删 |
| GET | `/graphs/{id}/validate?branch=` | 返回 `diags[]` |
| GET | `/graphs/{id}/export?format=json\|yaml` | 导出 |
| POST | `/graphs/import` | 导入 |
| GET | `/graphs/{id}/versions?branch&cursor` | 版本列表 |
| GET | `/graphs/{id}/diff?from=40&to=42&branch=` | 结构化 diff |

```json
// GET /graphs/01JD…?branch=main
{
  "graph": { "id": "01JD…", "schema_version": "1.0", "version": 42, "branch": "main",
             "title": "竞品定价调研", "root": { "nodes": [ … ], "edges": [ … ] }, "mandates": [ … ] },
  "registry_hash": "sha256:9f2…",
  "diags": []
}
```

### 2.2 操作 ops

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/graphs/{id}/ops` | 提交单条或一组 Op |
| GET | `/graphs/{id}/ops?branch&since_version&actor&cursor` | 操作历史 |
| POST | `/graphs/{id}/undo` | `{branch}`，撤销当前操作者最近的一组 |
| POST | `/graphs/{id}/redo` | `{branch}` |
| POST | `/graphs/{id}/ops/{op_id}/revert` | 撤回指定 Op（可撤回他人的） |
| POST | `/graphs/{id}/revert` | `{branch, version}` 回到指定版本 |

```json
// POST /graphs/01JD…/ops
// Idempotency-Key: 01JE…
{
  "branch": "main",
  "base_version": 42,
  "group_id": "01JE…",
  "ops": [
    { "kind": "add_node",
      "payload": { "scope": "root/01JLOOP…", "node": { "id": "01JH…", "type": "人工", "label": "终审", "pos": { "x": 860, "y": 320 }, "params": { "mode": "approve" } } } },
    { "kind": "connect",
      "payload": { "edge": { "id": "01JE2…", "from": { "node": "01JV…", "port": "result" }, "to": { "node": "01JH…", "port": "request" } } } }
  ]
}
// 200
{ "version": 44, "applied": ["01JOP1…", "01JOP2…"], "rebased": false, "diags": [] }
// 202（1 档模型）
{ "proposal_id": "01JP…", "status": "pending" }
```

### 2.3 分支与提议

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/graphs/{id}/branches` | 列表（含落后/领先计数） |
| POST | `/graphs/{id}/branches` | `{name, from:"main", at_version?}` |
| DELETE | `/graphs/{id}/branches/{name}` | 软删 |
| POST | `/graphs/{id}/branches/{name}/rebase` | rebase 到 main.head |
| POST | `/graphs/{id}/branches/{name}/merge/preview` | 返回 `{auto:[…], conflicts:[…], diags:[…]}` |
| POST | `/graphs/{id}/branches/{name}/merge` | `{into:"main", resolutions:[…]}` |
| GET | `/graphs/{id}/proposals?status=pending` | 待审提议 |
| POST | `/proposals/{pid}/decide` | `{accept:["op_id"…], reject:[…]}`，可以逐条处理 |

```json
// merge/preview 响应
{
  "base": 30, "ours": 44, "theirs": 51,
  "auto": [ { "unit": "NodeAdded", "node": "01JX…" } ],
  "conflicts": [
    { "id": "c1", "object": { "node": "01JEXEC…", "param": "concurrency" },
      "ours": 3, "theirs": 5, "base": 3 }
  ],
  "diags": []
}
```

### 2.4 运行 runs

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/runs` | 启动运行：`{graph_id, branch, version?, inputs?, budget?, replay_of?}` |
| GET | `/runs?graph_id&status&cursor` | 列表 |
| GET | `/runs/{rid}` | 概览：状态、用时、成本、当前路径 |
| POST | `/runs/{rid}/pause` | 在安全点暂停 |
| POST | `/runs/{rid}/resume` | 继续 |
| POST | `/runs/{rid}/cancel` | 取消，向下传播 |
| POST | `/runs/{rid}/estop` | 本次运行急停 |
| GET | `/runs/{rid}/nodes?path_prefix` | 节点状态投影（树） |
| GET | `/runs/{rid}/nodes/{path}` | 节点详情：输入信封、输出信封、上下文段、工具调用、成本 |
| GET | `/runs/{rid}/timeline?from&to` | 时间线条段 |
| GET | `/runs/{rid}/at?ts=` | 时间旅行：返回该时刻的全部节点状态 |
| POST | `/runs/{rid}/nodes/{path}/rerun` | 从此检查点重跑 `{mode:"from_checkpoint"\|"replay_single"}` |
| GET | `/runs/{rid}/briefs` | 给上层的简报（按 goal_id 只保留最新） |
| GET | `/runs/{rid}/escalations?status` | 升级队列 |
| GET | `/blobs/{sha}` | 按指针取原文（工作区），带 Range |

```json
// POST /runs
{ "graph_id": "01JD…", "branch": "main", "budget": { "tokens": 500000, "seconds": 3600 } }
// 201
{ "run_id": "01JR…", "graph_version": 44, "status": "queued",
  "events_url": "/api/harness/v1/runs/01JR…/events" }
```

### 2.5 审批 approvals

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/approvals?status=pending&run_id` | 待办 |
| GET | `/approvals/{aid}` | 详情（视图配方渲染后的摘要和指针） |
| POST | `/approvals/{aid}/resolve` | `{outcome:"approved"\|"rejected"\|<自定义出口>, scope:"once"\|"forever", note?, value?}` |

### 2.6 授权 mandates

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/mandates?target` | 列表 |
| POST | `/mandates` | 新建授权书（按 mandate.schema.json） |
| GET | `/mandates/{mid}` | — |
| PUT | `/mandates/{mid}` | 修改（模型调用时按 07 的规则限制） |
| POST | `/mandates/{mid}/revoke` | 收回，在安全点生效 |
| GET | `/authz/effective?target=node:01J…&actor=model:…` | 解析后的有效档位与矩阵（给前端授权面板） |
| POST | `/authz/elevations` | 模型申请提权 `{from, to, reason, target}` → 生成审批 |
| GET/PUT | `/authz/rules` | 自动升降规则 |
| POST | `/estop` / `DELETE /estop` | 全局急停 / 解除（解除只允许 `actor.kind=user`） |

### 2.7 定义与资源

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/nodedefs` | 全部节点定义（含扩展） |
| GET | `/nodedefs/{ref}` | — |
| GET | `/types?layer=builtin\|system\|business` | 类型库 |
| GET | `/types/{ref}` | 字段、继承链、版本历史 |
| POST | `/types/compat` | `{src, dst}` → `{ok, expand, migrate, rule, reason}` |
| GET | `/packages` / POST `/packages/install` / DELETE `/packages/{name}` | 扩展包 |
| GET | `/models` | 可用模型（不含密钥）：`{ref, provider, window, cost_in, cost_out, caps:{json_schema, tools, stream}}` |
| GET | `/tools` | 已注册工具：`{name, risk, schema, source:"builtin"\|"mcp:<server>"}` |
| GET/POST/DELETE | `/mcp/servers` | MCP 服务器配置与健康状态 |
| GET | `/rolecards` · `/recipes` · `/policies` | 角色卡、配方、策略库（CRUD 同理） |

### 2.8 审计 audit

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/audit?actor&target&kind&from&to&cursor` | `{ts, actor, mandate_id, action, target, decision, reason, op_id?, snapshot_version?}` |

## 3. SSE 事件流

### 3.1 两条流

| 流 | 路径 | 用途 |
|---|---|---|
| 运行事件 | `GET /runs/{rid}/events?since=<seq>` | 节点状态、进度、流式输出、审批、升级、成本 |
| 图协同 | `GET /graphs/{id}/stream?branch=main` | Op 已应用 / 合并、提议、presence、校验结果 |

响应头：`Content-Type: text/event-stream`、`Cache-Control: no-cache`、`X-Accel-Buffering: no`。服务器每 15s 发一次注释心跳 `: ping`。

### 3.2 帧格式

```
id: 118
event: node.progress
data: {"seq":118,"run_id":"01JR…","ts":"2026-11-21T10:02:03.120Z","path":"根图/闭环迭代#r2/执行池/执行者#3","data":{"pct":62,"note":"生成中"}}

```

`id` 等于 `seq`，在单个 run 内单调递增。图协同流的 `id` 等于图版本号，presence 帧不带 id。

### 3.3 运行事件类型

> 事件名以 [14_事件目录.md](14_事件目录.md) 为准。

| event | 是否落库 | data |
|---|---|---|
| `run.created` | ✔ | `{snapshot_ref, graph_version, registry_hash, budget}` |
| `run.status` | ✔ | `{from, to, cause, by?, at_safepoint?, cost?}`；to ∈ pending/running/paused/done/failed/cancelled |
| `run.graph_swapped` | ✔ | `{from_version, to_version, op_ids, at_round?, scope_path, source}` |
| `node.state` | ✔ | `{from, to, attempt, cause, …}`；按 to 附加 inputs_ref / approval_id / outputs_ref / active_outs / error 等，见 14 号 §3.2 |
| `node.progress` | 节流后落库（每节点 ≤ 4 次/秒） | `{pct?, note?, sub?:"第 2/5 轮"}` |
| `node.chunk` | ✘（只在内存广播） | `{port, delta}` |
| `node.input` / `node.output` | ✔ | `{port, value_ref, partial?}` |
| `node.throttled` | 采样 | `{pool, waiting}` |
| `node.log` | ✔（≥ info） | `{level, msg, kv}` |
| `loop.round` | ✔ | `{round, max, exit?, carry_ref}` |
| `checkpoint.saved` | ✔ | `{scope_path, round?, ref}` |
| `llm.call` | ✔ | `{pool, provider, model, usage, cost_micros, latency_ms, req_ref, resp_ref}` |
| `tool.call` | ✔ | `{tool, risk, idem_key, queued_ms, req_ref, result_ref, taint, status}` |
| `ctx.assembled` / `prompt.rendered` | ✔ | 见 06 号 |
| `orch.started` / `orch.expanded` / `orch.finished` | ✔ | 见 10 号；`orch.tool_call` 只广播 |
| `approval.requested` / `approval.resolved` | ✔ | `{approval_id, kind, outcome?, scope?, by?}` |
| `escalation.raised` / `.merged` / `.routed` / `.resolved` | ✔ | `{escalation_id, kind, severity, question, options, merge_key}` |
| `budget.charged` / `budget.warn` / `budget.exceeded` | ✔ | `{scope_path, tokens?, cost_micros?, ratio?}` |
| `estop.triggered` / `estop.released` | ✔ | `{scope:"global"\|"run", by}` |
| `brief.updated` | ✔ | `{goal_id, status, conclusion, criteria_check, cost, superseded}` |
| `edge.flow` | ✘ | `{edge_id}`（给画布的光点动画） |
| `pool.usage` | ✘（每秒 1 次） | `{pools:[{name, used, cap, queued}]}` |

### 3.4 图协同事件类型

| event | data |
|---|---|
| `op.applied` | `{version, op}`（客户端用它增量更新本地图） |
| `op.coalesced` | `{version, op_id, to}` |
| `branch.updated` | `{name, head, behind, ahead}` |
| `proposal.created` / `proposal.decided` | `{proposal_id, ops?, accepted_op_ids?, status}` |
| `mandate.changed` | `{target, mandate_id, level, superseded_id?, cause}` |
| `presence` | `{actor, editing:[node_ids], cursor?:{x,y}}` |
| `validate` | `{version, diags}` |
| `model.activity` | `{actor, state:"idle"\|"thinking"\|"editing"\|"waiting"\|"stopped", target?}`（驱动"模型正在编辑…"胶囊和 AI 光标） |

### 3.5 断线重连

1. 浏览器原生 `EventSource` 断开后会自动重连，并带上 `Last-Event-ID`；服务器从 `seq > Last-Event-ID` 开始，先补发库里的事件，再接实时流。
2. 不落库的事件（`node.chunk`、`edge.flow`、`pool.usage`、`orch.tool_call`）不补发；前端重连后调用 `GET /runs/{rid}/nodes` 拿一次完整快照对齐。
3. 落后太多（> 5000 条）时，服务器发 `event: resync`，前端改为拉快照，再从 `snapshot.seq` 继续订阅。
4. 图协同流重连后，比较 `X-Graph-Version`：有缺口就拉 `GET /graphs/{id}/ops?since_version=` 补齐。

服务端实现（`internal/sse`）：每个 run 一个 `hub`，订阅者使用有界 channel（容量 1024）；某个订阅者处理太慢时直接断开它，让它自己重连补发，不能拖慢其他订阅者。

## 4. 前端协议客户端（packages/protocol）

```ts
import { HarnessClient, isConflict } from '@harness/protocol';

const api = new HarnessClient({ baseUrl: '/api/v1', token: process.env.NEXT_PUBLIC_HARNESS_TOKEN });

// 提交 Op（自动带 Idempotency-Key；409 时把 missed_ops 交给调用方）
try {
  const r = await api.ops.submit(graphId, { branch: 'main', base_version: v, ops });
  graphStore.getState().ack(r.version, r.applied);
} catch (e) {
  if (isConflict(e)) graphStore.getState().rebaseLocal(e.details.missed_ops, e.details.head);
  else throw e;
}

// 启动运行并订阅
const run = await api.runs.start({ graph_id: graphId, branch: 'main' });
const sub = api.runs.subscribe(run.run_id, { since: 0 }, {
  onEvent: (ev) => runBridge.push(ev),     // 交给节流桥，不直接 setState
  onResync: async () => runBridge.reset(await api.runs.nodes(run.run_id)),
});
// sub.close() 在组件卸载时调用
```

`subscribe` 封装了 `EventSource`、`Last-Event-ID`、`resync` 和指数退避（最大 10s）。生成的类型 `RunEvent` 是判别联合，`switch (ev.event)` 时各分支自动收窄类型。

## 5. Next.js 中的消费方式：高频事件不进 React

```ts
// features/canvas/lib/runBridge.ts —— 把 SSE 事件合并到每帧一次，直接写画布
type Pending = Map<string /*node_id*/, NodeVisual>;

export function createRunBridge(canvas: CanvasApi, runStore: RunStoreApi) {
  let pending: Pending = new Map();
  let flows: string[] = [];
  let scheduled = false;

  function flush() {
    scheduled = false;
    for (const [id, v] of pending) canvas.setNodeVisual(id, v);   // 只改 class / 文本 / scaleX
    for (const e of flows) canvas.pulseEdge(e);
    pending = new Map(); flows = [];
  }

  return {
    push(ev: RunEvent) {
      switch (ev.event) {
        case 'node.state':    merge(nodeOf(ev.path), { status: ev.data.to, pct: isTerminal(ev.data.to) ? 100 : undefined,
                                                   activeOuts: ev.data.active_outs }); break;
        case 'node.progress': merge(nodeOf(ev.path), { pct: ev.data.pct, note: ev.data.note }); break;
        case 'edge.flow':     flows.push(ev.data.edge_id); break;
        case 'node.chunk':    canvas.appendStream(nodeOf(ev.path), ev.data.delta); break; // 也放到 rAF 里
        default:              runStore.getState().ingest(ev);   // 低频事件：审批、升级、简报、成本 → React 面板
      }
      if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
    },
    reset(snapshot: NodesSnapshot) { pending = new Map(snapshot.map(n => [n.id, toVisual(n)])); flush(); },
  };

  function merge(id: string, patch: Partial<NodeVisual>) {
    pending.set(id, { ...(pending.get(id) ?? {}), ...patch } as NodeVisual);
  }
}
```

规则：
- `node.state`、`node.progress`、`node.chunk`、`node.throttled`、`edge.flow`、`pool.usage` → **只走 runBridge**，按帧合并，直接调用 canvas 的命令式 API。
- 审批、升级、简报、`llm.call` 成本汇总 → 进入 `runStore`（zustand）。由 React 面板订阅，并对 `llm.call` 再节流到每 500ms 一次。
- `CanvasHost` 用 `useEffect` 创建 bridge 和订阅，卸载时关闭；依赖数组只放 `runId`，不要放 store。
- 不要在 React 组件里 `useStore(s => s.nodeStatus)` 订阅全部节点状态，这会让每帧都触发重渲染。

## 附：其他文档中定义的接口

为方便查找，这里汇总散落在其他文档里的接口。字段细节以所在文档为准；新增接口时，要同时补进本表。

| 方法 | 路径 | 说明 | 定义在 |
|---|---|---|---|
| POST | `/graphs/{id}/undo`、`/graphs/{id}/redo` | 按操作者撤销 / 重做 | 08 |
| GET | `/graphs/{id}/export` | 导出图文档（含依赖的 NodeDef 和类型） | 02 |
| POST | `/graphs/{id}/orchestrate` | 设计时调用编排者，返回提议或补丁 | 10 |
| POST | `/runs/{id}/replay` | 用录制值回放整次运行，不调用模型 | 10、04 |
| POST | `/runs/{id}/rerun` | 从某个检查点重跑 | 04、11 |
| POST | `/runs/{id}/replay_node` | 单节点重放 | 04、11 |
| POST | `/runs/{id}/optimize` | 运行后优化，返回补丁和评测报告 | 10 |
| POST | `/runs/{id}/diagnose` | 让模型诊断瓶颈和失败原因 | 11 |
| GET | `/runs/{id}/view?at_seq=` | 运行视图投影（支持时间旅行） | 11 |
| GET | `/runs/{id}/spans`、`/runs/{id}/cost`、`/runs/{id}/briefs` | 留痕、成本汇总、简报 | 11 |
| GET | `/ws/{ref}` | 读取工作区对象（内容寻址） | 04、11 |
| GET | `/audit` | 审计日志查询 | 07、11 |
| GET | `/metrics` | Prometheus 指标 | 11 |
