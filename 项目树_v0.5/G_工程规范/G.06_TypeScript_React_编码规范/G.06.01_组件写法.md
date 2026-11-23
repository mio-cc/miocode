# G.06.01 组件写法

| 项 | 内容 |
|---|---|
| 编号 | G.06.01 |
| 类型 | 规范 |
| 上级 | G.06 TypeScript / React 编码规范 |
| 下级 | 无 |
| 状态 | 草稿 |
| 素材 | 设18 |
| 最后修改 | 2026-11-22 |

## 1. 规则
| 编号 | 规则 |
|---|---|
| G.06.01-R1 | 一个文件导出一个组件；组件文件旁边放同名 `.css` 和 `.test.tsx` |
| G.06.01-R2 | props 用 `type XxxProps = {…}` 声明；不用 `React.FC`；可选 props 给默认值 |
| G.06.01-R3 | 组件超过 200 行、或者有两个以上互不相关的职责时拆分 |
| G.06.01-R4 | 组件不直接发请求：数据读写通过 store 的 action 或协议层的 hook |
| G.06.01-R5 | 不在渲染里创建新对象、新函数传给子组件（除非子组件不依赖引用相等）；需要时用 `useCallback` / `useMemo`，或把值放进 store |
| G.06.01-R6 | 所有可点击元素用 `<button>`（或带 `role` 和键盘处理的元素，需注释原因）；图标按钮必须有 `aria-label` 和提示文字（`U.16`） |
| G.06.01-R7 | 列表的 `key` 用稳定 ID（节点 ID、消息 ID），不用数组下标 |
| G.06.01-R8 | 副作用写在 `useEffect`，依赖数组完整；订阅类副作用必须返回清理函数 |
| G.06.01-R9 | 浮层（菜单、弹层、提示、预览）统一用 `components/ui/Overlay` 渲染到顶层容器，层级按 `U.06` 的 z-index 表 |
| G.06.01-R10 | 不使用 `dangerouslySetInnerHTML`；需要渲染 Markdown 时用登记过的安全渲染组件（`W.07.04`） |

## 2. 例子
```tsx
type NestCardProps = { parentLabel: string; onUp: () => void; collapsed?: boolean };

export function NestCard({ parentLabel, onUp, collapsed = false }: NestCardProps) {
  const t = useT();
  return (
    <section className={`hx-nest${collapsed ? ' is-min' : ''}`}>
      <header className="hx-nest__h">
        <span>{t('dock.nest.parent')}</span><b>{parentLabel}</b>
        <IconButton icon="arrowUp" label={t('dock.nest.up')} shortcut="Esc" onClick={onUp} />
      </header>
    </section>
  );
}
```

## 变更记录
| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-11-23 | §2 示例的文案键改为 `dock.nest.parent`、`dock.nest.up`（区域前缀以 `W.10` §4.3 为准） | 第 10 棒；`P.09` K161 |
