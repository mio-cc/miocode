# W.12 前端测试

| 项 | 内容 |
|---|---|
| 编号 | W.12 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引12（只作参考）；`G.06.04` §1；`U.20`；设计规范 v0.3 `test_core.js`、`test_smoke.js`、`check_syntax.js` 与 `U.20` 补充第 1 条（只靠 Node 假 DOM 冒烟测试的教训）；`P.09` K172–K176 |
| 最后修改 | 2026-11-23 |

## 1. 职责
前端测试怎么落地：`web/tests/` 的目录与命令；Vitest 的配置（环境分配、两个时区、测试启动文件）；共用测试工具 `web/tests/kit/`（各叶子共用的假对象、组件渲染、共用测试向量的读取）；自定义 lint 规则的测试；端到端测试的运行方式（启动真实 `harnessd --fake-llm`、准备数据、网络隔离、浏览器矩阵）；视觉回归（截图矩阵、基础组件陈列页、截图基线和更新规则）；测试编号的写法与核对；CI 用到的命令和产物。

各叶子**自己的测试用例**写在各叶子的实施卡里，由各叶子的实施任务完成；本节点提供它们共用的环境和工具，并规定所有前端测试都要遵守的写法。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 测试分层的总体策略、覆盖率门槛、哪些必须测 | `Q.01`（本节点不设前端覆盖率门槛，见 §6.9） |
| 端到端测试要覆盖哪些用户流程 | `Q.05`；本节点只写前端一侧的运行方式，具体流程在各叶子实施卡和 `U.19` |
| 模型调用测试的原则（CI 不调真模型、录放） | `Q.06`、`E.10.08`；前端一侧只用 `harnessd --fake-llm` |
| 视觉回归的通用规则 | `Q.10`；本节点写前端的截图矩阵、陈列页和基线 |
| 跨模块共用的测试数据 | `Q.11`、仓库根 `testdata/`（`G.03-R5`）；本节点只读它们 |
| 性能测量与基准夹具 | `W.11`（基准台、`bench-*` 夹具、`*.bench.ts` 汇总）；本节点可以复用夹具，不另定义 |
| Go 测试写法 | `G.05.04` |
| 令牌对比度检查 | `tools/contrast`（`U.03.05-R3`）；本节点只检查组件实际渲染出来的颜色（§6.7） |
| CI 流水线怎么编排 | `O.02`；本节点只给命令、产物和判定 |

## 3. 继承的上级约束
`W-R1`、`R5`、`R7`、`R10`、`R12`；`W.01` §3.2（按 K172 修改后）、`W.01-R11`；`W.02.02` §10 验收 1；`W.02.03` §10；`W.04.04-R8`；`W.06.10` §5.2；`W.07` §10 验收 2、4、5、6；`W.07.03` `W0703-T2`；`W.08` §4.3（`fakeEnv`）、§10 验收 5（按 K175 修改后）；`W.08.01` §10 验收 6；`W.08.05` §10 验收 2、3、7；`W.10` §6.5、§10 验收 2（按 K173 修改后）、`W10-T*` 的时区要求；`W.11` §6.3、§6.9；`G.03-R5`、`R6`；`G.06-R4`；`G.06.04` 全部（按 K173、K174 修改后）；`G.07-R7`；`G.08` §2；`G.10` §3.4、`G.10-R1`、`R3`；`G.14` §2；`G.02.05-R1`、`R4`、`R30`、`R34`；`U.16`；`U.20`；`P.02`（Windows / macOS / Linux）；INV-21。

## 4. 接口

### 4.1 目录
```
web/
├─ vitest.config.ts           单元测试与 lint 规则测试（§6.2）
├─ playwright.config.ts       端到端与视觉回归（§6.5、§6.6）
├─ src/**/*.test.ts(x)        单元测试，和被测文件放在一起（各叶子）
└─ tests/
   ├─ kit/                    共用测试工具（§4.2），只被测试 import
   ├─ lint/                   lint 规则的正例、反例文件（§6.4）
   ├─ e2e/                    端到端（各叶子的 *.spec.ts）+ fixtures.ts（§4.3）
   ├─ visual/                 视觉回归（各叶子的 *.spec.ts）+ gallery/（§6.6）+ __screenshots__/
   └─ bench/                  性能（W.11）
tools/lint/eslint/            前端自定义 ESLint 规则 hx/*（§6.4，K173）
```

