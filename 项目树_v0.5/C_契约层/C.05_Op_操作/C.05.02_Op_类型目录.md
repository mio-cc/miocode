# C.05.02 Op 类型目录

| 项 | 内容 |
|---|---|
| 编号 | C.05.02 |
| 类型 | 实施 |
| 上级 | C.05 Op 操作 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引08 |
| 最后修改 | 2026-11-23 |

## 1. 职责
列出全部 Op 种类：载荷字段、前置条件、效果。逆操作见 `C.05.03`，授权动作名见 `C.09` §4。

## 2. 图结构
| kind | payload | 前置条件 | 效果 |
|---|---|---|---|
| `add_node` | `{scope, node: Node}` | `node.id` 未被占用（整棵树内）；`type` 已注册；`params` 合法；容器节点要么带 `children`，要么服务器自动补入口 / 出口 | 在 `scope` 下加入节点；容器节点没带子图时，服务器放入一对子图端口 |
| `remove_nodes` | `{ids: [Ulid]}` | 节点都存在；没有 `frozen` 锁；模型不能删 `user` 锁的节点 | 删除节点、它们的子图、所有相连的连线；应用时把被删内容快照进 `removed` |
| `restore_nodes` | `{removed: Removed}` | 只能作为逆操作出现；ID 未被重用 | 恢复节点和连线 |
| `connect` | `{edge: Edge}` | 端口存在；类型兼容；不形成非法环（V05–V07、V09） | 加连线；目标是非多连端口且已有连线时，服务器把旧连线记入 `replaced` 并删除它 |
| `disconnect` | `{ids: [Ulid]}` | 连线存在 | 删连线；快照进 `removed` |
| `set_param` | `{node, key, path?, to, from?}` | 参数存在、未锁定（`C.03.03`）、值合法；客户端可以带 `from` 用于冲突检测 | 设置参数值；`to` 等于默认值时从 `params` 里删除该键；这个参数是 `dynamic_ports` 的来源、新值让某些动态端口消失时，连到这些端口的连线一并删除并快照进 `removed`（`C.03.05-R4`） |
| `promote_param` | `{node, key}` | `promotable: true` | 加进 `promoted` |
| `demote_param` | `{node, key}` | 已提升 | 移出 `promoted`；连到这个端口的连线被删除并快照 |
| `set_label` | `{node, to}` | 1–80 字 | 改显示名 |
| `set_tags` | `{node, to: [string]}` | ≤ 16 个 | 改标签 |
| `set_lock` | `{node, to: none\|user\|frozen}` | **actor 必须是 user** | 改实例锁 |
| `group` | `{scope, node_ids, new_id, label, rewire?}` | ≥ 2 个节点，都在同一个 `scope` | 生成一个 `子图引用` 节点（带 `children`），把选中节点移进去，跨边界的连线改接到自动生成的入口 / 出口；改接记录写进 `rewire` |
| `ungroup` | `{id, rewire?}` | 节点带 `children` | 把子图里的节点移回当前层，入口 / 出口删除，连线恢复直连 |
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
| `revert_to` | `{version, ops?}` | 版本存在 | 回到某个版本；服务器计算差分 Op 存进 `ops` |
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
  "additionalProperties": false,
  "properties": {
    "object": { "type": "object", "minProperties": 1, "additionalProperties": false, "description": "{node} / {node, param} / {edge} / {node, field} / {note}",
                "properties": { "node": { "$ref": "common.schema.json#/$defs/Ulid" }, "param": { "type": "string", "pattern": "^[a-z_][a-z0-9_]*$" },
                                "edge": { "$ref": "common.schema.json#/$defs/Ulid" }, "note": { "$ref": "common.schema.json#/$defs/Ulid" },
                                "field": { "enum": ["label", "pos"] } } },
    "pick":   { "enum": ["ours", "theirs", "manual"] },
    "value":  { "description": "pick=manual 时的值" }
  }
}
```

### 6.1 payload 的 schema 写法（`P.09` K227）
- 每种 kind 一个 `$defs`，名字是 `Payload` 加 kind 的驼峰写法（`add_node` → `PayloadAddNode`）；`Op` 的 `allOf` 里每种 kind 一条 `if/then`（`C.05.01` §2）。每个 payload 都是封闭对象；表里的字段都必填，带 `?` 的和 `set_param` 的 `from` 可选。
- 字段类型：`scope` 为 `^(root|<ULID>)$`；`node`、`id`、`new_id`、`op_id`、`patch_id` 为 `Ulid`；`ids`、`node_ids` 为不重复的 `Ulid` 数组（至少 1 个；`group` 的 `node_ids` 至少 2 个）；`node: Node`、`edge: Edge`、`note: Note`、`to: NodeUi`、`moves[].to: Pos`、`to: SubgraphRef` 引用 `graph.schema.json#/$defs/…`；`key` 为参数名 `^[a-z_][a-z0-9_]*$`；`path` 只有一项，是 `schema_from` 对象参数的属性名（原样，`C.03.02-R7`）；`set_param` 的 `to`、`from` 和 `Resolution.value` 是任意 JSON；`label`、`set_label.to` 1–80 字；`set_tags.to` 最多 16 个字符串；`set_lock.to` 为 `none`、`user`、`frozen`；`version`、`at_version`、`base`、`ours`、`theirs` 为 ≥ 0 的整数；分支名 `name`、`from`、`into` 为 `op.schema.json#/$defs/Branch`（`create_branch.name` 只能是 `draft/…`）；`set_mandate.anchor` 同 `MandateMount.anchor`，`to` 为 `Ulid` 或 `null`；`migrate` 的 `from_schema`、`to_schema` 为"主.次"；`apply_patch`、`import_apply` 的 `ops` 是 1–200 条 `Op`；`update_note.to` 只能有 `pos`、`size`、`text`、`color`，至少一个；`set_graph_title.to` 1–120 字；`set_graph_meta.to` 只有 `description`。
- `Removed`：`{nodes: [{scope, node: Node}], edges: [{scope, edge: Edge}]}`，被删节点的子图在 `node.children` 里。`Rewire`：`[{removed: Edge, added: [Edge]}]`。
- "效果"栏里服务器记录的 `removed`、`replaced`、`rewire` 写进这条 Op 的 `inverse`（`C.05.03`），不写进客户端提交的 `payload`；`group`、`ungroup` 的 `rewire` 和 `revert_to` 的 `ops` 只由服务器填写（出现在逆操作和 Op 日志里）。
- `set_param` 改 `schema_from` 对象参数的一个子参数时写 `path: [属性名]`，`to` 是这个子参数的新值；写集合是 `(node, key, 属性名)`（`C.05.04` §2.1）。

