# W.02.04 快捷键注册中心

| 项 | 内容 |
|---|---|
| 编号 | W.02.04 |
| 类型 | 实施 |
| 上级 | W.02 应用外壳与路由 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 设13；demo v0.5 `26_keys.js`；`U.13.04`（含 K72 的 R5、R6）、`U.16` §3 |
| 最后修改 | 2026-11-27 |

## 1. 职责
全前端唯一的键盘快捷键入口：从数据表加载全部快捷键，按"当前在哪一层界面"分发按键，检查冲突，提供给提示框、速查面板、设置页显示用的按键文字。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 每个快捷键具体做什么 | 各功能模块注册处理函数：画布 `W.06.09`、菜单与命令面板 `W.07.11`、对话框 `W.07.07`、外壳 `W.02.02` |
| 速查面板（`?`）、"设置 › 快捷键"页的界面 | `W.07.11`、`W.09.02`（读本文的 `list()`） |
| 用户自定义快捷键 | v1 不做：设置页只读展示 |
| 文本框里的编辑按键（复制、撤销文字） | 浏览器原生行为，不拦截 |

## 3. 继承的上级约束
`U.13.04`（全部，含 R1–R6）、`U.13-R2`、`U.16-R3`、`U.16` §3、`U.08-R5`（图标按钮提示带快捷键）、`U.09.06-R3`（发送键可设为 Ctrl+Enter）、`C.14` §2（`schema/builtin/*.yaml` 生成到 `generated/tables.ts`）、`G.16`（K69）。

## 4. 接口
### 4.1 数据表 `schema/builtin/shortcuts.yaml`
这份表只被前端使用，格式在这里定义（`P.09` K72）。内容必须与 `U.13.04` 一致：改快捷键先改 `U.13.04`，再改这张表。
```yaml
# 每一项
- id: palette.open            # 唯一；"区域.动作"
  keys: ["Mod+K"]             # 一个或多个组合；见 §5.1 写法
  layer: global               # 所在层：global | canvas | nest | composer（§6.1）
  in_input: true              # 焦点在输入框、文本域、可编辑元素里时是否仍然生效（U.13.04-R1）
  hold: false                 # true：同时分发按下和松开（按住 Space 平移）
  label: shortcut.palette.open    # 文案键（W.10）
  group: 全局                 # 速查面板分组：全局 / 画布 / 嵌套导航 / 对话框
```
初始内容（与 `U.13.04` §1–§4、`U.16` §3 逐行对应）：
| id | keys | layer | in_input |
|---|---|---|---|
| `palette.open` | `Mod+K` | global | ✓ |
| `center.open` | `Mod+,` | global | ✓ |
| `run.start` | `Mod+Enter` | global | — |
| `estop.trigger` | `Mod+.` | global | ✓ |
| `ls.toggle` / `rs.toggle` / `rs.insp` | `[` / `]` / `I` | global | — |
| `focus.toggle` | `F` | global | — |
| `lib.search` | `/` | global | — |
| `help.keys` | `Shift+/`（即 `?`） | global | — |
| `session.prev` / `session.next` / `session.new` | `Alt+[` / `Alt+]` / `Alt+N` | global | — |
| `tool.select` / `tool.pan` | `V` / `H` | canvas | — |
| `tool.pan.hold` | `Space`（hold） | canvas | — |
| `node.quickAdd` | `A` | canvas | — |
| `sel.delete` | `Delete`、`Backspace` | canvas | — |
| `sel.all` / `sel.duplicate` / `clip.copy` / `clip.paste` | `Mod+A` / `Mod+D` / `Mod+C` / `Mod+V` | canvas | — |
| `group` / `ungroup` | `Mod+G` / `Mod+Shift+G` | canvas | — |
| `undo` / `redo` | `Mod+Z` / `Mod+Shift+Z`、`Mod+Y` | canvas | — |
| `view.fit` / `view.focusSel` / `layout.tidy` | `1` / `2` / `L` | canvas | — |
| `node.rename` | `F2` | canvas | — |
| `sel.move` / `sel.moveFar` | 方向键 / `Shift+`方向键 | canvas | — |
| `focus.nextNode` / `focus.prevNode` | `Tab` / `Shift+Tab`（画布有焦点时） | canvas | — |
| `link.keyboard` | `C`（节点有焦点时，`U.16` §3） | canvas | — |
| `menu.context` | `Shift+F10`、`ContextMenu` | canvas | — |
| `nest.peek` / `nest.enter` / `nest.up` | `P` / `Enter` / `Alt+ArrowUp` | nest | — |
| `canvas.escape` | `Escape`（取消选中；没有选中时返回上一层） | nest | — |
| `composer.send` | `Enter`；设置为 Ctrl+Enter 时 `Mod+Enter` | composer | ✓ |
| `composer.newline` | `Shift+Enter` | composer | ✓ |
| `composer.editLast` | `ArrowUp`（输入框为空时） | composer | ✓ |
| `composer.blur` | `Escape` | composer | ✓ |

