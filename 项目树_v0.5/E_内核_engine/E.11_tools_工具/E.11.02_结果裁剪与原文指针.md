# E.11.02 结果裁剪与原文指针

| 项 | 内容 |
|---|---|
| 编号 | E.11.02 |
| 类型 | 实施 |
| 上级 | E.11 tools 工具 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引06 |
| 最后修改 | 2026-11-22 |

## 1. 职责
把工具返回的大结果裁剪成摘要和相关片段放进上下文，原文存工作区并保留指针。

## 2. 不做什么
- 不决定上下文预算（`E.13.03`）

## 3. 继承的上级约束
`C.03.03` §5（`keep_pointer` kernel 锁）、`引05` §8.3。

## 4. 接口
```go
type TrimMode string // relevant | head | none
func Trim(raw RawResult, mode TrimMode, maxTokens int, query string, blobs blob.Store, cnt tokens.Counter) (Result, error)
```

## 5. 行为
- `relevant`（默认）：原文切块（约 500 token 一块），用任务的 `instruction + purpose`（或调用方给的 query）做 BM25 打分，取前若干块直到 `maxTokens`。
- `head`：取开头。
- `none`：不裁剪；但超过 8KB 仍转指针。
- 不论哪种模式，原文都写进工作区，`Result.Ref` 必有。

## 6. 不变量
- `Result.Ref` 永远非空

## 7. 错误处理
工作区写入失败：工具调用失败（transient），不返回没有原文的结果。

## 8. 验收标准
1. 10 万字网页裁剪到 2000 token 以内且保留引用
2. BM25 选出包含关键词的片段

### 实施卡
- 要建 / 要改的文件：`engine/tools/trim.go`、`engine/tools/bm25.go`、`engine/tools/trim_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1102-T1 裁剪长度`
  - `E1102-T2 相关性`
  - `E1102-T3 引用必有`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
