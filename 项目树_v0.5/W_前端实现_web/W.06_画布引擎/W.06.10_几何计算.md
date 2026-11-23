# W.06.10 几何计算

| 项 | 内容 |
|---|---|
| 编号 | W.06.10 |
| 类型 | 实施 |
| 上级 | W.06 画布引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设07（端口位置、贝塞尔、命中测试）；demo `设计规范_v0.3/src/23_geom.js`（`L`、`nodeH`、`portPos`、`bez`、`bounds`、`nearestPort`）；demo v0.5 `37_nodes.js`（多行文本框行高 92）；`P.09` K102、K104 |
| 最后修改 | 2026-11-23 |

## 1. 职责
画布引擎里所有"不读 DOM 的几何"：布局常数、节点形状（宽高、端口列表、节点上显示哪几个参数）、节点 / 便签 / 端口的世界坐标、连线的贝塞尔路径、包围盒、矩形查询（空间索引）、最近端口、网格吸附。其他模块只通过 `ctx.geom`（`W.06` §4.4 的 `Geom`）拿这些值。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 把形状画成 DOM、CSS 里的尺寸 | `W.06.03`（CSS 只用 `--hx-node-*` 令牌，与本文常数相等） |
| 连线 `d` 写进 DOM | `W.06.04` |
| 端口能不能接、`$T` 推断 | `W.05`（本文只读 `OpsApi.portTypes`、不判断兼容） |
| 自动布局的分层与排序 | `W.06.11`（它用本文的 `shape`、`box`） |
| 后端给模型新加的节点定坐标 | `E.17.02`（按 `U.05-R6`，与本文共用 `schema/builtin/layout.yaml` 和测试向量） |
| 视口与缩放 | `W.06.02` |

## 3. 继承的上级约束
`W.06` §4.4（`L`、`NodeShape`、`PortSlot`、`WidgetSlot`、`PortCand`、`Geom`）、§5、§6.2、`W.06-R2`；`U.05-R3`–`R6`（`P.09` K102）；`U.10.02` §1；`U.10.03` §1–§2；`U.10.04` §1；`U.10.07`；`U.17-R2`；`C.02.04-R3`；`C.02.05`（`Pos` 为整数、`NodeUi.width`、`collapsed`、`Note.size`）；`C.03.01` §4、§6、`R5`；`C.03.05-R1`、`R2`、`R4`（`show_if`、`bind`、`dynamic_ports`）；`C.04.01-R4`；`C.04.04`；`C.14` §2；`G.16`；`P.09` K95、K99。

