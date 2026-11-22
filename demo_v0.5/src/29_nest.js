/* ===== 29_nest.js · 嵌套系统怎么打开、怎么展示 =====
   三种打开方式 + 两种位置感知：
     ① 预览（Peek）：点子图节点上的缩略图 / 选中后按 P → 节点旁弹出只读大图，运行状态实时刷新；里面还有子系统可以继续往下看
     ② 进入（Dive）：双击 / Enter / 预览里的「进入编辑」→ 画布从节点位置放大进入内部；Esc 或面包屑回到上一层（从节点位置缩回）
     ③ 直达（结构树）：左侧栏「结构」列出整张图里所有嵌套系统，任意一层点一下直接到
     · 父图位置卡：在子系统里时，左上角显示上一层的缩略图（当前节点描边）和这一层与外面的连接
     · 面包屑：顶部条，任意上层直达
   示例图在原「闭环迭代」里加了第三层「资料采集」（子图引用，内部是一套完整的小系统）。 */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(s);
  const UP = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12.8V3.6M4 7.4 8 3.4l4 4"/></svg>';

  /* ---------------- 示例图：加第三层 ---------------- */
  const build0 = HX.buildTemplate;
  HX.buildTemplate = function () {
    const root = build0(), mk = HX.mk, E = HX.edge;
    const loop = [...root.nodes.values()].find(n => n.type === '循环'); if (!loop) return root;
    const g = loop.children, find = l => [...g.nodes.values()].find(n => n.label === l);
    const pool = find('执行池'), c3 = find('验收者配方'); if (!pool || !c3) return root;

    const ie = mk('子图端口', '入口', { role: 'entry' });
    const sm = mk('资源', '小模型', { kind: '模型', value: 'small-model' });
    const t1 = mk('工具', '检索', { tool: '检索', risk: 'L0' });
    const t2 = mk('工具', '网页抓取', { tool: '浏览器', risk: 'L1' });
    const ca = mk('上下文装配', '采集员配方', { recipe: '执行者配方@1', budget: 0.1 });
    const ag = mk('Agent', '采集员', { output_schema: '执行结果@1' });
    const dd = mk('聚合', '按来源去重', { op: 'dedupe', key: 'url' });
    const cs = mk('上下文装配', '摘要员配方', { recipe: '执行者配方@1', budget: 0.06 });
    const s2 = mk('Agent', '摘要员', { output_schema: '执行结果@1', temperature: 0.2 });
    const sum = mk('子图端口', '摘要端口', { role: 'summary' });
    const ox = mk('子图端口', '出口', { role: 'exit' });
    const inner = HX.newGraph([ie, sm, t1, t2, ca, ag, dd, cs, s2, sum, ox], [
      E(ie, 'out', ca, 'in'), E(sm, 'ref', ca, 'model'), E(ca, 'context', ag, 'context'), E(sm, 'ref', ag, 'model'),
      E(t1, 'endpoint', ag, 'tools'), E(t2, 'endpoint', ag, 'tools'), E(ag, 'result', dd, 'items'), E(dd, 'result', cs, 'in'),
      E(cs, 'context', s2, 'context'), E(sm, 'ref', s2, 'model'), E(s2, 'result', ox, 'in'), E(s2, 'result', sum, 'in')]);
    HX.applyLayout(inner, { cols: 5 });

    const sub = mk('子图引用', '资料采集', { ref: '资料采集@v1.2', pin: 'snapshot' }, inner);
    const e0 = [...g.edges.values()].find(e => e.f === pool.id && e.t === c3.id); if (e0) g.edges.delete(e0.id);
    g.nodes.set(sub.id, sub);
    [E(pool, 'results', sub, 'in'), E(sub, 'out', c3, 'in')].forEach(e => g.edges.set(e.id, e));
    HX.applyLayout(g, { cols: 6 });
    return root;
  };

  /* ---------------- 路径工具 ---------------- */
  function pathTo(target) { let res = null; HX.walk(S.root, (n, g, path) => { if (!res && n === target) res = path.concat([n]); }); return res; }
  function stackIndex(n) { return S.stack.findIndex(s => s.node === n); }
  /** 直达某个容器节点（null = 根图）。已在路径上就退回去，否则按完整路径重建面包屑 */
  function go(n) {
    if (!n) { if (S.stack.length > 1) HX.goto(0); return; }
    const i = stackIndex(n);
    if (i === S.stack.length - 1) return;
    if (i > 0) { HX.goto(i); return; }
    const p = pathTo(n); if (!p) return;
    const first = p[S.stack.length - 1], fel = first && HX.cur().nodes.has(first.id) ? HX.nodeEl(first.id) : null, o = fel ? originOf(fel) : null;
    S.stack = [S.stack[0]].concat(p.map(x => ({ label: x.label, g: x.children, node: x })));
    HX.switchGraph('enter');
    if (o) setOrigin(o);
  }

  /* ---------------- ② 进入：从节点位置放大进去，从节点位置缩回来 ---------------- */
  function originOf(el) {
    const r = el.getBoundingClientRect(), v = $('vp').getBoundingClientRect();
    return [r.left - v.left + r.width / 2, r.top - v.top + Math.min(r.height / 2, 80)];
  }
  let oT = 0;
  function setOrigin(o) {
    const l = $('layer'); l.style.transformOrigin = o[0].toFixed(0) + 'px ' + o[1].toFixed(0) + 'px';
    clearTimeout(oT); oT = setTimeout(() => { l.style.transformOrigin = ''; }, 520);
  }
  const enter0 = HX.enter;
  HX.enter = function (n) {
    const el = HX.nodeEl(n.id), o = el ? originOf(el) : null;
    enter0.call(this, n);
    if (o) setOrigin(o);
  };
  const goto0 = HX.goto;
  HX.goto = function (i) {
    const from = S.stack[i + 1] && S.stack[i + 1].node;
    goto0.call(this, i);
    if (!from) return;
    const el = HX.nodeEl(from.id);
    if (el) { setOrigin(originOf(el)); S.sel.clear(); S.sel.add(from.id); HX.selChanged(); setTimeout(() => HX.flash(from.id), 380); }
  };
  const sw0 = HX.switchGraph;
  HX.switchGraph = function () { closePeek(); const r = sw0.apply(this, arguments); renderParent(); renderTree(); return r; };

  /* ---------------- 父图位置卡（在子系统里时显示） ---------------- */
  let parentMin = false;
  function renderParent() {
    const el = $('nestCard'), d = S.stack.length;
    if (d < 2 || !S.stack[d - 1].node) { el.hidden = true; return; }      // 压力测试等临时图没有父节点
    const par = S.stack[d - 2], node = S.stack[d - 1].node, g = par.g;
    const lab = id => { const x = g.nodes.get(id); return x ? esc(x.label) : '?'; };
    const ins = [...g.edges.values()].filter(e => e.t === node.id).map(e => '<div><em>进</em>' + lab(e.f) + '.' + esc(e.fp) + ' → <b>' + esc(e.tp) + '</b></div>');
    const outs = [...g.edges.values()].filter(e => e.f === node.id).map(e => '<div><em>出</em><b>' + esc(e.fp) + '</b> → ' + lab(e.t) + '.' + esc(e.tp) + '</div>');
    el.hidden = false; el.classList.toggle('is-min', parentMin);
    el.innerHTML = '<div class="hx-nest__h"><span>上一层</span><b>' + esc(par.label) + '</b><span class="sp"></span>' +
      '<button class="hx-iconbtn is-sm" data-nest="min" data-tip="' + (parentMin ? '展开' : '收起') + '">' + (parentMin ? HX.UI.chevd : HX.UI.collapse) + '</button>' +
      '<button class="hx-iconbtn is-sm" data-nest="up" data-tip="回到上一层 · Esc">' + UP + '</button></div>' +
      '<div class="hx-nest__cv" data-nest="up" data-tip="点击回到上一层"><canvas id="nestCv"></canvas></div>' +
      '<div class="hx-nest__io">' + (ins.join('') || '<div><em>进</em>（无）</div>') + (outs.join('') || '<div><em>出</em>（无）</div>') + '</div>';
    requestAnimationFrame(drawParent);
  }
  function drawParent() {
    const cv = $('nestCv'), d = S.stack.length; if (!cv || d < 2 || parentMin || !S.stack[d - 1].node) return;
    const par = S.stack[d - 2], node = S.stack[d - 1].node;
    const m = HX.drawGraph(cv, par.g, 'mini'); if (!m) return;
    const c = cv.getContext('2d'), x = node.x * m.s + m.ox, y = node.y * m.s + m.oy, w = HX.nodeW(node) * m.s, h = HX.nodeH(node) * m.s;
    c.save(); c.strokeStyle = HX.css('--hx-text-1'); c.lineWidth = 1.5;
    c.beginPath(); if (c.roundRect) c.roundRect(x - 3, y - 3, w + 6, h + 6, 3); else c.rect(x - 3, y - 3, w + 6, h + 6); c.stroke(); c.restore();
  }

  /* ---------------- ① 预览（Peek） ---------------- */
  let peek = null;          // { path:[容器节点…], anchor: 当前画布上的锚点节点 | null }
  HX.nest = {};
  function closePeek() { if (!peek) return; peek = null; $('peek').hidden = true; }
  function openPeek(n, anchor) {
    if (!n || !n.children) return;
    peek = { path: [n], anchor: anchor === undefined ? (HX.cur().nodes.has(n.id) ? n : null) : anchor };
    renderPeek(true);
  }
  const ST = { idle: '待运行', queued: '排队中', running: '运行中', done: '已完成', failed: '失败', waiting: '等待审批', skipped: '已跳过', cached: '缓存' };
  const statusTxt = n => ST[n.status] || '待运行';
  function renderPeek(place) {
    const el = $('peek'), n = peek.path[peek.path.length - 1];
    const full = pathTo(n) || [n];
    const subs = [...n.children.nodes.values()].filter(x => x.children);
    const ref = n.type === '子图引用' ? '<span class="hx-peek__ref">' + esc(n.params.ref) + ' · ' + esc(n.params.pin) + '</span>' : '';
    el.innerHTML =
      '<div class="hx-peek__h"><span class="hx-node__ico">' + HX.ICON[n.type] + '</span>' +
        '<div class="hx-peek__ttl"><b>' + esc(n.label) + '</b>' + ref + '<span class="hx-peek__path">' + ['根图'].concat(full.map(x => esc(x.label))).join(' / ') + '</span></div>' +
        '<span class="hx-badge hx-peek__st is-' + n.status + '">' + statusTxt(n) + '</span>' +
        '<button class="hx-iconbtn is-sm" data-pk="close" data-tip="关闭 · Esc">' + HX.UI.x + '</button></div>' +
      '<div class="hx-peek__cv"><canvas id="peekCv"></canvas><span class="hx-peek__cnt">' + n.children.nodes.size + ' 个节点 · ' + n.children.edges.size + ' 条连线</span></div>' +
      '<div class="hx-peek__subs">' +
        (peek.path.length > 1 ? '<button class="hx-chip" data-pk="back">' + HX.UI.chevl + '回到「' + esc(peek.path[peek.path.length - 2].label) + '」</button>' : '') +
        (subs.length ? '<span class="hx-peek__lbl">里面还有</span>' + subs.map(x => '<button class="hx-chip" data-pk="sub" data-id="' + x.id + '">' + HX.ICON[x.type] + esc(x.label) + '<em>' + x.children.nodes.size + '</em></button>').join('') : '<span class="hx-peek__lbl">这一层里没有再嵌套的子系统</span>') +
      '</div>' +
      '<div class="hx-peek__f"><span>只读预览 · 运行状态实时刷新</span><span class="sp"></span>' +
        '<button class="hx-btn is-sm is-ghost" data-pk="tree">在结构树中定位</button>' +
        '<button class="hx-btn is-sm is-primary" data-pk="enter">' + HX.UI.enter + '进入编辑<kbd>↵</kbd></button></div>';
    el.hidden = false;
    if (place) placePeek();
    requestAnimationFrame(drawPeek);
  }
  /** 放在锚点节点右边（放不下放左边，都放不下居中），缩放原点对着节点 */
  function placePeek() {
    const el = $('peek'), vw = HX.vw || 1000, vh = HX.vh || 700, W = Math.min(560, vw - 24);
    el.style.width = W + 'px';
    const H = el.offsetHeight || 460;
    let x = (vw - W) / 2, y = Math.max(64, (vh - H) / 2), ox = W / 2, oy = H / 2;
    const a = peek.anchor && HX.nodeEl(peek.anchor.id);
    if (a) {
      const r = a.getBoundingClientRect(), v = $('vp').getBoundingClientRect(), L = r.left - v.left, R = r.right - v.left, T = r.top - v.top;
      x = R + 14 + W <= vw - 12 ? R + 14 : (L - 14 - W >= 12 ? L - 14 - W : Math.max(12, (vw - W) / 2));
      y = Math.max(64, Math.min(T, vh - H - 12));
      ox = x > L ? 0 : W; oy = Math.max(0, Math.min(H, T + 40 - y));
    }
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
    el.style.setProperty('--ox', ox + 'px'); el.style.setProperty('--oy', oy + 'px');
  }
  function drawPeek() { if (!peek) return; const cv = $('peekCv'); if (cv) HX.drawGraph(cv, peek.path[peek.path.length - 1].children, 'card'); }
  function enterPeek() { if (!peek) return; const n = peek.path[peek.path.length - 1]; closePeek(); go(n); }
  Object.assign(HX.nest, { peek: openPeek, closePeek: closePeek, peeking: () => peek && peek.path[peek.path.length - 1], go: go, enterPeek: enterPeek, pathTo: pathTo });

  /* ---------------- ③ 结构树（左侧栏「结构」） ---------------- */
  let treeSig = '';
  function containers(g, d, out) { g.nodes.forEach(n => { if (n.children) { out.push([n, d]); containers(n.children, d + 1, out); } }); return out; }
  function renderTree(force) {
    const box = $('nestTree'); if (!box || !S.root) return;
    const list = containers(S.root, 1, []), cur = HX.cur(), onPath = new Set(S.stack.map(s => s.node).filter(Boolean));
    const sig = list.map(x => x[0].id + x[0].status + x[0].label + x[0].children.nodes.size).join('|') + '#' + S.stack.length + '#' + S.stack.map(s => s.label).join('/');
    if (!force && sig === treeSig) return; treeSig = sig;
    const row = (n, d) => '<button class="hx-tree__i' + ((n ? n.children === cur : cur === S.root) ? ' is-cur' : '') + (n && onPath.has(n) ? ' is-path' : '') + '" data-tn="' + (n ? n.id : 'root') + '" style="--d:' + d + '">' +
      (n ? HX.ICON[n.type] : HX.UI.graph) + '<span class="hx-tree__t">' + esc(n ? n.label : '根图') + '</span>' +
      '<span class="hx-tree__n">' + (n ? n.children : S.root).nodes.size + '</span>' +
      '<i class="hx-tree__st is-' + (n ? n.status : 'idle') + '"></i>' +
      (n ? '<span class="hx-tree__pv" role="button" data-tp="' + n.id + '" data-tip="预览 · 不离开当前层">' + HX.UI.search + '</span>' : '') + '</button>';
    box.innerHTML = row(null, 0) + list.map(x => row(x[0], x[1])).join('') +
      '<div class="hx-tree__tip">点一层直接进入 · 放大镜只预览不进入</div>';
  }
  HX.nest.renderTree = renderTree;
  HX.nest.peek = (n, a) => openPeek(n, a);

  /* ---------------- 绑定 ---------------- */
  HX.nest.init = function () {
    const vp = $('vp'); let down = null;
    vp.addEventListener('pointerdown', e => {
      down = [e.clientX, e.clientY];
      if (peek && !(e.target.closest && e.target.closest('#peek'))) closePeek();
    }, true);
    vp.addEventListener('click', e => {
      const el = document.elementFromPoint(e.clientX, e.clientY) || e.target;      // 指针捕获后 target 是画布，按坐标取真实元素
      const th = el.closest && el.closest('.hx-node__thumb'); if (!th) return;
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;      // 拖动节点不触发
      const ne = th.closest('.hx-node'), n = ne && HX.cur().nodes.get(ne.dataset.id);
      if (n && n.children) openPeek(n);
    });
    vp.addEventListener('wheel', e => { if (peek && !(e.target.closest && e.target.closest('#peek'))) closePeek(); }, { passive: true, capture: true });
    $('peek').addEventListener('pointerdown', e => e.stopPropagation());
    $('peek').addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    $('peek').addEventListener('click', e => {
      const b = e.target.closest('[data-pk]'); if (!b) return;
      const k = b.dataset.pk;
      if (k === 'close') closePeek();
      else if (k === 'enter') enterPeek();
      else if (k === 'back') { peek.path.pop(); renderPeek(false); }
      else if (k === 'sub') { const n = peek.path[peek.path.length - 1].children.nodes.get(b.dataset.id); if (n) { peek.path.push(n); renderPeek(false); } }
      else if (k === 'tree') {
        HX.panes.setLs(true); $('secTree').classList.remove('is-closed');
        const it = document.querySelector('[data-tn="' + peek.path[peek.path.length - 1].id + '"]');
        if (it) { it.scrollIntoView({ block: 'nearest' }); it.classList.add('is-ping'); setTimeout(() => it.classList.remove('is-ping'), 900); }
      }
    });
    $('nestCard').addEventListener('click', e => {
      const b = e.target.closest('[data-nest]'); if (!b) return;
      if (b.dataset.nest === 'up') HX.goto(S.stack.length - 2);
      else { parentMin = !parentMin; renderParent(); }
    });
    $('nestTree').addEventListener('click', e => {
      const pv = e.target.closest('[data-tp]');
      if (pv) { e.stopPropagation(); const n = HX.findNode(pv.dataset.tp); if (n) openPeek(n, HX.cur().nodes.has(n.id) ? n : null); return; }
      const b = e.target.closest('[data-tn]'); if (!b) return;
      go(b.dataset.tn === 'root' ? null : HX.findNode(b.dataset.tn));
    });
    document.addEventListener('keydown', e => {
      const ae = document.activeElement, typing = /INPUT|TEXTAREA|SELECT/.test(ae.tagName) || ae.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (peek) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closePeek(); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); enterPeek(); }
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        const n = [...S.sel].map(id => HX.cur().nodes.get(id)).find(x => x && x.children);
        if (n) { e.preventDefault(); openPeek(n); }
      }
    }, true);
    HX.on('op', () => { renderTree(); if (peek) renderPeek(false); });
    setInterval(() => {
      renderTree();
      if (peek) { drawPeek(); const st = $('peek').querySelector('.hx-peek__st'), n = peek.path[peek.path.length - 1]; if (st && !st.classList.contains('is-' + n.status)) { st.className = 'hx-badge hx-peek__st is-' + n.status; st.textContent = statusTxt(n); } }
      if (S.stack.length > 1) drawParent();
    }, 400);
    renderTree(true); renderParent();
  };
})(window.HX);
