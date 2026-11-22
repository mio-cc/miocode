# E.02.03 深拷贝与快照

| 项 | 内容 |
|---|---|
| 编号 | E.02.03 |
| 类型 | 实施 |
| 上级 | E.02 graph 图模型 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-23 |

## 1. 职责
提供深拷贝和不可变快照：Op 在副本上应用、运行冻结快照、编排者草稿图都依赖它。

## 2. 不做什么
- 不做结构共享以外的优化（例如持久化数据结构）

## 3. 继承的上级约束
INV-12（运行冻结快照）、`E.02-R2`。

## 4. 接口
```go
func (g *Graph) Clone() *Graph                     // 完全独立的深拷贝（含索引）
func (g *Graph) Freeze() *Frozen                   // 冻结视图：只读，可以被多个 goroutine 同时读
func (s *Scope) CloneSubgraph() *gen.Subgraph      // 子图深拷贝（打包、运行时展开用）
func Hash(d *gen.Graph) string                     // 规范化 JSON 的 sha256，"sha256:<hex>"
type Frozen struct{ /* 私有 */ }                   // 方法集与 Graph 的只读部分相同
```

## 5. 行为
- `Clone` 复制所有节点、连线、开放对象（深拷贝 `json.RawMessage`），并重建索引。
- `Freeze` 在 `Clone` 的基础上去掉修改入口；运行快照、回放、并发读取都用 `Frozen`。
- `Hash` 用于运行快照、Op 前后比较、属性测试（`C.05.03-R1`）。规范化规则见 `C.02.01` §6（含码点排序、关闭 HTML 转义，`P.09` K93），前后端实现共用测试向量（前端在 `W.05` 的 `ops/hash.ts`）。

## 6. 不变量
- 修改副本不影响原图
- `Frozen` 并发读在 `-race` 下无数据竞争
- Go 与 TS 对同一文档的 `Hash` 相同

## 7. 错误处理
无。

## 8. 验收标准
1. Clone 后修改参数，原图哈希不变
2. 100 个 goroutine 并发读 Frozen 无竞争
3. 规范化哈希测试向量通过

### 实施卡
- 要建 / 要改的文件：`engine/graph/clone.go`、`engine/graph/hash.go`、`engine/graph/clone_test.go`、`schema/examples/hash_vectors.json`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0203-T1 副本独立`
  - `E0203-T2 并发读（-race）`
  - `E0203-T3 哈希向量（与 W.05 共用）`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §5 指向规范化细则和前端实现位置 | `P.09` K93 |
