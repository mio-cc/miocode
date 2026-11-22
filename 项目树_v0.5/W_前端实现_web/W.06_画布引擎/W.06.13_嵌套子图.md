# W.06.13 嵌套子图

| 项 | 内容 |
|---|---|
| 编号 | W.06.13 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.4 `29_nest.js`（`originOf`、`setOrigin`、`openPeek`、`renderParent`）与 `08_layout.css`（`hxDive`、`hxSurface`）；demo v0.5（v0.5.10）`29_nest.js`（预览浮层、"里面还有"、父图位置卡描边当前节点）；ADR-009；`P.09` K103、K104、K109 |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布引擎里子图的三种打开方式和位置感知（ADR-009）：预览浮层（只读简化图，可以继续往下预览）、进入 / 返回的转场与返回后的选中闪烁、跨层定位（撤销后、监控页步骤、"看这里"）、父图位置卡里的缩略图；以及切换会话时的进入转场（`U.09.04-R5`）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 改 URL、历史记录（push / back） | `W.02.01`（本文只发 `nav.enter` / `nav.leave`） |
| 换层时摘下 / 挂上元素、全量同步、恢复视图 | `W.06.01`、`W.06.06`、`W.06.02`（`W.06` §6.4 的第 2、3 步） |
| 双击、单击缩略图的判断 | `W.06.07`（它调 `nest.peek`、发 `nav.enter`） |
| `P`、`Enter`、`Alt+↑`、`Esc` 的分发 | `W.06.09`（它调本文的接口） |
| 父图位置卡的外框、头部、收起、"进 / 出"连接行、抓手拖动 | `W.07.06`（React；连接行用 `W.03.01` 的 `boundaryLinks`，`P.09` K109） |
| 面包屑、嵌套过深警告、子图库内容提示（`U.13.06-R4`、`R5`） | `W.07.01`、`W.07.10` |
| 结构树（左栏"结构"区）及其放大镜按钮 | `W.07.02`（放大镜调 `cmd.peek`；本文发 `tree.locate` 让它定位行） |
| 简化图怎么画 | `W.06.12`（`thumbs.paint`） |
| 视图的按层记忆 | `W.03.02` |

## 3. 继承的上级约束
`W.06` §4.2（`cmd.locate`、`highlight`、`peek`、`closePeek`、`mountSlot('nestCard')`，引擎事件 `nav.*`、`tree.locate`）、§4.4（`NestApi`）、§6.4、§6.6、`W.06-R2`、`R3`、`R5`、`R7`、`R8`；`W.06.01` §6.3、§6.4；`W.02.01` §4.2、§6；`W.02.04` §6.1（③ peek 层）；`W.03.02` §6.2；`W.03.03` §6.2（`clearSelection`）；`W.05` §6.9（`touched`）；ADR-009；`U.07.01`；`U.07.02`（全部）；`U.07.04` §2；`U.09.01` ③c、`R1`；`U.09.04-R5`；`U.10.04`；`U.10.05` §2；`U.13.01-R1`；`U.13.03-R6`、`R7`；`U.13.04` §3；`U.13.06`（全部）；`U.16-R6`；`U.17` §1、`R11`；`U.19.06`；`P.09` K103。

## 4. 接口
```ts
// web/src/canvas/core/nest/index.ts
export function createNest(ctx: EngineCtx): NestApi & {
  highlight: EngineCommands['highlight'];                  // cmd.highlight 转到这里
  mountCard(host: HTMLElement): () => void;               // cmd.mountSlot('nestCard', host) 转到这里
  dispose(): void;
};
// NestApi（W.06 §4.4，K104 新增 docSwitched）：
//   peek(nodeId)  closePeek(): boolean  peekOpen(): boolean
//   beforeSwitch(from, to)  afterSwitch(from, to)  docSwitched()  locate({scope, nodes})

// web/src/canvas/core/nest/transition.ts
export type SwitchKind = 'enter' | 'return' | 'jump' | 'doc';
export function classify(m: GraphModel, from: Scope, to: Scope): { kind: SwitchKind; via: Ulid | null };   // via：转场原点所在的容器节点（§6.3）
export function scaleAround(o: Pt, s: number): { translate: string; scale: string };   // 绕屏幕点 o 缩放 s 倍（世界容器原点在画布左上角）

// web/src/canvas/core/nest/peek.ts
export const PEEK_W = 560;  export const PEEK_H = 460;    // U.13.06 §2
export const PEEK_GAP = 16;                               // 与锚点节点的间距
export const PEEK_TOP_MIN = 64;                           // 浮层顶边不高于画布顶 64
export function placePeek(anchor: Rect | null, vp: { w: number; h: number }): { x: number; y: number; side: 'right' | 'left' | 'center' };   // 纯函数，屏幕坐标

// web/src/canvas/core/nest/locate.ts
export const LOCATE_TIMEOUT = 3000;                       // 等待换层完成的最长时间，毫秒
export const LOOK_MS = 2000;                              // "看这里"：其余节点变淡的时长（U.10.05 §2）
```
```ts
// web/src/canvas/core/types.ts 的补充（W.06 §4.2，K104）
// EngineEvents 新增：'tree.locate': { scope: Scope }   —— 预览浮层的"在结构树中定位"；W.07.02 订阅后展开左栏结构区并让那一行闪 900ms（U.10.05 §2）
```

### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`geom`、`vp`、`nodes`、`sel`、`thumbs`、`lod`、`frame`、`emit`、`scene.world`、`scene.screenUi`、`toScreen`、`viewport()`、`deps.keys`、`deps.theme`、`deps.ui`、`deps.icon`、`deps.t`、`doc().stores`）；`W.06.02` `view/animate.ts` 的 `parseMs`、`parseEase`（纯函数）；`W.03.01` 的 `crumbs`、`nodesIn`、`edgesIn`、`structureTree`、`scopeExists`；`W.03.03` 的 `clearSelection`、`notify`；`W.03.04` 的 `LiveRun.scopeStatus`、`RunState.tick`。

## 5. 数据结构
```ts
type Peek = {
  path: Ulid[];                          // 浮层里从锚点往下预览的容器节点链；最后一个是正在显示的那一层
  anchor: Ulid | null;                   // 当前层里的锚点节点；不在当前层时为 null（居中）
  view: View;                            // 浮层里简化图的视图（只在内存里，不建 view store、不写 localStorage，K103）
  el: HTMLDivElement;  cv: HTMLCanvasElement;
  returnFocus: Element | null;           // 关闭后焦点回到这里（U.16-R6）
  offKeys: (() => void) | null;          // deps.keys.overlay('peek', …) 的注销函数
};
type Pending = { kind: SwitchKind; via: Ulid | null; origin: Pt | null; at: number };   // beforeSwitch 记下、afterSwitch 用掉
type Locate = { scope: Scope; nodes: readonly Ulid[]; look: boolean; at: number };      // 等待换层完成的定位
```
- 转场：`anim: Animation | null`（Web Animations API 的句柄）；`dur3`、`dur4`、`dur2`、`ease`：`--hx-t-3`、`--hx-t-4`、`--hx-t-2`、`--hx-ease-out`，构造时和主题报告 `motion` 变化时读一次。
- 父图位置卡：`card: { host; cv; ro: ResizeObserver; lastPaint: number } | null`。

### 5.1 预览浮层 DOM（建在 `scene.screenUi` 里）
```
div.hx-peek[role=dialog][aria-label="{名称} 的预览"]    style: transform: translate(x, y)（几何值）
├─ div.hx-peek__h      span.hx-peek__ico > svg · div.hx-peek__ttl > b（名称）+ span.hx-peek__ref（名称@版本 · pin）+ span.hx-peek__path（根图 / … ，mono 11）
│                       · span.hx-badge.hx-peek__st.is-<状态> · button[data-pk=close][aria-label="关闭预览"]
├─ div.hx-peek__cv      canvas + span.hx-peek__cnt（"N 个节点 · M 条连线"）
├─ div.hx-peek__subs    button.hx-chip[data-pk=back]（回到「上一个」）· span（里面还有）· button.hx-chip[data-pk=sub][data-id]（名称 + 节点数）…
└─ div.hx-peek__f       span（只读预览 · 运行状态实时刷新）· button[data-pk=tree]（在结构树中定位）· button.is-primary[data-pk=enter]（进入编辑 ↵）
```
文字全部来自 `deps.t`（`canvas.peek.*`），用 `textContent` 写入（`W.06-R5`）。尺寸、底色、圆角、阴影在 `nest.css` 里用令牌（`bg-2`、`r-lg`、`shadow-float`，`U.03.01`）。

## 6. 行为

