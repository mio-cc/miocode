# E.13.02 装配流程

| 项 | 内容 |
|---|---|
| 编号 | E.13.02 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引06 |
| 最后修改 | 2026-11-23 |

## 1. 职责
执行装配：取值 → 变换 → 加入 inherit 段 → 预算分配与溢出处理 → 排序 → 产出上下文包。

## 2. 不做什么
- 不渲染成模型消息（`E.13.05`）

## 3. 继承的上级约束
`E.13-R1`–`R3`、`E.06.03`（污染传播）。

## 4. 接口
```go
type Packet struct {
    Recipe   string
    Sections []PacketSection     // {Name, Text, Ref, Tokens, Source, Taint, TaintSrc, Locked}
    Tokens   int
    Budget   int
    Dropped  []Dropped           // {Section, Ref, Mode, Saved}
    Vars     map[string]string   // 配方段的 var（C.13.01-R6）渲染后的文字，给角色卡模板变量用
}
func Assemble(rc AssembleCtx, plan *Plan, in exec.Inputs) (Packet, error)
```

## 5. 行为
1. 对每个段：按路径取值；为空且 `required` → `ErrMissingRequired`；命中 `exclude` → 跳过；执行变换；计 token。
2. 加入 inherit 锁定段（`E.13.06`）。
3. 计算预算（`E.13.03`），执行溢出处理（`E.13.04`）。
4. 按配方 `sections` 顺序排列（锁定段"约束"放在任务段之后）。
5. 污染：任一段污染 → 包污染，记录哪些段、哪些来源（`E.06.03`）。
6. 写 `ctx.assembled` 事件；包超过 8KB 时整体存工作区，节点输出为引用。

## 6. 不变量
- 包的 token 数 ≤ 预算（`reject` 模式除外：直接失败）
- 锁定段永远在包里

## 7. 错误处理
`ErrMissingRequired` → user_input；`ErrContextOverflow` → user_input，提示"上下文放不下必需内容，请提高预算或换更大窗口的模型"。

## 8. 验收标准
1. 闭环迭代的执行者配方装配结果与黄金文件一致
2. 污染段被正确标记
3. 必需段缺失时报错

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/assemble.go`、`engine/ctxasm/packet.go`、`engine/ctxasm/assemble_test.go`、`engine/ctxasm/testdata/*.golden`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1302-T1 黄金文件`
  - `E1302-T2 污染`
  - `E1302-T3 必需段`
  - `E1302-T4 确定性`
  - `E1302-T5 变量`：写了 `var` 的段渲染后的文字出现在 `Vars` 里，被裁掉的段不出现
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `Vars` 来自配方段的 `var`；补 `E1302-T5` | `P.09` K222 |
