globalThis.window=globalThis;
/* ===== 20_icons.js · 图标（1.5px 线宽、单色、currentColor） ===== */
window.HX = window.HX || {};
(function (HX) {
  'use strict';
  const s = (d, vb) => '<svg viewBox="0 0 ' + (vb || 16) + ' ' + (vb || 16) + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

  /* 13 种原子节点：只靠图形区分类别，颜色统一 --hx-text-2 */
  HX.ICON = {
    '资源': s('<ellipse cx="8" cy="3.8" rx="5" ry="1.9"/><path d="M3 3.8v8.4c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V3.8"/><path d="M3 8c0 1 2.2 1.9 5 1.9S13 9 13 8"/>'),
    'Agent': s('<circle cx="8" cy="8" r="2.4"/><path d="M8 1.6v2.1M8 12.3v2.1M1.6 8h2.1M12.3 8h2.1M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5 5 11M11 5l1.5-1.5"/>'),
    '上下文装配': s('<path d="M8 1.8 14 4.8 8 7.8 2 4.8Z"/><path d="m2 8 6 3 6-3"/><path d="m2 11.2 6 3 6-3"/>'),
    '工具': s('<path d="M10.4 2.2a3.1 3.1 0 0 0-3.2 4.2l-4.8 4.8a1.4 1.4 0 0 0 2 2l4.8-4.8a3.1 3.1 0 0 0 4.2-3.2l-1.9 1.9-1.8-.4-.4-1.8Z"/>'),
    '扇出': s('<path d="M1.8 8h3.6"/><path d="M5.4 8c2.2 0 2.2-4.4 4.6-4.4h4M5.4 8H14M5.4 8c2.2 0 2.2 4.4 4.6 4.4h4"/><path d="m12.4 2.2 1.6 1.4-1.6 1.4M12.4 11 14 12.4l-1.6 1.4"/>'),
    '汇合': s('<path d="M2 3.6h3.4c2.4 0 2.4 4.4 4.6 4.4M2 8h8M2 12.4h3.4c2.4 0 2.4-4.4 4.6-4.4H14"/><path d="m12.4 6.6 1.6 1.4-1.6 1.4"/>'),
    '聚合': s('<path d="M2 2.8h12L9.4 8.4v4.4l-2.8 1.4V8.4Z"/>'),
    '分支': s('<circle cx="4" cy="3.4" r="1.6"/><circle cx="4" cy="12.6" r="1.6"/><circle cx="12" cy="5.2" r="1.6"/><path d="M4 5v6M12 6.8c0 3.2-8 1.8-8 4.2"/>'),
    '循环': s('<path d="M13.2 6.4A5.2 5.2 0 0 0 3.5 4.7"/><path d="M2.8 9.6a5.2 5.2 0 0 0 9.7 1.7"/><path d="M3.2 2.2v2.9h2.9M12.8 13.8v-2.9H9.9"/>'),
    '账本': s('<rect x="3" y="1.8" width="10" height="12.4" rx="1.6"/><path d="M6 5.4h4M6 8h4M6 10.6h2.2"/>'),
    '人工': s('<circle cx="8" cy="5.4" r="2.6"/><path d="M2.8 14.2c.6-2.8 2.6-4.2 5.2-4.2s4.6 1.4 5.2 4.2"/>'),
    '子图端口': s('<rect x="1.8" y="3.8" width="7" height="8.4" rx="1.6"/><path d="M8.8 8h5.4M12.2 6l2 2-2 2"/>'),
    '子图引用': s('<rect x="1.8" y="5" width="9.2" height="9.2" rx="1.6"/><path d="M5 2.2h7.2a1.8 1.8 0 0 1 1.8 1.8v7.2"/>')
  };

  /* 界面图标 */
  HX.UI = {
    chat: s('<path d="M2.5 4.2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7l-3 2.6v-2.6h0a2 2 0 0 1-1.5-2Z"/>'),
    graph: s('<rect x="1.8" y="2.2" width="4.4" height="3.6" rx="1"/><rect x="9.8" y="10.2" width="4.4" height="3.6" rx="1"/><rect x="9.8" y="2.2" width="4.4" height="3.6" rx="1"/><path d="M6.2 4h3.6M6.2 4c2 0 1.6 8 3.6 8"/>'),
    search: s('<circle cx="7" cy="7" r="4.4"/><path d="m10.4 10.4 3.4 3.4"/>'),
    history: s('<path d="M2.4 8a5.6 5.6 0 1 0 1.6-3.9"/><path d="M2.2 2.4v2.8H5"/><path d="M8 5v3.2l2.2 1.4"/>'),
    moon: s('<path d="M13.4 9.6A5.6 5.6 0 0 1 6.4 2.6a5.6 5.6 0 1 0 7 7Z"/>'),
    sun: s('<circle cx="8" cy="8" r="2.8"/><path d="M8 1.4v1.4M8 13.2v1.4M1.4 8h1.4M13.2 8h1.4M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1"/>'),
    play: s('<path d="M4.6 2.8v10.4L13 8Z" fill="currentColor" stroke-width="1.2"/>'),
    stop: s('<rect x="3.4" y="3.4" width="9.2" height="9.2" rx="1.6" fill="currentColor" stroke-width="1.2"/>'),
    pause: s('<path d="M5.4 3.4v9.2M10.6 3.4v9.2"/>'),
    branch: s('<circle cx="4.6" cy="3.6" r="1.6"/><circle cx="4.6" cy="12.4" r="1.6"/><circle cx="11.4" cy="5.6" r="1.6"/><path d="M4.6 5.2v5.6M11.4 7.2c0 2.6-6.8 1.6-6.8 3.6"/>'),
    expand: s('<path d="M9.6 2.4h4v4M6.4 13.6h-4v-4M13.6 2.4 9.2 6.8M2.4 13.6l4.4-4.4"/>'),
    shrink: s('<path d="M13.6 6.4h-4v-4M2.4 9.6h4v4M9.6 6.4l4-4M6.4 9.6l-4 4"/>'),
    collapse: s('<path d="M3.2 10.4 8 5.6l4.8 4.8"/>'),
    plus: s('<path d="M8 3v10M3 8h10"/>'),
    minus: s('<path d="M3 8h10"/>'),
    x: s('<path d="m4 4 8 8M12 4l-8 8"/>'),
    check: s('<path d="m3 8.4 3.2 3.2L13 4.6"/>'),
    chevl: s('<path d="M10 3.4 5.4 8l4.6 4.6"/>'),
    chevr: s('<path d="M6 3.4 10.6 8 6 12.6"/>'),
    chevd: s('<path d="M3.4 6 8 10.6 12.6 6"/>'),
    lib: s('<rect x="2" y="2" width="5" height="5" rx="1.2"/><rect x="9" y="2" width="5" height="5" rx="1.2"/><rect x="2" y="9" width="5" height="5" rx="1.2"/><path d="M11.5 9v5M9 11.5h5"/>'),
    fit: s('<path d="M2.4 5.6V3.4a1 1 0 0 1 1-1h2.2M10.4 2.4h2.2a1 1 0 0 1 1 1v2.2M13.6 10.4v2.2a1 1 0 0 1-1 1h-2.2M5.6 13.6H3.4a1 1 0 0 1-1-1v-2.2"/><rect x="5.4" y="5.4" width="5.2" height="5.2" rx="1"/>'),
    pointer: s('<path d="M3.2 2.4 12.8 7l-4.2 1.4-2 4.2Z"/>'),
    hand: s('<path d="M5.4 8V3.8a1.1 1.1 0 0 1 2.2 0V7.4M7.6 7V2.8a1.1 1.1 0 0 1 2.2 0V7.4M9.8 7.4V3.8a1.1 1.1 0 0 1 2.2 0v5.4c0 2.8-1.8 4.8-4.6 4.8-1.8 0-3-.8-4-2.4L2 9a1.1 1.1 0 0 1 1.8-1.2L5.4 9.6"/>'),
    group: s('<rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2" stroke-dasharray="2.2 2"/><rect x="4.4" y="4.4" width="3.4" height="3" rx=".8"/><rect x="8.2" y="8.6" width="3.4" height="3" rx=".8"/>'),
    layout: s('<rect x="1.8" y="2.4" width="4" height="3.2" rx=".8"/><rect x="10.2" y="2.4" width="4" height="3.2" rx=".8"/><rect x="10.2" y="10.4" width="4" height="3.2" rx=".8"/><path d="M5.8 4h4.4M8 4v8h2.2"/>'),
    undo: s('<path d="M5 3.6 2.4 6.2 5 8.8"/><path d="M2.6 6.2h7a3.6 3.6 0 0 1 0 7.2H6.4"/>'),
    redo: s('<path d="m11 3.6 2.6 2.6L11 8.8"/><path d="M13.4 6.2h-7a3.6 3.6 0 0 0 0 7.2h3.2"/>'),
    trash: s('<path d="M2.6 4.4h10.8M6.4 4.4V2.8h3.2v1.6M4 4.4l.6 9h6.8l.6-9"/>'),
    copy: s('<rect x="5.2" y="5.2" width="8.6" height="8.6" rx="1.6"/><path d="M10.8 5.2V3.6a1.4 1.4 0 0 0-1.4-1.4H3.6a1.4 1.4 0 0 0-1.4 1.4v5.8a1.4 1.4 0 0 0 1.4 1.4h1.6"/>'),
    enter: s('<path d="M6 2.4h5.8a1.8 1.8 0 0 1 1.8 1.8v7.6a1.8 1.8 0 0 1-1.8 1.8H6"/><path d="M2.4 8h7.2M7 5.4 9.6 8 7 10.6"/>'),
    lock: s('<rect x="3.2" y="7" width="9.6" height="7" rx="1.6"/><path d="M5.4 7V5a2.6 2.6 0 0 1 5.2 0v2"/>'),
    port: s('<circle cx="8" cy="8" r="2.6"/><path d="M1.6 8h3.8M10.6 8h3.8"/>'),
    model: s('<path d="M8 1.8 9.4 6.6 14.2 8 9.4 9.4 8 14.2 6.6 9.4 1.8 8 6.6 6.6Z"/>'),
    cmd: s('<path d="M5.4 5.4h5.2v5.2H5.4Z"/><path d="M5.4 5.4V4a1.6 1.6 0 1 0-1.6 1.4h1.6M10.6 5.4V4a1.6 1.6 0 1 1 1.6 1.4h-1.6M5.4 10.6V12a1.6 1.6 0 1 1-1.6-1.4h1.6M10.6 10.6V12a1.6 1.6 0 1 0 1.6-1.4h-1.6"/>'),
    gauge: s('<path d="M2.6 11.6a5.6 5.6 0 1 1 10.8 0"/><path d="m8 9 2.4-3"/>'),
    bolt: s('<path d="M8.8 1.8 3.6 9h4l-.8 5.2L12.4 7h-4Z"/>')
  };

  /* 节点状态图标（颜色由节点状态类决定） */
  HX.STI = {
    idle: '',
    queued: s('<circle cx="8" cy="8" r="5" stroke-dasharray="2.4 2.2"/>'),
    running: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.6" stroke="currentColor" stroke-opacity=".22" stroke-width="1.8"/><path class="hx-spin" d="M8 2.4a5.6 5.6 0 0 1 5.6 5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    done: s('<circle cx="8" cy="8" r="6" fill="currentColor" stroke="none" opacity=".16"/><path d="m5.2 8.2 1.9 1.9 3.8-4"/>'),
    failed: s('<circle cx="8" cy="8" r="6" fill="currentColor" stroke="none" opacity=".16"/><path d="m5.8 5.8 4.4 4.4M10.2 5.8l-4.4 4.4"/>'),
    waiting: s('<circle cx="8" cy="8" r="6" fill="currentColor" stroke="none" opacity=".16"/><path d="M6.6 5.6v4.8M9.4 5.6v4.8"/>'),
    skipped: s('<path d="M4.6 8h6.8"/>'),
    cached: s('<path d="M8.8 2.4 4.4 8.6h3.4l-.6 5 4.4-6.2H8.2Z"/>')
  };

  /** 把页面里所有 [data-ic] 占位替换成图标 */
  HX.fillIcons = function (root) {
    (root || document).querySelectorAll('[data-ic]').forEach(function (el) {
      const ic = HX.UI[el.dataset.ic];
      if (!ic) return;
      if (el.tagName === 'SPAN' && !el.classList.contains('hx-card__ico')) el.outerHTML = ic;
      else el.innerHTML = ic;
    });
  };

  /** 循环节点的轮次环：p 取 0–1 */
  HX.ring = function (p) {
    const c = 2 * Math.PI * 5.6, off = c * (1 - Math.max(0, Math.min(1, p)));
    return '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.6" stroke="currentColor" stroke-opacity=".2" stroke-width="1.8"/>' +
      '<circle cx="8" cy="8" r="5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 8 8)" style="transition:stroke-dashoffset var(--hx-t-3) var(--hx-ease)"/></svg>';
  };
})(window.HX);

