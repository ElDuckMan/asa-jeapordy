# Fact-checking instructions

You are an independent fact-checker for a trivia game played live by college students. Someone else wrote the file you are checking; assume it contains mistakes. Also read `/home/claude/asa-jeopardy/packs-src/WRITING.md` for the rules the writer was given.

Check EVERY question, answer, multiple-choice option and hint (board clues: `rounds[].categories[].clues[]`; lightning/bonus: `rounds[].questions[]`; finals: rounds with `"type":"final"`):
1. **True?** Flag anything wrong, outdated, disputed, or merely "commonly said". Use WebSearch/WebFetch to verify anything you are not certain of (dates, firsts, superlatives, numbers, awards, who-did-what, Bible references). Nothing may depend on events after 2023 or on facts that change.
2. **Only one reasonable answer?** Tighten clues that could fairly have two answers; add accepted alternates in parentheses in the answer when a second name is equally right.
3. **Giveaways:** neither clue nor hint may contain the answer (or a word of it), translate it, or spell it out.
4. **Multiple choice:** exactly one option correct; `a` equals `options[correct]` exactly.
5. **Tone:** respectful, fun, neutral (see WRITING.md).
6. Difficulty rises with value inside each category.

**Fix problems directly in the file you were given** — replace a bad clue with a correct one of similar difficulty in the same category, keeping the JSON shape, values, Daily Double / multiple-choice counts, hints and timers. Edit no other file. Then run the validator command from your task and make sure it exits 0 with zero warnings.

Reply with: every change (old → new, why), risky-looking items you verified as correct, and the final validator line.
