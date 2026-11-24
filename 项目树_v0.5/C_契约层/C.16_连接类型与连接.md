# C.16 连接类型与连接

| 项 | 内容 |
|---|---|
| 编号 | C.16 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5.2 |
| 最后修改 | 2026-11-24 |

## 1. 职责
定义"连接"：很多节点共用的账号、地址和密钥（模型提供方、GitHub、Slack、飞书、数据库、邮箱、搜索服务……）。连接类型由包声明，表单按字段自动生成；节点参数用 widget=connection 选择连接。

## 2. 不做什么
- 不存储密钥明文（密钥进 `B.07.02` 密钥库，连接里只存密钥名）

## 3. 继承的上级约束
`S.03`、`B.07.02`、`C.15`。

## 4. 接口
```json
"ConnectionType": {
  "required": ["id", "name", "group", "fields"],
  "properties": {
    "id": { "type": "string" }, "name": {}, "group": { "description": "模型 / 代码托管 / 办公协作 / 数据库 / 邮件 / 搜索 …" },
    "description": {}, "provided_by": { "description": "包 id" },
    "fields": { "type": "array", "items": { "required": ["key", "label", "type"],
      "properties": { "key": {}, "label": {}, "type": { "enum": ["text", "secret", "number", "url", "select", "kv", "json"] }, "placeholder": {}, "help": {}, "default": {}, "required": { "type": "boolean" } } } },
    "test": { "description": "测试方法：http_get / tool_call / provider_list_models" }
    // fields[].suggestions: [{label, value}]（C.16-R8）
  }
},
"Connection": {
  "required": ["id", "type", "name"],
  "properties": { "id": {}, "type": {}, "name": { "description": "节点下拉框里显示的名字，同类型可以有多个" },
    "values": { "type": "object", "description": "非密钥字段的值；secret 字段存密钥名，如 conn:gh:token" },
    "state": { "enum": ["ok", "error", "untested"] }, "error": {}, "updated_at": {},
    "secret_tails": { "type": "object", "description": "secret 字段的末 4 位（C.16-R6）" }, "models": { "type": "array", "description": "模型连接，C.16-R7" } }
}
```

## 5. 行为
- **C.16-R1** 模型提供方是连接，每种接口协议一个连接类型：`llm.chat_completions`、`llm.responses`、`llm.anthropic_messages`（`E.10.01`，ADR-011）；原"模型提供方"设置合并进"连接"。
- **C.16-R2** 节点引用连接只存连接 id；连接改名不影响节点。删除连接时，引用它的节点显示"缺少连接"，校验报 V21。
- **C.16-R3** MCP 服务的环境变量、扩展包需要的密钥，都用 `{{secret:名}}` 或"选择连接"引用，不允许直接写明文（保存时扫描，`S.03-R5`）。
- **C.16-R5** 模型连接测试时，为每个模型读取它支持的思考强度，存为 `models[].effort`（取值见 `U.09.06-R5`）；不支持调节的模型不写这个字段。
- **C.16-R4** 连接的"谁在用"由后端扫描所有图和包计算（`GET /connections/{id}/usages`）。
- **C.16-R6** 请求与响应里的密钥（`P.09` K144）：`POST /connections` 的请求体 `{type, name, values, secrets}`、`PUT /connections/{id}` 的请求体 `{name?, values?, secrets?}`；`secrets` 是"字段 key → 明文"，只在这一次请求里出现，后端写入密钥库（密钥名 `conn:<连接 id>:<字段 key>`）后把 `values[key]` 记为密钥名，请求体立即丢弃、不进日志（同 `B.04.07` §5）；`secrets[key] = null` 表示删除这个密钥（"断开"），缺省表示不改。响应的 `Connection` 不含任何明文，另带 `secret_tails`（字段 key → 末 4 位，INV-22、`S.03-R5`）。
- **C.16-R7** 模型连接（`llm.*`）的 `Connection` 带 `models[]`（最近一次测试读到的模型：`ref`、`window`、`caps`、`effort`、`priced`）；`POST /connections/{id}/test` 返回 `ConnectionTest {ok, state, error?, models?}`；`GET /connections/{id}/usages` 返回 `ConnectionUsages {graphs[{graph_id, title, session_id?, nodes[{id, label, scope}]}], packages[{id, name}]}`。
- **C.16-R8** 连接字段可以声明 `suggestions: [{label, value}]`（例如常用厂商的地址），前端在输入框下方列出可点的预设（`U.19.07` 第 2 步）。模型连接的预设来自 `E.10.05` 的常用厂商，选一个就填好协议、地址、鉴权方式和常用模型。
- **C.16-R9** 前端只通过 `/connections` 管理模型提供方；`B.04.07` 的 `/providers` 保留给 `anydoorctl` 和旧路径别名，二者是同一份数据。
- **C.16-R10** 模型连接的字段和 `E.10.01` §4.3 的提供方配置一一对应：常用字段 `base_url`（url）、`auth.secret`（secret）、`models`（json：`[{id, upstream?, caps?}]`）；"高级"分组里 `paths`（kv）、`auth.type`（select）、`auth.name`（text）、`headers`（kv，值里可以写 `{{secret:名}}`）、`override`（json：请求体覆盖）、`caps`（json）、`timeout_s`（number）、`proxy`（url）。`kv` 是可增删的"名 → 值"行，`json` 是带 schema 校验的代码框。连接保存时用 `llm.ParseProviders` 校验，错误标在对应字段上。连接类型 `test` 为 `provider_list_models`（`E.10.01` `ListModels`）。
- 接口：`GET/POST /api/v1/connections`、`GET/PUT/DELETE /connections/{id}`、`POST /connections/{id}/test`、`GET /connection-types`。

## 6. 不变量
- 任何配置文件、日志、导出里都不出现连接的密钥明文

## 7. 错误处理
测试失败：`state=error`，error 写人能看懂的原因（"401 · API Key 无效"）。

## 8. 验收标准
1. 新装飞书扩展包后出现"飞书应用"连接类型，表单按字段生成
2. 节点上"新建连接…"可以就地创建并选中
3. 删除被使用的连接时列出使用者

### 实施卡
- 要建 / 要改的文件：`schema/connection.schema.json`、`internal/app/conn/*.go`、`internal/api/connections.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `C16-T1 表单生成`
  - `C16-T2 无明文`
  - `C16-T3 使用者`
  - `C16-T4 测试`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 新增 R6（请求体 `secrets`、响应 `secret_tails`）、R7（模型列表、测试与"谁在用"的响应）、R8（字段预设 `suggestions`）、R9（前端只用 `/connections`） | 第 9 棒写 `W.09.04`；`P.09` K144 |
| 2026-11-24 | 模型连接改为每种接口协议一个连接类型（R1）；新增 R10 写明字段与提供方配置的对应；字段类型加 `kv`、`json`；R8 的预设来自常用厂商 | `P.09` K250 |
