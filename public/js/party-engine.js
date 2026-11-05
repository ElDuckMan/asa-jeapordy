/*
 * ASA Jeopardy — party modes (Speed Quiz, Closest Guess, Two Truths & a Lie, Survey Says,
 * Fake Out, Wheel, Draw & Guess). Plugs into engine.js; runs in Node and in the browser preview.
 * All answers are per TEAM (a solo player is a team of one), except Two Truths (per player) and Draw (per player guesses, team scores).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JeopardyParty = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const Blitz = (typeof module === 'object' && module.exports && typeof require === 'function') ? require('./blitz-engine.js') : self.JeopardyBlitz;
  const TYPES = ['speed', 'closest', 'truths', 'survey', 'fakeout', 'wheel', 'draw'].concat(Blitz.TYPES);
  const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
  const str = (v, max = 500) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, max);
  const int = (v, d = 0, min = -1e9, max = 1e9) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
  const num = (v, d = 0) => { const n = Number(String(v).replace(/[, ]/g, '')); return Number.isFinite(n) ? n : d; };
  /* Answer normalizer: case, accents, punctuation, leading articles, simple plurals. */
  function norm(s) {
    let t = str(s, 200).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/&/g, ' and ')
      .replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.split(' ').map(w => (w.length > 3 && w.endsWith('es') && /(s|x|z|ch|sh)es$/.test(w)) ? w.slice(0, -2) : (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) ? w.slice(0, -1) : w).join(' ');
    return t;
  }
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const WEDGES = [500, 600, 700, 'BANKRUPT', 800, 550, 900, 650, 'LOSE A TURN', 1000, 600, 750, 400, 2500, 850, 450];
  const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
  const VOWEL_COST = 250;

  /* ----------------------------------------------------------- sanitize */
  function sanitize(r, i) {
    if (Blitz.TYPES.includes(r.type)) return Blitz.sanitize(r, i);
    const type = TYPES.includes(r.type) ? r.type : null;
    if (!type) return null;
    const base = { type, name: str(r.name, 60) || `Round ${i + 1}`, label: str(r.label, 30) };
    switch (type) {
      case 'speed': return Object.assign(base, { points: int(r.points, 500, 0, 100000), timer: int(r.timer, 15, 5, 120),
        items: arr(r.items, 200).map(x => { const o = arr(x && x.options, 6).map(y => str(y, 120)).filter(Boolean); return { q: str(x && x.q, 400), options: o, correct: int(x && x.correct, 0, 0, Math.max(0, o.length - 1)) }; }).filter(x => x.q && x.options.length >= 2) });
      case 'closest': return Object.assign(base, { points: int(r.points, 300, 0, 100000), timer: int(r.timer, 30, 5, 300),
        items: arr(r.items, 200).map(x => ({ q: str(x && x.q, 400), a: num(x && x.a, NaN), unit: str(x && x.unit, 40), note: str(x && x.note, 200) })).filter(x => x.q && Number.isFinite(x.a)) });
      case 'truths': return Object.assign(base, { points: int(r.points, 200, 0, 100000), timer: int(r.timer, 30, 0, 300) });
      case 'survey': return Object.assign(base, { points: int(r.points, 10, 1, 1000), timer: int(r.timer, 45, 0, 600),
        items: arr(r.items, 200).map(x => ({ q: str(x && x.q, 300), answers: arr(x && x.answers, 10).map(a => ({ a: str(a && a.a, 60), n: int(a && (a.n ?? a.pts), 1, 1, 1000) })).filter(a => a.a) })).filter(x => x.q) });
      case 'fakeout': return Object.assign(base, { truthPts: int(r.truthPts, 200, 0, 100000), foolPts: int(r.foolPts, 100, 0, 100000),
        timer: int(r.timer, 60, 0, 600), voteTimer: int(r.voteTimer, 30, 0, 600),
        items: arr(r.items, 200).map(x => ({ q: str(x && x.q, 400), a: str(x && x.a, 80), alts: arr(x && x.alts, 10).map(y => str(y, 80)).filter(Boolean) })).filter(x => x.q && x.a) });
      case 'wheel': return Object.assign(base, {
        items: arr(r.items, 200).map(x => ({ category: str(x && x.category, 40), phrase: str(x && x.phrase, 60).toUpperCase().replace(/[^A-Z '\-&]/g, '').replace(/\s+/g, ' ').trim() })).filter(x => /[A-Z]/.test(x.phrase)) });
      case 'draw': return Object.assign(base, { points: int(r.points, 200, 0, 100000), timer: int(r.timer, 75, 15, 300),
        items: arr(r.items, 500).map(x => str(typeof x === 'string' ? x : x && (x.w || x.q), 40)).filter(Boolean) });
    }
    return null;
  }

  /* ------------------------------------------------------------- engine */
  function create(ctx) {
    /* ctx: { fx(room,type,data), scoreFx(room,tid,delta), broadcast(room), sendTo(ch,ev,payload), now(), random() } */
    const { fx, scoreFx, broadcast, sendTo, now } = ctx;
    const rnd = ctx.random || Math.random;
    const teamIds = room => Object.keys(room.teams);
    const award = (room, tid, pts) => { const t = room.teams[tid]; if (!t || !pts) return; t.score += pts; scoreFx(room, tid, pts); };
    const clear = P => { if (P.timer) { clearTimeout(P.timer); P.timer = null; } };
    function arm(room, ms, fn) {
      const P = room.party; clear(P);
      if (!ms) { P.timerEnd = null; return; }
      P.timerEnd = now() + ms; P.timerSec = Math.round(ms / 1000);
      const token = P;
      P.timer = setTimeout(() => { if (room.party !== token) return; P.timer = null; P.timerEnd = null; fn(); broadcast(room); }, ms);
    }

    const BZ = Blitz.create(ctx);
    const isB = room => room.party && room.party.blitz;
    function start(room, r) {
      if (Blitz.TYPES.includes(r.type)) return BZ.start(room, r);
      const P = { type: r.type, r, idx: -1, stage: 'intro', timer: null, timerEnd: null, timerSec: 0, used: [] };
      if (r.type === 'truths') Object.assign(P, { stage: 'collect', subs: {}, played: [], cur: null });
      if (r.type === 'wheel') Object.assign(P, { stage: 'intro', banks: {}, active: teamIds(room)[0] || null, spin: { seq: 0, at: 0, value: null }, revealed: [], usedLetters: [] });
      room.party = P;
    }
    function stop(room) { if (isB(room)) return BZ.stop(room); if (room.party) clear(room.party); room.party = null; }
    const item = P => P.r.items[P.idx];
    /* next unplayed item index: sequential from current */
    function nextIndex(P, i) {
      const n = (P.r.items || []).length;
      if (!n) return -1;
      const k = i != null ? int(i, -1, 0, n - 1) : P.idx + 1;
      return k >= n ? -1 : k;
    }

    /* =========================== SPEED QUIZ =========================== */
    function speedOpen(room, i) {
      const P = room.party, k = nextIndex(P, i);
      if (k < 0) { P.stage = 'done'; return; }
      Object.assign(P, { idx: k, stage: 'question', answers: {}, openedAt: now(), earned: {} });
      arm(room, P.r.timer * 1000, () => speedReveal(room));
      fx(room, 'open');
    }
    function speedReveal(room) {
      const P = room.party; if (P.stage !== 'question') return;
      clear(P); P.timerEnd = null; P.stage = 'reveal';
      const it = item(P), T = P.r.timer * 1000;
      for (const [tid, a] of Object.entries(P.answers)) {
        if (a.choice !== it.correct) continue;
        const pts = Math.round(P.r.points * (1 - 0.5 * Math.min(1, a.t / T)) / 10) * 10;
        P.earned[tid] = pts; award(room, tid, pts);
      }
      fx(room, 'reveal');
    }
    /* =========================== CLOSEST GUESS ======================== */
    function closestOpen(room, i) {
      const P = room.party, k = nextIndex(P, i);
      if (k < 0) { P.stage = 'done'; return; }
      Object.assign(P, { idx: k, stage: 'question', answers: {}, ranking: [] });
      arm(room, P.r.timer * 1000, () => closestReveal(room));
      fx(room, 'open');
    }
    function closestReveal(room) {
      const P = room.party; if (P.stage !== 'question') return;
      clear(P); P.timerEnd = null; P.stage = 'reveal';
      const a = item(P).a;
      P.ranking = Object.entries(P.answers).map(([tid, x]) => ({ tid, guess: x.n, off: Math.abs(x.n - a) })).sort((x, y) => x.off - y.off);
      const best = P.ranking.length ? P.ranking[0].off : null;
      P.ranking.forEach(x => { x.win = x.off === best; x.pts = x.win ? (x.off === 0 ? P.r.points * 2 : P.r.points) : 0; if (x.pts) award(room, x.tid, x.pts); });
      fx(room, 'reveal');
    }
    /* =========================== TWO TRUTHS =========================== */
    function truthsNext(room, pid) {
      const P = room.party;
      const pool = Object.keys(P.subs).filter(id => !P.played.includes(id) && room.players[id]);
      const pick = pid && pool.includes(pid) ? pid : pool[Math.floor(rnd() * pool.length)];
      if (!pick) return { error: 'Nobody left who has submitted. Ask players to submit, or end the round.' };
      const s = P.subs[pick], order = shuffle([0, 1, 2], rnd);
      P.played.push(pick);
      P.cur = { pid: pick, team: room.players[pick].teamId, name: room.players[pick].name, statements: order.map(i => s.s[i]), lie: order.indexOf(s.lie), votes: {}, earned: {} };
      P.stage = 'vote';
      arm(room, P.r.timer * 1000, () => truthsReveal(room));
      fx(room, 'open');
    }
    function truthsReveal(room) {
      const P = room.party, c = P.cur; if (!c || P.stage !== 'vote') return;
      clear(P); P.timerEnd = null; P.stage = 'reveal';
      let fooled = 0;
      for (const [tid, v] of Object.entries(c.votes)) {
        if (v === c.lie) { c.earned[tid] = (c.earned[tid] || 0) + P.r.points; award(room, tid, P.r.points); } else fooled++;
      }
      if (fooled && room.teams[c.team]) { const pts = fooled * Math.round(P.r.points / 2); c.earned[c.team] = (c.earned[c.team] || 0) + pts; award(room, c.team, pts); }
      fx(room, 'reveal');
    }
    /* =========================== SURVEY SAYS ========================== */
    function surveyOpen(room, i) {
      const P = room.party, k = nextIndex(P, i);
      if (k < 0) { P.stage = 'done'; return; }
      P.idx = k;
      const it = item(P);
      Object.assign(P, { idx: k, responses: {}, board: [], shown: [], strikes: 0, bank: 0, active: P.active && room.teams[P.active] ? P.active : (teamIds(room)[0] || null) });
      if (it.answers && it.answers.length) { P.board = it.answers.map(a => ({ a: a.a, n: a.n })).sort((x, y) => y.n - x.n).slice(0, 8); P.stage = 'board'; }
      else { P.stage = 'collect'; arm(room, P.r.timer * 1000, () => surveyTally(room)); }
      fx(room, 'open');
    }
    function surveyTally(room) {
      const P = room.party; if (P.stage !== 'collect') return;
      clear(P); P.timerEnd = null;
      const groups = new Map();
      for (const r of Object.values(P.responses)) {
        const k = norm(r); if (!k) continue;
        const g = groups.get(k) || { a: r, n: 0, forms: {} };
        g.n++; g.forms[r] = (g.forms[r] || 0) + 1;
        groups.set(k, g);
      }
      P.board = [...groups.values()].map(g => ({ a: Object.entries(g.forms).sort((x, y) => y[1] - x[1])[0][0], n: g.n })).sort((x, y) => y.n - x.n).slice(0, 8);
      P.respondents = Object.keys(P.responses).length;
      P.stage = P.board.length ? 'review' : 'collect';
      if (!P.board.length) return { error: 'No answers yet.' };
    }
    /* =========================== FAKE OUT ============================= */
    function fakeOpen(room, i) {
      const P = room.party, k = nextIndex(P, i);
      if (k < 0) { P.stage = 'done'; return; }
      Object.assign(P, { idx: k, stage: 'write', fakes: {}, choices: [], votes: {}, earned: {} });
      arm(room, P.r.timer * 1000, () => fakeVote(room));
      fx(room, 'open');
    }
    function isTruth(P, text) { const it = item(P), n = norm(text); return n === norm(it.a) || it.alts.some(a => norm(a) === n); }
    function fakeVote(room) {
      const P = room.party; if (P.stage !== 'write') return;
      clear(P);
      const it = item(P), seen = new Map();
      for (const [tid, f] of Object.entries(P.fakes)) {
        if (f.dropped) continue;
        const k = norm(f.text);
        if (seen.has(k)) seen.get(k).authors.push(tid); else seen.set(k, { text: f.text, authors: [tid], truth: false });
      }
      P.choices = shuffle([{ text: it.a, authors: [], truth: true }, ...seen.values()], rnd).map((c, i) => Object.assign(c, { id: i }));
      P.stage = 'vote';
      arm(room, P.r.voteTimer * 1000, () => fakeReveal(room));
      fx(room, 'open');
    }
    function fakeReveal(room) {
      const P = room.party; if (P.stage !== 'vote') return;
      clear(P); P.timerEnd = null; P.stage = 'reveal';
      const add = (tid, pts) => { if (!room.teams[tid] || !pts) return; P.earned[tid] = (P.earned[tid] || 0) + pts; award(room, tid, pts); };
      for (const [tid, cid] of Object.entries(P.votes)) {
        const c = P.choices[cid]; if (!c) continue;
        if (c.truth) add(tid, P.r.truthPts); else for (const a of c.authors) if (a !== tid) add(a, P.r.foolPts);
      }
      fx(room, 'reveal');
    }
    /* =========================== WHEEL ================================ */
    const letters = phrase => [...new Set(phrase.replace(/[^A-Z]/g, ''))];
    function wheelOpen(room, i) {
      const P = room.party, k = nextIndex(P, i);
      if (k < 0) { P.stage = 'done'; return; }
      Object.assign(P, { idx: k, stage: 'spin', banks: {}, revealed: [], usedLetters: [], spin: { seq: P.spin.seq, at: 0, value: null, wedge: null }, lastMsg: '' });
      if (!P.active || !room.teams[P.active]) P.active = teamIds(room)[0] || null;
      fx(room, 'open');
    }
    function wheelNextTeam(room, why) {
      const P = room.party, ids = teamIds(room);
      if (!ids.length) return;
      const k = ids.indexOf(P.active);
      P.active = ids[(k + 1) % ids.length];
      P.stage = 'spin'; P.spin.value = null; P.lastMsg = why || '';
    }
    function wheelSpin(room, byTeam) {
      const P = room.party;
      if (P.stage !== 'spin') return { error: 'Not time to spin.' };
      if (byTeam && byTeam !== P.active) return { error: 'It\'s not your turn.' };
      if (letters(item(P).phrase).every(L => P.revealed.includes(L) || VOWELS.has(L))) return { error: 'Only vowels left. Buy a vowel or solve.' };
      const w = Math.floor(rnd() * WEDGES.length), v = WEDGES[w];
      P.spin = { seq: P.spin.seq + 1, at: now(), wedge: w, value: v };
      P.stage = 'spinning';
      fx(room, 'spin', { wedge: w, seq: P.spin.seq });
      const token = P.spin.seq;
      clear(P);
      P.timer = setTimeout(() => {
        if (room.party !== P || P.spin.seq !== token) return;
        P.timer = null;
        if (v === 'BANKRUPT') { P.banks[P.active] = 0; fx(room, 'wrong', { team: P.active }); wheelNextTeam(room, 'Bankrupt!'); }
        else if (v === 'LOSE A TURN') { fx(room, 'wrong', { team: P.active }); wheelNextTeam(room, 'Lose a turn!'); }
        else { P.stage = 'letter'; P.lastMsg = `${v} per letter: pick a consonant`; }
        broadcast(room);
      }, 4200);
    }
    function wheelLetter(room, L, byTeam) {
      const P = room.party;
      L = String(L || '').toUpperCase().slice(0, 1);
      if (!/^[A-Z]$/.test(L)) return { error: 'Pick a letter.' };
      if (byTeam && byTeam !== P.active) return { error: 'It\'s not your turn.' };
      if (P.usedLetters.includes(L)) return { error: `${L} was already called.` };
      const phrase = item(P).phrase, count = [...phrase].filter(c => c === L).length;
      if (VOWELS.has(L)) {
        if (!['spin', 'letter'].includes(P.stage)) return { error: 'Wait for the wheel.' };
        if ((P.banks[P.active] || 0) < VOWEL_COST) return { error: `A vowel costs ${VOWEL_COST}.` };
        P.banks[P.active] -= VOWEL_COST;
      } else {
        if (P.stage !== 'letter') return { error: 'Spin first, then pick a consonant.' };
        P.banks[P.active] = (P.banks[P.active] || 0) + count * P.spin.value;
      }
      P.usedLetters.push(L);
      if (count) { P.revealed.push(L); P.lastMsg = `${count} ${L}${count === 1 ? '' : "'s"}!`; fx(room, 'letter', { L, count }); if (!VOWELS.has(L)) P.stage = 'spin'; }
      else { fx(room, 'wrong', { team: P.active }); wheelNextTeam(room, `No ${L}.`); }
    }
    function wheelSolve(room, ok) {
      const P = room.party;
      if (!['spin', 'letter'].includes(P.stage)) return { error: 'Wait for the wheel to stop.' };
      if (!ok) { fx(room, 'wrong', { team: P.active }); wheelNextTeam(room, 'Not quite!'); return; }
      const bank = Math.max(P.banks[P.active] || 0, 500);
      award(room, P.active, bank);
      P.revealed = letters(item(P).phrase); P.stage = 'solved'; P.lastMsg = `Solved! +${bank}`;
      fx(room, 'correct', { team: P.active });
    }
    /* =========================== DRAW & GUESS ========================= */
    function drawStart(room, d) {
      const P = room.party;
      const ids = Object.keys(room.players).filter(id => room.players[id].connected);
      const drawer = d.pid && room.players[d.pid] ? d.pid : ids.filter(id => id !== P.drawer)[Math.floor(rnd() * Math.max(1, ids.length - 1))] || ids[0];
      if (!drawer) return { error: 'No players connected.' };
      const k = nextIndex(P, d.i);
      if (k < 0) { P.stage = 'done'; return; }
      Object.assign(P, { idx: k, stage: 'drawing', drawer, strokes: [], points: 0, solved: {}, feed: [], guesses: [] });
      arm(room, P.r.timer * 1000, () => drawEnd(room));
      for (const ch of ['board', 'host', 'players']) sendTo(`${room.code}:${ch}`, 'draw', { clear: true });
      fx(room, 'open');
    }
    function drawEnd(room) {
      const P = room.party; if (P.stage !== 'drawing') return;
      clear(P); P.timerEnd = null; P.stage = 'reveal';
      fx(room, 'reveal');
    }

    /* ============================ VIEWS =============================== */
    function view(room, role, teamId) {
      const P = room.party; if (!P) return null;
      if (P.blitz) return BZ.view(room, role, teamId);
      const host = role === 'host', it = P.idx >= 0 && P.r.items ? P.r.items[P.idx] : null;
      const v = { type: P.type, name: P.r.name, label: P.r.label, stage: P.stage, idx: P.idx, total: P.r.items ? P.r.items.length : 0, timerEnd: P.timerEnd, timerSec: P.timerSec };
      if (host && P.r.items) v.list = P.r.items.map(x => typeof x === 'string' ? x : (x.phrase || x.q || '')).map(x => x.length > 70 ? x.slice(0, 68) + '…' : x);
      switch (P.type) {
        case 'speed':
          if (it) Object.assign(v, { q: it.q, options: it.options, answered: Object.keys(P.answers || {}) });
          if (P.stage === 'reveal') Object.assign(v, { correct: it.correct, picks: Object.fromEntries(Object.entries(P.answers).map(([t, a]) => [t, a.choice])), earned: P.earned });
          else if (teamId && P.answers && P.answers[teamId]) v.mine = P.answers[teamId].choice;
          if (host && it) v.correct = it.correct;
          return v;
        case 'closest':
          if (it) Object.assign(v, { q: it.q, unit: it.unit, answered: Object.keys(P.answers || {}) });
          if (P.stage === 'reveal' || host) Object.assign(v, { a: it && it.a, note: it && it.note });
          if (P.stage === 'reveal') v.ranking = P.ranking;
          else if (teamId && P.answers && P.answers[teamId]) v.mine = P.answers[teamId].n;
          if (host && P.answers) v.guesses = Object.fromEntries(Object.entries(P.answers).map(([t, a]) => [t, a.n]));
          return v;
        case 'truths': {
          v.submitted = Object.keys(P.subs).filter(id => room.players[id]).map(id => ({ pid: id, name: room.players[id].name, played: P.played.includes(id) }));
          const c = P.cur;
          if (c && P.stage !== 'collect') {
            Object.assign(v, { author: c.name, authorPid: c.pid, authorTeam: c.team, statements: c.statements, voted: Object.keys(c.votes) });
            if (P.stage === 'reveal' || host) v.lie = c.lie;
            if (P.stage === 'reveal') Object.assign(v, { votes: c.votes, earned: c.earned });
            else if (teamId && c.votes[teamId] != null) v.mine = c.votes[teamId];
          }
          return v;
        }
        case 'survey':
          if (it) Object.assign(v, { q: it.q, respondents: Object.keys(P.responses || {}).length, strikes: P.strikes, bank: P.bank, active: P.active, preset: !!(it.answers && it.answers.length) });
          if (P.board) v.board = P.board.map((b, i) => (host || P.shown.includes(i) || P.stage === 'over') ? { a: b.a, n: b.n, shown: P.shown.includes(i) } : { shown: false });
          return v;
        case 'fakeout':
          if (it) Object.assign(v, { q: it.q, wrote: Object.keys(P.fakes || {}).filter(t => !P.fakes[t].dropped) });
          if (host && it) Object.assign(v, { a: it.a, fakes: P.fakes });
          if (P.stage === 'vote' || P.stage === 'reveal') v.choices = P.choices.map(c => (P.stage === 'reveal' || host) ? c : { id: c.id, text: c.text });
          if (P.stage === 'vote') v.voted = Object.keys(P.votes);
          if (P.stage === 'reveal') Object.assign(v, { a: it.a, votes: P.votes, earned: P.earned });
          if (teamId && P.fakes && P.fakes[teamId]) v.myFake = P.fakes[teamId].text;
          if (teamId && P.votes && P.votes[teamId] != null) v.mine = P.votes[teamId];
          if (teamId && P.choices) v.ownChoice = (P.choices.find(c => c.authors && c.authors.includes(teamId)) || {}).id;
          return v;
        case 'wheel':
          if (it) {
            const show = new Set(P.revealed);
            Object.assign(v, { category: it.category, board: [...it.phrase].map(ch => /[A-Z]/.test(ch) ? (show.has(ch) || P.stage === 'solved' ? ch : '_') : ch).join(''),
              usedLetters: P.usedLetters, banks: P.banks, active: P.active, spin: P.spin, msg: P.lastMsg, wedges: WEDGES, vowelCost: VOWEL_COST });
            if (host) v.phrase = it.phrase;
          } else Object.assign(v, { wedges: WEDGES, active: P.active, spin: P.spin });
          return v;
        case 'draw': {
          const drawerP = P.drawer && room.players[P.drawer];
          Object.assign(v, { drawer: P.drawer, drawerName: drawerP ? drawerP.name : '', drawerTeam: drawerP ? drawerP.teamId : null, solved: P.solved || {}, feed: (P.feed || []).slice(-12) });
          if (it && (host || P.stage === 'reveal')) v.word = it;
          if (it) v.wordShape = it.replace(/[^\s]/g, '_');
          if (role === 'board' || host) v.strokes = P.strokes || [];
          if (host) v.guesses = (P.guesses || []).slice(-20);
          return v;
        }
      }
      return v;
    }

    /* ============================ HOST =============================== */
    function host(room, d) {
      const P = room.party; if (!P) return { error: 'No party round is running.' };
      if (P.blitz) return BZ.host(room, d);
      const a = d.action;
      switch (P.type) {
        case 'speed':
          if (a === 'next') return speedOpen(room, d.i);
          if (a === 'reveal') return speedReveal(room);
          break;
        case 'closest':
          if (a === 'next') return closestOpen(room, d.i);
          if (a === 'reveal') return closestReveal(room);
          break;
        case 'truths':
          if (a === 'next') return truthsNext(room, d.pid);
          if (a === 'reveal') return truthsReveal(room);
          if (a === 'collect') { clear(P); P.stage = 'collect'; P.cur = null; P.timerEnd = null; return; }
          if (a === 'drop' && P.subs[d.pid]) { delete P.subs[d.pid]; return; }
          break;
        case 'survey':
          if (a === 'next') return surveyOpen(room, d.i);
          if (a === 'tally') return surveyTally(room);
          if (a === 'play') { if (!P.board || !P.board.length) return { error: 'No answers on the board.' }; P.stage = 'board'; fx(room, 'open'); return; }
          if (a === 'del' && P.board && P.board[d.k]) { P.board.splice(d.k, 1); return; }
          if (a === 'edit' && P.board[d.k]) { const t = str(d.text, 60); if (!t) P.board.splice(d.k, 1); else P.board[d.k].a = t; return; }
          if (a === 'merge' && P.board[d.k] && P.board[d.into] && d.k !== d.into) { P.board[d.into].n += P.board[d.k].n; P.board.splice(d.k, 1); P.board.sort((x, y) => y.n - x.n); return; }
          if (a === 'show' && P.board[d.k] && !P.shown.includes(d.k)) { P.shown.push(d.k); P.bank += P.board[d.k].n * P.r.points; fx(room, 'correct', { team: P.active, quiet: true }); return; }
          if (a === 'strike') { P.strikes = Math.min(3, P.strikes + 1); fx(room, 'strike', { n: P.strikes }); return; }
          if (a === 'unstrike') { P.strikes = Math.max(0, P.strikes - 1); return; }
          if (a === 'active' && room.teams[d.team]) { P.active = d.team; return; }
          if (a === 'award' && room.teams[d.team]) { award(room, d.team, P.bank); P.bank = 0; fx(room, 'correct', { team: d.team }); return; }
          if (a === 'showAll') { P.shown = P.board.map((_, i) => i); P.stage = 'over'; fx(room, 'reveal'); return; }
          break;
        case 'fakeout':
          if (a === 'next') return fakeOpen(room, d.i);
          if (a === 'vote') return fakeVote(room);
          if (a === 'reveal') return fakeReveal(room);
          if (a === 'drop' && P.fakes && P.fakes[d.team]) { P.fakes[d.team].dropped = true; return; }
          break;
        case 'wheel':
          if (a === 'next') return wheelOpen(room, d.i);
          if (a === 'spin') return wheelSpin(room);
          if (a === 'letter') return wheelLetter(room, d.L);
          if (a === 'solve') return wheelSolve(room, !!d.ok);
          if (a === 'active' && room.teams[d.team]) { P.active = d.team; if (P.stage === 'letter') P.stage = 'spin'; return; }
          if (a === 'pass') { wheelNextTeam(room, ''); return; }
          break;
        case 'draw':
          if (a === 'next') return drawStart(room, d);
          if (a === 'end') return drawEnd(room);
          if (a === 'award' && room.teams[d.team]) { award(room, d.team, int(d.pts, P.r.points, -100000, 100000)); return; }
          break;
      }
      return { error: 'Unknown action.' };
    }

    /* ============================ PLAYERS ============================ */
    function player(room, p, d) {
      const P = room.party; if (!P) return { error: 'No party round is running.', quiet: true };
      if (P.blitz) return BZ.player(room, p, d);
      const a = d.action, tid = p.teamId;
      switch (P.type) {
        case 'speed': {
          if (a !== 'answer' || P.stage !== 'question') return { error: 'Answers are closed.' };
          if (P.answers[tid]) return { error: 'Your team already answered.' };
          const c = int(d.choice, -1, -1, item(P).options.length - 1); if (c < 0) return { error: 'Pick an answer.' };
          P.answers[tid] = { choice: c, t: now() - P.openedAt, by: p.name };
          if (Object.keys(room.teams).every(t => P.answers[t])) speedReveal(room);
          return;
        }
        case 'closest': {
          if (a !== 'answer' || P.stage !== 'question') return { error: 'Guesses are closed.' };
          const n = num(d.n, NaN); if (!Number.isFinite(n)) return { error: 'Type a number.' };
          P.answers[tid] = { n, by: p.name };
          if (Object.keys(room.teams).every(t => P.answers[t])) closestReveal(room);
          return;
        }
        case 'truths': {
          if (a === 'submit') {
            if (P.stage !== 'collect' && P.cur && P.cur.pid === p.id) return { error: 'You are up right now!' };
            const s = arr(d.s, 3).map(x => str(x, 140));
            if (s.length !== 3 || s.some(x => !x)) return { error: 'Fill in all three statements.' };
            const lie = int(d.lie, -1, -1, 2); if (lie < 0) return { error: 'Mark which one is the lie.' };
            P.subs[p.id] = { s, lie };
            return;
          }
          if (a === 'vote') {
            const c = P.cur; if (!c || P.stage !== 'vote') return { error: 'Voting is closed.' };
            if (tid === c.team) return { error: 'Your teammate wrote these. No voting!' };
            c.votes[tid] = int(d.choice, 0, 0, 2);
            if (Object.keys(room.teams).filter(t => t !== c.team).every(t => c.votes[t] != null)) truthsReveal(room);
            return;
          }
          break;
        }
        case 'survey': {
          if (a !== 'answer' || P.stage !== 'collect') return { error: 'The survey is closed.' };
          const t = str(d.text, 60); if (!t) return { error: 'Type an answer.' };
          P.responses[p.id] = t;
          return { quiet: false };
        }
        case 'fakeout': {
          if (a === 'fake') {
            if (P.stage !== 'write') return { error: 'Writing time is over.' };
            const t = str(d.text, 80); if (!t) return { error: 'Type a fake answer.' };
            if (isTruth(P, t)) return { error: 'Whoa, that\'s the real answer! Write a fake one.' };
            P.fakes[tid] = { text: t, by: p.name };
            const live = Object.keys(room.teams);
            if (live.every(x => P.fakes[x])) fakeVote(room);
            return;
          }
          if (a === 'vote') {
            if (P.stage !== 'vote') return { error: 'Voting is closed.' };
            const c = P.choices[int(d.choice, -1, -1, P.choices.length - 1)];
            if (!c) return { error: 'Pick an answer.' };
            if (c.authors.includes(tid)) return { error: 'That\'s your own fake!' };
            P.votes[tid] = c.id;
            if (Object.keys(room.teams).every(t => P.votes[t] != null)) fakeReveal(room);
            return;
          }
          break;
        }
        case 'wheel':
          if (a === 'spin') return wheelSpin(room, tid);
          if (a === 'letter') return wheelLetter(room, d.L, tid);
          break;
        case 'draw': {
          if (a === 'stroke') {
            if (P.stage !== 'drawing' || p.id !== P.drawer) return { quiet: true };
            const pts = arr(d.pts, 400).map(x => Math.round(Math.min(1, Math.max(0, Number(x) || 0)) * 1000) / 1000);
            if (pts.length < 2 || P.strokes.reduce((n, s) => n + s.pts.length, 0) > 20000) return { quiet: true };
            const s = { id: str(d.id, 20), c: /^#[0-9a-f]{6}$/i.test(d.c) ? d.c : '#1c1a17', w: int(d.w, 6, 1, 40), pts, more: !!d.more };
            P.strokes.push(s);
            sendTo(`${room.code}:board`, 'draw', { s }); sendTo(`${room.code}:host`, 'draw', { s });
            return { quiet: true };
          }
          if (a === 'clear') {
            if (p.id !== P.drawer) return { quiet: true };
            P.strokes = []; sendTo(`${room.code}:board`, 'draw', { clear: true }); sendTo(`${room.code}:host`, 'draw', { clear: true });
            return { quiet: true };
          }
          if (a === 'guess') {
            if (P.stage !== 'drawing') return { error: 'Not guessing right now.' };
            if (p.id === P.drawer) return { error: 'No guessing your own drawing!' };
            const drawerTeam = room.players[P.drawer] && room.players[P.drawer].teamId;
            if (tid === drawerTeam) return { error: 'Your teammate is drawing. Cheer them on!' };
            if (P.solved[tid]) return { error: 'Your team already got it!' };
            const g = str(d.text, 60); if (!g) return { quiet: true };
            P.guesses.push({ name: p.name, team: tid, text: g });
            const want = norm(item(P)), got = norm(g);
            if (got && (got === want || got.replace(/ /g, '') === want.replace(/ /g, ''))) {
              const order = Object.keys(P.solved).length;
              const pts = Math.max(Math.round(P.r.points / 4), Math.round(P.r.points * (1 - order * 0.25)));
              P.solved[tid] = { by: p.name, pts };
              award(room, tid, pts);
              if (drawerTeam) award(room, drawerTeam, Math.round(P.r.points / 4));
              P.feed.push({ name: p.name, team: tid, ok: true });
              fx(room, 'correct', { team: tid, quiet: order > 0 });
              const others = Object.keys(room.teams).filter(t => t !== drawerTeam);
              if (others.length && others.every(t => P.solved[t])) drawEnd(room);
              return { ok: true, correct: true };
            }
            return { ok: true, correct: false };
          }
          break;
        }
      }
      return { error: 'Not now.', quiet: true };
    }

    /* Private bits only one player may see (their own Two Truths entry, the drawer's word). */
    function mine(room, pid) {
      const P = room.party; if (!P) return null;
      if (P.blitz) return BZ.mine(room, pid);
      if (P.type === 'truths') return { mySub: P.subs[pid] || null };
      if (P.type === 'draw') return { word: P.drawer === pid && P.stage === 'drawing' && P.r.items[P.idx] || null };
      return null;
    }
    return { start, stop, view, host, player, mine };
  }

  return { TYPES, sanitize, create, norm };
});
