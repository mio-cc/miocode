# B.02 anydoor 启动与组装

| 项 | 内容 |
|---|---|
| 编号 | B.02 |
| 类型 | 实施 |
| 上级 | B 后端服务 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引15 |
| 最后修改 | 2026-11-24 |

## 1. 职责
`anydoor` 的入口：解析参数、组装平台层、存储、（M1 起）内核和产品层、HTTP 服务，提供开发模式（代理到 Vite）和生产模式（嵌入前端产物），启动后打开浏览器；收到关闭信号时按 `B.01` §4 关闭。

## 2. 不做什么
- 不实现任何业务逻辑
- 不包含发布打包（`O.03`）
- M0 不组装内核和产品层（`engine.New`、`app.New` M1 才有，`P.09` K242）

## 3. 继承的上级约束
`B.01` §3、§4、`G.11`、`G.15` §4、ADR-004、`S.02-R1`、`R9`、`R10`；平台层接口以冻结的 `B.07.01`–`B.07.05` 为准。

## 4. 接口
命令行参数（与 `G.11` §3 一致，由 `config.ParseArgs` 解析）：
```
anydoor [--data-dir DIR] [--port N] [--no-browser] [--dev] [--fake-llm] [--log-level debug|info|warn|error] [--version]
```
```go
// cmd/anydoor/main.go
func main() { os.Exit(run(signalContext(), os.Args[1:], os.Stdout, os.Stderr)) }  // 控制台编码见 §5
func run(ctx context.Context, args []string, stdout, stderr io.Writer) int        // ctx 取消即关闭；可测试

// cmd/anydoor/embed.go
//go:embed all:dist
var webDist embed.FS              // 构建时由 make build 把 web/dist 复制到 cmd/anydoor/dist

// cmd/anydoor/browser.go
var openURL = browser.OpenURL     // github.com/pkg/browser；测试里替换

// cmd/anydoor/static.go、devproxy.go
func staticHandler(dist fs.FS) http.Handler   // 生产模式；dist 是 webDist 去掉 dist/ 前缀后的子树
var viteURL = "http://127.0.0.1:5173"          // 开发模式代理的目标；测试里替换
```
**标准输出**（`O.03` §6.4 冒烟按这两行解析，不能改写法）：
- 启动成功：`Anywhere Door 已启动：<地址>`。`--no-browser` 时 `<地址>` 是带 token 的 `http://127.0.0.1:<端口>/?t=<token>`；否则不带 token（`http://127.0.0.1:<端口>/`），带 token 的地址只交给浏览器。
- 转交给已有实例：`Anywhere Door 已在运行：<地址>`，规则同上。

## 5. 行为
- **组装（M0，`P.09` K242）**：
  1. `config.ParseArgs(args)`；`--version` 时打印版本信息后退出码 0（不碰数据目录）。
  2. `datadir.Resolve(a.DataDir, a.Dev)` → `datadir.Open`。
  3. `config.Load(a, os.Environ(), d, config.Options{…})`；把 `Warnings()` 写进日志。
  4. `lock.Acquire(d)`；返回 `Instance` 时走"已有实例"。
  5. **日志**：`log/slog` 文本格式，同时写标准错误和 `<DataDir>/logs/anydoor-YYYYMMDD.log`（`datadir.Logs()`，按启动当天的本地日期，追加写），级别取 `log.level`。脱敏规则等 `G.12` 复查时补。
  6. `sqlite.Open(ctx, d.DB(), …)`（`E.07.03`，迁移前自动备份）。
  7. `auth.Open(ctx, d, store.Settings(), auth.Options{})`。
  8. `secret.Open(ctx, d, secret.Options{Dev: a.Dev, Logger: …})`；M0 只打开，不交给任何人（M1 交给内核）。
  9. 监听（下一条）→ `api.NewServer(api.Deps{Auth, Port, Version, Dev, Static, Shutdown, Logger})` → `lock.WritePort(port)` → 开始服务 → 打印"已启动"那一行 → 打开浏览器。
  - M1 起在第 8 步和第 9 步之间加 `engine.New`、`app.New`、`--fake-llm` 的模型注册（`E.10.08`），并在本节写明。