/* ===== 21_defs.js · 节点定义、端口类型、兼容规则、示例图 ===== */
(function (HX) {
  'use strict';

  /* 端口类型 → 令牌与名称（DESIGN.md §2.4，新增类型只能映射到这 8 类） */
  HX.TYPE = {
    any: { v: '--hx-type-any', n: '任意' },
    ctx: { v: '--hx-type-ctx', n: '上下文包' },
    ref: { v: '--hx-type-ref', n: '资源引用' },
    list: { v: '--hx-type-list', n: '列表' },
    tool: { v: '--hx-type-tool', n: '工具端点' },
    gen: { v: '--hx-type-gen', n: 'T' },
    ctrl: { v: '--hx-type-ctrl', n: '判定' },
    state: { v: '--hx-type-state', n: '状态' }
  };
  HX.tc = t => 'var(' + (HX.TYPE[t] || HX.TYPE.any).v + ')';

  /** 端口兼容：返回 {ok, why}。ctx / tool / ref 输入端口严格匹配（内核规则） */
  HX.compat = function (a, b) {
    const N = t => HX.TYPE[t] ? HX.TYPE[t].n : t;
    if (b === 'ctx') return a === 'ctx' ? { ok: true } : { ok: false, why: 'context 只接受上下文包（内核规则）' };
    if (b === 'tool' || b === 'ref') return a === b ? { ok: true } : { ok: false, why: N(a) + ' 不能接到 ' + N(b) };
    if (a === 'ctx' || a === 'tool' || a === 'ref') return b === 'any' ? { ok: true } : { ok: false, why: N(a) + ' 不能接到 ' + N(b) };
    if (a === b || a === 'any' || b === 'any' || a === 'gen' || b === 'gen') return { ok: true };
    return { ok: false, why: N(a) + ' 不能接到 ' + N(b) };
  };

  /* 参数 schema：t = num | sel | seg | text | bool | slider；inline 表示显示在节点上；lock = 'kernel' | 'def' */
  const P = (label, t, def, more) => Object.assign({ label: label, t: t, def: def }, more || {});
  HX.CATS = ['资源', '智能体', '状态', '工具', '拓扑', '聚合', '控制', '人工', '边界 · 组合'];

  HX.DEF = {
    '资源': { cat: '资源', sm: 1, desc: '模型、提示词、列表、常量', in: [], out: [['ref', 'ref']],
      params: { kind: P('类型', 'sel', '模型', { opts: ['模型', '提示词', '列表', '常量'], inline: 1 }), value: P('值', 'text', 'large-model', { inline: 1 }), pin: P('版本引用', 'seg', 'snapshot', { opts: ['snapshot', 'link'] }) } },
    'Agent': { cat: '智能体', desc: '唯一调用模型的节点', in: [['context', 'ctx'], ['model', 'ref'], ['prompt', 'ref'], ['tools', 'tool', 1]], out: [['result', 'gen']],
      params: { output_schema: P('输出类型', 'sel', '方案@1', { opts: ['方案@1', '簇标注@1', '任务卡@1[]', '执行结果@1', '判定@1', '目标@1'], inline: 1 }),
        lifecycle: P('生命周期', 'seg', 'ephemeral', { opts: ['ephemeral', 'resident'], inline: 1 }), temperature: P('温度', 'slider', 0.7, { min: 0, max: 1, step: 0.05 }),
        max_tool_calls: P('工具调用上限', 'num', 10, { min: 1, max: 50 }), context_src: P('上下文来源', 'text', '上下文装配', { lock: 'kernel' }) } },
    '上下文装配': { cat: '状态', desc: '按配方组装 Agent 能看到的内容', in: [['in', 'any', 1], ['model', 'ref']], out: [['context', 'ctx'], ['dropped', 'list']],
      params: { recipe: P('配方', 'sel', '执行者配方@1', { opts: ['主脑配方@1', '智囊配方@1', '聚类员配方@1', '决策者配方@1', '执行者配方@1', '验收者配方@1'], inline: 1 }),
        budget: P('预算 × 窗口', 'slider', 0.1, { min: 0.02, max: 0.5, step: 0.01, inline: 1 }), on_overflow: P('溢出处理', 'sel', 'pointer', { opts: ['pointer', 'summarize', 'truncate', 'reject'] }),
        honor_inherit: P('透传 inherit 字段', 'bool', true, { lock: 'kernel' }) } },
    '账本': { cat: '状态', sm: 1, desc: '外置状态的读写口', in: [['value', 'any']], out: [['value', 'state']],
      params: { op: P('操作', 'sel', 'read', { opts: ['read', 'write', 'append', 'cas', 'watch'], inline: 1 }), path: P('字段路径', 'text', '目标树', { inline: 1 }), scope: P('作用域', 'seg', 'local', { opts: ['local', 'parent'] }) } },
    '工具': { cat: '工具', desc: '检索、代码、HTTP、浏览器…', in: [['request', 'any']], out: [['endpoint', 'tool'], ['result', 'gen']],
      params: { tool: P('工具', 'sel', '检索', { opts: ['检索', '代码执行', 'HTTP', '浏览器', '文件写', '邮件'], inline: 1 }), risk: P('风险等级', 'seg', 'L0', { opts: ['L0', 'L1', 'L2', 'L3'], inline: 1 }),
        rate: P('频率上限 / 分', 'num', 10, { min: 1, max: 120 }), keep_pointer: P('保留原文指针', 'bool', true, { lock: 'kernel' }) } },
    '扇出': { cat: '拓扑', desc: '一份变 N 份，并行执行', in: [['items', 'list'], ['shared', 'any', 1]], out: [['results', 'list']],
      params: { n: P('份数', 'num', 3, { min: 1, max: 32, inline: 1 }), concurrency: P('并发', 'num', 3, { min: 1, max: 64, inline: 1 }),
        collect: P('汇合', 'sel', 'all', { opts: ['all', 'k_of_n', 'first', 'timeout'], inline: 1 }), isolation: P('互相隔离', 'bool', true) } },
    '汇合': { cat: '拓扑', sm: 1, desc: '多路收成一份', in: [['in', 'any', 1]], out: [['collected', 'list']],
      params: { wait: P('等待', 'sel', 'all', { opts: ['all', 'k_of_n', 'first', 'timeout'], inline: 1 }), timeout: P('超时 s', 'num', 300, { min: 10, max: 3600 }) } },
    '聚合': { cat: '聚合', desc: '列表 → 结构化结果（纯规则）', in: [['items', 'list']], out: [['result', 'gen']],
      params: { op: P('算子', 'sel', 'group_ratio', { opts: ['group_ratio', 'vote', 'dedupe', 'sort', 'top_k', 'divergence'], inline: 1 }), key: P('按字段', 'text', 'cluster', { inline: 1 }),
        deterministic: P('确定性', 'bool', true, { lock: 'kernel' }) } },
    '分支': { cat: '控制', sm: 1, desc: '按表达式分流', in: [['value', 'gen']], out: [['yes', 'ctrl'], ['no', 'ctrl']],
      params: { when: P('条件', 'text', 'achieved == true', { inline: 1 }), pure: P('无副作用', 'bool', true, { lock: 'kernel' }) } },
    '循环': { cat: '控制', sub: 1, desc: '唯一能形成环的节点', in: [['init', 'gen']], out: [['final', 'gen']],
      params: { max_rounds: P('最大轮数', 'num', 5, { min: 1, max: 50, inline: 1 }), trigger: P('触发', 'seg', 'rounds', { opts: ['rounds', 'event'], inline: 1 }), stall: P('无进展停止', 'num', 2, { min: 1, max: 10 }) } },
    '人工': { cat: '人工', sm: 1, desc: '审批、输入、选择', in: [['request', 'any']], out: [['approved', 'ctrl'], ['rejected', 'ctrl']],
      params: { mode: P('方式', 'sel', 'approve', { opts: ['approve', 'input', 'choose'], inline: 1 }), timeout: P('超时', 'text', '24h') } },
    '子图端口': { cat: '边界 · 组合', sm: 1, desc: '子图的入口 / 出口 / 摘要', in: [['in', 'any']], out: [['out', 'any']],
      params: { role: P('角色', 'sel', 'entry', { opts: ['entry', 'exit', 'summary', 'escalation'], inline: 1 }) } },
    '子图引用': { cat: '边界 · 组合', sub: 1, desc: '把封装好的子图当节点用', in: [['in', 'any']], out: [['out', 'any']],
      params: { ref: P('引用', 'text', '新子图@v0.1', { inline: 1 }), pin: P('版本', 'seg', 'snapshot', { opts: ['snapshot', 'link'] }) } }
  };
  HX.TYPES = Object.keys(HX.DEF);

  /** 示例图：闭环迭代（外层主脑 + 循环子图）。坐标交给自动布局 */
  HX.buildTemplate = function () {
    const mk = HX.mk, E = HX.edge;
    const ie = mk('子图端口', '入口', { role: 'entry' });
    const models = mk('资源', '模型列表[]', { kind: '列表', value: '3 家厂商大模型' });
    const big = mk('资源', '大模型', { kind: '模型', value: 'large-model' });
    const fan = mk('扇出', '智囊团', { n: 3, concurrency: 3 });
    const c1 = mk('上下文装配', '聚类员配方', { recipe: '聚类员配方@1', budget: 0.08 });
    const clu = mk('Agent', '聚类员', { output_schema: '簇标注@1' });
    const agg = mk('聚合', '按比例分级', { op: 'group_ratio', key: 'cluster' });
    const c2 = mk('上下文装配', '决策者配方', { recipe: '决策者配方@1' });
    const dec = mk('Agent', '决策者', { output_schema: '任务卡@1[]' });
    const tool = mk('工具', '检索', { tool: '检索', risk: 'L0' });
    const pool = mk('扇出', '执行池', { n: 4, concurrency: 3, collect: 'all' });
    const c3 = mk('上下文装配', '验收者配方', { recipe: '验收者配方@1', budget: 0.12 });
    const jud = mk('Agent', '验收者', { output_schema: '判定@1', temperature: 0.2 });
    const br = mk('分支', '达成？', { when: 'achieved == true' });
    const ox = mk('子图端口', '出口', { role: 'exit' });
    const inner = HX.newGraph([ie, models, big, fan, c1, clu, agg, c2, dec, tool, pool, c3, jud, br, ox], [
      E(ie, 'out', fan, 'shared'), E(models, 'ref', fan, 'items'), E(fan, 'results', c1, 'in'), E(c1, 'context', clu, 'context'),
      E(big, 'ref', clu, 'model'), E(clu, 'result', agg, 'items'), E(agg, 'result', c2, 'in'), E(c2, 'context', dec, 'context'),
      E(big, 'ref', dec, 'model'), E(dec, 'result', pool, 'items'), E(tool, 'endpoint', pool, 'shared'), E(pool, 'results', c3, 'in'),
      E(c3, 'context', jud, 'context'), E(big, 'ref', jud, 'model'), E(jud, 'result', br, 'value'), E(br, 'yes', ox, 'in')]);
    HX.applyLayout(inner, { cols: 6 });

    const l1 = mk('账本', '目标账本', { op: 'read', path: '目标树' });
    const bm = mk('资源', '大模型', { kind: '模型', value: 'large-model' });
    const c0 = mk('上下文装配', '主脑配方', { recipe: '主脑配方@1', budget: 0.05 });
    const brain = mk('Agent', '主脑', { output_schema: '目标@1', lifecycle: 'resident', temperature: 0.3 });
    const loop = mk('循环', '闭环迭代', { max_rounds: 5 }, inner);
    const sum = mk('子图端口', '摘要端口', { role: 'summary' });
    const hum = mk('人工', '发布审批', { mode: 'approve' });
    const l2 = mk('账本', '写入进度', { op: 'append', path: '进度' });
    const root = HX.newGraph([l1, bm, c0, brain, loop, sum, hum, l2], [
      E(l1, 'value', c0, 'in'), E(bm, 'ref', c0, 'model'), E(c0, 'context', brain, 'context'), E(bm, 'ref', brain, 'model'),
      E(brain, 'result', loop, 'init'), E(loop, 'final', sum, 'in'), E(sum, 'out', hum, 'request'), E(hum, 'approved', l2, 'value')]);
    HX.applyLayout(root, { cols: 4 });
    return root;
  };
})(window.HX);

