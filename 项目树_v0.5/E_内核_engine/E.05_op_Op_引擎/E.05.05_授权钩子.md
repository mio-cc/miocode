# E.05.05 授权钩子

| 项 | 内容 |
|---|---|
| 编号 | E.05.05 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引07 |
| 最后修改 | 2026-11-22 |

## 1. 职责
在 Op 落地前做授权判定，决定直接应用、转为提议还是拒绝；同时处理实例锁和急停。

## 2. 不做什么
- 不实现判定算法（`E.06.02`）

## 3. 继承的上级约束
INV-09、INV-10、`C.03.03`、`C.08-R4`、`C.09`。

## 4. 接口
```go
type Decision int // Apply | Propose | Deny
func (p *Pipeline) authorize(ctx context.Context, b Batch, ops []gen.Op, g *graph.Graph) (Decision, []authz.Result, error)
```

## 5. 行为
1. 急停中且 actor 为 model：直接 `ErrEstopped`（423）。
2. `set_lock`、`migrate`：只看 actor 类型（user / runtime），不走档位表。
3. 实例锁：作用对象（含容器的子孙）有 `user` 锁且 actor 不是 user → `ErrNodeLocked`；有 `frozen` 锁 → 所有人 `ErrNodeLocked`（移动和视图 Op 在 `user` 锁下例外，`C.03.03-R5`）。
4. 逐条调用 `authz.Check(actor, ActionOf(op), target, ctx{taint, mandate})`。
5. 汇总：任一 deny → Deny；全部 allow → Apply；其余 → Propose（整批）（`C.08-R4`）。
6. 被采纳的提议提交时 `Approver` 为用户，判定按用户（`C.08-R7`）。

## 6. 不变量
- 模型的任何 Op 都至少经过一次 `authz.Check`（INV-09）
- 急停期间模型的 Op 一律 423

## 7. 错误处理
返回的错误都带 `reasons`（命中的授权书、规则），供 API 层放进 `details`。

## 8. 验收标准
1. `C.03.03` §6 三条验收
2. 混合判定整批变提议
3. 急停 423

### 实施卡
- 要建 / 要改的文件：`engine/op/authz_hook.go`、`engine/op/authz_hook_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0505-T1 锁（C0303-T1…T3）`
  - `E0505-T2 整批提议（C08-T1）`
  - `E0505-T3 急停`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
