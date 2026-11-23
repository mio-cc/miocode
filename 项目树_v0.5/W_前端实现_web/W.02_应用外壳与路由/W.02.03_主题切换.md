# W.02.03 主题切换

| 项 | 内容 |
|---|---|
| 编号 | W.02.03 |
| 类型 | 实施 |
| 上级 | W.02 应用外壳与路由 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设02；demo v0.5 `31_palette.js`、`09_palettes.css`；`U.03.04`、`U.03.05`、`U.07.04` |
| 最后修改 | 2026-11-23 |

## 1. 职责
主题 = 配色 × 明暗（`U.03.05`）：首屏不闪地应用、切换、跟随系统、保存到本地和服务端配置、多个标签页同步，以及"减少动效"开关；通知画布引擎重画用 canvas 绘制的缩略图。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 配色的具体色值、令牌完整性和对比度检查 | `U.03.05`、`design/themes/*.css`、`tools/gen tokens`、`tools/contrast` |
| 顶部条主题菜单、"设置 › 外观"页面的界面 | `W.07.01`、`W.09.02`（它们调用本文的接口） |
| 缩略图怎么重画 | `W.06.12`、`W.06.13`（订阅本文的变化通知） |
| 用户自定义主题文件 | v1 不做（`P.09` Q22） |

## 3. 继承的上级约束
`U.03.04`（全部，含 K70 的 R3）、`U.03.05`（全部，含 K69）、`U.07.04-R2`、`G.06.03-R5`、`G.06.02-R7`、`G.11` §3（`ui.theme.palette`、`ui.theme.mode`）、`S.02-R8`（CSP）。

## 4. 接口
### 4.1 首屏脚本
```html
<!-- web/index.html 的 <head>，放在所有样式表之前，同步加载（不加 async / defer） -->
<script src="/boot.js"></script>
```
```js
// web/public/boot.js —— 纯 JS，不经过打包，体积 ≤ 1KB；不能依赖任何模块
// 读 localStorage：hx:theme-palette（缺省 'paper'）、hx:theme-mode（缺省 'light'）、hx:motion（缺省 'auto'）
// 设 <html data-palette data-theme data-motion>；任何异常都吞掉并使用缺省值
```
### 4.2 主题控制器（不依赖 React，画布引擎也能用）
```ts
// web/src/shell/theme/themeController.ts
export type PaletteKey = (typeof THEMES)[number]['key'];       // 来自生成物 styles/themes.ts（K69）
export type ThemeMode = 'light' | 'dark' | 'system';
export type MotionPref = 'auto' | 'reduce';                     // auto = 跟随系统 prefers-reduced-motion
export type ThemeState = {
  palette: PaletteKey; mode: ThemeMode; resolved: 'light' | 'dark';
  motion: MotionPref; reducedMotion: boolean;                   // reducedMotion = 最终是否减少动效
};
export const themeController: {
  get(): ThemeState;
  setPalette(k: PaletteKey): void;
  setMode(m: ThemeMode): void;
  setMotion(m: MotionPref): void;
  syncFromServer(settings: Settings): void;                     // 启动拿到 /settings 后调用一次（§6.3）
  subscribe(fn: (s: ThemeState, changed: Array<'palette' | 'theme' | 'motion'>) => void): () => void;
};
// web/src/shell/theme/useTheme.ts
export function useTheme<T>(selector: (s: ThemeState) => T): T;  // React 侧精确订阅（G.06.02-R3）
```
### 4.3 生成物（只读）
`web/src/styles/themes.css`：四套配色 × 浅色 / 深色的令牌值；`web/src/styles/themes.ts`：
```ts
/* 由 tools/gen 生成，请勿手改 */
export const THEMES = [
  { key: 'paper', name: '宣纸', ref: 'Claude', desc: '…', preview: { light: [...], dark: [...] } },
  …
] as const;
export const DEFAULT_PALETTE = 'paper';
```
主题菜单和设置页只读 `THEMES`，不在组件里写配色名或色值（`U.03.05` §4）。

### 4.4 依赖
`W.04.01` `RestClient`（`PATCH /settings`）；生成类型 `Settings`。

## 5. 数据结构
`ThemeState` 见 §4.2。localStorage 键：`hx:theme-palette`、`hx:theme-mode`、`hx:motion`（`G.06.02-R7`、`U.03.04-R2`）。服务端配置：`ui.theme.palette`、`ui.theme.mode`（`G.11` §3）；减少动效只存本地（它和这台电脑的系统设置一起生效）。

## 6. 行为
### 6.1 属性怎么设（`U.03.05-R7`）
| 状态 | `<html>` 属性 |
|---|---|
| 配色 | `data-palette="paper|graphite|whale|amber"`。`amber` 也显式写出（`:root` 缺省值同为琥珀，写出来便于检查和截图） |
| 明暗 | `data-theme="light|dark"`；`mode='system'` 时按 `matchMedia('(prefers-color-scheme: dark)')` 解析，并监听它的 `change` |
| 动效 | `data-motion="reduce"` 或不设；`motion='auto'` 时按 `prefers-reduced-motion: reduce` 解析并监听（`U.07.04-R2`） |

