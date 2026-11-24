# O.02 CI 门禁

| 项 | 内容 |
|---|---|
| 编号 | O.02 |
| 类型 | 实施 |
| 上级 | O 构建、发布与运维 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引01 §6；引12 §7；`G.08` §2；`S.12`；`W.11` §6.6；`W.12` §4.4；`P.09` K189、K192 |
| 最后修改 | 2026-11-24 |

## 1. 职责
代码仓库的 GitHub Actions 配置：每次推送到 `main`、推送到演练分支和每个合并请求时跑的检查（落实 `G.08` §2 每一行），每晚任务，打标签时的发布任务入口；需要的几个小检查工具（提交信息、依赖白名单、文件白名单、覆盖率、变更日志）；`docs/ci.md`（当前该是绿的任务清单、哪些还是桩、本地复现命令）。

M0 不设分支保护：`main` 仍由验证者在本地 squash 合并后推送，CI 在推送后做事后检查，红了当缺陷修（`P.09` K241）。

## 2. 不做什么
| 不做 | 归谁 |
|---|---|
| 每个检查的命令本身做什么 | `O.01`（构建入口）、`Q.01`（测试与覆盖率门槛）、`W.11`、`W.12`、`G.06.04`、`G.05.05` |
| 交叉编译、归档、校验和 | `O.03`（本节点的 `release.yml` 只调用它） |
| 签名、公证、SBOM、对外发布 | `O.04` |
| 门禁有哪些、谁能合并 | `G.08`（本节点实现它，不增减门禁） |

## 3. 继承的上级约束
`O-R1`–`R7`；`G.08` §2、`G.08-R1`、`R3`；`G.07`（全部）；`G.09-R4`；`G.10-R1`；`G.02-R3`、`G.02.01-R5`；`S.12-R1`–`R3`、`R6`；`Q.01`；`Q.06-R1`；`W.11` §6.6；`W.12` §4.4、§6.5、§6.6；`G.15` §6；`P.07` M0"CI"一行。

## 4. 接口

### 4.1 文件
| 文件 | 内容 |
|---|---|
| `.github/workflows/ci.yml` | 推送到 `main`、推送到 `ci-drill/**` 分支、合并请求时运行（§4.2） |
| `.github/workflows/nightly.yml` | 每天北京时间 03:00 运行（§6.3） |
| `.github/workflows/release.yml` | 推送 `v*` 标签时运行，调用 `go run ./tools/release`（`O.03`）；本叶子只写触发条件、权限和一步占位调用，步骤归 `O.03` |
| `.github/pull_request_template.md` | `G.07` §4 的模板，加"文件白名单"一节（K189） |
| `tools/ci/commitcheck` | 检查 PR 标题与每条提交信息（`G.07-R3`、`R4`） |
| `tools/ci/deps` | 检查 `go.mod`、`web/package.json` 的直接依赖都在 `tools/deps/allow.txt` 里（`G.10-R1`） |
| `tools/deps/allow.txt` | `G.10` §3 依赖清单在代码仓库里的副本（设计文档不进仓库，`G.03` §2）；改 `G.10` 时同步改它 |
| `tools/ci/allowlist` | 比较本次改动的文件与 PR 说明里"文件白名单"一节（`G.02-R3`） |
| `tools/ci/cover` | 按包汇总 Go 覆盖率；有门槛时检查门槛（`Q.01-R5`；M0 只出报告，K243） |
| `tools/ci/changelog` | 检查需要写变更日志的 PR 是否改了 `CHANGELOG.md`（`G.09-R4`） |
| `tools/versions.txt` | 加 `gitleaks`、`govulncheck` 两行（`O-R2`，K243） |
| `docs/ci.md` | 当前该是绿的任务清单、哪些检查工具还是桩、门禁演练记录，以及本地复现某个任务的命令 |