### 4.2 共用测试工具 `web/tests/kit/`
```ts
// web/tests/kit/index.ts —— 测试里只从 '@tests/kit' 导入（tsconfig 路径别名，只对测试文件生效）
// ── 渲染 ──
export function render(ui: React.ReactElement, o?: { env?: UiEnv; container?: HTMLElement }): Rendered;
export type Rendered = {
  container: HTMLElement;
  rerender(ui: React.ReactElement): void;
  unmount(): void;
  getByRole(role: string, o?: { name?: string | RegExp }): HTMLElement;   // 按 ARIA 角色和可访问名查找，找不到或多于一个就抛错
  queryAllByRole(role: string, o?: { name?: string | RegExp }): HTMLElement[];
  getByText(text: string | RegExp): HTMLElement;
};
export const act: typeof import('react').act;
export const user: {                                            // 派发真实顺序的事件：pointerdown → pointerup → click；keydown → keyup
  click(el: Element): Promise<void>;
  type(el: Element, text: string): Promise<void>;               // 逐字 keydown / input / keyup；支持 '{Enter}' '{Escape}' '{Mod+K}'
  key(combo: string, target?: Element): Promise<void>;
  tab(o?: { shift?: boolean }): Promise<void>;
  pointer(el: Element, seq: readonly PointerStep[]): Promise<void>;   // 拖动等：按下、移动、松开
};
// ── 时间与帧 ──
export function useFakeTime(o?: { now?: string }): FakeTime;    // vi.useFakeTimers + W.10 的 setClock；测试结束自动恢复
export type FakeTime = { advance(ms: number): Promise<void>; now(): number };
export function fakeRaf(): { raf: (cb: FrameRequestCallback) => number; caf: (h: number) => void; step(n?: number): void; pending(): number };
// ── 协议层 ──
export function fakeRest(routes?: RouteTable): RestClient & { calls: readonly RestCall[]; respond: RouteTable };   // 未登记的请求抛错
export function fakeStreams(): StreamClient & { push(stream: 'session' | 'graph' | 'run', ev: unknown): void; open(): number };
export function fakeFetch(): typeof fetch & { stream(path: string): { write(text: string): void; close(): void; error(e: unknown): void } };
export function fakeConnectivity(initial?: NetState): Connectivity & { set(s: NetState): void };
// ── 状态与 Op ──
export function memStorage(): Storage;
export function makeStores(o?: { rest?: RestClient; streams?: StreamClient; width?: number }): AppStores;   // 用真实的 store 工厂（W.03）+ 假依赖
export function fakeOps(o?: { check?: (op: OpDraft) => Precheck; result?: DispatchResult }): OpsApi & { dispatched: readonly OpDraft[] };
export function fakeOpsFactory(): OpsFactory;
export function fakeLiveRun(): LiveRun & { push(delta: unknown): void };
// ── 外壳能力 ──
export function fakeEnv(o?: { reducedMotion?: boolean }): UiEnv & { stack: readonly OverlayEntry[]; top(): OverlayEntry | undefined };
export function fakeKeys(): CanvasKeys & { fire(id: CanvasShortcutId, phase?: 'down' | 'up'): boolean; registered(): readonly CanvasShortcutId[] };
export function fakeTheme(o?: { reducedMotion?: boolean }): ThemeHooks & { emit(changed: readonly ('palette' | 'theme' | 'motion')[]): void };
// ── 浏览器替身（jsdom 没有的能力，§6.3）──
export function stubElementFromPoint(fn: (x: number, y: number) => Element | null): void;
export function recordAnimate(): { calls: readonly { el: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions }[]; finishAll(): void };
export function fake2d(): { context: CanvasRenderingContext2D; calls: readonly { fn: string; args: unknown[] }[] };
// ── 数据 ──
export function loadVectors<T = unknown>(name: 'assign' | 'hash' | 'layout' | 'show_if'): readonly T[];   // 读 schema/examples/<name>_vectors.json
export function loadExample(name: string): Graph;              // 读 schema/examples/<name>.json 并 fromWire
export function expectConsole(level: 'warn' | 'error', match: string | RegExp, times?: number): void;   // 声明本测试预期的控制台输出（§6.2）
```
- 每个假对象都用 `satisfies` 对着产品里的接口类型写（`RestClient`、`StreamClient`、`OpsApi`、`UiEnv`、`CanvasKeys`…）：接口一改，假对象编译不过，不会悄悄过时。
- `kit/` 只能被 `*.test.ts(x)` 和 `web/tests/**` import；产品代码 import 它时 ESLint 报错（§6.4）。

