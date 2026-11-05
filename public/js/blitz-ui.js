/* ASA Jeopardy — screens for the Blitz modes (Gold Quest, Racing, Tower Defense, Classic, Battle Royale). Used by party-ui.js. */
(function () {
  'use strict';
  const { esc } = Craft;
  const NAMES = { gold: '💰 Gold Quest', race: '🏁 Racing', tower: '🏰 Tower Defense', classic: '🎯 Classic', battle: '⚔️ Battle Royale' };
  const HOWTO = {
    gold: 'Answer questions on your phone. Every right answer opens a chest: gold, double, steal, or swap with another player!',
    race: 'Every right answer moves you forward. First to the finish line wins!',
    tower: 'Right answers earn coins. Buy towers to hold off the waves. Lose 3 times and your base falls!',
    classic: 'Everyone answers the same question. Faster right answers score more!',
    battle: 'Wrong answers cost a heart, and if everyone gets it right, the slowest loses one. Last one standing wins!'
  };
  const OPT = ['var(--red)', 'var(--blue)', 'var(--mustard)', 'var(--green)', 'var(--purple)', 'var(--teal)'];
  const SHAPE = ['▲', '◆', '●', '■', '★', '✚'];
  const hearts = (n, max = 3) => '❤️'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, max - n));
  const timer = p => p.timerEnd ? `<div class="timerbar" data-end="${p.timerEnd}" data-total="${(p.timerSec || 1) * 1000}"><i></i></div>` : '';
  const head = p => `<div class="pt-head"><span class="tape">${NAMES[p.type]}${p.label ? ` · ${esc(p.label)}` : ''}</span><span class="small muted">${p.teamMode ? 'Team play' : 'Every player for themselves'}</span></div>`;
  const teamStrip = p => p.teams ? `<div class="chips">${p.teams.map(t => `<span class="chip yarn" style="--c:${t.color}"><b>${esc(t.name)}</b> ${t.score}</span>`).join('')}</div>` : '';
  const feed = p => p.feed && p.feed.length ? `<div class="bz-feed">${p.feed.slice().reverse().map(f => `<div class="bz-fi">${esc(f.text)}</div>`).join('')}</div>` : '';
  const who = r => `<span class="bz-dot" style="--c:${r.color}"></span><b>${esc(r.name)}</b>`;

  /* ============================== BIG SCREEN ============================== */
  let lastKey = '';
  function board(el, S) {
    const p = S.party, key = JSON.stringify(p);
    if (key === lastKey && el.querySelector('.bz-wrap')) return;
    lastKey = key;
    let h = `<div class="pt-wrap bz-wrap bz-${p.type}">`;
    if (p.stage === 'intro') h += `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">${NAMES[p.type]}</div><p>${HOWTO[p.type]}</p>
      <p><b>${S.teams.reduce((n, t) => n + t.members.length, 0)}</b> players ready · ${p.teamMode ? 'team play' : 'everyone for themselves'}</p><p class="small muted">Waiting for the host to start…</p></div>`;
    else if (p.stage === 'done') h += podium(p);
    else {
      h += head(p) + timer(p);
      if (p.type === 'gold') h += `<div class="bz-two">${ranks(p.rows, r => `${r.score} <small>gold</small>`)}${feed(p) || '<div class="bz-feed"><div class="bz-fi muted">Chests opening soon…</div></div>'}</div>`;
      if (p.type === 'race') h += tracks(p);
      if (p.type === 'tower') h += towerBoard(p);
      if (p.type === 'classic' || p.type === 'battle') h += hostPaced(p);
      h += teamStrip(p);
    }
    el.innerHTML = h + '</div>';
  }
  function ranks(rows, val, n = 10) {
    return `<div class="bz-ranks">${rows.slice(0, n).map((r, i) => `<div class="bz-row paper ${i === 0 ? 'top' : ''}"><span class="bz-n block">${i + 1}</span>${who(r)}<span class="bz-v">${val(r)}</span></div>`).join('') || '<p class="muted">No players yet.</p>'}</div>`;
  }
  function tracks(p) {
    return `<div class="bz-tracks darkpaper">${p.rows.slice(0, 12).map(r => {
      const pct = Math.min(100, (r.pos / p.goal) * 100);
      return `<div class="bz-lane"><span class="bz-ln">${esc(r.name)}</span><div class="bz-road"><span class="bz-car" style="left:calc(${pct}% - ${pct * 0.36}px);--c:${r.color}">${r.finish ? ['🥇', '🥈', '🥉'][r.finish - 1] || '🏁' : '🏎️'}</span></div><span class="bz-pos">${r.pos}/${p.goal}</span></div>`;
    }).join('')}<div class="bz-flag">🏁</div></div>${feed(p)}`;
  }
  function towerBoard(p) {
    return `<div class="bz-wave card paper"><span class="block stroke crayon">Wave ${p.wave}</span><span>Strength <b>${p.waveHp}</b></span>${p.nextWave ? `<span>Next wave in <b class="block" data-end="${p.nextWave}"></b></span>` : ''}</div>
      <div class="bz-two">${ranks(p.rows, r => r.out ? '🏚 fell' : `${hearts(r.lives)} <small>⚔ ${r.dmg}</small> ${r.score}`)}${feed(p)}</div>`;
  }
  function hostPaced(p) {
    if (!p.q) return '';
    const rev = p.stage === 'reveal';
    let h = `<div class="card paper pt-q">${esc(p.q)}</div><div class="pt-opts">${p.options.map((o, i) => `<div class="pt-opt yarn ${rev ? (i === p.correct ? 'right' : 'dim') : ''}" style="--c:${OPT[i]}"><span class="sh">${SHAPE[i]}</span><span class="tx">${esc(o)}</span>${rev ? `<span class="bz-cnt">${Object.values(p.results || {}).filter(x => x.choice === i).length}</span>` : ''}</div>`).join('')}</div>`;
    if (!rev) return h + `<div class="status">${p.answered}/${p.alive} answered</div>`;
    if (p.type === 'classic') return h + ranks(p.rows, r => `${r.score}${p.results[r.pid] && p.results[r.pid].pts ? ` <small class="bz-plus">+${p.results[r.pid].pts}</small>` : ''}`, 8);
    return h + `<div class="bz-hearts">${p.rows.map(r => `<span class="chip paper ${r.out ? 'bz-out' : ''} ${p.results[r.pid] && p.results[r.pid].hurt ? 'shake' : ''}">${who(r)} ${r.out ? '💥' : hearts(r.hearts)}</span>`).join('')}</div>`;
  }
  function podium(p) {
    const top = p.rows.slice(0, 3);
    const val = r => p.type === 'race' ? (r.finish ? `#${r.finish} finish` : `${r.pos}/${p.goal}`) : p.type === 'battle' ? (r.out ? 'knocked out' : '👑 winner') : `${r.score}`;
    return `<div class="card paper pt-intro pop"><div class="pt-big block stroke crayon">${NAMES[p.type]}: results</div>
      <div class="bz-podium">${[1, 0, 2].filter(i => top[i]).map(i => `<div class="bz-step s${i + 1}" style="--c:${top[i].color}"><div class="block stroke">${['🥇', '🥈', '🥉'][i]}</div><b>${esc(top[i].name)}</b><span>${val(top[i])}</span></div>`).join('')}</div>
      ${teamStrip(p)}</div>`;
  }

  /* ============================== HOST PHONE ============================== */
  function host(S, x) {
    const { btn } = x, p = S.party;
    let h = `<h2 class="hand">${NAMES[p.type]}${p.label ? ` <span class="small muted">${esc(p.label)}</span>` : ''}</h2>${p.timerEnd ? `<span class="h-clock block" data-end="${p.timerEnd}"></span>` : ''}`;
    if (p.stage === 'intro') {
      h += `<p>${HOWTO[p.type]}</p><div class="row">Play as: ${btn('party', '🙋 Individuals', 'sm ' + (!p.teamMode ? 'on' : ''), { a: 'teamMode', ok: 0 })}${btn('party', '👥 Teams', 'sm ' + (p.teamMode ? 'on' : ''), { a: 'teamMode', ok: 1 })}</div>
        <p class="small muted">${p.teamMode ? 'Every point a player earns also goes to their team score.' : 'Players compete on their own leaderboard; team scores are not touched.'}</p>
        <div class="row center">${btn('party', '▶ Start', 'big hi', { a: 'begin' })}</div>`;
    } else if (p.stage === 'done') {
      h += `<p>Finished!</p>${list(p)}<div class="row center">${btn('endRound', 'Back to lobby', 'big')}</div>`;
    } else {
      if (p.type === 'classic' || p.type === 'battle') {
        if (p.q) h += `<div class="h-qtext">${esc(p.q)}</div><div class="h-answer">Answer: <b>${esc(p.options[p.correct])}</b></div>`;
        h += p.stage === 'question' ? `<p>${p.answered}/${p.alive} answered</p><div class="row center">${btn('party', '👁 Reveal now', 'hi', { a: 'reveal' })}</div>`
          : `<div class="row center">${btn('party', p.type === 'battle' && p.alive <= 1 ? '🏆 Show winner' : '▶ Next question', 'big hi', { a: 'next' })}</div>`;
      } else h += `<p>${p.rows.length} players · ${p.rows.reduce((n, r) => n + r.answered, 0)} answers so far${p.type === 'tower' ? ` · wave ${p.wave}` : ''}</p>`;
      h += list(p) + `<div class="row center">${btn('party', '⏹ End game', 'no', { a: 'end' })}</div>`;
    }
    return `<div class="card paper">${h}</div>`;
  }
  const list = p => `<ol class="h-stand">${p.rows.slice(0, 15).map(r => `<li><span class="sw" style="background:${r.color}"></span><b>${esc(r.name)}</b> <span class="small muted">${esc(r.teamName)}</span> · ${p.type === 'race' ? `${r.pos}/${p.goal}` : p.type === 'battle' ? (r.out ? 'out' : hearts(r.hearts)) : r.score}${p.type === 'tower' ? (r.out ? ' 🏚' : ` ${hearts(r.lives)}`) : ''}</li>`).join('')}</ol>`;

  /* ============================== PLAYER PHONE ============================== */
  function play(S, me, pme) {
    const p = S.party, b = (pme && pme.blitz) || {};
    const X = o => esc(JSON.stringify(o));
    const opts = (q, cur) => `<div class="pt-popts">${q.options.map((o, i) => `<button type="button" class="pt-popt yarn ${cur === i ? 'chosen' : ''}" style="--c:${OPT[i]}" data-pa="bx" data-x="${X({ action: 'answer', choice: i })}"><span class="sh">${SHAPE[i]}</span>${esc(o)}</button>`).join('')}</div>`;
    const stat = () => {
      if (p.type === 'gold') return `💰 <b>${b.score || 0}</b> gold`;
      if (p.type === 'race') return `🏎️ <b>${b.pos || 0}</b> / ${p.goal}<div class="bz-mini"><i style="width:${Math.min(100, ((b.pos || 0) / p.goal) * 100)}%"></i></div>`;
      if (p.type === 'tower') return `🪙 <b>${b.coins || 0}</b> · ⚔ ${b.dmg || 0} · ${hearts(b.lives ?? 3)} · ${b.score || 0} pts`;
      if (p.type === 'battle') return hearts(b.hearts ?? 3);
      return `<b>${b.score || 0}</b> pts`;
    };
    let h = `<div class="card paper bz-stat center">${stat()}</div>`;
    if (p.stage === 'intro') return h + `<div class="card paper p-msg"><h2 class="hand">${NAMES[p.type]}</h2><p>${HOWTO[p.type]}</p><p><b>Waiting for the host…</b></p></div>`;
    if (p.stage === 'done') {
      const rank = p.rows.findIndex(r => r.pid === me.pid) + 1;
      return h + `<div class="card paper p-msg"><h2 class="hand">Game over!</h2>${rank ? `<div class="p-rank block stroke crayon">#${rank}</div>` : ''}<p>Eyes on the big screen!</p></div>`;
    }
    if (b.out) return h + `<div class="card paper p-msg"><h2 class="hand">${p.type === 'tower' ? '🏚 Your base fell!' : '💥 Knocked out!'}</h2><p>Cheer on the others!</p></div>`;
    if (p.type === 'classic' || p.type === 'battle') {
      if (!p.q) return h + '<div class="card paper p-msg">Get ready…</div>';
      h += `<div class="p-clue card paper"><div class="p-qtext">${esc(p.q)}</div>${timer(p)}</div>`;
      if (p.stage === 'question') return h + (b.ans != null ? `<div class="p-hint">Locked in <b>${SHAPE[b.ans]} ${esc(p.options[b.ans])}</b></div>` : opts(p));
      const r = (p.results || {})[me.pid] || {};
      return h + `<div class="p-verdict ${r.ok ? 'ok' : 'bad'} block stroke pop">${r.ok ? (r.pts ? `+${r.pts}!` : 'Correct!') : 'Not this time'}</div>${r.saved ? '<div class="p-hint">Everyone missed, so nobody is out. Sudden death continues!</div>' : r.hurt ? `<div class="p-hint">${r.slow ? 'Slowest answer: −1 ❤️' : '−1 ❤️'}</div>` : ''}<div class="p-answer">Answer: <b>${esc(p.options[p.correct])}</b></div>`;
    }
    const last = b.last ? `<div class="bz-last ${b.last.ok ? 'ok' : 'bad'}">${b.last.ok ? '✓ Correct!' : `✗ It was <b>${esc(b.last.correct)}</b>`}</div>` : '';
    if (b.pending) {
      return h + `<div class="card paper"><h2 class="hand">${b.pending.kind === 'steal' ? `💰 Steal ${b.pending.pct}% from…` : '🔄 Swap gold with…'}</h2>
        <div class="bz-targets">${b.pending.players.map(t => `<button type="button" class="btn" data-pa="bx" data-x="${X({ action: 'target', pid: t.pid })}">${esc(t.name)} <span class="small">${t.score}</span></button>`).join('')}</div></div>`;
    }
    if (b.opened) {
      return h + `<div class="card paper center"><div class="bz-chests">${b.opened.shown.map((s, i) => `<div class="bz-chest ${i === b.opened.k ? 'picked' : 'other'}"><span>${i === b.opened.k ? '🎁' : '📦'}</span><small>${esc(s)}</small></div>`).join('')}</div>
        <div class="p-verdict ok block stroke pop">${esc(b.opened.shown[b.opened.k])}</div><button type="button" class="btn big hi" data-pa="bx" data-x="${X({ action: 'seen' })}">Next question ▶</button></div>`;
    }
    if (b.chest) return h + last + `<div class="card paper center"><h2 class="hand">Pick a chest!</h2><div class="bz-chests">${[0, 1, 2].map(k => `<button type="button" class="bz-chest" data-pa="bx" data-x="${X({ action: 'chest', k })}"><span>🎁</span></button>`).join('')}</div></div>`;
    if (!b.q) return h + '<div class="card paper p-msg">Loading…</div>';
    if (p.type === 'tower') {
      h += `<div class="bz-shop">${Object.entries(p.towers).map(([k, t]) => `<button type="button" class="btn sm ${b.coins >= t.cost ? 'hi' : ''}" data-pa="bx" data-x="${X({ action: 'buy', tower: k })}" ${b.coins >= t.cost ? '' : 'disabled'}>${({ archer: '🏹', cannon: '💣', wizard: '🧙' })[k]} ${t.name} · ${t.cost}🪙 <small>(${b.towers[k]})</small></button>`).join('')}</div>
        <div class="small muted center">Wave ${p.wave} strength <b>${p.waveHp}</b> · your damage <b>${b.dmg}</b>${p.nextWave ? ` · hits in <b data-end="${p.nextWave}"></b>` : ''}</div>`;
    }
    return h + last + `<div class="p-clue card paper"><div class="p-qtext">${esc(b.q.q)}</div></div>` + opts(b.q);
  }

  window.BlitzUI = { TYPES: ['gold', 'race', 'tower', 'classic', 'battle'], board, host, play, NAMES, HOWTO };
})();
