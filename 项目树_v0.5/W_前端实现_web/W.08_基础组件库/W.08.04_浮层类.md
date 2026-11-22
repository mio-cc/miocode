# W.08.04 浮层类

| 项 | 内容 |
|---|---|
| 编号 | W.08.04 |
| 类型 | 实施 |
| 上级 | W.08 基础组件库 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设10 §10.18–§10.20、§10.23；`U.06` §3；`U.16-R6`；`W.02.04` §6.1；`G.06.01-R9`；`P.09` K121、K125、K126 |
| 最后修改 | 2026-11-23 |

## 1. 职责
所有浮层的唯一实现：界面环境 `UiEnvProvider` / `useUiEnv`、浮层底座 `Overlay`（顶层容器、层级、按键压栈、焦点移入 / 回位 / 循环、外部点击、进出动画）、锚定弹层 `Popover`（`@floating-ui/dom` 定位）、菜单 `Menu`（含子菜单）、确认框 `Dialog`、提示框 `Tooltip`；以及内部的浮层栈 `layerStack.ts`、定位 `position.ts`、焦点工具 `focus.ts`。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 快捷键分发顺序、`modal` 层挡住下层按键 | `W.02.04` §6.1（本文只经 `UiEnv.pushOverlay` 压栈） |
| 菜单里有哪些项、命令面板、快速添加、速查面板的内容 | `W.07.11`（用 `Menu`、`Overlay`、`Popover`、`Picker`） |
| 冲突框、解除急停确认、删除会话确认、合并预览的文案和按钮逻辑 | `W.07.10`、`W.07.02`、`W.07.01`（用 `Dialog`） |
| 提示的堆叠与计时 | `W.07.10`（用 `Overlay layer='toast'` + `W.08.05` `Toast`） |
| 子图预览浮层 | `W.06.13`（画布引擎里 canvas 绘制，`P.09` K103；它的 `Esc` / `Enter` 由引擎压 peek 层） |
| 窄屏覆盖式右侧栏的位置与收展 | `W.02.02`（用 `Overlay layer='pane'` 只拿层级、按键与外部点击） |
| 首次引导的整页模态 | `W.09.03`（用 `Overlay layer='modal'`） |

## 3. 继承的上级约束
`W.08` §4–§6、`W.08-R1`–`R14`（特别是 R8、R9）；`W.07` §4.3（`Overlay`、`Popover`、`Menu`、`Dialog`、`Tooltip` 五行）、`W.07-R6`、`R7`；`W.06.01` §6.8（`popover.select`）；`W.07.11` §6（`Menu` 宽 220、放不下自己翻转、`restoreFocus` 回画布根元素、`Esc` 只关菜单）；`W.02.04` §4.2、§6.1、§7、§10 验收 4；`G.06.01-R6`、`R8`、`R9`；`G.06.03-R6`、`R8`；`G.10` §3.3；`U.06` §2、§3、R3、R4；`U.07.01` §1；`U.07.04` §2；`U.11` §2（提示框、菜单、确认框）；`U.13.05-R1`、`R2`；`U.16-R3`、`R5`、`R6`；`U.23-R6`；`P.09` K121、K125、K126。

## 4. 接口

