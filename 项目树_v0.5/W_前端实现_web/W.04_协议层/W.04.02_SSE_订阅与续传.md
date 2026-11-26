# W.04.02 SSE 订阅与续传

| 项 | 内容 |
|---|---|
| 编号 | W.04.02 |
| 类型 | 实施 |
| 上级 | W.04 协议层 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 设18 §8.4（运行事件流）；引09 §3.5（断线重连）、§4（`subscribe`）；`B.05.02`–`B.05.04`；`C.06.01` §4；`P.09` K83、K86、K300、K306 |
| 最后修改 | 2026-11-27 |

## 1. 职责
`createStreamClient`：打开三种 SSE 流（会话流、图协同流、运行流），按帧解析、转 camelCase、按 `seq` 去重后交给调用方；断线自动重连并续传；处理控制帧 `resync`、`shutdown`；保证同时最多 3 条连接、每种流最多 1 条。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 事件交给哪个 store | `W.03` §6.2 事件路由 |
| 图协同流重连后补齐缺失的版本（`GET /graphs/{id}/ops?since_version=`） | `W.05`（本节点只在 `onOpen` 里给出 `X-Graph-Version`，`C.06.03-R1`） |
| 收到 `resync` 后拉快照 | 调用方（run：`W.03.04`；会话：`W.03.05`；图：`W.05` 的 `reload`） |
| 什么时候开流、关流 | `W.03.05` 工作区、`W.03.04` 的 `attach` / `detach` |
| 判断服务断开多久、写 `ui.net` | `W.04.05`（本节点只报告） |
| 高频事件按帧合并 | `W.06.15`（本节点每条事件同步回调一次） |

## 3. 继承的上级约束
`W.04` §6.3、§7；`W.03` §4.3；`W.01-R17`；`B.05-R2`、`R3`；`B.05.02` §5；`B.05.03` §4；`B.05.04` §4、§5；`C.06` §5（P / S / E 级）；`C.06.01-R1`、§4；`C.06.03-R1`；`C.01-R18`；`G.02.05-R3`；`U.14.05`；`P.09` K73。

## 4. 接口
```ts
// web/src/lib/protocol/events.ts
import type { StreamClient } from '@/state/deps';     // 形状以 W.03 §4.3 为准
import type { Connectivity } from './offline';

export function createStreamClient(o: {
  net: Connectivity;
  fetch?: typeof fetch;
  now?: () => number;
  watchdogMs?: number;          // 缺省 35000：服务端每 15 秒一次心跳（B.05.03），漏两次就当连接已死
  backoffMs?: readonly number[];  // 缺省 [500, 1000, 2000, 4000, 8000, 10000]，之后一直 10000；每次 ±20% 抖动
}): StreamClient & { openCount(): number; dispose(): void };

// web/src/lib/protocol/sse.ts —— 纯函数，按 WHATWG SSE 规范解析
export type SseFrame = { id?: string; event: string; data: string };   // event 缺省为 'message'
export function createSseParser(onFrame: (f: SseFrame) => void, onBytes: () => void): (chunk: string) => void;
```

### 4.1 三种流的地址（`B.05.04` §4）
| `StreamSpec.kind` | 地址 | 续传参数 |
|---|---|---|
| `session` | `/api/v1/sessions/{id}/stream` | `?since=<seq>` |
| `graph` | `/api/v1/graphs/{id}/stream?branch=<名>` | 无（重连后按 `X-Graph-Version` 补齐，`C.06.03-R1`） |
| `run` | `/api/v1/runs/{id}/events` | `?since=<seq>` |

### 4.2 依赖
`W.04.03` 的 `fromWire`；`W.04.05` 的 `Connectivity`（`reportOk`、`reportFailure`、`reportUnauthorized`、`onOnline`、`state`）；生成常量 `SseControl.Resync`、`SseControl.Shutdown`（`C.06.01` §4）、`Ev.RunStatus`、`RunStatus.Done | Failed | Cancelled`（`C.14-R6`）；浏览器 `fetch`、`ReadableStream`、`TextDecoderStream`、`document.visibilityState`。

## 5. 数据结构
本节点私有：每条连接一个 `Conn = { spec; handlers; lastSeq: number; attempt: number; state: StreamState; ending: boolean; abort: AbortController; lastByteAt: number }`。事件结构用生成类型（经 `fromWire` 后的 `RunEvent`、`GraphEvent`、`SessionEvent`）。

## 6. 行为

