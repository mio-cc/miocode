# G.11 配置与环境变量

| 项 | 内容 |
|---|---|
| 编号 | G.11 |
| 类型 | 规范 |
| 上级 | G 工程规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 目的
统一配置的来源、优先级和命名。

## 2. 配置来源和优先级（高 → 低）
1. 命令行参数：`--data-dir`、`--port`、`--dev`、`--no-browser`、`--fake-llm`、`--log-level`
2. 环境变量：`HARNESS_*`
3. 配置文件：`<DataDir>/harness.yaml`（设置页修改的就是这个文件）
4. 内置默认值

- **G.11-R1** 每个配置项在 `internal/platform/config/schema.go` 里登记一次：名称、类型、默认值、命令行参数名、环境变量名、是否可以热更新、说明。不在别处读配置。
- **G.11-R2** 环境变量名 = `HARNESS_` + 配置路径大写、点换下划线：`server.port` → `HARNESS_SERVER_PORT`。
- **G.11-R3** 密钥**不能**写进配置文件和环境变量，只能存在系统密钥库（`S.03`）。配置文件里只写密钥名。开发和 CI 场景例外：允许 `HARNESS_DEV_SECRET_<名>`，且只在 `--dev` 模式生效。
- **G.11-R4** 配置文件改动后热更新：能热更新的项立即生效（主题、日志级别、资源池配额在下一次运行生效），不能热更新的项（端口、数据目录）在设置页提示"重启后生效"。
- **G.11-R5** 未知配置项：记警告，原样保留，不报错（便于版本回退）。
- **G.11-R6** 配置文件里的路径支持 `~` 和环境变量展开，统一转成绝对路径。

## 3. 主要配置项
| 路径 | 默认 | 命令行 | 热更新 |
|---|---|---|---|
| `server.port` | `0`（自动选一个空闲端口，写进 `<DataDir>/port`） | `--port` | 否 |
| `server.open_browser` | `true` | `--no-browser` | 否 |
| `data.dir` | Windows `%APPDATA%\Harness`；macOS `~/Library/Application Support/Harness`；Linux `~/.local/share/harness` | `--data-dir` | 否 |
| `data.retention.blob_days` | `30` | — | 是 |
| `log.level` | `info` | `--log-level` | 是 |
| `ui.theme.palette` | `paper`（可选 `graphite`、`whale`、`amber`，`U.03.05`） | — | 是 |
| `ui.theme.mode` | `light`（可选 `dark`、`system`） | — | 是 |
| `models.default` | 空（首次引导时选） | — | 是 |
| `models.providers` | `[]` | — | 是 |
| `pools.global_concurrency` | `8` | — | 下次运行 |
| `tools.allowed_hosts` | `[]` | — | 是 |
| `mcp.servers` | `[]` | — | 是（重新连接） |
| `telemetry.enabled` | `false` | — | 是 |

## 4. 检查方式
单元测试：每个登记的配置项都能通过三种方式设置，优先级正确；`harnessctl doctor` 打印最终生效的配置（密钥名显示，密钥值不显示）。
