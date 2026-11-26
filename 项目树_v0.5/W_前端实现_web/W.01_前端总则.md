# W.01 前端总则

| 项 | 内容 |
|---|---|
| 编号 | W.01 |
| 类型 | 规范 |
| 上级 | W 前端实现 web/ |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 设18 §1–§7；引01 §3；ADR-003；demo v0.5（v0.5.11）`sj/demo_v0.5/src/` |
| 最后修改 | 2026-11-26 |

## 1. 目的
统一前端的技术栈、目录、分层和数据流向。设计规范 18 号是按 Next.js 写的（`P.09` K9），布局也是旧版（K8）；本文按 ADR-003（Vite + React）和 demo v0.5.11 的新布局重写，是 W 枝所有实施文档的共同前提。不统一的后果：画布被 React 拖慢、store 各写一套、demo 里的逻辑被迁到错误的位置。

## 2. 适用范围
`web/` 下的全部代码、样式、测试，以及写这些代码的人和实施模型。

## 3. 规则

### 3.1 技术栈
| 编号 | 规则 |
|---|---|
| W.01-R1 | Vite + React 19 + TypeScript（`G.06-R1` 的 strict 选项）+ zustand + react-router；包管理用 pnpm，锁文件提交（`G.10-R6`） |
| W.01-R2 | 纯客户端：没有 SSR、没有 BFF、没有 `'use client'`；构建产物是 `web/dist/` 静态文件（ADR-003） |
| W.01-R3 | 开发时 `anydoor --dev` 把 `/api` 和 SSE 之外的请求代理到 Vite dev server；前端代码里不出现后端地址常量，一律用相对路径 `/api/v1/…` |
| W.01-R4 | 样式是普通 CSS + BEM 类名，和组件放在一起（`G.06.03-R3`）；全局样式只有生成的 `styles/tokens.css`、`styles/themes.css`（`G.16`）和手写的 `styles/base.css` |

### 3.2 目录与归属
`web/src/` 下每个目录都属于 W 树的一个节点（`G.03-R9`）。实施时文件放在下表对应位置，跨节点的文件只能 import 对方的导出接口。

```
web/src/
├─ main.tsx  App.tsx                      W.02
├─ routes/                                W.02.01  路由表、各路由组件
├─ shell/                                 W.02     外壳
│  ├─ AppShell.tsx  layout.ts  breakpoints.ts   W.02.02  区域挂载、尺寸联动、断点
│  ├─ theme/                              W.02.03  主题（配色 × 明暗）
│  └─ keys/                               W.02.04  快捷键注册中心
├─ state/                                 W.03
│  ├─ graphStore.ts graphModel.ts graphSelectors.ts viewStore.ts uiStore.ts   W.03.01–W.03.03
│  ├─ runStore.ts runLive.ts modelStore.ts                                    W.03.04、W.03.06
│  ├─ sessionStore.ts activityPoller.ts catalogStore.ts appStores.ts          W.03.05
│  └─ workspace.ts eventRouter.ts WorkspaceProvider.tsx hooks.ts deps.ts types.ts   会话工作区（W.03.05）
├─ ops/                                   W.05     queue（dispatch）/ validate / typecheck / apply / merge / gesture / history / presence / hash / registry / useOps（不算逆操作，C.05-R1）
├─ lib/
│  ├─ protocol/                           W.04
│  │  ├─ generated/                       生成物，禁止手改（G.02.05-R1）
│  │  ├─ index.ts（唯一入口）types.ts mapping.ts assemble.ts   W.04.03
│  │  ├─ client.ts ulid.ts                W.04.01
│  │  ├─ events.ts sse.ts                 W.04.02
│  │  ├─ offline.ts                       W.04.05
│  ├─ i18n/                               W.10     index / t / zh（唯一文案表）/ format / clock / RelTime / errors；generated/messages.ts 为生成物
│  └─ perf/                               W.11     index / PerfRegion / recorder / hud（只在性能构建与开发模式里起作用）
├─ canvas/                                W.06（文件分工见 W.06 §4.1）
│  ├─ Canvas.tsx  CanvasOverlays.tsx  adapters.ts   W.06.01  React 外壳：只渲染一个根 div，挂载引擎；两种浮层；适配器
│  └─ core/                               不 import React（W-R1）
│     ├─ engine.ts types.ts frame.ts emitter.ts scene.ts   W.06.01
│     ├─ view/                            W.06.02
│     ├─ render/  node.ts widgets.ts note.ts · edge.ts · lod.ts cull.ts · pool.ts   W.06.03–W.06.06
│     ├─ interact/ pointer.ts select.ts drag.ts drop.ts · link.ts edgeTools.ts · keyboard.ts focus.ts clipboard.ts   W.06.07–W.06.09
│     ├─ geom/                            W.06.10
│     ├─ layout/                          W.06.11
│     ├─ minimap/  paint.ts（所有简化图的绘制器）minimap.ts   W.06.12
│     ├─ nest/                            W.06.13  预览浮层、进入 / 返回、父图位置卡
│     ├─ ghost/                           W.06.14
│     └─ runBridge.ts                     W.06.15
├─ panels/                                W.07
│  ├─ top-bar/  sidebar/  inspector/  chat/  monitor/  dock/
│  ├─ composer/  float-reply/  approval/  notice/  menu/
├─ components/ui/                         W.08
├─ pages/                                 W.09
│  ├─ home/  center/  welcome/  history/
└─ styles/  tokens.css  themes.css  themes.ts  icons.ts（四者为生成物）  base.css
web/public/  boot.js（首屏主题，W.02.03）  fonts/
web/tests/  kit/  lint/  e2e/  visual/  bench/   W.12（kit、lint、e2e、visual）、W.11（bench）；web/vitest.config.ts、web/playwright.config.ts 归 W.12
```

