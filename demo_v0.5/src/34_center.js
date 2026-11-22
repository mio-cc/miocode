/* ===== 34_center.js · 设置中心 + 资源库（共用一个中心窗口外壳） =====
   打开方式：左下角账户菜单、左栏齿轮、Ctrl+,、命令面板「设置 › …」、输入框模型菜单「管理模型…」。
   设置 15 页：通用 / 外观 / 快捷键 · 模型与提供方 / 工具 / MCP 服务 / 技能 / 扩展包 · 授权与安全 / 密钥 / 预算与用量 / 并发与限流 · 数据与存储 / 本机访问与命令行 / 关于与诊断
   资源库 5 页：角色卡 / 上下文配方 / 数据类型 / 子图库 / 模板
   所有修改即时生效、自动保存（真实产品：PATCH /settings 等，B.04.07–B.04.12）。规范：U.21、U.22。 */
(function (HX) {
  'use strict';
  const $ = HX.$, esc = s => HX.esc(String(s == null ? '' : s)), C = HX.cfg;
  const I = Object.assign({}, HX.UI, HX.UI2);
  const LV = HX.LEVELS;

  /* ---------------- DOM ---------------- */
  const root = document.createElement('div');
  root.className = 'hx-ctr'; root.id = 'ctr'; root.hidden = true;
  root.innerHTML = '<div class="hx-ctr__win" role="dialog" aria-modal="true" aria-labelledby="ctrTitle">' +
    '<nav class="hx-ctr__nav"><div class="hx-ctr__modes" id="ctrModes"></div>' +
    '<div class="hx-ctr__search">' + I.search + '<input class="hx-input is-sm" id="ctrSearch" placeholder="搜索设置" spellcheck="false"></div>' +
    '<div class="hx-ctr__list" id="ctrNav"></div><div class="hx-ctr__foot" id="ctrFoot"></div></nav>' +
    '<section class="hx-ctr__main"><button class="hx-iconbtn hx-ctr__close" id="ctrClose" data-tip="关闭 · Esc">' + I.x + '</button>' +
    '<header class="hx-ctr__head" id="ctrHead"></header><div class="hx-ctr__body" id="ctrBody"></div>' +
    '<div class="hx-sheet" id="ctrSheet" hidden></div></section></div>';
  document.body.appendChild(root);
  const dlg = document.createElement('div'); dlg.className = 'hx-dlg'; dlg.id = 'dlg'; dlg.hidden = true; document.body.appendChild(dlg);

  /* ---------------- 小部件 ---------------- */
  const row = (t, d, ctl, k) => '<div class="hx-sr" data-k="' + esc(k || t) + '"><div class="hx-sr__l"><div class="hx-sr__t">' + t + '</div>' + (d ? '<div class="hx-sr__d">' + d + '</div>' : '') + '</div><div class="hx-sr__c">' + (ctl || '') + '</div></div>';
  const card = (h, body, opt) => { opt = opt || {}; return '<div class="hx-sc"' + (opt.id ? ' id="' + opt.id + '"' : '') + '>' + (h ? '<div class="hx-sc__h">' + h + '<span class="sp"></span>' + (opt.x || '') + '</div>' : '') + (opt.p ? '<div class="hx-sc__p">' + opt.p + '</div>' : '') + '<div class="hx-sc__b">' + body + '</div></div>'; };
  const sw = (path, on, dis) => '<button class="hx-switch' + (on ? ' is-on' : '') + '" data-sw="' + path + '"' + (dis ? ' disabled style="opacity:.5"' : '') + ' role="switch" aria-checked="' + !!on + '"></button>';
  const seg = (path, opts, v) => '<div class="hx-seg" data-seg="' + path + '">' + opts.map(o => { const val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o, dis = Array.isArray(o) && o[2]; return '<button data-v="' + esc(val) + '"' + (String(val) === String(v) ? ' class="is-on"' : '') + (dis ? ' disabled' : '') + '>' + esc(lab) + '</button>'; }).join('') + '</div>';
  const sel = (path, opts, v, w) => '<select class="hx-input is-sm" data-sel="' + path + '"' + (w ? ' style="width:' + w + 'px"' : ' style="width:220px"') + '>' + opts.map(o => { const val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') + '</select>';
  const num = (path, v, unit, w) => '<input class="hx-input is-sm hx-mono" type="number" data-num="' + path + '" value="' + esc(v) + '" style="width:' + (w || 90) + 'px">' + (unit ? '<span class="hx-sr__d" style="margin:0">' + unit + '</span>' : '');
  const btn = (label, act, arg, cls, ic) => '<button class="hx-btn is-sm ' + (cls || '') + '" data-act="' + act + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : '') + '>' + (ic ? I[ic] || '' : '') + label + '</button>';
  const pill = (t, cls, dot) => '<span class="hx-pill ' + (cls || '') + '">' + (dot ? '<i></i>' : '') + t + '</span>';
  const note = (t, cls, ic) => '<div class="hx-note ' + (cls || '') + '">' + (I[ic || 'info'] || '') + '<div>' + t + '</div></div>';
  const caps = a => '<span class="hx-caps">' + a.map(x => '<span>' + esc(x) + '</span>').join('') + '</span>';
  const money = v => '¥ ' + Number(v).toFixed(2);
  const usableModels = () => C.allModels(true).map(m => [m.id, m.name + ' · ' + m.provider.name]);

  /* 路径读写：'general.notify'、'tools#search.on'（数组里按 id 找） */
  function resolve(path) {
    const parts = path.split('.'); let o = C;
    for (let i = 0; i < parts.length - 1; i++) {
      const [k, id] = parts[i].split('#'); o = o[k]; if (id != null) o = o.find(x => String(x.id) === id);
      if (!o) return null;
    }
    return { o: o, k: parts[parts.length - 1] };
  }
  const getP = p => { const r = resolve(p); return r ? r.o[r.k] : undefined; };
  function setP(p, v) { const r = resolve(p); if (!r) return; r.o[r.k] = v; saved(); onSet(p, v); }

  /* ---------------- 页面定义 ---------------- */
  const P = {};
  const NAV = {
    settings: [
      ['应用', ['general', 'look', 'keys']],
      ['模型', ['defaults']],
      ['安全与成本', ['security', 'budget', 'pools']],
      ['系统', ['data', 'access', 'about']]
    ],
    library: [['资源库', ['roles', 'recipes', 'types', 'subs', 'tpls']]]
  };
  let mode = 'settings', page = 'general', savedAt = 0;
  /* 四个分区：包 · 连接 · 资源库 · 设置。包和连接的页面由 38_hub.js 动态注册（P['pkg:…']、P['conn:…']） */
  const MODES = { pkgs: { name: '包', ph: '搜索包和它带来的节点' }, conns: { name: '连接', ph: '搜索连接' }, library: { name: '资源库', ph: '搜索资源' }, settings: { name: '设置', ph: '搜索设置' } };
  const MODE_ORDER = ['pkgs', 'conns', 'library', 'settings'];
  const ALIAS = {};
  const modeOf = id => (P[id] && P[id].mode) || (P[id] && P[id].lib ? 'library' : 'settings');
  function groupsOf(m) { let g = (NAV[m] || []).map(x => [x[0], x[1].slice()]); if (MODES[m].groups) g = MODES[m].groups(g); return g; }
  function firstPage(m) { const g = groupsOf(m); for (const x of g) if (x[1].length) return x[1][0]; return null; }

  /* ===== 通用 ===== */
  P.general = { name: '通用', icon: 'gear', desc: '语言、启动行为、发送方式、新会话默认值和通知。',
    render: () => {
      const g = C.general;
      return card('', row('界面语言', '切换后立即生效；英文界面预留，v1 只完整支持简体中文', sel('general.lang', [['zh-CN', '简体中文'], ['en', 'English（预留）']], g.lang)) +
        row('启动时打开', '', seg('general.start', [['last', '上次的会话'], ['new', '新会话']], g.start)) +
        row('发送消息', '另一个组合键用来换行', seg('general.send', [['enter', 'Enter 发送'], ['mod', 'Ctrl+Enter 发送']], g.send)) +
        row('新会话自动命名', '根据第一条消息生成标题', sw('general.autoTitle', g.autoTitle))) +
      card('新会话的默认值', row('默认授权档位', '模型在新会话里能做什么；每个会话可以在顶部档位胶囊单独调整（<a data-nav="security">查看各档位能做什么</a>）', sel('general.defaultLevel', LV.map((l, i) => [i, i + ' · ' + l[0]]), g.defaultLevel)) +
        row('运行中改图需要确认', '运行时修改了图，改动在下一个安全点生效前先问你（P.09 Q19）', sw('general.confirmHotpatch', g.confirmHotpatch))) +
      card('通知', row('有审批等你处理', '运行停在人工节点或高风险工具时', sw('general.notifyApproval', g.notifyApproval)) +
        row('运行完成', '', sw('general.notifyDone', g.notifyDone)) +
        row('运行失败', '', sw('general.notifyFail', g.notifyFail)) +
        row('系统桌面通知', '页面不在前台时也弹出系统通知；打开时浏览器会请求权限', sw('general.desktopNotify', g.desktopNotify)), { p: '通知同时出现在顶部条右侧的通知中心（铃铛）。' }) +
      card('隐私', row('匿名使用统计', '默认关闭。打开后只上报功能使用次数和错误类型，从不上传图、对话、文件和密钥', sw('sec.telemetry', C.sec.telemetry)));
    } };

  /* ===== 外观 ===== */
  const THEMES = { paper: ['宣纸', '暖调纸面 · 陶土橙', '#f4f2ec', '#ebe8df', '#b9573a', '#46659c'], graphite: ['石墨', '冷灰哑光 · 墨色主按钮', '#f8f8f9', '#efeff1', '#18191d', '#2f6bdc'],
    whale: ['墨鲸', '冷白墨色 · 浅海蓝', '#f8f9fd', '#eff2f8', '#4866f8', '#8a3fd1'], amber: ['琥珀', '中性灰 · 琥珀（v0.3）', '#f8f8f6', '#f3f3f1', '#f0a01e', '#4f5fd6'] };
  P.look = { name: '外观', icon: 'palette', desc: '主题 = 配色 × 明暗。4 套内置配色，每套都有浅色和深色（U.03.05）。',
    render: () => {
      const cur = HX.palette ? HX.palette.cur() : 'paper', md = HX.palette && HX.palette.mode ? HX.palette.mode() : 'light', L = C.look;
      const cards = Object.keys(THEMES).map(k => { const t = THEMES[k]; return '<button data-act="theme" data-arg="' + k + '"' + (k === cur ? ' class="is-on"' : '') + '><span class="hx-thm__pv"><b style="background:' + t[3] + '"></b><div style="background:' + t[2] + '"><i style="background:' + t[5] + ';opacity:.35"></i><i style="background:' + t[5] + ';opacity:.2"></i><u style="background:' + t[4] + '"></u></div></span><strong>' + t[0] + '</strong><span>' + t[1] + '</span></button>'; }).join('');
      return card('主题', '<div class="hx-thm">' + cards + '</div>' + row('明暗', '跟随系统时，系统切换深色模式后界面同步切换', seg('look.mode', [['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']], md), '明暗模式')) +
        card('界面', row('界面密度', '紧凑模式下控件高度减小，适合小屏幕', seg('look.density', [['compact', '紧凑'], ['normal', '标准'], ['comfy', '宽松']], L.density)) +
          row('界面缩放', '', sel('look.zoom', [[90, '90%'], [100, '100%'], [110, '110%'], [125, '125%']], L.zoom, 120)) +
          row('减少动效', '关闭放大缩小转场、呼吸灯和流动光点；也会跟随系统的"减少动态效果"设置', sw('look.reduce', L.reduce))) +
        card('画布', row('显示小地图', '画布左下角的缩略图', sw('look.mini', L.mini)) +
          row('连线样式', '', seg('look.edge', [['curve', '曲线'], ['step', '直角']], L.edge)));
    } };

  /* ===== 快捷键 ===== */
  const KEYS = [
    ['全局', [['Ctrl+K', '命令面板'], ['Ctrl+,', '打开设置'], ['Ctrl+Enter', '运行'], ['Ctrl+.', '急停'], ['[', '收起 / 展开左侧栏'], [']', '打开 / 关闭右侧栏'], ['I', '右栏属性页'], ['F', '专注模式'], ['/', '聚焦节点库搜索'], ['?', '快捷键速查'], ['Alt+[ / Alt+]', '上一个 / 下一个会话'], ['Alt+N', '新建会话']]],
    ['画布', [['V', '选择工具'], ['H / 按住 Space', '平移'], ['A / 双击空白', '快速添加节点'], ['Delete', '删除选中'], ['Ctrl+A', '全选当前层'], ['Ctrl+D', '复制选中'], ['Ctrl+C / Ctrl+V', '复制 / 粘贴'], ['Ctrl+G', '打包为子图'], ['Ctrl+Z / Ctrl+Shift+Z', '撤销 / 重做'], ['1', '适应画布'], ['2', '聚焦选中'], ['L', '整理布局'], ['F2', '重命名']]],
    ['嵌套导航', [['P', '预览子图'], ['Enter / 双击', '进入子图'], ['Esc', '关闭弹层 → 取消选中 → 返回上一层'], ['Alt+↑', '返回上一层']]],
    ['对话框', [['Enter', '发送（可在通用里改成 Ctrl+Enter）'], ['Shift+Enter', '换行'], ['/', '斜杠命令'], ['@', '引用节点、文件、会话'], ['↑（输入框为空）', '编辑上一条'], ['Esc', '回到画布']]]
  ];
  P.keys = { name: '快捷键', icon: 'kbd', desc: '全部快捷键（U.13.04）。单字母快捷键在输入框里不生效。',
    render: () => KEYS.map(g => card(g[0], '<table class="hx-tbl"><tbody>' + g[1].map(k => '<tr><td style="width:240px">' + k[0].split(' / ').map(x => x.split('+').map(y => '<kbd>' + esc(y) + '</kbd>').join('+')).join(' / ') + '</td><td>' + esc(k[1]) + '</td></tr>').join('') + '</tbody></table>')).join('') };

  /* ===== 模型与提供方 ===== */
  const pstate = p => p.state === 'ok' ? pill('已连接 · ' + p.latency + ' ms', 'is-ok', 1) : p.state === 'off' ? pill('未运行', 'is-warn', 1) : pill('未配置', '', 1);
  P.models = { name: '模型与提供方', icon: 'cpu', badge: () => { const n = C.counts().providers; return [n + ' 已连接', 'is-ok']; },
    desc: '在这里填 API Key、选默认模型。密钥存进系统密钥库，不写进配置文件（S.03）。',
    acts: () => btn('添加自定义提供方', 'provider', 'custom', 'is-ghost', 'plus') + btn('刷新模型列表', 'refreshModels', null, 'is-ghost', 'refresh'),
    render: () => {
      const r = C.roles, um = usableModels();
      const roles = card('默认模型', row('编排者（底部对话框里的 AI）', '理解你的话、改图、控制运行。每个会话可以在输入框里单独换', sel('roles.orch', um, r.orch, 260)) +
        row('新建 Agent 节点的默认模型', '拖进来的 Agent 节点先用这个；节点上可以改', sel('roles.agent', um, r.agent, 260)) +
        row('摘要与上下文压缩', '压缩长对话、长输出时用；建议选便宜、快的模型', sel('roles.summary', um, r.summary, 260)) +
        row('向量嵌入', '检索知识库时用；没有可用的嵌入模型时只能用关键词检索', sel('roles.embed', [['none', '不使用']].concat(um), r.embed, 260)) +
        row('默认推理强度', '只对支持推理的模型有效；输入框里可以临时调整', seg('effort', [['low', '低'], ['medium', '中'], ['high', '高']], C.effort)) +
        row('出错时换用', '主模型报错、限流或超时时按顺序换用', '<span class="hx-caps">' + r.fallback.map((id, i) => '<span>' + (i + 1) + ' · ' + esc(C.modelName(id)) + '</span>').join('') + '</span>' + btn('调整', 'fallback', null, 'is-ghost')));
      const grid = '<div class="hx-pgrid">' + C.providers.map(p => '<button class="hx-pcard" data-act="provider" data-arg="' + p.id + '"><div class="hx-pcard__top"><span class="hx-pcard__logo">' + esc(p.logo) + '</span><div><div class="hx-pcard__n">' + esc(p.name) + '</div><div class="hx-pcard__s">' + (p.kind === 'openai_compat' ? 'OpenAI 兼容' : p.kind === 'ollama' ? '本机' : '官方接口') + '</div></div></div>' +
        '<div class="hx-pcard__d">' + esc(p.desc) + '</div><div class="hx-pcard__f">' + pstate(p) + '<span class="sp"></span><span class="hx-pcard__s">' + (p.models.length ? p.models.length + ' 个模型' : '') + '</span></div></button>').join('') + '</div>';
      const rowsM = C.providers.map(p => p.models.map(m => '<tr class="' + (p.state !== 'ok' ? 'is-off' : '') + '"><td><b>' + esc(m.name) + '</b><span class="t-sub hx-mono">' + esc(m.id) + '</span></td><td>' + esc(p.name) + '</td><td class="num">' + esc(m.win) + '</td><td>' + caps(m.caps) + '</td><td class="num">' + (m.pin ? m.pin + ' / ' + m.pout : '免费') + '</td><td>' + (p.state === 'ok' ? sw('providers#' + p.id + '.models#' + m.id + '.on', m.on) : '<span class="hx-sr__d">先连接</span>') + '</td></tr>').join('')).join('');
      return roles + '<div><div class="hx-tabsrow" style="margin-bottom:10px"><b style="font-size:13px">提供方</b><span class="hx-sr__d" style="margin:0">点卡片填写 API Key、接口地址并测试连接</span></div>' + grid + '</div>' +
        card('模型', '<table class="hx-tbl"><thead><tr><th>模型</th><th>提供方</th><th class="num">上下文</th><th>能力</th><th class="num">价格（¥ / 百万 tokens，入 / 出）</th><th>启用</th></tr></thead><tbody>' + rowsM + '</tbody></table>', { p: '模型列表由"测试连接"从提供方实时拉取；价格表可以手动修改（预算与用量里的费用按它计算）。<b>demo 里的模型名和价格都是示例数据。</b>' });
    } };

  /* ===== 工具 ===== */
  P.tools = { name: '工具', icon: 'tool', badge: () => [C.counts().tools + ' 启用', ''],
    desc: '内置工具的开关、风险等级和频率上限。风险等级决定在各个授权档位下是自动执行、需要审批还是禁止（见授权与安全）。',
    render: () => {
      const rk = ['L0', 'L1', 'L2', 'L3'];
      const rows = C.tools.map(t => '<tr class="' + (t.on ? '' : 'is-off') + '"><td><b>' + esc(t.name) + '</b><span class="t-sub">' + esc(t.desc) + '</span></td><td>' + seg('tools#' + t.id + '.risk', rk.map(x => [x, x, rk.indexOf(x) < rk.indexOf(t.floor)]), t.risk) + '</td><td>' + num('tools#' + t.id + '.rate', t.rate, '次/分', 64) + '</td><td><span class="hx-sr__d" style="margin:0">' + esc(t.conf) + '</span></td><td>' + sw('tools#' + t.id + '.on', t.on) + '</td></tr>').join('');
      return card('内置工具', '<table class="hx-tbl"><thead><tr><th>工具</th><th>风险等级</th><th>频率上限</th><th>配置</th><th>启用</th></tr></thead><tbody>' + rows + '</tbody></table>', { p: '风险等级只能调高，不能低于工具自带的下限（S.04-R7）。MCP 和扩展包带来的工具在各自页面里管理。' }) +
        card('出站网络白名单', '<div class="hx-sr"><div class="hx-sr__l"><div class="hx-caps" style="gap:6px">' + C.hosts.map(h => '<span class="hx-att"><span class="hx-mono">' + esc(h) + '</span><button data-act="rmHost" data-arg="' + esc(h) + '">' + I.x + '</button></span>').join('') + '</div></div><div class="hx-sr__c"><input class="hx-input is-sm hx-mono" id="hostIn" placeholder="例如 api.example.com" style="width:220px">' + btn('添加', 'addHost') + '</div></div>', { p: 'HTTP 请求、网页抓取、扩展包只能访问这里列出的主机。检索工具走自己的搜索服务，不受此限制。' }) +
        card('允许访问的文件目录', C.dirs.map(d => row('<span class="hx-mono">' + esc(d) + '</span>', '', btn('移除', 'rmDir', d, 'is-ghost'), d)).join('') + row('', '', btn('添加目录…', 'addDir', null, '', 'folder'), '添加目录'), { p: '文件读取只能读这些目录；写入默认只写到每次运行自己的工作区。' });
    } };

  /* ===== MCP ===== */
  const mstate = m => m.state === 'ok' ? pill('已连接 · ' + m.tools.length + ' 个工具', 'is-ok', 1) : m.state === 'pending' ? pill('等你确认', 'is-warn', 1) : pill('连接失败', 'is-bad', 1);
  let openMcp = null;
  P.mcp = { name: 'MCP 服务', icon: 'plug', badge: () => { const c = C.counts(); return c.mcpBad ? [c.mcpBad + ' 出错', 'is-bad'] : c.mcpPending ? [c.mcpPending + ' 待确认', 'is-warn'] : [c.mcpOk + '', '']; },
    desc: '通过 Model Context Protocol 接入外部工具（文件系统、GitHub、数据库……）。新加的服务和它的新工具默认不启用，确认后才能用（S.08）。',
    acts: () => btn('添加 MCP 服务', 'addMcp', null, 'is-primary', 'plus'),
    render: () => card('', C.mcp.map(m => {
      const open = openMcp === m.id;
      const x = m.state === 'pending' ? btn('查看并确认', 'confirmMcp', m.id, 'is-model') : m.state === 'bad' ? btn('重新连接', 'reMcp', m.id, 'is-ghost', 'refresh') : sw('mcp#' + m.id + '.on', m.on);
      return '<div class="hx-li' + (open ? ' is-open' : '') + '"><span class="hx-li__ic">' + I.plug + '</span><div class="hx-li__m"><div class="hx-li__t">' + esc(m.name) + mstate(m) + pill(m.tr, 'is-mono') + '</div><div class="hx-li__d hx-mono">' + esc(m.cmd) + '</div></div><div class="hx-li__x">' + x +
        (m.tools.length ? '<button class="hx-iconbtn is-sm" data-act="toggleMcp" data-arg="' + m.id + '" data-tip="工具列表"><span class="hx-chev">' + I.chevd + '</span></button>' : '') + '<button class="hx-iconbtn is-sm" data-act="mcpMenu" data-arg="' + m.id + '">' + I.dots + '</button></div></div>' +
        (m.state === 'bad' ? '<div class="hx-li__more">' + note(esc(m.err) + '。到 <a data-nav="secrets">密钥</a> 里添加后重新连接。', 'is-bad') + '</div>' : '') +
        (open ? '<div class="hx-li__more"><table class="hx-tbl"><thead><tr><th>工具</th><th>风险等级</th><th>启用</th></tr></thead><tbody>' + m.tools.map((t, i) => '<tr><td class="hx-mono">' + esc(t[0]) + '</td><td>' + pill(t[1], t[1] === 'L3' ? 'is-bad' : t[1] === 'L2' ? 'is-warn' : '') + '</td><td>' + sw('mcpTool.' + m.id + '.' + i, t[2] !== false) + '</td></tr>').join('') + '</tbody></table></div>' : '');
    }).join(''), { p: '兼容 Claude Desktop、Cursor 的 <span class="hx-mono">mcpServers</span> 配置：可以直接粘贴 JSON 导入。stdio 服务以你的账户权限在本机运行，添加前请确认命令来源可信。' }) };

  /* ===== 技能 ===== */
  P.skills = { name: '技能', icon: 'spark', badge: () => [C.counts().skills + ' 启用', ''],
    desc: '技能是一份写给 Agent 的说明书（SKILL.md，可带脚本和资料），Agent 只在需要时才加载全文，不占常驻上下文。',
    acts: () => btn('导入技能文件夹', 'importSkill', null, 'is-ghost', 'upload') + btn('新建技能', 'newSkill', null, 'is-primary', 'plus'),
    render: () => card('', C.skills.map(k => '<div class="hx-li"><span class="hx-li__ic">' + I.spark + '</span><div class="hx-li__m"><div class="hx-li__t">' + esc(k.name) + pill(k.files + ' 个文件', '') + '</div><div class="hx-li__d">' + esc(k.desc) + ' · <span class="hx-mono">' + esc(k.src) + '</span></div></div><div class="hx-li__x">' + btn('编辑', 'editSkill', k.id, 'is-ghost') + sw('skills#' + k.id + '.on', k.on) + '</div></div>').join('')) +
      card('谁能用', row('可以加载技能的 Agent', '"全部"表示所有 Agent 节点和编排者都能按需加载；"指定"时在 Agent 节点的参数里勾选', seg('skillScope', [['all', '全部'], ['pick', '指定']], C.skillScope || 'all'))) };

  /* ===== 扩展包 ===== */
  P.exts = { name: '扩展包', icon: 'box', badge: () => [C.counts().exts + '', ''],
    desc: '扩展包可以带来新节点、工具、技能和模板。安装前会列出它要的权限；未签名的包默认不启用。',
    acts: () => btn('从文件安装（.zip）', 'installExt', null, 'is-primary', 'upload'),
    render: () => card('', C.exts.map(x => '<div class="hx-li"><span class="hx-li__ic">' + I.box + '</span><div class="hx-li__m"><div class="hx-li__t">' + esc(x.name) + '<span class="hx-pill is-mono">v' + esc(x.ver) + '</span>' + (x.sign === 'ok' ? pill('已签名', 'is-ok') : pill('未签名', 'is-warn')) + '</div><div class="hx-li__d">' + esc(x.desc) + ' · ' + x.nodes + ' 个节点 · 权限：' + x.perms.map(esc).join('、') + '</div></div><div class="hx-li__x">' + btn('卸载', 'rmExt', x.id, 'is-ghost') + sw('exts#' + x.id + '.on', x.on) + '</div></div>').join(''), { p: '插件市场不在 v1 范围（P.02）；扩展包从文件安装，结构见 X 扩展规范。' }) };

  /* ===== 授权与安全 ===== */
  const MX = [['改图（结构修改）', 'n p a a a'], ['删除节点 · 解散子图', 'n p q a a'], ['改角色卡 · 配方', 'n p q a a'], ['启动运行', 'n q a a a'], ['L0 只读工具', 'n a a a a'], ['L1 工具', 'n q a a a'], ['L2 工具', 'n q a a a'], ['L3 高风险工具', 'n q q q a'], ['修改授权书', 'n n n q a'], ['解除急停', 'n n n n n']];
  const MXL = { a: '自动', p: '提议', q: '审批', n: '禁止' };
  P.security = { name: '授权与安全', icon: 'shield', desc: '模型能做什么由"授权档位"决定；高风险动作、外部内容触发的动作、超预算都会停下来等你。急停只有你能解除。',
    render: () => {
      const cur = HX.S.level;
      const mx = '<div class="hx-mx"><span class="h"></span>' + LV.map((l, i) => '<span class="h" style="justify-content:center;flex-direction:column;gap:0;height:38px"><b style="color:var(--hx-text-1)">' + i + '</b>' + l[0] + '</span>').join('') +
        MX.map(r => '<span class="h">' + r[0] + '</span>' + r[1].split(' ').map((c, i) => '<span class="' + c + (i === cur ? ' cur' : '') + '">' + MXL[c] + '</span>').join('')).join('') + '</div>';
      const s = C.sec;
      return card('各档位能做什么', mx, { p: '描边列是当前会话的档位（' + cur + ' · ' + LV[cur][0] + '）。档位 2 的"自动"限于授权书写明的范围和工具风险上限；档位 4 的 L3 工具上游仍要求有人工节点。这张表和后端判定读同一份数据（C.09 §5）。', x: btn('新会话默认 ' + C.general.defaultLevel + ' 档', 'nav', 'general', 'is-ghost') }) +
        card('外部内容与审批', row('外部内容标记为不可信', '检索、网页、邮件、MCP 返回的内容自动带"污染标记"；它们触发的 L2 以上操作一律需要审批。这一项不能关闭（S.05）', sw('sec.untrusted', true, true) + I.lock.replace('<svg', '<svg style="width:13px;height:13px;color:var(--hx-text-3)"')) +
          row('合并同类审批', '同一运行里同一工具的多次请求合并成一条，可以一次批准', sw('sec.mergeApprovals', s.mergeApprovals)) +
          row('审批等待时限', '超过时限视为驳回，运行按"驳回"分支继续', sel('sec.approvalTimeout', [['1h', '1 小时'], ['24h', '24 小时'], ['7d', '7 天'], ['never', '一直等']], s.approvalTimeout, 120))) +
        card('代码执行沙箱', row('执行后端', 'wazero：进程内 WebAssembly 沙箱，无需安装；Docker：隔离更强，需要本机装 Docker', seg('sec.sandbox', [['wazero', 'wazero（默认）'], ['docker', 'Docker']], s.sandbox)) +
          row('单次执行时限', '', num('sec.timeout', s.timeout, '秒')) + row('内存上限', '', num('sec.mem', s.mem, 'MB')) +
          row('沙箱内允许联网', '默认关闭；打开后仍受出站白名单限制', sw('sec.net', s.net))) +
        card('急停', row('全局急停', '立即停止所有运行，所有会话的档位降到 0。<b>只有你能解除</b>，模型无论几档都不能解除（INV-10）', btn('全局急停', 'estop', null, 'is-danger', 'stop')));
    } };

  /* ===== 密钥 ===== */
  P.secrets = { name: '密钥', icon: 'key', badge: () => [C.counts().secrets + '', ''],
    desc: '所有 API Key、令牌统一放在这里。只在调用时读取；日志、导出、诊断包里都不会出现明文。',
    acts: () => btn('添加密钥', 'addSecret', null, 'is-primary', 'plus'),
    render: () => card('存储位置', row('当前使用', C.secretBackend === 'keyring' ? 'Windows 凭据管理器（macOS 钥匙串 / Linux Secret Service 同理）。系统密钥库不可用时改用加密文件，每次启动需要输入主密码' : '加密文件 secrets.enc（Argon2id + XChaCha20-Poly1305）；每次启动需要输入主密码解锁',
        pill(C.secretBackend === 'keyring' ? '系统密钥库 · 正常' : '加密文件 · 已解锁', 'is-ok', 1) + seg('secretBackend', [['keyring', '系统密钥库'], ['file', '加密文件']], C.secretBackend))) +
      card('密钥', '<table class="hx-tbl"><thead><tr><th>名称</th><th>值</th><th>用于</th><th>更新</th><th></th></tr></thead><tbody>' + C.secrets.map(k => '<tr><td class="hx-mono"><b>' + esc(k.name) + '</b></td><td class="hx-mono">••••••••' + esc(k.tail) + '</td><td>' + esc(k.by) + '</td><td class="hx-mono">' + esc(k.at) + '</td><td class="acts">' + btn('替换', 'replaceSecret', k.name, 'is-ghost') + btn('删除', 'rmSecret', k.name, 'is-ghost') + '</td></tr>').join('') + '</tbody></table>', { p: '在节点参数、MCP 环境变量里用 <span class="hx-mono">${secret:名称}</span> 引用，不要直接粘贴密钥。' }) };

  /* ===== 预算与用量 ===== */
  P.budget = { name: '预算与用量', icon: 'wallet', desc: '按模型价格表计算的费用（人民币）。超出预算时运行先暂停，问你是否继续。',
    render: () => {
      const b = C.budget, pct = Math.round(b.used / b.month * 100), mx = Math.max.apply(null, C.usage), tot = C.byModel.reduce((a, x) => a + x[1], 0);
      const days = C.usage.map((v, i) => '<div data-tip="11-' + (9 + i) + ' · ' + money(v) + '"><i style="height:' + Math.round(v / mx * 100) + '%"></i><span>' + (9 + i) + '</span></div>').join('');
      return '<div class="hx-kpis"><div class="hx-kpi"><small>本月费用</small><b>' + money(b.used) + '</b><span>预算 ' + money(b.month) + ' · 已用 ' + pct + '%</span><div class="hx-meter" style="margin-top:10px"><b style="width:' + pct + '%"' + (pct >= b.warn ? ' class="is-warn"' : '') + '></b></div></div>' +
        '<div class="hx-kpi"><small>今天</small><b>' + money(C.usage[C.usage.length - 1]) + '</b><span>运行 9 次</span></div><div class="hx-kpi"><small>本月 tokens</small><b>18.6M</b><span>输入 15.1M · 输出 3.5M</span></div><div class="hx-kpi"><small>本月运行</small><b>142</b><span>失败 6 · 取消 3</span></div></div>' +
        card('最近 14 天', '<div class="hx-bars">' + days + '</div>') +
        card('按模型', '<div class="hx-stack">' + C.byModel.map(x => '<i style="width:' + (x[1] / tot * 100) + '%;background:' + x[2] + '"></i>').join('') + '</div><div class="hx-legend">' + C.byModel.map(x => '<span><i style="background:' + x[2] + '"></i>' + esc(x[0]) + ' · ' + money(x[1]) + '</span>').join('') + '</div>') +
        card('预算', row('每月预算', '0 表示不限', num('budget.month', b.month, '元')) + row('提醒阈值', '达到预算的这个比例时在通知中心提醒', sel('budget.warn', [[50, '50%'], [80, '80%'], [90, '90%']], b.warn, 100)) +
          row('单次运行默认预算', '每次运行可以在启动时改；图上的循环、扇出节点还可以单独设上限', num('budget.perRun', b.perRun, '元')) +
          row('超出预算时', '', seg('budget.over', [['pause', '暂停并询问'], ['stop', '直接停止']], b.over))) +
        card('最近运行', '<table class="hx-tbl"><thead><tr><th>会话</th><th>说明</th><th>状态</th><th class="num">用时</th><th class="num">费用</th><th>时间</th></tr></thead><tbody>' + C.runs.map(r => '<tr><td><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td><td>' + ({ done: pill('完成', 'is-ok'), failed: pill('失败', 'is-bad'), cancelled: pill('已取消', '') })[r[2]] + '</td><td class="num">' + esc(r[3]) + '</td><td class="num">' + money(r[4]) + '</td><td class="hx-mono">' + esc(r[5]) + '</td></tr>').join('') + '</tbody></table>', { p: '<b>demo 里的用量和费用都是示例数据。</b>' });
    } };

  /* ===== 并发与限流 ===== */
  P.pools = { name: '并发与限流', icon: 'sliders', desc: '同一时间最多跑多少个节点、每家提供方每分钟最多发多少请求。触发限流时节点排队，不会失败。',
    render: () => card('', row('全局并发上限', '所有会话、所有运行加起来同时执行的节点数', num('pools.global', C.pools.global, '个')) +
      row('排队顺序', '"按会话轮转"可以避免一个大运行占满资源', seg('pools.queue', [['fifo', '先来先服务'], ['rr', '按会话轮转']], C.pools.queue))) +
      card('按提供方', '<table class="hx-tbl"><thead><tr><th>提供方</th><th>并发</th><th>每分钟请求</th><th class="num">当前排队</th></tr></thead><tbody>' + C.pools.per.map((p, i) => '<tr><td><b>' + esc(p[0]) + '</b></td><td>' + num('poolPer.' + i + '.1', p[1], '', 70) + '</td><td>' + num('poolPer.' + i + '.2', p[2], '0 = 不限', 80) + '</td><td class="num">0</td></tr>').join('') + '</tbody></table>', { p: '收到提供方的 429（限流）时自动退避重试，并在节点上显示"排队中"。' }) };

  /* ===== 数据与存储 ===== */
  P.data = { name: '数据与存储', icon: 'db', desc: '所有数据都在本机：图、运行记录、对话、工作区原文。运行记录（事件）永久保留，用于回放和审计。',
    render: () => {
      const d = C.data, tot = d.parts.reduce((a, x) => a + x[1], 0), mb = v => v >= 1024 ? (v / 1024).toFixed(2) + ' GB' : v + ' MB';
      return card('', row('数据目录', '<span class="hx-mono">' + esc(d.dir) + '</span>', btn('打开文件夹', 'openDir', null, 'is-ghost', 'folder') + btn('复制路径', 'copy', d.dir, 'is-ghost', 'copy'))) +
        card('占用空间 <small>' + mb(tot) + '</small>', '<div class="hx-stack">' + d.parts.map(x => '<i style="width:' + (x[1] / tot * 100) + '%;background:' + x[2] + '"></i>').join('') + '</div><div class="hx-legend">' + d.parts.map(x => '<span><i style="background:' + x[2] + '"></i>' + esc(x[0]) + ' · ' + mb(x[1]) + '</span>').join('') + '</div>') +
        card('保留期', row('工作区原文', '运行里抓取、生成的大段内容；没有被任何图或对话引用且超过期限后清理', sel('data.blobDays', [[7, '7 天'], [30, '30 天'], [90, '90 天'], [0, '永久']], d.blobDays, 110)) +
          row('日志', '', sel('data.logDays', [[7, '7 天'], [14, '14 天'], [30, '30 天']], d.logDays, 110)) +
          row('运行记录与审计', '永久保留（回放、分叉、审计都依赖它）', pill('永久', ''))) +
        card('导出与清理', row('导出全部数据', '图、会话、运行记录打包成一个文件；不含密钥', btn('导出…', 'export', null, '', 'upload')) +
          row('立即清理', '按上面的保留期清理一次（平时每天自动执行）', btn('清理', 'gc', null, 'is-ghost')) +
          row('<span style="color:var(--hx-danger)">彻底删除所有数据</span>', '删除数据目录里的全部内容并退出，无法恢复；密钥库里的条目一并删除', btn('删除所有数据…', 'purge', null, 'is-danger')));
    } };

  /* ===== 本机访问与命令行 ===== */
  let showTok = false;
  P.access = { name: '本机访问与命令行', icon: 'term', desc: 'Harness 只在本机运行，浏览器和命令行工具 harnessctl 通过本机地址访问。',
    render: () => card('', row('本机地址', '<span class="hx-mono">' + esc(C.access.url) + '</span>', btn('复制', 'copy', C.access.url, 'is-ghost', 'copy')) +
      row('只允许本机访问', '只监听 127.0.0.1，不能开启局域网或公网访问（INV-21）。多人共用、远程访问不在 v1 范围', pill('127.0.0.1', 'is-ok', 1) + I.lock.replace('<svg', '<svg style="width:13px;height:13px;color:var(--hx-text-3)"'))) +
      card('访问令牌', row('本机令牌', '浏览器首次打开和 harnessctl 用它登录；保存在数据目录的 token 文件里', '<span class="hx-mono" style="font-size:12px">' + (showTok ? 'hx_live_4f9c2a7d81b03e5c6f19e21a' : esc(C.access.token)) + '</span>' + btn(showTok ? '隐藏' : '显示', 'tok', null, 'is-ghost') + btn('重新生成…', 'rotate', null, 'is-ghost'))) +
      card('命令行 harnessctl', '<div class="hx-code"><span class="c"># 查看状态、急停、校验审计</span>\nharnessctl status\nharnessctl estop            <span class="c"># 全局急停</span>\nharnessctl estop release    <span class="c"># 解除（命令行代表你本人）</span>\nharnessctl audit verify\n\n<span class="c"># 导出、诊断、评测</span>\nharnessctl export -o backup.hxz\nharnessctl doctor\nharnessctl eval run --suite ./evals</div>', { p: '加 <span class="hx-mono">--json</span> 输出 JSON，方便写脚本（B.08）。' }) +
      card('接口文档', row('OpenAPI 3.1', '所有 HTTP 接口的说明，自动生成（B.03.06）；对外发布成 API 不在 v1 范围', '<span class="hx-mono" style="font-size:12px">/api/v1/openapi.json</span>' + btn('打开', 'openapi', null, 'is-ghost', 'ext'))) };

  /* ===== 关于与诊断 ===== */
  P.about = { name: '关于与诊断', icon: 'info', desc: '版本信息、检查更新、诊断包和日志。',
    render: () => card('', row('Harness 积木编排', '<span class="hx-mono">v0.5.0-demo · 图文档格式 v1 · 构建 2026-11-22</span>', btn('检查更新', 'update', null, 'is-ghost', 'refresh')) +
      row('运行环境', '<span class="hx-mono">Windows · harnessd 单进程 · SQLite（WAL）</span>', '')) +
      card('诊断', row('诊断包', '最近日志（已脱敏）、版本、配置（不含密钥），反馈问题时附上', btn('生成诊断包', 'diag', null, '', 'upload')) +
        row('日志', '', btn('查看日志', 'logs', null, 'is-ghost', 'term')) + row('环境检查', '数据目录权限、数据库完整性、密钥库、端口、MCP 服务', btn('运行检查', 'doctor', null, 'is-ghost', 'check'))) +
      card('帮助', row('首次引导', '重新走一遍：连接模型 → 选模板 → 第一次运行', btn('重新查看', 'onboard', null, 'is-ghost')) +
        row('用户文档', '', btn('打开文档', 'docs', null, 'is-ghost', 'book')) + row('开源许可', '使用的第三方组件及其许可证', btn('查看', 'licenses', null, 'is-ghost'))) };

  ['models', 'tools', 'mcp', 'skills', 'exts', 'secrets'].forEach(k => { P[k].hidden = 1; P[k].mode = 'hidden'; });
  MODES.hidden = { name: '', ph: '' };

  /* ===== 资源库 ===== */
  const ROLES = [
    ['主脑', '对话编排者@1', '常驻的总负责人：拆目标、定方向、判断是否结束', 3, '你是这个系统的主脑。\n目标：{{目标}}\n你只做三件事：拆解目标、分配给下游、判断是否达成。\n不要自己执行具体任务。输出必须符合「目标@1」。'],
    ['智囊', '—', '从不同角度提出方案；扇出时每份带不同视角', 1, '你是智囊团成员，视角：{{视角}}。\n针对目标给出 1–3 个方案，每个方案写清依据和风险。'],
    ['聚类员', '—', '把多份方案按相似度分簇并标注', 1, '把输入的方案按核心思路分簇……'],
    ['决策者', '主脑@1', '在候选方案中做取舍，输出任务卡', 2, '你是决策者。从候选方案里选出可执行的部分，拆成任务卡……'],
    ['执行者', '—', '按任务卡执行，调用工具，输出执行结果', 4, '你是执行者。严格按任务卡执行……'],
    ['验收者', '—', '对照目标判定是否达成，指出缺口', 2, '你是验收者。逐条对照验收标准……'],
    ['对话编排者', '—', '底部对话框背后的 AI（B.06.02）', 1, '你是 Harness 的编排者。根据用户的话决定：回答、改图、控制运行或带用户去看画布……']];
  const RECIPES = [['主脑配方@1', '系统提示 15% · 角色卡 10% · 目标账本 25% · 上轮摘要 30% · 工具说明 5%', 0.05], ['决策者配方@1', '角色卡 10% · 候选方案 50% · 约束 15% · 历史判定 20%', 0.1],
    ['执行者配方@1', '任务卡 30% · 工具说明 20% · 资料片段 40%', 0.1], ['验收者配方@1', '验收标准 25% · 执行结果 55% · 目标 15%', 0.12], ['对话编排者配方@1', '会话摘要 20% · 最近消息 40% · 当前图视图 25% · 选中附带 10%', 0.2]];
  const TYPES = [['目标@1', '业务', 4, '—'], ['方案@1', '业务', 5, '—'], ['簇标注@1', '业务', 3, '—'], ['任务卡@1', '业务', 6, '—'], ['执行结果@1', '业务', 4, '—'], ['判定@1', '业务', 3, '—'], ['上下文包', '系统', 7, '—'], ['引用', '系统', 3, '—'], ['工具端点', '系统', 4, '—']];
  P.roles = { name: '角色卡', icon: 'user', lib: 1, desc: '给 Agent 的"人设 + 规矩"。可以继承：子角色卡只写差异。修改会生成新版本，已经在用的节点不受影响。',
    acts: () => btn('新建角色卡', 'newRole', null, 'is-primary', 'plus'),
    render: () => '<div class="hx-agrid">' + ROLES.map((r, i) => '<button class="hx-acard" data-act="role" data-arg="' + i + '"><div class="hx-acard__t">' + I.user + esc(r[0]) + '<span class="sp"></span><span class="hx-pill is-mono">@1</span></div><div class="hx-acard__d">' + esc(r[2]) + '</div><div class="hx-acard__f"><span>继承 ' + esc(r[1]) + '</span><span class="sp"></span><span>' + r[3] + ' 个节点在用</span></div></button>').join('') + '</div>' };
  P.recipes = { name: '上下文配方', icon: 'layers', lib: 1, desc: '决定 Agent 每次能看到什么、各占多少预算。上下文装配节点按配方组装，超出预算时按溢出策略处理。',
    render: () => card('', '<table class="hx-tbl"><thead><tr><th>配方</th><th>组成</th><th class="num">预算 × 窗口</th><th></th></tr></thead><tbody>' + RECIPES.map((r, i) => '<tr><td class="hx-mono"><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td><td class="num">' + r[2] + '</td><td class="acts">' + btn('编辑', 'recipe', i, 'is-ghost') + '</td></tr>').join('') + '</tbody></table>') };
  P.types = { name: '数据类型', icon: 'route2', lib: 1, desc: '端口之间传递的数据结构。业务类型可以自己定义；连线时按类型检查能不能连。',
    acts: () => btn('定义新类型', 'newType', null, 'is-primary', 'plus'),
    render: () => card('', '<table class="hx-tbl"><thead><tr><th>类型</th><th>层</th><th class="num">字段</th><th>继承</th></tr></thead><tbody>' + TYPES.map(t => '<tr><td class="hx-mono"><b>' + esc(t[0]) + '</b></td><td>' + pill(t[1], t[1] === '系统' ? '' : 'is-model') + '</td><td class="num">' + t[2] + '</td><td>' + esc(t[3]) + '</td></tr>').join('') + '</tbody></table>') };
  P.subs = { name: '子图库', icon: 'graph', lib: 1, desc: '存下来可以复用的子图。插入画布时默认锁定版本（快照），也可以选择跟随最新版本。',
    render: () => '<div class="hx-agrid">' + subItems().map((s, i) => '<div class="hx-acard"><div class="hx-acard__pv"><canvas data-sub="' + i + '"></canvas></div><div class="hx-acard__t">' + esc(s.name) + '<span class="sp"></span><span class="hx-pill is-mono">' + esc(s.ver) + '</span></div><div class="hx-acard__d">' + esc(s.desc) + '</div><div class="hx-acard__f"><span>' + s.g.nodes.size + ' 节点</span><span class="sp"></span>' + btn('插入画布', 'insertSub', i, 'is-ghost', 'plus') + '</div></div>').join('') + '</div>' };
  P.tpls = { name: '模板', icon: 'book', lib: 1, desc: '整张图的起点。用模板新建会话后可以随便改，不影响模板本身。',
    render: () => '<div class="hx-agrid">' + tplItems().map(t => '<div class="hx-acard"><div class="hx-acard__pv"><canvas data-tpl="' + t.k + '"></canvas></div><div class="hx-acard__t">' + esc(t.name) + '<span class="sp"></span>' + pill(t.layers, '') + '</div><div class="hx-acard__d">' + esc(t.desc) + '</div><div class="hx-acard__f"><span>预计每次 ' + esc(t.cost) + '</span><span class="sp"></span>' + btn('用它新建会话', 'useTpl', t.k, 'is-primary') + '</div></div>').join('') + '</div>' };

  let subCache = null, tplCache = {};
  function subItems() {
    if (subCache) return subCache;
    const B = HX.sessionTemplates || {}, list = [];
    const pick = (g, label) => { let r = null; HX.walk(g, n => { if (!r && n.label === label && n.children) r = n.children; }); return r; };
    try {
      const a = HX.buildTemplate(); const x = pick(a, '资料采集'); if (x) list.push({ name: '资料采集', ver: 'v1.2', desc: '检索 + 网页抓取 → 采集员 → 去重 → 摘要员', g: x });
      if (B.tickets) { const y = pick(B.tickets(), '工单分诊'); if (y) list.push({ name: '工单分诊', ver: 'v2', desc: '分类员判断紧急程度，P0 转人工，其余自动回复', g: y }); }
      if (B.papers) { const p = B.papers(); const z = pick(p, '单篇精读'); if (z) list.push({ name: '单篇精读', ver: 'v1', desc: '多模型并行精读一篇论文，要点投票，再核对引文', g: z }); const w = pick(p, '引文核对'); if (w) list.push({ name: '引文核对', ver: 'v1', desc: '检索原文，逐条核对引用是否属实', g: w }); }
      if (B.review) { const v = pick(B.review(), '评审回合'); if (v) list.push({ name: '评审回合', ver: 'v1', desc: '评审者用代码执行工具验证，最多 3 轮', g: v }); }
    } catch (e) { console.error(e); }
    return (subCache = list);
  }
  function tplItems() {
    const T = (HX.sessions && HX.sessions.templates) || [];
    return T.map(t => { if (!tplCache[t.k]) { try { tplCache[t.k] = t.build(); } catch (e) { tplCache[t.k] = HX.newGraph([], []); } } const st = HX.sessions.stat(tplCache[t.k]); return { k: t.k, name: t.name, desc: t.desc, cost: t.cost || '¥0.5–3', layers: st.boxes ? st.layers + ' 层' : '单层', g: tplCache[t.k] }; });
  }
  function drawPreviews() {
    root.querySelectorAll('canvas[data-sub]').forEach(cv => { const s = subItems()[+cv.dataset.sub]; if (s && HX.drawGraph) try { HX.drawGraph(cv, s.g, 'thumb'); } catch (e) { /* 忽略 */ } });
    root.querySelectorAll('canvas[data-tpl]').forEach(cv => { const t = tplItems().find(x => x.k === cv.dataset.tpl); if (t && HX.drawGraph) try { HX.drawGraph(cv, t.g, 'thumb'); } catch (e) { /* 忽略 */ } });
  }

  /* ---------------- 渲染 ---------------- */
  function renderNav() {
    const q = $('ctrSearch').value.trim();
    let h = '';
    if (q) {
      const hits = searchIndex().filter(x => (x.t + x.p).toLowerCase().includes(q.toLowerCase())).slice(0, 30);
      h = '<div class="hx-ctr__grp">搜索结果</div>' + (hits.length ? hits.map(x => '<button class="hx-ctr__it" data-nav="' + x.id + '" data-hit="' + esc(x.k) + '">' + I[P[x.id].icon] + '<span>' + esc(x.t) + '<small style="display:block;font-size:11px;color:var(--hx-text-3)">' + esc(P[x.id].name) + '</small></span></button>').join('') : '<div class="hx-ctr__grp">没有找到「' + esc(q) + '」</div>');
    } else {
      h = groupsOf(mode).filter(g => g[1].length).map(g => '<div class="hx-ctr__grp">' + g[0] + '</div>' + g[1].map(id => { const p = P[id], b = p.badge ? p.badge() : null; return '<button class="hx-ctr__it' + (id === page ? ' is-on' : '') + '" data-nav="' + id + '">' + I[p.icon] + '<span>' + p.name + '</span>' + (b && b[0] ? '<em class="' + b[1] + '">' + esc(b[0]) + '</em>' : '') + '</button>'; }).join('')).join('');
      if (MODES[mode].navFoot) h += MODES[mode].navFoot();
    }
    $('ctrNav').innerHTML = h;
    $('ctrModes').innerHTML = '<div class="hx-seg is-fill">' + MODE_ORDER.map(m => '<button data-mode="' + m + '"' + (m === mode ? ' class="is-on"' : '') + '>' + MODES[m].name + '</button>').join('') + '</div>';
    $('ctrSearch').placeholder = MODES[mode].ph;
    $('ctrFoot').innerHTML = mode === 'settings' ? '修改即时生效并自动保存<br>配置文件：<span class="hx-mono">harness.yaml</span>' : mode === 'pkgs' ? '内置功能、MCP 服务、扩展包、技能都是"包"；包带来节点、工具、连接类型和设置' : mode === 'conns' ? '连接 = 很多节点共用的账号、地址和密钥；密钥存系统密钥库' : '资源都带版本号；修改会生成新版本';
  }
  function renderHead() {
    const p = P[page];
    $('ctrHead').innerHTML = '<div><h2 id="ctrTitle">' + p.name + '</h2><p>' + p.desc + '</p></div><span class="sp"></span><div class="hx-ctr__acts">' + (p.acts ? p.acts() : '') + '</div>';
  }
  function render(keepScroll) {
    const body = $('ctrBody'), st = body.scrollTop;
    renderNav(); renderHead();
    body.innerHTML = P[page].render();
    if (keepScroll) body.scrollTop = st; else body.scrollTop = 0;
    if (P[page].lib) requestAnimationFrame(drawPreviews);
  }
  let idx = null;
  function searchIndex() {
    if (idx) return idx;
    idx = [];
    Object.keys(P).forEach(id => {
      if (modeOf(id) !== mode) return;
      idx.push({ id: id, t: P[id].name, k: '', p: P[id].desc });
      let html = ''; try { html = P[id].render(); } catch (e) { return; }
      const re = /<div class="hx-sr" data-k="([^"]*)"><div class="hx-sr__l"><div class="hx-sr__t">([\s\S]*?)<\/div>(?:<div class="hx-sr__d">([\s\S]*?)<\/div>)?/g; let m;
      while ((m = re.exec(html))) { const t = m[2].replace(/<[^>]+>/g, ''); if (t) idx.push({ id: id, t: t, k: m[1], p: (m[3] || '').replace(/<[^>]+>/g, '') }); }
    });
    return idx;
  }
  function go(id, hit) {
    if (ALIAS[id]) id = ALIAS[id]();
    if (MODES[id]) { mode = id; idx = null; let p0 = null; try { p0 = localStorage.getItem('hx-ctr-page-' + id); } catch (x) { p0 = null; } id = p0 && P[p0] && modeOf(p0) === id ? p0 : firstPage(id); }
    if (!P[id]) return;
    if (modeOf(id) !== mode) idx = null;
    page = id; mode = modeOf(id); closeSheet(); render();
    try { localStorage.setItem('hx-ctr-page-' + mode, id); } catch (e) { /* 忽略 */ }
    if (hit) { const el = [...root.querySelectorAll('.hx-sr')].find(x => x.dataset.k === hit); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('is-hit'); } }
  }
  function saved() { savedAt = Date.now(); }

  /* 设置变化后的联动 */
  function onSet(p, v) {
    const html = document.documentElement;
    if (p === 'look.mode' && HX.palette && HX.palette.setMode) HX.palette.setMode(v);
    if (p === 'look.density') html.dataset.density = v;
    if (p === 'look.zoom') document.body.style.zoom = (+v) / 100;
    if (p === 'look.reduce') html.classList.toggle('hx-reduce', !!v);
    if (p === 'look.mini') { const m = $('mini'); if (m) m.style.display = v ? '' : 'none'; }
    if (p.startsWith('roles.') || p === 'effort' || p.includes('.models#')) C.changed('models');
    if (p.startsWith('tools#') && p.endsWith('.on')) HX.toast(v ? '已启用工具' : '已停用工具', '正在运行的节点在下一次调用时生效');
    if (p === 'general.desktopNotify' && v && typeof Notification !== 'undefined' && Notification.requestPermission) try { Notification.requestPermission(); } catch (e) { /* 忽略 */ }
    if (p === 'secretBackend') render(true);
    C.changed(p);
  }

  /* ---------------- 侧拉表单 / 对话框 ---------------- */
  let sheetSave = null;
  function openSheet(title, body, foot, onSave) {
    const s = $('ctrSheet'); sheetSave = onSave || null;
    s.innerHTML = '<div class="hx-sheet__h"><b>' + title + '</b><span class="sp"></span><button class="hx-iconbtn is-sm" data-act="closeSheet">' + I.x + '</button></div><div class="hx-sheet__b">' + body + '</div><div class="hx-sheet__f">' + (foot || '<span class="sp"></span>' + btn('取消', 'closeSheet', null, 'is-ghost') + btn('保存', 'saveSheet', null, 'is-primary')) + '</div>';
    s.hidden = false; const f = s.querySelector('input,textarea'); if (f) setTimeout(() => f.focus(), 50);
  }
  function closeSheet() { $('ctrSheet').hidden = true; sheetSave = null; }
  HX.dialog = function (o) {
    dlg.innerHTML = '<div class="hx-dlg__w" role="alertdialog"><h3>' + esc(o.title) + '</h3><p>' + o.text + '</p>' + (o.code ? '<div class="hx-code" style="margin:0 0 14px">' + esc(o.code) + '</div>' : '') +
      (o.input ? '<input class="hx-input" id="dlgIn" placeholder="' + esc(o.input) + '">' : '') + '<div class="hx-dlg__f"><button class="hx-btn is-sm is-ghost" data-d="no">取消</button><button class="hx-btn is-sm ' + (o.danger ? 'is-danger' : 'is-primary') + '" data-d="ok"' + (o.must ? ' disabled' : '') + '>' + esc(o.ok || '确定') + '</button></div></div>';
    dlg.hidden = false;
    const okB = dlg.querySelector('[data-d="ok"]'), inp = dlg.querySelector('#dlgIn');
    if (inp) { inp.addEventListener('input', () => { if (o.must) okB.disabled = inp.value.trim() !== o.must; }); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !okB.disabled) okB.click(); if (e.key === 'Escape') close(); }); setTimeout(() => inp.focus(), 40); }
    const close = () => { dlg.hidden = true; dlg.innerHTML = ''; };
    dlg.onclick = e => { const b = e.target.closest('[data-d]'); if (e.target === dlg || (b && b.dataset.d === 'no')) close(); else if (b && b.dataset.d === 'ok') { const v = inp ? inp.value : true; close(); if (o.onOk) o.onOk(v); } };
  };

  function providerSheet(id) {
    const p = C.provider(id) || C.provider('custom'), custom = id === 'custom', local = p.kind === 'ollama';
    const body = (custom ? '<label class="hx-fd"><span>名称</span><input class="hx-input" id="pvName" placeholder="例如 公司内网网关"></label>' : '') +
      (local ? '' : '<label class="hx-fd"><span>API Key</span><div class="hx-pw"><input class="hx-input" id="pvKey" type="password" placeholder="' + (p.key ? esc(p.key) : '粘贴 API Key') + '" autocomplete="off" spellcheck="false"><button class="hx-btn is-sm is-ghost" data-act="pwToggle">显示</button></div><small>' + I.lock.replace('<svg', '<svg style="width:11px;height:11px;vertical-align:-1px"') + ' 保存到系统密钥库（' + esc(id.toUpperCase()) + '_API_KEY），不写进配置文件、不出现在日志里。留空表示不修改。</small></label>') +
      '<label class="hx-fd"><span>接口地址（Base URL）</span><input class="hx-input hx-mono" id="pvBase" value="' + esc(p.base) + '" placeholder="https://…"><small>' + (custom ? '任何兼容 OpenAI Chat Completions 的服务：vLLM、LM Studio、公司网关等。' : '一般不用改；走代理或私有部署时填写。') + '</small></label>' +
      (p.kind === 'openai' ? '<label class="hx-fd"><span>组织 ID（可选）</span><input class="hx-input hx-mono" id="pvOrg" placeholder="org-…"></label>' : '') +
      '<label class="hx-fd"><span>网络代理（可选）</span><input class="hx-input hx-mono" id="pvProxy" placeholder="http://127.0.0.1:7890"></label>' +
      '<div class="hx-fd"><span>连接测试</span>' + btn('测试连接', 'testProvider', p.id, '', 'bolt') + '<div class="hx-test" id="pvTest">' + (p.state === 'ok' ? note('上次测试成功 · 延迟 ' + p.latency + ' ms · ' + p.models.length + ' 个模型', 'is-ok', 'check') : '') + '</div></div>';
    const foot = (p.state === 'ok' && !custom ? btn('断开并删除密钥', 'rmProvider', p.id, 'is-danger') : '') + '<span class="sp"></span>' + btn('取消', 'closeSheet', null, 'is-ghost') + btn('保存', 'saveSheet', null, 'is-primary');
    openSheet((custom ? '添加 OpenAI 兼容提供方' : '配置 ' + esc(p.name)), body, foot, () => {
      const key = (($('pvKey') || {}).value || '').trim(), base = ($('pvBase').value || '').trim();
      if (custom) {
        const name = ($('pvName').value || '').trim() || '自定义提供方', nid = 'c' + Date.now().toString(36);
        C.providers.splice(C.providers.length - 1, 0, { id: nid, name: name, logo: name[0], kind: 'openai_compat', desc: base || '自定义 OpenAI 兼容接口', state: key ? 'ok' : 'none', key: key ? key.slice(0, 3) + '••••••••' + key.slice(-4) : '', base: base, models: [{ id: nid + '-default', name: name + ' 默认模型', win: '32K', caps: ['工具'], pin: 0, pout: 0, on: true }], latency: 180 });
        if (key) C.secrets.push({ name: name.toUpperCase().replace(/\W+/g, '_') + '_API_KEY', tail: key.slice(-4), by: '模型提供方 · ' + name, at: '11-22' });
      } else {
        if (base) p.base = base;
        if (key) { p.key = key.slice(0, 3) + '••••••••' + key.slice(-4); p.state = 'ok'; p.latency = p.latency || 300 + Math.round(Math.random() * 300); const nm = p.id.toUpperCase() + '_API_KEY'; const s = C.secrets.find(x => x.name === nm); if (s) { s.tail = key.slice(-4); s.at = '11-22'; } else C.secrets.push({ name: nm, tail: key.slice(-4), by: '模型提供方 · ' + p.name, at: '11-22' }); }
        if (local && p.state !== 'ok' && p._tested) p.state = 'ok';
      }
      idx = null; closeSheet(); render(true); C.changed('models'); HX.toast('已保存', '模型列表已更新；输入框的模型菜单里可以直接选用', { tone: 'ok' });
    });
  }

  /* ---------------- 动作 ---------------- */
  const A = {};
  A.nav = id => go(id);
  A.closeSheet = closeSheet;
  A.saveSheet = () => { if (sheetSave) sheetSave(); };
  A.theme = k => { if (HX.palette) HX.palette.apply(k); render(true); };
  A.provider = id => providerSheet(id);
  A.pwToggle = (a, b) => { const i = $('pvKey'); if (!i) return; i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? '显示' : '隐藏'; };
  A.testProvider = id => {
    const p = C.provider(id) || {}, out = $('pvTest'), key = (($('pvKey') || {}).value || '').trim();
    out.innerHTML = note('正在连接…', '', 'refresh');
    setTimeout(() => {
      if (p.kind === 'ollama') { p._tested = true; out.innerHTML = note('已连接本机 Ollama（127.0.0.1:11434）· 发现 1 个模型：qwen3:8b', 'is-ok', 'check'); return; }
      if (!key && p.state !== 'ok') { out.innerHTML = note('请先填写 API Key', 'is-bad'); return; }
      if (key && key.length < 8) { out.innerHTML = note('401 · API Key 无效。检查是否复制完整、是否已在提供方后台启用', 'is-bad'); return; }
      const ms = 280 + Math.round(Math.random() * 400); p.latency = ms;
      out.innerHTML = note('连接成功 · 延迟 ' + ms + ' ms · 发现 ' + (p.models || []).length + ' 个模型', 'is-ok', 'check') + (p.models && p.models.length ? '<div style="margin-top:8px">' + p.models.map(m => '<div class="hx-sr__d" style="display:flex;gap:8px;align-items:center;margin:4px 0"><span class="hx-mono" style="color:var(--hx-text-1)">' + esc(m.id) + '</span>' + caps(m.caps) + '</div>').join('') + '</div>' : '');
    }, 700);
  };
  A.rmProvider = id => HX.dialog({ title: '断开 ' + C.provider(id).name + '？', text: '会删除它的 API Key。正在用这个提供方模型的节点在下次运行时会报"没有可用模型"，或按"出错时换用"切到别的模型。', ok: '断开', danger: 1, onOk: () => { const p = C.provider(id); p.state = 'none'; p.key = ''; C.secrets = C.secrets.filter(s => s.name !== id.toUpperCase() + '_API_KEY'); closeSheet(); render(true); C.changed('models'); } });
  A.refreshModels = () => { HX.toast('正在刷新模型列表', '从已连接的 ' + C.counts().providers + ' 个提供方拉取'); setTimeout(() => HX.toast('模型列表已是最新', '', { tone: 'ok' }), 900); };
  A.fallback = () => HX.toast('调整换用顺序', 'demo 里只示意：拖动排序，最多 3 个');
  A.addHost = () => { const i = $('hostIn'), v = (i.value || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''); if (!v) return; if (!C.hosts.includes(v)) C.hosts.push(v); idx = null; render(true); };
  A.rmHost = h => { C.hosts = C.hosts.filter(x => x !== h); render(true); };
  A.addDir = () => HX.dialog({ title: '添加允许访问的目录', text: '文件读取工具只能读这些目录里的文件。', input: '例如 C:\\Users\\Administrator\\Documents\\资料', ok: '添加', onOk: v => { if (v && v.trim()) { C.dirs.push(v.trim()); render(true); } } });
  A.rmDir = d => { C.dirs = C.dirs.filter(x => x !== d); render(true); };
  A.toggleMcp = id => { openMcp = openMcp === id ? null : id; render(true); };
  A.reMcp = id => { const m = C.mcp.find(x => x.id === id); HX.toast('正在重新连接 ' + m.name); setTimeout(() => { HX.toast(m.name + ' 仍然连接失败', m.err, { tone: 'danger' }); }, 800); };
  A.confirmMcp = id => { const m = C.mcp.find(x => x.id === id); HX.dialog({ title: '启用 MCP 服务「' + m.name + '」？', text: '下面的命令会以<b>你的账户权限</b>在本机运行。只启用来源可信的服务。启用后它提供的工具默认都是停用状态，需要逐个打开。', code: m.cmd, ok: '确认启用', onOk: () => { m.state = 'ok'; m.on = true; m.tools = [['query', 'L1'], ['list_tables', 'L0'], ['describe_table', 'L0'], ['execute', 'L3', false]]; openMcp = m.id; render(true); HX.toast('已连接 ' + m.name, '4 个工具；高风险工具 execute 默认停用', { tone: 'ok' }); } }); };
  A.mcpMenu = (id, b) => { const r = b.getBoundingClientRect(), m = C.mcp.find(x => x.id === id); HX.menu(r.left - 150, r.bottom + 4, [{ label: '编辑', icon: I.gear, act: () => mcpSheet(m) }, { label: '查看日志', icon: I.term, act: () => HX.toast(m.name + ' 的日志', 'stderr 最近 200 行（demo 只示意）') }, { sep: 1 }, { label: '删除', icon: I.trash, danger: 1, act: () => { C.mcp = C.mcp.filter(x => x !== m); render(true); HX.toast('已删除 ' + m.name); } }]); };
  function mcpSheet(m) {
    m = m || null;
    const body = '<div class="hx-tabsrow" style="margin-bottom:16px"><div class="hx-seg" id="mcpTab"><button class="is-on" data-v="form">填写表单</button><button data-v="json">粘贴 JSON</button></div></div>' +
      '<div id="mcpForm"><label class="hx-fd"><span>名称</span><input class="hx-input hx-mono" id="mcpName" value="' + esc(m ? m.name : '') + '" placeholder="例如 notion"></label>' +
      '<div class="hx-fd"><span>连接方式</span>' + '<div class="hx-seg" id="mcpTr"><button class="' + (!m || m.tr === 'stdio' ? 'is-on' : '') + '" data-v="stdio">stdio（本机命令）</button><button class="' + (m && m.tr === 'http' ? 'is-on' : '') + '" data-v="http">HTTP（远程地址）</button></div></div>' +
      '<label class="hx-fd"><span>命令或地址</span><input class="hx-input hx-mono" id="mcpCmd" value="' + esc(m ? m.cmd : '') + '" placeholder="npx -y @modelcontextprotocol/server-xxx 或 https://…"></label>' +
      '<label class="hx-fd"><span>环境变量</span><textarea class="hx-input" id="mcpEnv" placeholder="NOTION_TOKEN=${secret:NOTION_TOKEN}"></textarea><small>一行一个。密钥用 ${secret:名称} 引用，不要直接粘贴。</small></label></div>' +
      '<div id="mcpJson" hidden><label class="hx-fd"><span>mcpServers JSON</span><textarea class="hx-input" id="mcpJ" style="min-height:220px" placeholder=\'{\n  "mcpServers": {\n    "notion": {\n      "command": "npx",\n      "args": ["-y", "@notionhq/notion-mcp-server"],\n      "env": { "NOTION_TOKEN": "${secret:NOTION_TOKEN}" }\n    }\n  }\n}\'></textarea><small>与 Claude Desktop、Cursor 的配置格式相同，可以一次导入多个。</small></label></div>' +
      note('保存后服务处于"等你确认"状态，确认命令后才会启动；它提供的工具默认停用。', 'is-warn');
    openSheet(m ? '编辑 MCP 服务' : '添加 MCP 服务', body, null, () => {
      const json = !$('mcpJson').hidden;
      let list = [];
      if (json) { try { const o = JSON.parse($('mcpJ').value || '{}'); const s = o.mcpServers || o; list = Object.keys(s).map(k => ({ name: k, tr: s[k].url ? 'http' : 'stdio', cmd: s[k].url || [s[k].command].concat(s[k].args || []).join(' ') })); } catch (e) { HX.toast('JSON 格式不对', e.message, { tone: 'danger' }); return; } }
      else { const name = ($('mcpName').value || '').trim(), cmd = ($('mcpCmd').value || '').trim(); if (!name || !cmd) { HX.toast('请填写名称和命令', '', { tone: 'danger' }); return; } list = [{ name: name, tr: $('mcpTr').querySelector('.is-on').dataset.v, cmd: cmd }]; }
      if (m) { Object.assign(m, list[0] || {}, { state: 'pending', tools: [], on: false }); } else list.forEach(x => C.mcp.push(Object.assign({ id: x.name + Date.now().toString(36), state: 'pending', tools: [], on: false }, x)));
      closeSheet(); render(true); HX.toast(list.length > 1 ? '已添加 ' + list.length + ' 个 MCP 服务' : '已添加，等你确认', '确认命令后才会启动', { tone: 'model' });
    });
  }
  A.addMcp = () => mcpSheet(null);
  A.importSkill = () => { C.skills.push({ id: 'k' + Date.now().toString(36), name: '会议纪要整理', desc: '把录音转写整理成"结论 · 待办 · 分歧"三段式纪要', src: '本机 · skills/会议纪要整理/SKILL.md', on: true, files: 2 }); render(true); HX.toast('已导入技能「会议纪要整理」', '读取了 SKILL.md 和 1 个附带文件', { tone: 'ok' }); };
  function skillSheet(k) {
    openSheet(k ? '编辑技能' : '新建技能', '<label class="hx-fd"><span>名称</span><input class="hx-input" id="skN" value="' + esc(k ? k.name : '') + '"></label><label class="hx-fd"><span>什么时候用（描述）</span><input class="hx-input" id="skD" value="' + esc(k ? k.desc : '') + '" placeholder="Agent 根据这句话判断要不要加载这个技能"><small>写清楚适用场景，模型靠它决定是否加载全文。</small></label><label class="hx-fd"><span>SKILL.md 正文</span><textarea class="hx-input" style="min-height:260px" id="skB">' + esc(k ? '# ' + k.name + '\n\n## 步骤\n1. …\n2. …\n\n## 输出格式\n…' : '# 技能名称\n\n## 什么时候用\n…\n\n## 步骤\n1. …') + '</textarea></label>', null, () => {
      const n = ($('skN').value || '').trim(); if (!n) return;
      if (k) { k.name = n; k.desc = $('skD').value; } else C.skills.push({ id: 'k' + Date.now().toString(36), name: n, desc: $('skD').value || '—', src: '本机 · skills/' + n + '/SKILL.md', on: true, files: 1 });
      closeSheet(); render(true); HX.toast('已保存技能「' + n + '」', '', { tone: 'ok' });
    });
  }
  A.newSkill = () => skillSheet(null);
  A.editSkill = id => skillSheet(C.skills.find(x => x.id === id));
  A.installExt = () => HX.dialog({ title: '安装扩展包「Notion 连接器 v1.0.2」？', text: '这个扩展包<b>已签名</b>，它需要：<br>· 网络：api.notion.com（会加入出站白名单）<br>· 密钥：NOTION_TOKEN<br>· 新增 3 个节点、2 个工具（L1、L2）', ok: '安装并启用', onOk: () => { C.exts.push({ id: 'notion', name: 'Notion 连接器', ver: '1.0.2', sign: 'ok', desc: '读取、写入 Notion 页面和数据库', perms: ['网络：api.notion.com', '密钥：NOTION_TOKEN'], hosts: ['api.notion.com'], on: true, nodes: 3 }); if (!C.hosts.includes('api.notion.com')) C.hosts.push('api.notion.com'); render(true); HX.toast('已安装 Notion 连接器', '节点库「扩展包」里可以找到新节点', { tone: 'ok' }); } });
  A.rmExt = id => { const x = C.exts.find(e => e.id === id); HX.dialog({ title: '卸载「' + x.name + '」？', text: '它带来的 ' + x.nodes + ' 个节点类型会从节点库移除。已经用在图里的节点会显示"缺少扩展包"，运行前需要处理。', ok: '卸载', danger: 1, onOk: () => { C.exts = C.exts.filter(e => e !== x); render(true); } }); };
  A.estop = () => { close(); HX.run.estop(); };
  A.addSecret = () => openSheet('添加密钥', '<label class="hx-fd"><span>名称</span><input class="hx-input hx-mono" id="seN" placeholder="例如 NOTION_TOKEN"><small>大写字母、数字和下划线。</small></label><label class="hx-fd"><span>值</span><div class="hx-pw"><input class="hx-input" id="seV" type="password" autocomplete="off"></div><small>保存后不能再查看明文，只能替换。</small></label>', null, () => {
    const n = ($('seN').value || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'), v = $('seV').value || ''; if (!n || !v) return;
    C.secrets.push({ name: n, tail: v.slice(-4), by: '—（尚未使用）', at: '11-22' }); closeSheet(); render(true); HX.toast('已保存密钥 ' + n, '用 ${secret:' + n + '} 引用', { tone: 'ok' });
  });
  A.replaceSecret = n => openSheet('替换 ' + esc(n), '<label class="hx-fd"><span>新的值</span><div class="hx-pw"><input class="hx-input" id="seV" type="password" autocomplete="off"></div></label>', null, () => { const v = $('seV').value; if (!v) return; const s = C.secrets.find(x => x.name === n); s.tail = v.slice(-4); s.at = '11-22'; closeSheet(); render(true); HX.toast('已替换 ' + n, '', { tone: 'ok' }); });
  A.rmSecret = n => { const s = C.secrets.find(x => x.name === n); HX.dialog({ title: '删除密钥 ' + n + '？', text: s.by.startsWith('—') ? '没有地方在用它。' : '<b>' + esc(s.by) + '</b> 正在使用它，删除后相关调用会失败。', ok: '删除', danger: 1, onOk: () => { C.secrets = C.secrets.filter(x => x !== s); render(true); } }); };
  A.openDir = () => HX.toast('已在资源管理器中打开', C.data.dir);
  A.copy = v => { try { navigator.clipboard.writeText(v); } catch (e) { /* 忽略 */ } HX.toast('已复制', v); };
  A.export = () => HX.toast('正在导出', '完成后保存为 harness-export-20261122.hxz（不含密钥）');
  A.gc = () => HX.toast('清理完成', '回收 214 MB 工作区原文、3 个过期日志文件', { tone: 'ok' });
  A.purge = () => HX.dialog({ title: '彻底删除所有数据？', text: '所有图、会话、运行记录、工作区原文和密钥都会被删除，<b>无法恢复</b>。输入"删除"确认。', input: '删除', must: '删除', ok: '删除所有数据', danger: 1, onOk: () => HX.toast('demo 里不会真的删除', '真实产品：删除完成后 Harness 退出', { tone: 'danger' }) });
  A.tok = () => { showTok = !showTok; render(true); };
  A.rotate = () => HX.dialog({ title: '重新生成访问令牌？', text: '所有已打开的 Harness 页面需要用新地址重新打开，harnessctl 会自动读取新令牌。', ok: '重新生成', onOk: () => { C.access.token = 'hx_live_' + Math.random().toString(16).slice(2, 6) + '••••••••••••••' + Math.random().toString(16).slice(2, 6); render(true); HX.toast('已重新生成令牌', '旧的登录已全部失效', { tone: 'ok' }); } });
  A.openapi = () => HX.toast('接口文档', 'http://127.0.0.1:7300/api/v1/openapi.json');
  A.update = () => HX.toast('已是最新版本', 'v0.5.0-demo');
  A.diag = () => HX.toast('诊断包已生成', 'harness-diag-20261122.zip · 日志已脱敏，不含密钥', { tone: 'ok' });
  A.doctor = () => openSheet('环境检查', ['数据目录可读写', '数据库完整性（PRAGMA integrity_check）', '迁移版本 7 / 7', '密钥库：Windows 凭据管理器', '端口 7300', 'MCP：filesystem、github 正常', 'MCP：slack 缺少 SLACK_BOT_TOKEN'].map((t, i) => note(esc(t), i === 6 ? 'is-warn' : 'is-ok', i === 6 ? 'info' : 'check')).join('<div style="height:8px"></div>'), '<span class="sp"></span>' + btn('关闭', 'closeSheet', null, 'is-ghost'));
  A.logs = () => openSheet('日志 · harnessd-20261122.log', '<div class="hx-code" style="margin:0;white-space:pre-wrap">21:40:02.118 INFO  run.start run=01JD…4K graph=竞品定价调研 level=2\n21:40:02.164 INFO  llm.call provider=deepseek model=deepseek-v4-pro in=3204 out=0\n21:40:05.902 INFO  tool.call tool=检索 risk=L0 decision=allow\n21:41:12.440 WARN  mcp.connect name=slack err="缺少环境变量 SLACK_BOT_TOKEN"\n21:43:51.007 INFO  approval.created node=发布审批 kind=human\n21:44:14.260 INFO  run.status run=01JD…4K status=done cost=¥3.18</div>', '<span class="sp"></span>' + btn('复制', 'copy', 'log', 'is-ghost') + btn('关闭', 'closeSheet', null, 'is-ghost'));
  A.licenses = () => openSheet('开源许可', '<table class="hx-tbl"><tbody>' + [['Go 标准库', 'BSD-3-Clause'], ['modernc.org/sqlite', 'BSD-3-Clause'], ['官方 MCP go-sdk', 'MIT'], ['wazero', 'Apache-2.0'], ['React', 'MIT'], ['Vite', 'MIT'], ['Geist 字体', 'OFL-1.1'], ['Noto Sans SC', 'OFL-1.1']].map(x => '<tr><td>' + x[0] + '</td><td class="hx-mono">' + x[1] + '</td></tr>').join('') + '</tbody></table>', '<span class="sp"></span>' + btn('关闭', 'closeSheet', null, 'is-ghost'));
  A.docs = () => HX.toast('用户文档', '本机离线文档：快速开始、节点手册、授权与安全（D 分支）');
  A.onboard = () => { close(); if (HX.onboard) HX.onboard(); };
  A.role = i => { const r = ROLES[+i]; openSheet('角色卡 · ' + esc(r[0]) + ' @1', '<label class="hx-fd"><span>继承</span><input class="hx-input hx-mono" value="' + esc(r[1]) + '"></label><label class="hx-fd"><span>系统提示</span><textarea class="hx-input" style="min-height:220px">' + esc(r[4]) + '</textarea><small>{{变量}} 在运行时由上下文装配填入。</small></label><div class="hx-fd"><span>偏好</span>' + row('模型', '', sel('_', usableModels(), C.roles.agent, 220)) + row('温度', '', num('_', 0.3)) + '</div>' + note('保存会生成 @2；正在使用 @1 的 ' + r[3] + ' 个节点不受影响，可以在节点上切换到新版本。', 'is-model'), '<span class="sp"></span>' + btn('取消', 'closeSheet', null, 'is-ghost') + btn('保存为 @2', 'saveSheet', null, 'is-primary'), () => { closeSheet(); HX.toast('已保存「' + r[0] + '」@2', '', { tone: 'ok' }); }); };
  A.newRole = () => A.role(5);
  A.recipe = i => { const r = RECIPES[+i]; openSheet('配方 · ' + esc(r[0]), '<table class="hx-tbl"><thead><tr><th>段</th><th class="num">占比</th><th>溢出时</th></tr></thead><tbody>' + r[1].split(' · ').map(x => { const m = x.split(' '); return '<tr><td>' + esc(m[0]) + '</td><td class="num">' + esc(m[1]) + '</td><td>指针（保留原文引用）</td></tr>'; }).join('') + '</tbody></table>' + '<div style="height:12px"></div>' + note('配方的总预算 = 预算系数 × 模型上下文窗口；当前 ' + r[2] + '。', ''), null, () => { closeSheet(); HX.toast('已保存配方新版本', '', { tone: 'ok' }); }); };
  A.newType = () => openSheet('定义新的数据类型', '<label class="hx-fd"><span>名称</span><input class="hx-input hx-mono" placeholder="例如 报价单@1"></label><label class="hx-fd"><span>字段（JSON Schema）</span><textarea class="hx-input" style="min-height:200px">{\n  "type": "object",\n  "required": ["公司", "价格"],\n  "properties": {\n    "公司": { "type": "string" },\n    "价格": { "type": "number" },\n    "币种": { "enum": ["CNY", "USD"] }\n  }\n}</textarea></label>', null, () => { closeSheet(); HX.toast('已定义类型', '连线时会按它检查', { tone: 'ok' }); });
  A.insertSub = i => { const s = subItems()[+i]; close(); const w = HX.toWorld(HX.vpBox.left + HX.vw / 2, HX.vpBox.top + HX.vh / 2); const n = HX.addNodeAt('子图引用', w[0] - 118, w[1] - 60); if (n) { n.label = s.name; n.params.ref = s.name + '@' + s.ver; HX.touch(n); HX.sync(); } HX.toast('已插入子图「' + s.name + '」', '锁定版本 ' + s.ver + '，双击可以进入查看', { tone: 'ok' }); };
  A.useTpl = k => { close(); HX.sessions.create(); HX.sessions.fromTemplate(k); };

  /* ---------------- 事件 ---------------- */
  root.addEventListener('click', e => {
    if (e.target === root) { close(); return; }
    const t = e.target;
    const nav = t.closest('[data-nav]'); if (nav && !t.closest('.hx-sheet')) { e.preventDefault(); go(nav.dataset.nav, nav.dataset.hit); if (nav.dataset.hit != null) $('ctrSearch').value = ''; renderNav(); return; }
    const md = t.closest('[data-mode]'); if (md) { $('ctrSearch').value = ''; go(md.dataset.mode); return; }
    if (t.closest('#ctrClose')) { close(); return; }
    const tb = t.closest('#mcpTab button,#mcpTr button'); if (tb) { tb.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === tb)); if (tb.closest('#mcpTab')) { $('mcpForm').hidden = tb.dataset.v !== 'form'; $('mcpJson').hidden = tb.dataset.v !== 'json'; } return; }
    const s = t.closest('[data-sw]'); if (s && !s.disabled) {
      const path = s.dataset.sw, on = !s.classList.contains('is-on');
      s.classList.toggle('is-on', on); s.setAttribute('aria-checked', on);
      if (path.startsWith('mcpTool.')) { const [, id, i] = path.split('.'); const m = C.mcp.find(x => x.id === id); if (m && m.tools[+i]) m.tools[+i][2] = on; saved(); C.changed('mcp'); }
      else setP(path, on);
      if (/\.on$/.test(path)) { const tr = s.closest('tr'); if (tr) tr.classList.toggle('is-off', !on); }
      renderNav(); return;
    }
    const sb = t.closest('[data-seg] button'); if (sb && !sb.disabled) {
      const g = sb.parentNode; g.querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === sb));
      if (g.dataset.seg === 'skillScope') { C.skillScope = sb.dataset.v; saved(); return; }
      if (g.dataset.seg === 'look.mode') { onSet('look.mode', sb.dataset.v); saved(); return; }
      if (g.dataset.seg === 'secretBackend') { C.secretBackend = sb.dataset.v; saved(); render(true); return; }
      if (g.dataset.seg === 'effort') { C.effort = sb.dataset.v; saved(); C.changed('models'); return; }
      setP(g.dataset.seg, sb.dataset.v); return;
    }
    const a = t.closest('[data-act]'); if (a && A[a.dataset.act]) { e.preventDefault(); A[a.dataset.act](a.dataset.arg, a); }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sel && t.dataset.sel !== '_') { const v = /^-?\d+(\.\d+)?$/.test(t.value) ? +t.value : t.value; setP(t.dataset.sel, v); renderNav(); }
    if (t.dataset.num && t.dataset.num !== '_') {
      const v = +t.value; if (isNaN(v)) return;
      if (t.dataset.num.startsWith('poolPer.')) { const [, i, j] = t.dataset.num.split('.'); C.pools.per[+i][+j] = v; saved(); }
      else setP(t.dataset.num, v);
      if (t.dataset.num.startsWith('budget.')) render(true);
    }
  });
  $('ctrSearch').addEventListener('input', renderNav);
  root.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { if (!dlg.hidden) return; if (!$('ctrSheet').hidden) closeSheet(); else if ($('ctrSearch').value) { $('ctrSearch').value = ''; renderNav(); } else close(); }
    if (e.key === 'Enter' && e.target.id === 'hostIn') A.addHost();
  });
  root.addEventListener('keyup', e => e.stopPropagation());

  function open(id) {
    const want = id || 'settings';
    root.hidden = false; idx = null; $('ctrSearch').value = '';
    go(P[want] || MODES[want] || ALIAS[want] ? want : 'settings');
    setTimeout(() => $('ctrSearch').focus({ preventScroll: true }), 40);
  }
  function close() { root.hidden = true; closeSheet(); const vp = $('vp'); if (vp && vp.focus) vp.focus({ preventScroll: true }); }
  HX.center = { open: open, close: close, go: go, pages: P, isOpen: () => !root.hidden, cur: () => page, mode: () => mode, modes: MODES, alias: ALIAS, act: A,
    ui: { row: row, card: card, sw: sw, seg: seg, sel: sel, num: num, btn: btn, pill: pill, note: note, caps: caps, money: money, esc: esc },
    sheet: { open: openSheet, close: closeSheet }, render: r => { idx = null; if (!root.hidden) render(r !== false); }, invalidate: () => { idx = null; }, providerSheet: providerSheet };

  /* 入口：左栏齿轮 / 账户按钮 → 设置；Ctrl+, ；? → 快捷键 */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); e.stopPropagation(); root.hidden ? open() : close(); return; }
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === '?' && !/INPUT|TEXTAREA|SELECT/.test(tag) && root.hidden) { e.preventDefault(); e.stopPropagation(); open('keys'); }
  }, true);

  /* 命令面板里的「设置 › …」「资源库 › …」 */
  HX.extraCommands = function () {
    const c = [];
    Object.keys(P).forEach(id => { if (P[id].hidden) return; const m = modeOf(id); c.push({ g: MODES[m].name, label: MODES[m].name + ' › ' + P[id].name, desc: (P[id].desc || '').slice(0, 30), icon: I[P[id].icon] || I.gear, kbd: id === 'general' ? 'Ctrl+,' : '', act: () => open(id) }); });
    return c;
  };
})(window.HX);