### 6.1 为什么用 `fetch` 读流，不用 `EventSource`（`P.09` K83）
1. 事件用 `event:` 字段带名字（`C.06.01` §4）；`EventSource` 只能按名字逐个 `addEventListener`，收不到不认识的新事件名（违背 `C.01-R18`）。
2. 图协同流要读响应头 `X-Graph-Version`（`C.06.03-R1`），`EventSource` 读不到响应头。
3. `EventSource` 遇到 401 / 404 只给一个没有状态码的 `error` 事件，区分不了"凭证失效""资源不存在""网络断了"；它的自动重连时机也不受控（休眠唤醒后可能长时间不重连）。

### 6.2 打开
1. `open(spec, h)`：同一个客户端里已有同种（`kind` 相同）的连接 → 先关闭旧的（旧句柄收到 `onState('ended')`），再开新的。这样任何时候每种流 ≤ 1 条、合计 ≤ 3 条（`W.01-R17`、`B.05.04` §5：切换运行时必须关闭旧的运行流）。
2. `lastSeq` 初始为 `spec.since ?? 0`；`onState('connecting')`。
3. `fetch(地址, { headers: { Accept: 'text/event-stream' }, credentials: 'same-origin', cache: 'no-store', signal })`；`lastSeq > 0` 且该流支持续传时带 `?since=lastSeq`（不用 `Last-Event-ID` 头，行为只有一种）。
4. 响应：

| 响应 | 处理 |
|---|---|
| 200 且 `Content-Type` 以 `text/event-stream` 开头 | `net.reportOk()`；`attempt = 0`；`onState('open')`；`onOpen({graphVersion: X-Graph-Version 转数字（只有图协同流有）, reconnected: 这不是本句柄的第一次连接})`；开始读 |
| 401 | `net.reportUnauthorized()`；不再重连；`onState('ended')` |
| 404 | `onError(ApiError not_found)`；不再重连；`onState('ended')`（`B.05.04` §7：资源不存在在升级为 SSE 之前返回） |
| 403 | `onError(ApiError)`；不再重连（`origin_rejected` 是配置问题，重连没有用） |
| 其他 4xx、5xx | `net.reportOk()`（服务还在）；按 §6.4 退避后重连 |
| `fetch` 抛错（连不上） | `net.reportFailure('stream')`；按 §6.4 退避后重连 |

### 6.3 读帧
1. 字节流经 `TextDecoderStream` 交给 `createSseParser`：按行切分（`\n`、`\r\n`、`\r`），`:` 开头是注释（心跳 `: ping`），`id` / `event` / `data` 字段，多行 `data` 用 `\n` 连接，空行分发一帧；`retry` 字段忽略（退避由 §6.4 决定）。任何字节到达都更新 `lastByteAt`。
2. 控制帧（不是事件，没有信封，`C.06.01` §4）：
   - `SseControl.Resync`：见 §6.5。
   - `SseControl.Shutdown`：服务端正在关闭（`B.05.03` §4 的关闭帧）→ 断开本连接、`net.reportFailure('shutdown')`，按 §6.4 重连。
3. 其他帧：`JSON.parse(data)` → `fromWire` → 得到事件 `ev`。`JSON.parse` 失败：`console.warn` 一次，跳过这一帧。
4. 去重（会话流、运行流）：`ev.seq > 0` 且 `ev.seq ≤ lastSeq` → 丢弃（续传交界处的重复，`B.05.02` §6）；否则 `ev.seq > 0` 时 `lastSeq = ev.seq`。`seq = 0` 是 E 级事件，不去重、不改 `lastSeq`。图协同流不按 `seq` 去重（Op 类事件的 `id` 是图版本号，`W.05` 按版本号判断）；`lastSeq` 记最后一个带 `id` 的帧的值，只用于 `handle.lastSeq()`。
5. 调用 `h.onEvent(ev)`：同步、严格按到达顺序，一次一条；回调抛出的异常用 `console.error` 记下后继续处理下一条（一个 store 的缺陷不让整条流停下）。不认识的 `kind` 照样交出去（`C.01-R18`）。
6. 运行流：交出一条 `kind = Ev.RunStatus` 且 `data.to` 是 `done` / `failed` / `cancelled` 的事件后，`ending = true`。之后服务端关闭连接（`B.05.04` §5：终态后 5 秒）时不再重连，`onState('ended')`。