## 4. 接口
```ts
// web/src/canvas/core/geom/const.ts —— 布局常数（K102：数值来自生成物，本文件只做重命名）
import { LAYOUT } from '@/lib/protocol';            // schema/builtin/layout.yaml → generated/tables.ts
export const L: Readonly<{ nodeW: number; nodeWSm: number; head: number; pad: number; row: number; widget: number;
  widgetArea: number; groove: number; thumb: number; foot: number; grid: number; port: number; portHit: number; snapR: number; edgeHit: number;
  noteW: number; noteH: number }>;                   // W.06 §4.4 的形状；取值见 §5.1
export const COMPACT_TYPES: ReadonlySet<string>;    // LAYOUT.compact_types：紧凑宽度的节点类型（数据，不在代码里写类型名）
export const BEZIER: Readonly<{ ratio: 0.5; min: 48; max: 180; back: 120 }>;   // U.10.03 §2

// web/src/canvas/core/geom/shape.ts —— 纯函数
export type ShapeInput = { rec: NodeRec; def: NodeDef | null; model: GraphModel; types: ReadonlyMap<string, TypeRef>; foot: boolean };
export function computeShape(i: ShapeInput): NodeShape;                       // §6.1
export function nodeHeight(s: Omit<NodeShape, 'h' | 'sig'>): number;         // §6.2（与 Go 共用测试向量）
export function boundaryPorts(m: GraphModel, containerId: Ulid, defs: (type: string) => NodeDef | null): { inputs: PortSlot[]; outputs: PortSlot[] };   // C.02.04-R3
export function evalShowIf(expr: string, params: Record<string, unknown>): boolean;   // §6.1 第 4 步；不认识的表达式返回 true（C.03.05 §7）
export function promptVars(text: string, max: number): string[];             // C.03.05-R4：{{名字}}，去重、按首次出现排序
export function displayCategory(t: TypeRef, typeDefs: ReadonlyMap<string, TypeDef>): Category;   // C.04.01-R4：CATEGORY_MAP 的规则 + 业务类型的 category（缺省 gen）

// web/src/canvas/core/geom/ports.ts —— 纯函数
export function portPosOf(pos: Pt, shape: NodeShape, port: string, dir: 'in' | 'out'): Pt | null;

// web/src/canvas/core/geom/bezier.ts —— 纯函数
export function bezier(a: Pt, b: Pt): { d: string; mid: Pt };              // 两端切线水平
export function bezierBox(a: Pt, b: Pt): Rect;                              // 含控制点（W.06.05 edgeBox 用同一算法）

// web/src/canvas/core/geom/hit.ts
export function createGrid(cell: number): {                                 // 均匀网格空间索引
  rebuild(items: Iterable<{ id: Ulid; r: Rect }>): void;  update(id: Ulid, r: Rect | null): void;  query(r: Rect): Ulid[];
};
export function intersects(a: Rect, b: Rect): boolean;
export function nearest(c: readonly PortCand[], p: Pt, r: number): PortCand | null;
export const GRID_INDEX_MIN = 500;                  // 当前层节点 + 便签超过它才启用网格索引
export const GRID_CELL = 400;                       // 世界像素

// web/src/canvas/core/geom/index.ts
export function createGeom(ctx: EngineCtx): Geom & { dispose(): void };    // Geom 见 W.06 §4.4（含 K104 新增的 forModel）
```
`Geom`（`W.06` §4.4）：`shape`、`setFoot`、`pos`、`box`、`portPos`、`edgePath`、`bezier`、`bounds`、`query`、`nearestPort`、`snap`，以及 `forModel(m)`：返回一个只读的几何视图 `{ shape, pos, box, portPos }`，按另一份 `GraphModel` 计算（幽灵预览图 `ghostGraph`，`W.06.14`），不读 `ctx.live`、不带状态脚。

### 4.1 依赖
`W.06` §4.3 的 `EngineCtx`（`model()`、`scope()`、`live`、`deps.catalog`、`doc().ops`）；`W.03.01` 的 `GraphModel`、`NodeRec`、`NoteRec`、`nodesIn`、`notesIn`；`W.05` 的 `OpsApi.portTypes`（K99）；`@/lib/protocol` 的 `NodeDef`、`ParamDef`、`ParamUI`、`PortRef`、`TypeRef`、`Category`、`LAYOUT`、`CATEGORY_MAP`（`schema/builtin/category_map.yaml` 的生成物，`C.04.01`）；`W.03` §4.5 目录 store 的 `defs.types`（业务类型的显示类别）。

## 5. 数据结构

