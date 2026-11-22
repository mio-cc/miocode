/* ===== 39_monitor.js · 会话监控：这个会话里所有的运行，一眼看清、按需下钻 =====
   位置：右栏「监控」（原"运行"），顶部条的运行状态点一下也能打开。
   三层，越往下越细：
     ① 一行筛选：全部 / 运行中 / 待处理 / 失败 / 完成（带数量）+ 范围（本会话 / 全部会话）+ 搜索
     ② 运行列表：状态点、名称、进度、用时、费用；运行中的实时刷新
     ③ 点开一次运行：瀑布概览 + 按层分组的步骤（全部 / 失败 / 等待 / 最慢），点步骤定位到画布上的节点
   日志和操作历史收进同一处的两个小标签里。规范：U.09.07 会话监控、B.04.03。 */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(String(s == null ? '' : s)), I = Object.assign({}, HX.UI, HX.UI2);
  const SS = () => (HX.sessions ? HX.sessions.list : []), cur = () => (HX.sessions ? HX.sessions.cur() : {});

  /* ---------------- 把实时运行的每一步记下所在的层 ---------------- */
  let _R = HX.run.R;
  Object.defineProperty(HX.run, 'R', { configurable: true, get: () => _R, set: v => {
    _R = v;
    if (v && !v._mon) {
      v._mon = 1; let path = v.path || '';
      Object.defineProperty(v, 'path', { configurable: true, get: () => path, set: p => { path = p; const sp = v.spans[v.spans.length - 1]; if (sp && !sp.path) sp.path = p; } });
      liveStart(v);
    }
  } });

  /* ---------------- 运行记录 ---------------- */
  let seq = 40;
  const DUR = { Agent: [4, 16], '工具': [1, 6], '上下文装配': [.2, .8], '聚合': [.1, .4], '人工': [20, 90] };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function stepsOf(root, kind) {
    const out = []; let t = 0;
    const visit = (g, layer, round) => {
      [...g.nodes.values()].sort((a, b) => (a.x - b.x) || (a.y - b.y)).forEach(n => {
        if (n.type === '子图端口' || (n.type === '资源' && n.params.kind !== '提示词')) return;
        if (n.children) {
          const R = n.type === '循环' ? Math.min(2, +n.params.max_rounds || 2) : 1;
          for (let r = 1; r <= R; r++) visit(n.children, layer.concat([n.label + (n.type === '循环' ? ' · 第 ' + r + ' 轮' : '')]), r);
          return;
        }
        const d = DUR[n.type] || [.1, .6], dur = rnd(d[0], d[1]) * 1000;
        out.push({ label: n.label, type: n.type, layer: layer.join(' › ') || '根图', a: t, dur: dur, st: 'done', id: n.id }); t += dur * (n.type === '扇出' ? .3 : 1);
      });
    };
    visit(root, [], 1);
    if (kind === 'failed') { const i = out.findIndex((s, k) => k > out.length * .55 && (s.type === 'Agent' || s.type === '工具')); const j = i < 0 ? out.length - 1 : i; out[j].st = 'failed'; out[j].err = s0(out[j]); out.slice(j + 1).forEach(s => { s.st = 'skipped'; s.dur = 0; }); }
    if (kind === 'waiting') { const j = out.findIndex(s => s.type === '人工'); const k = j < 0 ? out.length - 1 : j; out[k].st = 'waiting'; out.slice(k + 1).forEach(s => { s.st = 'pending'; s.dur = 0; }); }
    if (kind === 'running') { const k = Math.floor(out.length * .62); out[k].st = 'running'; out.slice(k + 1).forEach(s => { s.st = 'pending'; s.dur = 0; }); }
    return out;
  }
  function s0(s) { return s.type === '工具' ? '超时：10 秒内没有返回（代码执行）' : '输出不符合「' + (s.label.includes('验收') ? '判定@1' : '执行结果@1') + '」，重写一次后仍失败'; }
  function mk(sess, kind, agoMin, root) {
    const steps = stepsOf(root, kind), dur = steps.reduce((a, s) => Math.max(a, s.a + s.dur), 0);
    const done = steps.filter(s => s.st === 'done').length;
    return { id: 'r' + (++seq), no: seq, sess: sess, st: kind, start: Date.now() - agoMin * 60000, dur: dur, cost: +(steps.filter(s => s.type === 'Agent' && s.st === 'done').length * rnd(.04, .22)).toFixed(2), steps: steps, prog: done / Math.max(1, steps.length), live: false };
  }
  function runsOf(x) {
    if (x.runs) return x.runs;
    const root = x === cur() ? S.root : (x.root || (x.build ? x.build() : null));
    if (!root || !root.nodes.size) return (x.runs = []);
    const plan = { s1: [['failed', 26 * 60], ['done', 51 * 60], ['done', 26 * 3600 / 60]], s2: [['running', 3], ['failed', 2 * 60], ['done', 5 * 60]], s3: [['done', 22 * 60], ['done', 24 * 60 * 7 + 22 * 60]],
      s4: [['waiting', 14], ['done', 3 * 60], ['done', 9 * 60], ['done', 15 * 60]], s5: [['done', 4 * 24 * 60]] }[x.id] || [];
    return (x.runs = plan.map(p => mk(x, p[0], p[1], root)));
  }

  /* 实时运行 → 一条记录 */
  let live = null;
  function liveStart(R) {
    if (live) { const prev = live; liveSync(); if (live === prev) { prev.st = prev.R.end ? prev.st : 'cancelled'; live = null; } }
    const x = cur(); runsOf(x);
    live = { id: 'r' + (++seq), no: seq, sess: x, st: 'running', start: Date.now(), dur: 0, cost: 0, steps: [], prog: 0, live: true, R: R };
    x.runs.unshift(live); sel = null; if (visible()) render();
  }
  function liveSync() {
    if (!live) return; const R = live.R, now = R.end || performance.now();
    live.steps = R.spans.map(s => { const p = (s.path || '').split('/'); p.pop(); if (p[0] === '根图') p.shift(); return { label: s.label, layer: p.map(x => x.replace(/#r(\d+)$/, ' · 第 $1 轮')).join(' › ') || '根图', a: s.a - R.t0, dur: (s.b || now) - s.a, st: s.st === 'done' ? 'done' : s.st, live: 1 }; });
    live.dur = now - R.t0; live.cost = +((R.tokens || 0) / 1000 * 0.006).toFixed(2);
    const st = ($('runStat').className.match(/is-(\w+)/) || [])[1];
    live.st = R.end ? (st === 'done' ? 'done' : R.stop ? 'cancelled' : 'failed') : st === 'waiting' ? 'waiting' : 'running';
    live.prog = R.end ? 1 : Math.min(.95, live.steps.filter(s => s.st === 'done').length / 64);
    if (R.end) live = null;
  }

  /* ---------------- DOM ---------------- */
  const pane = document.querySelector('[data-pane="run"]') || $('rs'), drawer = $('drawer');
  const mon = document.createElement('div'); mon.className = 'hx-mon'; mon.id = 'mon';
  pane.insertBefore(mon, drawer);
  const tabsB = document.querySelector('#rsTabs button[data-v="run"]'); if (tabsB) tabsB.textContent = '监控';
  let view = 'flow', filter = 'all', scope = 'sess', q = '', sel = null, sf = 'all', folded = new Set();
  const visible = () => !pane.hidden && !$('rs').classList.contains('is-collapsed');
  const ST = { running: ['运行中', 'run'], waiting: ['待处理', 'wait'], failed: ['失败', 'bad'], done: ['完成', 'ok'], cancelled: ['已取消', ''], skipped: ['跳过', ''], pending: ['未开始', ''] };
  const fmtD = ms => { const s = Math.round(ms / 1000); return s < 60 ? s + ' 秒' : Math.floor(s / 60) + ' 分 ' + String(s % 60).padStart(2, '0'); };
  const fmtS = ms => ms < 1000 ? (ms / 1000).toFixed(1) + 's' : ms < 60000 ? Math.round(ms / 1000) + 's' : Math.floor(ms / 60000) + 'm' + String(Math.round(ms / 1000) % 60).padStart(2, '0');
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '刚刚' : m < 60 ? m + ' 分钟前' : m < 1440 ? Math.round(m / 60) + ' 小时前' : Math.round(m / 1440) + ' 天前'; };
  const dot = st => '<i class="hx-mon__dot is-' + (ST[st] ? ST[st][1] : '') + '"></i>';

  function all() { const L = scope === 'sess' ? [cur()] : SS(); return L.map(x => runsOf(x).map(r => r)).flat(); }
  function render() {
    if (live) liveSync();
    if (view !== 'flow') { mon.innerHTML = head(); drawer.hidden = false; return; }
    drawer.hidden = true;
    mon.innerHTML = head() + (sel ? detail(sel) : list());
  }
  function head() {
    return '<div class="hx-mon__tabs">' + [['flow', '流程'], ['log', '日志'], ['hist', '操作历史']].map(t => '<button data-mv="' + t[0] + '"' + (view === t[0] ? ' class="is-on"' : '') + '>' + t[1] + '</button>').join('') + '</div>';
  }
  function list() {
    const runs = all(), cnt = k => runs.filter(r => r.st === k).length;
    const F = [['all', '全部', runs.length], ['running', '运行中', cnt('running')], ['waiting', '待处理', cnt('waiting')], ['failed', '失败', cnt('failed')], ['done', '完成', cnt('done')]];
    let L = runs.filter(r => filter === 'all' || r.st === filter).filter(r => !q || (r.sess.t + ' #' + r.no + r.steps.map(s => s.label).join('')).toLowerCase().includes(q.toLowerCase()));
    L.sort((a, b) => (rank(a) - rank(b)) || (b.start - a.start));
    const spend = runs.filter(r => Date.now() - r.start < 864e5).reduce((a, r) => a + r.cost, 0);
    let h = '<div class="hx-mon__bar"><div class="hx-mon__scope">' + [['sess', '本会话'], ['all', '全部会话']].map(s => '<button data-ms="' + s[0] + '"' + (scope === s[0] ? ' class="is-on"' : '') + '>' + s[1] + '</button>').join('') + '</div><span class="sp"></span><span class="hx-mon__spend" data-tip="最近 24 小时的费用">¥' + spend.toFixed(2) + '</span></div>' +
      '<div class="hx-mon__f">' + F.map(f => '<button data-mf="' + f[0] + '"' + (filter === f[0] ? ' class="is-on"' : '') + (f[2] || f[0] === 'all' ? '' : ' disabled') + '>' + (f[0] === 'all' ? '' : dot(f[0])) + f[1] + (f[2] ? '<em>' + f[2] + '</em>' : '') + '</button>').join('') + '</div>' +
      '<div class="hx-mon__q">' + I.search + '<input class="hx-input is-sm" id="monQ" placeholder="搜索运行或步骤" value="' + esc(q) + '" spellcheck="false"></div>';
    if (!L.length) return h + '<div class="hx-mon__e">' + (runs.length ? '没有符合条件的运行' : '这个会话还没有运行过<br><button class="hx-btn is-sm" data-mact="run">' + I.play + '运行一次</button>') + '</div>';
    let lastS = null;
    h += '<div class="hx-mon__l">' + L.map(r => {
      let g = ''; if (scope === 'all' && r.sess !== lastS) { lastS = r.sess; g = '<div class="hx-mon__g">' + esc(r.sess.t) + '</div>'; }
      const fail = r.steps.find(s => s.st === 'failed'), wt = r.steps.find(s => s.st === 'waiting'), rn = r.steps.find(s => s.st === 'running');
      const sub = fail ? '失败于「' + fail.label + '」' : wt ? '等待「' + wt.label + '」' : rn ? '正在「' + rn.label + '」' : r.steps.length + ' 步';
      return g + '<button class="hx-mon__r is-' + r.st + '" data-run="' + r.id + '">' + dot(r.st) + '<span class="hx-mon__m"><span class="hx-mon__t">#' + r.no + (scope === 'all' ? '' : '') + '<small>' + esc(sub) + '</small></span>' +
        (r.st === 'running' || r.st === 'waiting' ? '<span class="hx-mon__p"><i style="width:' + Math.round(r.prog * 100) + '%"></i></span>' : '') + '</span>' +
        '<span class="hx-mon__x"><b>' + fmtS(r.dur) + '</b><small>' + (r.cost ? '¥' + r.cost.toFixed(2) + ' · ' : '') + ago(r.start) + '</small></span></button>';
    }).join('') + '</div>';
    return h;
  }
  const rank = r => ({ running: 0, waiting: 1, failed: 2 })[r.st] == null ? 3 : ({ running: 0, waiting: 1, failed: 2 })[r.st];
  function detail(r) {
    const st = r.steps, max = Math.max(1, ...st.map(s => s.dur)), T = Math.max(1, r.dur);
    const c = k => st.filter(s => s.st === k).length, slow = st.slice().sort((a, b) => b.dur - a.dur).slice(0, 5);
    const SF = [['all', '全部', st.length], ['failed', '失败', c('failed')], ['waiting', '等待', c('waiting') + c('running')], ['slow', '最慢', Math.min(5, st.length)]].filter(f => f[0] === 'all' || f[2]);
    let L = sf === 'all' ? st : sf === 'slow' ? slow : sf === 'waiting' ? st.filter(s => s.st === 'waiting' || s.st === 'running') : st.filter(s => s.st === sf);
    const groups = []; L.forEach(s => { let g = groups.find(x => x.k === s.layer); if (!g) groups.push(g = { k: s.layer, s: [] }); g.s.push(s); });
    const other = r.sess !== cur();
    let h = '<div class="hx-mon__dh"><button class="hx-iconbtn is-sm" data-mact="back" data-tip="返回列表">' + I.chevl + '</button><span class="hx-mon__dt">' + dot(r.st) + '#' + r.no + '<small>' + (ST[r.st] || [''])[0] + '</small></span><span class="sp"></span>' +
      (r.st === 'running' || r.st === 'waiting' ? (r.live ? '<button class="hx-btn is-sm is-ghost" data-mact="stop">' + I.stop + '停止</button>' : '') : '<button class="hx-iconbtn is-sm" data-mact="rerun" data-tip="重新运行">' + I.refresh + '</button>') +
      (r.st === 'failed' ? '<button class="hx-btn is-sm" data-mact="resume">从失败处继续</button>' : '') + '</div>' +
      '<div class="hx-mon__kv"><span><b>' + fmtD(r.dur) + '</b>用时</span><span><b>' + st.filter(s => s.st === 'done').length + '/' + st.length + '</b>步骤</span><span><b>¥' + r.cost.toFixed(2) + '</b>费用</span><span><b>' + new Date(r.start).toTimeString().slice(0, 5) + '</b>开始</span></div>' +
      (other ? '<div class="hx-mon__other">这次运行属于「' + esc(r.sess.t) + '」<button class="hx-btn is-sm is-ghost" data-mact="gosess">切过去</button></div>' : '') +
      '<div class="hx-mon__wf" data-tip="每一条线是一个步骤：横向是时间，长度是用时">' + st.filter(s => s.dur > 0 || s.st === 'running').map((s, i) => '<i class="is-' + (ST[s.st] || [0, ''])[1] + '" style="left:' + (s.a / T * 100).toFixed(2) + '%;width:' + Math.max(.6, s.dur / T * 100).toFixed(2) + '%;top:' + (i % 14) * 3 + 'px"></i>').join('') + '</div>' +
      '<div class="hx-mon__f is-sm">' + SF.map(f => '<button data-sf="' + f[0] + '"' + (sf === f[0] ? ' class="is-on"' : '') + '>' + f[1] + '<em>' + f[2] + '</em></button>').join('') + '</div>';
    h += '<div class="hx-mon__steps">' + groups.map(g => {
      const fo = folded.has(g.k) && sf === 'all', gd = g.s.reduce((a, s) => a + s.dur, 0), gst = g.s.some(s => s.st === 'failed') ? 'failed' : g.s.some(s => s.st === 'running') ? 'running' : g.s.some(s => s.st === 'waiting') ? 'waiting' : g.s.every(s => s.st === 'done') ? 'done' : 'pending';
      return '<div class="hx-mon__sg' + (fo ? ' is-fold' : '') + '"><button class="hx-mon__sgh" data-sg="' + esc(g.k) + '"><span class="hx-lib2__ar">' + I.chevr + '</span>' + dot(gst) + '<span class="n">' + esc(g.k) + '</span><em>' + g.s.length + ' 步 · ' + fmtS(gd) + '</em></button>' +
        (fo ? '' : g.s.map(s => '<button class="hx-mon__s is-' + s.st + '" data-step="' + esc(s.label) + '" data-layer="' + esc(s.layer) + '">' + dot(s.st) + '<span class="n">' + esc(s.label) + (s.err ? '<small>' + esc(s.err) + '</small>' : '') + '</span>' +
          '<span class="b"><i style="width:' + (s.dur / max * 100).toFixed(1) + '%"></i></span><span class="d">' + (s.dur ? fmtS(s.dur) : '—') + '</span></button>').join('')) + '</div>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------------- 交互 ---------------- */
  mon.addEventListener('click', e => {
    const t = e.target, b = k => t.closest('[' + k + ']');
    if (b('data-mv')) { view = b('data-mv').dataset.mv; if (view !== 'flow') { const d = document.querySelector('#drawerTabs button[data-v="' + view + '"]'); if (d) d.click(); } render(); return; }
    if (b('data-ms')) { scope = b('data-ms').dataset.ms; sel = null; render(); return; }
    if (b('data-mf')) { filter = b('data-mf').dataset.mf; render(); return; }
    if (b('data-sf')) { sf = b('data-sf').dataset.sf; render(); return; }
    if (b('data-sg')) { const k = b('data-sg').dataset.sg; folded.has(k) ? folded.delete(k) : folded.add(k); render(); return; }
    if (b('data-run')) { sel = all().find(r => r.id === b('data-run').dataset.run) || null; sf = sel && sel.st === 'failed' ? 'failed' : 'all'; folded.clear(); render(); return; }
    if (b('data-step')) { const el = b('data-step'); locate(el.dataset.step, el.dataset.layer); return; }
    const a = b('data-mact'); if (!a) return;
    const k = a.dataset.mact;
    if (k === 'back') { sel = null; render(); }
    if (k === 'run' || k === 'rerun' || k === 'resume') { if (sel && sel.sess !== cur()) HX.sessions.open(sel.sess.id); sel = null; HX.run.start(); if (k === 'resume') HX.toast('从失败处继续', '已完成的步骤直接复用检查点，不重复调用模型'); }
    if (k === 'stop') HX.run.estop();
    if (k === 'gosess') { const s = sel.sess; HX.sessions.open(s.id); scope = 'sess'; render(); }
  });
  mon.addEventListener('input', e => { if (e.target.id === 'monQ') { q = e.target.value; const pos = e.target.selectionStart; render(); const i = $('monQ'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } } });
  mon.addEventListener('keydown', e => e.stopPropagation());
  function locate(label, layer) {
    if (sel && sel.sess !== cur()) HX.sessions.open(sel.sess.id);
    const want = layer === '根图' ? [] : layer.split(' › ').map(x => x.replace(/ · 第 \d+ 轮$/, ''));
    let hit = null;
    HX.walk(S.root, (n, g, path) => { if (!hit && n.label === label && path.map(p => p.label).join('|') === want.join('|')) hit = { n: n, path: path }; });
    if (!hit) { HX.toast('找不到这个节点', '图在这次运行之后被修改过'); return; }
    const tgt = hit.path[hit.path.length - 1];
    const same = S.stack.length === hit.path.length + 1 && hit.path.every((n, i) => S.stack[i + 1].node === n);
    if (!same) { if (S.stack.length > 1) HX.goto(0); hit.path.forEach(n => HX.enter(n)); }
    setTimeout(() => { if (HX.cur().nodes.has(hit.n.id)) { HX.select([hit.n.id]); HX.fit(true, new Set([hit.n.id])); HX.flash(hit.n.id, 'is-modelflash'); } }, tgt && !same ? 420 : 30);
  }

  /* 打开、刷新 */
  const show0 = HX.panes.showRsTab;
  HX.panes.showRsTab = function (t) { const r = show0.apply(this, arguments); if (t === 'run') render(); return r; };
  $('rsTabs').addEventListener('click', e => { const b = e.target.closest('button[data-v="run"]'); if (b) setTimeout(render, 0); });
  $('runStat').addEventListener('click', () => { HX.panes.setRs(true, 'run'); sel = live ? live : sel; render(); });
  setInterval(() => { if (visible() && view === 'flow' && (live || all().some(r => r.st === 'running'))) { if (sel && sel.st === 'running' && !sel.live) sel.dur += 0; const a = document.activeElement; if (a && a.id === 'monQ') return; render(); } else if (live) liveSync(); }, 700);
  if (HX.sessions) ['open', 'create'].forEach(k => { const f = HX.sessions[k]; HX.sessions[k] = function () { const r = f.apply(this, arguments); sel = null; if (visible()) render(); return r; }; });
  HX.monitor = { render: render, runsOf: runsOf, all: all, open: r => { HX.panes.setRs(true, 'run'); sel = r || null; render(); }, locate: locate, state: () => ({ view, filter, scope, sel, sf }) };
  render();
})(window.HX);