| 编号 | 规则 |
|---|---|
| W.01-R5 | 依赖方向只能向下：`routes` → `shell` / `pages` → `panels` → `components/ui`；`panels`、`pages`、`canvas/Canvas.tsx` 可以用 `state`、`ops`、`lib`；`state` 只依赖 `lib`；`lib/protocol` 不依赖 `state` 以外的任何前端目录 |
| W.01-R6 | `canvas/core` 只能 import：`@/lib/protocol` 导出的类型和常量（不直接引用 `generated/`，`W.04.04-R1`）、`state` 导出的 store **类型**（不是 hook）、`@/ops/types` 导出的类型（`OpsApi`、`DispatchResult`、`Precheck`、`Gesture`）。文案函数 `t`、`newUlid`、图标、快捷键、主题都由 `Canvas.tsx` 经 `EngineDeps` 注入（`W.06` §4.2，`P.09` K98）。store 实例和 `OpsApi` 由 `Canvas.tsx` 在构造引擎时传入（`opsFor(graph)`，`W.05` §4.2） |
| W.01-R7 | `components/ui` 不依赖 `state`、`ops`、`lib/protocol`：它只是带样式的控件，数据和回调都从 props 进来。它只能 import `react`、`react-dom`、`@floating-ui/dom`（只在 `overlay/position.ts`）、`@/lib/i18n`、`@/styles/icons` 和自己目录里的文件；需要外壳的能力（浮层按键压栈、减少动效、浮层容器）由 `W.02` 经界面环境 `UiEnv` 注入（`W.08` §4.3，`P.09` K121）。目录外只从 `@/components/ui` 导入 |
| W.01-R8 | 不建 `utils/`、`common/`、`helpers/`（`G.03-R7`）；被三个以上目录用到的纯函数，按用途在 `lib/` 下新建目录，并在 W 树登记 |