### 4.3 端到端的公共夹具 `web/tests/e2e/fixtures.ts`
```ts
import { test as base, expect } from '@playwright/test';
export type Hx = {
  url: string;                                   // http://127.0.0.1:<端口>
  token: string;
  api: {                                         // 带 cookie 与 Origin 头的请求，操作者是 user（B.03.05）
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    importGraph(file: string): Promise<{ graphId: string }>;   // POST /graphs/import，文件来自 schema/examples 或 testdata
    newSession(o?: { title?: string; graphId?: string }): Promise<{ sessionId: string }>;
    events(sessionId: string): Promise<unknown[]>;            // 这一步产生的事件（断言用）
  };
  open(path?: string): Promise<void>;            // 用 /?t= 换 cookie 后打开 path
};
export const test: typeof base & { hx: Hx };    // 每个 worker 一个 harnessd；每个测试新建自己的会话，不复用别的测试的数据
export { expect };
export const tag: { chromiumOnly(reason: string): string };   // 只在 Chromium 上跑的测试，必须写原因（§6.5）
```

### 4.4 命令（`web/package.json` 的 `scripts`）
| 命令 | 内容 | 门禁（`G.08` §2） |
|---|---|---|
| `pnpm -C web test` | 单元测试 + lint 规则测试，两个时区各一遍（§6.2） | "前端测试" |
| `pnpm -C web test:watch` | 本地开发用，只跑一个时区 | — |
| `pnpm -C web test:e2e` | 端到端，三个浏览器（§6.5） | "端到端" |
| `pnpm -C web test:visual` | 视觉回归，Chromium（§6.6） | 同上一行一起跑 |
| `pnpm -C web test:visual --update` | 重写截图基线（§6.6） | — |
| `pnpm -C web test:ids` | 列出测试名里的全部测试编号（§6.8） | — |

### 4.5 依赖
只用 `G.10` §3.4 已登记的：`vitest`、`jsdom`、`@playwright/test`、`eslint`（含它自带的 `RuleTester`）、`ajv`、`typescript`；Node 标准库（`child_process` 启动 harnessd、`fs`、`path`）；`react`、`react-dom`（渲染用产品自己的依赖）。**不引入** `@testing-library/*`、`msw`、`happy-dom`、`axe-core`、`@playwright/experimental-ct-*`：§4.2 的 `render`、`user`、角色查询各自不到 50 行就能写好（`G.10-R3`）。

## 5. 数据结构
本节点私有：`RouteTable`（`'GET /graphs/:id' → 响应或函数`）、`RestCall`、`PointerStep`、`OverlayEntry`。不定义任何协议结构：假对象返回的数据用生成类型（`W-R7`）或 `schema/examples/` 的文件。

## 6. 行为

### 6.1 测试分层
| 层 | 工具 | 在哪 | 测什么 | 不测什么 |
|---|---|---|---|---|
| 单元 | Vitest | `src/**/*.test.ts(x)` | 纯函数、store、Op 层、协议层、画布引擎（假几何、假帧）、组件的结构与键盘行为 | 布局、像素、真实滚动与指针捕获、帧率 |
| lint 规则 | Vitest + ESLint `RuleTester` | `tools/lint/eslint/*.test.ts`、`web/tests/lint/` | 自定义规则与依赖方向限制是否真的生效 | — |
| 端到端 | Playwright | `web/tests/e2e/` | 真实浏览器 + 真实 `harnessd --fake-llm`：用户流程、几何与命中、跨模块联动、刷新与重连 | 像素对比 |
| 视觉 | Playwright | `web/tests/visual/` | 截图对比：布局、令牌、主题、状态外观 | 交互逻辑 |
| 性能 | `W.11` | `web/tests/bench/` | 帧、提交次数、体积、内存 | — |

- 凡是依赖布局的断言（元素位置、`elementFromPoint` 命中、滚动条、`getBoundingClientRect`、真实指针捕获）都放在端到端或视觉层；单元测试里遇到这类代码，用 §6.3 的替身给出确定的值，只测"拿到这个值之后做什么"（`W.06.07` 的 `elementFromPoint` 替身即此）。
- **只在 Node 假 DOM 里跑通不算完成**（`U.20` 补充第 1 条，设计规范 v0.3 `test_smoke.js` 的教训）：每个有界面的叶子至少有一个端到端或视觉用例在真实浏览器里打开它，并检查控制台没有错误（§6.5 第 5 条）。

