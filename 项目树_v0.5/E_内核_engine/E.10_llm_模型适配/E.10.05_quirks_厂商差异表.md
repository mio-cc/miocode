# E.10.05 quirks 厂商差异表

| 项 | 内容 |
|---|---|
| 编号 | E.10.05 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引_关键决定；用户 2026-11-24 |
| 最后修改 | 2026-11-24 |

## 1. 职责
把各家模型的差异写成数据，协议代码只查表、不写特判（INV-18）：
1. **能力表**：按"协议 + 上游模型名"给出 `llm.Caps`（上下文、工具、原生结构化输出、图片、思考强度……）。
2. **错误规则**：按"协议 + 状态 + 上游错误码 / 说明"给出失败类别（`E.10.01` §5.5）。
3. **常用厂商**：一组内置的提供方填法（协议、地址、鉴权、常用模型），界面上"新建连接"时一键填好（`C.16-R8`）。
4. `quirkscheck`：检查 `engine/llm` 里没有厂商名、模型名的字符串比较。

## 2. 不做什么
- 不存放价格（`E.09.03`）
- 不存用户自己的提供方（那是配置，`E.10.01` §4.3）

## 3. 继承的上级约束
INV-18、`E.10-R2`、`G.05.05-R2`、ADR-011。

## 4. 接口
数据文件都打进二进制（`go:embed`）：
```yaml
# engine/llm/quirks/quirks.yaml
models:                                   # 按顺序累积，后面的覆盖前面写了的字段
  - match: { protocol: "*", model: "*" }  # 兜底：保守的能力
    caps: { window: 32000, max_output: 4096, tools: true, native_schema: false, vision: false, tokenizer: approx }
  - match: { protocol: anthropic_messages, model: "claude-*" }
    caps: { window: 200000, max_output: 8192, vision: true, prompt_cache: true }
    reasoning: { values: [off, low, medium, high, max], budget: { low: 2048, medium: 8192, high: 16384, max: 32000 } }
  - match: { model: "mistral-*" }
    caps: { window: 128000, native_schema: true, tools: true, parallel_tools: true }
  - match: { model: "zai-glm-*" }
    reasoning: { values: [low, high, max], map: { medium: high } }
errors:
  - match: { protocol: chat_completions, status: 400, code: context_length_exceeded }
    class: user_input
  - match: { protocol: anthropic_messages, status: 529 }
    class: transient
  - match: { status: 400, message: "(?i)content.?(filter|policy)|safety" }
    class: structural
```
```yaml
# engine/llm/quirks/vendors.yaml —— 常用厂商
- id: mistral
  name: Mistral
  provider: { protocol: chat_completions, base_url: "https://api.mistral.ai/v1", auth: { type: bearer } }
  models: [mistral-small-latest, mistral-large-latest]
- id: ollama
  name: Ollama（本机）
  provider: { protocol: chat_completions, base_url: "http://127.0.0.1:11434/v1", auth: { type: none } }
```
```go
package quirks
type Table struct{ /* 实现 llm.CapsTable */ }
func Load(fsys fs.FS) (Table, error)                   // 读 quirks.yaml；格式错时报出文件和行号
func (t Table) Lookup(protocol, model string) llm.Caps
func (t Table) ErrorClass(protocol string, status int, code, message string) (string, bool)
type Vendor struct {
	ID, Name string
	Provider llm.ProviderConfig // 不含 name 和密钥名，由用户填
	Models   []string
}
func Vendors(fsys fs.FS) ([]Vendor, error)
```

