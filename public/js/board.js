/* ASA Jeopardy — big screen (projector) view. mountBoard(root, net, { code, local, joinBase }) */
(function () {
  'use strict';
  const { esc, render, Sound, title } = Craft;
  const KIND_COLOR = { board: '--blue', lightning: '--mustard', bonus: '--green', final: '--purple' };
  const KIND_SUB = { board: 'Pick a tile!', lightning: 'Buzz fast, answer faster', bonus: 'Every team answers on their phone', final: 'Wager wisely' };

  window.mountBoard = function (root, net, o = {}) {
    root.classList.add('v-board');
    root.innerHTML = `<div class="wrap b-wrap"><header class="b-head"><div class="tape b-tape"></div><h1 class="title b-title"></h1></header>
      <main class="b-stage"></main><div class="scores b-scores"></div></div>
      <button class="btn sm b-sound" type="button">🔈 Turn sound on</button>`;
    const $ = s => root.querySelector(s);
    const stage = $('.b-stage'), titleEl = $('.b-title'), tape = $('.b-tape');
    FX.setShakeTarget($('.b-wrap'));
    const sb = new Views.Scoreboard($('.b-scores'));
    const sheet = new Views.ClueSheet(o.overlayHost || (o.local ? root : document.body), { local: !!o.local });
    let S = null, code = o.code || null, lastTitle = '', stageKey = '', qrDone = '';

    $('.b-sound').onclick = e => { if (Sound.enable()) { e.currentTarget.remove(); Sound.play('pop'); } };
    if (o.local) $('.b-sound').remove();

    function showJoin(err) {
      stage.innerHTML = `<div class="card paper b-joincard"><h2 class="hand">Big screen</h2><p>Enter the room code shown on the host screen.</p>
        <input class="field b-code-in" maxlength="4" autocapitalize="characters" placeholder="ABCD"><div class="err">${esc(err || '')}</div>
        <button class="btn big hi b-go">Show board</button></div>`;
      const go = () => { code = stage.querySelector('.b-code-in').value.trim().toUpperCase(); if (code) join(); };
      stage.querySelector('.b-go').onclick = go;
      stage.querySelector('.b-code-in').onkeydown = e => { if (e.key === 'Enter') go(); };
    }
    function join() {
      net.emit('board:join', { code }).then(r => {
        if (r.error) showJoin(r.error);
        else if (!o.local) history.replaceState(null, '', `?room=${code}`);
      });
    }
    net.onConnect(() => { if (code) join(); else showJoin(); });
    net.on('state', s => { Craft.sync(s.serverNow); const prev = S; S = s; draw(prev); });
    net.on('closed', () => { S = null; sheet.hide(); stage.innerHTML = '<div class="card paper"><h2 class="hand">This room was closed.</h2></div>'; });
    net.on('fx', onFx);

    function joinUrl() { return o.joinBase ? `${o.joinBase}/?room=${S.code}` : ''; }

    function lobbyHTML(s) {
      const url = joinUrl();
      const bySec = {};
      s.teams.forEach(t => { (bySec[t.section || 'Teams'] = bySec[t.section || 'Teams'] || []).push(t); });
      return `<div class="b-lobby">
        <div class="card paper b-joinbox"><div class="b-join-step">Grab your phone and join!</div>
          ${url ? `<div class="b-url">${esc(url.replace(/^https?:\/\//, ''))}</div>` : '<div class="b-url">Use the phone tabs</div>'}
          <div class="b-codelbl">Room code</div>
          <div class="b-code">${[...s.code].map((ch, i) => `<span class="block stroke crayon" style="--c:var(${Craft.CAT[i]});--d:${-i * 0.3}s">${ch}</span>`).join('')}</div>
          <div class="b-qr"></div></div>
        <div class="card paper b-teamsbox"><h2 class="hand">Teams (${s.teams.length})</h2>
          ${s.teams.length ? Object.entries(bySec).map(([sec, ts]) => `<div class="b-sec"><div class="tape">${esc(sec)}</div><div class="b-sec-teams">${ts.map(t =>
            `<span class="chip yarn pop" style="--c:${t.color}"><b>${esc(t.name)}</b> <span class="small">${t.members.length}</span></span>`).join('')}</div></div>`).join('')
            : '<p class="muted">Waiting for the first team…</p>'}
        </div></div>`;
    }
    function roundCard(s) {
      const r = s.round;
      if (r.type === 'lightning') {
        return `<div class="card paper b-roundcard"><div class="b-bolt">⚡</div><h2 class="hand">${esc(r.name)}</h2>
          ${r.running ? `<div class="b-clock block stroke crayon" data-end="${r.endsAt}"></div><div>Question ${r.index + 1} of ${r.total} · ${r.points} pts each</div>`
            : r.done ? '<div class="b-big block">Time!</div>' : `<div>${r.duration} seconds · ${r.points} points per answer · buzz in!</div><div class="status">Get ready…</div>`}</div>`;
      }
      if (r.type === 'bonus') {
        return `<div class="card paper b-roundcard"><h2 class="hand">${esc(r.name)}</h2>
          <div>${r.done ? 'Bonus round complete!' : `Every team answers on their phone · ${r.points} points each`}</div>
          ${r.index >= 0 && !r.done ? `<div class="status">Question ${r.index + 1} of ${r.total}</div>` : '<div class="status">Get ready…</div>'}</div>`;
      }
      if (r.type === 'final') return `<div class="card paper b-roundcard"><h2 class="hand">${esc(r.name)}</h2><div>Category: <b>${esc(r.category)}</b></div></div>`;
      return '';
    }
    function podiumHTML(s) {
      const ts = [...s.teams].sort((a, b) => b.score - a.score);
      const order = [1, 0, 2].filter(i => ts[i]);
      const secs = {};
      s.teams.forEach(t => { if (t.section) secs[t.section] = (secs[t.section] || 0) + t.score; });
      const secRows = Object.entries(secs).sort((a, b) => b[1] - a[1]);
      return `<div class="b-podium">${order.map(i => `<div class="b-step b-step${i + 1}" style="--c:${ts[i].color};--d:${0.3 + (2 - i) * 0.35}s">
          <div class="b-medal block stroke crayon">${['1st', '2nd', '3rd'][i]}</div><div class="b-pname block stroke">${esc(ts[i].name)}</div>
          <div class="b-pblock yarn"><span class="tscore paper block">${ts[i].score}</span></div></div>`).join('')}</div>
        ${ts.length > 3 ? `<div class="card paper b-rest">${ts.slice(3).map((t, i) => `<div>${i + 4}. <b>${esc(t.name)}</b> — ${t.score}</div>`).join('')}</div>` : ''}
        ${secRows.length ? `<div class="card paper b-rest"><h2 class="hand">Section totals</h2>${secRows.map(([n, v], i) => `<div>${i + 1}. <b>${esc(n)}</b> — ${v}</div>`).join('')}</div>` : ''}`;
    }

    function draw(prev) {
      const s = S;
      if (s.title !== lastTitle) { title(titleEl, s.title); lastTitle = s.title; }
      tape.textContent = s.phase === 'lobby' ? (s.presenter || 'Asian Student Association presents') + (s.edition ? ` · ${s.edition}` : '') : s.phase === 'ended' ? 'Final scores' : (s.round ? s.round.name : '');
      root.classList.toggle('is-lobby', s.phase === 'lobby');

      if (s.phase === 'lobby') {
        const key = 'lobby' + JSON.stringify(s.teams.map(t => [t.id, t.name, t.section, t.members.length]));
        if (key !== stageKey) {
          render(stage, lobbyHTML(s)); stageKey = key;
          const qr = stage.querySelector('.b-qr'), url = joinUrl();
          if (qr && url && window.QRCode) { try { new QRCode(qr, { text: url, width: 168, height: 168, colorDark: '#1c1a17', colorLight: '#f3f1ec' }); } catch (_) { /* optional */ } }
          qrDone = url;
        }
      } else if (s.phase === 'board') {
        const key = 'board' + s.roundIndex + JSON.stringify(s.round.categories.map(c => c.clues.map(x => x.used))) + (s.q && s.q.c != null ? `${s.q.c}:${s.q.j}` : '');
        if (key !== stageKey) {
          if (!stageKey.startsWith('board' + s.roundIndex)) stage.innerHTML = '<div class="board-back darkpaper"><div class="board b-board"></div></div>';
          Views.boardGrid(stage.querySelector('.b-board'), s.round, { introKey: 'r' + s.roundIndex, active: s.q && s.q.c != null ? { c: s.q.c, j: s.q.j } : null });
          stageKey = key;
        }
      } else if (s.phase === 'ended') {
        const key = 'ended' + JSON.stringify(s.teams.map(t => [t.id, t.score]));
        if (key !== stageKey) { render(stage, podiumHTML(s)); stageKey = key; }
      } else {
        const key = s.phase + s.roundIndex + JSON.stringify(s.round);
        if (key !== stageKey) { render(stage, roundCard(s)); stageKey = key; }
      }

      sb.update(s.teams, s.q, s.control);

      if (s.q) {
        let from = null;
        if (!sheet.isOpen && s.q.c != null) from = Views.tileEl(stage.querySelector('.b-board'), s.q.c, s.q.j);
        sheet.show(s, from);
      } else sheet.hide();
    }

    function teamColor(id) { const t = S && S.teams.find(x => x.id === id); return t ? t.color : '#ffd84d'; }
    function onFx(e) {
      switch (e.type) {
        case 'buzz': {
          Sound.play('buzz');
          setTimeout(() => {
            const n = sb.node(e.team);
            if (n) { const c = FX.centerOf(n.querySelector('.bulb')); FX.sparkles(c.x, c.y, { count: 18, colors: [teamColor(e.team), '#fff', '#ffd84d'], power: 0.8 }); }
          }, 60);
          break;
        }
        case 'correct': {
          if (!e.quiet) Sound.play('correct');
          setTimeout(() => {
            const c = sheet.isOpen ? sheet.center() : (sb.node(e.team) ? FX.centerOf(sb.node(e.team)) : { x: innerWidth / 2, y: innerHeight / 2 });
            FX.sparkles(c.x, c.y, { count: e.quiet ? 14 : 34, power: 1.3 });
            if (!e.quiet) FX.confetti(c.x, c.y, { count: 30, power: 0.7 });
          }, 80);
          break;
        }
        case 'wrong': Sound.play('wrong'); if (sheet.isOpen) FX.restart(sheet.wrap, 'shake', 550); break;
        case 'timeup': Sound.play('timeup'); break;
        case 'dd': Sound.play('dd'); FX.slap('Daily Double!', { color: '--red', hold: 1000 }); break;
        case 'round':
          if (e.kind === 'lightning') FX.lightning();
          FX.slap(e.name, { color: KIND_COLOR[e.kind] || '--blue', sub: KIND_SUB[e.kind] || '', hold: 1200 });
          break;
        case 'lightning': FX.lightning(); break;
        case 'reveal': case 'joined': case 'flip': Sound.play('pop'); break;
        case 'open': Sound.play('open'); break;
        case 'hint': Sound.play('pop'); setTimeout(() => { const n = document.querySelector('.hint-note'); if (n) { const c = FX.centerOf(n); FX.sparkles(c.x, c.y, { count: 16, colors: ['#ffd84d', '#fff', '#e6a92b'], power: 0.7 }); } }, 120); break;
        case 'end': setTimeout(() => FX.celebrate(), 400); break;
      }
    }
    return { get state() { return S; } };
  };
})();
