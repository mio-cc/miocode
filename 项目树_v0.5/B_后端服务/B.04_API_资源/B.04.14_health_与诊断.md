# B.04.14 health 与诊断

| 项 | 内容 |
|---|---|
| 编号 | B.04.14 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 职责
健康检查、诊断信息、关闭服务。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R3`、`S.02`、`G.12`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/api/v1/health` | **不需要鉴权**，只返回 `{ok: true, version}`（不含任何其他信息），供单实例检测和安装程序使用 | → `{ok, version}` |
| GET | `/api/v1/diagnostics` | 需要鉴权：版本、启动时长、数据库状态、迁移版本、注册表哈希、扩展包、MCP 状态、最近错误（不含密钥和正文） | → `Diagnostics` |
| GET | `/api/v1/openapi.json` | OpenAPI 文档（`B.03.06`） | → JSON |
| GET | `/metrics` | Prometheus 指标（需要鉴权，`S.02-R11`） | → 文本 |
| POST | `/api/v1/admin/shutdown` | 优雅关闭（仅用户或 harnessctl） | → 202 |
| POST | `/api/v1/admin/diagnostics-bundle` | 打包诊断信息：最近日志（已脱敏）、诊断 JSON、配置（不含密钥），供用户反馈问题（`O.08`） | → zip |

## 5. 行为
- health 是唯一不鉴权的接口，返回内容固定，不能扩展（`B-R3`）。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/health.go`、`internal/api/admin.go`、`internal/api/health_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0414-T1 health 不泄露信息`
  - `B0414-T2 诊断包无密钥`
  - `B0414-T3 shutdown`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
