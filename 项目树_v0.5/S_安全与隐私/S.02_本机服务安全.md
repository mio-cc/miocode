# S.02 本机服务安全

| 项 | 内容 |
|---|---|
| 编号 | S.02 |
| 类型 | 规范 |
| 上级 | S 安全与隐私 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 规则
| 编号 | 规则 |
|---|---|
| S.02-R1 | 只监听 `127.0.0.1`（IPv6 环境同时监听 `::1`），不监听 `0.0.0.0`（INV-21）。配置里没有改监听地址的选项 |
| S.02-R2 | 首次启动生成 32 字节随机 token，写进 `<DataDir>/token`（文件权限仅当前用户可读）；每次启动不变，用户可以在设置里"重新生成" |
| S.02-R3 | 浏览器第一次打开 `http://127.0.0.1:<端口>/?t=<token>`，服务端校验后设置 HttpOnly、`SameSite=Strict`、`Path=/` 的会话 cookie，并 302 跳转去掉 URL 里的 token |
| S.02-R4 | 每个 `/api/` 请求都必须带有效 cookie（或 `Authorization: Bearer <token>`，给 `harnessctl` 用）；否则 401 |
| S.02-R5 | **Host 校验**：请求头 `Host` 必须是 `127.0.0.1:<端口>`、`localhost:<端口>` 或 `[::1]:<端口>`；否则 403。防止 DNS 重绑定 |
| S.02-R6 | **Origin 校验**：所有非 GET 请求和所有 SSE 请求，`Origin` 必须是上述三个地址之一；`Origin` 缺失时只允许来自 `harnessctl`（Bearer token）的请求；否则 403 `origin_rejected` |
| S.02-R7 | 不设置任何 CORS 允许头（`Access-Control-Allow-Origin`）；不支持跨域 |
| S.02-R8 | 安全响应头：`Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'`；`X-Content-Type-Options: nosniff`；`Referrer-Policy: no-referrer`；`Cross-Origin-Opener-Policy: same-origin` |
| S.02-R9 | 开发模式（`--dev`）CSP 放宽到允许 Vite 的热更新连接（`ws://127.0.0.1:5173`），其余规则不变；`--dev` 时启动日志醒目提示"开发模式，不要用于日常使用" |
| S.02-R10 | 单实例：同一个 DataDir 只能运行一个 `harnessd`（文件锁）；第二次启动时直接打开浏览器到已运行的实例并退出 |
| S.02-R11 | `/metrics` 同样需要鉴权 |

## 2. 验收标准（`S.13` 用例）
1. 从 `http://evil.example` 的页面用 fetch 访问本机接口：被 Origin 校验拒绝。
2. 把 `evil.example` 解析到 127.0.0.1 后访问：被 Host 校验拒绝。
3. 不带 cookie 访问 `/api/v1/graphs`：401。
4. 从局域网另一台机器访问端口：连接被拒绝。