### 6.1 打开预览（`peek(nodeId)`，`U.13.06` §1–§2）
1. 节点不存在或不是容器节点（`!rec.isContainer`）→ 什么都不做。已经打开 → 先关闭（不播关闭动画）。
2. `anchor` = 节点在当前层时为它，否则 null（结构树的放大镜可以预览任何一层的节点）。
3. 位置 `placePeek(锚点的屏幕矩形, 视口)`：右侧放得下（`右边 + 16 + 560 ≤ 视口宽 − 12`）放右侧；否则左侧放得下放左侧；都不行居中；`y = clamp(锚点顶边, 64, 视口高 − 460 − 12)`；居中时 `y = max(64, (视口高 − 460) / 2)`。锚点屏幕矩形 = `geom.box` 经 `ctx.toScreen` 换算（不读 DOM）。
4. 建 §5.1 的 DOM；`view` = 子图内容适应画布（`thumbs.paint` 不带 `view` 的返回值换算）；画一次简化图（`mode: 'peek'`）。
5. 动画：从 `scale(.9)`、透明度 0 到 1，时长 `--hx-t-3`，`transform-origin` 朝向锚点一侧（右侧放时为左边中点，左侧放时为右边中点，居中为中心）（`U.07.02` 表最后一行）；减少动效时只做透明度（`U.07.04` §2）。
6. 焦点：记下 `document.activeElement` 作为 `returnFocus`，把焦点移到"进入编辑"按钮（`U.16-R6`）。
7. 快捷键：`deps.keys?.overlay('peek', h)`（`W.02.04` §6.1 的 ③ 层，K104）：`Escape` → `closePeek()`；`Enter` → 进入（§6.2）；其余返回 false。

### 6.2 浮层里的操作
| 操作 | 结果 |
|---|---|
| 点"里面还有"的 chip | `path.push(id)`，`view` 重新适应，重画；出现"回到「上一个」" |
| 点"回到「…」" | `path.pop()`，重画 |
| 在简化图上拖动 / 滚轮 | 平移 / 以光标为中心缩放浮层里的 `view`（`k` 夹到 0.2–2.5）；只重画这个 canvas。主画布不受影响（滚轮目标在 `hx-canvas-ui` 的浮层里，`W.06.02` §6.4 跳过） |
| 点"进入编辑"或按 `Enter` | `emit('nav.enter', {containerId: path 的最后一个})`；浮层随换层关闭。跨多层也只发一次（`W.02.01` §6.1：直达只 push 一条） |
| 点"在结构树中定位" | `emit('tree.locate', {scope: path 的最后一个})`（K104） |
| 点关闭、按 `Esc` | `closePeek()` |
- 浮层的 `click`、`pointerdown`、`wheel` 监听挂在浮层元素自己身上（一个浮层一组，随浮层创建和移除）；`W.06.07` 的根元素路由对 `hx-canvas-ui` 里的目标返回 `ignore`（`W.06.07` §6.1 第 2 行），两边不会同时处理。
- 预览是只读的：浮层里不能选中、拖动、编辑（`U.13.06-R1`）；简化图上没有可编辑元素。

### 6.3 预览的刷新与关闭
- 运行中：订阅 run store 的 `tick`（最多每 400ms，`W.03.04` §6.4）；浮层打开时重画简化图（带 `live`）和状态徽标（`live.scopeStatus(scope)`：运行中 / 等待中 / 失败 / 已完成 / 待运行）（`U.13.06` §2、`U.17-R11`）。
- graph `change` 涉及正在预览的层（`change.scopes` 含它或 `full`）→ 下一帧重画；正在预览的容器节点被删除（`scopeExists` 为假）→ 关闭。
- 关闭：`Esc`、关闭按钮、在画布其他地方按下（`W.06.07` §6.1）、主画布滚轮缩放（`W.06.02` §6.3）、换层（`beforeSwitch`）、换文档、引擎销毁。关闭时移除 DOM、注销 `overlay`、退订 `tick`；焦点回到 `returnFocus`（它已不在文档里时回到画布根元素）。
- `closePeek()` 有浮层被关闭返回 true，没有返回 false（`W.06.09` 的 `Esc` 顺序据此判断，`U.13.04` §3）。

