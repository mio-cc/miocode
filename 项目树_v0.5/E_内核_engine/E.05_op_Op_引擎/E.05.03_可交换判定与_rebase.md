# E.05.03 可交换判定与 rebase

| 项 | 内容 |
|---|---|
| 编号 | E.05.03 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引08 |
| 最后修改 | 2026-11-26 |

## 1. 职责
算每条 Op 的作用对象（`target`）、写集合和引用集合；判断一批 Op 和错过的 Op 能不能交换（`C.05.04` §2）；能交换时把这一批 rebase 到最新版本。各叶子共用的 payload 解码也在这里。

## 2. 不做什么
- 不做草稿分支、三方合并、模型冲突转草稿（`E.05.06`，M4）
- 不应用 Op（`E.05.01`）

## 3. 继承的上级约束
`C.05.01` §3（`target` 由服务器算）、`C.05.04` §2、§2.1、`C.02.05-R3`、`E.05-R6`。

## 4. 接口
```go
// target.go
func Target(op *gen.Op, g *graph.Graph) (gen.OpTarget, error)

// commute.go
// Key 是写集合、引用集合里的一项：
//   node:<id>  edge:<id>  note:<id>  port:<node>/<port>  param:<node>/<key>[/<属性名>]
//   field:<node>/<label|tags|lock>  view:<node>  graph:title  graph:meta  graph:doc
type Key string
func WriteSet(op *gen.Op, g *graph.Graph, v schema.View) []Key   // 排序、去重
func RefSet(op *gen.Op, g *graph.Graph) []Key
type Conflict struct{ OpID string; Object Key }                    // 写进 GraphConflictDetails.conflicts
func Commutes(ops []gen.Op, g *graph.Graph, v schema.View, missed []gen.OpRecord) (bool, []Conflict)

// rebase.go
func Rebase(ops []gen.Op, missed []gen.OpRecord) []gen.Op          // 只在 Commutes 为 true 之后调用

// payload.go
func decode[T any](op *gen.Op) (*T, error)                          // gen.DecodeAs 的包装，错误里写 kind
```
`g` 是 head 的图（已应用了 missed）。新提交的 Op 按 `g` 算；已落库的 Op 按它的 `payload` 和 `inverse` 算（被删掉的连线在 `inverse` 的 `removed`、`replaced` 里），只有"端口是不是多连"看 `g`（节点已不在时只算 `edge` 键）。

## 5. 行为

### 5.1 作用对象（`OpTarget`）
| kind | `scope` | `nodes` / `edges` / `notes` |
|---|---|---|
| `add_node`、`add_note` | `payload.scope` | 新节点（含 `children` 里的）/ 新便签 |
| `remove_nodes`、`set_param`、`promote_param`、`demote_param`、`set_label`、`set_tags`、`set_lock`、`set_node_ui` | 节点所在层（多个节点不在同一层时取第一个的） | 这些节点 |
| `restore_nodes` | 第一个节点的 `scope` | 节点、连线 |
| `connect` | 两端节点所在层 | 两端节点；新连线 |
| `disconnect` | 连线所在层 | 连线 |
| `move_nodes` | 第一个节点所在层 | 节点 |
| `update_note`、`remove_notes` | 便签所在层 | 便签 |
| `set_graph_title`、`set_graph_meta`、`migrate` | `root` | — |
| `revert_to` | `root` | 子 Op 的并集 |

### 5.2 写集合与引用集合（`C.05.04` §2.1）
| kind | 写集合 | 引用集合 |
|---|---|---|
| `add_node` | `node:新节点`（含 `children` 里的） | 容器 `node:<scope>`（`scope` 不是 `root` 时） |
| `remove_nodes` | `node:ids`（含子孙）、`edge:相连的连线` | — |
| `restore_nodes` | `node:ids`、`edge:连线` | 容器 `node:<scope>` |
| `connect` | `edge:新 id`；目标端口不是多连时 `port:<to.node>/<to.port>`；被替换的 `edge:旧 id` | `node:from`、`node:to` |
| `disconnect` | `edge:ids` | — |
| `set_param` | `param:<node>/<key>`（改子参数时 `param:<node>/<key>/<属性名>`）、一并删除的 `edge:…` | `node:<node>` |
| `promote_param`、`demote_param` | `param:<node>/<key>`、`port:<node>/<key>`；`demote` 删的 `edge:…` | `node:<node>` |
| `set_label`、`set_tags`、`set_lock` | `field:<node>/<label|tags|lock>` | `node:<node>` |
| `move_nodes`、`set_node_ui` | `view:<node>` | `node:<node>` |
| `add_note`、`update_note`、`remove_notes` | `note:<id>` | 容器 `node:<scope>`（`add_note`） |
| `set_graph_title` / `set_graph_meta` | `graph:title` / `graph:meta` | — |
| `migrate` | `graph:doc`（和任何 Op 都冲突） | — |
| `revert_to` | 子 Op 写集合的并集 | 子 Op 引用集合的并集 |

