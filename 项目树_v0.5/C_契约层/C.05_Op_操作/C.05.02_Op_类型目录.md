# C.05.02 Op 类型目录

| 项 | 内容 |
|---|---|
| 编号 | C.05.02 |
| 类型 | 实施 |
| 上级 | C.05 Op 操作 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引08 |
| 最后修改 | 2026-11-22 |

## 1. 职责
列出全部 Op 种类：载荷字段、前置条件、效果。逆操作见 `C.05.03`，授权动作名见 `C.09` §4。

## 2. 图结构
| kind | payload | 前置条件 | 效果 |
|---|---|---|---|
| `add_node` | `{scope, node: Node}` | `node.id` 未被占用（整棵树内）；`type` 已注册；`params` 合法；容器节点要么带 `children`，要么服务器自动补入口 / 出口 | 在 `scope` 下加入节点；容器节点没带子图时，服务器放入一对子图端口 |
| `remove_nodes` | `{ids: [Ulid]}` | 节点都存在；没有 `frozen` 锁；模型不能删 `user` 锁的节点 | 删除节点、它们的子图、所有相连的连线；应用时把被删内容快照进 `removed` |
| `restore_nodes` | `{removed: [Snapshot]}` | 只能作为逆操作出现；ID 未被重用 | 恢复节点和连线 |
| `connect` | `{edge: Edge}` | 端口存在；类型兼容；不形成非法环（V05–V07、V09） | 加连线；目标是非多连端口且已有连线时，服务器把旧连线记入 `replaced` 并删除它 |
| `disconnect` | `{ids: [Ulid]}` | 连线存在 | 删连线；快照进 `removed` |
| `set_param` | `{node, key, to}` | 参数存在、未锁定（`C.03.03`）、值合法；客户端可以带 `from` 用于冲突检测 | 设置参数值；`to` 等于默认值时从 `params` 里删除该键 |
| `promote_param` | `{node, key}` | `promotable: true` | 加进 `promoted` |
| `demote_param` | `{node, key}` | 已提升 | 移出 `promoted`；连到这个端口的连线被删除并快照 |
| `set_label` | `{node, to}` | 1–80 字 | 改显示名 |
| `set_tags` | `{node, to: [string]}` | ≤ 16 个 | 改标签 |
| `set_lock` | `{node, to: none\|user\|frozen}` | **actor 必须是 user** | 改实例锁 |
| `group` | `{scope, node_ids, new_id, label}` | ≥ 2 个节点，都在同一个 `scope` | 生成一个 `子图引用` 节点（带 `children`），把选中节点移进去，跨边界的连线改接到自动生成的入口 / 出口；改接记录写进 `rewire` |
| `ungroup` | `{id}` | 节点带 `children` | 把子图里的节点移回当前层，入口 / 出口删除，连线恢复直连 |
| `set_subgraph_ref` | `{node, to: SubgraphRef\|null, children?}` | `ref` 存在、无引用环；`to=null` 时必须同时给 `children`（把引用展开成内联） | 切换内联 / 引用 |

## 3. 视图（不影响运行，`C.02.05`）
| kind | payload | 前置条件 | 效果 |
|---|---|---|---|
| `move_nodes` | `{moves: [{id, to: Pos}]}` | 没有 `frozen` 锁 | 改坐标；可合并（`C.05.04` §4） |
| `set_node_ui` | `{node, to: NodeUi}` | 没有 `frozen` 锁 | 整体替换 `ui` |
| `add_note` | `{scope, note: Note}` | ID 未占用 | 加便签 |
| `update_note` | `{id, to: {pos?, size?, text?, color?}}` | 便签存在 | 改便签 |
| `remove_notes` | `{ids}` | 便签存在 | 删便签，快照 |

## 4. 图级
| kind | payload | 前置条件 | 效果 |
|---|---|---|---|
| `set_graph_title` | `{to}` | ≤ 120 字 | 改标题 |
| `set_graph_meta` | `{to: {description?}}` | — | 改元信息 |
| `set_mandate` | `{anchor, to: Ulid\|null}` | 授权规则见 `C.09` §5：模型只能收紧、不能放宽，不能动给自己授权的那份 | 改挂载点 |

## 5. 复合与历史
| kind | payload | 前置条件 | 效果 |
|---|---|---|---|
| `apply_patch` | `{patch_id, ops: [Op]}` | 每条子 Op 单独授权、单独校验；全成或全不成 | 应用模型的 GraphPatch（`C.08`） |
| `import_apply` | `{source: yaml\|json, ops: [Op]}` | 同上 | 服务器把导入文件和当前图的差异拆成细粒度 Op |
| `revert_op` | `{op_id}` | 目标 Op 存在；它的逆操作能 rebase 到当前版本 | 撤回某一条 Op（可以是别人的、模型的） |
| `revert_to` | `{version}` | 版本存在 | 回到某个版本；服务器计算差分 Op 存进 `ops` |
| `migrate` | `{from_schema, to_schema}` | **actor 必须是 runtime** | 文档格式升级（`C.12`） |

## 6. 分支
| kind | payload | 前置条件 | 效果 |
|---|---|---|---|
| `create_branch` | `{name, from, at_version?}` | 名称唯一，符合 `draft/…` | 新建草稿分支 |
| `delete_branch` | `{name}` | 不是 `main` | 软删除，30 天后清理 |
| `merge_branch` | `{from, into, base, ours, theirs, resolutions: [Resolution]}` | 冲突都已解决 | 三方合并（`C.05.04` §3） |

```json
"Resolution": {
  "type": "object",
  "required": ["object", "pick"],
  "properties": {
    "object": { "type": "object", "description": "{node} / {node, param} / {edge} / {node, field:\"label\"}" },
    "pick":   { "enum": ["ours", "theirs", "manual"] },
    "value":  { "description": "pick=manual 时的值" }
  }
}
```

## 7. 改名说明
相对旧文档（`引08`）：`remove_node` 改名 `remove_nodes`（本来就支持多个）；`yaml_apply` 改名 `import_apply`（也支持 JSON）；`revert_op` 补进表格（旧文档只在正文提到）；新增 `set_lock`、`set_node_ui`、三个便签 Op、`set_graph_title`、`set_graph_meta`。

## 8. 验收标准
1. 每种 Op 至少一个合法示例和一个违反前置条件的示例，放在 `schema/examples/ops/`。
2. `set_lock` 由模型提交时返回 403。
3. `connect` 到已有连线的非多连端口时，旧连线被替换，`replaced` 记录正确，撤销后恢复旧连线。

### 实施卡
- 要改的文件：`schema/op.schema.json`（`OpKind` 枚举和全部 payload）；`schema/examples/ops/*.json`。
- 测试用例：`C0502-T1`（示例全集校验）、`C0502-T2`、`C0502-T3`（§8，在 `E.05.01` 跑）。
