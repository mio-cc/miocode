# W.07.06 停靠栏与浮动面板

| 项 | 内容 |
|---|---|
| 编号 | W.07.06 |
| 类型 | 实施 |
| 上级 | W.07 面板组件 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5（v0.5.11）`44_drag.js`、`22_drag.css`、`43_float.js`（停靠栏的流动高亮）、`10_body.html`（停靠栏按钮）；demo v0.4 `29_nest.js`（`renderParent`）；`U.09.01` ③a–③c、R6；`U.13.06` §3；`U.03.03-R5`；`P.09` K98、K109、K114 |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布上三块可拖动的浮动面板的 React 外框：左侧竖排的停靠栏（工具按钮）、左下角的小地图外框（缩放比例、类型图例）、子图里左上角的父图位置卡外框（头部、收起、返回、"进 / 出"连接行）；三者共用的抓手拖动、吸附画布四边、按画布比例记住位置、双击复位；以及把空容器交给画布引擎画缩略图（`mountSlot`）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 小地图、父图位置卡里的缩略图绘制和点击导航 | `W.06.12`、`W.06.13`（本文只给 `host`） |
| 三块面板的默认位置、层级、窄屏隐藏小地图、小地图与对话框相交时隐藏 | `W.02.02` §6.2（它给小地图加 `is-hidden`） |
| 工具按钮执行的动作 | `W.06.09`（经 `cmd.exec`，与快捷键同一个处理函数） |
| 适应画布要避开的边距 | `W.02.02` §6.3（面板被拖走后避让值不变） |
| 流动高亮的实现 | `W.08` `GlideGroup` |

## 3. 继承的上级约束
`W.07` §4–§6、`W.07-R1`–`R14`；`W.01-R10`（`mountSlot` 是唯一例外）；`W.02.02` §6.2、§6.3；`W.03.01` §4.3（`crumbs`、`boundaryLinks`）；`W.03.02`（`useZoomPercent`）；`W.03.03`（`tool`、`setTool`）；`W.06` §4.2（`exec`、`zoomBy`、`fit`、`mountSlot`）；`W.06.12` §6（尺寸为 0 时不画）；`W.06.13` §6.7；`U.09.01` ③a、③b、③c、R4、R6；`U.13.06` §3、§4；`U.03.03-R5`；`U.06` §1（`r-xl` 停靠栏、`r-lg` 浮动面板）；`U.07.01-R1`；`U.16-R3`；`U.23-R6`、`R21`；`U.24` #20；`P.09` K98、K109、K114。

## 4. 接口

### 4.1 组件
```tsx
// web/src/panels/dock/FloatPanel.tsx —— 三块面板共用的可拖动外框
type FloatPanelProps = {
  id: 'dock' | 'mini' | 'nest';            // localStorage 键 hx:pos:<id>
  label: string;                           // 面板名（抓手的可访问名称"移动{label}"）
  grip: 'vertical' | 'horizontal';         // 停靠栏竖排抓手在顶部；小地图、父图位置卡横排抓手在头部左侧
  className?: string;                      // 默认位置由各自的 CSS 决定（W.02.02 §6.2）
  hidden?: boolean;
  children: ReactNode;
};
export function FloatPanel(p: FloatPanelProps): JSX.Element;
type GripProps = { orientation: 'vertical' | 'horizontal'; label: string; onDragStart(e: PointerEvent): void; onReset(): void; onNudge(dx: number, dy: number): void };
export function Grip(p: GripProps): JSX.Element;

export function Dock(): JSX.Element;
export function MinimapFrame(): JSX.Element;
export function TypeLegend(): JSX.Element;
export function NestCardFrame(): JSX.Element | null;      // 根图时 null
export function BoundaryRows(p: { links: readonly BoundaryLink[] }): JSX.Element;
```
```ts
// web/src/panels/dock/panelPos.ts —— 纯函数（几何量，W.07-R2）
export const SNAP = 12;                    // 吸附距离（U.09.01-R6）
export const MARGIN = 8;                   // 与画布边的最小距离
export const NUDGE = 8;  export const NUDGE_FAR = 40;     // 键盘移动步长
export type PanelPos = { fx: number; fy: number };        // 0..1：左上角在 (画布宽 − 面板宽) × fx、(画布高 − 面板高) × fy
export function clampSnap(x: number, y: number, box: { w: number; h: number }, area: { w: number; h: number }): { x: number; y: number };
export function toFrac(x: number, y: number, box: { w: number; h: number }, area: { w: number; h: number }): PanelPos;
export function fromFrac(p: PanelPos, box: { w: number; h: number }, area: { w: number; h: number }): { x: number; y: number };
export function loadPos(id: string, storage?: Storage): PanelPos | null;   // 值非法时 null
export function savePos(id: string, p: PanelPos | null, storage?: Storage): void;
```

