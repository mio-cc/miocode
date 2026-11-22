# E.14.14 声明式执行器

| 项 | 内容 |
|---|---|
| 编号 | E.14.14 |
| 类型 | 实施 |
| 上级 | E.14 exec 执行器 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 D7 |
| 最后修改 | 2026-11-22 |

## 1. 职责
声明式执行器：为声明式扩展节点提供执行路径。由于声明式节点在冻结快照时已经展开成原子节点（`C.03.04-R1`），这个执行器只负责**展开前的校验**和**在编辑态给出端口与类型信息**。

## 2. 不做什么
- 不直接执行任何模型或工具调用（展开后由原子执行器执行，INV-05、INV-09）

## 3. 继承的上级约束
`C.03.04`、`E.04`。

## 4. 接口
```go
type Declarative struct{ kind string }          // kind = "pack/节点@1"
func (d *Declarative) Caps() exec.Caps          // 全部为 false
func (d *Declarative) Validate(n *graph.Node, g *graph.Graph, v schema.View) []gen.Diag   // 调用 ext.Expand 后对展开结果做校验，诊断映射回原节点
func (d *Declarative) Run(rc exec.RunCtx, in exec.Inputs) (exec.Outputs, error)          // 永远不应被调用：返回 internal 错误
```

## 5. 行为
- 每个已安装的声明式 NodeDef 注册一个 `Declarative` 实例。
- 校验：展开 → 对展开出的子图跑 `E.03.03` → 把诊断的位置改写为原节点（"「翻译」内部：…"）。
- 冻结快照时 `E.16.01` 调用 `ext.Expand` 替换节点；之后运行中不会出现声明式节点。

## 6. 不变量
- 运行时不会调用 `Declarative.Run`

## 7. 错误处理
`Run` 被调用：internal 错误并告警（说明冻结展开有缺陷）。

## 8. 验收标准
1. 四种声明式节点的校验诊断映射回原节点
2. 运行快照里不存在声明式节点

### 实施卡
- 要建 / 要改的文件：`engine/exec/declarative/*.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1414-T1 诊断映射`
  - `E1414-T2 快照无声明式节点`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