### 4.1 组件
```tsx
// web/src/components/ui/overlay/UiEnv.tsx —— 见 W.08 §4.3（UiEnv、UiEnvProvider、useUiEnv、FALLBACK_ENV）

// web/src/components/ui/overlay/Overlay.tsx
export type OverlayProps = {
  layer: Layer;                        // 'popover' | 'modal' | 'toast' | 'tooltip' | 'pane' → z-index: var(--hx-z-<layer>)
  open: boolean;
  onClose?(reason: CloseReason): void; // 'esc' | 'outside' | 'tab' | 'action'
  trapFocus?: boolean;                 // 缺省：layer === 'modal'
  restoreFocus?: boolean | HTMLElement | (() => HTMLElement | null);   // 缺省 true：回到打开时的 document.activeElement
  initialFocus?: 'first' | 'container' | 'none';                        // 缺省 'first'；toast、tooltip 恒为 'none'
  closeOnOutside?: boolean;            // 缺省：popover、pane 为 true，其余 false
  onKey?(e: KeyboardEvent): boolean;   // 压栈处理函数里 Esc / Tab 之外的键交给它；返回 true = 已处理
  scrim?: boolean;                     // 模态背后的遮罩 --hx-scrim
  anchorEl?: HTMLElement | null;       // 外部点击时不算"外部"的元素（触发按钮）
  role?: 'dialog' | 'alertdialog' | 'menu' | 'listbox' | 'tooltip' | 'status' | 'alert' | 'region';
  ariaLabel?: string; ariaLabelledBy?: string; ariaDescribedBy?: string;
  className?: string;
  contentRef?: React.Ref<HTMLDivElement>;
  children: ReactNode;
};
export function Overlay(p: OverlayProps): JSX.Element | null;

// web/src/components/ui/overlay/Popover.tsx
export type PopoverProps = {
  anchor: Anchor;                      // HTMLElement 或 DOMRect（宽高 0 = 一个点，如快速添加的 at）
  placement?: Placement;               // 缺省 'bottom-start'
  offset?: number;                     // 缺省 4（px，与锚点的间距）
  open: boolean;
  onClose(reason: CloseReason): void;
  width?: number | 'anchor';           // px；'anchor' = 与锚点同宽（Select）
  padding?: 'none' | 'sm' | 'md';      // 缺省 'md'（s-5）；列表类用 'sm'（s-2）
  glass?: boolean;                     // 玻璃材质（U.23-R6），只给浮在画布上的弹层
  initialFocus?: OverlayProps['initialFocus'];
  restoreFocus?: OverlayProps['restoreFocus'];
  onKey?: OverlayProps['onKey'];
  role?: 'dialog' | 'listbox' | 'menu';   // 缺省 'dialog'
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};
export function Popover(p: PopoverProps): JSX.Element | null;

// web/src/components/ui/overlay/Menu.tsx
export type MenuAction = {
  id: string; label: string;
  icon?: IconName;
  shortcut?: string;                   // keys.label 的结果（U.13.05-R1）
  disabled?: boolean; disabledReason?: string;   // 不隐藏，提示框说明原因（U.13.05-R2）
  danger?: boolean;                    // 危险项：danger 色，放在最后一组（调用方排序）
  model?: boolean;                     // "让 AI …"类：图标与文字用模型色
  checked?: boolean;                   // 勾选项：role="menuitemcheckbox"
  children?: readonly MenuItem[];      // 子菜单
  run?(): void;                        // 选中时先调它，再 onPick(id)（W.07.11 的 itemsFor 每项带动作）
};
export type MenuItem = MenuAction | 'sep' | { group: string };
export type MenuProps = {
  at: Point | HTMLElement;             // 点（右键位置，视口坐标）或元素（"⋯"按钮，菜单贴在它下方）
  items: readonly MenuItem[];
  onPick(id: string): void;
  onClose(reason: CloseReason): void;
  open?: boolean;                      // 缺省 true（调用方按需挂载）
  restoreFocus?: OverlayProps['restoreFocus'];   // W.07.11 传画布根元素
  ariaLabel?: string;
};
export function Menu(p: MenuProps): JSX.Element | null;

// web/src/components/ui/overlay/Dialog.tsx
export type DialogAction = {
  label: string; variant: ButtonVariant; onClick(): void;
  autoFocus?: boolean; disabled?: boolean; loading?: boolean;
};
export type DialogProps = {
  title: string;
  width: 400 | 560;
  open: boolean;
  onClose(reason: CloseReason): void;  // 只有 dismissible 时才会收到 'esc' / 'outside'
  actions?: readonly DialogAction[];   // danger 变体的按钮总是排在最右（U.11 §2）
  dismissible?: boolean;               // 缺省 true；false：Esc、点遮罩都不关闭（冲突框，W.07.10 §6.7）
  busy?: boolean;                      // 全部按钮置灰、aria-busy（提交中）
  error?: string;                      // 按钮行上方一行红字（解除急停失败，W.07.10 §6.4）
  restoreFocus?: OverlayProps['restoreFocus'];
  children: ReactNode;
};
export function Dialog(p: DialogProps): JSX.Element | null;

// web/src/components/ui/overlay/Tooltip.tsx
export type TooltipProps = {
  content: ReactNode;                  // 一般是字符串；可以两行（名称 + 禁用原因）
  shortcut?: string;                   // 右侧 Kbd variant="tip"
  delay?: number;                      // 缺省 400（ms，U.11 §2）
  placement?: Placement;               // 缺省 'top'
  disabled?: boolean;                  // 不显示（例如菜单打开期间）
  children: React.ReactElement;        // 单个元素，必须把 ref 与事件 props 落到 DOM 上
};
export function Tooltip(p: TooltipProps): JSX.Element;
```
```ts
// web/src/components/ui/overlay/layerStack.ts —— 模块内部，打开着的浮层
export type LayerEntry = { id: string; el(): HTMLElement | null; anchor(): HTMLElement | null; parent: string | null };
export function pushLayer(e: LayerEntry): () => void;
export function inTree(id: string, node: Node): boolean;     // node 在这个浮层、它的锚点或它的子浮层里
export const OverlayParent: React.Context<string | null>;     // 嵌套浮层（子菜单、对话框里的下拉）的父 id

// web/src/components/ui/overlay/position.ts —— 唯一 import @floating-ui/dom 的文件
export function place(anchor: Anchor, floating: HTMLElement, o: { placement: Placement; offset: number; padding: number; matchWidth?: boolean; onAnchorGone?(): void }): () => void;   // computePosition + offset / flip / shift，autoUpdate；返回清理函数
export const VIEWPORT_PADDING = 8;   // px：弹层与视口边缘的最小距离

// web/src/components/ui/overlay/focus.ts
export function focusables(root: HTMLElement): HTMLElement[];                // 可见、未禁用、tabIndex ≥ 0
export function focusInitial(root: HTMLElement, how: 'first' | 'container'): void;   // [data-autofocus] 优先
export function cycleTab(root: HTMLElement, e: KeyboardEvent): boolean;      // Tab / Shift+Tab 在 root 内循环
export function resolveRestore(r: OverlayProps['restoreFocus'], opener: Element | null): HTMLElement | null;
```

