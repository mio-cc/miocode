# E.10.10 多密钥与故障转移

| 项 | 内容 |
|---|---|
| 编号 | E.10.10 |
| 类型 | 实施 |
| 上级 | E.10 llm 模型适配 |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引05；用户 2026-11-24（像 NewAPI 的渠道） |
| 最后修改 | 2026-11-26 |

## 1. 职责
提供方写了多个密钥时按轮询选密钥，被限流或鉴权失败的密钥冷却一段时间、换下一个；给出每类错误的冷却时长。

## 2. 不做什么
- 不发请求、不重试、不转移到备用提供方（`E.10.09` 用本叶子的 `KeyRing`）
- 不读配置：密钥名由 `Registry.Keys` 给（`E.10.01`）
- 冷却状态只在内存里，重启后清空

## 3. 继承的上级约束
`E.10-R4`（密钥只在发请求时取）、`P.09` K250、K268。

## 4. 接口
```go
// engine/llm/keys.go
type KeyRing struct{ /* 并发安全 */ }
func NewKeyRing() *KeyRing
// Pick 从 keys 里按轮询取下一个不在冷却中的密钥名；都在冷却时 ok 为 false，wait 是最早恢复的剩余时间。
func (k *KeyRing) Pick(provider string, keys []string, now time.Time) (key string, wait time.Duration, ok bool)
func (k *KeyRing) Cool(provider, key string, until time.Time)   // 已在冷却时取更晚的
func CoolFor(e *Error) time.Duration                             // 0：这类错误不换密钥
const CodeKeysCooling = "keys_cooling"
```

## 5. 行为
- 轮询：每个提供方一个游标，按 `keys` 的顺序从上次用过的下一个开始找，跳过冷却中的。`keys` 变了（配置热更新）照样按名字判断冷却。
- `CoolFor`：`rate_limited` → `RetryAfter`（没有时 60 秒）；`auth_denied` → 10 分钟；其他 → 0。
- 冷却到期自动恢复（按传入的 `now` 判断）。

## 6. 不变量
- `Pick` 不会返回冷却中的密钥

## 7. 错误处理
无（都在冷却由 `E.10.09` 转成 `rate_limited` / `CodeKeysCooling`）。

## 8. 验收标准
1. 轮询顺序
2. 冷却跳过与到期恢复
3. 冷却时长按错误分类

### 实施卡
- 要建 / 要改的文件：`engine/llm/keys.go`、`engine/llm/keys_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/blob/`、`engine/obs/`、`engine/llm/` 下其他已有文件
- 测试用例：
  - `E1010-T1 轮询`：a、b、c 依次轮到、再回到 a；两个提供方的游标互不影响
  - `E1010-T2 冷却`：b 冷却时轮到 a、c、a；都冷却时 ok 为 false、`wait` 是最早恢复的剩余时间；到期后恢复；`Cool` 取更晚的到期时间
  - `E1010-T3 冷却时长`：429 带 `RetryAfter` 5 秒 → 5 秒，不带 → 60 秒；`auth_denied` → 10 分钟；`transient` → 0
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - 换密钥、故障转移接进调用外层：`E1009-T6`（`E.10.09`）；`ClientWithKey`、`Fallbacks`：`E1001-T8`（`E.10.01`）
- 允许使用的依赖：标准库、`gen`
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 新建：多密钥轮询、优先级、故障转移是 M1 交付物（`P.07` M1），原来没有实施叶子；状态"已审" | `P.09` K268 |
| 2026-11-26 | 状态改为"冻结"：第 ⑤a 片（`m1-llm`） squash 合并进代码仓库 `main`，提交 `cbf6568cb2822f9e406be96e3de91d1a71251fa8`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合（`-race` 留给 Linux CI）；按 `G.08-R3` 由验证者合并 |
