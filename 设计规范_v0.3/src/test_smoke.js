
const mkEl=()=>{const store={};const fn=function(){return P;};const P=new Proxy(fn,{get(t,k){
 if(k in store) return store[k];
 if(k===Symbol.iterator) return function*(){};
 if(k==='getBoundingClientRect') return ()=>({left:0,top:0,width:1000,height:600,right:1000,bottom:600});
 if(k==='querySelectorAll') return ()=>[];
 if(k==='offsetWidth'||k==='offsetHeight'||k==='clientWidth'||k==='clientHeight') return 500;
 if(k==='dataset') return store.dataset||(store.dataset={});
 if(k==='style') return store.style||(store.style={setProperty(){},});
 if(k==='hidden') return store.hidden??true;
 if(k==='value') return store.value??'';
 if(k==='contains') return ()=>false;
 if(k==='closest') return ()=>null; if(k==='querySelector') return ()=>mkEl();
 if(k==='getContext') return ()=>new Proxy({},{get:(t,k)=>k==='roundRect'?undefined:()=>{}, set:()=>true});
 if(k==='tagName') return 'DIV';
 if(k===Symbol.toPrimitive) return ()=>0;
 return P;},set(t,k,v){store[k]=v;return true;},apply(){return P;}});return P;};
const els={};
globalThis.window=globalThis;if(typeof performance==='undefined')globalThis.performance={now:()=>Date.now()};
globalThis.document={getElementById:id=>els[id]||(els[id]=mkEl()),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},createElement:()=>mkEl(),createElementNS:()=>mkEl(),
 documentElement:{dataset:{theme:'light'}},activeElement:{tagName:'BODY'},fonts:null};
