/*
 * ASA Jeopardy — game engine.
 * Transport-agnostic: runs inside the Node server (socket.io) and inside the
 * in-browser preview (postMessage). A "connection" is any object with
 *   send(event, payload)
 * and the engine tracks which channels each connection belongs to.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JeopardyEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TEAM_COLORS = ['#de3a2e', '#3b4db3', '#e6a92b', '#2a8a96', '#4e9a3f', '#c8612c',
    '#8a4fb3', '#d24f8a', '#1f7a5a', '#8b5a2b', '#2b6cb0', '#b8860b'];
  const MAX_TEAMS = 12;
  const DEFAULT_SECTIONS = ['Freshmen', 'Sophomores', 'Juniors', 'Seniors', 'Grad / Other'];

  /* Every event a client may send. The server registers exactly these. */
  const EVENTS = [
    'host:create', 'host:rejoin', 'host:setGame', 'host:setSettings', 'host:lobby', 'host:startRound',
    'host:endGame', 'host:resetGame', 'host:closeRoom', 'host:adjust', 'host:setScore', 'host:setControl',
    'host:kickTeam', 'host:kickPlayer', 'host:openClue', 'host:cancelClue', 'host:closeClue', 'host:open',
    'host:lock', 'host:judge', 'host:reveal', 'host:override', 'host:setDDTeam', 'host:setWager',
    'host:showClue', 'host:finalReveal', 'host:finalAnswer', 'host:lightningStart', 'host:lightningNext',
    'host:lightningStop', 'host:bonusNext', 'host:hint',
    'board:join', 'room:info', 'player:join', 'player:leave', 'player:buzz', 'player:wager', 'player:answer'
  ];

  const now = () => Date.now();
  const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
  const str = (v, max = 500) => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim().slice(0, max);
  const int = (v, d = 0, min = -1e9, max = 1e9) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
  };
  const isObj = v => v && typeof v === 'object';

  /* ---------------------------------------------------------- sanitizing */
  function sanitizeMedia(m) {
    if (!isObj(m)) return null;
    const type = ['image', 'audio', 'video'].includes(m.type) ? m.type : null;
    const url = str(m.url, 2000);
    if (!type || !/^(https?:\/\/|\/)/i.test(url)) return null;
    return { type, url };
  }
  const sanitizeOptions = o => arr(o, 6).map(x => str(x, 200)).filter(Boolean);
  function sanitizeClue(c, defVal) {
    c = c || {};
    const type = ['standard', 'dd', 'mc'].includes(c.type) ? c.type : 'standard';
    const options = type === 'mc' ? sanitizeOptions(c.options) : [];
    return {
      value: int(c.value, defVal, 0, 100000), q: str(c.q, 1000), a: str(c.a, 500), type, options,
      correct: options.length ? int(c.correct, 0, 0, options.length - 1) : null,
      media: sanitizeMedia(c.media), timer: int(c.timer, 0, 0, 600), hint: str(c.hint, 300)
    };
  }
  function sanitizeQuestion(x, allowOptions) {
    x = x || {};
    const options = allowOptions ? sanitizeOptions(x.options) : [];
    return {
      q: str(x.q, 1000), a: str(x.a, 500), hint: str(x.hint, 300), media: sanitizeMedia(x.media), options,
      correct: options.length ? int(x.correct, 0, 0, options.length - 1) : null
    };
  }
  function sanitizeRound(r, i) {
    r = r || {};
    const type = ['board', 'lightning', 'bonus', 'final'].includes(r.type) ? r.type : 'board';
    const name = str(r.name, 60) || `Round ${i + 1}`;
    if (type === 'board') {
      return {
        type, name, timer: int(r.timer, 0, 0, 600),
        categories: arr(r.categories, 8).map(cat => ({
          name: str(cat && cat.name, 60),
          clues: arr(cat && cat.clues, 10).map((c, j) => sanitizeClue(c, (j + 1) * 100))
        }))
      };
    }
    if (type === 'lightning') {
      return {
        type, name, duration: int(r.duration, 60, 5, 1800), points: int(r.points, 100, 0, 100000),
        penalty: !!r.penalty, questions: arr(r.questions, 200).map(q => sanitizeQuestion(q, false))
      };
    }
    if (type === 'bonus') {
      return {
        type, name, points: int(r.points, 200, 0, 100000), timer: int(r.timer, 20, 0, 600),
        questions: arr(r.questions, 100).map(q => sanitizeQuestion(q, true))
      };
    }
    return {
      type: 'final', name, category: str(r.category, 100), q: str(r.q, 1000), a: str(r.a, 500), hint: str(r.hint, 300),
      media: sanitizeMedia(r.media), timer: int(r.timer, 30, 0, 600)
    };
  }
  function sanitizeGame(g) {
    g = g || {};
    return { title: str(g.title, 60) || 'Jeopardy', rounds: arr(g.rounds, 20).map(sanitizeRound) };
  }
  function sanitizeSettings(s) {
    s = s || {};
    return {
      /* No saved list yet → default sections; an explicitly saved list (even empty) is kept. */
      sections: Array.isArray(s.sections) ? arr(s.sections, 30).map(x => str(x, 40)).filter(Boolean) : DEFAULT_SECTIONS.slice(),
      wrongPenalty: s.wrongPenalty !== false,
      mcPenalty: !!s.mcPenalty,
      buzzWindowMs: int(s.buzzWindowMs, 300, 0, 2000),
      earlyLockMs: int(s.earlyLockMs, 250, 0, 3000)
    };
  }

  /* Typed-answer matcher: only a suggestion; the host always decides. */
  function norm(s) {
    return str(s, 500).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      .replace(/^\s*(what|who|where|when|which)\s+(is|are|was|were)\s+/, '')
      .replace(/\b(the|a|an)\b/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, '');
  }
  function looksRight(given, answer) {
    const g = norm(given), a = norm(answer);
    if (!g || !a) return false;
    return g === a || (a.length >= 4 && g.includes(a)) || (g.length >= 4 && a.includes(g));
  }

  /* =============================================================== engine */
  function createEngine(opts) {
    const randomId = opts.randomId;            // (bytes) => hex string
    const randomInt = opts.randomInt;          // (n) => integer in [0, n)
    const checkPin = opts.checkPin;            // (pin) => boolean
    const log = opts.log || (() => {});

    const rooms = new Map();
    const channels = new Map();                // name -> Set(conn)
    const conns = new Map();                   // id -> conn
    const pinFails = new Map();

    /* ---- channels ---- */
    function join(conn, ch) {
      if (!channels.has(ch)) channels.set(ch, new Set());
      channels.get(ch).add(conn); conn.channels.add(ch);
    }
    function leaveAll(conn) {
      for (const ch of conn.channels) { const s = channels.get(ch); if (s) { s.delete(conn); if (!s.size) channels.delete(ch); } }
      conn.channels.clear();
    }
    function sendTo(ch, ev, payload) {
      const s = channels.get(ch);
      if (s) for (const c of s) c.send(ev, payload);
    }

    function makeCode() {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      let c;
      do { c = Array.from({ length: 4 }, () => A[randomInt(A.length)]).join(''); } while (rooms.has(c));
      return c;
    }
    const pinBlocked = ip => { const f = pinFails.get(ip); return !!(f && f.n >= 8 && now() - f.t < 600000); };
    const pinFailed = ip => {
      const f = pinFails.get(ip);
      if (!f || now() - f.t > 600000) pinFails.set(ip, { n: 1, t: now() }); else f.n++;
    };

    /* ---- rooms ---- */
    function createRoom(game, settings) {
      const room = {
        code: makeCode(), hostToken: randomId(16), game, settings,
        teams: {}, players: {}, roundIndex: -1, phase: 'lobby', used: {}, control: null,
        q: null, light: null, bonus: null, timer: null, roundTimer: null, lastActive: now()
      };
      rooms.set(room.code, room);
      return room;
    }
    const curRound = room => room.game.rounds[room.roundIndex] || null;
    const getRoom = code => rooms.get(str(code, 8).toUpperCase());

    function newQ(base) {
      return Object.assign({
        stage: 'reading', openSeq: 0, openedAt: 0, lockedOut: [], buzzedTeam: null, buzzedPlayer: null,
        wagers: {}, answers: {}, judged: {}, applied: {}, suggest: {}, revealed: false, revealedTeams: {},
        timerEnd: null, timerRemain: null, timerSec: 0, early: {}, window: null,
        options: [], correct: null, media: null, value: 0, hint: '', hintShown: false, ddTeam: null, category: '', key: null, c: null, j: null
      }, base);
    }

    /* ---- timers ---- */
    function clearQTimer(room) { if (room.timer) { clearTimeout(room.timer); room.timer = null; } }
    function startQTimer(room, ms) {
      clearQTimer(room);
      const q = room.q;
      q.timerEnd = now() + ms; q.timerRemain = null;
      room.timer = setTimeout(() => {
        room.timer = null;
        if (room.q !== q) return;
        q.timerEnd = null; q.timerRemain = 0;
        timeUp(room);
        broadcast(room);
      }, ms);
    }
    function pauseQTimer(room) {
      const q = room.q;
      if (q && q.timerEnd) { q.timerRemain = Math.max(0, q.timerEnd - now()); q.timerEnd = null; clearQTimer(room); }
    }
    function timeUp(room) {
      const q = room.q;
      if (!q) return;
      if (q.stage === 'open') {
        q.window = null;
        if (['mc', 'bonus', 'final'].includes(q.kind)) lockAnswers(room); else q.stage = 'timeup';
        fx(room, 'timeup');
      } else if (q.stage === 'answering') {
        q.stage = 'timeup'; fx(room, 'timeup');
      }
    }
    function openQ(room) {
      const q = room.q;
      if (q.timerRemain === 0) { q.stage = 'timeup'; return; }
      q.stage = 'open'; q.openSeq++; q.openedAt = now(); q.window = null; q.early = {};
      const ms = q.timerRemain != null ? q.timerRemain : q.timerSec * 1000;
      if (ms > 0) startQTimer(room, ms);
    }
    function lockAnswers(room) {
      const q = room.q;
      q.stage = 'locked'; q.window = null;
      clearQTimer(room); q.timerEnd = null;
      for (const tid of Object.keys(q.answers)) {
        const a = q.answers[tid];
        if (q.options.length) q.judged[tid] = a.choice === q.correct;
        else if (q.judged[tid] === undefined) q.judged[tid] = !!q.suggest[tid];
      }
    }

    function maxBoardValue(r) {
      let m = 0;
      if (r && r.type === 'board') r.categories.forEach(c => c.clues.forEach(cl => { if (cl.value > m) m = cl.value; }));
      return m;
    }
    function maxWager(room, teamId) {
      const q = room.q, t = room.teams[teamId];
      if (!q || !t) return 0;
      if (q.kind === 'dd') return Math.max(t.score, maxBoardValue(curRound(room)));
      if (q.kind === 'final') return Math.max(0, t.score);
      return 0;
    }

    /* ---- scoring ----
     * For every team on a clue we keep applied[team] = the net points that clue has given it.
     * Re-judging sets score += (new − applied), so the host can flip a ruling any number
     * of times and the score always equals (score before clue) + (effect of final ruling).
     */
    const amountFor = (room, q, tid) => (q.kind === 'dd' || q.kind === 'final') ? (q.wagers[tid] || 0) : q.value;
    function penalizeFor(room, q) {
      switch (q.kind) {
        case 'standard': return room.settings.wrongPenalty;
        case 'lightning': return !!(curRound(room) || {}).penalty;
        case 'mc': return room.settings.mcPenalty;
        case 'bonus': return false;
        default: return true;
      }
    }
    function judge(room, q, tid, correct) {
      const t = room.teams[tid];
      const amt = amountFor(room, q, tid);
      const next = correct ? amt : (penalizeFor(room, q) ? -amt : 0);
      const prev = q.applied[tid] || 0;
      if (t) t.score += next - prev;
      q.applied[tid] = next;
      q.judged[tid] = !!correct;
      return next - prev;
    }
    function clearRuling(room, q, tid) {
      const t = room.teams[tid];
      const prev = q.applied[tid] || 0;
      if (t) t.score -= prev;
      delete q.applied[tid]; delete q.judged[tid];
      return -prev;
    }

    /* ---- lightning ---- */
    function lightningNext(room) {
      const r = curRound(room), L = room.light;
      clearQTimer(room);
      L.index++;
      if (L.index >= r.questions.length) return lightningEnd(room);
      const x = r.questions[L.index];
      room.q = newQ({ kind: 'lightning', category: `${r.name} · ${L.index + 1}/${r.questions.length}`,
        text: x.q, answer: x.a, hint: x.hint, media: x.media, value: r.points });
      openQ(room);
    }
    function lightningEnd(room) {
      const L = room.light;
      if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
      clearQTimer(room);
      if (L) { L.running = false; L.done = true; L.endsAt = null; }
      room.q = null;
      fx(room, 'timeup');
    }

    function resetRoundState(room) {
      clearQTimer(room);
      if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
      room.q = null; room.light = null; room.bonus = null;
    }
    function startRound(room, index) {
      const r = room.game.rounds[index];
      if (!r) return;
      resetRoundState(room);
      room.roundIndex = index; room.phase = r.type;
      if (r.type === 'lightning') room.light = { index: -1, running: false, done: false, endsAt: null };
      if (r.type === 'bonus') room.bonus = { index: -1, done: false };
      if (r.type === 'final') {
        room.q = newQ({ kind: 'final', category: r.category, text: r.q, answer: r.a, hint: r.hint, media: r.media, timerSec: r.timer, stage: 'wager' });
      }
    }

    /* ---- views ---- */
    function teamList(room) {
      return Object.values(room.teams).map(t => ({
        id: t.id, name: t.name, section: t.section, color: t.color, score: t.score,
        members: Object.values(room.players).filter(p => p.teamId === t.id).map(p => ({ id: p.id, name: p.name, on: p.connected }))
      }));
    }
    function roundView(room, host) {
      const r = curRound(room);
      if (!r) return null;
      const v = { type: r.type, name: r.name };
      if (r.type === 'board') {
        v.categories = r.categories.map((cat, c) => ({
          name: cat.name,
          clues: cat.clues.map((cl, j) => {
            const o = { value: cl.value, used: !!room.used[`${room.roundIndex}:${c}:${j}`] };
            if (host) { o.type = cl.type; o.q = cl.q; o.a = cl.a; o.timer = cl.timer; o.media = !!cl.media; }
            return o;
          })
        }));
      } else if (r.type === 'lightning') {
        const L = room.light || {};
        Object.assign(v, { duration: r.duration, points: r.points, total: r.questions.length, index: L.index ?? -1,
          running: !!L.running, done: !!L.done, endsAt: L.running ? L.endsAt : null });
      } else if (r.type === 'bonus') {
        const B = room.bonus || {};
        Object.assign(v, { points: r.points, total: r.questions.length, index: B.index ?? -1, done: !!B.done });
      } else if (r.type === 'final') v.category = r.category;
      return v;
    }
    function qView(room, role, teamId) {
      const q = room.q;
      if (!q) return null;
      const host = role === 'host';
      const hide = (q.kind === 'dd' || q.kind === 'final') && q.stage === 'wager' && !host;
      const bp = q.buzzedPlayer && room.players[q.buzzedPlayer];
      const v = {
        kind: q.kind, category: q.category, value: q.value, stage: q.stage, openSeq: q.openSeq, c: q.c, j: q.j,
        timerEnd: q.timerEnd, timerRemain: q.timerRemain, timerSec: q.timerSec,
        lockedOut: q.lockedOut, buzzedTeam: q.buzzedTeam, buzzedPlayer: bp ? bp.name : null,
        ddTeam: q.ddTeam, revealed: q.revealed,
        text: hide ? null : q.text, media: hide ? null : q.media, options: hide ? [] : q.options,
        hasHint: !!q.hint, hintShown: q.hintShown, hint: (host || (q.hintShown && !hide)) ? q.hint : null,
        answeredTeams: Object.keys(q.answers), wageredTeams: Object.keys(q.wagers),
        answers: {}, wagers: {}, judged: {}, revealedTeams: {}
      };
      if (host) {
        Object.assign(v, { answer: q.answer, correct: q.correct, answers: q.answers, wagers: q.wagers,
          judged: q.judged, applied: q.applied, suggest: q.suggest, revealedTeams: q.revealedTeams, maxWagers: {} });
        for (const tid of Object.keys(room.teams)) v.maxWagers[tid] = maxWager(room, tid);
        return v;
      }
      if (q.revealed) { v.answer = q.answer; v.correct = q.correct; v.judged = { ...q.judged }; }
      else if (q.kind === 'standard' || q.kind === 'lightning' || q.kind === 'dd') v.judged = { ...q.judged };
      if (q.kind === 'dd' && q.stage !== 'wager') v.wagers = { ...q.wagers };
      if ((q.kind === 'mc' || q.kind === 'bonus') && q.revealed) v.answers = { ...q.answers };
      if (q.kind === 'final') {
        v.revealedTeams = { ...q.revealedTeams };
        v.judged = {};
        for (const tid of Object.keys(q.revealedTeams)) {
          v.answers[tid] = q.answers[tid] || { text: '' };
          v.wagers[tid] = q.wagers[tid] || 0;
          if (q.judged[tid] !== undefined) v.judged[tid] = q.judged[tid];
        }
        if (q.revealed) v.answer = q.answer;
      }
      if (role === 'player' && teamId) {
        if (q.answers[teamId]) v.answers[teamId] = q.answers[teamId];
        if (q.wagers[teamId] != null) v.wagers[teamId] = q.wagers[teamId];
        v.maxWager = maxWager(room, teamId);
      }
      return v;
    }
    function view(room, role, teamId) {
      return {
        serverNow: now(), code: room.code, role, you: teamId || null,
        title: room.game.title, phase: room.phase, roundIndex: room.roundIndex,
        rounds: room.game.rounds.map(r => ({ name: r.name, type: r.type })),
        round: roundView(room, role === 'host'), q: qView(room, role, teamId),
        teams: teamList(room), sections: room.settings.sections, control: room.control,
        settings: role === 'host' ? room.settings : undefined
      };
    }
    function broadcast(room) {
      room.lastActive = now();
      sendTo(`${room.code}:host`, 'state', view(room, 'host'));
      sendTo(`${room.code}:board`, 'state', view(room, 'board'));
      for (const t of Object.values(room.teams)) sendTo(`${room.code}:team:${t.id}`, 'state', view(room, 'player', t.id));
    }
    function fx(room, type, data = {}) {
      const payload = Object.assign({ type }, data);
      for (const ch of [`${room.code}:host`, `${room.code}:board`, `${room.code}:players`]) sendTo(ch, 'fx', payload);
    }
    /* Score-change animation hint for every screen. */
    const scoreFx = (room, tid, delta) => { if (delta) fx(room, 'score', { team: tid, delta }); };

    /* ---- buzzing ----
     * Each phone measures its reaction time rt_c from the moment it received the "open" state.
     * The engine knows rt_s = t_recv − t_open ≥ true reaction + uplink delay, so a phone cannot
     * report a time larger than physically possible without being capped: rt = min(rt_c, rt_s).
     * All buzzes arriving within buzzWindowMs of the first are pooled; the smallest rt wins.
     * Net effect: differing network latencies (< window) do not decide who buzzed first.
     */
    function resolveBuzz(room, seq) {
      const q = room.q;
      if (!q || q.openSeq !== seq || q.stage !== 'open' || !q.window) return;
      const win = q.window.buzzes.sort((a, b) => a.rt - b.rt)[0];
      q.window = null;
      q.stage = 'buzzed'; q.buzzedTeam = win.team; q.buzzedPlayer = win.player;
      pauseQTimer(room);
      fx(room, 'buzz', { team: win.team });
      broadcast(room);
    }

    /* ================================================== event handlers */
    const H = {};      // host handlers: (room, d, conn) => result
    const P = {};      // player handlers: (room, player, d, conn) => result

    H['host:setGame'] = (room, d) => {
      if (room.q) return { error: 'Close the current clue first.' };
      room.game = sanitizeGame(d.game);
      if (room.roundIndex >= room.game.rounds.length) { resetRoundState(room); room.roundIndex = -1; room.phase = 'lobby'; }
      else if (room.roundIndex >= 0) startRound(room, room.roundIndex);
    };
    H['host:setSettings'] = (room, d) => { room.settings = sanitizeSettings(d.settings); };
    H['host:lobby'] = room => { resetRoundState(room); room.roundIndex = -1; room.phase = 'lobby'; };
    H['host:startRound'] = (room, d) => {
      const i = int(d.index, -1);
      if (!room.game.rounds[i]) return { error: 'No such round.' };
      startRound(room, i);
      fx(room, 'round', { name: room.game.rounds[i].name, kind: room.game.rounds[i].type });
    };
    H['host:endGame'] = room => { resetRoundState(room); room.phase = 'ended'; fx(room, 'end'); };
    H['host:resetGame'] = room => {
      resetRoundState(room); room.used = {}; room.control = null; room.roundIndex = -1; room.phase = 'lobby';
      for (const t of Object.values(room.teams)) t.score = 0;
    };
    H['host:closeRoom'] = room => {
      resetRoundState(room);
      sendTo(`${room.code}:board`, 'closed', {});
      sendTo(`${room.code}:players`, 'closed', {});
      for (const c of conns.values()) if (c.data.code === room.code && c.data.role !== 'host') { leaveAll(c); c.data = {}; }
      rooms.delete(room.code);
      return { ok: true, closed: true };
    };

    /* Points: the host can add or take away any amount, or set a score outright. */
    H['host:adjust'] = (room, d) => {
      const t = room.teams[d.teamId];
      if (!t) return { error: 'No such team.' };
      const delta = int(d.delta, 0, -1e6, 1e6);
      t.score += delta; scoreFx(room, t.id, delta);
    };
    H['host:setScore'] = (room, d) => {
      const t = room.teams[d.teamId];
      if (!t) return { error: 'No such team.' };
      const s = int(d.score, t.score, -1e7, 1e7);
      scoreFx(room, t.id, s - t.score); t.score = s;
    };
    H['host:setControl'] = (room, d) => { room.control = room.teams[d.teamId] ? d.teamId : null; };
    H['host:kickTeam'] = (room, d) => {
      const t = room.teams[d.teamId];
      if (!t) return;
      const ch = `${room.code}:team:${t.id}`;
      const members = channels.get(ch) ? [...channels.get(ch)] : [];
      for (const c of members) { c.send('kicked', {}); leaveAll(c); c.data = {}; }
      for (const p of Object.values(room.players)) if (p.teamId === t.id) delete room.players[p.id];
      delete room.teams[t.id];
      if (room.control === t.id) room.control = null;
    };
    H['host:kickPlayer'] = (room, d) => {
      const p = room.players[d.playerId];
      if (!p) return;
      const c = conns.get(p.connId);
      if (c && c.data.playerId === p.id) { c.send('kicked', {}); leaveAll(c); c.data = {}; }
      delete room.players[p.id];
    };

    H['host:openClue'] = (room, d) => {
      const r = curRound(room);
      if (!r || r.type !== 'board') return { error: 'Not a board round.' };
      if (room.q) return { error: 'A clue is already open.' };
      const c = int(d.c, -1), j = int(d.j, -1);
      const cat = r.categories[c], clue = cat && cat.clues[j];
      if (!clue) return { error: 'No such clue.' };
      const key = `${room.roundIndex}:${c}:${j}`;
      if (room.used[key]) return { error: 'Already played.' };
      room.used[key] = true;
      room.q = newQ({ kind: clue.type, key, c, j, category: cat.name, value: clue.value, text: clue.q, answer: clue.a, hint: clue.hint,
        media: clue.media, options: clue.options, correct: clue.correct, timerSec: clue.timer || r.timer || 0 });
      if (clue.type === 'dd') {
        room.q.stage = 'wager';
        room.q.ddTeam = room.teams[room.control] ? room.control : null;
        fx(room, 'dd');
      } else fx(room, 'clue', { c, j });
    };
    H['host:cancelClue'] = room => {
      const q = room.q;
      if (!q || !q.key || Object.values(q.applied).some(Boolean)) return { error: 'Only an unscored board clue can go back.' };
      delete room.used[q.key];
      clearQTimer(room); room.q = null;
    };
    H['host:closeClue'] = room => {
      if (!room.q) return;
      if (room.q.kind === 'lightning') return { error: 'Use Next in lightning rounds.' };
      if (room.q.kind === 'final') return { error: 'Use Finish game for the final.' };
      clearQTimer(room); room.q = null;
    };
    H['host:open'] = room => {
      const q = room.q;
      if (q && ['standard', 'lightning', 'mc', 'bonus'].includes(q.kind) && q.stage === 'reading') { openQ(room); fx(room, 'open'); }
    };
    H['host:lock'] = room => {
      const q = room.q;
      if (q && q.stage === 'open' && ['mc', 'bonus', 'final'].includes(q.kind)) lockAnswers(room);
    };

    /* Correct / incorrect for whoever buzzed (or the Daily Double team). */
    H['host:judge'] = (room, d) => {
      const q = room.q;
      if (!q) return;
      const correct = !!d.correct;
      if (q.kind === 'standard' || q.kind === 'lightning') {
        if (q.stage !== 'buzzed') return { error: 'Nobody has buzzed in.' };
        const tid = q.buzzedTeam;
        scoreFx(room, tid, judge(room, q, tid, correct));
        fx(room, correct ? 'correct' : 'wrong', { team: tid });
        if (correct) {
          if (q.kind === 'lightning') { lightningNext(room); return; }
          room.control = tid;
          q.stage = 'revealed'; q.revealed = true; clearQTimer(room);
          return;
        }
        q.lockedOut.push(tid); q.buzzedTeam = null; q.buzzedPlayer = null;
        const left = Object.keys(room.teams).filter(t => !q.lockedOut.includes(t));
        if (!left.length) { q.stage = 'timeup'; clearQTimer(room); } else openQ(room);
        return;
      }
      if (q.kind === 'dd') {
        if (!['answering', 'timeup'].includes(q.stage) || !q.ddTeam) return { error: 'Show the clue first.' };
        scoreFx(room, q.ddTeam, judge(room, q, q.ddTeam, correct));
        if (correct) room.control = q.ddTeam;
        fx(room, correct ? 'correct' : 'wrong', { team: q.ddTeam });
        q.stage = 'revealed'; q.revealed = true; clearQTimer(room);
      }
    };
    H['host:reveal'] = room => {
      const q = room.q;
      if (!q || q.kind === 'final') return;
      clearQTimer(room); q.timerEnd = null; q.window = null;
      if (q.kind === 'mc' || q.kind === 'bonus') {
        if (q.stage === 'open' || q.stage === 'reading') lockAnswers(room);
        for (const tid of Object.keys(q.judged)) {
          const delta = judge(room, q, tid, !!q.judged[tid]);
          scoreFx(room, tid, delta);
          if (q.judged[tid]) fx(room, 'correct', { team: tid, quiet: true });
        }
      }
      q.stage = 'revealed'; q.revealed = true;
      fx(room, 'reveal');
    };
    /* Host decides: mark ANY team right, wrong, or clear the ruling, at any point on the open clue.
     * Before an MC/bonus reveal this only records the mark; after reveal (and for every other
     * clue type) the points move immediately. */
    H['host:override'] = (room, d) => {
      const q = room.q;
      const tid = d.teamId;
      if (!q || !room.teams[tid]) return { error: 'No open clue or team.' };
      if (d.correct === null || d.clear) { scoreFx(room, tid, clearRuling(room, q, tid)); return; }
      const correct = !!d.correct;
      if ((q.kind === 'bonus' || q.kind === 'mc') && !q.revealed) { q.judged[tid] = correct; return; }
      scoreFx(room, tid, judge(room, q, tid, correct));
      fx(room, correct ? 'correct' : 'wrong', { team: tid });
      if (q.kind === 'final') q.revealedTeams[tid] = true;
      if (correct && (q.kind === 'standard' || q.kind === 'dd')) room.control = tid;
    };

    H['host:setDDTeam'] = (room, d) => {
      const q = room.q;
      if (q && q.kind === 'dd' && q.stage === 'wager' && room.teams[d.teamId]) { q.ddTeam = d.teamId; q.wagers = {}; }
    };
    H['host:setWager'] = (room, d) => {
      const q = room.q;
      if (!q || q.stage !== 'wager' || !room.teams[d.teamId]) return { error: 'Wagers are closed.' };
      if (q.kind === 'dd' && d.teamId !== q.ddTeam) return { error: 'Not the Daily Double team.' };
      q.wagers[d.teamId] = int(d.amount, 0, 0, maxWager(room, d.teamId));
    };
    H['host:showClue'] = room => {
      const q = room.q;
      if (!q || q.stage !== 'wager') return;
      if (q.kind === 'dd') {
        if (!q.ddTeam) return { error: 'Pick the team playing the Daily Double.' };
        if (q.wagers[q.ddTeam] == null) q.wagers[q.ddTeam] = 0;
        q.stage = 'answering';
        if (q.timerSec > 0) startQTimer(room, q.timerSec * 1000);
      } else if (q.kind === 'final') {
        for (const tid of Object.keys(room.teams)) if (q.wagers[tid] == null) q.wagers[tid] = 0;
        openQ(room);
      }
      fx(room, 'open');
    };
    H['host:finalReveal'] = (room, d) => {
      const q = room.q;
      if (q && q.kind === 'final' && room.teams[d.teamId]) { q.revealedTeams[d.teamId] = true; fx(room, 'flip', { team: d.teamId }); }
    };
    /* Hint: the host reveals it to the big screen and the phones. */
    H['host:hint'] = room => {
      const q = room.q;
      if (!q || !q.hint) return { error: 'This clue has no hint.' };
      if (q.stage === 'wager') return { error: 'Show the clue first.' };
      if (!q.hintShown) { q.hintShown = true; fx(room, 'hint'); }
    };
    H['host:finalAnswer'] = room => { const q = room.q; if (q && q.kind === 'final') { q.revealed = true; fx(room, 'reveal'); } };

    H['host:lightningStart'] = room => {
      const r = curRound(room), L = room.light;
      if (!r || r.type !== 'lightning' || !L || L.running) return;
      if (!r.questions.length) return { error: 'This lightning round has no questions.' };
      L.index = -1; L.done = false; L.running = true; L.endsAt = now() + r.duration * 1000;
      room.roundTimer = setTimeout(() => { room.roundTimer = null; lightningEnd(room); broadcast(room); }, r.duration * 1000);
      fx(room, 'lightning');
      lightningNext(room);
    };
    H['host:lightningNext'] = room => { if (room.light && room.light.running) lightningNext(room); };
    H['host:lightningStop'] = room => { if (room.light && room.light.running) lightningEnd(room); };

    H['host:bonusNext'] = room => {
      const r = curRound(room), B = room.bonus;
      if (!r || r.type !== 'bonus' || !B) return;
      clearQTimer(room);
      B.index++;
      if (B.index >= r.questions.length) { B.done = true; room.q = null; return; }
      const x = r.questions[B.index];
      room.q = newQ({ kind: 'bonus', category: `${r.name} · ${B.index + 1}/${r.questions.length}`, text: x.q, answer: x.a, hint: x.hint,
        media: x.media, options: x.options, correct: x.correct, value: r.points, timerSec: r.timer });
    };

    P['player:leave'] = (room, p, d, conn) => { delete room.players[p.id]; leaveAll(conn); conn.data = {}; };
    P['player:buzz'] = (room, p, d) => {
      const q = room.q;
      if (!q || !['standard', 'lightning'].includes(q.kind)) return { quiet: true };
      if (q.stage === 'reading') {
        const until = now() + room.settings.earlyLockMs;
        q.early[p.id] = until;
        return { early: true, ms: room.settings.earlyLockMs, quiet: true };
      }
      if (q.stage !== 'open' || int(d.seq, -1) !== q.openSeq) return { quiet: true };
      if (q.lockedOut.includes(p.teamId)) return { lockedOut: true, quiet: true };
      if (q.early[p.id] && q.early[p.id] > now()) return { early: true, ms: q.early[p.id] - now(), quiet: true };
      const measured = now() - q.openedAt;
      let rt = Number(d.reaction);
      if (!Number.isFinite(rt) || rt < 0) rt = measured;
      rt = Math.min(rt, measured);
      if (!q.window) {
        q.window = { buzzes: [] };
        const seq = q.openSeq;
        setTimeout(() => resolveBuzz(room, seq), room.settings.buzzWindowMs);
      }
      if (!q.window.buzzes.some(b => b.team === p.teamId)) q.window.buzzes.push({ team: p.teamId, player: p.id, rt });
      return { ok: true, quiet: true };
    };
    P['player:wager'] = (room, p, d) => {
      const q = room.q;
      if (!q || q.stage !== 'wager') return { error: 'Wagers are closed.' };
      if (q.kind === 'dd' && q.ddTeam !== p.teamId) return { error: 'Not your Daily Double.' };
      if (q.kind !== 'dd' && q.kind !== 'final') return { error: 'No wager right now.' };
      q.wagers[p.teamId] = int(d.amount, 0, 0, maxWager(room, p.teamId));
      return { ok: true, amount: q.wagers[p.teamId] };
    };
    P['player:answer'] = (room, p, d) => {
      const q = room.q;
      if (!q || q.stage !== 'open' || !['mc', 'bonus', 'final'].includes(q.kind)) return { error: 'Answers are closed.' };
      const a = { by: p.name };
      if (q.options.length) {
        const c = int(d.choice, -1, -1, q.options.length - 1);
        if (c < 0) return { error: 'Pick an option.' };
        a.choice = c;
      } else {
        a.text = str(d.text, 300);
        if (!a.text) return { error: 'Type an answer.' };
        q.suggest[p.teamId] = looksRight(a.text, q.answer);
      }
      q.answers[p.teamId] = a;
      if (Object.keys(room.teams).every(t => q.answers[t])) lockAnswers(room);
    };

    /* Handlers that are not tied to an existing role. */
    function special(ev, d, conn) {
      if (ev === 'host:create') {
        if (pinBlocked(conn.ip)) return { error: 'Too many wrong PINs. Try again in 10 minutes.' };
        if (!checkPin(d.pin)) { pinFailed(conn.ip); return { error: 'Wrong host PIN.' }; }
        const room = createRoom(sanitizeGame(d.game), sanitizeSettings(d.settings));
        leaveAll(conn);
        conn.data = { role: 'host', code: room.code, token: room.hostToken };
        join(conn, `${room.code}:host`);
        return { ok: true, code: room.code, token: room.hostToken, _room: room };
      }
      if (ev === 'host:rejoin') {
        const room = getRoom(d.code);
        if (!room || typeof d.token !== 'string' || d.token !== room.hostToken) return { error: 'Room not found.' };
        leaveAll(conn);
        conn.data = { role: 'host', code: room.code, token: room.hostToken };
        join(conn, `${room.code}:host`);
        return { ok: true, code: room.code, _room: room };
      }
      if (ev === 'board:join') {
        const room = getRoom(d.code);
        if (!room) return { error: 'Room not found.' };
        leaveAll(conn);
        conn.data = { role: 'board', code: room.code };
        join(conn, `${room.code}:board`);
        setTimeout(() => conn.send('state', view(room, 'board')), 0);
        return { ok: true };
      }
      if (ev === 'room:info') {
        const room = getRoom(d.code);
        if (!room) return { error: 'Room not found. Check the code.' };
        return { ok: true, title: room.game.title, sections: room.settings.sections,
          teams: Object.values(room.teams).map(t => ({ id: t.id, name: t.name, section: t.section, color: t.color })) };
      }
      if (ev === 'player:join') {
        const room = getRoom(d.code);
        if (!room) return { error: 'Room not found. Check the code.' };
        let p = typeof d.playerId === 'string' ? room.players[d.playerId] : null;
        if (!d.name) {
          if (!p || !room.teams[p.teamId]) return { error: 'Please join again.' };
        } else {
          const name = str(d.name, 24);
          if (!name) return { error: 'Enter your name.' };
          let team = typeof d.teamId === 'string' ? room.teams[d.teamId] : null;
          if (!team) {
            const tn = str(d.newTeam, 24);
            if (!tn) return { error: 'Pick a team or make a new one.' };
            team = Object.values(room.teams).find(t => t.name.toLowerCase() === tn.toLowerCase());
            if (!team) {
              if (Object.keys(room.teams).length >= MAX_TEAMS) return { error: 'The game is full (12 teams).' };
              const usedColors = new Set(Object.values(room.teams).map(t => t.color));
              const color = TEAM_COLORS.find(c => !usedColors.has(c)) || TEAM_COLORS[0];
              const section = room.settings.sections.includes(d.section) ? d.section : '';
              team = { id: randomId(4), name: tn, section, color, score: 0 };
              room.teams[team.id] = team;
              fx(room, 'joined', { team: team.id });
            }
          }
          if (!p) { p = { id: randomId(8) }; room.players[p.id] = p; }
          p.name = name; p.teamId = team.id;
        }
        p.connected = true; p.connId = conn.id;
        leaveAll(conn);
        conn.data = { role: 'player', code: room.code, playerId: p.id };
        join(conn, `${room.code}:team:${p.teamId}`);
        join(conn, `${room.code}:players`);
        return { ok: true, playerId: p.id, teamId: p.teamId, code: room.code, _room: room };
      }
      return undefined;
    }

    /* ---- public API ---- */
    function connect(conn) {
      conn.channels = new Set(); conn.data = {};
      conns.set(conn.id, conn);
      return {
        handle(ev, d, ack) {
          ack = typeof ack === 'function' ? ack : () => {};
          d = isObj(d) ? d : {};
          if (!EVENTS.includes(ev)) return ack({ error: 'Unknown action.' });
          try {
            const sp = special(ev, d, conn);
            if (sp !== undefined) {
              const room = sp._room; delete sp._room;
              ack(sp);
              if (room) broadcast(room);
              return;
            }
            const room = rooms.get(conn.data.code);
            if (ev.startsWith('host:')) {
              if (!room || conn.data.role !== 'host' || conn.data.token !== room.hostToken) return ack({ error: 'Not signed in as host.' });
              const res = H[ev](room, d, conn);
              ack(res || { ok: true });
              if (!(res && res.closed)) broadcast(room);
              return;
            }
            const p = room && room.players[conn.data.playerId];
            if (!room || !p || !room.teams[p.teamId]) return ack({ error: 'Not in a game.' });
            const res = P[ev](room, p, d, conn);
            ack(res || { ok: true });
            if (!res || !res.quiet) broadcast(room);
          } catch (e) { log(ev, e); ack({ error: 'Something went wrong.' }); }
        },
        disconnect() {
          const room = rooms.get(conn.data.code);
          leaveAll(conn); conns.delete(conn.id);
          if (room && conn.data.role === 'player') {
            const p = room.players[conn.data.playerId];
            if (p && p.connId === conn.id) { p.connected = false; broadcast(room); }
          }
        }
      };
    }
    function sweep(maxIdleMs) {
      const cutoff = now() - maxIdleMs;
      for (const [code, room] of rooms) if (room.lastActive < cutoff) { resetRoundState(room); rooms.delete(code); }
    }

    return { connect, sweep, rooms };
  }

  return { createEngine, EVENTS, sanitizeGame, sanitizeSettings, looksRight };
});
