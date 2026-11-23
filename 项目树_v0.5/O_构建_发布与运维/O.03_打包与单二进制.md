# O.03 打包与单二进制

| 项 | 内容 |
|---|---|
| 编号 | O.03 |
| 类型 | 实施 |
| 上级 | O 构建、发布与运维 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 §6；ADR-004；`B.02`；`S.12-R6`；`P.09` K186、K190 |
| 最后修改 | 2026-11-23 |

## 1. 职责
`tools/release`：把同一个提交交叉编译成六个平台的 `anydoor`、`anydoorctl`，连同说明文件打成归档，生成 SHA-256 校验和，确认嵌入完整、可复现，并在能运行的平台上做启动冒烟。M0 到 M4 产出的是预览版（`O-R6`）。

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
```
| 平台（`GOOS/GOARCH`） | 归档 | 能否在 CI 上运行冒烟 |
|---|---|---|
| `windows/amd64` | `.zip` | 能（windows 运行器） |
| `windows/arm64` | `.zip` | 不能，只检查 §6.3 |
| `darwin/arm64` | `.tar.gz` | 能（macos 运行器） |
| `darwin/amd64` | `.tar.gz` | 不能，只检查 §6.3 |
| `linux/amd64` | `.tar.gz` | 能（ubuntu 运行器） |
| `linux/arm64` | `.tar.gz` | 不能，只检查 §6.3 |

产物（`dist/`）：
```
anydoor-<版本>-<os>-<arch>.<zip|tar.gz>
  └─ anydoor-<版本>-<os>-<arch>/
     ├─ anydoor(.exe)       主程序：双击或在终端运行，自动打开浏览器
     ├─ anydoorctl(.exe)     命令行工具（B.08），不运行它也能正常使用 anydoor
     ├─ README.txt           中文：怎么启动、数据存在哪、怎么停止、预览版的提示（§6.5）
     ├─ LICENSE  NOTICE      G.17
     └─ CHANGELOG.md         本版本那一节
