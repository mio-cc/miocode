# G.10 依赖管理

| 项 | 内容 |
|---|---|
| 编号 | G.10 |
| 类型 | 规范 |
| 上级 | G 工程规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§5 |
| 最后修改 | 2026-11-24 |

## 1. 目的
控制引入哪些第三方依赖。每个依赖都是安全、体积、许可证和维护风险；实施模型尤其喜欢"顺手装一个库"。

## 2. 规则
| 编号 | 规则 |
|---|---|
| G.10-R1 | 只能使用本文 §3 清单里登记的依赖。清单外的依赖一律不得引入（`G.02.05-R28`） |
| G.10-R2 | 新增依赖：写上报单（`G.02.03-R5`）说明用途、备选方案、许可证、维护情况、体积；设计方同意后加进清单，再引入 |
| G.10-R3 | 优先使用标准库；能用 50 行以内代码实现的功能不引入依赖 |
| G.10-R4 | Go 依赖不能需要 cgo（`G.05-R3`） |
| G.10-R5 | 许可证只接受 MIT、BSD、Apache-2.0、ISC、MPL-2.0；GPL、AGPL、SSPL、未声明许可证的一律不用（参考项目不受此限，因为只参考不引入，ADR-010） |
| G.10-R6 | 版本锁定：Go 用 `go.sum`，前端用 `pnpm-lock.yaml`；不使用 `latest` 或范围版本的漂移 |
| G.10-R7 | 升级节奏：安全更新随时；次版本每个里程碑结束时统一升级一次；主版本升级需要上报 |

## 3. 已登记依赖清单
> 本节清单在代码仓库里有一份副本 `tools/deps/allow.txt`，CI 用它检查（`O.02`）；改本节时同一批改动里同步改副本（`P.09` K189）。
### 3.1 Go（运行时）
| 用途 | 依赖 | 许可证 |
|---|---|---|
| SQLite | `modernc.org/sqlite` | BSD-3 |
| ULID | `github.com/oklog/ulid/v2` | Apache-2.0 |
| 表达式 | `github.com/expr-lang/expr` | MIT |
| JSON Schema 校验 | `github.com/santhosh-tekuri/jsonschema/v6` | Apache-2.0 |
| YAML | `github.com/goccy/go-yaml` | MIT |
| OpenTelemetry | `go.opentelemetry.io/otel` 及其 sdk、otlp 导出器 | Apache-2.0 |
| Prometheus | `github.com/prometheus/client_golang` | Apache-2.0 |
| 限流 | `golang.org/x/time/rate` | BSD-3 |
| 并发工具 | `golang.org/x/sync`（errgroup、semaphore） | BSD-3 |
| MCP | `github.com/modelcontextprotocol/go-sdk` | MIT |
| WASM 沙箱 | `github.com/tetratelabs/wazero` | Apache-2.0 |
| 系统密钥 | `github.com/zalando/go-keyring` | MIT |
| 打开浏览器 | `github.com/pkg/browser` | BSD-2 |
| 加密（Argon2id、XChaCha20-Poly1305） | `golang.org/x/crypto` | BSD-3 |
| 系统调用（文件锁、Windows ACL） | `golang.org/x/sys` | BSD-3 |
| token 计数（OpenAI 系列） | `github.com/pkoukk/tiktoken-go` + `github.com/pkoukk/tiktoken-go-loader`（离线词表，打包进二进制） | MIT |
| 网页正文提取 | `codeberg.org/readeck/go-readability`（go-shiori/go-readability 的维护版） | Apache-2.0 |
| 授权判定（候选，PoC 通过后才能引入） | Cedar 的 Go 实现 | 待 ADR-007 |

### 3.2 Go（只用于测试和开发）
| 用途 | 依赖 |
|---|---|
| 断言 | `github.com/stretchr/testify` |
| 属性测试 | `pgregory.net/rapid` |
| goroutine 泄漏检查 | `go.uber.org/goleak` |

### 3.3 前端（运行时）
| 用途 | 依赖 |
|---|---|
| 框架 | `react`、`react-dom`（19） |
| 路由 | `react-router` |
| 状态 | `zustand` |
| 对话界面 | `@assistant-ui/react`（只用 headless 组件）；v1 不使用：对话页、输入框由 `W.07.04`、`W.07.07` 自己实现，只用 `react-markdown` + `rehype-sanitize`，以后要用时不需重新登记（`P.09` K184） |
| Markdown 渲染 | `react-markdown` + `rehype-sanitize`（`W.07.04`） |
| 浮层行为 | `@floating-ui/dom`（定位） |

### 3.4 前端（开发）
`vite`、`typescript`、`eslint`、`typescript-eslint`、`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh`、`stylelint`、`prettier`、`vitest`、`jsdom`、`@playwright/test`、`ajv`。

## 4. 检查方式
CI 脚本比对 `go.mod`（直接依赖）和 `web/package.json` 与本清单（清单的机器可读版：`tools/deps/allow.txt`，`O.02`；在它建立之前，`tools/relay check` 直接读本节，`O.01` §4.5）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §3.3 注明 `@assistant-ui/react` v1 不使用 | W 全枝复查；`P.09` K184 |
| 2026-11-23 | §3 写明代码仓库里的副本 `tools/deps/allow.txt` | 第 10 棒写 `O.02`；`P.09` K189 |
| 2026-11-23 | §4 机器可读清单的文件名与 `O.02` 一致（`allow.txt`） | `P.09` K196 |
| 2026-11-23 | 去掉 `go-jsonschema`、`json-schema-to-typescript`：生成器自研（`C.14` §2） | `P.09` K234 |
| 2026-11-24 | 去掉 `pressly/goose`：迁移执行器自写（全局注册违反 `E-R3`，`E.07.03`） | `P.09` K237 |
| 2026-11-24 | 去掉三家模型 SDK：模型接入改为按协议用标准库自研（ADR-011）；代码仓库 `tools/deps/allow.txt` 在第 ⑨ 片同步 | `P.09` K250 |