### 3.3 画布与 React 的分工
| 交给 React | 交给画布引擎（直接写 DOM） |
|---|---|
| 外壳、顶部条、左右侧栏、输入框、浮动回复、审批卡片、提示、通知、中心窗口、引导 | 世界容器的 `transform`（平移、缩放） |
| 右侧栏属性页的参数表单（选中节点的详情） | 节点的创建、复用、删除（DOM 池）；节点上的内联参数控件（原生 DOM） |
| 菜单、命令面板（由引擎发出"在这里打开菜单"的请求） | 节点位置（拖动中）、连线 path、运行状态 class 和进度 |
| 父图位置卡、小地图、停靠栏的**外框和按钮**（可拖动的浮动面板，`W.07.06`） | 父图位置卡和小地图里的**缩略图**（canvas 绘制，`U.17-R11`）、预览浮层的简化图 |
| — | 叠加层：框选、拖线预览、吸附光环、幽灵节点、AI 光标 |

| 编号 | 规则 |
|---|---|
| W.01-R9 | `Canvas.tsx` 只渲染一个空根元素，在 `useEffect` 里 `new CanvasEngine(root, deps)`，卸载时 `destroy()`；它不订阅任何会导致重渲染的 store 字段（`W.06.01`） |
| W.01-R10 | 画布引擎和 React 面板之间只通过 store、引擎事件 `EngineEvents` 和引擎命令 `EngineCommands`（`W.06` §4.2）通信，不互相持有对方的组件或 DOM 引用。唯一例外是 `cmd.mountSlot`：小地图、父图位置卡的 React 外框把一个空容器交给引擎，引擎只在里面画缩略图（`P.09` K98） |
| W.01-R11 | 判断指针点到了什么，必须用指针坐标 `document.elementFromPoint` 取真实元素，不能用 `event.target`——拖动用了指针捕获，之后 click / dblclick 的 target 是画布本身（`U.13.06-R7`，demo v0.5.10 的教训） |

### 3.4 数据流
```
           ┌──── 三条 SSE 流（W.04.02）：会话流 · 图协同流 · 运行流 ────┐
后端 ──────┤                                                          ├──► store（W.03）──► React 选择器（面板）
           └──── REST 响应（W.04.01）───────────────────────────────────┘           └──► store.subscribe（画布引擎）
                                                                                    └──► RunBridge 按帧合并（W.06.15）
用户操作 ──► 面板 / 画布引擎 ──► dispatch(op)（W.05）──► 预检 ──► 乐观应用 ──► POST /ops ──► 确认 / 回滚
                              └► 非图操作（运行、审批、设置）──► store 的 action ──► REST
```
| 编号 | 规则 |
|---|---|
| W.01-R12 | 服务器数据只有两个入口：REST 响应和 SSE 事件，都先经过 `mapping.ts` 转成 camelCase（`W.04.03`），再写进 store |
| W.01-R13 | 组件不直接发请求（`G.06.01-R4`）：调用 store 的 action 或 `dispatch(op)` |
| W.01-R14 | 同一份服务器数据只存一处：图在 graph store、运行在 run store、会话和消息在 session store、提议在 model store；待审批和急停状态是全局的，只在 session store 存一份（`W.03.05`）；派生数据（结构树、类型推断、校验结果）用纯函数按版本号缓存，不另存状态（`G.06.02-R6`） |

### 3.5 会话工作区
切换会话时，图、所在层、视图、撤销、档位、对话、提议、运行信息整体切换，回来时恢复现场（`U.09.04`、`P.09` K40）。

| 编号 | 规则 |
|---|---|
| W.01-R15 | 每个打开过的会话对应一个 `SessionWorkspace`：持有它自己的 graph / view / run / model store 和对话数据（`W.03` 定义）；ui store 和主题、侧栏开合等全局界面状态不属于任何会话 |
| W.01-R16 | 内存里最多保留最近 5 个会话的工作区，超过时释放最久没用的（清空它的 store 和 DOM 池引用；它的 SSE 流在切走时已经关闭，R17）；再切回来时从服务端重新加载，并按 `last_location` 和 localStorage 的视图记录恢复现场 |
| W.01-R17 | 后台会话的运行不中断（`U.09.04-R1`）。只有当前会话的工作区连 SSE：会话流、当前图的图协同流、当前运行的运行流，合计最多 3 条（`B.05.04`：同源 HTTP/1.1 最多 6 条连接，要给 REST 请求留位置）；切走时三条全部关闭并记下各自的续传位置，切回时续传。会话列表上的"● 运行中"、待审批角标和急停状态不靠后台会话流（会话流里也没有这些事件，`C.06.04`），由 session store 定时刷新 `/runs`、`/approvals`、`/estop` 得到（`W.03.05`，`P.09` K73） |

