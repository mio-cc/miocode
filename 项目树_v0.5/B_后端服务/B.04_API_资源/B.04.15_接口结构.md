# B.04.15 接口结构

| 项 | 内容 |
|---|---|
| 编号 | B.04.15 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 新（`P.09` K260） |
| 最后修改 | 2026-11-25 |

## 1. 职责
`B.04` 各接口请求体、响应体结构的唯一正文：写进 `schema/api.schema.json`，重新生成 `gen/` 和前端类型（`C.14`）。`B.04.01`–`B.04.14` 的接口表只写"请求 → 响应"用到的结构名，字段以本文为准（`B.04-R5`）。

本版是 M1 用到的部分（§4.1 的接口）。以后每个里程碑用到新接口时在本文追加，`C.01-R17` 只增不改。

## 2. 不做什么
- 不实现接口（`B.04.01`–`B.04.09` 在 M1 第 ⑦ 片 `m1-api`）
- 不改已有的结构：`api.schema.json` 里 `E.07.01` 建的 6 个（`P.09` K236），以及其他 schema 文件里已有的（`OpsRequest`、`OpsApplied`、`OpsProposed`、`Diag`、`Assign`、`Session`、`Graph`、`NodeDef`、`TypeDef`、`Recipe`、`Rolecard`、运行事件的载荷），只引用

## 3. 继承的上级约束
`C.01`（全部，尤其 R2、R3、R17、R19、R21 和 `_ref` 字段只能是 `WsRef`）、`C.14`、`B.03.02` §4（分页）、`B.04-R1`–`R5`、`W.04.04` §3.5（前端读取的最低字段）、`P.09` K236、K260。

## 4. 接口

### 4.1 M1 的接口清单与结构
第 ⑦ 片只实现这张表（`P.09` K260）；`B.04.01`–`.09` 里其他接口在后面的里程碑做。"`X[]`"表示响应是 `X` 组成的 JSON 数组；`204` 没有响应体；错误一律 `ErrorResponse`（`C.11`）。

| 接口 | 请求 | 响应 |
|---|---|---|
| `GET /graphs?q=&session_id=&limit=&cursor=` | — | `GraphMetaPage` |
| `POST /graphs` | `GraphCreate` | 201 `GraphRead` |
| `GET /graphs/{id}?branch=&version=` | — | `GraphRead` |
| `PATCH /graphs/{id}` | `GraphMetaUpdate` | `OpsApplied` |
| `DELETE /graphs/{id}` · `POST /graphs/{id}/restore` | — | 204 |
| `GET /graphs/{id}/validate?branch=` | — | `GraphValidation` |
| `POST /graphs/{id}/ops` | `OpsRequest` | 200 `OpsApplied` / 202 `OpsProposed` / 409 `graph_conflict`（`details` 是 `GraphConflictDetails`） |
| `GET /graphs/{id}/ops?branch=&since_version=&actor=&limit=&cursor=` | — | `OpRecordPage` |
| `POST /graphs/{id}/undo` · `/redo` | `UndoRequest` | `OpsApplied` |
| `POST /graphs/{id}/ops/{op_id}/revert` | — | `OpsApplied` |
| `POST /runs` | `RunStart` | 201 `RunStarted` |
| `GET /runs?graph_id=&session_id=&status=&limit=&cursor=` | — | `RunMetaPage` |
| `GET /runs/{id}` | — | `RunView` |
| `POST /runs/{id}/pause` · `/resume` · `/cancel` | — | `RunMeta` |
| `GET /runs/{id}/nodes?scope=&node_id=` | — | `NodeSnapshot` |
| `GET /runs/{id}/nodes/{exec_key}` | — | `NodeDetail` |
| `GET /blobs/{ref}` | — | 原文（不是 JSON） |
| `GET /nodedefs` · `/nodedefs/{ref}` | — | `NodeDefItem[]` · `NodeDefItem` |
| `GET /types?layer=system\|business` · `/types/{ref}` | — | `TypeItem[]` · `TypeItem` |
| `POST /types/compat` | `TypeCompatRequest` | `Assign` |
| `GET /recipes` · `/recipes/{ref}` | — | `RecipeItem[]` · `RecipeItem` |
| `GET /rolecards` · `/rolecards/{ref}` | — | `RolecardItem[]` · `RolecardItem` |
| `GET /models` | — | `Model[]` |
| `GET /sessions?q=&limit=&cursor=` | — | `SessionPage` |
| `POST /sessions` | `SessionCreate` | 201 `Session` |
| `GET /sessions/{sid}` | — | `Session` |
| `PATCH /sessions/{sid}` | `SessionUpdate` | `Session` |
| `DELETE /sessions/{sid}` | — | 204 |
| `POST /sessions/{sid}/graphs` · `DELETE /sessions/{sid}/graphs/{gid}` | `SessionGraphAttach` · — | `Session` |

