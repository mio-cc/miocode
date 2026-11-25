# E.05.06 分支、合并与补丁

| 项 | 内容 |
|---|---|
| 编号 | E.05.06 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引08；原 `E.05.03` 的分支与三方合并部分 |
| 最后修改 | 2026-11-25 |

> M4（模型编排）复查时改写成可以领取的样子；本文先接住原 `E.05.03` 移过来的内容（`P.09` K261）。

## 1. 职责
草稿分支（`create_branch`、`delete_branch`）、三方合并（`merge_branch`、合并预览、结构化 Diff）、模型在档位 4 写 `main` 冲突时转进草稿分支，以及模型补丁 `apply_patch` 的应用和临时 ID 替换（`C.08-R2`、`R3`）。

## 2. 不做什么
- 不实现合并界面（`W.07.01` §6.4）
- 不生成补丁（`E.17.01`）、不存提议（`E.17.03`）

## 3. 继承的上级约束
`C.05.04` §3、§5、`C.08`、`E.05-R1`–`R8`、`E.05.03`（可交换判定）。

## 4. 接口
```go
func (p *Pipeline) CreateBranch(ctx context.Context, graphID, name, from string, at int64, actor gen.Actor) error
func (p *Pipeline) MergePreview(ctx context.Context, graphID, from, into string) (*MergePreview, error)
func (p *Pipeline) Merge(ctx context.Context, graphID, from, into string, res []gen.Resolution, actor gen.Actor) (*Result, error)

type MergePreview struct {
    Base, Ours, Theirs int64
    Auto      []DiffUnit
    Conflicts []Conflict
    Diags     []gen.Diag
}
func Diff(a, b *graph.Graph) []DiffUnit   // 结构化比较单元（C.05.04 §3 第 2 步）
```

## 5. 行为
- 模型的 Op 在档位 4 写 `main` 时冲突：自动转进草稿分支 `draft/model-<id>`，返回 `Result{Rebased:false}` 并发 `branch.updated` 事件（`C.05.04` §5）。
- 合并：按 `C.05.04` §3 算法；坐标冲突取 ours；自动采纳部分先在副本上预校验。
- `apply_patch`：每条子 Op 单独授权、单独校验，全成或全不成；临时 ID 在应用前换成 ULID，写进 `Result.IDMap`（`C.08-R2`、`R3`）。
- M4 复查时要定：草稿分支的 `Base`（`E.07.01` §5 已支持接 main）；子 Op 授权与 `E.05.05` 的整批汇总怎么合；`tmpid.go` 的位置。

## 6. 不变量
- 坐标冲突永远不出现在 Conflicts 里
- 合并结果与"在 ours 上逐条应用被采纳的单元"相同

## 7. 错误处理
合并时仍有未解决冲突：`ErrUnresolved`；不可交换：`ConflictError`。

## 8. 验收标准
1. 三方合并覆盖 `C.05.04` §3 第 3 步每种情况（`C0504-T4`）
2. 模型冲突转草稿
3. 补丁全成或全不成，`id_map` 正确

### 实施卡
- 要建 / 要改的文件：`engine/op/branch.go`、`engine/op/merge.go`、`engine/op/diff.go`、`engine/op/patch.go`、`engine/op/tmpid.go`、`engine/op/merge_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0506-T1 分支`：建、删草稿分支；`main` 不能删
  - `E0506-T2 三方合并`：覆盖 `C.05.04` §3 第 3 步的每种情况（`C0504-T4`）
  - `E0506-T3 模型冲突转草稿`
  - `E0506-T4 补丁`：一条子 Op 失败整批不落库；`id_map` 覆盖每个临时 ID
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-25 | 新建：接住原 `E.05.03` 的草稿分支、三方合并、模型冲突转草稿（原 `E0503-T3`、`T4` 改为 `E0506-T2`、`T3`），加上 `apply_patch` 与临时 ID；M4 复查时改写 | `P.09` K261 |
