/*
 * ASA Jeopardy — Category Bingo.
 * Each phone holds a 5×5 card: 12 categories × 2 squares + a free centre. The big screen draws a category and
 * asks a 4-option question that EVERYONE answers. A right answer marks one square of that category (you pick which);
 * "double down" marks two if right and costs a marked square if wrong. Hard questions come out once anyone is one away.
 * Rounds change the pattern: any line → four corners → an X. Bingo points go to the winner's team (a solo player is a team of one).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JeopardyBingo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TYPES = ['bingo'];
  const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
  const str = (v, max = 500) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, max);
  const int = (v, d = 0, min = -1e9, max = 1e9) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const FREE = 12;
  const LINES = [];
  for (let r = 0; r < 5; r++) LINES.push([0, 1, 2, 3, 4].map(c => r * 5 + c));
  for (let c = 0; c < 5; c++) LINES.push([0, 1, 2, 3, 4].map(r => r * 5 + c));
  LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  const PATTERNS = {
    line: { name: 'Any line', sets: LINES },
    corners: { name: 'Four corners', sets: [[0, 4, 20, 24, 12]] },
    x: { name: 'The X', sets: [[0, 6, 12, 18, 24, 4, 8, 16, 20]] },
    full: { name: 'Blackout', sets: [Array.from({ length: 25 }, (_, i) => i)] }
  };
  const mcq = x => { const o = arr(x && x.options, 6).map(y => str(y, 120)).filter(Boolean); return { q: str(x && x.q, 400), options: o, correct: int(x && x.correct, 0, 0, Math.max(0, o.length - 1)) }; };

  function sanitize(r, i) {
    if (r.type !== 'bingo') return null;
    const cats = arr(r.cats, 12).map(c => ({ name: str(c && c.name, 40), short: str(c && c.short, 14) || str(c && c.name, 14), icon: str(c && c.icon, 8),
      normal: arr(c && c.normal, 200).map(mcq).filter(x => x.q && x.options.length >= 2), hard: arr(c && c.hard, 200).map(mcq).filter(x => x.q && x.options.length >= 2) }))
      .filter(c => c.name && c.normal.length);
    const pats = arr(r.patterns, 6).filter(p => PATTERNS[p]);
    return { type: 'bingo', name: str(r.name, 60) || `Round ${i + 1}`, label: str(r.label, 30), timer: int(r.timer, 15, 5, 120),
      points: int(r.points, 500, 0, 100000), patterns: pats.length ? pats : ['line', 'corners', 'x'], cats };
  }

  function create(ctx) {
    const { fx, scoreFx, broadcast, now } = ctx;
    const rnd = ctx.random || Math.random;
    const award = (room, tid, pts) => { const t = room.teams[tid]; if (!t || !pts) return; t.score += pts; scoreFx(room, tid, pts); };
    const clearT = P => { if (P.timer) { clearTimeout(P.timer); P.timer = null; } };

    function start(room, r) {
      room.party = { type: 'bingo', bingo: true, r, stage: 'intro', round: 0, cards: {}, cat: null, q: null, hard: false, used: {}, ans: {}, results: null,
        pending: {}, winners: [], lastCat: null, history: [], turn: 0, timer: null, timerEnd: null, timerSec: 0 };
    }
    function stop(room) { if (room.party) clearT(room.party); room.party = null; }
    const pattern = P => PATTERNS[P.r.patterns[Math.min(P.round, P.r.patterns.length - 1)]];

    /* A card: 12 categories × 2 squares in random order, free centre. Same card all game; marks reset each round. */
    function card(room, pid) {
      const P = room.party;
      if (!P.cards[pid]) {
        const n = P.r.cats.length, slots = shuffle(Array.from({ length: 24 }, (_, i) => i % n), rnd);
        const layout = slots.slice(0, FREE).concat([-1], slots.slice(FREE));
        P.cards[pid] = { layout, marked: layout.map(c => c === -1), order: [] };
      }
      return P.cards[pid];
    }
    function missing(P, cd, marked) {
      const m = marked || cd.marked;
      return Math.min(...pattern(P).sets.map(set => set.filter(i => !m[i]).length));
    }
    const isWinner = (P, pid) => P.winners.some(w => w.pid === pid);
    function checkBingo(room, pid) {
      const P = room.party, cd = P.cards[pid], pl = room.players[pid];
      if (!cd || !pl || isWinner(P, pid) || missing(P, cd) > 0) return;
      P.winners.push({ pid, name: pl.name, team: pl.teamId });
      award(room, pl.teamId, P.r.points);
      P.stage = 'won';
      fx(room, 'bingo', { team: pl.teamId, name: pl.name });
    }
    function mark(room, pid, cell) {
      const P = room.party, cd = P.cards[pid];
      cd.marked[cell] = true; cd.order.push(cell);
    }
    /* Mark whatever is forced (when the free squares of that category ≤ marks owed); otherwise wait for the player to pick. */
    function settle(room, pid) {
      const P = room.party, pend = P.pending[pid], cd = P.cards[pid];
      if (!pend) return;
      const avail = cd.layout.map((c, i) => c === pend.cat && !cd.marked[i] ? i : -1).filter(i => i >= 0);
      if (avail.length <= pend.n) { for (const i of avail) mark(room, pid, i); delete P.pending[pid]; checkBingo(room, pid); }
    }
    /* If a player never picked, choose for them: the square that brings them closest to bingo. */
    function autoPick(room, pid) {
      const P = room.party, pend = P.pending[pid], cd = P.cards[pid];
      while (pend && pend.n > 0) {
        const avail = cd.layout.map((c, i) => c === pend.cat && !cd.marked[i] ? i : -1).filter(i => i >= 0);
        if (!avail.length) break;
        const best = avail.map(i => { const m = cd.marked.slice(); m[i] = true; return [missing(P, cd, m), i]; }).sort((a, b) => a[0] - b[0])[0][1];
        mark(room, pid, best); pend.n--;
      }
      delete P.pending[pid]; checkBingo(room, pid);
    }

    function nearCount(room) {
      const P = room.party;
      return Object.keys(P.cards).filter(pid => room.players[pid] && !isWinner(P, pid) && missing(P, P.cards[pid]) === 1).length;
    }
    function pickQuestion(P, ci, hard) {
      const c = P.r.cats[ci], pool = hard && c.hard.length ? 'hard' : 'normal', u = P.used[ci] = P.used[ci] || { normal: [], hard: [] };
      let left = c[pool].map((_, i) => i).filter(i => !u[pool].includes(i));
      if (!left.length) { u[pool] = []; left = c[pool].map((_, i) => i); }
      const k = left[Math.floor(rnd() * left.length)];
      u[pool].push(k);
      return { item: c[pool][k], hard: pool === 'hard' };
    }

    function draw(room) {
      const P = room.party;
      if (P.stage === 'question') return { error: 'Reveal the answer first.' };
      if (P.stage === 'won') return { error: 'Somebody has bingo! Start the next round.' };
      if (P.stage === 'done') return { error: 'The game is over.' };
      for (const pid of Object.keys(room.players)) card(room, pid);
      for (const pid of Object.keys(P.pending)) autoPick(room, pid);
      if (P.stage === 'won') return;
      const n = P.r.cats.length;
      let ci = Math.floor(rnd() * n);
      if (n > 1 && ci === P.lastCat) ci = (ci + 1 + Math.floor(rnd() * (n - 1))) % n;
      const wantHard = nearCount(room) > 0;
      const { item, hard } = pickQuestion(P, ci, wantHard);
      Object.assign(P, { cat: ci, q: item, hard, ans: {}, results: null, stage: 'question', lastCat: ci, turn: P.turn + 1, openedAt: now() });
      P.history.push(ci); if (P.history.length > 10) P.history.shift();
      clearT(P);
      P.timerEnd = now() + P.r.timer * 1000; P.timerSec = P.r.timer;
      P.timer = setTimeout(() => { if (room.party !== P) return; reveal(room); broadcast(room); }, P.r.timer * 1000 + 300);
      fx(room, 'draw', { cat: ci, name: P.r.cats[ci].name, icon: P.r.cats[ci].icon, hard });
    }
    function reveal(room) {
      const P = room.party; if (P.stage !== 'question') return;
      clearT(P); P.timerEnd = null; P.stage = 'reveal';
      const res = { right: 0, wrong: 0, none: 0, lost: 0 }, per = {};
      for (const pid of Object.keys(P.cards)) {
        if (!room.players[pid]) continue;
        const a = P.ans[pid], cd = P.cards[pid];
        if (!a) { res.none++; continue; }
        const ok = a.choice === P.q.correct;
        per[pid] = { ok, dbl: a.dbl };
        if (ok) { res.right++; P.pending[pid] = { cat: P.cat, n: a.dbl ? 2 : 1 }; settle(room, pid); }
        else {
          res.wrong++;
          if (a.dbl) {
            const last = cd.order.pop();
            if (last != null) { cd.marked[last] = false; per[pid].lost = last; res.lost++; }
          }
        }
      }
      P.results = { ...res, per };
      fx(room, 'reveal');
    }
    function nextRound(room) {
      const P = room.party;
      for (const pid of Object.keys(P.pending)) delete P.pending[pid];
      if (P.round + 1 >= P.r.patterns.length) { P.stage = 'done'; clearT(P); P.timerEnd = null; fx(room, 'end'); return; }
      P.round++; P.winners = []; P.stage = 'ready'; P.q = null; P.cat = null; P.results = null; clearT(P); P.timerEnd = null;
      for (const cd of Object.values(P.cards)) { cd.marked = cd.layout.map(c => c === -1); cd.order = []; }
      fx(room, 'round', { name: `Round ${P.round + 1}: ${pattern(P).name}`, kind: 'bingo' });
    }

    function host(room, d) {
      const P = room.party, a = d.action;
      if (a === 'begin' || a === 'draw') { if (P.stage === 'intro') P.stage = 'ready'; return draw(room); }
      if (a === 'reveal') return reveal(room);
      if (a === 'nextRound') return nextRound(room);
      if (a === 'end') { clearT(P); P.timerEnd = null; P.stage = 'done'; fx(room, 'end'); return; }
      return { error: 'Unknown action.' };
    }
    function player(room, p, d) {
      const P = room.party, a = d.action;
      card(room, p.id);
      if (a === 'answer') {
        if (P.stage !== 'question') return { error: 'Wait for the next question.' };
        if (P.ans[p.id]) return { error: 'Locked in!' };
        const c = int(d.choice, -1, -1, P.q.options.length - 1); if (c < 0) return { error: 'Pick an answer.' };
        P.ans[p.id] = { choice: c, dbl: !!d.dbl, t: now() - P.openedAt };
        const live = Object.keys(P.cards).filter(id => room.players[id] && room.players[id].connected);
        if (live.every(id => P.ans[id])) reveal(room);
        return { ok: true };
      }
      if (a === 'mark') {
        const pend = P.pending[p.id], cd = P.cards[p.id], cell = int(d.cell, -1, -1, 24);
        if (!pend) return { error: 'Nothing to mark right now.' };
        if (cell < 0 || cd.layout[cell] !== pend.cat || cd.marked[cell]) return { error: `Tap a ${P.r.cats[pend.cat].short} square.` };
        mark(room, p.id, cell); pend.n--;
        if (pend.n <= 0) { delete P.pending[p.id]; checkBingo(room, p.id); } else settle(room, p.id);
        return { ok: true };
      }
      return { error: 'Not now.', quiet: true };
    }

    function view(room, role) {
      const P = room.party, host = role === 'host', pat = pattern(P);
      const v = { type: 'bingo', bingo: true, name: P.r.name, label: P.r.label, stage: P.stage, round: P.round, rounds: P.r.patterns.length,
        pattern: P.r.patterns[Math.min(P.round, P.r.patterns.length - 1)], patternName: pat.name, patternCells: [...new Set(pat.sets.length === 1 ? pat.sets[0] : [])],
        cats: P.r.cats.map(c => ({ name: c.name, short: c.short, icon: c.icon })), cat: P.cat, hard: P.hard, turn: P.turn, history: P.history.slice(-8),
        timerEnd: P.timerEnd, timerSec: P.timerSec, players: Object.values(room.players).filter(pl => pl.connected).length,
        answered: Object.keys(P.ans).length, near: nearCount(room), points: P.r.points,
        winners: P.winners.map(w => { const t = room.teams[w.team] || {}; return { name: w.name, team: t.name || '', color: t.color || '#888' }; }) };
      if (P.q) Object.assign(v, { q: P.q.q, options: P.q.options });
      if (P.q && (P.stage !== 'question' || host)) v.correct = P.q.correct;
      if (P.results) v.results = { right: P.results.right, wrong: P.results.wrong, none: P.results.none, lost: P.results.lost };
      if (host) v.nearNames = Object.keys(P.cards).filter(pid => room.players[pid] && !isWinner(P, pid) && missing(P, P.cards[pid]) === 1).map(pid => room.players[pid].name);
      return v;
    }
    function mine(room, pid) {
      const P = room.party; if (!room.players[pid]) return null;
      const cd = card(room, pid), pend = P.pending[pid], a = P.ans[pid], r = P.results && P.results.per[pid];
      return { bingo: { layout: cd.layout, marked: cd.marked, missing: missing(P, cd), won: isWinner(P, pid),
        pending: pend ? { cat: pend.cat, n: pend.n, cells: cd.layout.map((c, i) => c === pend.cat && !cd.marked[i] ? i : -1).filter(i => i >= 0) } : null,
        ans: a ? { choice: a.choice, dbl: a.dbl } : null, result: r || null } };
    }
    return { start, stop, view, host, player, mine };
  }
  return { TYPES, sanitize, create, PATTERNS };
});