globalThis.getComputedStyle=()=>({getPropertyValue:()=>''});
globalThis.requestAnimationFrame=f=>setTimeout(()=>f(performance.now()),5);globalThis.cancelAnimationFrame=t=>clearTimeout(t);
globalThis.innerWidth=1400;globalThis.innerHeight=900;globalThis.addEventListener=()=>{};
globalThis.localStorage={getItem:()=>null,setItem(){}};
/* ===== 20_icons.js · 图标（1.5px 线宽、单色、currentColor） ===== */
try{
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

/* ===== 24_render.js · 渲染：视图 / 节点 / 连线 / 小地图（R1 R4 R5 R7 R8） ===== */
(function (HX) {
  'use strict';
  const $ = HX.$ = id => document.getElementById(id);
  const esc = HX.esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const els = new Map(), eels = new Map();
  HX.nodeEl = id => els.get(id);
  HX.edgeEl = id => eels.get(id);
  HX.css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  HX.vw = 1000; HX.vh = 600;

  /* ---------------- 视图（只改世界容器的 transform） ---------------- */
  HX.renderView = function () {
    const v = HX.S.view, vp = $('vp');
    $('world').style.transform = 'translate3d(' + v.x.toFixed(2) + 'px,' + v.y.toFixed(2) + 'px,0) scale(' + v.k.toFixed(4) + ')';
    let step = HX.L.GRID * v.k; if (v.k < 0.5) step *= 2;
    vp.style.backgroundSize = step.toFixed(2) + 'px ' + step.toFixed(2) + 'px';
    vp.style.backgroundPosition = v.x.toFixed(1) + 'px ' + v.y.toFixed(1) + 'px';
    const lod = v.k >= 0.75 ? 1 : v.k >= 0.45 ? 2 : 3;
    if (vp._lod !== lod) { vp.classList.remove('lod-1', 'lod-2', 'lod-3'); vp.classList.add('lod-' + lod); vp._lod = lod; }
    $('zoomTxt').textContent = Math.round(v.k * 100) + '%';
    HX.miniView();
    if (HX.cur().nodes.size > 150) HX.cull();
  };
  let vq = 0;
  HX.queueView = function () { if (!vq) vq = requestAnimationFrame(() => { vq = 0; HX.renderView(); }); };
  /** 平滑视图过渡（适应视图、聚焦、进入子图） */
  HX.animateView = function (to, ms) {
    const from = Object.assign({}, HX.S.view), t0 = performance.now(); ms = ms || 380;
    if (HX.css('--hx-t-4') === '0ms') { Object.assign(HX.S.view, to); HX.renderView(); return; }
    cancelAnimationFrame(HX._va);
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = HX.ease(t);
      HX.S.view.x = from.x + (to.x - from.x) * e; HX.S.view.y = from.y + (to.y - from.y) * e; HX.S.view.k = from.k + (to.k - from.k) * e;
      HX.renderView(); if (t < 1) HX._va = requestAnimationFrame(step);
    };
    HX._va = requestAnimationFrame(step);
  };
  /** 计算让一组节点适应可见区域的视图（避开左右浮动面板） */
  HX.fitTarget = function (ids, maxK) {
    const b = HX.bounds(HX.cur(), ids);
    const libOpen = !$('lib').classList.contains('is-collapsed') && !HX.S.focus;
    const inspOpen = !$('insp').classList.contains('is-off') && !HX.S.focus;
    const left = libOpen ? 284 : 24, right = inspOpen ? 344 : 24, top = 24, bottom = 150;
    const W = Math.max(200, HX.vw - left - right), H = Math.max(160, HX.vh - top - bottom);
    const k = Math.max(0.2, Math.min(maxK || 1, W / (b.w + 40), H / (b.h + 40)));
    return { k: k, x: left + (W - b.w * k) / 2 - b.x0 * k, y: top + (H - b.h * k) / 2 - b.y0 * k };
  };
  HX.fit = (anim, ids) => { const t = HX.fitTarget(ids); if (anim === false) { Object.assign(HX.S.view, t); HX.renderView(); } else HX.animateView(t); };

  /* ---------------- 内联控件（节点与检查器共用） ---------------- */
  const fmt = (pd, v) => (pd.t === 'slider' ? Number(v).toFixed(2) : v);
  HX.ctlHTML = function (n, k, lg) {
    const pd = HX.DEF[n.type].params[k], v = n.params[k], lock = !!pd.lock, a = ' data-nid="' + n.id + '" data-k="' + k + '"' + (lock ? ' disabled' : '');
    if (n.pending && n.pending[k] !== undefined) return '<span class="hx-w__diff"><span class="hx-w__old">' + esc(fmt(pd, v)) + '</span><span class="hx-w__new">' + esc(fmt(pd, n.pending[k])) + '</span></span>';
    switch (pd.t) {
      case 'num': return '<div class="hx-step' + (lg ? ' is-lg' : '') + '" data-ctl="num"' + a + '><button data-d="-1" tabindex="-1">' + HX.UI.minus + '</button><span class="hx-step__v">' + esc(v) + '</span><button data-d="1" tabindex="-1">' + HX.UI.plus + '</button></div>';
      case 'sel': return '<button class="hx-select' + (lg ? ' is-lg' : '') + '" data-ctl="sel"' + a + '><span>' + esc(v) + '</span>' + HX.UI.chevd + '</button>';
      case 'seg': return '<div class="hx-seg is-fill is-mono" data-ctl="seg"' + a + '>' + pd.opts.map(o => '<button data-v="' + esc(o) + '"' + (o === v ? ' class="is-on"' : '') + (lock ? ' disabled' : '') + '>' + esc(o.length > 9 ? o.slice(0, 8) + '…' : o) + '</button>').join('') + '</div>';
      case 'slider': { const r = (v - pd.min) / (pd.max - pd.min); return '<div class="hx-slider" data-ctl="slider"' + a + ' style="--v:' + r.toFixed(3) + '"><div class="hx-slider__trk"><div class="hx-slider__fill"></div><div class="hx-slider__thumb"></div></div><span class="hx-slider__v">' + Number(v).toFixed(2) + '</span></div>'; }
      case 'bool': return '<button class="hx-switch' + (v ? ' is-on' : '') + '" data-ctl="bool"' + a + '></button>';
      default: return '<input class="hx-input is-sm is-mono" data-ctl="text"' + a + ' value="' + esc(v) + '" spellcheck="false">';
    }
  };

  /* ---------------- 节点 ---------------- */
  function typeLine(n) {
    if (n.type === '循环' && n.round) return '循环 · 第 ' + n.round + ' / ' + n.params.max_rounds + ' 轮';
    if (n.type === 'Agent') return 'Agent · ' + n.params.lifecycle + ' · ' + n.params.output_schema;
    if (n.children) return n.type + ' · ' + n.children.nodes.size + ' 个节点';
    return n.type + (n.type === '资源' ? ' · ' + n.params.kind : '');
  }
  function thumb(g) {
    const b = HX.bounds(g), W = 212, H = 64, s = Math.min((W - 12) / b.w, (H - 12) / b.h);
    const ox = (W - b.w * s) / 2 - b.x0 * s, oy = (H - b.h * s) / 2 - b.y0 * s; let h = '';
    g.edges.forEach(e => { const a = g.nodes.get(e.f), c = g.nodes.get(e.t); if (!a || !c) return;
      h += '<line x1="' + ((a.x + HX.nodeW(a)) * s + ox).toFixed(1) + '" y1="' + ((a.y + 50) * s + oy).toFixed(1) + '" x2="' + (c.x * s + ox).toFixed(1) + '" y2="' + ((c.y + 50) * s + oy).toFixed(1) + '" stroke="var(--hx-line-3)" stroke-width="1"/>'; });
    g.nodes.forEach(n => { h += '<rect x="' + (n.x * s + ox).toFixed(1) + '" y="' + (n.y * s + oy).toFixed(1) + '" width="' + Math.max(3, HX.nodeW(n) * s).toFixed(1) + '" height="' + Math.max(2, HX.nodeH(n) * s).toFixed(1) + '" rx="1.5" fill="var(--hx-bg-3)" stroke="var(--hx-line-3)" stroke-width=".75"/>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + h + '</svg><span>' + g.nodes.size + ' 个节点</span>';
  }
  function nodeHTML(n) {
    const P = HX.ports(n), keys = HX.inlineKeys(n);
    const port = (p, dir) => '<div class="hx-port is-' + dir + (p[3] ? ' is-promoted' : '') + '" data-p="' + esc(p[0]) + '" data-d="' + dir + '" style="--pc:' + HX.tc(p[1]) + '">' +
      (dir === 'out' ? '<span class="hx-port__type">' + HX.TYPE[p[1]].n + '</span>' : '') + '<span class="hx-port__name">' + esc(p[0]) + '</span>' +
      (dir === 'in' ? '<span class="hx-port__type">' + HX.TYPE[p[1]].n + (p[2] ? ' · 多连' : '') + '</span>' : '') + '<span class="hx-port__dot"></span></div>';
    let h = '<div class="hx-node__head"><span class="hx-node__ico">' + HX.ICON[n.type] + '</span><span class="hx-node__ttl"><span class="hx-node__name">' + esc(n.label) + '</span><span class="hx-node__type">' + esc(typeLine(n)) + '</span></span>' +
      '<span class="hx-node__meta"></span>' + (n.ai ? '<span class="hx-ai" data-tip-model="' + esc(n.ai.reason) + '">AI</span>' : '') + '<span class="hx-node__st"></span></div>';
    if (n.ghost) h += '<div class="hx-node__prop"><b>模型提议</b><span>' + esc(n.ghostReason || '') + '</span><button class="hx-btn is-sm is-model" data-act="accept">采纳</button><button class="hx-btn is-sm is-ghost" data-act="reject">拒绝</button></div>';
    h += '<div class="hx-node__ports"><div class="hx-node__col">' + P.in.map(p => port(p, 'in')).join('') + '</div><div class="hx-node__col">' + P.out.map(p => port(p, 'out')).join('') + '</div></div>';
    if (keys.length) h += '<div class="hx-node__widgets">' + keys.map(k => '<div class="hx-w"><span class="hx-w__lbl">' + esc(HX.DEF[n.type].params[k].label) + '</span><span class="hx-w__ctl">' + HX.ctlHTML(n, k) + '</span></div>').join('') + '</div>';
    if (n.children) h += '<div class="hx-node__thumb">' + thumb(n.children) + '</div>';
    h += '<div class="hx-node__foot"><div class="hx-bar"><i></i></div><b class="hx-node__ftxt"></b><span class="hx-node__acts"></span></div>';
    return h;
  }
  const STCLS = ['is-idle', 'is-queued', 'is-running', 'is-done', 'is-failed', 'is-waiting', 'is-skipped', 'is-cached'];
  HX.setStatus = function (n) {
    const el = els.get(n.id); if (!el || !el.firstChild) return;
    if (el._st !== n.status) { STCLS.forEach(c => el.classList.remove(c)); el.classList.add('is-' + n.status); el._st = n.status; el._sti = null; }
    const st = el.querySelector('.hx-node__st');
    const icon = n.type === '循环' && n.status === 'running' ? HX.ring(n.prog / 100) : HX.STI[n.status];
    if (n.type === '循环' && n.status === 'running') st.innerHTML = icon; else if (el._sti !== n.status) { st.innerHTML = icon; el._sti = n.status; }
    const foot = n.status === 'running' || n.status === 'waiting' || n.status === 'failed' || n.status === 'queued';
    el.classList.toggle('has-foot', foot); n.foot = foot;
    el.querySelector('.hx-bar i').style.transform = 'scaleX(' + (Math.max(0, Math.min(100, n.prog)) / 100).toFixed(3) + ')';
    el.querySelector('.hx-node__ftxt').textContent = n.sub || '';
    el.querySelector('.hx-node__meta').textContent = n.meta || '';
    const acts = el.querySelector('.hx-node__acts');
    const want = n.status === 'waiting' ? 'w' : n.status === 'failed' && n.retry ? 'f' : '';
    if (acts._k !== want) {
      acts.innerHTML = want === 'w' ? '<button class="hx-btn is-sm is-ok" data-act="approve">批准</button><button class="hx-btn is-sm is-ghost" data-act="deny">驳回</button>'
        : want === 'f' ? '<button class="hx-btn is-sm" data-act="retry">重试</button>' : '';
      acts._k = want;
    }
    if (n.type === '循环') el.querySelector('.hx-node__type').textContent = typeLine(n);
  };
  HX.renderNode = function (n) {
    let el = els.get(n.id);
    if (!el) { el = document.createElement('div'); el.className = 'hx-node'; el.dataset.id = n.id; $('nodes').appendChild(el); els.set(n.id, el); }
    if (el._rev !== n.rev) {
      el.innerHTML = nodeHTML(n); el._rev = n.rev; el._st = null; el._sti = null;
      el.classList.toggle('is-sm', !!HX.DEF[n.type].sm); el.classList.toggle('is-sub', !!n.children);
      el.classList.toggle('is-ghost', !!n.ghost); el.classList.toggle('is-pending', !!Object.keys(n.pending || {}).length);
    }
    el.style.transform = 'translate3d(' + n.x + 'px,' + n.y + 'px,0)';
    el.classList.toggle('is-selected', HX.S.sel.has(n.id));
    HX.setStatus(n);
    return el;
  };
  HX.moveNodeEl = function (n) { const el = els.get(n.id); if (el) el.style.transform = 'translate3d(' + n.x + 'px,' + n.y + 'px,0)'; };

  /* ---------------- 连线（全部在一个 SVG 里） ---------------- */
  const NS = 'http://www.w3.org/2000/svg';
  HX.renderEdge = function (e, g) {
    g = g || HX.cur();
    let el = eels.get(e.id);
    if (!el) {
      el = document.createElementNS(NS, 'g'); el.setAttribute('class', 'hx-eg'); el.dataset.id = e.id;
      ['hx-edge-glow', 'hx-edge', 'hx-edge-flow', 'hx-edge-hit'].forEach(c => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', c); el.appendChild(p); });
      el.lastChild.dataset.eid = e.id;
      $('edgeG').appendChild(el); eels.set(e.id, el);
    }
    const geo = HX.edgeGeom(g, e); if (!geo) return;
    for (let i = 0; i < 4; i++) el.childNodes[i].setAttribute('d', geo.d);
    const fn = g.nodes.get(e.f);
    const t = HX.portType(fn, e.fp, 'out');
    if (el._t !== t) { el.style.setProperty('--ec', HX.tc(t)); el._t = t; }
    el.classList.toggle('is-ghost', !!e.ghost); el.classList.toggle('is-removing', !!e.removing);
    el.classList.toggle('is-sel', HX.S.selEdge === e.id);
    el.classList.toggle('is-flow', !!e.flow); el.classList.toggle('is-done', fn.status === 'done' && !e.flow);
    e._mx = geo.mx; e._my = geo.my;
  };
  HX.renderEdges = function (ids) {
    const g = HX.cur();
    if (ids) ids.forEach(id => { const e = g.edges.get(id); if (e) HX.renderEdge(e, g); });
    else g.edges.forEach(e => HX.renderEdge(e, g));
  };

  /** 全量对账：增删 DOM，按 rev 复用节点（R5） */
  HX.sync = function () {
    const g = HX.cur();
    els.forEach((el, id) => { if (!g.nodes.has(id)) { el.remove(); els.delete(id); } });
    eels.forEach((el, id) => { if (!g.edges.has(id)) { el.remove(); eels.delete(id); } });
    g.nodes.forEach(n => HX.renderNode(n));
    HX.renderEdges();
    const linked = new Set(); g.edges.forEach(e => { if (!e.ghost) { linked.add(e.f + '|out|' + e.fp); linked.add(e.t + '|in|' + e.tp); } });
    els.forEach((el, id) => el.querySelectorAll('.hx-port').forEach(p => p.classList.toggle('is-linked', linked.has(id + '|' + p.dataset.d + '|' + p.dataset.p))));
    HX.drawMini();
    if (g.nodes.size > 150) HX.cull();
    HX.emit('synced');
  };
  /** 切换图（进入 / 退出子图）时清空 DOM 后重建 */
  HX.resetDOM = function () { els.forEach(el => el.remove()); els.clear(); eels.forEach(el => el.remove()); eels.clear(); };

  /** 视口裁剪（R7）：节点数 > 150 时，视口外节点不渲染 */
  HX.cull = function () {
    const v = HX.S.view, m = 200 / v.k;
    const x0 = -v.x / v.k - m, y0 = -v.y / v.k - m, x1 = (HX.vw - v.x) / v.k + m, y1 = (HX.vh - v.y) / v.k + m;
    const g = HX.cur(), vis = new Set();
    g.nodes.forEach(n => { const on = n.x < x1 && n.x + 240 > x0 && n.y < y1 && n.y + 220 > y0; if (on) vis.add(n.id); const el = els.get(n.id); if (el && el._cull !== !on) { el.classList.toggle('is-culled', !on); el._cull = !on; } });
    g.edges.forEach(e => { const el = eels.get(e.id); if (el) { const on = vis.has(e.f) || vis.has(e.t); if (el._cull !== !on) { el.style.display = on ? '' : 'none'; el._cull = !on; } } });
  };

  /* ---------------- 画布缩略（小地图 / 对话卡片共用，canvas 绘制） ---------------- */
  HX.drawGraph = function (cv, g, mode) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return null;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const b = HX.bounds(g), pad = mode === 'card' ? 28 : 10;
    const s = Math.min((W - pad * 2) / b.w, (H - pad * 2) / b.h, mode === 'card' ? 0.62 : 1);
    const ox = (W - b.w * s) / 2 - b.x0 * s, oy = (H - b.h * s) / 2 - b.y0 * s;
    const C = HX.css;
    c.lineWidth = mode === 'card' ? 1.4 : 1;
    g.edges.forEach(e => {
      const a = g.nodes.get(e.f), t = g.nodes.get(e.t); if (!a || !t) return;
      const p = HX.portPos(a, e.fp, 'out'), q = HX.portPos(t, e.tp, 'in'), dx = q[0] - p[0], off = dx < 0 ? 120 : Math.max(48, Math.min(180, Math.abs(dx) * 0.5));
      c.strokeStyle = C((HX.TYPE[HX.portType(a, e.fp, 'out')] || HX.TYPE.any).v); c.globalAlpha = mode === 'card' ? 0.85 : 0.5;
      c.beginPath(); c.moveTo(p[0] * s + ox, p[1] * s + oy);
      c.bezierCurveTo((p[0] + off) * s + ox, p[1] * s + oy, (q[0] - off) * s + ox, q[1] * s + oy, q[0] * s + ox, q[1] * s + oy); c.stroke();
    });
    c.globalAlpha = 1;
    g.nodes.forEach(n => {
      const x = n.x * s + ox, y = n.y * s + oy, w = HX.nodeW(n) * s, h = HX.nodeH(n) * s;
      const st = n.status === 'running' ? C('--hx-accent-strong') : n.status === 'done' ? C('--hx-ok') : n.status === 'waiting' ? C('--hx-wait') : n.status === 'failed' ? C('--hx-danger') : null;
      c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, mode === 'card' ? 6 : 2); else c.rect(x, y, w, h);
      if (mode === 'card') {
        c.fillStyle = C('--hx-bg-3'); c.shadowColor = 'rgba(0,0,0,.08)'; c.shadowBlur = 8; c.shadowOffsetY = 2; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
        c.strokeStyle = st || C('--hx-line-3'); c.lineWidth = st ? 1.5 : 1; c.stroke();
        c.fillStyle = C('--hx-text-1'); c.font = '600 ' + Math.max(9, 14 * s) + 'px ' + C('--hx-font-ui');
        c.fillText(n.label, x + 10 * s + 24 * s, y + 24 * s, w - 40 * s);
        c.fillStyle = C('--hx-bg-5'); c.beginPath(); if (c.roundRect) c.roundRect(x + 12 * s, y + 9 * s, 20 * s, 20 * s, 4 * s); else c.rect(x + 12 * s, y + 9 * s, 20 * s, 20 * s); c.fill();
      } else {
        c.fillStyle = n.ghost ? C('--hx-model') : st || (HX.S.sel.has(n.id) ? C('--hx-text-1') : C('--hx-text-3')); c.globalAlpha = st || HX.S.sel.has(n.id) ? 0.9 : 0.42; c.fill(); c.globalAlpha = 1;
      }
    });
    return { s: s, ox: ox, oy: oy };
  };
  HX.drawMini = function () { const cv = $('miniCanvas'); if (!cv || !HX.S.open) return; HX._mm = HX.drawGraph(cv, HX.cur(), 'mini'); HX.miniView(); };
  HX.miniView = function () {
    const m = HX._mm, el = $('miniView'); if (!m || !el) return;
    const v = HX.S.view, x = (-v.x / v.k) * m.s + m.ox, y = (-v.y / v.k) * m.s + m.oy;
    el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    el.style.width = (HX.vw / v.k * m.s).toFixed(1) + 'px'; el.style.height = (HX.vh / v.k * m.s).toFixed(1) + 'px';
  };
})(window.HX);

/* ===== 25_pointer.js · 指针交互（R3 rAF 合并、R4 增量更新、R6 指针捕获） ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S;
  let P = null, lastEv = null, raf = 0, space = false, zoomT = 0;
  HX.vpBox = { left: 0, top: 0 };
  const toWorld = (cx, cy) => [(cx - HX.vpBox.left - S.view.x) / S.view.k, (cy - HX.vpBox.top - S.view.y) / S.view.k];
  HX.toWorld = toWorld;
  HX.setSpace = v => { space = v; $('vp').classList.toggle('is-hand', v || S.tool === 'hand'); };
  HX.measure = function () { const r = $('vp').getBoundingClientRect(); HX.vpBox = r; HX.vw = r.width; HX.vh = r.height; };
  HX.graphOf = function (id) { let found = null; if (HX.S.root.nodes.has(id)) return HX.S.root; HX.walk(HX.S.root, n => { if (!found && n.children && n.children.nodes.has(id)) found = n.children; }); return found || HX.cur(); };
  HX.findNode = id => HX.graphOf(id).nodes.get(id);

  /* ---------------- 选择 ---------------- */
  HX.select = function (ids, add) {
    if (!add) S.sel.clear();
    (ids || []).forEach(id => S.sel.add(id));
    S.selEdge = null; HX.selChanged();
  };
  HX.selChanged = function () {
    HX.cur().nodes.forEach(n => { const el = HX.nodeEl(n.id); if (el) el.classList.toggle('is-selected', S.sel.has(n.id)); });
    HX.renderEdges(); HX.renderInsp(); HX.drawMini();
  };

  /* ---------------- 画布按下 ---------------- */
  function onDown(e) {
    if (!S.open) return;
    HX.closeFloating();
    const t = e.target;
    if (t.closest('.hx-panel,.hx-dock,.hx-proposal,.hx-banner,.hx-fps,[data-ctl],.hx-etools')) return;
    HX.measure();
    const vp = $('vp');
    if (e.button === 1 || (e.button === 0 && (space || S.tool === 'hand'))) { startPan(e, false); e.preventDefault(); return; }
    if (e.button !== 0) return;
    const dot = t.closest('.hx-port__dot');
    if (dot) {
      const port = dot.parentElement, nid = port.closest('.hx-node').dataset.id, pn = port.dataset.p, dir = port.dataset.d;
      e.preventDefault();
      if (e.altKey) { HX.disconnectPort(nid, pn, dir); return; }
      if (dir === 'out') { startLink(e, nid, pn, null); return; }
      const ex = [...HX.cur().edges.values()].find(x => x.t === nid && x.tp === pn && !x.ghost);
      if (ex) startLink(e, ex.f, ex.fp, ex);
      return;
    }
    if (t.closest('button,input')) return;
    const nodeEl = t.closest('.hx-node');
    if (nodeEl) {
      const id = nodeEl.dataset.id;
      if (e.shiftKey || e.metaKey || e.ctrlKey) { if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); S.selEdge = null; HX.selChanged(); }
      else if (!S.sel.has(id)) HX.select([id]);
      if (S.sel.has(id)) startDrag(e);
      vp.focus({ preventScroll: true });
      return;
    }
    const hit = t.closest('.hx-edge-hit');
    if (hit) { S.sel.clear(); S.selEdge = hit.dataset.eid; HX.selChanged(); return; }
    vp.focus({ preventScroll: true });
    if (e.shiftKey) startMarquee(e); else startPan(e, true);
  }
  function capture(e) { try { $('vp').setPointerCapture(e.pointerId); } catch (_) { /* 忽略 */ } }

  function startPan(e, clickClears) { P = { mode: 'pan', lx: e.clientX, ly: e.clientY, moved: 0, clickClears: clickClears }; $('vp').classList.add('is-panning'); capture(e); }
  function startDrag(e) {
    const g = HX.cur(), w0 = toWorld(e.clientX, e.clientY), starts = new Map();
    S.sel.forEach(id => { const n = g.nodes.get(id); if (n) starts.set(id, { x: n.x, y: n.y }); });
    const eids = [...g.edges.values()].filter(x => starts.has(x.f) || starts.has(x.t)).map(x => x.id);
    P = { mode: 'drag', w0: w0, starts: starts, eids: eids, moved: false }; capture(e);
  }
  function startMarquee(e) { P = { mode: 'marquee', x0: e.clientX - HX.vpBox.left, y0: e.clientY - HX.vpBox.top, add: true }; $('marquee').hidden = false; capture(e); frameMarquee(e); }

  function startLink(e, from, fp, unplug) {
    const g = HX.cur(), fn = g.nodes.get(from), type = HX.portType(fn, fp, 'out'), cands = [], bads = [];
    g.nodes.forEach(n => {
      if (n.id === from) return;
      HX.ports(n).in.forEach(p => {
        const pos = HX.portPos(n, p[0], 'in'), c = HX.compat(type, p[1]);
        const el = HX.nodeEl(n.id) && HX.nodeEl(n.id).querySelector('.hx-port.is-in[data-p="' + p[0] + '"]');
        const item = { nid: n.id, p: p[0], x: pos[0], y: pos[1], el: el };
        if (!c.ok) { item.why = c.why; bads.push(item); }
        else if (HX.wouldCycle(g, from, n.id)) { item.why = '环只能通过「循环」节点形成'; bads.push(item); }
        else { cands.push(item); if (el) el.classList.add('is-cand'); }
      });
    });
    const srcEl = HX.nodeEl(from).querySelector('.hx-port.is-out[data-p="' + fp + '"]');
    if (srcEl) srcEl.classList.add('is-src');
    if (unplug && HX.edgeEl(unplug.id)) HX.edgeEl(unplug.id).style.display = 'none';
    P = { mode: 'link', from: from, fp: fp, type: type, cands: cands, bads: bads, src: HX.portPos(fn, fp, 'out'), unplug: unplug, srcEl: srcEl, snap: null };
    $('tmpEdge').style.setProperty('--ec', HX.tc(type));
    $('vp').classList.add('is-linking'); capture(e); frameLink(e);
  }

  /* ---------------- 每帧处理（R3） ---------------- */
  function onMove(e) { if (!P) return; lastEv = e; if (!raf) raf = requestAnimationFrame(frame); }
  function frame() {
    raf = 0; const e = lastEv; if (!P || !e) return;
    if (P.mode === 'pan') {
      const dx = e.clientX - P.lx, dy = e.clientY - P.ly; P.lx = e.clientX; P.ly = e.clientY; P.moved += Math.abs(dx) + Math.abs(dy);
      S.view.x += dx; S.view.y += dy; HX.renderView();
    } else if (P.mode === 'drag') {
      const w = toWorld(e.clientX, e.clientY), dx = w[0] - P.w0[0], dy = w[1] - P.w0[1], g = HX.cur();
      if (!P.moved && Math.abs(dx) + Math.abs(dy) < 3 / S.view.k) return;
      if (!P.moved) { P.moved = true; P.starts.forEach((_, id) => { const el = HX.nodeEl(id); if (el) el.classList.add('is-dragging'); }); }
      P.starts.forEach((s, id) => { const n = g.nodes.get(id); n.x = HX.snap(s.x + dx, !e.altKey); n.y = HX.snap(s.y + dy, !e.altKey); HX.moveNodeEl(n); });
      HX.renderEdges(P.eids);
    } else if (P.mode === 'link') frameLink(e);
    else if (P.mode === 'marquee') frameMarquee(e);
  }
  function frameLink(e) {
    const w = toWorld(e.clientX, e.clientY), r = 18 / S.view.k;
    const snap = HX.nearestPort(P.cands, w[0], w[1], r);
    if (P.snap !== snap) { if (P.snap && P.snap.el) P.snap.el.classList.remove('is-snap'); if (snap && snap.el) snap.el.classList.add('is-snap'); P.snap = snap; }
    const bad = snap ? null : HX.nearestPort(P.bads, w[0], w[1], 12 / S.view.k);
    const end = snap ? [snap.x, snap.y] : w, tmp = $('tmpEdge');
    tmp.setAttribute('d', HX.bez(P.src, end).d);
    tmp.classList.toggle('is-bad', !!bad); tmp.classList.toggle('is-snap', !!snap);
    const why = $('linkWhy');
    if (bad) { why.hidden = false; why.textContent = bad.why; why.style.transform = 'translate(' + (e.clientX - HX.vpBox.left + 14) + 'px,' + (e.clientY - HX.vpBox.top + 14) + 'px)'; } else why.hidden = true;
  }
  function frameMarquee(e) {
    const x = e.clientX - HX.vpBox.left, y = e.clientY - HX.vpBox.top, m = $('marquee');
    const l = Math.min(x, P.x0), t = Math.min(y, P.y0);
    m.style.transform = 'translate(' + l + 'px,' + t + 'px)'; m.style.width = Math.abs(x - P.x0) + 'px'; m.style.height = Math.abs(y - P.y0) + 'px';
    P.rect = [l, t, Math.abs(x - P.x0), Math.abs(y - P.y0)];
  }

  function onUp(e) {
    if (!P) return;
    if (raf) { cancelAnimationFrame(raf); raf = 0; frame(); }
    const p = P; P = null; const g = HX.cur();
    $('vp').classList.remove('is-panning');
    if (p.mode === 'pan' && p.clickClears && p.moved < 4 && (S.sel.size || S.selEdge)) { S.sel.clear(); S.selEdge = null; HX.selChanged(); }
    if (p.mode === 'drag') {
      p.starts.forEach((_, id) => { const el = HX.nodeEl(id); if (el) el.classList.remove('is-dragging'); });
      if (p.moved) {
        const moves = []; p.starts.forEach((s, id) => { const n = g.nodes.get(id); if (n.x !== s.x || n.y !== s.y) moves.push({ id: id, from: s, to: { x: n.x, y: n.y } }); });
        if (moves.length) HX.dispatch(HX.opMove(g, moves));
      }
    }
    if (p.mode === 'marquee') {
      $('marquee').hidden = true;
      if (p.rect && p.rect[2] > 3) {
        const v = S.view, x0 = (p.rect[0] - v.x) / v.k, y0 = (p.rect[1] - v.y) / v.k, x1 = x0 + p.rect[2] / v.k, y1 = y0 + p.rect[3] / v.k, ids = [];
        g.nodes.forEach(n => { if (n.x < x1 && n.x + HX.nodeW(n) > x0 && n.y < y1 && n.y + HX.nodeH(n) > y0) ids.push(n.id); });
        HX.select(ids, true);
      }
    }
    if (p.mode === 'link') endLink(p, e);
  }
  function endLink(p, e) {
    const g = HX.cur();
    $('vp').classList.remove('is-linking'); $('tmpEdge').setAttribute('d', ''); $('tmpEdge').classList.remove('is-bad', 'is-snap'); $('linkWhy').hidden = true;
    p.cands.forEach(c => c.el && c.el.classList.remove('is-cand', 'is-snap')); if (p.srcEl) p.srcEl.classList.remove('is-src');
    if (p.unplug && HX.edgeEl(p.unplug.id)) HX.edgeEl(p.unplug.id).style.display = '';
    if (p.snap) {
      if (p.unplug && p.unplug.t === p.snap.nid && p.unplug.tp === p.snap.p) return;
      const op = HX.opConnect(g, HX.edge(p.from, p.fp, p.snap.nid, p.snap.p));
      if (p.unplug) HX.dispatch(HX.opBatch(g, '改接连线', [HX.opRemove(g, [], [p.unplug.id]), op]));
      else { HX.dispatch(op); if (op.replaced.length) HX.toast('已替换原有连线', '目标端口只接受一根线', { undo: true }); }
    } else if (p.unplug) {
      HX.dispatch(HX.opRemove(g, [], [p.unplug.id])); HX.toast('已断开连线', null, { undo: true });
    } else {
      const w = toWorld(e.clientX, e.clientY);
      HX.openQuick(e.clientX, e.clientY, { type: p.type, from: p.from, fp: p.fp, at: w });
    }
  }

  /* ---------------- 滚轮缩放（以光标为中心，R9 缩放中关闭过渡） ---------------- */
  HX.zoomAt = function (sx, sy, f) {
    const v = S.view, k2 = Math.max(0.2, Math.min(2.5, v.k * f));
    const wx = (sx - v.x) / v.k, wy = (sy - v.y) / v.k;
    v.k = k2; v.x = sx - wx * k2; v.y = sy - wy * k2;
    const vp = $('vp'); vp.classList.add('is-zooming'); clearTimeout(zoomT); zoomT = setTimeout(() => vp.classList.remove('is-zooming'), 120);
    HX.queueView();
  };
  function onWheel(e) {
    if (!S.open) return;
    const step = e.target.closest('[data-ctl="num"]');
    if (step) { e.preventDefault(); HX.stepParam(step, e.deltaY < 0 ? 1 : -1, e.shiftKey); return; }
    if (e.target.closest('.hx-panel')) return;
    e.preventDefault(); HX.measure();
    const f = Math.pow(1.1, -e.deltaY / (e.ctrlKey ? 10 : 100));
    HX.zoomAt(e.clientX - HX.vpBox.left, e.clientY - HX.vpBox.top, f);
  }

  /* ---------------- 连线悬停：中点按钮 ---------------- */
  let hoverT = 0;
  function onOver(e) {
    const hit = e.target.closest && e.target.closest('.hx-edge-hit');
    if (hit && !P) {
      clearTimeout(hoverT);
      const ed = HX.cur().edges.get(hit.dataset.eid); if (!ed) return;
      if (S.hoverEdge && S.hoverEdge !== ed.id && HX.edgeEl(S.hoverEdge)) HX.edgeEl(S.hoverEdge).classList.remove('is-hover');
      S.hoverEdge = ed.id; HX.edgeEl(ed.id).classList.add('is-hover');
      const et = $('etools'); et.style.transform = 'translate(' + ed._mx + 'px,' + ed._my + 'px) translate(-50%,-50%)'; et.classList.add('is-on');
    } else if (e.target.closest && e.target.closest('.hx-etools')) clearTimeout(hoverT);
  }
  function onOut(e) {
    if (!(e.target.closest && (e.target.closest('.hx-edge-hit') || e.target.closest('.hx-etools')))) return;
    clearTimeout(hoverT);
    hoverT = setTimeout(() => { if (S.hoverEdge && HX.edgeEl(S.hoverEdge)) HX.edgeEl(S.hoverEdge).classList.remove('is-hover'); $('etools').classList.remove('is-on'); }, 260);
  }
  function onEtools(e) {
    const b = e.target.closest('[data-et]'); if (!b || !S.hoverEdge) return;
    const g = HX.cur(), ed = g.edges.get(S.hoverEdge); if (!ed) return;
    $('etools').classList.remove('is-on');
    if (b.dataset.et === 'del') { HX.dispatch(HX.opRemove(g, [], [ed.id])); HX.toast('已删除连线', null, { undo: true }); }
    else { const r = b.getBoundingClientRect(); HX.openQuick(r.left, r.bottom + 6, { type: HX.portType(g.nodes.get(ed.f), ed.fp, 'out'), insert: ed, at: [ed._mx - 118, ed._my - 40] }); }
  }

  /* ---------------- 参数控件（节点内联 + 检查器共用） ---------------- */
  HX.commitParam = function (n, k, v, from) { if (n.params[k] === v && from === undefined) return; HX.dispatch(HX.opParam(HX.graphOf(n.id), n, k, v, from)); };
  HX.stepParam = function (el, dir, fast) {
    const n = HX.findNode(el.dataset.nid), k = el.dataset.k, pd = HX.DEF[n.type].params[k];
    const v = Math.max(pd.min, Math.min(pd.max, Number(n.params[k]) + dir * (fast ? 5 : 1)));
    HX.commitParam(n, k, v);
  };
  function liveText(n, k, txt, r) {
    document.querySelectorAll('[data-ctl][data-nid="' + n.id + '"][data-k="' + k + '"]').forEach(el => {
      const t = el.querySelector('.hx-step__v,.hx-slider__v'); if (t) t.textContent = txt;
      if (r !== undefined) el.style.setProperty('--v', r.toFixed(3));
    });
  }
  function ctlDown(e) {
    const el = e.target.closest('[data-ctl]'); if (!el || el.hasAttribute('disabled') || e.button !== 0) return;
    const n = HX.findNode(el.dataset.nid), k = el.dataset.k; if (!n) return;
    const pd = HX.DEF[n.type].params[k];
    if (el.dataset.ctl === 'num' && e.target.closest('.hx-step__v')) {
      e.preventDefault(); const v0 = Number(n.params[k]); let moved = false; el.classList.add('is-scrub');
      const mv = ev => { const dv = Math.round((ev.clientX - e.clientX) / 4) * (ev.shiftKey ? 5 : 1); if (dv) moved = true; const v = Math.max(pd.min, Math.min(pd.max, v0 + dv)); n.params[k] = v; liveText(n, k, v); };
      const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); el.classList.remove('is-scrub');
        const v = n.params[k]; if (moved && v !== v0) HX.commitParam(n, k, v, v0); else n.params[k] = v0; };
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    } else if (el.dataset.ctl === 'slider') {
      e.preventDefault(); const v0 = Number(n.params[k]), tr = el.querySelector('.hx-slider__trk').getBoundingClientRect(); el.classList.add('is-drag');
      const set = ev => { const r = Math.max(0, Math.min(1, (ev.clientX - tr.left) / tr.width)); let v = pd.min + r * (pd.max - pd.min); v = Math.round(v / pd.step) * pd.step; v = Number(v.toFixed(3)); n.params[k] = v; liveText(n, k, v.toFixed(2), (v - pd.min) / (pd.max - pd.min)); };
      const up = () => { document.removeEventListener('pointermove', set); document.removeEventListener('pointerup', up); el.classList.remove('is-drag'); const v = n.params[k]; if (v !== v0) HX.commitParam(n, k, v, v0); };
      set(e); document.addEventListener('pointermove', set); document.addEventListener('pointerup', up);
    }
  }
  function ctlClick(e) {
    const el = e.target.closest('[data-ctl]'); if (!el || el.hasAttribute('disabled')) return;
    const n = HX.findNode(el.dataset.nid), k = el.dataset.k; if (!n) return;
    const pd = HX.DEF[n.type].params[k], c = el.dataset.ctl;
    if (c === 'num') { const b = e.target.closest('[data-d]'); if (b) HX.stepParam(el, Number(b.dataset.d), e.shiftKey); }
    else if (c === 'seg') { const b = e.target.closest('[data-v]'); if (b) HX.commitParam(n, k, b.dataset.v); }
    else if (c === 'bool') HX.commitParam(n, k, !n.params[k]);
    else if (c === 'sel') { const r = el.getBoundingClientRect(); HX.menu(r.left, r.bottom + 4, pd.opts.map(o => ({ label: o, on: o === n.params[k], act: () => HX.commitParam(n, k, o) })), { width: Math.max(180, r.width) }); }
  }
  function ctlChange(e) {
    const el = e.target.closest('[data-ctl="text"]'); if (!el) return;
    const n = HX.findNode(el.dataset.nid); if (n) HX.commitParam(n, el.dataset.k, el.value);
  }
  function ctlDbl(e) {
    const v = e.target.closest('.hx-step__v'); if (!v) return false;
    const el = v.parentElement, n = HX.findNode(el.dataset.nid), k = el.dataset.k, pd = HX.DEF[n.type].params[k];
    const inp = document.createElement('input'); inp.value = n.params[k]; v.replaceWith(inp); inp.focus(); inp.select();
    const done = ok => { const x = Number(inp.value); if (ok && !isNaN(x)) HX.commitParam(n, k, Math.max(pd.min, Math.min(pd.max, Math.round(x)))); else HX.sync(); };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') done(false); ev.stopPropagation(); });
    inp.addEventListener('blur', () => done(true), { once: true });
    return true;
  }

  /* ---------------- 绑定 ---------------- */
  HX.bindPointer = function () {
    const vp = $('vp');
    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);
    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('pointerover', onOver);
    vp.addEventListener('pointerout', onOut);
    $('etools').addEventListener('click', onEtools);
    document.addEventListener('pointerdown', ctlDown, true);
    document.addEventListener('click', ctlClick);
    document.addEventListener('change', ctlChange);
    vp.addEventListener('dblclick', e => {
      if (ctlDbl(e)) return;
      if (e.target.closest('.hx-panel,.hx-dock,button,input')) return;
      const ne = e.target.closest('.hx-node');
      if (ne) { const n = HX.cur().nodes.get(ne.dataset.id); if (n && n.children) HX.enter(n); else { const i = document.querySelector('.hx-insp__name'); if (i) { i.focus(); i.select(); } } return; }
      HX.measure(); HX.openQuick(e.clientX, e.clientY, { at: toWorld(e.clientX, e.clientY) });
    });
    vp.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const ne = b.closest('.hx-node'); const id = ne && ne.dataset.id; const a = b.dataset.act;
      if (a === 'accept' || a === 'reject') HX.model.decide(id, a === 'accept');
      else if (a === 'approve' || a === 'deny') HX.run.answer(id, a === 'approve');
      else if (a === 'retry') HX.run.retry(id);
    });
    vp.addEventListener('contextmenu', e => { e.preventDefault(); HX.measure(); HX.ctxMenu(e); });
    vp.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    vp.addEventListener('drop', e => {
      e.preventDefault(); const t = e.dataTransfer.getData('text/hx-node'); if (!t || !HX.DEF[t]) return;
      HX.measure(); const w = toWorld(e.clientX, e.clientY); HX.addNodeAt(t, w[0] - 60, w[1] - 19);
    });
    window.addEventListener('resize', () => { if (S.open) { HX.measure(); HX.renderView(); HX.drawMini(); } });
  };
})(window.HX);

