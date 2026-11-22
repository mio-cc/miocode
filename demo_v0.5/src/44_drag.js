/* ===== 44_drag.js · 画布上的浮动面板可以拖动换位置（demo v0.5.10） =====
   可拖：左侧竖排工具栏、小地图、父图位置卡。拖面板上的抓手（⋮⋮）移动；位置按画布宽高比例记住，窗口缩放后仍在画布内；
   双击抓手回到默认位置。拖动时吸附到画布四边（12px 内）。规范：U.09.01-R6。 */
(function (HX) {
  'use strict';
  const $ = HX.$, vp = $('vp');
  const GRIP = '<svg viewBox="0 0 10 16" aria-hidden="true"><g fill="currentColor"><circle cx="3" cy="3" r="1.2"/><circle cx="7" cy="3" r="1.2"/><circle cx="3" cy="8" r="1.2"/><circle cx="7" cy="8" r="1.2"/><circle cx="3" cy="13" r="1.2"/><circle cx="7" cy="13" r="1.2"/></g></svg>';
  const GRIPH = '<svg viewBox="0 0 16 10" aria-hidden="true"><g fill="currentColor"><circle cx="3" cy="3" r="1.2"/><circle cx="8" cy="3" r="1.2"/><circle cx="13" cy="3" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="8" cy="7" r="1.2"/><circle cx="13" cy="7" r="1.2"/></g></svg>';
  const SNAP = 12, M = 8;
  const key = id => 'hx-pos-' + id;
  function load(id) { try { return JSON.parse(localStorage.getItem(key(id)) || 'null'); } catch (e) { return null; } }
  function save(id, v) { try { v ? localStorage.setItem(key(id), JSON.stringify(v)) : localStorage.removeItem(key(id)); } catch (e) { /* 忽略 */ } }

  function apply(el, pos) {
    if (!pos) { el.classList.remove('is-moved'); el.style.setProperty('--px', ''); el.style.setProperty('--py', ''); return; }
    const r = vp.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.max(M, Math.min(r.width - w - M, pos.fx * (r.width - w))), y = Math.max(M, Math.min(r.height - h - M, pos.fy * (r.height - h)));
    el.style.setProperty('--px', x.toFixed(0) + 'px'); el.style.setProperty('--py', y.toFixed(0) + 'px'); el.classList.add('is-moved');
  }
  function make(id, el, horizontal) {
    if (!el || el._drag) return; el._drag = 1;
    addGrip(); apply(el, load(id));
    /* 面板内容会被重新渲染（如父图位置卡）：抓手丢了就补回 */
    if (typeof MutationObserver !== 'undefined') new MutationObserver(() => { if (!el.querySelector(':scope > .hx-grip')) addGrip(); }).observe(el, { childList: true });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => apply(el, load(id))).observe(vp);
    function addGrip() {
    const g = document.createElement('div'); g.className = 'hx-grip' + (horizontal ? ' is-h' : ''); g.dataset.tip = '拖动换位置 · 双击复位'; g.innerHTML = horizontal ? GRIPH : GRIP;
    el.insertBefore(g, el.firstChild);
    g.addEventListener('pointerdown', e => {
      if (e.button !== 0) return; e.preventDefault(); e.stopPropagation();
      const r = vp.getBoundingClientRect(), b = el.getBoundingClientRect(), ox = e.clientX - b.left, oy = e.clientY - b.top;
      el.classList.add('is-dragging-panel'); try { g.setPointerCapture(e.pointerId); } catch (_) { /* 忽略 */ }
      let pos = null;
      const mv = ev => {
        const w = el.offsetWidth, h = el.offsetHeight;
        let x = ev.clientX - r.left - ox, y = ev.clientY - r.top - oy;
        x = Math.max(M, Math.min(r.width - w - M, x)); y = Math.max(M, Math.min(r.height - h - M, y));
        if (x - M < SNAP) x = M; if (r.width - w - M - x < SNAP) x = r.width - w - M;
        if (y - M < SNAP) y = M; if (r.height - h - M - y < SNAP) y = r.height - h - M;
        pos = { fx: (r.width - w) > 0 ? x / (r.width - w) : 0, fy: (r.height - h) > 0 ? y / (r.height - h) : 0 };
        el.style.setProperty('--px', x.toFixed(0) + 'px'); el.style.setProperty('--py', y.toFixed(0) + 'px'); el.classList.add('is-moved');
      };
      const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); el.classList.remove('is-dragging-panel'); if (pos) save(id, pos); };
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
    });
    g.addEventListener('dblclick', e => { e.stopPropagation(); save(id, null); apply(el, null); });
    g.addEventListener('click', e => e.stopPropagation());
    }
  }
  make('dock', $('dock'), false);
  make('mini', $('mini'), true);
  make('nest', $('nestCard'), true);
  HX.panelPos = { reset: () => ['dock', 'mini', 'nest'].forEach(id => { save(id, null); const el = { dock: $('dock'), mini: $('mini'), nest: $('nestCard') }[id]; if (el) apply(el, null); }) };
})(window.HX);
