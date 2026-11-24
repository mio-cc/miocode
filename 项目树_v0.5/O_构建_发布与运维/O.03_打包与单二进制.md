# O.03 打包与单二进制

| 项 | 内容 |
|---|---|
| 编号 | O.03 |
| 类型 | 实施 |
| 上级 | O 构建、发布与运维 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引15 §6；ADR-004；`B.02`；`S.12-R6`；`P.09` K186、K190 |
| 最后修改 | 2026-11-24 |

## 1. 职责
`tools/release`：把同一个提交交叉编译成六个平台的 `anydoor`、`anydoorctl`，连同说明文件打成归档，生成 SHA-256 校验和，确认嵌入完整、可复现，并在能运行的平台上做启动冒烟。M0 到 M4 产出的是预览版（`O-R6`）；M0 结束时发第一个预览版 `0.1.0-preview`（`P.09` K241）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 单个平台的构建与版本信息注入 | `O.01` 的 `tools/build`（本节点逐个平台调用它） |
| 代码签名、macOS 公证、SBOM、安装包（MSI、dmg） | `O.04`、`O.05`（M5） |
| 自动更新 | `O.06` |
| 程序启动后怎么服务嵌入的前端 | `B.02` |
| 内置资产（NodeDef、模板、消息文案）怎么嵌入 | 各自所在的 Go 包（`schema/builtin` 由 `E.03`、`templates/` 由 `B.06.05` 用各自的 `go:embed`）；本节点只检查程序能读到它们（§6.4） |

## 3. 继承的上级约束
`O-R1`–`R6`；ADR-004；`P.02`（三个操作系统）；`B.02` §4–§6；`B.07.05`（数据目录）；`G.07-R7`、`R8`；`G.09-R1`、`R2`；`G.17`（`LICENSE`、`NOTICE`）；`S.12-R6`。

## 4. 接口
```
go run ./tools/release [-version-check] [-only os/arch] [-out dist/]
go run ./tools/release -smoke <anydoor 程序的路径>        只做 §6.4（O.02 的 build 任务用）
```
- `-prev-sizes <文件>`：上一个版本的 `sizes.txt`，有就按 §6.3 比较大小。
- 版本号取 `tools/build` 构建完打印的那一行（`已构建 <程序>（<版本>，<os>/<arch>）`），不另算；六个平台的版本号必须相同。构建信息里读不到：Go 在 `-trimpath` 时不记录 `-ldflags`（K246）。
| 平台（`GOOS/GOARCH`） | 归档 | 能否在开发机上冒烟 |
|---|---|---|
| `windows/amd64` | `.zip` | 能（开发机是 Windows） |
| `windows/arm64` | `.zip` | 不能，只检查 §6.3 |
| `darwin/arm64` | `.tar.gz` | 不能，只检查 §6.3 |
| `darwin/amd64` | `.tar.gz` | 不能，只检查 §6.3 |
| `linux/amd64` | `.tar.gz` | 不能，只检查 §6.3 |
| `linux/arm64` | `.tar.gz` | 不能，只检查 §6.3 |

产物（`dist/`）：
```
anydoor-<版本>-<os>-<arch>.<zip|tar.gz>
  └─ anydoor-<版本>-<os>-<arch>/
     ├─ anydoor(.exe)       主程序：双击或在终端运行，自动打开浏览器
     ├─ anydoorctl(.exe)     命令行工具（B.08），不运行它也能正常使用 anydoor
     ├─ README.txt           中文：怎么启动、数据存在哪、怎么停止、预览版的提示（§6.5）
     ├─ LICENSE  NOTICE      G.17（仓库里还没有时跳过并打印警告，见 §8）
     └─ CHANGELOG.md         本版本那一节
SHA256SUMS.txt               每个归档一行：<哈希>  <文件名>
```
`<版本>` 由 `O.01` §4.2 的规则得到，预览版形如 `0.1.0-preview`。

## 5. 数据结构
无。

## 6. 行为

### 6.1 步骤
1. `-version-check`（发布时总是带）：当前提交必须正好在一个 `v*` 标签上，且工作区干净；否则退出 1。
2. 前端只构建一次：`pnpm -C web build`。
3. 对六个平台依次 `go run ./tools/build -os … -arch … -out dist/tmp/<os>-<arch> -preview`（`O-R6`：`O.04` 完成前一律带 `-preview`）。
4. 每个平台做 §6.3 的检查，再按 §4 打包；归档里的文件按名字排序、修改时间统一设为提交时间、权限统一（可执行文件 0755，其余 0644），保证归档本身也可复现。
5. 写 `SHA256SUMS.txt`。
6. 验证者在开发机上再执行一遍 1–5 到另一个目录，两次的 `SHA256SUMS.txt` 必须完全相同（`S.12-R6`）。产物怎么发出去（GitHub Releases 手动上传，或只打标签）待用户决定（`P.09` Q28）；发布说明里贴本版本的变更日志与支持的 schema 版本范围（`G.09-R1`）。
7. 第 1–6 步之前，先在开发机上对 `windows/amd64` 的程序做 §6.4 冒烟（`go run ./tools/build -preview` 后 `go run ./tools/release -smoke bin/anydoor.exe`）；macOS、Linux 只做 §6.3 的检查（不用 GitHub Actions，K248）。