### 6.2 Vitest 配置
- **环境**（`G.06.04` §1，K174 细化）：缺省 `jsdom`；以下目录用 `node`：`src/ops/**`、`src/state/**`、`src/lib/protocol/**`、`src/canvas/core/geom/**`、`src/canvas/core/layout/**`、`tools/lint/eslint/**`。用 `environmentMatchGlobs` 配置，单个文件需要不同环境时文件头写 `// @vitest-environment jsdom` 并注明原因。
- **时区**（`W.10` 的要求）：`pnpm -C web test` 执行 `node tests/kit/run-tz.mjs`：先以 `TZ=Asia/Shanghai` 跑全部测试，再以 `TZ=America/New_York` 跑 `src/lib/i18n/**` 与文件名带 `.tz.test.` 的测试。用 Node 脚本设环境变量再启动 Vitest，Windows、macOS、Linux 写法相同（`P.02`）。`locale` 固定为 `zh-CN`。
- **启动文件** `web/tests/kit/setup.ts`（每个测试文件前执行）：
  1. 补 jsdom 缺的浏览器能力（§6.3）。
  2. 每个测试之后：卸载所有 `render` 过的树；清空 `document.body`、`localStorage`、`sessionStorage`；恢复真实定时器和 `setClock(null)`；恢复全部替身。
  3. **控制台从严**：测试期间出现 `console.error` 或 `console.warn`，而该测试没有用 `expectConsole` 声明预期 → 测试失败；未处理的 Promise 拒绝 → 失败。声明了预期但没出现，也失败（`W.10` 的"只警告一次"这类用例靠它断言次数）。
- 每个测试文件互相隔离（Vitest 缺省的多线程隔离）；测试不依赖执行顺序。
- 不调真实网络：`setup.ts` 把全局 `fetch`、`EventSource`、`WebSocket` 换成"调用即抛错"的版本，测试要用网络时显式传 `fakeFetch()`（INV-21、`Q.06`）。

### 6.3 jsdom 里的替身
| 能力 | jsdom 的情况 | 替身（`setup.ts` 缺省装上） | 需要控制时 |
|---|---|---|---|
| `PointerEvent`、`setPointerCapture` | 没有或不完整 | 以 `MouseEvent` 为基础补 `pointerId`、`pointerType`、`isPrimary`；捕获只记录不改变派发 | `user.pointer` |
| `ResizeObserver`、`IntersectionObserver` | 没有 | 手动触发的空实现 | `kit` 导出 `resize(el, rect)` |
| `matchMedia` | 没有 | 全部返回 `matches:false` | `fakeTheme` / `fakeEnv` 控制减少动效 |
| `elementFromPoint` | 永远返回 `null` | 返回 `null` | `stubElementFromPoint` |
| `Element.prototype.animate` | 没有 | 返回立即完成的假 `Animation` | `recordAnimate` |
| `HTMLCanvasElement.getContext('2d')` | 返回 `null` | 返回记录调用的假上下文 | `fake2d` |
| `requestAnimationFrame` | 按 16ms 定时器 | 不改（画布与帧调度的测试注入 `fakeRaf`） | `fakeRaf` |
| `getBoundingClientRect`、`offsetWidth` | 全是 0 | 不改 | 需要尺寸的逻辑改在端到端里测（§6.1） |
| `navigator.clipboard` | 没有 | 内存实现 | 直接读写 |
| `performance.mark`、`PerformanceObserver` | 部分 | 不改 | `W.11` 自己的测试处理 |

替身只模拟接口，不模拟浏览器的计算结果；任何"替身返回什么"都由测试显式给出。

