# W.06 画布引擎

| 项 | 内容 |
|---|---|
| 编号 | W.06 |
| 类型 | 实施 |
| 上级 | W 前端实现 web/ |
| 下级 | W.06.01 引擎生命周期、W.06.02 视图变换、W.06.03 节点渲染、W.06.04 连线渲染、W.06.05 LOD 与视口裁剪、W.06.06 DOM 池、W.06.07 选择与拖动、W.06.08 连线交互、W.06.09 键盘交互、W.06.10 几何计算、W.06.11 自动布局、W.06.12 小地图、W.06.13 嵌套子图、W.06.14 幽灵节点与提议渲染、W.06.15 运行状态渲染 |
| 状态 | 草稿 |
| 素材 | 设07、设08、设09、设17（§1–§6、§9）；demo `设计规范_v0.3/src/23_geom.js`、`24_render.js`；demo v0.5（v0.5.11）`25_pointer.js`、`29_nest.js`、`37_nodes.js`、`40_tidy.js`、`14_nodes.css`、`15_art.css`；`P.09` K94–K101、K102–K110 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`web/src/canvas/`：显示和编辑图的命令式引擎 `CanvasEngine`。它把 graph / view / run / model store 的内容画成 DOM（世界容器、节点、便签、连线、叠加层），处理画布上的指针、滚轮、键盘和拖放，把用户的修改交给 `OpsApi`（`W.05`），把需要 React 处理的请求（菜单、快速添加、属性页、进入子图的路由）发到引擎事件上。平移、缩放、拖动、运行状态更新期间 React 提交为 0（`U.17-R10`）。

本文把 15 个叶子的分工、目录、共用类型、模块之间的接口、每帧的处理顺序一次定下来；叶子只细化本文，不另起接口。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 图数据的存放、规范化、选择器 | `W.03.01`（引擎只读 `GraphModel` 和 `change`） |
| 预检、乐观应用、提交、回滚、撤销、端口兼容判断、类型推断 | `W.05`（引擎只调 `OpsApi`） |
| 当前层的来源（URL）、改 URL | `W.02.01`（引擎发 `nav.enter` / `nav.leave`，由 `Canvas.tsx` 调 `useNav()`） |
| 视图的持久化、按层记忆 | `W.03.02`（引擎读写 view store） |
| 选中的存放 | `W.03.03`（引擎调 `ui.actions.select`） |
| 菜单、快速添加面板、命令面板、属性页、下拉浮层、提示框的界面 | `W.07.11`、`W.07.03`、`W.08.04`（引擎只发事件、给锚点） |
| 停靠栏、小地图、父图位置卡的外框、按钮和拖动 | `W.07.06`（引擎只往它提供的挂载点里画缩略图） |
| 快捷键的注册中心和分发顺序 | `W.02.04`（引擎通过 `CanvasKeys` 注册处理函数） |
| 节点库的列表和拖出 | `W.07.02`（拖到画布上的放下由 `W.06.07` 处理） |
| 运行事件的接收与投影 | `W.03.04`（引擎订阅 `live`） |
| 提议数据、档位 | `W.03.06` |
| 列表视图（`U.16` §4） | `W.07.03` |
| 设计令牌取值 | `U.02`、`U.03`、`U.05`、`U.06` |

## 3. 继承的上级约束
`W-R1`–`R4`、`R8`、`R9`、`R11`、`R14`；`W.01-R5`、`R6`、`R9`–`R11`、`R14`、`R16`；`W.01` §3.3；`W.03` §4.2、§6.3、§6.5；`G.06.02-R1`–`R6`；`G.06.03-R1`、`R6`–`R9`；`G.04.02`；`G.04.06`；`G.02.05-R23`–`R26`；`U.10` 全部；`U.17` 全部；`U.07.01`–`U.07.04`；`U.13.01`–`U.13.06`；`U.16` §3；`U.05`；`U.06` §3；`U.08-R3`；`U.12` §2–§5；`U.14.05`；`U.22-R7`；`U.23-R3`、`R7`–`R9`；INV-08、INV-20、INV-24；`P.09` K75、K76、K90、K94–K110。

## 4. 接口

