# U.08 图标

| 项 | 内容 |
|---|---|
| 编号 | U.08 |
| 类型 | 规范 |
| 上级 | U UI/UX 规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设06 |
| 最后修改 | 2026-11-23 |

## 1. 规则
| 编号 | 规则 |
|---|---|
| U.08-R1 | 图标统一 16×16 视框，1.5px 线宽，圆头圆角连接，单色 `currentColor`，无填充（个别实心状态点除外） |
| U.08-R2 | 图标全部自绘，放在 `design/icons/*.svg`（原子节点放 `design/icons/node/<英文别名>.svg`，别名见 `C.14-R7`），由 `go run ./tools/gen icons` 检查 R1、R4 后打包成图标表 `web/src/styles/icons.ts`（`G.16`，`P.09` K122）；组件按图形数据创建元素，不插入字符串 HTML；不引入第三方图标库，不用 emoji（`U.01` §3） |
| U.08-R3 | 13 个原子节点每种一个图标；**图标只用图形区分类别，颜色统一 `--hx-text-2`**，不随类别变色 |
| U.08-R4 | 扩展节点缺省用"扩展"图标；扩展包可以自带 SVG 图标，但必须通过同样的规则检查（单色、16 视框、无脚本） |
| U.08-R5 | 图标按钮必须有文字提示（提示框）和 `aria-label`；只有图标没有文字的按钮不能用于危险操作（删除、急停另配文字或确认）。例外：顶部条急停按钮在没有运行时按 `U.23-R10` 只显示灰色图标（急停只会停止、不会造成不可恢复的后果；有运行时显示红底"急停"文字，`P.09` K118） |
| U.08-R6 | 新增图标先在本文图标表登记名称和用途 |

## 2. 图标表
| 分组 | 图标名 |
|---|---|
| 原子节点 | 资源、Agent、上下文装配、工具、扇出、汇合、聚合、分支、循环、账本、人工、子图端口、子图引用、扩展 |
| 界面 | chat、graph、search、history、moon、sun、play、stop、pause、branch、expand、shrink、collapse、plus、minus、x、check、chevl、chevr、chevd、lib、fit、pointer、hand、group、layout、undo、redo、trash、copy、enter、lock、port、model、cmd、gauge、bolt、panelL、panelR、gear、arrowUp（新增：返回上一层）、tree（新增：结构树）、peek（新增：预览）、bell（新增：通知中心）、more（新增："⋯"更多操作）、star（新增：收藏）、pin（新增：置顶）、user（新增：账户）、pkg（新增：包）、link（新增：连接）、grip（新增：抓手）、info（新增：一般提示） |
| 状态 | queued、done、failed、waiting、skipped、cached（running 用旋转弧，不是静态图标） |

来源：demo `20_icons.js`，迁移到 `design/icons/`。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | R5 加急停按钮平时状态的例外 | 第 8 棒写 `W.07.01`；`P.09` K118 |
| 2026-11-23 | R2 写明源文件位置与生成物；§2 新增 bell、more、star、pin、user、pkg、link、grip、info | 第 9 棒写 `W.08`；`P.09` K122 |
