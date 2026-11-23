# W.06.03 节点渲染

| 项 | 内容 |
|---|---|
| 编号 | W.06.03 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设08（节点结构、状态）；demo `设计规范_v0.3/src/24_render.js`（`nodeHTML`、`setStatus`、`ctlHTML`）、`03_node.css`；demo v0.5 `37_nodes.js`（指令框、提示词节点、"由上游提供"）、`14_nodes.css`、`15_art.css`（材质、凹槽、类别色）、`40_tidy.js`（类别色映射）、`25_pointer.js`（内联控件的提交方式） |
| 最后修改 | 2026-11-23 |

## 1. 职责
把当前层的节点和便签画成 DOM，并在图、选中、运行状态、提议变化时只改变化的部分：节点头部、端口、节点上的"常用"参数控件（原生 DOM）、子图缩略图的容器、状态脚、AI 角标、锁、标记色、类别色、选中环；便签的显示与就地编辑；节点上参数控件的输入和提交。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 节点尺寸、端口列表、哪些参数显示在节点上、端口位置 | `W.06.10`（本文只读 `geom.shape`） |
| 元素的创建复用、跨层保留 | `W.06.06`（本文向 `pool` 要元素） |
| 运行状态从哪来、按帧合并、等待计时 | `W.06.15`（它调本文的 `setRun`） |
| 缩略图里画什么 | `W.06.12`（`thumbs.paint`） |
| 幽灵节点的数据、提议条 | `W.06.14`（它用本文的 `renderInto`、`setMark`） |
| 节点的拖动、点击选中、双击进入、点缩略图预览 | `W.06.07`、`W.06.13` |
| LOD 隐藏规则、视口裁剪 | `W.06.05`（CSS 类挂在根元素上，本文的结构配合它） |
| 右栏属性页的完整参数表单 | `W.07.03` |
| 下拉选项浮层、AI 角标卡片 | `W.06.01` 的 `CanvasOverlays`（本文发 `popover.select`、`hovercard.open`） |

## 3. 继承的上级约束
`W.06` §4.4（`NodeLayer`）、§5、§6.2、§6.5、§6.6、`W.06-R3`–`R5`、`R8`、`R10`；`W.03.01` §4.3（`modelTouched`、`diagsOf`）；`W.05` §4.1（`dispatch`、`gesture`、`setEditing`）；`C.02.02` §5；`C.02.05`（`NodeUi`、`Note`）；`C.03.03`；`C.03.05`（`P.09` K95）；`C.04.01-R4`；`U.10.01-R8`；`U.10.02`；`U.10.03` §1（`P.09` K101）；`U.10.04` §1；`U.10.05`；`U.10.07`；`U.08-R3`；`U.12` §2；`U.16` §3；`U.23-R3`（`P.09` K96）、`R4`、`R5`、`R8`；`U.07.03`；`U.07.04`。

## 4. 接口
```ts
// web/src/canvas/core/render/node.ts
export function createNodeLayer(ctx: EngineCtx): NodeLayer & { dispose(): void };   // NodeLayer 见 W.06 §4.4
export const CATEGORY_TINT: Readonly<Record<NodeDef['category'], Category>>;        // K96：节点类别色取哪个显示类别的令牌
export function typeLine(rec: NodeRec, def: NodeDef | null, m: GraphModel, run: NodeRunLook | null, t: EngineDeps['t']): string;   // 纯函数
export function ariaLabel(rec: NodeRec, def: NodeDef | null, shape: NodeShape, run: NodeRunLook | null, t: EngineDeps['t']): string;

// web/src/canvas/core/render/widgets.ts —— 节点上的参数控件
export type WidgetKind = 'input' | 'textarea' | 'stepper' | 'slider' | 'segmented' | 'select' | 'switch' | 'picker' | 'code' | 'model' | 'rolecard' | 'connection';   // 与 W.07.03 同一套（C.03.05，P.09 K212）
export function resolveWidget(p: ParamDef, ui: ParamUI | undefined): WidgetKind;   // widget=auto 时按 ParamDef 类型推出（§6.4）
export function createWidgets(ctx: EngineCtx): {
  build(host: HTMLDivElement, rec: NodeRec, shape: NodeShape): void;  // 建凹槽和控件
  patch(host: HTMLDivElement, rec: NodeRec, shape: NodeShape): void;  // 只改值、禁用、"由上游提供"
  dispose(): void;
};

// web/src/canvas/core/render/note.ts —— 便签
export function createNoteLayer(ctx: EngineCtx): { sync(c: SceneChange): void; edit(id: Ulid): void; dispose(): void };
export function renderNoteText(host: HTMLElement, md: string): void;   // 只支持粗体、斜体、列表、链接（C.02.05）；全部用 DOM API 生成
```
### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`geom`、`pool`、`sel`、`thumbs`、`deps.icon`、`deps.t`、`doc().ops`）；`W.03.01` 的 `NodeRec`、`NoteRec`、`GraphModel`、`modelTouched`、`diagsOf`；`W.05` 的 `OpsApi`；`@/lib/protocol` 的 `NodeDef`、`ParamDef`、`ParamUI`、`Category`、`OpKind`（常量）。

