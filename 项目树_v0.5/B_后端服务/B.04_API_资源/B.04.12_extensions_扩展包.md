# B.04.12 extensions 扩展包

| 项 | 内容 |
|---|---|
| 编号 | B.04.12 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-23 |

## 1. 职责
安装、确认启用、停用、卸载扩展包。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/extensions` | 已安装的扩展包：版本、签名状态、权限、启用状态 | → `Extension[]` |
| POST | `/extensions/install` | 上传 zip（≤ 50MB）：解包到待确认目录、校验，返回权限清单 | → 201 `{name, version, sign_state, perms, status: pending_confirm}` |
| POST | `/extensions/{name}/confirm` | 用户确认权限后启用（`S.08-R2`）：注册节点、工具，出站主机加入白名单 | → `Extension` |
| POST | `/extensions/{name}/disable` · `/enable` | 停用、启用 | → `Extension` |
| DELETE | `/extensions/{name}` | 卸载（被图使用时 409 列出受影响的图） | → 204 |
| GET | `/packages?kind=core\|mcp\|ext\|skill` | 全部包（`C.15`）：核心包、MCP 服务、扩展包、技能 | → `Package[]` |
| GET | `/packages/{id}` | 包详情：带来的内容（`contributes`）；技能包另带 `skill_md`（≤ 64KB）；MCP 包带 `mcp {state, last_error, new_tools}`（`P.09` K150） | → `PackageDetail` |
| POST | `/packages/{id}/enable` · `/disable` | 启用、停用（核心包不能停用：400 `bad_request`） | → `{package, registry_hash}` |

## 5. 行为
- 升级（同名新版本）：权限变多时重新确认（`S.08-R4`）；响应带 `perms_added`（新增的权限）。
- 技能：zip 根目录有 `SKILL.md` 且没有扩展包清单时，安装为 `kind=skill` 的包（`skill:<名>`），同样先待确认再启用（`U.21` §1"导入技能"，`P.09` K150）。
- `DELETE /extensions/{name}` 被图使用时 409 列出受影响的图；带 `?force=1` 时照常卸载（图里的节点显示"缺少"，`C.15-R3`）。
- 安装、启用、卸载都写审计。
- 仅用户。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/extensions.go`、`internal/api/extensions_test.go`、`internal/api/packages.go`、`internal/api/packages_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0412-T1 安装确认流程`
  - `B0412-T2 校验失败 422`
  - `B0412-T3 权限变多重新确认`
  - `B0412-T4 卸载被引用 409`
  - `B0412-T5 包`：`?kind=` 过滤正确；技能包详情带 `skill_md`；启停响应带新的 `registry_hash`，之后 `GET /nodedefs` 反映变化；停用核心包 → 400
  - `B0412-T6 旧路径别名`：`/extensions/{name}/enable` 与 `/packages/ext:{name}/enable` 结果相同（`C.15`：旧路径保留一个版本）
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §5 补 `perms_added`、技能 zip 安装、`?force=1` 卸载 | 第 9 棒写 `W.09.04`；`P.09` K150 |
| 2026-11-23 | §4 补 `/packages` 接口及实施卡（`C.15` 已定义、前端在用，但本文没有登记） | W 全枝复查；`P.09` K178 |
