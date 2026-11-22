/* ===== 20_icons.js · 图标（1.5px 线宽、单色、currentColor） ===== */
window.HX = window.HX || {};
(function (HX) {
  'use strict';
  const s = (d, vb) => '<svg viewBox="0 0 ' + (vb || 16) + ' ' + (vb || 16) + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

  /* 13 种原子节点：只靠图形区分类别，颜色统一 --hx-text-2 */
  HX.ICON = {
    '资源': s('<ellipse cx="8" cy="3.8" rx="5" ry="1.9"/><path d="M3 3.8v8.4c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V3.8"/><path d="M3 8c0 1 2.2 1.9 5 1.9S13 9 13 8"/>'),
    'Agent': s('<circle cx="8" cy="8" r="2.4"/><path d="M8 1.6v2.1M8 12.3v2.1M1.6 8h2.1M12.3 8h2.1M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5 5 11M11 5l1.5-1.5"/>'),
    '上下文装配': s('<path d="M8 1.8 14 4.8 8 7.8 2 4.8Z"/><path d="m2 8 6 3 6-3"/><path d="m2 11.2 6 3 6-3"/>'),
    '工具': s('<path d="M10.4 2.2a3.1 3.1 0 0 0-3.2 4.2l-4.8 4.8a1.4 1.4 0 0 0 2 2l4.8-4.8a3.1 3.1 0 0 0 4.2-3.2l-1.9 1.9-1.8-.4-.4-1.8Z"/>'),
    '扇出': s('<path d="M1.8 8h3.6"/><path d="M5.4 8c2.2 0 2.2-4.4 4.6-4.4h4M5.4 8H14M5.4 8c2.2 0 2.2 4.4 4.6 4.4h4"/><path d="m12.4 2.2 1.6 1.4-1.6 1.4M12.4 11 14 12.4l-1.6 1.4"/>'),
    '汇合': s('<path d="M2 3.6h3.4c2.4 0 2.4 4.4 4.6 4.4M2 8h8M2 12.4h3.4c2.4 0 2.4-4.4 4.6-4.4H14"/><path d="m12.4 6.6 1.6 1.4-1.6 1.4"/>'),
    '聚合': s('<path d="M2 2.8h12L9.4 8.4v4.4l-2.8 1.4V8.4Z"/>'),
    '分支': s('<circle cx="4" cy="3.4" r="1.6"/><circle cx="4" cy="12.6" r="1.6"/><circle cx="12" cy="5.2" r="1.6"/><path d="M4 5v6M12 6.8c0 3.2-8 1.8-8 4.2"/>'),
    '循环': s('<path d="M13.2 6.4A5.2 5.2 0 0 0 3.5 4.7"/><path d="M2.8 9.6a5.2 5.2 0 0 0 9.7 1.7"/><path d="M3.2 2.2v2.9h2.9M12.8 13.8v-2.9H9.9"/>'),
    '账本': s('<rect x="3" y="1.8" width="10" height="12.4" rx="1.6"/><path d="M6 5.4h4M6 8h4M6 10.6h2.2"/>'),
    '人工': s('<circle cx="8" cy="5.4" r="2.6"/><path d="M2.8 14.2c.6-2.8 2.6-4.2 5.2-4.2s4.6 1.4 5.2 4.2"/>'),
    '子图端口': s('<rect x="1.8" y="3.8" width="7" height="8.4" rx="1.6"/><path d="M8.8 8h5.4M12.2 6l2 2-2 2"/>'),
    '子图引用': s('<rect x="1.8" y="5" width="9.2" height="9.2" rx="1.6"/><path d="M5 2.2h7.2a1.8 1.8 0 0 1 1.8 1.8v7.2"/>')
  };

  /* 界面图标 */
  HX.UI = {
    chat: s('<path d="M2.5 4.2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7l-3 2.6v-2.6h0a2 2 0 0 1-1.5-2Z"/>'),
    graph: s('<rect x="1.8" y="2.2" width="4.4" height="3.6" rx="1"/><rect x="9.8" y="10.2" width="4.4" height="3.6" rx="1"/><rect x="9.8" y="2.2" width="4.4" height="3.6" rx="1"/><path d="M6.2 4h3.6M6.2 4c2 0 1.6 8 3.6 8"/>'),
    search: s('<circle cx="7" cy="7" r="4.4"/><path d="m10.4 10.4 3.4 3.4"/>'),
    history: s('<path d="M2.4 8a5.6 5.6 0 1 0 1.6-3.9"/><path d="M2.2 2.4v2.8H5"/><path d="M8 5v3.2l2.2 1.4"/>'),
    moon: s('<path d="M13.4 9.6A5.6 5.6 0 0 1 6.4 2.6a5.6 5.6 0 1 0 7 7Z"/>'),
    sun: s('<circle cx="8" cy="8" r="2.8"/><path d="M8 1.4v1.4M8 13.2v1.4M1.4 8h1.4M13.2 8h1.4M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1"/>'),
    play: s('<path d="M4.6 2.8v10.4L13 8Z" fill="currentColor" stroke-width="1.2"/>'),
    stop: s('<rect x="3.4" y="3.4" width="9.2" height="9.2" rx="1.6" fill="currentColor" stroke-width="1.2"/>'),
    pause: s('<path d="M5.4 3.4v9.2M10.6 3.4v9.2"/>'),
    branch: s('<circle cx="4.6" cy="3.6" r="1.6"/><circle cx="4.6" cy="12.4" r="1.6"/><circle cx="11.4" cy="5.6" r="1.6"/><path d="M4.6 5.2v5.6M11.4 7.2c0 2.6-6.8 1.6-6.8 3.6"/>'),
    expand: s('<path d="M9.6 2.4h4v4M6.4 13.6h-4v-4M13.6 2.4 9.2 6.8M2.4 13.6l4.4-4.4"/>'),
    shrink: s('<path d="M13.6 6.4h-4v-4M2.4 9.6h4v4M9.6 6.4l4-4M6.4 9.6l-4 4"/>'),
    collapse: s('<path d="M3.2 10.4 8 5.6l4.8 4.8"/>'),
    plus: s('<path d="M8 3v10M3 8h10"/>'),
    minus: s('<path d="M3 8h10"/>'),
    x: s('<path d="m4 4 8 8M12 4l-8 8"/>'),
    check: s('<path d="m3 8.4 3.2 3.2L13 4.6"/>'),
    chevl: s('<path d="M10 3.4 5.4 8l4.6 4.6"/>'),
    chevr: s('<path d="M6 3.4 10.6 8 6 12.6"/>'),
    chevd: s('<path d="M3.4 6 8 10.6 12.6 6"/>'),
    lib: s('<rect x="2" y="2" width="5" height="5" rx="1.2"/><rect x="9" y="2" width="5" height="5" rx="1.2"/><rect x="2" y="9" width="5" height="5" rx="1.2"/><path d="M11.5 9v5M9 11.5h5"/>'),
    fit: s('<path d="M2.4 5.6V3.4a1 1 0 0 1 1-1h2.2M10.4 2.4h2.2a1 1 0 0 1 1 1v2.2M13.6 10.4v2.2a1 1 0 0 1-1 1h-2.2M5.6 13.6H3.4a1 1 0 0 1-1-1v-2.2"/><rect x="5.4" y="5.4" width="5.2" height="5.2" rx="1"/>'),
    pointer: s('<path d="M3.2 2.4 12.8 7l-4.2 1.4-2 4.2Z"/>'),
    hand: s('<path d="M5.4 8V3.8a1.1 1.1 0 0 1 2.2 0V7.4M7.6 7V2.8a1.1 1.1 0 0 1 2.2 0V7.4M9.8 7.4V3.8a1.1 1.1 0 0 1 2.2 0v5.4c0 2.8-1.8 4.8-4.6 4.8-1.8 0-3-.8-4-2.4L2 9a1.1 1.1 0 0 1 1.8-1.2L5.4 9.6"/>'),
    group: s('<rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2" stroke-dasharray="2.2 2"/><rect x="4.4" y="4.4" width="3.4" height="3" rx=".8"/><rect x="8.2" y="8.6" width="3.4" height="3" rx=".8"/>'),
    layout: s('<rect x="1.8" y="2.4" width="4" height="3.2" rx=".8"/><rect x="10.2" y="2.4" width="4" height="3.2" rx=".8"/><rect x="10.2" y="10.4" width="4" height="3.2" rx=".8"/><path d="M5.8 4h4.4M8 4v8h2.2"/>'),
    undo: s('<path d="M5 3.6 2.4 6.2 5 8.8"/><path d="M2.6 6.2h7a3.6 3.6 0 0 1 0 7.2H6.4"/>'),
    redo: s('<path d="m11 3.6 2.6 2.6L11 8.8"/><path d="M13.4 6.2h-7a3.6 3.6 0 0 0 0 7.2h3.2"/>'),
    trash: s('<path d="M2.6 4.4h10.8M6.4 4.4V2.8h3.2v1.6M4 4.4l.6 9h6.8l.6-9"/>'),
    copy: s('<rect x="5.2" y="5.2" width="8.6" height="8.6" rx="1.6"/><path d="M10.8 5.2V3.6a1.4 1.4 0 0 0-1.4-1.4H3.6a1.4 1.4 0 0 0-1.4 1.4v5.8a1.4 1.4 0 0 0 1.4 1.4h1.6"/>'),
    enter: s('<path d="M6 2.4h5.8a1.8 1.8 0 0 1 1.8 1.8v7.6a1.8 1.8 0 0 1-1.8 1.8H6"/><path d="M2.4 8h7.2M7 5.4 9.6 8 7 10.6"/>'),
    lock: s('<rect x="3.2" y="7" width="9.6" height="7" rx="1.6"/><path d="M5.4 7V5a2.6 2.6 0 0 1 5.2 0v2"/>'),
    port: s('<circle cx="8" cy="8" r="2.6"/><path d="M1.6 8h3.8M10.6 8h3.8"/>'),
    model: s('<path d="M8 1.8 9.4 6.6 14.2 8 9.4 9.4 8 14.2 6.6 9.4 1.8 8 6.6 6.6Z"/>'),
    cmd: s('<path d="M5.4 5.4h5.2v5.2H5.4Z"/><path d="M5.4 5.4V4a1.6 1.6 0 1 0-1.6 1.4h1.6M10.6 5.4V4a1.6 1.6 0 1 1 1.6 1.4h-1.6M5.4 10.6V12a1.6 1.6 0 1 1-1.6-1.4h1.6M10.6 10.6V12a1.6 1.6 0 1 0 1.6-1.4h-1.6"/>'),
    gauge: s('<path d="M2.6 11.6a5.6 5.6 0 1 1 10.8 0"/><path d="m8 9 2.4-3"/>'),
    bolt: s('<path d="M8.8 1.8 3.6 9h4l-.8 5.2L12.4 7h-4Z"/>')
  };

  /* 节点状态图标（颜色由节点状态类决定） */
  HX.STI = {
    idle: '',
    queued: s('<circle cx="8" cy="8" r="5" stroke-dasharray="2.4 2.2"/>'),
    running: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.6" stroke="currentColor" stroke-opacity=".22" stroke-width="1.8"/><path class="hx-spin" d="M8 2.4a5.6 5.6 0 0 1 5.6 5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    done: s('<circle cx="8" cy="8" r="6" fill="currentColor" stroke="none" opacity=".16"/><path d="m5.2 8.2 1.9 1.9 3.8-4"/>'),
    failed: s('<circle cx="8" cy="8" r="6" fill="currentColor" stroke="none" opacity=".16"/><path d="m5.8 5.8 4.4 4.4M10.2 5.8l-4.4 4.4"/>'),
    waiting: s('<circle cx="8" cy="8" r="6" fill="currentColor" stroke="none" opacity=".16"/><path d="M6.6 5.6v4.8M9.4 5.6v4.8"/>'),
    skipped: s('<path d="M4.6 8h6.8"/>'),
    cached: s('<path d="M8.8 2.4 4.4 8.6h3.4l-.6 5 4.4-6.2H8.2Z"/>')
  };

  /** 把页面里所有 [data-ic] 占位替换成图标 */
  HX.fillIcons = function (root) {
    (root || document).querySelectorAll('[data-ic]').forEach(function (el) {
      const ic = HX.UI[el.dataset.ic];
      if (!ic) return;
      if (el.tagName === 'SPAN' && !el.classList.contains('hx-card__ico')) el.outerHTML = ic;
      else el.innerHTML = ic;
    });
  };

  /** 循环节点的轮次环：p 取 0–1 */
  HX.ring = function (p) {
    const c = 2 * Math.PI * 5.6, off = c * (1 - Math.max(0, Math.min(1, p)));
    return '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.6" stroke="currentColor" stroke-opacity=".2" stroke-width="1.8"/>' +
      '<circle cx="8" cy="8" r="5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 8 8)" style="transition:stroke-dashoffset var(--hx-t-3) var(--hx-ease)"/></svg>';
  };
})(window.HX);
