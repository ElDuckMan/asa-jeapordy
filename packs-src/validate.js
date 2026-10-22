#!/usr/bin/env node
/* Validates a question-pack JSON file.  Usage: node validate.js <pack.json> [--classic]
 * Pack shape:
 * { id, name, blurb, game: { title, edition, rounds: [ round, ... ] } }
 * Every round has: type ('board'|'lightning'|'bonus'|'final'), name, group, variant ('A'|'B').
 */
'use strict';
const fs = require('fs');
const file = process.argv[2];
const classic = process.argv.includes('--classic');
const errors = [], warns = [];
let pack;
try { pack = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('Cannot parse JSON:', e.message); process.exit(1); }
const E = m => errors.push(m), W = m => warns.push(m);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/^\s*(what|who|where|when|which)\s+(is|are|was|were)\s+/, '').replace(/\b(the|a|an)\b/g, ' ')
  .replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

if (!classic) {
  for (const k of ['id', 'name', 'blurb']) if (!pack[k]) E(`missing pack.${k}`);
  if (!pack.game || !Array.isArray(pack.game.rounds)) { E('missing game.rounds'); }
}
const rounds = classic ? pack.rounds : (pack.game ? pack.game.rounds : []);
if (!Array.isArray(rounds)) { console.error('no rounds array'); process.exit(1); }

const answers = new Map();
const addAns = (a, where) => { const k = norm(a); if (!k) return; if (answers.has(k)) W(`repeated answer "${a}" at ${where} (also ${answers.get(k)})`); else answers.set(k, where); };
const leak = (q, a, where) => {
  const k = norm(a); if (k.length < 4) return;
  const words = k.split(' ').filter(w => w.length >= 5);
  if (norm(q).includes(k) || (words.length && words.every(w => norm(q).split(' ').includes(w)))) E(`answer appears in clue at ${where}: "${a}"`);
};
const needCats = ['music', 'movies', 'ancient', 'recent'];
const groups = {};
rounds.forEach((r, i) => {
  const at = `round ${i + 1} (${r.name || '?'} ${r.variant || ''})`;
  if (!['board', 'lightning', 'bonus', 'final'].includes(r.type)) E(`${at}: bad type`);
  if (!r.name) E(`${at}: missing name`);
  if (!r.group) E(`${at}: missing group`);
  if (!['A', 'B'].includes(r.variant)) E(`${at}: variant must be "A" or "B"`);
  (groups[r.group] = groups[r.group] || []).push(r.variant);
  if (r.type === 'board') {
    if (!Array.isArray(r.categories) || r.categories.length < 6) E(`${at}: needs 6 categories`);
    const names = (r.categories || []).map(c => (c.name || '').toLowerCase());
    for (const n of needCats) if (!names.some(x => x.includes(n))) E(`${at}: missing a category containing "${n}" (need Music, Movies & TV, Ancient History, Recent History)`);
    let dd = 0;
    (r.categories || []).forEach((cat, c) => {
      if (!cat.name) E(`${at}: category ${c + 1} has no name`);
      if (!Array.isArray(cat.clues) || cat.clues.length !== 5) E(`${at}: "${cat.name}" needs exactly 5 clues`);
      (cat.clues || []).forEach((cl, j) => {
        const w = `${at} / ${cat.name} / #${j + 1}`;
        if (!cl.q || !cl.a) E(`${w}: empty clue or answer`);
        if (typeof cl.value !== 'number') E(`${w}: value must be a number`);
        if (j && cat.clues[j - 1] && cl.value <= cat.clues[j - 1].value) E(`${w}: values must increase down the column`);
        if (cl.type && !['standard', 'dd', 'mc'].includes(cl.type)) E(`${w}: bad clue type`);
        if (cl.type === 'dd') dd++;
        if (cl.type === 'mc') {
          if (!Array.isArray(cl.options) || cl.options.length !== 4) E(`${w}: MC needs 4 options`);
          if (!(cl.correct >= 0 && cl.correct < 4)) E(`${w}: MC needs correct index 0-3`);
          else if (norm(cl.options[cl.correct]) !== norm(cl.a)) E(`${w}: MC answer "${cl.a}" != option ${cl.correct} "${cl.options[cl.correct]}"`);
        } else if (!/^(what|who|where|when)\s+(is|are|was|were)\b/i.test(cl.a)) W(`${w}: board answer should be phrased "What is …?" / "Who is …?"`);
        addAns(cl.a, w); leak(cl.q, cl.a, w);
      });
    });
    if (dd < 1) E(`${at}: needs at least 1 Daily Double (type "dd")`);
  } else if (r.type === 'lightning' || r.type === 'bonus') {
    const min = r.type === 'lightning' ? 12 : 5;
    if (!Array.isArray(r.questions) || r.questions.length < min) E(`${at}: needs at least ${min} questions`);
    (r.questions || []).forEach((x, k) => {
      const w = `${at} / Q${k + 1}`;
      if (!x.q || !x.a) E(`${w}: empty question or answer`);
      if (x.options && x.options.length) {
        if (r.type !== 'bonus') E(`${w}: options only allowed in bonus rounds`);
        if (x.options.length !== 4) E(`${w}: MC needs 4 options`);
        if (!(x.correct >= 0 && x.correct < 4)) E(`${w}: MC needs correct index`);
        else if (norm(x.options[x.correct]) !== norm(x.a)) E(`${w}: MC answer "${x.a}" != option "${x.options[x.correct]}"`);
      }
      addAns(x.a, w); leak(x.q, x.a, w);
    });
  } else if (r.type === 'final') {
    if (!r.category || !r.q || !r.a) E(`${at}: final needs category, q, a`);
    addAns(r.a, at); leak(r.q, r.a, at);
  }
});
for (const [g, v] of Object.entries(groups)) if (!classic && (v.length !== 2 || !v.includes('A') || !v.includes('B'))) E(`group "${g}" must have exactly one A and one B variant (has ${v.join(',')})`);
const total = rounds.reduce((n, r) => n + (r.categories ? r.categories.reduce((m, c) => m + (c.clues || []).length, 0) : r.questions ? r.questions.length : 1), 0);
console.log(`${file}: ${rounds.length} rounds, ${total} questions, ${errors.length} errors, ${warns.length} warnings`);
errors.forEach(e => console.log('ERROR', e));
warns.forEach(w => console.log('warn ', w));
process.exit(errors.length ? 1 : 0);
