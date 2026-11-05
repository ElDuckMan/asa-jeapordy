/*
 * ASA Jeopardy — Blitz modes (Blooket-style): Gold Quest, Racing, Tower Defense, Classic, Battle Royale.
 * Every player answers multiple-choice questions on their own phone; right answers power the mode.
 * Gold / Racing / Tower are self-paced (each player gets their own next question); Classic / Battle are host-paced.
 * Individual or team play: in team mode every point a player earns also goes to their team's score.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JeopardyBlitz = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TYPES = ['gold', 'race', 'tower', 'classic', 'battle'];
  const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
  const str = (v, max = 500) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, max);
  const int = (v, d = 0, min = -1e9, max = 1e9) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const TOWERS = { archer: { cost: 10, dmg: 2, name: 'Archer' }, cannon: { cost: 30, dmg: 7, name: 'Cannon' }, wizard: { cost: 60, dmg: 16, name: 'Wizard' } };

  function sanitize(r, i) {
    if (!TYPES.includes(r.type)) return null;
    return {
      type: r.type, name: str(r.name, 60) || `Round ${i + 1}`, label: str(r.label, 30), teamMode: !!r.teamMode,
      length: int(r.length, r.type === 'race' ? 420 : 300, 30, 3600),     // self-paced round length (s)
      timer: int(r.timer, 20, 5, 120),                                      // classic / battle seconds per question
      goal: int(r.goal, 15, 3, 100),                                        // racing finish line
      wave: int(r.wave, 20, 8, 120),                                        // tower: seconds between waves
      items: arr(r.items, 400).map(x => { const o = arr(x && x.options, 6).map(y => str(y, 120)).filter(Boolean); return { q: str(x && x.q, 400), options: o, correct: int(x && x.correct, 0, 0, Math.max(0, o.length - 1)) }; }).filter(x => x.q && x.options.length >= 2)
    };
  }

  function create(ctx) {
    const { fx, scoreFx, broadcast, now } = ctx;
    const rnd = ctx.random || Math.random;
    const award = (room, tid, pts) => { const t = room.teams[tid]; if (!t || !pts) return; t.score += pts; scoreFx(room, tid, pts); };
    const clearT = P => { for (const k of ['timer', 'waveT']) if (P[k]) { clearTimeout(P[k]); P[k] = null; } };

    function start(room, r) {
      room.party = { type: r.type, r, blitz: true, stage: 'intro', teamMode: r.teamMode, ps: {}, feed: [], timer: null, waveT: null, timerEnd: null, timerSec: 0,
        idx: -1, total: 0, wave: 0, waveHp: 0, nextWave: null, finish: [], q: null };
    }
    function stop(room) { if (room.party) clearT(room.party); room.party = null; }
    const nm = (room, pid) => (room.players[pid] || {}).name || '?';
    function feed(P, text) { P.feed.push({ text, at: now() }); if (P.feed.length > 8) P.feed.shift(); }

    /* Per-player state, created the first time a player is seen. */
    function ps(room, pid) {
      const P = room.party;
      if (!P.ps[pid]) {
        P.ps[pid] = { score: 0, right: 0, answered: 0, streak: 0, order: shuffle(P.r.items.map((_, i) => i), rnd), k: 0, q: null, last: null,
          chest: null, pending: null, pos: 0, coins: 0, towers: { archer: 0, cannon: 0, wizard: 0 }, lives: 3, hearts: 3, out: false, ans: null };
        if (P.stage === 'play' && ['gold', 'race', 'tower'].includes(P.type)) nextQ(P, P.ps[pid]);
      }
      return P.ps[pid];
    }
    function nextQ(P, s) {
      if (!P.r.items.length) { s.q = null; return; }
      if (s.k >= s.order.length) { s.order = shuffle(s.order, rnd); s.k = 0; }
      s.q = s.order[s.k++];
    }
    function gain(room, pid, pts) {
      const P = room.party, s = ps(room, pid);
      s.score = Math.max(0, s.score + pts);
      if (P.teamMode && pts) award(room, room.players[pid] && room.players[pid].teamId, pts);
    }
    const livePlayers = room => Object.keys(room.players).filter(id => room.players[id].connected || (room.party.ps[id]));

    /* ------------------------------------------------ begin / end */
    function begin(room) {
      const P = room.party;
      if (P.stage === 'play') return;
      P.stage = 'play'; P.finish = [];
      for (const id of Object.keys(room.players)) ps(room, id);
      if (['gold', 'race', 'tower'].includes(P.type)) {
        for (const s of Object.values(P.ps)) nextQ(P, s);
        P.timerEnd = now() + P.r.length * 1000; P.timerSec = P.r.length;
        P.timer = setTimeout(() => { if (room.party !== P) return; end(room); broadcast(room); }, P.r.length * 1000);
        if (P.type === 'tower') scheduleWave(room);
      }
      fx(room, 'round', { name: P.r.name, kind: 'blitz' });
    }
    function end(room) {
      const P = room.party; if (!P || P.stage === 'done') return;
      clearT(P); P.timerEnd = null; P.nextWave = null; P.stage = 'done';
      fx(room, 'end');
    }

    /* ------------------------------------------------ self-paced answer */
    function answerSelf(room, p, d) {
      const P = room.party, s = ps(room, p.id);
      if (P.stage !== 'play') return { error: 'Wait for the host to start.' };
      if (s.out) return { error: 'You\'re out! Cheer the others on.' };
      if (s.chest || s.pending) return { error: 'Open a chest first!' };
      if (s.q == null) nextQ(P, s);
      const it = P.r.items[s.q], c = int(d.choice, -1);
      const ok = c === it.correct;
      s.answered++; s.last = { ok, correct: it.options[it.correct], q: it.q };
      if (ok) { s.right++; s.streak++; } else s.streak = 0;
      if (P.type === 'gold' && ok) s.chest = makeChests();
      if (P.type === 'race' && ok) {
        s.pos++; gain(room, p.id, 100);
        if (s.pos >= P.r.goal && !P.finish.includes(p.id)) {
          P.finish.push(p.id); feed(P, `🏁 ${nm(room, p.id)} finished #${P.finish.length}!`);
          fx(room, 'correct', { team: p.teamId });
          if (P.finish.length >= Math.min(3, livePlayers(room).length)) end(room);
        }
      }
      if (P.type === 'tower' && ok) { const c2 = 10 + (s.streak % 3 === 0 ? 5 : 0); s.coins += c2; }
      nextQ(P, s);
      return { ok: true, correct: ok, answer: it.options[it.correct] };
    }

    /* Gold Quest chests: three face-down choices. */
    const CHESTS = [[18, () => ({ kind: 'gold', n: 10 })], [16, () => ({ kind: 'gold', n: 20 })], [14, () => ({ kind: 'gold', n: 30 })], [10, () => ({ kind: 'gold', n: 50 })],
      [6, () => ({ kind: 'gold', n: 100 })], [7, () => ({ kind: 'double' })], [7, () => ({ kind: 'bonus', pct: 25 })], [8, () => ({ kind: 'steal', pct: 10 })],
      [4, () => ({ kind: 'steal', pct: 25 })], [4, () => ({ kind: 'swap' })], [5, () => ({ kind: 'lose', pct: 10 })], [2, () => ({ kind: 'lose', pct: 25 })], [6, () => ({ kind: 'nothing' })]];
    const TOTAL_W = CHESTS.reduce((n, c) => n + c[0], 0);
    function makeChests() {
      return [0, 1, 2].map(() => { let r = rnd() * TOTAL_W; for (const [w, f] of CHESTS) { if ((r -= w) < 0) return f(); } return { kind: 'nothing' }; });
    }
    const chestLabel = c => ({ gold: `+${c.n} gold`, double: 'Double gold!', bonus: `+${c.pct}%`, steal: `Steal ${c.pct}%`, swap: 'Swap!', lose: `Lose ${c.pct}%`, nothing: 'Nothing…' })[c.kind];
    function openChest(room, p, d) {
      const P = room.party, s = ps(room, p.id);
      if (!s.chest) return { error: 'No chest to open.' };
      const k = int(d.k, -1, -1, 2); if (k < 0) return { error: 'Pick a chest.' };
      const c = s.chest[k], shown = s.chest.map(chestLabel);
      s.chest = null; s.opened = { k, shown };
      const before = s.score;
      if (c.kind === 'gold') gain(room, p.id, c.n);
      else if (c.kind === 'double') gain(room, p.id, Math.max(25, s.score));
      else if (c.kind === 'bonus') gain(room, p.id, Math.max(10, Math.round(s.score * c.pct / 100)));
      else if (c.kind === 'lose') gain(room, p.id, -Math.round(s.score * c.pct / 100));
      else if (c.kind === 'steal' || c.kind === 'swap') {
        const others = Object.keys(P.ps).filter(id => id !== p.id && room.players[id]);
        if (others.length) s.pending = { kind: c.kind, pct: c.pct || 0 };
        else gain(room, p.id, 20);
      }
      if (s.score > before && c.kind === 'double') feed(P, `✨ ${nm(room, p.id)} doubled their gold!`);
      return { ok: true, result: chestLabel(c) };
    }
    function target(room, p, d) {
      const P = room.party, s = ps(room, p.id), pend = s.pending;
      if (!pend) return { error: 'Nothing to do.' };
      const t = P.ps[d.pid];
      if (!t || d.pid === p.id) return { error: 'Pick a player.' };
      s.pending = null;
      if (pend.kind === 'steal') {
        const n = Math.round(t.score * pend.pct / 100);
        gain(room, d.pid, -n); gain(room, p.id, n);
        feed(P, `💰 ${nm(room, p.id)} stole ${n} from ${nm(room, d.pid)}`);
      } else {
        const a = s.score, b = t.score;
        gain(room, p.id, b - a); gain(room, d.pid, a - b);
        feed(P, `🔄 ${nm(room, p.id)} swapped gold with ${nm(room, d.pid)}`);
      }
      fx(room, 'reveal');
      return { ok: true };
    }

    /* Tower Defense: buy towers with coins; a wave hits everyone every few seconds. */
    function buy(room, p, d) {
      const s = ps(room, p.id), t = TOWERS[d.tower];
      if (room.party.stage !== 'play') return { error: 'Wait for the host.' };
      if (!t) return { error: 'Pick a tower.' };
      if (s.out) return { error: 'Your base fell. Cheer the others on!' };
      if (s.coins < t.cost) return { error: `Need ${t.cost} coins.` };
      s.coins -= t.cost; s.towers[d.tower]++;
      return { ok: true };
    }
    const dmg = s => Object.entries(s.towers).reduce((n, [k, v]) => n + v * TOWERS[k].dmg, 0);
    const waveHp = n => 2 + n * 4 + Math.floor(n * n * 0.6);
    function scheduleWave(room) {
      const P = room.party;
      P.wave++; P.waveHp = waveHp(P.wave); P.nextWave = now() + P.r.wave * 1000;
      P.waveT = setTimeout(() => {
        if (room.party !== P || P.stage !== 'play') return;
        let fell = 0;
        for (const [pid, s] of Object.entries(P.ps)) {
          if (s.out || !room.players[pid]) continue;
          if (dmg(s) >= P.waveHp) gain(room, pid, P.waveHp * 10);
          else { s.lives--; if (s.lives <= 0) { s.out = true; fell++; feed(P, `🏚 ${nm(room, pid)}'s base fell on wave ${P.wave}`); } }
        }
        feed(P, `🌊 Wave ${P.wave} (${P.waveHp} HP) hit!`);
        fx(room, 'wave', { n: P.wave });
        const alive = Object.values(P.ps).filter(s => !s.out).length;
        if (!alive) end(room); else scheduleWave(room);
        broadcast(room);
      }, P.r.wave * 1000);
    }

    /* ------------------------------------------------ host-paced: Classic & Battle Royale */
    function hostNext(room) {
      const P = room.party;
      if (P.stage === 'done') return;
      if (P.type === 'battle' && P.stage !== 'intro' && Object.values(P.ps).filter(s => !s.out).length <= 1) { end(room); return; }
      if (P.stage === 'intro') for (const id of Object.keys(room.players)) ps(room, id);
      P.idx++;
      if (P.idx >= P.r.items.length) P.idx = 0;
      P.total++;
      P.stage = 'question'; P.openedAt = now(); P.results = null;
      for (const s of Object.values(P.ps)) s.ans = null;
      clearT(P);
      P.timerEnd = now() + P.r.timer * 1000; P.timerSec = P.r.timer;
      P.timer = setTimeout(() => { if (room.party !== P) return; reveal(room); broadcast(room); }, P.r.timer * 1000);
      fx(room, 'open');
    }
    function answerHost(room, p, d) {
      const P = room.party;
      if (P.stage !== 'question') return { error: 'Wait for the next question.' };
      const s = ps(room, p.id);
      if (s.out) return { error: 'You\'re out! Cheer the others on.' };
      if (s.ans) return { error: 'Locked in!' };
      s.ans = { choice: int(d.choice, -1), t: now() - P.openedAt };
      const live = Object.entries(P.ps).filter(([id, x]) => !x.out && room.players[id] && room.players[id].connected);
      if (live.every(([, x]) => x.ans)) reveal(room);
      return { ok: true };
    }
    function reveal(room) {
      const P = room.party; if (P.stage !== 'question') return;
      clearT(P); P.timerEnd = null; P.stage = 'reveal';
      const it = P.r.items[P.idx], T = P.r.timer * 1000, res = {};
      const alive = Object.entries(P.ps).filter(([, s]) => !s.out);
      for (const [pid, s] of alive) {
        const ok = !!s.ans && s.ans.choice === it.correct;
        s.answered++; if (ok) { s.right++; s.streak++; } else s.streak = 0;
        let pts = 0;
        if (P.type === 'classic' && ok) pts = Math.round(1000 * (1 - Math.min(1, s.ans.t / T) / 2)) + (s.streak >= 3 ? 100 : 0);
        if (pts) gain(room, pid, pts);
        res[pid] = { ok, pts, choice: s.ans ? s.ans.choice : null, t: s.ans ? s.ans.t : null };
      }
      if (P.type === 'battle') {
        const hit = alive.filter(([pid]) => !res[pid].ok).map(([pid]) => pid);
        if (!hit.length && alive.length > 1) {
          const slow = alive.slice().sort((a, b) => res[b[0]].t - res[a[0]].t)[0][0];
          hit.push(slow); res[slow].slow = true;
        }
        /* Never knock out everyone at once: if this hit would end it for all, nobody drops below one heart. */
        const wipe = alive.every(([pid, s]) => hit.includes(pid) && s.hearts <= 1);
        for (const pid of hit) { const s = P.ps[pid]; if (wipe) { res[pid].hurt = true; res[pid].saved = true; continue; } s.hearts--; res[pid].hurt = true; if (s.hearts <= 0) { s.out = true; feed(P, `💥 ${nm(room, pid)} is knocked out!`); } }
        for (const [pid, s] of alive) if (!s.out) gain(room, pid, 100);
        const left = Object.entries(P.ps).filter(([, s]) => !s.out);
        if (left.length === 1) feed(P, `👑 ${nm(room, left[0][0])} is the last one standing!`);
      }
      P.results = res;
      fx(room, 'reveal');
    }

    /* ------------------------------------------------ views */
    function board(room) {
      const P = room.party;
      const rows = Object.entries(P.ps).filter(([id]) => room.players[id]).map(([id, s]) => {
        const pl = room.players[id], t = room.teams[pl.teamId] || {};
        return { pid: id, name: pl.name, team: pl.teamId, teamName: t.name || '', color: t.color || '#888', score: s.score, right: s.right, answered: s.answered,
          pos: s.pos, lives: s.lives, hearts: s.hearts, out: s.out, dmg: dmg(s), towers: s.towers, finish: P.finish.indexOf(id) + 1 || 0 };
      });
      if (P.type === 'race') rows.sort((a, b) => (a.finish || 999) - (b.finish || 999) || b.pos - a.pos);
      else if (P.type === 'battle') rows.sort((a, b) => (a.out - b.out) || b.hearts - a.hearts || b.score - a.score);
      else if (P.type === 'tower') rows.sort((a, b) => (a.out - b.out) || b.score - a.score);
      else rows.sort((a, b) => b.score - a.score);
      return rows;
    }
    function view(room, role) {
      const P = room.party, host = role === 'host';
      const v = { type: P.type, blitz: true, name: P.r.name, label: P.r.label, stage: P.stage, teamMode: P.teamMode, timerEnd: P.timerEnd, timerSec: P.timerSec,
        rows: board(room), feed: P.feed.slice(-6), goal: P.r.goal, count: P.r.items.length, total: P.total };
      if (P.teamMode) {
        const agg = {};
        for (const r of v.rows) { const a = agg[r.team] = agg[r.team] || { team: r.team, name: r.teamName, color: r.color, score: 0 }; a.score += r.score; }
        v.teams = Object.values(agg).sort((a, b) => b.score - a.score);
      }
      if (P.type === 'tower') Object.assign(v, { wave: P.wave, waveHp: P.waveHp, nextWave: P.nextWave, waveSec: P.r.wave, towers: TOWERS });
      if ((P.type === 'classic' || P.type === 'battle') && P.idx >= 0 && P.stage !== 'intro') {
        const it = P.r.items[P.idx];
        Object.assign(v, { q: it.q, options: it.options, answered: Object.values(P.ps).filter(s => s.ans).length, alive: Object.values(P.ps).filter(s => !s.out).length });
        if (P.stage === 'reveal' || host) v.correct = it.correct;
        if (P.stage === 'reveal') v.results = P.results;
      }
      return v;
    }
    /* Private per-player bits, sent as 'pme'. */
    function mine(room, pid) {
      const P = room.party; if (!P || !room.players[pid]) return null;
      const s = ps(room, pid), it = s.q != null ? P.r.items[s.q] : null;
      const me = { score: s.score, right: s.right, answered: s.answered, streak: s.streak, last: s.last, pos: s.pos, coins: s.coins, towers: s.towers, dmg: dmg(s),
        lives: s.lives, hearts: s.hearts, out: s.out, opened: s.opened || null, ans: s.ans ? s.ans.choice : null };
      if (['gold', 'race', 'tower'].includes(P.type) && P.stage === 'play' && it && !s.chest && !s.pending) me.q = { q: it.q, options: it.options, n: s.answered };
      if (s.chest) me.chest = 3;
      if (s.pending) me.pending = { kind: s.pending.kind, pct: s.pending.pct, players: Object.entries(P.ps).filter(([id]) => id !== pid && room.players[id]).map(([id, x]) => ({ pid: id, name: room.players[id].name, score: x.score })).sort((a, b) => b.score - a.score) };
      return { blitz: me };
    }

    function host(room, d) {
      const P = room.party, a = d.action;
      if (a === 'teamMode') { if (P.stage !== 'intro') return { error: 'Pick before you start.' }; P.teamMode = !!d.ok; return; }
      if (a === 'begin') { if (['classic', 'battle'].includes(P.type)) return hostNext(room); return begin(room); }
      if (a === 'end') return end(room);
      if (a === 'next' && ['classic', 'battle'].includes(P.type)) return hostNext(room);
      if (a === 'reveal' && ['classic', 'battle'].includes(P.type)) return reveal(room);
      return { error: 'Unknown action.' };
    }
    function player(room, p, d) {
      const P = room.party, a = d.action;
      if (a === 'answer') return ['classic', 'battle'].includes(P.type) ? answerHost(room, p, d) : answerSelf(room, p, d);
      if (a === 'chest' && P.type === 'gold') return openChest(room, p, d);
      if (a === 'target' && P.type === 'gold') return target(room, p, d);
      if (a === 'buy' && P.type === 'tower') return buy(room, p, d);
      if (a === 'seen') { const s = ps(room, p.id); s.opened = null; return; }
      return { error: 'Not now.', quiet: true };
    }
    return { start, stop, view, host, player, mine };
  }
  return { TYPES, sanitize, create, TOWERS };
});
