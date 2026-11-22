# W.06.01 引擎生命周期

| 项 | 内容 |
|---|---|
| 编号 | W.06.01 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设18 §5（`Canvas` 外壳只渲染一次、非 React 订阅、StrictMode 可重入）；设17 §9.2；demo `设计规范_v0.3/src/24_render.js`（`sync`、`resetDOM`）；`W.01` §3.3 |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布引擎的"骨架"：`Canvas.tsx` 挂载与卸载、`CanvasEngine` 的构造 / 绑定文档 / 销毁、DOM 骨架、帧调度器、引擎事件与引擎命令、store 订阅的接线、换层的编排、帧任务的错误隔离；以及把引擎事件转给路由和面板的两个 React 文件。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 各阶段帧任务里的具体渲染与交互 | `W.06.02`–`W.06.15`（本文只调度） |
| 菜单、快速添加面板、属性页的界面 | `W.07.11`、`W.07.03`（它们用本文的 `useCanvasEvent` 订阅） |
| 改 URL | `W.02.01`（本文只把 `nav.*` 转给 `useNav()`） |
| 快捷键的处理逻辑 | `W.06.09`（本文只把 `CanvasKeys` 适配好交给它） |
| 工作区的创建与释放 | `W.03.05`（本文登记 `onDispose` 回调） |

## 3. 继承的上级约束
`W.06` §4.2、§4.3、§5、§6.1–§6.4、§6.6、`W.06-R1`–`R3`、`R9`；`W.01-R9`、`R10`、`R16`；`W.03` §4.2（`useCanvasStores`、`useAppStores`）；`W.03.02` §6.4；`W.03.05` §4.3（`onDispose`）；`W.05` §4.2（`opsFor`）；`W.02.01` §4.2；`W.02.03` §4（`themeController`）；`W.02.04` §4.2；`G.06.01`；`U.14.02`（空白画布）；`U.16` §3；`U.17-R10`；`P.09` K98。

## 4. 接口

### 4.1 React 一侧
```tsx
// web/src/canvas/Canvas.tsx
export type CanvasProps = {
  kind?: CanvasKind;                 // 缺省 'main'
  stores?: CanvasStores | null;      // 缺省用 useCanvasStores()（主画布）；预览浮层、回放页自己传
  className?: string;
};
export function Canvas(p: CanvasProps): JSX.Element;            // 只渲染 <div className="hx-canvas …" ref>，之后不再因 store 变化重渲染
export function CanvasProvider(p: { children: ReactNode }): JSX.Element;   // 外壳 CanvasArea 里包住主画布和浮动层（W.02.02）
export function useCanvasCommands(): EngineCommands | null;    // 主画布的引擎命令；引擎未就绪为 null（停靠栏、快速添加、监控页定位用）
export function useCanvasEvent<K extends keyof EngineEvents>(k: K, fn: (p: EngineEvents[K]) => void): void;   // 面板订阅主画布的引擎事件

// web/src/canvas/CanvasOverlays.tsx —— Canvas 内部使用
export function CanvasOverlays(p: { engine: CanvasEngine }): JSX.Element;   // 'popover.select' 下拉、'hovercard.open' AI 角标卡

// web/src/canvas/adapters.ts
export function adaptKeys(k: typeof keys): CanvasKeys;                       // W.02.04 的 keys.on / label
export function adaptTheme(c: typeof themeController): ThemeHooks;           // W.02.03
```

