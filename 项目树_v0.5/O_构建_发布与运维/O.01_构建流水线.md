# O.01 构建流水线

| 项 | 内容 |
|---|---|
| 编号 | O.01 |
| 类型 | 实施 |
| 上级 | O 构建、发布与运维 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引01 §4（Makefile）；`G.15`；`G.16`；`B.02` §4–§5；`P.09` K186–K188 |
| 最后修改 | 2026-11-23 |

## 1. 职责
仓库根的 `Makefile`、`Taskfile.yaml` 和三个工具 `tools/build`、`tools/dev`、`tools/relay`（代码接力，`G.02.06`）：提供 `gen`、`dev`、`build`、`test`、`lint`、`check`、`e2e`、`clean` 八个目标；把前端生产构建放进 `cmd/anydoor/dist/`；构建 `anydoor`、`anydoorctl` 并注入版本信息。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 生成器内部（schema → Go / TS、令牌、图标、文案、字体） | `G.16`、`C.14` 及各生成物的叶子；本节点只调用 `go run ./tools/gen` |
| CI 上怎么编排、哪些必过 | `O.02` |
| 六个平台交叉编译、归档、校验和 | `O.03`（调用本节点的 `tools/build`） |
| `anydoor` 的开发模式代理、嵌入资源的服务方式 | `B.02` |
| 各类测试的内容 | `Q`、`W.12` |

## 3. 继承的上级约束
`O-R1`–`R5`；`G.15`（全部）；`G.16` §1、清单；`G.09-R2`；`G.07-R7`；`G.03-R1`、`R6`（按 K188 修改后）；`B.02` §4（`embed.go`）、§5（按 K187 修改后）；`W.11` §4.2（性能构建不进程序）；`S.12-R6`。

## 4. 接口

### 4.1 目标
| 目标 | 做什么 | 底层命令（Windows 上直接执行这一列即可） |
|---|---|---|
| `gen` | 重新生成全部生成物 | `go run ./tools/gen`（不带子命令 = 全部：schema 类型与常量、数据表、`wire.ts`、令牌与主题、图标、文案、字体；字体输入的哈希没变时跳过子集化） |
| `dev` | 开发模式：后端 + 前端，一个终端里同时运行 | `go run ./tools/dev` |
| `build` | 生产构建：前端 → 嵌入 → `bin/anydoor`、`bin/anydoorctl` | `pnpm -C web build` 然后 `go run ./tools/build` |
| `test` | Go 与前端单元测试 | `go test ./... -count=1` 然后 `pnpm -C web test` |
| `lint` | 全部静态检查 | `golangci-lint run ./...`、`go run ./tools/depcheck`、`go run ./tools/lint/quirkscheck`、`go run ./tools/lint/typenamecheck`、`pnpm -C web lint` |
| `check` | 提交前的完整检查，与 CI 必过部分一致（不含端到端和性能） | `go run ./tools/build -check`：依次执行 `gen` → 生成物与工作区无差异 → `lint` → `test` |
| `e2e` | 端到端与视觉回归 | `build` 然后 `pnpm -C web test:e2e`、`pnpm -C web test:visual`（`W.12`） |
| `clean` | 删除输出目录 | `go run ./tools/build -clean`：删除 `bin/`、`dist/`、`web/dist/`、`web/dist-perf/`、`web/.perf/`、`web/.test/`，并把 `cmd/anydoor/dist/` 恢复成只有占位文件 |

`Makefile` 与 `Taskfile.yaml` 各自声明这八个目标，每个目标只有一行，调用上表最后一列；两者的目标列表必须完全相同（`tools/build` 的测试检查）。