### 4.1 目录与分工
```
web/src/canvas/
├─ Canvas.tsx            W.06.01  React 外壳：一个空根元素；构造、绑定、销毁引擎；把引擎事件转给路由和面板
├─ CanvasOverlays.tsx    W.06.01  React：节点内联下拉、AI 角标卡片两种浮层（用 W.08.04 的 Popover）
├─ adapters.ts           W.06.01  keys / theme / i18n 适配成 CanvasKeys、ThemeHooks、t
└─ core/                 不 import React（W-R1）
   ├─ engine.ts  types.ts  frame.ts  emitter.ts  scene.ts     W.06.01
   ├─ view/      viewport.ts wheel.ts fit.ts animate.ts background.ts resize.ts   W.06.02
   ├─ render/    node.ts widgets.ts note.ts                  W.06.03
   │             edge.ts                                     W.06.04
   │             lod.ts cull.ts                              W.06.05
   │             pool.ts                                     W.06.06
   ├─ interact/  pointer.ts select.ts drag.ts drop.ts        W.06.07
   │             link.ts edgeTools.ts                        W.06.08
   │             keyboard.ts focus.ts clipboard.ts           W.06.09
   ├─ geom/      const.ts shape.ts ports.ts bezier.ts hit.ts index.ts   W.06.10
   ├─ layout/                                                W.06.11
   ├─ minimap/   paint.ts minimap.ts                         W.06.12（paint.ts 是所有简化图的绘制器）
   ├─ nest/                                                  W.06.13
   ├─ ghost/                                                 W.06.14
   └─ runBridge.ts                                           W.06.15
```
各叶子只建自己那一行的文件；跨叶子只用 §4.4 列出的接口。目录以 `W.01` §3.2 为准（本次细化已同步改 `W.01`，`P.09` K98）。

