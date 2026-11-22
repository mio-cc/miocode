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
