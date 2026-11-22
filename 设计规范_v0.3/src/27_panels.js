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
