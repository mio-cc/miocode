# E.02.03 深拷贝与快照

| 项 | 内容 |
|---|---|
| 编号 | E.02.03 |
| 类型 | 实施 |
| 上级 | E.02 graph 图模型 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 新 |
| 最后修改 | 2026-11-25 |

## 1. 职责
提供深拷贝和不可变快照：Op 在副本上应用、运行冻结快照、编排者草稿图都依赖它；提供图文档的规范化哈希。

## 2. 不做什么
- 不做结构共享以外的优化（例如持久化数据结构）

## 3. 继承的上级约束
INV-12（运行冻结快照）、`E.02-R2`、`C.02.01` §6（规范化 JSON，`P.09` K93）。

## 4. 接口
```go
func (g *Graph) Clone() *Graph                     // 完全独立的深拷贝（含索引）
func (g *Graph) Freeze() *Frozen                   // 冻结视图：只读，可以被多个 goroutine 同时读
func (s *Scope) CloneSubgraph() *gen.Subgraph      // 子图深拷贝（打包、运行时展开用）
func Hash(d *gen.Graph) string                     // 规范化 JSON 的 sha256，"sha256:<hex>"
func Canonical(v any) ([]byte, error)              // 规范化序列化（Hash 和 E.03 的注册表哈希共用）
func HashBytes(canonical []byte) string            // 一段规范化 JSON 的哈希
type Frozen struct{ /* 私有 */ }                   // 方法和 Graph 的只读方法相同（转发到内部的副本）；Graph() 给出背后的 *Graph，供 Walk 等函数使用
```

## 5. 行为
- `Clone` 复制所有节点、连线、便签、开放对象（深拷贝 `json.RawMessage`），并重建索引。
- `Freeze` 在 `Clone` 的基础上只暴露读方法；运行快照、回放、并发读取都用 `Frozen`。
- `Canonical`：对象的键按 Unicode 码点排序；字符串按 JSON 标准转义、不做 HTML 转义（`SetEscapeHTML(false)`）；数字按 JavaScript `JSON.stringify` 的写法（先转成 float64，再取最短表示：整数不带小数点和指数，`1e+21`、`1.5e-7` 这样的指数写法，`-0` 写成 `0`；超出 float64 范围的报错）；字符串里 `"`、`\` 和控制字符转义（`\b \f \n \r \t` 用短写法，其余 `\u00xx`），其他字符（包括 U+2028、U+2029）原样；没有多余空白。前端用 `JSON.stringify` 加按码点排序的键就能得到同样的结果。`Hash` = `"sha256:" + hex(sha256(Canonical(d)))`。
- 测试向量 `schema/examples/hash_vectors.json`（本叶子新建，`W.05` 的 `ops/hash.ts` 共用，`C.02.01` §6 以它为准）：文件是 `{description, vectors: [{name, doc, canonical, hash}]}`，名字以 `graph_` 开头的 `doc` 是合法的图文档；覆盖键排序（含中文键、码点顺序与 UTF-16 顺序不同的键）、`<`、`>`、`&` 不转义、整数与小数、空数组与空对象、开放对象里的未知字段、嵌套子图。

## 6. 不变量
- 修改副本不影响原图
- `Frozen` 并发读在 `-race` 下无数据竞争
- Go 与 TS 对同一文档的 `Hash` 相同（向量为准）

## 7. 错误处理
无。

## 8. 验收标准
1. Clone 后修改副本，原图哈希不变
2. 100 个 goroutine 并发读 Frozen 无竞争
3. 规范化哈希测试向量通过

### 实施卡
- 要建 / 要改的文件：`engine/graph/clone.go`、`engine/graph/hash.go`、`engine/graph/clone_test.go`、`schema/examples/hash_vectors.json`
- 不许碰的文件：`schema/`（除上面写出的向量文件）、`gen/`、`internal/`、`cmd/`、`web/`、`engine/store/`、`engine/llm/`
- 测试用例：
  - `E0203-T1 副本独立`：`Clone`、`Freeze`、`CloneSubgraph` 之后改原图的文档（通过 `FromDoc` 的输入副本重新加载）或改副本，另一边的 `Hash` 不变
  - `E0203-T2 并发读`：100 个 goroutine 同时调用 `Frozen` 的各个读方法，结果和单线程相同（`-race` 要 cgo，开发机没有 C 编译器时不加；有的机器上 `go test -race` 照样适用）
  - `E0203-T3 哈希向量`：`hash_vectors.json` 每条的 `Canonical` 和 `HashBytes` 都相同，`graph_` 开头的再用 `Hash(gen.Graph)` 算一遍；超出范围的数字报错
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E0203-T4 前后端哈希一致`：在 `W.05`（M1 第 ⑩ 片）跑：TS 实现读同一份 `hash_vectors.json`
- 允许使用的依赖：标准库、`gen`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §5 指向规范化细则和前端实现位置 | `P.09` K93 |
| 2026-11-25 | 第 ①a / ①b 片（`m1-graph`、`m1-validate`）开工前复查：加 `Canonical`（注册表哈希共用）；写明规范化规则和向量文件格式；前端一致性的用例写明在 `W.05` 跑；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K256 |