### 5.1 布局常数（`schema/builtin/layout.yaml`，`P.09` K102）
前端（本文、`W.06.11`）和后端（`E.17.02` 给新节点定坐标）读同一份数据：`tools/gen tables` 生成 `gen/tables.go` 的 `Layout` 和 `generated/tables.ts` 的 `LAYOUT`（`C.14` §2、`G.16`）。`tools/gen tokens` 同时检查 `design/tokens.css` 里对应令牌的值与本表相等，不等就生成失败。
```yaml
# schema/builtin/layout.yaml
node_w: 236          # --hx-node-w
node_w_sm: 184       # --hx-node-w-sm
head: 38             # --hx-node-head
pad: 6               # 端口区上下内边距
row: 24              # --hx-node-row：端口行
widget: 28           # --hx-node-widget：控件行
widget_area: 92      # 多行文本 / 代码控件行（固定 3 行，U.10.07-R1；demo v0.5 37_nodes.js）
groove: 13           # 控件凹槽：上下内边距 12 + 分隔线 1
thumb: 72            # 子图缩略图区：缩略图 64 + 上下间距 8（U.10.04 §1）
foot: 26             # 状态脚
grid: 20             # --hx-grid
port: 10             # --hx-port
port_hit: 18         # 端口热区（U.05-R5）
snap_r: 18           # 拖线吸附半径，屏幕像素（U.10.03 §3）
edge_hit: 14         # 连线热区宽（U.10.03 §2）
note_w: 220          # 便签缺省宽（Note.size 缺省时）
note_h: 120          # 便签缺省高
max_widgets: 4       # 节点上最多几个参数（C.03.05-R1）
compact_types: [资源, 分支, 人工, 子图端口, 账本, 汇合]   # 紧凑宽度（U.05 §2）；扩展节点为标准宽度
tidy: { gap_x: 72, gap_y: 36, band: 96, wrap_over: 12, wrap_cols: 6 }   # W.06.11
place: { gap_x: 72, gap_y: 36, scan_max: 50 }                          # U.05-R6（后端为新节点定坐标）
```
`L` 是它的驼峰别名：`nodeW`、`nodeWSm`、`head`、`pad`、`row`、`widget`、`widgetArea`、`groove`、`thumb`、`foot`、`grid`、`port`、`portHit`、`snapR`、`edgeHit`、`noteW`、`noteH`。

### 5.2 测试向量 `schema/examples/layout_vectors.json`
```json
[{ "name": "Agent 默认", "def": "Agent", "node": { "params": {} },
   "expect": { "w": 236, "h": 307, "in": ["context", "model", "prompt", "tools"], "out": ["result"], "widgets": ["rolecard", "instruction", "output_schema"] } }]
```
覆盖：13 个原子节点缺省、折叠、拖宽、提升参数、动态端口 0 / 3 / 9 个、`show_if` 为假、5 个常用参数（只显示 4 个）、容器节点（有缩略图）、多个入口的子图引用、未知类型。Go（`E.17.02` 的定坐标代码）和 TS（本文 `shape.test.ts`）跑同一组向量，结果必须相同（`U.05-R3`）。

### 5.3 模块内部
- `shapes: WeakMap<NodeRec, { key: string; shape: NodeShape }>`：`key` = 目录注册表哈希 + `portTypes` 引用编号 + 绑定来源签名 + 状态脚开关；`key` 不同就重算。`NodeRec` 是不可变对象（`W.03.01` §5），节点没改时引用不变，缓存命中。
- `feet: Set<Ulid>`：`setFoot` 记下的、当前有状态脚的节点。
- `inEdges: WeakMap<GraphModel, Map<string, Ulid>>`：键 `${节点}.${端口}` → 连到它的第一条连线的源节点（算 `boundFrom` 用），每个 `model` 对象算一次。
- `grid`：当前层节点 + 便签超过 `GRID_INDEX_MIN` 时启用；`model` 或当前层变化时下一次 `query` 前重建；`setFoot`、拖动结束后更新单个条目。

## 6. 行为

