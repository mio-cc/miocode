# E.12 mcp 接入

| 项 | 内容 |
|---|---|
| 编号 | E.12 |
| 类型 | 实施 |
| 上级 | E 内核 engine/ |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引05, 选 |
| 最后修改 | 2026-11-24 |

## 1. 职责
MCP 客户端：用官方 go-sdk 连接 stdio 和 Streamable HTTP 两种 MCP 服务，把服务的工具桥接成 Anywhere Door 工具。

## 2. 不做什么
- 不实现 MCP 服务端
- 不实现首次启用确认界面（`W.09.04`）

## 3. 继承的上级约束
`S.08` §2、`E.11-R1`、`G.10`（MCP 官方 Go SDK）。

## 4. 接口
```go
type Server struct { Name, Transport string; Command string; Args []string; Env map[string]string; URL string; Headers map[string]string; RiskDefault tools.Risk; RiskOverrides map[string]tools.Risk }
type Manager struct{ /* 每个服务一个连接 */ }
func NewManager(reg tools.Registry, secrets engine.SecretResolver, log *slog.Logger) *Manager
func (m *Manager) Configure(ctx context.Context, servers []Server) error   // 增量：新增、删除、更新
func (m *Manager) Status() []ServerStatus                                  // 连接状态、工具数、最近错误
```

## 5. 行为
- 懒连接：首次使用时 `initialize` → `tools/list`，缓存工具列表；收到 `tools/list_changed` 时刷新，**新出现的工具默认禁用**（`S.08-R12`）。
- stdio 子进程：不继承 `anydoor` 的环境变量，只注入配置里声明的变量（`{{secret:名}}` 在启动时解析）；工作目录为 `<DataDir>/mcp/<名>/`；崩溃自动重启，指数退避，最多 5 次。
- HTTP：只允许 https（本机地址需高级设置允许，`S.08-R9`）。
- 工具映射：每个工具注册为 `mcp:<服务>/<工具>`；风险 = max(`RiskOverrides` → `RiskDefault` → L2，`annotations` 推出的下限)：`readOnlyHint` 可以降到 L0（仅当用户未覆盖），`destructiveHint` 至少 L2。
- 结果：text 合并进 Summary / Snippets；image、resource 存工作区返回引用；**一律污染**（`S.08-R10`）。

## 6. 不变量
- MCP 工具与内置工具走完全相同的授权和审批路径
- stdio 子进程看不到 anydoor 的环境变量

## 7. 错误处理
连接失败：服务状态为 error，工具调用返回 transient"MCP 服务「x」不可用"；协议错误：user_input。

## 8. 验收标准
1. 接入一个 stdio 测试服务和一个 HTTP 测试服务（M2 验收）
2. 新工具默认禁用
3. 子进程环境变量隔离
4. 崩溃重启与退避

### 实施卡
- 要建 / 要改的文件：`engine/mcp/*.go`、`testdata/mcp/echo-server/*（测试用 MCP 服务）`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E12-T1 两种传输`
  - `E12-T2 工具列表变化`
  - `E12-T3 环境隔离`
  - `E12-T4 重启退避`
  - `E12-T5 风险推导`
- 允许使用的依赖：`modelcontextprotocol/go-sdk`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §2 首次启用确认界面的归属改为 `W.09.04`（MCP 在中心窗口的"包"分区） | 第 9 棒；`P.09` K156 |
| 2026-11-24 | ADR-005 已被取代，依赖依据改为 `G.10` | `P.09` K250 |
