/* Live windows: each project window in the showcase runs a small demo instead of a still.
   Scenes mount lazily, run only while their window is the active one (or on screen on phones),
   pause when the tab is hidden, and never run under prefers-reduced-motion or data saver. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const enabled = !reduce && !saveData;
  const W = 1600, H = 1000, EM = '#4ade80', TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const grotesk = '"Space Grotesk", Poppins, system-ui, sans-serif';
  const mono = '500 12.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const scenes = {};

  const svgCache = new Map();
  const fetchSVG = url => { if (!svgCache.has(url)) svgCache.set(url, fetch(url).then(r => r.ok ? r.text() : Promise.reject(new Error('svg ' + r.status)))); return svgCache.get(url); };
  const layerFor = host => { const d = document.createElement('div'); d.className = 'live'; host.appendChild(d); return d; };
  const canvasFor = host => { const c = document.createElement('canvas'); c.className = 'live-canvas'; c.setAttribute('aria-hidden', 'true'); host.appendChild(c); c._host = host; return c; };
  const fit = c => {
    const host = c._host, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(host.clientWidth * dpr)), h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext('2d'); ctx.setTransform(w / W, 0, 0, h / H, 0, 0); return ctx;
  };
  const loop = draw => {
    let raf = 0, last = 0, t0 = 0;
    const tick = now => { raf = requestAnimationFrame(tick); if (!t0) t0 = now; const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; draw((now - t0) / 1000, dt); };
    return { start() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }, stop() { if (raf) cancelAnimationFrame(raf); raf = 0; } };
  };
  const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const spacing = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v; };

  /* ── SVG covers: the cover file is inlined so its parts can animate (CSS in the page), plus optional JS extras ── */
  const svgScene = extra => (host, p) => {
    const layer = layerFor(host); layer.classList.add('paused');
    let ctl = null, want = false, dead = false;
    fetchSVG(p.image).then(txt => {
      if (dead) return;
      layer.innerHTML = txt;
      const svg = layer.querySelector('svg'); if (!svg) return;
      svg.setAttribute('aria-hidden', 'true'); svg.removeAttribute('width'); svg.removeAttribute('height');
      if (extra) ctl = extra(svg);
      if (want) { layer.classList.remove('paused'); ctl && ctl.start(); }
    }).catch(() => layer.remove());
    return {
      start() { want = true; layer.classList.remove('paused'); ctl && ctl.start(); },
      stop() { want = false; layer.classList.add('paused'); ctl && ctl.stop(); },
      destroy() { dead = true; ctl && ctl.stop(); layer.remove(); }
    };
  };
  const arbExtra = svg => {
    const els = Array.from(svg.querySelectorAll('.ab-odds')); let t = 0;
    const step = () => { els.forEach(el => { const v = (el.dataset.vals || '').split('|'); if (v[0]) el.textContent = v[Math.floor(Math.random() * v.length)]; }); t = setTimeout(step, 900 + Math.random() * 1200); };
    return { start() { if (!t) step(); }, stop() { clearTimeout(t); t = 0; } };
  };
  const rhExtra = svg => {
    const el = svg.querySelector('.rh-date'), labels = ['open', 'midday', 'close']; let i = 1, t = 0;
    const step = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); if (el) el.textContent = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${labels[i]}`; i = (i + 1) % 3; t = setTimeout(step, 3000); };
    return { start() { if (!t) step(); }, stop() { clearTimeout(t); t = 0; } };
  };
  scenes.devenai = svgScene();
  scenes.holobrain = svgScene();
  scenes.airnote = svgScene();
  scenes.arbfinder = svgScene(arbExtra);
  scenes.robinhood = svgScene(rhExtra);

  /* ── AutoTrader: the real dashboard capture, with a live activity log, a cursor on the equity curve and a pulsing LIVE dot ── */
  const AT_LINE = [[66,150],[70,159],[74,174],[78,200],[82,251],[86,305],[90,326],[94,328],[98,329],[102,328],[106,309],[110,278],[114,248],[118,215],[122,186],[126,180],[130,193],[134,208],[138,212],[142,211],[146,210],[150,211],[154,223],[158,237],[162,236],[166,211],[170,183],[174,178],[178,188],[182,197],[186,199],[190,197],[194,195],[198,196],[202,200],[206,204],[210,203],[214,198],[218,192],[222,195],[226,214],[230,234],[234,246],[238,253],[242,256],[246,257],[250,258],[254,258],[258,251],[262,227],[266,207],[270,219],[274,261],[278,294],[282,284],[286,247],[290,220],[294,219],[298,221],[302,225],[306,230],[310,236],[314,243],[318,256],[322,271],[326,281],[330,279],[334,272],[338,259],[342,224],[346,170],[350,140],[354,150],[358,179],[362,212],[366,258],[370,309],[374,332],[378,299],[382,235],[386,195],[390,182],[394,174],[398,172],[402,175],[406,181],[410,184],[414,175],[418,161],[422,155],[426,157],[430,161],[434,162],[438,153],[442,142],[446,138],[450,154],[454,175],[458,181],[462,163],[466,141],[470,137],[474,180],[478,235],[482,254],[486,257],[490,259],[494,257],[498,240],[502,221],[506,220],[510,254],[514,291],[518,301],[522,301],[526,300],[530,294],[534,258],[538,213],[542,184],[546,165],[550,153],[554,153],[558,161],[562,176],[566,201],[570,241],[574,272],[578,277],[582,276],[586,276]];
  const atY = x => { let i = 1; while (i < AT_LINE.length - 1 && AT_LINE[i][0] < x) i++; const a = AT_LINE[i - 1], b = AT_LINE[i]; return a[1] + (b[1] - a[1]) * clamp((x - a[0]) / ((b[0] - a[0]) || 1), 0, 1); };
  const AT_MSGS = [
    ['INFO', 'scan_agent', 'Scanned 312 markets, 14 candidates'], ['INFO', 'research_agent', 'Fetching NewsAPI results for fed-cut'], ['INFO', 'research_agent', 'Aggregated 23 sources for fed-cut'],
    ['INFO', 'prediction_agent', 'XGBoost + Claude ensemble p=0.79'], ['INFO', 'risk_agent', 'Daily loss limit headroom $84.10'], ['INFO', 'risk_agent', 'Kelly size $22.40 (quarter Kelly)'],
    ['INFO', 'execution_agent', 'DRY RUN buy YES 22.40 @ 0.72'], ['INFO', 'postmortem', 'Post-mortem complete for t7:gold-close'], ['INFO', 'scan_agent', 'New market detected: btc-80k-sep'],
    ['WARN', 'risk_agent', 'Rejected: max open positions'], ['INFO', 'scan_agent', 'Market refresh complete (Polymarket)'], ['INFO', 'prediction_agent', 'Estimated p=0.61 vs market 0.52'],
    ['INFO', 'execution_agent', 'Position opened t13'], ['INFO', 'postmortem', 'Reviewed 3 closed trades'], ['WARN', 'research_agent', 'NewsAPI rate limit, backing off 30s'], ['INFO', 'risk_agent', 'Scanned 312 markets, 14 candidates pass risk']
  ];
  scenes.autotrader = host => {
    const cvs = canvasFor(host), rows = []; let next = 0, seed = 3;
    const p2 = n => String(n).padStart(2, '0');
    const stampAt = ms => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
    for (let i = 0; i < 40; i++) rows.push({ t: stampAt(Date.now() - i * 43000 - (i * 7919) % 20000), m: AT_MSGS[(i * 7) % AT_MSGS.length], born: -1 });
    const fitText = (ctx, s, maxW) => { if (ctx.measureText(s).width <= maxW) return s; let a = s; while (a.length > 1 && ctx.measureText(a + '…').width > maxW) a = a.slice(0, -1); return a + '…'; };
    const draw = t => {
      const ctx = fit(cvs); ctx.clearRect(0, 0, W, H);
      if (t > next) { rows.unshift({ t: stampAt(Date.now()), m: AT_MSGS[seed++ % AT_MSGS.length], born: t }); if (rows.length > 44) rows.length = 44; next = t + 1.2 + Math.random() * 1.8; }
      const X0 = 1222, Y0 = 108, pitch = 24.3;
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(X0, Y0, W - X0, H - Y0);
      const slide = rows[0].born >= 0 ? Math.max(0, 1 - (t - rows[0].born) / .3) : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, W - X0, H - Y0); ctx.clip();
      ctx.font = mono; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i], y = 121 + (i - slide) * pitch; if (y > H + 12) break;
        ctx.globalAlpha = (i === 0 && r.born >= 0) ? clamp((t - r.born) / .4, 0, 1) : 1;
        ctx.fillStyle = '#6b7280'; ctx.fillText(r.t, 1237, y);
        ctx.fillStyle = r.m[0] === 'WARN' ? '#eab308' : '#3b82f6'; ctx.fillText(r.m[0], 1293, y);
        ctx.fillStyle = '#a78bfa'; ctx.fillText(r.m[1], 1335, y);
        if (!r.ax) { r.ax = 1335 + ctx.measureText(r.m[1]).width + 8; r.disp = fitText(ctx, r.m[2], 1592 - r.ax); }
        ctx.fillStyle = '#9ca3af'; ctx.fillText(r.disp, r.ax, y);
      }
      ctx.restore(); ctx.globalAlpha = 1;
      const cx = 66 + ((t * 36) % 524), cy = atY(cx);
      ctx.strokeStyle = 'rgba(74,222,128,.32)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, 116); ctx.lineTo(cx, 398); ctx.stroke();
      ctx.strokeStyle = 'rgba(74,222,128,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 8 + 3 * Math.sin(t * 4), 0, TAU); ctx.stroke();
      ctx.fillStyle = EM; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fill();
      const val = 50 - (cy - 116) / 279 * 100, label = (val >= 0 ? '+' : '−') + Math.abs(val).toFixed(1);
      ctx.font = mono; const lw = ctx.measureText(label).width + 14, lx = cx + 12 + lw > 600 ? cx - 12 - lw : cx + 12, ly = clamp(cy - 11, 118, 376);
      ctx.fillStyle = '#101510'; roundRect(ctx, lx, ly, lw, 22, 6); ctx.fill(); ctx.strokeStyle = 'rgba(74,222,128,.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = EM; ctx.fillText(label, lx + 7, ly + 11);
      ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(1554, 17, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(52,195,141,${(.4 + .6 * (.5 + .5 * Math.sin(t * 3.2))).toFixed(3)})`; ctx.beginPath(); ctx.arc(1554, 17, 4, 0, TAU); ctx.fill();
    };
    const l = loop(draw);
    return { start: l.start, stop: l.stop, destroy() { l.stop(); cvs.remove(); } };
  };

  /* ── Lattice: a top-down fleet controller. Robots plan paths through the aisles, wait for each other,
        get rerouted around spills, and the MuJoCo render sits in the corner as the physics view. ── */
  scenes.lattice = host => {
    const cvs = canvasFor(host), base = host.querySelector('img');
    const COLS = 32, ROWS = 20, CELL = 50, R0 = 3, R1 = 12;
    const RACKS = [[4, 5], [9, 10], [14, 15], [19, 20], [24, 25]], AISLES = [2, 7, 12, 17, 22];
    const grid = new Uint8Array(COLS * ROWS);
    const idx = (c, r) => r * COLS + c;
    RACKS.forEach(([a, b]) => { for (let c = a; c <= b; c++) for (let r = R0; r <= R1; r++) grid[idx(c, r)] = 1; });
    for (let c = 21; c < COLS; c++) for (let r = 13; r < ROWS; r++) grid[idx(c, r)] = 2;
    const free = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && !grid[idx(c, r)];
    const picks = []; RACKS.forEach(([a, b]) => { for (let r = R0; r <= R1; r++) { picks.push({ c: a - 1, r }); picks.push({ c: b + 1, r }); } });
    const docks = []; for (let c = 8; c <= 17; c++) docks.push({ c, r: 17 });
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const slots = []; RACKS.forEach(([a, b]) => { for (let r = R0; r <= R1; r++) for (let c = a; c <= b; c++) if (rnd() < .55) slots.push({ c, r, k: rnd() }); });
    const obstacles = [], robots = [], occ = new Map();
    const bfs = (from, to, avoid) => {
      const start = idx(from.c, from.r), goal = idx(to.c, to.r); if (start === goal) return [];
      const prev = new Int32Array(COLS * ROWS).fill(-1), q = [start]; prev[start] = start;
      for (let h = 0; h < q.length; h++) {
        const cur = q[h], c = cur % COLS, r = (cur - c) / COLS;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
          const ni = idx(nc, nr); if (prev[ni] !== -1) continue;
          if (ni !== goal && (grid[ni] || (avoid && avoid.has(ni)))) continue;
          prev[ni] = cur;
          if (ni === goal) { const path = []; let k = ni; while (k !== start) { path.push({ c: k % COLS, r: Math.floor(k / COLS) }); k = prev[k]; } return path.reverse(); }
          q.push(ni);
        }
      }
      return null;
    };
    [[2, 1], [7, 1], [12, 1], [17, 1], [22, 1], [27, 1], [2, 16], [7, 16]].forEach(([c, r], i) => robots.push({ id: i + 1, c, r, x: c, y: r, path: [], next: null, target: null, state: 'idle', carrying: false, wait: 0, timer: .4 + i * .35, flag: 0, msg: '', heading: 0 }));
    let deliveries = 0, exceptions = 0, nextObstacle = 5;
    const obstacleSet = () => new Set(obstacles.map(o => idx(o.c, o.r)));
    const origin = rb => rb.next || rb;
    const goPick = rb => { const p = picks[Math.floor(Math.random() * picks.length)]; rb.target = { c: p.c, r: p.r }; rb.state = 'toPick'; rb.path = bfs(origin(rb), rb.target, obstacleSet()) || []; };
    const goDock = rb => { const d = docks[Math.floor(Math.random() * docks.length)]; rb.target = { c: d.c, r: d.r }; rb.state = 'toDock'; rb.path = bfs(origin(rb), rb.target, obstacleSet()) || []; };
    const flag = (rb, msg) => { rb.flag = 2.4; rb.msg = msg; exceptions++; };
    const step = dt => {
      nextObstacle -= dt;
      if (nextObstacle <= 0) {
        nextObstacle = 7 + Math.random() * 5;
        const c = AISLES[Math.floor(Math.random() * AISLES.length)], r = R0 + 1 + Math.floor(Math.random() * (R1 - R0 - 1));
        if (free(c, r) && !occ.has(idx(c, r))) {
          obstacles.push({ c, r, until: 9 });
          robots.forEach(rb => { if (rb.path.some(p => p.c === c && p.r === r)) { const np = bfs(origin(rb), rb.target, obstacleSet()); if (np) { rb.path = np; flag(rb, 'spill ahead · rerouted'); } } });
        }
      }
      for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].until -= dt; if (obstacles[i].until <= 0) obstacles.splice(i, 1); }
      occ.clear(); robots.forEach(rb => { occ.set(idx(rb.c, rb.r), rb.id); if (rb.next) occ.set(idx(rb.next.c, rb.next.r), rb.id); });
      robots.forEach(rb => {
        rb.flag = Math.max(0, rb.flag - dt);
        if (rb.state === 'idle') { rb.timer -= dt; if (rb.timer <= 0) goPick(rb); return; }
        if (rb.state === 'loading' || rb.state === 'unloading') {
          rb.timer -= dt;
          if (rb.timer <= 0) { if (rb.state === 'loading') { rb.carrying = true; goDock(rb); } else { rb.carrying = false; deliveries++; rb.state = 'idle'; rb.timer = .3 + Math.random() * .8; } }
          return;
        }
        if (!rb.next) {
          if (!rb.path.length) { rb.state = rb.state === 'toPick' ? 'loading' : 'unloading'; rb.timer = .7; return; }
          const n = rb.path[0], ni = idx(n.c, n.r), holder = occ.get(ni), obs = obstacles.some(o => o.c === n.c && o.r === n.r);
          if ((holder && holder !== rb.id) || obs) {
            rb.wait += dt;
            if (rb.wait > 3.5) { rb.wait = 0; (rb.state === 'toPick' ? goPick : goDock)(rb); return; }
            if (rb.wait > 1.1) {
              const avoid = obstacleSet(); robots.forEach(o => { if (o !== rb) { avoid.add(idx(o.c, o.r)); if (o.next) avoid.add(idx(o.next.c, o.next.r)); } });
              const np = bfs(rb, rb.target, avoid); if (np) { rb.path = np; flag(rb, 'blocked · rerouted'); }
              rb.wait = 0;
            }
            return;
          }
          rb.wait = 0; rb.next = rb.path.shift(); occ.set(ni, rb.id);
        }
        const speed = 3.4, dx = rb.next.c - rb.x, dy = rb.next.r - rb.y, dist = Math.hypot(dx, dy), stepLen = speed * dt;
        if (dist <= stepLen) { rb.x = rb.c = rb.next.c; rb.y = rb.r = rb.next.r; rb.next = null; }
        else { rb.x += dx / dist * stepLen; rb.y += dy / dist * stepLen; rb.heading = Math.atan2(dy, dx); }
      });
    };
    const draw = (t, dt) => {
      step(dt);
      const ctx = fit(cvs);
      ctx.fillStyle = '#0a110b'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(74,222,128,.06)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let c = 0; c <= COLS; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); }
      for (let r = 0; r <= ROWS; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); }
      ctx.stroke();
      ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(74,222,128,.35)'; ctx.lineWidth = 2; roundRect(ctx, 8 * CELL - 10, 17 * CELL - 10, 10 * CELL + 20, CELL + 20, 10); ctx.stroke(); ctx.setLineDash([]);
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; spacing(ctx, '2px');
      ctx.fillStyle = 'rgba(74,222,128,.6)'; ctx.font = `600 15px ${grotesk}`; ctx.fillText('DOCK', 8 * CELL, 18.75 * CELL);
      RACKS.forEach(([a, b]) => {
        const x = a * CELL + 4, y = R0 * CELL + 4, w = (b - a + 1) * CELL - 8, h = (R1 - R0 + 1) * CELL - 8;
        ctx.fillStyle = '#16261a'; roundRect(ctx, x, y, w, h, 8); ctx.fill(); ctx.strokeStyle = 'rgba(74,222,128,.28)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); for (let r = R0 + 1; r <= R1; r++) { ctx.moveTo(x, r * CELL); ctx.lineTo(x + w, r * CELL); } ctx.stroke();
      });
      slots.forEach(sl => { ctx.fillStyle = `rgba(227,196,138,${(.45 + sl.k * .45).toFixed(2)})`; roundRect(ctx, sl.c * CELL + 13, sl.r * CELL + 13, 24, 24, 4); ctx.fill(); });
      obstacles.forEach(o => {
        const x = o.c * CELL + 25, y = o.r * CELL + 25, pulse = .5 + .5 * Math.sin(t * 5);
        ctx.strokeStyle = `rgba(245,158,11,${(.25 + .5 * pulse).toFixed(2)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 16 + 6 * pulse, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#f59e0b'; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -9, 18, 18); ctx.restore();
      });
      robots.forEach(rb => {
        const pts = rb.next ? [rb.next, ...rb.path] : rb.path; if (!pts.length) return;
        ctx.fillStyle = rb.carrying ? 'rgba(74,222,128,.38)' : 'rgba(74,222,128,.2)';
        pts.forEach(p => { ctx.beginPath(); ctx.arc(p.c * CELL + 25, p.r * CELL + 25, 3, 0, TAU); ctx.fill(); });
      });
      robots.forEach(rb => {
        const x = rb.x * CELL + 25, y = rb.y * CELL + 25;
        if (rb.flag > 0) { ctx.strokeStyle = `rgba(245,158,11,${(.35 + .5 * Math.pow(Math.sin(t * 8), 2)).toFixed(2)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.stroke(); }
        ctx.save(); ctx.translate(x, y); ctx.rotate(rb.heading);
        ctx.fillStyle = rb.flag > 0 ? '#f59e0b' : EM; roundRect(ctx, -17, -17, 34, 34, 7); ctx.fill();
        ctx.fillStyle = '#052e16'; ctx.fillRect(6, -6, 8, 12); ctx.restore();
        if (rb.carrying) { ctx.fillStyle = '#e3c48a'; roundRect(ctx, x - 11, y - 11, 22, 22, 4); ctx.fill(); }
        spacing(ctx, '0px'); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `600 13px ${grotesk}`; ctx.textAlign = 'center'; ctx.fillText('R' + rb.id, x, y - 29);
        if (rb.flag > 0) {
          const msg = `R${rb.id} · ${rb.msg}`; ctx.font = `600 14px ${grotesk}`; const w = ctx.measureText(msg).width + 18, bx = clamp(x - w / 2, 8, W - w - 8), by = y - 64;
          ctx.fillStyle = 'rgba(8,12,8,.92)'; roundRect(ctx, bx, by, w, 26, 8); ctx.fill(); ctx.strokeStyle = 'rgba(245,158,11,.6)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'left'; ctx.fillText(msg, bx + 9, by + 13);
        }
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(8,12,8,.78)'; roundRect(ctx, 24, 20, 520, 76, 14); ctx.fill(); ctx.strokeStyle = 'rgba(74,222,128,.25)'; ctx.lineWidth = 1; ctx.stroke();
      spacing(ctx, '2.5px'); ctx.fillStyle = '#9ca3af'; ctx.font = `600 14px ${grotesk}`; ctx.fillText('LATTICE · FLEET CONTROL', 42, 42);
      spacing(ctx, '0px'); ctx.fillStyle = '#fff'; ctx.font = `500 20px ${grotesk}`; ctx.fillText(`${robots.length} robots  ·  ${deliveries} delivered  ·  ${exceptions} exceptions handled`, 42, 73);
      if (base && base.complete && base.naturalWidth) {
        const iw = 440, ih = 275, ix = W - iw - 28, iy = H - ih - 28;
        ctx.save(); roundRect(ctx, ix, iy, iw, ih, 14); ctx.clip(); ctx.drawImage(base, ix, iy, iw, ih); ctx.restore();
        roundRect(ctx, ix, iy, iw, ih, 14); ctx.strokeStyle = 'rgba(74,222,128,.45)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(8,12,8,.82)'; roundRect(ctx, ix + 12, iy + 12, 196, 26, 8); ctx.fill();
        spacing(ctx, '1.5px'); ctx.fillStyle = '#bbf7d0'; ctx.font = `600 12px ${grotesk}`; ctx.fillText('MUJOCO · PHYSICS VIEW', ix + 22, iy + 25); spacing(ctx, '0px');
      }
    };
    const l = loop(draw);
    return { start: l.start, stop: l.stop, destroy() { l.stop(); cvs.remove(); } };
  };

  /* ── QAT: walk-forward sweep over the prediction chart, revealing the lines with a cursor and a value card ── */
  const QAT = {"x0":270,"step":4,"blue":[466,465,464,464,464,465,464,464,464,464,464,464,463,463,463,463,463,462,462,462,462,462,462,462,462,464,468,472,476,478,490,501,512,522,535,547,560,574,588,602,615,625,638,650,663,672,678,687,687,687,687,687,686,679,671,662,654,641,626,610,597,582,566,552,534,519,505,492,478,463,455,446,438,433,431,430,430,430,430,431,432,434,435,436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,453,453,454,454,453,453,453,453,452,452,451,451,450,450,449,449,449,449,449,450,450,450,450,450,450,449,449,450,449,449,449,449,448,449,449,450,450,451,452,452,452,452,452,451,451,451,451,451,451,451,451,450,450,450,450,450,450,450,450,450,449,449,449,448,448,448,447,446,446,446,446,446,446,447,446,446,446,447,447,446,446,447,447,446,447,446,447,446,447,447,447,447,448,448,448,448,448,448,448,448,448,448,448,448,448,448,448,447,447,447,447,447,447,447,447,446,447,446,447,446,446,446,446,446,446,447,446,446,446,446,446,446,446,445,444,443,443,442,442,442,442,442,442,442,442,442,442,442,442,442,442,442,442,443,443,443,444,444,444,444,445,445,445,446,446,446,446,446,447,448,448,448,449,449],"dark":[466,474,465,470,468,466,453,463,457,460,463,456,459,454,452,452,456,449,450,448,450,446,446,446,449,445,453,445,445,445,453,498,446,520,490,496,559,574,589,604,614,628,548,650,447,560,566,566,447,448,448,690,449,564,562,662,650,452,625,610,595,579,564,548,533,517,502,475,470,464,456,465,465,466,453,466,465,465,453,464,458,462,435,460,456,457,455,448,452,445,450,448,447,446,444,448,442,453,441,454,441,448,441,448,442,442,442,453,444,448,444,452,446,447,447,448,448,450,450,450,452,450,451,450,451,451,451,450,452,450,452,450,451,450,448,449,450,450,446,448,445,451,443,451,442,451,442,446,441,446,441,446,447,451,442,451,442,447,444,450,444,449,446,448,447,447,448,448,449,450,450,450,451,450,452,448,452,451,451,448,452,451,452,451,452,450,450,450,451,450,451,449,451,449,451,449,450,450,451,449,451,448,451,448,452,450,451,450,452,448,452,450,453,448,453,450,454,454,454,454,454,455,455,455,455,455,455,450,455,455,454,450,454,450,454,449,453,448,452,448,452,448,452,447,451,446,451,446,451,450,450,450,451,446,451,443,451,443,451,447,452,451,452,445,452,448,452,452,453,453,453,453,454,454,454,452]};
  const qatY = (arr, x) => { const f = (x - QAT.x0) / QAT.step, i = clamp(Math.floor(f), 0, arr.length - 2), k = clamp(f - i, 0, 1); return arr[i] + (arr[i + 1] - arr[i]) * k; };
  scenes.quantum = host => {
    const cvs = canvasFor(host), PX0 = 270, PX1 = 1370, PY0 = 372, PY1 = 700, CY = 10;
    const val = y => 9 - (y - 375) / 325 * 36, fmt = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%';
    const ui = w => `${w} 15px system-ui, -apple-system, "Segoe UI", Inter, sans-serif`;
    const draw = t => {
      const ctx = fit(cvs); ctx.clearRect(0, 0, W, H);
      const ph = t % CY; let prog = ph < 7 ? ease(ph / 7) : 1, cover = 1;
      if (ph >= 9) { prog = 0; cover = clamp((ph - 9) / .6, 0, 1); }
      const cx = PX0 + (PX1 - PX0) * prog;
      ctx.globalAlpha = cover; ctx.fillStyle = '#f8f5ee'; ctx.fillRect(cx, PY0, PX1 - cx + 1, PY1 - PY0);
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      [[375, '#e9e5df'], [453, '#b9b6af'], [535, '#e9e5df'], [617, '#e9e5df']].forEach(([y, col]) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(cx, y + .5); ctx.lineTo(PX1, y + .5); ctx.stroke(); });
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (prog > 0 && prog < 1) {
        const by = qatY(QAT.blue, cx), dy = qatY(QAT.dark, cx);
        ctx.strokeStyle = 'rgba(90,87,81,.55)'; ctx.beginPath(); ctx.moveTo(cx + .5, PY0); ctx.lineTo(cx + .5, PY1); ctx.stroke();
        ctx.fillStyle = '#5a5751'; ctx.beginPath(); ctx.arc(cx, dy, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4e7dc4'; ctx.beginPath(); ctx.arc(cx, by, 5.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        const rows = [['Actual', fmt(val(dy)), '#5a5751'], ['Classical', fmt(val(by)), '#4e7dc4']], tw = 176, th = 62;
        const tx = cx + 16 + tw > PX1 ? cx - 16 - tw : cx + 16, ty = clamp(Math.min(by, dy) - th - 14, PY0 + 6, PY1 - th - 6);
        ctx.fillStyle = '#fff'; roundRect(ctx, tx, ty, tw, th, 10); ctx.fill(); ctx.strokeStyle = '#e2ddd5'; ctx.lineWidth = 1; ctx.stroke();
        ctx.textBaseline = 'middle';
        rows.forEach((r, i) => {
          const y = ty + 20 + i * 24;
          ctx.fillStyle = r[2]; ctx.beginPath(); ctx.arc(tx + 16, y, 4, 0, TAU); ctx.fill();
          ctx.fillStyle = '#5b5852'; ctx.textAlign = 'left'; ctx.font = ui(500); ctx.fillText(r[0], tx + 28, y);
          ctx.fillStyle = '#1f1d1a'; ctx.textAlign = 'right'; ctx.font = ui(600); ctx.fillText(r[1], tx + tw - 14, y);
        });
        ctx.textAlign = 'left';
      }
    };
    const l = loop(draw);
    return { start: l.start, stop: l.stop, destroy() { l.stop(); cvs.remove(); } };
  };

  /* ── RealEstatePro: the full page capture scrolls through the window ── */
  scenes.realestatepro = host => {
    const layer = layerFor(host), img = new Image(); img.decoding = 'async'; img.alt = ''; img.className = 'live-scroll'; img.src = 'assets/projects/realestatepro-full.jpg'; layer.appendChild(img);
    let anim = null, want = false;
    const build = () => {
      if (anim) { anim.cancel(); anim = null; }
      const hh = layer.clientHeight, ih = img.clientHeight; if (!hh || ih <= hh + 4) return;
      anim = img.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${hh - ih}px)` }], { duration: 8000 + (ih - hh) * 5, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: 900 });
      if (!want) anim.pause();
    };
    img.addEventListener('load', build);
    const ro = new ResizeObserver(() => { if (img.complete && img.naturalWidth) build(); }); ro.observe(layer);
    return { start() { want = true; anim && anim.play(); }, stop() { want = false; anim && anim.pause(); }, destroy() { ro.disconnect(); anim && anim.cancel(); layer.remove(); } };
  };

  /* ── Registry: one controller per window host ── */
  const mounted = new WeakMap(), active = new Set();
  const attach = (host, p) => {
    if (!enabled || !host || !p || !scenes[p.id]) return null;
    let m = mounted.get(host);
    if (!m) { try { m = { ctl: scenes[p.id](host, p), running: false }; } catch (e) { return null; } mounted.set(host, m); }
    return m;
  };
  const start = (host, p) => { const m = attach(host, p); if (!m || m.running) return; m.running = true; active.add(m); if (!document.hidden) m.ctl.start(); };
  const stop = host => { const m = host && mounted.get(host); if (!m || !m.running) return; m.running = false; active.delete(m); m.ctl.stop(); };
  const destroy = host => { const m = host && mounted.get(host); if (!m) return; stop(host); m.ctl.destroy(); mounted.delete(host); };
  const focus = (hosts, projects, i) => hosts.forEach((h, k) => { if (!h) return; if (k === i) start(h, projects[k]); else { stop(h); if (Math.abs(k - i) === 1) attach(h, projects[k]); } });
  document.addEventListener('visibilitychange', () => active.forEach(m => document.hidden ? m.ctl.stop() : m.ctl.start()));
  window.LiveWindows = { enabled, has: id => !!scenes[id], attach, start, stop, destroy, focus };
})();
