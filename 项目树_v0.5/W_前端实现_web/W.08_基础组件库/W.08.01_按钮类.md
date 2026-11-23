# W.08.01 按钮类

| 项 | 内容 |
|---|---|
| 编号 | W.08.01 |
| 类型 | 实施 |
| 上级 | W.08 基础组件库 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设10 §10.0–§10.3、§10.29；设计规范 v0.3 `src/06_controls.css`（按钮、图标按钮、`kbd`）、`src/20_icons.js`（图标名）；demo v0.5（v0.5.11）`43_float.js` ②（流动高亮）、`21_flow.css`（`.hx-glide`）、`15_art.css`、`17_fix.css`（按钮透明底、顶部图标 `text-3`）；`P.09` K118、K122、K123、K125–K128 |
| 最后修改 | 2026-11-23 |

## 1. 职责
按钮 `Button`、图标按钮 `IconButton`、键帽 `Kbd`、图标 `Icon`（含给画布引擎用的 `iconSvg`）、流动高亮 `GlideGroup`；以及 `W.08` 的唯一出口 `index.ts`、共用类型 `types.ts`、共用样式 `base.css`。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 提示框本身（`IconButton` 内部用它） | `W.08.04` `Tooltip` |
| 旋转弧本身（`Button` 加载时用它） | `W.08.05` `Spinner` |
| 按键文字（`Ctrl+K` / `⌘K`）的计算 | `W.02.04` `keys.label`（调用方算好传进 `shortcut`） |
| 哪里用主按钮：只有运行、H 标识、有字时的发送三处实心（`U.23-R2`） | 调用方（`W.07.01`、`W.07.07`）；本文只提供 `primary` 变体 |
| 急停按钮平时 / 运行中的两种外观切换 | `W.07.01`（用本文的 `IconButton` 与 `Button variant="danger"`，`P.09` K118） |
| 画 SVG 图标、生成图标表 | 设计方（`design/icons/`）、`tools/gen icons`（`G.16`，`P.09` K122） |
| 新建会话那种"主色浅底 + 主色文字"的特殊按钮 | `W.07.02`（自己的类名和样式，`U.23-R22`） |

## 3. 继承的上级约束
`W.08` §4–§6、`W.08-R1`–`R14`；`W.07` §4.3（`Button`、`IconButton`、`Kbd`、`Icon`、`GlideGroup` 五行）、`W.07-R7`、`R12`、§6.5（R2、R5、R21）、§6.6 #3、#6、#15；`W.06` §4.2 `EngineDeps.icon`；`G.06.01-R6`；`G.06.03-R9`；`U.03.05-R5`；`U.08`（全部）；`U.11` §2（按钮、图标按钮）；`U.16-R3`、`R4`、`R9`；`U.23-R2`、`R5`、`R14`、`R21`；`U.09.02-R9`；`U.07.01` §1、R1；`U.07.04`；`P.09` K118、K122、K123、K125–K128。

## 4. 接口

