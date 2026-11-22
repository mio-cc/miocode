# C.05.03 逆操作规则

| 项 | 内容 |
|---|---|
| 编号 | C.05.03 |
| 类型 | 实施 |
| 上级 | C.05 Op 操作 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引08 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义每种 Op 的逆操作，用于撤销、重做、撤回和回放。

## 2. 逆操作表
| Op | 逆操作 | 服务器在应用时额外记录 |
|---|---|---|
| `add_node` | `remove_nodes{ids:[node.id]}` | — |
| `remove_nodes` | `restore_nodes{removed}` | 被删节点（含子图）和相连连线的完整快照 |
| `restore_nodes` | `remove_nodes{ids}` | — |
| `connect` | `disconnect{ids:[edge.id]}`，有 `replaced` 时再加 `connect{replaced}` | 被替换的旧连线 |
| `disconnect` | 逐条 `connect` | 被删连线 |
| `set_param` | `set_param{to: 旧值}` | 应用前的值（不用客户端的 `from`） |
| `promote_param` | `demote_param` | — |
| `demote_param` | `promote_param` + 逐条 `connect` | 被删连线 |
| `set_label` / `set_tags` / `set_lock` / `set_node_ui` / `set_graph_title` / `set_graph_meta` / `set_mandate` / `set_subgraph_ref` | 同 kind，`to` 换成旧值 | 旧值 |
| `move_nodes` | `move_nodes`，坐标换成旧坐标 | 每个节点的旧坐标 |
| `add_note` | `remove_notes` | — |
| `update_note` | `update_note`，旧值 | 旧值 |
| `remove_notes` | `add_note` 逐条 | 被删便签 |
| `group` | `ungroup{id: new_id}`，带 `rewire` | 改接记录 |
| `ungroup` | `group`，带原 `new_id`、原入口出口 ID、原 `rewire` | 改接记录 |
| `apply_patch` / `import_apply` | 子 Op 的逆操作，**逆序**排列 | — |
| `revert_op` | `revert_op{op_id: 本条}` | — |
| `revert_to` | `revert_to{version: 应用前的版本}` | — |
| `create_branch` | `delete_branch` | — |
| `delete_branch` | **不可逆**（软删除期间可以由用户在分支列表里恢复，这不是 Op） | — |
| `merge_branch` | `revert_to{version: 合并前的版本}` | — |
| `migrate` | **不可逆** | — |

## 3. 规则
- **C.05.03-R1** 对任意合法 Op 序列，"依次应用，再按相反顺序应用逆操作"后，图的规范化哈希与原图相同（属性测试，`Q.03`）。不可逆的 Op 不参与这个测试。
- **C.05.03-R2** 逆操作作为一条新 Op 提交，同样经过授权和校验；撤销模型的修改时，授权按**发起撤销的用户**判定（`引08` §6）。
- **C.05.03-R3** 逆操作的 `actor` 是发起撤销的人，`reason` 写"撤销 {原 op_id}"。
- **C.05.03-R4** 逆操作 rebase 失败（例如节点已经被别人删了）时返回 409 并说明原因，不静默失败。

## 4. 验收标准
1. 属性测试：随机 1000 组、每组 1–50 条 Op，R1 全部成立。
2. 模型添加节点后用户撤销：撤销 Op 的 actor 是 user，授权按 user 判定。

### 实施卡
- 测试用例：`C0503-T1`（属性测试）、`C0503-T2`。实现在 `E.05.02`。
