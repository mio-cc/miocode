# W.04.01 REST 客户端

| 项 | 内容 |
|---|---|
| 编号 | W.04.01 |
| 类型 | 实施 |
| 上级 | W.04 协议层 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 设18 §8.4（Op 提交部分）；引09 §1（幂等）、§4（`HarnessClient`）；`B.03.01`–`B.03.05`；`P.09` K235、K306 |
| 最后修改 | 2026-11-27 |

## 1. 职责
`createRestClient`：把 store 的一次调用变成一次 `/api/v1` 请求——字段映射、幂等键、ETag 缓存、超时，再把响应转成 camelCase 返回，或把失败变成结构化的 `ApiError` / `NetError` 抛出；同时提供 ULID 生成和路径拼接。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 自动重试（任何方法、任何状态码） | 调用方：`W.05` 的提交队列、各 store 的刷新逻辑；本客户端每次调用只发一次请求 |
| 409 合并、提示文案、错误展示 | `W.05`、`W.07.10`、各面板（`G.13-R7`） |
| 判断服务断开多久、显示横幅 | `W.04.05`（本客户端只报告"成功收到响应 / 没有收到响应 / 401"） |
| SSE | `W.04.02` |
| 字段转换规则本身 | `W.04.03`（本客户端调用 `fromWire`、`toWire`、`toWireQuery`） |

## 3. 继承的上级约束
`W.04` §6.2、§6.4、§7；`W.03` §4.3；`W-R5`、`R10`；`W.01-R3`；`B.03.01` §4–§5；`B.03.02` §4–§5；`B.03.03`；`B.03.04` §4；`B.03.05`（cookie 鉴权、Origin 校验）；`B.04.06` §5（ETag）；`C.11` §2、§3；`G.04.04`；`G.13-R1`、`R4`；INV-22、INV-23。

## 4. 接口
```ts
// web/src/lib/protocol/client.ts
import type { Query, RestClient } from '@/state/deps';            // 形状以 W.03 §4.3 为准（仅类型）
import type { Connectivity } from './offline';
import type { ApiErrorCode, Ulid } from './types';                // K306：ApiErrorCode 来自 ./types（无 ./generated/errors）

export class ApiError extends Error {
  readonly status: number;            // HTTP 状态码
  readonly code: ApiErrorCode;        // C.11 §3；服务端新加的码原样保留（C.01-R18）
  readonly details?: unknown;         // 已 fromWire（W.04.03）
  readonly requestId?: string;        // 响应体 request_id，缺省取响应头 X-Request-Id
  readonly retryAfterMs?: number;     // 429：Retry-After 头（秒）或 details.retry_after_ms
}
export class NetError extends Error {
  readonly kind: 'network' | 'timeout' | 'aborted';
}
export function isApiError(e: unknown): e is ApiError;
export function isNetError(e: unknown): e is NetError;
export function errorReport(e: ApiError): string;   // "复制错误详情"：错误码 + request_id + 时间（UTC），不含 message 以外的内容（G.13-R4）

export function createRestClient(o: {
  net: Connectivity;
  buildVersion: string;
  onVersionMismatch?: (v: { server: string; client: string }) => void;
  fetch?: typeof fetch;
  timeoutMs?: number;                 // 缺省 35000：比服务端 30 秒处理时限多 5 秒（B.03 §3）
  etagCacheSize?: number;             // 缺省 50
}): RestClient;

// 路径拼接：插值部分一律 encodeURIComponent（ID、分支名、blob 引用 ws://sha256:…）
export function apiPath(s: TemplateStringsArray, ...v: readonly (string | number)[]): string;
// 例：client.get<RunView>(apiPath`/runs/${id}`)

// web/src/lib/protocol/ulid.ts
export function newUlid(now?: () => number): Ulid;   // 单调：同一毫秒内随机部分 +1（Crockford Base32，大写，26 位）
export function isUlid(s: string): s is Ulid;        // ^[0-9A-HJKMNP-TV-Z]{26}$
```

### 4.1 依赖
`W.04.03` 的 `fromWire`、`toWire`、`toWireQuery`；`W.04.05` 的 `Connectivity`（`reportOk`、`reportFailure`、`reportUnauthorized`）；生成类型 `ApiErrorCode`、`ErrorResponse`；浏览器 `fetch`、`AbortSignal.timeout`、`crypto.getRandomValues`。

