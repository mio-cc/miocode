# W.04.04 生成类型使用规则

| 项 | 内容 |
|---|---|
| 编号 | W.04.04 |
| 类型 | 规范 |
| 上级 | W.04 协议层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01 §4；`C.14`；`G.16`；`G.02.05-R1`–`R3`；`P.09` K80、K85 |
| 最后修改 | 2026-11-23 |

## 1. 目的
前端所有协议数据（图、Op、事件、错误码、会话、HTTP 响应）的类型都从 `schema/` 生成（INV-17）。生成类型如果用得乱——有人从 `generated/` 深层引用 snake_case 的原始类型、有人手写一份"差不多"的接口、有人写 `ev.kind === 'node.state'` 这样的裸字符串——schema 一改，编译器发现不了，前后端就悄悄对不上。本规范规定前端代码怎样拿、怎样用这些类型和常量，以及前端依赖的 HTTP 响应结构必须在 `api.schema.json` 里有哪些字段。

## 2. 适用范围
`web/src/` 下的全部代码和测试，以及写它们的人和实施模型。`web/src/lib/protocol/` 自身按 §3 的例外条款处理。

## 3. 规则

### 3.1 从哪里拿
- **W.04.04-R1** `lib/protocol/` 以外的代码只从 `@/lib/protocol` 导入协议类型和常量；`@/lib/protocol/generated/…` 只允许 `lib/protocol/` 里的文件导入。
  - 正例：`import { Ev, type RunEvent } from '@/lib/protocol';`
  - 反例：`import type { RunEvent } from '@/lib/protocol/generated/run-event';`（拿到的是 snake_case 的原始类型）
- **W.04.04-R2** 前端内部只使用 camelCase 别名（`W.04.03` §5.2：`Graph`、`Op`、`RunEvent`…）。snake_case 的原始类型（`gen.*`）只出现在 `lib/protocol/` 和测试夹具的加载代码里。
- **W.04.04-R3** 画布引擎 `canvas/core/` 同样只从 `@/lib/protocol` 导入类型和常量（`W.01-R6`）。

### 3.2 不重复定义
- **W.04.04-R4** 不手写与 schema 结构相同或相近的类型（`G.02.05-R2`）。需要多几个字段或少几个字段时，用组合：`Omit<Node, 'children'> & { scope: Scope }`、`Pick<RunMeta, 'id' | 'status'>`（`C.14` §6）。
- **W.04.04-R5** 例外只有 `Page<T>`（`B.03.02` §4 的列表信封，schema 写不出泛型）和 `ApiError` / `NetError`（`W.04.01`），都在 `lib/protocol/` 里定义一次。
- **W.04.04-R6** 开放对象 `params`、`meta`、`ui`、`kv` 的类型是 `Record<string, unknown>`：读取时先收窄（`typeof v === 'number'`），写回时整体复制再改其中一项，未知键原样保留（`C.01-R19`）。不为它们写"更精确"的手写接口。

### 3.3 常量，不写裸字符串
- **W.04.04-R7** 事件名、Op 种类、错误码、诊断码、授权动作名、SSE 控制帧名、运行状态和其他枚举值，比较和赋值时一律用生成的常量对象（`G.02.05-R3`、`C.14-R6`）：
  | 枚举 | 常量对象 | 例 |
  |---|---|---|
  | 事件名 | `Ev` | `Ev.NodeState`（`node.state`） |
  | Op 种类 | `OpKind` | `OpKind.MoveNodes` |
  | API 错误码 | `ErrCode` | `ErrCode.GraphConflict` |
  | 诊断码 | `DiagCode` | `DiagCode.V09` |
  | 授权动作 | `Act` | `Act.OpAddNode`（`op.add_node`） |
  | SSE 控制帧 | `SseControl` | `SseControl.Resync` |
  | 其他枚举 | 与类型同名 | `RunStatus.Done`、`ActorKind.Model` |
  - 正例：`switch (ev.kind) { case Ev.NodeState: … }`；`if (e.code === ErrCode.GraphConflict)`
  - 反例：`if (ev.kind === 'node.state')`、`case 'graph_conflict':`
