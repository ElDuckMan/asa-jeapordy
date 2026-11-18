/* ASA Jeopardy — question packs.
 * Each file in /js/packs/ calls AsaPacks.add({ id, name, blurb, game }).
 * A game's rounds may come in alternate versions that share a `group` and differ by `variant` (A, B…). */
(function () {
  'use strict';
  const list = window.ASA_PACKS = window.ASA_PACKS || [];
  const ICON = { classic: '🏮', standard: '🌐', 'east-asia': '🏯', 'south-asia': '🪷', africa: '🌍', church: '⛪', party: '🎉', bsu: '✊🏾' };
  const COLOR = { classic: '--red', standard: '--blue', 'east-asia': '--teal', 'south-asia': '--mustard', africa: '--green', church: '--purple', party: '--rust', bsu: '--green' };
  const clone = o => JSON.parse(JSON.stringify(o));

  /* Group consecutive-or-not rounds by `group` (falling back to name), keeping first-appearance order. */
  function groups(rounds) {
    const out = [], at = new Map();
    (rounds || []).forEach((r, i) => {
      const key = r.group || r.name;
      if (!at.has(key)) { at.set(key, out.length); out.push({ group: key, type: r.type, items: [] }); }
      out[at.get(key)].items.push({ i, variant: r.variant || '', label: r.label || '', name: r.name, type: r.type });
    });
    return out;
  }
  function count(game) {
    return (game.rounds || []).reduce((n, r) => n + (r.categories ? r.categories.reduce((m, c) => m + c.clues.length, 0) : r.questions ? r.questions.length : r.items ? r.items.length : 1), 0);
  }
  /* Pack cards for a picker. `mine` = optional saved custom game. */
  /* Pack cards, grouped by who they're for. `compact` shows the current pack plus one row of the others. */
  const SECTIONS = [['Asian Student Association', ['classic', 'east-asia', 'south-asia']], ['Everyone', ['standard', 'africa']], ['Clubs & groups', ['church', 'bsu']]];
  function pickerHTML(esc, opts = {}) {
    const cardFor = p => {
      const g = groups(p.game.rounds);
      return `<button class="pk-card yarn ${opts.current === p.id ? 'pk-on' : ''}" type="button" data-pack="${esc(p.id)}" style="--c:var(${COLOR[p.id] || '--purple'})">
        <span class="pk-icon" aria-hidden="true">${ICON[p.id] || '🎲'}</span><span class="pk-name block stroke">${esc(p.name)}</span>
        ${opts.compact ? '' : `<span class="pk-blurb">${esc(p.blurb || '')}</span>`}
        <span class="pk-meta">${opts.current === p.id ? '<b>✓ playing now</b> · ' : ''}${g.length} rounds · ${count(p.game)} questions</span></button>`;
    };
    const seen = new Set(), visible = list.filter(p => p.id !== 'party');
    let h = SECTIONS.map(([title, ids]) => {
      const ps = ids.map(id => visible.find(p => p.id === id)).filter(Boolean); ps.forEach(p => seen.add(p.id));
      return ps.length ? `<div class="pk-sec"><div class="pk-h">${esc(title)}</div><div class="pk-grid">${ps.map(cardFor).join('')}</div></div>` : '';
    }).join('');
    const rest = visible.filter(p => !seen.has(p.id));
    if (rest.length || opts.mine) h += `<div class="pk-sec"><div class="pk-h">More</div><div class="pk-grid">${rest.map(cardFor).join('')}${opts.mine ? `<button class="pk-card yarn ${opts.current === '__mine' ? 'pk-on' : ''}" type="button" data-pack="__mine" style="--c:var(--rust)">
        <span class="pk-icon" aria-hidden="true">✎</span><span class="pk-name block stroke">My saved game</span><span class="pk-meta">${groups(opts.mine.rounds).length} rounds · ${count(opts.mine)} questions</span></button>` : ''}</div></div>`;
    return `<div class="pk-wrap ${opts.compact ? 'pk-compact' : ''}">${h}</div>`;
  }
  const icon = id => ICON[id] || '🎲';

  window.AsaPacks = {
    list, groups, count, pickerHTML, clone, icon,
    add(p) { if (!list.some(x => x.id === p.id)) list.push(p); },
    get: id => list.find(p => p.id === id) || null,
    gameFor: id => { const p = list.find(x => x.id === id); return p ? clone(p.game) : null; }
  };
})();