### 6.1 节点形状（`computeShape`）
1. **已知性**：`def = catalog` 里该类型的 NodeDef；没有 → `known=false`，宽 `L.nodeWSm`，只有头部，端口和控件为空（`W.06` §8）。
2. **宽度**：`rec.ui.width`（夹到 160–640，`C.02.05`）；否则 `COMPACT_TYPES` 含该类型 → `L.nodeWSm`，否则 `L.nodeW`。
3. **端口**（`index` 从 0 起，输入、输出各自编号）：
   | 来源 | 输入 | 输出 |
   |---|---|---|
   | NodeDef `ports` | 按声明顺序；`dynamic: true` 的端口按连线数展开为 `in[0]`、`in[1]`…，再多一个空位 | 按声明顺序 |
   | 被提升的参数（`rec.promoted`） | 接在声明端口之后，`promoted: true`，名称后显示 `⇢`（`U.10.02` §1），类型取参数类型 | — |
   | `dynamic_ports`（提示词节点，`C.03.05`） | `promptVars(params[from_param], max)` 的每个变量一个端口，`variable: true`，类型为 `dynamic_ports.type`；接在提升端口之后 | — |
   | 容器节点的子图（`boundaryPorts`，`C.02.04-R3`） | 子图里 NodeDef `category = 边界` 且 `params.role = entry` 的节点，按子图里的文档顺序；名称 `params.port_name`，缺省 `in`、第二个起 `in_2`… | `role = exit` 同理（`out`、`out_2`…），`summary`、`escalation` 各一个 |
   - 只有 `ref`、没有 `children` 的子图引用：端口签名取 `deps.catalog.getState().libSigs.get(ref + '@' + version)`（`in` → 输入、`out` → 输出，按数组顺序；`role` 为 `summary` / `escalation` 的放在输出最后，`W.03` §4.5、`W.09.02` §6.10，`P.09` K145）；还没有时调 `catalog.actions.ensureLibSig(ref, version)` 并暂时按连到它的连线推出端口名（输入 = 连线的 `to.port`，输出 = `from.port`），没有连线时只画头部；签名到达后 `libSigs` 变化 → 这些节点重算 `shape`（`sig` 变了就重建，`W.06` §6.3）。
   - 数据类型：`types.get(`${id}.${port}`)`（`OpsApi.portTypes(scope)` 的推断结果，K99），没有就用声明类型；显示类别 `cat` = `PortDef.category ?? displayCategory(type, defs.types)`（`C.04.01-R4`；`W.06.04` 的 `edgeCategory` 直接读 `PortSlot.cat`）。
   - `label`：`PortDef.label`，缺省为端口名；`required`、`multi` 取 `PortDef`（`C.04.04`）。
4. **节点上的参数**（`widgets`，`C.03.05`）：`ParamDef.ui.group = 常用` 的参数，去掉被提升的，按 `ui.order`、再按声明顺序排；`show_if` 为假的去掉（`evalShowIf`）；取前 `LAYOUT.max_widgets` 个（K95）。每项：`widget` = `resolveWidget(def, ui)`（`ui.widget` 为 `auto` 时查 `WIDGET_MAP`，K212）；`tall` = widget 为 `textarea` 或 `code`；`boundFrom` = `ui.bind` 端口上有连线时连线的源节点 ID（否则 null）；`locked` = `ParamDef.lock` 为 `def` / `kernel`。
5. **缩略图**：`rec.isContainer` 且有 `children` → `thumb=true`。
6. **折叠**：`rec.ui.collapsed` → `collapsed=true`；端口列表照常算（连线端点要用），但高度只有头部。
7. **`sig`**：`known`、`w`、`collapsed`、`thumb`、每个端口的 `dir·name·cat·variable·promoted`、每个控件的 `key·widget·tall·boundFrom≠null·locked` 拼成的字符串。状态脚不进 `sig`（只改高度，不重建内部）。

### 6.2 节点高度（`nodeHeight`，`U.05-R3`）
```
collapsed：h = head
否则：     h = head + pad × 2 + max(输入数, 输出数, 1) × row
             + (控件数 > 0 ? groove + Σ(tall ? widgetArea : widget) : 0)
             + (thumb ? thumb : 0)
             + (foot ? foot : 0)
```
例：Agent 缺省 4 个输入、3 个常用参数（角色卡、指令（area）、输出类型，`C.03.05-R5`）：38 + 6×2 + 4×24 + 13 + 28 + 92 + 28 = 307（§5.2 第一条）。