### 4.2 依赖
`W.08` §4.3（`UiEnv`）、§4.4；`W.08.01` 的 `Button`、`Icon`、`Kbd`；`W.08.02` 的 `FieldError`（`Dialog` 的 `error`）；`@floating-ui/dom`（`computePosition`、`autoUpdate`、`offset`、`flip`、`shift`、`size`，`G.10` §3.3）；`react-dom` 的 `createPortal`；`@/lib/i18n` 的 `useT`（`ui.submenu`）。被 `W.08.02`（浮出数值）、`W.08.03`（`Select`）、`W.08.05`（`Toast` 的容器由 `W.07.10` 用 `Overlay`）和 `W.07` / `W.09` / `W.06.01` 使用。

## 5. 数据结构
- 本文私有：§4.1 的 props、`LayerEntry`；`Overlay` 内部的 `phase: 'closed' | 'entering' | 'open' | 'leaving'`（`useState`）、打开时记下的 `opener`（`useRef`）；`Tooltip` 模块级的 `current`（正在显示的提示框，用于"只显示一个"）和 `lastHiddenAt`（暖场：300ms 内移到另一个目标立即显示）；`Menu` 的高亮下标、打开着的子菜单 id、typeahead 缓冲。
- 浮层的 id 用 `useId()`。

## 6. 行为

