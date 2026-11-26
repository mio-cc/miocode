# E.05.05 授权钩子

| 项 | 内容 |
|---|---|
| 编号 | E.05.05 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引07 |
| 最后修改 | 2026-11-26 |

## 1. 职责
在 Op 落地前做授权判定，决定直接应用、转为提议还是拒绝；同时处理实例锁和急停。M1 的判定用固定放行的桩（`P.09` K255 ③），本叶子写这个桩。

## 2. 不做什么
- 不实现判定算法（`E.06.02`，M3）和急停（`E.06.04`，M3）
- 不存提议（`E.17.03`，M4）：只返回 `Propose`，由 `E.05.01` 交给 `Proposer`

## 3. 继承的上级约束
INV-09、INV-10、`C.03.03`、`C.08-R4`、`C.08-R7`、`C.09` §4、§4.3、`C.12-R2`、`P.09` K82（急停期间用户照常改图）。

## 4. 接口
```go
// engine/op/authz_hook.go
type Decision int // Apply | Propose | Deny
type authInput struct {
    Actor    gen.Actor
    Approver *gen.Actor
    Taint    bool
    Mandate  string
    RunID    string
    Ops      []gen.Op        // target 已算好（E.05.03）
    G        *graph.Graph    // 批次开始时的图（head）
}
func authorize(ctx context.Context, chk authz.Checker, es Estop, in authInput) (Decision, []authz.Result, error)
func ActionOf(kind gen.OpKind) gen.Action   // gen.AuthzOpActions，没列出的是 "op." + kind

// engine/authz/check.go —— STUB(E.06.02)：M1 固定放行；E.06.02 实施时整体替换，下面的名字和字段只增不改
type Effect string                          // allow | propose | ask | deny（C.09 §5）
const (EffectAllow Effect = "allow"; EffectPropose Effect = "propose"; EffectAsk Effect = "ask"; EffectDeny Effect = "deny")
type Target struct{ Graph, Scope string; Nodes []string }
type Request struct {
    Actor   gen.Actor
    Action  gen.Action
    Target  Target
    Taint   bool
    Mandate string
}
type Result struct{ Effect Effect; Reasons []string }
type Checker interface{ Check(ctx context.Context, req Request) Result }
type Fixed struct{}                         // 一律 allow，Reasons ["M1 授权固定放行（P.09 K255）"]
```
`Estop` 是 `E.05.01` §4 的接口（`Active(runID) bool`）；`E.06.04` 的 `Estop` 满足它。

## 5. 行为
1. **急停**：`es` 不为 nil、`es.Active(RunID)` 为 true 且 actor 是 model → `ErrEstopped`（423，reasons "急停中"）。用户的 Op 照常（`P.09` K82）。
2. **只看操作者的 Op**（不调 `Check`）：`set_lock` 的 actor 不是 user → `ErrForbidden`（`C.03.03-R3`）；`migrate` 的 actor 不是 runtime → `ErrForbidden`（`C.12-R2`）。
3. **实例锁**（按批次开始时的图 `G`）：每条 Op 的作用对象 = `target.nodes` 加 `target.scope` 的容器链（`scope` 的容器节点和它的祖先容器，`C.03.03-R4`）；`add_node`、`add_note`、`restore_nodes` 只看容器链。
   - 作用对象或它的祖先有 `frozen` 锁 → 所有操作者 `ErrNodeLocked`（`set_lock` 例外：用户要能解锁）；
   - 有 `user` 锁且 actor 不是 user → `ErrNodeLocked`，不转提议；`move_nodes`、`set_node_ui` 不受 `user` 锁限制（`C.03.03-R5`）；
   - `migrate` 不查锁。错误带 `{node, lock}`（`C.11` §3 `node_locked` 的 `details`）。
4. **判定**：其余每条调 `chk.Check`：`Actor` 为批次的 actor（`Approver` 不为空时用 `Approver`，`C.08-R7`），`Action` 为 `ActionOf(kind)`，`Target` 为 `{G 的 id, target.scope, target.nodes}`，`Taint`、`Mandate` 取批次的。`revert_to` 作为一条判（`op.revert_to`）；`revert_op` 已展开成具体的 Op，逐条判。
5. **汇总**：任一 `deny` → `Deny`（`ErrForbidden`，reasons 合并去重）；全部 `allow` → `Apply`；其余（`propose`、`ask`）→ 整批 `Propose`（`C.08-R4`）。

## 6. 不变量
- 模型的任何 Op 都至少经过一次 `Check`，或被第 1–3 步拒绝（INV-09）
- 急停期间模型的 Op 一律 423；用户的照常
- 不比较节点类型名（INV-02）：锁看 `Node.lock`，动作看 `gen.AuthzOpActions`

## 7. 错误处理
返回的错误都是 `*DeniedError`（`E.05.01` §7），带 `reasons`（命中的授权书、规则；桩没有），`node_locked` 另带 `node`、`lock`，供 API 层放进 `details`。

## 8. 验收标准
1. `C.03.03` §6 三条验收
2. 混合判定整批变提议
3. 急停 423，用户照常
4. M1 的桩一律放行；`set_lock`、`migrate` 按操作者拒绝

### 实施卡
- 要建 / 要改的文件：`engine/op/authz_hook.go`、`engine/op/authz_hook_test.go`、`engine/authz/check.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`
- 桩：`engine/authz/check.go` 第一行 `// STUB(E.06.02): M1 授权固定放行（P.09 K255）`（`G.02.06-R10`）
- 测试用例：
  - `E0505-T1 锁`：模型改 `user` 锁节点的参数 → `ErrNodeLocked`、不是 `Propose`；容器有 `user` 锁时模型改子图里的节点同样被拒；用户改 `frozen` 节点被拒，图里改成 `none` 之后可以；模型对 `user` 锁的节点 `move_nodes` 通过（`C0303-T1`…`T3`）
  - `E0505-T2 整批提议`：假 `Checker` 一条 `allow`、一条 `propose` → 整批 `Propose`；有一条 `deny` → `Deny`（`C08-T1`）
  - `E0505-T3 急停`：假 `Estop` 急停中：模型 → `ErrEstopped`，用户 → 照常判定
  - `E0505-T4 M1 桩与动作名`：`authz.Fixed` 对任何请求 `allow`；模型的 `set_lock`、用户的 `migrate` → `ErrForbidden`；`ActionOf` 对 `move_nodes`、`set_node_ui`、三个便签 Op 是 `op.view`，其余是 `op.<kind>`；`Approver` 不为空时 `Check` 收到的是 `Approver`
- 允许使用的依赖：标准库、`gen`、`engine/graph`、`engine/authz`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-25 | 第 ③ 片（`m1-op`）开工前复查：判定用固定放行的桩 `authz.Fixed`（`STUB(E.06.02)`，K255 ③），急停、提议只留接口；钩子改为不依赖流水线的函数（本片先于 `E.05.01` 领取）；写明作用对象和容器链、`migrate` 不查锁、`Approver`；加 `E0505-T4`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K261 |
| 2026-11-26 | 状态改为"冻结"：第 ③ 片（`m1-op`） squash 合并进代码仓库 `main`，提交 `e84ae8f6043fd1491d1a271732cc2099e4ed7b27`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合；按 `G.08-R3` 由验证者合并 |
