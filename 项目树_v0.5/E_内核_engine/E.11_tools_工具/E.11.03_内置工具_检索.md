# E.11.03 内置工具：检索

| 项 | 内容 |
|---|---|
| 编号 | E.11.03 |
| 类型 | 实施 |
| 上级 | E.11 tools 工具 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引05 |
| 最后修改 | 2026-11-22 |

## 1. 职责
内置检索工具：本地文档检索 + 一个可配置的 Web 搜索适配，以及网页正文抓取 `fetch` 和工作区读取 `ws_read`。

## 2. 不做什么
- 不内置向量数据库（`P.02`）

## 3. 继承的上级约束
`S.04` §3、`S.07`、`P.09` Q5。

## 4. 接口
| 工具 ID | 风险 | 作用 |
|---|---|---|
| `builtin:search` | L0 | Web 搜索：适配 Tavily / Bing / SearXNG 三选一（设置里配置），统一返回 `[{title, url, snippet}]` |
| `builtin:doc_search` | L0 | 在用户授权的本地目录里做全文检索（BM25），返回文件路径和片段 |
| `builtin:fetch` | L0（白名单内）/ 审批（白名单外） | 抓取网页正文：`net/http` + readability；限 5MB；遵守 robots.txt |
| `builtin:ws_read` | L0 | 按引用读工作区原文（可指定 offset、limit、query）；**只能读本运行里出现过的引用**（`引06` §6） |

## 5. 行为
- 所有结果 `TaintsResult=true`，来源记 URL 或文件路径。
- 搜索适配器的密钥按密钥名取（`S.03`）。
- 出站地址检查按 `S.07`：白名单外转审批。

## 6. 不变量
- `ws_read` 读本运行以外的引用被拒绝

## 7. 错误处理
搜索服务未配置：工具注册但调用时返回 user_input"未配置搜索服务，请在设置里添加"。

## 8. 验收标准
1. 四个工具各自的正反例
2. ws_read 越权读取被拒
3. fetch 访问内网地址被拒（S.06 §2）

### 实施卡
- 要建 / 要改的文件：`engine/tools/builtin/search/*.go`、`engine/tools/builtin/docsearch/*.go`、`engine/tools/builtin/fetch/*.go`、`engine/tools/builtin/wsread/*.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E1103-T1 search 适配`
  - `E1103-T2 doc_search`
  - `E1103-T3 fetch 安全`
  - `E1103-T4 ws_read 越权`
- 允许使用的依赖：标准库、`readeck/go-readability`
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