### 4.2 引擎一侧
```ts
// web/src/canvas/core/engine.ts —— 签名见 W.06 §4.2
export class CanvasEngine { constructor(root: HTMLDivElement, deps: EngineDeps); /* events, cmd, bind, dropDoc, destroy */ }

// web/src/canvas/core/frame.ts
export function createFrame(o: { raf: (cb: FrameRequestCallback) => number; caf: (h: number) => void;
  onError: (phase: FramePhase, err: unknown) => void }): Frame & { flushNow(): void; dispose(): void };
export const PHASES: readonly FramePhase[];   // W.06 §6.2 的顺序

// web/src/canvas/core/emitter.ts
export function createEmitter<E extends Record<string, unknown>>(): {
  on<K extends keyof E>(k: K, fn: (p: E[K]) => void): () => void;
  emit<K extends keyof E>(k: K, p: E[K]): void;
  clear(): void;
};

// web/src/canvas/core/scene.ts
export function createScene(root: HTMLDivElement, kind: CanvasKind, t: EngineDeps['t']): Scene & { dispose(): void };
```

### 4.3 依赖
`W.06` §4.2–§4.4 的全部类型；`W.03` §4.2 的 `useCanvasStores`、`useAppStores`、`CanvasStores`；`W.03.03` 的 `UiStoreApi`、`selectionOf`、`canvasReadonly`；`W.03.05` 的 `WorkspaceManager.current().onDispose`；`W.05` 的 `opsFor`、`OpsApi`；`W.02.01` 的 `useNav`；`W.02.03` 的 `themeController`；`W.02.04` 的 `keys`；`W.04.01` 的 `newUlid`（经 `@/lib/protocol`）；`W.10` 的 `t`；`W.08.04` 的 `Popover`（只在 `CanvasOverlays.tsx`）。

## 5. 数据结构
- 引擎私有：`BoundDoc` 与它的订阅句柄列表 `unsubs: (() => void)[]`；脏标记 `pending: SceneChange`（多次 `change` 在一帧内合并：集合取并，`full` 取或）。
- 帧调度器：每个阶段一个 `Set<() => void>`；`request` 往对应集合里放，同一个函数同一帧只执行一次。

## 6. 行为

### 6.1 `Canvas.tsx` 的挂载
1. 渲染 `<div className="hx-canvas" ref={root} />`，之后组件不订阅任何会导致重渲染的 store 字段（`W.01-R9`）；`kind`、`stores` 变化时组件会重渲染，但只在 effect 里调 `engine.bind`。
2. `useEffect([])`：`engine = new CanvasEngine(root, deps)`；deps 来自 `useAppStores()`（`ui`、`catalog`）、`adaptKeys(keys)`（只有 `kind='main'`）、`adaptTheme(themeController)`、`t`、`newUlid`。返回的清理函数调 `engine.destroy()`。React StrictMode 下这一对会执行两次，第二次构造必须得到和第一次一样的结果（W0601-T2）。
3. `useEffect([stores])`：`engine.bind(stores ? { stores, ops: opsFor(stores.graph) } : null)`。
4. 主画布另外：`workspaces.current()?.onDispose(() => engine.dropDoc(graphId))` 为每个绑定过的文档登记一次（`W.01-R16`）。
5. 把 `engine.cmd` 和事件放进 `CanvasProvider` 的 Context（只放命令对象和订阅函数，不放 DOM）。
6. 订阅引擎事件并转发：`nav.enter` → `useNav().enterLayer(containerId)`；`nav.leave` → `leaveTo(to)`；`node.action`：`approve` / `deny` → `session.actions.resolveApproval(approvalId, {outcome})`（`approvalId` 取 run `live.stateOf(nodeId).approvalId`），`rerun` → 弹确认后 `run.actions.fork(...)`（`U.19.05` 第 4 步），`details` → `ui.actions.setRs(true, 'mon')` 并把节点交给监控页定位（`W.07.05` 用 `useCanvasEvent` 订阅同一事件）；其余事件由各面板自己订阅。

