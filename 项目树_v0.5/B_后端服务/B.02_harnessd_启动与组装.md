# B.02 harnessd 启动与组装

| 项 | 内容 |
|---|---|
| 编号 | B.02 |
| 类型 | 实施 |
| 上级 | B 后端服务 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 职责
`harnessd` 的入口：解析参数、组装平台层、内核、产品层、HTTP 服务，提供开发模式（代理到 Vite）和生产模式（嵌入前端产物），启动后打开浏览器。

## 2. 不做什么
- 不实现任何业务逻辑
- 不包含发布打包（`O.03`）

## 3. 继承的上级约束
`B.01` §3、§4、`G.11`、`G.15` §4、ADR-004。

## 4. 接口
命令行参数（与 `G.11` §3 一致）：
```
harnessd [--data-dir DIR] [--port N] [--no-browser] [--dev] [--fake-llm] [--log-level debug|info|warn|error] [--version]
```
```go
// cmd/harnessd/main.go
func main() { os.Exit(run(context.Background(), os.Args[1:], os.Stdout, os.Stderr)) }
func run(ctx context.Context, args []string, stdout, stderr io.Writer) int   // 可测试

// cmd/harnessd/embed.go
//go:embed all:dist
var webDist embed.FS              // 构建时由 make build 把 web/dist 复制到 cmd/harnessd/dist
```

## 5. 行为
- **组装**：`platform.Open(cfg)` → `engine.New(Deps{Store, Blobs, Clock: RealClock, Secrets: platform.Secrets, …})` → `app.New(engine, platform)` → `api.NewServer(app, engine, sse, auth)`。
- **路由**：`/api/` 前缀交给 API 处理；其他路径：
  - 生产模式：静态文件服务 `webDist`；未命中的路径返回 `index.html`（前端路由）；静态资源带长缓存头（文件名含哈希），`index.html` 不缓存。嵌入目录里只有占位文件 `.gitkeep`（没有先构建前端就编译了程序，`O.01` §6）时，`/` 返回一页静态说明"前端还没有构建：在仓库根运行 make build（或 task build）"，`/api/` 照常工作（`P.09` K187）。
  - 开发模式 `--dev`：反向代理到 `http://127.0.0.1:5173`（Vite），包括热更新的 WebSocket；日志醒目提示开发模式（`S.02-R9`）。
- **端口**：`server.port=0` 时优先尝试 7300，被占用则让系统分配；实际端口写 `<DataDir>/port`。
- **打开浏览器**：URL 为 `http://127.0.0.1:<端口>/?t=<token>`（`B.03.05`）；`--no-browser` 时把这个地址打印到终端。
- `--fake-llm`：注册 fake 提供方并设为默认，所有模型资源都解析到它（`E.10.08`）；顶部条显示"演示模式"。
- `--version`：打印版本、提交、构建时间、支持的 schema 版本范围（`G.09-R1`）。"构建时间"取提交时间，保证同一提交的构建可复现（`O.01` §4.2、`S.12-R6`，`P.09` K186）。

## 6. 不变量
- 生产模式下二进制不依赖任何外部文件（前端、字体、内置资产都已嵌入）
- `run` 函数可以在测试里完整启动和关闭

## 7. 错误处理
启动失败：按 `B.01` §3 输出人能看懂的错误、退出码 1；端口全部失败：退出码 2；数据库版本过新：退出码 3。

## 8. 验收标准
1. `run` 在临时数据目录启动、请求 `/api/v1/health`、发送关闭信号后 15 秒内退出
2. 开发模式代理到假的 Vite 服务
3. 生产模式前端路由回退到 index.html
4. 第二个实例启动时打开已有实例并退出

### 实施卡
- 要建 / 要改的文件：`cmd/harnessd/main.go`、`cmd/harnessd/run.go`、`cmd/harnessd/embed.go`、`cmd/harnessd/static.go`、`cmd/harnessd/devproxy.go`、`cmd/harnessd/run_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B02-T1 启动与关闭`
  - `B02-T2 开发代理`
  - `B02-T3 前端回退`
  - `B02-T4 单实例转交`
  - `B02-T5 --version`
  - `B02-T6 未构建前端`：只有占位文件时 `/` 返回说明页、`/api/v1/health` 正常
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §5 `--version` 的构建时间取提交时间；未构建前端时的说明页；测试 `B02-T6` | 第 10 棒写 `O.01`；`P.09` K186、K187 |