## 5. 行为
- 匹配：`protocol`、`model` 都支持 `*` 通配（`path.Match` 规则）；不写的条件算匹配。按文件顺序累积：通用规则在前，具体规则在后，后者覆盖前者写了的字段。
- 覆盖优先级（低 → 高）：本表 → 提供方的 `caps` → 模型条目的 `caps`（`E.10.01` §5.1）。用户在"连接"里改能力就是改后两层。
- 思考强度：上层统一传 7 级之一（`off` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max`，`U.09.06-R5`、`E.14.02`）。`reasoning.values` 列出这个模型支持的级；请求的级不在列表里时，先查 `map`，`map` 里没有就取列表里最接近的一级（同样接近时取较高的一级），并记 warn。`budget` 是按 token 预算表达强度的协议用的（级 → 预算）。没有 `reasoning` 的模型不支持调节，请求里不带这个参数。`values` 也是连接测试时写进 `models[].effort` 的来源（`C.16-R5`）。
- 错误规则：`status` 精确匹配；`code` 精确匹配上游错误码；`message` 是正则，匹配上游说明；第一条匹配的生效。
- 常用厂商：只是"新建连接"的填法，选了之后照常可以改每一项；以后可以由包贡献更多（`C.15`，M1 起）。地址以各家官方文档为准，写代码时逐个核对并在 `RELAY.md` 写明核对日期。
- 新增厂商、新模型：改这几个文件（必要时补录放），不改协议代码。

### 5.1 `quirkscheck`（替换 `tools/lint/quirkscheck` 的桩）
- 扫描 `engine/llm/` 下所有非测试的 `.go` 文件（不含 `quirks/` 本身的数据加载代码里的字段名）；找 `==`、`!=`、`switch` 的 `case`、`strings.HasPrefix` / `HasSuffix` / `Contains` / `EqualFold` 里出现的字符串字面量，字面量里含有厂商或模型的词（从 `quirks.yaml` 的 `model` 通配去掉 `*` 得到的前缀，加上固定词表 `openai`、`anthropic`、`claude`、`gemini`、`google`、`mistral`、`deepseek`、`gpt`、`qwen`、`glm`、`moonshot`、`kimi`、`llama`、`ollama`，不区分大小写）就报错，写出文件、行号和那段代码。
- 协议名（`chat_completions` 等）、字段名不算。
- 用法：`go run ./tools/lint/quirkscheck`（`go run ./tools/build -check` 已经在调用它）；有问题退出码 1。

## 6. 不变量
- 协议代码里没有厂商名、模型名的字符串比较（`quirkscheck`）
- 每个常用厂商的 `provider` 都能通过 `E.10.01` 的配置校验

## 7. 错误处理
表格式错误：`Load` 返回错误并指出行号（启动失败，`B.01` §3）。

## 8. 验收标准
1. 合并顺序与三层覆盖正确
2. 思考强度映射规则正确
3. 错误规则优先于通用分类
4. `quirkscheck` 对故意写的特判报错、对正常代码不报
5. 常用厂商都能通过配置校验

### 实施卡
- 要建 / 要改的文件：`engine/llm/quirks/quirks.yaml`、`engine/llm/quirks/vendors.yaml`、`engine/llm/quirks/quirks.go`、`engine/llm/quirks/quirks_test.go`、`tools/lint/quirkscheck/main.go`、`tools/lint/quirkscheck/main_test.go`
- `tools/lint/quirkscheck/main.go` 现在是 `G.05.05` 的桩，本叶子整体替换（`G.02.06-R10`，`P.09` K251）
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`engine/store/`、`web/`、`engine/llm/protocol/`
- 测试用例：
  - `E1005-T1 合并顺序`：兜底规则 → 协议规则 → 模型规则逐字段覆盖；`*` 通配；不写的条件算匹配
  - `E1005-T2 思考强度映射`：`medium` 对 zai-glm 映射为 `high` 并记 warn；`xhigh` 对只支持 `low/medium/high` 的模型取 `high` 并记 warn；`off` 和没有 `reasoning` 的模型返回 ""；`budget` 按级取值
  - `E1005-T3 三层覆盖`：同一模型，提供方 `caps` 覆盖本表，模型条目 `caps` 再覆盖提供方
  - `E1005-T4 quirkscheck`：测试目录里放一个写了 `if model == "gpt-4o"` 和 `strings.HasPrefix(name, "claude")` 的文件 → 两处都报出行号；只比较协议名和普通字符串的文件不报；在仓库的 `engine/llm` 上运行不报
  - `E1005-T5 常用厂商`：每一项填上名字和密钥名后都能通过 `llm.ParseProviders`；`id` 不重名；协议都是已知的三种
  - `E1005-T6 错误规则`：状态、错误码、说明正则各一条命中；都不命中时返回 `ok=false`；格式错的 `quirks.yaml` 报出行号
- 允许使用的依赖：标准库、`github.com/goccy/go-yaml`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑨ 片（`m0-llm`）开工前复查：按协议实现（ADR-011）：匹配键改为"协议 + 上游模型名"；加错误规则、常用厂商（`vendors.yaml`）、按 token 预算的强度；`quirkscheck` 写明规则并替换桩；三层覆盖；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K250、K251 |