## 5. 数据结构
### 5.1 节点 DOM
```
div.hx-node[data-node-id][role=group][tabindex=-1][aria-label]
    class: hx-node--sm（紧凑宽度）· is-sub（容器节点）· is-collapsed · is-unknown · is-frozen · is-<运行状态> · has-foot · is-last · is-selected · is-dragging
    style: transform: translate3d(x, y, 0); width: <shape.w>px; --_cc: var(--hx-type-<类别色>); --_mark: var(--hx-mark-cN)（有标记色时）
├─ div.hx-node__head                       高 --hx-node-head
│  ├─ i.hx-node__mark                      标记色条 3px（ui.color ≠ none）
│  ├─ span.hx-node__ico > svg              图标格：底色 --_cc 13%，图标 --hx-text-2（U.08-R3、U.23-R3）
│  ├─ span.hx-node__ttl > b.hx-node__name + span.hx-node__type
│  ├─ span.hx-node__meta                   耗时 / "缓存" / "上次"（mono）
│  ├─ span.hx-node__lock                   lock=user：text-3；frozen：text-1
│  ├─ button.hx-node__ai                   "AI" 角标（modelTouched）
│  └─ span.hx-node__st                     状态点（运行状态图标、旋转弧、循环环形进度）
├─ div.hx-node__ports > div.hx-node__col(in) + div.hx-node__col(out)
│     div.hx-port[data-port][data-dir] class: is-in / is-out · is-linked · is-required · is-promoted · is-var · is-bad
│        span.hx-port__dot（style --_pc: var(--hx-type-<cat>)） + span.hx-port__name
├─ div.hx-node__widgets                    凹槽（U.23-R4）；最多 4 行（K95）
│     div.hx-w[data-param] > span.hx-w__lbl + span.hx-w__ctl > 控件[data-ctl]
├─ div.hx-node__thumb > canvas + span.hx-node__thumbhint   容器节点；高 64
└─ div.hx-node__foot                       状态脚：进度条 i（scaleX）、b.hx-node__ftxt、span.hx-node__acts（按钮）
```
- 每个元素的高度和 `W.06.10` 的布局常数一致：头部 `--hx-node-head`、端口行 `--hx-node-row`、控件行 `--hx-node-widget`；CSS 只用这些令牌，所以 `geom.portPos` 算出的圆心与 DOM 上的圆点重合（`U.17-R2`）。
- 元素上缓存上一次写入的值（`el.__hxv = {sig, label, typeLine, state, …}`，`W.06.06` §5），值没变不写；没有 `__hxv` 的元素（刚从池里取出）先 `build`。

### 5.2 类别色（`P.09` K96）
| NodeDef `category` | `--_cc` |
|---|---|
| 资源 | `--hx-type-ref` |
| 智能体 | `--hx-type-ctx` |
| 状态 | `--hx-type-state` |
| 工具 | `--hx-type-tool` |
| 拓扑、聚合 | `--hx-type-list` |
| 控制、人工 | `--hx-type-ctrl` |
| 边界、扩展 | `--hx-type-gen` |
只用在图标格底色（13%）和卡片左上角晕染（9%），不用在文字、边框、图标本身（`U.23-R3`、`U.08-R3`）；按 NodeDef 数据取，不按节点类型名写分支。

### 5.3 便签 DOM
`div.hx-note[data-note-id][tabindex=-1]`：`transform` 定位，宽高取 `note.size` 或 `L.noteW` / `L.noteH`；底色 `bg-3`，有标记色时用 `--hx-mark-cN-weak`；`r-md`、无阴影、文字 13（`U.10.01-R8`）。编辑时里面换成 `textarea.hx-note__edit`。

## 6. 行为