### 3.6 demo 迁移对照
demo v0.5.11 是界面参考实现（`sj/demo_v0.5/画布_demo_v0.5.html`，模块在 `src/`，基础模块来自 `设计规范_v0.3/src/` 和 `布局demo_v0.4/src/`）。迁移时按下表把逻辑放到对应节点，**重写成 TypeScript 模块，不整段复制**；demo 里的示例数据（模型名、价格、用量）一律不进产品代码。

| demo 模块 | 迁到 |
|---|---|
| `22_state.js` | `W.03` |
| `23_geom.js` | `W.06.10` |
| `24_render.js` | `W.06.03`–`W.06.06` |
| `25_pointer.js`（v0.5） | `W.06.07`、`W.06.08` |
| `26_keys.js`（v0.5） | `W.02.04`、`W.06.09`、`W.07.11` |
| `27_panels.js` | `W.07.03`、`W.07.05` |
| `28_run.js` | `W.03.04`、`W.06.15` |
| `29_model.js` | `W.03.06`、`W.06.14`、`W.07.09` |
| `29_nest.js`（v0.5） | `W.06.13` |
| `30_layout.js`（v0.4）、`10_body.html`（v0.5） | `W.02.02` |
| `31_palette.js`、`09_palettes.css` | `W.02.03`（配色值进 `design/tokens.css`，`U.03.05`） |
| `32_sessions.js` | `W.03.05`、`W.07.02` |
| `33_config.js` | 只作为界面字段参考；真实数据来自 `B.04.07`–`B.04.12` |
| `34_center.js` | `W.09.02` |
| `38_hub.js` | `W.09.04` |
| `35_inbox.js` | `W.07.10`（通知中心）、`W.09.03`（首次引导） |
| `36_composer.js` | `W.07.07` |
| `37_nodes.js` | `W.06.03`（节点上的参数）、`W.07.02`（节点库）、`W.07.03`（属性页） |
| `39_monitor.js` | `W.07.05` |
| `40_tidy.js`、`41_fix.js`、`42_hier.js`、`13_polish.css`–`23_tab.css` | 已回写进 `U.23`、`U.24`；按规范在各组件里实现，不保留"补丁层" |
| `43_float.js` | `W.07.08`（浮动回复的线条收拢 / 展开）、`W.08`（流动高亮） |
| `44_drag.js` | `W.07.06`（可拖动的浮动面板） |
| `20_icons.js`（v0.3） | `W.08.01` 的 `Icon`；图标形状迁成 `design/icons/*.svg`，由 `tools/gen icons` 生成 `styles/icons.ts`（`G.16`、`U.08`） |
| `21_defs.js`（v0.3） | 不迁到前端：节点类型定义在 `schema/builtin/nodedefs/`（`C.13`），前端从目录 store 取（`W.03` §4.5）；里面的示例参数、示例图只作 `schema/examples/` 的参考 |
| `30_embed.js`（v0.3：压力测试、FPS） | 不进产品；200 节点 · 300 连线成为 `W.11` 的基准夹具 `bench-200`，FPS 浮层成为开发用性能浮层（`P.09` K170） |
| `02_base.css`–`07_extra.css`（v0.3）、`08_layout.css`（v0.4）、`11_sessions.css`、`12_center.css` | 按 `U` 和令牌在各组件旁重写（`W.01-R4`、`R18`）：节点与连线 → `W.06.03`、`W.06.04`；控件 → `W.08`；外壳 → `W.02.02`；会话列表 → `W.07.02`；中心窗口 → `W.09.02` |

