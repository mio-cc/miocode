# E.17.03 提议与幽灵节点

| 项 | 内容 |
|---|---|
| 编号 | E.17.03 |
| 类型 | 实施 |
| 上级 | E.17 orch 模型编排 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引10, 设12 |
| 最后修改 | 2026-11-22 |

## 1. 职责
管理提议的生命周期：创建、预览（幽灵视图）、逐条或整体采纳与拒绝、依赖联动、自动 rebase 与过期。

## 2. 不做什么
- 不实现幽灵节点的界面（`U.12` §3、`W.06.14`）

## 3. 继承的上级约束
`C.08` §4、`C.08-R6`–`R8`、`C.06.03`（proposal 事件）。

## 4. 接口
```go
type Proposals struct{ /* store、pipeline */ }
func (p *Proposals) Create(ctx context.Context, patch *gen.GraphPatch, actor gen.Actor, origin Origin) (string, error)
func (p *Proposals) Preview(ctx context.Context, id string) (*gen.ProposalPreview, error)     // ghost_graph + marks
func (p *Proposals) Decide(ctx context.Context, id string, accept, reject []string, by gen.Actor) (*op.Result, error)
func (p *Proposals) AcceptAll / RejectAll(ctx context.Context, id string, by gen.Actor) (*op.Result, error)
func (p *Proposals) OnGraphChanged(graphID, branch string, version int64)                    // 尝试 rebase，失败标 stale
```

## 5. 行为
- 依赖：从临时 ID 引用推出依赖图；采纳一条自动带上它依赖的；拒绝一条自动带上依赖它的（`C.08-R6`）。
- 采纳：被采纳的 Op 作为一个批次提交，`actor` = 模型、`approver` = 用户，授权按用户判定（`C.08-R7`）；返回 `id_map`。
- 状态：open → partially_applied → applied / rejected；图前进时 rebase，失败 → stale（`C.08-R8`）。
- 事件：`proposal.created`、`proposal.updated`、`proposal.decided`（图协同流）。
- 预览：在当前图上叠加补丁，每个受影响元素标 `add / modify / remove`、旧值新值和理由。

## 6. 不变量
- 依赖联动后不会出现悬空连线
- 采纳后的 Op actor 为模型、approver 为用户

## 7. 错误处理
处理已结束或已过期的提议：409 `proposal_stale`。

## 8. 验收标准
1. `C08-T1`…`T4`
2. 部分采纳后状态 partially_applied
3. 预览标记正确

### 实施卡
- 要建 / 要改的文件：`engine/orch/proposals.go`、`engine/orch/preview.go`、`engine/orch/proposals_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1703-T1 依赖联动`：拒绝 `add_node tmp:1` 后连到它的连线一起拒绝（`C08-T2`）
  - `E1703-T2 actor/approver`：采纳后 `op.applied` 里 `actor=model`、`approver=user`（`C08-T3`）
  - `E1703-T3 rebase 与 stale`：提议打开期间用户删了它要连的节点 → `stale`（`C08-T4`）
  - `E1703-T4 预览`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