- **W.04.04-R8** 对判别联合（Op、事件、`MessageBlock`）的 `switch` 必须有 `default` 分支，且 `default` 不抛错：开发模式 `console.debug`，生产静默忽略（`C.01-R18`：服务端可能多出新值）。界面上显示不认识的枚举值时写"未知"（`W.10` 的文案）。

### 3.4 值的约定
- **W.04.04-R9** ID 的类型是品牌类型 `Ulid`。只有三处能产生 `Ulid`：服务端数据、`newUlid()`、`isUlid()` 收窄（`W.04.01`）；不写 `as Ulid`（测试夹具除外）。前端新建节点、连线、便签、Op 时直接用 `newUlid()`，不用 `tmp:N`（临时 ID 只属于模型的 GraphPatch，`C.08-R1`–`R3`）。
- **W.04.04-R10** 时间字段是 UTC 字符串（`Timestamp`），只在展示时由 `W.10` 转成本地时间；不在 store 里存 `Date` 对象，不比较字符串以外的形式（INV-23）。
- **W.04.04-R11** 金额 `*Micros`、时长 `*Ms`、token 数都是整数，前端计算后也保持整数，只在展示时换算（`C.01-R8`–`R10`）。
- **W.04.04-R12** 可选字段没有值时省略，不赋 `undefined`、不赋 `null`（`tsconfig` 的 `exactOptionalPropertyTypes`，`B.03.02` §4）；`null` 只用在 schema 明确允许的位置（如 `set_mandate{to: null}`）。

### 3.5 前端依赖的 HTTP 响应结构（`api.schema.json`，`P.09` K80）
下表是前端代码按名字引用、因此**必须**在 `schema/api.schema.json`（或表里写的其他 schema 文件）中定义的结构，以及前端读取的字段。字段名按 schema 写（snake_case）；"读取"之外的字段可以有，前端不依赖。正文由 `B.04` 各文档的"数据结构"写，本表是前端一侧的最低要求。

| 结构 | 接口 | 前端读取的字段 | 用在 |
|---|---|---|---|
| `GraphRead` | `GET /graphs/{id}` | `graph`、`registry_hash`、`diags` | `W.03.05` §6.7、`W.05` |
| `GraphMeta` | `GET /graphs` | `id`、`title`、`updated_at`、`version`、`stats {layers, subgraphs, nodes}` | `U.09.04-R2`、`W.07.02` |
| `VersionMeta` | `GET /graphs/{id}/versions` | `version`、`actor`、`ts`、`summary` | `W.07.05` |
| `OpResult` | `POST /graphs/{id}/ops`、`/undo`、`/redo`、`/revert`、`/ops/{op_id}/revert`、提议的 `decide` / `accept-all` / `reject-all` | `version`、`applied`、`rebased`、`id_map`、`diags` | `W.05`、`W.03.06` |
| `ProposalAccepted` | `POST /graphs/{id}/ops` 的 202 | `proposal_id`、`status` | `W.05` |
| `GraphConflictDetails` | 409 `graph_conflict` 的 `details` | `head`、`missed_ops[]`（每项是带 `version` 的 `OpRecord`）、`conflicts[] {op_id, object}` | `W.05` §6.6 |
| `OpRecord` | `GET /graphs/{id}/ops` | `version`、`op`（完整 `Op`，含服务器填写的 `actor`、`target`、`group_id`）、`undone` | `W.03.01`、`W.05` |
| `Branch` | `GET /graphs/{id}/branches` | `name`、`head`、`behind`、`ahead` | `W.03.01` |
| `RunMeta` | `GET /runs`、控制类 POST 的响应 | `id`、`session_id`、`kind`、`status`、`graph_id`、`graph_version`、`branch`、`created_at`、`ended_at` | `W.03.04`、`W.03.05` §6.3 |
| `RunStarted` | `POST /runs` | `run_id`、`graph_version`、`status` | `W.03.04` |
| `RunView` | `GET /runs/{id}`、`/view?at_seq=` | `meta`（`RunMeta`）、`usage {in, out, cached}`、`cost_micros`、`current_path`、`pending_approvals` | `W.03.04` |
| `NodeSnapshot` | `GET /runs/{id}/nodes` | `seq`、`items[]`（`NodeStateRow`） | `W.03.04` §6.2 |
| `NodeStateRow` | 同上 | `exec_key`、`node_id`、`loc`、`state`、`attempt`、`progress`、`round`、`started_at`、`ended_at`、`error` | `W.03.04` |
| `NodeDetail` | `GET /runs/{id}/nodes/{exec_key}` | `exec_key`、`inputs`、`outputs`、`ctx_ref`、`prompt_ref`、`llm_calls[]`、`tool_calls[]`、`error`、`cost_micros` | `W.07.03` |
| `Approval` | `GET /approvals/{aid}`、`resolve` 的响应 | `id`、`session_id`、`run_id`、`loc`、`kind`、`risk`、`status`、`summary`、`taint`、`created_at` | `W.03.05`、`W.07.09` |
| `ApprovalGroup` | `GET /approvals` | `key`、`items[]`（`Approval`）、`count` | `W.03.05` |
| `EstopState` | `GET /estop` | `global`、`runs[]` | `W.03.05` |
| `Effective` | `GET /authz/effective`、`POST /sessions/{sid}/level` | `level`、`mandate_id`、`anchor`、`chain[]` | `W.03.06` |
| `MessageSent` | `POST /sessions/{sid}/messages` | `user_message`、`assistant_message_id` | `W.03.05` |
| `OnboardingState` | `GET /settings/onboarding` | `step`、`done` | `W.02` |
| `SettingsPatched` | `PATCH /settings` | `settings`、`applied`、`restart_required`、`next_run` | `W.02.03` |
| `Model` | `GET /models` | `ref`、`provider`、`window`、`caps`、`priced` | `W.03`、`W.07.07` |
| `NodeDefSummary` | `GET /nodedefs`（在 `nodedef.schema.json`） | `ref`、`name`、`category`、`package`、`icon`、`tags` | `W.03` §4.5、`W.07.02` |
| `TypeDef` 列表 | `GET /types`（在 `typedef.schema.json` / `types.schema.json`） | `ref`、`layer`、`extends`、`producer`、`migrations` | `W.05`（`Assignable`，`C.04.02`） |
`Session`、`Message`、`Proposal`、`ProposalPreview`、`Settings`、`NodeDef`、`Mandate` 已由各自的 schema 定义（`C.10`、`C.08`、`G.11`、`C.03`、`C.09`），不重复列出。

