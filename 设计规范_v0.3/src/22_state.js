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
