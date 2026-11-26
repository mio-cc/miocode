# W.04.03 字段映射

| 项 | 内容 |
|---|---|
| 编号 | W.04.03 |
| 类型 | 实施 |
| 上级 | W.04 协议层 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引01 §3；`G.04.02` §2；`C.01-R4`、`R19`；`C.14` §3；`P.09` K84、K235、K300、K301 |
| 最后修改 | 2026-11-26 |

## 1. 职责
在前端唯一的一处把服务端的 snake_case 字段名转成 camelCase（进），把 camelCase 转回 snake_case（出），同时保证开放对象、无类型的值、以数据为键的映射原样不动；并提供与运行时转换一一对应的类型 `FromWire<T>`，以及 `@/lib/protocol` 导出的全部 camelCase 类型别名。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 决定每个类型的每个字段怎么转换 | `tools/gen` 从 schema 计算后写进 `generated/wire.ts` 的 `WIRE_TYPES`（`C.14-R8`）；本节点只读这张表 |
| 转换字段的值（枚举值、事件名 `kind`、ID、时间字符串） | 不转：值一律原样（`C.01-R5`） |
| 时间、金额、时长的格式化 | `W.10` |
| 校验数据是否符合 schema | 服务端（`B.03.02` §5）；前端测试用 `ajv` 校验夹具（`W.04.04` §4） |

## 3. 继承的上级约束
`W.04` §5、§7；`W.03` §5；`W.01-R12`；`G.04.02` §2；`C.01-R4`、`R5`、`R19`；`C.14` §3、`R8`、`R9`；`B.03.02` §4（可选字段省略、不写 `null`）；INV-17。

## 4. 接口
```ts
// web/src/lib/protocol/mapping.ts
import { WIRE_TYPES, type WireNode, type WireTypeName } from './generated/wire';

export function fromWire<T>(type: WireTypeName, v: unknown): T;   // snake_case → camelCase，按 type 往下走（深拷贝；输入不被修改）
export function toWire(type: WireTypeName, v: unknown): unknown;  // camelCase → snake_case（深拷贝）
export function toWireQuery(q: Query): URLSearchParams;   // 查询参数：键转 snake_case，值原样（W.04.01 §6.1）
export function camelKey(k: string): string;         // 'cost_micros' → 'costMicros'（带缓存）
export function snakeKey(k: string): string;         // 'costMicros' → 'cost_micros'（带缓存）

// 类型：与 fromWire 的运行时行为逐项对应。生成的类型里，映射和开放对象都是字符串索引签名（C.14 §3），键原样；其余对象的键转换
type CamelKey<S extends string> = S extends `${infer H}_${infer T}` ? `${H}${Capitalize<CamelKey<T>>}` : S;
export type FromWire<T> =
  T extends string | number | boolean | null | undefined ? T :            // 含品牌类型 Ulid
  T extends readonly (infer E)[] ? readonly FromWire<E>[] :
  T extends object ?
    (string extends keyof T ? { readonly [k: string]: FromWire<T[string & keyof T]> } :   // 映射、开放对象：键原样
    { [K in keyof T as K extends string ? CamelKey<K> : K]: FromWire<T[K]> }) :
  T;

// web/src/lib/protocol/types.ts —— 别名（从 ./generated/types 导入；完整覆盖 generated/types.ts 全部导出类型，见 §5.2、K301）
import type * as gen from './generated/types';
export type Graph = FromWire<gen.Graph>;
export type Node = FromWire<gen.Node>;
export type Op = FromWire<gen.Op>;
export type RunEvent = FromWire<gen.RunEvent>;
// …

// web/src/lib/protocol/index.ts —— 唯一入口（W.04.04-R1）
export * from './types';
export { Act, ErrCode, Ev, NodeType, SseControl } from './generated/consts';
export { ActorKind, Category, DiagCode, DiagLevel, Effort, FailureClass, ImplType, MessageBlockKind, MessageRefKind, NodeState, OpKind, RunStatus } from './generated/types';
export { CONTAINER_RULES, WIDGET_MAP, CATEGORY_MAP, AGGREGATE_OPS, AUTHZ_MATRIX, STATE_MACHINE } from './generated/tables';
export type { WireTypeName } from './generated/wire';
export type Page<T> = { items: readonly T[]; nextCursor?: string };      // B.03.02 §4
export { fromWire, toWire, toWireQuery, camelKey, snakeKey, type FromWire, type WireQuery } from './mapping';
// 以下四行在第 ⑩ 片由 W.04.01、W.04.02、W.04.05 实现后补齐导出（P.09 K300）：
// export { createProtocol, type Protocol } from './assemble';
// export { createRestClient, ApiError, NetError, isApiError, isNetError, errorReport, apiPath } from './client';
// export { newUlid, isUlid } from './ulid';
// export { createStreamClient } from './events';
// export { createConnectivity, bindNet, type Connectivity } from './offline';
```
`createProtocol` 放在 `lib/protocol/assemble.ts`（第 ⑩ 片 `W.04.05` 随 `client`、`events`、`offline` 就位后建，`P.09` K300）。