### 4.2 `tools/build`
```
go run ./tools/build [-os GOOS] [-arch GOARCH] [-out DIR] [-preview] [-check] [-clean]
```
- 缺省 `-os`、`-arch` 为本机，`-out` 为 `bin/`。
- 步骤：① 检查 `web/dist/index.html` 存在（不存在则提示先运行 `pnpm -C web build` 并退出 1）；② 清空 `cmd/anydoor/dist/`（保留占位文件 `.gitkeep`），把 `web/dist/` 整个复制进去；③ 以 `CGO_ENABLED=0`、`-trimpath`、`-ldflags "-s -w -X main.version=… -X main.commit=… -X main.date=…"` 构建 `./cmd/anydoor` 与 `./cmd/anydoorctl`，Windows 目标加 `.exe`。
- 版本信息（`G.09-R2`、`B.02` §5 `--version`）：
  | 变量 | 取值 |
  |---|---|
  | `main.version` | 最近的 `v*` 标签去掉 `v`（`git describe --tags --match 'v*'`）；当前提交不在标签上时加 `-dev.<距离>`；工作区有未提交修改时再加 `+dirty`；仓库里还没有标签时为 `0.0.0-dev`。`-preview` 时在主版本号后加 `-preview`（`O-R6`） |
  | `main.commit` | 当前提交的完整哈希 |
  | `main.date` | 当前提交的提交时间（UTC，RFC 3339），不是当前时间（`O-R3`，`P.09` K186） |
- `tools/build` 只用 Go 标准库和 `os/exec` 调 `go`、`git`；不依赖 `make`、shell、`cp`。

### 4.3 `tools/dev`
- 同时启动 `go run ./cmd/anydoor --dev --data-dir ./.anydoor-dev --fake-llm=<按参数>` 和 `pnpm -C web dev`，把两边的输出加前缀 `[api]`、`[web]` 合并打印；任一进程退出或收到 Ctrl+C 时结束另一个（Windows 上用 `CTRL_BREAK_EVENT`，其他平台用 `SIGINT`）。
- 参数原样转给 `anydoor`（例如 `go run ./tools/dev -- --fake-llm`）。

### 4.4 依赖
Go 标准库；本机已装的 `go`、`git`、`node`、`pnpm`（版本按 `O-R2`）；`go run ./tools/gen`（`G.16`）；`cmd/anydoor/embed.go`（`B.02`）。