## 7. 改名说明
相对旧文档（`引08`）：`remove_node` 改名 `remove_nodes`（本来就支持多个）；`yaml_apply` 改名 `import_apply`（也支持 JSON）；`revert_op` 补进表格（旧文档只在正文提到）；新增 `set_lock`、`set_node_ui`、三个便签 Op、`set_graph_title`、`set_graph_meta`。

## 8. 验收标准
1. 每种 Op 至少一个合法 payload 和一个结构不合法的 payload，放在 `schema/examples/op_vectors.json`；违反前置条件的例子在 `E0501-T1` 里（前置条件要看图，schema 查不了）。
2. `set_lock` 由模型提交时返回 403。
3. `connect` 到已有连线的非多连端口时，旧连线被替换，`replaced` 记录正确，撤销后恢复旧连线。

### 实施卡
- 要建 / 要改的文件：`schema/op.schema.json`、`schema/examples/op_vectors.json`、`tools/schemacheck/payload_test.go`
- 向量格式：数组，每项 `{name, kind, payload, valid, error_at?}`，`error_at` 是 `valid` 为 false 时期望的报错位置；文件名以 `_vectors.json` 结尾，不登记示例清单（`C.01-R22`）。按 `op.schema.json#/$defs/Op` 校验 `{kind, payload}`，`error_at` 相对这个 Op（如 `/payload/ids`）。
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0502-T1 payload 向量`：每种 kind 至少一个合法、一个不合法；合法的都通过，不合法的在 `error_at` 下报错
  - `C0502-T4 判别`：`OpKind` 的每个值都有 `Payload…` 定义和一条 `if/then`，没有多余的；把一种 kind 的 payload 配上另一种 kind 时失败；`payload` 多出字段时失败；`Resolution.object` 为空对象时失败
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 违反前置条件、模型提交 `set_lock` 返回 403、`connect` 替换旧连线并能撤销（§8 验收 2、3，`C0502-T2`、`C0502-T3`）：`E0501-T1`（`E.05.01`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `set_param` 让动态端口消失时一并删除相连的连线 | `P.09` K214 |
| 2026-11-23 | 第 4 片（`m0-contract-3`）开工前复查：写明 payload 的 schema 写法（§6.1）；`restore_nodes` 用 `Removed`，`set_param` 加 `path`，`group`、`ungroup`、`revert_to` 补服务器填写的字段；`Resolution` 封闭；示例改为一份向量；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K227 |