## 4. 检查方式
| 规则 | 检查 |
|---|---|
| R1–R3 | ESLint `no-restricted-imports`：`lib/protocol/` 以外禁止 `@/lib/protocol/generated/*`、`**/lib/protocol/generated/**`（写在 `web/eslint.config.js`，`G.06.04` 统一维护） |
| R4、R5 | 评审：`lib/protocol/` 以外出现与 schema 同名的 `type` / `interface` 声明即退回；CI 脚本 `tools/lint/dup-types` 列出 `web/src` 里与生成类型同名的声明 |
| R7 | ESLint `no-restricted-syntax`：`kind`、`code`、`status`、`state` 属性与字符串字面量做 `===` / `!==` 比较，以及 `case '…':` 出现在对这些属性的 `switch` 里时报错 |
| R8 | ESLint `default-case` 对判别联合的 `switch` 开启；`@typescript-eslint/switch-exhaustiveness-check` 同时开启（列全已知分支 + `default`） |
| R9 | ESLint `no-restricted-syntax`：`as Ulid` 只允许在 `lib/protocol/` 和 `*.test.ts` |
| R12 | `tsconfig.json` 开启 `exactOptionalPropertyTypes`（`G.06-R1`） |
| §3.5 | `W0403-T9` 检查别名齐全；`B.04` 接口测试按声明的 schema 校验响应（`B0306-T3`）；前端测试夹具用 `ajv` 按 `api.schema.json` 校验 |
| 全部 | `make gen && git diff --exit-code`（`G.16-R3`）；生成物不提交手改（`G.02.05-R1`） |

## 5. 例外
- `web/src/lib/protocol/` 内部的文件（`mapping.ts`、`client.ts`、`events.ts`、`types.ts`、`index.ts`）可以导入 `generated/` 并使用 snake_case 原始类型——这是它们的职责。
- 测试夹具（`*.test.ts` 读取 `schema/examples/`）可以用原始类型和 `as Ulid`。
- 其他例外：无。确需例外时在 `P.09` 登记后改本文。