### 6.3 `evalShowIf`
只支持这几种写法（与 `C.03.05` 例子一致）：`key == 'v'`、`key != 'v'`、`key == 数字 / true / false`、`key`（为真）、`!key`，用 `&&`、`||` 连接（`&&` 优先，不支持括号）。`key` 取 `rec.params`，缺省取 `ParamDef.default`。不认识的表达式 → `true`（显示），并 `console.warn` 一次；服务端同时给出 V19 诊断（`C.03.05` §7）。

### 6.4 坐标
| 方法 | 结果 |
|---|---|
| `pos(id)` | `ctx.live.get(id)`（拖动、整理布局动画中）?? 节点 / 便签的 `pos` |
| `box(id)` | 节点：`{...pos, w, h}`；便签：`{...pos, w: size.w ?? L.noteW, h: size.h ?? L.noteH}` |
| `portPos(ref, dir)` | `portPosOf(pos, shape, ref.port, dir)`：输入 `x = pos.x`，输出 `x = pos.x + w`；`y = pos.y + head + pad + index × row + row / 2`。折叠时 `y = pos.y + head / 2`，所有端口落在左右各一个汇总点上。端口不存在 → `null` |
| `edgePath(id)` | 两端 `portPos` 都有 → `bezier(源输出, 目标输入)`；任一为 null → `null`（`W.06.04` §8 兜底） |
| `bounds(ids?)` | 不给 `ids`：当前层全部节点和便签的 `box` 并集；给了：只算这些节点。空 → `null` |
| `query(r)` | 当前层与 `r` 相交的节点和便签 ID（调用方按 `model.nodes` / `model.notes` 区分）；数量 ≤ `GRID_INDEX_MIN` 时线性扫描，否则走网格 |
| `nearestPort(c, p, r)` | `nearest`：平方距离最小且 `< r²` 的候选；同距离取先出现的 |
| `snap(v, on)` | `on` → `round(v / L.grid) × L.grid`；否则 `round(v)`（坐标总是整数，`C.02.05`） |
| `setFoot(id, on)` | 改 `feet`；高度变化，`box` 随之变化；端口位置不变（状态脚在端口之下，`W.06.04` §6.2） |
- 端口圆心与 DOM 上圆点重合的前提是 `W.06.03` 的 CSS 只用这几个令牌、且令牌值与 `layout.yaml` 相等（§5.1 的生成检查），所以本文从不读 DOM（`U.17-R2`）。
- 被提升端口、变量端口、动态端口的行高与普通端口相同。

### 6.5 贝塞尔（`U.10.03` §2）
`dx = b.x − a.x`；`off = dx < 0 ? 120 : clamp(|dx| × 0.5, 48, 180)`；控制点 `c1 = (a.x + off, a.y)`、`c2 = (b.x − off, b.y)`；`d = "M a C c1 c2 b"`（坐标保留 1 位小数）；`mid` 取 t = 0.5 处的点 `(a + 3c1 + 3c2 + b) / 8`。`bezierBox` 是四个点的包围盒（曲线总在控制点凸包内）。

### 6.6 `forModel(m)`（`P.09` K104）
与 `createGeom` 同一套算法，只是 `model` 换成 `m`、`types` 取 `OpsApi.portTypes` 对真实节点的结果（幽灵节点的端口用声明类型）、不读 `ctx.live`、`foot=false`。结果按 `m` 对象缓存在 `WeakMap` 里，`m` 换了就丢弃。

### 6.7 何时失效
- `catalog.defs.registryHash` 变化（`W.06` §6.3）：缓存键变化，下一次 `shape` 重算；`W.06.03` 据 `sig` 决定重建。
- `OpsApi.portTypes(scope)` 返回了新的 Map 引用：同上（K99：同一组推断返回同一个引用）。
- 连线变化导致 `boundFrom` 或动态端口数变化：`inEdges` 按新的 `model` 对象重算，绑定来源签名变化。

