# W.11 前端性能实现

| 项 | 内容 |
|---|---|
| 编号 | W.11 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设17（只作参考）；`U.17`；demo v0.5.11 `26_keys.js`（"调试 › 压力测试：200 节点 · 300 连线"与 FPS 浮层）、设计规范 v0.3 `30_embed.js`（压力测试实现）；`P.09` K166–K171 |
| 最后修改 | 2026-11-23 |

## 1. 职责
证明前端达到 `U.17` 和各 W 叶子写下的性能预算，并在退步时让门禁失败。具体是：`web/src/lib/perf/`（性能构建里的 React 提交计数、帧阶段标记的读取、开发用性能浮层）；性能构建；基准台（不依赖真实后端和模型、结果可重复的测量环境）与基准夹具；端到端基准场景 S1–S11；各叶子 `*.bench.ts` 微基准的汇总；包体积检查；绝对预算、性能基线和参考机测量。

本节点**不负责让代码变快**：每处的优化做法写在各叶子里（视口裁剪 `W.06.05`、DOM 池 `W.06.06`、按帧合并 `W.06.15`、动态加载 `W.02` §6、窗口化 `W.07` §9 等），本节点只测量和把关。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 各模块的性能实现与它们自己的预算数字 | 各叶子的 §9（本节点汇总进 §6.4 的场景表和 §6.8 的微基准表，不另定数字） |
| 后端性能：调度吞吐、事件写入速度、图校验（增量 ≤ 5ms、全量 500 节点 ≤ 20ms，`U.17` §1） | `Q.08`、`E.03`、`E.15`、`E.07` |
| 性能基准的通用方法（各枝共用的报告格式、CI 怎么接入） | `Q.08`；本节点写前端一侧的具体做法，`Q.08` 写成时引用本文 |
| CI 流水线本身（何时跑、跑在哪类机器上） | `O.02`；本节点只规定命令、产物和判定 |
| 功能正确性的端到端测试、视觉回归 | `W.12`、`Q.05`、`Q.10`（它们用真实 `harnessd --fake-llm`） |
| 通用测试夹具 | `Q.11`、`W.12`；本节点的基准夹具只服务于性能测量，`W.12` 可以复用 |
| 产品界面上的性能显示 | 没有：`U` 里没有性能面板，demo 的压力测试与 FPS 浮层不进产品（`P.09` K170） |

## 3. 继承的上级约束
`W-R1`、`R2`、`R11`、`R12`；`W.01` §3.2（`lib/perf/`、`web/tests/bench/`）、`W.01-R5`、`R6`、`R9`、§4（性能基准一条）；`W.02` §6、§9、§10 验收 1、4；`W.02.02` §4.1（按 `P.09` K167 修改后）；`W.03` §9、§10 验收 5；`W.03.01` `W0301-T12`；`W.03.02` §10 验收 4；`W.03.04` `W0304-T14`；`W.04.03` `W0403-T10`；`W.06` §9、§10 验收 2；`W.06.01` §9 与帧调度（按 K168 修改后）；`W.06.05` §9；`W.06.06` §9、`W0606-T10`；`W.06.15` §9、§10 验收 1（按 K166 修改后）；`W.07` §9、§10 验收 3；`W.07.01` §10 验收 8；`W.07.06` §10 验收 7；`W.08` §9；`W.08.01` §10 验收 4；`W.09` §9、`W.09-R6`；`W.09.01` §9、`W0901-T12`；`W.09.02`–`W.09.05` §9；`W.10` §9、§6.4（`setClock`）；`U.17` 全部；`G.06.02-R4`；`G.08` §2；`G.10-R1`、`R3`；`G.02.05-R25`、`R28`、`R30`、`R34`；`G.07-R7`；`G.17`；INV-21。

## 4. 接口