### 4.2 依赖
`W.03` §4.2 的 hook；`W.03.01` 的 `crumbs`、`boundaryLinks`；`W.03.03` 的 `tool`、`selectionOf`、`layout.bp`；`W.03.02` 的 `useZoomPercent`；`W.06.01` 的 `useCanvasCommands`；`W.02.01` 的 `useNav().leaveTo`；`W.02.04` 的 `keys.label`；`W.07` §4.2 的 `useEditBlock`；`W.08` 的 `IconButton`、`GlideGroup`、`Tooltip`、`Icon`；`W.10` 的 `useT`。

## 5. 数据结构
- `PanelPos`（§4.1）：存 `hx:pos:dock`、`hx:pos:mini`、`hx:pos:nest`（JSON），没有记录 = 默认位置。按比例存，窗口缩放后仍在画布内（`U.09.01-R6`）。
- `hx:nestcard-min`（`"1"` / `"0"`）：父图位置卡是否收起（`U.13.06` §3"收起状态记住"）。`hx:legend`（`"1"` / `"0"`）：类型图例是否展开。三个键登记在 `W.03` §6.4（`P.09` K114）。
- 组件内部：拖动中的 `{pointerId, ox, oy, area, box}`、当前像素位置（只在 ref 里，拖动中不进 React 状态）。

## 6. 行为

### 6.1 拖动、吸附、记住（`FloatPanel`，`U.09.01-R6`、`U.24` #20）
1. 面板 `position: absolute`；没有记录时位置完全由 CSS 的默认类决定；有记录时加 `is-moved`：`left: 0; top: 0; transform: translate(var(--_x), var(--_y))`，`--_x`、`--_y` 由 JS 写几何值（`G.06.03-R9`）。
2. 抓手 `pointerdown`（左键）：`preventDefault`、`stopPropagation`（不让画布收到）、`setPointerCapture`；记下指针相对面板的偏移、画布区域（`FloatLayer` 容器）的尺寸和面板尺寸——都在按下时量一次，拖动中不再读布局。面板加 `is-dragging`（`cursor: grabbing`、阴影加深一级）。
3. `pointermove`（按 `requestAnimationFrame` 合并）：`clampSnap`：先夹到 `[MARGIN, 区域 − 面板 − MARGIN]`，离任一边 < `SNAP` 时贴到那一边；直接写 `--_x`、`--_y`（不触发 React 提交）。
4. `pointerup`：`savePos(id, toFrac(…))`；去掉 `is-dragging`。`pointercancel` 或拖动中按 `Esc`（抓手按钮自己的 React `onKeyDown`；`W.02.04` §7 只禁止全局 `keydown` 监听，元素自身的键盘处理不受限）→ 回到按下前的位置，不保存。
5. 双击抓手 → `savePos(id, null)`，回到默认位置。
6. 画布区域尺寸变化（`ResizeObserver`，回调里 `requestAnimationFrame` 合并）→ 有记录的面板按 `fromFrac` 重算并再夹一次。
7. 键盘：抓手是 `<button>`（`aria-label`"移动{label}"，提示框"拖动换位置 · 双击复位"）；方向键移动 `NUDGE`（`Shift` 时 `NUDGE_FAR`），`Home` 复位；每次移动后保存。抓手按钮在 `keydown` 里处理方向键并 `stopPropagation`，所以不会落到画布的方向键移动节点（焦点在抓手上时画布的 `when` 不成立，`W.06.09` §6.1）。
- 拖到别处后适应画布的避让值不变（`W.02.02` §6.3）；三块面板之间、面板与对话框之间不做碰撞处理，只保证都在画布内。

### 6.2 停靠栏（`Dock`，`U.09.01` ③a）
- 竖排胶囊（`r-xl`、玻璃材质），从上到下：抓手 · 选择 · 平移 ‖ 添加 · 打包为子图 · 整理布局 · 适应画布 ‖ 撤销 · 重做。按钮包在 `GlideGroup variant="icon"` 里（`U.23-R21`）。
  | 按钮 | 图标 | 动作（`cmd.exec`） | 状态 |
  |---|---|---|---|
  | 选择 | pointer | `exec('tool.select')` | `pressed = tool === 'select'` |
  | 平移 | hand | `exec('tool.pan')` | `pressed = tool === 'pan'` |
  | 添加 | plus | `exec('node.quickAdd')`（快速添加面板在可见区域中心打开） | 编辑被阻止时置灰 |
  | 打包为子图 | group | `exec('group')` | 选中 < 2 个节点时置灰，提示"先选中至少 2 个节点" |
  | 整理布局 | layout | `exec('layout.tidy')` | 编辑被阻止时置灰 |
  | 适应画布 | fit | `exec('view.fit')` | — |
  | 撤销 / 重做 | undo / redo | `exec('undo')` / `exec('redo')`（结果的定位与提示由 `W.06.09` 处理） | 编辑被阻止时置灰 |