### 4.1 组件
```tsx
// web/src/components/ui/button/Button.tsx
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'model';
export type ButtonProps = {
  variant?: ButtonVariant;             // 缺省 'secondary'
  size?: Size;                         // 缺省 'md'
  icon?: IconName;                     // 文字左侧的图标（md 16、sm 14）
  children: ReactNode;                 // 按钮文字（调用方 t() 过）
  loading?: boolean;                   // 文字换成旋转弧，宽度不变，aria-busy
  disabled?: boolean;
  disabledReason?: string;             // 有原因 → aria-disabled + 提示框说明（U.11 §1）
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';          // 缺省 'button'
  width?: 'auto' | 'full';             // 缺省 'auto'
  ariaLabel?: string;                  // 文字不足以说明时
  autoFocus?: boolean;
  ref?: React.Ref<HTMLButtonElement>;  // React 19：ref 是普通 prop
};
export function Button(p: ButtonProps): JSX.Element;

// web/src/components/ui/button/IconButton.tsx
export type IconButtonProps = {
  icon: IconName;
  label: string;                       // aria-label 与提示框第一行（U.08-R5）
  shortcut?: string;                   // keys.label(id) 的结果，提示框里显示（W.07-R7）
  size?: 28 | 24;                      // 缺省 28
  tone?: 'default' | 'quiet';          // quiet：图标 text-3（顶部条右侧，U.24 #6）；缺省 default（text-2）
  pressed?: boolean;                   // 切换型按钮：aria-pressed，底 bg-5
  dot?: 'accent' | 'danger' | 'wait' | 'model' | 'focus';   // 右上角 7px 圆点（通知、右栏开关）
  disabled?: boolean;
  disabledReason?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  tipPlacement?: Placement;            // 缺省 'bottom'（顶部条）；停靠栏传 'right'
  ariaHasPopup?: 'menu' | 'dialog' | 'listbox';
  ariaExpanded?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
};
export function IconButton(p: IconButtonProps): JSX.Element;

// web/src/components/ui/button/Kbd.tsx
export type KbdProps = { text: string; variant?: 'inline' | 'key' | 'tip' };   // 缺省 inline（菜单项、按钮右侧）
export function Kbd(p: KbdProps): JSX.Element;

// web/src/components/ui/icon/Icon.tsx
export type IconProps = {
  name: IconName | (string & {});      // 不在表里的名字显示"扩展"图标（NodeDef.icon 来自数据，C.03.01）
  size?: 14 | 16 | 32;                 // 缺省 16；32 只给 EmptyState（U.14.02-R2）
  label?: string;                      // 有含义时的读屏文字（role="img"）；缺省 aria-hidden
};
export function Icon(p: IconProps): JSX.Element;

// web/src/components/ui/glide/GlideGroup.tsx
export type GlideGroupProps = {
  itemSelector: string;                // 哪些后代是"条目"，如 '.hx-sess__item, .hx-tree__row'
  variant: 'row' | 'icon';             // row：侧栏行；icon：图标栏、底部一排、停靠栏
  className?: string;                  // 调用方自己的块类名（布局用）
  children: ReactNode;
};
export function GlideGroup(p: GlideGroupProps): JSX.Element;
```
```ts
// web/src/components/ui/icon/iconSvg.ts —— 不依赖 React；Canvas.tsx 把它放进 EngineDeps.icon（W.06 §4.2）
export function iconSvg(name: string, size?: 14 | 16): SVGSVGElement;   // 每次返回新元素（克隆缓存的模板）；未知名字 → "扩展"
export function hasIcon(name: string): name is IconName;

// web/src/components/ui/glide/glide.ts —— 纯函数（几何量，W.07-R2 同一做法）
export type Box = { x: number; y: number; w: number; h: number };
export function relBox(item: DOMRect, group: DOMRect): Box;              // 条目相对分组左上角
export function flipFrom(prev: Box, next: Box): string;                  // 'translate(px,px) scale(sx,sy)'，transform-origin 0 0
export function at(next: Box): string;                                   // 'translate(px,px)'
```

### 4.2 生成物 `web/src/styles/icons.ts`（只读，`P.09` K122）
```ts
/* 由 tools/gen icons 生成，请勿手改 */
export type IconShape =
  | { t: 'path'; d: string } | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number } | { t: 'polyline'; points: string };
export const ICONS: Readonly<Record<IconName, { shapes: readonly IconShape[]; solid?: true }>>;   // solid：状态点等实心图标
export type IconName = '资源' | 'Agent' | … | 'chat' | 'graph' | … | 'queued' | 'done' | …;      // U.08 §2 图标表的全部名字
export const ICON_FALLBACK: IconName;   // '扩展'
```
来源：`design/icons/<名字>.svg`（界面、状态图标，文件名就是图标名）与 `design/icons/node/<别名>.svg`（原子节点，文件名用 `schema/builtin/aliases.yaml` 的英文别名，生成时换回 `U.08` 表里的中文名，`C.14-R7`）。生成器检查 `U.08-R1`、`R4`：视框 `0 0 16 16`、只有上面五种形状、没有 `fill` 颜色（`solid` 除外）、没有 `<script>`、`style`、`on*` 属性、外链；不满足就生成失败。

### 4.3 出口与共用文件
- `web/src/components/ui/index.ts`：`W.08` §4.2 的全部导出（本叶子建文件，其他叶子实现时往里加自己的行）。
- `web/src/components/ui/types.ts`：`W.08` §4.4 的类型。
- `web/src/components/ui/base.css`：`.hx-focusring`（§6.1 焦点环）、`.hx-ctl`（尺寸变量 `--_h`、`--_fs`、`--_ic`、`--_px`，`.hx-ctl--sm` 切换）、`.is-disabled`（透明度 0.5、`cursor: not-allowed`）。组件 CSS 通过把这几个类加到自己的根元素上复用，不写全局选择器（`G.06.03-R4`）。