### 4.1 依赖
生成物 `generated/wire.ts`（`WIRE_TYPES`、`WireTypeName`、`WireNode`）、`generated/types.ts`（类型与同名枚举常量）、`generated/consts.ts`（常量）、`generated/tables.ts`（数据表）。

## 5. 数据结构
### 5.1 字段映射表（`generated/wire.ts`，`C.14-R8`，`P.09` K235）
按类型给出：`WIRE_TYPES[类型名].fields[字段名]` 是这个字段的值怎么转换，字段名一律转换。
| 写法 | 运行时 | 例子（以生成结果为准） |
|---|---|---|
| `"raw"` | 值整体原样（同一个引用，不复制、不进入） | 标量；开放对象 `Node.params`、`Node.ui`、`Graph.meta`、`kv`、`details`；没有类型约束的 `set_param.to`、`value`、事件里的 `budget`、`usage`；值不用转换的映射 `orchestrator_effort`、`decisions`、`id_map` |
| `{t: X}` | 按类型 `X` 转换 | `Graph.root`、`Node.children`、`Mandate.overrides`、`Message.usage` |
| `{list: …}` | 数组，逐项按 … | `Subgraph.nodes`、`Message.blocks`、`Op.inverse` |
| `{map: …}` | 新对象：键是数据、原样，每个值按 … | `NodeDef.params`（参数名 → `ParamDef`） |
- 判别联合有 `union`：字段联合（`Op` 的 `payload`、事件的 `data`）按同一对象里 `disc` 字段的值查 `branches` 得到联合字段的类型；整体联合（`MessageBlock`、`MessageRef`、`Impl`）按 `disc` 的值查 `branches` 得到整个对象的类型。
- 同一个字段名在不同类型里可以不同（`Node.params` 与 `NodeDef.params`、`Mandate.overrides` 与 `SubgraphRef.overrides`），这是按类型而不按名字的原因（K84 原来按名字汇总，K235 改）。
- 表里没有的字段（服务端比前端新）和不认识的判别值：字段名照常转换，值原样（`C.01-R18`）。

### 5.2 别名清单（`types.ts`）
- 每个 schema 里的 `$defs` 和顶层 `title` 都有一个同名别名：`Graph`、`Subgraph`、`Node`、`Edge`、`Note`、`NodeUi`、`PortRef`、`Op`、`OpTarget`、`OpKind`（类型）、`Diag`、`GraphPatch`、`Proposal`、`ProposalPreview`、`Mandate`、`Session`、`Message`、`MessageBlock`、`Selection`、`RunEvent`、`GraphEvent`、`SessionEvent`、`RunStatus`、`NodeState`、`Loc`、`Iter`、`Actor`、`ActorKind`、`Ulid`、`Timestamp`、`NodeDef`、`NodeDefSummary`、`TypeDef`、`Assign`、`Settings`、`Model`、`ErrorResponse`、`ApiErrorCode`，以及 `api.schema.json` 的全部结构（`W.04.04` §3.5）。
- 事件的单个分支用工具类型取：`EventOf<'node.state'>` = `Extract<RunEvent, { kind: 'node.state' }>`；Op 同理 `OpOf<'set_param'>`。
- 别名由 `types.ts` 手写一行一个（只是 `FromWire<gen.X>`，不是结构定义，不违反 `G.02.05-R2`）；新增 schema 定义时在同一个提交里补一行，`W0403-T9` 检查有没有漏。

## 6. 行为
### 6.1 `fromWire`（进）
`fromWire(type, v)` 按类型往下走，节点的写法见 §5.1：
1. `"raw"`：原样返回（同一个引用）。
2. `{list: n}`：数组逐项按 `n`；不是数组时原样返回。
3. `{map: n}`：新对象，键原样，每个值按 `n`。
4. `{t: X}`：`v` 不是普通对象（原型是 `Object.prototype` 或 `null`）时原样返回（`Blob`、`Date`、`null`…）。否则取 `W = WIRE_TYPES[X]`：
   - `W.union` 没有 `field`（整体联合）：按 `v[W.union.disc]` 查 `branches` 得到 `Y`，按 `{t: Y}` 处理；查不到时只转换键、值原样。
   - 其余：对每个键 `k`，输出键是 `camelKey(k)`；值按 `W.fields[k]`；`k` 是联合字段（`W.union.field`）时按 `v[W.union.disc]` 查 `branches` 得到 `{t: Y}`，查不到按 `"raw"`；`W.fields` 里没有 `k` 时按 `"raw"`。