- 每个按钮的提示框：名称 + `keys.label(对应快捷键)`（`W.07-R7`）；置灰时提示框写原因（`useEditBlock`）。
- `useCanvasCommands()` 为 null（引擎没就绪）时全部置灰。
- 小地图被隐藏时（`bp ∈ {md, sm, xs}`），缩放控件（−、百分比、+，见 §6.3）移到停靠栏最下方。

### 6.3 小地图外框（`MinimapFrame`，`U.09.01` ③b、`U.03.03-R5`）
- 196×120 的内容区（`r-lg`、玻璃）；头部一条：横排抓手；内容区是一个空 `div`（`host`），挂载时 `cmd.mountSlot('minimap', host)`，卸载或引擎换了时调返回的函数解除。外框被 `is-hidden`（`W.02.02`）时 `display: none`，`host` 尺寸为 0，引擎自己停画（`W.06.12` §6 第 2 步）；外框不卸载，不反复挂载。
- 内容区下方一行：`−`（`cmd.zoomBy(1 / 1.2)`）· 缩放百分比（`useZoomPercent()`，缩放停下后才更新；点击 → `cmd.fit()`，提示框"适应画布 · 1"）· `+`（`cmd.zoomBy(1.2)`）· 类型图例开关（`IconButton pressed`）。
- 类型图例（`TypeLegend`，展开时贴在小地图上方，同一块玻璃）：8 个显示类别各一行——圆点（`background: var(--hx-type-<cat>)`）+ 界面名（任意、上下文包、资源引用、列表、工具端点、数据、判定、状态，`U.03.03` §1）。只显示显示类别名，不显示数据类型（`U.03.03-R4`）。开关状态存 `hx:legend`。

### 6.4 父图位置卡外框（`NestCardFrame`，`U.13.06` §3、`P.09` K109）
- 只在子图里出现（当前层 ≠ `root`）；宽 236（`r-lg`、玻璃）。
- 头部："上一层 · {名称}"（`crumbs` 的倒数第二项；上一层是根图时写"根图"）· 收起按钮（`IconButton` collapse / expand，状态存 `hx:nestcard-min`）· 返回按钮（arrowUp，`useNav().leaveTo(上一层)`，提示框"返回上一层 · {keys.label('nest.up')}"）· 横排抓手。
- 主体：空 `div`（`host`），`cmd.mountSlot('nestCard', host)`；点缩略图返回上一层由引擎处理（`W.06.13` §6.7）。收起时主体和连接行都不渲染（`host` 尺寸为 0，引擎不画）。
- 连接行（`BoundaryRows`，`boundaryLinks(model, scope)`）：每条一行，等宽 11px：
  - `dir='in'`："进 {上游节点}.{端口} → {入口}"
  - `dir='out'`："出 {出口} → {下游节点}.{端口}"
  - 超过 6 行时只显示前 6 行和"还有 N 条"（点开展开全部）。点一行 → 返回上一层并选中那个上游 / 下游节点（`useLocate({scope: 上一层, nodes: [outer.nodeId]})`）。
- 进入、返回子图时外框跟着当前层变化（订阅 `view` 的 `scope` 只能经 `useCanvasStores().view.subscribe`——本组件用 `useSyncExternalStore` 包装它取 `scope`，只在换层时提交一次）。

### 6.5 材质与层级
- 三块面板：`background: var(--hx-bg-glass)`、`backdrop-filter: blur(var(--hx-blur-glass)) saturate(1.6)`、`box-shadow: var(--hx-shadow-float)`、层级 `--hx-z-float`（`U.23-R6`、`U.06` §3、`P.09` K112）。
- 不支持 `backdrop-filter` 的浏览器：退回 `--hx-bg-2` 实底（`@supports not (backdrop-filter: blur(1px))`）。

## 7. 不变量
- 三块面板任何时候都完整地在画布区域内（拖动、窗口缩放后都成立）。
- 本文对引擎的 DOM 只有 `mountSlot` 给出的空容器这一个接触点（`W.01-R10`）。
- 拖动面板期间画布不平移、不框选（抓手阻止了事件冒泡）。
- 停靠栏执行的动作与对应快捷键完全相同（都经 `cmd.exec`）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `hx:pos:*` 值非法 | 当作没有记录（默认位置），不覆盖原值 |
| localStorage 不可用 | 位置只在本次打开期间有效 |
| 引擎未就绪 / 换引擎 | `mountSlot` 在引擎就绪后再调；引擎替换时先解除旧的再挂新的 |
| `boundaryLinks` 返回空（新建的子图） | 不显示连接行 |
| `exec` 返回 false（例如没有选中时的 `view.focusSel`） | 不提示 |