- **监听**（`S.02-R1`）：先监听 `127.0.0.1:<端口>`：`server.port` 不为 0 时用它，失败退出码 2；为 0 时先试 7300，被占用则让系统分配。再尝试 `[::1]:<同一端口>`：失败（没有 IPv6）只写一行 debug 日志，不算启动失败。不监听 `0.0.0.0` 或其他地址。
- **路由**：`/api/` 和引导（`/?t=`）由 `api.Server` 处理（`B.03.05`）；其他路径交给 `Deps.Static`：
  - 生产模式：静态文件服务 `webDist`；未命中的路径返回 `index.html`（前端路由）；`assets/` 下的文件（文件名含哈希）带 `Cache-Control: public, max-age=31536000, immutable`，`index.html` 带 `Cache-Control: no-cache`。嵌入目录里只有占位文件（没有先构建前端就编译了程序，`O.01` §6；判断方法：嵌入目录里没有 `index.html`。`web` 的桩页面 `STUB(W.02)` 是正常构建出来的空白前端，照常服务）时，`/` 返回一页静态说明"前端还没有构建：在仓库根运行 make build（或 task build）"，`/api/` 照常工作（`P.09` K187）。
  - 开发模式 `--dev`：反向代理到 `http://127.0.0.1:5173`（Vite），包括热更新的 WebSocket；启动日志醒目提示"开发模式，不要用于日常使用"（`S.02-R9`）。
- **已有实例**（`B.01` §3 第 3 步，`P.09` K240）：`lock.Acquire` 返回 `Instance` 时 `lock.Probe`（1 秒超时）；不通就等 3 秒再探一次。存活：打开浏览器到 `http://127.0.0.1:<端口>/?t=<token>`（token 用 `auth.ReadToken`；`--no-browser` 时不打开），打印"已在运行"那一行，退出码 0；仍不通：打印"另一个 Anywhere Door 进程没有响应（PID <n>），请结束它后重试"，退出码 1。
- **打开浏览器**：`server.open_browser` 为 true（没写 `--no-browser`）时 `openURL(带 token 的地址)`；失败只写一行警告，并把带 token 的地址打印到终端。
- `--fake-llm`：M0 只由 `config` 记成 `models.demo_mode`，不做别的事，启动日志写一行"--fake-llm 在 M1 起生效"；M1 起注册 fake 提供方并设为默认（`E.10.08`），顶部条显示"演示模式"。
- **关闭**（`B.01` §4 的 M0 部分）：`ctx` 取消（`main` 里是 SIGINT / SIGTERM；Windows 的 Ctrl+C、关闭控制台窗口由 Go 转成这两个信号）或 `Deps.Shutdown` 被调用时：`http.Server.Shutdown` → 关闭存储 → `lock.Release`（会删掉 `<DataDir>/port`）→ 关闭日志文件；总时限 15 秒，超时退出码 1。正常关闭打印"Anywhere Door 已退出"，退出码 0。
- **Windows 控制台编码**：启动时把控制台输出代码页设为 UTF-8（`SetConsoleOutputCP(65001)`），退出时恢复原值；没有控制台时什么也不做（`P.09` K198）。沿用现有的 `console_windows.go`、`console_other.go`，只去掉文件开头的 `STUB(B.02)` 注释。`anydoorctl` 同样处理（`B.08`）。
- `--version`：打印版本、提交、构建时间、支持的 schema 版本范围（`G.09-R1`）。"构建时间"取提交时间，保证同一提交的构建可复现（`O.01` §4.2、`S.12-R6`，`P.09` K186）。

## 6. 不变量
- 生产模式下二进制不依赖任何外部文件（前端、字体、内置资产都已嵌入）
- `run` 函数可以在测试里完整启动和关闭，关闭后没有残留的 goroutine 和打开的文件（`B.01-R2`）
- 只监听回环地址（INV-21）

## 7. 错误处理
启动失败：按 `B.01` §3 输出人能看懂的错误（"端口 7300 被占用"、"数据库需要更新版本的 Anywhere Door"），按相反顺序清理已初始化的部分，退出码 1；指定的端口监听失败：退出码 2；数据库版本过新（`sqlite.Open` 的对应错误，`E.07.03`）：退出码 3；命令行参数不认识：退出码 2。

## 8. 验收标准
1. `run` 在临时数据目录启动、请求 `/api/v1/health`、发送关闭信号后 15 秒内退出
2. 开发模式代理到假的 Vite 服务
3. 生产模式前端路由回退到 index.html
4. 第二个实例启动时打开已有实例并退出
5. 局域网地址连不上（`S.02` §2 第 4 条）