## 5. 数据结构
- `ApiError`、`NetError` 是本节点私有的类；`W.03` §4.3 里是它们的结构类型（`Error & {…}`），两者兼容。
- ETag 缓存：`Map<string, { etag: string; value: unknown }>`，键是完整 URL（含查询串），按最近使用淘汰。

## 6. 行为

### 6.1 发出请求
1. **地址**：`'/api/v1' + path`。`path` 必须以 `/` 开头、不含 `?`（查询参数只能走 `query`）；开发模式下违反时抛错。
2. **查询参数**：`toWireQuery(query)`——跳过 `undefined`；键 camelCase → snake_case；数组用逗号连接（`B.03.02` §4）；布尔写 `true` / `false`；值原样，不再转换。
3. **请求头**：`Accept: application/json`；有 JSON 请求体时 `Content-Type: application/json; charset=utf-8`。不发任何自定义身份头（`G.04.04-R2`）；不发 `Authorization`（浏览器靠 `hx_session` cookie，`B.03.05` 第 2 步）。
4. **请求体**：普通对象 → `JSON.stringify(toWire(body))`；`FormData`、`Blob` 原样发送（导入、安装扩展包，`B.03.02` 的 50MB 限制由服务端判断）。
5. **POST 一律带 `Idempotency-Key`**（`B.03.04` §4）：`opts.idempotencyKey ?? newUlid()`。需要"重试也算同一次"的调用方（`W.05` 的提交、`W.03.04` 的 `start`）自己生成一个键并在每次重试时传同一个。
6. **fetch 选项**：`credentials: 'same-origin'`，`cache: 'no-store'`（缓存只用 §6.3 的自管缓存，避免和浏览器 HTTP 缓存叠加），`signal: AbortSignal.timeout(timeoutMs)`。

### 6.2 处理响应
| 结果 | 处理 |
|---|---|
| 收到任何响应（含 4xx、5xx） | `net.reportOk()`（服务还在） |
| 首次收到 `X-Anydoor-Version` | 与 `buildVersion` 不同 → `onVersionMismatch` 只调一次；`X-Schema-Version` 的主版本与生成常量里的图文档格式主版本不同时同样处理（`B.03.01` §5、`C.01-R21`） |
| 200、201、202 有响应体 | `fromWire(JSON)` 返回。202 的结构由调用方按字段区分（例：`POST /graphs/{id}/ops` 的 202 带 `proposalId`，`C.05.01` §4） |
| 204 或空响应体 | 返回 `undefined` |
| 304（ETag 命中） | 返回缓存里的值（同一个对象引用；调用方不得修改它） |
| 401 | `net.reportUnauthorized()`；抛 `ApiError{status:401, code:'unauthorized'}` |
| 其他 4xx、5xx | 解析 `{error: {code, message, details, request_id}}`（`C.11` §2）→ 抛 `ApiError`：`message` 用服务端给的中文（`G.13-R2`），`details` 经 `fromWire`。响应体不是这个结构（例如被代理截断）→ `code='internal'`、`message` 为空串 |
| 429 | 同上，另设 `retryAfterMs`（`Retry-After` 头优先） |
| `fetch` 抛 `TypeError`（连不上） | `net.reportFailure('rest')`；抛 `NetError{kind:'network'}` |
| 超时 | `net.reportFailure('rest')`；抛 `NetError{kind:'timeout'}` |
| 调用方中止 | 抛 `NetError{kind:'aborted'}`，不报告连接状态 |

### 6.3 ETag 缓存（`B.04.06` §5）
- 只对 GET：缓存里有这个 URL → 带 `If-None-Match`；响应 200 且带 `ETag` → 存 `fromWire` 之后的值；响应不带 `ETag` → 删掉这个 URL 的缓存项。
- 目前只有节点库（`/nodedefs`、`/nodedefs/{ref}`、`/types`）返回 `ETag`；其他接口自动不缓存，不需要逐个配置。
- 缓存只在内存，页面刷新即失效；不缓存 POST、PATCH、PUT、DELETE 的响应。

### 6.4 `getText`、`download`
- `getText(path, query)`：`Accept: */*`，返回 `response.text()`，不做字段映射（工作区原文 `GET /blobs/{ref}`，`B.04.03`）。
- `download(path, query)`：返回 `response.blob()`（导出图、导出数据）。
- 两者的错误处理同 §6.2。

### 6.5 `newUlid`
48 位毫秒时间戳 + 80 位随机数（`crypto.getRandomValues`）；同一毫秒内再次调用时随机部分加 1，保证同一页面里生成的 ID 严格递增（INV-23）。不引入第三方库（`G.10-R3`，约 40 行）。

