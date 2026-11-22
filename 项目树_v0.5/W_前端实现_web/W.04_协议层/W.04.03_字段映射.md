# W.04.03 字段映射

| 项 | 内容 |
|---|---|
| 编号 | W.04.03 |
| 类型 | 实施 |
| 上级 | W.04 协议层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01 §3；`G.04.02` §2；`C.01-R4`、`R19`；`C.14` §3；`P.09` K84 |
| 最后修改 | 2026-11-23 |

## 1. 职责
在前端唯一的一处把服务端的 snake_case 字段名转成 camelCase（进），把 camelCase 转回 snake_case（出），同时保证开放对象、无类型的值、以数据为键的映射原样不动；并提供与运行时转换一一对应的类型 `FromWire<T>`，以及 `@/lib/protocol` 导出的全部 camelCase 类型别名。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 决定哪些字段是开放对象、哪些是映射 | `tools/gen` 从 schema 计算后写进 `generated/wire.ts`（`C.14-R8`）；本节点只读这张表 |
| 转换字段的值（枚举值、事件名 `kind`、ID、时间字符串） | 不转：值一律原样（`C.01-R5`） |
| 时间、金额、时长的格式化 | `W.10` |
| 校验数据是否符合 schema | 服务端（`B.03.02` §5）；前端测试用 `ajv` 校验夹具（`W.04.04` §4） |

## 3. 继承的上级约束
`W.04` §5、§7；`W.03` §5；`W.01-R12`；`G.04.02` §2；`C.01-R4`、`R5`、`R19`；`C.14` §3、`R8`、`R9`；`B.03.02` §4（可选字段省略、不写 `null`）；INV-17。

## 4. 接口
```ts
// web/src/lib/protocol/mapping.ts
import { OPAQUE_KEYS, MAP_KEYS, type OpaqueKey, type MapKey } from './generated/wire';

export function fromWire<T>(v: unknown): T;          // snake_case → camelCase（深拷贝；输入不被修改）
export function toWire(v: unknown): unknown;         // camelCase → snake_case（深拷贝）
export function toWireQuery(q: Query): URLSearchParams;   // 查询参数：键转 snake_case，值原样（W.04.01 §6.1）
export function camelKey(k: string): string;         // 'cost_micros' → 'costMicros'（带缓存）
export function snakeKey(k: string): string;         // 'costMicros' → 'cost_micros'（带缓存）

// 类型：与 fromWire 的运行时行为逐项对应
type CamelKey<S extends string> = S extends `${infer H}_${infer T}` ? `${H}${Capitalize<CamelKey<T>>}` : S;
export type FromWire<T> =
  T extends string | number | boolean | null | undefined ? T :            // 含品牌类型 Ulid
  T extends readonly (infer E)[] ? readonly FromWire<E>[] :
  T extends object ? {
    [K in keyof T as K extends string ? CamelKey<K> : K]:                     // 字段名一律转换
      K extends OpaqueKey ? T[K] :
      K extends MapKey ? { readonly [k: string]: FromWire<T[K][keyof T[K]]> } :
      FromWire<T[K]>;
  } : T;

// web/src/lib/protocol/types.ts —— 别名（节选；完整清单见 §5）
import type * as gen from './generated';
export type Graph = FromWire<gen.Graph>;
export type Node = FromWire<gen.Node>;
export type Op = FromWire<gen.Op>;
export type RunEvent = FromWire<gen.RunEvent>;
// …

// web/src/lib/protocol/index.ts —— 唯一入口（W.04.04-R1）
export * from './types';
export { Ev, OpKind, ErrCode, DiagCode, Act, SseControl, RunStatus /* …生成常量 */ } from './generated/consts';
export type Page<T> = { items: readonly T[]; nextCursor?: string };      // B.03.02 §4
export { createProtocol, type Protocol } from './assemble';
export { createRestClient, ApiError, NetError, isApiError, isNetError, errorReport, apiPath } from './client';
export { newUlid, isUlid } from './ulid';
export { createStreamClient } from './events';
export { createConnectivity, bindNet, type Connectivity } from './offline';
export { fromWire, toWire } from './mapping';
```
`createProtocol` 放在 `lib/protocol/assemble.ts`（`W.04` §4.2 的组装函数，十几行）。

### 4.1 依赖
生成物 `generated/wire.ts`（`OPAQUE_KEYS`、`MAP_KEYS` 及对应的字面量联合类型）、`generated/*.ts`（类型）、`generated/consts.ts`（常量）。