### 6.2 构造
1. 校验 `root` 是空的 `div`；不是 → 开发模式抛错。
2. `createScene`：按 `W.06` §5 建 DOM 骨架；根元素设 `tabindex="0"`、`role="application"`、`aria-label`（`t('canvas.aria.root')`）、`data-canvas-kind`；`aria-roledescription` 为"画布"。
3. `createFrame`（`raf` / `caf` 缺省 `window.requestAnimationFrame`），`onError` 按 `W.06-R9` 处理。
4. 按 `W.06` §6.1 的顺序创建各模块，组装 `EngineCtx`；每个模块的 `dispose` 依次压栈。
5. 订阅应用级 store（不随文档变化）：`ui.tool`、`ui.net`（`canvasReadonly`）、`ui.layout.fitInsets`、`catalog.defs.registryHash`、`deps.theme`。
6. 状态 `unbound`：画布显示空白画布空状态（`U.14.02`，文案和按钮由 `W.09.01` 叠在画布区域上，引擎只给根元素加 `is-empty`）。

### 6.3 `bind(doc)`
| 当前 → 新 | 处理 |
|---|---|
| 相同的 `stores` 对象 | 什么都不做 |
| 任何 → `null` | 退订文档级订阅；`pool.switchDoc(null)`（当前层元素摘下保留）；`is-empty` |
| 任何 → 新文档 | ① 退订旧文档的订阅（`graph.change`、`view.scope`、`view.view`、`ui.selections`、model、run）；② `pool.switchDoc(graphId)`：同一文档之前绑定过就接回缓存的元素（`W.06.06`）；③ 订阅新文档（`W.06` §6.3）；④ `graph.status !== 'ready'` → 根元素 `is-loading`，等 `ready` 再走 ⑤；⑤ 当前层全量同步（`nodes.sync({full:true})`、`edges.sync({full:true})`）；⑥ 视图：`needsFit` → `cmd.fit({animate:false})` → `view.actions.markFitted`；否则 `viewport.apply(view)`；⑦ `emit('ready', {scope})` |
- 切换会话只换 `stores`（`W.03.05`），不重建引擎；目标是切到已在内存里的会话 ≤ 300ms（`U.17` §1），其中引擎部分 ≤ 120ms（200 节点、DOM 已缓存）。

### 6.4 换层
按 `W.06` §6.4 四步执行，本文负责顺序与同步：第 2 步在同一帧的 `struct` 阶段完成，第 3 步在同一帧的 `view` 阶段之前算好视图；从 `scope` 变化到新层画出 ≤ 100ms（不含转场，`U.17` §1）。连续快速换层时，未播完的转场由 `W.06.13` 直接替换（`U.07.02-R2`）。

### 6.5 帧调度
- 任何模块要写 DOM 时 `frame.request(phase, task)`；调度器在第一次 `request` 时申请一次 `rAF`，帧内按 `PHASES` 顺序清空各阶段集合；某阶段执行中又 `request` 了更早的阶段 → 放到下一帧；同阶段或更晚的阶段 → 本帧内执行。
- `flushNow()`：测试和 `pointerup` 收尾用，同步执行当前所有待办（不再申请 `rAF`）。
- 页面不可见（`document.hidden`）时照常接受 `request`，但只在可见后执行一次合并后的帧（浏览器本来就暂停 `rAF`；本文保证可见后第一帧补齐）。

### 6.6 graph `change` 转成 `SceneChange`
- `change.full` → `{full: true}`。
- 否则：`nodes` / `edges` / `notes` 里只保留 `scope === ctx.scope()` 的 ID（已删除的元素在新 `model` 里找不到，按"属于当前层"处理，交给渲染层去删）；`change.scopes` 含当前层 → `structure: true`；含当前层里某个容器节点的子图 → 把那个容器节点加入 `nodes`（缩略图要重画，`W.03.01` §6.3）。
- 结果合并进 `pending`，`frame.request('struct')`。

### 6.7 销毁
`destroy()`：取消待办帧 → 按创建的逆序调用模块 `dispose` → 退订全部 store → 清空 `emitter` → 断开 `ResizeObserver` → 清空根元素的子节点和类名。第二次调用什么也不做。之后调用 `cmd.*` → 开发模式抛错，生产模式忽略。