### 4.4 依赖
`W.08` §4.4 共用类型；`W.08.04` 的 `Tooltip`；`W.08.05` 的 `Spinner`；`W.08.04` 的 `useUiEnv`（`GlideGroup` 读 `reducedMotion()`）；`@/styles/icons`；`@/lib/i18n` 的 `useT`（`ui.loading`）。

## 5. 数据结构
- 本文私有：§4.1 的 props 类型、`glide.ts` 的 `Box`。
- `iconSvg` 的模板缓存：`Map<IconName, SVGSVGElement>`，第一次用到某个图标时按 `ICONS` 建模板，之后 `cloneNode(true)`；尺寸只改 class（`hx-icon--14` / `--16`），不进缓存键。

## 6. 行为

### 6.1 `Button`（`U.11` §2、`设10` §10.1）
| 变体 | 默认 | 悬停 | 用途 |
|---|---|---|---|
| `primary` | 底 `--hx-primary`、字 `--hx-primary-fg`（`U.03.05-R5`） | `::after` 覆盖层 `currentColor`，透明度 0 → 0.08 | 只有运行、发送（`U.23-R2`；H 标识不是按钮） |
| `secondary` | 底 `bg-4`、字 `text-1` | 底 `bg-5` | 一般动作（对话框里的"取消"等） |
| `ghost` | 透明、字 `text-2` | 底 `bg-4`、字 `text-1` | 面板里的大多数按钮（`U.23-R2`："其余按钮透明底，悬停才出现填充"） |
| `danger` | 底 `danger-weak`、字 `danger` | `::after` 覆盖层 0 → 0.08 | 删除、急停、解除急停确认 |
| `model` | 底 `model-weak`、字 `model` | `::after` 覆盖层 0 → 0.08 | 采纳、"让 AI 帮我做" |
- 结构：`<button type class="hx-btn hx-btn--<变体> hx-ctl [hx-ctl--sm] hx-focusring">[Icon] <span class="hx-btn__label">文字</span></button>`；圆角 `r-md`（`sm` 为 `r-sm`）；内边距 `--_px`；图标与文字间距 `s-3`（`sm` 为 `s-2`）；文字不换行，超长省略（调用方给 `ariaLabel` 或外包 `Tooltip`）。
- 按下：`transform: scale(.97)`，过渡 `--hx-t-1`；减少动效时不缩放。
- `loading`：量一次当前宽度写进 `--_w`（`min-width: var(--_w)`），标签 `visibility: hidden`，中间叠一个 `Spinner size=12`（`md` 为 16），颜色 `currentColor`；`aria-busy="true"`；点击无效（不调 `onClick`）。`loading` 变回 false 时去掉 `--_w`。
- `disabled` 且有 `disabledReason`：`aria-disabled="true"`、`.is-disabled`；仍可聚焦；外包 `Tooltip content={disabledReason}`；`onClick` 不调用，`Enter` / 空格不触发。没有原因：原生 `disabled`。
- 一个按钮只发一次：`onClick` 由浏览器的 `click` 触发（包括键盘 Enter / 空格），组件不另外处理键盘。

### 6.2 `IconButton`（`U.11` §2、`设10` §10.2）
- 28×28（`size=24` 时 24×24），图标 16（24 时 14），`r-md`（24 时 `r-sm`）；默认透明、图标 `text-2`（`tone='quiet'` 时 `text-3`）；悬停底 `bg-4`、图标 `text-1`；按下底 `bg-5`；`pressed` 时底 `bg-5`、图标 `text-1`、`aria-pressed="true"`（`pressed` 为 `undefined` 时不写 `aria-pressed`）。
- 一律外包 `Tooltip`：第一行 `label`，有 `shortcut` 时右侧 `Kbd variant="tip"`；禁用且有原因时第二行写原因（`text-3`）。`aria-label = label`；提示框只负责视觉，元素再加 `aria-describedby` 指向提示框（只在提示框显示时）。
- `dot`：右上角 7px 圆点（`width: calc(var(--hx-s-3) + 1px)`），颜色 `--hx-<dot>`；圆点本身不传达信息给读屏——调用方把状态写进 `label`（例如"通知，有未处理的审批"，`U.16-R2`）。
- 放在 `GlideGroup` 里时悬停底为透明，交给流动底块（`W.08` §6.1）；`pressed` 的底色保留。

