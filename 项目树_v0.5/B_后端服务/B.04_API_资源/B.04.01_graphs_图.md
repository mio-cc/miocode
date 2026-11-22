# B.04.01 graphs 图

| 项 | 内容 |
|---|---|
| 编号 | B.04.01 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-23 |

## 1. 职责
图的增删查、校验、版本、比较、导入导出。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/graphs?q=&session_id=&limit=&cursor=` | 列表（按更新时间倒序） | → `Page<GraphMeta>` |
| POST | `/graphs` | 新建空图 `{title}`；从模板新建走 `B.04.13` | → `Graph` 201 |
| GET | `/graphs/{id}?branch=main&version=` | 读取图文档（默认最新版本） | → `{graph, registry_hash, diags}` |
| PATCH | `/graphs/{id}` | 只改标题和描述（内部转成 `set_graph_title` / `set_graph_meta` Op） | `{title?, description?, base_version}` → `{version}` |
| DELETE | `/graphs/{id}` | 软删除（30 天后清理，`B.09`） | → 204 |
| POST | `/graphs/{id}/restore` | 恢复软删除 | → 204 |
| GET | `/graphs/{id}/validate?branch=` | 全量校验 | → `{version, diags}` |
| GET | `/graphs/{id}/versions?branch=&cursor=` | 版本列表 | → `Page<VersionMeta>`（含操作者、时间、摘要） |
| GET | `/graphs/{id}/diff?from=&to=&branch=` | 结构化比较 | → `{units: DiffUnit[]}` |
| GET | `/graphs/{id}/export?format=json\|yaml&version=` | 导出（带依赖清单，`C.12-R8`） | → 文件 |
| POST | `/graphs/import` | 导入（multipart，≤ 50MB） | → `{graph_id, missing?}`；依赖缺失时 422 并列出 |
| GET | `/graphs/{id}/cost?since=` | 历次运行的费用汇总 | → `{runs, tokens, cost_micros}` |
| POST | `/graphs/{id}/nodes/{node_id}/prompt-preview` | 预览 Agent / 提示词节点最终发给模型的内容：按角色卡、指令、上下文、可用工具、输出格式分段，变量用占位标出，每段估算 tokens（`U.10.07` §3；不调用模型） | `{branch}` → `PromptPreview {segments[{kind, text, tokens, placeholders[]}]}` |

## 5. 行为
- 导入：先迁移到当前格式（`C.12-R9`），检查依赖，再创建新图（新 ID），不覆盖已有图。
- 导出不含密钥（`S.03-R4`）。
- 删除图不删除引用它的运行记录；运行列表里显示"图已删除"。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/graphs.go`、`internal/api/graphs_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0401-T1 列表与分页`
  - `B0401-T2 新建读取`
  - `B0401-T3 PATCH 走 Op`
  - `B0401-T4 导入缺依赖`
  - `B0401-T5 导出无密钥`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §4 新增 `prompt-preview` | 第 8 棒写 `W.07.03`："预览最终提示词"没有接口；`P.09` K113 |