### 6.1 `Overlay`
1. `open` 变 true：`createPortal` 到 `useUiEnv().portalRoot()`，根元素 `<div class="hx-ov hx-ov--<layer> {className}" role aria-*>`，`z-index: var(--hx-z-<layer>)`（`U.06` §3，`G.06.03-R8`）；`scrim` 时先渲染一层 `position: fixed; inset: 0; background: var(--hx-scrim)` 的遮罩。记下 `opener = document.activeElement`。
2. `pushLayer({id, el, anchor: anchorEl, parent: useContext(OverlayParent)})`；子树用 `OverlayParent.Provider value={id}` 包住，所以里面再开的浮层（子菜单、对话框里的下拉）算它的子浮层。
3. `layer ∈ {popover, pane}` → `UiEnv.pushOverlay('popover', handle)`；`layer === 'modal'` → `pushOverlay('modal', handle)`；`toast`、`tooltip` 不压栈（`W.02.04` §6.1）。`handle(e)`：
   - `e.isComposing` → false；
   - `Escape` → 有 `onClose` 时 `onClose('esc')`，返回 true（`W.02.04` §10 验收 4：只关这一层，因为注册中心只把键交给栈顶）；
   - `Tab` 且 `trapFocus` → `cycleTab(content, e)`；
   - 其余 → `onKey?.(e) ?? false`。
4. 初始焦点（`useLayoutEffect`，挂载同一帧）：`'first'` → `focusInitial(content, 'first')`（没有可聚焦元素时退到 `'container'`，内容根 `tabIndex=-1`）；`'container'` → 聚焦内容根；`'none'` → 不动（组合框：焦点留在输入框，`W.08` §6.2）。
5. 外部点击：打开期间在 `document` 上挂 `pointerdown` 捕获阶段监听（`W.08-R9`）；目标不在 `inTree(id, target)` 里、且 `closeOnOutside` → `onClose('outside')`。点在锚点上不算外部（锚点按钮自己负责开关，避免"关了又开"）。
6. 非模态、`initialFocus ≠ 'none'` 的浮层：内容上的 `focusout` 的 `relatedTarget` 不在 `inTree` 里（`Tab` 走出了弹层）→ `onClose('tab')`。
7. `open` 变 false：立即出栈（`pushOverlay` 返回的函数、`pushLayer` 返回的函数），`phase='leaving'`，根元素 `pointer-events: none`，离开动画结束（`animationend`，或 `--hx-t-2` 后的保底计时）后卸载。焦点回位：`resolveRestore(restoreFocus, opener)` 得到的元素仍在文档里、且当前焦点在浮层内或在 `body` 上 → `focus({preventScroll: true})`；焦点已经被用户移到别处 → 不抢。
8. 卸载（不经 `open=false`）时同样出栈、移除监听、回位焦点（`G.06.01-R8`）。

动画（`U.07.01` §1，`W.08-R6`）：
| 层 | 进入（`--hx-t-3` `--hx-ease-out`） | 离开（`--hx-t-2` `--hx-ease-in`） | 减少动效 |
|---|---|---|---|
| `popover`、`pane` | `opacity 0→1` + `transform: scale(.98)→none`（`transform-origin` 取定位方向一侧） | `opacity → 0` | 只做透明度 `--hx-t-2` |
| `modal` | 遮罩淡入；内容 `opacity` + `scale(.98)→none` | 同上 | 只做透明度 |
| `tooltip` | `opacity` `--hx-t-1` | `opacity` `--hx-t-1` | 同左 |
| `toast` | 由 `W.07.10` 的堆叠决定（`Toast` 自己有进入动画，`W.08.05` §6.1） | — | — |
动画进行中点击、按键立即生效（`U.07.01-R4`）：进入动画不挡指针，离开动画期间不响应。