M1 不做（`P.09` K260）：分支、合并、提议（M2 / M4）；版本列表、比较、导入导出、子图库（M2）；时间线、时间旅行、回放、分叉、热更新、费用、用量（M2 / M5）；急停（M3）；节点库条目 `/node-presets`（M2，要扩展包）；`/providers`、`/connections`、价格表（M4；M1 的模型只从配置文件 `models.providers` 读）；消息、上传、上下文估算、压缩（M4，M1 的对话框不能发送）；`prompt-preview`、`count-tokens`（第 ⑤ 片有 token 计数后再定）。

### 4.2 新增的结构（`api.schema.json` 的 `$defs`）
写法：每个都是 `"type": "object"`、`"additionalProperties": false`（`C.01-R19`），只有 `RunStart.inputs` 标 `x-open`；时间用 `common.schema.json#/$defs/Timestamp`，ID 用 `Ulid`，`*_ref` 用 `WsRef`。"必填"列写 ✓ 的进 `required`。

**分页**（`B.03.02` §4）：JSON Schema 写不了泛型，每种列表一个具体结构，名字是"条目结构名 + `Page`"，字段都是 `items`（必填，条目数组）、`next_cursor`（可选，字符串，没有下一页时省略）：`GraphMetaPage`（`GraphMeta`）、`OpRecordPage`（`OpRecord`）、`RunMetaPage`（`RunMeta`）、`SessionPage`（`session.schema.json` 的 `Session`）。

**图**
| 结构 | 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `GraphCreate` | `title` | string，≤ 120 | | 缺省空串 |
| `GraphRead` | `graph` | `graph.schema.json` | ✓ | |
| | `registry_hash` | string | ✓ | 读取时的注册表哈希（`C.12` §2） |
| | `diags` | `Diag[]` | ✓ | 全量校验结果（`E.03.03`） |
| `GraphMetaUpdate` | `base_version` | integer ≥ 0 | ✓ | |
| | `title` | string，≤ 120 | ✓ | M1 只改标题（转成 `set_graph_title` Op） |
| `GraphValidation` | `version` | integer ≥ 0 | ✓ | 校验的是哪个版本 |
| | `diags` | `Diag[]` | ✓ | |
| `GraphConflictDetails` | `head` | integer ≥ 0 | ✓ | 服务器上的 head 版本 |
| | `missed_ops` | `OpRecord[]` | ✓ | `base_version` 之后、和这次提交冲突的 Op 所在的整段记录，前端据此本地合并（`W.05` §6.6） |
| | `conflicts` | 数组，每项 `{op_id: Ulid ✓, object: string ✓}` | ✓ | `op_id` 是这次提交里冲突的那条；`object` 是冲突的对象（`E.05.01` 的可交换判断用的写法） |
| `UndoRequest` | `branch` | `op.schema.json#/$defs/Branch` | ✓ | 撤销 / 重做都用 |

