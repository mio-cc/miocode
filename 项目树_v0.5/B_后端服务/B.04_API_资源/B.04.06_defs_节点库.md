# B.04.06 defs 节点库

| 项 | 内容 |
|---|---|
| 编号 | B.04.06 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-23 |

## 1. 职责
提供节点库数据：节点类型、数据类型、类型兼容判断、配方、角色卡、子图库。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/nodedefs?category=&q=` | 全部节点类型（含扩展、技能、MCP 分组） | → `NodeDefSummary[]` |
| GET | `/nodedefs/{ref}` | 完整定义（端口、参数、控件映射） | → `NodeDef` |
| GET | `/node-presets?q=&path=` | 节点库条目（所有包的 `node_presets`，含未启用包的、带原因，`C.15-R1`、`R3`）；不带参数时条目 ≤ 500 全部返回，超过时只返回第一层分类和总数；`path` 取某一类、`q` 搜索（`U.22-R10`） | → `{total, items: NodePresetItem[]}`（`NodePresetItem = {preset, package_id, package_name, source, enabled, disabled_reason?}`） |
| GET | `/types?layer=system\|business` · `/types/{ref}` | 类型列表、详情（字段、继承链、版本） | → 列表 / `TypeDef` |
| POST | `/types/compat` | 两个类型能否连接 | `{src, dst}` → `Assign` |
| GET | `/recipes` · `/recipes/{ref}` | 配方 | → 列表 / `Recipe` |
| GET | `/rolecards` · `/rolecards/{ref}` | 角色卡（含继承解析后的结果） | → 列表 / `RoleCard` |
| POST | `/rolecards` | 新建或保存新版本（保存前检查，`C.13.02` §4） | `RoleCard` → 201 |
| GET | `/library?q=` | 子图库 | → `LibraryItem[]` |
| POST | `/library` | 把一个子图存入子图库（新版本） | `{graph_id, scope, name, version, description}` → 201 |
| GET | `/library/{name}/{version}` | 子图内容 | → `Subgraph` |

## 5. 行为
- 节点库响应按注册表哈希做 ETag，前端缓存（`W.04.01`）。
- 存入子图库后，原位置的节点可以一键改成引用（前端提交 `set_subgraph_ref` Op）。
- 模型修改角色卡走 `res.edit_rolecard` 授权（编排者工具），不走这里的 HTTP。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/defs.go`、`internal/api/library.go`、`internal/api/defs_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0406-T1 节点库与 ETag`
  - `B0406-T2 compat 与测试向量一致`
  - `B0406-T3 角色卡保存检查`
  - `B0406-T4 子图库`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4 新增 `GET /node-presets` | 第 8 棒写 `W.07.02`：`U.22-R10` 引用的接口没有登记；`P.09` K113 |