### 6.1 同步（`sync`，`struct` / `patch` 阶段）
| `SceneChange` | 处理 |
|---|---|
| `full` | 对当前层 `nodesIn(model, scope)`：不在 DOM 的 → `pool.node(id)` 后 `build`；DOM 里有、层里没有的 → `pool.release('node', id)`；其余 → `patch` |
| `nodes` 里的 ID | 在层里 → `shape.sig` 变了就 `build`（重建内部），否则 `patch`；不在层里（已删除）→ `release` |
| `structure` | 同 `full`，但已存在且 `sig` 没变的节点只 `patch` 位置 |
- `build(el, rec)`：按 §5.1 清空并重建节点内部（显示名、端口、控件、缩略图、状态脚），之后调用 `patch`。只有 `sig` 变化（NodeDef、端口列表、控件列表、折叠、宽度变化）时才重建。
- `patch(el, rec)`：显示名、类型行、端口的 `is-linked` / `is-bad`、控件的值与禁用、AI 角标、锁、标记色、位置（`geom.pos(id)`）、`aria-label`。
- `moveEl(id)`：只写 `transform`（拖动热路径，`U.17-R4`）。

### 6.2 头部与端口
- 显示名：`rec.label`，缺省为 NodeDef 的 `name`；`textContent` 写入（`W.06-R5`）。
- 类型行（`typeLine`，`U.10.02` §1）：`类型 · 补充`；补充按 NodeDef 显示最有用的一项：Agent 为 `生命周期 · 输出类型`，资源为 `种类`，容器节点为 `N 个节点`（子图里不含子图端口的节点数），循环运行中为 `第 2 / 5 轮`，扇出运行中为 `3 / 4 份 · 并发 3`，子图引用为 `名称@版本`；提示词节点为 `提示词 · N 个变量`。
- 端口名：`PortDef.label`，缺省为端口名；只显示名称，不显示类型名（`U.10.07-R6`）；被提升的参数端口名后加 `⇢`；提示词变量端口用等宽字体并带淡色 `{{ }}`（`U.10.07-R4`）。
- 端口圆点：`--_pc` = 端口显示类别的令牌（`C.04.01-R4`；`$T` 端口用 `OpsApi.portTypes` 的推断类型，K99）；有连线实心，必填且未连接空心（只描边），该端口有 V08 诊断时端口名标红（`U.10.03` §1）。
- 端口悬停 300ms：在 `screenUi` 里显示一行提示"名称 · 数据类型 · 可接多根"（多连端口才有最后一段，`P.09` K101），类型名用该端口的类型色；离开即消失。提示的位置用 `ctx.toScreen(geom.portPos(ref))` 计算，不读 DOM。
- 折叠（`ui.collapsed`）：只有头部；左右各一个汇总圆点（位置见 `geom.portPos`）。
- AI 角标：`modelTouched(rec)` 为真时显示（`U.12-R1`）；悬停 400ms 发 `hovercard.open`，离开发 `hovercard.close`。
- 锁：`lock=user` 显示锁图标（`text-3`），悬停提示"只有你能修改"；`frozen` 图标 `text-1`，节点加 `is-frozen`（`W.06.07` 据此不让拖动）。
- 未知节点类型（`shape.known=false`）：紧凑宽度，只有头部，类型行"未知节点类型"，`is-unknown`。

### 6.3 状态（`setRun`，由 `W.06.15` 每帧调用）
| 运行状态 | 类 | 状态点 | 状态脚 |
|---|---|---|---|
| idle / null | — | 无 | 隐藏 |
| queued | `is-queued` | 空心灰圆 | "排队中"；在资源池排队时"排队中 · 前面 N 个" |
| running | `is-running` | 旋转弧（循环节点为环形进度） | 进度条 `scaleX(pct)` + 进度文字 |
| waiting | `is-waiting` | 暂停符 | "等待审批 · m:ss" + 批准 / 驳回按钮（`U.19.03`） |
| done | `is-done` | 对勾 | 收起，留 2px 绿线 1.2 秒后淡出（CSS 动画）；`meta` 写耗时 |
| failed | `is-failed` | 叉 | 一行错误摘要 + "从这里重跑""查看详情" |
| cancelled / skipped / cached | 对应类 | 灰叉 / 横线 / 闪电 | 隐藏（cached 的 `meta` 写"缓存"） |
- 状态脚出现或消失时调 `geom.setFoot(id, on)`（节点高度变了，`U.05-R3`）。
- `last=true`（没有选择运行，显示的是上次结果）：加 `is-last`，CSS 降低饱和度，`meta` 前加"上次"（`U.10.02-R2`）。
- 只改类、文字和 `transform: scaleX`，不重建元素（`U.17-R5`）；状态没变时不写。
- 状态脚里的按钮带 `data-act`，点击时（用 `elementFromPoint` 找到按钮，`W.06-R6`）发 `node.action`。
- 旋转弧一圈 `--hx-t-spin`（`P.09` K124，与 `W.08.05` `Spinner` 同一令牌）。减少动效：旋转弧换成静态半圆弧（CSS 在 `html[data-motion="reduce"]` 下替换），`U.07.04` §2。