### 4.1 运行时：`@/lib/perf`
```ts
// web/src/lib/perf/index.ts —— 目录外只从这里导入
export const PERF: boolean;                                  // = __HX_PERF__（Vite define；生产构建为 false，相关代码被摇树去掉）
export type RegionId = 'top' | 'ls' | 'canvas' | 'float' | 'rs' | 'banner' | 'overlay' | 'cover' | 'page' | 'center';
export function PerfRegion(p: { id: RegionId; children: React.ReactNode }): JSX.Element;
// PERF 为 true：<React.Profiler id onRender={record}>；为 false：原样返回 children（不多一层组件）

// web/src/lib/perf/recorder.ts（只在 PERF 为 true 时被 import）
export type CommitRecord = { region: RegionId; at: number; actual: number; phase: 'mount' | 'update' | 'nested-update' };
export type FrameRecord = { at: number; phases: Readonly<Record<string, number>> };   // 一帧里各阶段的耗时（毫秒），来自 hx:frame:* 标记
export type PerfApi = {
  reset(): void;
  commits(): readonly CommitRecord[];
  frames(): readonly FrameRecord[];
  mark(name: string): void;                                  // 场景脚本打的标记（hx:s:<名字>），也写进 Performance 时间线
};
// 挂在 window.__hxPerf 上，供基准场景读取；不发任何网络请求（INV-21）

// web/src/lib/perf/hud.tsx（开发与性能构建才有，K170）
export function PerfHud(): JSX.Element | null;               // 地址带 ?perf=1 时显示：近 1 秒帧率、最长一帧、各区域每秒提交次数
```
- `lib/perf` 只依赖 `react`；被 `shell/AppShell.tsx`、`shell/CanvasArea.tsx`（`W.02.02`）和 `App.tsx`（`center` 区域，`W.02`）使用。`canvas/core` 不 import 它（`W.01-R6`）：帧阶段标记由 `frame.ts` 直接调用浏览器的 `performance.mark`，用同一个编译期常量 `__HX_PERF__` 包住（`W.06.01` §6.5，`P.09` K168），`recorder.ts` 用 `PerformanceObserver` 收集。
- 区域与插槽一一对应（`W.02.02` §4.1）：`top` 顶部条、`ls` 左侧栏、`canvas` 只包 `<Canvas/>`、`float` 浮动层（停靠栏、小地图、父图位置卡、提议栏、浮动回复、对话框）、`rs` 右侧栏、`banner` 横幅、`overlay` 画布浮层（`canvasOverlay`：空状态、画布导览）、`cover` 运行历史、`page` 整页（首次引导）、`center` 中心窗口。浮层（`Overlay`）经 portal 渲染，提交仍记在打开它的区域。

### 4.2 性能构建
```
pnpm -C web build --mode perf      # 产物 web/dist-perf/，不嵌入 harnessd（O.03 只嵌入 web/dist/）
```
与生产构建只有四处不同（`web/vite.config.ts` 的 `mode === 'perf'` 分支）：`define.__HX_PERF__ = true`；`resolve.alias` 把 `react-dom/client` 换成 `react-dom/profiling`（React 只有它支持生产模式下的 `Profiler`）；`esbuild.keepNames = true`（追踪里看得懂函数名）；`build.outDir = 'dist-perf'`。压缩、分块、动态加载都与生产构建相同，所以测出来的体积和分块就是生产的。开发模式（`vite dev`）下 `__HX_PERF__` 也为 `true`，便于本地用 `?perf=1` 看浮层。

### 4.3 基准工具 `web/tests/bench/`
```
web/tests/bench/
├─ server.ts            基准台：只用 Node 标准库的 HTTP 服务（§6.3）
├─ fixtures/
│  ├─ make.ts           生成基准图（固定随机种子）
│  ├─ graphs/*.json     生成结果（提交到仓库）
│  ├─ recorded/**       从真实 harnessd 录下的 GET 响应（提交到仓库）
│  ├─ scripts/*.ts      事件脚本：run-30、idle
│  └─ record.ts         录制脚本（§6.3 第 3 步）
├─ scenarios/s01-boot.spec.ts … s11-leak.spec.ts   端到端基准场景（Playwright，§6.4）
├─ probe.ts             注入页面的测量脚本（帧采样、Event Timing）与 CDP 追踪解析
├─ budgets.ts           绝对预算表（§6.4、§6.7、§6.8 的数字，每条写明出处）
├─ baseline.json        性能基线（§6.6）
├─ size.ts              包体积检查（§6.7）
├─ report.ts            汇总、比较、输出 web/.perf/report.json 与 report.md
└─ *.bench.ts           各叶子的微基准（文件归各叶子，本节点只汇总）
```
命令（写进 `web/package.json` 的 `scripts`）：
| 命令 | 做什么 |
|---|---|
| `pnpm -C web bench` | `vitest bench --run`，按 §6.8 对照预算 |
| `pnpm -C web perf` | 性能构建 → 启动基准台 → 跑 S1–S11 → 包体积检查 → 对照预算与基线；任何一项失败退出码为 1 |
| `pnpm -C web perf --only s04` | 只跑某个场景（本地调试用） |
| `pnpm -C web perf --reference` | 参考机测量（§6.6）：多跑 2 轮，报告里写机器信息，不比较基线 |
| `pnpm -C web perf:update` | 用本次结果重写 `baseline.json`（§6.6） |
| `pnpm -C web perf:record` | 重新录制 `fixtures/recorded/`（需要先 `go build ./cmd/harnessd`） |