### 6.8 `CanvasOverlays.tsx`
- `popover.select`：在 `anchor` 处打开 `W.08.04` 的 Popover 下拉；`options` 是字符串 `'connection' | 'model' | 'rolecard'` 时从 store 取选项：模型来自目录 store 的 `models`；连接、角色卡来自连接与资源库的数据（所在 store 在 `W.09.04`、`W.09.02` 定稿时确定，定稿前连接下拉只显示"新建连接…"、角色卡下拉只显示当前值）；连接下拉最后一项总是"新建连接…"（`U.10.07-R5`），选中后打开中心窗口的新建连接表单；选中调 `pick(v)`，关闭调 `close()`。
- `hovercard.open` / `close`：AI 角标卡显示理由、时间、操作者、"撤销"按钮；"撤销"调 `ops.revertOp(origin.opId)`，结果为 `done` 时 `cmd.locate(touched[0])`（`U.13.03-R3`、`R6`）。
- 这两个浮层的打开与关闭本身就是 React 提交，它们只在用户点击、悬停停留 400ms 后发生，不在热路径上。

## 7. 不变量
- 一个 `Canvas` 组件实例对应一个 `CanvasEngine`；`bind` 不会创建第二个引擎。
- 任何时候最多订阅一份文档的 graph / view / model / run。
- 帧任务按 `PHASES` 顺序执行；同一任务同一帧最多执行一次。
- `destroy()` 后根元素没有子节点，`window`、`document`、根元素上没有本引擎注册的监听。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 帧任务抛错 | `console.error('[canvas]', phase, err)`，同一阶段每 60 秒最多记一次；下一帧对当前层做一次 `full` 同步；连续 3 帧都抛错 → 根元素加 `is-broken`，画布显示"画布出了问题，已记录 · 重新加载画布"（按钮调 `bind(null)` 再 `bind(doc)`） |
| `graph.status = 'error'` | 不画图；根元素 `is-error`；错误界面由路由（`W.02.01` §8）负责 |
| `opsFor` 返回 null | 只读（`W.06` §6.6） |
| 引擎事件的监听函数抛错 | 捕获并 `console.error`，不影响其他监听者和引擎 |

## 9. 性能与资源
- 构造 + 第一次绑定（200 节点，冷启动无缓存）≤ 60ms 脚本时间；绑定已缓存的文档 ≤ 120ms（含全量同步）。
- 帧调度本身的开销 ≤ 0.1ms / 帧；空闲时不申请 `rAF`（录制 5 秒空闲画布：`rAF` 回调 0 次，运行中的流动动画是 CSS 动画，不占 `rAF`）。
- `Canvas.tsx` 在平移、缩放、拖动、运行期间的 React 提交为 0。

