# E.06.01 五档模型

| 项 | 内容 |
|---|---|
| 编号 | E.06.01 |
| 类型 | 实施 |
| 上级 | E.06 authz 授权 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 引07 |
| 最后修改 | 2026-11-22 |

## 1. 职责
把档位、授权书、挂载点解析成"某个主体在某个位置的有效授权"。

## 2. 不做什么
- 不做具体动作的判定（`E.06.02`）

## 3. 继承的上级约束
`C.09` §3、§6、`S.04`。

## 4. 接口
```go
type Effective struct {
    Mandate   *gen.Mandate   // nil 表示用默认
    Level     int
    Anchor    string         // 命中的挂载点
    Chain     []string       // 解释链："命中 谨慎协作 @ node:01J…"
}
type Resolver struct{ /* 挂载缓存 */ }
func (r *Resolver) Effective(p Principal, t Target) Effective
func Intersect(parent, req *gen.Mandate) *gen.Mandate   // 子编排者下放：档位取 min，各维度取交集，预算从父级划拨
```

## 5. 行为
- 挂载链：`node:<id>` → 各层容器节点（由内到外）→ `graph` → `session`；就近覆盖，同层按 priority（`C.09-R1`）。
- 授予对象匹配：`model:*`、`model:<模型引用>`、`tag:<标签>`（匹配 Actor.tags）、`external:*`。
- 过期：`expires.kind=run` 时比较当前运行 ID；`until` 比较时钟。
- 缓存键：`(actor.kind, tags, parent 链, target chain)`；授权书或挂载变化时按挂载点前缀失效。

## 6. 不变量
- 解析结果只对应一份授权书或默认值（就近覆盖）

## 7. 错误处理
无错误返回；找不到时返回默认（模型 1 档、外部 0 档）。

## 8. 验收标准
1. 节点级授权书覆盖图级
2. 过期授权书被跳过
3. 标签匹配
4. Intersect 不放大权限、预算取最小

### 实施卡
- 要建 / 要改的文件：`engine/authz/resolve.go`、`engine/authz/intersect.go`、`engine/authz/resolve_test.go`
- 不许碰的文件：`schema/`、`gen/`、其他包的实现文件（只能 import 它们的导出接口）
- 测试用例：
  - `E0601-T1 就近覆盖`
  - `E0601-T2 过期与撤销`
  - `E0601-T3 标签匹配`
  - `E0601-T4 Intersect（rapid：结果 ⊆ 父）`
- 允许使用的依赖：标准库 + `G.10` 已登记依赖
- 禁止事项：`G.02.05` 全部
- 完成标志：`G.14` 全部条件