### 4.4 依赖
运行时只有 `react`、`react-dom/profiling`（`react-dom` 包自带的入口，不是新依赖）。测量与工具：`@playwright/test`（含它的 CDP 会话）、`vitest`、`ajv`（校验夹具）——都在 `G.10` §3.4；Node 标准库 `http`、`zlib`、`fs`、`child_process`（`record.ts` 启动 harnessd）。不引入 `size-limit`、`lighthouse`、`web-vitals` 等（`G.10-R1`、`R3`）。被依赖：`O.02`（CI 跑 `bench`、`perf`）、`Q.08`（引用本文的场景与报告格式）、各 W 叶子（验收里写"`W.11` 基准"的条目）。

## 5. 数据结构
本节点私有：
```ts
// web/tests/bench/budgets.ts
export type Budget = {
  id: string;                          // 's04.pan.p95FrameMs'、'size.firstScreenJs'、'bench.W0301-T12'
  max: number; unit: 'ms' | 'count' | 'KB' | 'MB' | 'perSec' | 'fps';
  min?: true;                          // 越大越好的指标（fps）
  ref: string;                         // 出处：'U.17 §1'、'W.06 §9'…
  reference?: true;                    // 只在参考机测量里判定（§6.6）
};
// web/.perf/report.json
export type PerfReport = {
  runner: { fingerprint: string; os: string; cpu: string; chrome: string; reference: boolean };
  commit: string; startedAt: string;   // UTC
  metrics: Record<string, { value: number; runs: number[]; budget?: number; baseline?: number; ok: boolean }>;
};
```
`baseline.json` 是 `PerfReport` 去掉 `runs` 后的同一形状。

## 6. 行为

### 6.1 性能区域
- `AppShell` 与 `CanvasArea` 用 `PerfRegion` 包住 §4.1 的十个区域（`W.02.02`，K167）。`Profiler` 的 `onRender` 每次提交记一条 `CommitRecord`；回调里只往数组末尾追加，不做别的计算（数组最多 2 万条，满了丢最旧的）。
- 场景用"某段时间里各区域的提交次数"判定（§6.4）。`W.07` §10 验收 3 说的"结构树、监控页"分别在 `ls`、`rs` 区域里，按区域统计（K167）。

### 6.2 帧阶段标记
- `W.06.01` 的帧调度器在性能构建里，每执行一个非空阶段，前后各调一次 `performance.mark('hx:frame:<phase>:s' | ':e')`，并在帧结束时 `performance.mark('hx:frame:end')`（K168）。生产构建里这段代码被 `__HX_PERF__` 去掉。
- `recorder.ts` 用 `PerformanceObserver({type: 'mark'})` 把它们配成 `FrameRecord`，并在 Performance 时间线里留下同名标记，方便人工打开追踪查看。
- 由此得到："每帧最多一次 `run` 阶段写入"（`W.06.15` §10 验收 1）、"拖 1 个节点 ≤ 1ms""`flush` ≤ 1.5ms"这类引擎内部耗时（`W.06` §9、`W.06.15` §9）。

### 6.3 基准台
基准门禁要求结果可重复：不连真实后端，不调模型，事件按固定节奏到达。
1. **夹具生成**（`make.ts`，种子固定，输出提交到仓库）：
   | 夹具 | 内容 | 用在 |
   |---|---|---|
   | `bench-200` | 根图 200 节点、300 连线（与 demo 压力测试同规模，K170）；13 种原子节点类型按比例混合；其中 10 个容器节点各带一个 12 节点的子图（有缩略图）；位置按分层布局排好、互不重叠 | S1、S4、S5、S7、S9 |
   | `bench-sub200` | 根图 20 节点，其中一个容器节点的子图有 200 节点、300 连线 | S3 |
   | `bench-1000` | 根图 1000 节点、1500 连线 | S6 |
   | `sessions-6` | 6 个会话，图依次为 200、120、60、20、10、0 节点 | S2、S10 |
   生成后用 `ajv` 按 `schema/graph.schema.json` 校验，不通过就失败。
