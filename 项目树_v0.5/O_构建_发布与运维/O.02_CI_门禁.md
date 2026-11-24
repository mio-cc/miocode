# O.02 CI 门禁

| 项 | 内容 |
|---|---|
| 编号 | O.02 |
| 类型 | 实施 |
| 上级 | O 构建、发布与运维 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引01 §6；引12 §7；`G.08` §2；`S.12`；`W.11` §6.6；`W.12` §4.4；`P.09` K189、K192、K248 |
| 最后修改 | 2026-11-24 |

## 1. 职责
合并前的检查：验证者在开发机上运行的检查清单（落实 `G.08` §2 每一行），以及几个小检查工具（提交信息、依赖白名单、文件白名单、覆盖率、变更日志）和说明文件 `docs/checks.md`。

**不用 GitHub Actions**（用户决定 2026-11-24，`P.09` K248）：仓库里没有 `.github/workflows/`，推送不会触发任何自动运行，也没有每晚任务。门禁就是验证者在本机原样贴出的输出（`G.08-R3`）。本节点的名字沿用"CI 门禁"。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 每个检查的命令本身做什么 | `O.01`（构建入口）、`Q.01`（测试与覆盖率门槛）、`W.11`、`W.12`、`G.06.04`、`G.05.05` |
| 交叉编译、归档、校验和 | `O.03` |
| 签名、公证、SBOM、对外发布 | `O.04` |
| 门禁有哪些、谁能合并 | `G.08`（本节点实现它，不增减门禁） |

## 3. 继承的上级约束
`O-R1`–`R7`；`G.08` §2、`G.08-R1`、`R3`；`G.07`（全部）；`G.09-R4`；`G.10-R1`；`G.02-R3`、`G.02.01-R5`；`S.12-R1`–`R3`、`R6`；`Q.01`；`Q.06-R1`；`P.07` M0"合并前检查"一行。

## 4. 接口

### 4.1 文件
| 文件 | 内容 |
|---|---|
| `tools/ci/commitcheck` | 检查提交信息（`G.07-R3`、`R4`） |
| `tools/ci/deps` | 检查 `go.mod`、`web/package.json` 的直接依赖都在 `tools/deps/allow.txt` 里（`G.10-R1`） |
| `tools/deps/allow.txt` | `G.10` §3 依赖清单在代码仓库里的副本（设计文档不进仓库，`G.03` §2）；改 `G.10` 时同步改它 |
| `tools/ci/allowlist` | 比较改动的文件与说明里"文件白名单"一节（`G.02-R3`） |
| `tools/ci/cover` | 按包汇总 Go 覆盖率；有门槛时检查门槛（`Q.01-R5`；M0 只出报告，K243） |
| `tools/ci/changelog` | 检查对用户可见的改动写了 `CHANGELOG.md`（`G.09-R4`） |
| `tools/gitleaks/.gitleaksignore` | 确认是误报的 gitleaks 发现，每行一个指纹 `<提交>:<文件>:<规则>:<行>`，上一行用 `#` 写明为什么是误报和 `P.09` 的编号（K249） |
| `tools/versions.txt` | `gitleaks`、`govulncheck` 两行写成三列 `<工具> <版本> run`：第三列 `run` 表示用 `go run <模块>@v<版本>` 运行、不用预先安装；`O.01` 的 `tools/build -check` 只检查两列的行（K246、K248） |
| `.github/pull_request_template.md` | `G.07` §4 的模板（以后有合并请求流程时用） |
| `docs/checks.md` | 合并前检查清单、哪些还是桩、每条命令怎么在本机跑 |

