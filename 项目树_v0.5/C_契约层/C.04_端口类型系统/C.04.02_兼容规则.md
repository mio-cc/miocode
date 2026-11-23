# C.04.02 兼容规则

| 项 | 内容 |
|---|---|
| 编号 | C.04.02 |
| 类型 | 实施 |
| 上级 | C.04 端口类型系统 |
| 下级 | 无 |
| 状态 | 已审 |
| 素材 | 引02 |
| 最后修改 | 2026-11-23 |

## 1. 职责
定义两个端口能不能连：`Assignable(src, dst)`。前端拖线时的实时提示、后端校验（V06）、模型的图操作工具都用同一套规则。

## 2. 规则表
按顺序判断，**第一条命中就返回**。`src` 是输出端口的类型，`dst` 是输入端口的类型（类型变量已经推断过）。

| 编号 | 条件 | 结果 | 提示文案（给用户看） |
|---|---|---|---|
| C0 | `dst` 是 `任意` | 可连 | — |
| C1 | `src` 是 `任意`，`dst` 不是 | 拒绝 | "任意类型只能接到「任意」端口。先接一个设置了输出类型的 Agent 来转换" |
| C2 | `dst` 是系统类型，且 `src` 不是由它的 `producer` 产出的 | 拒绝 | "{dst} 只能来自{producer}节点"（例："上下文包只能来自上下文装配节点"） |
| C3 | 同名、同主版本 | 可连（次版本不限） | — |
| C4 | 同名、不同主版本 | 有迁移函数 → 可连，标记 `migrate`；否则拒绝 | "{src} 和 {dst} 版本不同，且没有转换方法" |
| C5 | `src` 沿继承链能到 `dst` | 可连 | — |
| C6 | `dst` 沿继承链能到 `src` | 拒绝 | "父类型不能接到子类型端口" |
| C7 | `src` 是 `列表[X]`，`dst` 是 `Y`（不是列表），且 X → Y 可连 | 可连，标记 `expand`（对列表的每一项各执行一次下游节点） | — |
| C8 | `src` 是 `X`（不是列表），`dst` 是 `列表[Y]` | 拒绝 | "单个值不能接到列表端口，中间加一个汇合节点" |
| C9 | 两边都是列表 | 递归比较元素类型 | — |
| C10 | 其他 | 拒绝 | "{src} 不能接到 {dst}" |

**INV-07 的落实**：Agent 的 `context` 端口类型是 `上下文包@1`，由 C2 保证只能接上下文装配节点。

## 3. 返回值
```go
type Assign struct {
    OK      bool   `json:"ok"`
    Expand  bool   `json:"expand,omitempty"`  // C7
    Migrate string `json:"migrate,omitempty"` // C4：迁移函数名
    Rule    string `json:"rule"`              // "C0"…"C10"
    Reason  string `json:"reason,omitempty"`  // 中文提示，直接显示
}
```
前后端的类型都由 `errors.schema.json#/$defs/Assign` 生成（`P.09` K204）：
```json
"Assign": {
  "type": "object",
  "required": ["ok", "rule"],
  "additionalProperties": false,
  "properties": {
    "ok":      { "type": "boolean" },
    "expand":  { "type": "boolean", "default": false, "description": "C7" },
    "migrate": { "type": "string", "description": "C4：迁移函数名，写作 <名称>@<旧主版本>→<新主版本>" },
    "rule":    { "enum": ["C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"] },
    "reason":  { "type": "string", "description": "中文提示，直接显示；可连时不写" }
  }
}
```
C9 时 `rule` 写 `C9`，`ok`、`migrate`、`reason` 取元素类型比较的结果，`expand` 为 false。

## 4. 规则
- **C.04.02-R1** 规则只有一份实现：Go 实现是标准，前端通过 WASM 或移植实现；两者用同一组测试向量（`schema/examples/assign_vectors.json`）验证，结果必须逐条一致。
- **C.04.02-R2** 提示文案写在 `schema/builtin/messages/assign.zh.yaml`，不硬编码在代码里。
- **C.04.02-R3** C7 自动展开只用于非容器节点；目标是容器节点时不展开，按 C8 / C10 判断。展开时下游节点的运行路径带份号 `#N`（`C.06.05`）。

