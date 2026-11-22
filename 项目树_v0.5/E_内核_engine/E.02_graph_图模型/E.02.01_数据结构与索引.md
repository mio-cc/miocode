# E.02.01 数据结构与索引

| 项 | 内容 |
|---|---|
| 编号 | E.02.01 |
| 类型 | 实施 |
| 上级 | E.02 graph 图模型 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01 |
| 最后修改 | 2026-11-22 |

## 1. 职责
把 `gen.Graph` 转成带索引的内存图 `*graph.Graph`，支持按节点 ID、按端口、按所在子图快速查找。

## 2. 不做什么
- 不做校验（`E.03.03`）
- 不计算端口类型（`E.03.02`）
- 不提供对外的修改方法（只给 `op` 用，`E.02-R2`）

## 3. 继承的上级约束
`C.02`、`C.02-R1`（节点 ID 全树唯一）、`E.02-R1`、`E.02-R2`。

## 4. 接口
```go
type Graph struct { /* 私有字段 */ }

func FromDoc(d *gen.Graph) (*Graph, error)        // 加载并建立索引；ID 重复时返回 ErrDuplicateID
func (g *Graph) Doc() *gen.Graph                   // 导出为文档（规范化顺序：节点按 ID、连线按 ID）
func (g *Graph) ID() string
func (g *Graph) Version() int64

func (g *Graph) Node(id string) (*Node, bool)      // 全树查找
func (g *Graph) Edge(id string) (*Edge, bool)
func (g *Graph) Scope(id string) (*Scope, bool)    // "root" 或容器节点 ID
func (g *Graph) ScopeOf(nodeID string) *Scope      // 节点所在的子图
func (g *Graph) Parent(scopeID string) *Node       // 子图的容器节点；root 返回 nil
func (g *Graph) Depth(scopeID string) int          // root = 0（C.02.04 §6）

type Scope struct{ /* 私有 */ }
func (s *Scope) ID() string
func (s *Scope) Nodes() []*Node                    // 按 ID 排序
func (s *Scope) Edges() []*Edge
func (s *Scope) In(nodeID, port string) []*Edge    // 进入某端口的连线
func (s *Scope) Out(nodeID, port string) []*Edge
func (s *Scope) InAll(nodeID string) []*Edge
func (s *Scope) OutAll(nodeID string) []*Edge

type Node struct{ gen.Node }                       // 嵌入生成类型；只读
type Edge struct{ gen.Edge }
```

## 5. 行为
1. `FromDoc` 一次遍历整棵树，建立：`nodes map[id]*Node`、`edges map[id]*Edge`、`scopes map[id]*Scope`、`scopeOf map[nodeID]scopeID`、每个 Scope 内的 `in/out map[(node,port)][]*Edge`。
2. `ref` 子图引用**不在这里展开**：`ScopeOf` 只覆盖内联 `children`；引用的展开在冻结运行快照时完成（`E.16.01`）。
3. 便签（Note）也建索引（`g.Note(id)`），但不参与 `Nodes()`。

## 6. 不变量
- 节点、连线、便签 ID 在整棵树内唯一
- `Doc()` 的输出经规范化序列化后，与输入的规范化序列化结果相同（往返无损，包括开放对象里的未知字段）
- 查询方法都是 O(1) 或 O(该端口的连线数)

## 7. 错误处理
ID 重复、连线引用不存在的节点：`FromDoc` 返回错误（`ErrDuplicateID`、`ErrDanglingEdge`），不 panic。这些错误同时会在校验时以 V01 / V05 报出。

## 8. 验收标准
1. `schema/examples/graph_loop.json` 加载后 `Doc()` 往返哈希不变
2. 1000 节点、3 层嵌套的图加载 < 5ms
3. 重复 ID 返回 `ErrDuplicateID`

### 实施卡
- 要建 / 要改的文件：`engine/graph/graph.go`、`engine/graph/index.go`、`engine/graph/doc.go`、`engine/graph/graph_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0201-T1 往返无损（含未知 params 字段）`
  - `E0201-T2 ScopeOf / Parent / Depth 在 3 层嵌套图上正确`
  - `E0201-T3 重复 ID`
  - `E0201-T4 悬空连线`
  - `E0201-T5 基准 BenchmarkFromDoc1000`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
