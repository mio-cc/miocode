/* ===== 32_sessions.js · 多会话：切换会话时整套画布状态一起切换 =====
   每个会话保存：当前图（结构各不相同）、所在层（面包屑）、视图位置、选中、撤销 / 重做栈、授权档位、
   对话记录、浮动回复、模型提议、运行日志。左侧栏「结构」树始终是当前会话当前图的结构。
   新建会话：空白画布 + 空状态卡（从模板开始 / 用对话描述 / 从节点库拖入）。
   规范：U.09.04 会话切换、C.10-R3、W.03.05。 */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(s);

  /* ---------------- 示例图（结构各不相同） ---------------- */
  const B = {};
  /** 代码评审流水线：两层（外层 + 「评审回合」循环） */
  B.review = function () {
    const mk = HX.mk, E = HX.edge;
    const ie = mk('子图端口', '入口', { role: 'entry' });
    const sm = mk('资源', '评审模型', { kind: '模型', value: 'large-model' });
    const tool = mk('工具', '代码执行', { tool: '代码执行', risk: 'L2' });
    const c = mk('上下文装配', '评审者配方', { recipe: '验收者配方@1', budget: 0.12 });
    const rv = mk('Agent', '评审者', { output_schema: '判定@1', temperature: 0.2 });
    const br = mk('分支', '通过？', { when: 'verdict == "pass"' });
    const ox = mk('子图端口', '出口', { role: 'exit' });
    const inner = HX.newGraph([ie, sm, tool, c, rv, br, ox], [
      E(ie, 'out', c, 'in'), E(sm, 'ref', c, 'model'), E(c, 'context', rv, 'context'), E(sm, 'ref', rv, 'model'),
      E(tool, 'endpoint', rv, 'tools'), E(rv, 'result', br, 'value'), E(br, 'yes', ox, 'in')]);
    HX.applyLayout(inner, { cols: 4 });
    const repo = mk('资源', '代码仓库', { kind: '常量', value: 'repo@main' });
    const bm = mk('资源', '大模型', { kind: '模型', value: 'large-model' });
    const c0 = mk('上下文装配', '生成者配方', { recipe: '执行者配方@1' });
    const gen = mk('Agent', '生成者', { output_schema: '执行结果@1' });
    const loop = mk('循环', '评审回合', { max_rounds: 3 }, inner);
    const hum = mk('人工', '合并审批', { mode: 'approve' });
    const git = mk('工具', '合并到 main', { tool: 'HTTP', risk: 'L3' });
    const root = HX.newGraph([repo, bm, c0, gen, loop, hum, git], [
      E(repo, 'ref', c0, 'in'), E(bm, 'ref', c0, 'model'), E(c0, 'context', gen, 'context'), E(bm, 'ref', gen, 'model'),
      E(gen, 'result', loop, 'init'), E(loop, 'final', hum, 'request'), E(hum, 'approved', git, 'request')]);
    HX.applyLayout(root, { cols: 4 });
    return root;
  };
  /** 周报自动生成：只有一层，没有任何子图 */
  B.weekly = function () {
    const mk = HX.mk, E = HX.edge;
    const t1 = mk('工具', '读邮件', { tool: '邮件', risk: 'L1' });
    const t2 = mk('工具', '读日程', { tool: 'HTTP', risk: 'L1' });
    const t3 = mk('工具', '读项目文档', { tool: '检索', risk: 'L0' });
    const j = mk('汇合', '汇总材料', { wait: 'all' });
    const bm = mk('资源', '大模型', { kind: '模型', value: 'large-model' });
    const c = mk('上下文装配', '周报配方', { recipe: '执行者配方@1', budget: 0.15 });
    const a = mk('Agent', '撰写周报', { output_schema: '执行结果@1', temperature: 0.4 });
    const h = mk('人工', '确认发送', { mode: 'approve' });
    const send = mk('工具', '发送邮件', { tool: '邮件', risk: 'L3' });
    const l = mk('账本', '归档', { op: 'append', path: '周报' });
    const root = HX.newGraph([t1, t2, t3, j, bm, c, a, h, send, l], [
      E(t1, 'result', j, 'in'), E(t2, 'result', j, 'in'), E(t3, 'result', j, 'in'), E(j, 'collected', c, 'in'), E(bm, 'ref', c, 'model'),
      E(c, 'context', a, 'context'), E(bm, 'ref', a, 'model'), E(a, 'result', h, 'request'), E(h, 'approved', send, 'request'), E(a, 'result', l, 'value')]);
    HX.applyLayout(root, { cols: 4 });
    return root;
  };
  /** 客服工单分类：两层（外层 + 「工单分诊」子图引用） */
  B.tickets = function () {
    const mk = HX.mk, E = HX.edge;
    const ie = mk('子图端口', '入口', { role: 'entry' });
    const sm = mk('资源', '小模型', { kind: '模型', value: 'small-model' });
    const c = mk('上下文装配', '分类员配方', { recipe: '聚类员配方@1', budget: 0.06 });
    const ag = mk('Agent', '分类员', { output_schema: '簇标注@1', temperature: 0.1 });
    const br = mk('分支', '紧急？', { when: 'priority == "P0"' });
    const hum = mk('人工', '人工接手', { mode: 'input' });
    const reply = mk('工具', '回复客户', { tool: '邮件', risk: 'L2' });
    const ox = mk('子图端口', '出口', { role: 'exit' });
    const inner = HX.newGraph([ie, sm, c, ag, br, hum, reply, ox], [
      E(ie, 'out', c, 'in'), E(sm, 'ref', c, 'model'), E(c, 'context', ag, 'context'), E(sm, 'ref', ag, 'model'),
      E(ag, 'result', br, 'value'), E(br, 'yes', hum, 'request'), E(br, 'no', reply, 'request'), E(reply, 'result', ox, 'in')]);
    HX.applyLayout(inner, { cols: 4 });
    const pull = mk('工具', '拉取新工单', { tool: 'HTTP', risk: 'L1' });
    const sub = mk('子图引用', '工单分诊', { ref: '工单分诊@v2', pin: 'snapshot' }, inner);
    const agg = mk('聚合', '按类别统计', { op: 'group_ratio', key: 'category' });
    const l = mk('账本', '写入看板', { op: 'write', path: '工单看板' });
    const root = HX.newGraph([pull, sub, agg, l], [
      E(pull, 'result', sub, 'in'), E(sub, 'out', agg, 'items'), E(agg, 'result', l, 'value')]);
    HX.applyLayout(root, { cols: 4 });
    return root;
  };
  /** 论文综述 · 多模型对比：三层（外层 → 「单篇精读」 → 「引文核对」） */
  B.papers = function () {
    const mk = HX.mk, E = HX.edge;
    const ie3 = mk('子图端口', '入口', { role: 'entry' });
    const t3 = mk('工具', '检索原文', { tool: '检索', risk: 'L0' });
    const sm = mk('资源', '小模型', { kind: '模型', value: 'small-model' });
    const ck = mk('Agent', '核对员', { output_schema: '判定@1', temperature: 0 });
    const br = mk('分支', '一致？', { when: 'match == true' });
    const ox3 = mk('子图端口', '出口', { role: 'exit' });
    const cite = HX.newGraph([ie3, t3, sm, ck, br, ox3], [
      E(ie3, 'out', ck, 'context'), E(t3, 'endpoint', ck, 'tools'), E(sm, 'ref', ck, 'model'), E(ck, 'result', br, 'value'), E(br, 'yes', ox3, 'in')]);
    HX.applyLayout(cite, { cols: 3 });

    const ie = mk('子图端口', '入口', { role: 'entry' });
    const pdf = mk('工具', '下载全文', { tool: 'HTTP', risk: 'L1' });
    const ms = mk('资源', '模型列表[]', { kind: '列表', value: '4 家厂商大模型' });
    const fan = mk('扇出', '多模型精读', { n: 4, concurrency: 4 });
    const vote = mk('聚合', '要点投票', { op: 'vote', key: 'claim' });
    const sub3 = mk('子图引用', '引文核对', { ref: '引文核对@v1', pin: 'snapshot' }, cite);
    const ox = mk('子图端口', '出口', { role: 'exit' });
    const read = HX.newGraph([ie, pdf, ms, fan, vote, sub3, ox], [
      E(ie, 'out', pdf, 'request'), E(pdf, 'result', fan, 'shared'), E(ms, 'ref', fan, 'items'), E(fan, 'results', vote, 'items'),
      E(vote, 'result', sub3, 'in'), E(sub3, 'out', ox, 'in')]);
    HX.applyLayout(read, { cols: 4 });

    const list = mk('资源', '论文清单', { kind: '列表', value: '12 篇' });
    const one = mk('子图引用', '单篇精读', { ref: '单篇精读@v1', pin: 'snapshot' }, read);
    const div = mk('聚合', '分歧检测', { op: 'divergence', key: 'claim' });
    const bm = mk('资源', '大模型', { kind: '模型', value: 'large-model' });
    const c = mk('上下文装配', '综述配方', { recipe: '决策者配方@1', budget: 0.2 });
    const sw = mk('Agent', '综述者', { output_schema: '方案@1', temperature: 0.3 });
    const hum = mk('人工', '审阅', { mode: 'approve' });
    const root = HX.newGraph([list, one, div, bm, c, sw, hum], [
      E(list, 'ref', one, 'in'), E(one, 'out', div, 'items'), E(div, 'result', c, 'in'), E(bm, 'ref', c, 'model'),
      E(c, 'context', sw, 'context'), E(bm, 'ref', sw, 'model'), E(sw, 'result', hum, 'request')]);
    HX.applyLayout(root, { cols: 4 });
    return root;
  };
  HX.sessionTemplates = B;

  const TPL = [
    { k: 'loop', name: '闭环迭代', desc: '主脑定目标 → 循环里扇出、聚类、决策、执行、验收', cost: '¥2–5', build: () => HX.buildTemplate() },
    { k: 'review', name: '生成-评审', desc: '生成者出结果，评审者多轮把关，人工批准合并', cost: '¥0.5–2', build: B.review },
    { k: 'papers', name: '多模型对比', desc: '同一份材料交给多个模型，投票并找出分歧', cost: '¥3–8', build: B.papers },
    { k: 'weekly', name: '周报自动生成', desc: '收集邮件、日程、文档，写周报，确认后发送', cost: '¥0.3–1', build: B.weekly },
    { k: 'tickets', name: '工单分类', desc: '拉取新工单，分诊、自动回复，紧急的转人工', cost: '¥0.2–1 / 百张', build: B.tickets }
  ];

  /* ---------------- 会话列表 ---------------- */
  let seq = 0;
  const SS = [
    { id: 's1', t: '竞品定价调研', when: '刚刚', level: 2, pin: true },
    { id: 's2', t: '代码评审流水线', when: '2 小时前', level: 3, build: B.review, intro: '这是「生成-评审」流水线：生成者写出改动，「评审回合」里评审者最多把关 3 轮，通过后等你批准再合并。' },
    { id: 's3', t: '周报自动生成', when: '昨天', level: 1, build: B.weekly, intro: '这张图只有一层：三个工具收集本周材料，汇合后由一个 Agent 写周报，你确认后发送并归档。' },
    { id: 's4', t: '客服工单分类', when: '3 天前', level: 2, build: B.tickets, intro: '外层拉取新工单、统计、写看板；每张工单的分诊逻辑封装在子图「工单分诊」里，双击可以进去看。' },
    { id: 's5', t: '论文综述 · 多模型对比', when: '上周', level: 2, build: B.papers, intro: '这张图有三层：「单篇精读」里多模型并行精读并投票，再往里一层「引文核对」检查引用是否属实。' }
  ];
  let cur = SS[0];

  function stat(g) {
    let n = 0, deep = 0, boxes = 0;
    HX.walk(g, (x, gg, path) => { n++; if (x.children) boxes++; deep = Math.max(deep, path.length); });
    return { n: n, layers: deep + 1, boxes: boxes };
  }
  function meta(x) {
    if (!x.root) return x.when;
    const st = stat(x.root);
    if (!st.n) return '空白画布 · ' + x.when;
    return (st.boxes ? st.layers + ' 层 · ' + st.boxes + ' 个子图' : '单层') + ' · ' + st.n + ' 节点 · ' + x.when;
  }
  const running = () => !!(HX.run.R && !HX.run.R.end);

  let q = '', renaming = null;
  function item(x) {
    if (renaming === x) return '<div class="hx-sess__item is-cur"><input class="hx-input is-sm hx-sess__ren" id="sessRen" value="' + esc(x.t) + '"></div>';
    return '<button class="hx-sess__item' + (x === cur ? ' is-cur' : '') + '" data-sid="' + x.id + '">' +
      '<span class="hx-sess__t">' + (x.pin ? HX.UI2.pin.replace('<svg', '<svg class="hx-sess__pin"') : '') + esc(x.t) + '</span>' +
      '<span class="hx-sess__m">' + (x === cur && running() ? '<span class="is-run">●</span>' : HX.UI.graph) + esc(meta(x)) + '</span>' +
      '<span class="hx-sess__more" data-smore="' + x.id + '" role="button" aria-label="更多">' + HX.UI2.dots + '</span></button>';
  }
  function render() {
    const vis = SS.filter(x => !q || x.t.toLowerCase().includes(q.toLowerCase()));
    const pins = vis.filter(x => x.pin), rest = vis.filter(x => !x.pin);
    $('sessList').innerHTML = (pins.length ? '<div class="hx-sess__grp">置顶</div>' + pins.map(item).join('') + (rest.length ? '<div class="hx-sess__grp">最近</div>' : '') : '') + rest.map(item).join('') +
      (!vis.length ? '<div class="hx-sess__grp" style="padding:10px">没有匹配「' + esc(q) + '」的会话</div>' : '');
    const h = $('secTree').querySelector('.hx-ls__sech span');
    if (h) h.innerHTML = '结构 <em class="hx-ls__sub">' + esc(cur.t) + '</em>';
    const ri = $('sessRen'); if (ri) { ri.focus(); ri.select(); }
  }
  /* 搜索框 */
  const sb = document.createElement('div'); sb.className = 'hx-sesssearch';
  sb.innerHTML = '<input class="hx-input is-sm" id="sessQ" placeholder="搜索会话" spellcheck="false">';
  $('sessList').parentNode.insertBefore(sb, $('sessList'));
  $('sessQ').addEventListener('input', e => { q = e.target.value.trim(); render(); });
  $('sessQ').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { e.target.value = ''; q = ''; render(); e.target.blur(); } });
  $('sessList').addEventListener('keydown', e => {
    if (e.target.id !== 'sessRen') return; e.stopPropagation();
    if (e.key === 'Enter') finishRename(true); if (e.key === 'Escape') finishRename(false);
  });
  $('sessList').addEventListener('focusout', e => { if (e.target.id === 'sessRen') finishRename(true); });
  function finishRename(ok) {
    const x = renaming; if (!x) return; const v = ($('sessRen') || {}).value; renaming = null;
    if (ok && v && v.trim()) { x.t = v.trim().slice(0, 80); if (x === cur) $('sessTitle').textContent = x.t; }
    render();
  }
  function sessMenu(x, ax, ay) {
    HX.menu(ax, ay, [
      { label: '重命名', icon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 2.6 13.4 5.4 5.6 13.2H2.8v-2.8Z"/></svg>', act: () => { renaming = x; render(); } },
      { label: x.pin ? '取消置顶' : '置顶', icon: HX.UI2.pin, act: () => { x.pin = !x.pin; render(); } },
      { label: '复制会话', desc: '图和设置复制一份，对话不复制', icon: HX.UI.copy, act: () => duplicate(x) },
      { label: '导出', desc: '图 + 对话，不含密钥', icon: HX.UI2.upload, act: () => HX.toast('已导出「' + x.t + '」', x.t + '.hxs') },
      { sep: 1 },
      { label: '删除', icon: HX.UI.trash, danger: 1, act: () => del(x) }
    ]);
  }
  function duplicate(x) {
    if (x === cur) save(cur);
    const src = x.root || (x.build ? x.build() : HX.newGraph([], []));
    const copy = { id: 'n' + (++seq), t: x.t + ' 副本', when: '刚刚', level: x.level, model: x.model, effort: x.effort, build: () => HX.cloneGraph ? HX.cloneGraph(src) : (x.build ? x.build() : HX.newGraph([], [])), intro: '这是「' + x.t + '」的副本，图已复制，对话记录是新的。' };
    SS.splice(SS.indexOf(x) + 1, 0, copy); render(); HX.toast('已复制会话', copy.t);
  }
  function del(x) {
    if (x === cur && running()) { HX.toast('正在运行，先不能删除'); return; }
    const i = SS.indexOf(x); SS.splice(i, 1);
    if (x === cur) { const nx = SS[Math.min(i, SS.length - 1)]; if (nx) { cur = nx; load(nx); } else { create(); return; } }
    render();
    HX.toast('已删除「' + x.t + '」', '图不会被删除，可以在资源库里找到', { undo: () => { SS.splice(i, 0, x); render(); } });
  }
  $('sessList').addEventListener('click', e => {
    const m = e.target.closest('[data-smore]'); if (!m) return;
    e.stopPropagation(); e.preventDefault();
    const x = SS.find(s => s.id === m.dataset.smore), r = m.getBoundingClientRect(); if (x) sessMenu(x, r.left, r.bottom + 4);
  }, true);
  $('sessList').addEventListener('contextmenu', e => {
    const it = e.target.closest('[data-sid]'); if (!it) return; e.preventDefault(); e.stopPropagation();
    const x = SS.find(s => s.id === it.dataset.sid); if (x) sessMenu(x, e.clientX, e.clientY);
  });

  /* ---------------- 保存 / 恢复一个会话的画布状态 ---------------- */
  function save(x) {
    x.root = S.root; x.stack = S.stack.slice(); x.view = Object.assign({}, S.view);
    x.past = S.past.slice(); x.future = S.future.slice(); x.level = S.level; x.sel = [...S.sel];
    x.props = HX.model.props.slice(); x.propHTML = $('proposal').innerHTML; x.propHidden = $('proposal').hidden;
    x.chat = $('chat').innerHTML; x.float = $('floatList').innerHTML; x.log = $('paneLog').innerHTML;
  }
  function load(x) {
    const fresh = !x.root;
    if (fresh) x.root = x.build ? x.build() : HX.newGraph([], []);
    S.root = x.root; S.stack = x.stack ? x.stack.slice() : [{ label: '根图', g: x.root, node: null }];
    S.past.splice(0, S.past.length, ...(x.past || [])); S.future.splice(0, S.future.length, ...(x.future || []));
    HX.model.props.splice(0, HX.model.props.length, ...(x.props || []));
    $('proposal').innerHTML = x.propHTML || ''; $('proposal').hidden = x.propHidden === false ? false : true;
    $('chat').innerHTML = x.chat || ''; $('floatList').innerHTML = x.float || ''; $('paneLog').innerHTML = x.log || '';
    $('float').classList.toggle('is-empty', !$('floatList').children.length);
    $('sessTitle').textContent = x.t;
    HX.switchGraph('enter');                       // 重绘画布、面包屑、属性、父图位置卡、结构树
    if (x.view) { Object.assign(S.view, x.view); HX.renderView(); }
    (x.sel || []).forEach(id => { if (HX.cur().nodes.has(id)) S.sel.add(id); });
    if (S.sel.size) HX.sync();
    HX.setLevel(x.level == null ? 1 : x.level);
    HX.renderHistory(); HX.drawMini(); if (HX.nest) HX.nest.renderTree(true);
    if (fresh) HX.chat.ai(x.intro || '这是一个空白会话。告诉我你想做什么，我来搭一张图；也可以从画布中间的模板开始，或者从左侧节点库拖入节点。');
    empty();
  }
  function open(id) {
    const x = SS.find(s => s.id === id); if (!x || x === cur) return;
    if (running()) { HX.toast('正在运行，先不切换', 'demo 限制：真实产品里运行会在后台继续，会话列表显示 ● 运行中'); return; }
    save(cur); cur = x; load(x); render();
  }
  function create() {
    if (running()) { HX.toast('正在运行，先不切换', 'demo 限制：真实产品里运行会在后台继续'); return; }
    save(cur);
    const x = { id: 'n' + (++seq), t: '新会话', when: '刚刚', level: HX.cfg ? HX.cfg.general.defaultLevel : 1 };
    SS.unshift(x); cur = x; load(x); render();
    setTimeout(() => { const i = $('ta'); if (i && i.focus) i.focus(); }, 60);
  }

  /* ---------------- 空白画布的空状态 ---------------- */
  let emptyEl = null;
  function empty() {
    if (!emptyEl) return;
    const show = S.stack.length === 1 && HX.cur().nodes.size === 0;
    emptyEl.hidden = !show;
  }
  function fromTemplate(k) {
    const t = TPL.find(x => x.k === k); if (!t) return;
    const src = t.build(), g = S.root;
    HX.dispatch({ kind: 'import_apply', label: '从模板「' + t.name + '」创建', actor: 'user', g: g,
      apply() { src.nodes.forEach(n => g.nodes.set(n.id, n)); src.edges.forEach(e => g.edges.set(e.id, e)); },
      revert() { src.nodes.forEach(n => g.nodes.delete(n.id)); src.edges.forEach(e => g.edges.delete(e.id)); } });
    if (cur.t === '新会话') { cur.t = t.name; $('sessTitle').textContent = cur.t; }
    HX.switchGraph('enter'); HX.drawMini(); render(); empty();
    HX.chat.ai('已按「' + t.name + '」模板搭好，' + stat(g).n + ' 个节点。可以直接改，也可以告诉我要怎么调整；按 ⌘Z 可以撤销。');
  }
  function buildEmpty() {
    const stage = document.querySelector('.hx-l4 .hx-stage') || $('vp');
    emptyEl = document.createElement('div'); emptyEl.className = 'hx-cvempty'; emptyEl.hidden = true;
    emptyEl.innerHTML = '<div class="hx-cvempty__card"><div class="hx-cvempty__h">空白画布</div>' +
      '<p>在下面的对话框里描述你想做的事，AI 会帮你搭图。也可以从模板开始，或从左侧节点库把节点拖进来。</p>' +
      '<div class="hx-cvempty__tpl">' + TPL.map(t => '<button data-tpl="' + t.k + '"><b>' + esc(t.name) + '</b><span>' + esc(t.desc) + '</span></button>').join('') + '</div></div>';
    stage.appendChild(emptyEl);
    emptyEl.addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (b) fromTemplate(b.dataset.tpl); });
  }

  /* 空图时几何计算给一个默认框，避免除零 */
  const bounds0 = HX.bounds;
  HX.bounds = function (g, ids) {
    if (!g || !g.nodes.size) return { x0: 0, y0: 0, w: 480, h: 280 };
    return bounds0.apply(this, arguments);
  };

  /* ---------------- 绑定 ---------------- */
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('[data-smore]')) return;
    const it = e.target.closest && e.target.closest('[data-sid]');
    if (it) { open(it.dataset.sid); return; }
    const g = e.target.closest && e.target.closest('[data-lsgo="new"]');
    if (g) { e.stopPropagation(); e.preventDefault(); create(); }
  }, true);
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === '[' || e.key === ']') { e.preventDefault(); const vis = SS.filter(x => x.pin).concat(SS.filter(x => !x.pin)); const i = vis.indexOf(cur); const nx = vis[(i + (e.key === ']' ? 1 : -1) + vis.length) % vis.length]; if (nx) open(nx.id); }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); create(); }
  }, true);
  HX.on('op', () => { render(); empty(); });
  HX.on('run', render);

  HX.sessions = { list: SS, open: open, create: create, cur: () => cur, fromTemplate: fromTemplate, stat: stat, templates: TPL, rename: x => { renaming = x; render(); } };
  buildEmpty(); render(); empty();
})(window.HX);
