/* ASA Jeopardy — motion & effects.
 * Every trajectory is computed from closed-form kinematics and sampled into Web Animations keyframes.
 *   Ballistic (no drag):  x(t) = x0 + vx·t,   y(t) = y0 + vy·t + ½·g·t²         (y grows downward)
 *   Linear drag k:        v' = g − k·v  ⇒  y(t) = y0 + (g/k)·t + (vy − g/k)(1 − e^(−k·t))/k
 *                                          x(t) = x0 + vx(1 − e^(−k·t))/k
 *   Damped wobble:        θ(t) = A·e^(−t/τ)·sin(ω·t)
 */
(function () {
  'use strict';
  const layer = document.createElement('div');
  layer.className = 'fx-layer';
  document.body.appendChild(layer);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAL = ['#e6a92b', '#de3a2e', '#3b4db3', '#2a8a96', '#4e9a3f', '#c8612c', '#8a4fb3', '#ffd84d', '#ffffff'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, u) => a + (b - a) * u;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const snd = k => { if (window.Craft) Craft.Sound.play(k); };
  const STAR = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill="currentColor" stroke="#1c1a17" stroke-width="1.2"/></svg>';
  let shakeTarget = null, binAnchor = null;

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, left: r.left };
  }
  function add(cls, html) {
    const el = document.createElement('div');
    el.className = cls;
    if (html) el.innerHTML = html;
    layer.appendChild(el);
    return el;
  }
  function restart(el, cls, ms = 700) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    clearTimeout(el['_t' + cls]);
    el['_t' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }

  /* ---------- sparkles: ballistic stars that twinkle ---------- */
  function sparkles(x, y, o = {}) {
    if (reduce) return;
    const n = o.count || 22, g = o.gravity ?? 1100, colors = o.colors || PAL;
    for (let i = 0; i < n; i++) {
      const s = rnd(10, 26) * (o.size || 1);
      const el = add('spark', Math.random() < 0.75 ? STAR : '<svg viewBox="0 0 10 10" width="100%" height="100%"><circle cx="5" cy="5" r="4" fill="currentColor"/></svg>');
      el.style.width = el.style.height = s + 'px';
      el.style.color = pick(colors);
      const th = rnd(0, Math.PI * 2), v = rnd(240, 640) * (o.power || 1);
      const vx = Math.cos(th) * v, vy = Math.sin(th) * v - rnd(120, 320) * (o.power || 1);
      const T = rnd(0.7, 1.25), spin = rnd(-540, 540), ph = rnd(0, 6);
      const kf = [];
      for (let k = 0; k <= 20; k++) {
        const u = k / 20, t = u * T;
        const px = x + vx * t - s / 2, py = y + vy * t + 0.5 * g * t * t - s / 2;
        const sc = u < 0.12 ? u / 0.12 : 1 - (u - 0.12) / 0.88 * 0.65;
        const op = (1 - u * u) * (0.55 + 0.45 * Math.abs(Math.sin(u * 14 + ph)));
        kf.push({ transform: `translate(${px}px,${py}px) rotate(${spin * u}deg) scale(${sc})`, opacity: op });
      }
      el.animate(kf, { duration: T * 1000, easing: 'linear', delay: o.delay ? rnd(0, o.delay) : 0, fill: 'both' }).onfinish = () => el.remove();
    }
  }

  /* ---------- confetti: paper scraps with linear air drag and sway ---------- */
  function confetti(x, y, o = {}) {
    if (reduce) return;
    const n = o.count || 70, ang = o.angle ?? -Math.PI / 2, spread = o.spread ?? Math.PI * 0.8;
    for (let i = 0; i < n; i++) {
      const w = rnd(7, 13), h = rnd(10, 18);
      const el = add('confetto');
      el.style.width = w + 'px'; el.style.height = h + 'px';
      el.style.background = pick(PAL.slice(0, 8));
      el.style.clipPath = `polygon(0 ${rnd(0, 20)}%,100% 0,${rnd(85, 100)}% 100%,0 100%)`;
      const th = ang + rnd(-spread / 2, spread / 2), v0 = (o.speed ? rnd(o.speed[0], o.speed[1]) : rnd(700, 1300)) * (o.power || 1);
      const vx = Math.cos(th) * v0, vy = Math.sin(th) * v0;
      const k = rnd(2.2, 3.4), g = rnd(380, 520), A = rnd(10, 30), om = rnd(5, 10), ph = rnd(0, 6);
      const T = rnd(2.4, 3.6), rz = rnd(-720, 720), rx = rnd(540, 1440);
      const x0 = o.x0 ? o.x0() : x, y0 = o.y0 ? o.y0() : y;
      const kf = [];
      for (let s = 0; s <= 30; s++) {
        const u = s / 30, t = u * T, e = 1 - Math.exp(-k * t);
        const px = x0 + vx * e / k + A * Math.sin(om * t + ph) * e;
        const py = y0 + (g / k) * t + (vy - g / k) * e / k;
        kf.push({ transform: `translate(${px}px,${py}px) rotate(${rz * u}deg) rotateX(${rx * u}deg)`, opacity: u > 0.8 ? (1 - u) / 0.2 : 1 });
      }
      el.animate(kf, { duration: T * 1000, delay: o.delay ? rnd(0, o.delay) : 0, easing: 'linear', fill: 'both' }).onfinish = () => el.remove();
    }
  }
  function rain(n = 140) {
    confetti(0, 0, { count: n, angle: Math.PI / 2, spread: 0.6, speed: [20, 160], delay: 900, x0: () => rnd(0, innerWidth), y0: () => rnd(-60, -20) });
  }
  function celebrate() {
    snd('fanfare');
    rain(160);
    confetti(0, innerHeight, { count: 60, angle: -Math.PI / 3, spread: 0.7, power: 1.2 });
    confetti(innerWidth, innerHeight, { count: 60, angle: -2 * Math.PI / 3, spread: 0.7, power: 1.2 });
  }

  /* ---------- floating points ---------- */
  function float(x, y, text, color) {
    if (reduce) return;
    const el = add('float-pts block stroke');
    el.textContent = text;
    el.style.color = color || '#fff';
    const T = 'translate(-50%,-50%)';
    el.animate([
      { transform: `translate(${x}px,${y}px) ${T} scale(.3)`, opacity: 0 },
      { transform: `translate(${x}px,${y - 34}px) ${T} scale(1.35) rotate(-6deg)`, opacity: 1, offset: 0.22 },
      { transform: `translate(${x}px,${y - 62}px) ${T} scale(1) rotate(3deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${x}px,${y - 112}px) ${T} scale(.9)`, opacity: 0 }
    ], { duration: 1400, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => el.remove();
  }

  /* ---------- number roll: easeOutCubic f(u)=1−(1−u)³ ---------- */
  function countUp(el, from, to, ms = 800) {
    if (!el) return;
    const t0 = performance.now(), id = (el._cu = (el._cu || 0) + 1);
    const step = now => {
      if (el._cu !== id) return;
      const u = Math.min(1, (now - t0) / ms), f = 1 - Math.pow(1 - u, 3);
      el.textContent = Math.round(from + (to - from) * f);
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- crayon X scribble ---------- */
  function writeX(target) {
    if (reduce || !target) return;
    const c = centerOf(target), s = Math.min(c.w, c.h) * 0.9;
    const el = add('', `<svg viewBox="0 0 100 100" width="${s}" height="${s}" style="filter:url(#crayon)"><path d="M14 16 L86 84" stroke="#de3a2e" stroke-width="13" stroke-linecap="round" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><path d="M84 14 L18 88" stroke="#de3a2e" stroke-width="13" stroke-linecap="round" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`);
    el.style.transform = `translate(${c.x - s / 2}px,${c.y - s / 2}px)`;
    const [a, b] = el.querySelectorAll('path');
    a.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 180, fill: 'forwards' });
    b.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 180, delay: 160, fill: 'forwards' });
    el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1100 }).onfinish = () => el.remove();
  }

  /* ---------- score change on a team tile ---------- */
  function scoreChange(tile, scoreEl, from, to) {
    const d = to - from;
    countUp(scoreEl, from, to);
    if (scoreEl) scoreEl.classList.toggle('neg', to < 0);
    if (!tile || !d) return;
    const c = centerOf(tile);
    float(c.x, c.top, (d > 0 ? '+' : '−') + Math.abs(d), d > 0 ? '#ffd84d' : '#ff6b5e');
    if (d > 0) {
      restart(tile, 'squash', 650);
      sparkles(c.x, c.y, { count: 18, colors: ['#ffd84d', '#fff', getComputedStyle(tile).getPropertyValue('--c').trim() || '#e6a92b'] });
    } else {
      restart(tile, 'shake', 550);
      writeX(tile);
    }
  }

  /* ---------- open a popup by flying it out of a tile ---------- */
  function flipIn(wrap, fromEl) {
    if (reduce) return;
    const to = wrap.getBoundingClientRect();
    const fr = fromEl && fromEl.getBoundingClientRect();
    snd('swish');
    if (fr && fr.width) {
      const dx = (fr.left + fr.width / 2) - (to.left + to.width / 2), dy = (fr.top + fr.height / 2) - (to.top + to.height / 2);
      wrap.animate([
        { transform: `translate(${dx}px,${dy}px) scale(${fr.width / to.width},${fr.height / to.height}) rotate(-8deg)`, opacity: 0.5 },
        { transform: 'translate(0,0) scale(1.05,.96) rotate(1.5deg)', opacity: 1, offset: 0.68 },
        { transform: 'scale(.99,1.02) rotate(-.5deg)', offset: 0.85 },
        { transform: 'none', opacity: 1 }
      ], { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1)' });
    } else {
      wrap.animate([
        { transform: 'translateY(-110vh) rotate(-14deg)' },
        { transform: 'translateY(18px) rotate(2deg)', offset: 0.7 },
        { transform: 'translateY(-6px) rotate(-1deg)', offset: 0.86 },
        { transform: 'none' }
      ], { duration: 750, easing: 'cubic-bezier(.3,.7,.4,1)' });
    }
  }

  /* ---------- crumple + toss into the wastebasket ---------- */
  function parsePoly(s) {
    const out = [], re = /(-?[\d.]+)%\s+(-?[\d.]+)%/g;
    let m;
    while ((m = re.exec(s || ''))) out.push([+m[1], +m[2]]);
    return out;
  }
  const poly = pts => `polygon(${pts.map(p => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(',')})`;
  /* N points on a jittered circle of radius R = 0.46·min(w,h), expressed in % of the box so it stays round,
   * starting at −3π/4 (top-left) and running clockwise to match the torn-rectangle ordering. */
  function blobPts(N, w, h) {
    const R = Math.min(w, h) * 0.46, pts = [];
    for (let k = 0; k < N; k++) {
      const th = -3 * Math.PI / 4 + 2 * Math.PI * k / N, rho = rnd(0.78, 1);
      pts.push([50 + (R / w) * 100 * rho * Math.cos(th), 50 + (R / h) * 100 * rho * Math.sin(th)]);
    }
    return pts;
  }

  let bin = null, binUsers = 0;
  function getBin() {
    if (!bin) {
      const art = `<defs><pattern id="wv" width="14" height="12" patternUnits="userSpaceOnUse"><rect width="14" height="12" fill="#c8873f"/><path d="M0 3h14M0 9h14" stroke="#9c6228" stroke-width="3"/><path d="M3 0v6M10 6v6" stroke="#e8b06a" stroke-width="4"/></pattern></defs>`;
      bin = {
        back: add('', `<svg viewBox="0 0 150 170" width="100%" height="100%"><ellipse cx="75" cy="22" rx="66" ry="16" fill="#3d2a18" stroke="#1c1a17" stroke-width="4"/><ellipse cx="75" cy="26" rx="56" ry="10" fill="#2a1c10"/></svg>`),
        front: add('', `<svg viewBox="0 0 150 170" width="100%" height="100%" style="overflow:visible">${art}<path d="M9 22 A66 16 0 0 0 141 22 L128 158 Q75 172 22 158 Z" fill="url(#wv)" stroke="#1c1a17" stroke-width="4"/><path d="M9 22 A66 16 0 0 0 141 22" fill="none" stroke="#8a5a26" stroke-width="8"/><path d="M9 22 A66 16 0 0 0 141 22" fill="none" stroke="#1c1a17" stroke-width="2.5"/><path d="M30 60 Q75 70 120 60M28 100 Q75 110 122 100M26 136 Q75 146 124 136" fill="none" stroke="#7a4a1c" stroke-width="3" opacity=".7"/></svg>`)
      };
      bin.back.style.zIndex = 1; bin.front.style.zIndex = 3;
      for (const el of [bin.back, bin.front]) { el.style.display = 'none'; el.style.transformOrigin = '50% 100%'; }
    }
    const W = (binAnchor ? binAnchor.clientWidth : innerWidth) < 600 ? 104 : 150, k = W / 150, H = 170 * k;
    const box = binAnchor ? binAnchor.getBoundingClientRect() : { right: innerWidth, bottom: innerHeight };
    Object.assign(bin, { W, H, mouthY: 24 * k, x: box.right - W - 18, y: box.bottom - H - 6 });
    for (const el of [bin.back, bin.front]) Object.assign(el.style, { width: W + 'px', height: H + 'px', left: bin.x + 'px', top: bin.y + 'px' });
    return bin;
  }
  function binMove(fromY, toY, ms, easing) {
    const b = getBin();
    for (const el of [b.back, b.front]) {
      el.style.display = 'block';
      const out = toY > fromY;
      el.animate([{ transform: `translateY(${fromY}px)`, opacity: out ? 1 : 0 }, { transform: `translateY(${toY}px)`, opacity: out ? 0 : 1 }], { duration: ms, easing, fill: 'forwards' });
    }
  }
  function wobbleBin() {
    const b = getBin(), A = 8, tau = 0.16, om = 2 * Math.PI * 4.5, T = 0.7, kf = [];
    for (let i = 0; i <= 24; i++) { const t = T * i / 24; kf.push({ transform: `rotate(${A * Math.exp(-t / tau) * Math.sin(om * t)}deg)` }); }
    for (const el of [b.back, b.front]) el.animate(kf, { duration: T * 1000, composite: 'add' });
  }
  function makeBall(D) {
    const el = add('paper-ball');
    el.style.width = el.style.height = D + 'px';
    el.style.setProperty('--clip', poly(blobPts(22, 100, 100).map(p => [p[0] + (p[0] - 50) * 0.08, p[1] + (p[1] - 50) * 0.08])));
    return el;
  }
  /* Apex-height parametrization: choose peak height H above the start, so v_y0 = −√(2gH);
   * flight time solves ½gT² + v_y0·T − Δy = 0 (descending root); v_x = Δx / T. */
  async function tossToBin(ball, from, D) {
    const b = getBin();
    if (binUsers++ === 0) binMove(b.H + 40, 0, 420, 'cubic-bezier(.34,1.56,.64,1)');
    await sleep(160);
    const to = { x: b.x + b.W / 2, y: b.y + b.mouthY };
    ball.style.zIndex = 4;
    const g = 2600, H = Math.max(160, from.y - to.y + 120), vy = -Math.sqrt(2 * g * H);
    const T = (-vy + Math.sqrt(vy * vy + 2 * g * (to.y - from.y))) / g, vx = (to.x - from.x) / T;
    const spin = rnd(480, 760) * (vx >= 0 ? 1 : -1), kf = [];
    for (let i = 0; i <= 36; i++) {
      const u = i / 36, t = u * T;
      kf.push({ transform: `translate(${from.x + vx * t - D / 2}px,${from.y + vy * t + 0.5 * g * t * t - D / 2}px) rotate(${spin * u}deg) scale(${1 - 0.22 * u})` });
    }
    snd('swish');
    await ball.animate(kf, { duration: T * 1000, easing: 'linear', fill: 'forwards' }).finished;
    ball.style.zIndex = 2;
    await ball.animate([
      { transform: `translate(${to.x - D / 2}px,${to.y - D / 2}px) rotate(${spin}deg) scale(.78)` },
      { transform: `translate(${to.x - D / 2}px,${to.y - D / 2 + D * 0.9}px) rotate(${spin + 50}deg) scale(.7)` }
    ], { duration: 210, easing: 'ease-in', fill: 'forwards' }).finished;
    ball.remove();
    wobbleBin();
    snd('thud');
    sparkles(to.x, to.y, { count: 8, colors: ['#bdb6a8', '#e8e2d4', '#fff'], power: 0.35, size: 0.7 });
    setTimeout(() => { if (--binUsers === 0) binMove(0, b.H + 40, 380, 'ease-in'); }, 650);
  }
  async function crumpleToss(el, o = {}) {
    const r = el.getBoundingClientRect();
    if (reduce || !r.width) { el.style.visibility = 'hidden'; if (o.onCrumpled) o.onCrumpled(); if (!o.keepHidden) el.style.visibility = ''; return; }
    let start = parsePoly(getComputedStyle(el).clipPath);
    if (start.length < 8) start = parsePoly(Craft.torn(null, 14, 1.5));
    const N = start.length, w = r.width, h = r.height;
    const blob = blobPts(N, w, h), R = Math.min(w, h) * 0.46;
    const D = o.D || (innerWidth < 600 ? 64 : 92), s = D / (2 * R);
    const mid = start.map((p, k) => [lerp(p[0], blob[k][0], 0.5) + rnd(-7, 7), lerp(p[1], blob[k][1], 0.5) + rnd(-7, 7)]);
    snd('crumple');
    const crease = el.querySelector(':scope > .crease');
    const ca = crease && crease.animate([{ opacity: 0 }, { opacity: 0.95 }], { duration: 460, fill: 'forwards' });
    const a = el.animate([
      { clipPath: poly(start), transform: 'scale(1) rotate(0deg)', filter: 'contrast(1)' },
      { clipPath: poly(mid), transform: `scale(${(0.55 + s / 2).toFixed(3)}) rotate(-14deg)`, filter: 'contrast(1.25)', offset: 0.5 },
      { clipPath: poly(blob), transform: `scale(${s.toFixed(4)}) rotate(-38deg)`, filter: 'contrast(1.6) brightness(.92)' }
    ], { duration: 560, easing: 'cubic-bezier(.45,0,.7,.6)', fill: 'forwards' });
    await a.finished.catch(() => {});
    el.style.visibility = 'hidden';
    if (o.onCrumpled) o.onCrumpled();
    const ball = makeBall(D);
    const cx = r.left + w / 2, cy = r.top + h / 2;
    ball.style.transform = `translate(${cx - D / 2}px,${cy - D / 2}px) rotate(-38deg)`;
    await tossToBin(ball, { x: cx, y: cy }, D);
    a.cancel(); if (ca) ca.cancel();
    if (!o.keepHidden) el.style.visibility = '';
  }

  /* ---------- slap-down announcement card (then crumpled away) ---------- */
  async function slap(text, o = {}) {
    const wrap = add('lift');
    Object.assign(wrap.style, { left: '50%', top: '44%', transform: 'translate(-50%,-50%)', zIndex: 5 });
    wrap.innerHTML = `<div class="slap paper-big"><div class="crease"></div><div class="big block stroke crayon" style="color:var(${o.color || '--red'})">${Craft.esc(text)}</div>${o.sub ? `<div class="sub">${Craft.esc(o.sub)}</div>` : ''}</div>`;
    const card = wrap.firstChild;
    card.style.setProperty('--clip', Craft.torn(null, 14, 2));
    card.style.position = 'relative';
    if (reduce) { await sleep(o.hold || 1300); wrap.remove(); return; }
    const a = card.animate([
      { transform: 'scale(2.6) rotate(16deg)', opacity: 0 },
      { transform: 'scale(.92) rotate(-4deg)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1.03) rotate(-2deg)', offset: 0.82 },
      { transform: 'scale(1) rotate(-3deg)', opacity: 1 }
    ], { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    setTimeout(() => {
      snd('thud');
      const c = centerOf(card);
      sparkles(c.x - c.w / 2, c.y, { count: 12, power: 0.8 });
      sparkles(c.x + c.w / 2, c.y, { count: 12, power: 0.8 });
      restart(shakeTarget, 'shake', 550);
    }, 330);
    await a.finished;
    await sleep(o.hold || 1300);
    await crumpleToss(card, { keepHidden: true });
    wrap.remove();
  }

  /* ---------- lightning strike ---------- */
  async function lightning() {
    snd('lightning');
    if (reduce) return;
    const flash = add('bolt-flash');
    flash.animate([{ opacity: 0 }, { opacity: 0.95 }, { opacity: 0.1 }, { opacity: 0.8 }, { opacity: 0 }], { duration: 560 }).onfinish = () => flash.remove();
    const size = Math.min(innerWidth * 0.42, 280);
    const bolt = add('', `<svg viewBox="0 0 100 160" width="${size}" height="${size * 1.6}" style="filter:url(#crayon) drop-shadow(0 0 22px #ffd84d)"><path d="M62 2 L18 86 H46 L30 158 L86 64 H56 L78 2 Z" fill="#ffd84d" stroke="#1c1a17" stroke-width="5" stroke-linejoin="round"/></svg>`);
    const x = innerWidth / 2 - size / 2, y = innerHeight * 0.42 - size * 0.8;
    bolt.style.transformOrigin = '50% 0';
    await bolt.animate([
      { transform: `translate(${x}px,${y}px) scaleY(0) rotate(-6deg)`, opacity: 1 },
      { transform: `translate(${x}px,${y}px) scaleY(1.15) rotate(3deg)`, offset: 0.25 },
      { transform: `translate(${x}px,${y}px) scaleY(.95) rotate(-2deg)`, offset: 0.4 },
      { transform: `translate(${x}px,${y}px) scaleY(1) rotate(0deg)`, opacity: 1, offset: 0.8 },
      { transform: `translate(${x}px,${y}px) scale(1.4) rotate(0deg)`, opacity: 0 }
    ], { duration: 1300, easing: 'ease-out' }).finished;
    bolt.remove();
    sparkles(innerWidth / 2, innerHeight * 0.42 + size * 0.7, { count: 26, colors: ['#ffd84d', '#fff', '#e6a92b'], power: 1.2 });
  }

  window.FX = {
    layer, sparkles, confetti, rain, celebrate, float, countUp, writeX, scoreChange, flipIn,
    crumpleToss, slap, lightning, restart, centerOf,
    setShakeTarget: el => { shakeTarget = el; },
    setBinAnchor: el => { binAnchor = el; },
    shake: el => restart(el || shakeTarget, 'shake', 550),
    squash: el => restart(el, 'squash', 650),
    reduce
  };
})();
