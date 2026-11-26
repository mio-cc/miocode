# W.08.03 选择类

| 项 | 内容 |
|---|---|
| 编号 | W.08.03 |
| 类型 | 实施 |
| 上级 | W.08 基础组件库 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 设10 §10.9、§10.11、§10.12、§10.25；设计规范 v0.3 `src/06_controls.css`（`.hx-select`）；demo v0.5（v0.5.11）`17_fix.css`（节点库筛选纯文字 + 下划线）、`21_flow.css`（思考强度分段）；`P.09` K123、K125–K127、K130 |
| 最后修改 | 2026-11-26 |

## 1. 职责
下拉 `Select`、分段 `Segmented`、开关 `Switch`、标签页 `Tabs`、选择列表 `Picker`（`U.11` 的"选择器 picker"，`P.09` K130），以及它们共用的列表导航与窗口化计算 `listNav.ts`。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 弹层的定位、外部点击、焦点回位、按键压栈 | `W.08.04` `Popover` / `Overlay`（`Select` 用它们） |
| `Picker` 外面的搜索框、锚点、何时打开（附件菜单、`/` 命令、`@` 引用、模型选择、快速添加） | 调用方 `W.07.07`、`W.07.11`、`W.06.01`（把 `Picker` 放进 `Popover`，输入框用 `W.08.02` `SearchInput` / `TextArea`） |
| 搜索的匹配与排序（前缀 > 词首 > 包含） | 调用方（`W.07.11` 的 `rank`）；`Picker` 只显示传入的结果 |
| 多选下拉、组合框（既能选又能输入新值，`设10` §10.10） | v1 没有使用方；出现需求时先上报（`W.07` §4.3 末尾） |
| 思考强度显示哪几级、默认哪一级 | `W.07.07`（`Segmented` 只显示传入的 `items`） |
| 右侧栏标签页的内容和保留滚动位置 | `W.07.03`（`Tabs` 只是标签条） |

## 3. 继承的上级约束
`W.08` §4–§6、`W.08-R1`–`R14`；`W.07` §4.3（`Select`、`Segmented`、`Switch`、`Tabs`、`Picker` 五行）、`W.07` §9（长列表窗口化）；`G.06.01-R5`、`R7`；`U.03.02`（开关打开态 `accent`）；`U.11` §2（下拉、分段、开关、选择器 picker）；`U.13.05-R2`（不可用项禁用并说明原因）；`U.16-R3`、`R6`；`U.22-R11`；`U.23-R5`；`U.07.01` §1；`U.07.04` §2（分段滑块直接切换）；`P.09` K123、K125–K127、K130。

## 4. 接口

