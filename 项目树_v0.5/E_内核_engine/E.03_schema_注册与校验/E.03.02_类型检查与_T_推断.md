# E.03.02 类型检查与 T 推断

| 项 | 内容 |
|---|---|
| 编号 | E.03.02 |
| 类型 | 实施 |
| 上级 | E.03 schema 注册与校验 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 `C.04` 的类型系统：解析 TypeRef、判断两个端口能否连接（C0–C10）、推断类型变量。

## 2. 不做什么
- 不决定连线是否被创建（Op 流水线根据结果决定）
- 不渲染提示文案以外的界面信息

## 3. 继承的上级约束
`C.04.01`–`C.04.04`、INV-07。

## 4. 接口
```go
type Type struct {
    Kind  Kind    // Any | Named | List | Var
    Name  string; Major, Minor int
    Elem  *Type
    Var   string
}
func Parse(ref string) (*Type, error)
func (t *Type) String() string
func Category(t *Type, portCategory string) string           // C.04.01 §3

func Assignable(src, dst *Type, v View) gen.Assign           // C.04.02 规则表
func Infer(g *graph.Graph, v View) (Types, []gen.Diag)       // C.04.03 算法
type Types interface {
    Port(nodeID, port, dir string) *Type                     // dir: in / out
}
```

## 5. 行为
- `Assignable` 严格按 `C.04.02` 规则表顺序判断，返回命中的规则号和中文原因（文案从 `messages/assign.zh.yaml` 取）。
- C2 系统类型的 `producer` 检查：`TypeDef.Producer` 与源端口所属节点的类型比较——数据来自 `schema/builtin/types/*.yaml`，不硬编码。
- `Infer` 按 `C.04.03` §3 的 6 步；结果按"子图哈希"缓存，Op 后只重算受影响的子图及其祖先。
- 推断冲突不报推断错误，交给 V06（`C.04.03-R1`）。

## 6. 不变量
- 同样输入结果确定
- `Assignable` 与前端实现对同一组测试向量逐条一致（`C.04.02-R1`）

## 7. 错误处理
TypeRef 语法错误返回 `ErrBadTypeRef`；推断不出时生成 V16 诊断，不返回错误。

## 8. 验收标准
1. `assign_vectors.json` 全部通过
2. 闭环迭代模板推断无 V16
3. 500 节点全量推断 < 10ms

### 实施卡
- 要建 / 要改的文件：`engine/schema/types.go`、`engine/schema/assign.go`、`engine/schema/infer.go`、`engine/schema/types_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0302-T1 TypeRef 解析（合法与非法各 10 条）`
  - `E0302-T2 assign_vectors 全集`
  - `E0302-T3 推断模板`
  - `E0302-T4 推断缓存失效正确`
  - `E0302-T5 BenchmarkInfer500`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
