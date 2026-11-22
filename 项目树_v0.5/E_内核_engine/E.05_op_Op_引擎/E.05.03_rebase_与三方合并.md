# E.05.03 rebase 与三方合并

| 项 | 内容 |
|---|---|
| 编号 | E.05.03 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引08 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 `C.05.04` 的可交换判定、自动 rebase、草稿分支和三方合并。

## 2. 不做什么
- 不实现合并界面（`W.07`）

## 3. 继承的上级约束
`C.05.04` §2、§3、§5。

## 4. 接口
```go
func WriteSet(op *gen.Op) Set
func Commutes(op *gen.Op, missed []gen.Op) (bool, []Conflict)
func Rebase(op *gen.Op, missed []gen.Op) (*gen.Op, error)       // 改写 from 字段、ID 引用

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
- 可交换判定按 `C.05.04` §2.1 的写集合表；`benign` 例外（同节点 move 后写者胜、重复删除幂等）。
- 模型的 Op 在档位 4 写 main 时冲突：自动转进草稿分支 `draft/model-<id>`，返回 `Result{Rebased:false}` 并发 `branch.updated` 事件（`C.05.04` §5）。
- 合并：按 `C.05.04` §3 算法；坐标冲突取 ours；自动采纳部分先在副本上预校验。

## 6. 不变量
- 自动 rebase 后的结果与"按最新版本重新提交"的结果相同
- 坐标冲突永远不出现在 Conflicts 里

## 7. 错误处理
不可交换：`ErrConflict{Head, Missed, Conflicts}`；合并时仍有未解决冲突：`ErrUnresolved`。

## 8. 验收标准
1. `C.05.04` §2.1 写集合表每一格一个用例
2. 三方合并覆盖 §3 第 3 步每种情况（C0504-T4）
3. 模型冲突转草稿

### 实施卡
- 要建 / 要改的文件：`engine/op/commute.go`、`engine/op/rebase.go`、`engine/op/branch.go`、`engine/op/merge.go`、`engine/op/diff.go`、`engine/op/merge_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0503-T1 写集合表全格`
  - `E0503-T2 rebase 等价性（rapid）`
  - `E0503-T3 三方合并`
  - `E0503-T4 模型冲突转草稿`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