## 7. 不变量
- 本模块所有函数不读 DOM、不写 DOM、不访问 `window`（`ResizeObserver`、`getBoundingClientRect` 都不用）。
- 同一个 `NodeRec` 对象、同一份注册表、同一组推断结果、同一绑定状态 → `shape` 返回同一个对象引用。
- `portPos` 的 `x` 总在节点左右边线上；`y` 只取决于 `index`，与 LOD 级别、状态脚无关（`W.06.05` §7）。
- `snap` 的结果总是整数。
- 前端 `nodeHeight` 与后端对 `layout_vectors.json` 的结果逐项相等。

## 8. 错误处理
| 情况 | 处理 |
|---|---|
| NodeDef 不存在 | `known=false` 占位形状（§6.1 第 1 步） |
| `ui.width` 越界 | 夹到 160–640，不报错（服务端校验 V01 会给出诊断） |
| 常用参数超过 4 个 | 只取前 4 个（`C.03.05-R1`：校验里另有提示） |
| `show_if` 不认识 | 当作显示，`console.warn` 一次 |
| 连线引用的端口不在形状里 | `portPos` 返回 null，`edgePath` 返回 null |
| 动态端口超过 `max` | 只取前 `max` 个 |

## 9. 性能与资源
- `computeShape` 一个节点 ≤ 0.05ms；200 节点全部重算 ≤ 8ms；缓存命中 ≤ 0.002ms。
- `portPos` ≤ 0.002ms；拖 20 个节点时每帧 60 条连线的 `edgePath` ≤ 0.5ms。
- `query`：200 节点线性 ≤ 0.1ms；1000 节点网格 ≤ 0.3ms；网格重建（1000 项）≤ 2ms。
- 内存：每个节点的形状约 1KB；网格只在 > 500 时存在。

## 10. 验收标准
1. `layout_vectors.json` 全部通过（TS），且与 Go 实现的结果相同（`U.05-R3`）。
2. 13 种原子节点放在画布上，200% 截图：端口圆点中心与连线端点重合（误差 ≤ 1px，与 `W.06.03` §10 验收 2 联合）。
3. 改 `design/tokens.css` 的 `--hx-node-row` 为 26 而不改 `layout.yaml`：`go run ./tools/gen tokens` 失败并指出不一致。
4. 回连（目标在源左侧）的连线控制点偏移 120；正常连线偏移 = `clamp(|dx|/2, 48, 180)`。
5. 提示词里写 `{{a}} {{b}} {{a}}`：节点左侧 2 个变量端口（`C.03.05` §8 验收 2）；一个参数 `show_if: kind == '提示词'` 在 `kind` 改变后出现 / 消失。
6. 1000 节点图框选、视口裁剪：`query` 每次 ≤ 0.3ms。