### 4.5 `tools/relay`（代码接力工具，`G.02.06`）
```
go run ./tools/relay status                 本仓库的接力状态
go run ./tools/relay next                   可以领取的叶子
go run ./tools/relay start <叶子> [--resume] 领取（或接着做）一个叶子，生成任务包
go run ./tools/relay check <叶子>           交付前、接手时的检查（G.02.06-R14）
go run ./tools/relay diff <叶子>            依据文档在领取后改了哪些
go run ./tools/relay stale                  冻结后依据文档又被改过的叶子
```
- **读设计文档**：位置按 `G.02.06-R1`（`ANYDOOR_DOCS`，缺省 `../sj/项目树_v0.5`）；读 `树索引.json`、各文档文件头（状态）、实施卡的"要建 / 要改的文件""不许碰的文件""测试用例"三行。设计仓库的提交号用 `git -C <文档目录> rev-parse HEAD` 取；文档目录有未提交的修改时 `start` 拒绝领取（依据必须是已提交的版本）。
- **`status`**：列出 ① 已领取未合并的叶子：分支、领取人、最后一次提交、工作区有没有未提交的改动；② 每个已领取叶子的测试用例编号覆盖（实施卡里的编号 ÷ 已出现在测试名开头的编号）；③ 全部桩（扫描 `// STUB(` 开头的文件）；④ `docs/relay/*.review.md` 里没处理完的评审意见：评审记录是一张表头里有"结论"一列的表，结论一格以"不符合"或"有疑问"开头、而且这一行没有写"已处理"的才算；表头和说明文字不算（`G.02.06-R18`，`P.09` K199）。
- **`next`**：按树的顺序列出状态为"已审"、还没有被领取的实施叶子。
- **`start --resume --accept-docs`**：依据文档在领取后改过时，实施者先用 `diff` 读改动、确认代码怎么处理并记进 `RELAY.md` 本棒记录，再用这个选项把 `docs/relay/<叶子>.json` 的依据更新为当前的设计文档（`G.02.06-R13`）。不读改动就更新依据，等于跳过第 ⑥ 项，评审时退回。
- **`start`**：按 `G.02.06-R4`–`R7` 检查，然后：建分支；写 `docs/relay/<叶子>.json`（§5）；在 `RELAY.md` 最上面插入一条领取记录（模板见 `RELAY.md` 顶部）；按 `G.02.01` §3、`G.02.02`（必读集合、一层引用、按任务类型的附加集合、不附的东西）拼出任务包 `.relay/tasks/<叶子>.md`，文档按原文附上（`G.02.01-R4`）。`--resume`：只重新生成任务包，不建分支、不改领取记录。
- **`check`**：第 ③ 项的依赖清单读 `tools/deps/allow.txt`；它还不存在（`O.02` 之前）时直接读设计文档 `G.10` §3 各表里的包名（`P.09` K196）。按 `G.02.06-R14` 的七项逐项输出"通过 / 不通过 + 原因"；比较的起点是分支和 `main` 的分叉点；④ 在 Go 里看 `func Test…`、`t.Run(` 的删除和 `t.Skip(` 的新增，在前端看 `test(`、`it(` 的删除和 `.skip(`、`.only(`、`test.fixme(` 的新增；⑤ 测试用例编号的格式取实施卡里的写法（`W0601-T3`、`O01-T2`、`B0407-T5`）。第 ⑦ 项可以用 `--no-build` 跳过（只在本地快速自查时用；交付和 CI 不允许跳过）。
- **`diff`**：对 `docs/relay/<叶子>.json` 里哈希变了的文档，列出 `git -C <文档目录> diff <依据提交号> -- <文件>` 涉及的小节标题。
- **`stale`**：对状态为"冻结"的叶子，比较冻结时的依据与当前文档。
- 只用 Go 标准库和 `os/exec` 调 `git`（`G.10-R3`）；输出中文；退出码 0 通过、1 不通过、2 用法错误。

## 5. 数据结构
`docs/relay/<叶子>.json`（`G.02.06-R6`，提交进仓库）：
```json
{ "leaf": "O.01", "branch": "feat/O.01-build", "claimed_by": "Quick", "claimed_at": "2026-11-23T03:00:00Z",
  "docs_commit": "5d05e19…", "docs": { "G_工程规范/G.02_AI_实施者守则/G.02_AI_实施者守则.md": "sha256:…" },
  "stubs": ["cmd/anydoor/main.go"], "state": "claimed" }
```
`docs` 里的指纹是去掉文件头"状态""最后修改"两行和"变更记录"一节之后的 SHA-256：设计方冻结一个叶子（只改状态和变更记录）不算改动，正文改了才算（`G.02.06-R13`、`R21`）。
`state` 取 `claimed`（领取）、`delivered`（检查和评审都通过，等合并）、`merged`（已合并，等设计方冻结）。

无。占位文件 `cmd/anydoor/dist/.gitkeep` 提交进仓库，`cmd/anydoor/dist/` 下其余文件由 `.gitignore` 忽略。

## 6. 行为
1. **嵌入目录总是存在**：`embed.go` 是 `//go:embed all:dist`；占位文件保证没构建前端时也能编译（`go run ./cmd/anydoor --dev`、`go test ./...` 不需要先构建前端）。此时生产模式下访问 `/` 返回一页静态说明"前端还没有构建：在仓库根运行 make build（或 task build）"（`B.02` §5，`P.09` K187）。
2. **输出目录**：`bin/`（本机构建）、`dist/`（`O.03` 的发布归档）、`.anydoor-dev/`（开发数据目录）都不提交，列入 `.gitignore`；它们是 `G.03-R1` 一级目录表之外允许出现的输出目录（`P.09` K188）。
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
1. 新克隆的仓库按 `G.15` §3 装好工具后，在 Windows、macOS、Linux 上 `build` 都能产出可运行的 `bin/anydoor`；Windows 上不装 `make`，用 `task build` 或底层命令同样成功。
2. 不构建前端直接 `go build ./cmd/anydoor` 成功；运行后访问 `/` 看到"前端还没有构建"的说明。
3. 同一提交连续两次 `build`，`bin/anydoor` 的 SHA-256 相同。
4. `anydoor --version` 输出的版本、提交、时间与 §4.2 一致；在 `v0.1.0` 标签上为 `0.1.0`，之后第 3 个提交为 `0.1.0-dev.3`。
5. `check` 在干净的工作区通过；手改一个生成物后 `check` 失败并指出差异文件。
6. `dev` 下按 Ctrl+C，后端和 Vite 两个进程都退出，没有残留进程（三个平台）。