### 6.2 `Popover`（`设10` §10.19）
- 内部是 `Overlay layer='popover' closeOnOutside anchorEl={anchor 是元素时}`；内容根 `hx-pop`：底 `bg-2`、`shadow-pop`、`r-lg`；`padding` 按 props（`md` = `s-5`、`sm` = `s-2`、`none` = 0）；`glass` 时换成玻璃材质（`W.08` §6.1）。
- 定位：`useLayoutEffect` 里 `place(anchor, content, {placement, offset, padding: VIEWPORT_PADDING, matchWidth: width === 'anchor'})`：`strategy: 'fixed'`，`offset(offset)`、`flip()`、`shift({padding})`；结果写 `left` / `top`（定位不做动画，`G.06.03-R6` 只禁止对它们做动画）；`autoUpdate` 在锚点滚动、尺寸变化时重算；关闭时清理。`DOMRect` 锚点包成虚拟元素（`getBoundingClientRect: () => rect`）。
- 锚点元素从文档中移除（`autoUpdate` 回调里 `!anchor.isConnected`）→ `onClose('outside')`（`W.08` §8）。
- `width` 为数字时写进内联样式（几何值）；为 `'anchor'` 时由 `size` 中间件写成锚点宽（`Select` 再用 CSS 夹在 200–360）。
- 画布上的弹层（快速添加）按屏幕坐标定位，自身尺寸不随画布缩放（`设10` §10.19）。

### 6.3 `Menu`（`U.13.05-R1`、`R2`，`U.11` §2，`设10` §10.20）
- 内部是 `Popover role='menu' padding='sm' initialFocus='container'`：`at` 是点 → 虚拟元素、`placement='right-start'`、`offset=0`；`at` 是元素 → `placement='bottom-start'`、`offset=4`。放不下时 `flip` / `shift` 自动翻转、避让视口（`W.07.11` §6）。宽：最小 220、最大 300（`calc` 令牌）。
- 行：高 28、`r-sm`、内边距 `0 var(--hx-s-4)`；结构 `[Icon 16 或 ✓] 标签 …… Kbd(inline) 或 ›`；高亮底 `bg-4`；`danger` 字 `danger`、高亮底 `danger-weak`；`model` 图标和字 `model`；禁用 `text-3`、高亮或悬停时 `Tooltip` 显示 `disabledReason`（`placement='right'`）；`{group}` 标题高 24、`fs-11`、`text-3`，不可聚焦；`'sep'` 为 1px `line-1`、上下 `s-2`。
- 可访问性：内容根 `role="menu"`、`aria-activedescendant` 指向高亮项；项 `role="menuitem"`（`checked` 有值时 `menuitemcheckbox` + `aria-checked`），`aria-disabled`、有子菜单的 `aria-haspopup="menu"`、`aria-expanded`，读屏补充 `t('ui.submenu')`。
- 键盘（`onKey`）：`↓` / `↑` 移动高亮（循环；跳过分组标题和分隔线，**不跳过**禁用项，让读屏能读到原因）；打开时没有高亮，第一次 `↓` 到第一项、`↑` 到最后一项；`Home` / `End`；可打印字符 → typeahead（500ms 缓冲）；`Enter` / 空格 → 选中（禁用项不响应）；`→` → 有子菜单时打开并高亮子菜单第一项；子菜单里 `←` → 关闭子菜单、高亮回到父项；`Esc` → 只关当前这一层（子菜单是自己的 `Overlay`，在栈顶）。
- 指针：进入某行 → 高亮；有子菜单的行悬停 150ms 打开子菜单；指针离开父项后 300ms 内进入子菜单不关闭，否则关闭（斜向移动的容忍，代替"安全三角"）；点击 → 选中。
- 选中：`item.run?.()` → `onPick(id)` → `onClose('action')`；焦点按 `restoreFocus` 回位（`W.07.11` 传画布根元素）。整个菜单树（含子菜单）一起关闭。
- 子菜单：`<Menu>` 递归，`at` 为父项元素、`placement='right-start'`、`offset=-4`（与父菜单略重叠）。

