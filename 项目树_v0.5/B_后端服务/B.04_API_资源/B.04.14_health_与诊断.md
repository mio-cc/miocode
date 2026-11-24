# B.04.14 health 与诊断

| 项 | 内容 |
|---|---|
| 编号 | B.04.14 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 新 |
| 最后修改 | 2026-11-24 |

## 1. 职责
健康检查和关闭服务（M0）。诊断信息、OpenAPI 文档、指标、诊断包等依赖的部分有了以后再加（§4 第二张表，`P.09` K242）。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）
- 不实现关闭流程本身：只调用 `Deps.Shutdown`，关闭顺序归 `B.02`（`B.01` §4）

## 3. 继承的上级约束
`B-R3`、`S.02`、`G.12`、`B.03.05`（服务器骨架、鉴权、`IsUser`）。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/api/v1/health` | **不需要鉴权**，只返回 `{ok: true, version}`（不含任何其他信息），供单实例检测（`lock.Probe`）和安装程序使用 | → 200 `{ok, version}` |
| POST | `/api/v1/admin/shutdown` | 优雅关闭；只有用户或 anydoorctl（`IsUser`） | → 202 `{ok: true}` |

以后再加（不在本叶子，`P.09` K242）：
| 方法 | 路径 | 归谁、什么时候 |
|---|---|---|
| GET | `/api/v1/diagnostics` | 要注册表哈希、扩展包、MCP 状态，M1 起有内核后，`B.04` 复查时补进本文 |
| GET | `/api/v1/openapi.json` | `B.03.06` |
| GET | `/metrics` | `E.09` / `obs`（需要鉴权，`S.02-R11`） |
| POST | `/api/v1/admin/diagnostics-bundle` | `O.08`（最近日志已脱敏、诊断 JSON、不含密钥的配置） |

## 5. 行为
- health 是唯一不鉴权的接口，返回内容固定，不能扩展（`B-R3`）。它仍经过 `B.03.05` 的 Host 校验和安全响应头。`version` 取 `Deps.Version`。
- shutdown：`IsUser` 为 true 时先写出 202 响应再调用 `Deps.Shutdown`（同一个 `Server` 上只调用一次，重复请求也返回 202）；其他调用方 403 `forbidden`；没有凭证 401。
- 两个路由注册在 `internal/api/routes.go`；处理函数写在 `health.go`、`admin.go`。

## 6. 不变量
- health 的响应体只有 `ok`、`version` 两个字段

## 7. 错误处理
按 `B.03.03` 映射（`B.03.05` 的 `writeError`）。本叶子给 `writeError` 加 `forbidden` 403 这一行。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/health.go`、`internal/api/admin.go`、`internal/api/routes.go`、`internal/api/errors.go`、`internal/api/health_test.go`
- 不许碰的文件：`schema/`、`gen/`、`engine/`、`internal/platform/`、`cmd/`
- 测试用例：
  - `B0414-T1 health 不泄露信息`：不带凭证 `GET /api/v1/health` → 200，响应体解析后恰好是 `{"ok":true,"version":<Deps.Version>}`；带 cookie 时字节相同；`Host` 不对 → 403；`POST` → 405
  - `B0414-T3 shutdown`：cookie 用户、Bearer 各一次 → 202，`Deps.Shutdown` 一共只被调用一次；不带凭证 → 401；`GET` → 405；`Origin` 是别的网站 → 403 且没有调用 `Shutdown`
- `B0414-T2 诊断包无密钥` 随诊断包推迟到 `O.08`（`P.09` K242），本叶子不写。
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-24 | 第 ⑧a 片（`m0-server`）开工前复查：M0 只做 health 和 shutdown，diagnostics、openapi、metrics、诊断包推迟；`B0414-T2` 随诊断包推迟；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K241、K242 |
| 2026-11-24 | 状态改为"冻结"：第 ⑧a 片（`m0-server`）squash 合并进代码仓库 `main`，提交 `8d3377c982ba5e870246e8213bb36bea20b11399`（`G.02.06-R21`） | `relay slice` 通过；评审 10 条（第 4、9 行已修正，第 2、7、10 行按 `P.09` K245 处理），全部已复核；按 `G.08-R3` 由验证者合并 |