### 6.4 换层转场（`beforeSwitch` / `afterSwitch`，`W.06` §6.4 第 1、4 步）
1. `beforeSwitch(from, to)`：关闭预览；取消还没播完的转场（`anim.cancel()`，`U.07.02-R2`）；`classify(model, from, to)`：
   | 关系 | `kind` | `via`（原点所在的容器节点） |
   |---|---|---|
   | `to` 在 `from` 下面（沿 `ScopeRec.parent` 能从 `to` 走到 `from`） | `enter` | 这条链上 `scope = from` 的那个容器节点（跨多层直达时是当前层里路径上的那个，`U.07.02` 表第 4 行） |
   | `from` 在 `to` 下面 | `return` | 链上 `scope = to` 的那个容器节点（刚离开的） |
   | 其他（兄弟分支、根图到另一棵子树之外） | `jump` | 无，原点为画布中心 |
   - `enter` 的原点现在算（用的还是旧一层的视图）：`via` 的屏幕中心，`y` 取 `顶边 + min(高 / 2, 80)`（`U.07.02` 表第 1 行）。`return` 的原点要用新一层的视图，留到 `afterSwitch` 再算。
2. 第 2、3 步由 `W.06.01` 完成（元素换好、视图定好，`U.07.02-R1`）。
3. `afterSwitch(from, to)`：
   - 选中：`selectionKey ≠ null` 时 `ui.actions.clearSelection(key, to)`（`U.13.01-R1`）；`return` 时随后 `sel.set({nodeIds:[via]})`（返回时选中刚离开的容器节点，`U.07.02`）。
   - 转场：在 `scene.world` 上用 Web Animations API 播放，只动 CSS 的单独变换属性 `translate`、`scale` 和 `opacity`，不碰 `transform`（视图仍由 `W.06.02` 每帧写 `transform`，两者叠加，所以转场中可以照常平移缩放，`U.07.02-R2`）：
     | `kind` | 起始帧 | 终止帧 | 时长 |
     |---|---|---|---|
     | `enter`、`jump` | `scaleAround(原点, 0.3)`，透明度 0 | `translate: 0 0; scale: 1`，透明度 1 | `--hx-t-4` |
     | `return` | `scaleAround(原点, 2.4)`，透明度 0 | 同上 | `--hx-t-4` |
     `scaleAround(o, s)` = `{translate: "${o.x × (1 − s)}px ${o.y × (1 − s)}px", scale: s}`（世界容器的 `transform-origin` 是 `0 0`，绕屏幕点 `o` 缩放等于先缩放再平移 `o × (1 − s)`）。曲线 `--hx-ease-out`。
   - 减少动效（`deps.theme.reducedMotion()`）：不缩放，只做透明度 0 → 1，时长 `--hx-t-2`（`U.07.02-R3`）。浏览器不支持单独变换属性（`CSS.supports('scale', '1')` 为假）时同样只做透明度。
   - `return` 结束后（减少动效时立即）`nodes.flash(via, 'focus', 1)`（`U.07.02` 表第 3 行、`U.10.05` §2）。
   - 有等待中的定位（§6.6）且 `scope` 相符 → 执行它。
4. 转场不阻塞任何操作；新一次换层直接替换（第 1 步的 `cancel`）。

### 6.5 切换会话（`docSwitched()`，`U.09.04-R5`）
`W.06.01` §6.3 绑定新文档、第 ⑥ 步定好视图后调用：关闭预览、取消转场，然后以画布中心为原点播放 `enter` 转场，时长 `--hx-t-3`（不是 `t-4`）；减少动效时不播（"直接切换"）。第一次绑定（页面刚打开）不播。

### 6.6 定位（`locate`、`highlight`，`U.13.03-R6`、`R7`、`U.10.05` §2）
1. `locate({scope, nodes})`：`scope` 不存在（已被删除）→ 提示"那一层已经不存在了"，结束。`scope` 是当前层 → 直接第 3 步。否则记下 `Locate`，发导航：`scope` 是当前层的上层（含 `root`）→ `emit('nav.leave', {to: scope})`；否则 `emit('nav.enter', {containerId: scope})`；`afterSwitch` 到达且 `to === scope` 时执行第 3 步；`LOCATE_TIMEOUT` 内没有到达或换到了别的层 → 丢弃。
2. `W.05` 的 `HistoryOutcome.touched` 可能有多项：调用方（`W.06.09`、`W.07`）传第一项；本文不再自己挑。
3. 执行：`ids` = `nodes` 里仍在当前层的节点；为空 → 只停在这一层。否则 `lod.pin(ids)`，`vp.reveal(geom.bounds(ids))`（已在可见区域内就不动，`W.06.02` §6.5），完成后对每个节点 `nodes.flash(id, 'focus', 1)`，再释放 `pin`。
4. `highlight(ids, 'look')`（对话里的"看这里"、命令面板选中节点）：目标不在当前层 → 先按第 1 步换层；然后其余节点 `setMark(id, 'dim', true)`，目标 `flash(id, 'focus', 2)` 并 `reveal`；`LOOK_MS` 后（或用户在画布上按下、换层时提前）去掉全部 `dim`。
5. `highlight(ids, 'model')`：只对当前层里的节点 `flash(id, 'model')`（`U.12` §4），不换层、不移动视图。

