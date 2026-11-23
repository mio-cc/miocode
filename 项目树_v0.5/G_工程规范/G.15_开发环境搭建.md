# G.15 开发环境搭建

| 项 | 内容 |
|---|---|
| 编号 | G.15 |
| 类型 | 说明 |
| 上级 | G 工程规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§4 |
| 最后修改 | 2026-11-22 |

## 1. 目的
让任何人（包括新加入的实施模型的执行环境）在 Windows、macOS、Linux 上用相同的步骤把项目跑起来。

## 2. 需要的工具
| 工具 | 版本 | 用途 |
|---|---|---|
| Go | 1.23 或更高 | 后端 |
| Node.js | 22 LTS | 前端构建 |
| pnpm | 9.x（通过 `corepack enable` 安装） | 前端包管理 |
| golangci-lint | 与 `.golangci.yml` 匹配的版本，写在 `tools/versions.txt` | lint |
| Git | 2.40 或更高 | — |
| make（可选） | — | Windows 上可以不装，直接用 Taskfile 或底层命令 |

## 3. 步骤
```bash
git clone <仓库> harness && cd harness
corepack enable
pnpm -C web install --frozen-lockfile
go run ./tools/gen                 # 生成代码
go run ./cmd/harnessd --dev        # 终端 1：后端（开发模式，代理到 Vite）
pnpm -C web dev                    # 终端 2：前端
# 浏览器打开终端 1 打印的地址
```
等价命令：`make dev`（macOS / Linux）或 `task dev`（Windows），二者都执行 `go run ./tools/dev`：在一个终端里同时启动后端和前端，按 Ctrl+C 两个一起退出（`O.01` §4.3）。

## 4. 开发模式的约定
- `--dev`：不嵌入前端产物，非 `/api` 请求代理到 Vite（`http://127.0.0.1:5173`）；日志同时输出到终端；允许 `HARNESS_DEV_SECRET_*` 环境变量（`G.11-R3`）。
- `--fake-llm`：所有模型调用使用 `llm/fake`，不需要任何密钥就能跑通模板（演示和端到端测试用）。
- 开发数据目录默认 `./.harness-dev/`，不污染正式数据目录。

## 5. 常见问题
| 现象 | 处理 |
|---|---|
| Windows 上 `make` 不可用 | 用 `task dev`，或直接执行 §3 的命令 |
| 端口被占用 | `--port 0` 自动选择，或指定其他端口 |
| 生成代码有差异导致 CI 失败 | 本地执行 `go run ./tools/gen` 后提交 |
| 字体没有显示 | 执行 `go run ./tools/gen fonts` 复制自托管字体（`U.04`） |

## 6. 检查方式
CI 的三平台任务就是按本文 §3 执行的；本文改动时同步改 CI。

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §3 写明 `make dev` / `task dev` 执行 `tools/dev` | 第 10 棒写 `O.01`；`P.09` K188 |
