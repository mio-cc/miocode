# B.01 后端总则

| 项 | 内容 |
|---|---|
| 编号 | B.01 |
| 类型 | 规范 |
| 上级 | B 后端服务 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 进程模型
- 一个进程 `anydoor`：HTTP 服务、内核、产品层、后台维护都在同一个进程里。
- 同一个数据目录只能运行一个实例（`B.07.04`）。
- 默认只有一个用户 `user:local`（`P.02`）。

## 2. 包依赖
```
cmd/anydoor ──► internal/api ──► internal/app ──► engine
     │                │   └────► internal/sse ──► engine/obs（订阅广播）
     │                └────────► internal/platform
     └──────────────────────────► internal/platform
```
| 包 | 可以 import | 不可以 import |
|---|---|---|
| `internal/platform/*` | 标准库、已登记依赖、`gen` | `engine/**`（只通过 `engine.SecretResolver` 等接口被注入）、`internal/api`、`internal/app` |
| `internal/app/*` | `engine/**`、`internal/platform` 的接口、`gen` | `internal/api`、`internal/sse` |
| `internal/sse` | `engine/obs`、`engine/store`、`gen` | `internal/app`、`internal/api` |
| `internal/api` | `internal/app` 暴露的接口、`internal/sse`、`internal/platform/auth`、`engine` 的公开方法、`gen` | `internal/app` 的实现细节 |
| `cmd/anydoor` | 全部 | — |

## 3. 启动顺序
1. 解析命令行、加载配置（`B.07.03`）。
2. 确定数据目录并创建子目录（`B.07.05`）。
3. 取单实例锁；已有实例在运行：打开浏览器到已有实例，退出（`B.07.04`）。
4. 初始化日志（`G.12`）。
5. 打开数据库，执行迁移（`E.07.03`，迁移前自动备份）。
6. 初始化平台层：密钥库、本机 token。
7. 组装内核 `engine.New(Deps)`：加载内置资产、已安装扩展包、MCP 配置（懒连接）。
8. 恢复未完成的运行（`E.16.04`）。
9. 启动后台维护任务（`B.09`）。
10. 启动 HTTP 服务，选端口，写 `<DataDir>/port`。
11. 打开浏览器（`server.open_browser`）。

任何一步失败：按相反顺序清理已初始化的部分，打印一句人能看懂的错误（"端口 7300 被占用"、"数据库需要更新版本的 Anywhere Door"），退出码非 0。

## 4. 优雅关闭
收到 SIGINT / SIGTERM（Windows：Ctrl+C、控制台关闭事件）或 `POST /api/v1/admin/shutdown`：
1. HTTP 停止接受新请求；SSE 连接发送 `event: shutdown` 后关闭。
2. 运行管理器停止派发新节点；正在执行的节点等到下一个安全点或最多 10 秒（`G.05.02-R8`）；未完成的运行保持 running 状态（下次启动恢复）。
3. 刷新事件写入缓冲、关闭写队列（`E.07.04`）。
4. 关闭 MCP 子进程、数据库、释放单实例锁、删除 `<DataDir>/port`。
5. 总时限 15 秒；超时强制退出（下次启动靠恢复保证正确性）。

## 5. 规则
- **B.01-R1** 依赖方向由 `tools/depcheck` 检查（规则写进 `tools/depcheck/rules.yaml`）。
- **B.01-R2** 任何 goroutine 都要在关闭流程里结束（`G.05.02`）。
- **B.01-R3** 进程崩溃不能导致数据不一致：正确性只依赖事件日志和事务，不依赖优雅关闭。
