/* ASA Jeopardy — shared client helpers: textures, utilities, transport, sound. */
(function () {
  'use strict';

  /* ---------- procedural textures ----------
   * Crumpled paper = turbulence noise used as a height field, lit by a distant light
   * (feDiffuseLighting computes N·L per pixel), then multiplied over the paper color. */
  const svgURL = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  function paper(size, freq, seed, scale, light = 1.12, oct = 5) {
    return svgURL(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='p' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feDiffuseLighting lighting-color='#fff' surfaceScale='${scale}' diffuseConstant='${light}'><feDistantLight azimuth='235' elevation='52'/></feDiffuseLighting></filter><rect width='100%' height='100%' filter='url(#p)'/></svg>`);
  }
  const stitch = svgURL(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='14'><defs><radialGradient id='g' cx='.4' cy='.35'><stop offset='0' stop-color='#fff' stop-opacity='.42'/><stop offset='1' stop-color='#000' stop-opacity='.28'/></radialGradient></defs><ellipse cx='5' cy='6' rx='4.6' ry='2.8' transform='rotate(-38 5 6)' fill='url(#g)'/><ellipse cx='11' cy='6' rx='4.6' ry='2.8' transform='rotate(38 11 6)' fill='url(#g)'/><circle cx='8' cy='12.6' r='1.7' fill='#000' fill-opacity='.45'/></svg>`);
  const rs = document.documentElement.style;
  rs.setProperty('--paper-lg', paper(700, 0.006, 7, 3.2));
  rs.setProperty('--paper-md', paper(600, 0.009, 3, 2.6));
  rs.setProperty('--paper-sm', paper(260, 0.018, 11, 2.2));
  rs.setProperty('--paper-dk', paper(500, 0.008, 5, 4, 1.0));
  rs.setProperty('--ball', paper(180, 0.035, 21, 8, 1.05, 4));
  rs.setProperty('--stitch', stitch);

  /* Crayon filter: displacement roughens edges, a thresholded grain mask adds wax speckle. */
  document.body.insertAdjacentHTML('afterbegin',
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="crayon" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="rough"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.6" result="mask"/>
      <feComposite in="rough" in2="mask" operator="in"/></filter></svg>`);

  /* ---------- utilities ---------- */
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* Torn-edge rectangle: 4n points, n per side, clockwise from top-left, each pushed inward by U(0,amp)%. */
  function torn(seed, n = 10, amp = 2.4) {
    const r = seed == null ? Math.random : mulberry(seed);
    const j = () => (r() * amp).toFixed(2), p = [];
    for (let i = 0; i < n; i++) p.push(`${(i / n * 100).toFixed(2)}% ${j()}%`);
    for (let i = 0; i < n; i++) p.push(`${(100 - j()).toFixed(2)}% ${(i / n * 100).toFixed(2)}%`);
    for (let i = 0; i < n; i++) p.push(`${(100 - i / n * 100).toFixed(2)}% ${(100 - j()).toFixed(2)}%`);
    for (let i = 0; i < n; i++) p.push(`${j()}% ${(100 - i / n * 100).toFixed(2)}%`);
    return `polygon(${p.join(',')})`;
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CAT = ['--mustard', '--red', '--blue', '--teal', '--rust', '--green', '--purple', '--mustard'];
  const TITLE_COLORS = ['--mustard', '--red', '--blue', '--teal', '--green', '--rust', '--purple'];
  function title(el, text) {
    const r = mulberry(text.length * 97 + 13);
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((ch, i) => ch === ' ' ? '<span class="sp"></span>' :
      `<span aria-hidden="true" style="--c:var(${TITLE_COLORS[i % TITLE_COLORS.length]});--r:${(r() * 10 - 5).toFixed(1)}deg;--d:${(-i * 0.23).toFixed(2)}s">${esc(ch)}</span>`).join('');
  }
  const qs = k => new URLSearchParams(location.search).get(k);

  /* ---------- clock (server time) ---------- */
  let offset = 0;
  const sync = serverNow => { if (typeof serverNow === 'number') offset = serverNow - Date.now(); };
  const sNow = () => Date.now() + offset;
  const fmt = ms => { const s = Math.ceil(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s); };
  const tickers = new Set();
  (function loop() {
    for (const el of document.querySelectorAll('[data-end]')) {
      const ms = Math.max(0, +el.dataset.end - sNow());
      if (el.classList.contains('timerbar')) {
        el.style.setProperty('--p', (ms / (+el.dataset.total || 1)).toFixed(4));
        el.classList.toggle('low', ms > 0 && ms <= 5000);
      } else el.textContent = fmt(ms);
    }
    for (const f of tickers) f();
    requestAnimationFrame(loop);
  })();

  /* ---------- render with preserved inputs and live media ---------- */
  const mediaCache = new Map();
  function mediaEl(type, url) {
    const k = type + '|' + url;
    let m = mediaCache.get(k);
    if (!m) {
      m = document.createElement(type === 'image' ? 'img' : type);
      m.src = url;
      if (type === 'image') m.alt = ''; else { m.controls = true; m.preload = 'auto'; }
      mediaCache.set(k, m);
    }
    return m;
  }
  function render(el, html) {
    const keep = {};
    el.querySelectorAll('[data-keep]').forEach(i => {
      keep[i.dataset.keep] = { v: i.value, f: document.activeElement === i, s: i.selectionStart, e: i.selectionEnd };
    });
    el.innerHTML = html;
    el.querySelectorAll('[data-keep]').forEach(i => {
      const k = keep[i.dataset.keep];
      if (!k) return;
      i.value = k.v;
      if (k.f) { i.focus({ preventScroll: true }); try { i.setSelectionRange(k.s, k.e); } catch (_) { /* number inputs */ } }
    });
    el.querySelectorAll('.media-slot').forEach(s => s.appendChild(mediaEl(s.dataset.type, s.dataset.url)));
  }

  function toast(msg, ms = 2600) {
    const t = document.createElement('div');
    t.className = 'toast paper lift pop';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, ms);
  }

  /* ---------- transport ----------
   * net.emit(ev, data) -> Promise(ack);  net.on(ev, fn);  net.onConnect(fn)
   * socket(): real server.   local(engine): in-browser engine with simulated latency. */
  function socketNet() {
    const s = window.io({ transports: ['websocket', 'polling'] });
    return {
      emit: (ev, d) => new Promise(res => s.emit(ev, d || {}, r => res(r || {}))),
      on: (ev, fn) => s.on(ev, fn),
      onConnect: fn => { s.on('connect', fn); if (s.connected) fn(); },
      onDisconnect: fn => s.on('disconnect', fn)
    };
  }
  let localId = 0;
  function localNet(engine, opts = {}) {
    const listeners = {}, lat = () => (opts.latency ? opts.latency[0] + Math.random() * (opts.latency[1] - opts.latency[0]) : 0);
    const fire = (ev, p) => (listeners[ev] || []).forEach(f => f(p));
    const conn = { id: 'local' + (++localId), ip: 'local', send: (ev, p) => { const c = JSON.parse(JSON.stringify(p)); setTimeout(() => fire(ev, c), lat()); } };
    const h = engine.connect(conn);
    return {
      emit: (ev, d) => new Promise(res => setTimeout(() => h.handle(ev, JSON.parse(JSON.stringify(d || {})), r => setTimeout(() => res(r || {}), lat())), lat())),
      on: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
      onConnect: fn => setTimeout(fn, 0),
      onDisconnect: () => {}
    };
  }

  /* ---------- sound (synthesized, no files) ---------- */
  const Sound = {
    ctx: null, on: false,
    enable() {
      try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume(); this.on = true; } catch (_) { this.on = false; }
      return this.on;
    },
    tone(f, d, type = 'square', v = 0.12, when = 0, slide = 0) {
      if (!this.on || !this.ctx) return;
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
    },
    noise(d = 0.3, v = 0.15, when = 0) {
      if (!this.on || !this.ctx) return;
      const c = this.ctx, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0);
      for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.7;
      s.buffer = b; g.gain.value = v; s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + when);
    },
    play(kind) {
      switch (kind) {
        case 'buzz': this.tone(880, 0.18, 'square', 0.14); this.tone(1175, 0.25, 'square', 0.12, 0.12); break;
        case 'correct': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, i * 0.09)); break;
        case 'wrong': this.tone(220, 0.45, 'sawtooth', 0.12, 0, -110); break;
        case 'timeup': [0, 0.2, 0.4].forEach(w => this.tone(440, 0.14, 'square', 0.1, w)); break;
        case 'dd': this.tone(300, 0.9, 'sawtooth', 0.08, 0, 900); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.12, 0.9 + i * 0.1)); break;
        case 'crumple': this.noise(0.35, 0.22); this.noise(0.2, 0.15, 0.18); break;
        case 'swish': this.tone(900, 0.35, 'sine', 0.05, 0, -600); break;
        case 'thud': this.tone(120, 0.18, 'sine', 0.25, 0, -60); this.noise(0.08, 0.12); break;
        case 'pop': this.tone(660, 0.08, 'sine', 0.12, 0, 400); break;
        case 'lightning': this.noise(0.6, 0.3); this.tone(80, 0.6, 'sawtooth', 0.12, 0, -40); break;
        case 'fanfare': [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.24, 'triangle', 0.14, i * 0.13)); break;
        case 'open': this.tone(600, 0.1, 'sine', 0.08); break;
      }
    }
  };

  window.Craft = { svgURL, paper, mulberry, torn, esc, CAT, title, qs, sync, sNow, fmt, tickers, render, toast, socketNet, localNet, Sound };
})();