/* ===== 26_keys.js · 快捷键、菜单、命令面板、快速添加、结构编辑 ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(s);
  const mod = e => e.metaKey || e.ctrlKey;

  /* ---------------- 通用菜单（右键菜单与下拉共用） ---------------- */
  let menuItems = [], menuAct = -1;
  HX.menu = function (x, y, items, opt) {
    const m = $('menu'); menuItems = items.filter(i => !i.sep && !i.header && !i.disabled); menuAct = -1;
    m.innerHTML = items.map(it => it.sep ? '<div class="hx-menu__sep"></div>' : it.header ? '<div class="hx-menu__h">' + esc(it.header) + '</div>' :
      '<button class="hx-menu__i' + (it.danger ? ' is-danger' : '') + (it.on ? ' is-on' : '') + (it.desc ? ' is-2l' : '') + '"' + (it.disabled ? ' disabled' : '') + ' data-i="' + menuItems.indexOf(it) + '">' +
      (it.icon ? it.icon : '') + '<span>' + esc(it.label) + (it.desc ? '<span class="hx-menu__d">' + esc(it.desc) + '</span>' : '') + '</span>' + (it.kbd ? '<kbd>' + it.kbd + '</kbd>' : '') + '</button>').join('');
    m.style.minWidth = ((opt && opt.width) || 220) + 'px';
    m.hidden = false;
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
  };
  $('menu').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const it = menuItems[+b.dataset.i]; $('menu').hidden = true; if (it && it.act) it.act(); });
  HX.closeFloating = function () { $('menu').hidden = true; $('quick').hidden = true; $('pop').hidden = true; };
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#menu,#quick,#pop,[data-ctl="sel"],#levelBtn,[data-pop]')) HX.closeFloating();
  });

  /* ---------------- 结构编辑 ---------------- */
  HX.addNodeAt = function (type, x, y, actor) {
    const n = HX.mk(type); n.x = HX.snap(x); n.y = HX.snap(y);
    HX.dispatch(Object.assign(HX.opAdd(HX.cur(), [n], []), { actor: actor || 'user' }));
    HX.select([n.id]); HX.flash(n.id); return n;
  };
  HX.flash = function (id, cls) { const el = HX.nodeEl(id); if (!el) return; cls = cls || 'is-modelflash'; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800); };
  HX.disconnectPort = function (nid, p, dir) {
    const g = HX.cur(), ids = [...g.edges.values()].filter(e => dir === 'in' ? e.t === nid && e.tp === p : e.f === nid && e.fp === p).map(e => e.id);
    if (ids.length) { HX.dispatch(HX.opRemove(g, [], ids)); HX.toast('已断开 ' + ids.length + ' 根连线', null, { undo: true }); }
  };
  HX.deleteSel = function () {
    const g = HX.cur();
    if (S.selEdge) { HX.dispatch(HX.opRemove(g, [], [S.selEdge])); S.selEdge = null; return; }
    if (!S.sel.size) return;
    const op = HX.dispatch(HX.opRemove(g, [...S.sel])); S.sel.clear(); HX.selChanged();
    HX.toast(op.label, null, { undo: true });
  };
  HX.duplicate = function () {
    const g = HX.cur(); if (!S.sel.size) return;
    const map = new Map(), nodes = [];
    S.sel.forEach(id => { const o = g.nodes.get(id); const n = HX.mk(o.type, o.label + ' 副本', Object.assign({}, o.params), o.children ? HX.cloneGraph(o.children) : null); n.x = o.x + 40; n.y = o.y + 40; n.promoted = o.promoted.slice(); map.set(id, n); nodes.push(n); });
    const edges = [...g.edges.values()].filter(e => map.has(e.f) && map.has(e.t)).map(e => HX.edge(map.get(e.f), e.fp, map.get(e.t), e.tp));
    HX.dispatch(HX.opAdd(g, nodes, edges, '复制 ' + nodes.length + ' 个节点')); HX.select(nodes.map(n => n.id));
  };
  HX.cloneGraph = function (g) {
    const map = new Map(), nodes = [];
    g.nodes.forEach(o => { const n = HX.mk(o.type, o.label, Object.assign({}, o.params), o.children ? HX.cloneGraph(o.children) : null); n.x = o.x; n.y = o.y; map.set(o.id, n); nodes.push(n); });
    return HX.newGraph(nodes, [...g.edges.values()].map(e => HX.edge(map.get(e.f), e.fp, map.get(e.t), e.tp)));
  };
  /** ⌘G 封装：选中节点 → 子图引用；跨边界的连线改接到入口 / 出口 */
  HX.group = function (actor) {
    const g = HX.cur(), ids = [...S.sel].filter(id => g.nodes.has(id));
    if (ids.length < 2) { HX.toast('先选中至少 2 个节点', 'Shift + 点击或 Shift + 拖动框选'); return; }
    const set = new Set(ids), inside = ids.map(id => g.nodes.get(id)), b = HX.bounds(g, set);
    let sub;
    const op = HX.opStruct(g, 'group', '封装 ' + ids.length + ' 个节点为子图', gg => {
      const inE = [...gg.edges.values()].filter(e => !set.has(e.f) && set.has(e.t)), outE = [...gg.edges.values()].filter(e => set.has(e.f) && !set.has(e.t));
      const en = HX.mk('子图端口', '入口', { role: 'entry' }), ex = HX.mk('子图端口', '出口', { role: 'exit' });
      en.x = b.x0 - 260; en.y = b.y0; ex.x = b.x1 + 60; ex.y = b.y0;
      const ch = HX.newGraph([en, ex].concat(inside), [...gg.edges.values()].filter(e => set.has(e.f) && set.has(e.t)));
      inE.forEach(e => { const x = HX.edge(en, 'out', e.t, e.tp); ch.edges.set(x.id, x); });
      outE.forEach(e => { const x = HX.edge(e.f, e.fp, ex, 'in'); ch.edges.set(x.id, x); });
      sub = HX.mk('子图引用', '新子图', { ref: '新子图@v0.1' }, ch); sub.x = HX.snap(b.x0); sub.y = HX.snap(b.y0);
      [...gg.edges.values()].forEach(e => { if (set.has(e.f) || set.has(e.t)) gg.edges.delete(e.id); });
      ids.forEach(id => gg.nodes.delete(id)); gg.nodes.set(sub.id, sub);
      const seen = new Set();
      inE.forEach(e => { const key = e.f + e.fp; if (seen.has(key)) return; seen.add(key); const x = HX.edge(e.f, e.fp, sub, 'in'); gg.edges.set(x.id, x); });
      outE.forEach(e => { const x = HX.edge(sub, 'out', e.t, e.tp); gg.edges.set(x.id, x); });
    });
    op.actor = actor || 'user';
    HX.dispatch(op); HX.select([sub.id]); HX.flash(sub.id, 'is-justdone');
    HX.toast('已封装为子图「新子图」', '双击进入；外部连线已改接到入口和出口', { undo: true });
  };
  /** ⌘⇧G 解散子图：内部节点回到当前层，入口/出口两侧的连线直连 */
  HX.ungroup = function () {
    const g = HX.cur(), n = [...S.sel].map(id => g.nodes.get(id)).find(x => x && x.children);
    if (!n) { HX.toast('选中一个子图节点再解散'); return; }
    const ch = n.children, ports = [...ch.nodes.values()].filter(x => x.type === '子图端口'), pset = new Set(ports.map(p => p.id));
    const keep = [...ch.nodes.values()].filter(x => !pset.has(x.id)), b = HX.bounds(ch, new Set(keep.map(x => x.id)));
    const op = HX.opStruct(g, 'ungroup', '解散子图 ' + n.label, gg => {
      const inE = [...gg.edges.values()].filter(e => e.t === n.id), outE = [...gg.edges.values()].filter(e => e.f === n.id);
      [...inE, ...outE].forEach(e => gg.edges.delete(e.id)); gg.nodes.delete(n.id);
      keep.forEach(x => { x.x += n.x - b.x0; x.y += n.y - b.y0; gg.nodes.set(x.id, x); });
      ch.edges.forEach(e => {
        if (!pset.has(e.f) && !pset.has(e.t)) gg.edges.set(e.id, e);
        else if (pset.has(e.f)) inE.forEach(s => { const x = HX.edge(s.f, s.fp, e.t, e.tp); gg.edges.set(x.id, x); });
        else if (pset.has(e.t)) outE.forEach(t => { const x = HX.edge(e.f, e.fp, t.t, t.tp); gg.edges.set(x.id, x); });
      });
    });
    HX.dispatch(op); HX.select(keep.map(x => x.id));
  };
  /** L：自动布局，带位移动画，结束后记为一条 move op */
  HX.autoLayout = function (actor) {
    const g = HX.cur(), pos = HX.layout(g, { cols: g.nodes.size > 12 ? 6 : 99 }), moves = [];
    const b = HX.bounds(g);
    pos.forEach((p, id) => { const n = g.nodes.get(id); moves.push({ id: id, from: { x: n.x, y: n.y }, to: { x: HX.snap(p.x + b.x0), y: HX.snap(p.y + b.y0) } }); });
    const t0 = performance.now(), ms = HX.css('--hx-t-4') === '0ms' ? 1 : 420;
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = HX.ease(t);
      moves.forEach(m => { const n = g.nodes.get(m.id); n.x = m.from.x + (m.to.x - m.from.x) * e; n.y = m.from.y + (m.to.y - m.from.y) * e; HX.moveNodeEl(n); });
      HX.renderEdges();
      if (t < 1) requestAnimationFrame(step);
      else { moves.forEach(m => { const n = g.nodes.get(m.id); n.x = m.from.x; n.y = m.from.y; }); HX.dispatch(Object.assign(HX.opMove(g, moves, '自动布局'), { actor: actor || 'user' })); HX.fit(); }
    };
    requestAnimationFrame(step);
  };
  /** 进入 / 退出子图（视图过渡 + 面包屑） */
  HX.enter = function (n) {
    S.stack.push({ label: n.label, g: n.children, node: n }); HX.switchGraph('enter');
  };
  HX.goto = function (i) { if (i >= S.stack.length - 1) return; const leaving = S.stack.slice(i + 1); S.stack.length = i + 1; leaving.forEach(s => s.node && HX.touch(s.node)); HX.switchGraph('leave'); };
  HX.switchGraph = function (dir) {
    S.sel.clear(); S.selEdge = null; HX.resetDOM(); HX.sync(); HX.renderCrumb(); HX.renderInsp();
    Object.assign(S.view, HX.fitTarget()); HX.renderView();
    const l = $('layer'); l.classList.remove('is-enter', 'is-leave'); void l.offsetWidth; l.classList.add(dir === 'enter' ? 'is-enter' : 'is-leave');
  };
  HX.renderCrumb = function () {
    $('crumb').innerHTML = S.stack.map((s, i) => (i ? '<i>/</i>' : '') + '<button data-ci="' + i + '" class="' + (i === S.stack.length - 1 ? 'is-cur' : '') + '">' + esc(s.label) + '</button>').join('');
  };
  $('crumb').addEventListener('click', e => { const b = e.target.closest('[data-ci]'); if (b) HX.goto(+b.dataset.ci); });

  /* ---------------- 快速添加（A、双击空白、拖线到空白） ---------------- */
  let quickCtx = null, quickList = [], quickAct = 0;
  HX.openQuick = function (cx, cy, ctx) {
    quickCtx = ctx || {}; const q = $('quick');
    const t = quickCtx.type;
    q.innerHTML = '<div class="hx-quick__h">' + (t ? '<i style="--pc:' + HX.tc(t) + '"></i>可接收「' + HX.TYPE[t].n + '」的节点' : '添加节点') + '</div><input class="hx-input is-sm" id="quickIn" placeholder="搜索节点…"><div class="hx-menu" id="quickList"></div>';
    q.hidden = false;
    q.style.left = Math.min(cx, innerWidth - 270) + 'px'; q.style.top = Math.min(cy, innerHeight - 330) + 'px';
    const inp = $('quickIn'); inp.addEventListener('input', renderQuick); inp.addEventListener('keydown', quickKey);
    renderQuick(); inp.focus();
  };
  function quickOptions() {
    const t = quickCtx.type, f = ($('quickIn') && $('quickIn').value || '').trim().toLowerCase();
    return HX.TYPES.filter(ty => (!t || HX.DEF[ty].in.some(p => HX.compat(t, p[1]).ok)) && (!f || (ty + HX.DEF[ty].desc).toLowerCase().indexOf(f) >= 0));
  }
  function renderQuick() {
    quickList = quickOptions(); quickAct = 0;
    $('quickList').innerHTML = quickList.length ? quickList.map((ty, i) => '<button class="hx-menu__i is-2l' + (i === 0 ? ' is-act' : '') + '" data-q="' + i + '"><span class="hx-node__ico">' + HX.ICON[ty] + '</span><span>' + esc(ty) + '<span class="hx-menu__d">' + esc(HX.DEF[ty].desc) + '</span></span></button>').join('')
      : '<div class="hx-menu__h">没有可接收该类型的节点</div>';
    $('quickList').onclick = e => { const b = e.target.closest('[data-q]'); if (b) pickQuick(+b.dataset.q); };
  }
  function quickKey(e) {
    e.stopPropagation();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); quickAct = (quickAct + (e.key === 'ArrowDown' ? 1 : -1) + quickList.length) % quickList.length; $('quickList').querySelectorAll('[data-q]').forEach((b, i) => b.classList.toggle('is-act', i === quickAct)); }
    if (e.key === 'Enter') pickQuick(quickAct);
    if (e.key === 'Escape') $('quick').hidden = true;
  }
  function pickQuick(i) {
    const ty = quickList[i]; if (!ty) return; $('quick').hidden = true;
    const g = HX.cur(), c = quickCtx, at = c.at || HX.toWorld(innerWidth / 2, innerHeight / 2);
    const n = HX.mk(ty); n.x = HX.snap(at[0] + (c.from ? 24 : 0)); n.y = HX.snap(at[1] - 50);
    const inP = c.type ? HX.ports(n).in.find(p => HX.compat(c.type, p[1]).ok) : null;
    if (c.insert) {
      const ed = c.insert, outP = HX.ports(n).out.find(p => HX.compat(p[1], HX.portType(g.nodes.get(ed.t), ed.tp, 'in')).ok);
      const es = [HX.edge(ed.f, ed.fp, n, inP[0])]; if (outP) es.push(HX.edge(n, outP[0], ed.t, ed.tp));
      HX.dispatch(HX.opAdd(g, [n], es, '在连线上插入 ' + ty, [ed]));
    } else if (c.from && inP) HX.dispatch(HX.opAdd(g, [n], [HX.edge(c.from, c.fp, n, inP[0])], '添加 ' + ty + ' 并连线'));
    else HX.dispatch(HX.opAdd(g, [n], []));
    HX.select([n.id]); HX.flash(n.id, 'is-justdone');
  }

  /* ---------------- 右键菜单 ---------------- */
  HX.ctxMenu = function (e) {
    const ne = e.target.closest('.hx-node'), hit = e.target.closest('.hx-edge-hit'), I = HX.UI, g = HX.cur();
    if (ne) {
      const id = ne.dataset.id, n = g.nodes.get(id); if (!S.sel.has(id)) HX.select([id]);
      HX.menu(e.clientX, e.clientY, [{ header: n.label + ' · ' + n.type },
        n.children ? { label: '进入子图', icon: I.enter, kbd: '↵', act: () => HX.enter(n) } : null,
        { label: '重命名', icon: I.pointer, kbd: 'F2', act: () => { const i = document.querySelector('.hx-insp__name'); if (i) { i.focus(); i.select(); } } },
        { label: '复制', icon: I.copy, kbd: '⌘D', act: HX.duplicate },
        { label: '封装为子图', icon: I.group, kbd: '⌘G', act: () => HX.group(), disabled: S.sel.size < 2 },
        n.children ? { label: '解散子图', icon: I.layout, kbd: '⌘⇧G', act: HX.ungroup } : null,
        { label: '聚焦', icon: I.fit, kbd: '2', act: () => HX.fit(true, new Set(S.sel)) },
        { sep: 1 }, { label: '删除', icon: I.trash, kbd: 'Del', danger: 1, act: HX.deleteSel }].filter(Boolean));
    } else if (hit) {
      const ed = g.edges.get(hit.dataset.eid); S.sel.clear(); S.selEdge = ed.id; HX.selChanged();
      HX.menu(e.clientX, e.clientY, [{ header: '连线' },
        { label: '插入节点…', icon: I.plus, act: () => HX.openQuick(e.clientX, e.clientY, { type: HX.portType(g.nodes.get(ed.f), ed.fp, 'out'), insert: ed, at: [ed._mx - 118, ed._my - 40] }) },
        { sep: 1 }, { label: '删除连线', icon: I.trash, kbd: 'Del', danger: 1, act: HX.deleteSel }]);
    } else {
      const at = HX.toWorld(e.clientX, e.clientY);
      HX.menu(e.clientX, e.clientY, [{ header: '画布' },
        { label: '添加节点…', icon: I.plus, kbd: 'A', act: () => HX.openQuick(e.clientX, e.clientY, { at: at }) },
        { label: '自动布局', icon: I.layout, kbd: 'L', act: () => HX.autoLayout() },
        { label: '适应视图', icon: I.fit, kbd: '1', act: () => HX.fit() },
        { label: '全选', icon: I.pointer, kbd: '⌘A', act: () => HX.select([...g.nodes.keys()]) },
        { sep: 1 }, { label: '命令面板', icon: I.cmd, kbd: '⌘K', act: HX.openCmdk }]);
    }
  };

  /* ---------------- 命令面板 ⌘K ---------------- */
  let cmdList = [], cmdAct = 0;
  function commands() {
    const I = HX.UI, c = [
      { g: '运行', label: '运行', kbd: '⌘↵', icon: I.play, act: () => HX.run.start() }, { g: '运行', label: '急停', kbd: '⌘.', icon: I.stop, act: () => HX.run.estop() },
      { g: '画布', label: '适应视图', kbd: '1', icon: I.fit, act: () => HX.fit() }, { g: '画布', label: '自动布局', kbd: 'L', icon: I.layout, act: () => HX.autoLayout() },
      { g: '画布', label: '封装为子图', kbd: '⌘G', icon: I.group, act: () => HX.group() }, { g: '画布', label: '撤销', kbd: '⌘Z', icon: I.undo, act: HX.undo }, { g: '画布', label: '重做', kbd: '⌘⇧Z', icon: I.redo, act: HX.redo },
      { g: '画布', label: '显示 / 隐藏面板', kbd: 'Tab', icon: I.lib, act: HX.toggleFocus },
      { g: '视图', label: '切换浅色 / 深色主题', icon: I.moon, act: HX.toggleTheme }, { g: '视图', label: '全屏', kbd: 'F', icon: I.expand, act: HX.toggleFull },
      { g: '调试', label: '压力测试：200 节点 · 300 连线', desc: '生成大图并显示实时 FPS', icon: I.gauge, act: HX.stress }, { g: '调试', label: '重新载入示例图', icon: I.history, act: HX.reloadTemplate }
    ];
    [0, 1, 2, 3, 4].forEach(l => c.push({ g: '授权', label: '模型授权档位 → ' + l + ' ' + HX.LEVELS[l][0], icon: I.model, act: () => HX.setLevel(l) }));
    HX.TYPES.forEach(t => c.push({ g: '添加节点', label: t, desc: HX.DEF[t].desc, icon: '<span class="hx-node__ico">' + HX.ICON[t] + '</span>', act: () => { const w = HX.toWorld(HX.vpBox.left + HX.vw / 2, HX.vpBox.top + HX.vh / 2); HX.addNodeAt(t, w[0] - 118, w[1] - 60); } }));
    return c;
  }
  HX.openCmdk = function () { if (!S.open) HX.open(); $('cmdk').hidden = false; const i = $('cmdkIn'); i.value = ''; renderCmd(); i.focus(); };
  function renderCmd() {
    const f = $('cmdkIn').value.trim().toLowerCase(); cmdList = commands().filter(c => !f || (c.label + (c.desc || '') + c.g).toLowerCase().indexOf(f) >= 0); cmdAct = 0;
    let h = '', grp = '';
    cmdList.forEach((c, i) => { if (c.g !== grp) { grp = c.g; h += '<div class="hx-menu__h">' + esc(grp) + '</div>'; } h += '<button class="hx-menu__i' + (c.desc ? ' is-2l' : '') + (i === 0 ? ' is-act' : '') + '" data-c="' + i + '">' + c.icon + '<span>' + esc(c.label) + (c.desc ? '<span class="hx-menu__d">' + esc(c.desc) + '</span>' : '') + '</span>' + (c.kbd ? '<kbd>' + c.kbd + '</kbd>' : '') + '</button>'; });
    $('cmdkList').innerHTML = h || '<div class="hx-menu__h">没有匹配的命令</div>';
  }
  function runCmd(i) { const c = cmdList[i]; $('cmdk').hidden = true; if (c) c.act(); }
  $('cmdkIn').addEventListener('input', renderCmd);
  $('cmdkIn').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cmdAct = (cmdAct + (e.key === 'ArrowDown' ? 1 : -1) + cmdList.length) % Math.max(1, cmdList.length); $('cmdkList').querySelectorAll('[data-c]').forEach((b, i) => { b.classList.toggle('is-act', i === cmdAct); if (i === cmdAct) b.scrollIntoView({ block: 'nearest' }); }); }
    if (e.key === 'Enter') runCmd(cmdAct);
    if (e.key === 'Escape') $('cmdk').hidden = true;
  });
  $('cmdkList').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) runCmd(+b.dataset.c); });
  $('cmdk').addEventListener('pointerdown', e => { if (e.target.id === 'cmdk') $('cmdk').hidden = true; });

  /* ---------------- 快捷键（DESIGN.md §10） ---------------- */
  document.addEventListener('keydown', e => {
    const k = e.key, typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (mod(e) && k.toLowerCase() === 'k') { e.preventDefault(); HX.openCmdk(); return; }
    if (typing) return;
    if (!S.open) { if (k === 'f' || k === 'F') { e.preventDefault(); HX.open(); } return; }
    if (k === ' ') { if (!e.repeat) HX.setSpace(true); e.preventDefault(); return; }
    if (mod(e)) {
      const l = k.toLowerCase();
      if (l === 'z') { e.preventDefault(); if (e.shiftKey) HX.redo(); else HX.undo(); }
      else if (l === 'y') { e.preventDefault(); HX.redo(); }
      else if (l === 'a') { e.preventDefault(); HX.select([...HX.cur().nodes.keys()]); }
      else if (l === 'd') { e.preventDefault(); HX.duplicate(); }
      else if (l === 'g') { e.preventDefault(); if (e.shiftKey) HX.ungroup(); else HX.group(); }
      else if (k === 'Enter') { e.preventDefault(); HX.run.start(); }
      else if (k === '.') { e.preventDefault(); HX.run.estop(); }
      return;
    }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[k] && S.sel.size) {
      e.preventDefault(); const g = HX.cur(), d = arrows[k], st = (e.shiftKey ? 5 : 1) * HX.L.GRID;
      HX.dispatch(HX.opMove(g, [...S.sel].map(id => { const n = g.nodes.get(id); return { id: id, from: { x: n.x, y: n.y }, to: { x: n.x + d[0] * st, y: n.y + d[1] * st } }; }), '微移'));
      return;
    }
    switch (k) {
      case 'Delete': case 'Backspace': e.preventDefault(); HX.deleteSel(); break;
      case 'Escape':
        if (!$('menu').hidden || !$('quick').hidden || !$('pop').hidden) HX.closeFloating();
        else if (S.sel.size || S.selEdge) { S.sel.clear(); S.selEdge = null; HX.selChanged(); }
        else if (S.stack.length > 1) HX.goto(S.stack.length - 2);
        else if (S.full) HX.toggleFull(); else HX.close();
        break;
      case 'Enter': { const n = [...S.sel].map(id => HX.cur().nodes.get(id)).find(x => x && x.children); if (n) HX.enter(n); break; }
      case 'v': case 'V': HX.setTool('select'); break;
      case 'h': case 'H': HX.setTool('hand'); break;
      case 'a': case 'A': { e.preventDefault(); const r = HX.vpBox; HX.openQuick(r.left + HX.vw / 2 - 130, r.top + HX.vh / 2 - 150, { at: HX.toWorld(r.left + HX.vw / 2, r.top + HX.vh / 2) }); break; }
      case 'l': case 'L': HX.autoLayout(); break;
      case '1': HX.fit(); break;
      case '2': if (S.sel.size) HX.fit(true, new Set(S.sel)); break;
      case 'f': case 'F': HX.toggleFull(); break;
      case 'Tab': e.preventDefault(); HX.toggleFocus(); break;
      case '/': e.preventDefault(); HX.showLib(true); $('libSearch').focus(); break;
      case 'F2': { const i = document.querySelector('.hx-insp__name'); if (i) { i.focus(); i.select(); } break; }
    }
  });
  document.addEventListener('keyup', e => { if (e.key === ' ') HX.setSpace(false); });
  HX.setTool = function (t) { S.tool = t; HX.setSpace(false); document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('is-on', b.dataset.tool === t)); };
})(window.HX);

