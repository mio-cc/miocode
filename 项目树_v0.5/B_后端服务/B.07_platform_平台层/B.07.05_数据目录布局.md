# B.07.05 数据目录布局

| 项 | 内容 |
|---|---|
| 编号 | B.07.05 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 新 |
| 最后修改 | 2026-11-24 |

## 1. 职责
规定数据目录的位置和内部布局；提供取路径、收紧权限、原子写文件的函数，平台层和其他代码都通过它取路径。

## 2. 不做什么
- 不规定备份策略（`O.07`）
- 不读配置文件（数据目录在读配置文件之前确定，`B.07.03`）

## 3. 继承的上级约束
`B.07-R1`–`R6`、`S.11` §1、`S.11-R8`、`G.11` §3（`data.dir`）。

## 4. 接口
```go
// internal/platform/datadir/datadir.go
type Dir struct{ Root string }                 // Root 是绝对路径

// Resolve 确定数据目录：flag（--data-dir）> 环境变量 ANYDOOR_DATA_DIR > 开发模式 ./.anydoor-dev > 默认位置。
func Resolve(flag string, dev bool) (string, error)
// DefaultDir 是 goos 上的默认位置（纯函数，三平台都能在任一平台上测）。
func DefaultDir(goos string, getenv func(string) string, home string) string
// Open 创建缺失的目录、收紧根目录权限、清空 tmp/。
func Open(root string) (Dir, error)

func (d Dir) DB() string            // anydoor.db
func (d Dir) Config() string        // anydoor.yaml
func (d Dir) Token() string         // token
func (d Dir) Port() string          // port
func (d Dir) Lock() string          // anydoor.lock
func (d Dir) Secrets() string       // secrets.enc
func (d Dir) SecretsIndex() string  // secrets.index.json
func (d Dir) Blobs() string         // blobs/
func (d Dir) Workspaces() string    // workspaces/
func (d Dir) Extensions() string    // extensions/
func (d Dir) MCP() string           // mcp/
func (d Dir) Skills() string        // skills/
func (d Dir) Logs() string          // logs/
func (d Dir) Tmp() string           // tmp/

// Restrict 把 path 收紧到只有当前用户能访问。
func Restrict(path string) error
// WritePrivate 原子写：同目录临时文件 → 写入 → Restrict → 改名覆盖。
func WritePrivate(path string, data []byte) error
```
默认位置：
| 系统 | 位置 |
|---|---|
| Windows | `%APPDATA%\AnywhereDoor`；`APPDATA` 为空时 `<home>\AppData\Roaming\AnywhereDoor` |
| macOS | `<home>/Library/Application Support/AnywhereDoor` |
| Linux 等其他 | `$XDG_DATA_HOME/anydoor`；`XDG_DATA_HOME` 为空或不是绝对路径时 `<home>/.local/share/anydoor` |

开发模式的 `./.anydoor-dev/` 相对当前工作目录，转成绝对路径。`flag` 和环境变量里的 `~`、`$VAR` 先展开再转绝对路径（`G.11-R6`）。

```
<DataDir>/
├── anydoor.db            # SQLite（WAL：另有 -wal、-shm 文件）
├── anydoor.db.bak-*      # 迁移前备份，保留 3 份（E.07.03）
├── anydoor.yaml          # 配置
├── token                 # 本机 token
├── port                  # 当前端口（运行时）
├── anydoor.lock          # 单实例锁
├── secrets.enc           # 仅在文件后端时存在
├── secrets.index.json    # 密钥名、末 4 位、更新时间（不含密钥值，B.07.02）
├── blobs/ab/cd/<hash>    # 内容寻址存储
├── workspaces/<run_id>/  # 运行工作区（文件工具、代码沙箱）
├── extensions/<名>/      # 已安装扩展包；extensions/.pending/ 由扩展安装的叶子建
├── mcp/<名>/             # MCP stdio 服务的工作目录
├── skills/<名>/          # 用户安装的技能
├── logs/                 # anydoor-YYYYMMDD.log
└── tmp/                  # 临时文件，启动时清空
```

## 5. 行为
- `Open`：`MkdirAll` 根目录和 7 个子目录（`blobs`、`workspaces`、`extensions`、`mcp`、`skills`、`logs`、`tmp`）；`Restrict` 根目录（子目录和以后建的文件继承）；`tmp/` 先整个删掉再重建。根目录不是绝对路径：返回错误。
- `Restrict`：
  - Unix：目录 `0700`，文件 `0600`。
  - Windows（`golang.org/x/sys/windows`）：DACL 设为受保护（不再继承上级目录的权限），只有一条"当前用户完全控制"；目录上这一条可被子目录和文件继承。
- `WritePrivate`：临时文件名 `.<文件名>.tmp-<随机>`，写完 `Sync`、关闭、`Restrict`，再改名覆盖目标；任何一步失败删掉临时文件。
- 路径计算集中在这个包里，其他代码不自己拼数据目录下的路径（`B.07-R6`）。

## 6. 不变量
- 所有持久化文件都在数据目录内
- `Restrict` 之后，Unix 上同组和其他用户没有任何权限；Windows 上 DACL 只有当前用户一条

## 7. 错误处理
数据目录建不了或不可写：`Open` 返回 `datadir: 数据目录 <路径> 不可写：<原错误>`（`B.01` §3 原样打印）。

## 8. 验收标准
1. 三平台默认位置
2. 子目录自动创建，权限只有当前用户
3. tmp 启动清空
4. 原子写不留临时文件

### 实施卡
- 要建 / 要改的文件：`internal/platform/datadir/datadir.go`、`internal/platform/datadir/perm_unix.go`、`internal/platform/datadir/perm_windows.go`、`internal/platform/datadir/datadir_test.go`、`internal/platform/datadir/perm_windows_test.go`、`internal/platform/datadir/perm_unix_test.go`、`go.mod`、`go.sum`
- `go.mod` 加 `golang.org/x/sys`（`G.10` 已登记）：验证者 `go get golang.org/x/sys@latest` 后 `go mod tidy`；实施者不手改。
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/platform/auth/`、`internal/platform/secret/`、`internal/platform/config/`、`internal/platform/lock/`
- 测试用例：
  - `B0705-T1 默认位置`：`DefaultDir` 在 windows、darwin、linux 三个 `goos` 下各至少两种环境（有无 `APPDATA` / `XDG_DATA_HOME`，`XDG_DATA_HOME` 是相对路径）得到 §4 表里的路径；`Resolve` 的四级优先级（flag、环境变量、开发模式、默认），flag 里的 `~` 被展开、相对路径转成绝对路径
  - `B0705-T2 创建与权限`：`Open` 一个不存在的目录后 7 个子目录都在；根目录权限只有当前用户（Unix 查 mode；Windows 查 DACL 受保护、只有一条、SID 是当前用户）；`WritePrivate` 写的文件同样；`Open` 一个相对路径返回错误
  - `B0705-T3 tmp 清空`：`tmp/` 里放文件和子目录，再次 `Open` 后 `tmp/` 是空的，其他子目录里的文件还在
  - `B0705-T4 原子写`：`WritePrivate` 覆盖已有文件后内容是新的，目录里没有 `.tmp-` 文件；目标所在目录不存在时返回错误、不留临时文件
- 允许使用的依赖：标准库、`golang.org/x/sys`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑦ 片（`m0-platform`）开工前复查：接口写全（`Resolve`、`DefaultDir`、各路径方法、`Restrict`、`WritePrivate`）；Linux 默认位置的规则；布局加 `secrets.index.json`；本叶子把 `golang.org/x/sys` 加进 `go.mod`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K239、K240 |