### 实施卡
- 要建 / 要改的文件：`cmd/anydoor/main.go`、`cmd/anydoor/run.go`、`cmd/anydoor/listen.go`、`cmd/anydoor/logging.go`、`cmd/anydoor/embed.go`、`cmd/anydoor/static.go`、`cmd/anydoor/devproxy.go`、`cmd/anydoor/browser.go`、`cmd/anydoor/console_windows.go`、`cmd/anydoor/console_other.go`、`cmd/anydoor/run_test.go`、`cmd/anydoor/static_test.go`、`go.mod`、`go.sum`
- 本叶子整体替换 `cmd/anydoor` 的 4 个桩（`main.go`、`embed.go`、`console_windows.go`、`console_other.go`）；`cmd/anydoor/dist/` 里的占位文件不动。
- `go.mod` 加 `github.com/pkg/browser`（`G.10` 已登记）：验证者 `go get github.com/pkg/browser@latest` 后 `go mod tidy`；实施者不手改。写代码前请验证者用 `go doc github.com/pkg/browser` 贴出实际接口。
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/`、`web/`、`cmd/anydoorctl/`
- 测试里 `openURL` 换成记录调用的函数；`secret` 用加密文件后端（包内变量，不碰真实系统密钥库，`B.07.02`）；已有实例的重试等待缩短；数据目录用 `t.TempDir()`；要指定端口时先在测试里取一个空闲端口。
- 测试用例：
  - `B02-T1 启动与关闭`：`run(ctx, ["--data-dir", 临时目录, "--no-browser"])` 在 goroutine 里运行；从 stdout 读出"已启动"那一行的地址（带 token）；`GET /api/v1/health` 200；`<DataDir>/port` 里是这个端口；用本机的非回环 IPv4 地址（有的话）连这个端口被拒绝；取消 `ctx` 后 15 秒内返回 0，`port` 文件已删除，`logs/` 下有当天的日志文件
  - `B02-T2 开发代理`：`httptest` 起假的 Vite，把 `viteURL` 换成它的地址；`--dev` 启动后 `GET /src/main.tsx` 得到假 Vite 的内容；`/api/v1/health` 仍由本程序回答；CSP 含 `ws://127.0.0.1:5173`
  - `B02-T3 前端回退`：用 `fstest.MapFS` 造的前端产物：`/some/route` 返回 `index.html` 且 `Cache-Control: no-cache`；`/assets/app-1a2b.js` 返回文件且带长缓存头；不存在的 `/assets/x.js` → 404（不回退）
  - `B02-T4 单实例转交`：同一个数据目录先启动一个；第二次 `run` 打印"已在运行"那一行、地址带 token、返回 0；不带 `--no-browser` 时 `openURL` 被调用一次、参数是带 token 的地址；把第一个的 `port` 文件改成一个关掉的端口后，第二次 `run` 返回 1 且输出含"没有响应"
  - `B02-T5 --version`：输出含版本、提交、构建时间三行和 schema 版本范围；不创建数据目录
  - `B02-T6 未构建前端`：只有占位文件的 `fstest.MapFS`：`/` 返回说明页（含"make build"）；`/api/v1/health` 正常
  - `B02-T7 启动失败`：`--port` 指定一个已被占用的端口 → 返回 2，错误输出是一句中文、没有堆栈；不认识的参数 → 返回 2；失败后数据目录里没有 `port` 文件、锁已释放（再启动一次能成功）
  - `B02-T8 shutdown 接口`：启动后用打印的 token 作 Bearer、`POST /api/v1/admin/shutdown` → 202，`run` 在 15 秒内返回 0
- 允许使用的依赖：标准库、`github.com/pkg/browser`；内部包只 import 导出接口：`internal/platform/*`、`internal/api`、`engine/store/sqlite`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §5 `--version` 的构建时间取提交时间；未构建前端时的说明页；测试 `B02-T6` | 第 10 棒写 `O.01`；`P.09` K186、K187 |
| 2026-11-23 | §5 加 Windows 控制台编码 | 第 1 片冒烟时发现；`P.09` K198 |
| 2026-11-24 | §5 加"已有实例"的转交流程（从 `B.07.04` 移来） | `P.09` K240 |
| 2026-11-24 | 第 ⑧a 片（`m0-server`）开工前复查：M0 只组装平台层和存储（内核、产品层、`--fake-llm` 留到 M1）；日志先用 `log/slog`；监听 `::1`；标准输出两行的写法固定；关闭顺序；打开浏览器用 `pkg/browser`；实施卡按 `G.02.06-R24` 重写，加 `B02-T7`、`B02-T8`；状态改为"已审" | `P.09` K241、K242 |
| 2026-11-24 | 写代码前补细节：占位文件的判断只看有没有 `index.html`；测试里 `secret` 不碰系统密钥库 | `P.09` K242 |