### 4.2 `ci.yml` 的任务
| 任务 | 运行在 | 内容 | 对应 `G.08` §2 | 何时要求是绿的 |
|---|---|---|---|---|
| `gen` | ubuntu | `pnpm -C web install --frozen-lockfile` → `go run ./tools/gen` → `git diff --exit-code` | 生成物一致 | M0 |
| `go-test` | ubuntu、windows、macos | `go test ./... -count=1`；ubuntu 上加 `-race -coverprofile=cover.out -coverpkg=./...`，之后 `go run ./tools/ci/cover cover.out`（M0 只打印报告，K243） | Go 测试、覆盖率 | M0 |
| `go-lint` | ubuntu | `golangci-lint run ./...`、`go run ./tools/depcheck`、`go run ./tools/lint/quirkscheck`、`go run ./tools/lint/typenamecheck`（后三个现在是桩，以 0 退出） | 依赖方向、Go lint | M0 |
| `web` | ubuntu、windows | `pnpm -C web lint`（只在 ubuntu）、`pnpm -C web test`、`pnpm -C web build`（只在 ubuntu，产物上传给后续任务）；`lint`、`test` 现在是桩 | 前端 lint、前端测试、前端构建 | M0 |
| `build` | ubuntu、windows、macos | 下载 `web` 的产物 → `go run ./tools/build -preview` → 冒烟 `go run ./tools/release -smoke bin/anydoor`（Windows 上是 `bin/anydoor.exe`，`O.03` §4、§6.4） | 前端构建（嵌入后的程序） | M0 |
| `e2e` | ubuntu | 用 `build` 的 Linux 产物：`pnpm -C web test:e2e`、`pnpm -C web test:visual`（`W.12` §6.5、§6.6；现在是桩） | 端到端 | M1（`W.12` 落地起） |
| `security` | ubuntu | `gitleaks detect`（全部历史，含 `testdata/`、`templates/*/fixtures/`）、`govulncheck ./...`、`pnpm -C web audit --audit-level high --prod`、`go run ./tools/ci/deps` | 密钥扫描、依赖清单；`S.12-R2` | M0 |
| `pr-meta` | ubuntu（只在合并请求） | `go run ./tools/ci/commitcheck`、`go run ./tools/ci/allowlist`、`go run ./tools/ci/changelog` | 提交信息、文件白名单 | 有合并请求时 |

- 任务依赖：`build` 需要 `web`；`e2e` 需要 `build`；其余并行。
- 前端性能基准 `perf`（`pnpm -C web bench`、`pnpm -C web perf`，`W.11` §6.6）这两个脚本还不存在：本叶子不写这个任务，由带来这两个脚本的叶子加进 `ci.yml`（那个叶子的实施卡要列出 `.github/workflows/ci.yml`，K243）。
- "何时要求是绿的"：已到期的任务在 `main` 上必须是绿的；红了当缺陷，下一个叶子开工前修好（`Q.12`，K241）。还没到期的任务照常运行，红了只记录。`docs/ci.md` 列出当前已到期的清单；到期时在那里记一行。到了 M1 结束，表里全部任务（加上 `perf`）都必须已到期（`P.07`）。
- 同一个分支有新的推送时，取消还在运行的旧任务（`concurrency` 按分支分组）。

### 4.3 小检查工具的规则
| 工具 | 通过条件 | 不通过时 |
|---|---|---|
| `commitcheck` | PR 标题和每条提交信息首行符合 `<类型>(<范围>): <描述>`，类型属于 `G.07-R3` 的 9 种，范围是树里的编号格式（`W.06.13`）或 `deps`、`ci`、`repo`；`feat`、`fix` 的提交正文最后一行是 `Refs: <编号>`。只在合并请求上运行（M0 不走合并请求，K241） | 写出哪一条、哪一处不符 |
| `deps` | `go.mod` 的 `require`（不含 `// indirect`）与 `web/package.json` 的 `dependencies`、`devDependencies` 的包名都在 `allow.txt` 里 | 列出不在清单里的包，提示按 `G.10-R2` 上报 |
| `allowlist` | 分支名形如 `feat/<编号>-…`、`fix/<编号>-…` 时，PR 说明必须有"## 文件白名单"一节（从任务包 B 节原样复制，`G.02.01-R5`）；本次改动的每个文件都匹配其中一行（"可新建"允许目录前缀，"可修改"必须是完整路径）；`CHANGELOG.md` 总是允许 | 列出越界的文件。白名单是否和任务包一致，由人工评审核对（`G.08` §3） |
| `cover` | 打印每个包的覆盖率（与 `go tool cover -func` 按包汇总的结果一致）；给了门槛文件时，`Q.01-R5` 的每个包达到门槛。M0 不给门槛文件（K243） | 列出包名、实际值、门槛 |
| `changelog` | 改动了 `cmd/`、`engine/`、`internal/`、`web/src/` 下非测试文件的 PR 改了 `CHANGELOG.md`；PR 带 `no-changelog` 标签时跳过（内部重构、只改测试，`G.09-R4`） | 提示在"未发布"下加一行 |

这几个工具都只用 Go 标准库，各自不超过约 200 行（`G.10-R3`）。`G.07` §5 原来写的 `commitlint` 是 npm 包，不在 `G.10` 清单里，改用 `commitcheck`（`P.09` K189）。

## 5. 数据结构
`tools/deps/allow.txt`：每行一个包名，`#` 开头为注释，按 `G.10` §3 的分组写注释行。

## 6. 行为

