# E.05.02 撤销与重做

| 项 | 内容 |
|---|---|
| 编号 | E.05.02 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引08 |
| 最后修改 | 2026-11-25 |

## 1. 职责
实现按操作者分开的撤销、重做，以及撤回任意一条 Op（`revert_op`）、回到某个版本（`revert_to`）。

## 2. 不做什么
- 不实现界面上的历史面板（`W.07.05`）
- 不用结构化 Diff 算"回到某个版本"（Diff 在 `E.05.06`，M4）

## 3. 继承的上级约束
`C.05.03`、`C.05-R3`、`U.13.03`、`E.05-R1`、`R6`–`R8`、`E.05.01` §5、`E.07.01` §5（撤销栈：`UndoPush`、`UndoTop`、`UndoMark`）。

## 4. 接口
```go
// undo.go
func (p *Pipeline) Undo(ctx context.Context, graphID, branch string, actor gen.Actor) (*Result, error)
func (p *Pipeline) Redo(ctx context.Context, graphID, branch string, actor gen.Actor) (*Result, error)
var ErrNothingToUndo = errors.New("op: 没有可撤销（或可重做）的操作")

// revert.go：init 里给 revert_op、revert_to 登记展开（expanders），给 revert_to 登记应用函数（E.05-R8）
func (p *Pipeline) RevertOp(ctx context.Context, graphID, branch, opID string, actor gen.Actor, reason string) (*Result, error)
func (p *Pipeline) RevertTo(ctx context.Context, graphID, branch string, version int64, actor gen.Actor, reason string) (*Result, error)
```
`reason` 只在 actor 是模型时必填（`C.05.01` §3），落库的 reason 是"撤回 <op_id>：<reason>"。`Submit` 收到 `revert_op`、`revert_to` 时走同一个展开，结果和调用这两个方法相同。

## 5. 行为

### 5.1 撤销栈和重做栈
- 每个 (图, 分支, 操作者) 两个栈，都存在 `Repo` 的撤销栈里：撤销栈的 `ActorID` 是 `actor.id`，重做栈是 `actor.id + "#redo"`（`P.09` K261）。每项是一个 group；新项的 `Seq` = 这个栈里（两种状态）最大的 `Seq` + 1。
- "栈顶" = `UndoTop(…, undone=false)`；"弹出" = `UndoMark(…, true)`。存储没有删除方法，标过的项就是不在栈里了。`UndoMark` 会把这个 group 的 Op 记录的 `undone` 一起改（`E.07.01` §5）：撤销栈弹出时正好要这样；重做栈弹出时 group 的 Op 本来就是 `undone`，改了也不变。
- 推入和清空在 `E.05.01` §5.1 第 8 步：normal、redo 批次推进撤销栈；normal 批次把重做栈全部弹出；undo 批次不推。只有 user、model 有栈（`runtime` 的 `migrate` 不进栈）。

### 5.2 找一个 group 的 Op
- 一个 group 的 Op 在分支里是连续的版本（`E.05.01` §5.1 第 0 步一批一个 group；栈顶已是同一个 group 时接着推的批次不重复入栈）。从 head 往前每次 `Range` 200 条找，找到这个 group 以后再遇到不属于它的就停。
- 客户端每次动作生成新的 group ULID（`W.05`）；不同时间的批次复用同一个 group_id 时只认最近的那一段。

### 5.3 Undo
1. 撤销栈栈顶 → 没有：`ErrNothingToUndo`（API 层返回 200 + `{applied: []}`）。
2. 新批次（mode `undo`）：`Ops` = 这个 group 的记录倒序、每条记录的 `inverse` 按原顺序拼起来；`BaseVersion` = 组里最后一条的版本；`Actor` = 发起者；reason "撤销 <group_id>"（`C.05.03-R3`）；新的 group。
3. 走 `Submit` 的全部步骤：授权按发起者（`C.05.03-R2`）；第 3 步算 missed 时先去掉互相抵消的记录（§5.6），不能交换 → `ConflictError`（409，说明原因，`C.05.03-R4`）。
4. 成功后在同一个事务里：弹出撤销栈栈顶；重做栈推入这个 group。

### 5.4 Redo
1. 重做栈栈顶 group G → 没有：`ErrNothingToUndo`。
2. 新批次（mode `redo`）：`Ops` = G 的记录里的 Op（服务器补全后的 `kind`、`payload`、`coalesce_key`），新的 op id，去掉服务器填的字段；`BaseVersion` = 撤销 G 的那一批的最后一个版本（从 head 往前找 reason 为"撤销 G"、actor 相同的记录）；reason "重做 <G>"；新的 group。
3. 走 `Submit` 的全部步骤（missed 同 §5.6）；成功后弹出重做栈栈顶，新 group 由第 8 步推进撤销栈。

