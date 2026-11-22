# E.13.06 inherit 透传

| 项 | 内容 |
|---|---|
| 编号 | E.13.06 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引06 |
| 最后修改 | 2026-11-22 |

## 1. 职责
实现 `inherit` 字段的强制透传：带 `inherit: true` 的字段（例如目标的约束：币种、地区、时间范围）一定会出现在所有下游 Agent 的上下文里。

## 2. 不做什么
- 不定义哪些字段是 inherit（`C.13.03` 类型声明）

## 3. 继承的上级约束
`C.13.01-R2`、`C.03.03` §5（`honor_inherit` kernel 锁）。

## 4. 接口
```go
func InheritParts(in exec.Inputs, lineage Lineage, v schema.View, cnt tokens.Counter) []part   // 锁定段"约束"
type Lineage interface { Upstream(field string) []exec.Value }   // 沿数据流向上追溯
```

## 5. 行为
- 运行时每个值携带 `inherit` 字段的副本（作为值元数据沿连线传递），装配时直接取，不需要回溯图。
- 同名字段取最近一层的值。
- 生成锁定段"约束"，`exclude` 对它无效；配方没写约束段也自动追加。
- 锁定段超过总预算的 30% 时不裁剪，写 warn 日志并在 `ctx.assembled` 里标记，提示用户精简约束。

## 6. 不变量
- inherit 字段在下游任意深度的 Agent 上下文里都存在

## 7. 错误处理
无。

## 8. 验收标准
1. 三层子图深处的 Agent 上下文里有根图目标的约束
2. exclude 不能去掉约束段
3. 超 30% 告警

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/inherit.go`、`engine/ctxasm/inherit_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1306-T1 深层透传`
  - `E1306-T2 exclude 无效`
  - `E1306-T3 告警`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
