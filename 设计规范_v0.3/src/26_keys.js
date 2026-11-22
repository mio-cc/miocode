/* ===== 26_keys.js · 快捷键、菜单、命令面板、快速添加、结构编辑 ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(s);
  const mod = e => e.metaKey || e.ctrlKey;

  /* ---------------- 通用菜单（右键菜单与下拉共用） ---------------- */
  let menuItems = [], menuAct = -1;
  HX.menu = function (x, y, items, opt) {
    const m = $('menu'); menuItems = items.filter(i => !i.sep && !i.header && !i.disabled); menuAct = -1;
    m.innerHTML = items.map(it => it.sep ? '<div class="hx-menu__sep"></div>' : it.header ? '<div class="hx-menu__h">' + esc(it.header) + '</div>' :
      '<button class="hx-menu__i' + (it.danger ? ' is-danger' : '') + (it.on ? ' is-on' : '') + (it.desc ? ' is-2l' : '') + '"' + (it.disabled ? ' disabled' : '') + ' data-i="' + menuItems.indexOf(it) + '">' +
      (it.icon ? it.icon : '') + '<span>' + esc(it.label) + (it.desc ? '<span class="hx-menu__d">' + esc(it.desc) + '</span>' : '') + '</span>' + (it.kbd ? '<kbd>' + it.kbd + '</kbd>' : '') + '</button>').join('');
    m.style.minWidth = ((opt && opt.width) || 220) + 'px';
    m.hidden = false;
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
  };
  $('menu').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const it = menuItems[+b.dataset.i]; $('menu').hidden = true; if (it && it.act) it.act(); });
  HX.closeFloating = function () { $('menu').hidden = true; $('quick').hidden = true; $('pop').hidden = true; };
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#menu,#quick,#pop,[data-ctl="sel"],#levelBtn,[data-pop]')) HX.closeFloating();
  });

  /* ---------------- 结构编辑 ---------------- */
  HX.addNodeAt = function (type, x, y, actor) {
    const n = HX.mk(type); n.x = HX.snap(x); n.y = HX.snap(y);
    HX.dispatch(Object.assign(HX.opAdd(HX.cur(), [n], []), { actor: actor || 'user' }));
    HX.select([n.id]); HX.flash(n.id); return n;
  };
  HX.flash = function (id, cls) { const el = HX.nodeEl(id); if (!el) return; cls = cls || 'is-modelflash'; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800); };
  HX.disconnectPort = function (nid, p, dir) {
    const g = HX.cur(), ids = [...g.edges.values()].filter(e => dir === 'in' ? e.t === nid && e.tp === p : e.f === nid && e.fp === p).map(e => e.id);
    if (ids.length) { HX.dispatch(HX.opRemove(g, [], ids)); HX.toast('已断开 ' + ids.length + ' 根连线', null, { undo: true }); }
  };
  HX.deleteSel = function () {
    const g = HX.cur();
    if (S.selEdge) { HX.dispatch(HX.opRemove(g, [], [S.selEdge])); S.selEdge = null; return; }
    if (!S.sel.size) return;
    const op = HX.dispatch(HX.opRemove(g, [...S.sel])); S.sel.clear(); HX.selChanged();
    HX.toast(op.label, null, { undo: true });
  };
  HX.duplicate = function () {
    const g = HX.cur(); if (!S.sel.size) return;
    const map = new Map(), nodes = [];
    S.sel.forEach(id => { const o = g.nodes.get(id); const n = HX.mk(o.type, o.label + ' 副本', Object.assign({}, o.params), o.children ? HX.cloneGraph(o.children) : null); n.x = o.x + 40; n.y = o.y + 40; n.promoted = o.promoted.slice(); map.set(id, n); nodes.push(n); });
    const edges = [...g.edges.values()].filter(e => map.has(e.f) && map.has(e.t)).map(e => HX.edge(map.get(e.f), e.fp, map.get(e.t), e.tp));
    HX.dispatch(HX.opAdd(g, nodes, edges, '复制 ' + nodes.length + ' 个节点')); HX.select(nodes.map(n => n.id));
  };
  HX.cloneGraph = function (g) {
    const map = new Map(), nodes = [];
    g.nodes.forEach(o => { const n = HX.mk(o.type, o.label, Object.assign({}, o.params), o.children ? HX.cloneGraph(o.children) : null); n.x = o.x; n.y = o.y; map.set(o.id, n); nodes.push(n); });
    return HX.newGraph(nodes, [...g.edges.values()].map(e => HX.edge(map.get(e.f), e.fp, map.get(e.t), e.tp)));
  };
  /** ⌘G 封装：选中节点 → 子图引用；跨边界的连线改接到入口 / 出口 */
  HX.group = function (actor) {
    const g = HX.cur(), ids = [...S.sel].filter(id => g.nodes.has(id));
    if (ids.length < 2) { HX.toast('先选中至少 2 个节点', 'Shift + 点击或 Shift + 拖动框选'); return; }
    const set = new Set(ids), inside = ids.map(id => g.nodes.get(id)), b = HX.bounds(g, set);
    let sub;
    const op = HX.opStruct(g, 'group', '封装 ' + ids.length + ' 个节点为子图', gg => {
      const inE = [...gg.edges.values()].filter(e => !set.has(e.f) && set.has(e.t)), outE = [...gg.edges.values()].filter(e => set.has(e.f) && !set.has(e.t));
      const en = HX.mk('子图端口', '入口', { role: 'entry' }), ex = HX.mk('子图端口', '出口', { role: 'exit' });
      en.x = b.x0 - 260; en.y = b.y0; ex.x = b.x1 + 60; ex.y = b.y0;
      const ch = HX.newGraph([en, ex].concat(inside), [...gg.edges.values()].filter(e => set.has(e.f) && set.has(e.t)));
      inE.forEach(e => { const x = HX.edge(en, 'out', e.t, e.tp); ch.edges.set(x.id, x); });
      outE.forEach(e => { const x = HX.edge(e.f, e.fp, ex, 'in'); ch.edges.set(x.id, x); });
      sub = HX.mk('子图引用', '新子图', { ref: '新子图@v0.1' }, ch); sub.x = HX.snap(b.x0); sub.y = HX.snap(b.y0);
      [...gg.edges.values()].forEach(e => { if (set.has(e.f) || set.has(e.t)) gg.edges.delete(e.id); });
      ids.forEach(id => gg.nodes.delete(id)); gg.nodes.set(sub.id, sub);
      const seen = new Set();
      inE.forEach(e => { const key = e.f + e.fp; if (seen.has(key)) return; seen.add(key); const x = HX.edge(e.f, e.fp, sub, 'in'); gg.edges.set(x.id, x); });
      outE.forEach(e => { const x = HX.edge(sub, 'out', e.t, e.tp); gg.edges.set(x.id, x); });
    });
    op.actor = actor || 'user';
    HX.dispatch(op); HX.select([sub.id]); HX.flash(sub.id, 'is-justdone');
    HX.toast('已封装为子图「新子图」', '双击进入；外部连线已改接到入口和出口', { undo: true });
  };
  /** ⌘⇧G 解散子图：内部节点回到当前层，入口/出口两侧的连线直连 */
  HX.ungroup = function () {
    const g = HX.cur(), n = [...S.sel].map(id => g.nodes.get(id)).find(x => x && x.children);
    if (!n) { HX.toast('选中一个子图节点再解散'); return; }
    const ch = n.children, ports = [...ch.nodes.values()].filter(x => x.type === '子图端口'), pset = new Set(ports.map(p => p.id));
    const keep = [...ch.nodes.values()].filter(x => !pset.has(x.id)), b = HX.bounds(ch, new Set(keep.map(x => x.id)));
    const op = HX.opStruct(g, 'ungroup', '解散子图 ' + n.label, gg => {
      const inE = [...gg.edges.values()].filter(e => e.t === n.id), outE = [...gg.edges.values()].filter(e => e.f === n.id);
      [...inE, ...outE].forEach(e => gg.edges.delete(e.id)); gg.nodes.delete(n.id);
      keep.forEach(x => { x.x += n.x - b.x0; x.y += n.y - b.y0; gg.nodes.set(x.id, x); });
      ch.edges.forEach(e => {
        if (!pset.has(e.f) && !pset.has(e.t)) gg.edges.set(e.id, e);
        else if (pset.has(e.f)) inE.forEach(s => { const x = HX.edge(s.f, s.fp, e.t, e.tp); gg.edges.set(x.id, x); });
        else if (pset.has(e.t)) outE.forEach(t => { const x = HX.edge(e.f, e.fp, t.t, t.tp); gg.edges.set(x.id, x); });
      });
    });
    HX.dispatch(op); HX.select(keep.map(x => x.id));
  };
  /** L：自动布局，带位移动画，结束后记为一条 move op */
  HX.autoLayout = function (actor) {
    const g = HX.cur(), pos = HX.layout(g, { cols: g.nodes.size > 12 ? 6 : 99 }), moves = [];
    const b = HX.bounds(g);
    pos.forEach((p, id) => { const n = g.nodes.get(id); moves.push({ id: id, from: { x: n.x, y: n.y }, to: { x: HX.snap(p.x + b.x0), y: HX.snap(p.y + b.y0) } }); });
    const t0 = performance.now(), ms = HX.css('--hx-t-4') === '0ms' ? 1 : 420;
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = HX.ease(t);
      moves.forEach(m => { const n = g.nodes.get(m.id); n.x = m.from.x + (m.to.x - m.from.x) * e; n.y = m.from.y + (m.to.y - m.from.y) * e; HX.moveNodeEl(n); });
      HX.renderEdges();
      if (t < 1) requestAnimationFrame(step);
      else { moves.forEach(m => { const n = g.nodes.get(m.id); n.x = m.from.x; n.y = m.from.y; }); HX.dispatch(Object.assign(HX.opMove(g, moves, '自动布局'), { actor: actor || 'user' })); HX.fit(); }
    };
    requestAnimationFrame(step);
  };
  /** 进入 / 退出子图（视图过渡 + 面包屑） */
  HX.enter = function (n) {
    S.stack.push({ label: n.label, g: n.children, node: n }); HX.switchGraph('enter');
  };
  HX.goto = function (i) { if (i >= S.stack.length - 1) return; const leaving = S.stack.slice(i + 1); S.stack.length = i + 1; leaving.forEach(s => s.node && HX.touch(s.node)); HX.switchGraph('leave'); };
  HX.switchGraph = function (dir) {
    S.sel.clear(); S.selEdge = null; HX.resetDOM(); HX.sync(); HX.renderCrumb(); HX.renderInsp();
    Object.assign(S.view, HX.fitTarget()); HX.renderView();
    const l = $('layer'); l.classList.remove('is-enter', 'is-leave'); void l.offsetWidth; l.classList.add(dir === 'enter' ? 'is-enter' : 'is-leave');
  };
  HX.renderCrumb = function () {
    $('crumb').innerHTML = S.stack.map((s, i) => (i ? '<i>/</i>' : '') + '<button data-ci="' + i + '" class="' + (i === S.stack.length - 1 ? 'is-cur' : '') + '">' + esc(s.label) + '</button>').join('');
  };
  $('crumb').addEventListener('click', e => { const b = e.target.closest('[data-ci]'); if (b) HX.goto(+b.dataset.ci); });

  /* ---------------- 快速添加（A、双击空白、拖线到空白） ---------------- */
  let quickCtx = null, quickList = [], quickAct = 0;
  HX.openQuick = function (cx, cy, ctx) {
    quickCtx = ctx || {}; const q = $('quick');
    const t = quickCtx.type;
    q.innerHTML = '<div class="hx-quick__h">' + (t ? '<i style="--pc:' + HX.tc(t) + '"></i>可接收「' + HX.TYPE[t].n + '」的节点' : '添加节点') + '</div><input class="hx-input is-sm" id="quickIn" placeholder="搜索节点…"><div class="hx-menu" id="quickList"></div>';
    q.hidden = false;
    q.style.left = Math.min(cx, innerWidth - 270) + 'px'; q.style.top = Math.min(cy, innerHeight - 330) + 'px';
    const inp = $('quickIn'); inp.addEventListener('input', renderQuick); inp.addEventListener('keydown', quickKey);
    renderQuick(); inp.focus();
  };
  function quickOptions() {
    const t = quickCtx.type, f = ($('quickIn') && $('quickIn').value || '').trim().toLowerCase();
    return HX.TYPES.filter(ty => (!t || HX.DEF[ty].in.some(p => HX.compat(t, p[1]).ok)) && (!f || (ty + HX.DEF[ty].desc).toLowerCase().indexOf(f) >= 0));
  }
  function renderQuick() {
    quickList = quickOptions(); quickAct = 0;
    $('quickList').innerHTML = quickList.length ? quickList.map((ty, i) => '<button class="hx-menu__i is-2l' + (i === 0 ? ' is-act' : '') + '" data-q="' + i + '"><span class="hx-node__ico">' + HX.ICON[ty] + '</span><span>' + esc(ty) + '<span class="hx-menu__d">' + esc(HX.DEF[ty].desc) + '</span></span></button>').join('')
      : '<div class="hx-menu__h">没有可接收该类型的节点</div>';
    $('quickList').onclick = e => { const b = e.target.closest('[data-q]'); if (b) pickQuick(+b.dataset.q); };
  }
  function quickKey(e) {
    e.stopPropagation();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); quickAct = (quickAct + (e.key === 'ArrowDown' ? 1 : -1) + quickList.length) % quickList.length; $('quickList').querySelectorAll('[data-q]').forEach((b, i) => b.classList.toggle('is-act', i === quickAct)); }
    if (e.key === 'Enter') pickQuick(quickAct);
    if (e.key === 'Escape') $('quick').hidden = true;
  }
  function pickQuick(i) {
    const ty = quickList[i]; if (!ty) return; $('quick').hidden = true;
    const g = HX.cur(), c = quickCtx, at = c.at || HX.toWorld(innerWidth / 2, innerHeight / 2);
    const n = HX.mk(ty); n.x = HX.snap(at[0] + (c.from ? 24 : 0)); n.y = HX.snap(at[1] - 50);
    const inP = c.type ? HX.ports(n).in.find(p => HX.compat(c.type, p[1]).ok) : null;
    if (c.insert) {
      const ed = c.insert, outP = HX.ports(n).out.find(p => HX.compat(p[1], HX.portType(g.nodes.get(ed.t), ed.tp, 'in')).ok);
      const es = [HX.edge(ed.f, ed.fp, n, inP[0])]; if (outP) es.push(HX.edge(n, outP[0], ed.t, ed.tp));
      HX.dispatch(HX.opAdd(g, [n], es, '在连线上插入 ' + ty, [ed]));
    } else if (c.from && inP) HX.dispatch(HX.opAdd(g, [n], [HX.edge(c.from, c.fp, n, inP[0])], '添加 ' + ty + ' 并连线'));
    else HX.dispatch(HX.opAdd(g, [n], []));
    HX.select([n.id]); HX.flash(n.id, 'is-justdone');
  }

  /* ---------------- 右键菜单 ---------------- */
  HX.ctxMenu = function (e) {
    const ne = e.target.closest('.hx-node'), hit = e.target.closest('.hx-edge-hit'), I = HX.UI, g = HX.cur();
    if (ne) {
      const id = ne.dataset.id, n = g.nodes.get(id); if (!S.sel.has(id)) HX.select([id]);
      HX.menu(e.clientX, e.clientY, [{ header: n.label + ' · ' + n.type },
        n.children ? { label: '进入子图', icon: I.enter, kbd: '↵', act: () => HX.enter(n) } : null,
        { label: '重命名', icon: I.pointer, kbd: 'F2', act: () => { const i = document.querySelector('.hx-insp__name'); if (i) { i.focus(); i.select(); } } },
        { label: '复制', icon: I.copy, kbd: '⌘D', act: HX.duplicate },
        { label: '封装为子图', icon: I.group, kbd: '⌘G', act: () => HX.group(), disabled: S.sel.size < 2 },
        n.children ? { label: '解散子图', icon: I.layout, kbd: '⌘⇧G', act: HX.ungroup } : null,
        { label: '聚焦', icon: I.fit, kbd: '2', act: () => HX.fit(true, new Set(S.sel)) },
        { sep: 1 }, { label: '删除', icon: I.trash, kbd: 'Del', danger: 1, act: HX.deleteSel }].filter(Boolean));
    } else if (hit) {
      const ed = g.edges.get(hit.dataset.eid); S.sel.clear(); S.selEdge = ed.id; HX.selChanged();
      HX.menu(e.clientX, e.clientY, [{ header: '连线' },
        { label: '插入节点…', icon: I.plus, act: () => HX.openQuick(e.clientX, e.clientY, { type: HX.portType(g.nodes.get(ed.f), ed.fp, 'out'), insert: ed, at: [ed._mx - 118, ed._my - 40] }) },
        { sep: 1 }, { label: '删除连线', icon: I.trash, kbd: 'Del', danger: 1, act: HX.deleteSel }]);
    } else {
      const at = HX.toWorld(e.clientX, e.clientY);
      HX.menu(e.clientX, e.clientY, [{ header: '画布' },
        { label: '添加节点…', icon: I.plus, kbd: 'A', act: () => HX.openQuick(e.clientX, e.clientY, { at: at }) },
        { label: '自动布局', icon: I.layout, kbd: 'L', act: () => HX.autoLayout() },
        { label: '适应视图', icon: I.fit, kbd: '1', act: () => HX.fit() },
        { label: '全选', icon: I.pointer, kbd: '⌘A', act: () => HX.select([...g.nodes.keys()]) },
        { sep: 1 }, { label: '命令面板', icon: I.cmd, kbd: '⌘K', act: HX.openCmdk }]);
    }
  };

  /* ---------------- 命令面板 ⌘K ---------------- */
  let cmdList = [], cmdAct = 0;
  function commands() {
    const I = HX.UI, c = [
      { g: '运行', label: '运行', kbd: '⌘↵', icon: I.play, act: () => HX.run.start() }, { g: '运行', label: '急停', kbd: '⌘.', icon: I.stop, act: () => HX.run.estop() },
      { g: '画布', label: '适应视图', kbd: '1', icon: I.fit, act: () => HX.fit() }, { g: '画布', label: '自动布局', kbd: 'L', icon: I.layout, act: () => HX.autoLayout() },
      { g: '画布', label: '封装为子图', kbd: '⌘G', icon: I.group, act: () => HX.group() }, { g: '画布', label: '撤销', kbd: '⌘Z', icon: I.undo, act: HX.undo }, { g: '画布', label: '重做', kbd: '⌘⇧Z', icon: I.redo, act: HX.redo },
      { g: '画布', label: '显示 / 隐藏面板', kbd: 'Tab', icon: I.lib, act: HX.toggleFocus },
      { g: '视图', label: '切换浅色 / 深色主题', icon: I.moon, act: HX.toggleTheme }, { g: '视图', label: '全屏', kbd: 'F', icon: I.expand, act: HX.toggleFull },
      { g: '调试', label: '压力测试：200 节点 · 300 连线', desc: '生成大图并显示实时 FPS', icon: I.gauge, act: HX.stress }, { g: '调试', label: '重新载入示例图', icon: I.history, act: HX.reloadTemplate }
    ];
    [0, 1, 2, 3, 4].forEach(l => c.push({ g: '授权', label: '模型授权档位 → ' + l + ' ' + HX.LEVELS[l][0], icon: I.model, act: () => HX.setLevel(l) }));
    HX.TYPES.forEach(t => c.push({ g: '添加节点', label: t, desc: HX.DEF[t].desc, icon: '<span class="hx-node__ico">' + HX.ICON[t] + '</span>', act: () => { const w = HX.toWorld(HX.vpBox.left + HX.vw / 2, HX.vpBox.top + HX.vh / 2); HX.addNodeAt(t, w[0] - 118, w[1] - 60); } }));
    return c;
  }
  HX.openCmdk = function () { if (!S.open) HX.open(); $('cmdk').hidden = false; const i = $('cmdkIn'); i.value = ''; renderCmd(); i.focus(); };
  function renderCmd() {
    const f = $('cmdkIn').value.trim().toLowerCase(); cmdList = commands().filter(c => !f || (c.label + (c.desc || '') + c.g).toLowerCase().indexOf(f) >= 0); cmdAct = 0;
    let h = '', grp = '';
    cmdList.forEach((c, i) => { if (c.g !== grp) { grp = c.g; h += '<div class="hx-menu__h">' + esc(grp) + '</div>'; } h += '<button class="hx-menu__i' + (c.desc ? ' is-2l' : '') + (i === 0 ? ' is-act' : '') + '" data-c="' + i + '">' + c.icon + '<span>' + esc(c.label) + (c.desc ? '<span class="hx-menu__d">' + esc(c.desc) + '</span>' : '') + '</span>' + (c.kbd ? '<kbd>' + c.kbd + '</kbd>' : '') + '</button>'; });
    $('cmdkList').innerHTML = h || '<div class="hx-menu__h">没有匹配的命令</div>';
  }
  function runCmd(i) { const c = cmdList[i]; $('cmdk').hidden = true; if (c) c.act(); }
  $('cmdkIn').addEventListener('input', renderCmd);
  $('cmdkIn').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cmdAct = (cmdAct + (e.key === 'ArrowDown' ? 1 : -1) + cmdList.length) % Math.max(1, cmdList.length); $('cmdkList').querySelectorAll('[data-c]').forEach((b, i) => { b.classList.toggle('is-act', i === cmdAct); if (i === cmdAct) b.scrollIntoView({ block: 'nearest' }); }); }
    if (e.key === 'Enter') runCmd(cmdAct);
    if (e.key === 'Escape') $('cmdk').hidden = true;
  });
  $('cmdkList').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) runCmd(+b.dataset.c); });
  $('cmdk').addEventListener('pointerdown', e => { if (e.target.id === 'cmdk') $('cmdk').hidden = true; });

  /* ---------------- 快捷键（DESIGN.md §10） ---------------- */
  document.addEventListener('keydown', e => {
    const k = e.key, typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (mod(e) && k.toLowerCase() === 'k') { e.preventDefault(); HX.openCmdk(); return; }
    if (typing) return;
    if (!S.open) { if (k === 'f' || k === 'F') { e.preventDefault(); HX.open(); } return; }
    if (k === ' ') { if (!e.repeat) HX.setSpace(true); e.preventDefault(); return; }
    if (mod(e)) {
      const l = k.toLowerCase();
      if (l === 'z') { e.preventDefault(); if (e.shiftKey) HX.redo(); else HX.undo(); }
      else if (l === 'y') { e.preventDefault(); HX.redo(); }
      else if (l === 'a') { e.preventDefault(); HX.select([...HX.cur().nodes.keys()]); }
      else if (l === 'd') { e.preventDefault(); HX.duplicate(); }
      else if (l === 'g') { e.preventDefault(); if (e.shiftKey) HX.ungroup(); else HX.group(); }
      else if (k === 'Enter') { e.preventDefault(); HX.run.start(); }
      else if (k === '.') { e.preventDefault(); HX.run.estop(); }
      return;
    }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[k] && S.sel.size) {
      e.preventDefault(); const g = HX.cur(), d = arrows[k], st = (e.shiftKey ? 5 : 1) * HX.L.GRID;
      HX.dispatch(HX.opMove(g, [...S.sel].map(id => { const n = g.nodes.get(id); return { id: id, from: { x: n.x, y: n.y }, to: { x: n.x + d[0] * st, y: n.y + d[1] * st } }; }), '微移'));
      return;
    }
    switch (k) {
      case 'Delete': case 'Backspace': e.preventDefault(); HX.deleteSel(); break;
      case 'Escape':
        if (!$('menu').hidden || !$('quick').hidden || !$('pop').hidden) HX.closeFloating();
        else if (S.sel.size || S.selEdge) { S.sel.clear(); S.selEdge = null; HX.selChanged(); }
        else if (S.stack.length > 1) HX.goto(S.stack.length - 2);
        else if (S.full) HX.toggleFull(); else HX.close();
        break;
      case 'Enter': { const n = [...S.sel].map(id => HX.cur().nodes.get(id)).find(x => x && x.children); if (n) HX.enter(n); break; }
      case 'v': case 'V': HX.setTool('select'); break;
      case 'h': case 'H': HX.setTool('hand'); break;
      case 'a': case 'A': { e.preventDefault(); const r = HX.vpBox; HX.openQuick(r.left + HX.vw / 2 - 130, r.top + HX.vh / 2 - 150, { at: HX.toWorld(r.left + HX.vw / 2, r.top + HX.vh / 2) }); break; }
      case 'l': case 'L': HX.autoLayout(); break;
      case '1': HX.fit(); break;
      case '2': if (S.sel.size) HX.fit(true, new Set(S.sel)); break;
      case 'f': case 'F': HX.toggleFull(); break;
      case 'Tab': e.preventDefault(); HX.toggleFocus(); break;
      case '/': e.preventDefault(); HX.showLib(true); $('libSearch').focus(); break;
      case 'F2': { const i = document.querySelector('.hx-insp__name'); if (i) { i.focus(); i.select(); } break; }
    }
  });
  document.addEventListener('keyup', e => { if (e.key === ' ') HX.setSpace(false); });
  HX.setTool = function (t) { S.tool = t; HX.setSpace(false); document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('is-on', b.dataset.tool === t)); };
})(window.HX);
