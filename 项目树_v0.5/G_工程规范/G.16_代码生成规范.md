# G.16 代码生成规范

| 项 | 内容 |
|---|---|
| 编号 | G.16 |
| 类型 | 规范 |
| 上级 | G 工程规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§4 |
| 最后修改 | 2026-11-22 |

## 1. 目的
规定哪些文件是生成出来的、怎么重新生成、为什么不能手改。

## 2. 生成物清单
| 生成物 | 来源 | 生成命令 | 是否提交 |
|---|---|---|---|
| `gen/*.go` | `schema/*.schema.json`、`schema/builtin/*.yaml` | `go run ./tools/gen` | 是 |
| `web/src/lib/protocol/generated/*.ts` | 同上 | 同上 | 是 |
| `web/src/styles/tokens.css` | 设计令牌源 `design/tokens.css`（由设计规范 v0.3 的 `tokens.css` 迁入） | `go run ./tools/gen tokens` | 是 |
| `web/public/fonts/*` | `design/fonts/` 原始字体 | `go run ./tools/gen fonts`（子集化） | 是 |
| `engine/store/sqlite/queries.go` | `engine/store/sqlite/queries.sql` | `sqlc generate` | 是 |
| `web/dist/` | 前端源码 | `pnpm -C web build` | **否** |

## 3. 规则
- **G.16-R1** 生成物禁止手改（`G.02.05-R1`）；文件头必须带生成标记（`G.04.03`）。
- **G.16-R2** 生成必须确定：同样的输入两次生成结果逐字节相同（排序、不写时间戳、不写绝对路径）。
- **G.16-R3** 改了来源就必须在同一个提交里重新生成；CI 用 `make gen && git diff --exit-code` 检查。
- **G.16-R4** 生成结果不满意时，改来源或改生成工具，不改结果。
- **G.16-R5** 生成工具本身（`tools/gen`）的改动要附测试：用一组固定的 schema 生成，和黄金文件比较。

## 4. 为什么不能手改
手改的内容在下一次生成时会被覆盖；而且手改会让 Go 和 TS 两边的类型不再一致，这正是契约层要防止的问题（INV-17）。
