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
    return { type: 'bingo', name: str(r.name, 60) || `Round ${i + 1}`, label: str(r.label, 30), timer: int(r.timer, 15, 5, 120), mode: r.mode === 'cards' ? 'cards' : 'board',
      points: int(r.points, 500, 0, 100000), patterns: pats.length ? pats : ['line', 'corners', 'x'], cats };
  }

  function create(ctx) {
    const { fx, scoreFx, broadcast, now } = ctx;
    const rnd = ctx.random || Math.random;
    const award = (room, tid, pts) => { const t = room.teams[tid]; if (!t || !pts) return; t.score += pts; scoreFx(room, tid, pts); };
    const clearT = P => { if (P.timer) { clearTimeout(P.timer); P.timer = null; } };

    function start(room, r) {
      room.party = { type: 'bingo', bingo: true, mode: r.mode || 'board', size: 5, random: false, r, stage: 'intro', round: 0, cards: {}, cat: null, q: null, hard: false, used: {}, ans: {}, results: null,
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

    function cardHost(room, d) {
      const P = room.party, a = d.action;
      if (a === 'begin' || a === 'draw') { if (P.stage === 'intro') P.stage = 'ready'; return draw(room); }
      if (a === 'reveal') return reveal(room);
      if (a === 'nextRound') return nextRound(room);
      if (a === 'end') { clearT(P); P.timerEnd = null; P.stage = 'done'; fx(room, 'end'); return; }
      return { error: 'Unknown action.' };
    }
    function cardPlayer(room, p, d) {
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

    function cardView(room, role) {
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
    function cardMine(room, pid) {
      const P = room.party; if (!room.players[pid]) return null;
      const cd = card(room, pid), pend = P.pending[pid], a = P.ans[pid], r = P.results && P.results.per[pid];
      return { bingo: { layout: cd.layout, marked: cd.marked, missing: missing(P, cd), won: isWinner(P, pid),
        pending: pend ? { cat: pend.cat, n: pend.n, cells: cd.layout.map((c, i) => c === pend.cat && !cd.marked[i] ? i : -1).filter(i => i >= 0) } : null,
        ans: a ? { choice: a.choice, dbl: a.dbl } : null, result: r || null } };
    }
    /* ======================= TEAM BOARD MODE (buzz-in, connect five) =======================
     * One shared N×N board of category squares on the big screen. The team in control picks a square, the host reads
     * the question, buzzers open for everyone. First right answer claims the square in that team's colour and takes
     * control; a wrong answer locks that team out so others can steal. First team with N in a row wins. */
    const LOCK_MS = 250, WINDOW_MS = 300;
    /* Board presets by team count (simulated so a game lasts about 12–25 questions; without steals, 3+ teams just block each other). */
    const PRESETS = {
      duel: { name: 'Head-to-head', size: 5, k: 5, steal: false, teams: '2 teams' },
      small: { name: 'Small group', size: 5, k: 4, steal: true, teams: '3–4 teams' },
      mid: { name: 'Big group', size: 6, k: 4, steal: true, teams: '5–6 teams' },
      big: { name: 'Crowd', size: 6, k: 3, steal: true, teams: '7+ teams' },
      quick: { name: 'Quick', size: 4, k: 4, steal: false, teams: 'short game' }
    };
    const autoPreset = room => { const n = Object.keys(room.teams).length; return n <= 2 ? 'duel' : n <= 4 ? 'small' : n <= 6 ? 'mid' : 'big'; };
    function applyPreset(room) {
      const P = room.party, id = P.preset || autoPreset(room), pr = PRESETS[id];
      Object.assign(P, { size: pr.size, k: pr.k, steal: pr.steal, presetUsed: id });
    }
    function newBoard(room) {
      applyPreset(room);
      const P = room.party, N = P.size, n = P.r.cats.length, cells = N * N;
      const cats = shuffle(Array.from({ length: cells }, (_, i) => i % n), rnd);
      const centre = N % 2 ? Math.floor(cells / 2) : -1;
      P.board = { N, k: P.k, cells: cats.map((c, i) => ({ cat: c, hard: i === centre, owner: null, lock: false })), line: null };
      Object.assign(P, { stage: 'pick', sel: null, q: null, cat: null, buzz: null, locked: [], early: {}, winners: [], showChoices: false, timerEnd: null });
      const ids = Object.keys(room.teams);
      if (!P.control || !room.teams[P.control]) P.control = ids[Math.floor(rnd() * ids.length)] || null;
    }
    /* Every run of K squares in a row, column or diagonal. */
    function lines(N, K = N) {
      const L = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const ln = [];
        for (let k = 0; k < K; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || cc < 0 || rr >= N || cc >= N) break; ln.push(rr * N + cc); }
        if (ln.length === K) L.push(ln);
      }
      return L;
    }
    function boardWin(room) {
      const P = room.party, B = P.board;
      for (const ln of lines(B.N, B.k || B.N)) { const o = B.cells[ln[0]].owner; if (o && ln.every(i => B.cells[i].owner === o)) return { team: o, line: ln }; }
      return null;
    }
    function nextTeam(room, from) {
      const ids = Object.keys(room.teams); if (!ids.length) return null;
      const k = ids.indexOf(from); return ids[(k + 1) % ids.length];
    }
    function pickSquare(room, i, byTeam) {
      const P = room.party, B = P.board;
      if (!['pick', 'claimed', 'missed'].includes(P.stage)) return { error: 'Not time to pick a square.' };
      if (byTeam && byTeam !== P.control) return { error: 'It\'s not your team\'s pick.' };
      const c = B.cells[int(i, -1, -1, B.cells.length - 1)];
      if (!c) return { error: 'Pick a square.' };
      const pickTeam = byTeam || P.control;
      if (c.owner && (!P.steal || c.owner === pickTeam)) return { error: 'That square is taken.' };
      if (c.lock) return { error: 'That square is locked 🔒.' };
      P.sel = B.cells.indexOf(c);
      const challenge = !!c.owner, hard = c.hard || challenge;
      const { item } = pickQuestion(P, c.cat, hard);
      Object.assign(P, { q: item, cat: c.cat, hard, challenge, stage: 'reading', buzz: null, locked: [], early: {}, showChoices: false, openSeq: (P.openSeq || 0) + 1, turn: P.turn + 1 });
      P.history.push(c.cat); if (P.history.length > 10) P.history.shift();
      fx(room, 'draw', { cat: c.cat, name: P.r.cats[c.cat].name, icon: P.r.cats[c.cat].icon, hard, sub: challenge ? '⚔️ Steal attempt!' : hard ? '🌶 Hard question · buzz in!' : 'Buzz in!' });
    }
    function openBuzz(room) {
      const P = room.party;
      if (!['reading', 'open', 'buzzed'].includes(P.stage)) return;
      P.stage = 'open'; P.openAt = now(); P.openSeq++; P.pend = [];
      clearT(P); P.timerEnd = now() + 12000; P.timerSec = 12;
      P.timer = setTimeout(() => { if (room.party !== P || P.stage !== 'open') return; miss(room); broadcast(room); }, 12000);
      fx(room, 'open');
    }
    function buzz(room, p, d) {
      const P = room.party, tid = p.teamId;
      if (P.stage === 'reading') { P.early[p.id] = now() + LOCK_MS; return { early: true, ms: LOCK_MS, quiet: true }; }
      if (P.stage !== 'open' || int(d.seq, -1) !== P.openSeq) return { quiet: true };
      if (P.locked.includes(tid)) return { lockedOut: true, quiet: true };
      if (P.early[p.id] && P.early[p.id] > now()) return { early: true, ms: P.early[p.id] - now(), quiet: true };
      const server = now() - P.openAt, client = Number(d.reaction);
      const t = Number.isFinite(client) && client >= 0 && client < server + 50 ? Math.min(client, server) : server;
      P.pend.push({ pid: p.id, tid, t });
      if (P.pend.length === 1) setTimeout(() => {
        if (room.party !== P || P.stage !== 'open' || !P.pend.length) return;
        const w = P.pend.sort((a, b) => a.t - b.t)[0];
        clearT(P); P.timerEnd = null;
        P.buzz = { team: w.tid, pid: w.pid, name: (room.players[w.pid] || {}).name || '' };
        P.stage = 'buzzed'; P.pend = [];
        fx(room, 'buzz', { team: w.tid });
        broadcast(room);
      }, WINDOW_MS);
      return { ok: true, quiet: true };
    }
    function judge(room, ok) {
      const P = room.party, B = P.board;
      if (P.stage !== 'buzzed' || !P.buzz) return { error: 'Nobody has buzzed.' };
      const tid = P.buzz.team;
      if (ok) {
        const sq = B.cells[P.sel], prev = sq.owner;
        if (prev && prev === tid) { sq.lock = true; P.defended = true; } else { sq.owner = tid; P.defended = false; }
        P.stolenFrom = prev && prev !== tid ? prev : null;
        P.control = tid;
        award(room, tid, P.hard ? 200 : 100);
        fx(room, 'correct', { team: tid });
        const w = boardWin(room);
        if (w) {
          B.line = w.line; P.stage = 'won';
          P.winners = [{ team: tid, name: (room.teams[tid] || {}).name || '' }];
          award(room, tid, P.r.points);
          fx(room, 'bingo', { team: tid, name: (room.teams[tid] || {}).name || '' });
        } else if (B.cells.every(c => c.owner) && (!P.steal || B.cells.every(c => c.lock))) { P.stage = 'full'; fx(room, 'end'); }
        else P.stage = 'claimed';
        return;
      }
      fx(room, 'wrong', { team: tid });
      P.locked.push(tid); P.buzz = null;
      if (Object.keys(room.teams).every(t => P.locked.includes(t))) return miss(room);
      openBuzz(room);
    }
    function miss(room) {
      const P = room.party; clearT(P); P.timerEnd = null;
      P.stage = 'missed'; P.control = nextTeam(room, P.control);
      fx(room, 'timeup');
    }
    function boardHost(room, d) {
      const P = room.party, a = d.action;
      if (a === 'preset' && ['intro', 'won', 'full'].includes(P.stage)) { P.preset = PRESETS[d.L] ? d.L : null; return; }
      if (a === 'random' && ['intro', 'won', 'full'].includes(P.stage)) { P.random = !!d.ok; return; }
      if (a === 'begin' || a === 'newBoard') { newBoard(room); return; }
      if (a === 'control' && room.teams[d.team]) { P.control = d.team; return; }
      if (a === 'pick') return pickSquare(room, d.k);
      if (a === 'choices') { P.showChoices = true; return; }
      if (a === 'open') return openBuzz(room);
      if (a === 'judge') return judge(room, !!d.ok);
      if (a === 'skip') { if (['reading', 'open', 'buzzed'].includes(P.stage)) miss(room); return; }
      if (a === 'next') { if (['claimed', 'missed'].includes(P.stage)) { P.stage = 'pick'; P.sel = null; P.q = null; P.buzz = null; } return; }
      if (a === 'end') { clearT(P); P.timerEnd = null; P.stage = 'done'; fx(room, 'end'); return; }
      return { error: 'Unknown action.' };
    }
    function boardPlayer(room, p, d) {
      const P = room.party;
      if (d.action === 'buzz') return buzz(room, p, d);
      if (d.action === 'pick') return pickSquare(room, d.k, p.teamId);
      return { error: 'Not now.', quiet: true };
    }
    function boardView(room, role) {
      const P = room.party, host = role === 'host', B = P.board;
      const tm = id => { const t = room.teams[id] || {}; return id ? { id, name: t.name || '?', color: t.color || '#888' } : null; };
      const pid = P.preset || autoPreset(room), pr = P.board ? { size: P.size, k: P.k, steal: P.steal } : PRESETS[pid];
      const v = { type: 'bingo', bingo: true, mode: 'board', name: P.r.name, label: P.r.label, stage: P.stage, size: pr.size, k: pr.k, steal: pr.steal, random: P.random,
        preset: P.preset, autoPreset: autoPreset(room), presets: PRESETS, challenge: !!P.challenge, defended: !!P.defended,
        stolenFrom: P.stolenFrom ? tm(P.stolenFrom) : null,
        cats: P.r.cats.map(c => ({ name: c.name, short: c.short, icon: c.icon })), control: tm(P.control), sel: P.sel, turn: P.turn, openSeq: P.openSeq,
        timerEnd: P.timerEnd, timerSec: P.timerSec, locked: P.locked || [], buzz: P.buzz ? { ...tm(P.buzz.team), player: P.buzz.name } : null,
        winners: (P.winners || []).map(w => tm(w.team)), points: P.r.points, history: P.history.slice(-8), teams: Object.keys(room.teams).map(tm) };
      if (B) v.board = { N: B.N, k: B.k, line: B.line, cells: B.cells.map((c, i) => ({ cat: P.random && !c.owner && i !== P.sel ? null : c.cat, hard: c.hard, owner: c.owner, lock: c.lock })) };
      if (P.q && P.stage !== 'pick') {
        Object.assign(v, { q: P.q.q, cat: P.cat, hard: P.hard, choices: P.showChoices || host ? P.q.options : null });
        if (host || ['claimed', 'missed', 'won', 'full'].includes(P.stage)) v.answer = P.q.options[P.q.correct];
      }
      return v;
    }

    const isBoard = room => room.party && room.party.mode === 'board';
    function host(room, d) {
      const P = room.party;
      if (d.action === 'mode' && P.stage === 'intro') { P.mode = d.L === 'cards' ? 'cards' : 'board'; return; }
      return isBoard(room) ? boardHost(room, d) : cardHost(room, d);
    }
    const player = (room, p, d) => isBoard(room) ? boardPlayer(room, p, d) : cardPlayer(room, p, d);
    const view = (room, role) => isBoard(room) ? boardView(room, role) : Object.assign(cardView(room, role), { mode: 'cards' });
    const mine = (room, pid) => isBoard(room) ? null : cardMine(room, pid);
    return { start, stop, view, host, player, mine };
  }
  return { TYPES, sanitize, create, PATTERNS };
});