### 4.1 组件
```tsx
// web/src/components/ui/select/Select.tsx
export type SelectOption<V extends string = string> = {
  value: V; label: string;
  desc?: string;                      // 右侧次要信息（mono、text-3），如"12.8 万"（调用方用 W.10 的 fmtTokens 格式化）
  icon?: IconName;
  disabled?: boolean; disabledReason?: string;
  group?: string;                     // 相同 group 的连续选项归一组，组名作标题
};
export type SelectProps<V extends string = string> = {
  value: V | null;                    // null → 显示 placeholder
  options: readonly SelectOption<V>[];
  onChange(v: V): void;
  filterable?: boolean;               // 缺省：选项多于 8 个时自动出现过滤框
  footer?: ReactNode;                 // 弹层底部固定的一行（如"管理模型…"）
  placeholder?: string;
  size?: Size;                        // 缺省 'md'
  ariaLabel: string;
  id?: string;
  disabled?: boolean; disabledReason?: string;
  lockReason?: string;
  invalid?: boolean;
  mono?: boolean;                     // 值用等宽字体（类型名、模型 ID）
};
export function Select<V extends string = string>(p: SelectProps<V>): JSX.Element;

// web/src/components/ui/select/Segmented.tsx
export type SegmentedItem<V extends string = string> = { value: V; label: string; tip?: string; disabled?: boolean; disabledReason?: string };
export type SegmentedProps<V extends string = string> = {
  value: V;
  items: readonly SegmentedItem<V>[];  // 2–5 段（U.11 §2）
  onChange(v: V): void;
  size?: Size;
  ariaLabel: string;
  disabled?: boolean; disabledReason?: string;
};
export function Segmented<V extends string = string>(p: SegmentedProps<V>): JSX.Element;

// web/src/components/ui/select/Switch.tsx
export type SwitchProps = {
  checked: boolean;
  onChange(v: boolean): void;
  label: string;                      // 可见标签与 aria-label
  labelPosition?: 'left' | 'none';    // 缺省 'left'；'none'：标签只给读屏（属性页参数行已有标签列）
  size?: Size;                        // md 28×16、sm 24×14
  disabled?: boolean; disabledReason?: string;
  lockReason?: string;
};
export function Switch(p: SwitchProps): JSX.Element;

// web/src/components/ui/select/Tabs.tsx
export type TabItem<V extends string = string> = { value: V; label: string; badge?: string | number; disabled?: boolean };
export type TabsProps<V extends string = string> = {
  value: V;
  items: readonly TabItem<V>[];
  onChange(v: V): void;
  variant: 'underline' | 'pill';      // underline：纯文字 + 当前项 1.5px 下划线（U.22-R11）
  ariaLabel: string;
  panelIdOf?(v: V): string;           // 有值 → tab 的 aria-controls
};
export function Tabs<V extends string = string>(p: TabsProps<V>): JSX.Element;

// web/src/components/ui/select/Picker.tsx
export type PickerItem = {
  id: string; label: string;
  icon?: IconName;
  desc?: string;                      // 第二行（text-3，单行省略）
  right?: ReactNode;                  // 右侧（Kbd、来源、价格）
  disabled?: boolean; disabledReason?: string;
};
export type PickerGroup = { title?: string; items: readonly PickerItem[] };
export type PickerHandle = {
  key(e: KeyboardEvent | React.KeyboardEvent): boolean;   // 外部输入框收到的键交给它；返回 true = 已处理（调用方 preventDefault）
};
export type PickerProps = {
  groups: readonly PickerGroup[];
  activeId: string | null;
  onPick(id: string, how: 'enter' | 'tab' | 'click'): void;
  onActiveChange(id: string | null): void;
  emptyText: string;                  // 没有任何条目时的一行
  footer?: ReactNode;                 // 底部一行（"↑ ↓ 选择 · ↵ 执行 · Esc 关闭"，W.07.07）
  ariaLabel: string;
  listId?: string;                    // 缺省 useId()；给外部输入框的 aria-controls / aria-activedescendant
  query?: string;                     // 条目文字里第一处匹配（不分大小写）加粗
  maxHeight?: 'sm' | 'md';            // sm 240、md 320（缺省）；超出滚动
  ref?: React.Ref<PickerHandle>;
};
export function Picker(p: PickerProps): JSX.Element;
export function pickerOptionId(listId: string, itemId: string): string;   // aria-activedescendant 用
```
```ts
// web/src/components/ui/select/listNav.ts —— 纯函数
export type NavRow = { id: string; disabled: boolean; height: number };   // 平铺后的可选行（组标题不算）
export function flatten(groups: readonly PickerGroup[], rowH: (it: PickerItem) => number): NavRow[];
export function step(rows: readonly NavRow[], fromId: string | null, dir: 1 | -1, wrap: boolean): string | null;   // 跳过禁用项
export function edge(rows: readonly NavRow[], which: 'first' | 'last'): string | null;
export function typeahead(labels: readonly { id: string; label: string; disabled: boolean }[], buf: string, fromId: string | null): string | null;   // 首字匹配，从当前项之后找
export function windowOf(offsets: readonly number[], scrollTop: number, viewport: number, buffer: number): { start: number; end: number };   // 可见行 ± buffer
export const WINDOW_MIN = 200;        // 行数超过它才窗口化（W.07 §9）
export const WINDOW_BUFFER = 10;
export function matchSpan(label: string, q: string): [number, number] | null;   // 不分大小写、全半角不敏感的第一处
```

### 4.2 依赖
`W.08` §4.4；`W.08.01` 的 `Icon`、`Kbd`；`W.08.04` 的 `Popover`、`Tooltip`；`W.08.05` 的 `Badge`、`ScrollArea`；`W.08.02` 的 `SearchInput`（`Select` 的过滤框）；`@/lib/i18n` 的 `useT`（`ui.noMatch`、`ui.filter`、`ui.locked`）；`W.08.01` `GlideGroup` 不用（列表高亮跟随键盘与指针，不是流动底块）。

## 5. 数据结构
本文私有：§4.1 的 props；`Select` 内部的 `open`、过滤文字、高亮项（`useState`）；`Picker` 的 typeahead 缓冲（`useRef`，500ms 清空）、上次指针位置（区分"指针真的移动"和"列表滚动造成的 `pointerover`"）；`listNav.ts` 的 `NavRow`。

