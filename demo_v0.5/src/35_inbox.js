/* ===== 35_inbox.js · 通知中心（顶部铃铛）+ 账户菜单 + 首次引导 =====
   通知中心汇总：待审批（可以直接批准 / 驳回）、运行完成 / 失败、MCP 连接失败、预算提醒。
   规范：U.09.05 通知中心、U.18 首次使用体验。 */
(function (HX) {
  'use strict';
  const $ = HX.$, esc = s => HX.esc(String(s == null ? '' : s)), C = HX.cfg, I = Object.assign({}, HX.UI, HX.UI2);
  const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  /* ---------------- 数据 ---------------- */
  let seq = 0;
  const items = [
    { id: 'i' + (++seq), kind: 'bad', title: 'MCP 服务 slack 连接失败', sub: '缺少环境变量 SLACK_BOT_TOKEN', when: '21:41', read: false, go: () => HX.center.open('mcp') },
    { id: 'i' + (++seq), kind: 'wait', title: '本月费用已用 43%', sub: '¥128.40 / ¥300 · 预计月底 ¥276', when: '20:00', read: true, go: () => HX.center.open('budget') },
    { id: 'i' + (++seq), kind: 'bad', title: '「代码评审流水线」运行失败', sub: '评审回合第 3 轮：代码执行超时（10 秒）', when: '19:14', read: true, go: () => HX.sessions && HX.sessions.open('s2') }
  ];
  function push(it) { it.id = 'i' + (++seq); it.when = it.when || now(); it.read = false; items.unshift(it); render(); return it; }
  function remove(id) { const i = items.findIndex(x => x.id === id); if (i >= 0) items.splice(i, 1); render(); }

  /* ---------------- DOM ---------------- */
  const bell = document.createElement('button');
  bell.className = 'hx-iconbtn hx-bell'; bell.id = 'bellBtn'; bell.dataset.tip = '通知';
  bell.innerHTML = I.bell + '<b id="bellN" hidden></b>';
  const anchor = ($('palBtn') && $('palBtn').closest('.hx-pal')) || $('themeBtn');
  anchor.parentNode.insertBefore(bell, anchor);
  const pop = document.createElement('div'); pop.className = 'hx-inbox'; pop.id = 'inbox'; pop.hidden = true; document.body.appendChild(pop);
  let tab = 'all';

  function render() {
    const unread = items.filter(x => !x.read).length, waits = items.filter(x => x.kind === 'wait' && x.approve).length;
    const b = $('bellN'); b.hidden = !unread; b.textContent = unread > 9 ? '9+' : unread; b.classList.toggle('is-wait', waits > 0 && waits === unread);
    if (pop.hidden) return;
    const list = items.filter(x => tab === 'all' || (tab === 'todo' ? !!x.approve : !x.approve));
    pop.innerHTML = '<div class="hx-inbox__h"><b>通知</b><span class="sp"></span><button class="hx-btn is-sm is-ghost" data-ib="readall">全部已读</button><button class="hx-iconbtn is-sm" data-ib="set" data-tip="通知设置">' + I.gear + '</button></div>' +
      '<div class="hx-inbox__tabs"><div class="hx-seg">' + [['all', '全部'], ['todo', '待我处理' + (waits ? ' ' + waits : '')], ['info', '动态']].map(t => '<button data-ibt="' + t[0] + '"' + (t[0] === tab ? ' class="is-on"' : '') + '>' + t[1] + '</button>').join('') + '</div></div>' +
      '<div class="hx-inbox__l">' + (list.length ? list.map(x => '<div class="hx-ib' + (x.read ? ' is-read' : '') + '" data-iid="' + x.id + '"><span class="hx-ib__i is-' + x.kind + '"></span><div class="hx-ib__m"><div class="hx-ib__t">' + esc(x.title) + '</div>' + (x.sub ? '<div class="hx-ib__d">' + esc(x.sub) + '</div>' : '') +
        (x.approve ? '<div class="hx-ib__a"><button class="hx-btn is-sm is-ok" data-ib="ok">批准</button><button class="hx-btn is-sm is-ghost" data-ib="no">驳回</button><button class="hx-btn is-sm is-ghost" data-ib="go">在画布上看</button></div>' : '') +
        '</div><span class="hx-ib__w">' + esc(x.when) + '</span></div>').join('') : '<div class="hx-inbox__e">' + (tab === 'todo' ? '没有等你处理的事' : '还没有通知') + '</div>') + '</div>';
  }
  function place() { const r = bell.getBoundingClientRect(); pop.style.top = (r.bottom + 8) + 'px'; pop.style.left = Math.max(8, r.right - 380) + 'px'; }
  bell.addEventListener('click', e => { e.stopPropagation(); pop.hidden = !pop.hidden; if (!pop.hidden) { place(); render(); } });
  document.addEventListener('pointerdown', e => { if (!pop.hidden && !e.target.closest('#inbox') && !e.target.closest('#bellBtn')) pop.hidden = true; });
  pop.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') pop.hidden = true; });
  pop.addEventListener('click', e => {
    const tb = e.target.closest('[data-ibt]'); if (tb) { tab = tb.dataset.ibt; render(); return; }
    const b = e.target.closest('[data-ib]'), row = e.target.closest('[data-iid]'), it = row && items.find(x => x.id === row.dataset.iid);
    if (b && b.dataset.ib === 'readall') { items.forEach(x => { x.read = true; }); render(); return; }
    if (b && b.dataset.ib === 'set') { pop.hidden = true; HX.center.open('general'); return; }
    if (!it) return;
    if (b && (b.dataset.ib === 'ok' || b.dataset.ib === 'no')) { it.approve(b.dataset.ib === 'ok'); remove(it.id); return; }
    it.read = true;
    if ((b && b.dataset.ib === 'go') || it.go) { pop.hidden = true; (it.go || (() => {}))(); }
    render();
  });

  /* ---------------- 接入运行：审批、完成、失败 ---------------- */
  const add0 = HX.chat.add;
  HX.chat.add = function (role, html, opt) {
    const m = add0.apply(this, arguments);
    const mm = /data-run-approve="([^"]+)"/.exec(html || '');
    if (mm && C.general.notifyApproval) {
      const id = mm[1], n = HX.findNode ? HX.findNode(id) : null, name = n ? n.label : '人工节点';
      const sess = HX.sessions ? HX.sessions.cur().t : '';
      push({ kind: 'wait', title: '「' + name + '」等你审批', sub: sess + ' · 运行已暂停在这里', approve: ok => HX.run.answer(id, ok), go: () => { if (n && HX.cur().nodes.has(n.id)) HX.select([n.id]); else if (HX.panes) HX.panes.setRs(true, 'chat'); }, nodeId: id });
      flash();
    }
    return m;
  };
  const ans0 = HX.run.answer;
  HX.run.answer = function (id) { const r = ans0.apply(this, arguments); items.filter(x => x.nodeId === id).forEach(x => remove(x.id)); return r; };
  const toast0 = HX.toast;
  HX.toast = function (title, sub, opt) {
    const r = toast0.apply(this, arguments);
    if (title === '运行完成' && C.general.notifyDone) push({ kind: 'ok', title: '「' + (HX.sessions ? HX.sessions.cur().t : '') + '」运行完成', sub: sub || '' });
    if (/运行失败|已急停/.test(title) && C.general.notifyFail) push({ kind: 'bad', title: title, sub: sub || '' });
    return r;
  };
  const estop0 = HX.run.estop;
  HX.run.estop = function () { const r = estop0.apply(this, arguments); push({ kind: 'bad', title: '已急停', sub: '所有运行已停止，档位降到 0；只有你能解除' }); items.filter(x => x.approve).forEach(x => remove(x.id)); return r; };
  function flash() { bell.animate && bell.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(0)' }], { duration: 420 }); }

  /* ---------------- 账户菜单（左下角） ---------------- */
  function accountMenu(x, y) {
    HX.menu(x, y, [
      { header: '本机 · 单用户（127.0.0.1）' },
      { label: '设置', icon: I.gear, kbd: 'Ctrl+,', act: () => HX.center.open() },
      { label: '包管理', desc: '内置、MCP 服务、扩展包、技能', icon: I.box, act: () => HX.center.open('pkgs') },
      { label: '连接', desc: '模型、GitHub、飞书、数据库……', icon: I.key, act: () => HX.center.open('conns') },
      { label: '资源库', desc: '角色卡、配方、子图库、模板', icon: I.book, act: () => HX.center.open('roles') },
      { label: '预算与用量', icon: I.wallet, act: () => HX.center.open('budget') },
      { sep: 1 },
      { label: '快捷键', icon: I.kbd, kbd: '?', act: () => HX.center.open('keys') },
      { label: '重新查看引导', icon: I.spark, act: () => onboard() },
      { label: '关于与诊断', icon: I.info, act: () => HX.center.open('about') }
    ]);
    const m = $('menu'); if (m) { m.style.transformOrigin = 'bottom left'; const h = m.offsetHeight || 300; m.style.top = Math.max(8, y - h - 8) + 'px'; }
  }
  document.addEventListener('click', e => {
    const g = e.target.closest && e.target.closest('[data-lsgo="set"]');
    if (!g) return;
    e.stopPropagation(); e.preventDefault();
    if (g.classList.contains('hx-ls__me')) { const r = g.getBoundingClientRect(); accountMenu(r.left, r.top); }
    else HX.center.open();
  }, true);
  /* 左栏图标栏补一个资源库入口 */
  const rail = document.querySelector('.hx-ls__rail');
  if (rail) { const b = document.createElement('button'); b.className = 'hx-iconbtn'; b.dataset.tip = '资源库'; b.innerHTML = I.book; b.addEventListener('click', () => HX.center.open('roles')); const sp = rail.querySelector('.sp'); rail.insertBefore(b, sp); }

  /* ---------------- 首次引导（U.18） ---------------- */
  const ob = document.createElement('div'); ob.className = 'hx-dlg'; ob.id = 'onb'; ob.hidden = true; document.body.appendChild(ob);
  let step = 0, pick = 'deepseek', tpl = 'loop';
  function onboard() { step = 0; ob.hidden = false; drawOb(); }
  function drawOb() {
    const steps = '<div class="hx-onb__steps">' + [0, 1, 2].map(i => '<i' + (i <= step ? ' class="is-on"' : '') + '></i>').join('') + '</div>';
    let h = '';
    if (step === 0) h = '<h3>欢迎使用 Harness 积木编排</h3><p>用积木搭一个会自己干活的 AI 系统：每个节点是一块积木（Agent、工具、扇出、循环、人工审批……），连起来就是一套流程。你可以直接在画布上搭，也可以在下面的对话框里告诉 AI 你想做什么，让它帮你搭、帮你改。<br><br>先花一分钟做两件事：连接一个模型，选一个模板。</p>';
    if (step === 1) h = '<h3>连接一个模型</h3><p>选一家提供方并填 API Key（存进系统密钥库）。没有 Key 也可以先用演示模式体验，所有模型调用都是模拟的，不花钱。</p><div class="hx-onb__g">' +
      [['deepseek', 'DeepSeek', '性价比高，长上下文'], ['anthropic', 'Anthropic', 'Claude 系列'], ['openai', 'OpenAI', 'GPT 系列'], ['qwen', '通义千问', '阿里云百炼'], ['ollama', 'Ollama（本地）', '不出网、不计费'], ['demo', '演示模式', '先不配置，模拟调用']].map(x => '<button data-ob="' + x[0] + '"' + (pick === x[0] ? ' class="is-on"' : '') + '><b>' + x[1] + '</b><span>' + x[2] + '</span></button>').join('') + '</div>' +
      (pick !== 'demo' && pick !== 'ollama' ? '<div style="margin-top:16px" class="hx-pw"><input class="hx-input" id="obKey" type="password" placeholder="粘贴 ' + esc((C.provider(pick) || {}).name || '') + ' 的 API Key（demo 里可以留空）"></div>' : '');
    if (step === 2) h = '<h3>从一个模板开始</h3><p>模板是整张图的起点，建好后可以随便改。也可以选"空白画布"，在对话框里描述你的需求。</p><div class="hx-onb__g">' +
      ((HX.sessions && HX.sessions.templates) || []).slice(0, 5).map(t => '<button data-obt="' + t.k + '"' + (tpl === t.k ? ' class="is-on"' : '') + '><b>' + esc(t.name) + '</b><span>' + esc(t.desc) + '</span></button>').join('') + '<button data-obt="blank"' + (tpl === 'blank' ? ' class="is-on"' : '') + '><b>空白画布</b><span>自己搭，或让 AI 搭</span></button></div>';
    const f = '<div class="hx-onb__f">' + (step ? '<button class="hx-btn is-sm is-ghost" data-obn="back">上一步</button>' : '<button class="hx-btn is-sm is-ghost" data-obn="skip">跳过</button>') + '<span class="sp"></span><button class="hx-btn is-primary" data-obn="next">' + (step === 2 ? '开始' : '下一步') + '</button></div>';
    ob.innerHTML = '<div class="hx-onb">' + steps + h + f + '</div>';
  }
  ob.addEventListener('click', e => {
    const p = e.target.closest('[data-ob]'); if (p) { pick = p.dataset.ob; drawOb(); return; }
    const t = e.target.closest('[data-obt]'); if (t) { tpl = t.dataset.obt; drawOb(); return; }
    const n = e.target.closest('[data-obn]'); if (!n) return;
    if (n.dataset.obn === 'skip') { ob.hidden = true; return; }
    if (n.dataset.obn === 'back') { step--; drawOb(); return; }
    if (step === 1) {
      const pv = C.provider(pick), k = (($('obKey') || {}).value || '').trim();
      if (pv && (k || pick === 'ollama')) { pv.state = 'ok'; pv.latency = pv.latency || 350; if (k) pv.key = k.slice(0, 3) + '••••••••' + k.slice(-4); C.changed('models'); }
      if (pick === 'demo') HX.toast('已进入演示模式', '顶部会显示"演示模式"；配置真实模型后可以关闭');
    }
    if (step < 2) { step++; drawOb(); return; }
    ob.hidden = true;
    if (HX.sessions) { HX.sessions.create(); if (tpl !== 'blank') HX.sessions.fromTemplate(tpl); }
    HX.toast('准备好了', '点顶部的「运行」试一次，或者在对话框里让 AI 改图', { tone: 'ok' });
  });
  ob.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') ob.hidden = true; });
  HX.onboard = onboard;
  HX.inbox = { push: push, items: items, render: render, open: () => { pop.hidden = false; place(); render(); } };
  render();
  if (/[?&]onboard=1/.test(location.search || '')) setTimeout(onboard, 300);
})(window.HX);
