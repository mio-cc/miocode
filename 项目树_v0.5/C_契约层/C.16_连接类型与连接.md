# C.16 连接类型与连接

| 项 | 内容 |
|---|---|
| 编号 | C.16 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | demo v0.5.2 |
| 最后修改 | 2026-11-23 |

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
      "properties": { "key": {}, "label": {}, "type": { "enum": ["text", "secret", "number", "url", "select"] }, "placeholder": {}, "help": {}, "default": {}, "required": { "type": "boolean" } } } },
    "test": { "description": "测试方法：http_get / tool_call / provider_list_models" }
  }
},
"Connection": {
  "required": ["id", "type", "name"],
  "properties": { "id": {}, "type": {}, "name": { "description": "节点下拉框里显示的名字，同类型可以有多个" },
    "values": { "type": "object", "description": "非密钥字段的值；secret 字段存密钥名，如 conn:gh:token" },
    "state": { "enum": ["ok", "error", "untested"] }, "error": {}, "updated_at": {} }
}
```

## 5. 行为
- **C.16-R1** 模型提供方是一种连接类型（`llm.<provider>`），原"模型提供方"设置合并进"连接"。
- **C.16-R2** 节点引用连接只存连接 id；连接改名不影响节点。删除连接时，引用它的节点显示"缺少连接"，校验报 V21。
- **C.16-R3** MCP 服务的环境变量、扩展包需要的密钥，都用 `${secret=[REDACTED_PASSWORD] 或"选择连接"引用，不允许直接写明文（保存时扫描，`S.03-R5`）。
- **C.16-R5** 模型连接测试时，为每个模型读取它支持的思考强度，存为 `models[].effort`（取值见 `U.09.06-R5`）；不支持调节的模型不写这个字段。
- **C.16-R4** 连接的"谁在用"由后端扫描所有图和包计算（`GET /connections/{id}/usages`）。
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