/* ===== 22_state.js · 全局状态、Op 工厂、dispatch / undo / redo =====
   规则：任何对图的修改都必须封装成 op 并经过 HX.dispatch(op)。
   op = { kind, label, actor:'user'|'model'|'system', reason?, g, apply(), revert() }
   ======================================================================== */
(function (HX) {
  'use strict';
  let seq = 0;
  HX.uid = p => (p || 'n') + (++seq).toString(36);

  /* ---------- 事件总线 ---------- */
  const bus = {};
  HX.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); };
  HX.emit = (ev, d) => { (bus[ev] || []).forEach(fn => { try { fn(d); } catch (e) { console.error(e); } }); };

  /* ---------- 图数据 ---------- */
  HX.newGraph = function (nodes, edges) {
    const g = { nodes: new Map(), edges: new Map() };
    (nodes || []).forEach(n => g.nodes.set(n.id, n));
    (edges || []).forEach(e => g.edges.set(e.id, e));
    return g;
  };
  HX.mk = function (type, label, params, children) {
    const d = HX.DEF[type], p = {};
    Object.keys(d.params).forEach(k => { p[k] = d.params[k].def; });
    Object.assign(p, params || {});
    const n = { id: HX.uid('n'), type: type, label: label || type, x: 0, y: 0, params: p, promoted: [], rev: 1,
      status: 'idle', prog: 0, sub: '', meta: '', ai: null, ghost: false, pending: {} };
    if (d.sub) {
      if (!children) {
        const a = HX.mk('子图端口', '入口', { role: 'entry' }), b = HX.mk('子图端口', '出口', { role: 'exit' });
        b.x = 320; children = HX.newGraph([a, b], []);
      }
      n.children = children;
    }
    return n;
  };
  HX.edge = (a, ap, b, bp) => ({ id: HX.uid('e'), f: a.id || a, fp: ap, t: b.id || b, tp: bp });
  HX.touch = n => { if (n) n.rev = (n.rev || 0) + 1; };

  /* ---------- 全局状态 ---------- */
  HX.S = {
    root: null,
    stack: [],                 // [{label, g, node}] 面包屑
    view: { x: 0, y: 0, k: 1 },
    sel: new Set(), selEdge: null, hoverEdge: null,
    tool: 'select',            // select | hand
    level: 2,                  // 授权档位 0–4
    past: [], future: [],
    open: false, full: false, focus: false
  };
  HX.cur = () => HX.S.stack[HX.S.stack.length - 1].g;
  HX.setRoot = function (g, label) {
    HX.S.root = g; HX.S.stack = [{ label: label || '根图', g: g, node: null }];
    HX.S.sel.clear(); HX.S.selEdge = null;
  };

  /* ---------- dispatch / undo / redo ---------- */
  HX.dispatch = function (op) {
    op.actor = op.actor || 'user';
    op.at = Date.now();
    op.apply();
    HX.S.past.push(op);
    if (HX.S.past.length > 300) HX.S.past.shift();
    HX.S.future.length = 0;
    HX.emit('op', op);
    return op;
  };
  HX.undo = function () {
    const op = HX.S.past.pop(); if (!op) return null;
    op.revert(); op.undone = true; HX.S.future.push(op); HX.emit('op', op); return op;
  };
  HX.redo = function () {
    const op = HX.S.future.pop(); if (!op) return null;
    op.apply(); op.undone = false; HX.S.past.push(op); HX.emit('op', op); return op;
  };
  /** 撤销到某条 op 之前（操作历史里的「回到此处」） */
  HX.undoTo = function (op) {
    if (HX.S.past.indexOf(op) < 0) return;
    while (HX.S.past.length && HX.S.past[HX.S.past.length - 1] !== op) HX.undo();
    HX.undo();
  };

  /* ---------- Op 工厂 ---------- */
  const base = (g, kind, label, apply, revert) => ({ g: g, kind: kind, label: label, apply: apply, revert: revert });

  HX.opAdd = function (g, nodes, edges, label, removeEdges) {
    nodes = nodes || []; edges = edges || []; removeEdges = removeEdges || [];
    return base(g, 'add', label || ('添加 ' + nodes.map(n => n.label).join('、')),
      () => { nodes.forEach(n => g.nodes.set(n.id, n)); removeEdges.forEach(e => g.edges.delete(e.id)); edges.forEach(e => g.edges.set(e.id, e)); },
      () => { edges.forEach(e => g.edges.delete(e.id)); removeEdges.forEach(e => g.edges.set(e.id, e)); nodes.forEach(n => g.nodes.delete(n.id)); });
  };
  HX.opRemove = function (g, nodeIds, edgeIds) {
    const ns = (nodeIds || []).map(id => g.nodes.get(id)).filter(Boolean);
    const set = new Set(ns.map(n => n.id));
    const es = [...g.edges.values()].filter(e => set.has(e.f) || set.has(e.t) || (edgeIds || []).indexOf(e.id) >= 0);
    return base(g, 'remove', ns.length ? ('删除 ' + ns.map(n => n.label).join('、')) : '删除连线',
      () => { es.forEach(e => g.edges.delete(e.id)); ns.forEach(n => g.nodes.delete(n.id)); },
      () => { ns.forEach(n => g.nodes.set(n.id, n)); es.forEach(e => g.edges.set(e.id, e)); });
  };
  HX.opConnect = function (g, e) {
    const tn = g.nodes.get(e.t), pd = HX.ports(tn).in.find(p => p[0] === e.tp);
    const replaced = pd && pd[2] ? [] : [...g.edges.values()].filter(x => x.t === e.t && x.tp === e.tp);
    const fn = g.nodes.get(e.f);
    const op = base(g, 'connect', '连线 ' + fn.label + '.' + e.fp + ' → ' + tn.label + '.' + e.tp,
      () => { replaced.forEach(x => g.edges.delete(x.id)); g.edges.set(e.id, e); },
      () => { g.edges.delete(e.id); replaced.forEach(x => g.edges.set(x.id, x)); });
    op.replaced = replaced;
    return op;
  };
  HX.opParam = function (g, n, k, v, from) {
    const old = from !== undefined ? from : n.params[k];
    return base(g, 'param', n.label + '.' + k + '：' + old + ' → ' + v,
      () => { n.params[k] = v; HX.touch(n); },
      () => { n.params[k] = old; HX.touch(n); });
  };
  HX.opLabel = function (g, n, label) {
    const old = n.label;
    return base(g, 'label', '重命名 ' + old + ' → ' + label, () => { n.label = label; HX.touch(n); }, () => { n.label = old; HX.touch(n); });
  };
  HX.opMove = function (g, moves, label) {
    return base(g, 'move', label || ('移动 ' + moves.length + ' 个节点'),
      () => moves.forEach(m => { const n = g.nodes.get(m.id); if (n) { n.x = m.to.x; n.y = m.to.y; } }),
      () => moves.forEach(m => { const n = g.nodes.get(m.id); if (n) { n.x = m.from.x; n.y = m.from.y; } }));
  };
  HX.opPromote = function (g, n, k) {
    const on = n.promoted.indexOf(k) < 0;
    const cut = on ? [] : [...g.edges.values()].filter(e => e.t === n.id && e.tp === k);
    return base(g, 'promote', (on ? '参数转端口 ' : '撤回端口 ') + n.label + '.' + k,
      () => { if (on) n.promoted.push(k); else { n.promoted = n.promoted.filter(x => x !== k); cut.forEach(e => g.edges.delete(e.id)); } HX.touch(n); },
      () => { if (on) n.promoted = n.promoted.filter(x => x !== k); else { n.promoted.push(k); cut.forEach(e => g.edges.set(e.id, e)); } HX.touch(n); });
  };
  /** 结构快照 op：fn(g) 任意增删节点/连线，apply/revert 在前后两份 Map 之间切换 */
  HX.opStruct = function (g, kind, label, fn) {
    const bn = new Map(g.nodes), be = new Map(g.edges);
    fn(g);
    const an = new Map(g.nodes), ae = new Map(g.edges);
    g.nodes = bn; g.edges = be;
    return base(g, kind, label, () => { g.nodes = new Map(an); g.edges = new Map(ae); }, () => { g.nodes = new Map(bn); g.edges = new Map(be); });
  };
  HX.opBatch = function (g, label, ops) {
    return base(g, 'batch', label, () => ops.forEach(o => o.apply()), () => ops.slice().reverse().forEach(o => o.revert()));
  };
  /** 遍历所有图（含子图），用于按名称查找节点 */
  HX.walk = function (g, fn, path) {
    path = path || [];
    g.nodes.forEach(n => { fn(n, g, path); if (n.children) HX.walk(n.children, fn, path.concat([n])); });
  };
})(window.HX);