2. **事件脚本**（`scripts/*.ts`）：`run-30` 在 `bench-200` 上让 30 个节点同时处于运行中，持续 5 秒：每个节点每 100ms 一条 `node.progress`，2–4 秒后一条 `node.state`（`to` 为完成）并由下一个节点接上（节点状态只有 `node.state` 一种事件，`C.06.02`），连线有数据通过；其中 1 个节点进入等待审批、1 个循环节点推进到第 2 轮；合计约每秒 400 条事件。事件名只用 `@/lib/protocol` 导出的生成常量（`G.02.05-R3`），每条事件按 `schema/` 里的事件结构用 `ajv` 校验。`idle`：三条流只发保活。
3. **录制**（`perf:record`，夹具或 `api.schema.json` 变化后重跑）：`record.ts` 用临时数据目录启动 `harnessd --fake-llm --no-browser`，经 `POST /graphs/import` 导入夹具图、经 `POST /sessions` 建会话，再用 Playwright 打开应用走一遍 S1–S11 的界面路径，把所有 `GET /api/v1/**` 的响应（状态码、头里的 `ETag`、正文）按"方法 + 路径 + 查询参数"存进 `recorded/`。录下的是真实服务端响应（含 `diags`、`registry_hash`），不手写。
4. **回放**（`server.ts`）：提供 `web/dist-perf/` 静态文件和 `/api/v1/**`：`GET` 按录制回放；`POST` / `PATCH` / `PUT` / `DELETE` 返回录制时同一请求的响应，录制里没有的返回 `200 {}` 并在报告里记一条警告；三条 SSE 流按事件脚本推送。每个响应都加 `Cross-Origin-Opener-Policy: same-origin`、`Cross-Origin-Embedder-Policy: require-corp`，让 `performance.measureUserAgentSpecificMemory()` 可用（S9，K169）；这两个头只在基准台上加，不改产品的响应头（`S.02-R8`）。只监听 `127.0.0.1`（INV-21）。
5. 回放里遇到没有录过的 `GET`：返回 404 并让该场景失败，提示重新录制，不猜测响应。

### 6.4 基准场景
每个场景：浏览器窗口 1440 × 900，浅色主题，`deviceScaleFactor` 1；先跑 1 轮预热不计，再跑 3 轮取中位数；场景之间重新打开页面。画布交互按每秒 60 次指针事件生成（`page.mouse`），与真实拖动的事件密度相同。

| 场景 | 步骤 | 判定（绝对预算） | 出处 |
|---|---|---|---|
| S1 冷启动 | 清空缓存，打开 `bench-200` 所在会话的地址 | 打开到可交互 ≤ 1.5 秒（参考机判定，§6.6）；可交互 = 画布根元素没有 `is-loading`、200 个节点都在 DOM 里、"运行"按钮可点；期间没有 > 50ms 的长任务超过 3 个 | `U.17` §1、`W.02` §10 验收 1 |
| S2 切换会话 | `sessions-6` 里按 `Alt+]` 依次切换 5 次、再切回来 5 次 | 按键到新会话画布全部节点就绪 ≤ 300ms（每次）；切回内存里的会话时引擎部分 ≤ 120ms（帧标记） | `U.17` §1、`W.06.01` §9、`W.07` §9 |
| S3 进入 / 返回子图 | 减少动效打开（去掉转场），`bench-sub200` 里进入 200 节点的子图再返回，各 5 次 | 按键到新层节点全部可见 ≤ 100ms；返回已缓存的上一层：摘下 + 挂回 ≤ 10ms、含全量更新 ≤ 40ms | `U.17` §1、`W.06.06` §9 |
| S4 画布交互 | `bench-200`：平移 1 秒、滚轮缩放 1 秒、拖动 1 个节点 1 秒、拖动 20 个节点 1 秒、拖线 1 秒、框选 1 秒 | 每段：掉帧 0（相邻两帧间隔 > 25ms 记一次掉帧）；单帧脚本时间 p95 ≤ 8ms；引擎帧耗时：拖 1 个 ≤ 1ms、拖 20 个 ≤ 3ms、拖线命中 ≤ 2ms；> 50ms 长任务 0；强制同步布局 0；React 提交：全部区域 0，缩放停下后 `float` 区域（缩放百分比）1 次除外 | `U.17` §1、R1–R10、`W.06` §9、§10 验收 2、`W.03.02` §10 验收 4、`W.07.06` §10 验收 7、`W.08.01` §10 验收 4 |
| S5 运行中 | `bench-200` + `run-30`，右侧栏打开监控页、左侧栏展开结构树，运行 10 秒；期间平移 2 秒 | 掉帧 0；每帧 `run` 阶段最多 1 次，`flush` ≤ 1.5ms、连线 ≤ 0.5ms；缩略图刷新每 400ms 最多 10 个、合计 ≤ 3ms；React 提交：`canvas`、`top`、`float`、`banner`、`overlay` 0 次，`ls`、`rs` 各 ≤ 2.5 次 / 秒 | `U.17` §1、R10、R11、`W.06.15` §9、§10 验收 1、`W.07` §10 验收 3、`W.07.01` §10 验收 8 |
| S6 大图 | `bench-1000`：平移 2 秒 | 帧率 ≥ 30（相邻两帧间隔 > 33ms 的不超过 1%）；视口裁剪一次 ≤ 2ms（帧标记 `cull`） | `W.06` §9、`W.06.05` §9 |
| S7 打字 | 对话框里连续输入 40 个字符（每 60ms 一个），再在属性页参数输入框里输入 40 个 | Event Timing 的每次按键 `duration` ≤ 50ms | `U.17` §1 |
| S8 面板与窗口 | 首次 `Ctrl+,` 打开中心窗口、切换 4 个分区；首次 `Ctrl+K`；右侧栏切换三个标签各 3 次；打开运行历史 | 中心窗口首次打开到第一页可交互 ≤ 300ms（含加载分块）；切换分区、标签 ≤ 100ms；命令面板首次打开 ≤ 300ms；首屏网络请求里没有中心窗口、引导、运行历史、命令面板的分块，打开时才请求 | `U.17` §1、`W.07` §9、`W.09` §9、§10 验收 2、`W.09.02` §9 |
| S9 内存 | 打开 `bench-200`，跑完 `run-30`，强制回收后测量 | `measureUserAgentSpecificMemory()` ≤ 300MB；JS 堆、DOM 节点数记入报告并与基线比较 | `U.17` §1、`W.03` §9、`W.06.06` §9 |
| S10 泄漏 | ① 在 `bench-200` 上新建 200 个节点再删除，重复 10 次；② `sessions-6` 之间来回切换 20 次 | ①、② 都在第 2 次之后堆不再增长（每次强制回收后比较，增长 ≤ 2%）；② 之后池里的文档 ≤ 5 个、被释放工作区的 `data-node-id` 在堆快照里找不到 | `W.06` §9、`W.06.01` §10 验收 1、`W.06.06` §9、§10 验收 2 |
| S11 交互反馈 | S4–S8 全程 | Event Timing 记录到的每个交互 `duration` ≤ 100ms | `U.17` §1"任何操作的视觉反馈" |

