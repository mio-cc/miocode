/* ===== 36_composer.js · 输入框增强 =====
   ① 模型菜单：当前会话的编排者模型 + 推理强度；"管理模型…"进设置
   ② 附件：上传文件、@ 引用节点 / 文件 / 会话 / 技能，显示为输入框上方的小标签
   ③ 斜杠命令：输入 / 弹出命令列表（运行、解释、优化、加审批、压缩、清空……）
   ④ 上下文用量环：这次发送大约占模型窗口多少；点开看构成，可以压缩对话
   ⑤ 发送键：按"设置 › 通用 › 发送消息"切换 Enter / Ctrl+Enter
   规范：U.09.06 输入框。 */
(function (HX) {
  'use strict';
  const $ = HX.$, esc = s => HX.esc(String(s == null ? '' : s)), C = HX.cfg, S = HX.S, I = Object.assign({}, HX.UI, HX.UI2);
  const ta = $('ta'), comp = $('composer'), rowEl = comp.querySelector('.hx-composer__row'), box = comp.querySelector('.hx-composer__box');

  /* ---------------- DOM 改造 ---------------- */
  const atts = document.createElement('div'); atts.className = 'hx-atts'; atts.id = 'atts'; box.insertBefore(atts, ta);
  const attBtn = document.createElement('button'); attBtn.className = 'hx-cbtn'; attBtn.id = 'attBtn'; attBtn.dataset.tip = '附件与引用 · @'; attBtn.innerHTML = I.plus;
  rowEl.insertBefore(attBtn, rowEl.firstChild);
  const old = rowEl.querySelector('.hx-l4model'); if (old) old.remove();
  const ctxBtn = document.createElement('button'); ctxBtn.className = 'hx-cbtn'; ctxBtn.id = 'ctxBtn'; ctxBtn.dataset.tip = '上下文用量';
  const mBtn = document.createElement('button'); mBtn.className = 'hx-cbtn'; mBtn.id = 'modelBtn'; mBtn.dataset.tip = '编排者模型与推理强度';
  const send = $('sendBtn'); rowEl.insertBefore(ctxBtn, send); rowEl.insertBefore(mBtn, send);
  const pick = document.createElement('div'); pick.className = 'hx-pick'; pick.id = 'pick'; pick.hidden = true; document.body.appendChild(pick);

  /* ---------------- 当前会话的模型 ---------------- */
  const sess = () => (HX.sessions ? HX.sessions.cur() : {});
  const curModel = () => { const s = sess(); const id = s.model || C.roles.orch; const m = C.model(id); return m && m.provider.state === 'ok' && m.on ? m : (C.allModels(true)[0] || null); };
  /* 思考强度：每个模型支持的挡位不同（Codex：minimal–xhigh；Claude：off / low–max），由连接测试时读取，m.effort 给出 */
  const LV = { off: '关闭', minimal: '极低', low: '低', medium: '中', high: '高', xhigh: '超高', max: '最高' };
  const EFFD = { off: '不思考，最快最省', minimal: '几乎不思考，适合简单改写和分类', low: '简单任务', medium: '日常任务（推荐）', high: '复杂调试与设计', xhigh: '困难、含糊的任务', max: '质量优先，最慢最贵' };
  const ORDER = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
  const effOf = m => m ? (m.effort || (m.caps.includes('推理') ? ['low', 'medium', 'high'] : null)) : null;
  function curEff(m) {
    const L = effOf(m); if (!L) return null; const s = sess(), want = (s.effortBy || {})[m.id] || s.effort || C.effort || 'medium';
    if (L.includes(want)) return want;
    const wi = ORDER.indexOf(want); return L.slice().sort((a, b) => Math.abs(ORDER.indexOf(a) - wi) - Math.abs(ORDER.indexOf(b) - wi))[0];
  }
  HX.effort = { LV: LV, of: effOf, cur: curEff };
  function renderModelBtn() {
    const m = curModel();
    mBtn.innerHTML = '<span class="m">' + I.model + '</span>' + (m ? esc(m.name) + (effOf(m) ? '<small>· ' + LV[curEff(m)] + '</small>' : '') : '<span style="color:var(--hx-danger)">没有可用模型</span>') + I.chevd.replace('<svg', '<svg style="width:11px;height:11px;opacity:.6"');
  }

  /* ---------------- 弹出层（共用） ---------------- */
  let kind = null, list = [], act = 0, onPick = null;
  function place(anchor, w) {
    pick.style.width = (w || 340) + 'px';
    const r = anchor.getBoundingClientRect(), h = pick.offsetHeight || 300;
    pick.style.left = Math.min(innerWidth - (w || 340) - 8, Math.max(8, r.left)) + 'px';
    pick.style.top = Math.max(8, r.top - h - 8) + 'px';
  }
  function close() { pick.hidden = true; kind = null; list = []; onPick = null; [attBtn, mBtn, ctxBtn].forEach(b => b.classList.remove('is-on')); }
  function showList(k, anchor, groups, cb, foot, w) {
    kind = k; onPick = cb; list = []; act = 0;
    let h = '<div class="hx-pick__l">';
    groups.forEach(g => {
      if (!g.items.length) return;
      if (g.h) h += '<div class="hx-pick__h">' + esc(g.h) + '</div>';
      g.items.forEach(it => { const i = list.length; list.push(it); h += '<button class="hx-pick__i' + (it.on ? ' is-on' : '') + '" data-pi="' + i + '"' + (it.disabled ? ' disabled' : '') + '>' + (it.icon || '') + '<span class="t">' + it.label + (it.desc ? '<small>' + it.desc + '</small>' : '') + '</span>' + (it.right || '') + '</button>'; });
    });
    if (!list.length) h += '<div class="hx-pick__h" style="padding:14px">没有匹配项</div>';
    h += '</div>' + (foot ? '<div class="hx-pick__f">' + foot + '</div>' : '');
    pick.innerHTML = h; pick.hidden = false; place(anchor, w); hi();
  }
  function hi() { const en = [...pick.querySelectorAll('.hx-pick__i:not([disabled])')]; pick.querySelectorAll('.hx-pick__i').forEach(b => b.classList.remove('is-act')); if (kind === 'model') return; const b = en[act]; if (b) { b.classList.add('is-act'); b.scrollIntoView({ block: 'nearest' }); } }
  pick.addEventListener('pointerdown', e => e.preventDefault());
  pick.addEventListener('click', e => {
    const b = e.target.closest('[data-pi]'); if (b && onPick) { const it = list[+b.dataset.pi], cb = onPick; if (kind !== 'model') close(); cb(it); return; }
    const ef = e.target.closest('[data-eff]'); if (ef) { const m = curModel(), ss = sess(); if (m) (ss.effortBy = ss.effortBy || {})[m.id] = ef.dataset.eff; renderModelBtn(); openModel(); return; }
    const mg = e.target.closest('[data-manage]'); if (mg) { close(); HX.center.open('models'); return; }
    const cz = e.target.closest('[data-compact]'); if (cz) { close(); compact(); }
  });
  document.addEventListener('pointerdown', e => { if (!pick.hidden && !e.target.closest('#pick') && !e.target.closest('#attBtn,#modelBtn,#ctxBtn')) close(); });

  /* ---------------- ① 模型菜单 ---------------- */
  function openModel() {
    const cur = curModel(), groups = [];
    C.providers.filter(p => p.state === 'ok').forEach(p => groups.push({ h: p.name, items: p.models.filter(m => m.on).map(m => ({ id: m.id, on: cur && cur.id === m.id, icon: I.cpu, label: esc(m.name), desc: esc(m.win + ' 上下文 · ' + m.caps.join(' · ') + (m.pin ? ' · ¥' + m.pin + ' / ' + m.pout : ' · 免费')) })) }));
    const off = C.providers.filter(p => p.state !== 'ok' && p.models.length).slice(0, 4);
    if (off.length) groups.push({ h: '未连接', items: off.map(p => ({ id: '_cfg_' + p.id, icon: I.plug, label: esc(p.name), desc: '去设置里填 API Key', right: I.chevr })) });
    const L = effOf(cur), e = curEff(cur);
    const foot = (L ? '<span>思考</span><div class="hx-seg hx-eff">' + L.map(k => '<button data-eff="' + k + '" data-tip="' + EFFD[k] + '"' + (k === e ? ' class="is-on"' : '') + '>' + LV[k] + '</button>').join('') + '</div>'
      : '<span>这个模型不支持调节思考</span>') + '<span class="sp"></span><button class="hx-btn is-sm is-ghost" data-manage>管理模型…</button>';
    showList('model', mBtn, [{ h: '编排者模型 · 只影响当前会话', items: [] }].concat(groups), it => {
      if (it.id.startsWith('_cfg_')) { close(); HX.center.newConn('llm.' + it.id.slice(5)); return; }
      sess().model = it.id; renderModelBtn(); renderCtx(); openModel(); HX.toast('已切换编排者模型', C.modelName(it.id) + ' · 只影响「' + (sess().t || '') + '」');
    }, foot, 380);
    mBtn.classList.add('is-on');
  }
  mBtn.addEventListener('click', e => { e.stopPropagation(); if (kind === 'model') close(); else openModel(); });

  /* ---------------- ② 附件与引用 ---------------- */
  const FILES = [['竞品价格表.xlsx', '38 KB · 调研资料'], ['调研提纲.md', '4 KB · 调研资料'], ['上季度报告.pdf', '2.1 MB · 调研资料'], ['客户访谈记录.docx', '96 KB · 调研资料']];
  const att = [];
  function renderAtts() {
    atts.innerHTML = att.map((a, i) => '<span class="hx-att' + (a.k === 'node' ? ' is-node' : '') + '">' + (a.k === 'node' ? I.graph : a.k === 'sess' ? I.chat : a.k === 'skill' ? I.spark : I.file) + esc(a.label) + '<button data-ai="' + i + '" aria-label="移除">' + I.x + '</button></span>').join('');
    renderCtx();
  }
  atts.addEventListener('click', e => { const b = e.target.closest('[data-ai]'); if (b) { att.splice(+b.dataset.ai, 1); renderAtts(); ta.focus(); } });
  function addAtt(a) { if (!att.some(x => x.k === a.k && x.label === a.label)) att.push(a); renderAtts(); }
  function mentionGroups(q) {
    q = (q || '').toLowerCase(); const ok = s => !q || s.toLowerCase().includes(q);
    const nodes = [...HX.cur().nodes.values()].filter(n => !n.ghost && ok(n.label)).slice(0, 8).map(n => ({ k: 'node', label: n.label, icon: '<span class="hx-node__ico" style="width:14px;height:14px">' + (HX.ICON[n.type] || '') + '</span>', desc: n.type + (n.children ? ' · 子图' : '') }));
    const files = FILES.filter(f => ok(f[0])).map(f => ({ k: 'file', label: f[0], icon: I.file, desc: f[1] }));
    const ss = (HX.sessions ? HX.sessions.list : []).filter(s => s !== sess() && ok(s.t)).slice(0, 5).map(s => ({ k: 'sess', label: s.t, icon: I.chat, desc: '引用这个会话的结论和图' }));
    const sk = C.skills.filter(s => s.on && ok(s.name)).map(s => ({ k: 'skill', label: s.name, icon: I.spark, desc: s.desc }));
    return [{ h: '当前图里的节点', items: nodes }, { h: '文件（允许目录）', items: files }, { h: '其他会话', items: ss }, { h: '技能', items: sk }];
  }
  function openAttach() {
    const groups = [{ h: '添加', items: [{ k: '_up', label: '上传文件…', icon: I.upload, desc: '图片、PDF、表格、文本；存进本次会话的工作区' }, { k: '_sel', label: '附带画布上选中的节点', icon: I.pointer, desc: S.sel.size ? '当前选中 ' + S.sel.size + ' 个' : '先在画布上选中节点', disabled: !S.sel.size }] }].concat(mentionGroups(''));
    showList('att', attBtn, groups, it => {
      if (it.k === '_up') { addAtt({ k: 'file', label: '竞品截图.png' }); HX.toast('已添加附件', '竞品截图.png · 412 KB（demo 用示例文件）'); return; }
      if (it.k === '_sel') { [...S.sel].forEach(id => { const n = HX.cur().nodes.get(id); if (n) addAtt({ k: 'node', label: n.label }); }); return; }
      addAtt(it); ta.focus();
    }, '<span>输入 <kbd>@</kbd> 也能直接引用</span>');
    attBtn.classList.add('is-on');
  }
  attBtn.addEventListener('click', e => { e.stopPropagation(); if (kind === 'att') close(); else openAttach(); });

  /* ---------------- ③ 斜杠命令 ---------------- */
  const SAY = t => () => { ta.value = t; ta.dispatchEvent(new Event('input')); ta.focus(); };
  const CMDS = [
    ['运行', '运行当前图', I.play, () => { ta.value = ''; HX.run.start(); }],
    ['解释', '让 AI 解释选中的节点在做什么', I.info, SAY('解释一下选中的节点在做什么')],
    ['优化', '让 AI 检查整张图并提出优化', I.spark, SAY('优化这张图')],
    ['加审批', '在选中节点后面加一个人工审批', I.check, SAY('在这后面加一个人工审批')],
    ['整理布局', '自动排列当前层的节点', I.layout, SAY('整理布局')],
    ['模型', '切换这个会话的编排者模型', I.cpu, () => { ta.value = ''; openModel(); }],
    ['技能', '附带一个技能，让 AI 按它的说明做', I.spark, () => { ta.value = '@'; ta.dispatchEvent(new Event('input')); }],
    ['模板', '从模板新建一个会话', I.book, () => { ta.value = ''; HX.center.open('tpls'); }],
    ['压缩', '把较早的对话压缩成摘要，腾出上下文', I.layers, () => { ta.value = ''; compact(); }],
    ['清空', '清空这个会话的对话记录（图不受影响）', I.trash, () => { ta.value = ''; $('chat').innerHTML = ''; $('floatList').innerHTML = ''; $('float').classList.add('is-empty'); renderCtx(); HX.toast('已清空对话', '图和运行记录不受影响'); }],
    ['设置', '打开设置', I.gear, () => { ta.value = ''; HX.center.open(); }]
  ];
  function openSlash(q) {
    const items = CMDS.filter(c => !q || c[0].includes(q) || c[1].includes(q)).map(c => ({ cmd: c, icon: c[2], label: '<code>/' + esc(c[0]) + '</code>', desc: esc(c[1]) }));
    showList('slash', comp, [{ h: '命令', items: items }], it => it.cmd[3](), '<span><kbd>↑</kbd> <kbd>↓</kbd> 选择 · <kbd>↵</kbd> 执行 · <kbd>Esc</kbd> 关闭</span>', 360);
  }
  function openMention(q) { showList('at', comp, mentionGroups(q), it => { ta.value = ta.value.replace(/@[^\s@]*$/, ''); addAtt(it); ta.focus(); }, '<span>选中后显示在输入框上方，发送时一起交给 AI</span>', 360); }
  ta.addEventListener('input', () => {
    const v = ta.value, m = /(^|\s)@([^\s@]*)$/.exec(v);
    if (/^\/[^\s]*$/.test(v)) openSlash(v.slice(1));
    else if (m) openMention(m[2]);
    else if (kind === 'slash' || kind === 'at') close();
    renderCtx();
  });
  comp.addEventListener('keydown', e => {
    if (e.target !== ta) return;
    if (!pick.hidden && (kind === 'slash' || kind === 'at' || kind === 'att')) {
      const en = [...pick.querySelectorAll('.hx-pick__i:not([disabled])')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + en.length) % Math.max(1, en.length); hi(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); const b = en[act]; if (b) b.click(); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const mod = e.ctrlKey || e.metaKey, pref = C.general.send;
      if (pref === 'mod' && !mod) { e.stopImmediatePropagation(); return; }              // 换行
      if (pref === 'mod' && mod) { e.preventDefault(); e.stopImmediatePropagation(); doSend(); return; }
      if (pref === 'enter' && !mod) { beforeSend(); }
    }
  }, true);
  send.addEventListener('click', beforeSend, true);
  function beforeSend() {
    if (!att.length || !ta.value.trim() || ta.value.includes('（附带：')) return;
    ta.value = ta.value.trim() + '（附带：' + att.map(a => (a.k === 'node' ? '@' : '') + a.label).join('、') + '）';
    setTimeout(() => { att.length = 0; renderAtts(); }, 0);
  }
  function doSend() { beforeSend(); send.click(); }

  /* ---------------- ④ 上下文用量 ---------------- */
  let compacted = 0;
  function parts() {
    const m = curModel(), win = m ? parseInt(m.win, 10) * (/M/.test(m.win) ? 1000000 : 1000) : 128000;
    const msgs = $('chat').querySelectorAll('.hx-msg').length;
    const nodes = HX.cur().nodes.size;
    const p = [['系统提示与角色卡', 3200, 'var(--hx-text-3)'], ['当前图（精简视图）', 900 + nodes * 140, 'var(--hx-type-ctx)'], ['对话记录', Math.max(0, msgs * 420 - compacted), 'var(--hx-primary)'], ['选中附带', S.sel.size * 380, 'var(--hx-model)'], ['附件与引用', att.reduce((a, x) => a + (x.k === 'file' ? 5200 : x.k === 'sess' ? 2400 : 900), 0), 'var(--hx-type-list)'], ['正在输入', Math.round(ta.value.length * 1.3), 'var(--hx-type-gen)']];
    return { p: p, win: win, used: p.reduce((a, x) => a + x[1], 0) };
  }
  function renderCtx() {
    const r = parts(), pct = Math.min(100, r.used / r.win * 100), c = 2 * Math.PI * 6;
    ctxBtn.innerHTML = '<svg class="hx-ring' + (pct > 80 ? ' is-warn' : '') + '" viewBox="0 0 16 16"><circle class="bg" cx="8" cy="8" r="6"/><circle class="fg" cx="8" cy="8" r="6" stroke-dasharray="' + (Math.max(0.6, pct / 100 * c)).toFixed(2) + ' ' + c.toFixed(2) + '"/></svg><small>' + (pct < 1 ? '<1' : Math.round(pct)) + '%</small>';
  }
  function openCtx() {
    const r = parts(), k = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v;
    pick.style.width = '320px';
    pick.innerHTML = '<div class="hx-ctxbar"><div class="hx-ib__t" style="font-weight:600">上下文用量 · ' + k(r.used) + ' / ' + k(r.win) + ' tokens</div><div class="hx-sr__d">' + esc((curModel() || {}).name || '') + ' 的窗口；发送时由上下文装配按配方组装（B.06.02.01）</div>' +
      '<div class="hx-stack">' + r.p.map(x => '<i style="width:' + (x[1] / r.win * 100) + '%;background:' + x[2] + '"></i>').join('') + '</div><div class="hx-legend">' + r.p.map(x => '<span><span><i style="background:' + x[2] + ';display:inline-block;margin-right:6px"></i>' + x[0] + '</span><em>' + k(x[1]) + '</em></span>').join('') + '</div></div>' +
      '<div class="hx-pick__f"><span>超过 80% 时自动压缩较早的对话</span><span class="sp"></span><button class="hx-btn is-sm" data-compact>立即压缩</button></div>';
    kind = 'ctx'; pick.hidden = false; place(ctxBtn, 320); ctxBtn.classList.add('is-on');
  }
  ctxBtn.addEventListener('click', e => { e.stopPropagation(); if (kind === 'ctx') close(); else openCtx(); });
  function compact() { const n = $('chat').querySelectorAll('.hx-msg').length; compacted = Math.max(0, n * 420 - 600); renderCtx(); HX.toast('已压缩对话', '较早的 ' + Math.max(0, n - 2) + ' 条消息合并成摘要；原文仍保留在对话记录里', { tone: 'model' }); }

  /* ---------------- 联动 ---------------- */
  HX.on('op', renderCtx);
  const sel0 = HX.selChanged; HX.selChanged = function () { const r = sel0.apply(this, arguments); renderCtx(); return r; };
  const add0 = HX.chat.add; HX.chat.add = function () { const r = add0.apply(this, arguments); setTimeout(renderCtx, 0); return r; };
  C.listeners.push(w => { if (w === 'models' || /^roles\.|effort/.test(w)) { renderModelBtn(); renderCtx(); } });
  if (HX.sessions) ['open', 'create'].forEach(k => { const f = HX.sessions[k]; HX.sessions[k] = function () { const r = f.apply(this, arguments); close(); att.length = 0; compacted = 0; renderAtts(); renderModelBtn(); return r; }; });
  ta.placeholder = '描述需求让 AI 搭图、改图、运行或解释节点… 输入 / 看命令，@ 引用节点和文件';
  HX.composer = { addAtt: addAtt, atts: att, openModel: openModel, openSlash: openSlash, openMention: openMention, close: close, parts: parts, curModel: curModel };
  renderModelBtn(); renderCtx();
})(window.HX);