5. 调用方传入根类型名：`client.ts` 按接口、`events.ts` 按流（`RunEvent`、`GraphEvent`、`SessionEvent`）。

### 6.2 `toWire`（出）
与 §6.1 对称：`toWire(type, v)` 的输出键是 `snakeKey(k)`，再按这个 snake_case 名查 `W.fields`。值为 `undefined` 的键删掉（`B.03.02` §4：可选字段省略）；`null` 保留（`set_mandate{to: null}`、`set_subgraph_ref{to: null}` 有意义，`C.05.02`）。

### 6.3 键的转换
- `camelKey`：每个 `_` 加其后一个字符变成那个字符的大写：`registry_hash` → `registryHash`，`l3_skip_human` → `l3SkipHuman`。
- `snakeKey`：每个大写字母变成 `_` + 小写：`registryHash` → `registry_hash`。
- 往返要求：schema 里每个字段名 `k` 都满足 `snakeKey(camelKey(k)) === k`（`C.01-R4` 规定只用小写字母、数字、下划线；生成器另外拒绝"下划线后面跟数字"和连续下划线这两种无法往返的写法，`C.14-R9`）。
- 两个函数各带一个 `Map` 缓存（字段名有限，最多几千个）。

### 6.4 开放对象里的数据怎么用
`params`、`meta`、`ui`、`kv` 的键在前端就是服务端的原样（例如参数名 `max_rounds`）。读写它们用字符串键（`node.params['max_rounds']`），不转换、不补默认值；改其中一项时整体复制后改那一项，未知键原样保留（`C.01-R19`、`W.04.04-R6`）。

## 7. 不变量
- 对 `schema/examples/` 下每个合法示例 `x`：`toWire(fromWire(x))` 与 `x` 深相等（往返无损）。
- `"raw"` 位置的值在 `fromWire` / `toWire` 前后是同一个引用。
- `FromWire<T>` 与 `fromWire` 的结果一致：类型测试里对每个示例 `expectTypeOf(fromWire<FromWire<gen.X>>(x))` 能通过，且结果的键与类型的键逐个相同。
- 本节点之外不出现第二套 snake_case ↔ camelCase 转换。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 输入里有循环引用 | 不会出现（输入来自 `JSON.parse`）；不做检测 |
| 键不符合 `C.01-R4`（如大写、连字符，可能来自不透明位置以外的旧数据） | `camelKey` 原样返回不认识的部分；不抛错 |
| `WIRE_TYPES` 与 schema 不一致 | CI 的 `make gen && git diff --exit-code` 拦住（`G.16-R3`） |

## 9. 性能与资源
- `fromWire` 500 节点 + 700 连线的图 ≤ 5ms；一条运行事件 ≤ 0.05ms；`toWire` 一批 50 条 Op ≤ 0.5ms。
- 键缓存命中后每个键 O(1)；不透明的值不复制。

## 10. 验收标准
1. `schema/examples/` 下全部合法示例往返无损。
2. 节点 `params` 里的 `max_rounds`、会话 `orchestrator_effort` 里的模型名 `gpt_4o`（含下划线）、提议 `decisions` 里的 ULID 键都原样保留。
3. 事件 `data` 里的 `cause_seq`、`target_node` 等字段转成 camelCase。
4. 类型 `FromWire<gen.Graph>` 的键与 `fromWire` 结果逐个相同（类型测试）。
5. `web/src/` 里 `lib/protocol/` 以外搜索不到 snake_case 的字段访问（开放对象的字符串键除外；ESLint `@typescript-eslint/naming-convention` 对属性名检查，`G.04.02` §3）。