/* ===== 27_panels.js · 节点库、检查器、运行抽屉、通知、提示、授权档位、停靠栏 ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(s), I = HX.UI;

  /* ---------------- 分段控件滑块 ---------------- */
  HX.segThumb = function (seg) {
    const th = seg.querySelector('.hx-seg__thumb'), on = seg.querySelector('button.is-on'); if (!th || !on) return;
    th.style.width = on.offsetWidth + 'px'; th.style.transform = 'translateX(' + (on.offsetLeft - 2) + 'px)'; th.style.left = '2px';
  };
  function bindSeg(id, fn) {
    const seg = $(id);
    seg.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; seg.querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === b)); HX.segThumb(seg); fn(b.dataset.v); });
    requestAnimationFrame(() => HX.segThumb(seg));
  }

  /* ---------------- 节点库 ---------------- */
  let libTab = 'atom';
  HX.renderLib = function () {
    const f = $('libSearch').value.trim().toLowerCase(); let h = '';
    if (libTab === 'atom') {
      HX.CATS.forEach(c => {
        const items = HX.TYPES.filter(t => HX.DEF[t].cat === c && (!f || (t + HX.DEF[t].desc).toLowerCase().indexOf(f) >= 0));
        if (!items.length) return;
        h += '<div class="hx-lib__grp">' + c + '</div>' + items.map(t => '<button class="hx-lib__item" draggable="true" data-type="' + t + '"><span class="hx-node__ico">' + HX.ICON[t] + '</span><span class="hx-lib__txt"><b>' + t + '</b><span>' + esc(HX.DEF[t].desc) + '</span></span></button>').join('');
      });
    } else if (libTab === 'sub') {
      h = '<div class="hx-lib__grp">子图库</div>' + [['闭环迭代', '智囊团 → 决策 → 执行 → 验收'], ['生成-评审', '生成 → 评审 → 不通过回到生成'], ['资料采集', '检索 → 清洗 → 摘要']].map(s => '<button class="hx-lib__item" draggable="true" data-type="子图引用" data-label="' + s[0] + '"><span class="hx-node__ico">' + HX.ICON['子图引用'] + '</span><span class="hx-lib__txt"><b>' + s[0] + '</b><span>' + s[1] + '</span></span></button>').join('');
    } else {
      h = '<div class="hx-lib__grp">已安装扩展包</div>' + [['闭环模板包', '10 种业务类型 · 6 套配方'], ['代码评审包', '评审意见@1 · 评审配方']].map(s => '<div class="hx-lib__item" style="cursor:default"><span class="hx-node__ico">' + I.lib + '</span><span class="hx-lib__txt"><b>' + s[0] + '</b><span>' + s[1] + '</span></span></div>').join('');
    }
    $('libList').innerHTML = h || '<div class="hx-insp__empty">没有匹配的节点</div>';
  };
  HX.showLib = function (on) { $('lib').classList.toggle('is-collapsed', !on); $('libOpen').hidden = on; };

  /* ---------------- 检查器 ---------------- */
  const sec = (title, body, closed) => '<div class="hx-sec' + (closed ? ' is-closed' : '') + '"><button class="hx-sec__h">' + title + I.chevd + '</button><div class="hx-sec__b">' + body + '</div></div>';
  HX.renderInsp = function () {
    const el = $('insp'), g = HX.cur();
    if (el.contains(document.activeElement) && document.activeElement.matches('input')) return;
    if (S.selEdge) {
      const e = g.edges.get(S.selEdge); if (!e) { el.classList.add('is-off'); return; }
      const a = g.nodes.get(e.f), b = g.nodes.get(e.t), t = HX.portType(a, e.fp, 'out');
      el.innerHTML = '<div class="hx-insp__head"><span class="hx-node__ico" style="color:' + HX.tc(t) + '">' + I.port + '</span><div style="min-width:0"><div class="hx-insp__name" style="cursor:default">连线</div><div class="hx-insp__sub">' + esc(a.label) + '.' + e.fp + ' → ' + esc(b.label) + '.' + e.tp + '</div></div></div>' +
        '<div class="hx-insp__body">' + sec('数据', '<dl class="hx-kv"><dt>类型</dt><dd style="color:' + HX.tc(t) + '">' + HX.TYPE[t].n + '</dd><dt>源</dt><dd>' + esc(a.label) + '</dd><dt>目标</dt><dd>' + esc(b.label) + '</dd></dl>') + '</div>' +
        '<div class="hx-insp__foot"><button class="hx-btn is-sm is-danger" data-ia="del">' + I.trash + '删除连线</button></div>';
      el.classList.remove('is-off'); return;
    }
    if (S.sel.size > 1) {
      el.innerHTML = '<div class="hx-insp__head"><span class="hx-node__ico">' + I.group + '</span><div><div class="hx-insp__name" style="cursor:default">已选 ' + S.sel.size + ' 个节点</div><div class="hx-insp__sub">可以一起拖动、封装或删除</div></div></div>' +
        '<div class="hx-insp__body"><div class="hx-insp__empty">封装后，这组节点会变成一个子图节点，外部连线自动改接到子图的入口和出口。子图可以存进子图库复用。</div></div>' +
        '<div class="hx-insp__foot"><button class="hx-btn is-sm is-primary" data-ia="group">' + I.group + '封装为子图<kbd>⌘G</kbd></button><button class="hx-btn is-sm is-danger" data-ia="del">删除</button></div>';
      el.classList.remove('is-off'); return;
    }
    const n = S.sel.size === 1 ? g.nodes.get([...S.sel][0]) : null;
    if (!n) { el.classList.add('is-off'); return; }
    const d = HX.DEF[n.type], P = HX.ports(n);
    const rows = Object.keys(d.params).map(k => {
      const pd = d.params[k], pr = n.promoted.indexOf(k) >= 0, lock = !!pd.lock;
      return '<div class="hx-prow"><label title="' + k + '">' + (lock ? I.lock : '') + esc(pd.label) + '</label><span>' + (pr ? '<span class="hx-badge">由端口提供</span>' : HX.ctlHTML(n, k, true)) + '</span>' +
        (lock ? '<span class="hx-promote" data-tip="内核锁定：' + (pd.lock === 'kernel' ? '任何人都不能修改' : '节点作者锁定') + '">' + I.lock + '</span>' : '<button class="hx-promote' + (pr ? ' is-on' : '') + '" data-promote="' + k + '" data-tip="' + (pr ? '撤回为参数' : '转为输入端口，由上游提供') + '">' + I.port + '</button>') + '</div>';
    }).join('');
    const plist = (arr, dir) => arr.map(p => { const c = [...g.edges.values()].filter(e => dir === 'in' ? e.t === n.id && e.tp === p[0] : e.f === n.id && e.fp === p[0]).length; return '<div style="--pc:' + HX.tc(p[1]) + '"><i></i>' + esc(p[0]) + '<em>' + HX.TYPE[p[1]].n + ' · ' + c + '</em></div>'; }).join('');
    const stb = { idle: '', queued: '<span class="hx-badge">排队</span>', running: '<span class="hx-badge is-run">运行中</span>', done: '<span class="hx-badge is-ok">完成</span>', failed: '<span class="hx-badge is-bad">失败</span>', waiting: '<span class="hx-badge is-wait">等待审批</span>', skipped: '<span class="hx-badge">跳过</span>', cached: '<span class="hx-badge">缓存</span>' }[n.status];
    el.innerHTML = '<div class="hx-insp__head"><span class="hx-node__ico">' + HX.ICON[n.type] + '</span><div style="flex:1;min-width:0"><input class="hx-insp__name" value="' + esc(n.label) + '" data-ia="label" spellcheck="false"><div class="hx-insp__sub">' + n.type + ' · ' + d.cat + ' · ' + n.id + '</div></div>' + stb + '</div>' +
      '<div class="hx-insp__body">' + sec('参数', rows) + sec('端口', '<div class="hx-plist">' + plist(P.in, 'in') + plist(P.out, 'out') + '</div>') +
      sec('运行', '<dl class="hx-kv"><dt>状态</dt><dd>' + n.status + '</dd><dt>进度</dt><dd>' + Math.round(n.prog) + '%</dd><dt>耗时</dt><dd>' + (n.meta || '—') + '</dd><dt>说明</dt><dd>' + esc(n.sub || '—') + '</dd></dl>', n.status === 'idle') +
      (n.ai ? sec('模型记录', '<div class="hx-modelrec"><b>模型' + (n.ghost ? '提议' : '修改') + '</b> · 档位 ' + n.ai.level + ' · ' + n.ai.time + '<br>' + esc(n.ai.reason) + '</div>') : '') + '</div>' +
      '<div class="hx-insp__foot">' + (n.children ? '<button class="hx-btn is-sm" data-ia="enter">' + I.enter + '进入子图<kbd>↵</kbd></button>' : '') + '<span class="sp"></span><button class="hx-btn is-sm is-ghost" data-ia="dup">' + I.copy + '复制</button><button class="hx-btn is-sm is-danger" data-ia="del">' + I.trash + '</button></div>';
    el.classList.remove('is-off');
  };
  $('insp').addEventListener('click', e => {
    const s = e.target.closest('.hx-sec__h'); if (s) { s.parentElement.classList.toggle('is-closed'); return; }
    const pr = e.target.closest('[data-promote]'); const g = HX.cur(), n = g.nodes.get([...S.sel][0]);
    if (pr && n) { HX.dispatch(HX.opPromote(g, n, pr.dataset.promote)); return; }
    const a = e.target.closest('[data-ia]'); if (!a) return;
    ({ del: HX.deleteSel, group: () => HX.group(), dup: HX.duplicate, enter: () => n && HX.enter(n) })[a.dataset.ia] && ({ del: HX.deleteSel, group: () => HX.group(), dup: HX.duplicate, enter: () => n && HX.enter(n) })[a.dataset.ia]();
  });
  $('insp').addEventListener('change', e => {
    if (e.target.dataset.ia !== 'label') return; const g = HX.cur(), n = g.nodes.get([...S.sel][0]);
    const v = e.target.value.trim(); if (n && v && v !== n.label) { e.target.blur(); HX.dispatch(HX.opLabel(g, n, v)); }
  });
  $('insp').addEventListener('keydown', e => { if (e.target.dataset.ia === 'label' && e.key === 'Enter') e.target.blur(); });

  /* ---------------- 运行抽屉 ---------------- */
  let tab = 'tl';
  HX.renderDrawer = function () {
    $('paneTl').hidden = tab !== 'tl'; $('paneLog').hidden = tab !== 'log'; $('paneHist').hidden = tab !== 'hist';
    if (tab === 'tl') HX.renderTimeline(); if (tab === 'hist') HX.renderHistory();
  };
  HX.renderTimeline = function () {
    const R = HX.run.R, el = $('paneTl'); if (tab !== 'tl') return;
    if (!R || !R.spans.length) { el.innerHTML = '<div class="hx-tl__empty">运行后，这里按节点显示执行区间：并行的执行者重叠显示，挂起显示为虚线框。</div>'; return; }
    const now = R.end || performance.now(), T = Math.max(1, now - R.t0);
    el.innerHTML = R.spans.slice(-40).map(s => { const l = (s.a - R.t0) / T * 100, w = ((s.b || now) - s.a) / T * 100;
      return '<div class="hx-tl__row"><span class="hx-tl__lbl" style="padding-left:' + (12 + s.depth * 14) + 'px">' + esc(s.label) + '</span><span class="hx-tl__trk"><i class="hx-tl__bar is-' + s.st + '" style="left:' + l.toFixed(2) + '%;width:' + Math.max(0.3, w).toFixed(2) + '%"></i></span></div>'; }).join('');
  };
  HX.log = function (path, msg, tone) {
    const R = HX.run.R, el = $('paneLog'), t = R ? ((performance.now() - R.t0) / 1000).toFixed(1) + 's' : '';
    if (el.querySelector('.hx-log__empty')) el.innerHTML = '';
    el.insertAdjacentHTML('beforeend', '<div><span class="t">' + t + '</span><span class="p">' + esc(path) + '</span><span class="' + (tone || '') + '">' + esc(msg) + '</span></div>');
    if (!el.hidden) $('drawerBody').scrollTop = 1e9;
  };
  HX.renderHistory = function () {
    if (tab !== 'hist') return;
    const all = S.past.map(o => [o, 0]).concat(S.future.slice().reverse().map(o => [o, 1])).reverse();
    $('paneHist').innerHTML = all.length ? all.map(([o, undone], i) => '<div class="hx-hist__row' + (undone ? ' is-undone' : '') + '"><span class="t">' + new Date(o.at).toTimeString().slice(0, 8) + '</span><span class="hx-badge' + (o.actor === 'model' ? ' is-model' : '') + '">' + (o.actor === 'model' ? '模型' : o.actor === 'system' ? '系统' : '你') + '</span><span>' + esc(o.label) + (o.reason ? '<br><span class="r">理由：' + esc(o.reason) + '</span>' : '') + '</span>' +
      (undone ? '<span class="r">已撤销</span>' : '<button class="hx-btn is-sm is-ghost" data-h="' + S.past.indexOf(o) + '">回到此前</button>') + '</div>').join('') : '<div class="hx-log__empty">还没有操作。你和模型做的每一步都会记在这里，可以撤销。</div>';
  };
  $('paneHist').addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (b) { HX.undoTo(S.past[+b.dataset.h]); } });
  HX.metrics = function () {
    const R = HX.run.R, el = $('metrics');
    if (!R) { el.innerHTML = '<span>用时<b>0.0s</b></span><span>tokens<b>0</b></span><span>节点执行<b>0</b></span>'; return; }
    const t = ((R.end || performance.now()) - R.t0) / 1000;
    el.innerHTML = '<span>用时<b>' + t.toFixed(1) + 's</b></span><span>tokens<b>' + (R.tokens / 1000).toFixed(1) + 'k</b></span><span>节点执行<b>' + R.count + '</b></span><span class="is-path">' + esc(R.path || '') + '</span>';
  };

  /* ---------------- 通知 ---------------- */
  HX.toast = function (title, sub, opt) {
    opt = opt || {}; const el = document.createElement('div');
    el.className = 'hx-toast' + (opt.tone ? ' is-' + opt.tone : '');
    el.innerHTML = '<span class="hx-toast__i"></span><div class="hx-toast__b">' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (opt.undo ? '<button class="hx-btn is-sm is-ghost">撤销</button>' : '');
    if (opt.undo) el.querySelector('button').onclick = () => { HX.undo(); close(); };
    const box = $('toasts'); box.appendChild(el); while (box.children.length > 4) box.firstChild.remove();
    const close = () => { el.classList.add('is-out'); setTimeout(() => el.remove(), 200); };
    setTimeout(close, opt.ms || 4000);
  };

  /* ---------------- 提示框（延迟 400ms） ---------------- */
  let tipT = 0, tipEl = null;
  document.addEventListener('pointerover', e => {
    const t = e.target.closest && e.target.closest('[data-tip],[data-tip-model]');
    if (t === tipEl) return; tipEl = t; clearTimeout(tipT); $('tip').hidden = true;
    if (!t) return;
    tipT = setTimeout(() => {
      const tip = $('tip'), m = t.dataset.tipModel;
      tip.className = 'hx-tip' + (m ? ' is-model' : ''); tip.innerHTML = m ? '<span><b style="color:var(--hx-model)">模型修改</b> · ' + esc(m) + '<br><span style="color:var(--hx-text-3)">可在操作历史中撤销</span></span>' : esc(t.dataset.tip);
      tip.hidden = false; const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
      tip.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + 'px';
    }, 400);
  });
  document.addEventListener('pointerdown', () => { clearTimeout(tipT); $('tip').hidden = true; tipEl = null; });

  /* ---------------- 授权档位 ---------------- */
  HX.LEVELS = [['只读', '只看图、看状态、看留痕'], ['建议', '提出修改，以幽灵节点显示，由你逐条采纳'], ['部分授权', '在授权范围内直接修改，范围外仍提建议'], ['高度授权', '几乎都能直接做，只有例外项需要审批'], ['完全授权', '与你同权；保留留痕、快照与急停']];
  HX.setLevel = function (l) {
    S.level = l; const b = $('levelBtn');
    b.className = 'hx-level lv-' + l; $('levelTxt').innerHTML = '<b>' + l + '</b> ' + HX.LEVELS[l][0];
    $('levelTicks').querySelectorAll('i').forEach((t, i) => t.classList.toggle('is-on', i <= l));
    $('compHint').innerHTML = HX.UI.model.replace('<svg', '<svg style="width:12px;height:12px;color:var(--hx-model)"') + '模型授权档位 ' + l + ' · ' + HX.LEVELS[l][0];
  };
  $('levelBtn').addEventListener('click', e => {
    const p = $('pop'); if (!p.hidden) { p.hidden = true; return; }
    p.className = 'hx-pop is-wide'; p.innerHTML = '<div class="hx-pop__h">' + HX.UI.model.replace('<svg', '<svg style="width:12px;height:12px;color:var(--hx-model)"') + '模型授权档位 · 随时可改，在安全点生效</div>' +
      HX.LEVELS.map((L, i) => '<button class="hx-menu__i is-2l' + (i === S.level ? ' is-on' : '') + '" data-lv="' + i + '"><span class="mono" style="width:16px;color:var(--hx-text-3)">' + i + '</span><span>' + L[0] + '<span class="hx-menu__d">' + L[1] + '</span></span></button>').join('');
    const r = e.currentTarget.getBoundingClientRect(); p.hidden = false; p.style.left = Math.min(r.left, innerWidth - 390) + 'px'; p.style.top = r.bottom + 6 + 'px';
  });
  $('pop').addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (!b) return; HX.setLevel(+b.dataset.lv); $('pop').hidden = true; HX.toast('模型授权档位已调到 ' + b.dataset.lv + ' · ' + HX.LEVELS[+b.dataset.lv][0], '在下一个安全点生效'); });

  /* ---------------- 停靠栏、抽屉、绑定 ---------------- */
  HX.toggleFocus = function () { S.focus = !S.focus; $('stage').classList.toggle('is-focus', S.focus); };
  HX.bindPanels = function () {
    $('dock').innerHTML = [['select', 'pointer', '选择 · V'], ['hand', 'hand', '平移 · H 或按住 Space']].map(t => '<button class="hx-iconbtn' + (t[0] === 'select' ? ' is-on' : '') + '" data-tool="' + t[0] + '" data-tip="' + t[2] + '">' + I[t[1]] + '</button>').join('') +
      '<span class="hx-dock__div"></span>' + [['add', 'plus', '添加节点 · A'], ['group', 'group', '封装为子图 · ⌘G'], ['layout', 'layout', '自动布局 · L'], ['fit', 'fit', '适应视图 · 1'], ['undo', 'undo', '撤销 · ⌘Z'], ['redo', 'redo', '重做 · ⌘⇧Z'], ['cmd', 'cmd', '命令面板 · ⌘K']].map(t => '<button class="hx-iconbtn" data-dock="' + t[0] + '" data-tip="' + t[2] + '">' + I[t[1]] + '</button>').join('');
    $('dock').addEventListener('click', e => {
      const t = e.target.closest('[data-tool]'); if (t) { HX.setTool(t.dataset.tool); return; }
      const b = e.target.closest('[data-dock]'); if (!b) return; const r = b.getBoundingClientRect();
      ({ add: () => HX.openQuick(r.left - 110, r.top - 340, { at: HX.toWorld(HX.vpBox.left + HX.vw / 2, HX.vpBox.top + HX.vh / 2) }), group: () => HX.group(), layout: () => HX.autoLayout(), fit: () => HX.fit(), undo: HX.undo, redo: HX.redo, cmd: HX.openCmdk })[b.dataset.dock]();
    });
    $('libSearch').addEventListener('input', HX.renderLib);
    $('libSearch').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') e.target.blur(); });
    $('libList').addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (!b) return; const w = HX.toWorld(HX.vpBox.left + HX.vw / 2, HX.vpBox.top + HX.vh / 2); const n = HX.addNodeAt(b.dataset.type, w[0] - 118 + Math.random() * 40, w[1] - 60 + Math.random() * 40); if (b.dataset.label) HX.dispatch(HX.opLabel(HX.cur(), n, b.dataset.label)); });
    $('libList').addEventListener('dragstart', e => { const b = e.target.closest('[data-type]'); if (b) { e.dataTransfer.setData('text/hx-node', b.dataset.type); e.dataTransfer.effectAllowed = 'copy'; } });
    $('libClose').onclick = () => HX.showLib(false); $('libOpen').onclick = () => HX.showLib(true);
    bindSeg('libTabs', v => { libTab = v; HX.renderLib(); });
    bindSeg('drawerTabs', v => { tab = v; HX.renderDrawer(); });
    $('drawerToggle').onclick = () => { $('drawer').classList.toggle('is-min'); requestAnimationFrame(() => { HX.measure(); HX.renderView(); }); };
    $('grip').addEventListener('pointerdown', e => {
      const d = $('drawer'), h0 = d.offsetHeight, y0 = e.clientY, max = $('stage').clientHeight * 0.45; d.classList.remove('is-min');
      const mv = ev => { d.style.setProperty('--hx-drawer-h', Math.max(80, Math.min(max, h0 - (ev.clientY - y0))) + 'px'); };
      const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); HX.measure(); HX.renderView(); HX.drawMini(); };
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    const mini = $('miniCv');
    const nav = ev => { const m = HX._mm; if (!m) return; const r = mini.getBoundingClientRect(); const wx = (ev.clientX - r.left - m.ox) / m.s, wy = (ev.clientY - r.top - m.oy) / m.s; S.view.x = HX.vw / 2 - wx * S.view.k; S.view.y = HX.vh / 2 - wy * S.view.k; HX.queueView(); };
    mini.addEventListener('pointerdown', e => { nav(e); const up = () => { document.removeEventListener('pointermove', nav); document.removeEventListener('pointerup', up); }; document.addEventListener('pointermove', nav); document.addEventListener('pointerup', up); });
    $('zoomIn').onclick = () => HX.zoomAt(HX.vw / 2, HX.vh / 2, 1.2); $('zoomOut').onclick = () => HX.zoomAt(HX.vw / 2, HX.vh / 2, 1 / 1.2); $('fitBtn').onclick = () => HX.fit();
    HX.renderLib(); HX.metrics();
  };
})(window.HX);