### 4.2 合并前检查清单（验证者在开发机上运行，`G.08-R3`）
| 检查 | 命令 | 对应 `G.08` §2 |
|---|---|---|
| 整片验证 | `go run ./tools/relay slice <片名>`：每个叶子的 ①–⑥，加一次 ⑦ `go run ./tools/build -check`（生成物一致、`golangci-lint`、`depcheck`、`quirkscheck`、`typenamecheck`、前端 lint、`go test ./...`、前端测试） | 生成物一致、依赖方向、Go lint、Go 测试（本机平台）、前端 lint、前端测试 |
| 其他平台的编译检查 | 改到的包各做一次 `GOOS=linux`、`GOOS=darwin` 的 `go vet` | Go 测试（三平台）的替代：开发机是 Windows，Linux、macOS 只查编译（K248） |
| 依赖清单 | `go run ./tools/ci/deps` | 依赖清单 |
| 漏洞扫描 | `go run golang.org/x/vuln/cmd/govulncheck@v<版本> ./...`、`pnpm -C web audit --audit-level high --prod` | 漏洞扫描（`S.12-R2`，原来的每天一次改为每片合并前一次，K248） |
| 密钥扫描 | `go run github.com/zricethezav/gitleaks/v8@v<版本> git --redact --gitleaks-ignore-path tools/gitleaks/.gitleaksignore .`（全部历史） | 密钥扫描（`S.12-R3`） |
| 前端构建与冒烟 | 片里改了 `cmd/`、`internal/api/`、`web/` 或 `tools/release/` 时：`pnpm -C web build`、`go run ./tools/build -preview`、`go run ./tools/release -smoke bin/anydoor.exe` | 前端构建（嵌入后的程序） |
| 覆盖率报告 | `go test ./... -count=1 -coverpkg=./... -coverprofile=cover.out`、`go run ./tools/ci/cover cover.out`（M0 只出报告） | 覆盖率 |

- 版本号见 `tools/versions.txt`。任何一项失败：不合并，按 `G.08-R3` 停下说明原因；漏洞扫描查出"有修复版本的高危漏洞"同样算失败（`S.12-R2`）。
- 密钥扫描有发现时，验证者用 `--redact` 导出报告（不贴密钥原文）交给设计方判断：真密钥按安全事件处理（作废该密钥、上报用户，不靠改历史了事）；确认是误报的，在 `P.09` 登记，把这一条的指纹加进 `tools/gitleaks/.gitleaksignore`，不改冻结叶子的文件、不改已推送的历史（K249）。
- 端到端、前端性能基准（`G.08` §2）在 `W.12`、`W.11` 落地时加进本表（M1）。
- 提交信息、文件白名单（`commitcheck`、`allowlist`、`changelog`）M0 不在清单里：片合并的提交写法与 `commitcheck` 的规则不同（K241），实施叶子的白名单已由 `relay check` 第 ① 项检查。

### 4.3 小检查工具的规则
| 工具 | 通过条件 | 不通过时 |
|---|---|---|
| `commitcheck` | PR 标题和每条提交信息首行符合 `<类型>(<范围>): <描述>`，类型属于 `G.07-R3` 的 9 种，范围是树里的编号格式（`W.06.13`）或 `deps`、`ci`、`repo`；`feat`、`fix` 的提交正文最后一行是 `Refs: <编号>`。M0 不走合并请求，不在合并前检查里跑（K241）；以后有合并请求流程时再接上 | 写出哪一条、哪一处不符 |
| `deps` | `go.mod` 的 `require`（不含 `// indirect`）与 `web/package.json` 的 `dependencies`、`devDependencies` 的包名都在 `allow.txt` 里 | 列出不在清单里的包，提示按 `G.10-R2` 上报 |
| `allowlist` | 分支名形如 `feat/<编号>-…`、`fix/<编号>-…` 时，PR 说明必须有"## 文件白名单"一节（从任务包 B 节原样复制，`G.02.01-R5`）；本次改动的每个文件都匹配其中一行（"可新建"允许目录前缀，"可修改"必须是完整路径）；`CHANGELOG.md` 总是允许 | 列出越界的文件。白名单是否和任务包一致，由人工评审核对（`G.08` §3） |
| `cover` | 打印每个包的覆盖率（与 `go tool cover -func` 按包汇总的结果一致）；给了门槛文件时，`Q.01-R5` 的每个包达到门槛。M0 不给门槛文件（K243） | 列出包名、实际值、门槛 |
| `changelog` | 改动了 `cmd/`、`engine/`、`internal/`、`web/src/` 下非测试文件的 PR 改了 `CHANGELOG.md`；PR 带 `no-changelog` 标签时跳过（内部重构、只改测试，`G.09-R4`） | 提示在"未发布"下加一行 |