### 6.4 节点上的参数控件（`widgets.ts`）
控件列表来自 `shape.widgets`（`W.06.10` 按 `C.03.05` 选出：`group=常用`，按 `order` 排，最多 4 个，`show_if` 为假的不显示）。

| `widget`（`auto` 时查 `WIDGET_MAP`，与右栏同一张表，`C.03.02` §4） | 控件 | 提交 |
|---|---|---|
| `input`（字符串） | `input` | `Enter` 或失焦时 `dispatch(set_param)`；值没变不提交；`Esc` 恢复原值并失焦 |
| `textarea`、`code` | `textarea`，固定 3 行，超出滚动（`U.10.07-R1`）；`code` 用等宽字体 | 失焦时提交；`Esc` 失焦（即提交）；双击发 `param.editLarge` |
| `stepper`（整数、数） | − 值 + 步进 | 点 ± 立即提交（`Shift` 一次 5 步）；在值上横向拖动每 4px 一步，用 `ops.gesture('step', 原值)`；双击值改成输入框 |
| `slider`（同时有 `min`、`max` 且 `max - min ≤ 100 × step`） | 滑轨 | 按下即定位，拖动用 `ops.gesture('slide', 原值)`，松手 `end()` |
| `segmented`（枚举 ≤ 4 项且每个显示名 ≤ 6 字） | 分段 | 点击提交 |
| `select`（其余枚举）、`picker`、`connection`、`model`、`rolecard` | 按钮 | 点击时读一次按钮的 `getBoundingClientRect` 作为锚点，发 `popover.select`（后三种 `options` 为来源名，由 `CanvasOverlays` 取数据）；`pick(v)` → 提交 |
| `switch`（布尔） | 开关 | 点击提交 |
- 接线的参数（`boundFrom ≠ null`，`C.03.05` `bind`）：控件换成斜纹底 + "由上游「{上游显示名}」提供"，不可编辑；断开后显示原值（`U.10.07` §2）。
- 禁用：画布只读（`W.06` §6.6）、`ParamDef.lock` 为 `def` / `kernel`（悬停说明原因）、节点 `frozen`。
- 控件获得焦点时 `ops.setEditing(scope, [nodeId])`，失去焦点时 `setEditing(scope, [])`（`W.05` §6.10）。
- 文本框里的滚轮不缩放画布、按键不触发快捷键（`U.10.07-R2`；滚轮由 `W.06.02` 跳过，按键由 `W.02.04` 的输入框层处理）。
- 提示词节点：编辑中变量集合与已提交的不同时，文本框下方显示"失焦后更新变量端口"（`U.10.07-R3`）；失焦提交后端口由服务端回声的新 `params` 经 `shape` 重算。
- Agent 的指令框、提示词节点的文本框右上角有"预览最终提示词"按钮，点击发 `prompt.preview`（`U.10.07` §3）。
- 按下控件时 `W.06.07` 的指针路由不进入拖动（控件带 `data-ctl`）。

### 6.5 缩略图（容器节点）
- `div.hx-node__thumb` 里放一个 `canvas`，宽 = `shape.w − 12`、高 64（CSS 像素，按 `min(devicePixelRatio, 2)` 设绘制尺寸）；构建时和 `repaintThumb(id)` 时调 `thumbs.paint(cv, {model, scope: id, live}, {mode:'thumb'})`。
- 重画时机：节点建好时；`SceneChange.nodes` 里出现这个容器节点（子图结构变了，`W.06.01` §6.6）；运行中由 `W.06.15` 每 400ms 调 `repaintThumb`（`U.10.04` §2）；主题变化时。
- 悬停缩略图：外框变 `line-3`，左上角浮出"点击预览 · 双击进入"，鼠标为 `zoom-in`（`U.10.04` §1，全部是 CSS）。点击的处理在 `W.06.07` / `W.06.13`。

