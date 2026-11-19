/* ASA Jeopardy — Trivia Bingo screens (big screen caller, host phone, player card). Used by party-ui.js. */
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
    if (S.party.mode === 'board') return tbBoard(el, S);
    const p = S.party, key = JSON.stringify(p);
    if (key === lastKey && el.querySelector('.bg-wrap')) return;
    lastKey = key;
    let main = '';
    if (p.stage === 'intro') {
      main = `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">Trivia Bingo</div>
        <ol class="bg-how"><li>Everyone has their own card on their phone.</li><li>We draw a category and EVERYONE answers the question.</li><li>Right answer? Mark a square of that category. Get the pattern to win!</li></ol>
        <p class="small">🔥 <b>Double down</b> before the reveal: right = 2 squares, wrong = lose one.</p>
        <p><b>${p.players}</b> cards dealt · Rounds: ${p.rounds === 3 ? 'any line → four corners → the X' : p.rounds}</p></div>`;
    } else if (p.stage === 'done') {
      main = `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">That's bingo!</div><p>Thanks for playing Trivia Bingo.</p></div>`;
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
    if (S.party.stage === 'intro') return introHost(S, x);
    if (S.party.mode === 'board') return tbHost(S, x);
    const { btn } = x, p = S.party;
    let h = `<h2 class="hand">🎱 Trivia Bingo${p.label ? ` <span class="small muted">${esc(p.label)}</span>` : ''}</h2>
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
    if (S.party.mode === 'board') return tbPlay(S, me);
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

  /* ============================== MODE PICKER (host, before starting) ============================== */
  function introHost(S, x) {
    const { btn } = x, p = S.party, tb = p.mode === 'board';
    return `<div class="card paper"><h2 class="hand">🎱 Trivia Bingo${p.label ? ` <span class="small muted">${esc(p.label)}</span>` : ''}</h2>
      <div class="lbl">How do you want to play?</div>
      <div class="row">${btn('party', '🔔 Team board (buzz in)', 'sm ' + (tb ? 'on' : ''), { a: 'mode', l: 'board' })}${btn('party', '📱 Everyone\'s own card', 'sm ' + (!tb ? 'on' : ''), { a: 'mode', l: 'cards' })}</div>
      <p class="small muted">${tb ? 'One shared board on the big screen. The team in control picks a square, you read the question, everyone buzzes. Right answer claims the square. First team to connect a full row, column or diagonal wins.'
        : 'Everyone gets their own card on their phone and answers every question at once. Right answers mark squares.'}</p>
      ${tb ? `<div class="lbl">Board for ${S.teams.length} team${S.teams.length === 1 ? '' : 's'}</div>${presetBtns(p, btn)}
        <div class="row">${btn('party', p.random ? '🎲 Random categories: ON' : '🎲 Random categories: off', 'sm ' + (p.random ? 'on' : ''), { a: 'random', ok: p.random ? 0 : 1 })}</div>
        <p class="small muted">${p.random ? 'Squares are face-down: nobody knows the category until it\'s picked.' : 'Every square shows its category.'}</p>` : ''}
      <div class="row center">${btn('party', '▶ Start', 'big hi', { a: tb ? 'begin' : 'draw' })}</div></div>`;
  }

  function presetBtns(p, btn) {
    const cur = p.preset || p.autoPreset;
    return `<div class="tb-presets">${Object.entries(p.presets).map(([id, pr]) => btn('party', `<b>${esc(pr.name)}</b> <span class="small">${esc(pr.teams)}</span><br><span class="small">${pr.size}×${pr.size} · ${pr.k} in a row${pr.steal ? ' · ⚔️ steals' : ''}${id === p.autoPreset ? ' · ★ recommended' : ''}</span>`, 'sm ' + (cur === id ? 'on' : ''), { a: 'preset', l: id })).join('')}</div>
      ${(p.presets[cur] || {}).steal ? '<p class="small muted">⚔️ Steals: a team can pick another team\'s square. It\'s a hard question; the right answer takes it. If the owner answers it, the square locks 🔒.</p>' : ''}`;
  }
  const rule = p => `Connect ${p.k} in a row${p.steal ? ' · ⚔️ steals on' : ''}`;
  /* ============================== TEAM BOARD MODE ============================== */
  const sqCat = (p, c) => c.cat == null ? { icon: '❓', short: 'Mystery' } : (p.cats[c.cat] || {});
  function tbGrid(p, o = {}) {
    if (!p.board) return '';
    const B = p.board, line = new Set(B.line || []), tc = id => (p.teams.find(t => t && t.id === id) || {}).color || '#888';
    return `<div class="tb-grid ${o.small ? 'small' : ''}" style="--n:${B.N}">${B.cells.map((c, i) => {
      const k = sqCat(p, c), own = c.owner ? `style="--c:${tc(c.owner)}"` : '';
      const tag = c.owner ? `<b class="tb-tag">${esc(((p.teams.find(t => t && t.id === c.owner) || {}).name || '').replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '•')}</b>` : '';
      const canPick = !c.owner || (p.steal && !c.lock && (!o.team || c.owner !== o.team));
      const cls = `tb-sq ${c.owner ? 'own' : ''} ${i === p.sel ? 'sel' : ''} ${line.has(i) ? 'win' : ''} ${c.hard ? 'hard' : ''} ${c.lock ? 'lock' : ''}`;
      const inner = `<span class="i">${esc(k.icon || '')}</span><small>${esc(k.short || '')}</small>${c.hard ? '<em>🌶</em>' : ''}${tag}${c.lock ? '<em class="lk">🔒</em>' : ''}`;
      return o.pick && canPick ? `<button type="button" class="${cls} pickable" ${own} ${o.pick}="${i}" data-pa="${o.pa || ''}" data-act="${o.act || ''}" data-a="${o.a || ''}" data-k="${i}">${inner}</button>`
        : `<div class="${cls}" ${own}>${inner}</div>`;
    }).join('')}</div>`;
  }
  const tChip = t => t ? `<span class="chip yarn" style="--c:${t.color}"><b>${esc(t.name)}</b></span>` : '';
  function tbBoard(el, S) {
    const p = S.party, key = JSON.stringify(p);
    if (key === lastKey && el.querySelector('.tb-wrap')) return;
    lastKey = key;
    let side = '';
    if (p.stage === 'intro') {
      el.innerHTML = `<div class="pt-wrap tb-wrap"><div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">Trivia Bingo</div>
        <ol class="bg-how"><li>The team in control picks a square.</li><li>The host reads the question. Everyone buzzes in!</li><li>Right answer claims the square for your team. Wrong? Others can steal.</li></ol>
        <p><b>First team to connect ${p.k} in a row wins!</b>${p.steal ? ' ⚔️ You can steal other teams\' squares with a hard question.' : ''}${p.random ? ' 🎲 Squares are face-down until picked.' : ''}</p></div></div>`;
      return;
    }
    if (p.stage === 'done') { el.innerHTML = '<div class="pt-wrap tb-wrap"><div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">That\'s bingo!</div></div></div>'; return; }
    if (['pick', 'claimed', 'missed'].includes(p.stage)) {
      const claimMsg = !p.control ? '' : p.defended ? `🔒 ${esc(p.control.name)} defended it!` : p.stolenFrom ? `⚔️ ${esc(p.control.name)} stole it from ${esc(p.stolenFrom.name)}!` : `✓ ${esc(p.control.name)} claims it!`;
      side = `<div class="card paper tb-side"><div class="small muted">${rule(p)}</div>${p.stage === 'claimed' ? `<div class="tb-res ok block stroke pop">${claimMsg}</div>` : ''}
        ${p.stage === 'missed' ? `<div class="tb-res block stroke pop">Nobody got it!</div>${p.answer ? `<p>Answer: <b>${esc(p.answer)}</b></p>` : ''}` : ''}
        ${p.stage === 'claimed' && p.answer ? `<p>Answer: <b>${esc(p.answer)}</b></p>` : ''}
        <div class="tb-turn">${tChip(p.control)}<div class="block stroke">pick a square!</div></div></div>`;
    } else if (['reading', 'open', 'buzzed'].includes(p.stage)) {
      const c = p.cats[p.cat] || {};
      side = `<div class="card paper tb-side"><div class="bg-drawn"><span class="bg-cat big yarn block stroke" style="--c:var(--blue)">${esc(c.icon || '')} ${esc(c.name || '')}</span>${p.hard ? '<span class="bg-hard tape">🌶 Hard</span>' : ''}</div>
        ${p.challenge ? '<div class="tb-steal block stroke">⚔️ Steal attempt!</div>' : ''}<div class="tb-q">${esc(p.q)}</div>
        ${p.choices ? `<div class="tb-ch">${p.choices.map((o, i) => `<span class="paper">${'ABCD'[i]}. ${esc(o)}</span>`).join('')}</div>` : ''}
        ${p.stage === 'open' ? `${timer(p)}<div class="tb-call block stroke">BUZZ IN!</div>` : ''}
        ${p.stage === 'reading' ? '<div class="status">Listen… buzzers open soon</div>' : ''}
        ${p.stage === 'buzzed' && p.buzz ? `<div class="buzz-banner yarn block stroke slam" style="--c:${p.buzz.color}">${esc(p.buzz.name)}${p.buzz.player ? ` <small>(${esc(p.buzz.player)})</small>` : ''}</div>` : ''}
        ${p.locked.length ? `<div class="small muted">Locked out: ${p.locked.map(id => esc((p.teams.find(t => t && t.id === id) || {}).name || '')).join(', ')}</div>` : ''}</div>`;
    } else if (p.stage === 'won') {
      side = `<div class="card paper tb-side bg-won"><div class="pt-big block stroke crayon">BINGO!</div>${p.winners.map(tChip).join('')}<p>+${p.points}</p></div>`;
    } else if (p.stage === 'full') {
      side = '<div class="card paper tb-side"><div class="pt-big block stroke crayon">Board full!</div><p>No line this time. Most squares wins.</p></div>';
    }
    el.innerHTML = `<div class="pt-wrap tb-wrap"><div class="tb-layout"><div class="tb-boardbox darkpaper">${tbGrid(p)}</div>${side}</div></div>`;
  }
  function tbHost(S, x) {
    const { btn } = x, p = S.party;
    let h = `<h2 class="hand">🎱 Bingo board <span class="small muted">${p.size}×${p.size} · ${rule(p)}${p.random ? ' · 🎲 random' : ''}</span></h2>`;
    const ctl = `<div class="row small">In control: ${p.teams.map(t => btn('party', esc(t.name), 'sm ' + (p.control && p.control.id === t.id ? 'on' : ''), { a: 'control', team: t.id })).join('')}</div>`;
    if (['pick', 'claimed', 'missed'].includes(p.stage)) {
      if (p.stage === 'claimed') h += `<p>${p.defended ? '🔒' : p.stolenFrom ? '⚔️' : '✓'} <b>${esc(p.control ? p.control.name : '')}</b> ${p.defended ? 'defended (locked)' : p.stolenFrom ? `stole it from ${esc(p.stolenFrom.name)}` : 'claimed it'}. Answer: ${esc(p.answer || '')}</p>`;
      if (p.stage === 'missed') h += `<p>Nobody got it. Answer: <b>${esc(p.answer || '')}</b></p>`;
      h += `<p><b>${esc(p.control ? p.control.name : '?')}</b> picks. Tap the square they call out:</p>${tbGrid(p, { pick: 'data-sq', act: 'party', a: 'pick', small: true, team: p.control && p.control.id })}${ctl}`;
    }
    if (['reading', 'open', 'buzzed'].includes(p.stage)) {
      const c = p.cats[p.cat] || {};
      h += `<div class="row"><span class="bg-cat yarn block stroke" style="--c:var(--blue)">${esc(c.icon || '')} ${esc(c.short || '')}</span>${p.hard ? ' 🌶 hard' : ''}${p.timerEnd ? ` <span class="h-clock block" data-end="${p.timerEnd}"></span>` : ''}</div>
        <div class="h-qtext">${esc(p.q)}</div><div class="h-answer">Answer: <b>${esc(p.answer)}</b></div>
        <ol class="h-opts" type="A">${(p.choices || []).map(o => `<li>${esc(o)}</li>`).join('')}</ol>`;
      if (p.stage === 'reading') h += `<p class="small muted">Read it out loud, then open the buzzers. Early buzzes get locked out briefly.</p><div class="row center">${btn('party', '🔔 Open buzzers', 'big hi', { a: 'open' })}${btn('party', 'Show A–D on screen', 'sm', { a: 'choices' })}</div>`;
      if (p.stage === 'open') h += `<div class="h-wait">Buzzers open…${p.locked.length ? ' (some teams locked out)' : ''}</div><div class="row center">${btn('party', 'Show A–D on screen', 'sm', { a: 'choices' })}</div>`;
      if (p.stage === 'buzzed' && p.buzz) h += `<div class="h-buzzed yarn block stroke pop" style="--c:${p.buzz.color}">${esc(p.buzz.name)}${p.buzz.player ? ` <small>(${esc(p.buzz.player)})</small>` : ''}</div>
        <div class="row center">${btn('party', '✓ Correct: claim it', 'big go', { a: 'judge', ok: 1 })}${btn('party', '✗ Wrong: others steal', 'big no', { a: 'judge', ok: 0 })}</div>`;
      h += `<div class="row center">${btn('party', '⏭ Nobody: skip', 'sm', { a: 'skip' })}</div>`;
    }
    if (p.stage === 'won' || p.stage === 'full') h += `<p>${p.stage === 'won' ? `🏆 <b>${esc(p.winners.map(t => t.name).join(', '))}</b> got bingo! +${p.points}` : 'Board full, no line.'}</p>
      <div class="lbl">Next board</div>${presetBtns(p, btn)}
      <div class="row">${btn('party', p.random ? '🎲 Random: ON' : '🎲 Random: off', 'sm ' + (p.random ? 'on' : ''), { a: 'random', ok: p.random ? 0 : 1 })}</div>
      <div class="row center">${btn('party', '🔄 New board', 'big hi', { a: 'newBoard' })}${btn('party', '🏁 Finish', 'big', { a: 'end' })}</div>`;
    if (p.stage === 'done') h += `<div class="row center">${btn('endRound', 'Back to lobby', 'big')}</div>`;
    else if (!['won', 'full'].includes(p.stage)) h += `<div class="row center" style="margin-top:8px">${btn('party', '⏹ End bingo', 'sm no', { a: 'end' })}</div>`;
    return `<div class="card paper">${h}</div>`;
  }
  /* Phone: a buzzer (eyes on the big screen), plus the board when it's your team's pick. */
  const BZ = { seq: -1, openAt: 0, earlyUntil: 0 };
  function tbPlay(S, me) {
    const p = S.party, myTeam = S.teams.find(t => t.id === me.teamId) || { color: '#888' };
    if (p.openSeq !== BZ.seq && p.stage === 'open') { BZ.seq = p.openSeq; BZ.openAt = performance.now(); }
    const mine = p.control && p.control.id === me.teamId;
    if (p.stage === 'intro') return '<div class="card paper p-msg"><h2 class="hand">🎱 Trivia Bingo</h2><p>Your phone is your buzzer. Eyes on the big screen!</p></div>';
    if (p.stage === 'done') return '<div class="card paper p-msg">Game over! Eyes on the big screen.</div>';
    if (['pick', 'claimed', 'missed'].includes(p.stage)) {
      const lead = p.stage === 'claimed' ? `<div class="p-verdict ${mine ? 'ok' : ''} block stroke pop">${esc(p.control.name)} claims it!</div>` : p.stage === 'missed' ? `<div class="p-answer">Answer: <b>${esc(p.answer || '')}</b></div>` : '';
      return lead + (mine ? `<div class="card paper"><h2 class="hand">Your team picks!</h2><p class="small">Agree on a square, then tap it (or shout it to the host).</p>${tbGrid(p, { pick: 'data-sq', pa: 'tbpick', small: true, team: me.teamId })}</div>`
        : `<div class="card paper p-msg"><b>${esc(p.control ? p.control.name : '')}</b> is picking a square…</div>`);
    }
    if (p.stage === 'won' || p.stage === 'full') return `<div class="p-verdict ${p.winners.some(t => t.id === me.teamId) ? 'ok' : ''} block stroke pop">${p.stage === 'won' ? `BINGO! ${esc(p.winners.map(t => t.name).join(', '))}` : 'Board full!'}</div>`;
    let cls = 'wait', label = 'Listen…';
    if (performance.now() < BZ.earlyUntil) { cls = 'early'; label = 'Too early!'; }
    else if (p.stage === 'open') { if (p.locked.includes(me.teamId)) { cls = 'out'; label = 'Locked out'; } else { cls = 'go'; label = 'BUZZ!'; } }
    else if (p.stage === 'buzzed' && p.buzz) { cls = p.buzz.id === me.teamId ? 'mine' : 'other'; label = p.buzz.id === me.teamId ? `${p.buzz.player || 'You'}, answer out loud!` : `${p.buzz.name} buzzed`; }
    const c = p.cats[p.cat] || {};
    return `<div class="card paper center"><span class="bg-cat yarn block stroke" style="--c:var(--blue)">${esc(c.icon || '')} ${esc(c.short || '')}</span> <span class="small muted">${p.challenge ? '⚔️ Steal attempt · ' : ''}Question on the big screen</span></div>
      <button type="button" class="p-buzz ${cls}" style="--c:${myTeam.color}" data-pa="tbbuzz" aria-label="Buzzer"><span class="block stroke">${esc(label)}</span></button>`;
  }
  function onBuzzDown(net, getS) {
    return e => {
      const b = e.target.closest('[data-pa=tbbuzz]'); if (!b) return;
      e.preventDefault(); FX.restart(b, 'squash', 600);
      const S = getS(); if (!S || !S.party) return;
      net.emit('player:party', { action: 'buzz', seq: S.party.openSeq, reaction: performance.now() - BZ.openAt }).then(r => {
        if (r && r.early) { BZ.earlyUntil = performance.now() + (r.ms || 250); if (navigator.vibrate) navigator.vibrate(150); }
      });
    };
  }

  window.BingoUI = { board, host, play, UI, BZ, onBuzzDown };
})();
