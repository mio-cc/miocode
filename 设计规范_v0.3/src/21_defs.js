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
