# E.05.02 撤销与重做

| 项 | 内容 |
|---|---|
| 编号 | E.05.02 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引08 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现按操作者分开的撤销、重做，以及撤回任意一条 Op（`revert_op`）、回到某个版本（`revert_to`）。

## 2. 不做什么
- 不实现界面上的历史面板（`W.07.05`）

## 3. 继承的上级约束
`C.05.03`、`U.13.03`、`C.05-R3`。

## 4. 接口
```go
func (p *Pipeline) Undo(ctx context.Context, graphID, branch string, actor gen.Actor) (*Result, error)
func (p *Pipeline) Redo(ctx context.Context, graphID, branch string, actor gen.Actor) (*Result, error)
func (p *Pipeline) RevertOp(ctx context.Context, graphID, branch, opID string, actor gen.Actor) (*Result, error)
func (p *Pipeline) RevertTo(ctx context.Context, graphID, branch string, version int64, actor gen.Actor) (*Result, error)
```

## 5. 行为
- 撤销栈按 `(graph, branch, actor.id)` 分开存储（`hx_undo_stack`），每项是一个 `group_id`。
- Undo：取该操作者栈顶未撤销的组，按逆序取出组内每条 Op 的 `inverse`，作为一个新批次提交给 `Submit`（同样经过授权和校验），actor 为发起者，reason "撤销 {原 group}"；成功后标记 `undone`。
- Redo：对最近撤销的组，重新提交原 Op（rebase 到当前 head）。新的普通操作清空**该操作者自己的**重做栈。
- RevertOp：计算目标 Op 的逆操作，rebase 到当前 head；不能交换时返回 409 并说明原因（`C.05.03-R4`）。撤回模型的修改时授权按发起撤回的用户判定（`C.05.03-R2`）。
- RevertTo：服务器计算当前版本到目标版本的差分 Op 序列，作为一条复合 Op 提交。

## 6. 不变量
- 用户的 Undo 永远不会撤销模型的 Op，反之亦然
- 撤销后再重做，图哈希回到撤销前

## 7. 错误处理
没有可撤销的组：返回 `ErrNothingToUndo`（API 层返回 200 + `{applied: []}`，不当作错误）；rebase 失败：`ErrConflict`。

## 8. 验收标准
1. 人和模型交替操作，各自撤销互不影响
2. 撤销一次拖动（合并的 Op）回到原位
3. 撤回已被删除节点上的修改：409 带原因

### 实施卡
- 要建 / 要改的文件：`engine/op/undo.go`、`engine/op/revert.go`、`engine/op/undo_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0502-T1 按 actor 分栈`
  - `E0502-T2 撤销重做往返`：含模型加节点后用户撤销，撤销 Op 的 actor 是用户、授权按用户判定（`C0503-T2`）
  - `E0502-T3 revert_op 冲突`
  - `E0502-T4 revert_to 差分正确`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