### 6.4 lint 规则与依赖方向的测试（K173）
- 前端自定义规则放在 `tools/lint/eslint/`（`G.03` §2 `tools/` 的"lint 规则"），作为本地插件 `hx` 在 `web/eslint.config.js` 注册（`G.06.04` §1）：`hx/no-react-in-canvas-core`、`hx/no-bare-store`（`G.06.02` §2）、`hx/no-cjk-literal`（`W.10` §6.5）。每条规则一个文件、一个用 ESLint `RuleTester` 写的测试文件，正例、反例各至少 3 条。 分工：`hx/no-react-in-canvas-core` 只查 `canvas/core/**` 里 `use*` 调用和 JSX，import 限制由 `W.01` §4 的 `no-restricted-imports` 负责；`hx/no-bare-store` 由 `W.03.05` 启用（`P.09` K179）。
- 用内置规则配置出来的限制（`W.01` §4 的 `no-restricted-imports`、`W.06.03` 的 `no-restricted-properties`、`W.07` §10 验收 6、`W.05` `W05-T24`、`W.10` `W10-T14`、`kit/` 不能被产品代码 import）用"文件夹样例"测：`web/tests/lint/<规则或叶子>/{ok,bad}/…` 放最小的源文件（路径按真实目录摆放，例如 `bad/src/panels/x.tsx`），测试用 ESLint 的 Node API 对它们跑一遍正式配置，断言 `bad/` 每个文件恰好报出期望的规则、`ok/` 没有任何报错。
- 这些样例目录不在 `pnpm -C web lint` 的检查范围内（`eslint.config.js` 忽略 `tests/lint/**`），只被测试读取。

### 6.5 端到端
1. **被测程序**：`make build`（`O.01`）产出的嵌入了生产前端的 `harnessd`；`HX_E2E_BIN` 指向它。本地调试可设 `HX_E2E_DEV=1`，改为 `harnessd --dev` 加 Vite 开发服务（`B.02`），不用于 CI。
2. **启动**：Playwright 每个 worker 在全局夹具里启动一个 `harnessd --fake-llm --no-browser --data-dir <临时目录> --port <7400 + worker 序号>`，从标准输出读出带 token 的地址（`B.02` §5），等 `/api/v1/health` 正常后开始；worker 结束时发关闭信号并删除临时目录。单实例锁按数据目录区分（`B.07.05`），多个 worker 互不影响。
3. **数据**：每个测试用 `hx.api` 新建自己的会话和图，不清库、不依赖别的测试的数据。图来自 `schema/examples/`（`graph_loop.json` 三层示例、`graph_minimal.json`、按 `assign_vectors.json` 的类型构造的图）和仓库根 `testdata/`（`testdata/mcp/echo-server`、`testdata/ext/*` 测试包，`W.09.04`）；`W.11` 的 `bench-*` 夹具可以直接导入。需要特定状态（运行中、待审批、急停）时，通过真实接口和 `--fake-llm` 的模板 fixtures 制造（`E.10.08`），不改数据库文件。
4. **网络隔离**：每个页面 `context.route('**/*')`：目标不是 `127.0.0.1:<本 worker 端口>` 的请求一律中止，并让测试失败（INV-21、`Q.06`：CI 不调真模型，也不连任何外部地址）。
5. **控制台**：页面出现 `console.error`、未捕获异常或 `pageerror` → 测试失败；预期的错误用 `hx.expectConsole(…)` 声明（与 §6.2 同一思路，落实 `U.20` 补充第 1 条）。
6. **浏览器矩阵**（`G.06.04` §1）：`chromium`、`firefox`、`webkit` 三个项目都跑全部端到端用例。只能在 Chromium 上验证的用例（例如依赖 Chromium 剪贴板权限的用例）用 `tag.chromiumOnly('原因')` 标记，原因写进测试名；不写原因的标记 `test:e2e` 直接报错。
7. **环境**：`locale: 'zh-CN'`、`timezoneId: 'Asia/Shanghai'`；窗口缺省 1440 × 900；减少动效用 `page.emulateMedia({ reducedMotion: 'reduce' })`，明暗用 `colorScheme`；键盘流程只用 `page.keyboard`（`U.16-R3`、`W.07` §10 验收 4）。
8. **稳定性**：等待一律等条件（元素出现、`aria-busy` 消失、事件到达），不写固定的 `waitForTimeout`；时间相关的用例用 Playwright 的时钟控制。CI 上失败重试 1 次，重试后才通过的用例在报告里标为不稳定，同样让任务失败——不稳定的测试要修，不能靠重试放过（`G.02.05-R30`）。
9. **产物**：失败时保留追踪（trace）、截图、`harnessd` 日志；报告写到 `web/.test/e2e/`。