/* ===== 23_geom.js · 几何与图算法（纯函数，不读 DOM — 性能规则 R2） ===== */
(function (HX) {
  'use strict';
  /* 布局常数：必须与 tokens.css 的 --hx-node-* 一致 */
  const L = HX.L = { W: 236, WS: 184, HEAD: 38, PAD: 6, ROW: 24, WROW: 28, WPAD: 12, THUMB: 72, FOOT: 26, GRID: 20, GAPX: 72, GAPY: 36, BAND: 96 };

  HX.nodeW = n => (HX.DEF[n.type].sm ? L.WS : L.W);
  /** 端口表：定义的端口 + 由参数转成的端口（类型为 any） */
  HX.ports = function (n) {
    const d = HX.DEF[n.type];
    return { in: d.in.concat(n.promoted.map(k => [k, 'any', 0, 1])), out: d.out };
  };
  HX.inlineKeys = n => Object.keys(HX.DEF[n.type].params).filter(k => HX.DEF[n.type].params[k].inline && n.promoted.indexOf(k) < 0).slice(0, 3);
  HX.nodeH = function (n) {
    const P = HX.ports(n), rows = Math.max(P.in.length, P.out.length, 1), w = HX.inlineKeys(n).length;
    return L.HEAD + L.PAD * 2 + rows * L.ROW + (w ? 1 + w * L.WROW + L.WPAD : 0) + (n.children ? L.THUMB : 0) + (n.foot ? L.FOOT : 0);
  };
  /** 端口圆心（世界坐标） */
  HX.portPos = function (n, name, dir) {
    const list = HX.ports(n)[dir];
    let i = list.findIndex(p => p[0] === name); if (i < 0) i = 0;
    return [dir === 'in' ? n.x : n.x + HX.nodeW(n), n.y + L.HEAD + L.PAD + i * L.ROW + L.ROW / 2];
  };
  HX.portType = function (n, name, dir) {
    const p = HX.ports(n)[dir].find(q => q[0] === name);
    return p ? p[1] : 'any';
  };

  /** 三次贝塞尔：两端切线水平；回连时固定偏移 120（DESIGN.md §6.1） */
  HX.bez = function (a, b) {
    const dx = b[0] - a[0];
    const off = dx < 0 ? 120 : Math.max(48, Math.min(180, Math.abs(dx) * 0.5));
    const c1 = [a[0] + off, a[1]], c2 = [b[0] - off, b[1]];
    const mx = (a[0] + 3 * c1[0] + 3 * c2[0] + b[0]) / 8, my = (a[1] + 3 * c1[1] + 3 * c2[1] + b[1]) / 8;
    return { d: 'M' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ' C' + c1[0].toFixed(1) + ',' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ',' + c2[1].toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1), mx: mx, my: my };
  };
  HX.edgeGeom = function (g, e) {
    const a = g.nodes.get(e.f), b = g.nodes.get(e.t);
    if (!a || !b) return null;
    return HX.bez(HX.portPos(a, e.fp, 'out'), HX.portPos(b, e.tp, 'in'));
  };
  HX.snap = (v, on) => (on === false ? v : Math.round(v / L.GRID) * L.GRID);

  /** from 能否沿连线到达 to */
  HX.reach = function (g, from, to) {
    const out = new Map(); g.edges.forEach(e => { if (!out.has(e.f)) out.set(e.f, []); out.get(e.f).push(e.t); });
    const st = [from], seen = new Set();
    while (st.length) { const x = st.pop(); if (x === to) return true; if (seen.has(x)) continue; seen.add(x); (out.get(x) || []).forEach(y => st.push(y)); }
    return false;
  };
  /** 新连线 f→t 是否会形成环（只有循环节点能形成环） */
  HX.wouldCycle = (g, f, t) => f === t || HX.reach(g, t, f);

  /** 拓扑分层（Kahn），返回 [[id…], …]；有环时剩余节点放最后一层 */
  HX.topoLevels = function (g) {
    const indeg = new Map(), out = new Map();
    g.nodes.forEach((n, id) => { indeg.set(id, 0); out.set(id, []); });
    g.edges.forEach(e => { if (indeg.has(e.t) && out.has(e.f)) { indeg.set(e.t, indeg.get(e.t) + 1); out.get(e.f).push(e.t); } });
    const levels = []; let cur = [...indeg.keys()].filter(id => indeg.get(id) === 0); const seen = new Set();
    while (cur.length) {
      levels.push(cur); cur.forEach(id => seen.add(id));
      const nx = [];
      cur.forEach(id => out.get(id).forEach(t => { indeg.set(t, indeg.get(t) - 1); if (indeg.get(t) === 0) nx.push(t); }));
      cur = [...new Set(nx)];
    }
    const rest = [...indeg.keys()].filter(id => !seen.has(id));
    if (rest.length) levels.push(rest);
    return levels;
  };

  /** 分层自动布局。cols：每行最多几层，超出换到下一行（band） */
  HX.layout = function (g, opt) {
    opt = opt || {}; const cols = opt.cols || 99;
    const ids = [...g.nodes.keys()], layer = new Map(), succ = new Map(), pred = new Map();
    ids.forEach(id => { succ.set(id, []); pred.set(id, []); });
    g.edges.forEach(e => { if (succ.has(e.f) && pred.has(e.t)) { succ.get(e.f).push(e.t); pred.get(e.t).push(e.f); } });
    HX.topoLevels(g).forEach(lv => lv.forEach(id => {
      const ps = pred.get(id); layer.set(id, ps.length ? Math.max.apply(null, ps.map(p => (layer.has(p) ? layer.get(p) : 0) + 1)) : 0);
    }));
    ids.forEach(id => { if (!pred.get(id).length && succ.get(id).length) layer.set(id, Math.max(0, Math.min.apply(null, succ.get(id).map(t => layer.get(t))) - 1)); });
    const byL = new Map(); ids.forEach(id => { const l = layer.get(id); if (!byL.has(l)) byL.set(l, []); byL.get(l).push(id); });
    const maxL = Math.max.apply(null, [0].concat([...byL.keys()]));
    const order = new Map(); const pos = new Map();
    const colW = L.W + L.GAPX;
    let bandY = 0, bandH = 0, band = -1;
    for (let l = 0; l <= maxL; l++) {
      const b = Math.floor(l / cols);
      if (b !== band) { bandY += band < 0 ? 0 : bandH + L.BAND; bandH = 0; band = b; }
      const list = (byL.get(l) || []).slice();
      list.forEach(id => { const ps = pred.get(id).filter(p => order.has(p)); order.set(id, ps.length ? ps.reduce((s, p) => s + order.get(p), 0) / ps.length : 0); });
      list.sort((a, b2) => order.get(a) - order.get(b2));
      let y = bandY;
      list.forEach((id, i) => {
        const n = g.nodes.get(id);
        order.set(id, i);
        pos.set(id, { x: (l % cols) * colW, y: y });
        y += HX.nodeH(n) + L.GAPY;
      });
      bandH = Math.max(bandH, y - bandY - L.GAPY);
    }
    return pos;
  };
  HX.applyLayout = function (g, opt) { HX.layout(g, opt).forEach((p, id) => { const n = g.nodes.get(id); n.x = p.x; n.y = p.y; }); };

  HX.bounds = function (g, ids) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, c = 0;
    g.nodes.forEach((n, id) => {
      if (ids && !ids.has(id)) return;
      c++; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + HX.nodeW(n)); y1 = Math.max(y1, n.y + HX.nodeH(n));
    });
    return c ? { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 } : { x0: 0, y0: 0, x1: 400, y1: 300, w: 400, h: 300 };
  };
  /** 与 (x,y) 最近的兼容输入端口（世界坐标、阈值 r） */
  HX.nearestPort = function (cands, x, y, r) {
    let best = null, bd = r * r;
    cands.forEach(c => { const dx = c.x - x, dy = c.y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; } });
    return best;
  };
  HX.ease = t => 1 - Math.pow(1 - t, 3);
})(window.HX);


