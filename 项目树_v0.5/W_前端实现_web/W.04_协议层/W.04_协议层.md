# W.04 协议层

| 项 | 内容 |
|---|---|
| 编号 | W.04 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | W.04.01 REST 客户端、W.04.02 SSE 订阅与续传、W.04.03 字段映射、W.04.04 生成类型使用规则、W.04.05 离线与重连 |
| 状态 | 草稿 |
| 素材 | 设18 §8（按 Next.js + EventSource 写的旧版，只作参考，`P.09` K9）；引09 §1、§3.5、§4；引01 §3、§4；`P.09` K73、K80、K83–K86、K91 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`web/src/lib/protocol/`：前端和本机 `anydoor` 之间的全部通信——REST 客户端、三条 SSE 流的订阅与续传、snake_case ↔ camelCase 字段映射、生成类型的导出与使用规则、连接状态检测。对上只提供 `W.03` §4.3 规定的形状（`RestClient`、`ApiError`、`NetError`、`StreamClient`）和 `@/lib/protocol` 导出的 camelCase 类型与常量。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 什么时候请求、结果存到哪、失败了界面怎么变 | `W.03` 各 store 的 action |
| Op 队列、409 版本冲突的本地合并与合并提示 | `W.05`（本层只把 409 作为 `ApiError` 抛出，`G.13-R7`） |
| 横幅、提示、整页说明的显示和文案 | `W.07.10`、`W.02`（本层只写 `ui.net`，不弹任何提示） |
| 文案 | `W.10`（`lib/protocol` 不依赖 `lib/i18n`，`W.01-R5`） |
| 接口路径、请求响应结构、错误码、事件的定义 | `B.03`–`B.05`、`C`（本层只用生成的类型和常量，INV-17） |
| 生成 `generated/` 下的文件 | `tools/gen`（`G.16`、`C.14`）；本层不手写、不手改（`G.02.05-R1`） |
| 本机鉴权（`/?t=` 换 cookie） | `B.03.05`（服务端完成；浏览器自动带 cookie） |

## 3. 继承的上级约束
`W-R5`、`R7`、`R10`、`R12`、`R13`；`W.01-R3`、`R5`、`R12`、`R13`、`R17`；`B.03`（中间件顺序）及 `B.03.01`–`B.03.05` 全部；`B.05-R2`、`R3`；`B.05.02`、`B.05.03`、`B.05.04`；`C.01-R4`、`R18`、`R19`；`C.06.01-R1`、§4；`C.06.03-R1`；`C.11` §2、§3；`C.14`；`G.04.02` §2；`G.04.04`；`G.13-R1`、`R7`；`G.16`；INV-17、INV-21、INV-22、INV-23；`U.14.05`；`P.09` K73、K80。

## 4. 接口

### 4.1 文件与归属
| 文件 | 叶子 | 内容 |
|---|---|---|
| `lib/protocol/index.ts` | `W.04.03` | 唯一的对外入口：camelCase 类型别名、生成的常量、`Page<T>`、下面各文件的公开函数（`W.04.04-R1`） |
| `lib/protocol/types.ts` | `W.04.03` | `export type Graph = FromWire<gen.Graph>` 这类别名 |
| `lib/protocol/mapping.ts` | `W.04.03` | `fromWire`、`toWire`、`FromWire<T>`、查询参数映射 |
| `lib/protocol/client.ts`、`ulid.ts` | `W.04.01` | `createRestClient`、`ApiError`、`NetError`、`newUlid`、`apiPath` |
| `lib/protocol/events.ts`、`sse.ts` | `W.04.02` | `createStreamClient`、SSE 帧解析 |
| `lib/protocol/offline.ts` | `W.04.05` | `createConnectivity`、`bindNet` |
| `lib/protocol/generated/` | 生成物 | `*.ts` 类型、`consts.ts`、`tables.ts`、`wire.ts`（`G.16`、`C.14`） |

### 4.2 组装
```ts
// web/src/lib/protocol/index.ts（节选）
export type Protocol = { client: RestClient; streams: StreamClient; net: Connectivity };
export function createProtocol(o: {
  buildVersion: string;                       // Vite define 注入的 __HX_VERSION__
  onVersionMismatch?: (v: { server: string; client: string }) => void;   // B.03.01 §5："请刷新页面"
  fetch?: typeof fetch;                       // 测试注入
  now?: () => number;
}): Protocol;
```
`RestClient`、`ApiError`、`NetError`、`StreamClient` 的形状以 `W.03` §4.3 为准（本棒已按 `W.04.01`、`W.04.02` 的需要补齐并同步改了那一节），`Connectivity` 见 `W.04.05` §4。

### 4.3 依赖
`W.03.03` 的 `UiActions['setNet']`（只经 `bindNet` 注入，`lib/protocol` 不 import store 实例）；浏览器的 `fetch`、`ReadableStream`、`TextDecoderStream`、`crypto.getRandomValues`、`AbortSignal.timeout`；生成物 `generated/*.ts`。不引入任何第三方库（`G.10` §3.3 里没有协议类库，`G.10-R3`）。

## 5. 数据结构
- 协议结构全部来自生成类型，本层只把它们按 `W.04.03` 转成 camelCase 别名导出，不新定义（`G.02.05-R2`）。
- 本层自己定义、且 schema 表达不了的只有两个：列表信封 `Page<T> = { items: readonly T[]; nextCursor?: string }`（`B.03.02` §4 的通用格式，JSON Schema 写不出泛型）和错误对象 `ApiError` / `NetError`（`W.04.01`）。
- `api.schema.json` 里前端要用的响应结构和字段清单在 `W.04.04` §3.5（`P.09` K80）。

