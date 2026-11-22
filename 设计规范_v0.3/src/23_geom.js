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
