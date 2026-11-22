/* ===== 40_tidy.js · 减法：去掉不必要的文字和按钮，让层级自己说话 =====
   - 顶部条：根图时不显示面包屑；档位只剩刻度 + 数字；运行状态只在运行时出现；急停平时是安静图标
   - 输入框：去掉快捷指令；"授权档位 / 没有选中节点"这类提示不再常驻，只在有选中时显示"附带 N 个节点"
   - 浮动回复：只显示最近一条，10 秒后淡出；点它打开完整对话
   - 节点：按类别给图标一个克制的颜色
   - 画布：缩放分级阈值下调；适应画布时避开左侧工具栏和底部对话框 */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(String(s == null ? '' : s)), I = Object.assign({}, HX.UI, HX.UI2);
  const html = document.documentElement;
  const MO = typeof MutationObserver !== 'undefined' ? MutationObserver : function () { this.observe = () => {}; };

  /* 运行状态 → <html data-run> */
  const rs = $('runStat');
  const syncRun = () => { const m = rs.className.match(/is-(\w+)/); html.dataset.run = m ? m[1] : 'idle'; };
  new MO(syncRun).observe(rs, { attributes: true, attributeFilter: ['class'] }); syncRun();
  $('runStat').dataset.tip = '查看这次运行';

  /* 面包屑：只有根图时隐藏 */
  const crumb0 = HX.renderCrumb;
  HX.renderCrumb = function () { const r = crumb0.apply(this, arguments); $('crumb').classList.toggle('is-root', S.stack.length <= 1); return r; };
  $('crumb').classList.toggle('is-root', S.stack.length <= 1);

  /* 档位：说明放悬停提示 */
  const lv0 = HX.setLevel;
  HX.setLevel = function (l) { const r = lv0.apply(this, arguments); $('levelBtn').dataset.tip = '模型授权档位 ' + l + ' · ' + HX.LEVELS[l][0] + '：' + HX.LEVELS[l][1]; tidyHint(); return r; };

  /* 输入框提示：只在有选中时显示一枚小标签 */
  function tidyHint() {
    const h = $('compHint'), n = S.sel.size;
    const want = n ? '<span class="hx-att is-node" data-tip="发送时会把选中的节点一起交给 AI">' + I.graph + '附带 ' + n + ' 个节点</span>' : '';
    if (h.dataset.v === want && h.innerHTML === h.dataset.h) return;
    h.innerHTML = want; h.dataset.v = want; h.dataset.h = h.innerHTML;
  }
  new MO(tidyHint).observe($('compHint'), { childList: true, characterData: true, subtree: true });
  tidyHint();

  /* 发送按钮：圆形箭头；有字时才"亮" */
  const send = $('sendBtn'), ta = $('ta'), comp = $('composer');
  send.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3.4M3.8 7.4 8 3.2l4.2 4.2"/></svg>';
  send.dataset.tip = '发送 · Enter'; send.setAttribute('aria-label', '发送');
  const hasText = () => comp.classList.toggle('has-text', !!ta.value.trim());
  ta.addEventListener('input', hasText); new MO(hasText).observe(ta, { attributes: true }); setInterval(hasText, 600); hasText();
  ta.placeholder = '让 AI 搭图、改图或运行……   / 命令 · @ 引用';

  /* 通知圆点颜色：有错误时红，有审批时黄，否则主色 */
  if (HX.inbox) { const r0 = HX.inbox.render; HX.inbox.render = function () { const r = r0.apply(this, arguments); const b = $('bellN'); if (b) { const un = HX.inbox.items.filter(x => !x.read); b.classList.toggle('is-bad', un.some(x => x.kind === 'bad')); b.classList.toggle('is-wait', !un.some(x => x.kind === 'bad') && un.some(x => x.approve)); } return r; }; HX.inbox.render(); }

  /* 浮动回复：点开看全部（显示 / 收起由 43_float.js 管理） */
  const fl = $('float');
  fl.addEventListener('click', e => { if (e.target.closest('button')) return; HX.panes.setRs(true, 'chat'); });

  /* 节点类别色 */
  const CC = { '资源': '--hx-type-ref', 'Agent': '--hx-type-ctx', '上下文装配': '--hx-type-ctx', '工具': '--hx-type-tool', '扇出': '--hx-type-list', '汇合': '--hx-type-list', '聚合': '--hx-type-list',
    '分支': '--hx-type-ctrl', '循环': '--hx-type-ctrl', '账本': '--hx-type-state', '人工': '--hx-wait', '子图端口': '--hx-type-gen', '子图引用': '--hx-type-gen' };
  const rn0 = HX.renderNode;
  HX.renderNode = function (n) { const el = rn0.apply(this, arguments); if (el && el._cc !== n.type + (n.params && n.params.kind)) { el._cc = n.type + (n.params && n.params.kind); el.style.setProperty('--cc', 'var(' + (n.type === '资源' && n.params.kind === '模型' ? '--hx-type-ref' : CC[n.type] || '--hx-type-gen') + ')'); } return el; };

  /* 缩放分级：0.55 以上完整显示，0.3–0.55 骨架，0.3 以下只显示标题 */
  const rv0 = HX.renderView;
  HX.renderView = function () {
    const r = rv0.apply(this, arguments), vp = $('vp'), k = S.view.k, lod = k >= 0.55 ? 1 : k >= 0.3 ? 2 : 3;
    if (!vp.classList.contains('lod-' + lod) || vp._lod !== lod) { vp.classList.remove('lod-1', 'lod-2', 'lod-3'); vp.classList.add('lod-' + lod); vp._lod = lod; }
    return r;
  };

  /* 适应画布：避开左侧竖排工具栏、父图位置卡、底部对话框和浮动回复 */
  HX.fitTarget = function (ids, maxK) {
    const b = HX.bounds(HX.cur(), ids);
    const comp = $('composer').offsetHeight || 96, fh = fl.classList.contains('is-empty') || fl.classList.contains('is-tucked') ? 0 : Math.min(80, ($('floatList').lastElementChild || {}).offsetHeight || 0);
    const left = S.stack.length > 1 ? 304 : 64, right = 28, top = 28, bottom = comp + fh + 44;
    const W = Math.max(200, HX.vw - left - right), H = Math.max(160, HX.vh - top - bottom);
    const k = Math.max(0.2, Math.min(maxK || 1, W / (b.w + 40), H / (b.h + 40)));
    return { k: k, x: left + (W - b.w * k) / 2 - b.x0 * k, y: top + (H - b.h * k) / 2 - b.y0 * k };
  };

  /* 左栏搜索框占位 */
  const ls = $('libSearch'); if (ls) ls.placeholder = '搜索节点';
  const sq = $('sessQ'); if (sq) sq.placeholder = '搜索会话';

  HX.renderView(); HX.sync();
})(window.HX);