- 任何场景测量期间都不打开性能浮层；`setClock` 冻结时钟（`W.10` §6.4），避免相对时间刷新带来的提交混进统计。
- 场景失败时，报告里附该轮的 Playwright 追踪和 Chrome 性能追踪文件，供人工查看。

### 6.5 测量方法
| 指标 | 怎么测 |
|---|---|
| 帧间隔、掉帧 | `probe.ts` 用 `addInitScript` 注入：`requestAnimationFrame` 循环记录时间戳，只在场景标记 `hx:s:<段>:s` 到 `:e` 之间统计 |
| 单帧脚本时间 | Playwright 的 CDP 会话开启追踪（`devtools.timeline`、`blink.user_timing`），按 `BeginFrame` 切分，累计每帧内顶层 `FunctionCall`、`EventDispatch`、`FireAnimationFrame`、`TimerFire` 的时长 |
| 长任务 | 追踪里 > 50ms 的 `RunTask` |
| 强制同步布局 | 追踪里带 `beginData.stackTrace` 的 `Layout` 事件（脚本读取布局导致的同步布局） |
| 引擎帧耗时 | §6.2 的 `FrameRecord` |
| React 提交 | `window.__hxPerf.commits()`，按区域和时间段计数 |
| 交互延迟 | `PerformanceObserver({type: 'event', durationThreshold: 16})` 的 `duration` 最大值 |
| 内存 | `performance.measureUserAgentSpecificMemory()`（基准台开启了跨源隔离）；JS 堆用 CDP `HeapProfiler.collectGarbage` 后的 `Runtime.getHeapUsage`；DOM 节点用 `Memory.getDOMCounters` |
| 时间点（可交互、就绪） | 场景脚本等待 DOM 条件成立时打 `hx:s:*` 标记，用两标记之差 |

### 6.6 门禁、基线与参考机（K169）
- **CI 里**（`O.02` 接入）每次合并请求跑 `pnpm -C web bench` 与 `pnpm -C web perf`，两层判定，都通过才算通过：
  1. **绝对预算**：`budgets.ts` 里没有 `reference` 标记的条目全部满足。计数类（掉帧、长任务、强制布局、React 提交、每帧 `run` 次数、包体积、内存上限）在任何机器上都有效，CI 照常判定。
  2. **相对基线**：数值类指标（p95 帧脚本时间、引擎帧耗时、切换和打开耗时、内存）不比 `baseline.json` 差 5% 以上（越大越好的指标不低于基线的 95%，`G.08`）。无头浏览器的帧率最多 60，用帧率算比例看不出退步，所以基线比较帧耗时，不比较帧率。