### 6.6 视觉回归（K175）
- **只在 Chromium、只在 Linux 上比对**：截图基线由 CI 使用的 Linux 镜像生成，存在 `web/tests/visual/__screenshots__/linux/`；字体用 `web/public/fonts/` 的自托管字体（`U.04`），不依赖系统字体。Windows、macOS 本地运行 `test:visual` 只生成截图供人工查看，不做比对。
- **截图前**：`animations: 'disabled'`、隐藏输入光标；时钟固定在 `2026-01-15T10:00:00+08:00`；数据只用固定的测试图和固定会话名；画布等待 `is-loading` 消失并且两帧没有变化。
- **矩阵**：
  | 内容 | 宽度 | 主题 |
  |---|---|---|
  | 外壳布局 `shell.spec.ts`（`W.02.02`）、顶部条、左侧栏、停靠栏（`W.07.01`、`W.07.02`、`W.07.06`） | 1440、1180、1100、900、760（`U.09.03`、`W.07` §10 验收 2） | 宣纸浅色、宣纸深色 |
  | 主题 `themes.spec.ts`（`W.02.03`） | 1440 | 4 套配色 × 浅色 / 深色 |
  | 基础组件陈列页（下一条） | 固定 960 | 4 套配色 × 浅色 / 深色（`W.08` §10 验收 5） |
  | 画布、浮动回复、中心窗口等其余叶子的视觉用例 | 1440（叶子另有要求的按叶子） | 宣纸浅色、宣纸深色 |
- **基础组件陈列页** `web/tests/visual/gallery/`：一个只给测试用的页面，直接渲染 `components/ui` 的每个组件的每种变体和状态（默认、悬停、按下、键盘焦点、禁用、加载），以及 13 个原子节点图标和界面图标的 16、14 两个尺寸（`W.08.01` §10 验收 6）、`StatusDot` 五种状态的灰度版本（`W.08.05` §10 验收 3）。由 `vite build --mode gallery` 单独构建到 `web/.test/gallery/`，测试时用 Node 静态服务打开；不进 `web/dist/`，不经过 `harnessd`。陈列页里的悬停、按下状态用 Playwright 真实悬停 / 按下后截图，不用 CSS 伪造。
- **颜色检查**：`W.08.05` §10 验收 2 的 `Badge` 文字对比度等"渲染出来的颜色"类验收，在陈列页上用 `getComputedStyle` 取前景、背景色计算对比度，和 `U.03.05-R3` 的阈值比较；令牌本身的对比度仍由 `tools/contrast` 检查。
- **比对阈值**：单像素色差阈值 0.1，允许不超过 0.1% 的像素不同；超过即失败，报告里给出期望、实际、差异三张图。
- **更新基线**：只能用 `pnpm -C web test:visual --update` 在 CI 同款 Linux 镜像里生成；更新基线的提交单独成一个合并请求，附报告里的前后对比图，说明为什么变，经人工评审（`G.08-R3`）；不允许为了让测试通过顺手更新（`G.02.05-R30`）。每张 PNG ≤ 300KB（`G.07-R7`）。

### 6.7 可访问性检查
不引入专门的检查库（§4.5），按 `U.16` 用三种办法：
1. **单元**：`kit` 的 `getByRole` 按角色和可访问名查元素——找不到就说明缺少角色或名字（图标按钮必须有 `aria-label`，`G.06.01-R6`）。
2. **端到端**：键盘完整流程（`W.07` §10 验收 4）；每个弹层关闭后焦点回到原来的元素；`page.emulateMedia({reducedMotion:'reduce'})` 下检查动画关闭、状态仍可分辨（`W.07` §10 验收 5）。
3. **陈列页**：组件实际颜色的对比度（§6.6）。

### 6.8 测试编号
- 实施卡里每个测试用例的编号（`W0601-T3`、`W10-T5`）写在测试名的开头：`test('W0601-T3 帧顺序', …)`；一个编号拆成多个测试时用 `W0601-T3/同帧去重` 这样的写法（与 `G.05.04-R2` 一致）。
- `pnpm -C web test:ids` 扫描单元、端到端、视觉、lint 测试的测试名，输出编号清单（按叶子分组，标出所在文件）。实施者交付时把它和实施卡逐条对照，写进交付说明（`G.02` §6、`G.14` §2 第 2 条）；评审时看有没有漏掉的编号。设计文档不进仓库（`G.03` §2 `docs/`），所以这一步不做成 CI 自动比对。
- 同一个编号在仓库里只能出现在一个测试名开头（拆分的子名除外）；重复时 `test:ids` 报错。