### 6.3 `Kbd`（`设10` §10.29）
- `inline`：无底，`text-3`，`font-mono`、`fs-11`；菜单项右侧、按钮右侧。
- `key`：底 `bg-3`、下沿内阴影 `inset 0 -1px 0 var(--hx-line-2)`（不是外框）、`r-xs`、高 20（`var(--hx-s-7)`）、最小宽 20、内边距 `0 var(--hx-s-2)`；速查面板、命令面板底栏。
- `tip`：提示框里，字色同提示框次要文字 `text-2`。
- 只渲染一个 `<kbd>`，文字原样（已经是 `keys.label` 的结果，含 `+` 或 `⌘`），不自己拆键、不自己换平台符号（`W.02.04` §6.4）。

### 6.4 `Icon` 与 `iconSvg`（`U.08`）
- `<svg class="hx-icon hx-icon--16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">`，子元素按 `ICONS[name].shapes` 用 `React.createElement` 逐个建（`W.08-R11`）；`solid` 图标 `fill="currentColor" stroke="none"`。
- 尺寸只由类决定：`.hx-icon--16 { width: var(--hx-s-6); height: var(--hx-s-6) }`、`--14` 为 `calc(var(--hx-s-6) - var(--hx-s-1))`、`--32` 为 `var(--hx-s-9)`（32 号的线宽保持 1.5：形状加 `vector-effect: non-scaling-stroke`）；颜色永远是 `currentColor`，由父元素决定（`U.08-R1`、`R3`：节点类别图标统一 `text-2`）。
- 有 `label` 时 `role="img"`、`aria-label`，去掉 `aria-hidden`。
- `name` 不在表里 → `ICON_FALLBACK`，开发模式每个名字 `console.warn` 一次（`W.08` §8）。
- 扩展包自带的 SVG 图标（`U.08-R4`）不经本组件：v1 的图标表只有内置图标，扩展节点都显示"扩展"图标；扩展图标的传输与校验在扩展包加载一侧定稿时再接入（届时在本文加 `src` 形式并登记 K）。
- `iconSvg(name, size)`：`document.createElementNS` 建同样结构的元素（模板缓存后克隆）；画布引擎拿到后直接 `append`，不改它的属性（颜色由引擎的 CSS 类决定）。

### 6.5 `GlideGroup`（`U.23-R21`、`U.09.02-R9`、`U.24` #15、`P.09` K123）
结构：`<div class="hx-glide hx-glide--<variant> <className>"><i class="hx-glide__block" aria-hidden="true"></i>{children}</div>`。底块放在最前面；`.hx-glide > :not(.hx-glide__block) { position: relative }`，这样后面的条目按文档顺序画在底块之上，不需要 `z-index`（`G.06.03-R8`）。底块 `position: absolute; left: 0; top: 0; transform-origin: 0 0; pointer-events: none; opacity: 0; background: var(--hx-bg-glide); border-radius: var(--hx-r-md)`。

步骤（全部写 DOM 样式，不 `setState`，`W.08` §7）：
1. `onPointerMove`：记下 `clientX / clientY`；本帧还没排程就 `requestAnimationFrame(pick)`。
2. `pick`：`document.elementFromPoint(x, y)` → `closest(itemSelector)`（`W.01-R11` 同一做法）；不在本分组里、或 `offsetParent === null`（被隐藏）→ 第 5 步。是同一个条目且已显示 → 只按第 3 步更新位置（条目可能因展开折叠移动）。
3. 新条目：`next = relBox(条目矩形, 分组矩形)`；
   - 底块还没显示，或 `UiEnv.reducedMotion()` 为真：加 `is-instant`（`transition: opacity`），写 `width / height = next.w / next.h`、`transform = at(next)`，再加 `is-on`（透明度 0 → 1，`--hx-t-2`）。
   - 已显示（从上一个条目滑过来）：FLIP——加 `is-instant`，写 `width / height = next`、`transform = flipFrom(prev, next)`（视觉上仍在上一个条目的位置和大小）；读一次 `offsetWidth` 让样式生效；去掉 `is-instant`，写 `transform = at(next)`。过渡 `transform var(--hx-t-glide) var(--hx-ease-out)`。这样位置和大小都在 0.32 秒里平滑变化，而动画属性只有 `transform`（`U.07.01-R1`，demo 直接动 `width` / `height` 的写法不迁移）。
   - 记 `prev = next`。