### 6.4 `Dialog`（`U.11` §2"确认框"、`设10` §10.23）
- 内部是 `Overlay layer='modal' scrim trapFocus`；面板 `hx-dialog` 居中，宽 `width`（内联几何值），底 `bg-2`、`shadow-pop`、`r-xl`、内边距 `s-8`。不用玻璃（`W.07` §6.5：对话框式弹窗不用）。
- 结构：标题 `<h2 id>`（`fs-16`、600、`text-1`，`aria-labelledby`）→ 正文（`fs-13`、`text-2`，`aria-describedby` 指向它）→ `error`（`FieldError`）→ 按钮行（右对齐，间距 `s-3`；`actions` 按原顺序，`danger` 变体稳定地移到最右，`U.11` §2）。
- `role`：有 `danger` 按钮 → `alertdialog`，否则 `dialog`；`aria-modal="true"`。
- 初始焦点：`autoFocus` 的按钮 → 第一个非 `danger` 按钮（通常是"取消"）→ 正文里第一个可聚焦元素 → 面板本身。`Enter` 只触发**当前聚焦**的按钮（浏览器原生），不会默认触发危险操作（`设10` §10.23）。
- `dismissible`（缺省 true）：`Esc` → `onClose('esc')`、点遮罩 → `onClose('outside')`；为 false 时两者都不关闭，`Esc` 仍被吞掉（不落到下层，`W.02.04` §6.1 的模态规则）。
- `busy`：全部按钮 `disabled`、面板 `aria-busy="true"`；单个按钮的 `loading` 用 `Button loading`。
- 只用于不可撤销的操作（`U.11` §2、`U.11-R1`）——由调用方遵守；本组件不限制。

### 6.5 `Tooltip`（`U.11` §2"提示框"、`设10` §10.18）
- 用 `cloneElement` 给子元素加 `onPointerEnter` / `onPointerLeave` / `onFocus` / `onBlur` / `onPointerDown` / `onKeyDown`（与子元素原有的处理函数串联，先调原有的）和 `ref`；显示时加 `aria-describedby`。子元素是禁用状态时要用 `aria-disabled`（`W.08` §6.1），否则浏览器不派发指针事件。
- 显示：指针进入后 `delay`（400ms）；键盘聚焦（`el.matches(':focus-visible')`）立即；上一个提示框在 300ms 内刚隐藏（暖场）→ 立即。同一时刻只显示一个（显示新的先隐藏旧的）。
- 隐藏：指针离开、失焦、在子元素上按下指针、子元素上按 `Esc`（元素自己的 `onKeyDown`，不 `stopPropagation`，`Esc` 继续交给浮层 / 画布）、`disabled` 变 true、子元素卸载。
- 外观：`Overlay layer='tooltip' role='tooltip' initialFocus='none'`，`pointer-events: none`；底 `bg-2`、`shadow-pop`、`r-sm`、内边距 `s-2 s-4`、`fs-12`、`text-1`，最大宽 280（`calc` 令牌），超出换行；`shortcut` 跟在内容后（`Kbd variant='tip'`，`text-2`）。默认在上方、间距 6，`flip` / `shift` 避让视口（`U.11` §2：`bg-2`、`shadow-pop`、延迟 400ms，`设10` 的深色底提示框以 `U.11` 为准）。
- 触屏（`pointerType === 'touch'`）不显示。

## 7. 不变量
- 每个打开着的 `popover` / `pane` / `modal` 浮层在 `W.02.04` 的栈里恰好一项，关闭或卸载后立即出栈（`W.08` §7）。
- 浮层 DOM 都在 `portalRoot()` 下，z-index 只来自 `--hx-z-*`；不存在为了"盖住别人"写的数值（`U.06-R4`）。
- 模态浮层打开期间，`Tab` 焦点不会离开它（`U.16-R6`）。
- 浮层关闭后，焦点要么回到触发元素（或 `restoreFocus` 指定的元素），要么停在用户主动点击的元素上；不会落在已卸载的节点上。
- 同一时刻最多显示一个提示框。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 没有 `UiEnvProvider` | `FALLBACK_ENV`（`W.08` §8）：浮层照常显示；`Esc` 不经注册中心——开发模式警告一次 |
| `Tooltip` 的子元素不是单个元素、或没有把 `ref` 落到 DOM | 开发模式抛错；生产模式只渲染子元素、不显示提示框，`console.error` 一次 |
| `place` 计算时浮层或锚点尺寸为 0（还没布局） | 下一帧重试一次；仍为 0 → 放在锚点左上角，不抛错 |
| 锚点元素被移除 | `onClose('outside')`（§6.2） |
| `restoreFocus` 指定的元素已不在文档里 | 退回 `opener`；也不在 → 不移动焦点 |
| `Menu` 的项 `id` 重复 | 开发模式抛错；生产模式 `console.error` 一次，后出现的不渲染 |