/* ===== 28_run.js · 运行模拟：拓扑执行、循环轮次、人工审批挂起、急停 ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S;
  const run = HX.run = { R: null };
  const wait = ms => new Promise((res, rej) => { const t = setTimeout(() => (run.R && run.R.stop ? rej(new Error('stop')) : res()), ms); if (run.R) run.R.timers.push({ t: t, rej: rej }); });

  function paint(n, g) { if (HX.nodeEl(n.id) && HX.cur() === g) HX.setStatus(n); }
  function paintEdge(e, g) { if (HX.cur() === g && HX.edgeEl(e.id)) HX.renderEdge(e, g); }
  function reset(g) { g.nodes.forEach(n => { n.status = 'idle'; n.prog = 0; n.sub = ''; n.meta = ''; n.activeOut = null; n.round = 0; if (n.children) reset(n.children); }); g.edges.forEach(e => { e.flow = false; }); }
  const active = (e, g) => { const s = g.nodes.get(e.f); return s && s.status === 'done' && (!s.activeOut || s.activeOut === e.fp); };

  function setUI(state) {
    const st = $('runStat'); st.className = 'hx-runstat is-' + state;
    $('runTxt').textContent = { idle: '待运行', running: '运行中', waiting: '等待审批', done: '已完成', failed: '已停止' }[state];
    $('runBtn').disabled = state === 'running' || state === 'waiting';
    $('runBtnTxt').textContent = state === 'running' || state === 'waiting' ? '运行中' : '运行';
    const cs = $('cardStatus'); cs.className = 'hx-badge' + ({ running: ' is-run', waiting: ' is-wait', done: ' is-ok', failed: ' is-bad' }[state] || ''); cs.textContent = $('runTxt').textContent;
  }

  run.start = async function () {
    if (run.R && !run.R.end) return;
    if (!S.open) HX.open();
    $('top').classList.remove('is-danger'); $('banner').hidden = true;
    reset(S.root); HX.sync();
    const R = run.R = { t0: performance.now(), tokens: 0, count: 0, spans: [], path: '', stop: false, end: 0, timers: [], pending: new Map() };
    $('paneLog').innerHTML = '';
    setUI('running');
    const tick = setInterval(() => { HX.metrics(); HX.renderTimeline(); if (!S.open) HX.drawCard(); else HX.drawMini(); }, 200);
    HX.log('根图', '开始运行 · 授权档位 ' + S.level, 'o');
    let ok = true;
    try { await runGraph(S.root, '根图', 0, {}); }
    catch (err) { ok = false; }
    clearInterval(tick); R.end = performance.now();
    HX.metrics(); HX.renderTimeline(); HX.drawCard(); HX.drawMini();
    setUI(ok ? 'done' : 'failed');
    if (ok) { HX.log('根图', '运行完成 · ' + ((R.end - R.t0) / 1000).toFixed(1) + 's · ' + (R.tokens / 1000).toFixed(1) + 'k tokens', 'o'); HX.chat.ai('运行完成：用时 <span class="k">' + ((R.end - R.t0) / 1000).toFixed(1) + 's</span>，约 <span class="k">' + (R.tokens / 1000).toFixed(1) + 'k tokens</span>，节点共执行 ' + R.count + ' 次。闭环迭代在第 2 轮通过验收。'); HX.toast('运行完成', '闭环迭代第 2 轮通过验收', { tone: 'ok' }); }
  };

  async function runGraph(g, path, depth, ctx) {
    g.nodes.forEach(n => { n.status = 'queued'; n.prog = 0; n.sub = '排队中'; n.activeOut = null; paint(n, g); });
    const levels = HX.topoLevels(g);
    for (const lv of levels) await Promise.all(lv.map(id => runNode(g.nodes.get(id), g, path, depth, ctx)));
  }

  async function runNode(n, g, path, depth, ctx) {
    const R = run.R; if (R.stop) throw new Error('stop');
    const inc = [...g.edges.values()].filter(e => e.t === n.id && !e.ghost);
    if (inc.length && inc.every(e => !active(e, g))) { n.status = 'skipped'; n.sub = ''; paint(n, g); return; }
    const p = path + '/' + n.label, t0 = performance.now();
    const span = { label: n.label, depth: depth, a: t0, b: 0, st: 'running' }; R.spans.push(span);
    n.status = 'running'; n.prog = 0; n.sub = ''; R.path = p; paint(n, g);
    inc.forEach(e => { if (active(e, g)) { e.flow = true; paintEdge(e, g); } });
    const step = async (k, ms, fn) => { for (let i = 1; i <= k; i++) { await wait(ms); n.prog = i / k * 100; if (fn) fn(i); paint(n, g); } };
    try {
      switch (n.type) {
        case 'Agent': await step(8, 150 + Math.random() * 60, i => { R.tokens += 300 + Math.random() * 260; n.sub = '生成 ' + n.params.output_schema + ' · ' + Math.round(i / 8 * 100) + '%'; }); HX.log(p, '输出 ' + n.params.output_schema); break;
        case '上下文装配': await step(3, 120, () => { n.sub = '装配 ' + (2 + Math.random() * 3).toFixed(1) + 'k tokens'; }); break;
        case '扇出': {
          const N = +n.params.n || 3, C = Math.max(1, +n.params.concurrency || 3); let done = 0;
          while (done < N) { const batch = Math.min(C, N - done); await step(4, 120, i => { n.sub = Math.min(N, done + Math.ceil(batch * i / 4)) + ' / ' + N + ' · 并发 ' + C; n.prog = (done + batch * i / 4) / N * 100; R.tokens += 220 * batch; }); done += batch; }
          HX.log(p, N + ' 份并行完成（并发 ' + C + '）'); break;
        }
        case '分支': {
          await wait(260); const ok = (ctx.round || 2) >= 2; ctx.achieved = ok; n.activeOut = ok ? 'yes' : 'no';
          n.sub = ok ? '是 → yes' : '否 → no'; HX.log(p, ok ? '判定：达成' : '判定：未达成，缺 B 公司数据', ok ? 'o' : 'w'); break;
        }
        case '人工': {
          n.status = 'waiting'; n.sub = '等待审批 · 0:00'; span.st = 'waiting'; paint(n, g); setUI('waiting');
          HX.log(p, '挂起，等待人工审批', 'w');
          const msg = HX.chat.ai('「' + HX.esc(n.label) + '」需要你审批后才能继续。<div class="hx-msg__acts"><button class="hx-btn is-sm is-ok" data-run-approve="' + n.id + '">批准</button><button class="hx-btn is-sm is-ghost" data-run-deny="' + n.id + '">驳回</button></div>');
          const tw = setInterval(() => { const s = Math.round((performance.now() - t0) / 1000); n.sub = '等待审批 · ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); paint(n, g); }, 1000);
          const okv = await new Promise(res => R.pending.set(n.id, res));
          clearInterval(tw); msg.querySelectorAll('button').forEach(b => { b.disabled = true; });
          if (R.stop) throw new Error('stop');
          n.status = 'running'; n.activeOut = okv ? 'approved' : 'rejected'; n.sub = okv ? '已批准' : '已驳回'; span.st = 'running'; setUI('running');
          HX.log(p, okv ? '已批准' : '已驳回', okv ? 'o' : 'w'); await wait(200); break;
        }
        case '循环': case '子图引用': {
          const max = n.type === '循环' ? Math.max(1, +n.params.max_rounds || 5) : 1; let r = 1, ok = false;
          for (; r <= max; r++) {
            const c2 = { round: r }; n.round = r; n.prog = (r - 0.5) / max * 100; n.sub = n.type === '循环' ? '第 ' + r + ' 轮进行中' : '运行子图';
            if (HX.cur() === g && HX.nodeEl(n.id)) { HX.touch(n); HX.renderNode(n); }
            if (n.type === '循环') HX.log(p, '第 ' + r + ' 轮开始');
            await runGraph(n.children, p + (n.type === '循环' ? '#r' + r : ''), depth + 1, c2);
            ok = c2.achieved !== false;
            if (ok || n.type !== '循环') break;
            HX.chat.ai('「' + HX.esc(n.label) + '」第 ' + r + ' 轮未通过验收。验收者写了差距报告：<span class="k">缺 B 公司企业版报价，官网与新闻稿均已查过</span>。带着差距报告进入第 ' + (r + 1) + ' 轮。');
          }
          n.prog = 100; n.sub = n.type === '循环' ? (ok ? '第 ' + r + ' 轮达成' : '达到最大轮数') : '完成';
          if (n.type === '循环') HX.log(p, ok ? '第 ' + r + ' 轮通过验收' : '达到最大轮数', ok ? 'o' : 'w');
          break;
        }
        default: await step(2, 140 + Math.random() * 120, () => { R.tokens += 40; });
      }
    } finally { inc.forEach(e => { e.flow = false; paintEdge(e, g); }); }
    if (R.stop) throw new Error('stop');
    n.status = 'done'; n.prog = 100; if (n.type !== '分支' && n.type !== '人工' && !n.children) n.sub = '';
    const dt = (performance.now() - t0) / 1000; n.meta = dt.toFixed(1) + 's';
    span.b = performance.now(); span.st = 'done'; R.count++;
    paint(n, g); if (HX.cur() === g) { const el = HX.nodeEl(n.id); if (el) { el.classList.add('is-justdone'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-justdone'))); } }
    [...g.edges.values()].filter(e => e.f === n.id).forEach(e => paintEdge(e, g));
  }

  run.answer = function (id, ok) { const R = run.R; if (!R || !R.pending.has(id)) return; const f = R.pending.get(id); R.pending.delete(id); f(ok); };
  run.retry = function (id) { const n = HX.findNode(id); if (n) { n.status = 'queued'; n.sub = '已重新排队'; HX.setStatus(n); HX.toast('「' + n.label + '」已重新排队'); } };
  run.estop = function () {
    const R = run.R;
    HX.setLevel(0);
    $('top').classList.add('is-danger');
    const b = $('banner'); b.hidden = false; b.innerHTML = HX.UI.stop.replace('<svg', '<svg style="width:12px;height:12px"') + '急停：运行已停止，模型授权降到 0 档（只读）<button class="hx-btn is-sm is-ghost" id="unstop">解除</button>';
    $('unstop').onclick = () => { $('top').classList.remove('is-danger'); b.hidden = true; HX.toast('已解除急停', '授权档位保持 0，需要时手动调高'); };
    if (R && !R.end) {
      R.stop = true; R.timers.forEach(x => { clearTimeout(x.t); x.rej(new Error('stop')); }); R.pending.forEach(f => f(false)); R.pending.clear();
      HX.walk(S.root, n => { if (n.status === 'running' || n.status === 'waiting' || n.status === 'queued') { n.status = n.status === 'queued' ? 'skipped' : 'failed'; n.sub = '已取消'; } });
      S.root.nodes.forEach(n => { if (n.status === 'running' || n.status === 'waiting') { n.status = 'failed'; n.sub = '已取消'; } });
      R.spans.forEach(s => { if (!s.b) { s.b = performance.now(); s.st = 'failed'; } });
      HX.cur().edges.forEach(e => { e.flow = false; }); HX.sync();
      HX.log('根图', '急停：所有运行中的节点已取消', 'e');
    }
    HX.chat.ai('已急停：运行中的节点全部取消，模型授权降到 <span class="k">0 只读</span>。模型无法自己解除急停，只有你可以。', { model: true });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-run-approve],[data-run-deny]'); if (!a) return;
    run.answer(a.dataset.runApprove || a.dataset.runDeny, !!a.dataset.runApprove);
  });
})(window.HX);

/* ===== 29_model.js · 模型操作者：对话指令 → 提议（幽灵节点）或直接修改 ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const now = () => new Date().toTimeString().slice(0, 5);

  /* ---------------- 对话 ---------------- */
  const chat = HX.chat = {};
  chat.add = function (role, html, opt) {
    const m = document.createElement('div'); m.className = 'hx-msg is-' + role + ' is-enter';
    m.innerHTML = (role === 'user' ? '' : '<div class="hx-msg__av">AI</div>') + '<div class="hx-msg__body">' + html + '</div>';
    $('chat').appendChild(m); $('chat').scrollTop = 1e9; return m;
  };
  chat.user = t => chat.add('user', esc(t));
  chat.ai = (h, opt) => chat.add('model', '<p>' + h + '</p>', opt);

  /* ---------------- 提议（proposal）：一组节点 / 连线 / 参数改动 ---------------- */
  const model = HX.model = { props: [] };
  function find(label, type) { let r = null; HX.walk(S.root, (n, g, path) => { if (!r && n.label === label && (!type || n.type === type)) r = { n: n, g: g, path: path }; }); return r; }
  function ghostOn(p) {
    p.nodes.forEach(n => { n.ghost = true; n.ghostReason = p.reason; n.ai = { reason: p.reason, level: S.level, time: now() }; HX.touch(n); p.g.nodes.set(n.id, n); });
    p.edges.forEach(e => { e.ghost = true; p.g.edges.set(e.id, e); });
    p.removes.forEach(e => { e.removing = true; });
    p.params.forEach(x => { x.n.pending[x.k] = x.v; x.n.ai = { reason: p.reason, level: S.level, time: now() }; HX.touch(x.n); });
  }
  function ghostOff(p) {
    p.nodes.forEach(n => { n.ghost = false; p.g.nodes.delete(n.id); });
    p.edges.forEach(e => { e.ghost = false; p.g.edges.delete(e.id); });
    p.removes.forEach(e => { e.removing = false; });
    p.params.forEach(x => { delete x.n.pending[x.k]; x.n.ai = null; HX.touch(x.n); });
  }
  function commit(p) {
    const ops = [];
    if (p.nodes.length || p.edges.length || p.removes.length) ops.push(HX.opAdd(p.g, p.nodes, p.edges, p.label, p.removes));
    p.params.forEach(x => ops.push(HX.opParam(p.g, x.n, x.k, x.v)));
    const op = ops.length === 1 ? ops[0] : HX.opBatch(p.g, p.label, ops);
    op.label = p.label; op.actor = 'model'; op.reason = p.reason;
    HX.dispatch(op);
    p.nodes.concat(p.params.map(x => x.n)).forEach(n => { n.ai = { reason: p.reason, level: S.level, time: now() }; HX.touch(n); });
    HX.sync();
    p.nodes.concat(p.params.map(x => x.n)).forEach(n => HX.flash(n.id));
  }
  model.decide = function (nodeId, accept) {
    const p = model.props.find(q => q.nodes.some(n => n.id === nodeId) || q.params.some(x => x.n.id === nodeId)); if (!p) return;
    settle(p, accept);
  };
  function settle(p, accept) {
    model.props = model.props.filter(q => q !== p);
    ghostOff(p);
    if (accept) commit(p); else HX.sync();
    HX.log('模型', (accept ? '采纳：' : '拒绝：') + p.label, accept ? 'm' : 'w');
    renderBar();
  }
  function renderBar() {
    const bar = $('proposal');
    if (!model.props.length) { bar.hidden = true; $('pop').hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = '<span class="hx-proposal__dot"></span><span><b>模型提议 ' + model.props.length + ' 处修改</b> · 虚线是待采纳的改动</span>' +
      '<button class="hx-btn is-sm is-ghost" data-pp="list">逐条查看</button><button class="hx-btn is-sm is-model" data-pp="all">全部采纳</button><button class="hx-btn is-sm is-ghost" data-pp="none">全部拒绝</button>';
  }
  $('proposal').addEventListener('click', e => {
    const b = e.target.closest('[data-pp]'); if (!b) return;
    if (b.dataset.pp === 'all') model.props.slice().forEach(p => settle(p, true));
    else if (b.dataset.pp === 'none') model.props.slice().forEach(p => settle(p, false));
    else {
      const pop = $('pop'), r = b.getBoundingClientRect(); pop.className = 'hx-pop is-wide';
      pop.innerHTML = '<div class="hx-pop__h">模型提议</div>' + model.props.map((p, i) => '<div class="hx-pitem"><div><b>' + esc(p.label) + '</b><span>' + esc(p.reason) + '</span></div><button class="hx-btn is-sm is-model" data-pa="' + i + '">采纳</button><button class="hx-btn is-sm is-ghost" data-pr="' + i + '">拒绝</button></div>').join('');
      pop.hidden = false; pop.style.left = Math.max(8, r.left - 120) + 'px'; pop.style.top = Math.max(8, r.top - pop.offsetHeight - 8) + 'px';
      pop.setAttribute('data-pop', '1');
    }
  });
  $('pop').addEventListener('click', e => {
    const a = e.target.closest('[data-pa],[data-pr]'); if (!a) return;
    const p = model.props[+(a.dataset.pa || a.dataset.pr)]; if (p) settle(p, a.dataset.pa !== undefined);
    if (!model.props.length) $('pop').hidden = true; else { const ev = $('proposal').querySelector('[data-pp="list"]'); if (ev) ev.click(); }
  });

  /* ---------------- AI 光标与"模型正在编辑" ---------------- */
  function pill(on, txt) { $('modelPill').classList.toggle('is-on', on); if (txt) $('modelPillTxt').textContent = txt; }
  async function pointTo(n) {
    const c = $('cursor'), v = S.view;
    const x = (n.x + HX.nodeW(n) * 0.55) * v.k + v.x, y = (n.y + 14) * v.k + v.y;
    c.classList.remove('is-off'); c.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
    await sleep(680);
  }
  async function goTo(hit) {
    const want = [S.stack[0]].concat(hit.path.map(p => ({ label: p.label, g: p.children, node: p })));
    const same = want.length === S.stack.length && want.every((s, i) => s.g === S.stack[i].g);
    if (!same) { S.stack = want; HX.switchGraph('enter'); await sleep(420); }
  }

  /* ---------------- 指令 → 提议 ---------------- */
  function planApproval() {
    const j = find('验收者', 'Agent'), b = find('达成？'); if (!j || !b) return null;
    const g = j.g, e0 = [...g.edges.values()].find(e => e.f === j.n.id && e.t === b.n.id);
    const h = HX.mk('人工', '验收复核', { mode: 'approve' }); h.x = HX.snap(j.n.x + 150); h.y = HX.snap(j.n.y + HX.nodeH(j.n) + 70);
    return [{ g: g, hit: j, label: '在「验收者」后加人工审批', reason: '验收结果直接决定是否结束循环，加一道人工复核，避免错误的"达成"让流程提前结束。',
      nodes: [h], edges: [HX.edge(j.n, 'result', h, 'request'), HX.edge(h, 'approved', b.n, 'value')], removes: e0 ? [e0] : [], params: [] }];
  }
  function planConc(v) {
    const p = find('执行池', '扇出'); if (!p) return null;
    return [{ g: p.g, hit: p, label: '执行池并发 ' + p.n.params.concurrency + ' → ' + v, reason: '执行池在检索限流下排队，提高并发能缩短每轮用时。', nodes: [], edges: [], removes: [], params: [{ n: p.n, k: 'concurrency', v: v }] }];
  }
  function planOptimize() {
    const pool = find('执行池', '扇出'), fan = find('智囊团', '扇出'), dec = find('决策者', 'Agent'); if (!pool || !fan || !dec) return null;
    const g = pool.g, e0 = [...g.edges.values()].find(e => e.f === dec.n.id && e.t === pool.n.id);
    const dd = HX.mk('聚合', '任务去重', { op: 'dedupe', key: 'dedupe_key' }); dd.x = HX.snap((dec.n.x + pool.n.x) / 2 + 40); dd.y = HX.snap(dec.n.y + HX.nodeH(dec.n) + 120);
    return [
      { g: g, hit: pool, label: '执行池并发 ' + pool.n.params.concurrency + ' → 5', reason: '上次运行里执行池有 40% 的时间在排队，提高到 5 预计每轮快 1.6 倍。', nodes: [], edges: [], removes: [], params: [{ n: pool.n, k: 'concurrency', v: 5 }] },
      { g: g, hit: fan, label: '智囊团汇合 all → k_of_n', reason: '最慢的智囊拖慢整轮；3 份里收到 2 份就继续，结果质量几乎不变。', nodes: [], edges: [], removes: [], params: [{ n: fan.n, k: 'collect', v: 'k_of_n' }] },
      { g: g, hit: dec, label: '在决策者与执行池之间插入「任务去重」', reason: '决策者的任务卡里有 3 张查同一个网站，去重后避免重复抓取被限流。', nodes: [dd], edges: [HX.edge(dec.n, 'result', dd, 'items'), HX.edge(dd, 'result', pool.n, 'items')], removes: e0 ? [e0] : [], params: [] }
    ];
  }

  async function execute(plan) {
    if (!plan || !plan.length) { chat.ai('我没在图里找到要改的节点。可以先「重新载入示例图」。'); return; }
    if (S.level === 0) { chat.ai('当前授权是 <span class="k">0 只读</span>，我不能改图。把档位调到 1，我会先以幽灵节点的形式提建议。'); return; }
    if (!S.open) { HX.open(); await sleep(460); }
    pill(true, S.level === 1 ? '模型正在起草提议…' : '模型正在编辑…');
    await goTo(plan[0].hit);
    if (S.level === 1) {
      for (const p of plan) { await pointTo(p.hit.n); ghostOn(p); model.props.push(p); HX.sync(); }
      renderBar();
      chat.ai('我提了 ' + plan.length + ' 处修改，画布上用虚线标出，等你采纳：' + plan.map(p => '<br>· ' + esc(p.label) + ' —— <span style="color:var(--hx-text-2)">' + esc(p.reason) + '</span>').join(''));
    } else {
      for (const p of plan) { await pointTo(p.hit.n); commit(p); HX.toast(p.label, '模型修改 · 档位 ' + S.level, { tone: 'model', undo: true }); await sleep(260); }
      chat.ai('已直接修改 ' + plan.length + ' 处（档位 ' + S.level + '），改过的节点带 <span class="k">AI</span> 标记，悬停可看理由，操作历史里可以撤销：' + plan.map(p => '<br>· ' + esc(p.label)).join(''));
    }
    pill(false); $('cursor').classList.add('is-off');
  }

  /* ---------------- 输入框 ---------------- */
  async function handle(t) {
    const typing = chat.add('model', '<span class="hx-typing"><i></i><i></i><i></i></span>');
    await sleep(520); typing.remove();
    const num = (t.match(/\d+/) || [])[0];
    if (/急停|停下|停止/.test(t)) return HX.run.estop();
    if (/档|授权/.test(t) && num !== undefined && +num <= 4) { HX.setLevel(+num); return chat.ai('授权档位已调到 <span class="k">' + num + ' ' + HX.LEVELS[+num][0] + '</span>：' + HX.LEVELS[+num][1] + '。'); }
    if (/运行|跑一/.test(t)) { chat.ai('好的，开始运行。每个节点的状态会实时显示在画布上。'); return HX.run.start(); }
    if (/人工|审批|复核/.test(t)) return execute(planApproval());
    if (/并发/.test(t)) return execute(planConc(Math.max(1, Math.min(64, +(num || 5)))));
    if (/优化/.test(t)) return execute(planOptimize());
    if (/布局|整理/.test(t)) { if (S.level < 2) return chat.ai('整理布局会移动所有节点，需要档位 2 及以上。'); if (!S.open) HX.open(); return setTimeout(() => HX.autoLayout('model'), 460); }
    chat.ai('这个 demo 里我能听懂：<span class="k">加人工审批</span>、<span class="k">把执行池并发改成 N</span>、<span class="k">优化这张图</span>、<span class="k">整理布局</span>、<span class="k">运行</span>、<span class="k">急停</span>、<span class="k">调到 N 档</span>。');
  }
  function send() { const ta = $('ta'), t = ta.value.trim(); if (!t) return; ta.value = ''; chat.user(t); handle(t); }
  HX.bindModel = function () {
    $('sendBtn').onclick = send;
    $('ta').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    const chips = ['在验收者后加人工审批', '把执行池并发改成 5', '帮我优化这张图', '运行', '调到 1 档', '调到 3 档'];
    $('chips').innerHTML = chips.map(c => '<button class="hx-chip">' + HX.UI.model + esc(c) + '</button>').join('');
    $('chips').addEventListener('click', e => { const b = e.target.closest('.hx-chip'); if (!b) return; $('ta').value = b.textContent; send(); });
  };
})(window.HX);