## 5. 测试向量与提示文案
`schema/examples/assign_vectors.json`：
```json
{
  "types": [
    { "name": "任务", "major": 1, "minor": 0 },
    { "name": "任务卡", "major": 1, "minor": 0, "extends": "任务@1" },
    { "name": "方案", "major": 2, "minor": 0, "migrate_from": ["1"] },
    { "name": "上下文包", "major": 1, "minor": 0, "producer": "上下文装配" }
  ],
  "vectors": [
    { "name": "同名同主版本", "src": "方案@1.2", "dst": "方案@1", "want": { "ok": true, "rule": "C3" } },
    { "name": "资源接 context（INV-07）", "src": "资源引用@1", "dst": "上下文包@1", "src_node": "资源",
      "want": { "ok": false, "rule": "C2", "reason": "上下文包只能来自上下文装配节点" } }
  ]
}
```
- `types` 是这组向量自己的类型表，不依赖 `schema/builtin/types/`：名称、主次版本、`extends`、`migrate_from`（有迁移函数的旧主版本）；写了 `producer` 的是系统类型。
- `src_node`：产出 `src` 的节点类型（C2 用）；`dst_container: true`：下游是容器节点（R3）。
- `want` 符合 `Assign`；拒绝时 `reason` 是 `assign.zh.yaml` 里该规则的模板代入变量后的文字。
- 至少 40 条，C0–C10 每条规则至少 3 条。

`schema/builtin/messages/assign.zh.yaml`：恰好 C1、C2、C4、C6、C8、C10 六条（`G.16`），变量 `{src}`、`{dst}` 是完整的类型写法，`{dst_name}` 是不带版本的名称，`{producer}` 是产出节点类型：
```yaml
C1: 任意类型只能接到「任意」端口。先接一个设置了输出类型的 Agent 来转换
C2: "{dst_name}只能来自{producer}节点"
C4: "{src} 和 {dst} 版本不同，且没有转换方法"
C6: 父类型不能接到子类型端口
C8: 单个值不能接到列表端口，中间加一个汇合节点
C10: "{src} 不能接到 {dst}"
```

## 6. 验收标准
1. `assign_vectors.json` 至少 40 条，覆盖 C0–C10 每条规则至少 3 条；Go 与 TS 全部一致。
2. 资源节点的 `ref` 输出接到 Agent 的 `context` 被拒绝，规则 C2，提示文案正确。

### 实施卡
- 要建 / 要改的文件：`schema/errors.schema.json`、`schema/examples/assign_vectors.json`、`schema/builtin/messages/assign.zh.yaml`、`tools/schemacheck/assign_test.go`
- 不许碰的文件：`gen/`、`engine/`、`internal/`、`web/`、`cmd/`、`tools/relay/`、`tools/build/`
- 测试用例：
  - `C0402-T1 向量格式`：每条 `want` 符合 `Assign`；`src`、`dst` 符合 `TypeRef`；用到的命名类型都在 `types` 里（`任意` 和列表除外）；不少于 40 条，C0–C10 每条规则不少于 3 条
  - `C0402-T2 INV-07`：有一条 `资源引用@1 → 上下文包@1`、`src_node` 为 `资源`，期望 C2 拒绝
  - `C0402-T3 提示文案`：`assign.zh.yaml` 恰好有六条规则；每条拒绝向量的 `reason` 等于对应模板代入变量后的文字（C9 用元素比较的规则和元素类型）
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 实现与向量逐条一致：`E0302-T2`（`E.03.02`），前端 `W.05`（`ops/typecheck.ts`）用同一组向量
- 允许使用的依赖：标准库、`github.com/santhosh-tekuri/jsonschema/v6`、`github.com/goccy/go-yaml`（`G.10` 已登记，`C.01` 加进 `go.mod`）
- 禁止事项：`G.02.05-R1`、`R2`
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）
## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 实施卡：前端实现位置改为 `W.05` | `P.09` K90：预检归 `W.05`（`W.03.01` §2），画布引擎不能被 `ops/` 引用 |
| 2026-11-23 | §3 写出 `Assign` 的 JSON（放在 `errors.schema.json`）与 C9 的结果；新增 §5 测试向量格式与 `assign.zh.yaml`；实施卡改为机器可读写法 | `P.09` K201、K204 |