## 6. 行为

### 6.1 `Select`（`U.11` §2"下拉"、`设10` §10.9）
- 触发器：`<button class="hx-select hx-ctl hx-focusring" role="combobox" aria-haspopup="listbox" aria-expanded aria-controls aria-label>`，外观同 `W.08.02` §6.1（`bg-4`、无边框、`r-sm`）；显示当前项的 `label`（`value` 为 null 时 `placeholder`，`text-3`），超长省略；右侧 `Icon chevd size=14 text-3`，打开时 `transform: rotate(180deg)`（`--hx-t-2`）。
- 打开：点击、`Enter`、空格、`↓`。弹层用 `Popover`（`anchor` = 触发器、`placement='bottom-start'`、`offset` 4、宽 = 触发器宽，夹在 200–360）；列表最大高 320，超出用 `ScrollArea`。弹层 `bg-2`、`shadow-pop`、`r-lg`、内边距 `s-2`（`U.11` §2）。
- 过滤框：`filterable` 为真，或没给且选项 > 8 → 弹层顶部 `SearchInput size='sm'`（`ariaLabel = t('ui.filter')`、`onEscape='none'`、`ariaControls` 指向列表），打开即聚焦；没有过滤框时焦点在列表上（`initialFocus='container'`）。过滤按 `matchSpan`（标签与 `desc`），匹配字加粗；没有结果显示一行 `text-3` `t('ui.noMatch')`。
- 选项行：高 28、`r-sm`、内边距 `0 var(--hx-s-4)`；结构 `[Icon] 标签 …… desc（mono fs-11 text-3） [✓]`；高亮（键盘或指针）底 `bg-4`；选中项右侧 `Icon check`；禁用项 `text-3`，悬停 / 高亮时 `Tooltip` 显示 `disabledReason`，点了不选（`U.13.05-R2`）。组标题高 24、`fs-11`、`text-3`；组之间 1px `line-1`。
- 键盘（弹层的处理函数经 `Overlay` 的 `onKey`，`W.08` §6.2）：`↑` `↓` 移动高亮（跳过禁用，不循环）、`Home` / `End`（没有过滤框时）、可打印字符（没有过滤框时）typeahead、`Enter` 选中并关闭、`Tab` 选中当前高亮并关闭、`Esc` 关闭；关闭后焦点回到触发器。
- 打开时高亮当前值并滚到可见；`onChange` 只在选了**不同**的值时调用。
- `footer`：列表下方 1px `line-1` 分隔后的一行，内容由调用方给（可以是按钮）。
- 锁定 / 禁用：不打开；外观见 `W.08` §6.1。
- 选项 > 200 时窗口化（`windowOf`，行高固定 28、组标题 24）。

### 6.2 `Segmented`（`U.11` §2"分段"、`设10` §10.11）
- 外壳 `bg-4`、`r-md`、内边距 2px（`var(--hx-s-1)`）；各段等宽，字 `text-2`，悬停 `text-1`；选中段字 `text-1`。
- 选中块是独立的 `<span class="hx-seg__thumb" aria-hidden="true">`：宽 `calc((100% - 2 * var(--hx-s-1)) / var(--_n))`，位置 `transform: translateX(calc(100% * var(--_i)))`，`--_n`、`--_i` 由组件写整数（几何值）；底色 `--hx-bg-seg` + `shadow-node`（浅色主题白色凸起、深色主题 `bg-5`，`U.11` §2，令牌 `P.09` K123）；切换时 `transition: transform var(--hx-t-2) var(--hx-ease)`；减少动效时无过渡（直接切换，`U.07.04` §2）。
- `role="radiogroup"` + 每段 `<button role="radio" aria-checked>`；漫游焦点：只有选中段 `tabIndex=0`；`←` `→`（以及 `↑` `↓`）切换并立即 `onChange`、焦点跟随（`设10` §10.11）；`Home` / `End`。处理掉的方向键 `stopPropagation`（不落到画布）。
- `tip`：该段外包 `Tooltip`；禁用段 `aria-disabled`，提示框写原因。
- 段数不在 2–5 之间：开发模式 `console.warn`。