### 6.6 选中、高亮与标记
- `setMark(id, 'selected', on)`：`is-selected`，CSS 画 `--hx-focus` 外环（outline 1.5px、offset 2px，不改变尺寸，`U.10.05`）；选中集合变化时只改有变化的节点。
- `flash(id, 'focus', 1 | 2)`：`--hx-focus` 外环闪烁 1 或 2 次（600ms 一次）；`flash(id, 'model')`：`--hx-model` 光环 600ms（`U.10.05` §2、`U.12` §4）。用 CSS 动画类，结束后移除；减少动效时改为静态外环保持同样时长后移除。
- `setMark(id, 'dim', on)`：透明度 0.5（"看这里"时其余节点变淡，`U.10.05` §2）。
- `setMark(id, 'ghost' | 'ghost-remove' | 'ref-newer' | 'marquee' | 'dragging', on)`：对应类，样式见 `U.12` §3、`U.10.04` §1、`U.13.02-R2`。
- `renderInto(el, rec, {ghost:true})`：用同一套结构把一个不在图里的节点（幽灵节点）画进给定元素，控件全部禁用、没有 `data-node-id`（改用 `data-ghost-id`），供 `W.06.14` 使用。

### 6.7 便签
- `sync` 规则同 §6.1；文字用 `renderNoteText`：只认 `**粗体**`、`*斜体*`、以 `- ` 开头的列表行、`[文字](http…)` 链接；其余原样显示为文本。链接只允许 `http:` / `https:`，`target="_blank"`、`rel="noopener noreferrer"`。
- 双击便签（非只读）→ `edit(id)`：换成 `textarea`，`Esc` 取消、失焦提交 `dispatch(update_note{id, to:{text}})`；文字超过 4000 字时阻止输入并提示（`C.02.05`）。
- 便签的选中、拖动同节点（`W.06.07`）。

## 7. 不变量
- 当前层的每个节点在 `scene.nodes` 里恰好有一个元素，元素的 `data-node-id` 与之对应；不在当前层的节点没有挂在 `scene.nodes` 下。
- 节点上显示的端口、控件与 `geom.shape(id)` 一致；端口圆点圆心与 `geom.portPos` 的屏幕投影相差 ≤ 1px。
- 状态变化只改类、文字、`scaleX`；`innerHTML` 从不写入数据。
- 本模块的每一次修改都经过 `OpsApi`；只读时没有可以触发提交的控件。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| NodeDef 未加载 | `is-unknown` 占位（`W.06` §8） |
| `dispatch` 返回 `blocked`（例如参数锁定） | 控件恢复原值，旁边显示 `Precheck.textKey` 对应的一行说明 1.6 秒 |
| `dispatch` 返回 `rejected` | 控件恢复为 store 里的值（store 由 `W.05` 回滚）；提示由 `W.05` 负责 |
| 图标名不在图标表里 | 用"扩展"图标（`U.08-R4`），`console.warn` 一次 |
| 缩略图绘制抛错 | 缩略图留空底色，`console.error` 一次，不影响节点其他部分 |

## 9. 性能与资源
- `build` 一个标准节点 ≤ 0.3ms；200 节点首次全量 ≤ 60ms；`patch` 一个节点 ≤ 0.05ms；`moveEl` ≤ 0.01ms。
- 30 个节点同时运行、每帧都有状态变化：`setRun` 合计 ≤ 1.5ms / 帧。
- 每个节点的 DOM 元素 ≤ 60 个（4 个控件、8 进 8 出端口的上限情况）。

## 10. 验收标准
1. 13 种原子节点各放一个：头部、类型行、端口、内联控件与 `U.10.02` §1、`U.10.07` 一致；端口只显示中文名，悬停显示"名称 · 数据类型 · 可接多根"。
2. 节点上的端口圆点中心与连线端点重合（200% 截图比对，误差 ≤ 1px）。
3. 改节点上的参数：文本失焦提交 1 次；数字拖动 2 秒只产生 ≤ 9 次提交且撤销一次回到原值；接线后显示"由上游「X」提供"，断开恢复原值（`C.03.05` §8 验收 3）。
4. 9 种运行状态外观正确，切换时元素没有重建（DOM 节点引用不变）；减少动效下状态仍可分辨（`U.07.04-R1`）。
5. 模型改了节点：闪模型色光环、出现 AI 角标；人再改后角标消失（`U.12-R1`）。
6. 便签里写 `<img src=x onerror=…>`：按纯文本显示，不执行。