**运行**
| 结构 | 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `RunStart` | `graph_id` | Ulid | ✓ | |
| | `branch` | `Branch` | | 缺省 `main` |
| | `version` | integer ≥ 0 | | 缺省 head |
| | `inputs` | object，`x-open` | | 根图入口端口名 → 值 |
| | `session_id` | Ulid | | |
| `RunStarted` | `run_id` | Ulid | ✓ | |
| | `graph_version` | integer ≥ 0 | ✓ | 冻结的图版本 |
| | `status` | `RunStatus` | ✓ | |
| `RunView` | `meta` | `RunMeta` | ✓ | 用量、费用在 `meta.usage`、`meta.cost_micros` |
| | `current_path` | `Loc[]` | ✓ | 现在处于 `running` 或 `waiting` 的节点执行位置 |
| | `pending_approvals` | integer ≥ 0 | ✓ | M1 没有审批，恒为 0 |
| `NodeSnapshot` | `seq` | integer ≥ 0 | ✓ | 投影对应的事件序号，重连对齐用（`W.03.04` §6.2） |
| | `items` | `NodeStateRow[]` | ✓ | |
| `NodeDetail` | `exec_key` | string | ✓ | |
| | `node_id` | Ulid | ✓ | |
| | `loc` | `Loc` | ✓ | |
| | `state` | `NodeState` | ✓ | |
| | `attempt` | integer ≥ 1 | ✓ | |
| | `inputs` | 数组，每项 `{port: string ✓, value_ref: WsRef ✓}` | ✓ | 来自 `node.input` 事件 |
| | `outputs` | 数组，每项 `{port: string ✓, value_ref: WsRef ✓, partial: boolean ✓}` | ✓ | 来自 `node.output` 事件 |
| | `ctx_ref` | WsRef | | 上下文包（`ctx.assembled`） |
| | `prompt_ref` | WsRef | | 渲染后的提示词（`prompt.rendered`） |
| | `llm_calls` | `run-event.schema.json#/$defs/DataLlmCall` 数组 | ✓ | |
| | `tool_calls` | `run-event.schema.json#/$defs/DataToolCall` 数组 | ✓ | |
| | `error` | `run-event.schema.json#/$defs/NodeError` | | |
| | `cost_micros` | integer ≥ 0 | ✓ | |
| | `started_at`、`ended_at` | Timestamp | | |

大内容只给引用，前端用 `GET /blobs/{ref}` 按需读（`B.04.03` §5）。

**节点库**（响应带 `ETag`，值是注册表哈希，`B.04.06` §5）
| 结构 | 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `NodeDefItem` | `ref` | `graph.schema.json#/$defs/NodeTypeRef` | ✓ | 图里写的类型名：原子节点是名字，扩展节点是 `包/名字@主版本` |
| | `package` | string | ✓ | 来自哪个包；内置是 `core` |
| | `def` | `nodedef.schema.json` | ✓ | |
| `TypeItem` | `ref` | `types.schema.json#/$defs/TypeRef` | ✓ | `名称@主.次` |
| | `package` | string | ✓ | |
| | `def` | `typedef.schema.json` | ✓ | |
| | `chain` | `TypeRef[]` | | 继承链，从父到根（没有 `extends` 时省略） |
| `TypeCompatRequest` | `src`、`dst` | `TypeRef` | ✓ | |
| `RecipeItem` | `ref` | string | ✓ | `名称@版本`，注册表的键（`E.03.01`） |
| | `package` | string | ✓ | |
| | `def` | `recipe.schema.json` | ✓ | |
| `RolecardItem` | `ref` | string | ✓ | 同上 |
| | `package` | string | ✓ | |
| | `def` | `rolecard.schema.json` | ✓ | 继承合并之后的结果（`E.13.05`） |

`layer=system` 只返回 `def.system` 为真的类型，`business` 相反，不写返回全部。

**模型**
| 结构 | 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `Model` | `ref` | string | ✓ | `<提供方名>/<模型 id>`：在第一个 `/` 处分开（提供方名里没有 `/`，`E.10.01` §4.3）；`Session.orchestrator_model` 和 `orchestrator_effort` 的键都用这个写法 |
| | `provider` | string | ✓ | 提供方名 |
| | `model` | string | ✓ | `models[].id` |
| | `window`、`max_output` | integer ≥ 0 | ✓ | 合并后的能力（`E.10.01` §5.1） |
| | `caps` | `{tools, parallel_tools, vision, native_schema, prompt_cache}`，都是 boolean、都必填 | ✓ | |
| | `effort` | `Effort[]` | | 支持的思考强度（`C.16-R5`）；不支持调节时省略 |
| | `priced` | boolean | ✓ | 价格表里有没有它；M1 没有价格表，恒为 false |

