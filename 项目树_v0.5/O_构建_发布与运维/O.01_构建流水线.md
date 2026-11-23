# O.01 构建流水线

| 项 | 内容 |
|---|---|
| 编号 | O.01 |
| 类型 | 实施 |
| 上级 | O 构建、发布与运维 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01 §4（Makefile）；`G.15`；`G.16`；`B.02` §4–§5；`P.09` K186–K188 |
| 最后修改 | 2026-11-23 |

## 1. 职责
仓库根的 `Makefile`、`Taskfile.yaml` 和两个构建工具 `tools/build`、`tools/dev`：提供 `gen`、`dev`、`build`、`test`、`lint`、`check`、`e2e`、`clean` 八个目标；把前端生产构建放进 `cmd/harnessd/dist/`；构建 `harnessd`、`harnessctl` 并注入版本信息。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 生成器内部（schema → Go / TS、令牌、图标、文案、字体） | `G.16`、`C.14` 及各生成物的叶子；本节点只调用 `go run ./tools/gen` |
| CI 上怎么编排、哪些必过 | `O.02` |
| 六个平台交叉编译、归档、校验和 | `O.03`（调用本节点的 `tools/build`） |
| `harnessd` 的开发模式代理、嵌入资源的服务方式 | `B.02` |
| 各类测试的内容 | `Q`、`W.12` |

## 3. 继承的上级约束
`O-R1`–`R5`；`G.15`（全部）；`G.16` §1、清单；`G.09-R2`；`G.07-R7`；`G.03-R1`、`R6`（按 K188 修改后）；`B.02` §4（`embed.go`）、§5（按 K187 修改后）；`W.11` §4.2（性能构建不进程序）；`S.12-R6`。

## 4. 接口

### 4.1 目标
| 目标 | 做什么 | 底层命令（Windows 上直接执行这一列即可） |
|---|---|---|
| `gen` | 重新生成全部生成物 | `go run ./tools/gen`（不带子命令 = 全部：schema 类型与常量、数据表、`wire.ts`、令牌与主题、图标、文案、字体；字体输入的哈希没变时跳过子集化） |
| `dev` | 开发模式：后端 + 前端，一个终端里同时运行 | `go run ./tools/dev` |
| `build` | 生产构建：前端 → 嵌入 → `bin/harnessd`、`bin/harnessctl` | `pnpm -C web build` 然后 `go run ./tools/build` |
| `test` | Go 与前端单元测试 | `go test ./... -count=1` 然后 `pnpm -C web test` |
| `lint` | 全部静态检查 | `golangci-lint run ./...`、`go run ./tools/depcheck`、`go run ./tools/lint/quirkscheck`、`go run ./tools/lint/typenamecheck`、`pnpm -C web lint` |
| `check` | 提交前的完整检查，与 CI 必过部分一致（不含端到端和性能） | `go run ./tools/build -check`：依次执行 `gen` → 生成物与工作区无差异 → `lint` → `test` |
| `e2e` | 端到端与视觉回归 | `build` 然后 `pnpm -C web test:e2e`、`pnpm -C web test:visual`（`W.12`） |
| `clean` | 删除输出目录 | `go run ./tools/build -clean`：删除 `bin/`、`dist/`、`web/dist/`、`web/dist-perf/`、`web/.perf/`、`web/.test/`，并把 `cmd/harnessd/dist/` 恢复成只有占位文件 |

`Makefile` 与 `Taskfile.yaml` 各自声明这八个目标，每个目标只有一行，调用上表最后一列；两者的目标列表必须完全相同（`tools/build` 的测试检查）。

### 4.2 `tools/build`
```
go run ./tools/build [-os GOOS] [-arch GOARCH] [-out DIR] [-preview] [-check] [-clean]
```
- 缺省 `-os`、`-arch` 为本机，`-out` 为 `bin/`。
- 步骤：① 检查 `web/dist/index.html` 存在（不存在则提示先运行 `pnpm -C web build` 并退出 1）；② 清空 `cmd/harnessd/dist/`（保留占位文件 `.gitkeep`），把 `web/dist/` 整个复制进去；③ 以 `CGO_ENABLED=0`、`-trimpath`、`-ldflags "-s -w -X main.version=… -X main.commit=… -X main.date=…"` 构建 `./cmd/harnessd` 与 `./cmd/harnessctl`，Windows 目标加 `.exe`。
- 版本信息（`G.09-R2`、`B.02` §5 `--version`）：
  | 变量 | 取值 |
  |---|---|
  | `main.version` | 最近的 `v*` 标签去掉 `v`（`git describe --tags --match 'v*'`）；当前提交不在标签上时加 `-dev.<距离>`；工作区有未提交修改时再加 `+dirty`；仓库里还没有标签时为 `0.0.0-dev`。`-preview` 时在主版本号后加 `-preview`（`O-R6`） |
  | `main.commit` | 当前提交的完整哈希 |
  | `main.date` | 当前提交的提交时间（UTC，RFC 3339），不是当前时间（`O-R3`，`P.09` K186） |
- `tools/build` 只用 Go 标准库和 `os/exec` 调 `go`、`git`；不依赖 `make`、shell、`cp`。

### 4.3 `tools/dev`
- 同时启动 `go run ./cmd/harnessd --dev --data-dir ./.harness-dev --fake-llm=<按参数>` 和 `pnpm -C web dev`，把两边的输出加前缀 `[api]`、`[web]` 合并打印；任一进程退出或收到 Ctrl+C 时结束另一个（Windows 上用 `CTRL_BREAK_EVENT`，其他平台用 `SIGINT`）。
- 参数原样转给 `harnessd`（例如 `go run ./tools/dev -- --fake-llm`）。

