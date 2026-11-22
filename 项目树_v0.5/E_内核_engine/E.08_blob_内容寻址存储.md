# E.08 blob 内容寻址存储

| 项 | 内容 |
|---|---|
| 编号 | E.08 |
| 类型 | 实施 |
| 上级 | E 内核 engine/ |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引04 |
| 最后修改 | 2026-11-22 |

## 1. 职责
内容寻址存储：大文本、模型请求与响应、工具结果、上下文包、检查点状态、上传文件，都按 sha256 存一份，用 `ws://sha256:<hex>` 引用。

## 2. 不做什么
- 不决定什么时候转成引用（调用方按 8KB 阈值，`C.06.01-R4`）
- 不做访问控制以外的业务判断

## 3. 继承的上级约束
`C.01-R13`（引用格式）、`S.11`、`G.03-R2`（只依赖标准库）。

## 4. 接口
```go
type Store interface {
    Put(ctx context.Context, r io.Reader, mediaType string) (Ref, error)
    Get(ctx context.Context, ref Ref) (io.ReadCloser, Meta, error)
    Stat(ctx context.Context, ref Ref) (Meta, error)
    Incr(ctx context.Context, ref Ref, delta int) error
    GC(ctx context.Context, olderThan time.Duration) (removed int, err error)
}
type Reader interface { Get(…); Stat(…) }            // 给执行器的只读视图
type Ref string                                       // "ws://sha256:<64 hex>"
func ParseRef(s string) (Ref, error)
func New(dir string, meta MetaRepo) Store             // fsblob 实现
```

## 5. 行为
- 路径：`<DataDir>/blobs/ab/cd/<hash>`（前两级分桶）。
- 写入：边写临时文件边算 sha256 → `rename` 到目标位置（原子）→ upsert 元数据；内容已存在时只更新 `last_access`。
- 引用计数：图版本、运行快照、检查点、事件里的引用写入时 `Incr`，删除对应记录时 `Decr`。
- GC：引用计数为 0 且超过保留期（默认 30 天，`P.09` Q8）的删除；每天一次，分批（`B.09`）。
- 运行内读取限制（`ws_read`，`E.11.01`）：执行器只能读本运行里出现过的引用——检查由 `RunCtx.Blobs()` 的包装做，不在这里。

## 6. 不变量
- 同一内容只存一份
- 读出内容的 sha256 等于引用里的哈希（读取时校验）

## 7. 错误处理
哈希不匹配：返回 `ErrCorrupt` 并记 error；引用格式错误：`ErrBadRef`。

## 8. 验收标准
1. 写入 1 万个随机内容后逐个读回校验
2. 重复写入不产生新文件
3. GC 只删除计数为 0 且过期的
4. 写入中途崩溃不留下半个文件

### 实施卡
- 要建 / 要改的文件：`engine/blob/blob.go`、`engine/blob/fsblob/*.go`、`engine/blob/blob_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E08-T1 往返校验`
  - `E08-T2 去重`
  - `E08-T3 GC`
  - `E08-T4 原子写`
- 允许使用的依赖：标准库
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