### 实施卡
- 要建 / 要改的文件：`schema/builtin/layout.yaml`（§5.1，本叶子唯一允许新建的 `schema/` 文件）、`schema/examples/layout_vectors.json`（§5.2）、`web/src/canvas/core/geom/const.ts`、`shape.ts`、`ports.ts`、`bezier.ts`、`hit.ts`、`index.ts`，以及 `shape.test.ts`、`ports.test.ts`、`bezier.test.ts`、`hit.test.ts`、`index.test.ts`。
- 不许碰的文件：`web/src/lib/protocol/generated/`（运行 `make gen` 生成 `LAYOUT`；生成器还不认识 `layout.yaml` 时上报 `C.14`，不手写常数）、`tools/gen/`、`design/tokens.css`、`web/src/canvas/core/render/`、`interact/`、`layout/`、`web/src/state/`、`web/src/ops/`。
- 函数签名：见 §4。
- 测试用例（纯函数为主；`createGeom` 用假 `ctx`）：
  - `W0610-T1 常数一致`：`L` 的每个字段等于 `LAYOUT` 对应字段；`COMPACT_TYPES` 含 6 个类型
  - `W0610-T2 测试向量`：逐条跑 `layout_vectors.json`，`w`、`h`、端口名、控件键全部相等
  - `W0610-T3 宽度`：`ui.width=700` → 640；资源节点 → 184；扩展节点 → 236
  - `W0610-T4 端口顺序`：声明端口 → 提升端口（带 `promoted`）→ 变量端口（带 `variable`）；汇合的动态端口有 2 条连线时 3 个输入
  - `W0610-T5 容器端口`：子图里两个入口（`port_name` 缺省）→ 输入 `in`、`in_2`；一个摘要 → 输出含 `summary`
  - `W0610-T6 推断类型`：`portTypes` 给出 `n1.result = 列表[方案@1]` → `PortSlot.type` 为它、`cat='list'`；换成新 Map 引用 → 重算
  - `W0610-T7 控件`：5 个常用参数只取 4 个；被提升的参数不在控件里；`show_if` 为假的不在；`bind` 端口有连线 → `boundFrom` 为源节点
  - `W0610-T8 show_if`：读 `schema/examples/show_if_vectors.json`（与 `W0703-T2` 同一份，`P.09` K119）：`kind == '提示词'`、`a && !b`、`n == 3`、`x || y` 各一组；`f(x)` 这类不认识的 → true
  - `W0610-T9 sig`：只改显示名 → 同一个 `shape` 引用；加一个提升参数 → `sig` 变化；`setFoot` → `h` 加 26、`sig` 不变
  - `W0610-T10 portPos`：标准节点第 3 个输入的 `y = pos.y + 38 + 6 + 2×24 + 12`；折叠时 `y = pos.y + 19`；不存在的端口 → null
  - `W0610-T11 贝塞尔`：`dx=400` → 偏移 180；`dx=60` → 48；`dx=−100` → 120；`mid` 与公式一致
  - `W0610-T12 拖动中`：`ctx.live` 有 a 的位置 → `pos(a)`、`portPos`、`edgePath` 用它
  - `W0610-T13 query`：600 节点（启用网格）与线性扫描结果相同（随机 100 个矩形）
  - `W0610-T14 nearestPort`：半径内两个候选取最近；都在半径外 → null
  - `W0610-T15 forModel`：`ghostGraph` 里的 `tmp:1` 节点 → 形状和端口位置正确；不读 `ctx.live`
  - `W0610-T16 不读 DOM`：`geom/` 源码里没有 `document`、`window`、`getBoundingClientRect`（lint 规则）
  - `W0610-T17 参数展开`：`schema_expand_vectors.json` 每条的常用参数、动态端口与后端一致；提示词变量端口去重（`C.03.02` §5、`C.03.05` §8 验收 2、4）
- 允许使用的依赖：无运行时依赖；测试用 `vitest`。
- 禁止事项：`G.02.05` 全部（特别是 R1、R2、R9、R23）；另：不在代码里写布局常数的数值（只从 `LAYOUT` 取）；不按节点类型名写分支（紧凑宽度、容器端口都按数据判断）；不在本模块里判断端口兼容。
- 完成标志：`G.14` 全部条件；§10 六条验收通过；`layout_vectors.json` 被 Go 一侧的测试引用（由 `E.17.02` 的实施任务完成，本叶子只提供文件）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `W0610-T8` 改为读共用用例 `schema/examples/show_if_vectors.json`（属性页 `W.07.03` 另有一份 `evalShowIf` 实现，两边跑同一组用例） | 第 8 棒；`P.09` K119 |
| 2026-11-23 | §6.2 第 3 步：只有 `ref` 的子图引用的端口签名改为读目录 store 的 `libSigs`（原临时做法保留为加载前的过渡） | 第 9 棒写 `W.09.02`；`P.09` K104 收尾、K145 |
| 2026-11-23 | 控件名按 `C.03.02` §4 统一并查 `WIDGET_MAP`；补 `W0610-T17` | `P.09` K211、K212 |
