# E.13.06 inherit 透传

| 项 | 内容 |
|---|---|
| 编号 | E.13.06 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引06 |
| 最后修改 | 2026-11-26 |

## 1. 职责
实现 `inherit` 字段的强制透传：带 `inherit: true` 的字段（例如目标的约束：币种、地区、时间范围）一定会出现在所有下游 Agent 的上下文里。给执行器一个函数算出节点输出要携带的副本，给装配生成锁定段"约束"。

## 2. 不做什么
- 不定义哪些字段是 inherit（`C.13.03` 类型声明）
- 不沿图回溯：值携带副本，沿连线传递（执行器在第 ⑥ 片调用 `Carry` 给每个输出值带上）

## 3. 继承的上级约束
`C.13.01-R2`、`C.03.03` §5（`honor_inherit` kernel 锁）。

## 4. 接口
```go
// engine/ctxasm/inherit.go
func Carry(in []Value, v schema.View) map[string]any            // 输入值的 inherit 字段合并后的副本；空 = nil
func InheritPart(m map[string]any, cnt Counter) (Part, bool)    // 锁定段"约束"；m 为空时 false
const InheritSection = "约束"
func InheritOver(tokens, budget int) bool                       // 锁定段超过预算的 30%
```

## 5. 行为
- **取值**：每条输入先取它数据里直接带的 inherit 字段（值的类型的顶层字段里 `inherit: true` 的，按 `schema` 的类型定义），再取它携带的副本 `Value.Inherit`。
- **合并**：同名字段，直接带的比携带的近，取直接带的；同样近时取输入顺序在前的（`C.04.04` 的顺序）。
- **锁定段**：段名"约束"、来源 `inherit`、`Locked` 为真；内容按 `yaml` 渲染（键按字典序）。`exclude` 对它无效；溢出处理不收缩它（`E.13.04`）。
- 装配时（`E.13.02`）：配方里有名为"约束"的段时，锁定段替换它、放在它的位置；没有时追加在第一段（任务段）之后。
- 锁定段超过预算的 30% 时不裁剪，`Packet.Warnings` 写"透传约束占了预算的 N%，请精简约束"。

## 6. 不变量
- inherit 字段在下游任意深度的 Agent 上下文里都存在（每一层执行器都调用 `Carry`）

## 7. 错误处理
无。

## 8. 验收标准
1. 三层深处的 Agent 上下文里有根图目标的约束
2. exclude 不能去掉约束段
3. 超 30% 告警

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/inherit.go`、`engine/ctxasm/inherit_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1306-T1 深层透传`：目标值 → `Carry` → 第二层值 → `Carry` → 第三层值，第三层的 `Carry` 里有根目标的 `constraints`；直接带的比携带的优先，同样近时取在前的
  - `E1306-T2 锁定段`：`InheritPart` 生成的段名"约束"、`Locked` 为真、来源 `inherit`、内容按键排序；空的副本不生成段（配方 `exclude` 对它无效在 `E1302-T6` 测）
  - `E1306-T3 告警阈值`：`InheritOver(tokens, budget)` 超过 30% 为真、正好 30% 为假（装配里的告警在 `E1302-T6` 测）
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ⑤b 片（`m1-tools-ctx`）开工前复查：改成值携带副本、执行器调用 `Carry`；写明合并规则和锁定段的位置；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K271 |
