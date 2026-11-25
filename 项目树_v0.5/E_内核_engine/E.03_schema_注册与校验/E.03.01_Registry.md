# E.03.01 Registry

| 项 | 内容 |
|---|---|
| 编号 | E.03.01 |
| 类型 | 实施 |
| 上级 | E.03 schema 注册与校验 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引01 |
| 最后修改 | 2026-11-25 |

## 1. 职责
注册和查询节点定义、类型、配方、角色卡；对运行冻结出一个不可变视图；图文档版本迁移（`engine/schema/migrate`）。

## 2. 不做什么
- 不加载扩展包文件（`E.04` 负责读文件，然后调用这里的注册方法）
- 不持久化（启动时从 `schema/builtin/` 和已安装扩展包重新加载）
- 不注册执行器（`engine/exec`，第 ④ 片；"只有 Agent 能调模型"的检查在那里，INV-05，`P.09` K256 ①）
- 不合并角色卡的继承（`E.13.05`；这里只检查父卡存在、不成环）
- 不写 `migrate` Op（`E.05.01`，第 ③ 片；这里只把文档升级到当前版本）

## 3. 继承的上级约束
INV-01、INV-02、`C.03`、`C.13`、`C.12-R1`、`R3`、`R4`、`C.12-R6`、`E.03-R1`、`R3`、`R4`。

## 4. 接口
```go
type Registry struct{ /* 私有，带 RWMutex */ }

type Options struct{ Logger *slog.Logger }
func NewRegistry(o Options) *Registry
func (r *Registry) LoadBuiltin(fsys fs.FS) error          // fsys 的根是仓库的 schema/：读 *.schema.json 和 builtin/ 下的 types、recipes、rolecards、nodedefs、messages
func (r *Registry) Install(p *Package) error              // 由 E.04 调用；不能覆盖内置项（C.13-R3）
func (r *Registry) Uninstall(name string) error           // 内置项不能卸载

type Package struct {                                     // 扩展包里已经解析好的内容（E.04 负责读文件）
    Name, Version string
    NodeDefs  []*gen.NodeDef
    Types     []*gen.TypeDef
    Recipes   []*gen.Recipe
    RoleCards []*gen.Rolecard
}

type TypeSource interface {                               // 连线判定只要它（E.03.02）
    Type(ref string) (*gen.TypeDef, bool)
    Messages() *Messages
}
type View interface {                                     // 只读视图；返回的定义只读
    TypeSource
    NodeDef(typeRef string) (*gen.NodeDef, bool)          // "Agent" / "pack/节点@1"（主版本 → 已安装的最高次版本）
    NodeDefs() []*gen.NodeDef                             // 按类型名排序
    Type(ref string) (*gen.TypeDef, bool)                 // "方案@1.2" 解析到主版本 1 的最高次版本
    TypeSchema(ref string) (*jsonschema.Schema, bool)     // 类型对应的 JSON Schema（C.13.03-R3，注册时生成并缓存）
    DocSchema(name string) (*jsonschema.Schema, bool)     // 编译好的 schema/*.schema.json，如 "graph.schema.json"（V01 用）
    Recipe(ref string) (*gen.Recipe, bool)                // "执行者配方@1"；只写名称时取最高版本
    RoleCard(ref string) (*gen.Rolecard, bool)            // 同上；原样返回，不合并继承
    Hash() string                                         // 注册表哈希（C.12 §2）
}
func (r *Registry) Snapshot() View                        // 冻结运行时调用；之后安装新包不影响它
func (r *Registry) Live() View                            // 编辑态使用

type RegistryError struct{ File string; Line int; Item, Msg string }
func (e *RegistryError) Error() string
type Errors []*RegistryError                             // LoadBuiltin、Install 返回的全部错误；实现 error
func LooksLikeSecret(s string) bool                       // C.03.02-R3 的判断（V03 也用）
```
```go
package migrate // engine/schema/migrate（C.12-R4）
const Current = "1.0"
type Func func(doc map[string]any) (map[string]any, error)
type Step struct{ From, To string; Fn Func }
var Chain []Step                                         // 内置迁移链；v1 的格式从 1.0 开始，现在为空
var ErrTooNew = errors.New("这张图由更新版本的 Anywhere Door 创建，请升级") // C.12-R3
var ErrNoVersion error                                   // 没有 schema_version 或写法不对
func Apply(raw []byte, chain []Step) (out []byte, from string, err error) // 按 schema_version 逐级升级到链的最后一个版本；已是最新时原样返回；高于 Current 返回 ErrTooNew
```

