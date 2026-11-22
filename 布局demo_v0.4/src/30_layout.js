/* ===== 30_layout.js · v0.4 布局：画布常驻中间、左右侧栏、底部居中对话框、浮动回复、主题、压力测试、初始化 =====
   替代 v0.3 的 30_embed.js（卡片 / 展开 / 全屏 FLIP）。其余模块原样复用。 */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(s);
  const s = d => '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

  /* 本布局新增的几个界面图标（同一套 1.5px 线宽规格） */
  Object.assign(HX.UI, {
    panelL: s('<rect x="1.8" y="2.6" width="12.4" height="10.8" rx="2"/><path d="M6 2.6v10.8"/>'),
    panelR: s('<rect x="1.8" y="2.6" width="12.4" height="10.8" rx="2"/><path d="M10 2.6v10.8"/>'),
    gear: s('<circle cx="8" cy="8" r="2.2"/><path d="M8 1.6v1.8M8 12.6v1.8M1.6 8h1.8M12.6 8h1.8M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M3.5 12.5l1.3-1.3M11.2 4.8l1.3-1.3"/>')
  });

  /* ---------------- 画布常驻：没有「卡片 ↔ 展开」，S.open 恒为真 ---------------- */
  HX.drawCard = function () { /* v0.4 布局没有对话卡片缩略图 */ };
  HX.open = function () { /* 画布常驻 */ };
  HX.close = function () { if (rsOpen()) setRs(false); };

  /* 适应视图时只避开画布内的浮动件：顶部停靠栏、底部对话框（侧栏不压在画布上） */
  HX.fitTarget = function (ids, maxK) {
    const b = HX.bounds(HX.cur(), ids);
    const comp = $('composer').offsetHeight || 112;
    const left = S.stack.length > 1 ? 268 : 32, right = 32, top = 72, bottom = comp + 48;   // 子系统里左上有父图位置卡
    const W = Math.max(200, HX.vw - left - right), H = Math.max(160, HX.vh - top - bottom);
    const k = Math.max(0.2, Math.min(maxK || 1, W / (b.w + 40), H / (b.h + 40)));
    return { k: k, x: left + (W - b.w * k) / 2 - b.x0 * k, y: top + (H - b.h * k) / 2 - b.y0 * k };
  };

  /* ---------------- 侧栏 ---------------- */
  const shell = () => $('shell');
  const rsOpen = () => !$('rs').classList.contains('is-collapsed');
  let rsTab = 'insp', full = null;

  function setLs(on) {
    shell().classList.toggle('ls-min', !on);
    $('lsToggle').classList.toggle('is-on', on);
    $('lsToggle').dataset.tip = on ? '收起左侧栏 · [' : '展开左侧栏 · [';
    if (on) requestAnimationFrame(() => HX.segThumb($('libTabs')));
  }
  function setRs(on, tab) {
    if (tab) showRsTab(tab);
    $('rs').classList.toggle('is-collapsed', !on);
    shell().classList.toggle('rs-open', on);
    $('rsToggle').classList.toggle('is-on', on);
    $('rsToggle').dataset.tip = on ? '收起右侧栏 · ]' : '展开右侧栏 · ]';
    $('app').classList.toggle('rs-chat', on && rsTab === 'chat');
    if (on) requestAnimationFrame(() => { HX.segThumb($('rsTabs')); if (rsTab === 'run') HX.segThumb($('drawerTabs')); if (rsTab === 'chat') $('chat').scrollTop = 1e9; });
    updateDot();
  }
  function showRsTab(v) {
    rsTab = v;
    $('rsTabs').querySelectorAll('button[data-v]').forEach(b => b.classList.toggle('is-on', b.dataset.v === v));
    document.querySelectorAll('.hx-rs__pane').forEach(p => { p.hidden = p.dataset.pane !== v; });
    $('app').classList.toggle('rs-chat', rsOpen() && v === 'chat');
    requestAnimationFrame(() => {
      HX.segThumb($('rsTabs'));
      if (v === 'run') { HX.segThumb($('drawerTabs')); HX.renderDrawer(); }
      if (v === 'chat') $('chat').scrollTop = 1e9;
    });
  }
  HX.panes = { setLs: setLs, setRs: setRs, showRsTab: showRsTab };   // 注意：HX.layout 已被 23_geom.js 的自动布局占用

  /* F：专注画布 = 两侧栏都收起；再按一次恢复 */
  HX.toggleFull = function () {
    if (!full) {
      full = { ls: !shell().classList.contains('ls-min'), rs: rsOpen() };
      setLs(false); setRs(false); S.full = true;
    } else {
      setLs(full.ls); setRs(full.rs); full = null; S.full = false;
    }
    $('fullBtn').innerHTML = S.full ? HX.UI.shrink : HX.UI.expand;
    $('fullBtn').dataset.tip = S.full ? '退出专注 · F' : '专注画布（收起两侧栏）· F';
  };

  /* 右侧栏收起时有选中 → 开关上亮一个小点，提示属性在右边 */
  function updateDot() { $('rsToggle').classList.toggle('has-dot', !rsOpen() && (S.sel.size > 0 || !!S.selEdge)); }

  /* 输入框上方的「将附带选中」提示 */
  function updateCtx() {
    const g = HX.cur(), ids = [...S.sel];
    if (!ids.length) { $('compHint').innerHTML = '没有选中节点 · 模型会以整张图为上下文'; return; }
    const names = ids.slice(0, 2).map(id => { const n = g.nodes.get(id); return n ? '<b>' + esc(n.label) + '</b>' : ''; }).join(' ');
    $('compHint').innerHTML = '将附带选中：' + names + (ids.length > 2 ? ' 等 ' + ids.length + ' 个' : '');
  }

  /* 画布尺寸随侧栏变化时，让内容在屏幕上不跳 */
  let lastLeft = null;
  function onVpResize() {
    const r = $('vp').getBoundingClientRect();
    if (lastLeft !== null && r.left !== lastLeft) { S.view.x -= (r.left - lastLeft); }
    lastLeft = r.left;
    HX.measure(); HX.renderView(); HX.drawMini();
  }

  /* ---------------- 会话列表（示意数据） ---------------- */
  const SESS = [
    { t: '竞品定价调研', m: '闭环迭代 · 14 节点', cur: true },
    { t: '代码评审流水线', m: '生成-评审 · 运行中', run: true },
    { t: '周报自动生成', m: '9 节点 · 昨天' },
    { t: '客服工单分类', m: '对话 · 3 天前' },
    { t: '论文综述 · 多模型对比', m: '扇出 ×4 · 上周' }
  ];
  function renderSess() {
    $('sessList').innerHTML = SESS.map((x, i) => '<button class="hx-sess__item' + (x.cur ? ' is-cur' : '') + '" data-si="' + i + '"><span class="hx-sess__t">' + esc(x.t) + '</span>' +
      '<span class="hx-sess__m">' + (x.run ? '<span class="is-run">●</span>' : HX.UI.graph) + esc(x.m) + '</span></button>').join('');
  }

  /* ---------------- 浮动回复：对话框上方显示最近几条 ---------------- */
  const MAX_FLOAT = 3;
  function floatEmpty() { $('float').classList.toggle('is-empty', !$('floatList').children.length); }
  function addFloat(m) {
    const f = document.createElement('div');
    f.className = m.className.replace('is-enter', '') + ' is-enter';
    f.innerHTML = m.innerHTML;
    $('floatList').appendChild(f);
    while ($('floatList').children.length > MAX_FLOAT) $('floatList').firstChild.remove();
    $('float').classList.remove('is-hidden');
    floatEmpty(); $('floatList').scrollTop = 1e9;
    return f;
  }
  function wrapChat() {
    const orig = HX.chat.add;
    HX.chat.add = function (role, html, opt) {
      const m = orig.call(this, role, html, opt);
      const f = addFloat(m);
      const rm = m.remove.bind(m);
      m.remove = function () { rm(); f.remove(); floatEmpty(); };   // 「正在输入」占位被移除时，浮动副本一起移除
      return m;
    };
  }

  /* ---------------- 主题（默认浅色） ---------------- */
  HX.toggleTheme = function () {
    const html = document.documentElement, dark = html.dataset.theme !== 'dark';
    html.dataset.theme = dark ? 'dark' : 'light';
    $('themeBtn').innerHTML = dark ? HX.UI.sun : HX.UI.moon;
    try { localStorage.setItem('hx-theme', html.dataset.theme); } catch (e) { /* file:// 下可能不可用 */ }
    HX.drawMini();
  };

  /* ---------------- 压力测试：200 节点 · 300 连线 + 实时 FPS（命令面板里调用） ---------------- */
  let fpsRaf = 0;
  function fpsMeter(on) {
    const el = $('fps'); cancelAnimationFrame(fpsRaf); el.hidden = !on; if (!on) return;
    let n = 0, t0 = performance.now();
    const loop = t => {
      n++;
      if (t - t0 >= 500) {
        const f = Math.round(n * 1000 / (t - t0)); n = 0; t0 = t; const g = HX.cur();
        el.classList.toggle('is-low', f < 50);
        el.innerHTML = '<b>' + f + '</b> FPS<br>' + g.nodes.size + ' 节点 · ' + g.edges.size + ' 连线 · 缩放 ' + Math.round(S.view.k * 100) + '%';
        if (S.stack[S.stack.length - 1].label !== '压力测试') { el.hidden = true; return; }
      }
      fpsRaf = requestAnimationFrame(loop);
    };
    fpsRaf = requestAnimationFrame(loop);
  }
  HX.stress = function () {
    const types = ['Agent', '聚合', '扇出', '工具', '上下文装配', '分支', '资源'], nodes = [];
    for (let i = 0; i < 200; i++) { const n = HX.mk(types[i % types.length], types[i % types.length] + ' ' + (i + 1)); n.x = (i % 20) * 300; n.y = Math.floor(i / 20) * 260; nodes.push(n); }
    const g = HX.newGraph(nodes, []); let tries = 0;
    while (g.edges.size < 300 && tries++ < 6000) {
      const i = Math.floor(Math.random() * 199), j = i + 1 + Math.floor(Math.random() * Math.min(25, 199 - i)), a = nodes[i], b = nodes[j];
      const op = HX.ports(a).out[0], ip = HX.ports(b).in.find(p => HX.compat(op[1], p[1]).ok && (p[2] || ![...g.edges.values()].some(e => e.t === b.id && e.tp === p[0])));
      if (ip) { const e = HX.edge(a, op[0], b, ip[0]); g.edges.set(e.id, e); }
    }
    S.stack.push({ label: '压力测试', g: g, node: null }); HX.switchGraph('enter');
    fpsMeter(true);
    HX.toast('压力测试：' + g.nodes.size + ' 节点 · ' + g.edges.size + ' 连线', '自动平移缩放 4 秒，之后可以自己拖动试试。Esc 返回', { ms: 5000 });
    const t0 = performance.now(), v0 = Object.assign({}, S.view);
    const pan = t => { const p = (t - t0) / 4000; if (p > 1 || S.stack[S.stack.length - 1].g !== g) return; S.view.x = v0.x - Math.sin(p * Math.PI) * 900; S.view.k = Math.max(0.2, v0.k * (1 + 0.8 * Math.sin(p * Math.PI))); HX.renderView(); requestAnimationFrame(pan); };
    setTimeout(() => requestAnimationFrame(pan), 500);
  };
  HX.reloadTemplate = function () {
    HX.setRoot(HX.buildTemplate()); S.past.length = 0; S.future.length = 0;
    HX.resetDOM(); HX.sync(); HX.renderCrumb(); HX.renderInsp(); HX.fit();
    HX.toast('已重新载入示例图');
  };

  /* ---------------- 初始化 ---------------- */
  function bind() {
    $('lsToggle').addEventListener('click', () => setLs(shell().classList.contains('ls-min')));
    $('rsToggle').addEventListener('click', () => setRs(!rsOpen()));
    $('rsClose').addEventListener('click', () => setRs(false));
    $('rsTabs').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) showRsTab(b.dataset.v); });
    $('floatAll').addEventListener('click', () => setRs(true, 'chat'));
    $('floatHide').addEventListener('click', () => $('float').classList.add('is-hidden'));
    $('ta').addEventListener('focus', () => { if ($('floatList').children.length) $('float').classList.remove('is-hidden'); });
    $('composer').addEventListener('contextmenu', e => e.stopPropagation());
    $('float').addEventListener('contextmenu', e => e.stopPropagation());

    document.querySelectorAll('[data-fold]').forEach(b => b.addEventListener('click', () => $(b.dataset.fold).classList.toggle('is-closed')));
    document.addEventListener('click', e => {
      const g = e.target.closest('[data-lsgo]'); if (!g) return;
      const v = g.dataset.lsgo;
      if (v === 'new') HX.toast('新建会话', 'demo 里只示意：会在左侧列表顶部插入一个空会话，画布清空');
      else if (v === 'set') HX.toast('设置', 'demo 里只示意：模型提供方、密钥、价格表、资源池、MCP、外观');
      else { setLs(true); const sec = $(v === 'sess' ? 'secSess' : 'secLib'); sec.classList.remove('is-closed'); if (v === 'lib') setTimeout(() => $('libSearch').focus(), 60); }
    });
    $('sessList').addEventListener('click', e => {
      const b = e.target.closest('[data-si]'); if (!b) return;
      const x = SESS[+b.dataset.si]; if (x.cur) return;
      HX.toast('切换到「' + x.t + '」', 'demo 里只示意：每个会话有自己的画布和对话记录');
    });

    /* 选中变化：更新输入框上下文提示、右侧栏开关上的小点 */
    const sel0 = HX.selChanged;
    HX.selChanged = function () { const r = sel0.apply(this, arguments); updateCtx(); updateDot(); return r; };
    /* 「/」聚焦节点库搜索：先展开左侧栏 */
    const lib0 = HX.showLib;
    HX.showLib = function (on) { if (on) setLs(true); return lib0.call(this, true); };

    /* [ ] 切换左右侧栏，I 打开属性 */
    document.addEventListener('keydown', e => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '[') { e.preventDefault(); setLs(shell().classList.contains('ls-min')); }
      else if (e.key === ']') { e.preventDefault(); setRs(!rsOpen()); }
      else if (e.key === 'i' || e.key === 'I') { e.preventDefault(); setRs(true, 'insp'); }
    });

    if (window.ResizeObserver) {
      new ResizeObserver(onVpResize).observe($('vp'));
      new ResizeObserver(() => $('vp').style.setProperty('--hx-comp-h', $('composer').offsetHeight + 'px')).observe($('composer'));
    } else window.addEventListener('resize', onVpResize);
  }

  function init() {
    try { const t = localStorage.getItem('hx-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* 忽略 */ }
    HX.fillIcons();
    if (document.documentElement.dataset.theme === 'dark') $('themeBtn').innerHTML = HX.UI.sun;
    HX.setRoot(HX.buildTemplate());
    HX.bindPointer(); HX.bindPanels(); HX.bindModel();
    wrapChat(); bind(); renderSess();
    HX.setLevel(2);
    HX.on('op', () => { HX.sync(); HX.renderInsp(); HX.renderHistory(); updateCtx(); });
    $('themeBtn').addEventListener('click', HX.toggleTheme);
    $('fullBtn').addEventListener('click', HX.toggleFull);
    $('runBtn').addEventListener('click', () => HX.run.start());
    $('stopBtn').addEventListener('click', () => HX.run.estop());

    /* 画布常驻打开 */
    S.open = true;
    setLs(true); setRs(false); showRsTab('insp');
    $('vp').style.setProperty('--hx-comp-h', $('composer').offsetHeight + 'px');
    HX.measure(); lastLeft = $('vp').getBoundingClientRect().left;
    HX.resetDOM(); HX.sync(); HX.renderCrumb(); HX.renderInsp(); HX.renderDrawer();
    if (HX.nest) HX.nest.init();
    Object.assign(S.view, HX.fitTarget()); HX.renderView(); HX.drawMini();
    updateCtx();

    HX.chat.ai('我按「闭环迭代」模板搭好了一张图：外层是主脑，循环节点里是智囊团 → 聚类 → 决策 → 执行池 → 验收。可以直接在画布上改，也可以在这里用文字让我改，我改过的地方都会标 <span class="k">AI</span>，可以撤销。');
    floatEmpty();
    setTimeout(() => $('vp').focus({ preventScroll: true }), 60);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { HX.sync(); HX.segThumb($('libTabs')); HX.segThumb($('rsTabs')); });
  }
  init();
})(window.HX);