### 6.2 嵌入的内容
- `cmd/anydoor/dist/`：前端生产构建，含自托管字体（`U.04`、`O.01` §6）。
- 不嵌入：`web/dist-perf/`、组件陈列页、测试工具、`schema/examples/`、`testdata/`（`O-R5`）。
- 以后内置的 wazero 运行时文件（`E.11.06`，M2 起）随程序嵌入，并按 `S.12-R8` 记录来源和哈希；那时在本文补一行。

### 6.3 每个平台都做的检查（不需要运行程序）
- `debug/buildinfo` 读程序的构建信息：`CGO_ENABLED=0`、`-trimpath`、`GOOS` / `GOARCH` 与目标一致，模块版本与 `go.sum` 一致。
- 程序里能找到嵌入的 `index.html`（读取 Go 的 `embed` 文件表，或在程序文件里查找 `index.html` 的内容；不用运行程序）。M0 的前端还是 `W.02` 的空白页桩，它就是要验收的"空白前端"。
- 大小记录进 `dist/sizes.txt`，与上一个标签相比增长超过 20% 时打印警告（不失败）。

### 6.4 冒烟（开发机上的 `windows/amd64`；`O.02` §4.2 的合并前检查也做）
1. `anydoor --version`：输出版本、提交、时间与 `O.01` §4.2 一致。
2. 用临时数据目录启动：`anydoor --no-browser --fake-llm --port 0 --data-dir <临时目录>`；从标准输出"Anywhere Door 已启动：<地址>"那一行读出带 token 的地址（`B.02` §4）。30 秒内没读到算失败。
3. `GET /api/v1/health` 正常；用读到的带 token 地址请求 `/`，带着 cookie 跟随跳转后得到 `index.html`，内容含前端入口脚本；请求 `index.html` 里引用的第一个 `assets/` 文件返回 200 且带长缓存头（`B.02` §5）。
4. 发送关闭信号（Windows 上用 `POST /api/v1/admin/shutdown`，带 Bearer token；其他平台用 SIGINT），15 秒内退出，退出码 0（`B.02` §8）；临时目录删除。

M1 起在第 3 步后加回"`GET /api/v1/nodedefs` 返回 13 个原子节点（证明内置资产已嵌入）"，它要 `E.03` 和 `B.04` 的节点定义接口（`P.09` K243）。
这几步就是 `P.07` M0"三个平台都能启动并打开空白前端"的自动验收。

### 6.5 预览版的提示（写在 `README.txt` 和 Release 说明里）
- 这是未签名的预览版，只用于内部试用。
- Windows：首次运行时 SmartScreen 可能拦截，选"更多信息 → 仍要运行"。
- macOS：首次运行被拦截时，在"系统设置 → 隐私与安全性"里允许，或在终端执行 `xattr -d com.apple.quarantine anydoor`。
- 数据目录的位置（`B.07.05`）；怎么停止：在运行它的终端窗口按 Ctrl+C，或关闭这个窗口。

## 7. 不变量
- 六个平台的程序来自同一个提交、同一份前端产物。
- 同一提交、同一工具版本，两次运行 `tools/release` 得到完全相同的 `SHA256SUMS.txt`。
- 程序不依赖任何外部文件就能运行（`B.02` §6）。

## 8. 错误处理
| 情况 | 结果 |
|---|---|
| 不在标签上或工作区不干净（带 `-version-check`） | 退出 1，不产出任何文件 |
| 某个平台编译失败 | 整个发布失败，不上传任何产物 |
| §6.3 或 §6.4 任一项不通过 | 同上，写出平台和失败项 |
| 两次构建哈希不同 | 同上，并保留两份产物供比较 |
| 仓库里没有 `LICENSE` / `NOTICE`（`G.17` 还没落地） | 打印警告，归档里不放，不算失败（用户决定先不处理许可证，`O-R7`） |

## 9. 性能与资源
六个平台全部完成（含两遍可复现检查）≤ 20 分钟。