## 9. 性能与资源
- 打开 `Popover` / `Menu` 到第一帧 ≤ 16ms（定位在 `useLayoutEffect` 同步完成，首帧不闪到左上角）；`Menu` 50 项 ≤ 5ms 渲染。
- `autoUpdate` 只在浮层打开期间运行；关闭后没有残留的监听（`ResizeObserver`、`scroll`、`pointerdown`）。
- `Tooltip` 在显示前不创建浮层 DOM；页面上 200 个图标按钮只有 200 组事件处理函数，没有额外元素。

## 10. 验收标准
1. 打开右键菜单后按 `Esc`：只关菜单，不取消选中（`W.02.04` §10 验收 4）；菜单打开时按 `[`：左栏不变化（popover 层处理掉 / 不处理的键按注册中心规则）。
2. `Menu`：靠近视口右下角右键，菜单翻到左上方完整可见；`↓` `→` 打开子菜单、`←` 返回、`Enter` 执行、执行后焦点回到画布根元素；禁用项可以高亮并显示原因、不能执行（`U.13.05-R2`）。
3. `Dialog`：打开后焦点在"取消"；`Tab` 在对话框内循环；`Esc` 关闭并回到打开前的按钮；`dismissible=false` 时 `Esc` 和点遮罩都不关闭；危险按钮总在最右；读屏读出标题和正文。
4. `Popover`：锚在顶部条按钮下方，滚动 / 缩放窗口后跟随；点外部关闭、点锚点按钮不会"关了又开"；在弹层里 `Tab` 走出弹层时关闭；锚点被移除时关闭。
5. `Tooltip`：悬停 400ms 出现，键盘聚焦立即出现；从一个图标按钮移到相邻按钮立即切换；只显示一个；`Esc` 隐藏提示框且菜单 / 画布照常收到 `Esc`。
6. 嵌套：`Dialog` 里的 `Select` 打开时，点下拉里的选项不会被当作点到对话框外；`Esc` 先关下拉、再关对话框。
7. 打开减少动效：浮层只做淡入淡出，没有缩放。
8. 打开、关闭各类浮层 100 次后：`document` 上没有残留的 `pointerdown` 监听，`W.02.04` 栈为空（用 `fakeEnv` 计数）。