- **基线**：`baseline.json` 提交在仓库里，记录了产生它的机器指纹（CPU 型号、核数、操作系统、Chrome 版本）。CI 机器指纹不同（例如更换了机器类型）时跳过第 2 层并在报告里写明，只判第 1 层。只有 `pnpm -C web perf:update` 能改它；改基线的提交单独成一个合并请求，说明原因（例如有意接受的退步、换机器），必须经人工评审（`G.08-R3`）；不允许为了通过门禁顺手更新基线（`G.02.05-R30`）。
- **参考机**：`U.17` 的测量环境是"中端笔记本（4 核、16GB），Chrome"。每个里程碑结束前在这样一台机器上跑 `pnpm -C web perf --reference`，带 `reference` 标记的条目（S1 冷启动 ≤ 1.5 秒等受机器影响大的绝对时长）在这里判定；报告存进 `docs/perf/<里程碑>.md`，是里程碑完成的条件之一（`P.07`、`G.14` §4）。

### 6.7 包体积
- 性能构建开启 `build.manifest`；`size.ts` 读 `dist-perf/.vite/manifest.json` 和各分块，用 Node `zlib` 按 gzip 9 级压缩计算体积。
- **首屏**：入口分块加上它静态导入的全部分块（即会被 `modulepreload` 的那些）。**按目录统计**：把每个分块里属于某目录的模块渲染后代码（Rollup 的 `renderedLength` 对应的代码）拼起来再压缩，偏保守。
- 预算（`budgets.ts`，数字都来自各叶子）：
  | 项 | 预算（gzip） | 出处 |
  |---|---|---|
  | 首屏 JS | ≤ 350KB | `U.17` §1 |
  | 字体（`web/public/fonts/`） | ≤ 600KB | `U.17` §1 |
  | `main.tsx`、`App.tsx`、`routes/`、`shell/`（入口、外壳、主题、快捷键） | ≤ 40KB | `W.02` §9 |
  | 首屏里的 `components/ui/`（不含 `@floating-ui/dom`） | ≤ 30KB | `W.08` §9 |
  | `lib/i18n/` | ≤ 25KB | `W.10` §9 |
  | `pages/home/`（首页、空状态、模板卡片） | ≤ 8KB | `W.09.01` §9 |
  | `CenterHost` 分块 | ≤ 30KB；设置的每页分块 ≤ 25KB | `W.09.02` §9 |
  | 包、连接分区 | 各 ≤ 25KB | `W.09.04` §9 |
  | 首次引导 / 画布导览 | ≤ 20KB / ≤ 6KB | `W.09.03` §9 |
  | 运行历史 | ≤ 25KB | `W.09.05` §9 |
- **首屏禁止出现的模块**：`pages/center/`、`pages/welcome/`、`pages/history/`、`panels/menu/CommandPaletteImpl`、`pages/home/TemplateInputsPopover`（`W.02` §6、`W.09-R6`、`W.09.01` §9）。
- **生产构建检查**：对 `pnpm -C web build` 的产物 `web/dist/` 另检查一次：不含 `lib/perf/recorder`、`lib/perf/hud`、`react-dom/profiling`，全文没有 `hx:frame:` 字样（`__HX_PERF__` 已去掉相关代码）。
- `pages/*` 等叶子自己的分块测试（如 `W0902-T1`）继续保留；本节点的检查是全局兜底，两者结论必须一致。

### 6.8 微基准汇总
各叶子写成 `*.bench.ts` 的微基准由 `pnpm -C web bench` 统一运行（`vitest bench --run --outputJson web/.perf/bench.json`），`report.ts` 用每项的中位数对照 `budgets.ts`。当前登记的：
| 编号 | 内容 | 预算 | 出处 |
|---|---|---|---|
| `W0301-T12` | 500 节点 `fromDoc` | ≤ 10ms | `W.03.01` |
| `W0304-T14` | 10 万条事件 `ingest` | ≤ 2 秒 | `W.03.04` |
| `W0403-T10` | 500 节点 `fromWire` | ≤ 5ms | `W.04.03` |
| `W0606-T10` | 200 节点 300 连线的层"摘下 + 挂回" | ≤ 10ms | `W.06.06` |
| `W0615-T14` | `canvas-run.bench.ts`：30 节点并发的 `flush` | ≤ 1.5ms / 帧 | `W.06.15` |
| `W10-T16` 附 | 1 万次 `fmtRelTime` | ≤ 20ms | `W.10` §9 |
以后任何叶子新加 `*.bench.ts`，在 `budgets.ts` 里加一行（`id = 'bench.<测试编号>'`、`ref` 写出处），不登记的微基准只报告不判定。微基准在 jsdom 里跑，只测纯计算；涉及布局、绘制的预算一律放在 §6.4 的真实浏览器场景里。

