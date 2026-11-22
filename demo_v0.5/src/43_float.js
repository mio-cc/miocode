/* ===== 43_float.js · 浮动回复线条收拢 / 展开 + 侧栏流动高亮（demo v0.5.11） =====
   ① 浮动回复：出现 8 秒后（或点尾巴）先压成一条线，再沿着落回输入框右上角的小尾巴；点小尾巴展开，再点收起。
      新回复到来时自动展开；收起状态下有新回复，小尾巴上亮一个点。没有任何回复时不显示小尾巴。
   ② 侧栏、图标栏、画布工具栏：鼠标划过时，高亮底块从上一个按钮平滑滑到下一个，不再一闪一闪地变灰变白。
   规范：U.09.06-R4、U.23-R20、R21。 */
(function (HX) {
  'use strict';
  const $ = HX.$, I = Object.assign({}, HX.UI, HX.UI2);
  const reduce = () => document.documentElement.classList.contains('hx-reduce') || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MO = typeof MutationObserver !== 'undefined' ? MutationObserver : function () { this.observe = () => {}; };

  /* ================= ① 浮动回复：线条收拢 / 展开 =================
     回复气泡右上角有一个小标签（▾）。点它：气泡内容淡出，它的边框线像流水一样离开气泡、落到下面的输入框，
     沿输入框绕一整圈，最后收在输入框右上角，长出一个突出的小尾巴（▴）。点小尾巴：线条倒着流回去，气泡重新出现。
     新回复到来时自动展开，8 秒后自动收拢。减少动效时直接切换。规范：U.09.06-R4。 */
  const fl = $('float'), list = $('floatList'), comp = $('composer'), vp = $('vp');
  const NS = 'http://www.w3.org/2000/svg';
  const TAB = dir => '<svg class="hx-tab__ln" viewBox="0 0 48 14" aria-hidden="true"><path d="M0.5 13.5C6.8 13.5 8 11.6 9.5 8.3L11 5C12.4 1.9 14.6 0.5 18 0.5H30C33.4 0.5 35.6 1.9 37 5L38.5 8.3C40 11.6 41.2 13.5 47.5 13.5"/></svg>' +
    '<svg class="hx-tab__ic" viewBox="0 0 10 6" aria-hidden="true"><path d="' + (dir === 'up' ? 'M1.6 4.8 5 1.4l3.4 3.4' : 'M1.6 1.2 5 4.6l3.4-3.4') + '"/></svg><i class="hx-tab__dot"></i>';
  document.querySelectorAll('.hx-tail').forEach(x => x.remove());
  const tail = document.createElement('button');
  tail.type = 'button'; tail.className = 'hx-tab is-comp'; tail.setAttribute('aria-label', '展开最近回复'); tail.dataset.tip = '展开最近回复'; tail.innerHTML = TAB('up');
  comp.appendChild(tail);
  const ov = document.createElementNS(NS, 'svg'); ov.setAttribute('class', 'hx-flowline'); ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML = '<path class="g"/><path class="l"/><path class="m" style="visibility:hidden"/>';
  vp.appendChild(ov);
  const pG = ov.querySelector('.g'), pL = ov.querySelector('.l'), pM = ov.querySelector('.m');

  let open = false, busy = false, auto = 0, hover = false, fade = null;
  const has = () => list.children.length > 0;
  const bubble = () => list.lastElementChild;
  const setTucked = v => { if (fl.classList.contains('is-tucked') !== v) fl.classList.toggle('is-tucked', v); };
  function ensureBubTab() {
    const b = bubble(); if (!b || b.querySelector(':scope > .hx-tab')) return;
    const t = document.createElement('button'); t.type = 'button'; t.className = 'hx-tab is-bub'; t.setAttribute('aria-label', '收起回复'); t.dataset.tip = '收起'; t.innerHTML = TAB('down');
    t.addEventListener('click', e => { e.stopPropagation(); collapse(); });
    t.addEventListener('pointerdown', e => e.stopPropagation());
    b.appendChild(t);
  }
  function sync() { tail.hidden = !has() || open || busy; if (open) ensureBubTab(); }

  const len = d => { pM.setAttribute('d', d); try { return pM.getTotalLength(); } catch (e) { return 0; } };
  function geom() {
    const b = bubble(); if (!b) return null;
    const v = vp.getBoundingClientRect(), br = b.getBoundingClientRect(), cr = comp.getBoundingClientRect();
    if (!br.width || !cr.width) return null;
    const bx = br.left - v.left, by = br.top - v.top, bw = br.width, bh = br.height;
    const cx = cr.left - v.left, cy = cr.top - v.top, cw = cr.width, ch = cr.height;
    const rb = Math.min(16, bh / 2), rc = Math.min(20, ch / 2);
    const x0 = bx + bw - 30, y0 = by + bh, ex = cx + cw - 52;
    /* 气泡：从底边靠右处出发，顺时针绕一圈回到出发点 */
    const dB = 'M' + x0 + ',' + y0 + ' H' + (bx + rb) + ' A' + rb + ',' + rb + ' 0 0 1 ' + bx + ',' + (y0 - rb) + ' V' + (by + rb) + ' A' + rb + ',' + rb + ' 0 0 1 ' + (bx + rb) + ',' + by +
      ' H' + (bx + bw - rb) + ' A' + rb + ',' + rb + ' 0 0 1 ' + (bx + bw) + ',' + (by + rb) + ' V' + (y0 - rb) + ' A' + rb + ',' + rb + ' 0 0 1 ' + (bx + bw - rb) + ',' + y0 + ' H' + x0;
    /* 落下：平滑曲线到输入框上沿（小尾巴所在处） */
    const dD = ' C' + x0 + ',' + (y0 + 14) + ' ' + ex + ',' + (cy - 14) + ' ' + ex + ',' + cy;
    /* 输入框：从小尾巴处出发，顺时针绕一整圈回到小尾巴 */
    const dC = ' H' + (cx + cw - rc) + ' A' + rc + ',' + rc + ' 0 0 1 ' + (cx + cw) + ',' + (cy + rc) + ' V' + (cy + ch - rc) + ' A' + rc + ',' + rc + ' 0 0 1 ' + (cx + cw - rc) + ',' + (cy + ch) +
      ' H' + (cx + rc) + ' A' + rc + ',' + rc + ' 0 0 1 ' + cx + ',' + (cy + ch - rc) + ' V' + (cy + rc) + ' A' + rc + ',' + rc + ' 0 0 1 ' + (cx + rc) + ',' + cy + ' H' + ex;
    const Lb = len(dB), Ld = len('M' + x0 + ',' + y0 + dD), Lc = len('M' + ex + ',' + cy + dC);
    return { d: dB + dD + dC, Lb: Lb, Ld: Ld, Lc: Lc, T: Lb + Ld + Lc };
  }
  function frames(g) {
    const big = g.T * 2, k = (s, l) => ({ strokeDasharray: l.toFixed(1) + ' ' + big.toFixed(1), strokeDashoffset: (-s).toFixed(1) });
    const lm = Math.min(g.Lb, g.Lc) * 0.42;
    return [k(0, g.Lb), Object.assign(k(g.Lb + g.Ld + g.Lc * 0.18 - lm, lm), { offset: 0.5 }), k(g.T - 12, 12)];
  }
  function flow(g, reverse, ms) {
    pL.setAttribute('d', g.d); pG.setAttribute('d', g.d);
    const f = frames(g), kf = reverse ? f.slice().reverse().map((x, i, a) => Object.assign({}, x, { offset: i === 1 ? 0.5 : undefined })) : f;
    kf.forEach(x => { if (x.offset === undefined) delete x.offset; });
    ov.classList.add('is-on');
    const opt = { duration: ms, easing: 'cubic-bezier(.6,0,.25,1)', fill: 'forwards' };
    pG.animate(kf, opt);
    return pL.animate(kf, opt);
  }
  function endFlow() { ov.classList.remove('is-on'); setTimeout(() => { if (!busy) { [pL, pG].forEach(p => p.getAnimations && p.getAnimations().forEach(a => a.cancel())); } }, 260); }
  function landTail() {
    tail.hidden = !has();
    if (!tail.hidden && tail.animate && !reduce()) tail.animate([{ transform: 'translateY(5px) scaleX(.35)', opacity: 0 }, { transform: 'translateY(-1px) scaleX(1.06)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }

  function collapse() {
    if (!open || busy) return;
    open = false; clearTimeout(auto);
    const g = !reduce() && ov.animate && pL.getTotalLength ? geom() : null;
    if (!g) { setTucked(true); sync(); landTail(); return; }
    busy = true; sync();
    if (fade) fade.cancel();
    fade = list.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.985)', filter: 'blur(2px)' }], { duration: 300, easing: 'ease', fill: 'forwards' });
    fade.onfinish = () => setTucked(true);
    const a = flow(g, false, 1250);
    a.onfinish = () => { busy = false; endFlow(); if (fade) { fade.cancel(); fade = null; } setTucked(true); sync(); landTail(); };
  }
  function expand(isAuto) {
    if (!has()) return;
    tail.classList.remove('is-new');
    if (open) { if (isAuto) armAuto(); return; }
    if (busy) return;
    open = true;
    ['is-hidden', 'is-idle', 'is-empty'].forEach(c => { if (fl.classList.contains(c)) fl.classList.remove(c); });
    if (reduce() || !ov.animate || !pL.getTotalLength) { setTucked(false); sync(); if (isAuto) armAuto(); return; }
    busy = true; sync();
    list.style.opacity = '0'; setTucked(false); ensureBubTab();
    const g = geom();
    if (!g) { list.style.opacity = ''; busy = false; sync(); if (isAuto) armAuto(); return; }
    const a = flow(g, true, 1050);
    setTimeout(() => { list.style.opacity = ''; if (fade) fade.cancel(); fade = list.animate([{ opacity: 0, transform: 'scale(.985)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 320, easing: 'ease' }); }, 760);
    a.onfinish = () => { busy = false; endFlow(); sync(); if (isAuto) armAuto(); };
  }
  function armAuto() { clearTimeout(auto); auto = setTimeout(() => { if (!hover && open) collapse(); else armAuto(); }, 8000); }
  tail.addEventListener('click', e => { e.stopPropagation(); expand(false); });
  tail.addEventListener('pointerdown', e => e.stopPropagation());
  fl.addEventListener('mouseenter', () => { hover = true; });
  fl.addEventListener('mouseleave', () => { hover = false; });
  new MO(muts => {
    if (!muts.some(m => m.addedNodes && m.addedNodes.length)) { sync(); return; }
    if (open) { ensureBubTab(); armAuto(); } else if (!busy) expand(true); else tail.classList.add('is-new');
    sync();
  }).observe(list, { childList: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open && document.activeElement === $('ta')) collapse(); });
  /* 旧逻辑还会改 fl 的 class：只在确实不一致时才改，并防止重入（避免"改 class → 触发观察 → 再改"的死循环） */
  let fixing = false;
  new MO(() => {
    if (fixing || busy) return; fixing = true;
    setTucked(!open);
    if (has() && fl.classList.contains('is-empty')) fl.classList.remove('is-empty');
    Promise.resolve().then(() => { fixing = false; });
  }).observe(fl, { attributes: true, attributeFilter: ['class'] });
  if (has()) { open = true; setTucked(false); armAuto(); } else setTucked(true);
  sync();
  if (HX.sessions) ['open', 'create'].forEach(k => { const f = HX.sessions[k]; HX.sessions[k] = function () { const r = f.apply(this, arguments); setTimeout(() => { busy = false; open = false; if (has()) expand(true); else setTucked(true); sync(); }, 0); return r; }; });
  HX.floatReply = { open: () => expand(false), close: collapse, isOpen: () => open };

  /* ================= ② 流动高亮 ================= */
  function glide(box, sel, cls) {
    if (!box || box._glide) return; box._glide = 1;
    box.classList.add('hx-glide-on'); if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    const g = document.createElement('i'); g.className = 'hx-glide ' + (cls || ''); g.setAttribute('aria-hidden', 'true'); box.appendChild(g);
    let cur = null, shown = false, raf = 0, lx = 0, ly = 0;
    const place = (el, instant) => {
      const a = box.getBoundingClientRect(), b = el.getBoundingClientRect();
      const x = b.left - a.left + box.scrollLeft, y = b.top - a.top + box.scrollTop;
      if (instant) { g.style.transition = 'none'; }
      g.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; g.style.width = b.width.toFixed(1) + 'px'; g.style.height = b.height.toFixed(1) + 'px';
      g.style.borderRadius = getComputedStyle(el).borderRadius || '8px';
      if (instant) { void g.offsetWidth; g.style.transition = ''; }
    };
    const pick = () => {
      raf = 0; const el = document.elementFromPoint(lx, ly), it = el && el.closest && el.closest(sel);
      if (!it || !box.contains(it) || it.offsetParent === null) { if (shown) { shown = false; g.classList.remove('is-on'); } cur = null; return; }
      if (it === cur && shown) { place(it, false); return; }
      const first = !shown; cur = it; place(it, first || reduce()); shown = true; g.classList.add('is-on');
    };
    box.addEventListener('pointermove', e => { lx = e.clientX; ly = e.clientY; if (!raf) raf = requestAnimationFrame(pick); });
    box.addEventListener('pointerleave', () => { shown = false; cur = null; g.classList.remove('is-on'); });
    box.addEventListener('scroll', () => { if (shown && cur) place(cur, true); }, { passive: true });
  }
  const SIDE = '.hx-ls__sech,.hx-sess__item,.hx-tree__i,.hx-lib2__ch,.hx-lib2__sh,.hx-lib2__it,.hx-lib2__more,.hx-lib2__f button';
  function bindAll() {
    glide(document.querySelector('.hx-ls__scroll'), SIDE, '');
    glide(document.querySelector('.hx-ls__rail'), '.hx-iconbtn', 'is-icon');
    glide(document.querySelector('.hx-ls__foot'), '.hx-iconbtn,.hx-ls__me', 'is-icon');
    glide($('dock'), '.hx-iconbtn', 'is-icon');
  }
  bindAll(); setTimeout(bindAll, 400);
})(window.HX);