4. 分组内容滚动时（指针在分组里期间，在最近的滚动祖先上监听 `scroll`，`passive`，离开时移除）：用最后一次指针位置重新 `pick`，底块用第 3 步第一种方式直接到位。
5. `onPointerLeave` 或没有命中条目：去掉 `is-on`（淡出 `--hx-t-2`），`prev` 清空。
- 键盘焦点不移动底块（焦点用外环表示，`W.08` §6.1）。
- `variant='icon'` 与 `row` 只差底块圆角（`icon` 用 `r-md`、`row` 用 `r-md`，`sm` 尺寸的图标按钮用 `r-sm`）和条目悬停底色的取消范围：`.hx-glide--icon .hx-iconbtn:hover:not([aria-pressed="true"])`、`.hx-glide--row .hx-btn--ghost:hover` 的底色为透明。
- 减少动效：`html[data-motion="reduce"] .hx-glide__block { transition: opacity var(--hx-t-2) var(--hx-ease) }`，第 3 步走第一种方式（`U.07.04` §2）。

## 7. 不变量
- 页面上任何 `IconButton` 都有非空的 `aria-label` 和提示框。
- `Button` 在 `loading` 前后宽度不变（误差 ≤ 1px）。
- `GlideGroup` 的底块只动 `transform` 和 `opacity`；指针在分组里移动期间 React 提交次数为 0。
- `Icon` / `iconSvg` 生成的元素里没有来自字符串 HTML 的内容。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 未知图标名 | §6.4：显示"扩展"图标，开发模式警告一次 |
| `IconButton` 的 `label` 为空字符串 | 开发模式抛错（`U.08-R5` 是硬规则），生产模式 `console.error` 一次并用图标名作为 `aria-label` |
| `loading` 时又被点击 | 忽略 |
| `GlideGroup` 的 `itemSelector` 不合法（`closest` 抛错） | 开发模式抛错；生产模式 `console.error` 一次，此后不再显示底块 |
| `elementFromPoint` 返回 null（指针在视口外） | 当作没有命中（§6.5 第 5 步） |

## 9. 性能与资源
- `Button`、`IconButton` 渲染 ≤ 0.1ms；`IconButton` 的 `Tooltip` 在指针进入前不挂任何浮层（只有事件处理函数）。
- `iconSvg` 每次调用 ≤ 0.02ms（克隆模板）；200 个节点首次渲染时图标总耗时 ≤ 4ms。
- `GlideGroup` 每帧最多一次 `pick`：一次 `elementFromPoint`、两次 `getBoundingClientRect`、最多一次 `offsetWidth`。

## 10. 验收标准
1. 五种按钮变体 × 两种尺寸 × 默认 / 悬停 / 按下 / 焦点 / 禁用 / 加载：没有边框；只有键盘 Tab 时有焦点外环；`primary` 文字对比度 ≥ 4.5:1（`U.03.05-R3`）。
2. 禁用且有原因的按钮：Tab 能聚焦、悬停和聚焦都弹出原因提示框，点击和 Enter 不触发。
3. `IconButton`：提示框显示名称和快捷键；`pressed` 时 `aria-pressed="true"`；`dot` 出现在右上角；顶部条的 `tone="quiet"` 默认 `text-3`。
4. 左栏会话列表在 `GlideGroup` 里：指针从第 1 项滑到第 5 项，底块平滑滑过去（约 0.32 秒）；移出列表后淡出；滚动列表时底块跟着指针下的条目；条目自己不出现悬停底色。React Profiler 期间提交次数为 0。
5. 打开减少动效：底块直接出现在条目上、只做淡入淡出；按钮按下不缩放；加载时旋转弧变成静态半圆弧。
6. 13 个原子节点和界面图标在 16 与 14 两个尺寸下清晰（截图比对）；未知图标名显示"扩展"图标。
7. 键盘只用 Tab、Enter、空格能操作全部按钮（`U.16-R3`）。

