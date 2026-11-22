/* ===== 41_fix.js · 按 U.24 修正（demo v0.5.4） =====
   - 左栏：会话 / 结构 / 节点库放进一个可滚动容器；底部合成一排（账户 + 包 / 连接 / 资源库 / 设置）
   - 浮动回复：8 秒后自动隐藏；悬停出现 ×；Esc 关闭；新回复到来时再出现
   - 去掉重复按钮：专注（F 键保留）、右栏内的收起按钮
   - 接口悬停显示"名称 · 类型" */
(function (HX) {
  'use strict';
  const $ = HX.$, I = Object.assign({}, HX.UI, HX.UI2);

  /* 左栏：可滚动容器 */
  const full = document.querySelector('.hx-ls__full'), foot = document.querySelector('.hx-ls__foot');
  if (full && !full.querySelector('.hx-ls__scroll')) {
    const sc = document.createElement('div'); sc.className = 'hx-ls__scroll';
    [...full.children].forEach(ch => { if (ch !== foot) sc.appendChild(ch); });
    full.insertBefore(sc, foot || null);
  }
  /* 底部一排：账户 + 四个入口图标 */
  if (foot && !foot.querySelector('[data-foot]')) {
    [['pkgs', 'box', '包管理'], ['conns', 'key', '连接'], ['library', 'book', '资源库'], ['settings', 'gear', '设置 · Ctrl+,']].forEach(x => {
      const b = document.createElement('button'); b.className = 'hx-iconbtn'; b.dataset.foot = x[0]; b.dataset.tip = x[2]; b.innerHTML = I[x[1]];
      b.addEventListener('click', e => { e.stopPropagation(); HX.center.open(x[0]); }); foot.appendChild(b);
    });
  }
  const nb = document.querySelector('.hx-ls__newbtn'); if (nb && !nb.querySelector('kbd')) nb.insertAdjacentHTML('beforeend', '<kbd>Alt N</kbd>');

  /* 浮动回复：改由 43_float.js 管理（收成一条线退回输入框右上角的小尾巴） */

  /* 接口悬停：名称 · 类型 */
  const rn0 = HX.renderNode;
  HX.renderNode = function (n) {
    const el = rn0.apply(this, arguments);
    if (el && el._pt !== el._rev) { el._pt = el._rev; const P = HX.ports(n);
      el.querySelectorAll('.hx-port').forEach(p => { const d = P[p.dataset.d] || [], q = d.find(z => z[0] === p.dataset.p); if (q) p.dataset.tip = ((p.querySelector('.hx-port__name') || {}).textContent || q[0]) + ' · ' + ((HX.TYPE[q[1]] || {}).n || q[1]) + (q[2] ? ' · 可接多根' : ''); }); }
    return el;
  };

  /* 去掉重复按钮后的提示 */
  const ls = $('lsToggle'); if (ls) ls.dataset.tip = '侧栏 · [   专注画布 · F';
  HX.resetDOM(); HX.sync();
})(window.HX);