## 5. 数据结构
### 5.1 三类位置（`generated/wire.ts`，`C.14-R8`）
| 类 | 从 schema 怎么判定 | 运行时 | 例子（以生成结果为准） |
|---|---|---|---|
| 不透明 `OPAQUE_KEYS` | 该字段的 schema 是开放对象（`C.14` §3 映射为 `Record<string, unknown>` 的），或没有类型约束（`{}`、只有 `description`） | 字段名照常转换，**值整体原样**，不进入 | `params`、`meta`、`ui`、`kv`、`details`、`to`、`from`、`value`、`inputs`、`budget`、`old`、`new` |
| 映射 `MAP_KEYS` | 只有 `additionalProperties: <schema>`、没有 `properties` 的对象：键是数据（ID、模型名、`tmp:N`） | 字段名照常转换；**值里的键原样**，每个值按其 schema 继续转换 | `orchestrator_effort`、`decisions`、`op_reasons`、`id_map` |
| 结构 | 其他对象 | 键转换，值递归 | `graph`、`root`、`children`、`payload`、事件的 `data` |
- 同一个字段名在不同对象里分类不同时，按"不透明 > 映射 > 结构"取最保守的一种，全前端一致；生成器把这类字段名列在 `wire.ts` 的注释里（`C.14-R8`）。例：`to` 在 `set_param` 里是参数值（无类型），在 `set_node_ui` 里是 `NodeUi`，统一按不透明处理——后者的键本来就没有下划线，结果相同。
- 判别联合里按 `if/then` 收窄的字段（Op 的 `payload`、事件的 `data`）属于结构，不因外层信封里写的是 `{type: object}` 就算不透明（`C.14-R1`）。

### 5.2 别名清单（`types.ts`）
- 每个 schema 里的 `$defs` 和顶层 `title` 都有一个同名别名：`Graph`、`Subgraph`、`Node`、`Edge`、`Note`、`NodeUi`、`PortRef`、`Op`、`OpTarget`、`OpKind`（类型）、`Diag`、`GraphPatch`、`Proposal`、`ProposalPreview`、`Mandate`、`Session`、`Message`、`MessageBlock`、`Selection`、`RunEvent`、`GraphEvent`、`SessionEvent`、`RunStatus`、`NodeState`、`Loc`、`Iter`、`Actor`、`ActorKind`、`Ulid`、`Timestamp`、`NodeDef`、`NodeDefSummary`、`TypeDef`、`Assign`、`Settings`、`Model`、`ErrorResponse`、`ApiErrorCode`，以及 `api.schema.json` 的全部结构（`W.04.04` §3.5）。
- 事件的单个分支用工具类型取：`EventOf<'node.state'>` = `Extract<RunEvent, { kind: 'node.state' }>`；Op 同理 `OpOf<'set_param'>`。
- 别名由 `types.ts` 手写一行一个（只是 `FromWire<gen.X>`，不是结构定义，不违反 `G.02.05-R2`）；新增 schema 定义时在同一个提交里补一行，`W0403-T9` 检查有没有漏。

## 6. 行为
### 6.1 `fromWire`（进）
1. 原始值（字符串、数字、布尔、`null`）原样返回。
2. 数组：逐项 `fromWire`。
3. 对象：对每个键 `k`，输出键一律是 `camelKey(k)`（`k` 是 schema 字段名）；值按 `k` 的类别（`wire.ts` 里存的是 snake_case 名）：
   - `k ∈ OPAQUE_KEYS` → 值原样（同一个引用，不复制）。
   - `k ∈ MAP_KEYS` → 值是一个新对象：键原样，每个值 `fromWire`。
   - 否则 → 值 `fromWire`。
4. 只处理普通对象（原型是 `Object.prototype` 或 `null`）；其他对象（`Blob`、`Date`…）原样返回。

### 6.2 `toWire`（出）
与 §6.1 对称：输出键 `snakeKey(k)`，再按这个 snake_case 名查类别。值为 `undefined` 的键删掉（`B.03.02` §4：可选字段省略）；`null` 保留（`set_mandate{to: null}`、`set_subgraph_ref{to: null}` 有意义，`C.05.02`）。

### 6.3 键的转换
- `camelKey`：每个 `_` 加其后一个字符变成那个字符的大写：`registry_hash` → `registryHash`，`l3_skip_human` → `l3SkipHuman`。
- `snakeKey`：每个大写字母变成 `_` + 小写：`registryHash` → `registry_hash`。
- 往返要求：schema 里每个字段名 `k` 都满足 `snakeKey(camelKey(k)) === k`（`C.01-R4` 规定只用小写字母、数字、下划线；生成器另外拒绝"下划线后面跟数字"和连续下划线这两种无法往返的写法，`C.14-R9`）。
- 两个函数各带一个 `Map` 缓存（字段名有限，最多几千个）。