### 实施卡
- 要建 / 要改的文件：`web/src/lib/protocol/mapping.ts`、`web/src/lib/protocol/mapping.test.ts`、`web/src/lib/protocol/mapping.test-d.ts`、`web/src/lib/protocol/types.ts`、`web/src/lib/protocol/index.ts`。
- 说明：`assemble.ts` 推到第 ⑩ 片 `W.04.05`，待 `client.ts` / `events.ts` / `offline.ts` 就位后建（`P.09` K300）。
- 不许碰的文件：`web/src/lib/protocol/generated/`、`web/src/lib/protocol/client.ts`、`web/src/lib/protocol/events.ts`、`web/src/lib/protocol/offline.ts`、`web/src/state/`、`schema/`、`tools/`。
- 函数签名：见 §4。
- 测试用例：
  - `W0403-T1 往返`：示例清单 `schema/examples/manifest.yaml` 里每个合法示例按它的 schema 对应的类型名（根类型名见 `schema/builtin/aliases.yaml` 的 `roots`，`#/$defs/X` 为 `X`），四份 `*_vectors.json` 里合法的项按 `Op` 和三条流的类型：`toWire(T, fromWire(T, x))` 深相等（覆盖 `C.14-R4` 的 TS 侧往返，P.09 K235）
  - `W0403-T2 原样`：`Node` 的 `params:{max_rounds:3, aB:{c_d:1}}` 原样且是同一引用；`set_param` 的 `to:{a_b:1}` 原样；`NodeDef.params` 的键（参数名）原样、每个 `ParamDef` 里的 `show_if`、`enum_labels` 转换；`Mandate.overrides` 里的 `tools_max_risk` 转换、`SubgraphRef.overrides` 的键原样
  - `W0403-T3 映射`：`{orchestrator_effort:{gpt_4o:'high'}}` → `{orchestratorEffort:{gpt_4o:'high'}}`（内部键原样）；`{decisions:{'01JX…':'accepted'}}` 的 ULID 键原样；`{id_map:{'tmp:1':'01J…'}}` → `{idMap:{'tmp:1':'01J…'}}`；`toWire` 反过来还原
  - `W0403-T4 判别联合`：`run-event` 示例里 `data.cause_seq`、`data.exec_key` 转换；`op` 示例里 `payload.node_ids`、`new_id` 转换；整体联合 `MessageBlock` / `MessageRef` / `Impl` 转换
  - `W0403-T5 键往返`：生成物 `WIRE_TYPES` 里出现的全部字段名 `snakeKey(camelKey(k)) === k`
  - `W0403-T6 toWire 空值`：`{a: undefined, b: null}` → `{b: null}`；`toWireQuery` 跳过 `undefined`、数组用逗号连接、键转 snake_case
  - `W0403-T7 非普通对象`：`Blob`、`FormData` 原样
  - `W0403-T8 类型`：`FromWire<gen.GraphRead>['registryHash']` 是 `string`；`FromWire<gen.Node>['params']` 是 `{ readonly [k: string]: unknown }`；`FromWire<gen.NodeDef>['params'][string]['ui']` 有 `showIf`；`EventOf<'node.state'>` 与 `OpOf<'set_param'>` 精确收窄
  - `W0403-T9 别名齐全`：扫描 `generated/types.ts` 导出的全部类型名，每个在 `types.ts` 都有同名别名；扫描 `generated/consts.ts`、`generated/types.ts` 常量对象与 `generated/tables.ts` 表，确认 `index.ts` 全部导出
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `W0403-T10 性能`：第 ⑪ 片 `W.11`（500 节点图 `fromWire` ≤ 5ms，vitest bench，`W.11` 收集）
- 允许使用的依赖：无第三方运行时依赖；测试用 `vitest`（`G.10` §3.4）；`manifest.yaml` / `aliases.yaml` 读取用测试内最小纯函数解析（<40 行，不新增依赖）。
- 禁止事项：`G.02.05` 全部（特别是 R1、R2）；另：不手写字段映射（只读 `WIRE_TYPES`）；不转换任何值；不在 `lib/protocol/` 以外提供转换函数。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §6.1 映射类的值是数组时逐项转换；§5.1 `payload`、`data` 在所有位置按结构 | `P.09` K234 |
| 2026-11-23 | 字段映射表改为按类型（`WIRE_TYPES`）：`fromWire`、`toWire` 带根类型名；§5.1、§6.1、§6.2、`FromWire<T>`、`W0403-T1`、`T2`、`T8` 相应改；补上漏掉的"变更记录"标题 | `P.09` K235 |
| 2026-11-26 | 状态改为"已审"；对齐已冻结的 `generated/{types,consts,tables,wire}.ts` 导出结构；实施卡按 `G.02.06-R24` 重写，`assemble.ts` 推到第 ⑩ 片 `W.04.05`，`W0403-T10` 移到 `W.11` | M1 第 ⑧ 片 `m1-web-base` 复查（`P.09` K300、K301） |