`Effort`：枚举 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`（`U.09.06-R5`），单独一个 `$defs`。

**会话**
| 结构 | 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `SessionCreate` | `title` | string，≤ 80 | | |
| `SessionUpdate` | `title` | string，≤ 80 | | |
| | `pinned` | boolean | | |
| | `active_graph_id` | Ulid | | 必须是已挂上的图 |
| | `orchestrator_model` | string | | `Model.ref`；空串表示清除 |
| | `orchestrator_effort` | object，值是 `Effort` | | 整体替换 |
| | `last_location` | 同 `Session.last_location` 的写法（`graph_id`、`scope`） | | `C.10-R3` |
| `SessionGraphAttach` | `graph_id` | Ulid | ✓ | |

`SessionUpdate` 至少写一个字段（`minProperties: 1`）。

### 4.3 文件头
`x-version` 改为 `1.1`（只增，`C.01-R17`、`R21`）；`title` 改为"HTTP 接口与存储共用的结构（正文在 `B.04.15`）"。

## 5. 行为
- 生成：加完之后由验证者运行 `go run ./tools/gen`，产出 `gen/` 和前端 `generated/`（`G.02.05-R1`，实施者不手写生成物）；生成的 Go 类型名就是 `$defs` 名（`C.14-R5`）。
- 接口实现（第 ⑦ 片）在路由表里按 §4.1 声明请求和响应结构，响应按声明校验（`B.04-R3`、`B0306-T3`）。

## 6. 不变量
- 已有的 6 个结构一个字节都不改
- 每个新结构都能编译、通过元校验，`schemacheck` 不报问题

## 7. 错误处理
无（只有结构）。

## 8. 验收标准
1. 每个新结构一个合法例、至少一个反例
2. `W.04.04` §3.5 里 M1 用到的结构名都在 schema 里找得到
3. 生成物和 schema 一致（`go run ./tools/build -check`）

### 实施卡
- 要建 / 要改的文件：`schema/api.schema.json`、`tools/schemacheck/api_m1_test.go`、`gen/types.go`、`gen/consts.go`、`gen/union.go`、`web/src/lib/protocol/generated/types.ts`、`web/src/lib/protocol/generated/consts.ts`、`web/src/lib/protocol/generated/wire.ts`
- 生成物由验证者运行 `go run ./tools/gen` 产出，实施者不手写；改不到的生成物不改。
- 不许碰的文件：`engine/`、`internal/`、`cmd/`、`tools/gen/`、`tools/relay/`、`tools/build/`、`tools/schemacheck/api_test.go`
- 测试用例：
  - `B0415-T1 合法例`：§4.2 每个新结构（含 4 个分页结构和 `Effort`）至少一个合法例通过；`NodeDetail` 一个只有必填字段、一个全部字段；`SessionUpdate` 每个字段各单独写一次都通过
  - `B0415-T2 反例`：每个新结构至少一个反例（缺必填或多出字段）在预期位置失败；另外：`GraphMetaUpdate.base_version` 为 -1、`RunView.pending_approvals` 为 -1、`NodeDetail.attempt` 为 0、`NodeDetail.ctx_ref` 不是 `ws://sha256:…`、`Effort` 为 `medium-high`、`SessionUpdate` 为空对象、`GraphConflictDetails.missed_ops` 的一项缺 `version`、`TypeItem.ref` 为 `方案`（缺版本）、`RunStart.branch` 为 `feature/x`。`Model.ref` 的写法（有没有 `/`）由第 ⑦ 片的实现检查，这里不测
  - `B0415-T3 前端要用的结构名`：`api.schema.json` 的 `$defs` 包含 `GraphRead`、`GraphConflictDetails`、`RunStarted`、`RunView`、`NodeSnapshot`、`NodeDetail`、`Model`，`op.schema.json` 包含 `OpsApplied`、`OpsProposed`（`W.04.04` §3.5 的 M1 部分）
  - `B0415-T4 已有结构不变`：`E0701-T4` 照常通过（不改 `api_test.go`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`（测试里已有的辅助函数）
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-25 | 新建，M1 第 ② 片 `m1-api-schema` 的唯一叶子：`B.04` 是总则不能领取，接口结构集中写在这里；M1 接口清单与 25 个新结构；状态"已审" | `P.09` K260 |
