/* ===== 42_hier.js · 侧栏分区标题加图标（会话 / 结构 / 节点库） =====
   用 <i>：32_sessions.js 会改写结构标题里的第一个 <span>。标题被其他模块重写时自动补回图标。 */
(function (HX) {
  'use strict';
  const IC = { secSess: HX.UI.chat, secTree: (HX.UI2 && HX.UI2.layers) || HX.UI.graph, secLib: HX.UI.lib };
  function apply() {
    Object.keys(IC).forEach(id => {
      const sec = document.getElementById(id); if (!sec) return;
      const h = sec.querySelector('.hx-ls__sech'); if (!h || h.querySelector('.hx-ls__sech__ic')) return;
      const s = document.createElement('i'); s.className = 'hx-ls__sech__ic'; s.innerHTML = IC[id] || '';
      h.insertBefore(s, h.firstChild);
    });
  }
  apply();
  if (typeof MutationObserver !== 'undefined') { const ls = document.getElementById('ls'); if (ls) new MutationObserver(apply).observe(ls, { childList: true, subtree: true }); }
  setTimeout(apply, 300);
})(window.HX);