## 5. 行为
1. `LoadBuiltin`：编译 `*.schema.json`；依次加载类型 → 配方 → 角色卡 → NodeDef；每个文件先按对应 schema 校验（YAML 报错带行号，`C.13-R1`）。遇到错误继续加载其他文件，最后返回全部错误（`Errors`）。
2. 名字归属：节点定义、类型、配方、角色卡各按名字记归谁，内置和别的包已经用过的名字都不能再用；扩展节点的查找键是 `包名/名称@主版本`。每次修改在副本上做，成功后整体替换（`Snapshot` 因此不用复制）；失败时注册表不变。跨项的检查（引用的类型已注册、角色卡继承链、类型的 JSON Schema）在全部项加进来之后统一做。
3. 注册 NodeDef 时检查：`kind=atomic` 只能来自内置目录；端口名、参数名不重复（`C.03.01-R3`）；端口数 ≤ 8（动态端口不计，`C.03.01-R5`）；参数的 `ui.widget` 与 `type` 兼容（`gen.WidgetRules` 推得出的控件加 `auto`；`connection` 只用于 `string`，`C.03.02`）；`secret` 类型参数的缺省值像密钥值时拒绝（`C.03.02-R2`、`R3`）；端口和参数里引用的类型都已注册。
4. 注册类型时检查：同名同主版本的次版本只能加可选字段（`C.13.03-R1`）；扩展包不能声明系统类型；为每个类型生成 JSON Schema 并缓存（`C.13.03-R3`；引用别的类型用 `$ref`，`extends` 用 `allOf`，不限制多余字段）。
5. 注册角色卡时检查：`extends` 指向的父卡已注册、继承链不成环。
6. `Hash()` = 所有已注册 NodeDef、类型、配方、角色卡按"种类 + 名称 + 版本"排序后，逐个 `graph.Canonical` 拼接的 sha256（`"sha256:<hex>"`）。
7. 执行器、"13 个原子节点都要有执行器"不在这里检查：M1 只实现 6 个执行器，其余 7 种节点能搭图、能校验，运行冻结时（`E.16.01`，第 ④ 片）因为没有执行器被拒绝运行（用户决定"能搭不能跑"，K256）。
8. `migrate.Apply`：读 `schema_version`；高于 `Current` 和链上所有 `To` 时返回 `ErrTooNew`；等于链上某个 `From` 就调用它、再从新的版本接着找，直到没有可用的步骤；结果 `schema_version` 写成最后的 `To`；没有可用的步骤时原样返回输入的字节。

## 6. 不变量
- `Snapshot()` 返回后，任何安装、卸载都不改变它的结果
- 内置项不可被覆盖、不可被卸载
- 相同内容的注册表 `Hash()` 相同，与加载顺序无关

## 7. 错误处理
注册失败返回带文件名和行号的 `RegistryError`；`LoadBuiltin` 返回所有发现的错误（不止第一个）。

## 8. 验收标准
1. 13 个原子节点、17 个类型、6 个配方、7 张角色卡全部加载
2. 扩展包里同名类型被拒绝
3. Snapshot 不受后续安装影响
4. 注册表哈希在相同内容下稳定
5. 迁移链为空时 `1.0` 原样通过；`9.0` 被拒绝（`C12-T1`、`C12-T2`）