### 6.4 断线与重连
| 触发 | 处理 |
|---|---|
| 读流时出错、服务端关闭连接（`ending = false`） | `net.reportFailure('stream')`；`onState('connecting')`；等待 `backoffMs[attempt]`（±20% 抖动）后按 §6.2 第 3 步重连，`attempt + 1` |
| 看门狗：`now - lastByteAt > watchdogMs` | 当作连接已死：中止 `fetch`，同上 |
| 页面从隐藏变为可见、`pageshow`（休眠唤醒） | `now - lastByteAt > 20000` 的连接立即重连，不等看门狗 |
| `net.onOnline`（服务恢复） | 正在等待退避的连接立即重连 |
| `net.state() === 'closed'`（401） | 所有连接停止，不再重连，`onState('ended')` |
| 调用方 `close()` | 中止 `fetch`、清掉定时器；不再调用任何回调（包括 `onState`） |
重连时续传位置是本句柄的 `lastSeq`；P、S 级事件由服务端补发，E 级事件不补（`C.06` §5），调用方在 `onOpen({reconnected: true})` 里自己对齐（`W.03` §6.2）。

### 6.5 `resync`（`B.05.02` 第 3 步）
1. 收到 `resync` 控制帧：断开当前连接（不报告连接状态，这不是故障）。
2. 立即重连，**不带 `since`**（只收实时）。
3. 新连接返回 200 后：先 `onOpen({…, reconnected: true})`，再 `onResync()`。
4. 调用方在 `onResync` 里拉快照（运行：`GET /runs/{id}/nodes`；会话：`GET /sessions/{id}/messages`；图：`GET /graphs/{id}`），用快照里的 `seq` 更新自己的续传位置。实时流在快照请求发出之前就已经接上，所以快照与实时之间没有空洞；两者重叠的部分由调用方按 `seq`（运行）或 ID（消息）去重（`W.03.04` §6.2、`W.03.05` §6.2）。
5. `lastSeq` 保持本句柄见过的最大值；不需要调用方回填。

## 7. 不变量
- 同一个 `StreamClient` 同时打开的连接每种 ≤ 1 条、合计 ≤ 3 条。
- `onEvent` 不会并发调用；同一条流里事件的顺序与服务端发送顺序一致。
- 会话流、运行流里同一个 `seq`（> 0）的事件最多交出一次；`lastSeq` 单调不减。
- `close()` 之后不再有任何回调。
- `resync` 后的 `onResync` 一定在新连接已经打开之后才调用。
- 本节点不在任何地方保存事件内容（只保存 `lastSeq`）。

## 8. 错误处理
| 错误 | 触发 | 调用方看到 |
|---|---|---|
| 网络断开、服务关闭、看门狗超时 | 服务停止、休眠 | `onState('connecting')`；恢复后 `onOpen({reconnected: true})` |
| 401 | 凭证失效 | `onState('ended')`；`ui.net='closed'` |
| 404 | 运行、图、会话不存在 | `onError(ApiError)`、`onState('ended')` |
| 403 | 来源被拒 | `onError(ApiError)`、`onState('ended')` |
| 帧不是合法 JSON | 服务端缺陷 | 不可见；`console.warn` |
| `onEvent` 抛异常 | 前端缺陷 | 不可见；`console.error`，流继续 |
| 打开第二条同种流 | 切换运行、切换图 | 旧句柄 `onState('ended')` |

## 9. 性能与资源
- 解析 + 映射 + 去重：每条事件 ≤ 0.1ms；1000 条 / 秒持续 10 秒，主线程占用 ≤ 15%（运行流最高峰：200 节点 × S 级每秒 4 条，`C.06` §5）。
- 每条连接常驻内存 ≤ 64KB（解码缓冲）；不缓存事件。
- 看门狗定时器：所有连接共用一个，每 5 秒检查一次。

## 10. 验收标准
1. 运行流断开期间服务端产生 100 条事件，重连后全部收到、无重复、顺序正确（`B.05.02` §8 验收 1 的前端一侧）。
2. 收到 `resync`：新连接不带 `since`；`onResync` 在新连接打开后调用；之后的事件照常交出。
3. 运行进入终态、服务端 5 秒后关流：不再重连，`onState('ended')`。
4. 切换运行：旧运行流被关闭；开发者工具里 SSE 连接始终 ≤ 3（`W.03` §10 验收 3）。
5. 新事件名（schema 里没有的 `kind`）照样交给 `onEvent`，不崩溃。