### 6.7 父图位置卡的缩略图（`mountCard(host)`，`U.13.06` §3、`P.09` K98）
- `host` 是 `W.07.06` 给的空容器；本文在里面建一个 `<canvas class="hx-nestcard__cv">`、用 `ResizeObserver` 观察 `host`；返回的函数断开观察并移除 canvas。
- 当前层是子图时：画上一层（`ScopeRec.parent`），`thumbs.paint(cv, {model, scope: parent, live}, {mode:'card', mark: 当前层的容器节点})`（当前节点 1.5px `text-1` 描边，由 `W.06.12` 画）。根图时清空（外框由 `W.07.06` 隐藏）。尺寸为 0（收起）时不画。
- 重画：换层、上一层或当前容器节点有变化（`change.scopes` 含上一层、`nodes` 含当前容器节点）、运行中 `tick`（≥ 400ms）、主题变化、尺寸变化。
- 点这个 canvas → `emit('nav.leave', {to: parent})`（`U.13.06` §3"点缩略图返回上一层"）；它的 `click` 监听挂在这个 canvas 上。
- 头部、收起按钮、返回按钮和"进 / 出"连接行由 `W.07.06` 用 React 渲染，连接行数据来自 `W.03.01` 新增的纯函数 `boundaryLinks(m, scope)`（K109）。

## 7. 不变量
- 同一时刻最多一个预览浮层；浮层打开期间注册着恰好一个 `overlay('peek')` 处理函数，关闭后为 0。
- 预览浮层不创建第二个画布引擎、不建 view store、不写 localStorage（K103）。
- 转场只改 `scene.world` 的 `translate`、`scale`、`opacity`，结束后三者回到 `0 0`、`1`、`1`；`transform` 始终只由 `W.06.02` 写。
- 引擎自己不改当前层：所有换层都经 `nav.enter` / `nav.leave` → URL → `W.06` §6.4。
- 返回上一层后，选中集合恰好是刚离开的那个容器节点（`selectionKey ≠ null` 时）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `peek` 的节点不是容器 / 不存在 | 忽略 |
| 预览中的层被删除 | 关闭预览 |
| `locate` 的层不存在 | 提示"那一层已经不存在了"（与 `W.02.01` §4.1 同一文案键） |
| `locate` 的节点都不在了 | 只停在那一层，不提示（`U.13.03-R5` 的失败提示由 `W.05` 负责） |
| `element.animate` 不可用或抛错 | 不播转场，直接显示新层，`console.warn` 一次 |
| 父图位置卡 canvas 绘制失败 | `W.06.12` §6.1 第 9 步 |

## 9. 性能与资源
- 换层：`beforeSwitch` + `afterSwitch` 的脚本 ≤ 2ms（计入 `W.06` §9 的 100ms）；转场本身只动 `translate`、`scale`、`opacity`，由合成线程完成，期间没有布局计算。
- 打开预览（30 个节点的子图）≤ 8ms，含建 DOM 和第一次绘制；运行中每 400ms 重画 ≤ 1ms。
- 父图位置卡重画 ≤ 2ms（上一层 200 节点）。

