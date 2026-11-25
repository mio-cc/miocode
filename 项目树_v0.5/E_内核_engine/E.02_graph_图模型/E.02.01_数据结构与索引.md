# E.02.01 数据结构与索引

| 项 | 内容 |
|---|---|
| 编号 | E.02.01 |
| 类型 | 实施 |
| 上级 | E.02 graph 图模型 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引01 |
| 最后修改 | 2026-11-25 |

## 1. 职责
把 `gen.Graph` 转成带索引的内存图 `*graph.Graph`，支持按节点 ID、按端口、按所在子图快速查找。

## 2. 不做什么
- 不做校验（`E.03.03`）：悬空连线、跨子图连线照常加载，由 V05 报出
- 不计算端口类型（`E.03.02`）
- 不提供修改方法（`E.02-R2`）

## 3. 继承的上级约束
`C.02`、`C.02-R1`（节点 ID 全树唯一）、`E.02-R1`、`E.02-R2`。

## 4. 接口
```go
type Graph struct { /* 私有字段 */ }

var ErrDuplicateID = errors.New("graph: 图里有重复的 ID")

func FromDoc(d *gen.Graph) (*Graph, error)        // 深拷贝 d 后建立索引；节点、连线、便签 ID 重复时返回包着 ErrDuplicateID 的错误（写明是哪个 ID）
func (g *Graph) Doc() *gen.Graph                   // 导出为文档（深拷贝；数组保持原来的顺序）
func (g *Graph) ID() string
func (g *Graph) Version() int64
func (g *Graph) SchemaVersion() string

func (g *Graph) Node(id string) (*Node, bool)      // 全树查找
func (g *Graph) Edge(id string) (*Edge, bool)
func (g *Graph) Note(id string) (*Note, bool)
func (g *Graph) Scope(id string) (*Scope, bool)    // "root" 或容器节点 ID
func (g *Graph) ScopeOf(nodeID string) *Scope      // 节点所在的子图；节点不存在时 nil
func (g *Graph) Parent(scopeID string) *Node       // 子图的容器节点；root 返回 nil
func (g *Graph) Depth(scopeID string) int          // root = 0（C.02.04 §6）
func (g *Graph) Scopes() []*Scope                  // root 在前，其余按深度、再按 ID

const RootScope = "root"

type Scope struct{ /* 私有 */ }
func (s *Scope) ID() string
func (s *Scope) Nodes() []*Node                    // 按 ID 排序
func (s *Scope) Edges() []*Edge                    // 按 ID 排序
func (s *Scope) Notes() []*Note
func (s *Scope) In(nodeID, port string) []*Edge    // 进入某端口的连线（按 ID 排序）
func (s *Scope) Out(nodeID, port string) []*Edge
func (s *Scope) InAll(nodeID string) []*Edge
func (s *Scope) OutAll(nodeID string) []*Edge

type Node struct{ gen.Node }                       // 嵌入生成类型；只读
type Edge struct{ gen.Edge }
type Note struct{ gen.Note }
```

## 5. 行为
1. `FromDoc` 一次遍历整棵树，建立：`nodes map[id]*Node`、`edges map[id]*Edge`、`notes map[id]*Note`、`scopes map[id]*Scope`、`scopeOf map[nodeID]scopeID`、每个 Scope 内的 `in/out map[(node,port)][]*Edge`。连线归属于声明它的那个子图。
2. `ref` 子图引用**不在这里展开**：`ScopeOf` 只覆盖内联 `children`；引用的展开在冻结运行快照时完成（`E.16.01`）。
3. 便签只建索引，不参与 `Nodes()`、拓扑和校验。
4. `FromDoc` 先深拷贝输入（开放对象 `params`、`ui`、`meta` 的 `json.RawMessage` 也复制），之后改输入不影响 `Graph`；`Doc()` 同样返回深拷贝。

## 6. 不变量
- 节点、连线、便签 ID 在整棵树内唯一
- `Doc()` 的输出按键排序序列化后，与输入按键排序序列化的结果逐字节相同（往返无损，包括开放对象里的未知字段；数组顺序不变）
- 查询方法都是 O(1) 或 O(该端口的连线数)

## 7. 错误处理
只有 ID 重复让 `FromDoc` 失败（错误里写出 ID 和两处位置）；其他结构问题都留给校验（`E.03.03` V01、V05），不 panic。

## 8. 验收标准
1. `schema/examples/graph_loop.json` 加载后 `Doc()` 往返无损
2. 1000 节点、3 层嵌套的图加载 < 5ms（设 `ANYDOOR_PERF=1` 时才按阈值判，平时只跑基准；`P.09` K238 的做法）
3. 重复 ID 返回 `ErrDuplicateID`

### 实施卡
- 要建 / 要改的文件：`engine/graph/graph.go`、`engine/graph/index.go`、`engine/graph/doc.go`、`engine/graph/graph_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/store/`、`engine/llm/`
- 测试用例：
  - `E0201-T1 往返无损`：`graph_minimal.json`、`graph_loop.json`、`graph_ui_unknown.json` 加载后 `Doc()` 按键排序序列化与输入相同；`params` 里的未知字段保留；改 `FromDoc` 的输入、改 `Doc()` 的结果都不影响 `Graph`
  - `E0201-T2 子图索引`：在 `graph_loop.json`（3 层）上 `ScopeOf`、`Parent`、`Depth`、`Scopes`、`In`、`Out`、`InAll`、`OutAll` 正确；`ref` 不展开
  - `E0201-T3 重复 ID`：节点与节点、连线与节点、便签与连线重复各一例，错误包着 `ErrDuplicateID` 并写出 ID
  - `E0201-T4 悬空连线`：连线指向不存在的节点时 `FromDoc` 成功，`Edge` 能查到，`In` / `Out` 按端口返回它
  - `E0201-T5 加载性能`：`BenchmarkFromDoc1000`（1000 节点、3 层嵌套，测试里生成）；`ANYDOOR_PERF=1` 时断言单次 < 5ms
- 允许使用的依赖：标准库、`gen`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-25 | 第 ①a / ①b 片（`m1-graph`、`m1-validate`）开工前复查：悬空连线不再让加载失败（由 V05 报）；`Doc()` 保持数组顺序、深拷贝；加 `Note`、`Scopes`、`SchemaVersion`；性能阈值只在 `ANYDOOR_PERF=1` 时判；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K256 |
| 2026-11-25 | 状态改为"冻结"：第 ①a 片（`m1-graph`）squash 合并进代码仓库 `main`，提交 `e7b8b5e59d877d9c795c8cf040dd024e7d3b7116`（`G.02.06-R21`） | `relay slice` 通过；整片评审 27 行全部符合；按 `G.08-R3` 由验证者合并 |
