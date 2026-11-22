# C.03.03 锁定字段

| 项 | 内容 |
|---|---|
| 编号 | C.03.03 |
| 类型 | 实施 |
| 上级 | C.03 节点定义 NodeDef |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义三种"锁"：参数锁、端口锁、节点实例锁。锁决定谁能改什么。

## 2. 定义
| 锁 | 写在哪 | 取值 | 含义 |
|---|---|---|---|
| 参数锁 | `ParamDef.lock` | `none` | 可以改 |
| | | `def` | 值由 NodeDef 默认值决定，图里的实例**不能改**；要改只能换 NodeDef 版本。界面显示为只读，并提示"由节点类型定义" |
| | | `kernel` | 值由内核规则决定，任何人都不能改；界面显示锁图标和规则编号（如 INV-07） |
| 端口锁 | `PortDef.lock` | `none` / `kernel` | `kernel`：这个端口的连接规则由内核强制（例如 Agent 的 `context` 只接上下文包），不能被扩展覆盖 |
| 节点实例锁 | `Node.lock` | `none` | 正常 |
| | | `user` | 只有 `actor.kind=user` 能修改或删除这个节点（包括它的参数、连线、子图内容）；模型的 Op 一律拒绝（不转提议），错误码 `node_locked` |
| | | `frozen` | 任何人都不能修改，包括用户；用户要先用 Op `set_lock` 解锁 |

## 3. 规则
- **C.03.03-R1** `kernel` 锁定的参数不出现在图文档的 `params` 里；出现时校验报 V04。
- **C.03.03-R2** `def` 锁定的参数如果出现在 `params` 里且值不等于默认值，校验报 V04。
- **C.03.03-R3** 实例锁只能由用户设置或解除（Op `set_lock` 的 actor 必须是 `user`）。
- **C.03.03-R4** 实例锁向下覆盖子图：容器节点 `lock=user` 时，它子图里的所有节点都按 `user` 处理；`frozen` 同理。
- **C.03.03-R5** 移动节点（`move_nodes`）和改节点视图（`set_node_ui`）不受 `user` 锁限制，受 `frozen` 锁限制。理由：模型整理布局时需要移动节点，这不改变行为。

## 4. 为什么把旧的实例锁改成 `user / frozen`
旧文档（`引02`）的实例锁是 `none / def / kernel`，`def` 的含义是"仅作者可改"。v1 是单用户产品，"作者"永远是同一个人，这个含义没有用处。用户真正需要的是：**"这个节点我调好了，AI 别动"**，和**"这个节点暂时谁都别动"**。所以改成 `user` 和 `frozen`（`P.09` K16）。

## 5. 内置的 kernel 锁参数
| 节点 | 参数 | 固定值 | 对应规则 |
|---|---|---|---|
| Agent | `context_src` | `上下文装配` | INV-07 |
| 上下文装配 | `honor_inherit` | `true` | `E.13.06` |
| 工具 | `keep_pointer` | `true` | `E.11.02` |
| 聚合 | `deterministic` | `true` | `E.14.07` |
| 分支 | `pure` | `true` | `E.14.08` |

## 6. 验收标准
1. 模型提交修改 `lock=user` 节点参数的 Op，返回 403 `node_locked`，不产生提议。
2. 用户修改 `frozen` 节点被拒绝；用户先 `set_lock none` 后可以修改。
3. 模型对 `lock=user` 的节点提交 `move_nodes` 成功。

### 实施卡
- 要改的文件：`schema/graph.schema.json`（`Node.lock`）、`schema/nodedef.schema.json`（`ParamDef.lock`、`PortDef.lock`）。
- 测试用例：`C0303-T1`…`T3`（§6），由 `E.05.05` Op 授权钩子实现时运行。
