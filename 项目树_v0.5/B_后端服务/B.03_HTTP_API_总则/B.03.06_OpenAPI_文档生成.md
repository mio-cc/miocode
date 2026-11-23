# B.03.06 OpenAPI 文档生成

| 项 | 内容 |
|---|---|
| 编号 | B.03.06 |
| 类型 | 规范 |
| 上级 | B.03 HTTP API 总则 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-22 |

## 1. 职责
从路由表和 schema 自动生成 OpenAPI 3.1 文档，供前端协议层核对、`anydoorctl` 和扩展作者参考。

## 2. 不做什么
- 不手写 OpenAPI 文件

## 3. 继承的上级约束
INV-17、`G.16`。

## 4. 接口
```go
// internal/api/routes.go：路由表是数据，路由注册和文档生成共用它
type Route struct {
    Method, Path string
    Summary      string                 // 中文一句话
    Request      string                 // schema 引用，如 "op.schema.json#/$defs/Batch"；无请求体为空
    Response     string                 // 2xx 响应的 schema 引用
    Errors       []gen.ApiErrorCode     // 可能返回的错误码
    UserOnly     bool                   // 只有用户能调用（B.03.05 第 5 步）
    Handler      http.HandlerFunc
}
var routes = []Route{ … }
```
- `go run ./tools/gen openapi` 生成 `internal/api/openapi.json`（提交进仓库）；`GET /api/v1/openapi.json` 返回它。

## 5. 行为
- schema 用 `$ref` 指向 `schema/*.schema.json`（OpenAPI 3.1 与 JSON Schema 2020-12 兼容）。
- 测试：每个路由的实际响应按声明的 Response schema 校验（在各 `B.04` 接口测试里统一做）。

## 6. 不变量
- 路由表里每个接口都出现在 OpenAPI 文档里
- 文档生成是确定的

## 7. 错误处理
无。

## 8. 验收标准
1. openapi.json 通过 OpenAPI 3.1 校验
2. `make gen` 后无差异
3. 每个路由的响应符合声明

### 实施卡
- 要建 / 要改的文件：`internal/api/routes.go`、`tools/gen/openapi/*.go`、`internal/api/openapi.json`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0306-T1 文档校验`
  - `B0306-T2 确定性`
  - `B0306-T3 响应符合声明`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
