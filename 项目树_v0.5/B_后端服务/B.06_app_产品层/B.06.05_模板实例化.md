# B.06.05 模板实例化

| 项 | 内容 |
|---|---|
| 编号 | B.06.05 |
| 类型 | 实施 |
| 上级 | B.06 app 产品层 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 新 |
| 最后修改 | 2026-11-23 |

## 1. 职责
把模板实例化成一张新图：替换占位 ID、填入用户回答、检查依赖、挂到会话。

## 2. 不做什么
- 不定义模板格式（`C.13.04`）

## 3. 继承的上级约束
`C.13.04-R1`–`R4`。

## 4. 接口
```go
func (a *App) Instantiate(ctx context.Context, name string, inputs map[string]json.RawMessage, sessionID string, by gen.Actor) (graphID string, err error)
```

## 5. 行为
1. 读取模板清单和 `graph.json`；检查 `requires`（扩展包、子图库、模型能力），缺失 → `ErrMissingDeps{list}`（422）。
2. 生成 ID 映射：所有占位 ULID → 新 ULID；整份文档按映射替换（节点、连线、便签、子图、`mandates` 挂载的节点引用）。
3. 按 `inputs` 写参数或根图入口值；类型不符 → 400。
4. 创建图（`meta.template = 名@版本`）：作为一条 `import_apply` 复合 Op 提交，actor 为调用者（用户，或对话 Agent 的模型实例——此时按 `op.add_node` 授权）。
5. 有 `sessionID`：`AttachGraph(makeActive=true)`；会话标题仍是缺省的"新会话"时改为模板标题（`U.09.04-R9`）。

## 6. 不变量
- 实例化两次得到 ID 完全不同、结构完全相同的图（`C1304-T2`）

## 7. 错误处理
缺依赖、输入不合法：不创建任何东西。

## 8. 验收标准
1. 四个内置模板都能实例化
2. 映射覆盖所有引用位置
3. 对话 Agent 实例化时按授权判定

### 实施卡
- 要建 / 要改的文件：`internal/app/template/*.go`、`internal/app/template/template_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `B0605-T1 内置模板`
  - `B0605-T2 ID 映射`
  - `B0605-T3 授权`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §5 第 5 步补自动改名 | 第 9 棒写 `W.09.01`；`U.09.04-R9` |
