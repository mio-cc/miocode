# C.04.01 8 类基础类型

| 项 | 内容 |
|---|---|
| 编号 | C.04.01 |
| 类型 | 实施 |
| 上级 | C.04 端口类型系统 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | DESIGN§2.4 |
| 最后修改 | 2026-11-22 |

## 1. 职责
定义 TypeRef 的写法、8 个显示类别、内置的系统类型，以及"数据类型 → 显示类别"的对应规则。

## 2. TypeRef 语法（`types.schema.json#/$defs/TypeRef`）
```
TypeRef  := "任意" | Var | List | Named
Var      := "$" 大写字母           例：$T、$U
List     := "列表[" TypeRef "]"    例：列表[执行结果@1]、列表[$T]
Named    := 名称 "@" 主版本 ["." 次版本]   例：方案@1、方案@1.2
名称     := 1–30 个字符，不含 @ [ ] / 空白
```
```json
"TypeRef": {
  "type": "string",
  "pattern": "^(任意|\\$[A-Z]|列表\\[.+\\]|[^@\\[\\]/\\s]{1,30}@\\d+(\\.\\d+)?)$"
}
```
- **C.04.01-R1** `$T` 这样的类型变量只能出现在 NodeDef 的端口上，不能出现在运行时的值上。
- **C.04.01-R2** 写 `方案@1.2` 时表示"至少需要 1.2 版的字段"；连线检查只看主版本（`C.04.02` C3）。
- schema 的 `pattern` 只检查外形；`列表[...]` 里面的写法、类型变量出现的位置由解析器检查（`E.03.02`）。

## 3. 8 个显示类别
| 类别 | 令牌 | 界面名 | 哪些数据类型属于它 |
|---|---|---|---|
| `any` | `--hx-type-any` | 任意 | `任意` |
| `ctx` | `--hx-type-ctx` | 上下文包 | `上下文包@1` |
| `ref` | `--hx-type-ref` | 资源引用 | `资源引用@1` |
| `list` | `--hx-type-list` | 列表 | 所有 `列表[...]` |
| `tool` | `--hx-type-tool` | 工具端点 | `工具端点@1` |
| `gen` | `--hx-type-gen` | 数据 | `$T` 等类型变量、所有业务类型（`方案@1`、`判定@1`、`任务卡@1`…） |
| `ctrl` | `--hx-type-ctrl` | 判定 | 不由类型推出，只能由 `PortDef.category` 显式指定（分支、人工的出口） |
| `state` | `--hx-type-state` | 状态 | `状态@1` |

```json
"Category": { "enum": ["any", "ctx", "ref", "list", "tool", "gen", "ctrl", "state"] }
```
- **C.04.01-R3** 显示类别**只有这 8 个**，新增类型（包括扩展包定义的类型）只能映射到这 8 个之一（DESIGN §2.4）。
- **C.04.01-R4** 端口的显示类别 = `PortDef.category`（如果写了）；否则按上表从数据类型推出。
- **C.04.01-R5** `ctrl` 只表示"这个出口控制下游是否执行"，不表示数据类型。`ctrl` 端口仍然传值，值的类型就是它的 TypeRef。
- 界面名"数据"替代旧称"T"，因为非专业用户看不懂"T"（`U.15`）。

`schema/builtin/category_map.yaml` 是上表的机器可读版（R4：端口写了 `PortDef.category` 时不查这张表）：
```yaml
categories: [any, ctx, ref, list, tool, gen, ctrl, state]   # 与 Category 枚举同序
rules:                      # 按顺序匹配，第一条命中的生效；type 只写名称，不看版本
  - { type: 任意, category: any }
  - { list: true, category: list }
  - { type: 上下文包, category: ctx }
  - { type: 资源引用, category: ref }
  - { type: 工具端点, category: tool }
  - { type: 状态, category: state }
  - { default: true, category: gen }   # 类型变量和其他所有命名类型
```

## 4. 系统类型
系统类型由内核定义，扩展包不能覆盖、不能继承；其中一部分只能由特定节点产出（`producer`）。

| 类型 | 只能由谁产出 | 内容 | 定义文件 |
|---|---|---|---|
| `任意` | — | 任何 JSON 值 | 内置 |
| `资源引用@1` | 资源 | `{kind, ref, version?}`：指向一个模型、提示词、列表或常量 | `schema/builtin/types/资源引用.yaml` |
| `上下文包@1` | 上下文装配 | `{sections[], tokens, dropped[], inherit{}}` | `…/上下文包.yaml` |
| `工具端点@1` | 工具 | `{tool, risk, schema_ref}` | `…/工具端点.yaml` |
| `状态@1` | 账本 | `{store, path, version, value}` | `…/状态.yaml` |
| `简报@1` | 子图端口（summary） | `{goal_id, status, conclusion, criteria_check, cost}` | `…/简报.yaml` |
| `升级@1` | 子图端口（escalation） | `{kind, severity, question, options[]}` | `…/升级.yaml` |
| `整数@1` | — | 一个整数（标量类型，聚合算子 `count` 的输出，`C.04.03`） | `…/整数.yaml` |

内置业务类型（模板会用到，用户可以在扩展包里继承）：`方案@1`、`簇标注@1`、`任务卡@1`、`执行结果@1`、`判定@1`、`目标@1`、`差距报告@1`，以及聚合算子的输出 `聚合结果@1`、`统计@1`、`分歧报告@1`（`C.04.03`）。它们的字段定义在 `schema/builtin/types/`，格式见 `C.13.03`。上面所有类型的定义文件都归 `C.13.03` 实施（`P.09` K205、K206）。

## 5. 验收标准
1. TypeRef 解析器对合法写法（上面所有例子）和非法写法（`$t`、`列表[]`、`方案`、`方案@x`）都有测试。
2. "类型 → 类别"推导对 §3 每一行都有测试，前后端一致。
3. 扩展包定义名为 `上下文包` 的类型时安装失败。

### 实施卡
- 要建 / 要改的文件：`schema/types.schema.json`、`schema/builtin/category_map.yaml`、`tools/schemacheck/types_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0401-T1 TypeRef 外形`：§2 的合法例子都通过；`$t`、`列表[]`、`方案`、`方案@x` 被拒（表在测试里）
  - `C0401-T2 类别表`：`category_map.yaml` 的 `categories` 与 `Category` 枚举相同、同序；`rules` 覆盖 §3 表里除 `ctrl` 以外的每一行；没有规则产出 `ctrl`；最后一条是 `default`
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - TypeRef 完整解析：`E0302-T1`（`E.03.02`）
  - 类别推导前后端一致（§5 验收 2）：`E.03.02` 与前端 `W.05`（`ops/typecheck.ts`）
  - 扩展包不能覆盖系统类型（§5 验收 3）：`E0301-T2`（`E.03.01`）
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §3 加 `category_map.yaml` 格式；§4 加系统类型 `整数@1`、业务类型 `聚合结果@1`、`统计@1`、`分歧报告@1`，类型定义文件归 `C.13.03`；实施卡改为机器可读写法 | `P.09` K201、K205、K206 |
| 2026-11-23 | 状态改为"冻结"：第 2 片（契约片 `m0-contract`）squash 合并进代码仓库 `main`，提交 `34b28fbd47004406cbf3c643947c445bd223be65`（`G.02.06-R21`、`R23`） | 整片验证通过；整片评审 12 条，`C.01` 一条不符合（示例清单路径在 Windows 上可跳出目录）已修复并复核；按 `G.08-R3` 由验证者合并 |
