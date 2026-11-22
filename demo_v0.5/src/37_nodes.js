/* ===== 37_nodes.js · 节点参数、提示词节点、节点库（综合 ComfyUI 的做法） =====
   ① 每个参数两种填法：直接填在节点上，或从左边同名接口接线进来；接了线，节点上这一格显示"由上游提供"（参数声明 bind）。
   ② 提示词写在哪：Agent 节点的「指令」框（最常用）；要复用、要填变量时用「提示词」节点（{{变量}} 自动长出输入接口），
      接到 Agent 的「指令」接口；长期不变的人设写在角色卡，Agent 上用下拉选。眼睛按钮预览模型最终收到的全文。
   ③ 节点库 = 分类树：内核只有 13 种积木，库里每一条都是某个积木的预设，由"包"贡献（内置、MCP、扩展包、模型连接）。
      搜索、收藏、最近使用、来源标记；未启用的包里的节点灰显，点一下去包管理启用。
   规范：C.03（参数界面提示 ui.*）、U.10.07 参数与接口、U.22 节点库。 */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S, esc = s => HX.esc(String(s == null ? '' : s)), C = HX.cfg, L = HX.L;
  const I = Object.assign({}, HX.UI, HX.UI2);
  const P = (label, t, def, more) => Object.assign({ label: label, t: t, def: def }, more || {});
  const AREA = 92;

  /* ---------------- 1 类型名、接口中文名 ---------------- */
  HX.TYPE.gen.n = '数据';
  HX.PN = { context: '上下文', model: '模型', prompt: '指令', tools: '工具', result: '结果', ref: '输出', in: '输入', out: '输出', dropped: '被裁掉的', value: '值', request: '请求',
    endpoint: '工具端点', items: '列表', shared: '共享输入', results: '结果列表', collected: '汇总', yes: '是', no: '否', init: '初始', final: '最终', approved: '通过', rejected: '驳回' };

  /* ---------------- 2 参数定义调整 ---------------- */
  const ROLES = { '主脑@1': '你是这个系统的主脑：拆解目标、分配给下游、判断是否达成；不自己执行具体任务。', '智囊@1': '你是智囊团成员，从指定视角提出方案，写清依据和风险。',
    '聚类员@1': '你是聚类员：把方案按核心思路分簇并标注。', '决策者@1': '你是决策者：在候选方案中取舍，输出可执行的任务卡。', '执行者@1': '你是执行者：严格按任务卡执行，调用工具，如实记录结果。',
    '验收者@1': '你是验收者：只判定、不执行；逐条对照验收标准。', '对话编排者@1': '你是 Harness 的编排者。', '（不使用角色卡）': '' };
  HX.ROLECARDS = ROLES;
  const A = HX.DEF['Agent'], ap = A.params;
  ap.lifecycle.inline = 0;
  A.params = Object.assign({
    rolecard: P('角色卡', 'sel', '执行者@1', { opts: Object.keys(ROLES), inline: 1, group: '常用' }),
    instruction: P('指令', 'area', '', { inline: 1, bind: 'prompt', group: '常用', ph: '这次要做什么？直接写在这里；要复用或填变量时，把「提示词」节点接到左边的「指令」接口' })
  }, { output_schema: Object.assign({}, ap.output_schema, { inline: 1, group: '常用' }) }, ap, { skills: P('技能', 'text', '按需自动加载', { group: '高级' }) });
  delete A.params.output_schema; A.params = Object.assign({ rolecard: A.params.rolecard, instruction: A.params.instruction, output_schema: Object.assign({}, ap.output_schema, { inline: 1 }) }, A.params);
  A.desc = '调用模型完成一步工作：角色卡（你是谁）+ 指令（这次做什么）+ 上下文（能看到什么）';
  const R = HX.DEF['资源']; R.desc = '模型、提示词、列表、常量';
  const TL = HX.DEF['工具']; TL.params.conn = P('连接', 'sel', '无需连接', { opts: ['无需连接'], inline: 1 });

  const isPrompt = n => n && n.type === '资源' && n.params.kind === '提示词';
  const isArea = (n, k) => { const pd = HX.DEF[n.type].params[k] || {}; return pd.t === 'area' || (isPrompt(n) && k === 'value'); };
  HX.promptVars = function (t) { const out = []; String(t || '').replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (m, v) => { if (out.indexOf(v) < 0 && out.length < 8) out.push(v); return m; }); return out; };
  HX.isPrompt = isPrompt;

  /* ---------------- 3 几何：提示词变量接口、宽度、文本框高度 ---------------- */
  const ports0 = HX.ports, inline0 = HX.inlineKeys, nodeW0 = HX.nodeW, nodeH0 = HX.nodeH;
  HX.ports = function (n) { const r = ports0(n); if (isPrompt(n)) return { in: HX.promptVars(n.params.value).map(v => [v, 'any', 0, 0, 'var']).concat(r.in), out: r.out }; return r; };
  HX.inlineKeys = n => isPrompt(n) ? ['value'] : inline0(n);
  HX.nodeW = n => isPrompt(n) ? L.W : nodeW0(n);
  HX.nodeH = function (n) { let h = nodeH0(n); HX.inlineKeys(n).forEach(k => { if (isArea(n, k)) h += AREA - L.WROW; }); return h; };

  /* ---------------- 4 控件：多行文本框、"由上游提供" ---------------- */
  function boundFrom(n, k) {
    const pd = HX.DEF[n.type].params[k]; if (!pd || !pd.bind) return null;
    const g = HX.graphOf ? HX.graphOf(n.id) : HX.cur(); if (!g) return null;
    const e = [...g.edges.values()].find(x => x.t === n.id && x.tp === pd.bind);
    return e ? g.nodes.get(e.f) : null;
  }
  HX.boundFrom = boundFrom;
  const ctl0 = HX.ctlHTML;
  HX.ctlHTML = function (n, k, lg) {
    if (!isArea(n, k) || (n.pending && n.pending[k] !== undefined)) return ctl0(n, k, lg);
    const b = boundFrom(n, k), pd = HX.DEF[n.type].params[k], a = ' data-nid="' + n.id + '" data-k="' + k + '"';
    if (b) return '<div class="hx-area is-bound" data-ctl="area"' + a + '><span>' + I.port + '由上游「' + esc(b.label) + '」提供</span><button class="hx-area__pv" data-pv="' + n.id + '" data-tip="预览模型最终收到的内容" tabindex="-1">' + I.eye + '</button></div>';
    const ph = isPrompt(n) ? '在这里写提示词。用 {{变量}} 留空位，左边会自动长出同名接口' : (pd.ph || '');
    return '<div class="hx-area' + (lg ? ' is-lg' : '') + '" data-ctl="area"' + a + '><textarea class="hx-area__t" data-ctl="text"' + a + ' spellcheck="false" placeholder="' + esc(ph) + '">' + esc(n.params[k] || '') + '</textarea>' +
      '<button class="hx-area__pv" data-pv="' + n.id + '" data-tip="预览模型最终收到的内容" tabindex="-1">' + I.eye + '</button></div>';
  };

  /* 渲染后补丁：接口中文名、变量接口样式、文本框行高、提示词节点宽度 */
  const rn0 = HX.renderNode;
  HX.renderNode = function (n) {
    const el = rn0.apply(this, arguments);
    if (el && el._lbl !== el._rev) {
      el._lbl = el._rev;
      const vars = isPrompt(n) ? HX.promptVars(n.params.value) : [];
      el.querySelectorAll('.hx-port').forEach(p => {
        const nm = p.dataset.p, lab = p.querySelector('.hx-port__name');
        if (lab) lab.textContent = vars.indexOf(nm) >= 0 ? nm : (HX.PN[nm] || nm);
        if (vars.indexOf(nm) >= 0) p.classList.add('is-var');
      });
      el.querySelectorAll('.hx-area').forEach(a => { const w = a.closest('.hx-w'); if (w) w.classList.add('is-area'); });
      if (isPrompt(n)) { el.classList.remove('is-sm'); el.classList.add('is-prompt'); } else el.classList.remove('is-prompt');
      const tl = el.querySelector('.hx-node__type'); if (tl && isPrompt(n)) tl.textContent = '提示词 · ' + (vars.length ? vars.length + ' 个变量' : '无变量');
    }
    return el;
  };
  /* 接线变化时，刷新受影响节点上的"由上游提供" */
  function refreshBound() {
    const g = HX.cur(); let any = false;
    g.nodes.forEach(n => {
      const keys = Object.keys(HX.DEF[n.type].params).filter(k => HX.DEF[n.type].params[k].bind); if (!keys.length) return;
      const sig = keys.map(k => { const b = boundFrom(n, k); return b ? b.id + b.label : ''; }).join('|');
      if (n._bsig !== sig) { n._bsig = sig; HX.touch(n); any = true; }
    });
    if (any) HX.sync();
  }
  HX.on('op', refreshBound);
  const sw0 = HX.switchGraph; HX.switchGraph = function () { backfill(S.root); const r = sw0.apply(this, arguments); refreshBound(); return r; };

  /* 文本框里的滚轮、按键不要影响画布；"新建连接…" */
  const nodesEl = $('nodes');
  nodesEl.addEventListener('wheel', e => { if (e.target.closest && e.target.closest('.hx-area__t')) e.stopPropagation(); }, { passive: true });
  nodesEl.addEventListener('keydown', e => { if (e.target.matches && e.target.matches('textarea')) { e.stopPropagation(); if (e.key === 'Escape') e.target.blur(); } });
  nodesEl.addEventListener('input', e => {
    const t = e.target; if (!t.matches || !t.matches('.hx-area__t')) return;
    const n = HX.findNode(t.dataset.nid); if (!isPrompt(n)) return;
    const a = HX.promptVars(t.value).join('|'), b = HX.promptVars(n.params.value).join('|');
    t.closest('.hx-area').classList.toggle('is-dirtyvars', a !== b);
  });
  const commit0 = HX.commitParam;
  HX.commitParam = function (n, k, v, from) {
    if (k === 'conn' && v === '新建连接…') { HX.touch(n); HX.sync(); if (HX.center && HX.center.newConn) HX.center.newConn(n.connType || null); return; }
    return commit0.apply(this, arguments);
  };

  /* ---------------- 5 预览模型最终收到的内容 ---------------- */
  const tok = s => Math.max(1, Math.round(String(s).length * 0.65));
  function fillVars(text, n, g) {
    return String(text || '').replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (m, v) => {
      const e = g && [...g.edges.values()].find(x => x.t === n.id && x.tp === v); const s = e && g.nodes.get(e.f);
      return '‹' + v + (s ? ' ← 「' + s.label + '」运行时的输出' : ' · 未接入，运行时为空') + '›';
    });
  }
  HX.previewPrompt = function (id) {
    let n = HX.findNode(id); if (!n) return; const g = HX.graphOf ? HX.graphOf(n.id) : HX.cur();
    if (isPrompt(n)) {
      const outs = [...g.edges.values()].filter(e => e.f === n.id).map(e => g.nodes.get(e.t)).filter(x => x && x.type === 'Agent');
      if (outs[0]) n = outs[0]; else return show('提示词预览 · ' + n.label, [['提示词（变量已替换为占位）', fillVars(n.params.value, n, g)]], '这个提示词还没有接到任何 Agent 的「指令」接口。');
    }
    const role = ROLES[n.params.rolecard] || '';
    const src = boundFrom(n, 'instruction');
    const ins = src ? (isPrompt(src) ? fillVars(src.params.value, src, g) : '‹来自「' + src.label + '」›') : (n.params.instruction || '（没有写指令）');
    const ce = [...g.edges.values()].find(e => e.t === n.id && e.tp === 'context'), cn = ce && g.nodes.get(ce.f);
    const tools = [...g.edges.values()].filter(e => e.t === n.id && e.tp === 'tools').map(e => g.nodes.get(e.f)).filter(Boolean);
    const sec = [
      ['① 角色卡 · ' + (n.params.rolecard || '无'), role || '（不使用角色卡）'],
      ['② 指令' + (src ? ' · 来自「' + src.label + '」' : ' · 写在节点上'), ins],
      ['③ 上下文' + (cn ? ' · 由「' + cn.label + '」按「' + (cn.params.recipe || '') + '」组装' : ''), cn ? '运行时填入：目标账本、上一轮摘要、相关资料片段……\n预算 = ' + cn.params.budget + ' × 模型上下文窗口，超出时按「' + cn.params.on_overflow + '」处理。' : '（没有接上下文；模型只能看到上面两段）'],
      ['④ 可用工具', tools.length ? tools.map(t => '· ' + t.label + '（' + (t.params.tool || '') + '，风险 ' + t.params.risk + '）').join('\n') : '（没有工具）'],
      ['⑤ 输出格式', '必须符合数据类型「' + n.params.output_schema + '」；不符合时自动要求模型重写一次。']
    ];
    show('模型最终收到的内容 · ' + n.label, sec, '按 ①→⑤ 的顺序拼成一条消息发给模型。约 ' + tok(sec.map(x => x[1]).join('')) + ' tokens（不含运行时填入的上下文）。');
  };
  function show(title, sections, foot) {
    let d = $('pvDlg'); if (!d) { d = document.createElement('div'); d.id = 'pvDlg'; d.className = 'hx-dlg'; document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-x]')) d.hidden = true; }); d.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') d.hidden = true; }); }
    d.innerHTML = '<div class="hx-dlg__w hx-pvw" tabindex="-1"><div class="hx-pvw__h"><h3>' + esc(title) + '</h3><button class="hx-iconbtn is-sm" data-x>' + I.x + '</button></div>' +
      sections.map(s => '<div class="hx-pvw__s"><div class="hx-pvw__l">' + esc(s[0]) + '<span>' + tok(s[1]) + ' tokens</span></div><pre class="hx-prompt">' + esc(s[1]).replace(/‹([^›]*)›/g, '<mark>‹$1›</mark>') + '</pre></div>').join('') +
      '<p class="hx-pvw__f">' + esc(foot) + '</p></div>';
    d.hidden = false; setTimeout(() => d.querySelector('.hx-dlg__w').focus(), 30);
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pv]'); if (b) { e.stopPropagation(); HX.previewPrompt(b.dataset.pv); } }, true);

  /* ---------------- 6 现有节点补齐新参数 ---------------- */
  const INS = { '主脑': '把目标拆成可验收的子目标；判断这一轮是否继续。', '聚类员': '把候选方案按核心思路分簇，每簇给一句标签。', '决策者': '从各簇里选出可执行的方案，拆成任务卡，每张写清验收标准。',
    '验收者': '逐条对照目标检查执行结果，指出缺口；全部达成才判定通过。', '采集员': '按任务卡检索并抓取资料，保留原文链接。', '摘要员': '把去重后的资料压缩成要点，每条附出处。',
    '评审者': '运行测试并审查改动，列出必须修改的问题。', '生成者': '根据需求写出代码改动。', '撰写周报': '按「进展 · 问题 · 下周计划」三段写周报。', '分类员': '判断工单类别和紧急程度（P0–P3）。', '核对员': '逐条核对引用是否与原文一致。', '综述者': '综合各篇要点和分歧，写一份综述。' };
  const RC = { '主脑': '主脑@1', '聚类员': '聚类员@1', '决策者': '决策者@1', '验收者': '验收者@1', '评审者': '验收者@1', '核对员': '验收者@1' };
  function backfill(root) {
    if (!root) return;
    HX.walk(root, n => {
      const d = HX.DEF[n.type]; let ch = false;
      Object.keys(d.params).forEach(k => { if (n.params[k] === undefined) { n.params[k] = d.params[k].def; ch = true; } });
      if (n.type === 'Agent' && n._bf !== 1) { n._bf = 1; if (!n.params.instruction && INS[n.label]) n.params.instruction = INS[n.label]; if (RC[n.label] && n.params.rolecard === '执行者@1') n.params.rolecard = RC[n.label]; ch = true; }
      if (n.type === '工具' && n._bf !== 1) { n._bf = 1; const t = String(n.params.tool); n.params.conn = /检索/.test(t) ? 'Tavily 搜索' : /邮件|邮箱/.test(t) ? '（未配置）' : '无需连接'; ch = true; }
      if (ch) HX.touch(n);
    });
  }
  HX.backfill = backfill;

  /* ---------------- 7 节点库（分类树） ---------------- */
  const EXT_NODES = { sheets: [['读取表格', 'L0', '读取 Excel / CSV 为列表'], ['写入表格', 'L2', '把列表写成 Excel'], ['表格透视', 'L0', '按字段分组汇总'], ['导出 PDF 报告', 'L1', 'Markdown 排版成 PDF']],
    feishu: [['发送消息卡片', 'L2', '向群或个人发送飞书卡片'], ['读取飞书文档', 'L1', '读取云文档正文']], notion: [['读取 Notion 页面', 'L1', ''], ['写入 Notion 数据库', 'L2', '']] };
  const SUBS = [['资料采集', 'v1.2', '检索 + 抓取 → 采集员 → 去重 → 摘要员'], ['工单分诊', 'v2', '分类员判断紧急程度，P0 转人工'], ['单篇精读', 'v1', '多模型并行精读，要点投票'], ['引文核对', 'v1', '逐条核对引用'], ['评审回合', 'v1', '评审者用代码执行验证']];
  const connFor = name => /检索/.test(name) ? 'Tavily 搜索' : /邮件/.test(name) ? '（未配置）' : '无需连接';
  HX.libEntries = function () {
    const E = [];
    const add = (path, name, type, params, desc, src, extra) => E.push(Object.assign({ id: path.join('/') + '/' + name, path: path, name: name, type: type, params: params || {}, desc: desc || HX.DEF[type].desc, src: src || '内置' }, extra || {}));
    add(['智能体'], 'Agent', 'Agent', {}, '角色卡 + 指令 + 上下文 → 调用模型');
    add(['智能体'], '提示词', '资源', { kind: '提示词', value: '针对 {{主题}}，列出 3 个最关键的问题，每个附一句理由。' }, '写一段提示词；{{变量}} 自动变成输入接口；接到 Agent 的「指令」');
    add(['智能体'], '上下文装配', '上下文装配', {}, '按配方组装 Agent 能看到的材料，控制预算');
    [['主脑', '拆目标、判断是否结束'], ['决策者', '在方案中取舍，输出任务卡'], ['执行者', '按任务卡执行、调用工具'], ['验收者', '对照目标判定是否达成']].forEach(r => add(['智能体', '按角色'], r[0], 'Agent', { rolecard: r[0] + '@1', instruction: INS[r[0]] || '' }, r[1], '内置', { label: r[0] }));
    C.allModels(true).forEach(m => add(['模型', m.provider.name], m.name, '资源', { kind: '模型', value: m.id }, m.win + ' 上下文 · ' + m.caps.join('、'), '连接 · ' + m.provider.name));
    C.tools.forEach(t => add(['工具', '内置'], t.name, '工具', { tool: t.name, risk: t.risk, conn: connFor(t.name) }, t.desc, '内置', { off: !t.on, offWhy: '工具已停用' }));
    C.mcp.forEach(m => { if (m.state === 'ok') m.tools.forEach(t => add(['工具', 'MCP · ' + m.name], t[0], '工具', { tool: m.name + '.' + t[0], risk: t[1], conn: m.name === 'github' ? 'GitHub（个人）' : '无需连接' }, 'MCP 工具 · 风险 ' + t[1], 'MCP · ' + m.name, { off: !m.on || t[2] === false, offWhy: !m.on ? '服务已停用' : '工具未启用', pkg: 'mcp:' + m.id }));
      else add(['工具', 'MCP · ' + m.name], m.state === 'pending' ? '等你确认后出现工具' : '连接失败', '工具', {}, m.state === 'pending' ? '去包管理确认命令' : m.err || '', 'MCP · ' + m.name, { off: true, offWhy: m.state === 'pending' ? '等你确认' : '连接失败', pkg: 'mcp:' + m.id, ph: 1 }); });
    C.exts.forEach(x => (EXT_NODES[x.id] || []).forEach(t => add(['工具', '扩展包 · ' + x.name], t[0], '工具', { tool: x.name + '.' + t[0], risk: t[1], conn: x.id === 'feishu' ? '（未配置）' : '无需连接' }, t[2], '扩展包 · ' + x.name, { off: !x.on, offWhy: '扩展包未启用', pkg: 'ext:' + x.id })));
    add(['数据与状态'], '常量', '资源', { kind: '常量', value: '' }, '一个固定值');
    add(['数据与状态'], '列表', '资源', { kind: '列表', value: '[]' }, '一组值，常用于扇出');
    add(['数据与状态'], '读取账本', '账本', { op: 'read' }, '读外置状态（目标树、进度…）');
    add(['数据与状态'], '写入账本', '账本', { op: 'write' }, '覆盖写');
    add(['数据与状态'], '追加到账本', '账本', { op: 'append' }, '追加一条记录');
    add(['流程控制'], '扇出', '扇出', {}, '一份变 N 份并行执行（必须带子图）');
    add(['流程控制'], '汇合', '汇合', {}, '多路收成一份');
    add(['流程控制'], '分支', '分支', {}, '按条件走不同路径');
    add(['流程控制'], '循环', '循环', {}, '唯一能形成环的节点');
    [['投票', 'vote'], ['去重', 'dedupe'], ['排序取前 K', 'top_k'], ['按比例分级', 'group_ratio'], ['分歧检测', 'divergence']].forEach(x => add(['流程控制', '聚合'], x[0], '聚合', { op: x[1] }, '纯规则，不调用模型', '内置', { label: x[0] }));
    [['人工审批', 'approve', '通过 / 驳回'], ['人工输入', 'input', '让人填写内容'], ['人工选择', 'choose', '让人在几个选项里挑']].forEach(x => add(['人工'], x[0], '人工', { mode: x[1] }, x[2], '内置', { label: x[0] }));
    add(['子图'], '空子图', '子图引用', {}, '新建一个可以进入编辑的子图');
    [['入口', 'entry'], ['出口', 'exit'], ['摘要端口', 'summary']].forEach(x => add(['子图', '端口'], x[0], '子图端口', { role: x[1] }, '子图的' + x[0], '内置', { label: x[0] }));
    SUBS.forEach(s => add(['子图', '子图库'], s[0], '子图引用', { ref: s[0] + '@' + s[1], pin: 'snapshot' }, s[2] + ' · ' + s[1], '子图库', { label: s[0] }));
    return E;
  };

  let filter = 'all', fold = new Set(['模型', '子图', '工具/MCP · filesystem', '工具/MCP · postgres', '工具/MCP · slack', '流程控制/聚合', '子图/端口', '智能体/按角色']), favs = new Set(), recent = [];
  try { const f = JSON.parse(localStorage.getItem('hx-lib-fold') || 'null'); if (f) fold = new Set(f); favs = new Set(JSON.parse(localStorage.getItem('hx-lib-fav') || '[]')); recent = JSON.parse(localStorage.getItem('hx-lib-recent') || '[]'); } catch (e) { /* 忽略 */ }
  const persist = () => { try { localStorage.setItem('hx-lib-fold', JSON.stringify([...fold])); localStorage.setItem('hx-lib-fav', JSON.stringify([...favs])); localStorage.setItem('hx-lib-recent', JSON.stringify(recent)); } catch (e) { /* 忽略 */ } };
  let cache = [];
  const CAT_IC = { '智能体': 'Agent', '模型': '资源', '工具': '工具', '数据与状态': '账本', '流程控制': '扇出', '人工': '人工', '子图': '子图引用' };
  function item(e, i, showPath) {
    const ic = e.params.kind === '提示词' ? I.book : e.params.kind === '模型' ? I.cpu : (HX.ICON[e.type] || '');
    return '<button class="hx-lib2__it' + (e.off ? ' is-off' : '') + '" draggable="' + (!e.off) + '"' + (e.off ? '' : ' data-type="' + esc(e.type) + '"') + ' data-entry="' + i + '" data-tip="' + esc(e.desc + (e.off ? ' · ' + e.offWhy : '')) + '">' +
      '<span class="hx-lib2__ic">' + ic + '</span><span class="hx-lib2__n">' + esc(e.name) + (showPath ? '<small>' + esc(e.path.join(' › ')) + '</small>' : '') + '</span>' +
      (e.off ? '<span class="hx-lib2__tag is-off">' + esc(e.offWhy) + '</span>' : e.src !== '内置' && !showPath ? '' : '') +
      (e.ph ? '' : '<span class="hx-lib2__star' + (favs.has(e.id) ? ' is-on' : '') + '" data-star="' + i + '" role="button" aria-label="收藏">★</span>') + '</button>';
  }
  HX.renderLib = function () {
    const q = ($('libSearch').value || '').trim().toLowerCase(); cache = HX.libEntries();
    let h = '<div class="hx-lib2__f">' + [['all', '全部'], ['fav', '收藏'], ['recent', '最近']].map(x => '<button data-lf="' + x[0] + '"' + (filter === x[0] ? ' class="is-on"' : '') + '>' + x[1] + '</button>').join('') + '<span class="sp"></span><span class="hx-lib2__cnt">' + cache.filter(e => !e.ph).length + ' 个节点</span></div>';
    if (q || filter !== 'all') {
      let list = cache.map((e, i) => [e, i]).filter(x => !x[0].ph);
      if (filter === 'fav') list = list.filter(x => favs.has(x[0].id));
      if (filter === 'recent') list = recent.map(id => list.find(x => x[0].id === id)).filter(Boolean);
      if (q) list = list.filter(x => (x[0].name + x[0].desc + x[0].path.join('') + x[0].src + x[0].type).toLowerCase().indexOf(q) >= 0);
      h += list.length ? list.map(x => item(x[0], x[1], true)).join('') : '<div class="hx-lib2__e">' + (filter === 'fav' ? '还没有收藏。鼠标移到节点上，点右边的 ★' : filter === 'recent' ? '还没有用过的节点' : '没有找到「' + esc(q) + '」<br><button class="hx-btn is-sm is-ghost" data-lgo="pkgs">去包管理找找</button>') + '</div>';
    } else {
      const tree = {};
      cache.forEach((e, i) => { const c = e.path[0], s = e.path[1] || ''; (tree[c] = tree[c] || {}); (tree[c][s] = tree[c][s] || []).push(i); });
      Object.keys(tree).forEach(c => {
        const subs = tree[c], n = Object.values(subs).reduce((a, x) => a + x.filter(i => !cache[i].ph).length, 0), open = !fold.has(c);
        h += '<div class="hx-lib2__c' + (open ? ' is-open' : '') + '"><button class="hx-lib2__ch" data-fold="' + esc(c) + '"><span class="hx-lib2__ar">' + I.chevr + '</span><span class="hx-lib2__ci">' + (HX.ICON[CAT_IC[c]] || '') + '</span>' + esc(c) + '<em>' + n + '</em></button>';
        if (open) {
          h += '<div class="hx-lib2__b">';
          Object.keys(subs).forEach(s => {
            if (!s) { h += subs[s].map(i => item(cache[i], i)).join(''); return; }
            const key = c + '/' + s, so = !fold.has(key), src = cache[subs[s][0]].src;
            h += '<button class="hx-lib2__sh' + (so ? ' is-open' : '') + '" data-fold="' + esc(key) + '"><span class="hx-lib2__ar">' + I.chevr + '</span>' + esc(s) + (src !== '内置' && /MCP|扩展包|连接/.test(src) ? '<span class="hx-lib2__src">' + esc(src.split(' · ')[0]) + '</span>' : '') + '<em>' + subs[s].filter(i => !cache[i].ph).length + '</em></button>';
            if (so) h += '<div class="hx-lib2__b is-sub">' + subs[s].map(i => item(cache[i], i)).join('') + '</div>';
          });
          if (c === '模型') h += '<button class="hx-lib2__more" data-lgo="conns">' + I.plus + '连接更多模型…</button>';
          if (c === '工具') h += '<button class="hx-lib2__more" data-lgo="pkgs">' + I.plus + '接入 MCP 服务、安装扩展包…</button>';
          h += '</div>';
        }
        h += '</div>';
      });
    }
    $('libList').innerHTML = h;
  };
  /* 旧的「原子节点 / 子图库 / 扩展包」标签条被替换掉了；旧代码里还会对它调用 segThumb，这里让它对空值安全 */
  const segThumb0 = HX.segThumb;
  HX.segThumb = function (seg) { if (!seg || !seg.querySelector) return; return segThumb0.apply(this, arguments); };
  const tabs = document.querySelector('.hx-lib__tabs');
  if (tabs) tabs.innerHTML = '<div class="hx-lib2__foot"><button class="hx-btn is-sm is-ghost" data-lgo="pkgs">' + I.box + '包管理</button><button class="hx-btn is-sm is-ghost" data-lgo="conns">' + I.key + '连接</button><button class="hx-btn is-sm is-ghost" data-lgo="library">' + I.book + '资源库</button></div>';
  $('libSearch').placeholder = '搜索节点、工具、模型…';
  const libEl = $('lib');
  libEl.addEventListener('click', e => {
    const go = e.target.closest('[data-lgo]'); if (go) { e.stopPropagation(); if (HX.center) HX.center.open(go.dataset.lgo); return; }
    const lf = e.target.closest('[data-lf]'); if (lf) { e.stopPropagation(); filter = lf.dataset.lf; HX.renderLib(); return; }
    const fo = e.target.closest('[data-fold]'); if (fo && fo.closest('#libList')) { e.stopPropagation(); const k = fo.dataset.fold; fold.has(k) ? fold.delete(k) : fold.add(k); persist(); HX.renderLib(); return; }
    const st = e.target.closest('[data-star]'); if (st) { e.stopPropagation(); e.preventDefault(); const en = cache[+st.dataset.star]; favs.has(en.id) ? favs.delete(en.id) : favs.add(en.id); persist(); HX.renderLib(); return; }
    const it = e.target.closest('[data-entry]'); if (!it) return;
    const en = cache[+it.dataset.entry];
    if (en.off) { e.stopPropagation(); if (HX.center) HX.center.open(en.pkg || 'pkgs'); HX.toast(en.offWhy, '在包管理里启用后就能使用', {}); return; }
    HX._entry = en;
  }, true);
  libEl.addEventListener('dragstart', e => { const it = e.target.closest('[data-entry]'); if (it) HX._entry = cache[+it.dataset.entry]; }, true);
  libEl.addEventListener('dragend', () => setTimeout(() => { HX._entry = null; }, 60));

  const add0 = HX.addNodeAt;
  HX.addNodeAt = function (type) {
    const en = HX._entry; HX._entry = null;
    const n = add0.apply(this, arguments);
    if (en && n && en.type === type) {
      Object.assign(n.params, en.params); n.label = en.label || (en.params.kind === '模型' ? en.name : en.name === 'Agent' ? 'Agent' : en.name);
      if (en.params.kind === '提示词') n.label = '提示词';
      n.src = en.src; n._bf = 1; HX.touch(n); HX.sync(); HX.renderInsp();
      recent = [en.id].concat(recent.filter(x => x !== en.id)).slice(0, 10); persist();
    }
    return n;
  };

  /* 连接下拉的选项跟随"连接"列表 */
  HX.refreshConnOpts = function () { const names = (C.connNames ? C.connNames() : []); TL.params.conn.opts = ['无需连接'].concat(names, ['新建连接…']); };
  C.listeners.push(() => { HX.refreshConnOpts(); if (!$('lib').hidden) HX.renderLib(); });

  /* 画布柔光：跟随指针（减少动效时不显示） */
  const stage = $('stage');
  if (stage) {
    const vg = document.createElement('div'); vg.className = 'hx-vign'; const sp = document.createElement('div'); sp.className = 'hx-spot';
    stage.insertBefore(vg, stage.firstChild); stage.insertBefore(sp, stage.firstChild);
    let raf = 0, mx = 0, my = 0;
    stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; if (!raf) raf = requestAnimationFrame(() => { raf = 0; sp.style.setProperty('--mx', mx + 'px'); sp.style.setProperty('--my', my + 'px'); }); });
  }

  /* 启动：补齐现有图，重画 */
  backfill(S.root); HX.refreshConnOpts(); HX.resetDOM(); HX.sync(); HX.renderLib(); refreshBound();
})(window.HX);
