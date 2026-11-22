/* ===== 30_embed.js · 嵌入形态（卡片 / 展开 / 全屏）、主题、压力测试、初始化 ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S;
  const reduced = () => HX.css('--hx-t-4') === '0ms';

  /* ---------------- 对话卡片（只读缩略） ---------------- */
  let cardT = 0;
  HX.drawCard = function () {
    clearTimeout(cardT);
    cardT = setTimeout(() => {
      HX.drawGraph($('cardCanvas'), S.root, 'card');
      let inner = 0; HX.walk(S.root, () => inner++);
      $('cardMeta').textContent = S.root.nodes.size + ' 个节点 · 共 ' + inner + ' 个（含子图）';
    }, 30);
  };

  /* ---------------- 展开（FLIP：从卡片位置放大到中间栏） ---------------- */
  function flipFrom(stage, r0) {
    const r1 = stage.getBoundingClientRect();
    const sx = r0.width / r1.width, sy = r0.height / r1.height;
    stage.style.transform = 'translate(' + (r0.left - r1.left) + 'px,' + (r0.top - r1.top) + 'px) scale(' + sx + ',' + sy + ')';
    stage.style.borderRadius = '14px';
    stage.classList.add('is-shrunk');
  }
  HX.open = function () {
    if (S.open) return;
    const stage = $('stage'), card = $('cardView');
    $('main').style.setProperty('--hx-composer-h', $('composer').offsetHeight + 'px');
    stage.hidden = false; S.open = true;
    HX.measure(); HX.resetDOM(); HX.sync(); HX.renderCrumb(); HX.renderInsp(); HX.renderDrawer();
    Object.assign(S.view, HX.fitTarget()); HX.renderView();
    if (!reduced()) {
      flipFrom(stage, card.getBoundingClientRect());
      void stage.offsetWidth;
      stage.classList.add('is-flip'); stage.style.transform = ''; stage.style.borderRadius = '0'; stage.classList.remove('is-shrunk');
      setTimeout(() => stage.classList.remove('is-flip'), 420);
    }
    $('card').classList.add('is-away');
    setTimeout(() => $('vp').focus({ preventScroll: true }), 60);
  };
  HX.close = function () {
    if (!S.open) return;
    if (S.full) HX.toggleFull();
    const stage = $('stage');
    const done = () => { stage.hidden = true; stage.classList.remove('is-flip', 'is-shrunk'); stage.style.transform = ''; stage.style.borderRadius = ''; S.open = false; $('card').classList.remove('is-away'); HX.drawCard(); };
    HX.closeFloating();
    if (reduced()) return done();
    const r0 = $('cardView').getBoundingClientRect();
    stage.classList.add('is-flip'); flipFrom(stage, r0);
    setTimeout(done, 400);
  };
  HX.toggleFull = function () {
    if (!S.open) { HX.open(); return; }
    S.full = !S.full; $('stage').classList.toggle('is-full', S.full);
    $('fullBtn').innerHTML = S.full ? HX.UI.shrink : HX.UI.expand;
    $('fullBtn').dataset.tip = S.full ? '退出全屏 · F / Esc' : '全屏 · F';
    requestAnimationFrame(() => { HX.measure(); HX.renderView(); HX.drawMini(); });
  };

  /* ---------------- 主题（默认浅色） ---------------- */
  HX.toggleTheme = function () {
    const html = document.documentElement, dark = html.dataset.theme !== 'dark';
    html.dataset.theme = dark ? 'dark' : 'light';
    $('themeBtn').innerHTML = dark ? HX.UI.sun : HX.UI.moon;
    try { localStorage.setItem('hx-theme', html.dataset.theme); } catch (e) { /* file:// 下可能不可用 */ }
    HX.drawCard(); HX.drawMini();
  };

  /* ---------------- 压力测试：200 节点 · 300 连线 + 实时 FPS ---------------- */
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
    if (!S.open) HX.open();
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
    if (S.open) { HX.resetDOM(); HX.sync(); HX.renderCrumb(); HX.renderInsp(); HX.fit(); }
    HX.drawCard(); HX.toast('已重新载入示例图');
  };

  /* ---------------- 初始化 ---------------- */
  function init() {
    try { const t = localStorage.getItem('hx-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* 忽略 */ }
    HX.fillIcons();
    if (document.documentElement.dataset.theme === 'dark') $('themeBtn').innerHTML = HX.UI.sun;
    HX.setRoot(HX.buildTemplate());
    HX.bindPointer(); HX.bindPanels(); HX.bindModel();
    HX.setLevel(2);
    HX.on('op', op => {
      if (S.open) { HX.sync(); HX.renderInsp(); HX.renderHistory(); }
      HX.drawCard();
    });
    $('cardView').addEventListener('click', HX.open);
    $('openBtn').addEventListener('click', HX.open);
    $('cardRun').addEventListener('click', () => { HX.open(); setTimeout(HX.run.start, 450); });
    $('closeBtn').addEventListener('click', HX.close);
    $('fullBtn').addEventListener('click', HX.toggleFull);
    $('themeBtn').addEventListener('click', HX.toggleTheme);
    $('runBtn').addEventListener('click', () => HX.run.start());
    $('stopBtn').addEventListener('click', () => HX.run.estop());
    if (window.ResizeObserver) new ResizeObserver(() => { $('main').style.setProperty('--hx-composer-h', $('composer').offsetHeight + 'px'); }).observe($('composer'));
    window.addEventListener('resize', () => { if (!S.open) HX.drawCard(); });
    HX.drawCard();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { HX.drawCard(); if (S.open) HX.sync(); });
  }
  init();
})(window.HX);