### 实施卡
- 要建 / 要改的文件：`web/src/canvas/core/render/node.ts`、`node.css`、`widgets.ts`、`widgets.css`、`note.ts`、`note.css`，以及 `node.test.ts`、`widgets.test.ts`、`note.test.ts`；`web/tests/visual/canvas-nodes.spec.ts`（13 种节点 × 浅色 / 深色截图）。
- 不许碰的文件：`web/src/canvas/core/geom/`（只调用 `geom`）、`render/pool.ts`、`render/edge.ts`、`render/lod.ts`、`web/src/state/`、`web/src/ops/`、`design/tokens.css`（缺令牌时上报，不自己加）。
- 函数签名：见 §4。
- 测试用例（jsdom；假 `geom`、假 `ops`、假 `thumbs`）：
  - `W0603-T1 全量同步`：当前层 5 个节点 → `scene.nodes` 下 5 个元素；删掉 1 个后同步 → 4 个，被删的进了 `pool.release`
  - `W0603-T2 只 patch`：改显示名 → 元素引用不变、只有名字变；`sig` 变（加一个提升端口）→ 内部重建
  - `W0603-T3 类型行`：Agent（生命周期、输出类型）、资源、容器节点（子图 3 个节点 + 2 个子图端口 → "3 个节点"）、循环运行中第 2 / 5 轮、提示词 2 个变量
  - `W0603-T4 端口`：必填未连接为空心；有连线为实心；V08 诊断时名字标红；`$T` 端口用推断类型的类别色；变量端口带 `is-var`
  - `W0603-T5 类别色`：13 个原子节点的 `--_cc` 与 §5.2 表一致；图标颜色不随类别变化
  - `W0603-T6 状态`：依次 `setRun` 9 种状态 → 类与状态脚正确；同一状态再设一次不写 DOM（用 MutationObserver 计数）；状态脚出现时 `geom.setFoot(id, true)`
  - `W0603-T7 上次`：`last=true` → `is-last`、`meta` 以"上次"开头
  - `W0603-T8 文本控件`：输入后按 `Enter` → `dispatch(set_param)` 1 次；值未变失焦 → 0 次；`Esc` → 恢复原值、0 次
  - `W0603-T9 数字拖动`：横向拖 40px → `gesture('step')` 的 `update` 收到 10 步后的值；松手 `end` 1 次；`Shift` + 点 + → 加 5
  - `W0603-T10 下拉`：点击 select → `popover.select` 事件带锚点矩形；`pick('b')` → `dispatch(set_param{to:'b'})`
  - `W0603-T11 接线参数`：`boundFrom` 有值 → 控件不可编辑、文案"由上游「提示词」提供"；变回 null → 恢复控件
  - `W0603-T12 只读`：`ctx.readonly()=true` → 所有控件 `disabled`，点击、输入都不 dispatch
  - `W0603-T13 提示词变量提示`：编辑中加了 `{{c}}` → 显示"失焦后更新变量端口"；删回原样 → 提示消失
  - `W0603-T14 角标与锁`：`origin.actor.kind='model'` 有角标、悬停 400ms 发 `hovercard.open`；`lock='frozen'` → `is-frozen`
  - `W0603-T15 便签`：Markdown 子集渲染；`javascript:` 链接按文本显示；`<script>` 按文本显示；双击编辑、失焦 `dispatch(update_note)`
  - `W0603-T16 不用 innerHTML`：源码中 `render/` 下没有对 `innerHTML` 赋值（lint 规则 `no-restricted-properties`）
  - `W0603-T17 视觉`：§10 验收 1、2、4（Playwright 截图，`W.12`）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部（特别是 R6、R9、R23、R26）；另：不对任何元素写 `innerHTML`；不在帧任务里读布局（下拉锚点只在点击时读一次）；不在节点上显示"高级"参数；不为某个节点类型名写渲染以外的特殊逻辑；不在节点上直接调用审批、运行接口（只发 `node.action`）。
- 完成标志：`G.14` 全部条件；§10 六条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 运行中旋转弧的时长写成令牌 `--hx-t-spin` | 第 9 棒写 `W.08`；`P.09` K124 |
| 2026-11-23 | 控件名与推断规则改为 `C.03.02` §4（查 `WIDGET_MAP`），与右栏一致 | `P.09` K212 |