## 7. 不变量
- 每次调用最多发一次请求，不自动重试。
- 每个 POST 都有 `Idempotency-Key`。
- 返回给调用方的对象全部是 camelCase（开放对象的键除外，`W.04.03`）；`ApiError.details` 同样。
- 请求、响应、错误对象都不写日志（`console.*`）；请求体里可能有密钥（`POST /providers` 的 `secret`，`B.04.07`），出错时也不打印（INV-22）。
- 本客户端不 import 任何 store 实例，只用 `@/state/deps` 的类型。

## 8. 错误处理
| 错误 | 触发 | 调用方看到 |
|---|---|---|
| `bad_request` 400 | 请求不合 schema（前端缺陷） | `ApiError`；`details.errors[{path, message}]`（`B.03.02` §7） |
| `unauthorized` 401 | token 失效、服务重启后换了 token | `ApiError`；同时 `ui.net='closed'`，`W.02` 显示整页说明 |
| `forbidden`、`node_locked`、`origin_rejected` 403 | 授权、锁、来源 | `ApiError`（`details` 见 `C.11` §3） |
| `not_found` 404 | 资源被删 | `ApiError` |
| `graph_conflict` 409 | 图版本冲突 | `ApiError`，`details.{head, missedOps, conflicts}`；由 `W.05` 处理 |
| `idempotency_mismatch` 409 | 同一个键配了不同的请求体（前端缺陷） | `ApiError` |
| `too_large` 413 | 请求体过大 | `ApiError`，`details.limit` |
| `estopped` 423 | 急停中 | `ApiError`（界面由急停横幅说明，`U.14.03` §2） |
| `rate_limited` 429 | 限流 | `ApiError.retryAfterMs` |
| 5xx | 服务端错误 | `ApiError`；`errorReport(e)` 给"复制错误详情"用 |
| 连不上、超时 | 服务关闭、休眠 | `NetError` |

## 9. 性能与资源
- 每次请求的额外开销（映射除外）≤ 0.2ms。
- ETag 缓存 ≤ 50 项；节点库完整列表一项约 200KB，合计 ≤ 5MB。
- 同时进行中的请求数不设上限（浏览器自己排队）；`W.01-R17` 已为 REST 留出 3 条以上的连接。

## 10. 验收标准
1. 所有 POST 都带 `Idempotency-Key`；调用方传入的键原样使用。
2. 查询参数和请求体的键都转成 snake_case；`params`、`ui`、`meta` 里的键不变（`W.04.03`）。
3. 节点库第二次请求带 `If-None-Match`，304 时返回与第一次相同的对象。
4. 每个错误码都得到对应的 `ApiError`；连不上得到 `NetError`；401 时连接状态变为 `closed`。
5. 前端代码里没有 `/api/v1` 以外的地址常量（`W.01-R3`）。