### 6.3 `Switch`（`U.11` §2"开关"、`设10` §10.12）
- 轨道 `md` 28×16（`var(--hx-ctl-h)` × `var(--hx-s-6)`）、`sm` 24×14；关 `bg-5`、开 `accent`（`U.03.02`：开关打开态用主色）；拇指 12（`sm` 10）圆、`--hx-bg-seg` + `shadow-node`，`transform: translateX(…)` `--hx-t-2`；减少动效时无过渡。
- `<button role="switch" aria-checked>`；点击或空格 / Enter → `onChange(!checked)`（立即生效，不等保存，`设10` §10.12"不用于需要点保存的表单"）。
- `labelPosition='left'`：标签在左（`fs-13` `text-1`），开关在右，整行可点；`'none'`：只有 `aria-label`。
- 锁定：只读 + 锁图标 + 原因提示框。

### 6.4 `Tabs`（`设10` §10.25、`U.22-R11`）
- `underline`：高 32；项间距 `s-5`；字 `text-2`，悬停 `text-1`；当前项 `text-1`、字重 500、下方 1.5px 下划线（`box-shadow: inset 0 calc(var(--hx-s-1) * -0.75) 0 var(--hx-text-1)`）；没有底色（`U.22-R11`、`U.24` #3）。
- `pill`：项为胶囊（`r-full`、高 24、内边距 `0 var(--hx-s-4)`）；当前项底 `bg-4`、字 `text-1`；其余透明、`text-2`，悬停 `text-1`。
- `badge`：标签后 `Badge tone='neutral'`（计数）。
- `role="tablist"`（`aria-label`），每项 `<button role="tab" aria-selected aria-controls?>`；漫游焦点；`←` `→` 移动并立即切换（自动激活，首尾循环），`Home` / `End`；禁用项跳过。下划线不做滑动动画（切换反馈 ≤ 100ms，`U.17` §1）。
- 不在 `Tabs` 里再套 `Tabs`（第二层用 `Segmented`，`设10` §10.25）——由调用方遵守。

### 6.5 `Picker`（`U.11` §2"选择器 picker"、`W.07` §4.3）
- 只是列表本身：调用方把它放在 `Popover` 里，上面放自己的输入框（`SearchInput` 或对话框的 `TextArea`）。焦点通常留在输入框（组合框做法，`W.08` §6.2）：调用方把输入框的 `onKeyDown` 交给 `ref.current.key(e)`，返回 true 时 `preventDefault()`；并给输入框 `ariaControls = listId`、`ariaActiveDescendant = pickerOptionId(listId, activeId)`。
- `key(e)` 处理：`↑` `↓`（循环、跳过禁用）→ `onActiveChange`；`Enter` → `onPick(activeId, 'enter')`；`Tab`（无修饰键）→ `onPick(activeId, 'tab')`；`activeId` 为 null 或该项禁用 → 返回 false（不处理）。其他键返回 false（输入框照常输入）。组字中（`isComposing`）一律返回 false。
- 行：无 `desc` 高 32、有 `desc` 高 44（两行：标签 `fs-13` `text-1`，说明 `fs-11` `text-3` 单行省略）；结构 `[Icon 16 text-2] 文字 …… right`；当前项底 `bg-4`；禁用项 `text-3`，悬停显示 `Tooltip disabledReason`，点击无效。组标题 `fs-11` `text-3` 高 24；组之间留 `s-2`。
- 指针：在某行上**移动**指针（与上次位置不同）→ `onActiveChange(id)`；列表滚动导致的 `pointerover` 不改高亮；点击 → `onPick(id, 'click')`（点击前先 `preventDefault` 掉 `pointerdown`，焦点不离开输入框）。
- `activeId` 变化且来自键盘时，把该行滚到可见（`block: 'nearest'`）。
- 全部组都没有条目 → 一行 `text-3` 的 `emptyText`（不是 option）。
- `query`：每个 `label` 按 `matchSpan` 拆成三段，中间段 `<b>`；只用文本节点（`W.08-R11`）。
- 可访问性：`<div role="listbox" id={listId} aria-label>`；组 `role="group" aria-label={title}`；行 `role="option" id={pickerOptionId(...)} aria-selected={id === activeId} aria-disabled`。
- 条目合计 > 200 时窗口化（`windowOf`，按行高前缀和计算），否则全部渲染。
- `maxHeight`：`sm` 240、`md` 320（`calc` 令牌），超出用 `ScrollArea`。
- `footer`：列表下方 1px `line-1` 后的一行 `fs-11` `text-3`。