### 4.2 对外：给 `Canvas.tsx` 和面板
```ts
// web/src/canvas/core/types.ts（实现归 W.06.01）
import type { Category, NodeDef, PortRef, TypeRef, Ulid, NodeState } from '@/lib/protocol';
import type { CanvasStores, Scope } from '@/state/types';
import type { View } from '@/state/viewStore';
import type { UiStoreApi } from '@/state/uiStore';
import type { CatalogStoreApi } from '@/state/catalogStore';
import type { OpsApi, DispatchResult } from '@/ops/types';

export type Pt = { x: number; y: number };                 // 世界坐标或屏幕坐标（相对画布根元素左上角），变量名写明：world / screen
export type Rect = { x: number; y: number; w: number; h: number };
export type Lod = 1 | 2 | 3;
export type CanvasKind = 'main' | 'replay' | 'library';   // 主画布、回放页、子图库预览（预览浮层不是画布实例，是主画布 nest/ 里的 canvas 简化图，K103）

export type CanvasShortcutId =                              // W.02.04 §4.1 里 layer 为 canvas / nest 的条目
  | 'tool.select' | 'tool.pan' | 'tool.pan.hold' | 'node.quickAdd' | 'sel.delete' | 'sel.all' | 'sel.duplicate'
  | 'clip.copy' | 'clip.paste' | 'group' | 'ungroup' | 'undo' | 'redo' | 'view.fit' | 'view.focusSel' | 'layout.tidy'
  | 'node.rename' | 'sel.move' | 'sel.moveFar' | 'focus.nextNode' | 'focus.prevNode' | 'link.keyboard' | 'menu.context'
  | 'nest.peek' | 'nest.enter' | 'nest.up' | 'canvas.escape';
export type CanvasKeys = {                                  // Canvas.tsx 把 W.02.04 的 keys.on 适配进来（W.02.04 §4.2）
  on(id: CanvasShortcutId, h: (e: KeyboardEvent, phase: 'down' | 'up') => boolean, o?: { when?: () => boolean }): () => void;
  label(id: CanvasShortcutId): string;
  overlay(kind: 'peek', h: (e: KeyboardEvent) => boolean): () => void;   // W.02.04 的 pushOverlay('peek')：预览浮层打开期间的 Esc / Enter（K104）
};
export type ThemeHooks = {                                  // W.02.03 themeController 的适配
  reducedMotion(): boolean;
  subscribe(fn: (changed: readonly ('palette' | 'theme' | 'motion')[]) => void): () => void;
};
export type EngineDeps = {
  kind: CanvasKind;
  ui: UiStoreApi;                  // 选中、工具、连接状态、fitInsets、提示（W.03.03）
  catalog: CatalogStoreApi;        // NodeDef、数据类型（W.03 §4.5）
  keys: CanvasKeys | null;         // 只有主画布注册快捷键
  theme: ThemeHooks;
  t: (key: string, vars?: Record<string, string | number>) => string;   // W.10 的 t.dyn；自己写的键用 canvas. 或 common.，OpsApi 给的 textKey 原样传入（K159）
  newId: () => Ulid;               // W.04.01 的 newUlid：新建节点、便签、连线的 ID
  icon: (name: string) => SVGSVGElement;   // U.08 图标表里的图标（Canvas.tsx 从 W.08 的图标模块取，每次返回新元素）
  now?: () => number;              // 测试注入
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (h: number) => void;
};
export type BoundDoc = { stores: CanvasStores; ops: OpsApi | null };   // ops = opsFor(stores.graph)（W.05 §4.2）

export type HitTarget =
  | { kind: 'canvas' } | { kind: 'node'; id: Ulid } | { kind: 'selection'; nodeIds: readonly Ulid[] }
  | { kind: 'edge'; id: Ulid } | { kind: 'note'; id: Ulid } | { kind: 'port'; ref: PortRef; dir: 'in' | 'out' };
export type EngineEvents = {                                // 引擎事件（P.06 §10），W.01-R10
  ready: { scope: Scope };
  'nav.enter': { containerId: Ulid };                      // → useNav().enterLayer（W.02.01）
  'nav.leave': { to: Scope };                              // → useNav().leaveTo
  'menu.open': { at: Pt; target: HitTarget };              // 右键、Shift+F10 → W.07.11（at 为屏幕坐标）
  'quickAdd.open': { at: Pt; world: Pt; from?: { port: PortRef; type: TypeRef }; insert?: Ulid };   // 双击空白、A、拖线到空白、连线中点"+"
  'inspect': { nodeId: Ulid; focus: 'first' | 'label' | { param: string } };   // Enter（非容器）、双击非容器节点、F2 → 属性页
  'param.editLarge': { nodeId: Ulid; key: string };        // 双击节点上的多行文本（U.10.07-R1）
  'prompt.preview': { nodeId: Ulid };                      // 指令框的眼睛按钮（U.10.07 §3）
  'popover.select': { anchor: Rect; nodeId: Ulid; key: string; value: string;
                      options: readonly { value: string; label: string; disabled?: boolean }[] | 'connection' | 'model' | 'rolecard';
                      pick(v: string): void; close(): void };   // 节点内联下拉 → CanvasOverlays
  'hovercard.open': { anchor: Rect; kind: 'ai'; nodeId: Ulid };   // AI 角标悬停卡（U.12 §2）
  'hovercard.close': {};
  'tree.locate': { scope: Scope };                         // 预览浮层的"在结构树中定位" → W.07.02（K104）
  'node.action': { nodeId: Ulid; act: 'approve' | 'deny' | 'rerun' | 'details' };   // 节点上的按钮 → Canvas.tsx 转给 session / run 的 action（rerun = 从这里重跑，U.19.05）
};
export type EngineCommands = {                              // 引擎命令（P.06 §10）：面板、快捷键、路由调用
  fit(o?: { animate?: boolean }): Promise<View>;                                  // W.06.02
  focusNodes(ids: readonly Ulid[], o?: { animate?: boolean }): Promise<View>;     // W.06.02
  zoomBy(f: number): void;                                                        // 停靠栏 + / −，以视口中心
  addNode(d: { type: string; params?: Record<string, unknown>; label?: string; tags?: readonly string[]; meta?: Record<string, unknown> },
          o: { at: Pt | 'center'; connectFrom?: PortRef; insertInto?: Ulid }): Promise<DispatchResult>;   // W.06.07；快速添加、节点库点击添加；meta.preset 只用于显示来源（C.15-R1，K114）
  addNote(o: { at: Pt }): Promise<DispatchResult>;                                // W.06.07：右键空白处"添加便签"（at 为屏幕坐标；没有对应快捷键，不能经 exec，K111）
  tidy(ids?: readonly Ulid[]): Promise<DispatchResult>;                           // W.06.11
  locate(t: { scope: Scope; nodes: readonly Ulid[] }): void;                      // W.06.13：撤销后定位、监控页步骤、"看这里"
  highlight(ids: readonly Ulid[], kind: 'look' | 'model'): void;                  // W.06.13；U.10.05 §2
  peek(nodeId: Ulid): void;  closePeek(): void;                                   // W.06.13
  mountSlot(kind: 'minimap' | 'nestCard', host: HTMLElement): () => void;         // W.06.12、W.06.13：React 外框提供挂载点
  exec(id: CanvasShortcutId, o?: { at?: Pt; target?: HitTarget }): Promise<boolean>;   // W.06.09：停靠栏、右键菜单、命令面板执行与快捷键相同的动作（K104）
};
```
```ts
// web/src/canvas/core/engine.ts（W.06.01）
export class CanvasEngine {
  constructor(root: HTMLDivElement, deps: EngineDeps);
  readonly events: { on<K extends keyof EngineEvents>(k: K, fn: (p: EngineEvents[K]) => void): () => void };
  readonly cmd: EngineCommands;
  bind(doc: BoundDoc | null): void;     // 切换会话、换图；null = 空白画布（U.14.02）
  dropDoc(graphId: Ulid): void;         // 工作区释放时丢掉这份文档的 DOM 缓存（W.03.05 onDispose）
  destroy(): void;                      // 幂等
}
```
- `mountSlot` 是 `W.01-R10`"不互相持有 DOM 引用"的唯一例外：React 外框把一个空容器交给引擎，引擎在里面建、管、删自己的 `<canvas>`，返回的函数解除挂载；双方都不碰对方的其他元素（`P.09` K98）。

