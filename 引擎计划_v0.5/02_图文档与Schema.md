# 02 图文档与 Schema

> `schema/graph.schema.json` 是前后端共用的唯一事实来源。Go 结构体与 TS 类型均由它生成。
> 本文给出完整草案、类型系统的后端实现、图检查规则、NodeDef 注册表与版本迁移。

---

## 1. 设计约束

| 约束 | 说明 |
|---|---|
| 图文档是纯数据 | 不含运行状态（状态在 run_events 投影里），不含密钥 |
| 子图内联或引用 | `children`（内联子图，随父图版本走）或 `ref`（引用子图库，`name@version`） |
| 所有 id 为 ULID 字符串 | 节点 id 在**整棵图树内唯一**（子图内也不重复），便于路径与 Op 定位 |
| 坐标是世界坐标 | `pos: {x, y}`，整数，单位 px，已吸附到 20 网格（吸附由前端负责，后端不强制） |
| 参数值保持 JSON | `params` 是 `object`，具体结构由该节点的 NodeDef.params_schema 校验 |
| 版本单调递增 | `version` 每应用一个 Op +1；`schema_version` 表示文档格式版本 |

## 2. graph.schema.json 草案

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://harness.local/schema/graph.schema.json",
  "title": "Graph",
  "type": "object",
  "required": ["id", "schema_version", "version", "root"],
  "additionalProperties": false,
  "properties": {
    "id":             { "$ref": "#/$defs/Ulid" },
    "schema_version": { "type": "string", "const": "1.0" },
    "version":        { "type": "integer", "minimum": 0 },
    "branch":         { "type": "string", "default": "main" },
    "title":          { "type": "string", "maxLength": 120 },
    "root":           { "$ref": "#/$defs/Subgraph" },
    "mandates":       { "type": "array", "items": { "$ref": "#/$defs/MandateMount" } },
    "packages":       {
      "type": "array",
      "description": "本图依赖的扩展包，name@version",
      "items": { "type": "string", "pattern": "^[\\w\\-.]+@\\d+\\.\\d+(\\.\\d+)?$" }
    },
    "meta":           { "$ref": "#/$defs/Meta" }
  },

  "$defs": {
    "Ulid": { "type": "string", "pattern": "^[0-9A-HJKMNP-TV-Z]{26}$" },

    "Meta": {
      "type": "object",
      "properties": {
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": "string", "format": "date-time" },
        "created_by": { "$ref": "#/$defs/Actor" }
      }
    },

    "Actor": {
      "type": "object",
      "required": ["kind", "id"],
      "properties": {
        "kind": { "enum": ["user", "model", "system", "external"] },
        "id":   { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } }
      }
    },

    "Subgraph": {
      "type": "object",
      "required": ["nodes", "edges"],
      "additionalProperties": false,
      "properties": {
        "nodes": { "type": "array", "items": { "$ref": "#/$defs/Node" } },
        "edges": { "type": "array", "items": { "$ref": "#/$defs/Edge" } },
        "view":  {
          "type": "object",
          "description": "上次的视口，仅供前端恢复",
          "properties": { "x": {"type":"number"}, "y": {"type":"number"}, "k": {"type":"number"} }
        }
      }
    },

    "Node": {
      "type": "object",
      "required": ["id", "type", "pos"],
      "additionalProperties": false,
      "properties": {
        "id":       { "$ref": "#/$defs/Ulid" },
        "type":     { "$ref": "#/$defs/NodeTypeRef" },
        "label":    { "type": "string", "maxLength": 80 },
        "pos":      {
          "type": "object", "required": ["x", "y"],
          "properties": { "x": {"type":"integer"}, "y": {"type":"integer"} }
        },
        "params":   { "type": "object", "default": {} },
        "promoted": {
          "type": "array",
          "description": "已转为输入端口的参数名",
          "items": { "type": "string" }, "uniqueItems": true
        },
        "tags":     { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
        "hooks":    { "$ref": "#/$defs/Hooks" },
        "lock":     { "enum": ["none", "def", "kernel"], "default": "none",
                      "description": "实例级锁：def 表示仅作者可改" },
        "children": { "$ref": "#/$defs/Subgraph", "description": "内联子图（循环/扇出 body、封装子图）" },
        "ref":      { "$ref": "#/$defs/SubgraphRef", "description": "引用子图库，与 children 互斥" },
        "origin":   { "$ref": "#/$defs/Origin" }
      },
      "not": { "required": ["children", "ref"] }
    },

    "NodeTypeRef": {
      "type": "string",
      "description": "原子节点为中文名（Agent、扇出…）；扩展节点为 包名/节点名@主版本",
      "examples": ["Agent", "扇出", "pricing-pack/价格标准化@1"]
    },

    "SubgraphRef": {
      "type": "object",
      "required": ["name", "version", "pin"],
      "properties": {
        "name":    { "type": "string" },
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+(\\.\\d+)?$" },
        "pin":     { "enum": ["snapshot", "link"] },
        "overrides": {
          "type": "object",
          "description": "路径 → 资源/配方/策略引用，不打开子图也能替换",
          "additionalProperties": { "type": "string" }
        }
      }
    },

    "Hooks": {
      "type": "object",
      "properties": {
        "before":   { "type": "array", "items": { "type": "string" } },
        "after":    { "type": "array", "items": { "type": "string" } },
        "on_error": { "type": "array", "items": { "type": "string" } }
      },
      "additionalProperties": false
    },

    "Origin": {
      "type": "object",
      "description": "谁创建/最后修改，用于画布 AI 签",
      "properties": {
        "actor":  { "$ref": "#/$defs/Actor" },
        "op_id":  { "$ref": "#/$defs/Ulid" },
        "reason": { "type": "string", "maxLength": 500 }
      }
    },

    "PortRef": {
      "type": "object",
      "required": ["node", "port"],
      "additionalProperties": false,
      "properties": {
        "node": { "$ref": "#/$defs/Ulid" },
        "port": { "type": "string", "pattern": "^[a-z_][a-z0-9_]*(\\[\\d+\\])?$",
                  "description": "动态插口用 in[0]、in[1]" }
      }
    },

    "Edge": {
      "type": "object",
      "required": ["id", "from", "to"],
      "additionalProperties": false,
      "properties": {
        "id":    { "$ref": "#/$defs/Ulid" },
        "from":  { "$ref": "#/$defs/PortRef" },
        "to":    { "$ref": "#/$defs/PortRef" },
        "label": { "type": "string", "maxLength": 40 },
        "origin":{ "$ref": "#/$defs/Origin" }
      }
    },

    "TypeRef": {
      "type": "string",
      "description": "名称@主.次；列表写作 列表[T]；类型变量写作 $T",
      "pattern": "^(任意|\\$[A-Z]|列表\\[.+\\]|[^@\\[\\]]+@\\d+(\\.\\d+)?)$",
      "examples": ["方案@1", "上下文包@1", "列表[执行结果@1]", "$T", "任意"]
    },

    "MandateMount": {
      "type": "object",
      "required": ["target", "mandate_id"],
      "properties": {
        "target":     { "type": "string", "description": "graph | node:<ulid>" },
        "mandate_id": { "$ref": "#/$defs/Ulid" },
        "level":      { "type": "integer", "minimum": 0, "maximum": 4,
                        "description": "冗余存档位，便于前端显示；以 mandate 为准" }
      }
    }
  }
}
```

说明：
- `Node.children` 与 `Node.ref` 互斥（`not.required`）。循环、扇出的 body 用 `children`；子图引用节点用 `ref`；"封装选中"生成的子图默认 `children`，用户"存入子图库"后才变成 `ref`。
- 端口不写在实例上；端口集合 = NodeDef.ports + `promoted` 参数 + 动态插口（由连线反推）。
- `Mandate` 本体存在 `mandates` 表，图里只存挂载点。

## 3. 节点定义 NodeDef 与注册表

### 3.1 nodedef.schema.json（要点）

```json
{
  "$id": "https://harness.local/schema/nodedef.schema.json",
  "type": "object",
  "required": ["name", "version", "kind", "category", "impl", "ports", "params_schema"],
  "properties": {
    "name":     { "type": "string" },
    "version":  { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "kind":     { "enum": ["atomic", "subgraph"] },
    "category": { "enum": ["资源","智能体","状态","工具","拓扑","聚合","控制","人工","边界","组合","扩展"] },
    "impl": {
      "type": "object", "required": ["type"],
      "properties": {
        "type":   { "enum": ["builtin", "script", "prompt", "http", "mcp", "subgraph"] },
        "entry":  { "type": "string" },
        "lang":   { "enum": ["python", "node"] },
        "url":    { "type": "string" },
        "server": { "type": "string" },
        "tool":   { "type": "string" },
        "ref":    { "type": "string" }
      }
    },
    "ports": {
      "type": "object",
      "properties": {
        "inputs":  { "type": "object", "additionalProperties": { "$ref": "#/$defs/PortDef" } },
        "outputs": { "type": "object", "additionalProperties": { "$ref": "#/$defs/PortDef" } }
      }
    },
    "params_schema": { "type": "object", "additionalProperties": { "$ref": "#/$defs/ParamDef" } },
    "type_vars": {
      "type": "object",
      "description": "类型变量绑定，如 { \"T\": \"param:output_schema\" }",
      "additionalProperties": { "type": "string" }
    },
    "kernel_rules": { "type": "array", "items": { "type": "string" } }
  },
  "$defs": {
    "PortDef": {
      "type": "object", "required": ["type"],
      "properties": {
        "type":     { "type": "string" },
        "required": { "type": "boolean", "default": false },
        "multi":    { "type": "boolean", "default": false },
        "dynamic":  { "type": "boolean", "default": false, "description": "in_* 动态插口" },
        "lock":     { "enum": ["none", "def", "kernel"], "default": "none" }
      }
    },
    "ParamDef": {
      "type": "object", "required": ["type"],
      "properties": {
        "type":       { "type": "string", "description": "integer|number|string|boolean|enum|类型引用|配方引用|策略引用|子图|object" },
        "default":    {},
        "enum":       { "type": "array" },
        "range":      { "type": "array", "items": { "type": "number" }, "minItems": 2, "maxItems": 2 },
        "lock":       { "enum": ["none", "def", "kernel"], "default": "none" },
        "promotable": { "type": "boolean", "default": true },
        "widget":     { "type": "boolean", "default": false, "description": "默认作为节点内联控件（最多 3 个）" }
      }
    }
  }
}
```

### 3.2 注册表（Go）

```go
// engine/schema/registry.go
type Registry struct {
    mu    sync.RWMutex
    defs  map[string]*NodeDef   // "Agent" 或 "pricing-pack/价格标准化@1"
    types map[string]*TypeDef   // "方案@1"（主版本），内含次版本历史
    pkgs  map[string]*Package
}

func (r *Registry) LoadBuiltin(fsys fs.FS) error         // schema/builtin/**
func (r *Registry) InstallPackage(p *Package) error      // 不得覆盖核心类型；新类型必须 extends
func (r *Registry) NodeDef(ref string) (*NodeDef, bool)
func (r *Registry) Type(ref string) (*TypeDef, bool)     // "方案@1.2" → 主版本 1
func (r *Registry) Snapshot() RegistryView               // 运行冻结时一并冻结
```

运行开始时把 `Registry.Snapshot()` 的哈希写入 `runs.registry_hash`；回放时哈希不同就给警告。

## 4. 类型系统的后端实现

### 4.1 表示

```go
// engine/schema/typesys.go
type TypeKind uint8
const (
    KAny   TypeKind = iota // 任意
    KNamed                 // 方案@1
    KList                  // 列表[T]
    KVar                   // $T（只出现在 NodeDef 端口上）
    KTuple                 // 汇合 shape=tuple
)

type Type struct {
    Kind  TypeKind
    Name  string; Major, Minor int // KNamed
    Elem  *Type                    // KList
    Var   string                   // KVar
    Items []*Type                  // KTuple
}

type TypeDef struct {
    Name     string
    Major    int
    Minors   []MinorRev       // 次版本只能加可选字段
    Extends  *Type            // 名义继承
    Fields   []FieldDef       // required / inherit / readonly_except / max_chars …
    Producer string           // 系统类型：只能由该节点产出
    Migrate  map[int]string   // 旧主版本 → 迁移函数名
}

func Parse(ref string) (*Type, error) // "列表[方案@1]" → {KList, Elem:{KNamed 方案 1 0}}
```

### 4.2 兼容规则 `Assignable(src, dst) Result`

按顺序判断，第一条命中即返回：

| # | 条件 | 结果 | 提示 |
|---|---|---|---|
| C0 | dst 为 任意 | 可连 | — |
| C1 | src 为 任意，dst 不是 | 拒绝 | 任意 只能进不能出，先经设定了 output_schema 的 Agent 转换 |
| C2 | dst 是系统类型，src 的 producer 不符 | 拒绝 | 上下文包 只能来自上下文装配 |
| C3 | 同名同主版本 | 可连（次版本不限） | — |
| C4 | 同名不同主版本 | 有迁移函数 → 可连并标 migrate；否则拒绝 | 方案@1 → 方案@2 缺少迁移 |
| C5 | src 沿 Extends 链能到 dst | 可连 | 子类型可赋给父类型 |
| C6 | dst 沿链到 src | 拒绝 | 父类型不能接子类型端口 |
| C7 | src=列表[X]，dst=Y，且 X→Y 可连 | 可连并标 expand | 自动展开，对每项运行一次 |
| C8 | src=X，dst=列表[Y] | 拒绝 | 单个值不能接列表端口，加汇合节点 |
| C9 | 都是列表 | 递归比较元素 | — |
| C10 | 其余 | 拒绝 | {src} 不能接到 {dst} |

```go
type Result struct {
    OK      bool
    Expand  bool   // C7
    Migrate string // C4
    Reason  string // 中文，直接给前端
    Rule    string // "C6"
}
```

### 4.3 类型变量推断

NodeDef 的 `type_vars` 声明绑定来源：

| 节点 | 声明 | 含义 |
|---|---|---|
| Agent | `T: param:output_schema` | T 取参数 |
| 扇出 | `T: input:items.elem`，`U: body:exit` | T 为元素类型，U 为 body 出口类型 |
| 分支 | `T: input:value` | 出口类型 = 输入类型 |
| 循环 | `T: input:init` | — |
| 聚合 | `U: op:<算子>(T)` | 查算子表，如 count→整数，group_ratio→聚合结果@1 |

```go
// engine/schema/infer.go
func Infer(g *graph.Graph, reg *Registry) (map[graph.PortKey]*Type, []Diag) {
    // 1. 填所有具体类型端口
    // 2. 绑定 param:* 变量
    // 3. 按拓扑序传播 input:*（循环/扇出视为黑盒，内部单独推断）
    // 4. 子图：先推断 children，再把入口/出口类型提升为父节点端口类型
    // 5. 重复 3–4 直到不变（上限 = 节点数轮）；仍未确定 → Diag "无法推断 T，请设置 output_schema"
}
```

## 5. 图检查 Validate

`schema.Validate(g, reg, mandates) []Diag` 在三处调用：前端实时提示、Op 应用后、运行冻结前（必须零 error）。

```go
type Diag struct {
    Level, Code, Path, Node, Port, Msg string // Level: error|warn；Msg 中文
}
```

| 码 | 规则 | 级别 | 实现 |
|---|---|---|---|
| V01 | 文档结构合法 | error | jsonschema 校验 |
| V02 | 节点类型已注册、包已安装 | error | Registry 查找 |
| V03 | params 符合 params_schema | error | 按节点生成 schema 校验 |
| V04 | 锁定参数未改 | error | lock=kernel/def 与默认值比对 |
| V05 | 连线端口存在 | error | 端口 = def.ports ∪ promoted ∪ 动态插口 |
| V06 | 类型兼容 | error | 4.2 |
| V07 | 非 multi 输入最多一条线 | error | 计数 |
| V08 | 必填输入已连或参数有值 | error | — |
| V09 | **环只能经循环节点形成** | error | 每层子图做 Tarjan SCC；大小 >1 的 SCC 或自环即报错。循环的回边在 children 内部，不出现在当层 |
| V10 | 循环至少一个有限出口 | error | max_rounds / budget / idle_timeout 至少一个 |
| V11 | 子图至少一个入口一个出口 | error | — |
| V12 | 嵌套深度 ≤ max_depth（默认 3，内核上限 8），ref 无引用环 | error | DFS |
| V13 | L3 工具上游有人工节点 | error | direct 工具反向 BFS 找人工；endpoint 模式检查连接它的 Agent 上游 |
| V14 | Agent.context 只接上下文装配 | error | C2 的友好版提示 |
| V15 | 子图权限交集为空 | warn | grant ∩ 声明 ∩ 父级 |
| V16 | 类型变量可推断 | error | 4.3 |
| V17 | 孤立节点 | warn | — |
| V18 | 长循环未设预算 | warn | max_rounds > 10 且无 budget |

性能：V01–V08 增量执行，只查被 Op 触及的节点和边；V09、V12、V16 全图执行，按子图哈希缓存。目标：500 节点全量检查 < 20ms。

## 6. 序列化与版本迁移

| 项 | 规则 |
|---|---|
| 存储格式 | 规范化 JSON（键排序、无多余空白），`hash = sha256(doc)` |
| 快照频率 | 每 50 个 Op 存一次全文；中间版本 = 最近全文 + 重放 Op（见 08） |
| schema_version 升级 | 迁移函数注册在 `engine/schema/migrate.go`，加载时链式升级，写新版本，Op 记为 `system:migrate` |
| 类型主版本升级 | 包内提供迁移函数；边上隐式插入转换（C4），Validate 给 warn |
| 导入导出 | `GET /graphs/{id}/export?format=json|yaml`，附依赖包清单；导入时检查包是否已安装 |
| 兼容承诺 | 同一 schema 主号内只增不删；`params`、`meta` 中未知字段必须原样保留 |
