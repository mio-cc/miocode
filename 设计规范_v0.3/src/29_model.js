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
