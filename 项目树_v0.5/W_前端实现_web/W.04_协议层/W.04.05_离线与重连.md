# W.04.05 离线与重连

| 项 | 内容 |
|---|---|
| 编号 | W.04.05 |
| 类型 | 实施 |
| 上级 | W.04 协议层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新；`U.14.05`；`B.04.14`（`/health` 不需要鉴权）；`B.05.03`（心跳、关闭帧）；`P.09` K91 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`createConnectivity`：汇总 REST 客户端和事件流报告的成功与失败，探测本机服务是否还在，得出唯一的连接状态 `NetState`，经 `bindNet` 写进 `ui.net`；服务恢复时通知各方立即重连、继续提交。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 横幅的样式、文案、"已重新连接"变绿 2 秒 | `W.07.10`（按 `ui.net` 的变化显示，`U.14.05` §2） |
| 断开时画布变只读 | `W.03.03` 的 `canvasReadonly`，画布引擎和属性页据此禁用编辑 |
| 流的重连与续传 | `W.04.02`（本节点在恢复时通知它跳过剩余的退避） |
| 断开期间本地修改的排队与重新提交 | `W.05`（它看 `ui.net` 回到 `online`，`U.14.05-R1`） |
| 401 时的整页说明 | `W.02` §6.1（看 `ui.net === 'closed'`） |
| 启动时连不上服务的重试 | `W.02` §6.1（它调用 `whenOnline()`） |

## 3. 继承的上级约束
`W.04` §6.4、§7；`W.03.03` §4（`NetState`）、§6.4；`U.14.05`（全部）；`B.04.14` §5；`B.05.03` §4；`B.03.05` 第 6 步（token 重新生成后旧 cookie 失效）；`W-R6`（重连恢复不调用解除急停）。

## 4. 接口
```ts
// web/src/lib/protocol/offline.ts
import type { NetState } from '@/state/uiStore';          // 'online' | 'reconnecting' | 'down' | 'closed'（仅类型）

export type Connectivity = {
  state(): NetState;
  subscribe(fn: (s: NetState) => void): () => void;
  onOnline(fn: () => void): () => void;     // 从 reconnecting / down 回到 online 时调用（< 3 秒的短暂中断也调用）
  whenOnline(): Promise<void>;              // 已在线立即完成；closed 时永不完成
  reportOk(): void;                         // 收到了服务的任何 HTTP 响应或流已打开
  reportFailure(src: 'rest' | 'stream' | 'shutdown'): void;   // 没有拿到响应 / 流断了 / 服务发来关闭帧
  reportUnauthorized(): void;               // 任何请求或流返回 401
  dispose(): void;
};
export function createConnectivity(o?: {
  fetch?: typeof fetch;
  now?: () => number;
  probeEveryMs?: { fast: number; slow: number };   // 缺省 { fast: 1000, slow: 5000 }
  reconnectingAfterMs?: number;                    // 缺省 3000（U.14.05：< 3 秒不提示）
  downAfterMs?: number;                            // 缺省 30000（U.14.05：重连 30 秒仍失败）
}): Connectivity;

// 把连接状态接到 ui store（W.04 §6.1）
export function bindNet(c: Connectivity, ui: { setNet(n: NetState): void }): () => void;
```

### 4.1 依赖
`W.03.03` 的 `NetState` 类型和 `setNet` action（只经 `bindNet` 传入）；`GET /api/v1/health`（`B.04.14`：不需要鉴权，只返回 `{ok, version}`）；浏览器 `fetch`、`AbortSignal.timeout`、`document.visibilityState`。

## 5. 数据结构
本节点私有：`{ state: NetState; suspect: boolean; since: number | null; probeTimer; waiters }`。`suspect` 表示"已经发现失败、但还不到 3 秒"——这段时间对外仍是 `online`。

## 6. 行为

