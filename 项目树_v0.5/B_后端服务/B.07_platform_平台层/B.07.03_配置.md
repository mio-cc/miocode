# B.07.03 配置

| 项 | 内容 |
|---|---|
| 编号 | B.07.03 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引15 |
| 最后修改 | 2026-11-24 |

## 1. 职责
解析命令行；加载、合并、校验、监视、写入配置：命令行 > 环境变量 > 配置文件 > 默认值（`G.11`）。维护配置项登记表 `schema.go`（`G.11-R1`）。

## 2. 不做什么
- 不决定数据目录（`B.07.05` 的 `Resolve`，在读配置文件之前）
- 不决定设置页怎么显示（`W.09.02`）
- 配置项的含义由用到它的文档定，本叶子只登记 `G.11` §3 的路径、类型、默认值

## 3. 继承的上级约束
`B.07-R1`–`R6`、`G.11-R1`–`R6`、`G.11` §3、`S.03-R8`。

## 4. 接口
```go
// internal/platform/config/args.go
type Args struct {
    DataDir, LogLevel string
    Port              *int      // 没写 --port 时为 nil
    NoBrowser, Dev, FakeLLM, Version bool
}
func ParseArgs(args []string) (Args, error)   // 只认 G.11 §2 的参数和 --version；不认识的参数返回错误

// internal/platform/config/schema.go（G.11-R1：唯一的登记处）
type Kind int    // String、Int、Bool、Strings（字符串列表）、Any（任意 YAML 值）
type Hot int     // Restart（否）、Live（是）、NextRun（下次运行）、ReadOnly（只读）
type Item struct {
    Path    string
    Kind    Kind
    Default any
    Flag    string     // 命令行参数名，没有为空
    Env     bool       // 能不能用环境变量设（data.dir 由 B.07.05 读 ANYDOOR_DATA_DIR，这里为 false）
    Hot     Hot
    Enum    []string   // 字符串的可选值，空表示不限
    Min, Max *int64    // 整数范围
    IsPath  bool       // 路径（含路径列表）：展开 ~ 和环境变量、转绝对路径（G.11-R6）
}
var Items = []Item{ /* G.11 §3 每一行，合并写的行拆开 */ }
func EnvName(path string) string           // "ANYDOOR_" + 大写、点换下划线（G.11-R2）

// internal/platform/config/config.go
type Source string                          // default | file | env | flag
type Config struct{ /* 私有：值、来源、配置文件的原始内容 */ }
type Options struct{ Logger *slog.Logger; WatchInterval time.Duration }   // 缺省 2 秒
func Load(a Args, environ []string, d datadir.Dir, o Options) (*Config, error)
func (c *Config) Get(path string) (any, bool)
func (c *Config) Int(path string) int64
func (c *Config) Bool(path string) bool
func (c *Config) String(path string) string
func (c *Config) Strings(path string) []string
func (c *Config) Source(path string) Source
func (c *Config) Warnings() []string        // 未知项、被忽略的只读项、被忽略的 data.dir 等
func (c *Config) Pending() []string         // 文件里改了、要重启才生效的路径（G.11-R4）
func (c *Config) Watch(ctx context.Context, onChange func(*Config))   // 阻塞到 ctx 结束（调用方 go 它）；每 WatchInterval 查一次修改时间和大小

// internal/platform/config/write.go
func Write(d datadir.Dir, changes map[string]any) error   // 原子写，保留未知字段与注释
```

## 5. 行为
- **登记表**：`G.11` §3 每一行一项（`notify.*`、`sandbox.timeout_s · sandbox.memory_mb` 这类合并写的拆开）。范围：`server.port` 0–65535；`sandbox.timeout_s` 1–30；`sandbox.memory_mb` 16–512；`pools.global_concurrency` ≥ 1；`authz.default_level` 0–4；`data.retention.blob_days` ≥ 1；`budget.*`、`approval.timeout_minutes` ≥ 0。枚举照 `G.11` §3 括号里的可选值。`packages.<包 id>.<key>` 不登记成单项：`packages` 下的内容原样保留，`Get("packages.<id>.<key>")` 返回文件里的值，没有时为 nil（默认值由 `C.15` 的包声明给）。
- **四层合并**：先默认值；再配置文件 `d.Config()`（不存在不报错）；再环境变量（`environ` 里 `ANYDOOR_` 开头、且是登记项的 `EnvName`）；最后命令行：`--port` → `server.port`，`--no-browser` → `server.open_browser=false`，`--log-level` → `log.level`，`--fake-llm` → `models.demo_mode=true`，`--data-dir` → `data.dir`（`--dev`、`--version` 不是配置项）。每个值记下来源。`data.dir` 的值就是 `d.Root`。
- **环境变量的值**：`String` 原样；`Int`、`Bool` 用 `strconv` 解析；`Strings`、`Any` 按 YAML 解析（例如 `ANYDOOR_TOOLS_ALLOWED_HOSTS='[a.com, b.com]'`）。`ANYDOOR_DEV_SECRET_*`、`ANYDOOR_DATA_DIR` 不是本叶子读的，忽略。
- **校验**：类型、枚举、范围不对：来自命令行或环境变量的直接报错；来自文件的启动时报错（写明路径和行号），运行中热更新时见 §7。
- **只读项**（`security.taint_guard`、`server.local_only`）永远是默认值；任何来源设了都忽略，并记一条警告。`data.dir` 写在配置文件里也忽略并警告（数据目录在读配置文件之前就定了）。
- **未知项**（文件里不是登记项、也不在 `packages` 下的键）：记警告，原样保留（`G.11-R5`）。
- **路径项**（`data.dir`、`tools.file_roots`）用 `datadir.ExpandPath` 展开 `~`、`$VAR` / `${VAR}`（Windows 另外认 `%VAR%`），转绝对路径（相对的按数据目录）；`Write` 写进文件的是用户给的原样，不展开。
- **热更新**：`Watch` 发现文件的修改时间或大小变了就重新读文件层（命令行、环境变量那两层不变）：`Live`、`NextRun` 的项换成新值；`Restart` 的项保持旧值，路径加进 `Pending()`；有变化时回调 `onChange`（参数是新的 `*Config`，旧的不变）。
- **写入** `Write`：先按登记表校验每个改动（不是登记项、只读项、`data.dir`、类型不对：返回错误、什么也不写；`packages.<id>.<key>` 允许）；读出原文件按语法树修改（`goccy/go-yaml` 的 `parser.ParseBytes(…, parser.ParseComments)` 和 `yaml.PathString` 的替换 / 合并），已有的键替换值，没有的键在最近的上级下面补上；没改的行、注释、未知项原样保留；`datadir.WritePrivate` 原子写。文件不存在时新建。

