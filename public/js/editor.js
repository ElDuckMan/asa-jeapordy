/* ASA Jeopardy — game editor (rounds, categories, clue types, media, timers). */
(function () {
  'use strict';
  const { esc, toast } = Craft;
  const TYPES = { board: 'Board (Jeopardy grid)', lightning: 'Lightning round', bonus: 'Bonus round', final: 'Final round' };

  function blankRound(type) {
    if (type === 'board') return { type, name: 'New board round', timer: 0, categories: [1, 2, 3, 4, 5].map(n => ({ name: `Category ${n}`, clues: [1, 2, 3, 4, 5].map(v => ({ value: v * 100, q: '', a: '', type: 'standard' })) })) };
    if (type === 'lightning') return { type, name: 'Lightning Round', duration: 60, points: 100, penalty: false, questions: [{ q: '', a: '' }] };
    if (type === 'bonus') return { type, name: 'Bonus Round', points: 200, timer: 20, questions: [{ q: '', a: '', options: [] }] };
    return { type: 'final', name: 'Final Round', category: '', q: '', a: '', timer: 30 };
  }

  function setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      const k = ks[i], nk = ks[i + 1];
      if (k === 'media' && (o.media == null || typeof o.media !== 'object')) o.media = { type: 'image', url: '' };
      if (o[k] == null) o[k] = /^\d+$/.test(nk) ? [] : {};
      o = o[k];
    }
    const last = ks[ks.length - 1];
    o[last] = val;
    if (ks[ks.length - 2] === 'media' && last === 'type' && !val) {
      let p = obj;
      for (let i = 0; i < ks.length - 2; i++) p = p[ks[i]];
      p.media = null;
    }
  }

  const val = (v, d = '') => esc(v == null ? d : v);
  function mediaRow(base, m) {
    m = m || {};
    return `<div class="row small ed-media"><span>Picture / sound:</span>
      <select class="field ed-sel" data-path="${base}.media.type" data-rerender="1">
        ${['', 'image', 'audio', 'video'].map(t => `<option value="${t}" ${(m.type || '') === t ? 'selected' : ''}>${t || 'none'}</option>`).join('')}</select>
      ${m.type ? `<input class="field" data-path="${base}.media.url" value="${val(m.url)}" placeholder="https://… (direct link to the file)">` : ''}</div>`;
  }
  function optionsBlock(base, x, optional) {
    const opts = x.options || [];
    return `<div class="ed-opts">${[0, 1, 2, 3].map(k => `<div class="row"><b>${'ABCD'[k]}</b><input class="field" data-path="${base}.options.${k}" value="${val(opts[k])}" placeholder="${optional ? 'option (leave all blank for typed answers)' : 'option'}"></div>`).join('')}
      <div class="row small">Correct option: <select class="field ed-sel" data-path="${base}.correct" data-kind="num">${[0, 1, 2, 3].map(k => `<option value="${k}" ${(x.correct || 0) === k ? 'selected' : ''}>${'ABCD'[k]}</option>`).join('')}</select></div></div>`;
  }

  function clueHTML(i, c, j, cl) {
    const b = `rounds.${i}.categories.${c}.clues.${j}`;
    return `<div class="ed-clue paper">
      <div class="row"><input class="field num" type="number" data-kind="num" data-path="${b}.value" value="${val(cl.value, 0)}" title="Points">
        <select class="field ed-sel" data-path="${b}.type" data-rerender="1">
          <option value="standard" ${cl.type === 'standard' || !cl.type ? 'selected' : ''}>Buzz-in</option>
          <option value="dd" ${cl.type === 'dd' ? 'selected' : ''}>Daily Double</option>
          <option value="mc" ${cl.type === 'mc' ? 'selected' : ''}>Multiple choice</option></select>
        <input class="field num" type="number" min="0" data-kind="num" data-path="${b}.timer" value="${cl.timer || ''}" placeholder="timer s" title="Seconds on the clock (blank = no timer)">
        <button class="btn sm no" data-ed="delClue" data-i="${i}" data-c="${c}" data-j="${j}" title="Delete clue">✕</button></div>
      <textarea class="field" rows="2" data-path="${b}.q" placeholder="Clue">${val(cl.q)}</textarea>
      <input class="field" data-path="${b}.a" value="${val(cl.a)}" placeholder="Correct answer (What is …?)">
      <input class="field" data-path="${b}.hint" value="${val(cl.hint)}" placeholder="💡 Hint (optional)">
      ${cl.type === 'mc' ? optionsBlock(b, cl, false) : ''}${mediaRow(b, cl.media)}</div>`;
  }
  function questionHTML(i, k, x, withOptions) {
    const b = `rounds.${i}.questions.${k}`;
    return `<div class="ed-clue paper"><div class="row"><b>#${k + 1}</b><span style="flex:1"></span><button class="btn sm no" data-ed="delQ" data-i="${i}" data-k="${k}">✕</button></div>
      <textarea class="field" rows="2" data-path="${b}.q" placeholder="Question">${val(x.q)}</textarea>
      <input class="field" data-path="${b}.a" value="${val(x.a)}" placeholder="Correct answer">
      <input class="field" data-path="${b}.hint" value="${val(x.hint)}" placeholder="💡 Hint (optional)">
      ${withOptions ? optionsBlock(b, x, true) : ''}${mediaRow(b, x.media)}</div>`;
  }
  function roundBody(r, i) {
    const b = `rounds.${i}`;
    if (r.type === 'board') {
      return `<div class="row small"><label>Default timer for every clue (s, 0 = none) <input class="field num" type="number" min="0" data-kind="num" data-path="${b}.timer" value="${r.timer || 0}"></label></div>
        <div class="ed-cats">${r.categories.map((cat, c) => `<div class="ed-cat">
          <div class="row"><input class="field ed-catname" data-path="${b}.categories.${c}.name" value="${val(cat.name)}" placeholder="Category"><button class="btn sm no" data-ed="delCat" data-i="${i}" data-c="${c}" title="Delete category">✕</button></div>
          ${cat.clues.map((cl, j) => clueHTML(i, c, j, cl)).join('')}
          <button class="btn sm" data-ed="addClue" data-i="${i}" data-c="${c}">+ clue</button></div>`).join('')}
          <div class="ed-cat ed-addcat"><button class="btn" data-ed="addCat" data-i="${i}">+ category</button></div></div>`;
    }
    if (r.type === 'lightning') {
      return `<div class="row small"><label>Seconds <input class="field num" type="number" min="5" data-kind="num" data-path="${b}.duration" value="${r.duration}"></label>
        <label>Points each <input class="field num" type="number" min="0" data-kind="num" data-path="${b}.points" value="${r.points}"></label>
        <label class="row"><input type="checkbox" data-kind="bool" data-path="${b}.penalty" ${r.penalty ? 'checked' : ''}> wrong answers lose points</label></div>
        <div class="ed-qs">${r.questions.map((x, k) => questionHTML(i, k, x, false)).join('')}</div><button class="btn sm" data-ed="addQ" data-i="${i}">+ question</button>`;
    }
    if (r.type === 'bonus') {
      return `<div class="row small"><label>Points each <input class="field num" type="number" min="0" data-kind="num" data-path="${b}.points" value="${r.points}"></label>
        <label>Seconds to answer (0 = no timer) <input class="field num" type="number" min="0" data-kind="num" data-path="${b}.timer" value="${r.timer}"></label></div>
        <p class="small muted">Fill in A–D for multiple choice, or leave them blank and teams type an answer that you judge.</p>
        <div class="ed-qs">${r.questions.map((x, k) => questionHTML(i, k, x, true)).join('')}</div><button class="btn sm" data-ed="addQ" data-i="${i}">+ question</button>`;
    }
    return `<label class="lbl">Category</label><input class="field" data-path="${b}.category" value="${val(r.category)}">
      <label class="lbl">Final clue</label><textarea class="field" rows="3" data-path="${b}.q">${val(r.q)}</textarea>
      <label class="lbl">Correct answer</label><input class="field" data-path="${b}.a" value="${val(r.a)}">
      <label class="lbl">💡 Hint (optional)</label><input class="field" data-path="${b}.hint" value="${val(r.hint)}">
      <div class="row small"><label>Seconds to answer <input class="field num" type="number" min="0" data-kind="num" data-path="${b}.timer" value="${r.timer}"></label></div>
      ${mediaRow(b, r.media)}`;
  }

  function mount(el, game, onChange, o = {}) {
    const open = new Set([0]);
    const save = () => onChange(game);
    function draw() {
      el.innerHTML = `<div class="card paper"><h2 class="hand">Game editor</h2>
        <label class="lbl">Game title</label><input class="field" data-path="title" value="${val(game.title)}">
        <div class="row" style="margin-top:12px"><button class="btn sm" data-ed="export">⬇ Export JSON</button>
          <label class="btn sm">⬆ Import JSON<input type="file" accept="application/json,.json" data-ed-file hidden></label>
          ${(window.ASA_PACKS || []).length ? `<label class="btn sm">📦 Load pack <select class="ed-packsel" data-ed-pack><option value="">choose…</option>${window.ASA_PACKS.map(p => `<option value="${val(p.id)}">${val(p.name)}</option>`).join('')}</select></label>` : '<button class="btn sm" data-ed="sample">Load sample game</button>'}<button class="btn sm" data-ed="blank">Start blank</button>
          <button class="btn sm hi" data-ed="push">⟳ Apply to live game</button></div>
        <p class="small muted">Saved automatically on this device. Export a copy so you can load it on another computer.</p></div>
        ${game.rounds.map((r, i) => `<details class="card paper ed-round" data-i="${i}" ${open.has(i) ? 'open' : ''}>
          <summary><b>${i + 1}. ${val(r.name)}${r.variant ? ` · ${r.type === 'board' ? 'Board' : 'Set'} ${val(r.variant)}` : ''}</b> <span class="ed-type">${TYPES[r.type]}</span>
            <span class="ed-tools"><button class="btn sm" data-ed="up" data-i="${i}" title="Move up">↑</button><button class="btn sm" data-ed="down" data-i="${i}" title="Move down">↓</button><button class="btn sm no" data-ed="delRound" data-i="${i}" title="Delete round">🗑</button></span></summary>
          <label class="lbl">Round name</label><input class="field" data-path="rounds.${i}.name" value="${val(r.name)}">
          ${roundBody(r, i)}</details>`).join('')}
        <div class="card paper row center"><b>Add a round:</b>${Object.keys(TYPES).map(t => `<button class="btn sm" data-ed="addRound" data-type="${t}">+ ${TYPES[t]}</button>`).join('')}</div>`;
    }
    el.addEventListener('input', e => {
      const p = e.target.dataset.path;
      if (!p) return;
      const k = e.target.dataset.kind;
      let v = e.target.value;
      if (k === 'num') v = v === '' ? 0 : Number(v);
      if (k === 'bool') v = e.target.checked;
      setPath(game, p, v);
      if (p.endsWith('.options.0') || /\.options\.\d$/.test(p)) {
        const base = p.replace(/\.options\.\d$/, '');
        let x = game; base.split('.').forEach(s => { x = x[s]; });
        x.options = (x.options || []).map(s => s || '');
      }
      save();
    });
    el.addEventListener('change', e => { if (e.target.dataset.rerender || e.target.type === 'checkbox') { if (e.target.dataset.path) setPath(game, e.target.dataset.path, e.target.dataset.kind === 'bool' ? e.target.checked : e.target.value); save(); draw(); } });
    el.addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details.ed-round'); if (d) { const i = +d.dataset.i; if (d.open) open.add(i); else open.delete(i); } }, true);
    el.addEventListener('change', e => {
      if (!e.target.matches('[data-ed-pack]') || !e.target.value) return;
      const p = (window.ASA_PACKS || []).find(x => x.id === e.target.value);
      if (!p || !confirm(`Replace this game with the ${p.name} pack?`)) { e.target.value = ''; return; }
      game = JSON.parse(JSON.stringify(p.game)); open.clear(); open.add(0); save(); draw();
      toast(`${p.name} loaded. Tap “Apply to live game” to use it now.`);
    });
    el.addEventListener('change', e => {
      if (!e.target.matches('[data-ed-file]')) return;
      const f = e.target.files[0];
      if (!f) return;
      f.text().then(t => {
        const g = JSON.parse(t);
        if (!g || !Array.isArray(g.rounds)) throw new Error('bad');
        game = g; save(); draw(); toast('Game imported.');
      }).catch(() => toast('That file is not a game export.'));
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-ed]');
      if (!b) return;
      if (b.closest('summary')) e.preventDefault();
      const i = +b.dataset.i, R = game.rounds[i];
      switch (b.dataset.ed) {
        case 'export': {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' }));
          a.download = (game.title || 'game').replace(/[^\w-]+/g, '_') + '.json';
          a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          return;
        }
        case 'sample': if (!confirm('Replace this game with the sample game?')) return; game = JSON.parse(JSON.stringify(window.SAMPLE_GAME)); break;
        case 'blank': if (!confirm('Start a blank game? This replaces what is here.')) return; game = { title: 'ASA Jeopardy', rounds: [blankRound('board')] }; break;
        case 'push': if (o.onPush) o.onPush(); return;
        case 'addRound': game.rounds.push(blankRound(b.dataset.type)); open.add(game.rounds.length - 1); break;
        case 'delRound': if (!confirm(`Delete “${R.name}”?`)) return; game.rounds.splice(i, 1); break;
        case 'up': if (i > 0) [game.rounds[i - 1], game.rounds[i]] = [game.rounds[i], game.rounds[i - 1]]; break;
        case 'down': if (i < game.rounds.length - 1) [game.rounds[i + 1], game.rounds[i]] = [game.rounds[i], game.rounds[i + 1]]; break;
        case 'addCat': R.categories.push({ name: 'New category', clues: (R.categories[0] ? R.categories[0].clues : [1, 2, 3, 4, 5].map(v => ({ value: v * 100 }))).map(x => ({ value: x.value, q: '', a: '', type: 'standard' })) }); break;
        case 'delCat': if (!confirm('Delete this category?')) return; R.categories.splice(+b.dataset.c, 1); break;
        case 'addClue': { const cl = R.categories[+b.dataset.c].clues; cl.push({ value: (cl.length + 1) * 100, q: '', a: '', type: 'standard' }); break; }
        case 'delClue': R.categories[+b.dataset.c].clues.splice(+b.dataset.j, 1); break;
        case 'addQ': R.questions.push(R.type === 'bonus' ? { q: '', a: '', options: [] } : { q: '', a: '' }); break;
        case 'delQ': R.questions.splice(+b.dataset.k, 1); break;
        default: return;
      }
      save(); draw();
    });
    draw();
    return { get: () => game, set: g => { game = g; draw(); } };
  }

  window.Editor = { mount, blankRound };
})();
