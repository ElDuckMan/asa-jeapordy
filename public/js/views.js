/* ASA Jeopardy — shared view pieces: board grid, scoreboard with buzzer lights, clue sheet. */
(function () {
  'use strict';
  const { esc, torn, mulberry, CAT, render } = Craft;
  const KIND = { standard: '', dd: 'Daily Double', mc: 'Multiple Choice', lightning: 'Lightning', bonus: 'Bonus', final: 'Final Round' };

  /* ---------- board grid ---------- */
  function boardGrid(el, round, o = {}) {
    const cats = round.categories || [];
    const rows = Math.max(0, ...cats.map(c => c.clues.length));
    el.style.setProperty('--cols', Math.max(1, cats.length));
    el.style.setProperty('--rows', Math.max(1, rows));
    const intro = o.introKey && el._introKey !== o.introKey;
    let h = '';
    cats.forEach((cat, c) => {
      h += `<div class="cat yarn block stroke" style="--c:var(${CAT[c % CAT.length]});--d:${(c * 0.06).toFixed(2)}s">${esc(cat.name)}</div>`;
    });
    for (let j = 0; j < rows; j++) {
      cats.forEach((cat, c) => {
        const cl = cat.clues[j];
        if (!cl) { h += '<div></div>'; return; }
        const r = mulberry(c * 131 + j * 17 + 7);
        const active = o.active && o.active.c === c && o.active.j === j;
        let badge = '';
        if (o.host) badge = cl.type === 'dd' ? 'DD' : cl.type === 'mc' ? 'MC' : cl.timer ? `${cl.timer}s` : cl.media ? 'IMG' : '';
        h += `<div class="tile-wrap" style="--r:${(r() * 3 - 1.5).toFixed(2)}deg;--d:${(0.2 + (j * cats.length + c) * 0.035).toFixed(2)}s">
          <button class="tile ${o.onPick ? 'pick' : ''} ${cl.used ? 'used' : ''} ${active ? 'active' : ''}" data-c="${c}" data-j="${j}"
            style="--clip:${torn(c * 97 + j * 13 + 3, 8, 3)};--bp:${Math.floor(r() * 260)}px ${Math.floor(r() * 260)}px"
            ${cl.used || !o.onPick ? 'disabled' : ''} aria-label="${esc(cat.name)} for ${cl.value}"${o.host && cl.q ? ` title="${esc(cl.q)}"` : ''}>
            <span class="val block stroke crayon" style="--c:var(${CAT[c % CAT.length]})">${cl.value}</span>${badge ? `<span class="badge">${badge}</span>` : ''}
          </button></div>`;
      });
    }
    el.innerHTML = h;
    if (intro) {
      el._introKey = o.introKey;
      el.classList.add('intro');
      clearTimeout(el._introT);
      el._introT = setTimeout(() => el.classList.remove('intro'), 2200);
    }
    el.onclick = o.onPick ? e => {
      const b = e.target.closest('.tile');
      if (b && !b.disabled) o.onPick(+b.dataset.c, +b.dataset.j, b);
    } : null;
  }
  const tileEl = (grid, c, j) => grid && grid.querySelector(`.tile[data-c="${c}"][data-j="${j}"]`);

  /* ---------- buzzer light state for a team ---------- */
  function bulbState(t, q) {
    if (!q) return '';
    if (q.buzzedTeam === t.id) return 'lit';
    if (q.kind === 'dd' && q.ddTeam === t.id && q.stage !== 'revealed') return 'lit';
    if (q.judged && q.judged[t.id] !== undefined && (q.revealed || q.kind === 'final' || q.kind === 'standard' || q.kind === 'lightning')) return q.judged[t.id] ? 'ok' : 'bad';
    if (q.lockedOut && q.lockedOut.includes(t.id)) return 'out';
    if (q.stage === 'wager' && q.wageredTeams.includes(t.id)) return 'in';
    if (['mc', 'bonus', 'final'].includes(q.kind) && q.answeredTeams.includes(t.id)) return 'in';
    return '';
  }

  /* ---------- scoreboard (keyed, so animations survive updates) ---------- */
  class Scoreboard {
    constructor(el, o = {}) { this.el = el; this.o = o; this.nodes = new Map(); this.prev = {}; }
    node(id) { return this.nodes.get(id); }
    update(teams, q, control) {
      const seen = new Set();
      teams.forEach((t, i) => {
        seen.add(t.id);
        let n = this.nodes.get(t.id);
        if (!n) {
          n = document.createElement('div');
          n.className = 'team yarn enter';
          n.innerHTML = '<span class="bulb"></span><div class="tname block stroke"></div><div class="tsec"></div><div class="tscore paper block"></div><div class="tmembers"></div>';
          this.el.appendChild(n); this.nodes.set(t.id, n);
          n.querySelector('.tscore').textContent = t.score;
          this.prev[t.id] = t.score;
          setTimeout(() => n.classList.remove('enter'), 800);
          if (this.o.onClick) n.addEventListener('click', () => this.o.onClick(t.id));
        }
        n.style.setProperty('--c', t.color);
        n.style.order = i;
        n.querySelector('.tname').textContent = t.name;
        n.querySelector('.tsec').textContent = t.section || '';
        const on = t.members.filter(m => m.on).map(m => m.name);
        n.querySelector('.tmembers').textContent = this.o.members === false ? '' : on.join(', ');
        const b = bulbState(t, q), bulb = n.querySelector('.bulb');
        if (bulb.dataset.s !== b) { bulb.className = 'bulb ' + b; bulb.dataset.s = b; }
        n.classList.toggle('buzzed', b === 'lit');
        n.classList.toggle('control', control === t.id && !q);
        const old = this.prev[t.id];
        if (old !== t.score) {
          const sc = n.querySelector('.tscore');
          if (this.o.fx !== false) FX.scoreChange(n, sc, old, t.score); else { sc.textContent = t.score; sc.classList.toggle('neg', t.score < 0); }
          this.prev[t.id] = t.score;
        }
      });
      for (const [id, n] of this.nodes) if (!seen.has(id)) { n.remove(); this.nodes.delete(id); delete this.prev[id]; }
    }
  }

  /* ---------- clue card content (audience view) ---------- */
  function qCard(s, fresh = {}) {
    const q = s.q, T = id => s.teams.find(t => t.id === id) || { name: '?', color: '#888' };
    const kl = KIND[q.kind];
    let h = `<div class="q-head block stroke">${esc(q.category || '')}${q.value && !['final', 'dd'].includes(q.kind) ? ` · ${q.value}` : ''}</div>`;
    if (kl && q.kind !== 'dd') h += `<div class="kind-tag tape">${kl}</div>`;
    if (q.kind === 'dd' && q.stage === 'wager') {
      return h + `<div class="dd-splash block stroke crayon ${fresh.stageNew ? 'spin-in' : ''}">DAILY<br>DOUBLE!</div>
        <div class="status">${q.ddTeam ? `<b>${esc(T(q.ddTeam).name)}</b> is placing a wager…` : 'The host is choosing a team…'}</div>`;
    }
    if (q.kind === 'final' && q.stage === 'wager') {
      return h + `<div class="q-text">Category: <b>${esc(q.category)}</b></div>
        <div class="status">Teams are wagering… ${q.wageredTeams.length}/${s.teams.length} locked in</div>`;
    }
    if (q.kind === 'dd') h += `<div class="kind-tag tape">Daily Double</div>`;
    if (q.text) h += `<div class="q-text">${esc(q.text)}</div>`;
    if (q.hint && q.hintShown) h += `<div><span class="hint-note tape ${fresh.hintNew ? 'pop' : ''}">💡 ${esc(q.hint)}</span></div>`;
    if (q.media) h += `<div class="q-media media-slot" data-type="${esc(q.media.type)}" data-url="${esc(q.media.url)}"></div>`;
    if (q.options && q.options.length) {
      h += '<div class="opts">' + q.options.map((o, i) => {
        const right = q.revealed && q.correct === i, dim = q.revealed && q.correct !== i;
        const pickers = q.revealed ? s.teams.filter(t => q.answers[t.id] && q.answers[t.id].choice === i) : [];
        return `<div class="opt paper ${right ? 'right' : ''} ${dim ? 'dim' : ''}"><span class="ltr block">${'ABCDEF'[i]}</span><span>${esc(o)}</span>
          <span class="dots">${pickers.map(t => `<i class="dot" style="--c:${t.color}" title="${esc(t.name)}"></i>`).join('')}</span></div>`;
      }).join('') + '</div>';
    }
    if (q.timerEnd) h += `<div class="timerbar" data-end="${q.timerEnd}" data-total="${(q.timerSec || 1) * 1000}"><i></i></div>`;
    else if (q.timerRemain != null && q.timerSec && q.stage === 'buzzed') h += `<div class="timerbar paused" style="--p:${(q.timerRemain / (q.timerSec * 1000)).toFixed(3)}"><i></i></div>`;
    const bt = q.buzzedTeam || (q.kind === 'dd' && q.stage === 'answering' ? q.ddTeam : null);
    if (bt && !q.revealed) {
      const t = T(bt);
      h += `<div><span class="buzz-banner yarn block stroke ${fresh.bannerNew ? 'slam' : ''}" style="--c:${t.color}">${esc(t.name)}${q.buzzedPlayer ? ` <small>(${esc(q.buzzedPlayer)})</small>` : ''}${q.kind === 'dd' ? ` <small>· wager ${q.wagers[bt] ?? 0}</small>` : ''}</span></div>`;
    }
    const answerKind = ['mc', 'bonus', 'final'].includes(q.kind);
    let st = '';
    if (q.stage === 'reading') st = answerKind ? 'Get ready to answer on your phones…' : 'Get ready…';
    else if (q.stage === 'open') st = answerKind ? `Answer on your phones! ${q.answeredTeams.length}/${s.teams.length} in` : 'Buzzers are open!';
    else if (q.stage === 'locked') st = 'Answers are locked';
    else if (q.stage === 'timeup') st = "Time's up!";
    else if (q.stage === 'answering') st = 'Answer out loud!';
    if (st) h += `<div class="status">${st}</div>`;
    if (q.revealed && q.answer) h += `<div><span class="answer block ${fresh.answerNew ? 'stamp' : ''}">${esc(q.answer)}</span></div>`;
    if (q.kind === 'bonus' && q.revealed) {
      h += '<div class="chips">' + s.teams.map(t => {
        const a = q.answers[t.id], j = q.judged[t.id];
        return `<span class="chip yarn" style="--c:${t.color}"><b>${esc(t.name)}</b>${a && a.text ? ` “${esc(a.text)}”` : a ? '' : ' —'}<span class="mark">${j === true ? '✓' : j === false ? '✗' : ''}</span></span>`;
      }).join('') + '</div>';
    }
    if (q.kind === 'final') {
      const shown = s.teams.filter(t => q.revealedTeams[t.id]);
      if (shown.length) {
        h += '<div class="reveal-list">' + shown.map(t => {
          const a = q.answers[t.id], j = q.judged[t.id];
          return `<div class="reveal-row yarn" style="--c:${t.color}"><b class="block stroke">${esc(t.name)}</b><span class="ans">${esc(a && a.text ? a.text : '(no answer)')}</span>
            <span class="w">${j === undefined ? '' : (q.wagers[t.id] ? (j ? '+' : '−') + q.wagers[t.id] : '0')}</span><span class="block">${j === true ? '✓' : j === false ? '✗' : ''}</span></div>`;
        }).join('') + '</div>';
      }
    }
    return h;
  }

  /* ---------- clue sheet: opens out of a tile, crumples into the bin on close ---------- */
  class ClueSheet {
    constructor(container, o = {}) {
      this.o = o;
      this.ov = document.createElement('div');
      this.ov.className = 'overlay' + (o.local ? ' local' : '');
      this.ov.innerHTML = '<div class="sheet-wrap"><div class="tape l"></div><div class="tape r"></div><div class="sheet"><div class="crease"></div><div class="body"></div></div></div>';
      container.appendChild(this.ov);
      this.wrap = this.ov.firstChild;
      this.sheet = this.wrap.querySelector('.sheet');
      this.body = this.wrap.querySelector('.body');
      this.isOpen = false; this.prev = null; this.sig = ''; this.busy = Promise.resolve();
    }
    show(s, fromEl) {
      const q = s.q, p = this.prev;
      const fresh = {
        answerNew: q.revealed && !(p && p.revealed),
        bannerNew: (q.buzzedTeam && (!p || p.buzzedTeam !== q.buzzedTeam)) || (q.kind === 'dd' && q.stage === 'answering' && (!p || p.stage !== 'answering')),
        stageNew: !p || p.stage !== q.stage,
        hintNew: q.hintShown && !(p && p.hintShown)
      };
      const sig = JSON.stringify([q, s.teams.map(t => [t.id, t.name, t.color])]);
      if (sig !== this.sig) { render(this.body, qCard(s, fresh)); this.sig = sig; }
      if (!this.isOpen) {
        this.isOpen = true;
        this.sheet.style.visibility = '';
        this.sheet.style.setProperty('--clip', torn(null, 14, 1.4));
        this.ov.classList.add('open');
        FX.flipIn(this.wrap, fromEl);
      } else if (p && p.text !== q.text && q.kind === 'lightning') {
        FX.restart(this.wrap, 'jiggle', 520);
      }
      this.prev = JSON.parse(JSON.stringify(q));
    }
    hide() {
      if (!this.isOpen) return;
      this.isOpen = false; this.prev = null; this.sig = '';
      FX.crumpleToss(this.sheet, { keepHidden: true, onCrumpled: () => this.ov.classList.remove('open') });
    }
    center() { return FX.centerOf(this.sheet); }
  }

  window.Views = { boardGrid, tileEl, bulbState, Scoreboard, qCard, ClueSheet, KIND };
})();
