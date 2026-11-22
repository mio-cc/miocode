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