### 6.9 覆盖率
前端覆盖率的门槛和统计范围由 `Q.01` 定。Vitest 统计覆盖率需要另装覆盖率插件，它不在 `G.10` §3.4 里；写 `Q.01` 时如果要求前端覆盖率，按 `G.10-R2` 上报新增依赖，再在本节点补命令。在那之前，前端没有覆盖率门禁，靠各叶子实施卡里列明的用例保证（`G.14` §2 第 2 条）。

## 7. 不变量
- 任何前端测试都不访问 `127.0.0.1` 之外的网络，不调用真实模型（INV-21、`Q.06`）。
- 测试只读 `schema/`、`testdata/`，不修改（`G.02.05-R4`）；每个测试自己创建需要的数据，结束后不留下文件。
- `web/tests/kit/` 不进产品构建；产品代码不 import 它。
- 截图基线和 `W.11` 的性能基线一样，只能由专门的更新命令改，并单独评审。
- 失败的测试不允许被跳过、放宽或删掉来通过门禁（`G.02.05-R30`）。

## 8. 错误处理
| 情况 | 结果 |
|---|---|
| 测试里出现未声明的 `console.error` / `warn` 或未处理拒绝 | 该测试失败，输出原始信息 |
| 测试发出真实网络请求 | 单元：替身抛错，测试失败；端到端：请求被中止，测试失败并写出地址 |
| `harnessd` 启动失败或 30 秒内健康检查不通过 | 该 worker 的全部用例失败，附 `harnessd` 的标准输出与日志 |
| 截图与基线不一致 | 失败，报告给出三张图；基线文件不存在时失败并提示用 `--update` 生成 |
| `chromiumOnly` 标记没有原因、`test:ids` 发现重复编号 | 命令报错退出 |
| 重试后才通过 | 标为不稳定，任务失败 |

## 9. 性能与资源
- `pnpm -C web test`（两个时区）≤ 4 分钟；单个测试文件 ≤ 10 秒（超出时拆分或把慢的部分移到端到端）。
- `pnpm -C web test:e2e`：4 个 worker，每个浏览器 ≤ 15 分钟；`test:visual` ≤ 6 分钟。
- 截图基线合计 ≤ 30MB；单张 ≤ 300KB。

## 10. 验收标准
1. 在只有一个示例叶子测试的仓库骨架上，`test`、`test:e2e`、`test:visual`、`test:ids` 都能运行并给出正确的成功 / 失败结果。
2. 控制台从严：一个会 `console.error` 的组件，没有 `expectConsole` 时测试失败，声明后通过；声明了却没出现时失败。
3. 网络隔离：单元测试里直接调 `fetch('https://example.com')` 失败；端到端里页面请求外部地址被中止且测试失败。
4. 时区：同一个 `fmtRelTime` 用例在 `Asia/Shanghai`、`America/New_York` 下各跑一遍；在 Windows 上 `pnpm -C web test` 同样两遍。
5. lint：`tools/lint/eslint/` 的三条规则各自的 `RuleTester` 用例通过；`web/tests/lint/` 的样例：`bad/` 每个文件报出且只报出期望的规则，`ok/` 无报错。
6. 端到端：同一份用例在 `chromium`、`firefox`、`webkit` 三个项目都能跑；两个 worker 同时运行互不干扰（各自的会话列表里看不到对方的数据）。
7. 视觉：故意把一个令牌的取值改变 → 相关截图失败；陈列页 4 套配色 × 浅色 / 深色截图齐全；在 Windows 上跑 `test:visual` 不做比对、只生成截图。
8. `kit` 的每个假对象都以 `satisfies` 对应接口通过类型检查；把 `RestClient` 加一个必填方法后，`fakeRest` 编译失败。
9. 产品构建 `web/dist/` 里没有 `tests/kit`、陈列页的任何代码。

