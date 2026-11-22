# E.02.02 遍历与拓扑排序

| 项 | 内容 |
|---|---|
| 编号 | E.02.02 |
| 类型 | 实施 |
| 上级 | E.02 graph 图模型 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引03 |
| 最后修改 | 2026-11-22 |

## 1. 职责
提供子图内的遍历、拓扑分层和环检测。

## 2. 不做什么
- 不判断"环是否合法"的业务规则（V09 在 `E.03.03`，它调用这里的结果）
- 不跨子图遍历（容器节点视为一个点）

## 3. 继承的上级约束
INV-06、`C.02.04` §8。

## 4. 接口
```go
func (s *Scope) TopoLevels() ([][]string, error)   // 按层返回节点 ID；同层按 ID 排序；有环返回 ErrCycle{SCCs}
func (s *Scope) SCCs() [][]string                  // Tarjan 强连通分量（只返回大小 > 1 或有自环的）
func (s *Scope) Upstream(nodeID string) []string   // 所有祖先
func (s *Scope) Downstream(nodeID string) []string
func (s *Scope) Dominated(nodeID string) []string  // 只为 nodeID 服务的上游支路（软取消用，E.14.06）
func Walk(g *Graph, fn func(n *Node, scope *Scope, path []*Node) bool)  // 深度优先遍历整棵树，返回 false 停止
```

## 5. 行为
- `TopoLevels`：Kahn 算法；入度为 0 的节点为第 0 层；结果确定（同层排序）。
- `Dominated(n)`：在 n 的上游里，找出"所有出边都最终只通向 n"的节点集合（反向支配），供汇合 `first` 和扇出 `k_of_n` 做软取消。
- `Walk` 的 `path` 是从根到当前节点所在子图的容器节点链，供路径生成（`E.09.01`）和授权链（`E.06.02`）使用。

## 6. 不变量
- 同一输入，结果完全确定（不依赖 map 遍历顺序）

## 7. 错误处理
有环时 `TopoLevels` 返回 `ErrCycle`，包含环上的节点 ID，供 V09 生成诊断。

## 8. 验收标准
1. 菱形图分层正确
2. 两个环都被 SCCs 找到
3. `Dominated` 在共享上游时不包含共享节点
4. 1000 节点分层 < 2ms

### 实施卡
- 要建 / 要改的文件：`engine/graph/topo.go`、`engine/graph/walk.go`、`engine/graph/topo_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0202-T1 分层`
  - `E0202-T2 环检测`
  - `E0202-T3 Dominated 共享上游`
  - `E0202-T4 确定性（打乱输入顺序 100 次结果相同）`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
