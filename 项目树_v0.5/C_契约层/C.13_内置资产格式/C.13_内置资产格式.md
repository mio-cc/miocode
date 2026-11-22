# C.13 内置资产格式

| 项 | 内容 |
|---|---|
| 编号 | C.13 |
| 类型 | 实施 |
| 上级 | C 契约层 |
| 下级 | C.13.01 配方 recipe、C.13.02 角色卡 rolecard、C.13.03 类型声明 types、C.13.04 模板包 |
| 状态 | 草稿 |
| 素材 | 引02 |
| 最后修改 | 2026-11-22 |

## 1. 这一组管什么
随产品发布、也可以由扩展包提供的数据文件格式：配方、角色卡、类型声明、模板包。

## 2. 共同约束
- **C.13-R1** 这些文件在仓库和扩展包里都用 YAML 编写，加载时转成 JSON 再按对应 schema 校验。YAML 报错要能指到行号（`goccy/go-yaml`）。
- **C.13-R2** 每个资产用 `名称@版本` 引用；名称在同一类资产里唯一。内置资产放在 `schema/builtin/{recipes,rolecards,types}/` 和 `templates/`。
- **C.13-R3** 扩展包可以新增资产，不能覆盖内置资产（同名时拒绝安装）。

## 3. 下级清单
| 编号 | 名称 | schema |
|---|---|---|
| C.13.01 | 配方 recipe | `recipe.schema.json` |
| C.13.02 | 角色卡 rolecard | `rolecard.schema.json` |
| C.13.03 | 类型声明 types | `typedef.schema.json` |
| C.13.04 | 模板包 | `template.schema.json` |
