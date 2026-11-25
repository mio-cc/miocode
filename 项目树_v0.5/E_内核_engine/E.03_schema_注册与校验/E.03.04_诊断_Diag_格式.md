# E.03.04 诊断 Diag 格式

| 项 | 内容 |
|---|---|
| 编号 | E.03.04 |
| 类型 | 实施 |
| 上级 | E.03 schema 注册与校验 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引02 |
| 最后修改 | 2026-11-25 |

## 1. 职责
生成和组织诊断：定位信息、中文文案、去重、排序；加载诊断和连线判定的文案。

## 2. 不做什么
- 不定义诊断码（`C.11` §5），不写文案文件（`diags.zh.yaml`、`assign.zh.yaml` 归 `C.11` §6、`C.04.02`，本叶子只读，`P.09` K206）

## 3. 继承的上级约束
`C.11` §5 `Diag` 结构、`G.13`、`E.03-R3`、`E.03-R4`。

## 4. 接口
```go
type Messages struct{ /* 私有 */ }
func LoadMessages(fsys fs.FS, log *slog.Logger) (*Messages, error) // 读 builtin/messages/diags.zh.yaml、assign.zh.yaml（fsys 的根是仓库的 schema/）；log 为 nil 时丢弃
func (m *Messages) Diag(code gen.DiagCode, level gen.DiagLevel, at Loc, vars map[string]any) gen.Diag
func (m *Messages) Assign(rule string, vars map[string]any) string // C.04.02 的判定原因文案
type Loc struct{ Scope, Node, Port, Param string }                 // 空字符串的字段不写进 Diag
func Sort(ds []gen.Diag)                     // 级别（error 在前）→ scope → node → code → port → param → msg
func Dedup(ds []gen.Diag) []gen.Diag         // 同 code + 同位置只留一条（保留先出现的）
func HasError(ds []gen.Diag) bool
```

## 5. 行为
- 文案模板写法 `{变量名}`；变量缺失时原样渲染为 `{变量名}` 并记一条 warn，不报错。`vars` 的值用 `fmt.Sprint` 转成文字。
- `diags.zh.yaml` 里没有这个码、或这个码不允许这个级别：`msg` 写成诊断码本身，记 warn（`E0304-T1` 保证内置文案齐全，不会发生）。
- 诊断里的 `scope` 用于前端跳转到对应层（`U.14.03`）。

## 6. 不变量
- `gen` 里的每个诊断码在 `diags.zh.yaml` 里都有文案，且级别与 `C.11` §5 表一致

## 7. 错误处理
文案文件读不了、格式错：`LoadMessages` 返回错误，写出文件和行号。

## 8. 验收标准
1. 所有 V 码都有文案
2. 排序和去重确定

### 实施卡
- 要建 / 要改的文件：`engine/schema/diag.go`、`engine/schema/messages.go`、`engine/schema/diag_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/store/`、`engine/llm/`
- 测试用例：
  - `E0304-T1 文案齐全`：`gen` 里 `DiagV01`–`DiagV18` 每个码在 `diags.zh.yaml` 都有文案；`V12` 有 warn 和 error 两级，其余按 `C.11` §5 表；`assign.zh.yaml` 能加载
  - `E0304-T2 排序去重`：打乱顺序的一组诊断排序结果固定；同码同位置去重只留第一条
  - `E0304-T3 渲染`：变量齐全时按模板渲染；缺变量时保留 `{变量名}` 并记 warn；`Loc` 的空字段不写进 `Diag`
- 允许使用的依赖：标准库、`gen`、`github.com/goccy/go-yaml`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `diags.zh.yaml` 改归 `C.11`，本叶子只读 | `P.09` K206 |
| 2026-11-25 | 第 ①a / ①b 片（`m1-graph`、`m1-validate`）开工前复查：文案通过 `Messages`（以 `fs.FS` 加载，`E.03-R4`）提供，`NewDiag` 改为 `Messages.Diag`；加 `Assign` 文案、`E0304-T3`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K256 |
