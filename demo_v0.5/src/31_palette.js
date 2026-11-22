/* ===== 31_palette.js · 内置主题（U.03.05）=====
   主题 = 配色（琥珀 / 宣纸 / 石墨 / 墨鲸）× 明暗（浅色 / 深色 / 跟随系统）。
   <html data-palette> 缺省 = 现行琥珀；选择存 localStorage('hx-palette')；URL ?palette=paper 可直接指定。 */
(function () {
  'use strict';
  const PAL = {"amber": {"name": "琥珀", "ref": "现行 v0.3", "desc": "中性灰底 · 琥珀主色 · 靛蓝表示模型", "l": ["#f8f8f6", "#101217", "#f0a01e", "#4f5fd6"]}, "paper": {"name": "宣纸", "ref": "Claude", "desc": "暖调纸面 · 陶土橙主色 · 所有灰都偏暖", "l": ["#f4f2ec", "#1a1a18", "#b9573a", "#46659c"]}, "graphite": {"name": "石墨", "ref": "Codex", "desc": "冷灰哑光 · 墨色主按钮 · 蓝色只表示运行与焦点", "l": ["#f8f8f9", "#151517", "#18191d", "#7048d6"]}, "whale": {"name": "墨鲸", "ref": "DeepSeek Harness", "desc": "黑白墨色底 · 深海蓝主色 · 冷调石板灰", "l": ["#f9fafc", "#121318", "#4866f8", "#8a3fd1"]}};
  const KEYS = Object.keys(PAL);
  const $ = id => document.getElementById(id);
  function apply(k) {
    if (!PAL[k]) k = 'amber';
    const html = document.documentElement;
    if (k === 'amber') delete html.dataset.palette; else html.dataset.palette = k;
    try { localStorage.setItem('hx-palette', k); } catch (e) { /* file:// */ }
    const p = PAL[k];
    $('palName').textContent = p.name;
    $('palDots').innerHTML = [p.l[2], p.l[3], document.documentElement.dataset.theme === 'dark' ? p.l[1] : p.l[0]].map(c => '<i style="background:' + c + '"></i>').join('');
    document.querySelectorAll('.hx-pal__it').forEach(b => b.classList.toggle('is-on', b.dataset.pal === k));
    syncTheme();
    if (HX.drawMini) HX.drawMini();
  }
  function cur() { return document.documentElement.dataset.palette || 'amber'; }
  let mode = 'light';                                   // light | dark | system
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  function syncTheme() {
    document.querySelectorAll('[data-palth]').forEach(b => b.classList.toggle('is-on', b.dataset.palth === mode));
  }
  function setMode(m) {
    mode = m; try { localStorage.setItem('hx-theme-mode', m); } catch (e) { /* file:// */ }
    const want = m === 'system' ? (mq && mq.matches ? 'dark' : 'light') : m;
    if ((document.documentElement.dataset.theme === 'dark') !== (want === 'dark')) HX.toggleTheme();
    apply(cur());
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (mode === 'system') setMode('system'); });
  function build() {
    const menu = $('palMenu');
    menu.innerHTML = '<div class="hx-pal__h">主题 · 4 套内置配色（菜单打开时按 1–4 切换）</div>' +
      KEYS.map((k, i) => {
        const p = PAL[k];
        return '<button class="hx-pal__it" data-pal="' + k + '"><span class="hx-pal__sw">' + p.l.map(c => '<i style="background:' + c + '"></i>').join('') +
          '</span><span class="hx-pal__t"><strong>' + (i + 1) + ' · ' + p.name + '<em>参考 ' + p.ref + '</em></strong><span>' + p.desc + '</span></span></button>';
      }).join('') +
      '<div class="hx-pal__f"><button class="hx-btn is-sm is-ghost" data-palth="light">浅色</button><button class="hx-btn is-sm is-ghost" data-palth="dark">深色</button><button class="hx-btn is-sm is-ghost" data-palth="system">跟随系统</button><span class="sp"></span><span class="hx-pal__tip">设置 › 外观</span></div>';
    menu.addEventListener('click', e => {
      const it = e.target.closest('[data-pal]'); if (it) { apply(it.dataset.pal); return; }
      const th = e.target.closest('[data-palth]');
      if (th) setMode(th.dataset.palth);
    });
    $('palBtn').addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener('pointerdown', e => { if (!menu.hidden && !e.target.closest('.hx-pal')) menu.hidden = true; });
    document.addEventListener('keydown', e => {
      if (menu.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = +e.key; if (n >= 1 && n <= KEYS.length) { apply(KEYS[n - 1]); e.stopPropagation(); e.preventDefault(); }
      if (e.key === 'Escape') { menu.hidden = true; e.stopPropagation(); }
    }, true);
    $('themeBtn').addEventListener('click', () => setTimeout(() => { mode = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; apply(cur()); }, 0));
  }
  HX.palette = { apply, list: KEYS, cur, setMode, mode: () => mode, info: PAL };
  (function boot() {
    build();
    let k = new URLSearchParams(location.search).get('palette');
    if (!k) { try { k = localStorage.getItem('hx-palette'); } catch (e) { k = null; } }
    try { mode = localStorage.getItem('hx-theme-mode') || (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'); } catch (e) { mode = 'light'; }
    apply(k || 'paper');
    if (mode === 'system') setMode('system');
  })();
})();
