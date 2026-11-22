# E.10.06 结构化输出与修复

| 项 | 内容 |
|---|---|
| 编号 | E.10.06 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引05 |
| 最后修改 | 2026-11-22 |

## 1. 职责
保证 Agent 拿到符合 `output_schema` 的结构化结果：三级策略选择、解析、宽松修正、带反馈重试。

## 2. 不做什么
- 不决定重试次数以外的业务策略（Agent 执行器配置，`E.14.02.03`）

## 3. 继承的上级约束
`C.13.03-R3`（类型生成 JSON Schema）、`引05` §3。

## 4. 接口
```go
package structured
type Strategy int // Native | ForcedTool | TextParse
func Pick(c llm.Caps, q quirks.Entry, schemaOK bool) Strategy
func Prepare(req *llm.Req, s Strategy, out *llm.OutputSpec)      // 按策略改写请求
func Decode(resp *llm.Resp, s Strategy, schema *jsonschema.Schema) (json.RawMessage, []ValidationError, error)
func Feedback(errs []ValidationError) llm.Message                // 生成"上次输出不合格"的提示
```

## 5. 行为
1. 选策略：支持原生 schema 且 schema 能被该家接受 → Native；支持工具 → ForcedTool；否则 TextParse（system 末尾追加"只输出一个 JSON 对象"和精简 schema）。
2. 取原始 JSON：Native 取 `Structured`；ForcedTool 取工具参数；TextParse 取文本里第一个完整 JSON 块。
3. 修复：去代码块包裹、补括号、去尾逗号、单引号转双引号、去注释（自研，覆盖这 5 类）。
4. 宽松修正：数字字符串 → 数字、单值 → 单元素数组、缺省字段填默认值。
5. 校验：不通过返回 `ValidationError` 列表；Agent 执行器决定是否用 `Feedback` 追加一条 user 消息重试。
6. 每次修复和降级都记事件 `llm.fallback` 或在 `llm.call.strategy` 里体现，并计入指标 `hx_llm_repairs_total`。

## 6. 不变量
- 修复不会改变合法 JSON 的语义

## 7. 错误处理
找不到 JSON：`ErrNoJSON`（format_invalid）；校验失败：`ErrFormatInvalid` 带错误列表。

## 8. 验收标准
1. 5 类常见错误各 3 个修复用例
2. 三种策略在 fake 模型下都能得到合法结果
3. 修正规则不改合法输入

### 实施卡
- 要建 / 要改的文件：`engine/llm/structured/*.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1006-T1 修复向量`
  - `E1006-T2 策略选择`
  - `E1006-T3 合法输入不变（rapid）`
- 允许使用的依赖：`santhosh-tekuri/jsonschema/v6`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
