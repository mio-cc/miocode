# B.04.03 runs 运行

| 项 | 内容 |
|---|---|
| 编号 | B.04.03 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 职责
启动、控制、查询运行；节点详情、时间线、时间旅行、回放与分叉。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| POST | `/runs` | 启动运行 | `{graph_id, branch?, version?, inputs?, budget?, session_id?}` → 201 `{run_id, graph_version, status}` |
| GET | `/runs?graph_id=&session_id=&status=&cursor=` | 列表 | → `Page<RunMeta>` |
| GET | `/runs/{id}` | 概览：状态、用时、用量、费用、当前路径、待审批数 | → `RunView` 摘要 |
| POST | `/runs/{id}/pause` · `/resume` · `/cancel` | 控制 | → `RunMeta` |
| POST | `/runs/{id}/estop` | 本次运行急停 | → 204 |
| GET | `/runs/{id}/nodes?scope=&node_id=` | 节点执行状态投影（重连对齐用） | → `{seq, items: NodeStateRow[]}` |
| GET | `/runs/{id}/nodes/{exec_key}` | 一次节点执行的详情：输入、输出、上下文包各段、提示词、模型调用、工具调用、错误、费用 | → `NodeDetail` |
| GET | `/runs/{id}/timeline?from=&to=` | 时间线 | → `Bar[]` |
| GET | `/runs/{id}/view?at_seq=` | 时间旅行：某一时刻的全部状态 | → `RunView` |
| GET | `/runs/{id}/cost?group=node\|model\|path\|round` | 费用汇总 | → `CostRow[]` |
| GET | `/runs/{id}/briefs` · `/escalations?status=` | 简报、升级队列 | → 列表 |
| POST | `/runs/{id}/replay` | 回放（不调用模型和工具） | → 201 `{run_id}` |
| POST | `/runs/{id}/fork` | 从检查点或节点分叉 | `{at: {node_id, scopes, seq?}, patch?}` → 201 `{run_id}` |
| POST | `/runs/{id}/nodes/{exec_key}/replay` | 单节点重放 | `{live: false}` → `NodeReplay` |
| POST | `/runs/{id}/hotpatch/{patch_id}/confirm` · `/discard` | 确认或丢弃运行中改图（`E.16.02` 第 3 步） | → 204 |
| GET | `/blobs/{ref}` | 读工作区原文（支持 Range） | → 原文 |

## 5. 行为
- 启动：急停中返回 423；校验不通过 422 带诊断；没有可用模型 503（演示模式除外）。
- `GET /blobs/{ref}`：只能读当前用户可见的图、运行、会话引用过的内容；返回前再脱敏一次（防止旧数据里残留密钥）。
- `NodeDetail` 里的大内容只给引用，前端按需加载（`W.07.03`）。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/runs.go`、`internal/api/blobs.go`、`internal/api/runs_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0403-T1 启动与控制`
  - `B0403-T2 急停 423`
  - `B0403-T3 节点详情`
  - `B0403-T4 时间旅行`
  - `B0403-T5 回放与分叉`
  - `B0403-T6 热更新确认`
  - `B0403-T7 blobs 权限`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