### 4.4 依赖
Go 标准库；本机已装的 `go`、`git`、`node`、`pnpm`（版本按 `O-R2`）；`go run ./tools/gen`（`G.16`）；`cmd/harnessd/embed.go`（`B.02`）。

## 5. 数据结构
无。占位文件 `cmd/harnessd/dist/.gitkeep` 提交进仓库，`cmd/harnessd/dist/` 下其余文件由 `.gitignore` 忽略。

## 6. 行为
1. **嵌入目录总是存在**：`embed.go` 是 `//go:embed all:dist`；占位文件保证没构建前端时也能编译（`go run ./cmd/harnessd --dev`、`go test ./...` 不需要先构建前端）。此时生产模式下访问 `/` 返回一页静态说明"前端还没有构建：在仓库根运行 make build（或 task build）"（`B.02` §5，`P.09` K187）。
2. **输出目录**：`bin/`（本机构建）、`dist/`（`O.03` 的发布归档）、`.harness-dev/`（开发数据目录）都不提交，列入 `.gitignore`；它们是 `G.03-R1` 一级目录表之外允许出现的输出目录（`P.09` K188）。
3. **增量**：`gen` 每个生成器自己判断输入是否变化；`build` 每次完整复制前端产物（几 MB，不做增量，避免旧文件残留进程序）。
4. **失败即停**：任何一步失败立即以非零退出码结束，后面的步骤不执行。

## 7. 不变量
- `make <目标>`、`task <目标>` 与直接执行底层命令的效果完全相同。
- 程序里嵌入的前端就是本次 `pnpm -C web build` 的产物，没有旧文件。
- 构建过程不访问模型 API，不读取任何密钥（`O-R4`）。

## 8. 错误处理
| 情况 | 结果 |
|---|---|
| `web/dist/` 不存在 | 退出 1，提示先构建前端 |
| `git` 不可用或不在仓库里（例如源码压缩包） | 版本为 `0.0.0-dev`、提交为 `unknown`、时间为 `1970-01-01T00:00:00Z`，打印一行警告 |
| 工具版本与 `O-R2` 不符 | `check` 退出 1 并写出期望版本；`build` 只警告 |
| `Makefile` 与 `Taskfile.yaml` 的目标不一致 | `tools/build` 的测试失败 |

## 9. 性能与资源
在 `U.17` 的参考机上：`gen` ≤ 30 秒（字体未变时）；`build` ≤ 3 分钟；`check` ≤ 8 分钟。

## 10. 验收标准
1. 新克隆的仓库按 `G.15` §3 装好工具后，在 Windows、macOS、Linux 上 `build` 都能产出可运行的 `bin/harnessd`；Windows 上不装 `make`，用 `task build` 或底层命令同样成功。
2. 不构建前端直接 `go build ./cmd/harnessd` 成功；运行后访问 `/` 看到"前端还没有构建"的说明。
3. 同一提交连续两次 `build`，`bin/harnessd` 的 SHA-256 相同。
4. `harnessd --version` 输出的版本、提交、时间与 §4.2 一致；在 `v0.1.0` 标签上为 `0.1.0`，之后第 3 个提交为 `0.1.0-dev.3`。
5. `check` 在干净的工作区通过；手改一个生成物后 `check` 失败并指出差异文件。
6. `dev` 下按 Ctrl+C，后端和 Vite 两个进程都退出，没有残留进程（三个平台）。

### 实施卡
- 要建 / 要改的文件：`Makefile`、`Taskfile.yaml`、`tools/build/main.go`、`tools/build/version.go`、`tools/build/build_test.go`、`tools/dev/main.go`、`tools/dev/proc_windows.go`、`tools/dev/proc_other.go`、`tools/dev/dev_test.go`、`tools/versions.txt`、`cmd/harnessd/dist/.gitkeep`、`.gitignore`（加 `bin/`、`dist/`、`.harness-dev/`、`cmd/harnessd/dist/*`、`!cmd/harnessd/dist/.gitkeep`）。
- 不许碰的文件：`tools/gen/`（`G.16`）、`cmd/harnessd/*.go`（`B.02`；"前端还没有构建"页面由 `B.02` 的实施任务做）、`web/`（只调用其脚本）、`.github/`（`O.02`）、`tools/release/`（`O.03`）。
- 函数签名：命令行见 §4.2、§4.3；`tools/build/version.go`：`func Version(repoDir string, preview bool) (version, commit, date string, err error)`。
- 测试用例：
  - `O01-T1 版本`：用临时 git 仓库造出"在标签上""标签后 3 个提交""有未提交修改""没有标签""不是 git 仓库"五种情况，`Version` 结果与 §4.2、§8 一致
  - `O01-T2 目标一致`：解析 `Makefile` 与 `Taskfile.yaml`，目标名集合都等于 §4.1 的八个
  - `O01-T3 复制`：`web/dist` 样例复制进临时的 `cmd/harnessd/dist` 后文件逐个相同，旧文件被清掉，`.gitkeep` 保留
  - `O01-T4 缺前端`：`web/dist/index.html` 不存在 → 退出 1
  - `O01-T5 可复现`：§10 验收 3（CI 上每晚跑，`O.02`）
  - `O01-T6 dev 退出`：§10 验收 6（用两个假子进程代替 `harnessd` 与 Vite）
- 允许使用的依赖：Go 标准库。
- 禁止事项：`G.02.05` 全部；另：不写 shell 脚本；构建时间不取当前时间；不把 `web/dist-perf/` 或测试页面复制进 `cmd/harnessd/dist/`。
- 完成标志：`G.14` 全部条件；§10 六条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K186–K188 |