const A=(c,m)=>{if(!c)throw new Error('FAIL '+m);console.log('ok',m)};
const root=HX.buildTemplate(); HX.setRoot(root);
A(root.nodes.size===8,'root 8 nodes');
const loop=[...root.nodes.values()].find(n=>n.type==='循环'); A(loop.children.nodes.size===15,'inner 15');
[...root.nodes.values()].forEach(n=>console.log(n.label,n.x,n.y,HX.nodeH(n)));
console.log('inner');[...loop.children.nodes.values()].forEach(n=>console.log(' ',n.label,n.x,n.y));
A(HX.compat('gen','ctx').ok===false,'gen->ctx no'); A(HX.compat('ctx','ctx').ok,'ctx ok'); A(HX.compat('list','any').ok,'list->any');
A(HX.compat('gen','list').ok,'gen->list'); A(!HX.compat('ref','list').ok,'ref->list no'); A(HX.compat('tool','any').ok,'tool->any');
const a=HX.mk('Agent','a'); a.x=0;a.y=0; const pp=HX.portPos(a,'model','in'); A(pp[0]===0&&pp[1]===38+6+24+12,'portPos');
const po=HX.portPos(a,'result','out'); A(po[0]===236,'out x');
const b=HX.bez([0,0],[200,50]); A(b.d.startsWith('M0.0,0.0 C100.0'),'bez '+b.d);
const g=HX.newGraph(); const n1=HX.mk('Agent','1'),n2=HX.mk('聚合','2'),n3=HX.mk('分支','3');
HX.S.stack=[{label:'t',g}];
HX.dispatch(HX.opAdd(g,[n1,n2,n3],[]));A(g.nodes.size===3,'add');
HX.dispatch(HX.opConnect(g,HX.edge(n1,'result',n2,'items')));HX.dispatch(HX.opConnect(g,HX.edge(n2,'result',n3,'value')));
A(g.edges.size===2,'connect'); A(HX.wouldCycle(g,n3.id,n1.id),'cycle detect'); A(!HX.wouldCycle(g,n1.id,n3.id),'no cycle');
HX.dispatch(HX.opParam(g,n2,'op','vote')); A(n2.params.op==='vote','param');
HX.undo(); A(n2.params.op==='group_ratio','undo param'); HX.redo(); A(n2.params.op==='vote','redo');
HX.dispatch(HX.opRemove(g,[n2.id])); A(g.nodes.size===2&&g.edges.size===0,'remove w edges'); HX.undo(); A(g.edges.size===2,'undo remove');
const lv=HX.topoLevels(g); A(lv.length===3,'topo');
const st=HX.opStruct(g,'x','x',gg=>{gg.nodes.delete(n3.id)}); A(g.nodes.size===3,'struct restore'); HX.dispatch(st); A(g.nodes.size===2,'struct apply'); HX.undo(); A(g.nodes.size===3,'struct undo');
const rep=HX.opConnect(g,HX.edge(n1,'result',n3,'value')); A(rep.replaced.length===1,'replace single input');
HX.dispatch(HX.opPromote(g,n1,'temperature')); A(HX.ports(n1).in.length===5,'promote');
const pos=HX.layout(g); A(pos.get(n1.id).x===0 && pos.get(n2.id).x===308,'layout x');
console.log('ALL OK');
