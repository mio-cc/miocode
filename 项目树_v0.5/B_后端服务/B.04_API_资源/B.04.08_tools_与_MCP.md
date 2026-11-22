# B.04.08 tools 与 MCP

| 项 | 内容 |
|---|---|
| 编号 | B.04.08 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 职责
列出工具；管理 MCP 服务（增删改、启停、工具启用）。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/tools?source=builtin\|mcp\|ext\|skill` | 已注册工具：`{id, name, risk, schema, source, enabled}` | → `ToolDef[]` |
| PUT | `/tools/{id}` | 启用 / 停用、调高风险等级（不能低于下限，`S.04-R7`） | `{enabled?, risk?}` → `ToolDef` |
| GET | `/mcp-servers` | 服务列表与状态（连接状态、工具数、最近错误） | → `McpServer[]` |
| POST | `/mcp-servers` | 新增（stdio：命令和参数；http：地址）；**创建后为待确认状态** | → 201 |
| POST | `/mcp-servers/{name}/confirm` | 用户确认启用（`S.08-R8`：界面显示完整命令） | → `McpServer` |
| PUT | `/mcp-servers/{name}` · DELETE | 修改、删除 | → … |
| POST | `/mcp-servers/{name}/reconnect` | 重新连接 | → `McpServer` |

## 5. 行为
- 新增和修改后的 stdio 服务都要重新确认（命令变了）。
- 新出现的 MCP 工具默认停用（`S.08-R12`），在 `/tools` 里启用。
- 仅用户。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/tools.go`、`internal/api/mcp.go`、`internal/api/tools_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0408-T1 工具启停与风险`
  - `B0408-T2 MCP 待确认`
  - `B0408-T3 修改后重新确认`
  - `B0408-T4 新工具默认停用`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