/* ===== 30_embed.js · 嵌入形态（卡片 / 展开 / 全屏）、主题、压力测试、初始化 ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S;
  const reduced = () => HX.css('--hx-t-4') === '0ms';

  /* ---------------- 对话卡片（只读缩略） ---------------- */
  let cardT = 0;
  HX.drawCard = function () {
    clearTimeout(cardT);
    cardT = setTimeout(() => {
      HX.drawGraph($('cardCanvas'), S.root, 'card');
      let inner = 0; HX.walk(S.root, () => inner++);
      $('cardMeta').textContent = S.root.nodes.size + ' 个节点 · 共 ' + inner + ' 个（含子图）';
    }, 30);
  };

  /* ---------------- 展开（FLIP：从卡片位置放大到中间栏） ---------------- */
  function flipFrom(stage, r0) {
    const r1 = stage.getBoundingClientRect();
    const sx = r0.width / r1.width, sy = r0.height / r1.height;
    stage.style.transform = 'translate(' + (r0.left - r1.left) + 'px,' + (r0.top - r1.top) + 'px) scale(' + sx + ',' + sy + ')';
    stage.style.borderRadius = '14px';
    stage.classList.add('is-shrunk');
  }
  HX.open = function () {
    if (S.open) return;
    const stage = $('stage'), card = $('cardView');
    $('main').style.setProperty('--hx-composer-h', $('composer').offsetHeight + 'px');
    stage.hidden = false; S.open = true;
    HX.measure(); HX.resetDOM(); HX.sync(); HX.renderCrumb(); HX.renderInsp(); HX.renderDrawer();
    Object.assign(S.view, HX.fitTarget()); HX.renderView();
    if (!reduced()) {
      flipFrom(stage, card.getBoundingClientRect());
      void stage.offsetWidth;
      stage.classList.add('is-flip'); stage.style.transform = ''; stage.style.borderRadius = '0'; stage.classList.remove('is-shrunk');
      setTimeout(() => stage.classList.remove('is-flip'), 420);
    }
    $('card').classList.add('is-away');
    setTimeout(() => $('vp').focus({ preventScroll: true }), 60);
  };
  HX.close = function () {
    if (!S.open) return;
    if (S.full) HX.toggleFull();
    const stage = $('stage');
    const done = () => { stage.hidden = true; stage.classList.remove('is-flip', 'is-shrunk'); stage.style.transform = ''; stage.style.borderRadius = ''; S.open = false; $('card').classList.remove('is-away'); HX.drawCard(); };
    HX.closeFloating();
    if (reduced()) return done();
    const r0 = $('cardView').getBoundingClientRect();
    stage.classList.add('is-flip'); flipFrom(stage, r0);
    setTimeout(done, 400);
  };
  HX.toggleFull = function () {
    if (!S.open) { HX.open(); return; }
    S.full = !S.full; $('stage').classList.toggle('is-full', S.full);
    $('fullBtn').innerHTML = S.full ? HX.UI.shrink : HX.UI.expand;
    $('fullBtn').dataset.tip = S.full ? '退出全屏 · F / Esc' : '全屏 · F';
    requestAnimationFrame(() => { HX.measure(); HX.renderView(); HX.drawMini(); });
  };

  /* ---------------- 主题（默认浅色） ---------------- */
  HX.toggleTheme = function () {
    const html = document.documentElement, dark = html.dataset.theme !== 'dark';
    html.dataset.theme = dark ? 'dark' : 'light';
    $('themeBtn').innerHTML = dark ? HX.UI.sun : HX.UI.moon;
    try { localStorage.setItem('hx-theme', html.dataset.theme); } catch (e) { /* file:// 下可能不可用 */ }
    HX.drawCard(); HX.drawMini();
  };

  /* ---------------- 压力测试：200 节点 · 300 连线 + 实时 FPS ---------------- */
  let fpsRaf = 0;
  function fpsMeter(on) {
    const el = $('fps'); cancelAnimationFrame(fpsRaf); el.hidden = !on; if (!on) return;
    let n = 0, t0 = performance.now();
    const loop = t => {
      n++;
      if (t - t0 >= 500) {
        const f = Math.round(n * 1000 / (t - t0)); n = 0; t0 = t; const g = HX.cur();
        el.classList.toggle('is-low', f < 50);
        el.innerHTML = '<b>' + f + '</b> FPS<br>' + g.nodes.size + ' 节点 · ' + g.edges.size + ' 连线 · 缩放 ' + Math.round(S.view.k * 100) + '%';
        if (S.stack[S.stack.length - 1].label !== '压力测试') { el.hidden = true; return; }
      }
      fpsRaf = requestAnimationFrame(loop);
    };
    fpsRaf = requestAnimationFrame(loop);
  }
  HX.stress = function () {
    if (!S.open) HX.open();
    const types = ['Agent', '聚合', '扇出', '工具', '上下文装配', '分支', '资源'], nodes = [];
    for (let i = 0; i < 200; i++) { const n = HX.mk(types[i % types.length], types[i % types.length] + ' ' + (i + 1)); n.x = (i % 20) * 300; n.y = Math.floor(i / 20) * 260; nodes.push(n); }
    const g = HX.newGraph(nodes, []); let tries = 0;
    while (g.edges.size < 300 && tries++ < 6000) {
      const i = Math.floor(Math.random() * 199), j = i + 1 + Math.floor(Math.random() * Math.min(25, 199 - i)), a = nodes[i], b = nodes[j];
      const op = HX.ports(a).out[0], ip = HX.ports(b).in.find(p => HX.compat(op[1], p[1]).ok && (p[2] || ![...g.edges.values()].some(e => e.t === b.id && e.tp === p[0])));
      if (ip) { const e = HX.edge(a, op[0], b, ip[0]); g.edges.set(e.id, e); }
    }
    S.stack.push({ label: '压力测试', g: g, node: null }); HX.switchGraph('enter');
    fpsMeter(true);
    HX.toast('压力测试：' + g.nodes.size + ' 节点 · ' + g.edges.size + ' 连线', '自动平移缩放 4 秒，之后可以自己拖动试试。Esc 返回', { ms: 5000 });
    const t0 = performance.now(), v0 = Object.assign({}, S.view);
    const pan = t => { const p = (t - t0) / 4000; if (p > 1 || S.stack[S.stack.length - 1].g !== g) return; S.view.x = v0.x - Math.sin(p * Math.PI) * 900; S.view.k = Math.max(0.2, v0.k * (1 + 0.8 * Math.sin(p * Math.PI))); HX.renderView(); requestAnimationFrame(pan); };
    setTimeout(() => requestAnimationFrame(pan), 500);
  };
  HX.reloadTemplate = function () {
    HX.setRoot(HX.buildTemplate()); S.past.length = 0; S.future.length = 0;
    if (S.open) { HX.resetDOM(); HX.sync(); HX.renderCrumb(); HX.renderInsp(); HX.fit(); }
    HX.drawCard(); HX.toast('已重新载入示例图');
  };

  /* ---------------- 初始化 ---------------- */
  function init() {
    try { const t = localStorage.getItem('hx-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* 忽略 */ }
    HX.fillIcons();
    if (document.documentElement.dataset.theme === 'dark') $('themeBtn').innerHTML = HX.UI.sun;
    HX.setRoot(HX.buildTemplate());
    HX.bindPointer(); HX.bindPanels(); HX.bindModel();
    HX.setLevel(2);
    HX.on('op', op => {
      if (S.open) { HX.sync(); HX.renderInsp(); HX.renderHistory(); }
      HX.drawCard();
    });
    $('cardView').addEventListener('click', HX.open);
    $('openBtn').addEventListener('click', HX.open);
    $('cardRun').addEventListener('click', () => { HX.open(); setTimeout(HX.run.start, 450); });
    $('closeBtn').addEventListener('click', HX.close);
    $('fullBtn').addEventListener('click', HX.toggleFull);
    $('themeBtn').addEventListener('click', HX.toggleTheme);
    $('runBtn').addEventListener('click', () => HX.run.start());
    $('stopBtn').addEventListener('click', () => HX.run.estop());
    if (window.ResizeObserver) new ResizeObserver(() => { $('main').style.setProperty('--hx-composer-h', $('composer').offsetHeight + 'px'); }).observe($('composer'));
    window.addEventListener('resize', () => { if (!S.open) HX.drawCard(); });
    HX.drawCard();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { HX.drawCard(); if (S.open) HX.sync(); });
  }
  init();
})(window.HX);


}catch(e){console.log("LOAD ERR",e.stack)}