### 4.3 内部：每个模块拿到的上下文
```ts
// web/src/canvas/core/types.ts（续）
export type FramePhase = 'input' | 'view' | 'struct' | 'patch' | 'run' | 'geom' | 'cull' | 'overlay';
export type Frame = { request(phase: FramePhase, task: () => void): void };   // 同一帧同一 task 只执行一次（W.06.01）
export type SceneChange = { full: boolean; nodes: ReadonlySet<Ulid>; edges: ReadonlySet<Ulid>; notes: ReadonlySet<Ulid>; structure: boolean };
export type Scene = {                                       // W.06.01 建好的 DOM 骨架
  root: HTMLDivElement;  bg: HTMLDivElement;  world: HTMLDivElement;   // bg：网格与背景（W.06.02），不是 world 的祖先
  edgeSvg: SVGSVGElement;  edgeBase: SVGGElement;  edgeFlow: SVGGElement;  edgeGhost: SVGGElement;  edgePreview: SVGPathElement;
  notes: HTMLDivElement;  nodes: HTMLDivElement;  ghosts: HTMLDivElement;
  worldUi: HTMLDivElement;    // 世界坐标的叠加物：对齐参考线、吸附光环、连线中点按钮、AI 光标
  screenUi: HTMLDivElement;   // 屏幕坐标的叠加物：框选框、拖线原因提示、端口提示
};
export type EngineCtx = {
  readonly deps: EngineDeps;  readonly scene: Scene;  readonly frame: Frame;
  readonly emit: <K extends keyof EngineEvents>(k: K, p: EngineEvents[K]) => void;
  doc(): BoundDoc | null;  model(): GraphModel | null;  scope(): Scope;
  view(): View;  viewport(): { w: number; h: number };  toWorld(s: Pt): Pt;  toScreen(w: Pt): Pt;
  readonly(): boolean;        // §6.6
  live: Map<Ulid, Pt>;        // 拖动中节点的实时位置（W.06.07 写，geom.pos 先读它）
  vp: ViewportApi;  geom: Geom;  pool: Pool;  lod: LodApi;  nodes: NodeLayer;  edges: EdgeLayer;
  pointer: PointerApi;  sel: SelectionApi;  drag: DragApi;  link: LinkApi;  nest: NestApi;  thumbs: ThumbPainter;
};
```

