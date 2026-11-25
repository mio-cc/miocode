# E.05 op Op 引擎

| 项 | 内容 |
|---|---|
| 编号 | E.05 |
| 类型 | 实施 |
| 上级 | E 内核 engine/ |
| 下级 | E.05.01 应用 Apply、E.05.02 撤销与重做、E.05.03 可交换判定与 rebase、E.05.04 拖动合并、E.05.05 授权钩子、E.05.06 分支、合并与补丁、E.05.07 打包、子图引用与导入 Op |
| 状态 | 已审 |
| 素材 | 引08 |
| 最后修改 | 2026-11-25 |

## 1. 这一组管什么
`engine/op`：Op 流水线（结构校验 → 版本检查与 rebase → 授权 → 在副本上应用 → 增量校验 → 落库 → 广播）、撤销重做与撤回、可交换判定与 rebase、拖动合并、授权钩子；草稿分支、三方合并、模型补丁（M4）和打包子图等复合 Op（M2）以后加。

## 2. 下级清单
| 编号 | 名称 | 什么时候做 |
|---|---|---|
| E.05.01 | 应用 Apply | M1 第 ③ 片 |
| E.05.02 | 撤销与重做 | M1 第 ③ 片 |
| E.05.03 | 可交换判定与 rebase | M1 第 ③ 片 |
| E.05.04 | 拖动合并 | M1 第 ③ 片 |
| E.05.05 | 授权钩子 | M1 第 ③ 片 |
| E.05.06 | 分支、合并与补丁 | M4 |
| E.05.07 | 打包、子图引用与导入 Op | M2 |

第 ③ 片 `m1-op` 的领取顺序：`E.05.03` → `E.05.05` → `E.05.01` → `E.05.02` → `E.05.04`。先写不依赖流水线的纯函数（作用对象、写集合、授权钩子），再写流水线；后面的叶子通过 R8 的注册点接进流水线（`P.09` K261）。

## 3. 共同约束
- **E.05-R1** `op.Pipeline.Submit` 是修改图的唯一入口；`Undo`、`Redo`、`RevertOp`、`RevertTo` 也都走 `Submit` 的同一条路。store 层不暴露任何不经过它的写图方法（INV-08）。
- **E.05-R2** 一批 Op 在一个事务内完成：全部成功或全部失败（`C.05-R2`）。
- **E.05-R3** 广播在事务提交之后发出（`afterCommit`），保证推给前端的一定已落库。
- **E.05-R4** `op` 不 import `engine/store`（`E.01` §1）：持久化用本包的 `Repo` 接口（`E.05.01` §4）；适配器 `engine/opstore.go`（`engine` 包，也就是组装入口所在的包，`E.01` §2）把 `store.Store` 包成 `op.Repo`。测试经这个适配器跑 memstore 和 SQLite。
- **E.05-R5** 图的修改：`engine/graph` 保持只读（`E.02-R2`）。`op` 在图文档 `*gen.Graph` 的副本上改（本包私有的 `mutable`，自带索引），一批改完再 `graph.FromDoc` 得到只读图交给校验（`P.09` K261）。
- **E.05-R6** 各里程碑收的 Op：

  | 里程碑 | kind |
  |---|---|
  | M1（本片） | `add_node`、`remove_nodes`、`restore_nodes`、`connect`、`disconnect`、`set_param`、`promote_param`、`demote_param`、`set_label`、`set_tags`、`set_lock`、`move_nodes`、`set_node_ui`、`add_note`、`update_note`、`remove_notes`、`set_graph_title`、`set_graph_meta`、`revert_op`、`revert_to`、`migrate` |
  | M2（`E.05.07`） | `group`、`ungroup`、`set_subgraph_ref`、`import_apply` |
  | M3 | `set_mandate`（`E.06` 复查时定归哪个叶子） |
  | M4（`E.05.06`） | `apply_patch`、`create_branch`、`delete_branch`、`merge_branch` |

  还没收的 kind 返回 `ErrBadRequest`，文案写明哪个里程碑支持（例如"打包成子图要到 M2 才支持"）。`restore_nodes` 只能作为逆操作出现，客户端直接提交时也是 `ErrBadRequest`。
- **E.05-R7** 日志里的 Op 是服务器补全后的：服务器生成的内容（容器节点自动加的子图端口节点、`connect` 替换掉的旧连线、被一并删除的连线）写进这条 Op 的 `payload` 或 `inverse`；重放只按日志应用，不生成 ID、不读时钟，结果逐字节相同。`revert_op` 展开成具体的 Op 再落库（`E.05.02` §5.5）。
- **E.05-R8** 注册点（同一个包里，后面的叶子用 `init` 登记）：应用函数按类别写在 `apply_<类别>.go`，登记进 `appliers`；`revert_op`、`revert_to` 的展开登记进 `expanders`（`E.05.02`）；拖动合并登记 `coalescer`（`E.05.04`）。没有应用函数的 kind 按 R6 处理；`coalescer` 为 nil 时不合并。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-25 | 第 ③ 片（`m1-op`）开工前复查：`E.05.03` 缩为可交换判定与 rebase，分支与合并、补丁移到新叶子 `E.05.06`（M4），打包子图等移到新叶子 `E.05.07`（M2）；新增 R4–R8；写明领取顺序；状态改为"已审" | `P.09` K261 |