## 6. 行为

### 6.1 启动时组装（`main.tsx`，`W.02` §6 第 2 步）
```ts
const proto = createProtocol({ buildVersion: __HX_VERSION__, onVersionMismatch: () => notifyRefresh() });
const app = createAppStores({ client: proto.client, streams: proto.streams, ops: createOpsFactory() }, { width: innerWidth });
bindNet(proto.net, app.ui.actions);          // W.04.05：从此 ui.net 跟着连接状态变
```
- 全应用只有一个 `Protocol`；回放页、子图库预览也用它（流和请求共用连接状态）。
- `notifyRefresh` 由 `main.tsx` 用 `W.10` 的文案调 `ui.notify`；本层不碰文案。

### 6.2 一次请求的路径
```
store action ──► client.get/post…（W.04.01）
                  ├─ toWire(body)、查询参数键转 snake_case（W.04.03）
                  ├─ POST 加 Idempotency-Key（B.03.04）；GET 带 If-None-Match（有缓存时）
                  ├─ fetch('/api/v1' + path)（W.01-R3：只用相对路径）
                  ├─ 收到响应：net.reportOk()；401 → net.reportUnauthorized()
                  ├─ 2xx：fromWire(body) 返回；304：返回缓存
                  ├─ 4xx/5xx：抛 ApiError（details 也已 fromWire）
                  └─ 没有响应：net.reportFailure('rest')，抛 NetError
```

### 6.3 一条事件的路径
```
fetch(text/event-stream) ──► sse.ts 按帧解析 ──► 控制帧 resync / shutdown：W.04.02 自己处理
                                            └─► 事件：JSON.parse → fromWire → 去重（seq）→ onEvent(ev)（同步、按到达顺序）
                                                                                      └─► W.03 事件路由（W.03 §6.2）
```

### 6.4 错误往上走的方式
| 情况 | 本层做什么 | 谁决定界面 |
|---|---|---|
| HTTP 错误响应 | 抛 `ApiError`，不提示 | 调用方：store 的 action 或 `W.05`（409 合并提示只在 `W.05`，`G.13-R7`） |
| 没有拿到响应 | 抛 `NetError`；通知连接状态 | `W.04.05` → `ui.net` → `W.07.10` 横幅（`U.14.05`） |
| 401 | `net` 变为 `closed`，所有流停止重连 | `W.02` 整页说明（`W.02` §6.1） |
| 流断开 | 自动重连并续传，不抛错 | `ui.net`（≥ 3 秒才显示） |
| 流不会再重连（404、运行已结束） | `onState('ended')`，404 另调 `onError` | 对应 store |

## 7. 不变量
- 应用里所有 HTTP 请求都经过 `RestClient`，所有 SSE 连接都经过 `StreamClient`：`lib/protocol/` 以外不出现 `fetch(`、`EventSource`（ESLint `no-restricted-globals` / `no-restricted-syntax`，`W.04.04` §4）。
- 浏览器发出的请求都不带操作者身份字段或 `X-Actor`、`X-Mandate` 头（`W-R5`、`G.04.04-R2`）。
- 本层不弹提示、不改除 `ui.net` 以外的任何 store。
- 进出本层的数据只在这里做一次 snake_case ↔ camelCase 转换；store、组件、画布引擎里看不到 snake_case 字段名（`G.04.02` §2、`W.01-R12`），开放对象的键除外（`W.04.03`）。
- 同时打开的 SSE 连接 ≤ 3 条，每种流 ≤ 1 条（`W.01-R17`、`B.05.04`）。
- 不在任何地方保存密钥；请求体里的密钥（新建连接时）不被缓存、不进日志（INV-22、`W-R10`）。

## 8. 错误处理
| 错误 | 触发 | 处理 |
|---|---|---|
| 生成物缺失或与 schema 不一致 | 改了 schema 没有 `make gen` | 编译失败；CI 的 `make gen && git diff --exit-code` 拦住（`G.16-R3`） |
| 服务端程序版本与前端构建版本不同 | 开发模式下重新编译了后端 | `onVersionMismatch` 只调用一次（`B.03.01` §5） |
| 未知错误码、未知事件名、未知枚举值 | 新版本服务端 | 原样交给调用方，不崩溃（`C.01-R18`） |
| 其余 | — | 见各叶子 §8 |

## 9. 性能与资源
- 本层代码（gzip）≤ 12KB，计入首屏预算（`W.02` §9、`U.17` §1）。
- `fromWire` 一份 500 节点 + 700 连线的图 ≤ 5ms；一条运行事件 ≤ 0.05ms（`W.04.03` §9）。
- 每个事件从网络到 `onEvent` 只做一次 `JSON.parse` 和一次 `fromWire`，不复制。
- ETag 缓存最多 50 项（内存）；不使用 localStorage、IndexedDB。

## 10. 验收标准
1. 五个叶子的验收全部通过（`W.04.04` 为规范，按它的 §4 检查）。
2. `W.03` 全部叶子的测试用本层的真实实现（假 `fetch`）跑一遍通过，形状不需要适配层。
3. 浏览器开发者工具里：任意请求都在 `/api/v1/` 下；POST 都带 `Idempotency-Key`；任何时候 SSE 连接 ≤ 3 条。
4. 关掉 `anydoor` 再启动：3 秒内不提示，之后出现横幅，恢复后横幅消失、三条流续传、未提交的修改重新提交（`U.14.05`，端到端由 `W0405-T8` 覆盖）。
5. 全局搜索 `web/src`：`lib/protocol/` 以外没有 `fetch(`、`EventSource`、`lib/protocol/generated` 的 import。
