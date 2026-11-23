# B.07.01 本地鉴权

| 项 | 内容 |
|---|---|
| 编号 | B.07.01 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引15 |
| 最后修改 | 2026-11-22 |

## 1. 职责
生成和保存本机 token，管理会话 cookie。

## 2. 不做什么
- 不做 HTTP 层的校验（`B.03.05`）

## 3. 继承的上级约束
`S.02-R2`、`R3`、`B.07-R1`。

## 4. 接口
```go
type Auth interface {
    Token() string                                        // 启动时从 <DataDir>/token 读取，不存在则生成
    Rotate(ctx context.Context) (string, error)           // 生成新 token，清空所有会话 cookie
    VerifyToken(t string) bool                            // 常量时间比较
    NewSession(remember bool) (cookie string, err error)
    VerifySession(cookie string) bool
}
```

## 5. 行为
- token：32 字节 `crypto/rand`，base64url；文件权限仅当前用户（Unix 0600；Windows 数据目录位于用户配置目录下，默认只有当前用户能访问，另外通过 ACL 去掉继承权限）。
- 会话 cookie：32 字节随机值，服务端只保存其 sha256（`hx_settings` 下 `auth.sessions`，带过期时间）；"保持登录"30 天，否则浏览器关闭即失效。
- `anydoorctl` 读取 token 文件，以 Bearer 方式访问（`B.08`）。

## 6. 不变量
- token 和 cookie 原值不写进日志

## 7. 错误处理
token 文件不可读：启动失败，提示检查数据目录权限。

## 8. 验收标准
1. 首次生成、再次启动读取相同 token
2. 轮换后旧 cookie 失效
3. 常量时间比较

### 实施卡
- 要建 / 要改的文件：`internal/platform/auth/*.go`、`internal/platform/auth/auth_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0701-T1 生成与读取`
  - `B0701-T2 轮换`
  - `B0701-T3 文件权限`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