### 6.9 开发用性能浮层（K170）
- demo 的"调试 › 压力测试"与 FPS 浮层不进产品：命令面板没有"调试"组（`W.07.11`），生产构建不含浮层代码（§6.7）。
- 开发模式与性能构建里，地址带 `?perf=1` 时 `App.tsx` 在 `#hx-layers` 末尾渲染 `PerfHud`：右上角一个小框，显示近 1 秒帧率、最长一帧、各区域近 1 秒的提交次数；只用令牌，不挡画布操作（`pointer-events: none`）。浮层自己的刷新不经 React 状态（每秒直接写一次文本），不会计入任何区域。
- 要看大图效果时，开发者用 `perf:record` 之前生成的 `bench-200` 夹具（`pnpm -C web perf --only s04 --headed` 会打开它），不在产品里生成测试图。

## 7. 不变量
- 生产构建的行为、体积和网络请求与没有本节点时完全相同：`PerfRegion` 退化为原样返回，`__HX_PERF__` 相关代码全部去掉。
- `lib/perf` 不发任何网络请求，数据只留在页面内存里（INV-21）。
- 性能门禁不连真实后端、不调模型；同一提交、同一机器上重复运行，计数类指标结果相同。
- 基线只能由 `perf:update` 修改，且单独评审。

## 8. 错误处理
| 情况 | 结果 |
|---|---|
| 绝对预算不满足 | 该指标 `ok:false`，`perf` 退出码 1；报告写出指标、数值、预算、出处，并附追踪文件 |
| 比基线差 5% 以上 | 同上；报告同时给出基线值和差多少 |
| 机器指纹与基线不同 | 跳过相对比较，报告顶部写"基线来自另一类机器"；不算失败 |
| 回放遇到没录过的 `GET` | 场景失败，提示运行 `perf:record` |
| 夹具或事件不符合 schema | 生成或启动时失败，指出文件和字段 |
| 浏览器不支持 `measureUserAgentSpecificMemory` | S9 只记 JS 堆并警告；参考机测量时算失败 |
| 某轮场景超时（单轮 60 秒） | 该轮作废重跑一次，仍超时则失败 |

## 9. 性能与资源
- 性能构建里的测量开销：`onRender` 回调每次 ≤ 0.01ms；帧标记每帧 ≤ 0.05ms；场景的预算已包含这部分开销。
- `pnpm -C web perf` 总时长 ≤ 15 分钟（CI 单个任务）；`pnpm -C web bench` ≤ 3 分钟。
- 提交到仓库的夹具合计 ≤ 5MB，单个文件 ≤ 1MB（`G.07-R7`）。

## 10. 验收标准
1. 在当前代码上 `pnpm -C web perf` 与 `pnpm -C web bench` 全部通过，报告列出 §6.4 的 11 个场景、§6.7 的全部体积项、§6.8 的全部微基准，每项带出处。
2. 人为制造退步各自被拦下：在平移时让某个面板订阅视图（S4 的 React 提交 ≠ 0）；在拖动的帧任务里读一次 `getBoundingClientRect`（强制同步布局 ≠ 0）；在首屏静态导入 `pages/center/`（体积与首屏禁止项失败）；把 `run` 阶段改为每个事件写一次（每帧 `run` 次数 > 1）；让 p95 帧脚本时间增加 10%（相对基线失败）。
3. 生产构建 `web/dist/` 里找不到 `react-dom/profiling`、`lib/perf/recorder`、`lib/perf/hud`、`hx:frame:`；与去掉 `PerfRegion` 的构建相比，首屏 JS 体积差 ≤ 0.2KB。
4. 同一提交在同一台机器上连续跑 3 次 `perf`：计数类指标完全相同，数值类指标的中位数相差 ≤ 3%。
5. 基准台只监听 `127.0.0.1`；全过程没有发往 `127.0.0.1` 以外的请求。
6. 开发模式加 `?perf=1` 显示浮层；不加不显示；生产构建加了也不显示。
7. 参考机测量的报告包含机器信息和 S1 的判定结果。

