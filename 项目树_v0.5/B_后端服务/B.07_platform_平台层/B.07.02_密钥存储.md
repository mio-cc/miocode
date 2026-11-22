# B.07.02 密钥存储

| 项 | 内容 |
|---|---|
| 编号 | B.07.02 |
| 类型 | 实施 |
| 上级 | B.07 platform 平台层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§5 |
| 最后修改 | 2026-11-22 |

## 1. 职责
密钥存储：优先使用系统密钥库；不可用时使用主密码加密的本地文件。实现 `engine.SecretResolver`。

## 2. 不做什么
- 不在任何地方缓存密钥明文（只在调用 `Resolve` 时读取，`S.03-R3`）

## 3. 继承的上级约束
`S.03`、INV-22、`P.09` K26。

## 4. 接口
```go
type Secrets interface {
    engine.SecretResolver                                   // Resolve(ctx, name)
    Put(ctx context.Context, name, value string) error
    Delete(ctx context.Context, name string) error
    List(ctx context.Context) ([]SecretInfo, error)         // 名称、末 4 位、更新时间
    Backend() string                                        // keyring | file
    Locked() bool                                           // file 后端未解锁
    Unlock(ctx context.Context, password string) error
}
```

## 5. 行为
- **系统密钥库**（`zalando/go-keyring`）：服务名 `Harness`，账户名 = 密钥名。Windows 凭据管理器、macOS 钥匙串、Linux Secret Service。
- 启动时探测：写入并读回一个测试条目；失败（例如无桌面会话的 Linux）→ 切换到文件后端。
- **加密文件** `<DataDir>/secrets.enc`：主密码 → Argon2id（m=64MB, t=3, p=1）派生 32 字节密钥 → XChaCha20-Poly1305 加密整个 JSON；每次写入使用新的随机 nonce；先写临时文件再原子改名。
- 文件后端每次启动需要解锁：前端出现解锁提示（`POST /settings/secrets/unlock`）；未解锁时 `Resolve` 返回 `ErrLocked`，模型调用失败为 `provider_unavailable`"密钥库已锁定，请先解锁"。
- 主密码在首次引导或设置里设置；忘记主密码只能删除 `secrets.enc` 重新填写密钥。
- 开发模式：`HARNESS_DEV_SECRET_<名>` 优先（`S.03-R8`）。

## 6. 不变量
- 密钥明文只存在于系统密钥库或加密文件里
- `List` 不返回密钥值

## 7. 错误处理
解锁失败（密码错）：返回错误，连续 5 次失败后等待 30 秒（防暴力尝试）。

## 8. 验收标准
1. 系统密钥库读写删
2. 探测失败切换到文件后端
3. 加密文件往返、密码错误
4. 运行完整模板后在数据目录里找不到密钥原文（`S.03` §2-1）

### 实施卡
- 要建 / 要改的文件：`internal/platform/secret/*.go`、`internal/platform/secret/secret_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0702-T1 keyring`
  - `B0702-T2 回退`
  - `B0702-T3 加密文件`
  - `B0702-T4 暴力尝试限制`
  - `B0702-T5 无明文残留`
- 允许使用的依赖：`zalando/go-keyring`、`golang.org/x/crypto`（argon2、chacha20poly1305）
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
