# E.03.01 Registry

| 项 | 内容 |
|---|---|
| 编号 | E.03.01 |
| 类型 | 实施 |
| 上级 | E.03 schema 注册与校验 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01 |
| 最后修改 | 2026-11-22 |

## 1. 职责
注册和查询节点定义、类型、配方、角色卡、执行器；对运行冻结出一个不可变视图。

## 2. 不做什么
- 不加载扩展包文件（`E.04` 负责读文件，然后调用这里的注册方法）
- 不持久化（启动时从 `schema/builtin/` 和已安装扩展包重新加载）

## 3. 继承的上级约束
INV-01、INV-02、INV-05、`C.03`、`C.13`、`C.12-R6`。

## 4. 接口
```go
type Registry struct{ /* 私有，带 RWMutex */ }

func NewRegistry() *Registry
func (r *Registry) LoadBuiltin(fsys fs.FS) error          // schema/builtin/**（嵌入的 FS）
func (r *Registry) Install(p *Package) error              // 由 E.04 调用；不能覆盖内置项（C.13-R3）
func (r *Registry) Uninstall(name string) error
func (r *Registry) RegisterExecutor(e exec.Executor) error

type View interface {                                     // 只读视图
    NodeDef(typeRef string) (*NodeDef, bool)              // "Agent" / "pack/节点@1"（主版本 → 已安装的最高次版本）
    Executor(kind string) (exec.Executor, bool)
    Type(ref string) (*TypeDef, bool)                     // "方案@1.2" 解析到主版本 1
    Recipe(ref string) (*gen.Recipe, bool)
    RoleCard(ref string) (*RoleCard, bool)                // 已解析继承（E.13.05）
    Tables() *gen.Tables                                  // 容器规则、控件映射等生成表
    Hash() string                                         // 注册表哈希（C.12 §2）
}
func (r *Registry) Snapshot() View                        // 冻结运行时调用；之后安装新包不影响它
func (r *Registry) Live() View                            // 编辑态使用
```

## 5. 行为
1. `LoadBuiltin`：依次加载类型 → 配方 → 角色卡 → NodeDef；每个文件按对应 schema 校验（YAML 报错带行号，`C.13-R1`）。
2. 注册 NodeDef 时检查：`kind=atomic` 只能来自内置目录；端口名、参数名不重复（`C.03.01-R3`）；内联参数 ≤ 3；`widget` 与 `type` 兼容；端口数 ≤ 8。
3. `RegisterExecutor` 检查 `Caps.Model=true` 的执行器 `Kind()` 必须是 `Agent`——**这是全内核唯一允许按类型名判断的地方**（INV-05 的落实点），在代码注释里写明。
4. 13 个原子 NodeDef 都必须有对应执行器，否则 `LoadBuiltin` 失败。
5. `Hash()` = 所有已注册 NodeDef、类型、配方、角色卡的规范化内容排序后的 sha256。

## 6. 不变量
- `Snapshot()` 返回后，任何安装、卸载都不改变它的结果
- 内置项不可被覆盖、不可被卸载

## 7. 错误处理
注册失败返回带文件名和行号的 `RegistryError`；`LoadBuiltin` 遇到第一个错误就停止并返回所有已发现的错误（不止第一个）。

## 8. 验收标准
1. 13 个原子节点全部加载、都有执行器
2. 扩展包里同名类型被拒绝
3. 非 Agent 执行器声明 Caps.Model 被拒绝
4. Snapshot 不受后续安装影响
5. 注册表哈希在相同内容下稳定

### 实施卡
- 要建 / 要改的文件：`engine/schema/registry.go`、`engine/schema/view.go`、`engine/schema/load.go`、`engine/schema/registry_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0301-T1 内置全量加载`
  - `E0301-T2 覆盖内置被拒`
  - `E0301-T3 Caps.Model 限制（INV-05）`
  - `E0301-T4 Snapshot 隔离`
  - `E0301-T5 哈希稳定`
  - `E0301-T6 YAML 行号报错`
- 允许使用的依赖：标准库、`goccy/go-yaml`、`santhosh-tekuri/jsonschema/v6`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