### 4.4 模块之间的接口（叶子必须按这个形状实现）
```ts
// W.06.02 view/viewport.ts
export type ViewportApi = { apply(v: View): void; panBy(dxScreen: number, dyScreen: number): void; zoomAt(s: Pt, f: number): void;
  animateTo(v: View): Promise<View>; reveal(r: Rect): Promise<View>; zooming(): boolean; onSettle(fn: (k: number) => void): () => void };
// W.06.10 geom/index.ts
export const L: Readonly<{ nodeW: number; nodeWSm: number; head: number; pad: number; row: number; widget: number;
  widgetArea: number; groove: number; thumb: number; foot: number; grid: number; port: number; portHit: number; snapR: number; edgeHit: number;
  noteW: number; noteH: number }>;   // 便签缺省尺寸（C.02.05 Note.size 缺省时）
export type PortSlot = { name: string; dir: 'in' | 'out'; index: number; label: string; type: TypeRef; cat: Category;
  required: boolean; multi: boolean; dynamic: boolean; promoted: boolean; variable: boolean };   // variable：提示词 {{变量}} 端口
export type WidgetSlot = { key: string; widget: string; tall: boolean; boundFrom: Ulid | null; locked: boolean };
export type NodeShape = { w: number; h: number; inPorts: readonly PortSlot[]; outPorts: readonly PortSlot[];
  widgets: readonly WidgetSlot[]; thumb: boolean; foot: boolean; collapsed: boolean; known: boolean; sig: string };   // sig 变了 = 节点内部要重建
export type PortCand = { ref: PortRef; at: Pt };
export type Geom = {
  shape(id: Ulid): NodeShape;  setFoot(id: Ulid, on: boolean): void;
  pos(id: Ulid): Pt;  box(id: Ulid): Rect;  portPos(ref: PortRef, dir: 'in' | 'out'): Pt;
  edgePath(edgeId: Ulid): { d: string; mid: Pt } | null;  bezier(a: Pt, b: Pt): { d: string; mid: Pt };
  bounds(ids?: Iterable<Ulid>): Rect | null;  query(r: Rect): readonly Ulid[];
  nearestPort(c: readonly PortCand[], p: Pt, r: number): PortCand | null;  snap(v: number, on: boolean): number;
  forModel(m: GraphModel): Pick<Geom, 'shape' | 'pos' | 'box' | 'portPos'>;   // 按另一份模型（幽灵预览图）计算，不读 live（K104）
};
// W.06.06 render/pool.ts
export type Pool = { node(id: Ulid): HTMLDivElement; note(id: Ulid): HTMLDivElement; edge(id: Ulid): SVGGElement;
  has(kind: 'node' | 'note' | 'edge', id: Ulid): boolean; release(kind: 'node' | 'note' | 'edge', id: Ulid): void;
  switchScope(from: Scope, to: Scope): void; switchDoc(graphId: Ulid | null): void; dropDoc(graphId: Ulid): void };
// W.06.05 render/lod.ts
export type LodApi = { level(): Lod; onChange(fn: (l: Lod) => void): () => void; visible(id: Ulid): boolean; culling(): boolean;
  onReveal(fn: (nodeIds: readonly Ulid[]) => void): () => void; pin(ids: Iterable<Ulid>): () => void };   // pin：拖动、键盘焦点中的节点不被裁剪
// W.06.03 render/node.ts
export type NodeRunLook = { state: NodeState; last: boolean; pct?: number; text?: string; meta?: string;
  round?: { cur: number; max: number }; approvalId?: Ulid; retry?: boolean };   // last：U.10.02-R2 "上次"
export type NodeMark = 'selected' | 'marquee' | 'dragging' | 'ghost' | 'ghost-remove' | 'dim' | 'ref-newer';
export type NodeLayer = { sync(c: SceneChange): void; moveEl(id: Ulid): void; setRun(id: Ulid, r: NodeRunLook | null): void;
  setMark(id: Ulid, m: NodeMark, on: boolean): void; flash(id: Ulid, kind: 'focus' | 'model', times?: 1 | 2): void;
  repaintThumb(id: Ulid): void; renderInto(el: HTMLDivElement, rec: NodeRec, o: { ghost: true }): void; el(id: Ulid): HTMLDivElement | undefined };
// W.06.04 render/edge.ts
export type EdgeLayer = { sync(c: SceneChange): void; updateFor(nodeIds: Iterable<Ulid>): void; ofNode(id: Ulid): readonly Ulid[];
  paintSelection(ids: ReadonlySet<Ulid>): void; setHover(id: Ulid | null): void; setRun(id: Ulid, look: 'idle' | 'done' | 'inactive'): void;
  setFlow(id: Ulid, on: boolean): void; setMark(id: Ulid, m: 'ghost' | 'ghost-remove', on: boolean): void;
  preview(a: Pt | null, b?: Pt, look?: 'free' | 'snap' | 'bad', cat?: Category): void };
// W.06.07 interact/pointer.ts、select.ts、drag.ts
export type PointerMode = 'idle' | 'pan' | 'drag' | 'marquee' | 'link' | 'control';
export type PointerApi = { mode(): PointerMode; cancel(): boolean; setTempPan(on: boolean): void; last(): Pt | null };   // last：指针在画布里的最新屏幕坐标，离开画布为 null（K104）   // cancel：Esc 取消进行中的拖动 / 框选 / 拖线，有进行中的返回 true
export type SelectionApi = { current(): CanvasSelection; set(s: Omit<CanvasSelection, 'scope'>): void; has(kind: 'node' | 'edge' | 'note', id: Ulid): boolean };
export type DragApi = { activeGroup(): Ulid | null; moveBy(ids: readonly Ulid[], dx: number, dy: number, o?: { groupId?: Ulid }): Promise<DispatchResult> };   // groupId：连续方向键共用一组（K104）
// W.06.08 interact/link.ts（W.06.09 键盘连线也用它）
export type LinkApi = { targets(from: PortRef): readonly { ref: PortRef; check: Precheck }[];
  connect(from: PortRef, to: PortRef, o?: { replacing?: Ulid }): Promise<DispatchResult>; disconnectPort(ref: PortRef, dir: 'in' | 'out'): Promise<DispatchResult>;
  firstFit(type: TypeRef, def: NodeDef, dir: 'in' | 'out'): string | null };   // 还不在图里的节点上第一个能接这种类型的端口（快速添加、插入连线）
// W.06.13 nest/
export type NestApi = { peek(nodeId: Ulid): void; closePeek(): boolean; peekOpen(): boolean;
  beforeSwitch(from: Scope, to: Scope): void; afterSwitch(from: Scope, to: Scope): void; docSwitched(): void;   // docSwitched：切换会话后的进入转场（U.09.04-R5，K104）
  locate(t: { scope: Scope; nodes: readonly Ulid[] }): void };
// W.06.12 minimap/paint.ts
export type ThumbPainter = { paint(cv: HTMLCanvasElement, src: { model: GraphModel; scope: Scope; live?: LiveRun | null },
  o: { mode: 'thumb' | 'mini' | 'card' | 'peek'; mark?: Ulid; view?: View }): { s: number; ox: number; oy: number } };
```
- `GraphModel`、`NodeRec`、`CanvasSelection`、`LiveRun`、`Precheck` 分别来自 `W.03.01`、`W.03.03`、`W.03.04`、`W.05` 的导出类型（`W.01-R6`）。
- `NodeShape` 的端口类型：声明里是 `$T` 的端口取 `OpsApi.portTypes(scope)` 的推断结果（`W.05` §4.1，`P.09` K99），推断不到为声明值；显示类别按 `C.04.01-R4`。`firstFit` 用 `OpsApi.fits(src, dst)`（同样是 K99 新增）判断两个数据类型能不能接。
- 模块用工厂创建：`createXxx(ctx): Xxx & { dispose(): void }`，由 `engine.ts` 按 §6.1 的顺序组装；模块之间不互相 import 实现文件，只用 `EngineCtx` 上的接口。

