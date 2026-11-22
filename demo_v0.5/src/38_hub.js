/* ===== 38_hub.js · 包管理 + 连接 + 设置瘦身 =====
   一切能力都由"包"贡献：内置核心、MCP 服务（连上后自动成为一个包，它的每个工具变成节点库里的一个节点）、扩展包、技能。
   包可以带来：节点、工具、连接类型、数据类型、设置项、模板。
   连接 = 很多节点共用的账号、地址、密钥（模型提供方、GitHub、飞书、数据库、邮箱、搜索服务……），按"连接类型"自动生成表单。
   设置只保留全局项；包自己的设置自动出现在「设置 › 包的设置」和包详情里。
   规范：X.02 包清单、C.14 连接类型、U.21 设置中心、U.23 包管理。 */
(function (HX) {
  'use strict';
  const $ = HX.$, C = HX.cfg, CT = HX.center, U = CT.ui, A = CT.act, P = CT.pages, esc = U.esc;
  const I = Object.assign({}, HX.UI, HX.UI2);
  const { row, card, sw, seg, sel, num, btn, pill, note, caps } = U;

  /* ---------------- 数据：连接类型、连接、包的设置 ---------------- */
  const F = (k, label, t, more) => Object.assign({ k: k, label: label, t: t || 'text' }, more || {});
  C.ctypes = [
    { id: 'github', group: '代码托管', name: 'GitHub', by: 'MCP · github', desc: '个人访问令牌（PAT），用于读写仓库、Issue、PR', fields: [F('token', '访问令牌', 'secret', { ph: 'ghp_…', help: 'GitHub › Settings › Developer settings › Personal access tokens' })] },
    { id: 'slack', group: '办公协作', name: 'Slack', by: 'MCP · slack', desc: 'Bot Token + 工作区 ID', fields: [F('bot_token', 'Bot Token', 'secret', { ph: 'xoxb-…' }), F('team', '工作区 ID', 'text', { ph: 'T0123…' })] },
    { id: 'feishu', group: '办公协作', name: '飞书应用', by: '扩展包 · 飞书连接器', desc: '自建应用的 App ID 和 App Secret', fields: [F('app_id', 'App ID'), F('app_secret', 'App Secret', 'secret')] },
    { id: 'postgres', group: '数据库', name: 'PostgreSQL', by: 'MCP · postgres', desc: '连接串；建议用只读账号', fields: [F('dsn', '连接串', 'secret', { ph: 'postgresql://user:pass@host:5432/db' })] },
    { id: 'smtp', group: '邮件', name: 'SMTP 邮箱', by: 'Harness 核心 · 发送邮件', desc: '发件服务器', fields: [F('host', '服务器', 'text', { ph: 'smtp.example.com' }), F('port', '端口', 'num', { def: 465 }), F('user', '账号'), F('password', '密码 / 授权码', 'secret')] },
    { id: 'tavily', group: '搜索', name: 'Tavily 搜索', by: 'Harness 核心 · 检索', desc: '检索工具使用的网页搜索服务', fields: [F('api_key', 'API Key', 'secret', { ph: 'tvly-…' })] }
  ];
  C.conns = [
    { id: 'gh', type: 'github', name: 'GitHub（个人）', state: 'ok', values: { token: 'ghp_••••••••Qm2x' }, at: '11-02' },
    { id: 'tv', type: 'tavily', name: 'Tavily 搜索', state: 'ok', values: { api_key: 'tvly-••••••90be' }, at: '11-12' },
    { id: 'sl', type: 'slack', name: 'Slack 工作区', state: 'bad', err: 'Bot Token 未填写', values: { team: 'T04ACME' }, at: '11-02' }
  ];
  C.connNames = () => C.conns.map(c => c.name);
  C.pkgset = { core: { search: 'tavily', results: 8, sandbox: 'wazero', timeout: 10 }, 'ext:sheets': { enc: 'utf-8', maxRows: 50000 }, 'mcp:github': { readonly: false } };
  const PKSET = {
    core: [['search', '检索 · 搜索服务', 'sel', [['tavily', 'Tavily'], ['bing', 'Bing'], ['searxng', 'SearXNG（自建）']], '用哪家搜索服务；需要对应的连接'], ['results', '检索 · 每次返回条数', 'num', null, ''], ['sandbox', '代码执行 · 沙箱后端', 'seg', [['wazero', 'wazero'], ['docker', 'Docker']], 'wazero 无需安装；Docker 隔离更强'], ['timeout', '代码执行 · 时限（秒）', 'num', null, '']],
    'ext:sheets': [['enc', '默认文件编码', 'sel', [['utf-8', 'UTF-8'], ['gbk', 'GBK']], '读取 CSV 时使用'], ['maxRows', '单表最多读取行数', 'num', null, '超出部分截断并提示']],
    'mcp:github': [['readonly', '只读模式', 'sw', null, '打开后创建 Issue、PR、合并这类写操作全部禁用']]
  };
  const llmConns = () => C.providers.filter(p => p.state === 'ok' || p.state === 'off');
  const ctype = id => id && id.startsWith('llm.') ? (p => p && { id: id, group: '模型', name: p.name, by: 'Harness 核心', desc: p.desc, llm: p })(C.provider(id.slice(4))) : C.ctypes.find(t => t.id === id);

  /* ---------------- 包 ---------------- */
  function pkgs() {
    const E = HX.libEntries ? HX.libEntries() : [], nodesOf = f => E.filter(f);
    const L = [];
    L.push({ id: 'core', kind: '内置', icon: 'layers', name: 'Harness 核心', ver: '0.5.0', on: true, locked: true, sign: 'ok', src: '随程序内置', desc: '13 种积木、内置工具、模型提供方、基础数据类型和模板',
      nodes: nodesOf(e => e.src === '内置' || e.src === '子图库'), tools: C.tools.map(t => [t.name, t.risk, t.on, 'tools#' + t.id + '.on']), ctypes: ['模型提供方 ×' + C.providers.length, 'SMTP 邮箱', 'Tavily 搜索'], needs: [], perms: ['读取允许的目录', '写入运行工作区', '访问出站白名单里的主机'], extra: '数据类型 9 个 · 模板 5 个 · 角色卡 7 张' });
    C.mcp.forEach(m => L.push({ id: 'mcp:' + m.id, kind: 'MCP', icon: 'plug', name: m.name, ver: m.tr, on: m.on, mcp: m, src: m.cmd, sign: 'none', desc: m.state === 'ok' ? '通过 MCP 提供 ' + m.tools.length + ' 个工具' : m.state === 'pending' ? '新添加的服务，等你确认命令后启动' : '连接失败：' + (m.err || ''),
      nodes: nodesOf(e => e.pkg === 'mcp:' + m.id && !e.ph), tools: m.tools.map((t, i) => [t[0], t[1], t[2] !== false, 'mcpTool.' + m.id + '.' + i]), ctypes: [], needs: ({ github: ['github'], slack: ['slack'], postgres: ['postgres'] })[m.id] || [], perms: [m.tr === 'stdio' ? '以你的账户权限在本机运行命令' : '访问 ' + m.cmd.replace(/^https?:\/\//, '').split('/')[0]] }));
    C.exts.forEach(x => L.push({ id: 'ext:' + x.id, kind: '扩展包', icon: 'box', name: x.name, ver: 'v' + x.ver, on: x.on, ext: x, sign: x.sign, src: '从文件安装', desc: x.desc, nodes: nodesOf(e => e.pkg === 'ext:' + x.id), tools: [], ctypes: x.id === 'feishu' ? ['飞书应用'] : [], needs: x.id === 'feishu' ? ['feishu'] : [], perms: x.perms }));
    C.skills.forEach(k => L.push({ id: 'skill:' + k.id, kind: '技能', icon: 'spark', name: k.name, ver: k.files + ' 个文件', on: k.on, skill: k, sign: 'none', src: k.src, desc: k.desc, nodes: [], tools: [], ctypes: [], needs: [], perms: ['只在 Agent 需要时加载正文'] }));
    return L;
  }
  const pstate = pk => pk.mcp ? (pk.mcp.state === 'ok' ? (pk.on ? ['已连接', 'is-ok'] : ['已停用', '']) : pk.mcp.state === 'pending' ? ['待确认', 'is-warn'] : ['出错', 'is-bad']) : pk.on ? ['启用', 'is-ok'] : ['未启用', ''];
  function pkgPage(pk) {
    return { mode: 'pkgs', icon: pk.icon, name: pk.name, badge: () => { const s = pstate(pk); return s[1] === 'is-ok' ? null : s; }, desc: pk.desc,
      acts: () => (pk.locked ? pill('内置 · 不能停用', '') : '<span class="hx-sr__d" style="margin:0 6px 0 0">' + (pk.on ? '已启用' : '未启用') + '</span>' + sw(pk.mcp ? 'mcp#' + pk.mcp.id + '.on' : pk.ext ? 'exts#' + pk.ext.id + '.on' : 'skills#' + pk.skill.id + '.on', pk.on)) +
        (pk.locked ? '' : '<button class="hx-iconbtn is-sm" data-act="pkgMenu" data-arg="' + esc(pk.id) + '">' + I.dots + '</button>'),
      render: () => renderPkg(pk) };
  }
  function renderPkg(pk) {
    const s = pstate(pk);
    let h = card('', row('类型', '', pill(pk.kind, pk.kind === 'MCP' ? 'is-model' : '') + pill(pk.ver, 'is-mono')) + row('状态', '', pill(s[0], s[1], 1)) +
      row('来源', '<span class="hx-mono">' + esc(pk.src) + '</span>', pk.sign === 'ok' ? pill('已签名', 'is-ok') : pk.kind === '扩展包' ? pill('未签名', 'is-warn') : ''));
    if (pk.mcp && pk.mcp.state === 'pending') h += note('这个服务会以<b>你的账户权限</b>在本机运行下面的命令。确认来源可信后再启用；启用后它的工具默认关闭，需要逐个打开。<div style="margin-top:8px">' + btn('查看命令并确认', 'confirmMcp', pk.mcp.id, 'is-model') + '</div>', 'is-warn');
    if (pk.mcp && pk.mcp.state === 'bad') h += note(esc(pk.mcp.err || '连接失败') + '。<a data-act="newConnFor" data-arg="' + esc(pk.needs[0] || '') + '">去配置连接</a> 后 <a data-act="reMcp" data-arg="' + pk.mcp.id + '">重新连接</a>。', 'is-bad');
    const cnt = [['节点', pk.nodes.length], ['工具', pk.tools.length], ['连接类型', pk.ctypes.length], ['设置', (PKSET[pk.id] || []).length]].filter(x => x[1]);
    if (pk.nodes.length || pk.tools.length) {
      const rows = pk.tools.length ? pk.tools.map(t => { const ent = pk.nodes.find(e => e.name === t[0] || e.params.tool === t[0] || (e.params.tool || '').endsWith('.' + t[0])); return '<tr class="' + (t[2] ? '' : 'is-off') + '"><td><b>' + esc(t[0]) + '</b>' + (ent ? '<span class="t-sub">节点库 › ' + esc(ent.path.join(' › ')) + '</span>' : '') + '</td><td>' + pill(t[1], t[1] === 'L3' ? 'is-bad' : t[1] === 'L2' ? 'is-warn' : '') + '</td><td>' + (pk.locked || pk.mcp ? sw(t[3], t[2]) : '') + '</td></tr>'; }).join('')
        : pk.nodes.map(e => '<tr class="' + (e.off ? 'is-off' : '') + '"><td><b>' + esc(e.name) + '</b><span class="t-sub">节点库 › ' + esc(e.path.join(' › ')) + '</span></td><td>' + esc(e.type) + '</td><td>' + (e.params.risk ? pill(e.params.risk, e.params.risk === 'L2' ? 'is-warn' : '') : '') + '</td></tr>').join('');
      h += card('带来的内容 <small>' + cnt.map(x => x[0] + ' ' + x[1]).join(' · ') + '</small>', '<table class="hx-tbl"><thead><tr><th>' + (pk.tools.length ? '工具' : '节点') + '</th><th>' + (pk.tools.length ? '风险' : '基于积木') + '</th><th>' + (pk.tools.length ? '启用' : '风险') + '</th></tr></thead><tbody>' + rows + '</tbody></table>',
        { x: btn('在节点库中显示', 'showInLib', pk.name, 'is-ghost', 'search'), p: pk.locked ? '内核只有 13 种积木；节点库里的 ' + pk.nodes.length + ' 个节点都是它们的预设（' + esc(pk.extra) + '）。' : pk.tools.length ? '每个工具在节点库里是一个「工具」积木的预设，参数从工具说明自动生成。新出现的工具默认关闭。' : '' });
    }
    if (pk.ctypes.length) h += card('带来的连接类型', row(pk.ctypes.map(esc).join('、'), '在「连接」里新建这些类型的连接', btn('去连接', 'nav', 'conn:all', 'is-ghost')));
    if (pk.needs.length) h += card('需要的连接', pk.needs.map(t => { const ty = ctype(t), cs = C.conns.filter(c => c.type === t); return row(esc(ty ? ty.name : t), cs.length ? cs.map(c => esc(c.name) + (c.state === 'ok' ? '' : '（' + esc(c.err || '异常') + '）')).join('、') : '还没有这个类型的连接', cs.length ? cs.map(c => pill(c.state === 'ok' ? '正常' : '异常', c.state === 'ok' ? 'is-ok' : 'is-bad', 1) + btn('打开', 'nav', 'conn:' + c.id, 'is-ghost')).join('') : btn('新建连接', 'newConnFor', t, 'is-primary', 'plus')); }).join(''));
    if (PKSET[pk.id]) h += pkgSettingsCard(pk.id, '这个包的设置');
    if (pk.skill) h += card('SKILL.md', '<pre class="hx-prompt" style="margin:0 var(--hx-s-6) var(--hx-s-5)"># ' + esc(pk.name) + '\n\n## 什么时候用\n' + esc(pk.desc) + '\n\n## 步骤\n1. …\n2. …</pre>', { x: btn('编辑', 'editSkill', pk.skill.id, 'is-ghost') });
    h += card('权限', pk.perms.map(x => row(esc(x), '', '')).join(''));
    return h;
  }
  function pkgSettingsCard(id, title) {
    const v = C.pkgset[id];
    return card(title, PKSET[id].map(f => { const path = 'pkgset.' + id + '.' + f[0]; return row(f[1], f[4], f[2] === 'sel' ? sel(path, f[3], v[f[0]], 160) : f[2] === 'seg' ? seg(path, f[3], v[f[0]]) : f[2] === 'sw' ? sw(path, v[f[0]]) : num(path, v[f[0]])); }).join(''), { p: '这些设置项由包自己声明，界面自动生成（X.02 包清单 settings）。' });
  }

  /* ---------------- 连接 ---------------- */
  function connPage(c) {
    const ty = ctype(c.type);
    return { mode: 'conns', icon: c.llm ? 'cpu' : 'key', name: c.name, badge: () => c.state === 'ok' ? null : c.state === 'off' ? ['未运行', 'is-warn'] : ['异常', 'is-bad'], desc: (ty ? ty.desc : '') + (ty ? ' · 连接类型由「' + ty.by + '」提供' : ''),
      acts: () => btn('编辑', c.llm ? 'provider' : 'editConn', c.llm ? c.llm.id : c.id, '', 'gear') + btn('测试', c.llm ? 'provider' : 'testConn', c.llm ? c.llm.id : c.id, 'is-ghost', 'bolt'),
      render: () => {
        if (c.llm) {
          const p = c.llm;
          return card('', row('状态', '', p.state === 'ok' ? pill('已连接 · ' + p.latency + ' ms', 'is-ok', 1) : pill('未运行', 'is-warn', 1)) + (p.key ? row('API Key', '存于系统密钥库 · ' + p.id.toUpperCase() + '_API_KEY', '<span class="hx-mono">' + esc(p.key) + '</span>') : '') +
              row('接口地址', '<span class="hx-mono">' + esc(p.base) + '</span>', '')) +
            card('模型 <small>' + p.models.length + ' 个</small>', '<table class="hx-tbl"><thead><tr><th>模型</th><th class="num">上下文</th><th>能力</th><th class="num">¥ / 百万 tokens</th><th>启用</th></tr></thead><tbody>' +
              p.models.map(m => '<tr class="' + (m.on ? '' : 'is-off') + '"><td><b>' + esc(m.name) + '</b><span class="t-sub hx-mono">' + esc(m.id) + '</span></td><td class="num">' + esc(m.win) + '</td><td>' + caps(m.caps) + '</td><td class="num">' + (m.pin ? m.pin + ' / ' + m.pout : '免费') + '</td><td>' + sw('providers#' + p.id + '.models#' + m.id + '.on', m.on) + '</td></tr>').join('') + '</tbody></table>',
              { p: '启用的模型会出现在节点库「模型 › ' + esc(p.name) + '」和输入框的模型菜单里。<b>demo 里的模型名和价格是示例数据。</b>' }) +
            card('谁在用', row('编排者默认模型', '', C.model(C.roles.orch) && C.model(C.roles.orch).provider === p ? pill('是', 'is-model') : pill('否', '')) + row('模型节点', '画布上引用这个连接里模型的节点', usedCount(m => p.models.some(x => x.id === m)) + ' 个')) +
            card('', row('<span style="color:var(--hx-danger)">断开连接</span>', '删除 API Key；用到它的节点在下次运行时报"没有可用模型"', btn('断开…', 'rmProvider', p.id, 'is-danger')));
        }
        return card('', row('状态', c.err ? esc(c.err) : '', c.state === 'ok' ? pill('正常', 'is-ok', 1) : pill('异常', 'is-bad', 1)) + (ty ? ty.fields.map(f => row(esc(f.label), f.t === 'secret' ? '存于系统密钥库' : '', '<span class="hx-mono">' + esc(c.values[f.k] || '—') + '</span>')).join('') : '') + row('最后修改', '', '<span class="hx-mono">' + esc(c.at || '') + '</span>')) +
          card('谁在用', usedBy(c).map(u => row(esc(u), '', '')).join('') || row('还没有节点在用', '', '')) +
          card('', row('<span style="color:var(--hx-danger)">删除连接</span>', '用到它的节点会显示"缺少连接"', btn('删除…', 'rmConn', c.id, 'is-danger')));
      } };
  }
  function usedCount(f) { let n = 0; if (HX.S.root) HX.walk(HX.S.root, x => { if (x.type === '资源' && x.params.kind === '模型' && f(x.params.value)) n++; }); return n; }
  function usedBy(c) {
    const out = []; if (HX.S.root) HX.walk(HX.S.root, x => { if (x.params && x.params.conn === c.name) out.push('节点「' + x.label + '」（当前会话）'); });
    const pk = { github: 'MCP · github 的全部工具', slack: 'MCP · slack', tavily: '内置工具 · 检索', feishu: '扩展包 · 飞书连接器', smtp: '内置工具 · 发送邮件', postgres: 'MCP · postgres' }[c.type];
    if (pk) out.unshift(pk); return out;
  }
  P['conn:all'] = { mode: 'conns', icon: 'route', name: '全部连接', desc: '模型提供方、代码托管、办公协作、数据库、邮件、搜索……所有账号和密钥都在这里。节点上选连接，不用每个节点各填一遍。',
    acts: () => btn('新建连接', 'newConn', null, 'is-primary', 'plus'),
    render: () => {
      const all = llmConns().map(p => ({ n: p.name, g: '模型', st: p.state === 'ok', id: 'llm.' + p.id, by: 'Harness 核心' })).concat(C.conns.map(c => { const t = ctype(c.type); return { n: c.name, g: t.group, st: c.state === 'ok', id: c.id, by: t.by, err: c.err }; }));
      const types = [['模型', C.providers.filter(p => p.state === 'none').map(p => ['llm.' + p.id, p.name, p.logo, p.desc])]].concat(groupsT().map(g => [g, C.ctypes.filter(t => t.group === g).map(t => [t.id, t.name, t.name[0], t.desc])]));
      return card('已有连接 <small>' + all.length + ' 个</small>', '<table class="hx-tbl"><thead><tr><th>名称</th><th>类别</th><th>类型由谁提供</th><th>状态</th><th></th></tr></thead><tbody>' + all.map(x => '<tr><td><b>' + esc(x.n) + '</b>' + (x.err ? '<span class="t-sub">' + esc(x.err) + '</span>' : '') + '</td><td>' + esc(x.g) + '</td><td>' + esc(x.by) + '</td><td>' + (x.st ? pill('正常', 'is-ok', 1) : pill('异常', 'is-bad', 1)) + '</td><td class="acts">' + btn('打开', 'nav', 'conn:' + x.id, 'is-ghost') + '</td></tr>').join('') + '</tbody></table>') +
        types.filter(t => t[1].length).map(t => '<div><div class="hx-tabsrow" style="margin:6px 0 10px"><b style="font-size:13px">新建 · ' + esc(t[0]) + '</b></div><div class="hx-pgrid">' + t[1].map(x => '<button class="hx-pcard" data-act="newConn" data-arg="' + esc(x[0]) + '"><div class="hx-pcard__top"><span class="hx-pcard__logo">' + esc(x[2]) + '</span><div><div class="hx-pcard__n">' + esc(x[1]) + '</div></div></div><div class="hx-pcard__d">' + esc(x[3]) + '</div></button>').join('') + '</div></div>').join('');
    } };
  const groupsT = () => [...new Set(C.ctypes.map(t => t.group))];

  /* ---------------- 动态注册页面与导航 ---------------- */
  function sync() {
    Object.keys(P).forEach(k => { if (/^(pkg|conn|pset):/.test(k) && k !== 'conn:all') delete P[k]; });
    pkgs().forEach(pk => { P['pkg:' + pk.id] = pkgPage(pk); if (PKSET[pk.id]) P['pset:' + pk.id] = { mode: 'settings', icon: pk.icon, name: pk.name, desc: '「' + pk.name + '」声明的设置项，和包详情里的是同一份。', render: () => pkgSettingsCard(pk.id, '') + card('', row('查看这个包', '它带来的节点、工具、需要的连接、权限', btn('打开包详情', 'nav', 'pkg:' + pk.id, 'is-ghost'))) }; });
    llmConns().forEach(p => { P['conn:llm.' + p.id] = connPage({ id: 'llm.' + p.id, type: 'llm.' + p.id, name: p.name, state: p.state, llm: p }); });
    C.conns.forEach(c => { P['conn:' + c.id] = connPage(c); });
  }
  CT.modes.pkgs.groups = () => { sync(); const L = pkgs(); return [['内置', L.filter(x => x.kind === '内置')], ['MCP 服务', L.filter(x => x.kind === 'MCP')], ['扩展包', L.filter(x => x.kind === '扩展包')], ['技能', L.filter(x => x.kind === '技能')]].map(g => [g[0], g[1].map(x => 'pkg:' + x.id)]); };
  CT.modes.pkgs.navFoot = () => '<div class="hx-ctr__grp">添加</div>' + [['addMcp', 'plug', '接入 MCP 服务'], ['installExt', 'upload', '安装扩展包（.zip）'], ['importSkill', 'spark', '导入技能']].map(x => '<button class="hx-ctr__it" data-act="' + x[0] + '">' + I[x[1]] + '<span>' + x[2] + '</span></button>').join('');
  CT.modes.conns.groups = () => { sync(); const g = [['', ['conn:all']], ['模型', llmConns().map(p => 'conn:llm.' + p.id)]]; groupsT().forEach(t => g.push([t, C.conns.filter(c => ctype(c.type).group === t).map(c => 'conn:' + c.id)])); return g; };
  CT.modes.conns.navFoot = () => '<div class="hx-ctr__grp">添加</div><button class="hx-ctr__it" data-act="newConn">' + I.plus + '<span>新建连接</span></button>';
  CT.modes.settings.groups = g => { sync(); return g.concat([['包的设置', Object.keys(PKSET).filter(id => P['pset:' + id]).map(id => 'pset:' + id)]]); };
  Object.assign(CT.alias, { models: () => 'conns', providers: () => 'conns', secrets: () => 'conns', tools: () => 'pkg:core', mcp: () => 'pkgs', skills: () => 'pkgs', exts: () => 'pkgs' });
  sync();

  /* ---------------- 设置：默认模型；安全页加"网络与文件""密钥存储" ---------------- */
  const um = () => C.allModels(true).map(m => [m.id, m.name + ' · ' + m.provider.name]);
  P.defaults = { name: '默认模型', icon: 'cpu', desc: '不同用途默认用哪个模型。模型本身在「连接 › 模型」里添加和启用。',
    acts: () => btn('管理模型连接', 'nav', 'conns', 'is-ghost', 'route'),
    render: () => { const r = C.roles; return card('', row('编排者（底部对话框里的 AI）', '每个会话可以在输入框里单独换', sel('roles.orch', um(), r.orch, 260)) + row('新建 Agent 节点', '拖进来的 Agent 先用这个；节点上的「模型」接口接了模型节点就以接入的为准', sel('roles.agent', um(), r.agent, 260)) +
      row('摘要与上下文压缩', '建议选便宜、快的模型', sel('roles.summary', um(), r.summary, 260)) + row('向量嵌入', '检索知识库时用', sel('roles.embed', [['none', '不使用']].concat(um()), r.embed, 260)) +
      row('默认思考强度', '新会话的默认值；模型没有这一挡时取最接近的一挡。输入框的模型菜单里可以按模型单独调', seg('effort', [['low', '低'], ['medium', '中（推荐）'], ['high', '高']], C.effort)) +
      row('出错时换用', '主模型报错、限流或超时时按顺序换用', '<span class="hx-caps">' + r.fallback.map((id, i) => '<span>' + (i + 1) + ' · ' + esc(C.modelName(id)) + '</span>').join('') + '</span>')); } };
  const sec0 = P.security.render;
  P.security.render = () => sec0() +
    card('网络与文件', '<div class="hx-sr"><div class="hx-sr__l"><div class="hx-sr__t">出站白名单</div><div class="hx-sr__d">HTTP 请求、网页抓取、扩展包只能访问这些主机</div><div class="hx-caps" style="gap:6px;margin-top:8px">' + C.hosts.map(h => '<span class="hx-att"><span class="hx-mono">' + esc(h) + '</span><button data-act="rmHost" data-arg="' + esc(h) + '">' + I.x + '</button></span>').join('') + '</div></div><div class="hx-sr__c"><input class="hx-input is-sm hx-mono" id="hostIn" placeholder="api.example.com" style="width:200px">' + btn('添加', 'addHost') + '</div></div>' +
      row('允许读取的目录', C.dirs.map(d => '<span class="hx-mono">' + esc(d) + '</span>').join('<br>'), btn('添加目录…', 'addDir', null, 'is-ghost', 'folder'))) +
    card('密钥存储', row('存在哪里', C.secretBackend === 'keyring' ? 'Windows 凭据管理器（macOS 钥匙串 / Linux Secret Service）；不可用时改用加密文件' : '加密文件（每次启动输入主密码）', seg('secretBackend', [['keyring', '系统密钥库'], ['file', '加密文件']], C.secretBackend)) +
      row('密钥在哪里填', '在各个连接里填；节点和 MCP 环境变量用 <span class="hx-mono">${secret=[REDACTED_PASSWORD] 引用', btn('去连接', 'nav', 'conns', 'is-ghost')));
  P.general.desc = '语言、启动行为、发送方式、新会话默认值和通知。';

  /* ---------------- 动作 ---------------- */
  A.pkgMenu = (id, b) => { const r = b.getBoundingClientRect(), pk = pkgs().find(x => x.id === id); HX.menu(r.left - 160, r.bottom + 4, [
    { label: '检查更新', icon: I.refresh, act: () => HX.toast(pk.name + ' 已是最新') },
    pk.mcp ? { label: '编辑命令', icon: I.gear, act: () => HX.toast('编辑 MCP 服务', '改命令后需要重新确认') } : null,
    pk.mcp ? { label: '查看日志', icon: I.term, act: () => HX.toast(pk.name + ' 的日志', 'stderr 最近 200 行（demo 只示意）') } : null,
    { sep: 1 }, { label: pk.mcp ? '移除服务' : '卸载', icon: I.trash, danger: 1, act: () => { if (pk.mcp) C.mcp = C.mcp.filter(x => x !== pk.mcp); else if (pk.ext) C.exts = C.exts.filter(x => x !== pk.ext); else if (pk.skill) C.skills = C.skills.filter(x => x !== pk.skill); C.changed('pkgs'); CT.go('pkgs'); HX.toast('已移除「' + pk.name + '」', '它带来的节点已从节点库移除'); } }].filter(Boolean)); };
  A.showInLib = name => { CT.close(); if (HX.panes && HX.panes.setLs) HX.panes.setLs(true); const s = $('secLib'); if (s) s.classList.remove('is-closed'); $('libSearch').value = name; HX.renderLib(); };
  A.newConnFor = t => CT.newConn(t);
  A.newConn = t => CT.newConn(t || null);
  A.editConn = id => connSheet(C.conns.find(c => c.id === id));
  A.testConn = id => { const c = C.conns.find(x => x.id === id); HX.toast('正在测试「' + c.name + '」'); setTimeout(() => HX.toast(c.state === 'ok' ? '「' + c.name + '」连接正常' : '「' + c.name + '」失败：' + c.err, '', { tone: c.state === 'ok' ? 'ok' : 'danger' }), 700); };
  A.rmConn = id => { const c = C.conns.find(x => x.id === id); HX.dialog({ title: '删除连接「' + c.name + '」？', text: '它的密钥会从系统密钥库删除。' + (usedBy(c).length ? '正在使用它的：' + usedBy(c).map(esc).join('、') + '。' : ''), ok: '删除', danger: 1, onOk: () => { C.conns = C.conns.filter(x => x !== c); C.changed('conns'); CT.go('conn:all'); } }); };
  function connSheet(c, typeId) {
    const ty = ctype(c ? c.type : typeId); if (!ty) return;
    const body = '<label class="hx-fd"><span>连接名称</span><input class="hx-input" id="cnName" value="' + esc(c ? c.name : ty.name) + '"><small>节点上的「连接」下拉框里显示这个名字。可以建多个同类型连接，比如"GitHub（个人）""GitHub（公司）"。</small></label>' +
      ty.fields.map(f => '<label class="hx-fd"><span>' + esc(f.label) + '</span>' + (f.t === 'secret' ? '<div class="hx-pw"><input class="hx-input" type="password" data-cf="' + f.k + '" placeholder="' + esc(c && c.values[f.k] ? c.values[f.k] : f.ph || '') + '" autocomplete="off"></div><small>' + I.lock.replace('<svg', '<svg style="width:11px;height:11px;vertical-align:-1px"') + ' 存进系统密钥库，不写进配置文件。' + (c ? '留空表示不修改。' : '') + (f.help ? '<br>' + esc(f.help) : '') + '</small>'
        : '<input class="hx-input hx-mono" data-cf="' + f.k + '" value="' + esc(c ? c.values[f.k] || '' : f.def || '') + '" placeholder="' + esc(f.ph || '') + '">') + '</label>').join('') +
      note('这个连接类型由「' + esc(ty.by) + '」提供，表单按它声明的字段自动生成（C.14）。', '', 'info') + '<div class="hx-test" id="cnTest"></div>';
    CT.sheet.open((c ? '编辑' : '新建') + ' · ' + esc(ty.name), body, '<button class="hx-btn is-sm is-ghost" data-act="cnTest">' + I.bolt + '测试</button><span class="sp"></span>' + btn('取消', 'closeSheet', null, 'is-ghost') + btn('保存', 'saveSheet', null, 'is-primary'), () => {
      const vals = {}; document.querySelectorAll('#ctrSheet [data-cf]').forEach(i => { const f = ty.fields.find(x => x.k === i.dataset.cf); const v = i.value.trim(); if (!v) return; vals[f.k] = f.t === 'secret' ? v.slice(0, 4) + '••••••••' + v.slice(-4) : v; });
      const name = ($('cnName').value || ty.name).trim();
      if (c) { c.name = name; Object.assign(c.values, vals); if (Object.keys(vals).length) { c.state = 'ok'; c.err = ''; } c.at = '11-22'; }
      else { c = { id: 'c' + Date.now().toString(36), type: ty.id, name: name, state: Object.keys(vals).length ? 'ok' : 'bad', err: Object.keys(vals).length ? '' : '未填写必填项', values: vals, at: '11-22' }; C.conns.push(c); }
      if (c.type === 'slack' && c.state === 'ok') { const m = C.mcp.find(x => x.id === 'slack'); if (m) { m.state = 'ok'; m.err = ''; m.tools = [['post_message', 'L2'], ['list_channels', 'L0'], ['read_history', 'L1']]; } }
      CT.sheet.close(); C.changed('conns'); CT.go('conn:' + c.id); HX.toast('已保存连接「' + c.name + '」', '节点的「连接」下拉框里可以选它了', { tone: 'ok' });
    });
  }
  A.cnTest = () => { const out = $('cnTest'), any = [...document.querySelectorAll('#ctrSheet [data-cf]')].some(i => i.value.trim()); out.innerHTML = note('正在测试…', '', 'refresh'); setTimeout(() => { out.innerHTML = any ? note('连接成功', 'is-ok', 'check') : note('请先填写字段', 'is-bad'); }, 600); };
  CT.newConn = function (typeId) {
    if (!CT.isOpen()) CT.open('conn:all'); else if (CT.mode() !== 'conns') CT.go('conn:all');
    if (typeId && typeId.startsWith('llm.')) { CT.providerSheet(typeId.slice(4)); return; }
    if (typeId) { connSheet(null, typeId); return; }
    const groups = [['模型', C.providers.map(p => ['llm.' + p.id, p.name, p.desc, p.state !== 'none'])]].concat(groupsT().map(g => [g, C.ctypes.filter(t => t.group === g).map(t => [t.id, t.name, t.desc + ' · 由「' + t.by + '」提供', false])]));
    CT.sheet.open('新建连接 · 选择类型', '<p class="hx-sr__d" style="margin:0 0 14px">连接类型由包提供：装了新的扩展包或接入 MCP 服务后，这里会多出对应的类型。</p>' + groups.map(g => '<div class="hx-ctr__grp" style="padding-left:0">' + esc(g[0]) + '</div>' + g[1].map(x => '<button class="hx-ctr__it" style="height:auto;padding:8px 10px;align-items:flex-start" data-act="newConn" data-arg="' + esc(x[0]) + '"><span style="display:block"><b style="font-weight:500;color:var(--hx-text-1)">' + esc(x[1]) + '</b>' + (x[3] ? ' <span class="hx-pill is-ok" style="height:16px">已连接</span>' : '') + '<small style="display:block;font-size:11px;color:var(--hx-text-3);margin-top:2px">' + esc(x[2]) + '</small></span></button>').join('')).join(''), '<span class="sp"></span>' + btn('取消', 'closeSheet', null, 'is-ghost'));
  };
  /* 保存 LLM 提供方后，刷新连接页 */
  C.listeners.push(w => { if (w === 'models' || w === 'conns' || w === 'pkgs' || /^(mcp|exts|skills|providers)/.test(w)) { CT.invalidate(); if (HX.renderLib) HX.renderLib(); } });
  const rmP = A.rmProvider; A.rmProvider = id => { rmP(id); setTimeout(() => { if (CT.isOpen()) CT.go('conn:all'); }, 0); };

  /* ---------------- 入口：左栏图标栏、账户菜单、命令面板 ---------------- */
  const rail = document.querySelector('.hx-ls__rail');
  if (rail) { const sp = rail.querySelector('.sp'); [['pkgs', 'box', '包管理'], ['conns', 'key', '连接']].forEach(x => { const b = document.createElement('button'); b.className = 'hx-iconbtn'; b.dataset.tip = x[2]; b.innerHTML = I[x[1]]; b.addEventListener('click', () => CT.open(x[0])); rail.insertBefore(b, sp); }); }
  if (HX.refreshConnOpts) HX.refreshConnOpts();
  if (HX.inbox) HX.inbox.items.forEach(it => { if (/slack/.test(it.title)) it.go = () => CT.open('pkg:mcp:slack'); });
})(window.HX);