### 实施卡
- 要建 / 要改的文件：`go.mod`（仓库的 Go 模块文件，没有别的叶子拥有它，`P.09` K196）、`Makefile`、`Taskfile.yaml`、`tools/build/main.go`、`tools/build/version.go`、`tools/build/build_test.go`、`tools/build/build_slow_test.go`（`O01-T5`，构建标签 `slow`）、`tools/dev/main.go`、`tools/dev/proc_windows.go`、`tools/dev/proc_other.go`、`tools/dev/dev_test.go`、`tools/relay/main.go`、`tools/relay/docs.go`（读设计文档与实施卡）、`tools/relay/pack.go`（拼任务包）、`tools/relay/check.go`、`tools/relay/status.go`、`tools/relay/relay_test.go`、`tools/relay/testdata/tree/**`（样例设计树）、`docs/relay/.gitkeep`、`tools/versions.txt`、`cmd/anydoor/dist/.gitkeep`、`.gitignore`（加 `bin/`、`dist/`、`.anydoor-dev/`、`cmd/anydoor/dist/*`、`!cmd/anydoor/dist/.gitkeep`）。
- 不许碰的文件：`tools/gen/`（`G.16`）、`cmd/anydoor/*.go`（`B.02`；"前端还没有构建"页面由 `B.02` 的实施任务做）、`web/`（只调用其脚本）、`.github/`（`O.02`）、`tools/release/`（`O.03`）。
- 函数签名：命令行见 §4.2、§4.3；`tools/build/version.go`：`func Version(repoDir string, preview bool) (version, commit, date string, err error)`。
- 测试用例：
  - `O01-T1 版本`：用临时 git 仓库造出"在标签上""标签后 3 个提交""有未提交修改""没有标签""不是 git 仓库"五种情况，`Version` 结果与 §4.2、§8 一致
  - `O01-T2 目标一致`：解析 `Makefile` 与 `Taskfile.yaml`，目标名集合都等于 §4.1 的八个
  - `O01-T3 复制`：`web/dist` 样例复制进临时的 `cmd/anydoor/dist` 后文件逐个相同，旧文件被清掉，`.gitkeep` 保留
  - `O01-T4 缺前端`：`web/dist/index.html` 不存在 → 退出 1
  - `O01-T5 可复现`：§10 验收 3；要完整构建两次、耗时长，放在带构建标签 `slow` 的测试文件里（`go test -tags slow ./tools/build/`），不进平时的 `go test ./...`；CI 每晚跑（`O.02` §6.3，`P.09` K196）
  - `O01-T6 dev 退出`：§10 验收 6（用两个假子进程代替 `anydoor` 与 Vite）
  - `O01-T7 relay 解析`：用测试目录里的一小棵样例设计树，读出叶子状态、实施卡的白名单与测试用例编号，结果与样例一致
  - `O01-T8 relay start`：叶子是"草稿" → 拒绝；已被领取 → 拒绝；白名单与另一个已领取的叶子重叠 → 拒绝；正常 → 建分支、写 `docs/relay/<叶子>.json`、插入领取记录、任务包里有 `G.02.02` 规定的全部文档且不含同级叶子的正文
  - `O01-T9 relay check`：在临时 git 仓库里分别制造 `G.02.06-R14` ①–⑥ 的违规，每种都被对应的一项拦下；全部合规时通过
  - `O01-T10 relay diff / stale`：领取后改动样例树里的一份文档 → `diff` 列出它和改动的小节，`check` 第 ⑥ 项不通过，`start --resume --accept-docs` 之后通过；只改状态和变更记录不算改动；冻结的叶子正文变化 → `stale` 列出它
  - `O01-T11 relay status`：两个已领取的叶子、一个桩、一份有"不符合"的评审记录都出现在输出里；测试用例覆盖数正确