### 6.1 环境
- GitHub 托管的运行器：`ubuntu-24.04`、`windows-2022`、`macos-14`（Apple 芯片）。
- Go 按 `go.mod` 的 `toolchain` 安装（`actions/setup-go` 的 `go-version-file`）；Node 按 `web/package.json` 的 `engines`，pnpm 用 `corepack enable`；CI 工具按 `tools/versions.txt` 安装（`O-R2`）。
- 缓存：Go 模块与构建缓存、pnpm 存储、Playwright 浏览器；缓存键包含锁文件哈希，锁文件变了就失效。
- 密钥：除 `release.yml` 用的 `GITHUB_TOKEN` 外不配置任何密钥；特别是没有任何模型 API 密钥（`O-R4`、`Q.06-R1`）。
- 第三方 Actions 只用 `actions/*` 官方的几个，引用到具体提交哈希，行末注释写对应的版本标签（不用 `@v4` 这种会变的标签，`S.12-R6`）。写 `ci.yml` 前由验证者查出 `actions/checkout`、`actions/setup-go`、`actions/setup-node`、`actions/cache`、`actions/upload-artifact`、`actions/download-artifact` 当前版本的提交哈希贴给实施者（K243）。
- `gitleaks`、`govulncheck` 不用第三方 Action：按 `tools/versions.txt` 的版本用 `go install`（`gitleaks` 也可以下载官方发布的二进制并核对校验和）。

### 6.2 产物
每个任务失败时上传：Go 测试输出、`cover.out`、前端测试报告、Playwright 追踪与截图差异、`anydoor` 日志。保留 14 天。

### 6.3 每晚任务 `nightly.yml`
| 任务 | 内容 | 失败时 |
|---|---|---|
| 漏洞扫描 | 在 `main` 上重跑 `security` 任务（`S.12-R2`：每天一次） | 开一个 Issue，标签 `security` |
| 可复现构建 | 同一提交在两个干净的运行器上各 `build` 一次，比较 `anydoor` 的 SHA-256（`S.12-R6`、`O01-T5`） | 开 Issue |
| 全量故障注入 | `Q.09` 写成后加入 | 开 Issue |

每晚任务失败要在 2 个工作日内处理（作为缺陷，`Q.12`）。

### 6.4 分支与标签（写在 `docs/ci.md`）
- `main`：M0 不设分支保护（K241）。合并照 `G.08-R3`：验证者贴出的 `relay check` / `relay slice` 全部通过、评审没有未处理意见后，由验证者在本地 squash 合并（`G.07-R6`）并推送；推送后看一眼 CI，红了当缺陷修。以后改成合并请求流程时，再按本节旧版的写法配置分支保护（只能经合并请求、必过检查、只允许 squash、不允许管理员绕过），并先改 `commitcheck` 的规则或提交写法。
- `ci-drill/*`：门禁演练用的分支，只推送、不合并，演练完删掉。
- 标签 `v*` 只在里程碑验收时由验证者按用户的决定推送（`G.07-R8`；M0 的 `v0.1.0` 见 K241）。

## 7. 不变量
- 推送到 `main` 的每个提交在 CI 上都有一次完整运行；已到期的任务红了就是缺陷（`G.08-R1`、K241）。
- CI 不调用模型 API，不访问 GitHub 与包仓库以外的网络（端到端只连 `127.0.0.1`，`W.12` §6.5）。
- 本地运行 `make check` 通过时，`gen`、`go-test`（本机平台）、`go-lint`、`web` 四个任务也会通过（`O.01` §4.1）。

## 8. 错误处理
| 情况 | 结果 |
|---|---|
| `main` 上某个已到期的任务失败 | 当缺陷：失败信息和产物见任务页面；下一个叶子开工前修好（K241） |
| CI 基础设施故障（下载超时等） | 允许手动重跑一次；测试本身的不稳定不能靠重跑解决（`Q.01-R4`） |
| `allow.txt` 与 `G.10` 不一致 | 评审时发现即退回；`G.10` 改动的同一批里必须同步改 `allow.txt` |

## 9. 性能与资源
一次推送的全部任务（并行）在 30 分钟内完成；单个任务超过 40 分钟自动取消并算失败。

