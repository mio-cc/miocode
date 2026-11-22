# E.10.05 quirks 厂商差异表

| 项 | 内容 |
|---|---|
| 编号 | E.10.05 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引_关键决定 |
| 最后修改 | 2026-11-22 |

## 1. 职责
把各家模型的能力差异写成数据表，适配器和上层逻辑只查表、不写特判（INV-18）。

## 2. 不做什么
- 不存放价格（`E.09.03`）

## 3. 继承的上级约束
INV-18、`E.10-R2`、`G.05.05-R2`。

## 4. 接口
表文件 `engine/llm/quirks/quirks.yaml`（打进二进制；用户可以在设置里对某个提供方覆盖）：
```yaml
- match: { provider_kind: openai_compat, model: "gpt-*" }
  caps: { window: 128000, max_output: 16384, native_schema: true, tools: true, parallel_tools: true, vision: true, prompt_cache: true, tokenizer: o200k_base }
  reasoning: { param: reasoning_effort, values: [low, medium, high] }
- match: { provider_kind: openai_compat, model: "deepseek-*" }
  caps: { window: 64000, native_schema: false, tools: true, tokenizer: approx }
- match: { provider_kind: openai_compat, model: "zai-glm-*" }
  reasoning: { param: reasoning_effort, values: [low, high, max], map: { medium: high } }
- match: { provider_kind: anthropic, model: "claude-*" }
  caps: { window: 200000, native_schema: false, tools: true, prompt_cache: true, tokenizer: approx }
  structured: forced_tool
  thinking: { send_back: false }
- match: { provider_kind: gemini }
  caps: { native_schema: true, tools: true }
  schema_dialect: gemini_subset
```
```go
type Table struct{ /* 按 match 顺序，后面的覆盖前面的 */ }
func Load(fsys fs.FS, overrides []Rule) (Table, error)
func (t Table) For(providerKind, model string) Entry
```

## 5. 行为
- 匹配按文件顺序累积：通用规则在前，具体规则在后，后者覆盖前者的同名字段。
- 用户覆盖（设置里"能力"一栏）优先级最高。
- 新增厂商、新模型只改这个文件（以及必要时的 cassette），不改适配器代码。

## 6. 不变量
- 适配器代码里没有厂商名、模型名字符串比较（`quirkscheck` 检查）

## 7. 错误处理
表格式错误：启动失败并指出行号。

## 8. 验收标准
1. `reasoning: medium` 对 zai-glm 映射为 high 并记 warn
2. 用户覆盖生效
3. quirkscheck 对故意写的特判报错

### 实施卡
- 要建 / 要改的文件：`engine/llm/quirks/quirks.yaml`、`engine/llm/quirks/quirks.go`、`tools/lint/quirkscheck/*`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1005-T1 合并顺序`
  - `E1005-T2 推理强度映射`
  - `E1005-T3 用户覆盖`
  - `E1005-T4 lint`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