## 7. 不变量
- 任何时刻 `Segmented`、`Tabs` 里恰好一项 `tabIndex=0`。
- `Select` 打开期间 `W.02.04` 的 popover 层栈里有它一项，关闭后没有（经 `Popover`）。
- `Picker.key` 不改变焦点、不调用 `preventDefault`（由调用方决定），返回值准确反映是否处理。
- 禁用项永远不会被 `onPick` / `onChange` 选中。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| `Select` 的 `value` 不在 `options` 里 | 触发器显示 `placeholder`，开发模式警告一次（`W.08` §8） |
| `Picker` 的 `activeId` 不在条目里 | 当作 null；`key('ArrowDown')` 从第一项开始 |
| 条目 `id` 重复 | 开发模式抛错（`G.06.01-R7` 要稳定且唯一的 key）；生产模式 `console.error` 一次，后出现的不渲染 |
| `Segmented` 的 `value` 不在 `items` 里 | 选中块隐藏，没有段 `aria-checked="true"`；开发模式警告一次 |

## 9. 性能与资源
- `Picker` 500 项（窗口化）首次渲染 ≤ 16ms；按住 `↓` 自动重复时每次 ≤ 2ms。
- `Select` 打开 ≤ 50ms（500 项）。
- `Segmented`、`Switch`、`Tabs` 切换只改类和一个 CSS 变量，提交一次。

## 10. 验收标准
1. `Select`：10 个选项时自动出现过滤框并聚焦；输入"lar"只剩匹配项且匹配字加粗；`↓` `Enter` 选中并关闭、焦点回到触发器；`Esc` 关闭不改值；禁用项悬停显示原因、点击无效；放在 `Dialog` 里按 `Esc` 只关下拉不关对话框。
2. `Segmented`：思考强度 5 段，`→` 键切换且立即生效，选中块平滑滑动；减少动效时直接切换；浅色主题选中块是白色凸起，深色主题是 `bg-5`。
3. `Switch`：点击、空格切换；打开时轨道为主色；读屏读出"开 / 关"状态和名称。
4. `Tabs`：`underline` 是纯文字 + 1.5px 下划线、无底色（`U.22-R11`）；`←` `→` 切换；带计数徽标。
5. `Picker` 配合对话框输入框：输入"/"后 `↑` `↓` 移动高亮，输入框始终有焦点，读屏读出当前项；`Enter` 与 `Tab` 都能选；列表滚动时不因指针下的行改变高亮。
6. 500 项的 `Picker`、`Select` 打开流畅（≤ 50ms），滚动到底所有项都能选到。

