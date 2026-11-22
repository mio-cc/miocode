# B.03.02 请求响应格式与分页

| 项 | 内容 |
|---|---|
| 编号 | B.03.02 |
| 类型 | 规范 |
| 上级 | B.03 HTTP API 总则 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引09 |
| 最后修改 | 2026-11-22 |

## 1. 职责
规定请求和响应的格式、分页、时间与 ID、大小限制。

## 2. 不做什么
- 不定义具体字段（来自生成的类型）

## 3. 继承的上级约束
`C.01` §3、`G.04.04`、`B-R4`。

## 4. 接口
| 项 | 规则 |
|---|---|
| 内容类型 | `application/json; charset=utf-8`；导入导出另外说明 |
| 字段 | snake_case；时间 RFC 3339 UTC 毫秒；ID 为 ULID |
| 空值 | 可选字段没有值时省略，不写 `null`（`exactOptionalPropertyTypes` 对齐） |
| 单个资源 | 直接返回对象，不包一层 `data` |
| 列表 | `{items: [...], next_cursor: "..."}`；没有下一页时省略 `next_cursor` |
| 分页参数 | `?limit=50&cursor=<不透明字符串>`；limit 默认 50，最大 200 |
| 过滤 | 查询参数 snake_case；多个值用逗号 |
| 图版本 | 写图接口必须带 `base_version`；响应头 `X-Graph-Version` 返回最新版本 |
| 请求体大小 | 默认 1MB；`/graphs/import`、`/extensions/install` 50MB；超出 413 `too_large` |

## 5. 行为
- 游标：base64url 编码的 `{排序键, ID}`，服务端解析；客户端不解析不构造。
- 解析请求体：未知字段 → 400（防止拼错字段名被静默忽略）；开放对象（params、meta、ui）除外（`C.01-R19`）。
- 所有请求体先按对应 schema 校验（`santhosh-tekuri/jsonschema`），再进处理函数。

## 6. 不变量
- 同一个查询分页遍历完，结果不重复、不遗漏（插入并发时以游标稳定为准）

## 7. 错误处理
解析失败、schema 不通过：400 `bad_request`，`details.errors[{path, message}]`。

## 8. 验收标准
1. 未知字段被拒
2. 分页遍历 1000 条不重不漏
3. 超大请求体 413

### 实施卡
- 要建 / 要改的文件：`internal/api/codec.go`、`internal/api/page.go`、`internal/api/codec_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0302-T1 未知字段`
  - `B0302-T2 分页`
  - `B0302-T3 大小限制`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
