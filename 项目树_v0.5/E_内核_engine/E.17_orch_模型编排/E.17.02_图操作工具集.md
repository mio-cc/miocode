# E.17.02 图操作工具集

| 项 | 内容 |
|---|---|
| 编号 | E.17.02 |
| 类型 | 实施 |
| 上级 | E.17 orch 模型编排 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引10 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义并实现给模型用的图操作工具：读图、查节点定义、改草稿、试跑、申请提权、结束。

## 2. 不做什么
- 不直接修改真实的图（只改草稿，`E.17-R2`）

## 3. 继承的上级约束
`引10` §4、`C.05.04` §5（回避正在编辑的节点）、`S.03-R6`。

## 4. 接口
工具定义（`engine/orch/tools.json`，生成 Go 校验代码和测试用例）：
| 工具 | 类型 | 说明 |
|---|---|---|
| `read_graph` | 读 | 精简视图：节点（id、类型、显示名、关键参数）、连线（`from.port → to.port`）、子图层级；大图分页；**返回"用户正在编辑"的节点**；密钥引用替换为 `<密钥>` |
| `read_node` | 读 | 单个节点的完整参数和端口 |
| `list_nodedefs` / `get_nodedef` | 读 | 可用节点类型摘要 / 某类型的参数定义 |
| `list_types` / `check_compat` | 读 | 类型列表 / 两个端口能否连接（调用 `Assignable`） |
| `read_trace_summary` | 读 | 运行后优化用：每个节点的耗时、tokens、失败、等待、备注（≤ 3k tokens） |
| `add_node` | 改草稿 | 返回 `tmp:N` |
| `remove_node`、`connect`、`disconnect`、`set_param`、`promote_param`、`group`、`set_label` | 改草稿 | 每个都要求 `reason` |
| `run_subgraph` | 试跑 | 在隔离副本里试跑草稿中的一个子图，只允许 L0 工具，消耗本次编排预算 |
| `request_elevation` | 授权 | 申请提权：目标档位、范围、时长、理由 → 生成审批 |
| `finish` | 结束 | 提交：`rationale`、`expected_effect`、`force_proposal` |

## 5. 行为
- 节点引用可以写 ULID、`tmp:N`，或路径 `path:根图/闭环迭代/执行池`。
- 每次调用返回 ≤ 400 tokens：结果、受影响的 ID、校验警告、草稿版本号。
- 失败时**告诉模型怎么修**（`引10` §4.2）：例如"类型不兼容：列表[方案@1] 不能接到 上下文包。先接一个上下文装配节点"。
- 每次调用写 `orch.tool_call`（E 级），前端据此移动 AI 光标（`U.12` §5）。
- 用户正在编辑的节点（`presence`）：改草稿工具对它们返回"用户正在编辑这个节点，请稍后再改或改别处"。
- `add_node` 可以不带坐标：草稿按 `U.05-R6` 放置，常数取生成的 `gen.Layout`（来自 `schema/builtin/layout.yaml`），节点高度公式与前端相同，用 `schema/examples/layout_vectors.json` 验证（`U.05-R3`，`P.09` K102）。

## 6. 不变量
- 读工具不返回密钥
- 改草稿工具不触及真实图

## 7. 错误处理
参数不合 schema、节点不存在：返回带提示的失败结果，不抛错。

## 8. 验收标准
1. 每个工具一个正例、一个失败例（失败信息带修正提示）
2. read_graph 隐藏密钥
3. 回避正在编辑的节点

### 实施卡
- 要建 / 要改的文件：`engine/orch/tools.json`、`engine/orch/tools/*.go`、`engine/orch/place.go`（`U.05-R6` 放置与节点高度）、`engine/orch/tools_test.go`、`engine/orch/place_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1702-T1 每个工具正反例`
  - `E1702-T2 密钥隐藏`
  - `E1702-T3 presence 回避`
  - `E1702-T4 run_subgraph 只允许 L0`
  - `E1702-T5 放置`：`layout_vectors.json` 的节点高度全部与前端一致；有上游 / 无上游 / 需要下移避让三种情况的坐标
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `add_node` 不带坐标时按 `U.05-R6` 放置；实施卡补 `place.go` 与 `E1702-T5` | `P.09` K102（第 7 棒） |