## 10. 验收标准
1. 主画布挂载、切换会话 20 次、卸载：没有残留监听和定时器；堆快照不持续增长。
2. StrictMode 下挂载：只有一个引擎在工作，DOM 骨架只有一份。
3. 主画布和预览浮层同时存在，各自平移缩放互不影响；关闭预览后预览引擎的监听全部移除。
4. 进入子图、返回：从 URL 变化到新层画出 ≤ 100ms（不含转场）。
5. 平移、拖动、30 个节点同时运行 5 秒：React Profiler 提交次数为 0。
6. 双击容器节点：地址栏 `scope` 变为该节点（经 `nav.enter` → `enterLayer`），画布进入那一层。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/Canvas.tsx`、`web/src/canvas/CanvasOverlays.tsx`、`web/src/canvas/adapters.ts`、`web/src/canvas/core/engine.ts`、`web/src/canvas/core/types.ts`（`W.06` §4.2–§4.4 的全部类型）、`web/src/canvas/core/frame.ts`、`web/src/canvas/core/emitter.ts`、`web/src/canvas/core/scene.ts`、`web/src/canvas/core/scene.css`（骨架层次、`--hx-z-canvas*` 层级）、对应的 `*.test.ts`、`web/src/canvas/Canvas.test.tsx`、`web/tests/e2e/canvas-lifecycle.spec.ts`。
- 不许碰的文件：`web/src/canvas/core/` 下其他叶子的目录（`view/`、`render/`、`interact/`、`geom/`、`layout/`、`minimap/`、`nest/`、`ghost/`、`runBridge.ts`，本叶子只调用它们的工厂；还没实现的模块用 `W.06` §4.4 形状的空实现占位，放在 `engine.test.ts` 里，不进产品代码）、`web/src/state/`、`web/src/ops/`、`web/src/lib/`、`web/src/shell/`、`web/src/panels/`。
- 函数签名：见 §4 与 `W.06` §4.2–§4.4。
- 测试用例（vitest + jsdom，假 `raf`、假 store）：
  - `W0601-T1 骨架`：构造后根元素下的层次、类名、`tabindex`、`role`、`aria-label` 与 `W.06` §5 一致
  - `W0601-T2 StrictMode`：同一根元素 构造 → 销毁 → 构造：只有一份骨架、监听数与只构造一次相同
  - `W0601-T3 帧顺序`：在 `patch` 阶段任务里 `request('view')` → 下一帧执行；`request('overlay')` → 本帧执行；同一函数同帧 `request` 3 次只执行 1 次
  - `W0601-T4 空闲不申请帧`：没有 `request` 时 5 秒内 `raf` 调用 0 次
  - `W0601-T5 change 合并`：一帧内 3 次 `change`（节点 a、b 和 `full:false`）→ 一次 `SceneChange{nodes:{a,b}}`；含 `full:true` → `full`
  - `W0601-T6 过滤当前层`：`change.nodes` 含另一层的节点 → 被丢弃；`change.scopes` 含当前层容器 X 的子图 → X 进入 `nodes`
  - `W0601-T7 bind`：绑定 A → 绑定 B → 再绑定 A：A 的订阅只有一份；第二次绑定 A 时 `pool.switchDoc(A)` 被调用、`needsFit=false` 时不调 `fit`
  - `W0601-T8 两个引擎`：两个根元素各一个引擎，A 平移不改 B 的 view store；销毁 B 后 A 照常
  - `W0601-T9 销毁`：`destroy()` 后 `window`、`document` 的监听计数回到构造前；`raf` 待办被取消；再调 `destroy()` 无异常
  - `W0601-T10 错误隔离`：某阶段任务抛错 → 同帧其他任务照常执行、`console.error` 1 次、下一帧 `full` 同步；连续 3 帧抛错 → `is-broken`
  - `W0601-T11 事件转发`：引擎发 `nav.enter` → `enterLayer` 被调用一次；`node.action{approve}` → `resolveApproval` 收到 `live` 里的 `approvalId`
  - `W0601-T12 只读`：`kind='peek'`、`ops=null`、`ui.net='reconnecting'` 三种情况 `ctx.readonly()` 为 true
  - `W0601-T13 端到端`：§10 验收 4、5、6（Playwright，`harnessd --fake-llm`，示例图 `graph_loop.json`）
- 允许使用的依赖：`react`、`react-dom`（只在 `Canvas.tsx`、`CanvasOverlays.tsx`）；`canvas/core/` 无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R24、R25）；另：`Canvas.tsx` 不用 `useGraphStore` / `useRunStore` 之类会随图变化重渲染的 hook；不把引擎实例或 DOM 放进 React state；`CanvasProvider` 的 Context 值只包含命令对象和订阅函数；不在构造函数里同步做 200 节点的渲染（交给第一帧）。
- 完成标志：`G.14` 全部条件；§10 六条验收通过；`W.06-R1` 的 ESLint 规则在 `web/eslint.config.js` 里生效（由 `G.06.04` 维护，本叶子只验证）。