### 4.2 运行时接口
```ts
// web/src/shell/keys/registry.ts
import { SHORTCUTS } from '@/lib/protocol';   // 经协议出口导入生成物（P.09 K303）
export type ShortcutId = (typeof SHORTCUTS)[number]['id'];
export type KeyHandler = (e: KeyboardEvent, phase: 'down' | 'up') => boolean;  // 返回 true = 已处理
export type Overlay = 'modal' | 'popover' | 'peek';           // §6.1 最上面三层

export const keys: {
  on(id: ShortcutId, handler: KeyHandler, opts?: { when?: () => boolean }): () => void;  // 返回注销函数
  pushOverlay(kind: Overlay, handler: (e: KeyboardEvent) => boolean): () => void;      // 弹层打开时压栈
  label(id: ShortcutId): string;          // 显示用："Ctrl+K"（Windows / Linux）或 "⌘K"（macOS），U.13.04-R5
  list(): Array<{ id: ShortcutId; keys: string[]; group: string; label: string }>;   // 速查面板、设置页
  attach(target: Window): () => void;     // 外壳启动时调用一次
};
```
画布引擎不 import 本模块（`W.01-R6`）：`canvas/core` 自己定义它需要的最小接口（`W.06.09`），由 `Canvas.tsx` 把 `keys.on` 适配进去。

### 4.3 依赖
生成物 `SHORTCUTS`（`tools/gen tables`）；`W.10`（`label` 的文案）；`navigator.platform` / `navigator.userAgentData` 判断 macOS。

## 5. 数据结构
### 5.1 按键写法
- 修饰键按固定顺序：`Mod`、`Ctrl`、`Alt`、`Shift`，用 `+` 连接。`Mod` = macOS 上的 ⌘、其他平台的 Ctrl（`U.13.04-R5`）。表里一般只用 `Mod`；`Ctrl` 只在 macOS 上也必须是 Control 的场合使用（目前没有）。
- 主键按**物理键位**写，匹配 `KeyboardEvent.code`：字母 `A`–`Z` ↔ `KeyA`…；数字 `1` ↔ `Digit1`；`[` `]` `,` `.` `/` ↔ `BracketLeft` `BracketRight` `Comma` `Period` `Slash`；其余直接用 `code` 名（`Enter`、`Escape`、`Delete`、`Backspace`、`F2`、`ArrowUp`、`Space`、`Tab`、`ContextMenu`）。用 `code` 不用 `key`，是因为按住 Alt 时 macOS 的 `key` 会变成特殊字符（`Alt+N` 得到 `˜`）。
- v1 只保证美式键盘布局下的位置；其他布局按物理位置生效。