### 实施卡
- 要建 / 要改的文件：`web/src/components/ui/index.ts`、`types.ts`、`base.css`；`button/Button.tsx`、`Button.css`、`Button.test.tsx`、`IconButton.tsx`、`IconButton.css`、`IconButton.test.tsx`、`Kbd.tsx`、`Kbd.css`、`Kbd.test.tsx`；`icon/Icon.tsx`、`Icon.css`、`Icon.test.tsx`、`iconSvg.ts`、`iconSvg.test.ts`；`glide/GlideGroup.tsx`、`GlideGroup.css`、`GlideGroup.test.tsx`、`glide.ts`、`glide.test.ts`；`web/eslint.config.js` 只加 `W.08-R1`、`R2` 两条 `no-restricted-imports`（`G.06.04` 统一维护的文件里追加）。
- 不许碰的文件：`web/src/styles/icons.ts`、`tokens.css`（生成物，`G.02.05-R1`；缺图标或令牌时上报）、`design/`、`tools/gen/`（图标生成器另由 `C.14` 实施，`P.09` K234）、`web/src/shell/`、`state/`、`ops/`、`lib/protocol/`、`panels/`、`pages/`、`canvas/`、其他 `components/ui/` 子目录（`index.ts` 除外）。
- 函数签名：见 §4。
- 测试用例：
  - `W0801-T1 props 对照`：`ButtonProps`、`IconButtonProps`、`KbdProps`、`IconProps`、`GlideGroupProps` 含 `W.07` §4.3 对应行的全部 props，类型一致（类型测试 `expectTypeOf`）
  - `W0801-T2 变体类名`：五种变体渲染 `hx-btn--primary` 等；没有 `is-primary`（`G.04.06-R1`）；`size='sm'` 加 `hx-ctl--sm`
  - `W0801-T3 加载`：`loading=true` → `aria-busy="true"`、`min-width` 等于加载前宽度（mock `offsetWidth=88`）、点击不调 `onClick`；含 `Spinner`
  - `W0801-T4 禁用原因`：`disabled + disabledReason` → `aria-disabled="true"`、无原生 `disabled`、`tabIndex` 可聚焦、点击与 Enter 不调 `onClick`；聚焦后提示框文字为原因；只有 `disabled` → 原生 `disabled`
  - `W0801-T5 图标按钮`：`aria-label=label`；`pressed=true` → `aria-pressed="true"`，`pressed` 未给 → 没有 `aria-pressed`；`dot='danger'` → `.hx-iconbtn__dot`；`shortcut='Ctrl+K'` 出现在提示框里的 `kbd`
  - `W0801-T6 空 label`：开发模式渲染 `label=''` 抛错
  - `W0801-T7 Kbd`：三种 `variant` 的类名；文字原样输出（`'⌘K'` 不被拆开）
  - `W0801-T8 Icon`：`name='chat'` → `svg` 有 `viewBox="0 0 16 16"`、`aria-hidden="true"`、子元素数与 `ICONS.chat.shapes` 相同；`size=14` → `hx-icon--14`；`label='失败'` → `role="img"`、`aria-label`；未知名 → "扩展"的形状，`console.warn` 只一次
  - `W0801-T9 iconSvg`：两次调用返回不同元素、结构相同；未知名 → 扩展；返回值是 `SVGSVGElement`；不使用 `innerHTML`（源码检查）
  - `W0801-T10 glide 几何`：`relBox({left:110,top:240,width:200,height:28}, {left:100,top:200})` → `{x:10,y:40,w:200,h:28}`；`flipFrom({x:10,y:40,w:200,h:28},{x:10,y:72,w:200,h:32})` → `'translate(10px,40px) scale(1,0.875)'`；`at` 只有 translate
  - `W0801-T11 GlideGroup`：mock `elementFromPoint` 依次命中第 1、3 项 → 第二次先写 `flipFrom` 再写 `at`；离开 → 去掉 `is-on`；命中分组外元素 → 不显示；整个过程组件渲染次数为 1（只有首次）
  - `W0801-T12 减少动效`：`fakeEnv.reducedMotion=true` → 第 3 步只走直接到位分支（不写 `scale`）
  - `W0801-T13 ESLint`：`components/ui/button/Button.tsx` 里加 `import '@/state/types'` → lint 报错；`panels/x.tsx` 里 `import { Button } from '@/components/ui/button/Button'` → 报错
- 允许使用的依赖：`react`、`react-dom`；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部；另：不对 `width` / `height` / `left` / `top` 做过渡；不用 `innerHTML` / `dangerouslySetInnerHTML` 插图标；不在按钮里写中文字面量；不给按钮加 `border` 或悬停外框；不在组件里拼按键文字。
- 完成标志：`G.14` 全部条件；§10 七条验收通过；`W.07` §4.3 中本文五个组件的 props 全部可用。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 9 棒；`P.09` K118、K122、K123、K125–K128 |
| 2026-11-23 | 图标生成器的负责叶子改为 `C.14` | `P.09` K234 |