### 实施卡
- 要建 / 要改的文件：`web/src/components/ui/overlay/UiEnv.tsx`、`Overlay.tsx`、`Popover.tsx`、`Menu.tsx`、`Dialog.tsx`、`Tooltip.tsx`，每个同名 `.css`（`UiEnv` 没有 `.css`）、`.test.tsx`；`overlay/layerStack.ts`、`position.ts`、`focus.ts` 及各自的 `.test.ts`；`web/src/components/ui/index.ts`（只加本文的导出行）。
- 不许碰的文件：`web/src/shell/`（`shellUiEnv` 与 `App.tsx` 由 `W.02` 实施）、`web/src/components/ui/` 的其他子目录、`types.ts`、`base.css`；`web/src/styles/`；`state/`、`ops/`、`panels/`、`pages/`、`canvas/`、`lib/protocol/`。
- 函数签名：见 §4。
- 测试用例（`fakeEnv` 记录 `pushOverlay` 的种类、处理函数与出栈；测试直接调用栈顶处理函数模拟注册中心的分发）：
  - `W0804-T1 props 对照`：五个组件含 `W.07` §4.3 对应行的全部 props（`expectTypeOf`），补充 props 与 `W.08` §4.5 一致
  - `W0804-T2 压栈`：`layer='popover'` 打开 → `pushOverlay('popover')` 1 次；`'modal'` → `'modal'`；`'toast'` / `'tooltip'` → 0 次；`open=false` 或卸载 → 出栈函数被调用 1 次
  - `W0804-T3 层级`：根元素类 `hx-ov--modal`，CSS 里 `z-index: var(--hx-z-modal)`（读 `.css` 源码断言没有数字 z-index）
  - `W0804-T4 Esc`：调用栈顶处理函数 `Escape` → `onClose('esc')`、返回 true；`isComposing` → false；`Dialog dismissible=false` → 不调 `onClose` 但返回 true
  - `W0804-T5 焦点`：`initialFocus='first'` → 第一个按钮获得焦点；`'none'` → 焦点不变；关闭后回到打开前的按钮；`restoreFocus=元素` → 回到该元素；关闭前用户已点到别的输入框 → 不抢焦点
  - `W0804-T6 焦点循环`：`trapFocus` 时在最后一个元素上 `Tab` → 第一个；`Shift+Tab` 反向
  - `W0804-T7 外部点击`：外部 `pointerdown` → `onClose('outside')`；锚点上 → 不关；子浮层里 → 父浮层不关；`closeOnOutside=false` → 不关；关闭后 `document` 上没有监听
  - `W0804-T8 Tab 走出`：非模态弹层内容 `focusout` 到外部 → `onClose('tab')`；`initialFocus='none'` → 不关
  - `W0804-T9 Popover 定位`：`vi.mock('@floating-ui/dom')`：`computePosition` 收到 `placement`、`offset`、`flip`、`shift`；`strategy='fixed'`；结果写 `left` / `top`；`DOMRect` 锚点变成虚拟元素；锚点 `isConnected=false` → `onClose('outside')`；关闭后 `autoUpdate` 的清理被调用
  - `W0804-T10 Menu 键盘`：打开无高亮；`↓` → 第一项；跳过分组标题与分隔线；禁用项可高亮、`Enter` 不触发；`→` 打开子菜单（`fakeEnv` 再压一层）、`←` 关闭；`Enter` → `run` 先于 `onPick`、随后 `onClose('action')`；typeahead "复"→"复制"
  - `W0804-T11 Menu 位置`：`at={x,y}` → 虚拟元素 `placement='right-start'`；`at=元素` → `'bottom-start'`
  - `W0804-T12 Dialog`：危险按钮排到最右（输入顺序 [删除, 取消] → 渲染 [取消, 删除]）；有危险按钮 → `role="alertdialog"`；初始焦点在"取消"；`error` → 红字；`busy` → 全部按钮 `disabled`
  - `W0804-T13 Tooltip`：假时钟：`pointerenter` 后 399ms 不显示、400ms 显示；键盘聚焦立即显示；隐藏后 200ms 内进入另一个目标立即显示；同时只有一个 `role="tooltip"`；子元素原有 `onPointerEnter` 仍被调用；`Esc` 隐藏且事件未被 `stopPropagation`
  - `W0804-T14 减少动效`：`fakeEnv.reducedMotion=true` → 根元素带 `is-reduced`，CSS 在 `html[data-motion="reduce"]` 下没有 `transform` 过渡
  - `W0804-T15 泄漏`：各类浮层打开关闭 100 次 → `fakeEnv` 栈为空、`pushLayer` 栈为空
- 允许使用的依赖：`react`、`react-dom`、`@floating-ui/dom`（只在 `position.ts`）；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部；另：不监听 `window` / `document` 的 `keydown`（按键只经 `UiEnv.pushOverlay`，元素自己的 `onKeyDown` 除外）；不写数字 z-index；不对 `left` / `top` 做动画；不在关闭动画期间响应点击；`Dialog` 不自动触发危险按钮；不在本目录以外 import `@floating-ui/dom`。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 9 棒；`P.09` K121、K125、K126 |