## 10. 验收标准
1. 示例图（根图 → 闭环迭代 → 资料采集）：单击缩略图出现预览，在浮层里点"资料采集"继续预览、"回到「闭环迭代」"返回；"进入编辑"进入第 3 层；`Esc` 返回第 2 层且"资料采集"被选中并闪一下；结构树直达第 3 层只播一次进入转场（`U.13.06` §6 验收 1、`U.19.06`）。
2. 进入、返回的转场原点与节点位置一致（截图比对第 1 帧和第 12 帧，`U.07.02` §3 验收 1）；转场中拖动画布照常响应；连续快速进入返回，后一次直接替换前一次。
3. 减少动效：进入、返回只淡入（`--hx-t-2`），没有缩放；预览浮层只淡入。
4. 预览浮层：右侧放不下时放左侧；`Esc` 关闭后焦点回到画布；`Enter` 进入预览中的那一层；运行中状态颜色每 400ms 刷新。
5. 在子图里 `Ctrl+Z` 撤销了上一层的操作：画布回到上一层，被改动的节点在视口内并闪一下（`U.13.03-R6`、`R7`）。
6. 第 3 层里父图位置卡的缩略图描出当前容器节点；点它回到第 2 层（`U.13.06` §6 验收 2 的连接行由 `W.07.06` 验收）。
7. 切换到另一个会话：画布从中心放大淡入，时长 `--hx-t-3`（`U.09.04-R5`）。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/nest/index.ts`、`peek.ts`、`transition.ts`、`locate.ts`、`card.ts`、`nest.css`，以及 `peek.test.ts`、`transition.test.ts`、`locate.test.ts`、`card.test.ts`；`web/tests/e2e/canvas-nest.spec.ts`；`web/tests/visual/canvas-nest.spec.ts`（转场第 1 帧、第 12 帧截图）。
- 不许碰的文件：`web/src/routes/`（只发引擎事件）、`web/src/panels/`（父图位置卡外框、结构树在 `W.07`）、`render/`、`interact/`、`view/`（只调用 `vp` 和 `animate.ts` 的纯函数）、`minimap/`、`web/src/state/`。
- 函数签名：见 §4。
- 测试用例（jsdom；假 `Element.prototype.animate` 记录关键帧；假时钟；假 `keys`）：
  - `W0613-T1 classify`：根 → 闭环迭代 → `enter`、`via=闭环迭代`；第 3 层 → 根 → `return`、`via=闭环迭代`；根 → 第 3 层 → `enter`、`via=闭环迭代`；两个兄弟子图之间 → `jump`
  - `W0613-T2 scaleAround`：`o=(400,300)`、`s=0.3` → `translate: 280px 210px; scale: 0.3`
  - `W0613-T3 进入转场`：`afterSwitch` 后 `world.animate` 被调用 1 次，起始帧 `scale 0.3`、`opacity 0`，时长等于 `--hx-t-4`；`world.style.transform` 未被本模块写过
  - `W0613-T4 返回`：返回后 `ui.actions.clearSelection` 再 `select([via])`；转场结束后 `nodes.flash(via,'focus',1)`
  - `W0613-T5 替换`：转场进行中再次 `beforeSwitch` → 旧动画 `cancel` 1 次
  - `W0613-T6 减少动效`：只有 `opacity` 关键帧，时长 `--hx-t-2`；预览浮层只有透明度
  - `W0613-T7 placePeek`：锚点靠右边缘 → `side='left'`；两侧都放不下 → `center`；锚点顶边 20 → `y=64`
  - `W0613-T8 预览按键`：打开后 `keys.overlay('peek')` 注册 1 次；`Escape` → 关闭、注销、焦点回到之前的元素；`Enter` → `nav.enter{containerId}`
  - `W0613-T9 继续预览`：点 chip → `path` 长度 2、出现返回 chip；点返回 → 长度 1
  - `W0613-T10 预览刷新`：`tick` 变化 → 重画 1 次；预览的容器被删 → 浮层关闭
  - `W0613-T11 不建第二个引擎`：预览期间 `CanvasEngine` 实例数为 1，`localStorage` 没有新键
  - `W0613-T12 locate 跨层`：当前在第 3 层，`locate({scope:'root', nodes:[a]})` → 发 `nav.leave{to:'root'}`；模拟换层完成 → `vp.reveal` 1 次、`flash(a)` 1 次；3 秒内没换层 → 丢弃
  - `W0613-T13 看这里`：`highlight([a],'look')` → 其余节点 `dim`、a 闪 2 次；2 秒后 `dim` 全部去掉
  - `W0613-T14 父图位置卡`：第 2 层时 `paint` 收到 `scope=root`、`mark=闭环迭代`；根图时清空；点 canvas → `nav.leave{to:'root'}`；解除挂载后 `ResizeObserver` 断开
  - `W0613-T15 会话切换`：`docSwitched()` → 以画布中心为原点、时长 `--hx-t-3`；第一次绑定不播
  - `W0613-T16 端到端`：§10 验收 1、4、5、6（Playwright，`harnessd --fake-llm`，示例图含三层）
- 允许使用的依赖：无运行时依赖（Web Animations API 为浏览器内置）；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R23、R24、R25）；另：不直接改 URL 或调用路由；不为预览浮层创建 `CanvasEngine` 或 view store；转场不写 `transform`、不逐个节点动画（`U.07.02-R1`）；预览里不提供任何编辑入口。
- 完成标志：`G.14` 全部条件；§10 七条验收通过。