### 5.5 撤回
- **RevertOp(opID)**：目标记录 R 不存在 → `ErrNotFound`；R 已撤销（`undone`）或没有 `inverse`（`migrate`）→ `ConflictError`（conflicts 写 R 的 id，说明原因）。新批次（normal）：`Ops` = R 的 `inverse`，`BaseVersion` = R 的版本，missed 同 §5.6，不能交换 → `ConflictError`（`C.05.03-R4`）。日志里落的是展开后的具体 Op（`E.05-R7`）；撤回本身进撤销栈，可以再撤销。
- **RevertTo(v)**：`v` < 0 或大于 head → `ErrBadRequest`；`v` 等于 head → `Result{Version: head, Applied: []}`；否则取 `Range(v, head)`，记录倒序、每条的 `inverse` 按原顺序拼起来；有没有 `inverse` 的记录 → `ConflictError`（conflicts 写那条的 id、`graph:doc`）。提交一条 `revert_to{version: v, ops: 拼好的}`，`BaseVersion` = head（normal，进撤销栈）。不用 Diff：逆操作倒序拼起来正好回到 `v`（`P.09` K261）。

### 5.6 互相抵消的记录
算撤销、重做、撤回的 missed 时去掉：已撤销的 group（记录的 `undone` 为 true）的 Op，以及撤销它们的那一批（reason 为"撤销 <那个 group>"、actor 与那个 group 的 actor 相同）的 Op。两者的效果互相抵消，留着会和要撤销的 Op 误判冲突（例：先撤销"移动 A"，再撤销"添加 A"）。只认同一个 actor，模型写不出用户的撤销记录。

## 6. 不变量
- 用户的 Undo 永远不会撤销模型的 Op，反之亦然
- 撤销后再重做，图的规范化哈希回到撤销前（比较前 `version` 设成相同）
- 连续撤销 N 次再重做 N 次，顺序与撤销相反，最后回到撤销前
- 回到版本 `v` 后的图与 `Read(v)` 相同（`version` 除外）

## 7. 错误处理
没有可撤销 / 可重做的组：`ErrNothingToUndo`（不当作错误）；不能交换、目标已撤销、不可逆：`ConflictError`；版本不合法：`ErrBadRequest`；目标 Op 不存在：`ErrNotFound`。

## 8. 验收标准
1. 人和模型交替操作，各自撤销互不影响
2. 撤回已被删除的节点上的修改：409 带原因
3. 多步撤销重做顺序正确，新操作清空重做栈
4. 回到某个版本与那个版本的图相同

### 实施卡
- 要建 / 要改的文件：`engine/op/undo.go`、`engine/op/revert.go`、`engine/op/undo_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/authz/`
- 测试用例：
  - `E0502-T1 按 actor 分栈`：用户、模型交替各提交几批，用户 Undo 只撤销用户的，模型 Undo 只撤销模型的
  - `E0502-T2 撤销重做往返`：Undo 后 Redo，规范化哈希回到 Undo 前；模型加节点后用户 `RevertOp`，撤回 Op 的 actor 是用户，假 `Checker` 收到的请求是用户（`C0503-T2`）
  - `E0502-T3 revert_op 冲突`：撤回一条改参数的 Op，而那个节点已被别人删了 → 409，conflicts 指出节点；撤回已撤销的 Op → 409
  - `E0502-T4 revert_to 差分正确`：回到 `v` 后与 `Read(v)` 相同；中间有 `migrate` 时 409；`Submit` 提交 `revert_op`、`revert_to` 与调用方法的结果相同
  - `E0502-T5 多步重做`：撤销 3 次、重做 3 次顺序正确；撤销后做一次普通操作，Redo 返回 `ErrNothingToUndo`
  - `E0502-T6 抵消`：添加 A、移动 A，撤销移动后再撤销添加成功（不误判冲突）；没有可撤销的组时 `ErrNothingToUndo`
- 允许使用的依赖：标准库、`gen`、`engine/graph`、`engine/schema`、`engine/authz`；测试另用 `engine/store/memstore`、`pgregory.net/rapid`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
| 2026-11-25 | 第 ③ 片（`m1-op`）开工前复查：重做栈另存一份（`#redo`，存储只能取序号最大的一项）；写明怎么找 group 的 Op、Undo / Redo 的 base 版本、互相抵消的记录；`revert_op` 展开成具体 Op；`revert_to` 用逆操作倒序拼，不用 Diff；`C0503-T2` 改为经 `RevertOp`（用户的 Undo 撤销不到模型的 Op）；加 `E0502-T5`、`T6`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K261 |
