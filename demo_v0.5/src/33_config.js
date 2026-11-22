/* ===== 33_config.js · 配置数据（demo 用的本机配置）+ 补充图标 =====
   真实产品里这些数据来自后端：/providers、/models、/tools、/mcp-servers、/extensions、/settings（B.04.07–B.04.12）。
   demo 里的模型名、价格、用量都是示例数据，标注在设置页底部。 */
(function (HX) {
  'use strict';
  const s = d => '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  HX.UI2 = {
    user: s('<circle cx="8" cy="5.4" r="2.6"/><path d="M2.8 13.6c.8-2.4 2.8-3.6 5.2-3.6s4.4 1.2 5.2 3.6"/>'),
    palette: s('<path d="M8 1.8a6.2 6.2 0 1 0 0 12.4c1 0 1.4-.6 1.4-1.3 0-.9-.8-1.2-.8-2 0-.7.6-1.2 1.3-1.2h1.6c1.6 0 2.7-1.2 2.7-2.6C14.2 4.1 11.5 1.8 8 1.8Z"/><circle cx="5" cy="7" r=".8" fill="currentColor"/><circle cx="7.4" cy="4.6" r=".8" fill="currentColor"/><circle cx="10.6" cy="5.2" r=".8" fill="currentColor"/>'),
    cpu: s('<rect x="4" y="4" width="8" height="8" rx="1.4"/><path d="M6.4 1.8V4M9.6 1.8V4M6.4 12v2.2M9.6 12v2.2M1.8 6.4H4M1.8 9.6H4M12 6.4h2.2M12 9.6h2.2"/>'),
    tool: s('<path d="M10.4 2.2a3.1 3.1 0 0 0-3.2 4.2l-4.8 4.8a1.4 1.4 0 0 0 2 2l4.8-4.8a3.1 3.1 0 0 0 4.2-3.2l-1.9 1.9-1.8-.4-.4-1.8Z"/>'),
    plug: s('<path d="M6 1.8v3M10 1.8v3"/><path d="M4 4.8h8v2.6a4 4 0 0 1-8 0Z"/><path d="M8 11.4v2.8"/>'),
    spark: s('<path d="M8 1.8 9.3 6.7 14.2 8 9.3 9.3 8 14.2 6.7 9.3 1.8 8 6.7 6.7Z"/>'),
    box: s('<path d="M8 1.6 14 4.6v6.8L8 14.4 2 11.4V4.6Z"/><path d="M2 4.6 8 7.6l6-3M8 7.6v6.8"/>'),
    shield: s('<path d="M8 1.6 13.4 3.6v4.2c0 3.2-2.3 5.6-5.4 6.6-3.1-1-5.4-3.4-5.4-6.6V3.6Z"/><path d="m5.6 8 1.7 1.7L10.6 6.4"/>'),
    wallet: s('<rect x="1.8" y="3.6" width="12.4" height="9.6" rx="1.8"/><path d="M1.8 6.4h12.4"/><circle cx="11" cy="9.6" r=".9" fill="currentColor"/>'),
    key: s('<circle cx="5.4" cy="10.6" r="2.8"/><path d="m7.4 8.6 5.8-5.8M11 4.8l1.6 1.6M9.4 6.4l1.4 1.4"/>'),
    layers: s('<path d="M8 1.8 14 4.8 8 7.8 2 4.8Z"/><path d="m2 8 6 3 6-3"/><path d="m2 11.2 6 3 6-3"/>'),
    db: s('<ellipse cx="8" cy="3.8" rx="5" ry="1.9"/><path d="M3 3.8v8.4c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V3.8"/><path d="M3 8c0 1 2.2 1.9 5 1.9S13 9 13 8"/>'),
    term: s('<rect x="1.8" y="2.6" width="12.4" height="10.8" rx="1.8"/><path d="m4.6 6.2 2 1.8-2 1.8M8.4 10.2h3"/>'),
    kbd: s('<rect x="1.4" y="4" width="13.2" height="8" rx="1.6"/><path d="M4 6.6h.01M6.6 6.6h.01M9.4 6.6h.01M12 6.6h.01M4.6 9.4h6.8"/>'),
    info: s('<circle cx="8" cy="8" r="6.2"/><path d="M8 7.4v3.6M8 5.2h.01"/>'),
    bell: s('<path d="M4 6.6a4 4 0 0 1 8 0c0 3.4 1.4 4.6 1.4 4.6H2.6S4 10 4 6.6Z"/><path d="M6.6 13.4a1.5 1.5 0 0 0 2.8 0"/>'),
    clip: s('<path d="m13.2 7.4-5.4 5.4a3.2 3.2 0 0 1-4.6-4.6l5.6-5.6a2.1 2.1 0 0 1 3 3l-5.4 5.4a1 1 0 0 1-1.5-1.5l4.9-4.9"/>'),
    file: s('<path d="M9 1.8H4.4a1.4 1.4 0 0 0-1.4 1.4v9.6a1.4 1.4 0 0 0 1.4 1.4h7.2a1.4 1.4 0 0 0 1.4-1.4V5.8Z"/><path d="M9 1.8v4h4"/>'),
    folder: s('<path d="M1.8 4.4a1.4 1.4 0 0 1 1.4-1.4h3l1.6 1.8h5a1.4 1.4 0 0 1 1.4 1.4v6.2a1.4 1.4 0 0 1-1.4 1.4H3.2a1.4 1.4 0 0 1-1.4-1.4Z"/>'),
    book: s('<path d="M2.6 2.8h4a2 2 0 0 1 2 2v9a1.6 1.6 0 0 0-1.6-1.6h-4.4ZM13.4 2.8h-4a2 2 0 0 0-2 2"/><path d="M13.4 2.8v9.6H9a1.6 1.6 0 0 0-1.4 1.6"/>'),
    globe: s('<circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c1.8 1.8 2.6 3.8 2.6 6.2S9.8 12.4 8 14.2C6.2 12.4 5.4 10.2 5.4 8S6.2 3.6 8 1.8Z"/>'),
    gear: s('<circle cx="8" cy="8" r="2.2"/><path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M3.5 12.5l1.1-1.1M11.4 4.6l1.1-1.1"/>'),
    sliders: s('<path d="M3 2.4v11.2M8 2.4v11.2M13 2.4v11.2"/><circle cx="3" cy="10" r="1.6" fill="var(--hx-bg-2)"/><circle cx="8" cy="5.4" r="1.6" fill="var(--hx-bg-2)"/><circle cx="13" cy="9" r="1.6" fill="var(--hx-bg-2)"/>'),
    route: s('<circle cx="4" cy="12" r="1.8"/><circle cx="12" cy="4" r="1.8"/><path d="M5.8 12h3.4a2.4 2.4 0 0 0 0-4.8H6.8a2.4 2.4 0 0 1 0-4.8h3.4"/>'),
    eye: s('<path d="M1.6 8S4 3.6 8 3.6 14.4 8 14.4 8 12 12.4 8 12.4 1.6 8 1.6 8Z"/><circle cx="8" cy="8" r="2"/>'),
    ext: s('<path d="M9.4 2.6h4v4M13.4 2.6 7.6 8.4M11.6 9.4v3a1.4 1.4 0 0 1-1.4 1.4H4a1.4 1.4 0 0 1-1.4-1.4V5.8A1.4 1.4 0 0 1 4 4.4h3"/>'),
    dots: s('<circle cx="3.6" cy="8" r=".9" fill="currentColor"/><circle cx="8" cy="8" r=".9" fill="currentColor"/><circle cx="12.4" cy="8" r=".9" fill="currentColor"/>'),
    pin: s('<path d="M9.8 1.8 14.2 6.2l-1.8.6-2.6 2.6-.4 3-1.8-1.8-3.2 3.2M5.6 10.4 3.8 8.6l3-.4 2.6-2.6Z"/>'),
    at: s('<circle cx="8" cy="8" r="2.4"/><path d="M10.4 8v1a1.8 1.8 0 0 0 3.6 0V8A6 6 0 1 0 11.6 12.8"/>'),
    slash: s('<path d="M10.6 2.4 5.4 13.6"/>'),
    upload: s('<path d="M8 10.6V2.4M4.8 5.4 8 2.2l3.2 3.2M2.4 10.6v1.8a1.4 1.4 0 0 0 1.4 1.4h8.4a1.4 1.4 0 0 0 1.4-1.4v-1.8"/>'),
    refresh: s('<path d="M13.2 6.4A5.2 5.2 0 0 0 3.5 4.7"/><path d="M2.8 9.6a5.2 5.2 0 0 0 9.7 1.7"/><path d="M3.2 2.2v2.9h2.9M12.8 13.8v-2.9H9.9"/>'),
    route2: s('<path d="M2.4 4h7.2M2.4 8h11.2M2.4 12h5.6"/>')
  };

  /* ---------------- 模型提供方（目录） ---------------- */
  const P = (id, name, logo, kind, desc, over) => Object.assign({ id: id, name: name, logo: logo, kind: kind, desc: desc, state: 'none', key: '', base: '', org: '', models: [], latency: 0 }, over || {});
  const M = (id, name, win, caps, pin, pout, over) => Object.assign({ id: id, name: name, win: win, caps: caps, pin: pin, pout: pout, on: true }, over || {});
  HX.cfg = {
    providers: [
      P('deepseek', 'DeepSeek', 'D', 'deepseek', '国产开源大模型，长上下文、工具调用和推理模式', { state: 'ok', key: 'sk-••••••••••••a1f3', base: 'https://api.deepseek.com', latency: 412,
        models: [M('deepseek-v4-pro', 'DeepSeek V4 Pro', '128K', ['工具', '推理', 'JSON'], 4, 16), M('deepseek-v4-flash', 'DeepSeek V4 Flash', '128K', ['工具', '推理', 'JSON'], 1, 2)] }),
      P('anthropic', 'Anthropic', 'A', 'anthropic', 'Claude 系列，擅长长文写作、代码和复杂指令', { state: 'ok', key: 'sk-ant-••••••••7c20', base: 'https://api.anthropic.com', latency: 638,
        models: [M('claude-sonnet', 'Claude Sonnet', '200K', ['工具', '视觉', '推理'], 21, 105), M('claude-haiku', 'Claude Haiku', '200K', ['工具', '视觉'], 7, 35, { on: false })] }),
      P('openai', 'OpenAI', 'O', 'openai', 'GPT 系列与推理模型；Responses API', { models: [M('gpt-large', 'GPT（旗舰）', '400K', ['工具', '视觉', '推理', 'JSON'], 9, 72), M('gpt-mini', 'GPT mini', '400K', ['工具', '视觉', 'JSON'], 2, 14)] }),
      P('gemini', 'Google Gemini', 'G', 'gemini', '超长上下文与多模态', { models: [M('gemini-pro', 'Gemini Pro', '1M', ['工具', '视觉', '推理'], 9, 72)] }),
      P('qwen', '阿里云百炼 · 通义', '通', 'openai_compat', '通义千问系列；OpenAI 兼容接口', { base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: [M('qwen-max', '通义千问 Max', '128K', ['工具', 'JSON'], 2.4, 9.6)] }),
      P('glm', '智谱 GLM', '智', 'openai_compat', 'GLM 系列；OpenAI 兼容接口', { base: 'https://open.bigmodel.cn/api/paas/v4', models: [M('glm', 'GLM', '128K', ['工具', 'JSON'], 2, 8)] }),
      P('kimi', '月之暗面 Kimi', 'K', 'openai_compat', 'Kimi 系列，长上下文', { base: 'https://api.moonshot.cn/v1', models: [M('kimi', 'Kimi', '256K', ['工具', 'JSON'], 4, 16)] }),
      P('openrouter', 'OpenRouter', 'R', 'openai_compat', '一个密钥访问多家模型；按实际调用计费', { base: 'https://openrouter.ai/api/v1' }),
      P('ollama', 'Ollama（本地）', '本', 'ollama', '在本机运行开源模型，不出网、不计费', { state: 'off', base: 'http://127.0.0.1:11434', models: [M('qwen3:8b', 'qwen3:8b（本地）', '32K', ['工具'], 0, 0)] }),
      P('custom', 'OpenAI 兼容（自定义）', '+', 'openai_compat', 'vLLM、LM Studio、公司内网网关等任何兼容 OpenAI 接口的服务', {})
    ],
    roles: { orch: 'deepseek-v4-pro', agent: 'deepseek-v4-flash', summary: 'deepseek-v4-flash', embed: 'none', fallback: ['deepseek-v4-pro', 'claude-sonnet'] },
    effort: 'medium',
    tools: [
      { id: 'search', name: '检索', desc: '网页搜索，返回标题、摘要和链接', risk: 'L0', floor: 'L0', on: true, rate: 30, conf: '搜索服务：Tavily · 密钥 TAVILY_API_KEY' },
      { id: 'fetch', name: '网页抓取', desc: '读取指定网页正文（自动提取正文、去广告）', risk: 'L1', floor: 'L1', on: true, rate: 20, conf: '遵守 robots.txt · 单页 ≤ 2MB' },
      { id: 'browser', name: '浏览器', desc: '无头浏览器：点击、填表、截图', risk: 'L2', floor: 'L2', on: false, rate: 6, conf: '需要安装 Chromium（首次启用时下载）' },
      { id: 'http', name: 'HTTP 请求', desc: '调用外部接口；只允许白名单里的主机', risk: 'L2', floor: 'L1', on: true, rate: 60, conf: '出站白名单 3 个主机' },
      { id: 'code', name: '代码执行', desc: '在沙箱里运行 Python / JS（wazero）', risk: 'L2', floor: 'L2', on: true, rate: 20, conf: '沙箱：wazero · 10 s · 256 MB · 无网络' },
      { id: 'fread', name: '文件读取', desc: '读取允许目录里的文件', risk: 'L0', floor: 'L0', on: true, rate: 120, conf: '允许目录 2 个' },
      { id: 'fwrite', name: '文件写入', desc: '写入运行工作区；写到允许目录需要审批', risk: 'L2', floor: 'L2', on: true, rate: 60, conf: '默认只写运行工作区' },
      { id: 'mail', name: '发送邮件', desc: '通过 SMTP 发送邮件', risk: 'L3', floor: 'L3', on: false, rate: 5, conf: '未配置 SMTP' }
    ],
    hosts: ['api.example-pricing.com', 'docs.company.internal', 'github.com'],
    dirs: ['C:\\Users\\Administrator\\Documents\\调研资料', 'C:\\Users\\Administrator\\Desktop\\sj'],
    mcp: [
      { id: 'filesystem', name: 'filesystem', tr: 'stdio', cmd: 'npx -y @modelcontextprotocol/server-filesystem C:\\Users\\Administrator\\Documents', state: 'ok', tools: [['read_file', 'L0'], ['list_directory', 'L0'], ['search_files', 'L0'], ['write_file', 'L2'], ['move_file', 'L2']], on: true },
      { id: 'github', name: 'github', tr: 'http', cmd: 'https://api.githubcopilot.com/mcp/', state: 'ok', tools: [['search_repositories', 'L0'], ['get_file_contents', 'L0'], ['create_issue', 'L2'], ['create_pull_request', 'L2'], ['merge_pull_request', 'L3']], on: true, secret: 'GITHUB_TOKEN' },
      { id: 'postgres', name: 'postgres', tr: 'stdio', cmd: 'npx -y @modelcontextprotocol/server-postgres postgresql://localhost/sales', state: 'pending', tools: [], on: false },
      { id: 'slack', name: 'slack', tr: 'stdio', cmd: 'npx -y @modelcontextprotocol/server-slack', state: 'bad', err: '缺少环境变量 SLACK_BOT_TOKEN', tools: [], on: true }
    ],
    skills: [
      { id: 'compete', name: '竞品分析', desc: '按"定位 · 定价 · 渠道 · 口碑"四个维度整理竞品，输出对比表', src: '本机 · skills/竞品分析/SKILL.md', on: true, files: 3 },
      { id: 'pdfrep', name: 'PDF 报告生成', desc: '把 Markdown 结果排版成带封面和目录的 PDF', src: '扩展包 · 表格工具包', on: true, files: 5 },
      { id: 'review', name: '代码评审清单', desc: '安全、性能、可读性三类检查项；评审 Agent 自动加载', src: '本机 · skills/代码评审清单/SKILL.md', on: false, files: 2 }
    ],
    exts: [
      { id: 'sheets', name: '表格工具包', ver: '1.2.0', sign: 'ok', desc: '读写 Excel / CSV 的节点和工具，附带「PDF 报告生成」技能', perms: ['读取允许目录', '写入运行工作区'], hosts: [], on: true, nodes: 4 },
      { id: 'feishu', name: '飞书连接器', ver: '0.3.1', sign: 'none', desc: '读取飞书文档、发送消息卡片', perms: ['网络：open.feishu.cn', '密钥：FEISHU_APP_SECRET'], hosts: ['open.feishu.cn'], on: false, nodes: 2 }
    ],
    secrets: [
      { name: 'DEEPSEEK_API_KEY', tail: 'a1f3', by: '模型提供方 · DeepSeek', at: '11-20' },
      { name: 'ANTHROPIC_API_KEY', tail: '7c20', by: '模型提供方 · Anthropic', at: '11-18' },
      { name: 'TAVILY_API_KEY', tail: '90be', by: '工具 · 检索', at: '11-12' },
      { name: 'GITHUB_TOKEN', tail: 'Qm2x', by: 'MCP · github', at: '11-02' }
    ],
    secretBackend: 'keyring',
    budget: { month: 300, used: 128.4, perRun: 5, warn: 80, over: 'pause' },
    usage: [6.2, 4.8, 9.6, 12.1, 3.4, 2.2, 8.8, 14.6, 11.2, 7.9, 10.4, 15.8, 9.1, 12.3],
    byModel: [['DeepSeek V4 Pro', 61.2, 'var(--hx-primary)'], ['Claude Sonnet', 44.9, 'var(--hx-model)'], ['DeepSeek V4 Flash', 17.6, 'var(--hx-type-list)'], ['其他', 4.7, 'var(--hx-text-3)']],
    runs: [
      ['竞品定价调研', '闭环迭代 · 2 轮', 'done', '4 分 12 秒', 3.18, '今天 21:40'], ['代码评审流水线', '评审回合 · 3 轮', 'failed', '2 分 05 秒', 1.02, '今天 19:12'],
      ['周报自动生成', '单层 · 10 节点', 'done', '58 秒', 0.41, '昨天 17:00'], ['论文综述 · 多模型对比', '单篇精读 ×12', 'cancelled', '9 分 31 秒', 6.70, '11-19']],
    pools: { global: 8, per: [['DeepSeek', 6, 600], ['Anthropic', 4, 50], ['Ollama（本地）', 1, 0]], queue: 'fifo' },
    data: { dir: 'C:\\Users\\Administrator\\AppData\\Roaming\\Harness', parts: [['数据库', 182, 'var(--hx-primary)'], ['工作区原文', 1240, 'var(--hx-type-list)'], ['日志', 46, 'var(--hx-text-3)'], ['扩展与技能', 31, 'var(--hx-model)']], blobDays: 30, logDays: 14 },
    general: { lang: 'zh-CN', start: 'last', send: 'enter', notifyApproval: true, notifyDone: true, notifyFail: true, desktopNotify: false, defaultLevel: 1, autoTitle: true, confirmHotpatch: true },
    look: { density: 'normal', grid: 'dot', edge: 'curve', mini: true, reduce: false, zoom: 100 },
    sec: { untrusted: true, mergeApprovals: true, approvalTimeout: '24h', sandbox: 'wazero', timeout: 10, mem: 256, net: false, telemetry: false },
    access: { url: 'http://127.0.0.1:7300', token: 'hx_live_4f9c••••••••••••••e21a' }
  };

  /* 每个模型支持的思考挡位（demo 数据；真实产品由连接测试时从提供方读取，C.16） */
  const EFFL = { 'deepseek-v4-pro': ['off', 'low', 'medium', 'high', 'max'], 'deepseek-v4-flash': ['off', 'high'], 'claude-sonnet': ['off', 'low', 'medium', 'high', 'max'],
    'gpt-large': ['minimal', 'low', 'medium', 'high', 'xhigh'], 'gemini-pro': ['low', 'medium', 'high'] };
  HX.cfg.providers.forEach(p => p.models.forEach(m => { if (EFFL[m.id]) m.effort = EFFL[m.id]; }));

  /* ---------------- 查询辅助 ---------------- */
  HX.cfg.allModels = function (onlyUsable) {
    const r = [];
    HX.cfg.providers.forEach(p => p.models.forEach(m => { if (!onlyUsable || (p.state === 'ok' && m.on)) r.push(Object.assign({ provider: p }, m)); }));
    return r;
  };
  HX.cfg.model = id => HX.cfg.allModels(false).find(m => m.id === id) || null;
  HX.cfg.modelName = id => { const m = HX.cfg.model(id); return m ? m.name : (id === 'none' ? '不使用' : id); };
  HX.cfg.provider = id => HX.cfg.providers.find(p => p.id === id);
  HX.cfg.counts = function () {
    const c = HX.cfg;
    return {
      providers: c.providers.filter(p => p.state === 'ok').length,
      models: c.allModels(true).length,
      tools: c.tools.filter(t => t.on).length,
      mcpBad: c.mcp.filter(m => m.state === 'bad').length,
      mcpPending: c.mcp.filter(m => m.state === 'pending').length,
      mcpOk: c.mcp.filter(m => m.state === 'ok').length,
      skills: c.skills.filter(x => x.on).length,
      exts: c.exts.length,
      secrets: c.secrets.length
    };
  };
  HX.cfg.listeners = [];
  HX.cfg.changed = function (what) { HX.cfg.listeners.forEach(f => { try { f(what); } catch (e) { console.error(e); } }); };
})(window.HX);