这几个工具都只用 Go 标准库，各自不超过约 200 行（`G.10-R3`）。`G.07` §5 原来写的 `commitlint` 是 npm 包，不在 `G.10` 清单里，改用 `commitcheck`（`P.09` K189）。


## 5. 数据结构
`tools/deps/allow.txt`：每行一个包名，`#` 开头为注释，按 `G.10` §3 的分组写注释行。

## 6. 行为

### 6.1 环境
- 开发机：Windows（中文系统），工具版本以 `go.mod` 的 `toolchain`、`web/package.json` 的 `engines` / `packageManager`、`tools/versions.txt` 为准（`O-R2`、`P.09` K193）。
- 不配置任何模型 API 密钥（`O-R4`、`Q.06-R1`）。

### 6.2 记录
验证者把合并前检查的输出原样贴给实施者；整片评审记录（`docs/relay/<片名>.review.md`）的说明里写明跑过哪几项。

### 6.3 以后
- 不再有每晚任务：可复现构建在发布时由 `O.03` 两遍打包比较（`S.12-R6`）；崩溃恢复全量、后端性能在 `Q.09`、`Q.08` 落地时再定在哪里跑（K248）。
- 要恢复 GitHub Actions 时（例如以后有合并请求流程），先在 `P.09` 登记、改本节点，再建工作流文件。

## 7. 不变量
- 合并进 `main` 的每个提交在合并前都通过了 §4.2 的全部检查（`G.08-R1`）。
- 本机运行 `make check`（`go run ./tools/build -check`）通过，就是 §4.2 第一行的 ⑦ 通过（`O.01` §4.1）。

## 8. 错误处理
| 情况 | 结果 |
|---|---|
| 某项检查失败 | 不合并；验证者原样贴出输出，实施者修好后重跑 |
| 网络问题（下载工具或漏洞库超时） | 允许重跑一次；测试本身的不稳定不能靠重跑解决（`Q.01-R4`） |
| `allow.txt` 与 `G.10` 不一致 | 评审时发现即退回；`G.10` 改动的同一批里必须同步改 `allow.txt` |

## 9. 性能与资源
合并前检查全部跑完（不含前端冒烟）在开发机上 15 分钟以内。

## 10. 验收标准
1. 每个小工具的单元测试（`O02-T1`–`T5`）通过。
2. 在当前 `main` 上跑一遍 §4.2 的全部检查都通过，输出写进合并前的检查记录。
3. 仓库里没有 `.github/workflows/`；`docs/checks.md` 写明清单、版本、还是桩的检查。