### 实施卡
- 要建 / 要改的文件：`web/tsconfig.json`、`web/src/components/ui/index.ts`、`web/src/components/ui/types.ts`、`web/src/components/ui/button/Button.tsx`、`web/src/components/ui/button/Button.test.tsx`、`web/src/components/ui/button/IconButton.tsx`、`web/src/components/ui/button/IconButton.test.tsx`、`web/src/components/ui/icon/Icon.test.tsx`、`web/src/components/ui/icon/iconSvg.test.ts`、`web/src/components/ui/glide/GlideGroup.test.tsx`、`web/src/components/ui/input/TextInput.test.tsx`、`web/src/components/ui/input/NumberStepper.test.tsx`、`web/src/components/ui/overlay/Overlay.tsx`、`web/src/components/ui/overlay/Popover.tsx`、`web/src/components/ui/overlay/Dialog.tsx`、`web/src/components/ui/overlay/Tooltip.tsx`、`web/src/components/ui/overlay/Tooltip.test.tsx`、`web/src/components/ui/overlay/UiEnv.test.tsx`、`web/src/components/ui/overlay/position.ts`、`web/src/components/ui/feedback/Toast.test.tsx`、`web/src/components/ui/feedback/ProgressBar.test.tsx`、`web/src/components/ui/feedback/EmptyState.test.tsx`、`web/src/components/ui/feedback/ErrorBoundary.test.tsx`、`web/src/components/ui/select/Select.tsx`、`web/src/components/ui/select/Select.css`、`web/src/components/ui/select/Select.test.tsx`、`web/src/components/ui/select/Segmented.tsx`、`web/src/components/ui/select/Segmented.css`、`web/src/components/ui/select/Segmented.test.tsx`、`web/src/components/ui/select/Switch.tsx`、`web/src/components/ui/select/Switch.css`、`web/src/components/ui/select/Switch.test.tsx`、`web/src/components/ui/select/Tabs.tsx`、`web/src/components/ui/select/Tabs.css`、`web/src/components/ui/select/Tabs.test.tsx`、`web/src/components/ui/select/Picker.tsx`、`web/src/components/ui/select/Picker.css`、`web/src/components/ui/select/Picker.test.tsx`、`web/src/components/ui/select/listNav.ts`、`web/src/components/ui/select/listNav.test.ts`
- 说明：按 K238/K304 片内联合编译规则，本片最后一个叶子 `W.08.03` 一并纳入 `web/tsconfig.json`（添加 `vite/client` 类型以支持 CSS 副作用导入与 `import.meta.env`）及片内前序叶子的联调类型修复。
- 不许碰的文件：`web/src/styles/`、`web/src/state/`、`web/src/ops/`、`web/src/shell/`、`web/src/panels/`、`web/src/pages/`、`web/src/canvas/`、`web/src/lib/protocol/`
- 函数签名：见 §4。
- 测试用例：
  - `W0803-T1 props 对照`：五个组件含 `W.07` §4.3 对应行的全部 props（`expectTypeOf`），补充 props 与 `W.08` §4.5 一致
  - `W0803-T2 listNav`：`step` 跳过禁用、`wrap=false` 到底停住、`wrap=true` 回到第一项；`typeahead('j')` 从当前项之后找"J…"；`windowOf`（1000 行 × 28、视口 320、`scrollTop=2800`、buffer 10）→ `start=90`、`end=122`；`matchSpan('Large-Model', 'lar')=[0,3]`、全角"ｌａｒ"同样命中
  - `W0803-T3 Select 键盘`：触发器 `↓` 打开 → `fakeEnv` 压栈 1 项；`↓` `↓` `Enter` → `onChange` 第 3 个可用项、关闭、出栈、焦点回触发器；`Esc` → 不调 `onChange`；`Tab` → 选中高亮项
  - `W0803-T4 Select 过滤`：9 个选项 → 有过滤框且是 `document.activeElement`；`filterable=false` → 没有；无结果 → `ui.noMatch` 文本；同值再选 → 不调 `onChange`
  - `W0803-T5 Select 禁用项`：点击禁用项 → 不选、不关；高亮时 `Tooltip` 文字为 `disabledReason`
  - `W0803-T6 Segmented`：`→` → `onChange(下一项)`、焦点移到该段、`stopPropagation` 被调用；只有一段 `tabIndex=0`；`--_i` 等于选中下标；`fakeEnv.reducedMotion=true` 时根元素没有过渡类
  - `W0803-T7 Switch`：点击 → `onChange(true)`；`role="switch"`、`aria-checked`；`labelPosition='none'` → 标签不可见但 `aria-label` 存在
  - `W0803-T8 Tabs`：`underline` 当前项有 `is-current` 且无背景色类；`←` 从第一项到最后一项（循环）；`panelIdOf` → `aria-controls`；`badge=3` 渲染 `Badge`
  - `W0803-T9 Picker 键盘`：`key(ArrowDown)` 返回 true 并 `onActiveChange`；`key(Enter)` → `onPick(id,'enter')`；`key({key:'a'})` 返回 false；`isComposing` 的 Enter 返回 false；`activeId=null` 时 Enter 返回 false
  - `W0803-T10 Picker 指针`：模拟滚动后的 `pointerover`（坐标不变）→ 不调 `onActiveChange`；坐标变化的 `pointermove` → 调用；`pointerdown` 被 `preventDefault`
  - `W0803-T11 Picker 可访问性`：`role="listbox"`、行 `id = pickerOptionId(listId, id)`、`aria-selected`；空 → `emptyText` 行且没有 `role="option"`
  - `W0803-T12 窗口化`：600 项 → 渲染的行数 ≤ 视口行数 + 20；199 项 → 全部渲染
  - `W0803-T13 加粗`：`query='age'`、`label='Agent'` → `<b>Age</b>nt`，没有 `innerHTML` 写入
- 允许使用的依赖：`react`、`react-dom`；测试用 `vitest`、`jsdom`（`@floating-ui/dom` 经 `Popover` 间接使用，测试里 `vi.mock`）。
- 禁止事项：`G.02.05` 全部；另：不在本目录直接 import `@floating-ui/dom`（只经 `Popover`）；不给控件加边框；分段 / 开关不对 `left` / `width` 做过渡；不隐藏不可用的选项（`U.13.05-R2`）。
- 完成标志：`G.14` 全部条件；§10 六条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 9 棒；`P.09` K123、K125–K127、K130 |
| 2026-11-23 | `SelectOption.desc` 的示例改为"12.8 万" | 第 10 棒；`P.09` K163 |
