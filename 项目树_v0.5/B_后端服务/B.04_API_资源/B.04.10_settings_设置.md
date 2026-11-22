# B.04.10 settings 设置

| 项 | 内容 |
|---|---|
| 编号 | B.04.10 |
| 类型 | 实施 |
| 上级 | B.04 API 资源 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-23 |

## 1. 职责
读取和修改设置（除模型提供方、MCP 以外的设置项：默认模型、资源池、工具、外观、数据）。

## 2. 不做什么
- 不实现业务逻辑（调用内核或产品层）

## 3. 继承的上级约束
`B-R1`–`R4`、`B.03`、`B.04-R1`–`R4`。

## 4. 接口
| 方法 | 路径 | 说明 | 请求 → 响应 |
|---|---|---|---|
| GET | `/settings` | 全部设置（按 `G.11` 登记的配置项；不含密钥） | → `Settings` |
| PATCH | `/settings` | 修改部分项；返回哪些立即生效、哪些重启或下次运行生效 | `{path: value}` → `{settings, applied, restart_required, next_run}` |
| POST | `/settings/token/rotate` | 重新生成本机 token（旧 cookie 全部失效，`B.03.05`） | → `{url}` |
| GET | `/settings/data` | 数据目录、各部分占用空间 | → `DataUsage` |
| POST | `/settings/data/export` | 导出数据（`S.11-R4`） | `{include_blobs}` → 文件 |
| GET | `/settings/onboarding` · POST `/settings/onboarding/complete` | 首次引导的进度与完成（`B.06.04`） | → `{step, done}` |
| GET | `/settings/secrets` · POST `/settings/secrets/unlock` | 密钥库状态（系统密钥库 / 加密文件、是否已解锁）；用主密码解锁加密文件（`B.07.02`） | `{password}` → `{unlocked}` |
| POST | `/settings/data/purge` | 彻底删除所有数据（`S.11-R6`）：请求体必须含 `{"confirm": "删除"}`；完成后进程退出 | → 202 |

## 5. 行为
- 写配置文件 `harness.yaml` 时先写临时文件再原子改名；保留未知字段（`G.11-R5`）。
- `PATCH /settings` 的键是 `G.11` 登记的配置路径（`general.send_key` 等，完整清单见 `G.11` §3 与 `W.09.02` §5.2）；包的设置用 `packages.<包 id>.<key>`，按该包 `SettingDef` 校验；`onboarding.step` 也经这里更新（`B.06.04`）。锁定项（`security.taint_guard`、`server.local_only`）只读，PATCH 返回 400（`P.09` K142）。
- 仅用户。

## 6. 不变量
- 响应结构与 OpenAPI 声明一致

## 7. 错误处理
按 `B.03.03` 映射。

## 8. 验收标准
1. 每个接口一个成功用例、一个失败用例（`B.04-R3`）

### 实施卡
- 要建 / 要改的文件：`internal/api/settings.go`、`internal/api/settings_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0410-T1 读写与生效说明`
  - `B0410-T2 token 轮换`
  - `B0410-T3 导出无密钥`
  - `B0410-T4 purge 确认词`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §5 写明 PATCH 的键（配置路径、包的设置、`onboarding.step`、锁定项） | 第 9 棒写 `W.09.02`；`P.09` K142 |