### 6.1 状态
| `NetState` | 含义 | 界面（`U.14.05` §2） |
|---|---|---|
| `online` | 服务可达（含失败后 < 3 秒的观察期） | 正常 |
| `reconnecting` | 失败持续 ≥ 3 秒 | 黄色横幅"与 Anywhere Door 的连接已断开，正在重连…"；画布只读 |
| `down` | 失败持续 ≥ 30 秒 | 横幅"Anywhere Door 已关闭。请重新启动 Anywhere Door，然后刷新这个页面" + "刷新"；画布只读 |
| `closed` | 收到 401：服务重启后 token 变了，或 token 被重新生成（`B.03.05` 第 6 步） | 整页说明（`W.02` §6.1）；不再重连 |

### 6.2 状态转换
| 当前 | 事件 | 结果 |
|---|---|---|
| `online` | `reportFailure` | `suspect = true`，`since = now`；立即探测一次，之后每 `fast` 毫秒探测 |
| `online`（观察期） | 探测成功或 `reportOk` | `suspect = false`；调用 `onOnline`（流和队列可以立即重试）；对外状态不变 |
| `online`（观察期） | `now - since ≥ 3000` | `reconnecting` |
| `reconnecting` | `now - since ≥ 30000` | `down`；探测间隔改为 `slow` |
| `reconnecting` / `down` | 探测成功或 `reportOk` | `online`；停止探测；调用 `onOnline`；`whenOnline()` 的等待者全部完成 |
| 任意（`closed` 除外） | `reportUnauthorized` | `closed`；停止探测；之后的 `reportOk` / `reportFailure` 都忽略 |
| `closed` | — | 终态，只有刷新页面才离开 |
- `reportFailure('shutdown')`：服务端发来关闭帧（`B.05.03` §4），按普通失败处理（重启通常在几秒内完成，不立即显示 `down`）。
- 探测：`GET /api/v1/health`，超时 2 秒，`cache: 'no-store'`；返回 `{ok: true}` 即成功。不带凭证也能成功，所以"服务回来了、但 token 变了"会先回到 `online`，随后第一个真正的请求收到 401 时进入 `closed`（`U.14.05` 最后一行）。
- 页面隐藏时探测间隔放慢到 `slow`；重新可见时立即探测一次（休眠唤醒）。

### 6.3 恢复时谁做什么（`U.14.05`"重连成功"一行）
| 谁 | 做什么 |
|---|---|
| `W.04.02` | 正在退避等待的连接立即重连；续传 P、S 级事件（`B.05.02`） |
| `W.05` | Op 队列继续按顺序提交断开期间排队的修改（同一个幂等键，`B.03.04`）；图协同流 `onOpen` 带的 `X-Graph-Version` 有缺口时补齐（`C.06.03-R1`） |
| `W.03` | 各 store 在 `onOpen({reconnected: true})` 里对齐 E 级数据（`W.03` §6.2）；session store 的活动刷新在 `net` 回到 `online` 时立即跑一次（`W.03.05` §6.3） |
| `W.07.10` | 横幅变绿"已重新连接"，2 秒后消失 |
- 恢复过程不调用任何会改变服务端安全状态的接口：不解除急停、不改档位、不处理审批（`W-R6`、INV-10）。

### 6.4 `bindNet`
订阅 `subscribe`，每次变化调用 `ui.setNet(s)`（`setNet` 自己做"值不变不 set"，`W.03.03` §6.4）；绑定时立即同步一次当前值；返回解绑函数。

## 7. 不变量
- 全应用只有一个 `Connectivity`；`ui.net` 只由 `bindNet` 写。
- 中断不到 3 秒时 `ui.net` 一直是 `online`（不闪横幅）。
- 进入 `closed` 后不再发出任何探测，事件流不再重连。
- 本节点没有任何代码路径调用 `/estop`、`/approvals`、`/mandates`、`/sessions/*/level`。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 探测超时、连不上 | 当作失败，继续按间隔探测 |
| 探测返回非 200（服务正在启动时返回 503 等） | 当作失败 |
| `/health` 返回的 `version` 与前端构建版本不同 | 不在这里处理（`W.04.01` 的 `onVersionMismatch` 在下一次正常请求时处理） |
| 订阅回调抛错 | `console.error`，其他订阅者照常调用 |

