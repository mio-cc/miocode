# B.07.03 配置

| 项 | 内容 |
|---|---|
| 编号 | B.07.03 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 职责
加载、合并、监视、写入配置：命令行 > 环境变量 > 配置文件 > 默认值（`G.11`）。

## 2. 不做什么
- 不定义有哪些配置项（`G.11` §3 和 `internal/platform/config/schema.go`）

## 3. 继承的上级约束
`G.11-R1`–`R6`。

## 4. 接口
```go
type Config struct{ /* 生成自 schema.go 的登记表 */ }
func Load(args []string, env []string, dataDir string) (*Config, error)
func (c *Config) Get(path string) any
func Write(dataDir string, changes map[string]any) error     // 原子写，保留未知字段与注释
func Watch(ctx context.Context, dataDir string, onChange func(*Config))   // 每 2 秒检查修改时间
```

## 5. 行为
- 配置文件 `<DataDir>/harness.yaml`；不存在时不报错（全部用默认值）。
- 写入时保留未知字段（`G.11-R5`）和用户手写的注释（`goccy/go-yaml` 的 AST 方式修改）。
- 用户手动编辑配置文件也会被 `Watch` 发现并热更新。
- 路径展开 `~` 和环境变量（`G.11-R6`）。

## 6. 不变量
- 优先级正确
- 写入不丢失未知字段

## 7. 错误处理
配置文件格式错误：启动时报错并指出行号；运行中被改坏：忽略这次修改并记 warn，保持旧配置。

## 8. 验收标准
1. 四层优先级
2. 保留注释和未知字段
3. 手动编辑热更新
4. 坏文件不影响运行

### 实施卡
- 要建 / 要改的文件：`internal/platform/config/*.go`、`internal/platform/config/config_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0703-T1 优先级`
  - `B0703-T2 保留`
  - `B0703-T3 热更新`
  - `B0703-T4 坏文件`
- 允许使用的依赖：`goccy/go-yaml`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