| 编号 | 规则 |
|---|---|
| W.01-R18 | demo 用 `!important` 层层覆盖的写法（`17_fix.css` 等）不迁移；产品里每个组件的样式只写一份，结果和 demo v0.5.11 的最终效果一致 |
| W.01-R19 | demo 里有、规范里没有的行为，先上报（`G.02.03`），不直接实现；规范里有、demo 里没有的，照规范实现 |

## 4. 检查方式
- ESLint `no-restricted-imports`：`canvas/core/**` 禁止 `react`、`react-dom`、`zustand/react`、`**/panels/**`、`**/components/**`；`components/ui/**` 禁止 `**/state/**`、`**/ops/**`、`**/lib/protocol/**`、`**/shell/**`、`**/panels/**`、`**/pages/**`、`**/canvas/**`、`**/routes/**`；`components/ui` 以外禁止 `@/components/ui/*`（只能 `@/components/ui`）；`lib/protocol/` 以外禁止 import `lib/protocol/generated/**`（W.01-R5–R7、`W.04.04-R1`）。规则写在 `web/eslint.config.js`，由 `G.06.04` 统一维护。
- 自定义规则 `hx/no-react-in-canvas-core`（`G.06.04` §1，实现见 `W.12` §6.4）补上 import 限制管不到的：`canvas/core/**` 里调用 `use` 开头的函数、出现 JSX（W-R1）；import 限制仍以上一条为准（`P.09` K179）。
- CI 检查 `web/src/` 的一级目录与 §3.2 一致（`G.03-R9`）。
- 性能基准（`W.11`、`Q.08`）：平移、拖动、运行状态更新期间 React Profiler 提交次数为 0（W.01-R9、`U.17-R10`）。
- 评审时看：新文件是否放在 §3.2 对应目录；是否有直接改图数据、直接发请求的组件；是否有 `event.target` 判断画布命中。

## 5. 例外
无例外。确需调整目录或依赖方向时，先改本文并在 `P.09` 登记。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | R14 补待审批与急停的归属；R17 改为只有当前工作区连 SSE（最多 3 条），后台会话的运行中、待审批、急停由定时刷新得到；§3.2 `state/` 补齐 W.03 的文件 | `P.09` K73 |
| 2026-11-23 | §3.2 目录树补 `lib/protocol/`、`ops/` 的文件；R6 与 §4 改为只从 `@/lib/protocol` 导入 | `P.09` K85、K88（写 `W.04`、`W.05` 时定稿） |
| 2026-11-23 | §3.2 `canvas/` 按 `W.06` §4.1 细化文件；R6 改为只 import `@/ops/types` 的类型、其余经 `EngineDeps` 注入；R10 补引擎命令与 `mountSlot` 例外 | `P.09` K98（写 `W.06` 时定稿） |
| 2026-11-23 | §3.2 `styles/` 补图标表 `icons.ts`；R7 写明 `components/ui` 能 import 什么、外壳能力经 `UiEnv` 注入；§4 ESLint 补对应限制 | 第 9 棒写 `W.08`；`P.09` K121、K122 |
| 2026-11-23 | §3.2 `lib/i18n/` 写明文件与生成物 | 第 10 棒写 `W.10`；`P.09` K158 |
| 2026-11-23 | §3.2 `lib/perf/` 写明文件 | 第 10 棒写 `W.11`；`P.09` K167 |
| 2026-11-23 | §3.2 `web/tests/` 补 `kit/`、`lint/` 与两个测试配置文件的归属 | 第 10 棒写 `W.12`；`P.09` K172 |
| 2026-11-23 | R4 全局样式补 `themes.css`；R16 与 R17 对齐（后台工作区本来就不连 SSE） | W 全枝复查；`P.09` K185 |
| 2026-11-23 | §3.6 补 demo 实际打包、但对照表里漏掉的模块：`20_icons.js`、`21_defs.js`、`30_embed.js` 与早期样式文件 | W 全枝复查；`P.09` K182 |
| 2026-11-26 | 状态改为"已审" | M1 第 ⑧ 片 `m1-web-base` 复查（`P.09` K300） |