### 实施卡
- 要建 / 要改的文件：`web/src/lib/protocol/sse.ts`、`web/src/lib/protocol/sse.test.ts`、`web/src/lib/protocol/events.ts`、`web/src/lib/protocol/events.test.ts`、`web/src/lib/protocol/assemble.ts`、`web/src/lib/protocol/assemble.test.ts`、`web/src/lib/protocol/index.ts`
- 说明：属于第 ⑩a 片 `m1-web-proto` 最后一个叶子（`W.04.05` → `W.04.01` → `W.04.02`，`P.09` K300、K306）；本叶子同步落齐 `assemble.ts`（`createProtocol`）并在 `web/src/lib/protocol/index.ts` 补齐 `assemble`、`client`、`ulid`、`events`、`offline` 全部对外导出，同时确保 `W0403-T9` 继续全绿。
- 不许碰的文件：`web/src/lib/protocol/generated/`、`web/src/lib/protocol/client.ts`、`web/src/lib/protocol/mapping.ts`、`web/src/lib/protocol/offline.ts`、`web/src/state/`（只 import `deps.ts` 的类型）、`schema/`、`internal/`
- 函数签名：见 §4；`createProtocol` 见 `W.04` §4.2。
- 测试用例（假 `fetch` 返回可控的 `ReadableStream`、假 `Connectivity`、假时钟）：
  - `W0402-T1 解析`：一帧里多行 `data`、`\r\n` 换行、注释行、跨 chunk 切开的帧、没有 `event` 的帧（`message`）都解析正确
  - `W0402-T2 映射与回调`：`data` 里的 `run_id`、`cause_seq` → `runId`、`causeSeq`；`data.data` 里节点 `params` 的键不变
  - `W0402-T3 去重`：运行流先后收到 seq 5、6、6、4、7 → 交出 5、6、7；`seq=0` 的 E 级事件都交出且不改 `lastSeq`
  - `W0402-T4 续传`：读到 seq 57 后断开 → 退避后以 `?since=57` 重连；`onOpen({reconnected: true})`
  - `W0402-T5 图协同流`：响应头 `X-Graph-Version: 42` → `onOpen({graphVersion: 42, reconnected: false})`；重连地址不带 `since`
  - `W0402-T6 resync`：收到 `event: resync` → 中止旧请求、新请求不带 `since`、新连接 200 后依次调用 `onOpen`、`onResync`
  - `W0402-T7 终态`：交出 `run.status{to:'done'}` 后服务端关流 → 不重连，`onState('ended')`；没有终态时关流 → 重连
  - `W0402-T8 状态码`：401 → `reportUnauthorized`、不重连；404 → `onError(code='not_found')`、不重连；503 → 退避重连且 `reportOk`
  - `W0402-T9 退避`：连续失败的等待时间依次落在 500、1000、2000、4000、8000、10000、10000ms 的 ±20% 内；`onOnline` 触发时立即重连
  - `W0402-T10 看门狗`：35 秒没有任何字节 → 重连；每 15 秒一次 `: ping` → 不重连
  - `W0402-T11 唤醒`：`visibilitychange` 到可见且 25 秒没有字节 → 立即重连
  - `W0402-T12 每种一条`：已开运行流 A 再开运行流 B → A 被中止且 `onState('ended')`；`openCount()` ≤ 3
  - `W0402-T13 close`：`close()` 后推入的数据不触发任何回调，定时器全部清掉
  - `W0402-T14 回调异常`：`onEvent` 对第 2 条抛错 → 第 3 条照常交出
  - `W0402-T15 未知事件`：`event: foo.bar` 的合法信封 → 交给 `onEvent`
  - `W0402-T16 shutdown`：收到 `event: shutdown` → `reportFailure('shutdown')` 并退避重连
  - `W0402-T17 协议组装`：`createProtocol` 组装后的 `client`/`streams`/`net` 共用同一个 `Connectivity`，且 `@/lib/protocol` 入口导出完整
- 允许使用的依赖：无第三方运行时依赖；测试用 `vitest`、`jsdom`（`G.10` §3.4）。
- 禁止事项：`G.02.05` 全部（特别是 R3：控制帧名、事件名用生成常量）；另：不使用 `EventSource`；不用 `Last-Event-ID` 头；不在本节点缓存或重放事件内容；不在 `onEvent` 之外改调用方的状态；`close()` 后不调用回调。
- 完成标志：`G.14` 全部条件；§10 五条验收通过，`relay slice m1-web-proto` ①–⑦ 全部通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-27 | 状态改为"已审"；实施卡按 `G.02.06-R24` 重写，纳入 `assemble.ts` 与 `index.ts` 完整导出并补 `W0402-T17` | M1 第 ⑩a 片 `m1-web-proto` 复查（`P.09` K300、K306） |