- 允许使用的依赖：Go 标准库。
- 第 1 片的桩（`G.02.06-R10`，`P.09` K196）：`O.01` 的 `check`、`lint`、`build` 要调用还没实现的工具和程序，按它们将来的位置各写一个最小桩，第一行写 `STUB(<叶子>)`：`cmd/anydoor/main.go`、`cmd/anydoor/embed.go`、`cmd/anydoor/console_windows.go`、`cmd/anydoor/console_other.go`（`B.02`：只做 `--version`、`/api/v1/health`、嵌入前端与"前端还没有构建"页、`--dev` 代理、优雅关闭）；`cmd/anydoorctl/main.go`、`cmd/anydoorctl/console_windows.go`、`cmd/anydoorctl/console_other.go`（`B.08`：只做 `version`；两个程序的 `console_*.go` 是 Windows 控制台 UTF-8 编码，`P.09` K198）；`tools/gen/main.go`（`G.16`）、`tools/depcheck/main.go`（`G.03`）、`tools/lint/quirkscheck/main.go`、`tools/lint/typenamecheck/main.go`（`G.05.05`）：只打印"还没有实现"并以 0 退出；`web/package.json`、`web/index.html`、`web/tsconfig.json`、`web/src/main.ts`、`web/scripts/stub.mjs`（`W.01`、`W.02`、`W.12`：一个不用 React 的空白页，`lint` = `tsc --noEmit`，`test`、`test:e2e`、`test:visual` 只打印还没有测试）。
- 禁止事项：`G.02.05` 全部；另：不写 shell 脚本；构建时间不取当前时间；不把 `web/dist-perf/` 或测试页面复制进 `cmd/anydoor/dist/`。
- 完成标志：`G.14` 全部条件；§10 六条验收通过；`tools/relay` 合并后，下一个叶子按 `G.02.06` 正常领取（不再走 §5 例外）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K186–K188 |
| 2026-11-23 | 加 `tools/relay`（§4.5、§5、实施卡、`O01-T7`–`T11`）；名字随产品改名 | 第 10 棒；`P.09` K194、K195 |
| 2026-11-23 | 状态改为"已审"（用户同意开始第 1 片，2026-11-23 10:51） | `G.02.01-R2` |
| 2026-11-23 | 实施卡补 `go.mod`、第 1 片的桩清单；`check` ③ 在 `allow.txt` 之前读 `G.10`；`O01-T5` 用构建标签 `slow` | 第 1 片开工前；`P.09` K196 |
| 2026-11-23 | §4.5 加 `start --resume --accept-docs`；§5 写明文档指纹的算法；`O01-T10` 相应补充 | 第 1 片实施中定下的细节（`G.02` §4 自主决定，回写文档） |
| 2026-11-23 | 实施卡桩清单补 `console_windows.go`、`console_other.go`；§4.5 `status` 的评审意见判断改为按表格"结论"列 | 第 1 片交叉评审第 12、14 条；`P.09` K199 |
| 2026-11-23 | 状态改为"冻结"：第 1 片 squash 合并进代码仓库 `main`，提交 `30d74040f63be2dbf39a88b4695dd94b90b7b5a7`（`G.02.06-R21`） | 用户批准合并（`G.08-R3`）；三轮验证、交叉评审 14 条全部处理（代码仓库 `docs/relay/O.01.review.md`） |