## 5. 数据结构
- 协议类型只从 `@/lib/protocol` 导入；store 状态类型从 `@/state/*` 导入类型（`W.01-R6`）。
- 本枝私有结构：§4.2–§4.4 的全部类型；各叶子内部的缓存结构写在各叶子里。
- 引擎不持有图数据副本：节点、连线、便签一律从 `ctx.model()` 现取；DOM 元素上只挂 `data-node-id`、`data-edge-id`、`data-note-id`、`data-port`、`data-dir`、`data-ctl`（`G.04.06`）。
- DOM 骨架（`W.06.01` 建，层次从下到上，`U.10.01-R8`、`U.06` §3）：
```
div.hx-canvas[tabindex=0][role=application]   ← 根；.lod-2 / .lod-3（W.06.05）；.is-zooming .is-panning .is-linking .is-readonly .is-pan-tool
├─ div.hx-canvas__bg                           ← 网格、光晕、颗粒、暗角、指针柔光（W.06.02，U.10.01、U.23-R7）
├─ div.hx-world                                 ← 唯一写 transform 的元素（U.17-R1）
│  ├─ svg.hx-edges > g.hx-edges__base, g.hx-edges__flow, g.hx-edges__ghost, path.hx-edges__preview
│  ├─ div.hx-notes                              ← 便签：连线之上、节点之下
│  ├─ div.hx-nodes
│  ├─ div.hx-ghosts                             ← 幽灵节点（W.06.14）
│  └─ div.hx-world-ui                           ← z：--hx-z-canvas-ui
└─ div.hx-canvas-ui                             ← 屏幕坐标叠加物；z：--hx-z-canvas-ui
```

## 6. 行为

### 6.1 组装顺序
`engine.ts` 构造时依次创建：frame → scene → geom（W.06.10）→ pool（W.06.06）→ viewport（W.06.02）→ lod（W.06.05）→ nodes（W.06.03）→ edges（W.06.04）→ sel / drag / drop（W.06.07）→ link（W.06.08）→ thumbs、minimap（W.06.12）→ nest（W.06.13）→ ghost（W.06.14）→ runBridge（W.06.15）→ layout（W.06.11）→ keyboard（W.06.09）→ pointer 路由（W.06.07，最后挂监听）。销毁顺序相反。

### 6.2 每帧的处理顺序
所有 DOM 写入都在 `requestAnimationFrame` 里、按下列阶段执行；没有脏数据时不申请帧（`U.17-R3`）。

| 阶段 | 谁 | 做什么 |
|---|---|---|
| `input` | W.06.07、W.06.08 | 取最新一次 `pointermove`，算拖动位移、拖线端点、框选框 |
| `view` | W.06.02 | 写世界容器 `transform`、网格 `background-*`；帧末 `view.actions.setView` |
| `struct` | W.06.03、W.06.04、W.06.06 | 换层、整图替换、增删元素（`change.full`、`scopes`） |
| `patch` | W.06.03、W.06.04、W.06.14 | 改动过的节点、连线、便签的内容与位置；选中环；幽灵元素与提议条 |
| `run` | W.06.15 | 合并后的运行状态写进节点和连线 |
| `geom` | W.06.04 | 受影响连线的 `d`（只算相连的，`U.17-R4`） |
| `cull` | W.06.05 | 视口裁剪（> 150 节点时） |
| `overlay` | W.06.07、W.06.08、W.06.14 | 框选框、对齐线、吸附光环、拖线预览、AI 光标 |
同一帧里先全部计算再写 DOM；帧任务里不读布局（不调 `getBoundingClientRect`、`offsetWidth`，`U.17-R2`）。视口尺寸只来自 `ResizeObserver`（W.06.02）。

### 6.3 store 订阅（W.06.01 负责接线，处理在各模块）
| 来源 | 订阅 | 交给 |
|---|---|---|
| graph `change` | `subscribe(s => s.change)` | 转成 `SceneChange`（只保留当前层的元素）→ `struct` / `patch`；`groupId === drag.activeGroup()` 时被拖节点的位置不从 store 回写（`W.05` §6.8 第 3 步）；`source='remote'` 且操作者是模型 → `nodes.flash(id,'model')`（`U.12` §4） |
| view `scope` | `subscribe(s => s.scope)` | §6.4 换层 |
| view `view` | `subscribe(s => s.view)` | 只在别人改了 store 时（切层恢复）`viewport.apply` |
| ui `selections.get(selectionKey)` | 选择器 + 引用相等 | `nodes` / `edges` 画选中 |
| ui `tool`、`net`、`layout.fitInsets` | 选择器 | 光标样式、只读、适应画布避让 |
| catalog `defs.registryHash` | 选择器 | 全部节点重算 `shape`，`sig` 变了的重建 |
| catalog `libSigs` | 选择器 + 引用相等 | 只有 `ref` 的子图引用节点重算 `shape`（`W.06.10` §6.2，K145） |
| model（W.06.14）、run `live`（W.06.15） | 各自接口 | 各叶子 |
| theme | `deps.theme.subscribe` | 缩略图、小地图重画；`motion` 变化时转场与流动动画按新开关 |