### 6.2 切换
1. 计算新状态 → 设 `<html data-theme-switching>` → 改上面的属性 → 两个 `requestAnimationFrame` 之后去掉 `data-theme-switching`。
2. `base.css` 里 `html[data-theme-switching] { --hx-t-1: 0s; --hx-t-2: 0s; --hx-t-3: 0s; --hx-t-4: 0s; }`：因为所有过渡时长都只能用这几个令牌（`G.06.03-R1`），这样切换主题时所有颜色过渡同时失效，界面不会分批渐变闪烁（`U.03.04-R7`、`U.03.05-R9`）。不用 `!important`（`G.04.06-R3`）。
3. 写 localStorage。
4. 配色或明暗变化：300ms 内合并后 `PATCH /settings {"ui.theme.palette": …, "ui.theme.mode": …}`；失败时不回滚界面（本地已经生效），下一次切换时一起重试，并在"设置 › 外观"显示"没有保存到配置文件"。
5. 通知订阅者：`changed` 里带 `palette` 或 `theme` 时，画布引擎重新从 CSS 变量读取颜色并重画缩略图、小地图、预览浮层（`U.03.04-R6`）。

### 6.3 和服务端配置对齐
启动时 `boot.js` 先用本地值渲染（快），`GET /settings` 返回后调用 `syncFromServer`：服务端值和本地值不同 → **以服务端为准**（可能在别的浏览器、或用 `anydoorctl` 改过），按 §6.2 切换并写回 localStorage。

### 6.4 多个标签页
监听 `storage` 事件：另一个标签页改了这三个键 → 本页按 §6.2 应用，但不再 `PATCH`（发起改动的那个页面已经保存）。

## 7. 不变量
- 首屏第一帧的颜色就是最终主题（不闪一下浅色）。
- 组件里没有任何 `[data-theme="dark"]` / `[data-palette]` 选择器，`U.03.04` §2 登记表里的除外（`G.06.03-R5`）。
- 主题切换不改变任何字号、间距、圆角、动效时长以外的令牌（`U.03.05-R6`）；`data-theme-switching` 期间时长为 0 是唯一例外。
- `boot.js` 出错不影响页面加载。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| localStorage 不可用或值非法 | 用缺省值（宣纸 · 浅色 · 跟随系统动效），不报错 |
| 服务端返回的配色键不在 `THEMES` 里 | 用缺省值，记 `console.warn` 一次 |
| `PATCH /settings` 失败 | §6.2 第 4 步 |

## 9. 性能与资源
切换主题到界面完成重绘 ≤ 100ms（200 节点画布，`U.17` §1）；`boot.js` ≤ 1KB、执行 ≤ 2ms。

## 10. 验收标准
1. 4 套配色 × 浅色、深色共 8 种组合截图，与 `U.03.05` §2 关键色值一致（`U.03.05` §6）。
2. 深色 · 墨鲸下刷新页面：录屏第一帧就是深色（不闪浅色）。
3. 选"跟随系统"后切换系统明暗，界面同步切换（`U.03.05` §6 验收 4）。
4. 切换主题后小地图、预览浮层、父图位置卡的颜色同步变化（`U.03.04` §3 验收 2）。
5. 在 A 标签页切换，B 标签页同步；只有 A 发出 `PATCH`。
6. 用 `anydoorctl` 或另一个浏览器改了配置后刷新，以服务端为准。
7. 打开"减少动效"后，`<html data-motion="reduce">`，`U.07.04` §2 的替代全部生效。
8. 页面 CSP 不放宽，控制台没有"违反 CSP"报错。

### 实施卡
- 要建 / 要改的文件：`web/public/boot.js`、`web/index.html`（只加 §4.1 那一行）、`web/src/shell/theme/themeController.ts`、`web/src/shell/theme/useTheme.ts`、`web/src/shell/theme/themeController.test.ts`、`web/src/styles/base.css`（只加 §6.2 第 2 步那条规则）、`web/tests/e2e/theme.spec.ts`、`web/tests/visual/themes.spec.ts`。
- 不许碰的文件：`web/src/styles/themes.css`、`web/src/styles/themes.ts`、`web/src/styles/tokens.css`（生成物）、`design/`、`cmd/anydoor/`（CSP 在 `B.03.05` 里，不改）。
- 函数签名：见 §4.2。
- 测试用例：
  - `W0203-T1 解析`：mode=system × 系统明 / 暗；motion=auto × 系统减少动效开 / 关
  - `W0203-T2 非法本地值`：`hx:theme-palette='xyz'` → 宣纸
  - `W0203-T3 切换无过渡`：切换期间 `--hx-t-2` 计算值为 0s，两帧后恢复
  - `W0203-T4 服务端为准`：本地 paper、服务端 whale → 结果 whale，localStorage 被改写
  - `W0203-T5 PATCH 合并`：300ms 内连续切 3 次只发 1 次
  - `W0203-T6 storage 同步不重复保存`：§10 验收 5
  - `W0203-T7 首屏不闪`：§10 验收 2（Playwright 录屏取第一帧像素）
  - `W0203-T8 视觉`：§10 验收 1
- 允许使用的依赖：`react`；测试用 `vitest`、`jsdom`、`@playwright/test`。
- 禁止事项：`G.02.05` 全部；另：不用内联 `<script>`、不放宽 CSP；不在组件里写主题分支；不在组件里写死配色列表。
- 完成标志：`G.14` 全部条件；§10 八条验收通过。