## 10. 验收标准
1. M0 结束时在 `v0.1.0` 标签上运行 `go run ./tools/release -version-check`：产出六个归档和 `SHA256SUMS.txt`，文件名带 `preview`；怎么发出去见 `P.09` Q28。
2. `windows/amd64` 通过 §6.4 全部四步；另外五个通过 §6.3。
3. 两遍构建的 `SHA256SUMS.txt` 完全相同；在另一台装了相同工具版本的电脑上运行 `go run ./tools/release -only linux/amd64`，得到的哈希与开发机相同。
4. 解压任一归档，不安装任何东西，直接运行 `anydoor` 能打开空白前端（在 Windows 11、macOS 14、Ubuntu 24.04 上人工各试一次，记录在 Release 说明里）。
5. 不在标签上运行 `go run ./tools/release -version-check` → 退出 1。

### 实施卡
- 要建 / 要改的文件：`tools/release/main.go`、`tools/release/archive.go`、`tools/release/inspect.go`、`tools/release/smoke.go`、`tools/release/release_test.go`、`tools/release/README.txt.tmpl`（`.github/workflows/release.yml` 已随 K248 删除）
- 不许碰的文件：`tools/build/`（只调用）、`cmd/`、`engine/`、`internal/`、`web/`、`schema/`、`gen/`
- 函数签名：
  ```go
  func Targets() []Target                                   // §4 的六个
  func Archive(dir string, t Target, version string, mtime time.Time) (path string, err error)
  func Inspect(bin string, t Target) error                  // §6.3
  func checkBuildInfo(bi *debug.BuildInfo, t Target) error  // Inspect 里读构建信息的那一半，可单独测
  func checkEmbedded(bin, index []byte) error               // Inspect 里查嵌入的另一半：程序里能找到 cmd/anydoor/dist/index.html 的全文
  func Smoke(ctx context.Context, bin string) error         // §6.4
  ```
- 测试用例：
  - `O03-T1 目标`：`Targets()` 恰好是六个，归档格式与 §4 一致
  - `O03-T2 归档可复现`：同样的输入打包两次，字节相同；文件顺序、时间、权限符合 §6.1 第 4 步；`.zip` 和 `.tar.gz` 各一次
  - `O03-T3 检查`：测试里用 `CGO_ENABLED=0 go build -trimpath` 构建 `./cmd/anydoor`，读出的构建信息 `checkBuildInfo` 通过；`checkBuildInfo` 对造出来的 `CGO_ENABLED=1`、缺 `-trimpath`、`GOARCH` 不对三种构建信息各自失败（不真的用 cgo 构建，开发机没有 C 编译器，K243）；`checkEmbedded` 在含有 index 全文的字节里通过、不含时失败。`Inspect` 整体在发布时跑（单元测试不依赖已构建的前端，K246）
  - `O03-T4 冒烟`：测试里临时编译一个照 `B.02` §4–§5 行为的假程序（只用标准库）：正常时 `Smoke` 通过；`/` 返回不含入口脚本的页面 → 第 3 步失败；启动后不打印"已启动"那一行 → 第 2 步失败。真程序的冒烟在 `O.02` §4.2 的合并前检查和发布时跑（单元测试不依赖已构建的前端，K246）
  - `O03-T5 版本检查`：§10 验收 5（在临时目录里建一个没有标签的 git 仓库）
- 人工验收（不算本叶子的完成条件，不算 `relay check` 第 ⑤ 项；M0 结束打 `v0.1.0` 标签时做，K241、K243）：§10 验收 1、3、4。
- 允许使用的依赖：Go 标准库（`archive/zip`、`archive/tar`、`compress/gzip`、`debug/buildinfo`、`crypto/sha256`）。
- 禁止事项：`G.02.05` 全部；另：不在 `O.04` 完成前去掉 `-preview`；不签名、不上传到代码仓库以外的地方；不在归档里放 `testdata/`、示例或测试工具。
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K186、K190 |
| 2026-11-24 | 第 ⑧b 片（`m0-ci`）开工前复查：M0 结束发 `0.1.0-preview`（用户决定）；冒烟去掉 `nodedefs` 一步（M1 加回），写明怎么读地址、怎么关闭；加 `-smoke`；`Inspect` 的失败一面用造出来的构建信息测；没有 `LICENSE` 时只警告；§10 验收 1、3、4 改为人工验收；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K241、K243 |
| 2026-11-24 | §6.3 不再把 `STUB(` 开头的 `index.html` 当占位页（M0 的前端就是它） | `P.09` K243 |
| 2026-11-24 | 写代码前补细节：版本号从构建信息读；`-prev-sizes`；`release.yml` 先冒烟再发布；`O03-T3`、`O03-T4` 改为不依赖已构建的前端，真程序的检查和冒烟在 CI 里跑 | `P.09` K246 |
| 2026-11-24 | 不用 GitHub Actions：去掉 `release.yml`，发布时由验证者在开发机上两遍打包比较；冒烟只在开发机的 `windows/amd64` 上做；产物怎么发出去待用户决定 | `P.09` K248、Q28 |
