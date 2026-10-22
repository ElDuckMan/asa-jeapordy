/* ASA Jeopardy — team phone view. mountPlay(root, net, { code, local, autoJoin:{name,newTeam,section} }) */
(function () {
  'use strict';
  const { esc, render, toast } = Craft;

  window.mountPlay = function (root, net, o = {}) {
    const store = o.local ? null : window.localStorage;
    const get = (k, d) => { try { const v = store && store.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } };
    const put = (k, v) => { try { if (store) store.setItem(k, JSON.stringify(v)); } catch (_) { /* */ } };
    const del = k => { try { if (store) store.removeItem(k); } catch (_) { /* */ } };

    let S = null, me = null, code = (o.code || '').toUpperCase(), info = null, lastSeq = -1, openAt = 0, earlyUntil = 0, prevScore = null, wake = null;
    root.classList.add('v-play');
    root.innerHTML = `<div class="p-join"></div><div class="p-game" hidden>
      <div class="p-top yarn"><div class="p-team block stroke"></div><div class="p-sub small"></div><div class="p-score paper block">0</div></div>
      <div class="p-main"></div><div class="row center p-foot"><button class="btn sm p-leave" type="button">Leave game</button></div></div>`;
    const $ = s => root.querySelector(s);

    /* ---------- join ---------- */
    function showJoin(err) {
      if (o.onLeave) o.onLeave();
      $('.p-game').hidden = true; $('.p-join').hidden = false;
      const teams = info && info.teams || [], secs = info && info.sections || [];
      render($('.p-join'), `<div class="card paper p-joincard pop"><h2 class="hand">Join the game</h2>
        <label class="lbl">Room code</label><input class="field p-code" maxlength="4" autocapitalize="characters" autocomplete="off" data-keep="code" value="${esc(code)}" placeholder="ABCD">
        <label class="lbl">Your name</label><input class="field p-name" maxlength="24" data-keep="name" placeholder="First name">
        ${info ? `<label class="lbl">Join a team</label><div class="p-teams">${teams.map(t => `<button class="chip yarn p-pick" type="button" data-team="${t.id}" style="--c:${t.color}"><b>${esc(t.name)}</b>${t.section ? ` <span class="small">${esc(t.section)}</span>` : ''}</button>`).join('') || '<span class="muted small">No teams yet — start one!</span>'}</div>
          <label class="lbl">…or start a new team</label><input class="field p-newteam" maxlength="24" data-keep="newteam" placeholder="Team name">
          ${secs.length ? `<label class="lbl">Section</label><select class="field p-sec" data-keep="sec"><option value="">Choose…</option>${secs.map(s => `<option>${esc(s)}</option>`).join('')}</select>` : ''}` : ''}
        <div class="err">${esc(err || '')}</div>
        <button class="btn big hi p-go" type="button">${info ? 'Join!' : 'Next'}</button></div>`);
    }
    function lookup() {
      code = ($('.p-code') ? $('.p-code').value : code).trim().toUpperCase();
      if (code.length < 4) return showJoin('Enter the 4-letter room code.');
      net.emit('room:info', { code }).then(r => { if (r.error) { info = null; showJoin(r.error); } else { info = r; showJoin(); } });
    }
    function join(teamId) {
      const name = $('.p-name') ? $('.p-name').value.trim() : '';
      const newTeam = $('.p-newteam') ? $('.p-newteam').value.trim() : '';
      const section = $('.p-sec') ? $('.p-sec').value : '';
      if (!name) return showJoin('Enter your name.');
      if (!teamId && !newTeam) return showJoin('Tap a team or type a new team name.');
      doJoin({ code, name, teamId: teamId || null, newTeam, section, playerId: get('asa-player', {}).playerId });
    }
    function doJoin(d) {
      return net.emit('player:join', d).then(r => {
        if (r.error) { if (!d.name) { del('asa-player'); lookup(); } else showJoin(r.error); return; }
        me = { playerId: r.playerId, teamId: r.teamId, code: r.code };
        if (o.onJoin) o.onJoin();
        put('asa-player', { code: r.code, playerId: r.playerId });
        $('.p-join').hidden = true; $('.p-game').hidden = false;
        if (!o.local && history.replaceState) history.replaceState(null, '', `?room=${r.code}`);
        try { if (navigator.wakeLock && !wake) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); } catch (_) { /* */ }
      });
    }
    root.addEventListener('click', e => {
      if (e.target.closest('.p-go')) { if (!info) lookup(); else join(null); }
      const pk = e.target.closest('.p-pick');
      if (pk) join(pk.dataset.team);
      if (e.target.closest('.p-leave') && confirm('Leave the game on this phone?')) {
        net.emit('player:leave'); del('asa-player'); me = null; S = null; info = null; showJoin();
      }
    });
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.p-code')) lookup(); });

    net.onConnect(() => {
      const saved = get('asa-player', null);
      if (o.autoJoin) return doJoin(Object.assign({ code }, o.autoJoin));
      if (saved && (!code || saved.code === code)) { code = saved.code; doJoin({ code, playerId: saved.playerId }); }
      else if (code) lookup(); else showJoin();
    });
    net.on('kicked', () => { del('asa-player'); me = null; S = null; showJoin('You were removed from the game by the host.'); });
    net.on('closed', () => { del('asa-player'); me = null; S = null; info = null; showJoin('The host closed this room.'); });
    net.on('state', s => {
      Craft.sync(s.serverNow); S = s;
      if (s.q && s.q.stage === 'open' && s.q.openSeq !== lastSeq) { lastSeq = s.q.openSeq; openAt = performance.now(); }
      draw();
    });
    net.on('fx', e => {
      if (!me) return;
      const mine = e.team === me.teamId;
      const bz = $('.p-buzz') || $('.p-score');
      if (e.type === 'buzz' && mine) { if (navigator.vibrate) navigator.vibrate([80, 40, 80]); const c = FX.centerOf(bz); FX.sparkles(c.x, c.y, { count: 24, colors: [team().color, '#fff', '#ffd84d'] }); }
      if (e.type === 'correct' && mine && !e.quiet) { const c = FX.centerOf($('.p-top')); FX.confetti(c.x, c.y, { count: 40, power: 0.8 }); }
      if (e.type === 'wrong' && mine) { FX.restart($('.p-main'), 'shake', 550); if (navigator.vibrate) navigator.vibrate(300); }
      if (e.type === 'end') setTimeout(() => FX.celebrate(), 300);
    });

    /* ---------- game screen ---------- */
    const team = () => (S && me && S.teams.find(t => t.id === me.teamId)) || { name: '', color: '#888', score: 0, section: '' };
    function buzzState(q) {
      if (performance.now() < earlyUntil) return ['early', 'Too early!'];
      if (q.buzzedTeam === me.teamId) return ['mine', q.buzzedPlayer ? `${q.buzzedPlayer}, answer!` : 'You\'re in! Answer!'];
      if (q.buzzedTeam) { const t = S.teams.find(x => x.id === q.buzzedTeam); return ['other', `${t ? t.name : 'Another team'} buzzed`]; }
      if (q.lockedOut.includes(me.teamId)) return ['out', 'Locked out'];
      if (q.stage === 'open') return ['go', 'BUZZ!'];
      if (q.stage === 'reading') return ['wait', 'Wait for it…'];
      return ['done', q.revealed ? 'Answer revealed' : "Time's up"];
    }
    function verdict(q) {
      const j = q.judged && q.judged[me.teamId];
      if (j === true) return '<div class="p-verdict ok block stroke pop">Correct!</div>';
      if (j === false) return '<div class="p-verdict bad block stroke pop">Not this time</div>';
      return '';
    }
    function mainHTML() {
      const s = S, q = s.q, t = team();
      if (s.phase === 'lobby') return `<div class="card paper p-msg"><h2 class="hand">You're in!</h2><p>Waiting for the host to start. Keep this screen open — it's your buzzer.</p></div>`;
      if (s.phase === 'ended') {
        const rank = [...s.teams].sort((a, b) => b.score - a.score).findIndex(x => x.id === me.teamId) + 1;
        return `<div class="card paper p-msg"><h2 class="hand">Game over!</h2><div class="p-rank block stroke crayon">#${rank}</div><p>${esc(t.name)} finished with ${t.score} points.</p></div>`;
      }
      if (!q) {
        const r = s.round;
        if (r && r.type === 'lightning') return `<div class="card paper p-msg"><h2 class="hand">⚡ ${esc(r.name)}</h2><p>${r.done ? 'Lightning round over!' : 'Buzzers open the moment each question appears. Be fast!'}</p></div>`;
        if (r && r.type === 'bonus') return `<div class="card paper p-msg"><h2 class="hand">${esc(r.name)}</h2><p>Everyone answers on their phones. Get ready!</p></div>`;
        const picker = s.control && s.teams.find(x => x.id === s.control);
        return `<div class="card paper p-msg"><h2 class="hand">Eyes on the big screen</h2><p>${picker ? (picker.id === me.teamId ? '<b>Your team picks the next clue!</b>' : `${esc(picker.name)} picks next.`) : 'The host is picking the next clue.'}</p></div>`;
      }
      let h = `<div class="p-clue card paper"><div class="small muted">${esc(q.category || '')}${q.value && !['dd', 'final'].includes(q.kind) ? ` · ${q.value}` : ''}</div>${q.text ? `<div class="p-qtext">${esc(q.text)}</div>` : ''}${q.hint && q.hintShown ? `<div class="p-hint-note">💡 ${esc(q.hint)}</div>` : ''}
        ${q.timerEnd ? `<div class="timerbar" data-end="${q.timerEnd}" data-total="${(q.timerSec || 1) * 1000}"><i></i></div>` : ''}</div>`;
      if (q.kind === 'standard' || q.kind === 'lightning') {
        const [cls, label] = buzzState(q);
        h += `<button class="p-buzz ${cls}" type="button" style="--c:${t.color}" aria-label="Buzzer"><span class="block stroke">${esc(label)}</span></button>`;
        h += verdict(q);
        if (q.revealed && q.answer) h += `<div class="p-answer">Answer: <b>${esc(q.answer)}</b></div>`;
        return h;
      }
      if (q.kind === 'dd') {
        if (q.ddTeam !== me.teamId) return h + `<div class="card paper p-msg">${q.stage === 'wager' ? 'Daily Double! Another team is wagering.' : 'Another team is playing the Daily Double.'}</div>${q.revealed && q.answer ? `<div class="p-answer">Answer: <b>${esc(q.answer)}</b></div>` : ''}`;
        if (q.stage === 'wager') return h + wagerForm(q, 'Daily Double! How much will you risk?');
        return h + `<div class="p-buzz mine" style="--c:${t.color}"><span class="block stroke">Answer out loud!</span></div><div class="p-answer">Wager: <b>${q.wagers[me.teamId] ?? 0}</b></div>${verdict(q)}${q.revealed && q.answer ? `<div class="p-answer">Answer: <b>${esc(q.answer)}</b></div>` : ''}`;
      }
      if (q.kind === 'final' && q.stage === 'wager') return `<div class="p-clue card paper"><div class="small muted">Final round</div><div class="p-qtext">Category: <b>${esc(q.category)}</b></div></div>` + wagerForm(q, 'Final wager');
      const mine = q.answers[me.teamId];
      if (q.options && q.options.length) {
        h += `<div class="p-opts">${q.options.map((op, i) => {
          const chosen = mine && mine.choice === i, right = q.revealed && q.correct === i;
          return `<button class="p-opt paper ${chosen ? 'chosen' : ''} ${right ? 'right' : ''}" type="button" data-choice="${i}" ${q.stage !== 'open' ? 'disabled' : ''}><span class="ltr block">${'ABCDEF'[i]}</span>${esc(op)}</button>`;
        }).join('')}</div>`;
        if (q.stage === 'reading') h += '<div class="p-hint">Options unlock when the host opens answers.</div>';
        else if (mine && q.stage === 'open') h += `<div class="p-hint">Locked in <b>${'ABCDEF'[mine.choice]}</b>${mine.by ? ` by ${esc(mine.by)}` : ''} — you can still change it.</div>`;
      } else if (q.stage === 'open') {
        h += `<div class="card paper"><textarea class="field p-text" rows="2" maxlength="300" data-keep="ans-${q.openSeq}-${esc(q.category)}" placeholder="Type your team's answer"></textarea>
          <div class="row" style="margin-top:8px"><button class="btn hi p-send" type="button">Send answer</button>${mine ? `<span class="small">Sent: “${esc(mine.text)}”</span>` : ''}</div></div>`;
      } else if (mine) h += `<div class="p-hint">Your answer: <b>“${esc(mine.text)}”</b></div>`;
      if (q.stage === 'reading' && !(q.options && q.options.length)) h += '<div class="p-hint">Get ready to type…</div>';
      if (q.stage === 'locked') h += '<div class="p-hint">Answers are locked. Fingers crossed!</div>';
      if (q.kind === 'final' && q.revealedTeams && q.revealedTeams[me.teamId]) h += verdict(q); else if (q.revealed) h += verdict(q);
      if (q.revealed && q.answer) h += `<div class="p-answer">Answer: <b>${esc(q.answer)}</b></div>`;
      return h;
    }
    function wagerForm(q, label) {
      const w = q.wagers[me.teamId];
      return `<div class="card paper p-wager"><h2 class="hand">${esc(label)}</h2><p>You can wager 0 – ${q.maxWager}.</p>
        <div class="row"><input class="field num p-wamt" type="number" min="0" max="${q.maxWager}" inputmode="numeric" data-keep="wager" placeholder="0">
        <button class="btn hi p-wsend" type="button">${w != null ? 'Change' : 'Lock in'}</button></div>
        <div class="row" style="margin-top:8px"><button class="btn sm p-wq" type="button" data-w="0">0</button><button class="btn sm p-wq" type="button" data-w="${Math.floor(q.maxWager / 2)}">half</button><button class="btn sm p-wq" type="button" data-w="${q.maxWager}">all in</button></div>
        ${w != null ? `<p>Locked in: <b class="block">${w}</b></p>` : ''}</div>`;
    }
    function draw() {
      if (!S || !me) return;
      const t = team();
      $('.p-top').style.setProperty('--c', t.color);
      $('.p-team').textContent = t.name;
      const p = S.teams.find(x => x.id === me.teamId) && S.teams.find(x => x.id === me.teamId).members.map(m => m.name).join(', ');
      $('.p-sub').textContent = [t.section, p].filter(Boolean).join(' · ');
      const sc = $('.p-score');
      if (prevScore == null) { sc.textContent = t.score; prevScore = t.score; }
      else if (prevScore !== t.score) { FX.scoreChange($('.p-top'), sc, prevScore, t.score); prevScore = t.score; }
      root.classList.toggle('glow', !!(S.q && (S.q.buzzedTeam === me.teamId || (S.q.kind === 'dd' && S.q.ddTeam === me.teamId && S.q.stage === 'answering'))));
      root.style.setProperty('--team', t.color);
      render($('.p-main'), mainHTML());
    }

    /* Buzz on pointerdown (fires ~100 ms before click on phones). */
    root.addEventListener('pointerdown', e => {
      const b = e.target.closest('.p-buzz');
      if (!b || !S || !S.q || !me) return;
      e.preventDefault();
      FX.restart(b, 'squash', 600);
      const q = S.q;
      if (!['standard', 'lightning'].includes(q.kind)) return;
      net.emit('player:buzz', { seq: q.openSeq, reaction: performance.now() - openAt }).then(r => {
        if (r.early) { earlyUntil = performance.now() + (r.ms || 250); draw(); setTimeout(draw, (r.ms || 250) + 20); if (navigator.vibrate) navigator.vibrate(150); }
      });
    });
    root.addEventListener('click', e => {
      const opt = e.target.closest('.p-opt');
      if (opt && !opt.disabled) { net.emit('player:answer', { choice: +opt.dataset.choice }).then(r => { if (r.error) toast(r.error); }); FX.restart(opt, 'squash', 600); }
      if (e.target.closest('.p-send')) {
        const v = $('.p-text') ? $('.p-text').value.trim() : '';
        if (!v) return toast('Type an answer first.');
        net.emit('player:answer', { text: v }).then(r => { if (r.error) toast(r.error); else toast('Answer sent!', 1200); });
      }
      const wq = e.target.closest('.p-wq');
      if (wq && $('.p-wamt')) $('.p-wamt').value = wq.dataset.w;
      if (e.target.closest('.p-wsend')) {
        const v = $('.p-wamt') ? $('.p-wamt').value : '';
        if (v === '') return toast('Enter a wager.');
        net.emit('player:wager', { amount: +v }).then(r => { if (r.error) toast(r.error); else toast(`Wager locked: ${r.amount}`, 1400); });
      }
    });

    showJoin();
    return { get state() { return S; } };
  };
})();