### 实施卡
- 要建 / 要改的文件：`web/src/lib/perf/index.ts`、`PerfRegion.tsx`、`recorder.ts`、`hud.tsx`、`hud.css`，及 `recorder.test.ts`、`PerfRegion.test.tsx`；`web/src/env.d.ts`（声明 `__HX_PERF__`）；`web/vite.config.ts`（只加 §4.2 的 `perf` 分支和 `build.manifest`）；`web/package.json`（只加 §4.3 的 `scripts`）；`web/tests/bench/` 下 §4.3 列出的全部文件（叶子自己的 `*.bench.ts` 除外）；`.gitignore` 加 `web/dist-perf/`、`web/.perf/`；`docs/perf/README.md`（参考机测量的做法）。
- 不许碰的文件：`web/src/` 下除 `lib/perf/`、`env.d.ts` 以外的全部（`AppShell`、`CanvasArea` 包 `PerfRegion` 由 `W.02.02` 的实施任务做，`frame.ts` 的帧标记由 `W.06.01` 的实施任务做，`App.tsx` 挂 `PerfHud` 由 `W.02` 的实施任务做）；各叶子的 `*.bench.ts`；`schema/`（只读）；`cmd/`、`engine/`、`internal/`。
- 函数签名：见 §4、§5。
- 测试用例：
  - `W11-T1 PerfRegion`：`PERF=false` 时渲染结果与直接渲染 `children` 的 React 树相同（没有多出 `Profiler`）；`PERF=true` 时子组件更新 1 次 → `commits()` 多 1 条且 `region` 正确
  - `W11-T2 帧记录`：依次打 `hx:frame:struct:s/e`、`hx:frame:run:s/e`、`hx:frame:end` → 1 条 `FrameRecord`，含 `struct`、`run` 两个阶段的耗时
  - `W11-T3 记录上限`：写入 2 万 + 10 条 → 保留最新 2 万条
  - `W11-T4 夹具`：`make.ts` 两次运行输出逐字节相同；全部通过 `graph.schema.json`；`bench-200` 恰好 200 节点、300 连线
  - `W11-T5 事件脚本`：`run-30` 的每条事件通过 schema；任一时刻运行中的节点数为 30（±1）；5 秒内事件数 1800–2200
  - `W11-T6 回放`：录过的 `GET` 原样返回（含 `ETag`）；没录过的 `GET` → 404 且场景失败；响应带 COOP / COEP 头；只监听 `127.0.0.1`
  - `W11-T7 测量解析`：用一份固定的追踪文件和帧时间戳样本，`probe.ts` 算出的掉帧数、p95 帧脚本时间、长任务数、强制布局数与人工数的结果一致
  - `W11-T8 体积`：用一个小的样例构建（两个入口分块、一个动态分块），首屏集合、按目录统计、首屏禁止项检查都正确
  - `W11-T9 判定`：绝对预算超出 → 失败；相对差 6% → 失败、4% → 通过；`min` 指标低于基线 95% → 失败；指纹不同 → 跳过相对比较
  - `W11-T10 基线`：`perf:update` 之外的命令不改 `baseline.json`（运行前后文件哈希相同）
  - `W11-T11 生产构建干净`：§10 验收 3
  - `W11-T12 退步能被发现`：§10 验收 2（`web/tests/bench/regressions/` 下每种退步一个补丁，在临时分支上应用后跑对应场景，期望失败）
  - `W11-T13 可重复`：§10 验收 4
  - `W11-T14 浮层`：§10 验收 6
- 允许使用的依赖：运行时 `react`（含 `react-dom/profiling` 入口）；工具与测试 `@playwright/test`、`vitest`、`jsdom`、`ajv` 与 Node 标准库（`G.10` §3.4）。
- 禁止事项：`G.02.05` 全部（特别是 R25、R28、R30、R34）；另：不在产品界面加性能显示；不把性能构建产物嵌入 `harnessd`；`lib/perf` 不发网络请求；`canvas/core` 不 import `lib/perf`；不手写或修改录制的响应；不为了通过门禁放宽 `budgets.ts`（改预算先改出处文档，`G.02.03`）或更新基线。
- 完成标志：`G.14` 全部条件；§10 七条验收通过；第一份参考机报告已提交。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K166–K171 |
| 2026-11-23 | 事件脚本里的事件名改为 `node.state`（原写 `node.completed`，事件目录里没有） | W 全枝复查；`P.09` K185 |
