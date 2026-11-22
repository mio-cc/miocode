# E.04 ext 扩展包加载

| 项 | 内容 |
|---|---|
| 编号 | E.04 |
| 类型 | 实施 |
| 上级 | E 内核 engine/ |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 D7 |
| 最后修改 | 2026-11-22 |

## 1. 职责
加载扩展包：读清单、校验、检查权限声明、注册节点定义和资产；把声明式节点在冻结运行快照时展开成原子节点子图。

## 2. 不做什么
- 不负责首次启用的用户确认界面（`B.04` extensions + `W.09.04`）
- 不支持运行时加载 Go 代码或脚本（`C.03.04-R6`）

## 3. 继承的上级约束
`C.03.04`、`C.13`、`S.08`、`X.02`、INV-02、INV-05、INV-09。

## 4. 接口
```go
type Package struct {
    Manifest gen.PackageManifest
    Dir      fs.FS
    Signed   SignState   // unsigned | valid | invalid
}
func Open(dir string) (*Package, error)                     // 读 package.yaml，校验结构
func Verify(p *Package, trusted []ed25519.PublicKey) SignState
func Permissions(p *Package) Perms                          // 主机名、密钥名、工具及风险、是否需要确认
func Install(reg *schema.Registry, tools tools.Registry, p *Package) error

// 声明式节点展开（冻结快照时由 E.16.01 调用）
func Expand(n *graph.Node, def *schema.NodeDef, v schema.View) (*gen.Subgraph, error)
```

## 5. 行为
1. **安装**：校验清单 → 校验每个资产（NodeDef、类型、配方、角色卡、模板）→ 检查不覆盖内置项 → 声明式 http / mcp 节点为每个节点注册一个工具 `ext:<包名>/<节点名>`（风险取声明值，不低于 `S.04` §3 下限）→ 注册 NodeDef。任何一步失败整体回滚。
2. **展开**（`C.03.04` §3）：
   - prompt → `上下文装配` + `Agent`，外部端口映射到内部端口；模板渲染为角色卡的内联版本。
   - http / mcp → 一个 `工具` 节点，`tool` 参数为注册好的工具 ID。
   - subgraph → 一个 `子图引用` 节点，`pin: snapshot`。
   - 内部节点 ID = `ulid(sha256(父节点ID ‖ 模板内序号))` 的确定性派生（`C.03.04-R2`）；运行路径中显示为父节点下的子层，界面上默认折叠。
3. 签名：清单 `package.sig` 为对整个包规范化文件列表哈希的 ed25519 签名；未签名可以安装，状态记 `unsigned`（`S.08-R3`）。

## 6. 不变量
- 展开结果只包含原子节点
- 同样的 NodeDef 版本和参数，展开结果逐字节相同
- 安装失败不留下任何部分注册的内容

## 7. 错误处理
清单或资产不合法：`extension_invalid`，带文件和行号；签名无效：拒绝安装（未签名不算无效）。

## 8. 验收标准
1. `C.03.04` 的 4 个示例包能安装并展开，展开结果通过图校验
2. prompt 模板引用 secret 被拒
3. 安装中途失败后注册表与安装前相同
4. 展开确定性

### 实施卡
- 要建 / 要改的文件：`engine/ext/package.go`、`engine/ext/install.go`、`engine/ext/expand.go`、`engine/ext/sign.go`、`engine/ext/ext_test.go`、`testdata/ext/*`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E04-T1 四种声明式节点安装与展开`
  - `E04-T2 secret 进模板被拒`
  - `E04-T3 原子回滚`
  - `E04-T4 展开确定性`
  - `E04-T5 签名三种状态`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
