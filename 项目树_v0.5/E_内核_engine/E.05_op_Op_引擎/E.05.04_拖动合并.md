# E.05.04 拖动合并

| 项 | 内容 |
|---|---|
| 编号 | E.05.04 |
| 类型 | 实施 |
| 上级 | E.05 op Op 引擎 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引08 |
| 最后修改 | 2026-11-26 |

## 1. 职责
实现连续拖动、步进、滑块产生的 Op 原地合并（coalesce）。

## 2. 不做什么
- 不负责前端节流（前端每 250ms 提交一次，`W.05`）

## 3. 继承的上级约束
`C.05.04` §4、`C.06.03-R4`、`E.05-R8`、`E.05.01` §5、`E.07.01` §5（`Coalesce` 只替换 payload）。

## 4. 接口
```go
// coalesce.go：init 里登记 coalescer（E.05-R8）；E.05.01 §5.1 第 4 步调用
func (p *Pipeline) tryCoalesce(ctx context.Context, r Repo, c *cached, b Batch) (handled bool, res *Result, err error)
```

## 5. 行为
- **条件**（全部满足才合并，否则 `handled=false`，按普通 Op 往下走）：
  1. 批次只有一条 Op，kind 是 `move_nodes` 或 `set_param`，`coalesce_key` 非空；
  2. `BaseVersion` 等于 head；分支最新一条 Op（head 那一版）是同一个操作者（`kind`、`id` 都相同）的、`coalesce_key` 和 kind 相同、没有被撤销；
  3. 作用对象相同：`move_nodes` 的节点集合相同，`set_param` 的 `(node, key, path)` 相同；
  4. 现在（`Now`）离上一次提交（缓存里上一次合并的时间；没有时用那条 Op 的 `ts`）不到 2s；
  5. `set_param` 的新值不让任何动态端口消失（一并删除的连线要进逆操作，这种情况按普通 Op）。
- 只合并分支**最新一条**：存储的 `Coalesce` 只改 Op 的 `payload`，不改那一版的全文和哈希（`P.09` K261）。
- **动作**（同一个事务）：
  1. 在 head 图上应用新的 payload（同一个应用函数，丢掉它算出的逆操作），授权钩子、增量校验照常；不通过按普通 Op 失败处理；
  2. `Repo.Coalesce(上一条的 id, 新 payload)`：版本号不变，`inverse` 保留最初的旧值，所以撤销一次回到拖动前；
  3. 不存全文：`E.05.01` §5.1 第 8 步不给带 `coalesce_key` 的版本存全文，`Base` 之后重放的是合并后的 payload；
  4. 提交后更新缓存（文档、诊断、上一次合并的时间）；广播 `op.coalesced{version, op_id: 上一条的 id, to: 合并后的完整 payload}`（`C.06.03-R4`）。
- 返回 `Result{Version: head, Applied: [上一条的 id], Rebased: false}`。
- **已知问题**：那一版在存储里的哈希还是第一次提交时算的（存储不能改）。现在没有地方读这个哈希；要用它（例如回放核对）之前先给存储加更新哈希的方法（`P.09` K261）。

## 6. 不变量
- 一次拖动在历史里只有一条 Op，撤销一次回到原位
- 合并后清掉缓存重放，得到的图与缓存里的相同

## 7. 错误处理
无特殊错误。

## 8. 验收标准
1. 模拟 60 次 `move_nodes`：历史 1 条、版本号不变、撤销回原位（`C0504-T3`）
2. 间隔 ≥ 2s 的两次拖动不合并
3. 不同操作者不合并
4. 不是分支最新一条、作用对象不同、动态端口消失时不合并
5. 合并后 `Read` 和重放正确

### 实施卡
- 要建 / 要改的文件：`engine/op/coalesce.go`、`engine/op/coalesce_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/authz/`
- 测试用例：
  - `E0504-T1 60 次合并`：同一个 `coalesce_key` 每次间隔 250ms（假时钟）提交 60 次 `move_nodes`：历史里 1 条，版本号不变，收到 59 个 `op.coalesced`；撤销后回到原位（`C0504-T3`）
  - `E0504-T2 超时不合并`：间隔 2s 的两次提交是两条 Op
  - `E0504-T3 跨操作者不合并`：用户、模型同一个 `coalesce_key` 交替提交，各是各的
  - `E0504-T4 其他不合并`：中间插进别的 Op；节点集合不同；`set_param` 让动态端口消失
  - `E0504-T5 合并后重放`：第 50 版是带 `coalesce_key` 的 Op 时不存全文，下一条普通 Op 存；合并后清掉缓存，`Read` 每个版本都与提交时相同
- 允许使用的依赖：标准库、`gen`、`engine/graph`、`engine/schema`；测试另用 `engine/store/memstore`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 广播内容写明 `to` 为完整 payload | `P.09` K87 |
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
| 2026-11-25 | 第 ③ 片（`m1-op`）开工前复查：只合并分支最新一条、作用对象要相同、动态端口消失时不合并；间隔按上一次提交算；带 `coalesce_key` 的版本不存全文；记下哈希不更新的已知问题；加 `E0504-T4`、`T5`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K261 |
| 2026-11-26 | 状态改为"冻结"：第 ③ 片（`m1-op`） squash 合并进代码仓库 `main`，提交 `e84ae8f6043fd1491d1a271732cc2099e4ed7b27`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合；按 `G.08-R3` 由验证者合并 |
