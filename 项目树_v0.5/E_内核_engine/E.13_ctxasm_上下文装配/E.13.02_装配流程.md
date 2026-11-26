# E.13.02 装配流程

| 项 | 内容 |
|---|---|
| 编号 | E.13.02 |
| 类型 | 实施 |
| 上级 | E.13 ctxasm 上下文装配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引06 |
| 最后修改 | 2026-11-26 |

## 1. 职责
执行装配：分配来源 → 取值 → 排除 → 变换 → 加入 inherit 锁定段 → 预算与溢出处理 → 排序 → 产出上下文包；给出 `ctx.assembled` 事件的数据。

## 2. 不做什么
- 不渲染成模型消息（`E.13.05`）
- 不写事件、不存包：执行器（`E.14.03`，第 ⑥ 片）拿 `Packet.Event()` 写 `ctx.assembled`，包超过 8KB 时整体存工作区、节点输出为引用
- 不缓存装配结果（`E.14.03` 的 `CacheKey`）

## 3. 继承的上级约束
`E.13-R1`–`R3`、`E.06.03`（污染传播）、`C.13.01`、`E.13.01`、`E.13.03`、`E.13.04`、`E.13.06`。

## 4. 接口
```go
// engine/ctxasm/packet.go
type PacketSection struct {
    Name, Text, Source string
    Ref                blob.Ref
    Tokens             int
    Taint, Locked      bool
    TaintSrc           []string
}
type Packet struct {
    Recipe   string                // 名称@版本
    Sections []PacketSection
    Tokens   int
    Budget   int
    Clamped  bool
    Dropped  []Dropped
    Vars     map[string]string     // 配方段的 var（C.13.01-R6）
    Inherit  map[string]any        // 透传约束（E.13.06）
    Taint    bool
    TaintSrc []string
    Pointers bool                  // 有段是指针形式：Agent 要能用 ws_read（E.14.02 注入）
    Warnings []string
}
func (p Packet) Value() map[string]any      // 按 上下文包@1 的字段：sections[{name, content, tokens, source}]、tokens、dropped、inherit、vars
func (p Packet) Event() gen.DataCtxAssembled // sections[{name, tokens, source, ref, taint, locked}]、dropped、budget_tokens

// engine/ctxasm/assemble.go
type Env struct {
    View       schema.View
    Blobs      blob.Store
    Counter    Counter
    Summarizer Summarizer
    Caps       llm.Caps     // 决定窗口的模型能力
    Overhead   int          // ①–⑤ 段估算（E.13.03）
    Budget     *float64     // 节点 budget 参数
    OnOverflow string       // 节点 on_overflow 参数；空 = 配方的
}
var ErrMissingRequired = errors.New(...)    // 包成 *Error{user_input, "missing_required"}
func Assemble(ctx context.Context, plan *Plan, in []Value, env Env) (Packet, error)
```

## 5. 行为
1. `plan.Bind(in)` 分配来源；有 error 级诊断 → `*Error{user_input, "source_ambiguous"}`。
2. 排除：`type:X` 的输入值不参与 `in` 全部取值、不分给来源；`path:` 删掉对应字段（`*` 匹配任意一层）。
3. 对每个段：按路径取值；为空（`nil`、空字符串、空列表、空对象）且 `required` → `ErrMissingRequired`（"配方「X」的必需段「任务」没有内容"），不是必需的就跳过；执行变换并渲染（`E.13.01`）；`transform: pointer` 的段直接换成指针形式（`E.13.04` 的 `PointerText`，原文写进工作区）；计 token。段的污染 = 取值用到的输入值的污染。
4. 加入 inherit 锁定段（`E.13.06`）：位置见 `E.13.06` §5；`exclude` 对它无效。
5. 预算（`E.13.03`，比例用节点参数和配方 `budget`）→ 溢出处理（`E.13.04`，模式用节点参数，空时用配方的）。
6. 按位置排序；`Vars`：写了 `var` 的段、没被收缩的，渲染后的文字放进去（被收缩的段不出现）。
7. 污染：任一段污染 → 包污染，`TaintSrc` 合并去重、排序。
8. `Warnings`：窗口未知（`E.13.03`）、透传约束超过 30%（`E.13.06`）。

## 6. 不变量
- 包的 token 数 ≤ 预算（`reject` 模式超出时直接失败）
- 锁定段永远在包里
- 确定性：同样的计划、输入、环境（和同样的摘要结果），包相同

## 7. 错误处理
`ErrMissingRequired`、来源不唯一 → `user_input`；`ErrContextOverflow` → `user_input`"上下文放不下必需内容，请提高预算或换更大窗口的模型"；工作区写入失败 → `transient`。

## 8. 验收标准
1. 执行者配方的装配结果与黄金文件一致
2. 污染段被正确标记
3. 必需段缺失时报错
4. 确定性
5. 变量
6. 透传约束不能被排除、超 30% 告警

### 实施卡
- 要建 / 要改的文件：`engine/ctxasm/packet.go`、`engine/ctxasm/assemble.go`、`engine/ctxasm/assemble_test.go`、`engine/ctxasm/testdata/inputs_exec.json`、`engine/ctxasm/testdata/*.golden`、`engine/ctxasm/inherit.go`、`engine/ctxasm/inherit_test.go`
- `inherit.go`、`inherit_test.go` 归 `E.13.06`，按 `P.09` K273 改的合并规则在本叶子里一起改（片内已完成的叶子不能重开，K238 的做法）
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1302-T1 黄金文件`：执行者配方 + `testdata/inputs_exec.json`（一张任务卡、一个目标）装配出的 `Packet.Value()` 与 `testdata/exec_packet.golden` 一致；黄金文件用 `go test -run E1302 -update` 生成，实施者读过确认后提交（`P.09` K271）
  - `E1302-T2 污染`：只有任务卡污染时，用到任务卡的段污染、约束段不污染，包污染、来源合并
  - `E1302-T3 必需段`：任务卡没有 `instruction` 时 `ErrMissingRequired`，类别 `user_input`
  - `E1302-T4 确定性`：同样的输入装配两次，`Value()` 的 JSON 相同；输入里 map 的键顺序不影响结果
  - `E1302-T5 变量`：写了 `var` 的段渲染后的文字出现在 `Vars` 里，被收缩的段不出现
  - `E1302-T6 透传约束`：`exclude: ["path:constraints", "type:目标"]` 也去不掉"约束"段；约束超过预算 30% 时 `Warnings` 有一条、段不被收缩
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | `Vars` 来自配方段的 `var`；补 `E1302-T5` | `P.09` K222 |
| 2026-11-26 | 第 ⑤b 片（`m1-tools-ctx`）开工前复查：输入改用本包的 `Value`；事件和存包交给执行器；`Packet` 加 `Clamped`、`Inherit`、`Pointers`、`Warnings` 和 `Value()`、`Event()`；黄金文件用 `-update` 生成后由实施者确认；加 `E1302-T6`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K271 |
| 2026-11-26 | 实施卡加 `inherit.go`、`inherit_test.go`（K273 的合并规则在本叶子里改） | `P.09` K273 |
