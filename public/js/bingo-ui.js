/* ASA Jeopardy — Category Bingo screens (big screen caller, host phone, player card). Used by party-ui.js. */
(function () {
  'use strict';
  const { esc } = Craft;
  const OPT = ['var(--red)', 'var(--blue)', 'var(--mustard)', 'var(--green)'];
  const SHAPE = ['▲', '◆', '●', '■'];
  const timer = p => p.timerEnd ? `<div class="timerbar" data-end="${p.timerEnd}" data-total="${(p.timerSec || 1) * 1000}"><i></i></div>` : '';
  const catTag = (p, i, big) => { const c = p.cats[i] || {}; return `<span class="bg-cat ${big ? 'big' : ''} yarn block stroke" style="--c:var(${['--red', '--blue', '--teal', '--purple', '--green', '--rust', '--mustard'][i % 7]})">${esc(c.icon || '')} ${esc(big ? c.name : c.short)}</span>`; };

  /* 5×5 diagram of the round's pattern (any line: a sample row, column and diagonal). */
  function patternMini(p) {
    const on = new Set(p.pattern === 'line' ? [10, 11, 12, 13, 14] : p.patternCells);
    return `<div class="bg-pat" aria-label="${esc(p.patternName)}">${Array.from({ length: 25 }, (_, i) => `<i class="${on.has(i) ? 'on' : ''} ${i === 12 ? 'free' : ''}"></i>`).join('')}</div>`;
  }
  const side = p => `<aside class="bg-side card paper"><div class="small muted">Round ${p.round + 1} of ${p.rounds}</div><b>${esc(p.patternName)}</b>${patternMini(p)}
    ${p.pattern === 'line' ? '<div class="small muted">any row, column or diagonal</div>' : ''}
    ${p.history.length ? `<div class="small muted" style="margin-top:8px">Drawn so far</div><div class="bg-hist">${p.history.slice().reverse().map(i => catTag(p, i)).join('')}</div>` : ''}</aside>`;

  /* ============================== BIG SCREEN ============================== */
  let lastKey = '';
  function board(el, S) {
    const p = S.party, key = JSON.stringify(p);
    if (key === lastKey && el.querySelector('.bg-wrap')) return;
    lastKey = key;
    let main = '';
    if (p.stage === 'intro') {
      main = `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">Category Bingo</div>
        <ol class="bg-how"><li>Everyone has their own card on their phone.</li><li>We draw a category and EVERYONE answers the question.</li><li>Right answer? Mark a square of that category. Get the pattern to win!</li></ol>
        <p class="small">🔥 <b>Double down</b> before the reveal: right = 2 squares, wrong = lose one.</p>
        <p><b>${p.players}</b> cards dealt · Rounds: ${p.rounds === 3 ? 'any line → four corners → the X' : p.rounds}</p></div>`;
    } else if (p.stage === 'done') {
      main = `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">That's bingo!</div><p>Thanks for playing Category Bingo.</p></div>`;
    } else if (p.stage === 'ready') {
      main = `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">Round ${p.round + 1}</div><p class="bg-patname">${esc(p.patternName)}</p>${patternMini(p)}<p class="small muted">Cards are cleared. Same cards, new pattern.</p></div>`;
    } else if (p.stage === 'won') {
      main = `<div class="card paper pt-intro pop bg-won"><div class="pt-big block stroke crayon">BINGO!</div>
        <div class="chips">${p.winners.map(w => `<span class="chip yarn pop" style="--c:${w.color}"><b>${esc(w.name)}</b> ${esc(w.team)} +${p.points}</span>`).join('')}</div>
        ${p.round + 1 < p.rounds ? '<p class="small muted">Next round coming up…</p>' : ''}</div>`;
    } else {
      const rev = p.stage === 'reveal';
      main = `<div class="bg-drawn">${catTag(p, p.cat, true)}${p.hard ? '<span class="bg-hard tape">🌶 Hard question</span>' : ''}</div>
        <div class="card paper pt-q">${esc(p.q || '')}</div>${rev ? '' : timer(p)}
        <div class="pt-opts">${(p.options || []).map((o, i) => `<div class="pt-opt yarn ${rev ? (i === p.correct ? 'right' : 'dim') : ''}" style="--c:${OPT[i]}"><span class="sh">${SHAPE[i]}</span><span class="tx">${esc(o)}</span></div>`).join('')}</div>`;
      if (!rev) main += `<div class="status">${p.answered}/${p.players} answered</div>`;
      else {
        const r = p.results || {};
        main += `<div class="status"><b>${r.right || 0}</b> got it right: mark a ${esc((p.cats[p.cat] || {}).short || '')} square!${r.lost ? ` · ${r.lost} doubled down and lost a square 😬` : ''}</div>`;
        if (p.near) main += `<div class="bg-near block stroke pop">🔥 ${p.near} ${p.near === 1 ? 'player needs' : 'players need'} one more!</div>`;
      }
    }
    el.innerHTML = `<div class="pt-wrap bg-wrap"><div class="bg-grid"><div class="bg-main">${main}</div>${p.stage === 'intro' || p.stage === 'done' ? '' : side(p)}</div></div>`;
  }

  /* ============================== HOST PHONE ============================== */
  function host(S, x) {
    const { btn } = x, p = S.party;
    let h = `<h2 class="hand">🎱 Category Bingo${p.label ? ` <span class="small muted">${esc(p.label)}</span>` : ''}</h2>
      <div class="small muted">Round ${p.round + 1}/${p.rounds}: <b>${esc(p.patternName)}</b> · ${p.players} cards${p.timerEnd ? ` · <span class="h-clock block" data-end="${p.timerEnd}"></span>` : ''}</div>`;
    if (p.stage === 'intro') h += `<p>Everyone gets a card on their phone. Each draw, the whole room answers; right answers mark squares.</p><div class="row center">${btn('party', '🎲 Start: draw the first category', 'big hi', { a: 'draw' })}</div>`;
    if (p.stage === 'ready') h += `<div class="row center">${btn('party', '🎲 Draw a category', 'big hi', { a: 'draw' })}</div>`;
    if (p.stage === 'question' || p.stage === 'reveal') {
      h += `<div class="row">${catTag(p, p.cat)}${p.hard ? '<span class="small">🌶 hard</span>' : ''}</div><div class="h-qtext">${esc(p.q)}</div><div class="h-answer">Answer: <b>${esc(p.options[p.correct])}</b></div>`;
      if (p.stage === 'question') h += `<p>${p.answered}/${p.players} answered</p><div class="row center">${btn('party', '👁 Reveal now', 'hi', { a: 'reveal' })}</div>`;
      else {
        const r = p.results || {};
        h += `<p>✓ ${r.right || 0} right · ✗ ${r.wrong || 0} wrong · ${r.none || 0} no answer${r.lost ? ` · ${r.lost} lost a square` : ''}</p>`;
        if (p.nearNames && p.nearNames.length) h += `<p class="small">🔥 One away: ${p.nearNames.map(esc).join(', ')} <span class="muted">(next question is hard)</span></p>`;
        h += `<div class="row center">${btn('party', '🎲 Draw next category', 'big hi', { a: 'draw' })}</div>`;
      }
    }
    if (p.stage === 'won') h += `<p><b>BINGO:</b> ${p.winners.map(w => `${esc(w.name)} <span class="muted">(${esc(w.team)})</span>`).join(', ')} · +${p.points} each</p>
      <div class="row center">${p.round + 1 < p.rounds ? btn('party', '▶ Next round', 'big hi', { a: 'nextRound' }) : btn('party', '🏁 Finish', 'big hi', { a: 'nextRound' })}</div>`;
    if (p.stage === 'done') h += `<p>All rounds played.</p><div class="row center">${btn('endRound', 'Back to lobby', 'big')}</div>`;
    else h += `<div class="row center" style="margin-top:10px">${btn('party', '⏹ End bingo', 'sm no', { a: 'end' })}</div>`;
    return `<div class="card paper">${h}</div>`;
  }

  /* ============================== PLAYER PHONE ============================== */
  const UI = { dbl: false, turn: -1 };
  function play(S, me, pme) {
    const p = S.party, b = (pme && pme.bingo) || null;
    if (p.turn !== UI.turn) { UI.turn = p.turn; UI.dbl = false; }
    if (!b) return '<div class="card paper p-msg">Dealing your card…</div>';
    const X = o => esc(JSON.stringify(o));
    const pick = new Set(b.pending ? b.pending.cells : []);
    const cardHTML = `<div class="bg-card ${b.missing === 1 && !b.won ? 'glow' : ''} ${b.won ? 'won' : ''}">${b.layout.map((ci, i) => {
      if (ci === -1) return '<div class="bg-sq free"><span>★</span><small>FREE</small></div>';
      const c = p.cats[ci] || {}, cls = `bg-sq ${b.marked[i] ? 'marked' : ''} ${pick.has(i) ? 'pick' : ''}`;
      const inner = `<span>${esc(c.icon || '')}</span><small>${esc(c.short || '')}</small>`;
      return pick.has(i) ? `<button type="button" class="${cls}" data-pa="bx" data-x="${X({ action: 'mark', cell: i })}">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
    }).join('')}</div>`;
    const status = b.won ? '<b>BINGO! 🎉</b>' : b.missing === 1 ? '🔥 <b>One more square!</b>' : `${b.missing} squares to go`;
    let top = `<div class="card paper bg-status"><span>Round ${p.round + 1}: <b>${esc(p.patternName)}</b></span><span>${status}</span></div>`;
    if (p.stage === 'intro' || p.stage === 'ready') top += '<div class="card paper p-msg">This is your card. Get ready for the first category!</div>';
    if (p.stage === 'question') {
      top += `<div class="p-clue card paper"><div>${catTag(p, p.cat)}${p.hard ? ' <span class="small">🌶 hard</span>' : ''}</div><div class="p-qtext">${esc(p.q)}</div>${timer(p)}</div>`;
      if (b.ans) top += `<div class="p-hint">Locked in <b>${SHAPE[b.ans.choice]} ${esc(p.options[b.ans.choice])}</b>${b.ans.dbl ? ' · 🔥 doubled down' : ''}</div>`;
      else top += `<button type="button" class="btn bg-dbl ${UI.dbl ? 'on' : ''}" data-pa="bgdbl">🔥 Double down ${UI.dbl ? 'ON: right = 2 squares, wrong = lose 1' : '(off)'}</button>
        <div class="pt-popts bg-opts">${p.options.map((o, i) => `<button type="button" class="pt-popt yarn" style="--c:${OPT[i]}" data-pa="bganswer" data-choice="${i}"><span class="sh">${SHAPE[i]}</span>${esc(o)}</button>`).join('')}</div>`;
    }
    if (p.stage === 'reveal') {
      const r = b.result, cat = (p.cats[p.cat] || {}).short || '';
      if (b.pending) top += `<div class="p-verdict ok block stroke pop">Correct!</div><div class="p-hint">Tap a glowing <b>${esc(cat)}</b> square to mark it${b.pending.n > 1 ? ` (${b.pending.n} to mark)` : ''}.</div>`;
      else if (r && r.ok) top += `<div class="p-verdict ok block stroke pop">Correct! Marked ✓</div>`;
      else if (r) top += `<div class="p-verdict bad block stroke pop">Not this time</div><div class="p-answer">Answer: <b>${esc(p.options[p.correct])}</b>${r.lost != null ? '<br>🔥 Double down cost you a square.' : ''}</div>`;
      else top += `<div class="p-answer">Answer: <b>${esc(p.options[p.correct])}</b></div>`;
    }
    if (p.stage === 'won') top += `<div class="p-verdict ${b.won ? 'ok' : ''} block stroke pop">${b.won ? 'BINGO! 🎉' : `${esc(p.winners.map(w => w.name).join(', '))} got bingo!`}</div>`;
    if (p.stage === 'done') top += '<div class="card paper p-msg">Game over! Eyes on the big screen.</div>';
    return top + cardHTML;
  }

  window.BingoUI = { board, host, play, UI };
})();