## 6. 行为
### 6.1 分发顺序（一次按键从上往下找，找到处理者就停）
| 层 | 什么时候存在 | 说明 |
|---|---|---|
| ① modal | 命令面板、确认框、首次引导打开 | 栈顶的处理函数先收到；没处理的键**不再往下传**（模态里只允许 `estop.trigger` 继续往下） |
| ② popover | 菜单、右键菜单、下拉、快速添加打开 | 同上，但没处理的键继续往下 |
| ③ peek | 子图预览浮层打开 | `Escape` 关闭；`Enter` 进入预览中的那一层（`U.13.04` §3）。由画布引擎经 `CanvasKeys.overlay('peek', …)` 压栈（`W.06.01` 的 `adaptKeys` 转成 `pushOverlay`，`W.06.13`，`P.09` K104） |
| ④ composer | 焦点在对话框里 | `composer.*` |
| ⑤ 其他输入框 | 焦点在任何可编辑元素里 | 只有 `in_input: true` 的快捷键生效（`U.13.04-R1`） |
| ⑥ nest / canvas | 焦点不在输入框里 | 画布、嵌套导航 |
| ⑦ global | 总是 | 全局快捷键 |

`Escape` 的效果因此是"关闭弹层 / 预览 → 取消选中 → 返回上一层"依次发生（`U.13.04` §3）：前两步由 ②③ 层处理，后两步由 `canvas.escape` 处理（有选中先取消选中，没有选中才返回）。

### 6.2 每次按键
1. `e.isComposing` 为真或 `e.keyCode === 229`（输入法正在组字）→ 直接忽略（`U.13.04-R6`）。
2. 把事件规范成组合字符串（§5.1），按 §6.1 的顺序找第一个 `when()` 为真、并且处理函数返回 `true` 的条目。
3. 找到 → `preventDefault()`、`stopPropagation()`。找不到 → 不拦截，交给浏览器。
4. `hold: true` 的条目同时处理 `keyup`；窗口失去焦点（`blur`）时给所有按住中的 hold 条目补发一次 `up`，避免按住 Space 后切走窗口导致一直处于平移状态。
5. `e.repeat`（按住自动重复）只分发给方向键、`Mod+Z`、`Mod+Shift+Z`，其他忽略。

### 6.3 冲突检查（构建时）
`registry.test.ts` 读取 `SHORTCUTS`，以下任何一条不满足就失败：
| 检查 | 规则 |
|---|---|
| 同层重复 | 同一 `layer` 里同一个组合只能属于一个 `id`（`when` 不同也不行；需要"同键不同条件"时合并成一个处理函数） |
| 保留键 | 不能占用 `Mod+W`、`Mod+T`、`Mod+N`、`Mod+L`、`Mod+R`、`Mod+Shift+[`、`Mod+Shift+]`、`F5`、`F11`、`F12`（`U.13.04-R2`） |
| 单键与输入框 | 没有修饰键的单个字母、数字、符号键不能 `in_input: true`（`U.13.04-R1`）；`composer` 层除外 |
| 文案 | 每个 `label` 在 `W.10` 文案表里存在 |
| 与表一致 | `id` 集合与 §4.1 初始内容一致（新增、删除快捷键时同步改本文和 `U.13.04`） |

运行时 `keys.on` 注册一个不存在的 `id` → 开发模式抛错，生产模式 `console.error` 一次并忽略。

### 6.4 显示
- 图标按钮的提示框、菜单项右侧、命令面板结果都通过 `label(id)` 显示按键（`U.08-R5`、`U.13.05-R1`），不在组件里手写按键文字。
- macOS 显示 `⌘ ⌥ ⇧`，其他平台显示 `Ctrl Alt Shift`，用 `+` 连接。

## 7. 不变量
- 整个前端只有一个 `keydown` / `keyup` 监听器（挂在 `window` 上，由 `attach` 安装）；其他代码不直接监听键盘事件，文本框内部的原生编辑行为除外。ESLint 禁止在 `shell/keys/` 以外写 `addEventListener('keydown'`。
- `estop.trigger` 在任何界面、任何焦点下都生效（`U.13.04` §1、`U.14.04-R1`）。
- 不存在任何快捷键能解除急停（`W-R6`、INV-10）。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| 处理函数抛异常 | 捕获，`console.error`，本次按键视为已处理（避免同一键继续落到下一层触发别的功能） |
| 注册未知 `id` | §6.3 末尾 |