### 6.4 换层
URL 变化 → 工作区 `setLocation` → view `enterScope(scope)` → 引擎收到 `scope` 变化：
1. `nest.beforeSwitch(from, to)`：记下转场原点（W.06.13）。
2. `pool.switchScope(from, to)`：摘下上一层元素、挂上新一层（W.06.06）；`nodes.sync({full:true})`、`edges.sync({full:true})`；`runBridge.resync()`（W.06.15）、`ghost.sync()`（W.06.14）补写本层的运行状态和幽灵元素（K104）。
3. `needsFit` → `cmd.fit({animate:false})` 后 `markFitted`；否则 `viewport.apply(view)`（`U.07.02-R1`：转场前先定好视图）。
4. `nest.afterSwitch(from, to)`：播放转场；返回时选中并闪刚离开的容器节点（`U.07.02`）。
- 引擎自己不改当前层：双击、Enter、Esc 只发 `nav.enter` / `nav.leave`，由路由改 URL 后走上面的流程（`W.02.01` §6.3）。

### 6.5 用户修改怎么出去
| 操作 | 调用 | 叶子 |
|---|---|---|
| 拖动节点 / 便签 | `ops.gesture('drag', revert)` → `update(move_nodes)` 每帧 → `end()` | W.06.07 |
| 方向键移动 | `drag.moveBy` → 一次 `dispatch(move_nodes)` | W.06.09 |
| 连线、断线、改接 | `ops.canConnect` 预检 → `dispatch(connect / disconnect)` | W.06.08 |
| 节点上的参数 | `dispatch(set_param)`；数字拖动、滑块用 `gesture('step' / 'slide')` | W.06.03 |
| 从节点库放下、快速添加 | `dispatch([add_node, connect?])` 一批 | W.06.07 |
| 删除、复制、粘贴、打包、解散 | `dispatch` 一批 | W.06.09 |
| 整理布局 | `dispatch(move_nodes)` 一批 | W.06.11 |
一次用户动作只调一次 `dispatch`（数组），共用一个 `groupId`（`C.05-R3`）。引擎不直接写 graph store（INV-08）。

### 6.6 只读
`ctx.readonly()` = `deps.kind ∈ {replay, library}` 或 `doc.stores.readonly` 或 `doc.ops === null` 或 `canvasReadonly(ui)`（`U.14.05`）。只读时：拖动节点、连线、内联控件、删除、粘贴、放下全部不可用（控件 `disabled`，指针不进入这些模式）；平移、缩放、悬停提示照常；选中只在 `selectionKey ≠ null` 时可用（预览浮层不能选中，`U.13.06-R1`）。

### 6.7 规则
| 编号 | 规则 |
|---|---|
| W.06-R1 | `canvas/core/**` 只 import `W.01-R6` 允许的内容；不 import `react`、`react-dom`、`zustand/react`、`@/shell/**`、`@/panels/**`、`@/components/**`、`@/ops/**` 的实现（只能 import `@/ops/types`） |
| W.06-R2 | 一个画布实例一个引擎；模块里没有可变的模块级变量（常量除外），主画布、回放画布、子图库预览的引擎可以同时存在、互不影响；预览浮层属于主画布引擎，不另建引擎（K103） |
| W.06-R3 | 平移、缩放、拖动、框选、拖线、运行状态更新期间：不调用任何 React `setState`，只写 DOM；对 store 的写入只有 `view.actions.setView`（每帧最多一次）和 `OpsApi.gesture().update`（`W.05` 节流到 250ms） |
| W.06-R4 | 写样式只写令牌引用和几何值（`G.06.03-R9`）：`el.style.transform`、`el.style.setProperty('--_x', 'var(--hx-…)')`、`d`、`width` / `height`（几何）；颜色、字号、阴影、时长一律在 CSS 里用令牌 |
| W.06-R5 | 用户和模型写的文字（显示名、参数值、便签、提示）只用 `textContent` / `setAttribute` 写入；不对数据拼 `innerHTML` |
| W.06-R6 | 判断指针点到什么：`pointerdown` 用 `event.target`；`click`、`dblclick`、`pointerup` 用 `document.elementFromPoint`（`W.01-R11`）；拖线吸附、框选用几何计算 |
| W.06-R7 | 所有 JS 动画（视图过渡、转场、闪烁）在 `deps.theme.reducedMotion()` 为真时按 `U.07.04` 的替代处理 |
| W.06-R8 | 界面文字只来自 `deps.t`（`W.10`）：引擎自己写的键以 `canvas.` 或 `common.` 开头；`OpsApi` 预检返回的 `textKey`（`ops.precheck.*`、`assign.*`）原样传给 `deps.t`；用词以 `P.06` 为准（`P.09` K159） |
| W.06-R9 | 一个帧任务抛错不影响其他任务：捕获、`console.error`（同一任务名每分钟最多一次），下一帧对当前层做一次全量同步 |
| W.06-R10 | 节点可以用键盘到达（`Tab`，`W.06.09`）；节点和连线都有可访问名称（`U.16` §3）：节点 `role="group"`、`aria-label` = "{类型} {名称}，{状态}，{N} 个输入、{M} 个输出"；连线逐条的键盘编辑走列表视图（`U.16` §4，K105） |

