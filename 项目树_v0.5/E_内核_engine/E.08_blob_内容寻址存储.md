# E.08 blob 内容寻址存储

| 项 | 内容 |
|---|---|
| 编号 | E.08 |
| 类型 | 实施 |
| 上级 | E 内核 engine/ |
| 下级 | 无 |
| 状态 | 冻结 |
| 素材 | 引04 |
| 最后修改 | 2026-11-26 |

## 1. 职责
内容寻址存储：大文本、模型请求与响应、工具结果、上下文包、检查点状态、上传文件，都按 sha256 存一份，用 `ws://sha256:<hex>` 引用。

## 2. 不做什么
- 不决定什么时候转成引用（调用方按 8KB 阈值，`C.06.01-R4`）
- 不做访问控制以外的业务判断

## 3. 继承的上级约束
`C.01-R13`（引用格式）、`S.11`、`G.03-R2`（只依赖标准库）。

## 4. 接口
```go
// engine/blob/blob.go
type Ref string                                       // "ws://sha256:<64 位小写十六进制>"
func ParseRef(s string) (Ref, error)                  // 格式不对：ErrBadRef
func (r Ref) Hash() string
type Meta struct { Size int64; MediaType string }
type Reader interface {                               // 给执行器的只读视图
    Get(ctx context.Context, ref Ref) (io.ReadCloser, Meta, error)
    Stat(ctx context.Context, ref Ref) (Meta, error)
}
type Store interface {
    Reader
    Put(ctx context.Context, r io.Reader, mediaType string) (Ref, error)
}
var ErrNotFound, ErrBadRef, ErrCorrupt = errors.New(…), errors.New(…), errors.New(…)

// engine/blob/fsblob/fsblob.go
func New(dir string) (blob.Store, error)              // dir 是 <DataDir>/blobs；不存在就建
```

## 5. 行为
- 路径：`<dir>/<前 2 位>/<3–4 位>/<hash>`，媒体类型和大小写在旁边的 `<hash>.meta.json`。
- 写入：在 `<dir>/.tmp/` 边写临时文件边算 sha256 → 关闭 → 内容已存在时删掉临时文件（去重）；不存在时先写 `.meta.json`（同样先写临时文件再改名），再把内容文件改名到目标位置。改名失败（另一个写入者先到了）且目标已存在时按去重处理。
- `New` 时清掉 `.tmp/` 里留下的临时文件（上次中途崩溃留下的）。
- 读取：边读边算 sha256，读到结尾时和引用里的不一致 → 这次 `Read` 返回 `ErrCorrupt`（记日志由调用方做）。
- 引用计数和过期清理（GC）以后在数据维护（`B.09`）做；运行内读取限制（`ws_read`）在 `RunCtx.Blobs()` 的包装里做（`P.09` K265）。

## 6. 不变量
- 同一内容只存一份
- 读出内容的 sha256 等于引用里的哈希

## 7. 错误处理
哈希不匹配：`ErrCorrupt`；引用格式错误：`ErrBadRef`；没有这个内容：`ErrNotFound`。

## 8. 验收标准
1. 写入随机内容后逐个读回校验（平时 1000 个，`ANYDOOR_PERF=1` 时 1 万个）
2. 重复写入不产生新文件
3. 写入中途出错不留下半个文件
4. 内容被改过时读出报错

### 实施卡
- 要建 / 要改的文件：`engine/blob/blob.go`、`engine/blob/fsblob/fsblob.go`、`engine/blob/fsblob/fsblob_test.go`
- 不许碰的文件：`schema/`、`gen/`、`internal/`、`cmd/`、`web/`、`engine/graph/`、`engine/schema/`、`engine/store/`、`engine/op/`、`engine/authz/`、`engine/llm/`
- 测试用例：
  - `E08-T1 往返校验`：随机内容写入后读回相同，`Stat` 的大小和媒体类型对；`ParseRef` 正反例
  - `E08-T2 去重`：同样内容写两次引用相同、只有一个内容文件
  - `E08-T4 原子写`：读到一半出错的 `io.Reader` 写入失败，不留下内容文件和 `.meta.json`；`New` 清掉 `.tmp/` 里的旧文件
  - `E08-T5 损坏`：改掉内容文件的一个字节，读出时 `ErrCorrupt`；读不存在的引用 `ErrNotFound`
- 在其他叶子跑的测试用例（不算本叶子的完成条件）：
  - `E08-T3 GC`：引用计数和过期清理，在 `B.09` 跑
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部
- 完成标志：`relay check` ①–⑥ 通过；所在片整片验证通过（`G.02.06-R23`）

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-26 | 第 ④ 片（`m1-base`）开工前复查：只做写入、读取、校验和去重，引用计数和 GC 推到 `B.09`（用户决定）；媒体类型写在旁边的 `.meta.json`；加 `E08-T5`；实施卡按 `G.02.06-R24` 重写；状态改为"已审" | `P.09` K265 |
| 2026-11-26 | 状态改为"冻结"：第 ④ 片（`m1-base`） squash 合并进代码仓库 `main`，提交 `b666abb35c90221e3389d7bfb487413c401bf8bb`（`G.02.06-R21`） | `relay slice` 通过；评审 15 条全部符合（`-race` 留给 Linux CI）；按 `G.08-R3` 由验证者合并 |