### 6.4 开放对象里的数据怎么用
`params`、`meta`、`ui`、`kv` 的键在前端就是服务端的原样（例如参数名 `max_rounds`）。读写它们用字符串键（`node.params['max_rounds']`），不转换、不补默认值；改其中一项时整体复制后改那一项，未知键原样保留（`C.01-R19`、`W.04.04-R6`）。

## 7. 不变量
- 对 `schema/examples/` 下每个合法示例 `x`：`toWire(fromWire(x))` 与 `x` 深相等（往返无损）。
- 不透明位置的值在 `fromWire` / `toWire` 前后是同一个引用。
- `FromWire<T>` 与 `fromWire` 的结果一致：类型测试里对每个示例 `expectTypeOf(fromWire<FromWire<gen.X>>(x))` 能通过，且结果的键与类型的键逐个相同。
- 本节点之外不出现第二套 snake_case ↔ camelCase 转换。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 输入里有循环引用 | 不会出现（输入来自 `JSON.parse`）；不做检测 |
| 键不符合 `C.01-R4`（如大写、连字符，可能来自不透明位置以外的旧数据） | `camelKey` 原样返回不认识的部分；不抛错 |
| `wire.ts` 与 schema 不一致 | CI 的 `make gen && git diff --exit-code` 拦住（`G.16-R3`） |

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
- 要建 / 要改的文件：`web/src/lib/protocol/mapping.ts`、`web/src/lib/protocol/mapping.test.ts`、`web/src/lib/protocol/mapping.test-d.ts`（类型测试，`vitest --typecheck`）、`web/src/lib/protocol/types.ts`、`web/src/lib/protocol/index.ts`、`web/src/lib/protocol/assemble.ts`。
- 不许碰的文件：`web/src/lib/protocol/generated/`（含 `wire.ts`，由 `tools/gen` 生成）、`client.ts`、`events.ts`、`offline.ts`、`web/src/state/`、`schema/`、`tools/gen/`（生成器另由 `C.14` 的实施任务改）。
- 函数签名：见 §4。
- 测试用例：
  - `W0403-T1 往返`：遍历 `schema/examples/**/*.json`（含 `ops/`、`events/`），每个 `toWire(fromWire(x))` 深相等
  - `W0403-T2 不透明`：`{params:{max_rounds:3, aB:{c_d:1}}}` → `params` 原样且是同一引用；`set_param` 的 `to:{a_b:1}` 原样
  - `W0403-T3 映射`：`{orchestrator_effort:{gpt_4o:'high'}}` → `{orchestratorEffort:{gpt_4o:'high'}}`（内部键原样）；`{decisions:{'01JX…':'accepted'}}` 的 ULID 键原样；`{id_map:{'tmp:1':'01J…'}}` → `{idMap:{'tmp:1':'01J…'}}`；`toWire` 反过来还原
  - `W0403-T4 判别联合`：`run-event` 示例里 `data.cause_seq`、`data.exec_key` 转换；`op` 示例里 `payload.node_ids`、`new_id` 转换
  - `W0403-T5 键往返`：生成物里出现的全部字段名 `snakeKey(camelKey(k)) === k`
  - `W0403-T6 toWire 空值`：`{a: undefined, b: null}` → `{b: null}`
  - `W0403-T7 非普通对象`：`Blob`、`FormData` 原样
  - `W0403-T8 类型`：`FromWire<gen.Graph>['registryHash']` 不存在、`FromWire<gen.GraphRead>['registryHash']` 是 `string`；`FromWire<gen.Node>['params']` 是 `Record<string, unknown>`
  - `W0403-T9 别名齐全`：脚本列出 `generated/` 导出的全部类型名，每个在 `types.ts` 都有同名别名
  - `W0403-T10 性能`：500 节点图 `fromWire` ≤ 5ms（vitest bench，`W.11` 收集）
- 允许使用的依赖：无第三方运行时依赖；测试用 `vitest`、`ajv`（`G.10` §3.4）。
- 禁止事项：`G.02.05` 全部（特别是 R1、R2）；另：不手写不透明 / 映射字段名单（只读 `wire.ts`）；不转换任何值；不在 `lib/protocol/` 以外提供转换函数。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。