## 6. 不变量
- 优先级正确
- 写入不丢失未知字段和注释
- 只读项不会被任何来源改掉

## 7. 错误处理
配置文件语法错误：启动时 `Load` 返回 `config: anydoor.yaml 第 N 行：<原因>`；类型或范围不对：`config: anydoor.yaml 第 N 行 <路径>：<原因>`。运行中被改坏（语法或类型）：忽略这次修改、保持旧配置、记 warn，下次文件再变时重试。

## 8. 验收标准
1. 四层优先级
2. 保留注释和未知字段
3. 手动编辑热更新
4. 坏文件不影响运行
5. 登记表与 `G.11` §3 一致

### 实施卡
- 要建 / 要改的文件：`internal/platform/config/args.go`、`internal/platform/config/schema.go`、`internal/platform/config/config.go`、`internal/platform/config/write.go`、`internal/platform/config/config_test.go`、`internal/platform/config/write_test.go`
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/platform/datadir/`、`internal/platform/auth/`、`internal/platform/secret/`、`internal/platform/lock/`
- 测试用例：
  - `B0703-T1 优先级`：`server.port`、`log.level` 在四层各设一个不同的值，逐层去掉后得到下一层的值，`Source` 对应；`--no-browser`、`--fake-llm` 的映射；`ParseArgs` 不认识的参数报错
  - `B0703-T2 保留`：带注释、未知项、`packages.x.y` 的文件，`Write` 改一个已有项、加一个没有的嵌套项（`notify.desktop`）后：其余各行（含注释和未知项）逐字不变；新值能读回；改只读项、`data.dir`、未登记项、类型不对时返回错误且文件不变；文件不存在时新建
  - `B0703-T3 热更新`：`WatchInterval` 20ms，改文件里的 `log.level`（`Live`）和 `server.port`（`Restart`）：1 秒内回调，新配置 `log.level` 变了、`server.port` 没变且在 `Pending()` 里；命令行设过的项不被文件改动覆盖
  - `B0703-T4 坏文件`：启动时语法错误的文件 `Load` 返回带行号的错误；`server.port: abc` 返回带路径的错误；运行中把文件改坏，不回调、旧配置照常可用，改好后再回调
  - `B0703-T5 登记表`：测试里手写 `G.11` §3 的全部路径清单，与 `Items` 逐个相同、没有重复；每项的默认值符合自己的类型、枚举、范围；能用环境变量的项按 `EnvName` 设置后生效；只读项从文件、环境变量设置都被忽略并有警告
  - `B0703-T6 值的解析与路径`：环境变量设 `Strings`（YAML 列表）和 `Bool`；`tools.file_roots: ["~/a", "$HOME/b", "rel"]` 展开成绝对路径（`rel` 按数据目录）；范围外的值（`sandbox.timeout_s: 60`）报错
- 允许使用的依赖：标准库、`github.com/goccy/go-yaml`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑦ 片（`m0-platform`）开工前复查：接口写全（`ParseArgs`、登记表结构、`Load` 的参数改为先定好的数据目录、类型化的取值、`Pending`、`Warnings`）；范围和枚举；只读项与 `data.dir` 的处理；环境变量值的解析；写入用语法树；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K239、K240 |
| 2026-11-24 | 状态改为"冻结"：第 ⑦ 片（`m0-platform`）squash 合并进代码仓库 `main`，提交 `4585c9e928fed58c90b0a70cb8e4b08a5248533a`（`G.02.06-R21`） | `relay slice` 通过；评审 9 条全部符合；按 `G.08-R3` 由验证者合并 |