## 9. 性能与资源
- 拖动面板：每帧只写两个 CSS 自定义属性，无 React 提交、无布局读取（尺寸在按下时量一次）。
- 缩放百分比只在缩放停下后更新一次（`W.03.02`）。
- 换层时父图位置卡外框提交一次；运行状态变化不引起本文任何提交（缩略图由引擎画）。

## 10. 验收标准
1. 拖动停靠栏的抓手到画布右边缘 10px 内：贴到右边（距边 8）；松手后刷新页面位置不变；缩小窗口后仍在画布内；双击抓手回到左侧居中（`U.09.01-R6`）。
2. 停靠栏每个按钮的提示框显示快捷键；"打包为子图"在选中少于 2 个节点时置灰并说明原因；点"整理布局"与按 `L` 效果相同。
3. 小地图显示当前层并随视图移动；点 `+` / `−` 缩放，百分比在缩放停下后更新；窗口 < 1100 时小地图不显示、缩放控件出现在停靠栏底部。
4. 类型图例列出 8 个类别的颜色和界面名；开关状态刷新后保持。
5. 第 3 层里父图位置卡头部"上一层 · 闭环迭代"，连接行"进 执行池.results → in""出 out → 验收者配方.in"（`U.13.06` §6 验收 2）；收起后只剩头部，刷新后仍收起；点返回回到第 2 层。
6. 只用键盘：Tab 到停靠栏的抓手，方向键移动它，`Home` 复位；焦点在抓手上时按方向键不会移动画布上的节点。
7. 拖动面板 3 秒，React Profiler 提交次数为 0。

### 实施卡
- 要建 / 要改的文件：`web/src/panels/dock/FloatPanel.tsx`、`Grip.tsx`、`Dock.tsx`、`MinimapFrame.tsx`、`TypeLegend.tsx`、`NestCardFrame.tsx`、`BoundaryRows.tsx`，每个同名 `.css`、`.test.tsx`；`web/src/panels/dock/panelPos.ts`、`panelPos.test.ts`；`web/tests/e2e/dock.spec.ts`；`web/tests/visual/dock.spec.ts`（默认位置、被拖到四角、浅色 / 深色）。
- 不许碰的文件：`web/src/canvas/`（缩略图在 `W.06.12`、`W.06.13`）、`web/src/shell/`（默认位置、`is-hidden` 在 `W.02.02`）、`web/src/state/`、其他 `panels/` 目录、`design/tokens.css`。
- 函数签名：见 §4。
- 测试用例：
  - `W0706-T1 clampSnap`：区域 1000×700、面板 48×320：`x=990` → `x=1000−48−8`；`x=15`（离左边 7）→ `x=8`；`y=−50` → `8`
  - `W0706-T2 比例往返`：`toFrac` → `fromFrac` 在同一区域下误差 ≤ 0.5px；区域缩小后仍在区域内
  - `W0706-T3 存取`：`loadPos` 对 `"{"`、`{"fx":2}`、`null` → null；`savePos(null)` 删除键
  - `W0706-T4 拖动不提交`：模拟 30 次 `pointermove` → 组件渲染次数不变；`pointerup` 后 `hx:pos:dock` 有值
  - `W0706-T5 Esc 取消`：拖动中按 `Esc` → 回到原位，不保存
  - `W0706-T6 双击复位`：有记录时双击抓手 → 键被删除，`is-moved` 去掉
  - `W0706-T7 键盘移动`：方向键 → 移动 8px 并保存；`Shift+→` → 40px；`Home` → 复位；事件不冒泡到 `window`
  - `W0706-T8 停靠栏动作`：每个按钮调用对应的 `cmd.exec(id)`；`tool='pan'` → 平移按钮 `aria-pressed=true`；选中 1 个节点 → 打包置灰
  - `W0706-T9 mountSlot`：挂载时 `mountSlot('minimap', host)` 1 次；卸载时调用返回的函数；`is-hidden` 时不重新挂载
  - `W0706-T10 缩放`：`+` → `zoomBy(1.2)`；点百分比 → `fit()`；`bp='md'` → 缩放控件在停靠栏
  - `W0706-T11 图例`：8 行、类别名与 `U.03.03` §1 一致；开关写 `hx:legend`
  - `W0706-T12 父图位置卡`：根图不渲染；第 2 层 → 头部"上一层 · 根图"；`boundaryLinks` 两条 → 两行格式正确；收起写 `hx:nestcard-min`
  - `W0706-T13 端到端`：§10 验收 1、5、6（Playwright）
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部；另：拖动中不 `setState`、不读布局；不对 `left` / `top` 做动画；不碰 `host` 里引擎创建的元素；不为面板之间写碰撞逻辑。
- 完成标志：`G.14` 全部条件；§10 七条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 8 棒；`P.09` K98、K109、K112、K114 |