### 实施卡
- 要建 / 要改的文件：`web/src/state/deps.ts`、`web/src/env.d.ts`、`web/src/lib/protocol/ulid.ts`、`web/src/lib/protocol/ulid.test.ts`、`web/src/lib/protocol/client.ts`、`web/src/lib/protocol/client.test.ts`
- 说明：属于第 ⑩a 片 `m1-web-proto`（`W.04.05` → `W.04.01` → `W.04.02`，`P.09` K306）。`web/vite.config.ts` 已在第 ⑧ 片定义 `__HX_VERSION__`，本叶子建 `web/src/env.d.ts` 声明其全局类型；`web/src/state/deps.ts` 本叶子首建协议最小接口形状（`Query`/`RestClient`/`ApiError`/`NetError`/`StreamSpec`/`StreamState`/`StreamHandle`/`StreamClient`），`StateDeps`/`OpsFactory` 等由 10b `W.03.05` 补全；`client.ts` 按 K235/K306 维护 M1 路径 → `WireTypeName` 映射表（支持 `GraphRead`/`OpsRequest`/`OpsApplied`/`OpsProposed`/`GraphConflictDetails`/`OpRecordPage`/`RunStart`/`RunStarted`/`RunView`/`NodeSnapshot`/`NodeDetail`/`NodeDefItem[]`/`TypeItem[]`/`Model[]`/`Session`/`SessionPage`/`SessionCreate`/`SessionUpdate`/`SessionGraphAttach` 等），并对未登记的 M2–M4 路径按键转换且保留开放对象键（`params`/`ui`/`meta`/`kv`/`to`）原样。
- 不许碰的文件：`web/src/lib/protocol/generated/`、`web/src/lib/protocol/mapping.ts`、`web/src/lib/protocol/events.ts`、`web/src/lib/protocol/offline.ts`、`web/vite.config.ts`、`schema/`、`internal/`
- 函数签名：见 §4。
- 测试用例（假 `fetch`、假 `Connectivity`、假时钟）：
  - `W0401-T1 地址与方法`：`get('/runs', {sessionId: S, status: ['pending','running']})` → `GET /api/v1/runs?session_id=S&status=pending,running`；`path` 含 `?` 时开发模式抛错
  - `W0401-T2 幂等键`：`post` 不传键 → 请求头有合法 ULID；连续两次调用键不同；传 `{idempotencyKey: K}` → 头里是 `K`；`patch`、`put`、`del` 不带
  - `W0401-T3 请求体映射`：`post('/graphs/x/ops', {baseVersion: 3, branch: 'main', ops: [{id: U, kind:'set_param', payload:{node:N, key:'max_rounds', to:{a_b:1}}}]})` → 发出的 JSON 是 `base_version`，`payload.key`、`to` 里的 `a_b` 不变
  - `W0401-T4 响应映射`：`get('/graphs/x')` 响应 `{graph:{…}, registry_hash:'h', diags:[]}` → 返回 `{graph, registryHash, diags}`；节点 `params` 里的 `max_rounds` 不变
  - `W0401-T5 错误`：409 `{error:{code:'graph_conflict', details:{head:5, missed_ops:[…], conflicts:[]}, request_id:R}}` → `ApiError{status:409, code:'graph_conflict', details:{head:5, missedOps:[…], conflicts:[]}, requestId:R}`；响应体是 HTML → `code='internal'`
  - `W0401-T6 429`：`Retry-After: 2` → `retryAfterMs=2000`
  - `W0401-T7 连接状态`：`fetch` 抛 `TypeError` → `NetError('network')` 且 `reportFailure('rest')` 一次；任意 500 响应 → `reportOk()`；401 → `reportUnauthorized()`；中止 → `NetError('aborted')` 且不报告
  - `W0401-T8 超时`：假时钟推进 35 秒 → `NetError('timeout')`
  - `W0401-T9 ETag`：第一次 200 带 `ETag: "r1"` → 第二次请求带 `If-None-Match: "r1"`，返回 304 → 与第一次同一个对象；之后 200 不带 ETag → 缓存项删除；第 51 个 URL 挤掉最久没用的
  - `W0401-T10 204`：`del` 收到 204 → `undefined`
  - `W0401-T11 版本不一致`：两次响应都带不同的 `X-Anydoor-Version` → `onVersionMismatch` 只调用一次
  - `W0401-T12 原文与下载`：`getText` 不做映射；`download` 返回 `Blob`；错误时同样抛 `ApiError`
  - `W0401-T13 ULID`：同一毫秒生成 1000 个严格递增、格式合法；`isUlid('01J…小写')` 为 false
  - `W0401-T14 apiPath`：`` apiPath`/blobs/${'ws://sha256:ab'}` `` → `/blobs/ws%3A%2F%2Fsha256%3Aab`
  - `W0401-T15 不泄露`：`post('/providers', {secret:'sk-xxx'})` 返回 500 → 测试期间 `console.*` 没有被调用，`ApiError` 的任何字段里没有 `sk-`
- 允许使用的依赖：无第三方运行时依赖；测试用 `vitest`、`jsdom`（`G.10` §3.4）。
- 禁止事项：`G.02.05` 全部（特别是 R1、R3、R20、R21、R28）；另：不自动重试；不弹提示、不调用 `ui.notify`；不发 `X-Actor` / `X-Mandate` / `Authorization` 头；不在 localStorage、sessionStorage 存任何响应；不打印请求体或响应体。
- 完成标志：`G.14` 全部条件；§10 五条验收通过，`relay slice m1-web-proto` ①–⑦ 全部通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-27 | 状态改为"已审"；§4 `ApiErrorCode` 改从 `./types` 导入；实施卡按 `G.02.06-R24` 重写，首建 `web/src/state/deps.ts` 与 `web/src/env.d.ts`，说明按类型映射表 | M1 第 ⑩a 片 `m1-web-proto` 复查（`P.09` K306） |
