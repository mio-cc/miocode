# G.11 配置与环境变量

| 项 | 内容 |
|---|---|
| 编号 | G.11 |
| 类型 | 规范 |
| 上级 | G 工程规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-24 |

## 1. 目的
统一配置的来源、优先级和命名。

## 2. 配置来源和优先级（高 → 低）
1. 命令行参数：`--data-dir`、`--port`、`--dev`、`--no-browser`、`--fake-llm`、`--log-level`
2. 环境变量：`ANYDOOR_*`
3. 配置文件：`<DataDir>/anydoor.yaml`（设置页修改的就是这个文件）
4. 内置默认值

- **G.11-R1** 每个配置项在 `internal/platform/config/schema.go` 里登记一次：名称、类型、默认值、命令行参数名、环境变量名、是否可以热更新、说明。不在别处读配置。
- **G.11-R2** 环境变量名 = `ANYDOOR_` + 配置路径大写、点换下划线：`server.port` → `ANYDOOR_SERVER_PORT`。
- **G.11-R3** 密钥**不能**写进配置文件和环境变量，只能存在系统密钥库（`S.03`）。配置文件里只写密钥名。开发和 CI 场景例外：允许 `ANYDOOR_DEV_SECRET_<名>`，且只在 `--dev` 模式生效。
- **G.11-R4** 配置文件改动后热更新：能热更新的项立即生效（主题、日志级别、资源池配额在下一次运行生效），不能热更新的项（端口、数据目录）在设置页提示"重启后生效"。
- **G.11-R5** 未知配置项：记警告，原样保留，不报错（便于版本回退）。
- **G.11-R6** 配置文件里的路径支持 `~` 和环境变量展开，统一转成绝对路径。

## 3. 主要配置项
| 路径 | 默认 | 命令行 | 热更新 |
|---|---|---|---|
| `server.port` | `0`（自动选一个空闲端口，写进 `<DataDir>/port`） | `--port` | 否 |
| `server.open_browser` | `true` | `--no-browser` | 否 |
| `data.dir` | Windows `%APPDATA%\AnywhereDoor`；macOS `~/Library/Application Support/AnywhereDoor`；Linux `~/.local/share/anydoor` | `--data-dir` | 否 |
| `data.retention.blob_days` | `30` | — | 是 |
| `log.level` | `info` | `--log-level` | 是 |
| `ui.theme.palette` | `paper`（可选 `graphite`、`whale`、`amber`，`U.03.05`） | — | 是 |
| `ui.theme.mode` | `light`（可选 `dark`、`system`） | — | 是 |
| `models.default` | 空（首次引导时选） | — | 是 |
| `models.providers` | `[]`（每项是一个模型提供方，格式见 `E.10.01` §4.3） | — | 是 |
| `pools.global_concurrency` | `8` | — | 下次运行 |
| `tools.allowed_hosts` | `[]` | — | 是 |
| `mcp.servers` | `[]` | — | 是（重新连接） |
| `telemetry.enabled` | `false` | — | 是 |
| `general.send_key` | `enter`（可选 `mod`） | — | 是 |
| `notify.approval` · `notify.run` · `notify.connection` · `notify.budget` | `true` | — | 是 |
| `notify.desktop` | `false` | — | 是 |
| `models.orchestrator` | 空（= 用 `models.default`）；生成默认对话入口图时它的模型节点用这个，之后以入口图为准（`B.06.02-R3`） | — | 是 |
| `chat.entry_graph` | 空（首次启动时用内置模板生成一张，填它的 ID） | — | 是 |
| `models.default_effort` | `medium`（`off` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max`） | — | 是 |
| `models.demo_mode` | `false`（`--fake-llm` 时为 `true`） | `--fake-llm` | 是 |
| `authz.default_level` | `1` | — | 是（只影响新会话） |
| `approval.merge_similar` | `true` | — | 是 |
| `approval.timeout_minutes` | `0`（不限） | — | 下次运行 |
| `sandbox.backend` | `wazero`（可选 `docker`） | — | 下次运行 |
| `sandbox.timeout_s` · `sandbox.memory_mb` | `10` · `256`（上限 30 · 512，`S.06`） | — | 下次运行 |
| `sandbox.network` | `false` | — | 下次运行 |
| `tools.file_roots` | `[]` | — | 是 |
| `mcp.allow_local_http` | `false` | — | 是 |
| `budget.monthly_micros` | `0`（不设；只用于进度和提醒） | — | 是 |
| `budget.run_default_micros` | `0`（不设） | — | 下次运行 |
| `packages.<包 id>.<key>` | 按包的 `SettingDef.default`（`C.15`） | — | 按包声明 |
| `onboarding.step` | `welcome`（`B.06.04`） | — | 是 |
| `security.taint_guard` | `true`，只读（INV-16） | — | — |
| `server.local_only` | `true`，只读（INV-21） | — | — |

- 设置页显示哪些项、怎么分组，见 `W.09.02` §5.2；上表是唯一的路径来源（`P.09` K142）。

## 4. 检查方式
单元测试：每个登记的配置项都能通过三种方式设置，优先级正确；`anydoorctl doctor` 打印最终生效的配置（密钥名显示，密钥值不显示）。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §3 补登设置页的全部配置路径（发送键、通知、默认模型与思考强度、演示模式、默认档位、审批、沙箱、文件目录、本机 HTTP MCP、预算、包的设置、引导进度、两个只读项） | 第 9 棒写 `W.09.02`；`P.09` K115 定稿为 K142 |
| 2026-11-23 | 加 `chat.entry_graph`；`models.orchestrator` 写明只用于生成默认对话入口图 | `P.09` K233 |
| 2026-11-24 | `models.providers` 写明格式 | `P.09` K250 |
