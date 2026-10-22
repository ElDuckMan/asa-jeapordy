/* ASA Jeopardy — question packs.
 * Each file in /js/packs/ calls AsaPacks.add({ id, name, blurb, game }).
 * A game's rounds may come in alternate versions that share a `group` and differ by `variant` (A, B…). */
(function () {
  'use strict';
  const list = window.ASA_PACKS = window.ASA_PACKS || [];
  const ICON = { classic: '🏮', standard: '🌐', 'east-asia': '🏯', 'south-asia': '🪷', africa: '🌍' };
  const COLOR = { classic: '--red', standard: '--blue', 'east-asia': '--teal', 'south-asia': '--mustard', africa: '--green' };
  const clone = o => JSON.parse(JSON.stringify(o));

  /* Group consecutive-or-not rounds by `group` (falling back to name), keeping first-appearance order. */
  function groups(rounds) {
    const out = [], at = new Map();
    (rounds || []).forEach((r, i) => {
      const key = r.group || r.name;
      if (!at.has(key)) { at.set(key, out.length); out.push({ group: key, type: r.type, items: [] }); }
      out[at.get(key)].items.push({ i, variant: r.variant || '', name: r.name, type: r.type });
    });
    return out;
  }
  function count(game) {
    return (game.rounds || []).reduce((n, r) => n + (r.categories ? r.categories.reduce((m, c) => m + c.clues.length, 0) : r.questions ? r.questions.length : 1), 0);
  }
  /* Pack cards for a picker. `mine` = optional saved custom game. */
  function pickerHTML(esc, opts = {}) {
    const cards = list.map(p => {
      const g = groups(p.game.rounds);
      return `<button class="pk-card yarn" type="button" data-pack="${esc(p.id)}" style="--c:var(${COLOR[p.id] || '--purple'})">
        <span class="pk-icon" aria-hidden="true">${ICON[p.id] || '🎲'}</span>
        <span class="pk-name block stroke">${esc(p.name)}</span>
        <span class="pk-blurb">${esc(p.blurb || '')}</span>
        <span class="pk-meta">${g.length} rounds · ${count(p.game)} questions${opts.current === p.id ? ' · <b>current</b>' : ''}</span></button>`;
    });
    if (opts.mine) {
      cards.push(`<button class="pk-card yarn" type="button" data-pack="__mine" style="--c:var(--rust)">
        <span class="pk-icon" aria-hidden="true">✎</span><span class="pk-name block stroke">My saved game</span>
        <span class="pk-blurb">${esc(opts.mine.edition || opts.mine.title || 'Your edited questions on this device')}</span>
        <span class="pk-meta">${groups(opts.mine.rounds).length} rounds · ${count(opts.mine)} questions${opts.current === '__mine' ? ' · <b>current</b>' : ''}</span></button>`);
    }
    return `<div class="pk-grid">${cards.join('')}</div>`;
  }

  window.AsaPacks = {
    list, groups, count, pickerHTML, clone,
    add(p) { if (!list.some(x => x.id === p.id)) list.push(p); },
    get: id => list.find(p => p.id === id) || null,
    gameFor: id => { const p = list.find(x => x.id === id); return p ? clone(p.game) : null; }
  };
})();