## 9. 性能与资源
- 在线时没有任何定时器和探测请求。
- 断开时每秒最多 1 个探测请求（`down` 后每 5 秒 1 个）；探测响应只有十几个字节。

## 10. 验收标准
1. 中断 2 秒后恢复：`ui.net` 一直是 `online`，`onOnline` 调用一次。
2. 中断 5 秒：第 3 秒变为 `reconnecting`；恢复后立即变为 `online`，事件流续传、队列里的修改提交（`U.14.05` 前三行）。
3. 中断 31 秒：第 30 秒变为 `down`，之后每 5 秒探测一次。
4. 服务重启且 token 变了：先恢复 `online`，第一个请求 401 后变为 `closed`，显示整页说明，不再重连（`U.14.05` 最后一行）。
5. 断线期间服务端产生 5 个图版本：重连后前端图与服务器一致（`C.06.03` §4 验收 2，`C0603-T2` 的前端一侧）。

### 实施卡
- 要建 / 要改的文件：`web/src/lib/protocol/offline.ts`、`web/src/lib/protocol/offline.test.ts`、`web/tests/e2e/reconnect.spec.ts`。
- 不许碰的文件：`web/src/lib/protocol/generated/`、`client.ts`、`events.ts`、`mapping.ts`、`web/src/state/`（只 import `uiStore.ts` 的 `NetState` 类型）、`web/src/panels/`、`schema/`、`internal/`。
- 函数签名：见 §4。
- 测试用例（假 `fetch`、假时钟；e2e 用真实 `anydoor --fake-llm`）：
  - `W0405-T1 短暂中断`：`reportFailure` 后 2 秒内探测成功 → 状态始终 `online`，`onOnline` 一次，订阅者 0 次
  - `W0405-T2 进入重连`：一直失败 → 第 3000ms 变 `reconnecting`；第 30000ms 变 `down`；`down` 后探测间隔 5000ms
  - `W0405-T3 恢复`：`reconnecting` 时 `reportOk` → 立即 `online`、停止探测、`whenOnline` 的 Promise 完成
  - `W0405-T4 401`：任意状态 `reportUnauthorized` → `closed`；之后 `reportOk` 不改变状态，不再探测；`whenOnline` 永不完成
  - `W0405-T5 关闭帧`：`reportFailure('shutdown')` 后 1 秒服务回来 → 不显示 `reconnecting`
  - `W0405-T6 可见性`：隐藏期间探测间隔为 5000ms；变为可见立即探测一次
  - `W0405-T7 bindNet`：绑定时同步一次；状态变化时 `setNet` 被调用；解绑后不再调用
  - `W0405-T8 端到端断线`：Playwright 拦截 `/api/v1/**` 6 秒 → 出现横幅、画布不能拖动；拦截开始后 1 秒内（还没进入只读）在属性页改一个参数，它进入 Op 队列等待；放开后横幅变绿消失，参数修改已提交（`GET /graphs/{id}` 里能看到）
  - `W0405-T9 端到端补齐版本`：拦截图协同流期间用 `anydoorctl` 提交 5 批 Op → 放开后前端 `toDoc(graph store)` 的规范化哈希（`W.05` 的 `graphHash`）等于服务器 `GET /graphs/{id}` 的哈希（`C0603-T2`）
  - `W0405-T10 token 轮换`：`POST /settings/token/rotate` 后（旧 cookie 失效）→ 页面显示整页说明，控制台无未处理异常
- 允许使用的依赖：无第三方运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R14、R21）；另：不在本节点显示任何界面或文案；不调用 `/health` 以外的接口；恢复时不调用解除急停或任何改变授权状态的接口；不把连接状态存进 localStorage。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。
