# G.16 代码生成规范

| 项 | 内容 |
|---|---|
| 编号 | G.16 |
| 类型 | 规范 |
| 上级 | G 工程规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引01§4 |
| 最后修改 | 2026-11-23 |

## 1. 目的
规定哪些文件是生成出来的、怎么重新生成、为什么不能手改。

## 2. 生成物清单
| 生成物 | 来源 | 生成命令 | 是否提交 |
|---|---|---|---|
| `gen/*.go` | `schema/*.schema.json`、`schema/builtin/*.yaml` | `go run ./tools/gen` | 是 |
| `web/src/lib/protocol/generated/*.ts` | 同上 | 同上 | 是 |
| `web/src/styles/tokens.css` | 设计令牌源 `design/tokens.css`（由设计规范 v0.3 的 `tokens.css` 迁入） | `go run ./tools/gen tokens` | 是 |
| `web/src/styles/themes.css`、`web/src/styles/themes.ts` | `design/themes/*.css`（`U.03.05` §4） | `go run ./tools/gen tokens` | 是 |
| `web/src/lib/protocol/generated/wire.ts`（前端字段映射表，`C.14-R8`） | `schema/*.schema.json` | `go run ./tools/gen` | 是 |
| `web/src/lib/protocol/generated/tables.ts` 里的快捷键表 | `schema/builtin/shortcuts.yaml`（格式见 `W.02.04`） | `go run ./tools/gen` | 是 |
| `generated/tables.ts` 的 `AUTHZ_MATRIX`（档位 × 动作默认判定表，设置 › 授权与安全显示用；后端判定读同一份，`C.09` §7） | `schema/builtin/authz_matrix.yaml` | `go run ./tools/gen` | 是 |
| `gen/tables.go` 的 `Layout`、`generated/tables.ts` 的 `LAYOUT`（布局常数，`U.05-R3`） | `schema/builtin/layout.yaml`（格式见 `W.06.10` §5.1）；`go run ./tools/gen tokens` 同时检查 `design/tokens.css` 的 `--hx-node-*`、`--hx-grid`、`--hx-port` 与它相等 | `go run ./tools/gen` | 是 |
| `web/src/styles/icons.ts`（图标表 `ICONS`、`IconName`，`U.08-R2`） | `design/icons/*.svg`、`design/icons/node/*.svg`（文件名用 `schema/builtin/aliases.yaml` 的英文别名，生成时换回 `U.08` 表里的名字）；检查 `U.08-R1`、`R4`，不通过则生成失败 | `go run ./tools/gen icons` | 是 |
| `web/src/lib/i18n/generated/messages.ts`（`ERRORS`：错误码 → 文案；`ASSIGN`：兼容规则号 → 提示，`W.10` §4.5） | `schema/builtin/messages/errors.zh.yaml`、`assign.zh.yaml`；检查每个 `C.11` 错误码都有文案、`assign.zh.yaml` 恰好覆盖 C1、C2、C4、C6、C8、C10 | `go run ./tools/gen` | 是 |
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

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | 生成物清单补上主题文件和快捷键表 | `P.09` K69 | |
| 2026-11-23 | 生成物清单补 `generated/wire.ts` | `P.09` K84 |
| 2026-11-23 | 生成物清单补布局常数（`layout.yaml` → `Layout` / `LAYOUT`）及令牌一致性检查 | `P.09` K102（第 7 棒） |
| 2026-11-23 | 生成物清单补图标表 `web/src/styles/icons.ts` | 第 9 棒写 `W.08`；`P.09` K122 |
| 2026-11-23 | 生成物清单补 `AUTHZ_MATRIX` | 第 9 棒写 `W.09.02`；`P.09` K153 |
| 2026-11-23 | 生成物清单补前端文案生成物 `web/src/lib/i18n/generated/messages.ts` | 第 10 棒写 `W.10`；`P.09` K158 |
