# 画布旗舰 demo · 源码说明

`../画布_旗舰demo.html` 是拼出来的产物，不要直接改它。要改就改这里的源文件，再重新拼装。

## 拼装

```bash
python build.py        # 依次拼接 00_head → tokens.css → CSS → 10_body → JS → 99_tail
```

- `tokens.css` 不在 src/ 里，拼装时直接读取上一级的 `../tokens.css`。令牌改了以后重新拼装，就会自动用上新值。
- 页面默认是浅色主题（`<html data-theme="light">`）。深色作为可选项，主题按钮在左侧栏最下方，选择会记在 localStorage 里。

## 各文件职责

完整的代码地图写在 `00_head.html` 的注释里，打开 html 的源码也能看到。要点：

- 所有模块都挂在 `window.HX` 上，每个 JS 文件是一个 IIFE。
- **修改图只有一个入口**：`HX.dispatch(op)`。op 由 `HX.opAdd / opRemove / opConnect / opParam / opMove / opPromote / opStruct / opBatch` 生成，每个都带 `apply()` 和 `revert()`，撤销和重做由此实现。模型发起的操作把 `actor` 设为 `'model'`，并写上 `reason`。
- **渲染分三层**：`renderView`（只改世界容器的 transform）、`renderNode`（按 id 复用节点 DOM，`rev` 变了才重建内部）、`renderEdges`（只重算 path 的 d）。`sync()` 负责对账，增删 DOM。
- **端口坐标**由 `23_geom.js` 根据布局常数算出，不读 DOM。`HX.L` 里的常数必须和 tokens.css 里的 `--hx-node-*` 保持一致。

## 测试

| 文件 | 用途 | 运行 |
|---|---|---|
| `check_syntax.js` | 把全部 JS 包进 `if(false){}`，只检查语法 | Node 直接运行 |
| `test_core.js` | 测纯函数：端口坐标、贝塞尔、类型兼容、环检测、dispatch/undo/redo、拓扑、布局 | Node 直接运行 |
| `test_smoke.js` | 在模拟的页面环境里跑完整流程：封装/撤销、进入子图、复制、模型 1 档提议并采纳/拒绝、3 档直接修改、运行（循环第 2 轮达成、人工审批）、急停、压力测试 | Node 运行，约 25 秒 |

`check_syntax.js` 和 `test_smoke.js` 里的模块代码都是从源文件复制进去的。改了源文件以后，要把这两个文件重新生成一遍，测试才有意义。