await (async()=>{
const S=HX.S, A=(c,m)=>{if(!c)throw new Error('FAIL '+m);console.log('ok',m)};
console.log('start');HX.open(); A(S.open,'open');
HX.select([...HX.cur().nodes.keys()].slice(0,2)); HX.group(); A(HX.cur().nodes.size===7,'group');
HX.undo(); A(HX.cur().nodes.size===8,'undo group');
const loop=[...S.root.nodes.values()].find(n=>n.type==='循环'); HX.enter(loop); A(HX.cur()===loop.children,'enter');
HX.select([[...HX.cur().nodes.values()].find(n=>n.label==='执行池').id]); HX.duplicate(); A(HX.cur().nodes.size===16,'dup'); HX.undo();
HX.goto(0); A(HX.cur()===S.root,'goto root');
// model level1
HX.setLevel(1);
const planWait=ms=>new Promise(r=>setTimeout(r,ms));
document.getElementById('ta').value='帮我优化这张图'; 
HX.chat.user('x');
// call via chips path: simulate handle by sending
await (async()=>{ const ev=document.getElementById('sendBtn').onclick; ev(); })();
await planWait(4000);
A(HX.model.props.length===3,'3 proposals ghost');
A(HX.cur()===loop.children,'navigated into loop');
const pool=[...loop.children.nodes.values()].find(n=>n.label==='执行池'); A(pool.pending.concurrency===5,'pending param');
HX.model.decide(pool.id,true); A(pool.params.concurrency===5 && pool.ai,'accept one');
A(HX.model.props.length===2,'2 left');
// reject the rest via decide on dedupe node
const dd=[...loop.children.nodes.values()].find(n=>n.label==='任务去重'); A(dd && dd.ghost,'ghost node present');
HX.model.decide(dd.id,false); A(!loop.children.nodes.has(dd.id),'reject removes ghost');
HX.undo(); A(pool.params.concurrency===3,'undo model op');
// level 3 direct
HX.setLevel(3);
document.getElementById('ta').value='在验收者后加人工审批'; document.getElementById('sendBtn').onclick();
await planWait(2500);
const hum=[...loop.children.nodes.values()].find(n=>n.label==='验收复核'); A(hum && !hum.ghost && hum.ai,'direct add with ai');
A(S.past[S.past.length-1].actor==='model','history actor model');
// run
HX.goto(0);
HX.setLevel(2);
const p=HX.run.start();
// auto approve human nodes
const iv=setInterval(()=>{const R=HX.run.R; if(R) R.pending.forEach((f,id)=>HX.run.answer(id,true));},300);
await p; clearInterval(iv);
A(HX.run.R.end>0,'run finished'); A(loop.status==='done' && loop.round===2,'loop done round 2 '+loop.round);
const l2=[...S.root.nodes.values()].find(n=>n.label==='写入进度'); A(l2.status==='done','after approve');
console.log('tokens',Math.round(HX.run.R.tokens),'count',HX.run.R.count,'time',((HX.run.R.end-HX.run.R.t0)/1000).toFixed(1));
// estop mid-run
const p2=HX.run.start(); await planWait(1500); HX.run.estop(); await p2; A(S.level===0,'estop level 0'); A(HX.run.R.end>0,'estop ends run');
HX.stress(); A(HX.cur().nodes.size===200 && HX.cur().edges.size>=250,'stress '+HX.cur().edges.size);
HX.autoLayout(); await planWait(800);
console.log('ALL OK');
})().catch(e=>{console.log('ERR',e.stack);0});
