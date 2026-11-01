/* ASA Jeopardy — screens for party modes: big screen, host phone, player phone.
 * PartyUI.board(stageEl, S)       draws the big screen
 * PartyUI.host(S, h)             returns host HTML (h = { btn, esc, Tm })
 * PartyUI.play(S, me, pme)       returns player HTML
 * PartyUI.bindPlay(root, net, getS, getMe)   wires phone inputs (answers, drawing canvas)
 * PartyUI.onDraw(msg)            stroke/clear events for the big screen and host canvas
 * PartyUI.spin(wedge)            animates the wheel on the big screen */
(function () {
  'use strict';
  const { esc, render } = Craft;
  const NAMES = { speed: '⚡ Speed Quiz', closest: '🎯 Closest Guess', truths: '🤥 Two Truths & a Lie', survey: '📋 Survey Says', fakeout: '🎭 Fake Out', wheel: '🎡 Wheel', draw: '✏️ Draw & Guess' };
  const HOWTO = {
    speed: 'Everyone answers on their phone. Faster correct answers score more!',
    closest: 'Type a number on your phone. Closest guess wins; exact hits score double!',
    truths: 'On your phone, write two true things about yourself and one lie. Then we vote!',
    survey: 'Answer the survey on your phone, then teams guess the room\'s top answers.',
    fakeout: 'Write a fake answer that sounds real. Then find the truth, and fool everyone else!',
    wheel: 'Spin, call consonants, buy vowels for 250, and solve the puzzle!',
    draw: 'One player draws on their phone. Everyone else types guesses. Faster = more points!'
  };
  const OPT = ['var(--red)', 'var(--blue)', 'var(--mustard)', 'var(--green)', 'var(--purple)', 'var(--teal)'];
  const SHAPE = ['▲', '◆', '●', '■', '★', '✚'];
  const LETTER = 'ABCDEF';
  const fmtN = n => (Math.abs(n) >= 10000 ? Number(n).toLocaleString() : String(n));
  const timerBar = p => p.timerEnd ? `<div class="timerbar pt-timer" data-end="${p.timerEnd}" data-total="${(p.timerSec || 1) * 1000}"><i></i></div>` : '';
  const T = (S, id) => S.teams.find(t => t.id === id) || { name: '?', color: '#888' };
  const chipsEarned = (S, earned) => Object.keys(earned || {}).length ? `<div class="chips">${Object.entries(earned).sort((a, b) => b[1] - a[1]).map(([tid, pts]) => `<span class="chip yarn pop" style="--c:${T(S, tid).color}"><b>${esc(T(S, tid).name)}</b> +${pts}</span>`).join('')}</div>` : '';
  const dots = (S, ids) => `<span class="pt-dots">${(ids || []).map(id => `<i class="dot" style="--c:${T(S, id).color}" title="${esc(T(S, id).name)}"></i>`).join('')}</span>`;
  const head = (p, extra = '') => `<div class="pt-head"><span class="tape">${NAMES[p.type]}${p.label ? ` · ${esc(p.label)}` : ''}</span>${p.total && p.idx >= 0 ? `<span class="small muted">${p.idx + 1} of ${p.total}</span>` : ''}${extra}</div>`;

  /* ================================ BIG SCREEN ================================ */
  let lastKey = '', wheelAngle = 0;
  function board(el, S) {
    const p = S.party;
    const key = JSON.stringify([p, S.teams.map(t => [t.id, t.name, t.color])]);
    if (key === lastKey && el.querySelector('.pt-wrap')) return;
    const prevType = el.dataset.ptype;
    lastKey = key;
    let h = `<div class="pt-wrap pt-${p.type}">`;
    switch (p.type) {
      case 'speed': h += boardSpeed(S, p); break;
      case 'closest': h += boardClosest(S, p); break;
      case 'truths': h += boardTruths(S, p); break;
      case 'survey': h += boardSurvey(S, p); break;
      case 'fakeout': h += boardFake(S, p); break;
      case 'wheel': h += boardWheel(S, p); break;
      case 'draw': h += boardDraw(S, p); break;
    }
    h += '</div>';
    if (p.type === 'draw' && prevType === 'draw' && el.querySelector('.pt-canvas')) {
      /* keep the canvas element (and its drawing) alive; only refresh the panels around it */
      const side = el.querySelector('.pt-draw-side'), tmp = document.createElement('div');
      tmp.innerHTML = h;
      if (side) side.replaceWith(tmp.querySelector('.pt-draw-side'));
      const hd = el.querySelector('.pt-head'); if (hd) hd.replaceWith(tmp.querySelector('.pt-head'));
      { const cv = el.querySelector('.pt-canvas'); if (cv && cv.dataset.idx !== String(p.idx)) resetCanvas(cv, p); }
      return;
    }
    render(el, h);
    el.dataset.ptype = p.type;
    if (p.type === 'wheel') { const w = el.querySelector('.pt-wheel-rot'); if (w) w.style.transform = `rotate(${wheelAngle}deg)`; }
    if (p.type === 'draw') resetCanvas(el.querySelector('.pt-canvas'), p);
  }
  const intro = p => `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">${NAMES[p.type]}</div><p>${HOWTO[p.type]}</p><p class="small muted">Waiting for the host to start…</p></div>`;
  const done = p => `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">That's a wrap!</div><p>${NAMES[p.type]} is finished.</p></div>`;

  function boardSpeed(S, p) {
    if (p.stage === 'intro') return intro(p);
    if (p.stage === 'done') return done(p);
    const rev = p.stage === 'reveal';
    const by = i => rev ? Object.entries(p.picks || {}).filter(([, c]) => c === i).map(([t]) => t) : [];
    return head(p) + `<div class="card paper pt-q">${esc(p.q)}</div>${timerBar(p)}
      <div class="pt-opts">${p.options.map((o, i) => `<div class="pt-opt yarn ${rev ? (i === p.correct ? 'right' : 'dim') : ''}" style="--c:${OPT[i]}"><span class="sh">${SHAPE[i]}</span><span class="tx">${esc(o)}</span>${rev ? dots(S, by(i)) : ''}</div>`).join('')}</div>
      ${rev ? chipsEarned(S, p.earned) : `<div class="status">${p.answered.length}/${S.teams.length} teams answered</div>`}`;
  }
  function boardClosest(S, p) {
    if (p.stage === 'intro') return intro(p);
    if (p.stage === 'done') return done(p);
    let h = head(p) + `<div class="card paper pt-q">${esc(p.q)}</div>${timerBar(p)}`;
    if (p.stage !== 'reveal') return h + `<div class="status">${p.answered.length}/${S.teams.length} teams locked in a guess</div>`;
    h += `<div class="pt-answer block stroke crayon stamp">${fmtN(p.a)}${p.unit ? ` <small>${esc(p.unit)}</small>` : ''}</div>${p.note ? `<p class="pt-note">${esc(p.note)}</p>` : ''}`;
    return h + `<div class="pt-rank">${(p.ranking || []).map((r, i) => `<div class="pt-rrow yarn ${r.win ? 'win' : ''}" style="--c:${T(S, r.tid).color};--d:${i * 0.12}s"><b class="nm">${r.win ? '🏆 ' : ''}${esc(T(S, r.tid).name)}</b><span class="g">${fmtN(r.guess)}</span><span class="off">${r.off === 0 ? 'EXACT!' : `off by ${fmtN(Math.round(r.off * 100) / 100)}`}</span>${r.pts ? `<span class="pts">+${r.pts}</span>` : ''}</div>`).join('') || '<p>No guesses.</p>'}</div>`;
  }
  function boardTruths(S, p) {
    if (p.stage === 'collect' || p.stage === 'intro') {
      return head(p) + `<div class="card paper pt-intro"><div class="pt-big block stroke crayon">${NAMES.truths}</div><p>${HOWTO.truths}</p>
        <div class="chips">${(p.submitted || []).map(x => `<span class="chip yarn pop" style="--c:${x.played ? '#8d8780' : 'var(--teal)'}">${x.played ? '✓ ' : ''}${esc(x.name)}</span>`).join('') || '<span class="muted">Nobody has submitted yet…</span>'}</div></div>`;
    }
    const rev = p.stage === 'reveal';
    const votersFor = i => rev ? Object.entries(p.votes || {}).filter(([, v]) => v === i).map(([t]) => t) : [];
    return head(p, `<span class="pt-author yarn block stroke" style="--c:${T(S, p.authorTeam).color}">${esc(p.author)}</span>`) + timerBar(p) +
      `<div class="pt-st">${p.statements.map((s, i) => `<div class="pt-stc paper ${rev ? (i === p.lie ? 'lie' : 'true') : ''}"><span class="n block">${i + 1}</span><span class="tx">${esc(s)}</span>${rev ? `<span class="tag block stroke">${i === p.lie ? 'LIE!' : 'TRUE'}</span>${dots(S, votersFor(i))}` : ''}</div>`).join('')}</div>
      ${rev ? chipsEarned(S, p.earned) : `<div class="status">Which one is the lie? Vote on your phone! ${p.voted.length}/${Math.max(0, S.teams.length - 1)} teams voted</div>`}`;
  }
  function boardSurvey(S, p) {
    if (p.stage === 'intro') return intro(p);
    if (p.stage === 'done') return done(p);
    let h = head(p) + `<div class="card paper pt-q">${esc(p.q)}</div>`;
    if (p.stage === 'collect') return h + timerBar(p) + `<div class="status">Answer on your phone! <b>${p.respondents}</b> answers in</div>`;
    if (p.stage === 'review') return h + '<div class="status">Tallying the answers… 📋</div>';
    const n = p.board.length, half = Math.ceil(n / 2);
    const slot = (b, i) => `<div class="pt-slot ${b.shown ? 'shown' : ''}">${b.shown || b.a ? `<span class="a">${esc(b.a || '')}</span><span class="c">${b.n}</span>` : `<span class="num block">${i + 1}</span>`}</div>`;
    h += `<div class="pt-feud darkpaper"><div class="col">${p.board.slice(0, half).map((b, i) => slot(b, i)).join('')}</div><div class="col">${p.board.slice(half).map((b, i) => slot(b, i + half)).join('')}</div></div>`;
    h += `<div class="pt-feudbar"><span class="pt-strikes">${[0, 1, 2].map(i => `<b class="${i < p.strikes ? 'on' : ''}">✗</b>`).join('')}</span>
      ${p.active ? `<span class="chip yarn" style="--c:${T(S, p.active).color}"><b>${esc(T(S, p.active).name)}</b> is playing</span>` : ''}<span class="pt-bank tape">Bank: <b>${p.bank}</b></span></div>`;
    return h;
  }
  function boardFake(S, p) {
    if (p.stage === 'intro') return intro(p);
    if (p.stage === 'done') return done(p);
    const q = esc(p.q).replace('____', `<span class="pt-blank">${p.stage === 'reveal' ? esc(p.a) : '______'}</span>`);
    let h = head(p) + `<div class="card paper pt-q">${q}</div>${timerBar(p)}`;
    if (p.stage === 'write') return h + `<div class="status">Write a fake answer on your phone! ${p.wrote.length}/${S.teams.length} teams done</div>`;
    const rev = p.stage === 'reveal';
    h += `<div class="pt-choices">${p.choices.map((c, i) => {
      const voters = rev ? Object.entries(p.votes || {}).filter(([, v]) => v === c.id).map(([t]) => t) : [];
      return `<div class="pt-choice paper ${rev ? (c.truth ? 'truth' : 'fake') : ''}" style="--d:${i * 0.1}s"><span class="l block">${LETTER[i] || i + 1}</span><span class="tx">${esc(c.text)}</span>
        ${rev ? `<span class="who">${c.truth ? '<b class="tag block stroke">TRUTH ✓</b>' : `by ${c.authors.map(a => `<b style="color:${T(S, a).color}">${esc(T(S, a).name)}</b>`).join(', ')}`}</span>${dots(S, voters)}` : ''}</div>`;
    }).join('')}</div>`;
    return h + (rev ? chipsEarned(S, p.earned) : `<div class="status">Which one is TRUE? Vote on your phone! ${p.voted.length}/${S.teams.length} voted</div>`);
  }
  function wheelSVG(w) {
    const n = w.length, R = 200, cols = ['#de3a2e', '#3b4db3', '#e6a92b', '#2a8a96', '#4e9a3f', '#c8612c', '#8a4fb3', '#d24f8a'];
    let s = '';
    w.forEach((v, i) => {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 - Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      const x0 = R * Math.cos(a0), y0 = R * Math.sin(a0), x1 = R * Math.cos(a1), y1 = R * Math.sin(a1);
      const fill = v === 'BANKRUPT' ? '#1c1a17' : v === 'LOSE A TURN' ? '#f3f1ec' : cols[i % cols.length];
      const tc = v === 'LOSE A TURN' ? '#1c1a17' : '#fff', am = (a0 + a1) / 2 * 180 / Math.PI;
      s += `<path d="M0 0 L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${fill}" stroke="#1c1a17" stroke-width="3"/>`;
      s += `<text transform="rotate(${am.toFixed(1)}) translate(${R - 16} 0) rotate(90)" fill="${tc}" font-family="Luckiest Guy, sans-serif" font-size="${typeof v === 'number' ? 22 : 13}" text-anchor="middle" dominant-baseline="hanging" stroke="#1c1a17" stroke-width="${tc === '#fff' ? 3 : 0}" paint-order="stroke">${typeof v === 'number' ? v : v.split(' ').join(' ')}</text>`;
    });
    return `<svg viewBox="-215 -215 430 430" class="pt-wheel-svg"><defs><pattern id="wv2" width="14" height="12" patternUnits="userSpaceOnUse"><rect width="14" height="12" fill="#c8873f"/><path d="M0 3h14M0 9h14" stroke="#9c6228" stroke-width="3"/></pattern></defs>
      <circle r="212" fill="url(#wv2)" stroke="#1c1a17" stroke-width="5"/><g class="pt-wheel-rot">${s}<circle r="34" fill="#f3f1ec" stroke="#1c1a17" stroke-width="4"/></g></svg>
      <div class="pt-pointer">▼</div>`;
  }
  function boardWheel(S, p) {
    if (p.stage === 'intro') return `<div class="pt-wheelgrid"><div class="pt-wheelbox">${wheelSVG(p.wedges)}</div>${intro(p)}</div>`;
    if (p.stage === 'done') return done(p);
    const words = p.board.split(' ');
    const tiles = words.map(w => `<span class="pt-word">${[...w].map(ch => `<span class="pt-tile ${ch === '_' ? 'blank' : /[A-Z]/.test(ch) ? 'on' : 'mark'}">${ch === '_' ? '' : esc(ch)}</span>`).join('')}</span>`).join('');
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => `<span class="${p.usedLetters.includes(L) ? 'used' : ''} ${'AEIOU'.includes(L) ? 'v' : ''}">${L}</span>`).join('');
    return `<div class="pt-wheelgrid"><div class="pt-wheelbox">${wheelSVG(p.wedges)}</div><div class="pt-wheelright">
      <div class="pt-head"><span class="tape">${NAMES.wheel}</span><span class="pt-cat yarn block stroke" style="--c:var(--blue)">${esc(p.category)}</span></div>
      <div class="pt-puzzle darkpaper">${tiles}</div>
      <div class="pt-abc">${abc}</div>
      <div class="pt-msg block stroke ${p.stage === 'solved' ? 'win' : ''}">${esc(p.msg || (p.stage === 'spinning' ? 'Spinning…' : p.stage === 'letter' ? 'Pick a consonant!' : 'Spin the wheel!'))}</div>
      <div class="chips">${S.teams.map(t => `<span class="chip yarn ${t.id === p.active ? 'pt-act' : ''}" style="--c:${t.color}"><b>${esc(t.name)}</b> ${p.banks[t.id] || 0}</span>`).join('')}</div></div></div>`;
  }
  function boardDraw(S, p) {
    const drawer = p.drawerName ? `<span class="pt-author yarn block stroke" style="--c:${T(S, p.drawerTeam).color}">✏️ ${esc(p.drawerName)}</span>` : '';
    if (p.stage === 'intro') return intro(p);
    if (p.stage === 'done') return done(p);
    const solved = Object.entries(p.solved || {});
    return head(p, drawer) + `<div class="pt-drawgrid"><div class="pt-canvasbox paper"><canvas class="pt-canvas" width="1200" height="900"></canvas></div>
      <div class="pt-draw-side">${timerBar(p)}
        <div class="pt-shape block">${p.stage === 'reveal' ? `<span class="stamp">${esc(p.word || '')}</span>` : esc(p.wordShape || '').replace(/_/g, '＿')}</div>
        <div class="pt-feed">${solved.map(([tid, x]) => `<div class="chip yarn pop" style="--c:${T(S, tid).color}">✓ <b>${esc(x.by)}</b> (${esc(T(S, tid).name)}) +${x.pts}</div>`).join('') || '<p class="muted">Type your guesses on your phone!</p>'}</div></div></div>`;
  }

  /* ---- drawing on the big screen / host ----
   * Strokes arrive in chunks; each chunk repeats the previous chunk's last point, so every chunk is drawn on its own. */
  function resetCanvas(cv, p) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, cv.width, cv.height);
    cv.dataset.idx = p.idx;
    for (const s of p.strokes || []) drawStroke(cv, s);
  }
  function drawStroke(cv, s) {
    if (!cv || !s || !s.pts || s.pts.length < 2) return;
    const ctx = cv.getContext('2d'), W = cv.width, Hh = cv.height;
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w * (W / 1000) * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(s.pts[0] * W, s.pts[1] * Hh);
    for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i] * W, s.pts[i + 1] * Hh);
    if (s.pts.length === 2) ctx.lineTo(s.pts[0] * W + 0.5, s.pts[1] * Hh);
    ctx.stroke();
  }
  function onDraw(msg) {
    document.querySelectorAll('.pt-canvas').forEach(cv => {
      if (msg.clear) { const ctx = cv.getContext('2d'); ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, cv.width, cv.height); }
      if (msg.s) drawStroke(cv, msg.s);
    });
  }
  /* Wheel: rotate so wedge `w` lands under the top pointer, plus several full turns; cubic ease-out. */
  function spin(w, n) {
    const rot = document.querySelector('.pt-wheel-rot');
    const target = -(w * 360 / n);
    const base = wheelAngle - (wheelAngle % 360);
    const end = base + 360 * 5 + ((target % 360) + 360) % 360 + (Math.random() * 10 - 5) * (180 / n) / 18;
    const from = wheelAngle;
    wheelAngle = end;
    if (!rot) return;
    rot.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${end}deg)` }], { duration: 4000, easing: 'cubic-bezier(.12,.75,.18,1)', fill: 'forwards' });
  }

  /* ================================ HOST PHONE ================================ */
  function host(S, x) {
    const { btn } = x, p = S.party, n = p.total || 0;
    const card = h => `<div class="card paper">${h}</div>`;
    const pick = () => n ? `<details class="pt-pick"><summary>Choose a specific one (${n})</summary><div class="pt-picklist">${(p.list || []).map((it, i) => btn('party', `${i + 1}. ${esc(it)}`, 'sm ' + (i === p.idx ? 'on' : ''), { a: 'next', i })).join('')}</div></details>` : '';
    const nextBtn = (label = '▶ Next') => (p.idx + 1 < n || p.idx < 0) ? btn('party', label, 'big hi', { a: 'next' }) : btn('endRound', 'Round complete: back to lobby', 'big');
    const status = (ids, label) => `<div class="pt-hstatus">${S.teams.map(t => `<span class="chip yarn ${ids.includes(t.id) ? '' : 'pt-wait'}" style="--c:${t.color}">${ids.includes(t.id) ? '✓' : '…'} ${esc(t.name)}</span>`).join('')}</div><div class="small muted">${label}</div>`;
    let h = `<h2 class="hand">${NAMES[p.type]}${p.label ? ` <span class="small muted">${esc(p.label)}</span>` : ''}</h2>${p.timerEnd ? `<span class="h-clock block" data-end="${p.timerEnd}"></span>` : ''}`;
    switch (p.type) {
      case 'speed':
        if (p.q) h += `<div class="h-qtext">${esc(p.q)}</div><ol class="h-opts" type="A">${p.options.map((o, i) => `<li class="${i === p.correct ? 'right' : ''}">${esc(o)}${i === p.correct ? ' ✓' : ''}</li>`).join('')}</ol>`;
        if (p.stage === 'question') h += status(p.answered, 'Answers lock when every team has answered or time runs out.') + `<div class="row center">${btn('party', '👁 Reveal now', 'hi', { a: 'reveal' })}</div>`;
        else h += `<div class="row center">${nextBtn(p.idx < 0 ? '▶ First question' : '▶ Next question')}</div>`;
        return card(h + pick());
      case 'closest':
        if (p.q) h += `<div class="h-qtext">${esc(p.q)}</div><div class="h-answer">Answer: <b>${fmtN(p.a)} ${esc(p.unit || '')}</b></div>`;
        if (p.stage === 'question') h += status(p.answered, 'Teams can change their guess until you reveal.') + `<div class="pt-hguess">${Object.entries(p.guesses || {}).map(([t, g]) => `<span>${esc(T(S, t).name)}: <b>${fmtN(g)}</b></span>`).join(' · ')}</div><div class="row center">${btn('party', '👁 Reveal', 'big hi', { a: 'reveal' })}</div>`;
        else h += `<div class="row center">${nextBtn(p.idx < 0 ? '▶ First question' : '▶ Next question')}</div>`;
        return card(h + pick());
      case 'truths': {
        const subs = p.submitted || [];
        h += `<p>${subs.length} player(s) submitted. ${subs.filter(s => !s.played).length} not played yet.</p>`;
        if (p.stage === 'vote' || p.stage === 'reveal') h += `<div class="h-qtext"><b>${esc(p.author)}</b>:</div><ol class="h-opts">${p.statements.map((s, i) => `<li class="${i === p.lie ? 'right' : ''}">${esc(s)}${i === p.lie ? ' ← LIE' : ''}</li>`).join('')}</ol>`;
        if (p.stage === 'vote') h += status(p.voted, 'Votes from every team except the author\'s.') + `<div class="row center">${btn('party', '👁 Reveal the lie', 'big hi', { a: 'reveal' })}</div>`;
        else h += `<div class="row center">${btn('party', '🎲 Next player (random)', 'big hi', { a: 'next' })}${p.stage !== 'collect' ? btn('party', '📝 Back to writing', 'sm', { a: 'collect' }) : ''}</div>`;
        h += `<details class="pt-pick"><summary>Pick a player / remove an entry</summary><div class="pt-picklist">${subs.map(s => `<span class="row">${btn('party', `${s.played ? '✓ ' : ''}${esc(s.name)}`, 'sm', { a: 'next', pid: s.pid })}${btn('party', '✕', 'sm no', { a: 'drop', pid: s.pid })}</span>`).join('') || '<span class="muted">No entries yet.</span>'}</div></details>`;
        return card(h);
      }
      case 'survey': {
        if (p.q) h += `<div class="h-qtext">${esc(p.q)}</div>`;
        if (p.stage === 'collect') h += `<p><b>${p.respondents}</b> answers in.</p><div class="row center">${btn('party', '📊 Close survey & tally', 'big hi', { a: 'tally' })}</div>`;
        if (p.stage === 'review') {
          h += `<p>Tidy the answers before they go on the board: rename, merge duplicates, or delete.</p><div class="pt-review">${p.board.map((b, k) => `<div class="h-tr"><b>${b.n}</b><input class="field" data-keep="sv-${k}" value="${esc(b.a)}">${btn('party', 'Save', 'sm', { a: 'edit', k })}
            <select class="field ed-sel" data-merge="${k}"><option value="">merge into…</option>${p.board.map((o, j) => j === k ? '' : `<option value="${j}">${esc(o.a)}</option>`).join('')}</select>${btn('party', '✕', 'sm no', { a: 'del', k })}</div>`).join('')}</div>
            <div class="row center">${btn('party', '▶ Put it on the board', 'big hi', { a: 'play' })}</div>`;
        }
        if (p.stage === 'board' || p.stage === 'over') {
          h += `<div class="row">Playing: ${S.teams.map(t => btn('party', esc(t.name), 'sm ' + (p.active === t.id ? 'on' : ''), { a: 'active', team: t.id })).join('')}</div>
            <div class="pt-review">${p.board.map((b, k) => `<div class="h-tr"><b>${k + 1}.</b><span class="h-ans">${esc(b.a)} <span class="muted">(${b.n})</span></span>${b.shown ? '<span class="h-hintdone">shown</span>' : btn('party', 'Reveal', 'sm go', { a: 'show', k })}</div>`).join('')}</div>
            <div class="row">${btn('party', `✗ Strike (${p.strikes}/3)`, 'no', { a: 'strike' })}${p.strikes ? btn('party', 'undo strike', 'sm', { a: 'unstrike' }) : ''}<span>Bank: <b>${p.bank}</b></span></div>
            <div class="row">Give the bank to: ${S.teams.map(t => btn('party', esc(t.name), 'sm go', { a: 'award', team: t.id })).join('')}</div>
            <div class="row">${btn('party', 'Reveal all', 'sm', { a: 'showAll' })}${nextBtn('▶ Next survey')}</div>`;
        }
        if (p.stage === 'intro' || p.stage === 'done') h += `<div class="row center">${nextBtn('▶ First survey')}</div>`;
        return card(h + pick());
      }
      case 'fakeout':
        if (p.q) h += `<div class="h-qtext">${esc(p.q).replace('____', '<b>____</b>')}</div><div class="h-answer">Truth: <b>${esc(p.a)}</b></div>`;
        if (p.stage === 'write') {
          h += status(p.wrote, 'Remove anything inappropriate before it hits the screen.') + `<div class="pt-review">${Object.entries(p.fakes || {}).map(([t, f]) => `<div class="h-tr ${f.dropped ? 'pt-wait' : ''}"><b>${esc(T(S, t).name)}</b><span class="h-ans">“${esc(f.text)}”</span>${f.dropped ? 'removed' : btn('party', '✕', 'sm no', { a: 'drop', team: t })}</div>`).join('')}</div>
            <div class="row center">${btn('party', '🗳 Start voting', 'big hi', { a: 'vote' })}</div>`;
        } else if (p.stage === 'vote') h += status(p.voted, '') + `<div class="row center">${btn('party', '👁 Reveal', 'big hi', { a: 'reveal' })}</div>`;
        else h += `<div class="row center">${nextBtn(p.idx < 0 ? '▶ First fact' : '▶ Next fact')}</div>`;
        return card(h + pick());
      case 'wheel': {
        if (p.phrase) h += `<div class="h-answer">Puzzle: <b>${esc(p.phrase)}</b> <span class="muted">(${esc(p.category)})</span></div><div class="pt-hboard block">${esc(p.board)}</div>`;
        if (p.stage === 'intro' || p.stage === 'solved' || p.stage === 'done') { h += `<div class="row center">${nextBtn(p.idx < 0 ? '▶ First puzzle' : '▶ Next puzzle')}</div>`; return card(h + pick()); }
        h += `<div class="row">Up now: ${S.teams.map(t => btn('party', `${esc(t.name)} ${p.banks[t.id] || 0}`, 'sm ' + (p.active === t.id ? 'on' : ''), { a: 'active', team: t.id })).join('')}</div>
          <p class="pt-hmsg">${esc(p.msg || '')}</p>
          <div class="row center">${btn('party', '🎡 Spin', 'big hi', { a: 'spin' })}${btn('party', '⏭ Pass', 'sm', { a: 'pass' })}</div>
          <div class="pt-letters">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => `<button type="button" class="pt-L ${'AEIOU'.includes(L) ? 'v' : ''}" data-act="party" data-a="letter" data-l="${L}" ${p.usedLetters.includes(L) ? 'disabled' : ''}>${L}</button>`).join('')}</div>
          <div class="row center">${btn('party', '✓ Solved', 'go', { a: 'solve', ok: 1 })}${btn('party', '✗ Wrong solve', 'no', { a: 'solve', ok: 0 })}</div>
          <p class="small muted">Tap letters as teams call them (their phones can do it too). Vowels cost ${p.vowelCost}.</p>`;
        return card(h);
      }
      case 'draw': {
        const players = S.teams.flatMap(t => t.members.filter(m => m.on).map(m => ({ ...m, team: t })));
        if (p.word && p.stage === 'drawing') h += `<div class="h-answer">Word: <b>${esc(p.word)}</b> · drawer: <b>${esc(p.drawerName)}</b></div>`;
        if (p.stage === 'drawing') {
          h += `<div class="pt-hcanvas paper"><canvas class="pt-canvas" width="600" height="450"></canvas></div>
            <div class="pt-review">${(p.guesses || []).slice().reverse().map(g => `<div class="h-tr"><b>${esc(g.name)}</b><span class="h-ans">${esc(g.text)}</span></div>`).join('') || '<span class="muted">Guesses show up here.</span>'}</div>
            <div class="row center">${btn('party', '⏹ End drawing', 'hi', { a: 'end' })}</div>`;
        } else {
          if (p.word) h += `<div class="h-answer">Last word: <b>${esc(p.word)}</b></div>`;
          h += `<div class="row center">${p.idx + 1 < n ? btn('party', '🎲 Next word, random drawer', 'big hi', { a: 'next' }) : btn('endRound', 'Round complete: back to lobby', 'big')}</div>
            <details class="pt-pick"><summary>Choose who draws</summary><div class="pt-picklist">${players.map(m => btn('party', `${esc(m.name)} <span class="small muted">${esc(m.team.name)}</span>`, 'sm', { a: 'next', pid: m.id })).join('') || '<span class="muted">No players connected.</span>'}</div></details>`;
        }
        return card(h);
      }
    }
    return card(h);
  }

  /* ================================ PLAYER PHONE ================================ */
  function play(S, me, pme) {
    const p = S.party, tid = me.teamId, t = T(S, tid), mine = pme || {};
    const wait = msg => `<div class="card paper p-msg"><h2 class="hand">${NAMES[p.type]}</h2><p>${msg}</p></div>`;
    if (p.stage === 'intro') return wait(HOWTO[p.type] + '<br><b>Waiting for the host…</b>');
    if (p.stage === 'done') return wait('That\'s a wrap! Eyes on the big screen.');
    const tm = p.timerEnd ? `<div class="timerbar" data-end="${p.timerEnd}" data-total="${(p.timerSec || 1) * 1000}"><i></i></div>` : '';
    switch (p.type) {
      case 'speed': {
        let h = `<div class="p-clue card paper"><div class="p-qtext">${esc(p.q)}</div>${tm}</div>`;
        if (p.stage === 'question') {
          if (p.mine != null) return h + `<div class="p-hint">Locked in <b>${SHAPE[p.mine]} ${esc(p.options[p.mine])}</b>. Fingers crossed!</div>`;
          return h + `<div class="pt-popts">${p.options.map((o, i) => `<button type="button" class="pt-popt yarn" style="--c:${OPT[i]}" data-pa="answer" data-choice="${i}"><span class="sh">${SHAPE[i]}</span>${esc(o)}</button>`).join('')}</div>`;
        }
        const got = p.earned && p.earned[tid];
        return h + `<div class="p-verdict ${got ? 'ok' : 'bad'} block stroke pop">${got ? `+${got}!` : 'Not this time'}</div><div class="p-answer">Answer: <b>${esc(p.options[p.correct])}</b></div>`;
      }
      case 'closest': {
        let h = `<div class="p-clue card paper"><div class="p-qtext">${esc(p.q)}</div>${tm}</div>`;
        if (p.stage === 'question') return h + `<div class="card paper"><div class="row"><input class="field pt-num" inputmode="decimal" data-keep="num-${p.idx}" placeholder="Your guess${p.unit ? ` (${esc(p.unit)})` : ''}"><button type="button" class="btn hi" data-pa="num">${p.mine != null ? 'Change' : 'Send'}</button></div>${p.mine != null ? `<p>Your team's guess: <b>${fmtN(p.mine)}</b></p>` : ''}</div>`;
        const r = (p.ranking || []).find(x => x.tid === tid);
        return h + `<div class="p-answer">Answer: <b>${fmtN(p.a)} ${esc(p.unit || '')}</b></div>${r ? `<div class="p-verdict ${r.win ? 'ok' : 'bad'} block stroke pop">${r.win ? `Closest! +${r.pts}` : `Off by ${fmtN(Math.round(r.off * 100) / 100)}`}</div>` : ''}`;
      }
      case 'truths': {
        if (p.stage === 'collect' || (p.stage !== 'collect' && p.authorPid !== me.pid && !p.statements)) {
          const s = mine.mySub;
          return `<div class="card paper"><h2 class="hand">🤥 Your two truths & a lie</h2>
            ${[0, 1, 2].map(i => `<label class="pt-tl"><input type="radio" name="pt-lie" value="${i}" ${s && s.lie === i ? 'checked' : ''}> <span>lie?</span></label><input class="field pt-ts" maxlength="140" data-keep="ts-${i}" data-i="${i}" placeholder="Statement ${i + 1}" value="${s ? esc(s.s[i]) : ''}">`).join('')}
            <p class="small muted">Tick the circle next to the one that's the lie.</p>
            <button type="button" class="btn hi big" data-pa="truths">${s ? 'Update' : 'Submit'}</button>${s ? '<p class="p-hint">✓ Submitted. You might be picked!</p>' : ''}</div>`;
        }
        let h = `<div class="p-clue card paper"><div class="small muted">About ${esc(p.author)}</div>${tm}</div>`;
        if (p.authorPid === me.pid) return h + `<div class="card paper p-msg">You're up! Keep a straight face 😐</div>`;
        if (tid === p.authorTeam) return h + `<div class="card paper p-msg">Your teammate wrote these, so your team sits this vote out.</div>`;
        if (p.stage === 'vote') return h + `<div class="pt-popts">${p.statements.map((st, i) => `<button type="button" class="pt-popt paper ${p.mine === i ? 'chosen' : ''}" data-pa="tvote" data-choice="${i}"><span class="sh">${i + 1}</span>${esc(st)}</button>`).join('')}</div><p class="p-hint">Tap the LIE.</p>`;
        const got = p.earned && p.earned[tid];
        return h + `<div class="p-verdict ${got ? 'ok' : 'bad'} block stroke pop">${got ? `Spotted it! +${got}` : 'Fooled!'}</div><div class="p-answer">The lie: <b>${esc(p.statements[p.lie])}</b></div>`;
      }
      case 'survey': {
        let h = `<div class="p-clue card paper"><div class="p-qtext">${esc(p.q)}</div>${tm}</div>`;
        if (p.stage === 'collect') return h + `<div class="card paper"><div class="row"><input class="field pt-sv" maxlength="60" data-keep="sv-${p.idx}" placeholder="Your answer"><button type="button" class="btn hi" data-pa="survey">Send</button></div><p class="small muted">Everyone answers on their own. You can change your answer until the survey closes.</p></div>`;
        return h + `<div class="card paper p-msg">${p.active === tid ? '<b>Your team is playing!</b> Shout out answers!' : 'Eyes on the big screen! 📋'}</div>`;
      }
      case 'fakeout': {
        const q = esc(p.q).replace('____', '<b>______</b>');
        let h = `<div class="p-clue card paper"><div class="p-qtext">${q}</div>${tm}</div>`;
        if (p.stage === 'write') return h + `<div class="card paper"><input class="field pt-fake" maxlength="80" data-keep="fk-${p.idx}" placeholder="A believable fake answer"><button type="button" class="btn hi big" data-pa="fake" style="margin-top:8px">${p.myFake ? 'Change' : 'Submit'}</button>${p.myFake ? `<p class="p-hint">Your fake: <b>“${esc(p.myFake)}”</b></p>` : ''}</div>`;
        if (p.stage === 'vote') return h + `<div class="pt-popts">${p.choices.map((c, i) => `<button type="button" class="pt-popt paper ${p.mine === c.id ? 'chosen' : ''}" data-pa="fvote" data-choice="${c.id}" ${p.ownChoice === c.id ? 'disabled' : ''}><span class="sh">${LETTER[i] || i + 1}</span>${esc(c.text)}${p.ownChoice === c.id ? ' <small>(yours)</small>' : ''}</button>`).join('')}</div><p class="p-hint">Which one is TRUE?</p>`;
        const got = p.earned && p.earned[tid];
        return h + `<div class="p-verdict ${got ? 'ok' : 'bad'} block stroke pop">${got ? `+${got}!` : 'No points this time'}</div><div class="p-answer">Truth: <b>${esc(p.a)}</b></div>`;
      }
      case 'wheel': {
        const up = p.active === tid, bank = (p.banks || {})[tid] || 0;
        let h = `<div class="p-clue card paper"><div class="small muted">${esc(p.category || '')}</div><div class="pt-pboard block">${esc(p.board || '')}</div><div class="p-hint">${esc(p.msg || '')}</div></div>`;
        if (p.stage === 'solved') return h + '<div class="card paper p-msg">Solved! 🎉</div>';
        if (!up) return h + `<div class="card paper p-msg"><b>${esc(T(S, p.active).name)}</b> is up. Your bank: ${bank}</div>`;
        h += `<div class="card paper center"><b>Your turn!</b> Bank: ${bank}</div>`;
        if (p.stage === 'spin') h += `<button type="button" class="p-buzz go" style="--c:${t.color}" data-pa="spin"><span class="block stroke">SPIN!</span></button>`;
        if (p.stage === 'spinning') h += '<div class="card paper p-msg">🎡 Spinning…</div>';
        if (p.stage === 'spin' || p.stage === 'letter') {
          h += `<div class="pt-letters">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => {
            const v = 'AEIOU'.includes(L), off = p.usedLetters.includes(L) || (v ? bank < p.vowelCost : p.stage !== 'letter');
            return `<button type="button" class="pt-L ${v ? 'v' : ''}" data-pa="letter" data-l="${L}" ${off ? 'disabled' : ''}>${L}</button>`;
          }).join('')}</div><p class="small muted center">${p.stage === 'letter' ? 'Pick a consonant!' : `Spin, or buy a vowel (${p.vowelCost}). Ready to solve? Say it out loud!`}</p>`;
        }
        return h;
      }
      case 'draw': {
        if (mine.word && p.stage === 'drawing') {
          return `<div class="card paper center"><div class="small muted">Draw this (no letters!)</div><div class="pt-myword block stroke crayon">${esc(mine.word)}</div>${tm}</div>
            <div class="pt-pad paper"><canvas class="pt-mycanvas" data-idx="${p.idx}" width="1000" height="750"></canvas></div>
            <div class="row center pt-pens">${['#1c1a17', '#de3a2e', '#3b4db3', '#e6a92b', '#4e9a3f', '#8a4fb3'].map((c, i) => `<button type="button" class="pt-pen ${i === 0 ? 'on' : ''}" data-pen="${c}" style="--c:${c}" aria-label="color"></button>`).join('')}<button type="button" class="btn sm" data-pa="dclear">Clear</button></div>`;
        }
        const drawerTeam = p.drawerTeam === tid;
        let h = `<div class="p-clue card paper"><div><b>${esc(p.drawerName)}</b> is drawing</div><div class="pt-pboard block">${p.stage === 'reveal' ? esc(p.word || '') : esc(p.wordShape || '')}</div>${tm}</div>`;
        if (p.stage !== 'drawing') return h + '<div class="card paper p-msg">Eyes on the big screen!</div>';
        if (drawerTeam) return h + '<div class="card paper p-msg">Your teammate is drawing. Cheer them on! 🎨</div>';
        if (p.solved && p.solved[tid]) return h + `<div class="p-verdict ok block stroke pop">Got it! +${p.solved[tid].pts}</div>`;
        return h + `<div class="card paper"><div class="row"><input class="field pt-guess" maxlength="60" autocomplete="off" autocapitalize="off" placeholder="Your guess" enterkeyhint="send"><button type="button" class="btn hi" data-pa="guess">Guess</button></div><div class="pt-last small muted"></div></div>`;
      }
    }
    return wait('');
  }

  /* Phone inputs: answers, votes, wheel, drawing pad. */
  function bindPlay(root, net, getS) {
    const send = (d, then) => net.emit('player:party', d).then(r => { if (r.error) Craft.toast(r.error); else if (then) then(r); });
    let pen = '#1c1a17';
    root.addEventListener('click', e => {
      const pb = e.target.closest('[data-pen]');
      if (pb) { pen = pb.dataset.pen; root.querySelectorAll('[data-pen]').forEach(b => b.classList.toggle('on', b === pb)); return; }
      const b = e.target.closest('[data-pa]');
      if (!b || b.disabled) return;
      const a = b.dataset.pa, q = s => root.querySelector(s);
      if (a === 'answer') { FX.squash(b); return send({ action: 'answer', choice: +b.dataset.choice }); }
      if (a === 'num') { const v = q('.pt-num').value; if (!v.trim()) return Craft.toast('Type a number.'); return send({ action: 'answer', n: v }, () => Craft.toast('Guess locked in!', 1200)); }
      if (a === 'truths') {
        const s = [...root.querySelectorAll('.pt-ts')].map(i => i.value), lie = root.querySelector('input[name=pt-lie]:checked');
        return send({ action: 'submit', s, lie: lie ? +lie.value : -1 }, () => Craft.toast('Submitted!', 1200));
      }
      if (a === 'tvote') return send({ action: 'vote', choice: +b.dataset.choice });
      if (a === 'survey') { const v = q('.pt-sv').value; if (!v.trim()) return Craft.toast('Type an answer.'); return send({ action: 'answer', text: v }, () => Craft.toast('Answer sent!', 1200)); }
      if (a === 'fake') { const v = q('.pt-fake').value; if (!v.trim()) return Craft.toast('Type a fake answer.'); return send({ action: 'fake', text: v }, () => Craft.toast('Fake submitted 😏', 1200)); }
      if (a === 'fvote') return send({ action: 'vote', choice: +b.dataset.choice });
      if (a === 'spin') { FX.squash(b); return send({ action: 'spin' }); }
      if (a === 'letter') return send({ action: 'letter', L: b.dataset.l });
      if (a === 'dclear') { const cv = q('.pt-mycanvas'); if (cv) { const c = cv.getContext('2d'); c.fillStyle = '#fffdf7'; c.fillRect(0, 0, cv.width, cv.height); } return send({ action: 'clear' }); }
      if (a === 'guess') guess();
    });
    function guess() {
      const i = root.querySelector('.pt-guess'); if (!i || !i.value.trim()) return;
      const text = i.value; i.value = ''; i.focus();
      net.emit('player:party', { action: 'guess', text }).then(r => {
        if (r.error) Craft.toast(r.error); else if (r.correct) { if (navigator.vibrate) navigator.vibrate([60, 30, 60]); } else Craft.toast(`Not “${text}”. Keep guessing!`, 1100);
      });
    }
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.pt-guess')) { e.preventDefault(); guess(); } });
    /* Drawing pad: send normalized points in small chunks (~every 50 ms) so the big screen draws live. */
    let stroke = null, buf = [], flushT = null, seq = 0;
    const flush = more => {
      clearTimeout(flushT); flushT = null;
      if (!stroke || buf.length < 2) return;
      net.emit('player:party', { action: 'stroke', id: stroke.id, c: stroke.c, w: stroke.w, pts: buf, more });
      buf = more ? buf.slice(-2) : [];
    };
    root.addEventListener('pointerdown', e => {
      const cv = e.target.closest('.pt-mycanvas'); if (!cv) return;
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      stroke = { id: `s${Date.now().toString(36)}${seq++}`, c: pen, w: 6, cv, last: null };
      buf = []; addPt(e);
    });
    root.addEventListener('pointermove', e => { if (stroke && e.target === stroke.cv) { e.preventDefault(); addPt(e); } });
    const end = () => { if (stroke) { flush(false); stroke = null; } };
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
    function addPt(e) {
      const r = stroke.cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const ctx = stroke.cv.getContext('2d'), W = stroke.cv.width, Hh = stroke.cv.height;
      ctx.strokeStyle = stroke.c; ctx.lineWidth = stroke.w * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); const l = stroke.last || [x, y]; ctx.moveTo(l[0] * W, l[1] * Hh); ctx.lineTo(x * W + (stroke.last ? 0 : 0.1), y * Hh); ctx.stroke();
      stroke.last = [x, y]; buf.push(+x.toFixed(3), +y.toFixed(3));
      if (buf.length >= 40) flush(true); else if (!flushT) flushT = setTimeout(() => flush(true), 50);
    }
    /* touch-action on the pad so the page doesn't scroll while drawing */
    const style = document.createElement('style'); style.textContent = '.pt-mycanvas{touch-action:none}'; document.head.appendChild(style);
  }

  window.PartyUI = { board, host, play, bindPlay, onDraw, spin, NAMES, HOWTO, resetCanvas };
})();