## 9. 性能与资源
每次按键的查找与分发 ≤ 0.2ms；按 `layer + 组合字符串` 预建查找表，不遍历全表。

## 10. 验收标准
1. `U.13.04` 表里的每个快捷键在对应位置可用（Playwright 逐条按键）。
2. 光标在对话框里按 `A`、`F`、`/`、`1`：只输入字符；按 `Mod+K`、`Mod+.`、`Mod+,`：分别打开命令面板、触发急停、打开中心窗口。
3. 用中文输入法输入拼音时按 `Enter` 选词：不发送消息；组字结束后按 `Enter` 才发送。
4. 打开右键菜单后按 `Escape`：只关菜单，不取消选中；再按一次取消选中；再按一次返回上一层。
5. 命令面板打开时按 `[`：左栏不变化。
6. 按住 Space 平移时切到别的窗口再切回：不处于平移状态。
7. macOS 上提示框显示 `⌘K`，Windows 上显示 `Ctrl+K`。
8. 往表里加一条 `Mod+W`：测试失败。

### 实施卡
- 要建 / 要改的文件：`web/src/shell/keys/registry.ts`、`web/src/shell/keys/normalize.ts`、`web/src/shell/keys/index.ts`、`web/src/shell/keys/registry.test.ts`、`web/src/shell/keys/normalize.test.ts`、`web/src/lib/i18n/zh.ts`、`web/eslint.config.js`
- 说明：`schema/builtin/shortcuts.yaml` 已由第 ⑨a 片 `C.14` 落地，本叶子只读 `@/lib/protocol` 的 `SHORTCUTS`；`web/src/lib/i18n/zh.ts` 只补 `shortcut.*` 44 条文案；`web/eslint.config.js` 只加 §7 禁止在 `shell/keys/` 以外监听全局键盘规则（`P.09` K305）。
- 不许碰的文件：`schema/`、`web/src/lib/protocol/generated/`、`tools/gen/`、`web/src/canvas/`
- 函数签名：见 §4.2。
- 测试用例：
  - `W0204-T1 规范化`：`Alt+N`（macOS `key='˜'`、`code='KeyN'`）→ `Alt+N`；Windows `Ctrl+K` 与 macOS `Meta+K` 都 → `Mod+K`
  - `W0204-T2 冲突检查`：§6.3 五项，各一个反例
  - `W0204-T3 输入框`：§10 验收 2
  - `W0204-T4 组字`：`isComposing=true` 的 Enter 不分发
  - `W0204-T5 分层`：§10 验收 4、5
  - `W0204-T6 hold 补发`：§10 验收 6
  - `W0204-T7 label`：§10 验收 7
  - `W0204-T8 处理函数异常`：抛错后不落到下一层
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `web/tests/e2e/shortcuts.spec.ts`：`W.12`（第 ⑫ 片 Playwright e2e，`P.09` K305）
- 允许使用的依赖：无运行时依赖（标准 DOM API）；测试用 `vitest`、`jsdom`。
- 禁止事项：`G.02.05` 全部；另：不在 `shell/keys/` 以外监听键盘；不占用 `U.13.04-R2` 的保留键；不提供任何解除急停的快捷键。
- 完成标志：`G.14` 全部条件；§10 验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §6.1 ③ peek 层写明由画布引擎经 `CanvasKeys.overlay` 压栈 | `P.09` K104（第 7 棒） |
| 2026-11-27 | 状态改为"冻结"：M1 第 ⑨c 片 `m1-web-shell` squash 合并进代码仓库 `main`，提交 `2c2d8465a059267659e776e8d7d04d2a56bfb277`（`G.02.06-R21`、`P.09` K305、K308、K309） | 两轮独立评审通过（`docs/relay/m1-web-shell.review.md`）；单二进制冒烟通过；Codex 合并推送；前端线余额用完，由主线（Quick）代写冻结 |