## 10. 验收标准
1. 合并后第一次推送到 `main`：已到期的任务全部是绿的（`pr-meta` 不运行）。
2. 门禁演练：在 `ci-drill/*` 分支上逐个推送下面的问题，每种各自被对应任务拦下：手改生成物（`gen`）；Windows 上才失败的路径处理（`go-test` 的 windows）；前端类型错误（`web`）；新增未登记依赖（`security`）；提交里放一个假 API 密钥（`security`）。依赖方向（`depcheck`）、覆盖率门槛、前端中文字面量这三种要等对应的桩被替换、门槛开启后再演练，`docs/ci.md` 记一行；提交信息、白名单越界由 `O02-T1`、`O02-T3` 覆盖，有了合并请求流程后再演练。
3. 三个平台的 `build` 任务都产出能启动的程序并通过冒烟（`P.07` M0"单二进制打包"）。
4. 仓库没有配置任何模型密钥；`grep` 工作流文件找不到 `secrets.` 除 `GITHUB_TOKEN` 以外的引用。
5. 可复现构建的每晚任务在同一提交上连续 3 天哈希相同。

### 实施卡
- 要建 / 要改的文件：`.github/workflows/ci.yml`、`.github/workflows/nightly.yml`、`.github/workflows/release.yml`、`.github/pull_request_template.md`、`tools/ci/commitcheck/main.go`、`tools/ci/commitcheck/main_test.go`、`tools/ci/deps/main.go`、`tools/ci/deps/main_test.go`、`tools/ci/allowlist/main.go`、`tools/ci/allowlist/main_test.go`、`tools/ci/cover/main.go`、`tools/ci/cover/main_test.go`、`tools/ci/changelog/main.go`、`tools/ci/changelog/main_test.go`、`tools/deps/allow.txt`、`tools/versions.txt`、`docs/ci.md`
- `release.yml` 本叶子只写：`on: push: tags: ['v*']`、`permissions: contents: write`、一个 ubuntu 任务（检出、装 Go 和 Node）和一步 `go run ./tools/release -version-check`；其余步骤由 `O.03` 补。
- 不许碰的文件：`Makefile`、`Taskfile.yaml`、`tools/build/`、`tools/dev/`、`tools/relay/`、`tools/release/`、`tools/gen/`、`tools/depcheck/`、`tools/lint/`、`web/`、`cmd/`、`engine/`、`internal/`、`schema/`、`gen/`
- 函数签名：各工具都是 `main` 包，命令行参数见 §4.2；可测试的部分写成 `func Check(...) []Problem`。
- 测试用例：
  - `O02-T1 commitcheck`：合规的 `feat(E.14.07): …` 与 `Refs: E.14.07` 通过；`docs(repo): …` 不要求 `Refs`；类型错、范围不是编号也不是 `deps` / `ci` / `repo`、`feat` 缺 `Refs` 各自失败并写出是哪一条
  - `O02-T2 deps`：`allow.txt` 里没有的直接依赖 → 失败并列出；`// indirect` 不检查；`#` 注释行和空行被忽略；用仓库里真实的 `go.mod`、`web/package.json` 和本叶子写的 `allow.txt` 跑一次 → 通过
  - `O02-T3 allowlist`：白名单内的改动通过；越界文件被列出；非实施分支（`docs/…`）不检查；目录前缀只对"可新建"生效；`CHANGELOG.md` 总是允许
  - `O02-T4 cover`：样例 `cover.out` 按包汇总的结果与手算一致；没有门槛文件时只打印、退出码 0；给了门槛文件且低于门槛 → 失败
  - `O02-T5 changelog`：改了 `engine/` 非测试文件且没改 `CHANGELOG.md` → 失败；只改 `_test.go` → 通过；带 `no-changelog` 标签 → 通过
- 人工验收（不算本叶子的完成条件，不算 `relay check` 第 ⑤ 项；合并推送后做，结果写进 `docs/ci.md`，K243）：§10 验收 1、2（门禁演练，原 `O02-T6`）、3、5。
- 允许使用的依赖：Go 标准库；GitHub 官方 Actions（固定到提交哈希）；`tools/versions.txt` 里的 CI 工具。
- 禁止事项：`G.02.05` 全部（特别是 R30、R35）；另：CI 里不配置模型密钥；不用第三方 Actions；不在 CI 里放宽 lint 或测试（`G.06.04-R2`、`G.05.05-R1`）；不对测试失败自动重跑。
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）；`docs/ci.md` 写明当前该是绿的任务清单和哪些还是桩。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 首版 | 第 10 棒；`P.09` K189、K192 |
| 2026-11-23 | `main` 的合并条件改为按新的 `G.08-R3` | `P.09` K209 |
| 2026-11-24 | 第 ⑧b 片（`m0-ci`）开工前复查：M0 不设分支保护，CI 做事后检查（用户决定）；`ci.yml` 也在 `ci-drill/**` 上运行；桩照常调用、`cover` 只出报告、`perf` 任务由带来脚本的叶子加；Actions 哈希由验证者查；`gitleaks`、`govulncheck` 版本进 `tools/versions.txt`；门禁演练改为人工验收；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K241、K243 |