### 实施卡
- 要建 / 要改的文件：`tools/ci/commitcheck/main.go`、`tools/ci/commitcheck/main_test.go`、`tools/ci/deps/main.go`、`tools/ci/deps/main_test.go`、`tools/ci/allowlist/main.go`、`tools/ci/allowlist/main_test.go`、`tools/ci/cover/main.go`、`tools/ci/cover/main_test.go`、`tools/ci/changelog/main.go`、`tools/ci/changelog/main_test.go`、`tools/deps/allow.txt`、`tools/versions.txt`、`.github/pull_request_template.md`、`docs/checks.md`、`tools/gitleaks/.gitleaksignore`；删除 `.github/workflows/ci.yml`、`nightly.yml`、`release.yml` 和 `docs/ci.md`（K248）
- 不许碰的文件：`Makefile`、`Taskfile.yaml`、`tools/build/`、`tools/dev/`、`tools/relay/`、`tools/release/`、`tools/gen/`、`tools/depcheck/`、`tools/lint/`、`web/`、`cmd/`、`engine/`、`internal/`、`schema/`、`gen/`
- 函数签名：各工具都是 `main` 包；可测试的部分写成 `func Check(...) []Problem`。
- 小工具的参数（K246）：`commitcheck -title <标题> -base <提交> -head <提交>`；`allowlist -branch <分支名> -body <说明文件> -base … -head …`；`changelog -labels <逗号分隔> -base … -head …`；`deps`（无参数，读仓库根）；`cover [-min <门槛文件>] <cover.out>`。改动的文件取 `git diff --name-only <base>...<head>`，提交取 `git log <base>..<head>`。门槛文件每行 `<包路径或前缀/...> <百分比>`，`#` 开头为注释，按顺序第一条匹配的生效。
- `tools/deps/allow.txt` 写 Go 模块路径和 npm 包名（`G.10` §3 写成包名的按所在模块写，例如 `golang.org/x/time/rate` 写 `golang.org/x/time`）；匹配规则和 `relay` 的 `DepAllowed` 一样：完全相同，或是登记项加 `/` 的子路径（K246）。
- 测试用例：
  - `O02-T1 commitcheck`：合规的 `feat(E.14.07): …` 与 `Refs: E.14.07` 通过；`docs(repo): …` 不要求 `Refs`；类型错、范围不是编号也不是 `deps` / `ci` / `repo`、`feat` 缺 `Refs` 各自失败并写出是哪一条
  - `O02-T2 deps`：`allow.txt` 里没有的直接依赖 → 失败并列出；`// indirect` 不检查；`#` 注释行和空行被忽略；用仓库里真实的 `go.mod`、`web/package.json` 和本叶子写的 `allow.txt` 跑一次 → 通过；读不到 `web/package.json` 或它不是合法的 JSON → 失败
  - `O02-T3 allowlist`：白名单内的改动通过；越界文件被列出；非实施分支（`docs/…`）不检查；目录前缀只对"可新建"生效；`CHANGELOG.md` 总是允许
  - `O02-T4 cover`：样例 `cover.out` 按包汇总的结果与手算一致；没有门槛文件时只打印、退出码 0；给了门槛文件且低于门槛 → 失败
  - `O02-T5 changelog`：改了 `engine/` 非测试文件且没改 `CHANGELOG.md` → 失败；只改 `_test.go` → 通过；带 `no-changelog` 标签 → 通过
- 允许使用的依赖：Go 标准库；`tools/versions.txt` 里的检查工具（`go run` 运行）。
- 禁止事项：`G.02.05` 全部（特别是 R30、R35）；另：不配置模型密钥；不放宽 lint 或测试（`G.06.04-R2`、`G.05.05-R1`）；不对测试失败自动重跑。
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）；`docs/checks.md` 写明合并前检查清单和哪些还是桩。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K189、K192 |
| 2026-11-23 | `main` 的合并条件改为按新的 `G.08-R3` | `P.09` K209 |
| 2026-11-24 | 第 ⑧b 片（`m0-ci`）开工前复查：M0 不设分支保护，CI 做事后检查（用户决定）；`ci.yml` 也在 `ci-drill/**` 上运行；桩照常调用、`cover` 只出报告、`perf` 任务由带来脚本的叶子加；Actions 哈希由验证者查；`gitleaks`、`govulncheck` 版本进 `tools/versions.txt`；门禁演练改为人工验收；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K241、K243 |
| 2026-11-24 | 写代码前补细节：CI 专用工具在 `tools/versions.txt` 里写三列；小工具的参数；`allow.txt` 写模块路径；所有任务用 bash、设提交者环境变量 | `P.09` K246 |
| 2026-11-24 | §6.1 macOS 运行器改为 `macos-15`：`macos-14` 已于 2026-11-02 停用，合并后第一次 CI 运行时发现；§6.3 漏洞扫描开 Issue 前自动建 `security` 标签 | `P.09` K247 |
| 2026-11-24 | 不用 GitHub Actions（用户决定）：去掉工作流、每晚任务和分支保护的内容；§4.2 改为验证者在开发机上运行的合并前检查清单，漏洞和密钥扫描改为每片合并前跑一次；`docs/ci.md` 改为 `docs/checks.md`；K247 作废 | `P.09` K248 |
| 2026-11-24 | 加 `tools/gitleaks/.gitleaksignore`（不放仓库根：`relay` 的实施卡解析认不出不带目录、以点开头又没有扩展名的文件名，K249）和密钥扫描有发现时的处理办法：第一次跑合并前检查时 gitleaks 把测试里 RFC 6455 的示例 WebSocket 密钥当成了 API 密钥 | `P.09` K249 |