### 实施卡
- 要建 / 要改的文件：`web/vitest.config.ts`、`web/playwright.config.ts`；`web/tests/kit/index.ts`、`render.ts`、`user.ts`、`time.ts`、`raf.ts`、`protocol.ts`（`fakeRest`、`fakeStreams`、`fakeFetch`、`fakeConnectivity`）、`stores.ts`（`memStorage`、`makeStores`、`fakeOps`、`fakeOpsFactory`、`fakeLiveRun`）、`shell.ts`（`fakeEnv`、`fakeKeys`、`fakeTheme`）、`dom.ts`（§6.3 的替身）、`data.ts`（`loadVectors`、`loadExample`）、`console.ts`、`setup.ts`、`run-tz.mjs`、`ids.mjs`，以及 `kit/*.test.ts`；`web/tests/e2e/fixtures.ts`、`web/tests/e2e/global-setup.ts`、`web/tests/e2e/smoke.spec.ts`（打开首页、新建会话、控制台无错误）；`web/tests/visual/gallery/index.html`、`gallery/main.tsx`、`gallery/sections/*.tsx`、`web/tests/visual/gallery.spec.ts`、`web/tests/visual/helpers.ts`（截图矩阵、固定时钟、等待稳定）；`tools/lint/eslint/index.js`（插件入口）及三条规则的实现与 `*.test.ts`（`hx/no-cjk-literal` 的规则内容以 `W.10` §6.5 为准）；`web/tests/lint/kit-import/{ok,bad}/`；`web/package.json`（只加 §4.4 的 `scripts`）；`web/tsconfig.json`（只加 `@tests/kit` 别名，限测试文件）；`web/vite.config.ts`（只加 `gallery` 模式）；`web/eslint.config.js`（注册 `hx` 插件、忽略 `tests/lint/**`、禁止产品代码 import `tests/kit`）；`.gitignore` 加 `web/.test/`。
- 不许碰的文件：`web/src/**`（各叶子的产品代码和它们自己的 `*.test.ts(x)`）；各叶子的 `web/tests/e2e/*.spec.ts`、`web/tests/visual/*.spec.ts`（`smoke.spec.ts`、`gallery.spec.ts` 除外）；`web/tests/bench/`（`W.11`）；`schema/`、`testdata/`（只读）；`cmd/`、`engine/`、`internal/`。
- 函数签名：见 §4.2、§4.3。
- 测试用例：
  - `W12-T1 render 与角色查询`：渲染带 `aria-label` 的按钮 → `getByRole('button', {name})` 找到；两个同名 → 抛错；`unmount` 后容器为空
  - `W12-T2 user`：`click` 依次派发 `pointerdown`、`mousedown`、`pointerup`、`mouseup`、`click`；`type('ab{Enter}')` 产生 3 组 `keydown` / `keyup`；`key('{Mod+K}')` 在 macOS 与其他平台分别带 `metaKey` / `ctrlKey`
  - `W12-T3 时间`：`useFakeTime` 后 `advance(60_000)` 触发 1 次整分钟刷新（`W.10` §6.4）；测试结束后真实定时器与 `setClock(null)` 已恢复
  - `W12-T4 fakeRaf`：`raf` 3 次后 `pending()=3`，`step()` 执行全部回调一次
  - `W12-T5 fakeRest`：登记的路由返回登记的结果；未登记的请求抛错并写出方法与路径；`calls` 记录请求体
  - `W12-T6 fakeStreams / fakeFetch`：`push` 的事件按顺序到达订阅方；`fakeFetch().stream` 分段 `write` 能被 `W.04.02` 的解析器读到（跨段切开的帧）
  - `W12-T7 makeStores`：用真实工厂建出的 store 与 `W.03` §4.2 的 `AppStores` 类型一致；两次调用互不共享状态
  - `W12-T8 fakeEnv / fakeKeys`：`pushOverlay` 入栈、返回的函数出栈；`fire` 调用已注册的处理函数并返回它的结果
  - `W12-T9 替身`：§6.3 每一项装上后可用、测试结束后恢复
  - `W12-T10 控制台从严`：§10 验收 2
  - `W12-T11 网络隔离`：§10 验收 3
  - `W12-T12 时区`：§10 验收 4
  - `W12-T13 lint 规则`：§10 验收 5
  - `W12-T14 端到端夹具`：§10 验收 6；`chromiumOnly` 不带原因 → 报错
  - `W12-T15 视觉`：§10 验收 7
  - `W12-T16 类型约束`：§10 验收 8
  - `W12-T17 test:ids`：样例测试名里的编号按叶子分组输出；同一编号出现在两个测试名开头 → 报错
  - `W12-T18 构建干净`：§10 验收 9
- 允许使用的依赖：只有 §4.5 列出的。
- 禁止事项：`G.02.05` 全部（特别是 R1、R4、R28、R30、R34）；另：不引入 §4.5 列出的未登记测试库；端到端不连外部网络、不改数据库文件；视觉测试不在非 Linux 平台比对；不在测试里写固定等待时间；不为了通过而更新截图基线、放宽阈值或加重试次数。
- 完成标志：`G.14` 全部条件；§10 九条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K172–K176 |