SHA256SUMS.txt               每个归档一行：<哈希>  <文件名>
```
`<版本>` 由 `O.01` §4.2 的规则得到，预览版形如 `0.1.0-preview`。

## 5. 数据结构
无。

## 6. 行为

### 6.1 步骤
1. `-version-check`（`release.yml` 里总是带）：当前提交必须正好在一个 `v*` 标签上，且工作区干净；否则退出 1。
2. 前端只构建一次：`pnpm -C web build`。
3. 对六个平台依次 `go run ./tools/build -os … -arch … -out dist/tmp/<os>-<arch> -preview`（`O-R6`：`O.04` 完成前一律带 `-preview`）。
4. 每个平台做 §6.3 的检查，再按 §4 打包；归档里的文件按名字排序、修改时间统一设为提交时间、权限统一（可执行文件 0755，其余 0644），保证归档本身也可复现。
5. 写 `SHA256SUMS.txt`。
6. `release.yml` 里再执行一遍 1–5 到另一个目录，两次的 `SHA256SUMS.txt` 必须完全相同（`S.12-R6`），然后作为"预发布"上传到代码仓库的 GitHub Releases，说明里贴本版本的变更日志与支持的 schema 版本范围（`G.09-R1`）。

### 6.2 嵌入的内容
- `cmd/anydoor/dist/`：前端生产构建，含自托管字体（`U.04`、`O.01` §6）。
- 不嵌入：`web/dist-perf/`、组件陈列页、测试工具、`schema/examples/`、`testdata/`（`O-R5`）。
- 以后内置的 wazero 运行时文件（`E.11.06`，M2 起）随程序嵌入，并按 `S.12-R8` 记录来源和哈希；那时在本文补一行。

### 6.3 每个平台都做的检查（不需要运行程序）
- `go version -m <程序>`：`CGO_ENABLED=0`、`-trimpath`、`GOOS` / `GOARCH` 与目标一致，模块版本与 `go.sum` 一致。
- 程序里能找到嵌入的 `index.html`（读取 Go 的 `embed` 文件表；不用运行程序）。
- 大小记录进 `dist/sizes.txt`，与上一个标签相比增长超过 20% 时打印警告（不失败）。

### 6.4 冒烟（能运行的三个平台，`O.02` 的 `build` 任务也做）
1. `anydoor --version`：输出版本、提交、时间与 `O.01` §4.2 一致。
2. 用临时数据目录启动：`anydoor --no-browser --fake-llm --port 0 --data-dir <临时目录>`；从标准输出读出地址（`B.02` §5）。
3. `GET /api/v1/health` 正常；用打印的带 token 地址请求 `/`，跟随跳转后得到 `index.html`，内容含前端入口脚本；请求一个 `assets/` 下的文件返回 200 且带长缓存头（`B.02` §5）。
4. `GET /api/v1/nodedefs` 返回 13 个原子节点（证明内置资产已嵌入）。
5. 发送关闭信号，15 秒内退出，退出码 0（`B.02` §8）；临时目录删除。
这一步就是 `P.07` M0"三个平台都能启动并打开空白前端"的自动验收。

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

## 9. 性能与资源
六个平台全部完成（含两遍可复现检查）≤ 20 分钟。

## 10. 验收标准
1. 在 `v0.1.0` 标签上运行 `release.yml`：产出六个归档和 `SHA256SUMS.txt`，作为"预发布"出现在 GitHub Releases，文件名带 `preview`。
2. 三个能运行的平台通过 §6.4 全部五步；另外三个通过 §6.3。
3. 两遍构建的 `SHA256SUMS.txt` 完全相同；在另一台装了相同工具版本的电脑上本地运行 `go run ./tools/release -only linux/amd64`，得到的哈希与 CI 相同。
4. 解压任一归档，不安装任何东西，直接运行 `anydoor` 能打开空白前端（在 Windows 11、macOS 14、Ubuntu 24.04 上人工各试一次，记录在 Release 说明里）。
5. 不在标签上运行 `go run ./tools/release -version-check` → 退出 1。

### 实施卡
- 要建 / 要改的文件：`tools/release/main.go`、`tools/release/archive.go`、`tools/release/inspect.go`、`tools/release/smoke.go`、`tools/release/release_test.go`、`tools/release/README.txt.tmpl`；`.github/workflows/release.yml`（`O.02` 建了入口，本叶子写全部步骤）。
- 不许碰的文件：`tools/build/`（只调用）、`cmd/`、`engine/`、`internal/`、`web/`、`.github/workflows/ci.yml`、`nightly.yml`。
- 函数签名：
  ```go
  func Targets() []Target                                   // §4 的六个
  func Archive(dir string, t Target, version string, mtime time.Time) (path string, err error)
  func Inspect(bin string, t Target) error                  // §6.3
  func Smoke(ctx context.Context, bin string) error         // §6.4
  ```
- 测试用例：
  - `O03-T1 目标`：`Targets()` 恰好是六个，归档格式与 §4 一致
  - `O03-T2 归档可复现`：同样的输入打包两次，字节相同；文件顺序、时间、权限符合 §6.1 第 4 步
  - `O03-T3 检查`：用本机构建的程序 `Inspect` 通过；用 `CGO_ENABLED=1` 构建的样例 → 失败
  - `O03-T4 冒烟`：本机构建的程序 `Smoke` 通过；把 `cmd/anydoor/dist` 换成只有占位文件再构建 → 第 3 步失败
  - `O03-T5 版本检查`：§10 验收 5
- 允许使用的依赖：Go 标准库（`archive/zip`、`archive/tar`、`compress/gzip`、`debug/buildinfo`、`crypto/sha256`）。
- 禁止事项：`G.02.05` 全部；另：不在 `O.04` 完成前去掉 `-preview`；不签名、不上传到代码仓库以外的地方；不在归档里放 `testdata/`、示例或测试工具。
- 完成标志：`G.14` 全部条件；§10 五条验收通过。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K186、K190 |