### 5.3 判定
- 两条 Op `a`、`b` 冲突 ⇔ `W(a) ∩ W(b)`、`W(a) ∩ R(b)`、`R(a) ∩ W(b)` 有一个不为空（"一个删除、另一个引用"由 `node:`、`edge:`、`note:` 键落在写集合里表示）。`graph:doc` 和任何键都算相交。
- 例外（视为可交换，`C.05.04` §2.1）：
  - 两条都只写 `view:` 同一个节点：后写者胜（`C.02.05-R3`）；
  - 两条 `remove_nodes` 删同一个节点：幂等。
- `Commutes`：这一批的每条与 missed 的每条两两判断；`Conflicts` 每对一条 `{op_id: 这一批里那条的 id, object: 相交的键}`，同一条 Op、同一个键只写一次，按 `op_id`、`object` 排序。

### 5.4 Rebase
- Op 原样保留（ID 都是 ULID，不用改写；`set_param` 的 `from` 不参与判定）；`remove_nodes` 去掉已被 missed 删掉的 ID，删空了整条去掉。整批都去掉时 `Submit` 返回 `Result{Version: head, Applied: [], Rebased: true}`。
- `target` 在 `E.05.01` §5.1 第 5 步按 head 重算。

## 6. 不变量
- 自动 rebase 后的结果与"按最新版本重新提交"的结果相同（`E0501-T12`）
- 判定只看键，不比较节点类型名（INV-02）

## 7. 错误处理
`Target`、`WriteSet` 遇到解不开的 `payload` 返回错误（第 0 步已校验过结构，正常不会出现）；`decode` 的错误里写 kind 和字段。

## 8. 验收标准
1. `C.05.04` §2.1 写集合表每一格一个用例
2. 两个例外各一个用例
3. 每种 kind 的 `target` 正确，客户端填的值被忽略

### 实施卡
- 要建 / 要改的文件：`engine/op/target.go`、`engine/op/commute.go`、`engine/op/rebase.go`、`engine/op/payload.go`、`engine/op/commute_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`
- 测试用例：
  - `E0503-T1 写集合表全格`：§5.2 每一行的写集合、引用集合；每对冲突的组合一个用例，含两条 `set_param` 改同一参数、base 相同时不能交换且 `conflicts` 指明 `param:<node>/<key>`（`C0504-T2`）
  - `E0503-T3 例外`：两条 `move_nodes` 移同一节点可以交换；两条 `remove_nodes` 删同一节点可以交换，`Rebase` 后去掉重复的 ID，删空的整条去掉；`remove_nodes` 与 `move_nodes` 同一节点冲突
  - `E0503-T4 Target`：§5.1 每种 kind 的 `target`；客户端填了不同的 `target` 时按计算结果
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E0503-T2 rebase 等价性（rapid）`：要应用 Op，在 `E.05.01` 跑：`E0501-T12`
- 允许使用的依赖：标准库、`gen`、`engine/graph`、`engine/schema`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
| 2026-11-25 | 第 ③ 片（`m1-op`）开工前复查：改名"可交换判定与 rebase"（原"rebase 与三方合并"），只留 M1 要的可交换判定、rebase、作用对象；草稿分支、三方合并、模型冲突转草稿移到 `E.05.06`（`E0503-T3`、`T4` 原来的内容改为 `E0506-T2`、`T3`，编号在本文重用）；写集合写成键；`E0503-T2` 在 `E.05.01` 跑；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K261 |
| 2026-11-26 | 状态改为"冻结"：第 ③ 片（`m1-op`） squash 合并进代码仓库 `main`，提交 `e84ae8f6043fd1491d1a271732cc2099e4ed7b27`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合；按 `G.08-R3` 由验证者合并 |