## 7. 不变量
- 世界容器是唯一按视图变换的元素；节点位置只写 `translate3d`（`U.17-R1`、`R4`）。
- 画布上显示的每个节点、连线、便签都属于当前层，且都在 `ctx.model()` 里；拖动结束后 `ctx.live` 为空。
- 引擎没有任何直接修改图数据的代码路径；所有修改都经过 `OpsApi`。
- 同一时刻最多一个指针模式（平移 / 拖动 / 框选 / 拖线 / 控件拖动）在进行。
- `destroy()` 之后：没有残留的事件监听、定时器、`ResizeObserver`、`rAF`、store 订阅。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 节点类型的 NodeDef 还没加载或不存在 | `shape.known=false`：按紧凑宽度画只有头部的占位节点，类型行写"未知节点类型"，同时 `catalog.actions.nodeDef(type)`；加载后重建 |
| `dispatch` 结果为 `blocked` | 按 `Precheck.textKey` 在指针旁显示一行原因（1.6 秒），不弹提示 |
| `dispatch` 结果为 `rejected` / `dropped` / `proposal` | 提示由 `W.05` 负责，引擎只恢复视觉（拖动回到 store 里的位置） |
| 帧任务抛错 | W.06-R9 |
| store 里的选中引用了已不存在的元素 | 画的时候跳过；清理由工作区调 `pruneSelection`（`W.03.03`） |

## 9. 性能与资源
| 场景（200 节点、300 连线） | 预算 |
|---|---|
| 平移、缩放、拖动、拖线、框选 | 60fps，单帧脚本 ≤ 8ms；拖 1 个节点 ≤ 1ms，拖 20 个 ≤ 3ms；拖线命中 ≤ 2ms |
| 增删节点、撤销后画面更新 | ≤ 16ms |
| 进入 / 返回子图（不含转场） | ≤ 100ms（`U.17` §1） |
| 30 个节点同时运行 | 60fps，每帧合并一次（W.06.15） |
| 1000 节点 | 平移 ≥ 30fps |
| 期间 React 提交 | 0（缩放停下后的缩放百分比 1 次除外，`W.03.02`） |
| 内存 | 反复创建、删除 200 节点 10 次，堆不持续增长 |

## 10. 验收标准
1. 15 个叶子的验收全部通过。
2. 200 节点、300 连线的基准图上：平移 1 秒、滚轮缩放 1 秒、拖动节点 1 秒、拖线 1 秒、框选 1 秒，Performance 录制无掉帧段、无 > 50ms 长任务、无强制同步布局，React Profiler 提交次数为 0（`Q.08`、`W.11`）。
3. 主画布与回放画布（或子图库预览）同时存在：两个引擎互不影响，关闭后没有残留监听（`W0601-T8`）。
4. ESLint：`canvas/core/` 下 import `react` 或 `@/ops/queue` 报错（`W.01` §4）。
5. 断开服务 3 秒后画布不能拖动和编辑，可以平移缩放；恢复后可以编辑（`U.14.05`）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版：目录、共用类型、模块接口、帧阶段、订阅表 | 第 6 棒；`P.09` K94–K101 |
| 2026-11-23 | `CanvasKind` 去掉 `peek`（预览浮层是 canvas 简化图）；接口补 `CanvasKeys.overlay`、`PointerApi.last`、`DragApi.moveBy` 的 `groupId`、`Geom.forModel`、`NestApi.docSwitched`、`cmd.exec`、`tree.locate`；§6.2 `patch` 阶段加 W.06.14；§6.4 第 2 步补 `runBridge.resync`、`ghost.sync`；R2、R10 措辞 | 第 7 棒写 `W.06.09`–`W.06.15`；`P.09` K103–K105 |
| 2026-11-23 | §4.2 `addNode` 的 `d` 加 `meta`；新增引擎命令 `addNote` | 第 8 棒写 `W.07.02`、`W.07.11`；`P.09` K111、K114 |
| 2026-11-23 | §6.3 订阅表加 catalog `libSigs`（只有 `ref` 的子图引用的端口签名，替代 K104 的临时做法） | 第 9 棒写 `W.09.02`；`P.09` K145 |
| 2026-11-23 | R8 与 §4.2 `EngineDeps.t` 注释：允许 `common.` 键，预检的 `textKey` 原样传入 | 第 10 棒写 `W.10`；`P.09` K159 |
