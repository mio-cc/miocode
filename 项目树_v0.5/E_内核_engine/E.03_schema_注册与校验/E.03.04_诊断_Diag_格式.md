# E.03.04 诊断 Diag 格式

| 项 | 内容 |
|---|---|
| 编号 | E.03.04 |
| 类型 | 实施 |
| 上级 | E.03 schema 注册与校验 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 职责
生成和组织诊断：定位信息、中文文案、去重、排序。

## 2. 不做什么
- 不定义诊断码（`C.11` §5）

## 3. 继承的上级约束
`C.11` §5 `Diag` 结构、`G.13`。

## 4. 接口
```go
func NewDiag(code string, level string, at Loc, vars map[string]any) gen.Diag   // msg 由 messages/diags.zh.yaml 按 code 渲染
type Loc struct{ Scope, Node, Port, Param string }
func Sort(ds []gen.Diag)                     // 级别 → scope → node → code
func Dedup(ds []gen.Diag) []gen.Diag         // 同 code + 同位置只留一条
func HasError(ds []gen.Diag) bool
```

## 5. 行为
- 文案模板变量缺失时渲染为 `{变量名}` 并记警告，不报错。
- 诊断里的 `scope` 用于前端跳转到对应层（`U.14.03`）。

## 6. 不变量
- 每个诊断码在 `diags.zh.yaml` 里都有文案（CI 检查）

## 7. 错误处理
无。

## 8. 验收标准
1. 所有 V 码都有文案
2. 排序和去重确定

### 实施卡
- 要建 / 要改的文件：`engine/schema/diag.go`、`engine/schema/diag_test.go`、`schema/builtin/messages/diags.zh.yaml`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0304-T1 文案齐全`
  - `E0304-T2 排序去重`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
