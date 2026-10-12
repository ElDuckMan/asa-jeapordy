/* ASA Jeopardy — host control panel. mountHost(root, net, { local, autoPin, joinBase }) */
(function () {
  'use strict';
  const { esc, render, toast, title } = Craft;
  const TYPE = { board: 'board', lightning: 'lightning', bonus: 'bonus', final: 'final' };
  const KIND = { standard: 'Standard', dd: 'Daily Double', mc: 'Multiple choice', lightning: 'Lightning', bonus: 'Bonus', final: 'Final' };
  const STAGE = { reading: 'Reading', open: 'Open', buzzed: 'Buzzed in', timeup: "Time's up", revealed: 'Revealed', wager: 'Wagering', answering: 'Answering', locked: 'Locked' };
  const DEFAULT_SETTINGS = { sections: ['Freshmen', 'Sophomores', 'Juniors', 'Seniors', 'Grad / Other'], wrongPenalty: true, mcPenalty: false, buzzWindowMs: 300, earlyLockMs: 250 };

  window.mountHost = function (root, net, o = {}) {
    const store = o.local ? null : window.localStorage;
    const get = (k, d) => { try { const v = store && store.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } };
    const put = (k, v) => { try { if (store) store.setItem(k, JSON.stringify(v)); } catch (_) { /* full */ } };
    const del = k => { try { if (store) store.removeItem(k); } catch (_) { /* */ } };

    let game = get('asa-game', null) || JSON.parse(JSON.stringify(window.SAMPLE_GAME));
    let settings = Object.assign({}, DEFAULT_SETTINGS, get('asa-settings', {}));
    let S = null, tab = 'live', amount = 100, editor = null, inRoom = false;

    root.classList.add('v-host');
    root.innerHTML = `<div class="wrap">
      <header class="h-top"><h1 class="title h-title"></h1>
        <nav class="row center h-tabs"><button class="btn sm on" data-tab="live">🎛 Live</button><button class="btn sm" data-tab="editor">✎ Game editor</button><button class="btn sm" data-tab="settings">⚙ Settings</button></nav></header>
      <section class="h-signin" hidden></section><section class="h-live" hidden></section>
      <section class="h-editor" hidden></section><section class="h-settings" hidden></section></div>`;
    const $ = s => root.querySelector(s);
    title($('.h-title'), 'Host');
    const emit = (ev, d) => net.emit(ev, d || {}).then(r => { if (r && r.error) toast(r.error); return r || {}; });

    /* ---------- sign-in ---------- */
    function showSignin(err) {
      inRoom = false;
      if (o.signinUrl) { location.replace(o.signinUrl + (err ? '&err=' + encodeURIComponent(err) : '')); return; }
      render($('.h-signin'), `<div class="card paper h-signcard pop"><h2 class="hand">Host sign-in</h2>
        <p>Enter the host PIN to open a game room. Teams join on their phones with the room code.</p>
        <label class="lbl" for="h-pin">Host PIN</label><input id="h-pin" class="field h-pin" type="password" inputmode="numeric" autocomplete="current-password" data-keep="pin">
        <div class="err">${esc(err || '')}</div>
        <button class="btn big hi" data-act="create">Open game room</button>
        <p class="small muted">Uses the game in the Game editor: “${esc(game.title)}”, ${game.rounds.length} round(s).</p></div>`);
      setTab(tab === 'live' ? 'live' : tab);
      const pin = $('.h-pin');
      if (pin) pin.onkeydown = e => { if (e.key === 'Enter') createRoom(); };
    }
    function createRoom(pinOverride) {
      const pin = pinOverride != null ? pinOverride : ($('.h-pin') ? $('.h-pin').value : '');
      net.emit('host:create', { pin, game, settings }).then(r => {
        if (r.error) return showSignin(r.error);
        put('asa-host', { code: r.code, token: r.token });
        inRoom = true; setTab('live');
      });
    }
    net.onConnect(() => {
      const saved = get('asa-host', null);
      if (o.autoPin != null && !inRoom) return createRoom(o.autoPin);
      if (saved) net.emit('host:rejoin', saved).then(r => { if (r.ok) { inRoom = true; setTab('live'); } else { del('asa-host'); showSignin(); } });
      else showSignin();
    });
    net.on('state', s => { Craft.sync(s.serverNow); S = s; inRoom = true; if (tab === 'live') drawLive(); });
    net.on('fx', e => { if (e.type === 'buzz' && navigator.vibrate) navigator.vibrate(60); });

    /* ---------- tabs ---------- */
    function setTab(t) {
      tab = t;
      root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
      $('.h-signin').hidden = !(t === 'live' && !inRoom);
      $('.h-live').hidden = !(t === 'live' && inRoom);
      $('.h-editor').hidden = t !== 'editor';
      $('.h-settings').hidden = t !== 'settings';
      if (t === 'live' && inRoom && S) drawLive();
      if (t === 'editor' && !editor) editor = Editor.mount($('.h-editor'), game, g => { game = g; put('asa-game', g); }, { onPush: () => pushGame() });
      if (t === 'settings') drawSettings();
    }
    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    function pushGame() {
      if (!inRoom) return toast('Saved. It will be used when you open a room.');
      emit('host:setGame', { game }).then(r => { if (r.ok) toast('Live game updated.'); });
    }

    /* ---------- settings ---------- */
    function drawSettings() {
      render($('.h-settings'), `<div class="card paper"><h2 class="hand">Settings</h2>
        <label class="lbl">Sections teams can pick (one per line)</label>
        <textarea class="field" rows="5" data-keep="secs" data-s="sections">${esc(settings.sections.join('\n'))}</textarea>
        <label class="row"><input type="checkbox" data-s="wrongPenalty" ${settings.wrongPenalty ? 'checked' : ''}> Take points away for wrong buzz-in answers</label>
        <label class="row"><input type="checkbox" data-s="mcPenalty" ${settings.mcPenalty ? 'checked' : ''}> Take points away for wrong multiple-choice answers</label>
        <label class="lbl">Buzzer fairness window (ms) <span class="small muted">— buzzes this close together are decided by each phone's own reaction time, so slow Wi-Fi doesn't lose</span></label>
        <input class="field num" type="number" min="0" max="2000" data-s="buzzWindowMs" value="${settings.buzzWindowMs}">
        <label class="lbl">Too-early buzz lockout (ms)</label>
        <input class="field num" type="number" min="0" max="3000" data-s="earlyLockMs" value="${settings.earlyLockMs}">
        <div class="row" style="margin-top:14px"><button class="btn hi" data-act="saveSettings">Save settings</button></div></div>`);
    }
    function readSettings() {
      const v = k => root.querySelector(`[data-s="${k}"]`);
      settings = {
        sections: v('sections').value.split('\n').map(x => x.trim()).filter(Boolean),
        wrongPenalty: v('wrongPenalty').checked, mcPenalty: v('mcPenalty').checked,
        buzzWindowMs: +v('buzzWindowMs').value || 0, earlyLockMs: +v('earlyLockMs').value || 0
      };
      put('asa-settings', settings);
      if (inRoom) emit('host:setSettings', { settings }).then(r => { if (r.ok) toast('Settings saved.'); });
      else toast('Settings saved.');
    }

    /* ---------- live control ---------- */
    const card = h => `<div class="card paper">${h}</div>`;
    const btn = (act, label, cls = '', data = {}) => `<button class="btn ${cls}" data-act="${act}" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${label}</button>`;
    const Tm = id => (S.teams.find(t => t.id === id) || { name: '?', color: '#888', score: 0 });
    const allUsed = r => r.categories.every(c => c.clues.every(x => x.used));
    function nextRoundBtn(s) {
      const n = s.roundIndex + 1;
      return n < s.rounds.length ? btn('round', `▶ Start ${esc(s.rounds[n].name)}`, 'hi', { i: n }) : btn('endGame', '🏆 Finish game', 'hi');
    }
    function standings(s) {
      const ts = [...s.teams].sort((a, b) => b.score - a.score);
      return `<ol class="h-stand">${ts.map(t => `<li><span class="sw" style="background:${t.color}"></span><b>${esc(t.name)}</b> ${t.section ? `<span class="small muted">${esc(t.section)}</span>` : ''} — ${t.score}</li>`).join('')}</ol>`;
    }

    function drawLive() {
      if (!S) return;
      const s = S;
      const join = o.joinBase ? `${o.joinBase}/?room=${s.code}` : '';
      let h = `<div class="card paper h-roombar">
        <div><div class="small muted">Room code</div><div class="h-code block stroke crayon">${s.code}</div></div>
        <div class="h-links">${join ? `<div>Phones join at <a href="${join}" target="_blank" rel="noopener">${esc(join.replace(/^https?:\/\//, ''))}</a></div>
          <div><a href="${o.joinBase}/board?room=${s.code}" target="_blank" rel="noopener">Open the big screen ↗</a> <span class="small muted">(put it on the projector)</span></div>
          <div class="small"><a href="${o.joinBase}/preview" target="_blank" rel="noopener">Practice mode ↗</a> <span class="muted">(try the game with CPU teams)</span></div>`
          : '<div class="small muted">Preview: the big screen and team phones are on this page.</div>'}</div>
        <div class="row">${btn('push', '⟳ Apply editor changes', 'sm')}${btn('reset', 'New game', 'sm')}${btn('closeRoom', 'Close room', 'sm no')}</div></div>`;
      h += `<div class="row h-rounds">${btn('lobby', 'Lobby', 'sm ' + (s.phase === 'lobby' ? 'on' : ''))}
        ${s.rounds.map((r, i) => btn('round', `${i + 1}. ${esc(r.name)} <span class="small muted">${TYPE[r.type]}</span>`, 'sm ' + (s.roundIndex === i && !['lobby', 'ended'].includes(s.phase) ? 'on' : ''), { i })).join('')}
        ${btn('endGame', '🏆 End game', 'sm ' + (s.phase === 'ended' ? 'on' : ''))}</div>`;
      h += `<div class="h-grid"><div class="h-main">${mainHTML(s)}</div><aside class="h-side">${teamsHTML(s)}</aside></div>`;
      render($('.h-live'), h);
      const hb = $('.h-board');
      if (hb) Views.boardGrid(hb, s.round, { host: true, onPick: (c, j) => emit('host:openClue', { c, j }) });
    }

    function mainHTML(s) {
      const q = s.q, r = s.round;
      if (s.phase === 'lobby') {
        return card(`<h2 class="hand">Lobby</h2><p>${s.teams.length} team(s) have joined with code <b>${s.code}</b>. You can start whenever you're ready; late teams can still join.</p>
          ${s.rounds.length ? btn('round', `▶ Start ${esc(s.rounds[0].name)}`, 'big hi', { i: 0 }) : '<p>Add rounds in the Game editor first.</p>'}`);
      }
      if (s.phase === 'ended') return card(`<h2 class="hand">Game over</h2>${standings(s)}<div class="row">${btn('lobby', 'Back to lobby')}${btn('reset', 'New game (reset scores)')}</div>`);
      let h = '';
      if (q) h += cluePanel(s);
      if (r.type === 'board' && !q) {
        h += card(`<h2 class="hand">${esc(r.name)} <span class="small muted">tap a tile to open it on the big screen</span></h2>
          <div class="board-back darkpaper"><div class="board h-board"></div></div>
          <div class="row h-control"><span>Picks next:</span>${s.teams.map(t => btn('control', esc(t.name), 'sm ' + (s.control === t.id ? 'on' : ''), { team: t.id })).join('') || '<span class="muted">no teams yet</span>'}</div>
          ${allUsed(r) ? `<p class="h-hint">Board cleared! ${nextRoundBtn(s)}</p>` : `<p class="small muted">DD = Daily Double, MC = multiple choice, 15s = timed clue, IMG = picture/audio.</p>`}`);
      }
      if (r.type === 'lightning' && !q) {
        h += card(`<h2 class="hand">⚡ ${esc(r.name)}</h2>${r.done ? `<p>Lightning round over.</p>${nextRoundBtn(s)}`
          : `<p>${r.total} questions · ${r.duration}s on the clock · ${r.points} pts each. Buzzers open automatically for each question; you tap Correct or Incorrect.</p>${btn('lightningStart', '⚡ Start the clock', 'big hi')}`}`);
      }
      if (r.type === 'bonus' && !q) {
        h += card(`<h2 class="hand">${esc(r.name)}</h2>${r.done ? `<p>All bonus questions played.</p>${nextRoundBtn(s)}`
          : `<p>Question ${r.index + 2} of ${r.total} is next. Every team answers on their phone, then you decide who was right.</p>${btn('bonusNext', '▶ Next bonus question', 'big hi')}`}`);
      }
      return h;
    }

    function cluePanel(s) {
      const q = s.q;
      const lightningClock = s.round && s.round.type === 'lightning' && s.round.endsAt ? `<span class="h-clock block">⚡ <span data-end="${s.round.endsAt}"></span></span>` : '';
      let h = `<div class="card paper h-clue"><div class="row h-cluehead"><span class="h-kind yarn block" style="--c:var(--blue)">${KIND[q.kind]}</span>
        <b>${esc(q.category)}</b>${q.value && !['dd', 'final'].includes(q.kind) ? `<span>· ${q.value} pts</span>` : ''}
        <span class="h-stage">${STAGE[q.stage] || q.stage}</span>${q.timerEnd ? `<span class="h-clock block" data-end="${q.timerEnd}"></span>` : ''}${lightningClock}</div>
        <div class="h-qtext">${esc(q.text || '')}</div>`;
      if (q.media) h += `<div class="small">Media: <a href="${esc(q.media.url)}" target="_blank" rel="noopener">${esc(q.media.type)}</a> (plays on the big screen)</div>`;
      if (q.options && q.options.length) h += `<ol class="h-opts" type="A">${q.options.map((op, i) => `<li class="${i === q.correct ? 'right' : ''}">${esc(op)}${i === q.correct ? ' ✓' : ''}</li>`).join('')}</ol>`;
      h += `<div class="h-answer"><span class="small muted">Answer${q.revealed ? '' : ' (only you can see it)'}:</span> <b>${esc(q.answer || '—')}</b></div>`;
      h += `<div class="h-actions">${actions(s)}</div>${rulings(s)}${footer(s)}</div>`;
      return h;
    }

    function actions(s) {
      const q = s.q, v = q.value;
      let h = '';
      if (q.kind === 'standard' || q.kind === 'lightning') {
        if (q.stage === 'reading') h += `<div class="row center">${btn('open', '🔔 Open buzzers', 'big hi')}</div><p class="small muted center">Read the clue aloud first. Teams who buzz before you open are locked out briefly.</p>`;
        if (q.stage === 'open') h += `<div class="h-wait">Buzzers open — waiting for a buzz…${q.lockedOut.length ? `<div class="small">Locked out: ${q.lockedOut.map(id => esc(Tm(id).name)).join(', ')}</div>` : ''}</div>`;
        if (q.stage === 'buzzed') {
          const t = Tm(q.buzzedTeam), pen = q.kind === 'standard' ? s.settings.wrongPenalty : null;
          h += `<div class="h-buzzed yarn block stroke pop" style="--c:${t.color}">${esc(t.name)} buzzed in${q.buzzedPlayer ? ` <small>(${esc(q.buzzedPlayer)})</small>` : ''}</div>
            <div class="row center">${btn('judge', `✓ Correct +${v}`, 'big go', { correct: 1 })}${btn('judge', `✗ Incorrect${pen === false ? '' : pen ? ` −${v}` : ''}`, 'big no', { correct: 0 })}</div>`;
        }
        if (q.stage === 'timeup') h += `<div class="h-wait">${q.lockedOut.length && q.lockedOut.length >= s.teams.length ? 'Every team missed it.' : "Time's up."}</div>`;
        const row = [];
        if (!q.revealed) row.push(btn('reveal', '👁 Reveal answer'));
        if (q.kind === 'lightning') row.push(btn('lightningNext', '⏭ Next question', 'hi'), btn('lightningStop', '■ Stop round', 'no'));
        if (row.length) h += `<div class="row center">${row.join('')}</div>`;
      } else if (q.kind === 'dd') {
        if (q.stage === 'wager') {
          h += `<div class="lbl">Which team is playing the Daily Double?</div><div class="row">${s.teams.map(t => btn('ddTeam', esc(t.name), 'sm ' + (q.ddTeam === t.id ? 'on' : ''), { team: t.id })).join('')}</div>`;
          if (q.ddTeam) {
            const w = q.wagers[q.ddTeam];
            h += `<div class="row" style="margin-top:10px"><span>Wager (0–${q.maxWagers[q.ddTeam]}):</span>
              <input class="field num" type="number" min="0" max="${q.maxWagers[q.ddTeam]}" data-keep="w-${q.ddTeam}" value="${w ?? ''}" placeholder="from phone">
              ${btn('setWager', 'Set', 'sm', { team: q.ddTeam })}<span class="small">${w != null ? `Locked in: <b>${w}</b>` : 'Waiting for their phone…'}</span></div>`;
          }
          h += `<div class="row center" style="margin-top:12px">${btn('showClue', '▶ Show the clue', 'big hi')}</div>`;
        } else if (q.stage === 'answering' || q.stage === 'timeup') {
          const t = Tm(q.ddTeam), w = q.wagers[q.ddTeam] || 0;
          h += `<div class="h-buzzed yarn block stroke" style="--c:${t.color}">${esc(t.name)} · wager ${w}</div>
            <div class="row center">${btn('judge', `✓ Correct +${w}`, 'big go', { correct: 1 })}${btn('judge', `✗ Incorrect −${w}`, 'big no', { correct: 0 })}</div>`;
        }
      } else if (q.kind === 'mc' || q.kind === 'bonus') {
        if (q.stage === 'reading') h += `<div class="row center">${btn('open', '📱 Open answers on phones', 'big hi')}</div>`;
        if (['open', 'locked', 'revealed'].includes(q.stage)) h += answersTable(s);
        if (q.stage === 'open') h += `<div class="row center">${btn('lock', '🔒 Lock answers')}${btn('reveal', '👁 Reveal & score', 'hi')}</div>`;
        if (q.stage === 'locked') h += `<div class="row center">${btn('reveal', '👁 Reveal & score', 'big hi')}</div><p class="small muted center">Tap ✓ / ✗ to change any ruling before you reveal.</p>`;
      } else if (q.kind === 'final') {
        if (q.stage === 'wager') {
          h += `<p>Teams are wagering on their phones. You can also type a wager for them.</p><div class="h-table">${s.teams.map(t => `<div class="h-tr"><span class="sw" style="background:${t.color}"></span><b>${esc(t.name)}</b>
            <span class="small">score ${t.score}, max ${q.maxWagers[t.id]}</span><span>${q.wagers[t.id] != null ? `✓ ${q.wagers[t.id]}` : '…'}</span>
            <input class="field num" type="number" min="0" max="${q.maxWagers[t.id]}" data-keep="w-${t.id}" placeholder="wager">${btn('setWager', 'Set', 'sm', { team: t.id })}</div>`).join('')}</div>
            <div class="row center">${btn('showClue', '▶ Show the final clue', 'big hi')}</div>`;
        } else {
          if (q.stage === 'open') h += `<div class="h-wait">${q.answeredTeams.length}/${s.teams.length} teams have answered.</div><div class="row center">${btn('lock', '🔒 Lock answers')}</div>`;
          h += `<div class="h-table">${s.teams.map(t => {
            const a = q.answers[t.id], j = q.judged[t.id], shown = q.revealedTeams[t.id];
            return `<div class="h-tr"><span class="sw" style="background:${t.color}"></span><b>${esc(t.name)}</b><span class="h-ans">${a ? `“${esc(a.text)}”` : '<i>no answer</i>'}${q.suggest && q.suggest[t.id] ? ' <span class="h-sugg">looks right</span>' : ''}</span>
              <span class="small">wager ${q.wagers[t.id] || 0}</span>
              ${btn('finalReveal', shown ? 'Shown' : 'Show on screen', 'sm ' + (shown ? 'on' : ''), { team: t.id })}
              ${btn('rule', '✓', 'sm go ' + (j === true ? 'on' : ''), { team: t.id, v: 1 })}${btn('rule', '✗', 'sm no ' + (j === false ? 'on' : ''), { team: t.id, v: 0 })}</div>`;
          }).join('')}</div>
          <div class="row center">${btn('finalAnswer', '👁 Reveal correct answer', q.revealed ? 'on' : '')}${btn('endGame', '🏆 Finish game', 'hi')}</div>`;
        }
      }
      return h;
    }

    function answersTable(s) {
      const q = s.q;
      return `<div class="h-table">${s.teams.map(t => {
        const a = q.answers[t.id], j = q.judged[t.id];
        let ans = '<i>no answer yet</i>';
        if (a) ans = a.choice != null ? `<b>${'ABCDEF'[a.choice]}</b> ${esc(q.options[a.choice])}` : `“${esc(a.text)}”`;
        return `<div class="h-tr"><span class="sw" style="background:${t.color}"></span><b>${esc(t.name)}</b><span class="h-ans">${ans}${a && a.by ? ` <span class="small muted">by ${esc(a.by)}</span>` : ''}${q.suggest && q.suggest[t.id] ? ' <span class="h-sugg">looks right</span>' : ''}</span>
          ${btn('rule', '✓', 'sm go ' + (j === true ? 'on' : ''), { team: t.id, v: 1 })}${btn('rule', '✗', 'sm no ' + (j === false ? 'on' : ''), { team: t.id, v: 0 })}
          ${q.applied && q.applied[t.id] ? `<span class="h-delta ${q.applied[t.id] < 0 ? 'neg' : ''}">${q.applied[t.id] > 0 ? '+' : ''}${q.applied[t.id]}</span>` : ''}</div>`;
      }).join('')}</div>`;
    }

    /* The host's own call: mark any team right/wrong (or clear it) on this clue; points move immediately. */
    function rulings(s) {
      const q = s.q;
      if (!['standard', 'lightning', 'dd'].includes(q.kind) || q.stage === 'wager') return '';
      const teams = q.kind === 'dd' ? s.teams.filter(t => t.id === q.ddTeam) : s.teams;
      if (!teams.length) return '';
      return `<details class="h-rulings" ${Object.keys(q.judged).length ? 'open' : ''}><summary>Host rulings — award or take away points for any team on this clue</summary>
        <div class="h-table">${teams.map(t => {
          const j = q.judged[t.id], d = q.applied[t.id] || 0;
          return `<div class="h-tr"><span class="sw" style="background:${t.color}"></span><b>${esc(t.name)}</b>
            <span class="h-delta ${d < 0 ? 'neg' : ''}">${d ? (d > 0 ? '+' : '') + d : '—'}</span>
            ${btn('rule', '✓ Right', 'sm go ' + (j === true ? 'on' : ''), { team: t.id, v: 1 })}${btn('rule', '✗ Wrong', 'sm no ' + (j === false ? 'on' : ''), { team: t.id, v: 0 })}${btn('rule', '⟲ Clear', 'sm', { team: t.id, v: 'x' })}</div>`;
        }).join('')}</div></details>`;
    }

    function footer(s) {
      const q = s.q, row = [];
      const scored = q.applied && Object.values(q.applied).some(Boolean);
      if (['standard', 'dd', 'mc'].includes(q.kind)) {
        if (!scored) row.push(btn('cancelClue', '↩ Put back on board', 'sm'));
        row.push(btn('closeClue', '🗑 Close (toss it)', 'sm'));
      }
      if (q.kind === 'bonus') row.push(btn('closeClue', '🗑 Close question', 'sm'));
      return row.length ? `<div class="row h-foot">${row.join('')}</div>` : '';
    }

    function teamsHTML(s) {
      const secs = {};
      s.teams.forEach(t => { if (t.section) secs[t.section] = (secs[t.section] || 0) + t.score; });
      return `<div class="card paper"><h2 class="hand">Teams (${s.teams.length})</h2>
        <div class="row small">Points per tap: <input class="field num" type="number" step="50" data-keep="amt" data-role="amount" value="${amount}"></div>
        ${s.teams.map(t => `<div class="h-team" style="--c:${t.color}">
          <div class="h-team-head"><span class="sw yarn"></span><b>${esc(t.name)}</b>${t.section ? `<span class="small muted">${esc(t.section)}</span>` : ''}<span class="h-score block ${t.score < 0 ? 'neg' : ''}">${t.score}</span></div>
          <div class="small h-mems">${t.members.map(m => `<span class="mem ${m.on ? 'on' : ''}">${esc(m.name)}</span>`).join(' ') || '<i>no players</i>'}</div>
          <div class="row">${btn('adj', '−', 'sm no', { team: t.id, sign: -1 })}${btn('adj', '+', 'sm go', { team: t.id, sign: 1 })}${btn('setScore', 'Set…', 'sm', { team: t.id })}
            ${btn('control', s.control === t.id ? '★ picking' : 'give pick', 'sm ' + (s.control === t.id ? 'on' : ''), { team: t.id })}${btn('kick', 'kick', 'sm', { team: t.id })}</div></div>`).join('') || '<p class="muted">No teams yet. Share the room code!</p>'}
        </div>${Object.keys(secs).length ? `<div class="card paper"><h2 class="hand">Section totals</h2>${Object.entries(secs).sort((a, b) => b[1] - a[1]).map(([n, v]) => `<div class="h-tr"><b>${esc(n)}</b><span class="h-score block">${v}</span></div>`).join('')}</div>` : ''}`;
    }

    /* ---------- actions ---------- */
    root.addEventListener('input', e => { if (e.target.dataset.role === 'amount') amount = Math.abs(parseInt(e.target.value, 10) || 0); });
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const a = b.dataset.act, team = b.dataset.team;
      switch (a) {
        case 'create': return createRoom();
        case 'saveSettings': return readSettings();
        case 'push': return pushGame();
        case 'reset': if (confirm('Start a new game? Scores reset and every clue goes back on the board.')) emit('host:resetGame'); return;
        case 'closeRoom':
          if (!confirm('Close this room? Everyone will be disconnected.')) return;
          return emit('host:closeRoom').then(() => { del('asa-host'); S = null; showSignin(); });
        case 'lobby': return emit('host:lobby');
        case 'round':
          if (S && S.q && !confirm('A clue is still open. Switch rounds anyway?')) return;
          return emit('host:startRound', { index: +b.dataset.i });
        case 'endGame': if (S && S.phase !== 'final' && !confirm('End the game and show final scores?')) return; return emit('host:endGame');
        case 'open': case 'reveal': case 'lock': case 'lightningStart': case 'lightningNext': case 'lightningStop':
        case 'bonusNext': case 'showClue': case 'finalAnswer': case 'cancelClue': case 'closeClue':
          return emit('host:' + a);
        case 'judge': return emit('host:judge', { correct: b.dataset.correct === '1' });
        case 'rule': return emit('host:override', b.dataset.v === 'x' ? { teamId: team, clear: true } : { teamId: team, correct: b.dataset.v === '1' });
        case 'ddTeam': return emit('host:setDDTeam', { teamId: team });
        case 'setWager': {
          const inp = root.querySelector(`[data-keep="w-${team}"]`);
          if (!inp || inp.value === '') return toast('Type a wager first.');
          return emit('host:setWager', { teamId: team, amount: +inp.value });
        }
        case 'finalReveal': return emit('host:finalReveal', { teamId: team });
        case 'adj': return emit('host:adjust', { teamId: team, delta: (+b.dataset.sign) * amount });
        case 'setScore': {
          const t = Tm(team), v = prompt(`New score for ${t.name}:`, t.score);
          if (v != null && v.trim() !== '' && Number.isFinite(+v)) emit('host:setScore', { teamId: team, score: +v });
          return;
        }
        case 'control': return emit('host:setControl', { teamId: S && S.control === team ? null : team });
        case 'kick': if (confirm(`Remove ${Tm(team).name} from the game?`)) emit('host:kickTeam', { teamId: team }); return;
      }
    });

    setTab('live');
    return { emit, get state() { return S; } };
  };
})();