### 实施卡
- 要建 / 要改的文件：`engine/schema/registry.go`、`engine/schema/view.go`、`engine/schema/load.go`、`engine/schema/registry_test.go`、`engine/schema/migrate/migrate.go`、`engine/schema/migrate/migrate_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/store/`、`engine/llm/`
- 测试用例：
  - `E0301-T1 内置全量加载`：用 `os.DirFS` 指向仓库的 `schema/`，13 个 NodeDef、17 个类型、6 个配方、7 张角色卡都能查到；`NodeDefs()` 排序
  - `E0301-T2 覆盖内置被拒`：扩展包里同名 NodeDef、同名类型、同名配方各被拒绝；`Uninstall` 内置项被拒绝；扩展包能安装、卸载
  - `E0301-T3 扩展包不能声明原子节点和系统类型`：`kind=atomic` 的 NodeDef、`system: true` 的类型从扩展包安装时被拒绝
  - `E0301-T4 Snapshot 隔离`：`Snapshot()` 之后安装、卸载扩展包，快照的查询和 `Hash()` 都不变；`Live()` 看得到变化
  - `E0301-T5 哈希稳定`：同样内容按不同顺序安装，`Hash()` 相同；内容变一个字段，`Hash()` 变
  - `E0301-T6 YAML 行号报错`：测试里用 `fstest.MapFS` 放一个格式错和一个 schema 不通过的 NodeDef，`LoadBuiltin` 返回两条错误，都带文件名和行号
  - `E0301-T7 参数与端口声明`：扩展 NodeDef 参数名与端口名重复（`C.03.01` §7 验收 3）、端口超过 8 个、`ui.widget` 与 `type` 不兼容、`secret` 参数的缺省值像密钥值（`C.03.02-R2`、`R3`）、引用了没注册的类型时注册失败
  - `E0301-T8 类型声明`：17 个内置类型各生成一份 JSON Schema 并缓存（`C.13.03-R3`），合法值通过、非法值失败；次版本里新增必填字段的类型加载失败（`C.13.03-R1`）
  - `E0301-T9 图文档迁移`：迁移链为空时 `1.0` 原样通过；测试专用的 `1.0 → 1.1` 迁移被调用、结果 `schema_version` 是 `1.1`、输入的字节不变；`schema_version` 为 `9.0` 时返回 `ErrTooNew`、文案正确（`C12-T1`、`C12-T2`）
  - `E0301-T10 角色卡继承`：`extends` 指向不存在的卡、继承链成环时注册失败；正常继承的卡原样返回
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E0301-T11 Caps.Model 限制`：在 `engine/exec`（第 ④ 片）跑：非 Agent 执行器声明 `Caps.Model` 被拒绝（INV-05）
  - `E0301-T12 migrate Op`：在 `E.05.01`（第 ③ 片）跑：迁移结果作为一个 `migrate` Op 写入（`C.12-R2`）
- 允许使用的依赖：标准库、`gen`、`engine/graph`、`github.com/goccy/go-yaml`、`github.com/santhosh-tekuri/jsonschema/v6`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 补 `E0301-T7`（`C.03.01`、`C.03.02` 在本叶子跑的用例） | `G.02.06-R24` ③；`P.09` K215 |
| 2026-11-23 | 补 `E0301-T8`（`C.13.03` 在本叶子跑的用例） | `G.02.06-R24` ③；`P.09` K217 |
| 2026-11-23 | 测试用例写明在本叶子跑的 C 层用例 | 第 4 片复查；`P.09` K227 |
| 2026-11-25 | 第 ①a / ①b 片（`m1-graph`、`m1-validate`）开工前复查：执行器注册和 INV-05 检查移到 `exec`（第 ④ 片）；"原子节点都要有执行器"改为运行冻结时检查（用户决定"能搭不能跑"）；内置文件以 `fs.FS` 传入；加 `Package`、`NodeDefs`、`TypeSchema`、`DocSchema`、`Messages`；`Tables()` 去掉（`gen` 的表直接是变量）；角色卡只检查继承不合并；迁移只升级文档，`migrate` Op 在第 ③ 片；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K256 |
