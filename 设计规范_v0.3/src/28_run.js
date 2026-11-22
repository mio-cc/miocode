/* ===== 28_run.js · 运行模拟：拓扑执行、循环轮次、人工审批挂起、急停 ===== */
(function (HX) {
  'use strict';
  const $ = HX.$, S = HX.S;
  const run = HX.run = { R: null };
  const wait = ms => new Promise((res, rej) => { const t = setTimeout(() => (run.R && run.R.stop ? rej(new Error('stop')) : res()), ms); if (run.R) run.R.timers.push({ t: t, rej: rej }); });

  function paint(n, g) { if (HX.nodeEl(n.id) && HX.cur() === g) HX.setStatus(n); }
  function paintEdge(e, g) { if (HX.cur() === g && HX.edgeEl(e.id)) HX.renderEdge(e, g); }
  function reset(g) { g.nodes.forEach(n => { n.status = 'idle'; n.prog = 0; n.sub = ''; n.meta = ''; n.activeOut = null; n.round = 0; if (n.children) reset(n.children); }); g.edges.forEach(e => { e.flow = false; }); }
  const active = (e, g) => { const s = g.nodes.get(e.f); return s && s.status === 'done' && (!s.activeOut || s.activeOut === e.fp); };

  function setUI(state) {
    const st = $('runStat'); st.className = 'hx-runstat is-' + state;
    $('runTxt').textContent = { idle: '待运行', running: '运行中', waiting: '等待审批', done: '已完成', failed: '已停止' }[state];
    $('runBtn').disabled = state === 'running' || state === 'waiting';
    $('runBtnTxt').textContent = state === 'running' || state === 'waiting' ? '运行中' : '运行';
    const cs = $('cardStatus'); cs.className = 'hx-badge' + ({ running: ' is-run', waiting: ' is-wait', done: ' is-ok', failed: ' is-bad' }[state] || ''); cs.textContent = $('runTxt').textContent;
  }

  run.start = async function () {
    if (run.R && !run.R.end) return;
    if (!S.open) HX.open();
    $('top').classList.remove('is-danger'); $('banner').hidden = true;
    reset(S.root); HX.sync();
    const R = run.R = { t0: performance.now(), tokens: 0, count: 0, spans: [], path: '', stop: false, end: 0, timers: [], pending: new Map() };
    $('paneLog').innerHTML = '';
    setUI('running');
    const tick = setInterval(() => { HX.metrics(); HX.renderTimeline(); if (!S.open) HX.drawCard(); else HX.drawMini(); }, 200);
    HX.log('根图', '开始运行 · 授权档位 ' + S.level, 'o');
    let ok = true;
    try { await runGraph(S.root, '根图', 0, {}); }
    catch (err) { ok = false; }
    clearInterval(tick); R.end = performance.now();
    HX.metrics(); HX.renderTimeline(); HX.drawCard(); HX.drawMini();
    setUI(ok ? 'done' : 'failed');
    if (ok) { HX.log('根图', '运行完成 · ' + ((R.end - R.t0) / 1000).toFixed(1) + 's · ' + (R.tokens / 1000).toFixed(1) + 'k tokens', 'o'); HX.chat.ai('运行完成：用时 <span class="k">' + ((R.end - R.t0) / 1000).toFixed(1) + 's</span>，约 <span class="k">' + (R.tokens / 1000).toFixed(1) + 'k tokens</span>，节点共执行 ' + R.count + ' 次。闭环迭代在第 2 轮通过验收。'); HX.toast('运行完成', '闭环迭代第 2 轮通过验收', { tone: 'ok' }); }
  };

  async function runGraph(g, path, depth, ctx) {
    g.nodes.forEach(n => { n.status = 'queued'; n.prog = 0; n.sub = '排队中'; n.activeOut = null; paint(n, g); });
    const levels = HX.topoLevels(g);
    for (const lv of levels) await Promise.all(lv.map(id => runNode(g.nodes.get(id), g, path, depth, ctx)));
  }

  async function runNode(n, g, path, depth, ctx) {
    const R = run.R; if (R.stop) throw new Error('stop');
    const inc = [...g.edges.values()].filter(e => e.t === n.id && !e.ghost);
    if (inc.length && inc.every(e => !active(e, g))) { n.status = 'skipped'; n.sub = ''; paint(n, g); return; }
    const p = path + '/' + n.label, t0 = performance.now();
    const span = { label: n.label, depth: depth, a: t0, b: 0, st: 'running' }; R.spans.push(span);
    n.status = 'running'; n.prog = 0; n.sub = ''; R.path = p; paint(n, g);
    inc.forEach(e => { if (active(e, g)) { e.flow = true; paintEdge(e, g); } });
    const step = async (k, ms, fn) => { for (let i = 1; i <= k; i++) { await wait(ms); n.prog = i / k * 100; if (fn) fn(i); paint(n, g); } };
    try {
      switch (n.type) {
        case 'Agent': await step(8, 150 + Math.random() * 60, i => { R.tokens += 300 + Math.random() * 260; n.sub = '生成 ' + n.params.output_schema + ' · ' + Math.round(i / 8 * 100) + '%'; }); HX.log(p, '输出 ' + n.params.output_schema); break;
        case '上下文装配': await step(3, 120, () => { n.sub = '装配 ' + (2 + Math.random() * 3).toFixed(1) + 'k tokens'; }); break;
        case '扇出': {
          const N = +n.params.n || 3, C = Math.max(1, +n.params.concurrency || 3); let done = 0;
          while (done < N) { const batch = Math.min(C, N - done); await step(4, 120, i => { n.sub = Math.min(N, done + Math.ceil(batch * i / 4)) + ' / ' + N + ' · 并发 ' + C; n.prog = (done + batch * i / 4) / N * 100; R.tokens += 220 * batch; }); done += batch; }
          HX.log(p, N + ' 份并行完成（并发 ' + C + '）'); break;
        }
        case '分支': {
          await wait(260); const ok = (ctx.round || 2) >= 2; ctx.achieved = ok; n.activeOut = ok ? 'yes' : 'no';
          n.sub = ok ? '是 → yes' : '否 → no'; HX.log(p, ok ? '判定：达成' : '判定：未达成，缺 B 公司数据', ok ? 'o' : 'w'); break;
        }
        case '人工': {
          n.status = 'waiting'; n.sub = '等待审批 · 0:00'; span.st = 'waiting'; paint(n, g); setUI('waiting');
          HX.log(p, '挂起，等待人工审批', 'w');
          const msg = HX.chat.ai('「' + HX.esc(n.label) + '」需要你审批后才能继续。<div class="hx-msg__acts"><button class="hx-btn is-sm is-ok" data-run-approve="' + n.id + '">批准</button><button class="hx-btn is-sm is-ghost" data-run-deny="' + n.id + '">驳回</button></div>');
          const tw = setInterval(() => { const s = Math.round((performance.now() - t0) / 1000); n.sub = '等待审批 · ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); paint(n, g); }, 1000);
          const okv = await new Promise(res => R.pending.set(n.id, res));
          clearInterval(tw); msg.querySelectorAll('button').forEach(b => { b.disabled = true; });
          if (R.stop) throw new Error('stop');
          n.status = 'running'; n.activeOut = okv ? 'approved' : 'rejected'; n.sub = okv ? '已批准' : '已驳回'; span.st = 'running'; setUI('running');
          HX.log(p, okv ? '已批准' : '已驳回', okv ? 'o' : 'w'); await wait(200); break;
        }
        case '循环': case '子图引用': {
          const max = n.type === '循环' ? Math.max(1, +n.params.max_rounds || 5) : 1; let r = 1, ok = false;
          for (; r <= max; r++) {
            const c2 = { round: r }; n.round = r; n.prog = (r - 0.5) / max * 100; n.sub = n.type === '循环' ? '第 ' + r + ' 轮进行中' : '运行子图';
            if (HX.cur() === g && HX.nodeEl(n.id)) { HX.touch(n); HX.renderNode(n); }
            if (n.type === '循环') HX.log(p, '第 ' + r + ' 轮开始');
            await runGraph(n.children, p + (n.type === '循环' ? '#r' + r : ''), depth + 1, c2);
            ok = c2.achieved !== false;
            if (ok || n.type !== '循环') break;
            HX.chat.ai('「' + HX.esc(n.label) + '」第 ' + r + ' 轮未通过验收。验收者写了差距报告：<span class="k">缺 B 公司企业版报价，官网与新闻稿均已查过</span>。带着差距报告进入第 ' + (r + 1) + ' 轮。');
          }
          n.prog = 100; n.sub = n.type === '循环' ? (ok ? '第 ' + r + ' 轮达成' : '达到最大轮数') : '完成';
          if (n.type === '循环') HX.log(p, ok ? '第 ' + r + ' 轮通过验收' : '达到最大轮数', ok ? 'o' : 'w');
          break;
        }
        default: await step(2, 140 + Math.random() * 120, () => { R.tokens += 40; });
      }
    } finally { inc.forEach(e => { e.flow = false; paintEdge(e, g); }); }
    if (R.stop) throw new Error('stop');
    n.status = 'done'; n.prog = 100; if (n.type !== '分支' && n.type !== '人工' && !n.children) n.sub = '';
    const dt = (performance.now() - t0) / 1000; n.meta = dt.toFixed(1) + 's';
    span.b = performance.now(); span.st = 'done'; R.count++;
    paint(n, g); if (HX.cur() === g) { const el = HX.nodeEl(n.id); if (el) { el.classList.add('is-justdone'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-justdone'))); } }
    [...g.edges.values()].filter(e => e.f === n.id).forEach(e => paintEdge(e, g));
  }

  run.answer = function (id, ok) { const R = run.R; if (!R || !R.pending.has(id)) return; const f = R.pending.get(id); R.pending.delete(id); f(ok); };
  run.retry = function (id) { const n = HX.findNode(id); if (n) { n.status = 'queued'; n.sub = '已重新排队'; HX.setStatus(n); HX.toast('「' + n.label + '」已重新排队'); } };
  run.estop = function () {
    const R = run.R;
    HX.setLevel(0);
    $('top').classList.add('is-danger');
    const b = $('banner'); b.hidden = false; b.innerHTML = HX.UI.stop.replace('<svg', '<svg style="width:12px;height:12px"') + '急停：运行已停止，模型授权降到 0 档（只读）<button class="hx-btn is-sm is-ghost" id="unstop">解除</button>';
    $('unstop').onclick = () => { $('top').classList.remove('is-danger'); b.hidden = true; HX.toast('已解除急停', '授权档位保持 0，需要时手动调高'); };
    if (R && !R.end) {
      R.stop = true; R.timers.forEach(x => { clearTimeout(x.t); x.rej(new Error('stop')); }); R.pending.forEach(f => f(false)); R.pending.clear();
      HX.walk(S.root, n => { if (n.status === 'running' || n.status === 'waiting' || n.status === 'queued') { n.status = n.status === 'queued' ? 'skipped' : 'failed'; n.sub = '已取消'; } });
      S.root.nodes.forEach(n => { if (n.status === 'running' || n.status === 'waiting') { n.status = 'failed'; n.sub = '已取消'; } });
      R.spans.forEach(s => { if (!s.b) { s.b = performance.now(); s.st = 'failed'; } });
      HX.cur().edges.forEach(e => { e.flow = false; }); HX.sync();
      HX.log('根图', '急停：所有运行中的节点已取消', 'e');
    }
    HX.chat.ai('已急停：运行中的节点全部取消，模型授权降到 <span class="k">0 只读</span>。模型无法自己解除急停，只有你可以。', { model: true });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-run-approve],[data-run-deny]'); if (!a) return;
    run.answer(a.dataset.runApprove || a.dataset.runDeny, !!a.dataset.runApprove);
  });
})(window.HX);
