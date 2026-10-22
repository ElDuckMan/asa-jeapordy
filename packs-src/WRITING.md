# Writing rules for ASA Jeopardy question files

The game is played live by college students at a student-association event. Players buzz in on phones; a host judges.
Every file you write must pass `node /home/claude/asa-jeopardy/packs-src/validate.js …` (exact command given in your task) with exit code 0 and, as far as possible, zero warnings.

## Round objects

Every round has `type`, `name`, `group`, `variant` (one capital letter A–F). `group` and `name` are the round's display name (e.g. "Round 1").

### Board (`"type":"board"`)
```json
{"type":"board","group":"Round 1","variant":"C","name":"Round 1","timer":0,"categories":[ …exactly 6… ]}
```
- 6 categories × exactly 5 clues. Values strictly increase down each column.
- Every board MUST include four categories whose names contain the words **Music**, **Movies**, **Ancient**, and **Recent** (for most packs, exactly "Music", "Movies & TV", "Ancient History", "Recent History"; your task may give variants like "Worship Music").
- Clue: `{"value":100,"q":"Statement-style clue using “this”","a":"What is X?"}` — board answers phrased "What is…?", "Who is…?", "What are…?", "Who are…?".
- Daily Double: add `"type":"dd"`. Multiple choice: `{"value":300,"type":"mc","q":"Question?","a":"Exact correct option text","options":["…","…","…","…"],"correct":2}`, `a` must equal `options[correct]` character-for-character.
- Round 1 boards: values 100–500, exactly 1 Daily Double, exactly 1 multiple-choice clue.
- Double Round boards: values 200–1000, exactly 2 Daily Doubles (different categories), exactly 1 multiple-choice clue, and EVERY clue has a `"hint"`.
- Hard Round boards (Classic only): values 400,800,1200,1600,2000, 2 Daily Doubles, 1 multiple-choice, `"timer":20` on every 2000 clue, EVERY clue has a `"hint"`.

### Lightning (`"type":"lightning"`)
```json
{"type":"lightning","group":"Lightning Round","variant":"C","name":"Lightning Round","duration":60,"points":100,"penalty":false,"questions":[{"q":"Capital of Peru?","a":"Lima"}, …]}
```
12+ quick questions with short answers (a word or two). No options.

### Bonus (`"type":"bonus"`)
```json
{"type":"bonus","group":"Bonus Round","variant":"C","name":"Bonus Round","points":200,"timer":20,"questions":[ … ]}
```
5+ questions: about 3 multiple-choice (4 `options` + `correct`, `a` equals the correct option) and 2 typed (short, unambiguous answers).

### Final (`"type":"final"`)
```json
{"type":"final","group":"Final Round","variant":"C","name":"Final Round","category":"…","q":"…","a":"What is …?","hint":"…","timer":30}
```

### Hints
Short (under 15 words), genuinely helpful, and they must NOT contain or spell out the answer, translate it, or rhyme it.

## Content rules (important)
1. **Accuracy above all.** Only facts you are highly confident of and that are widely documented and uncontroversial. If you are unsure, choose a different fact. Avoid contested "firsts" and superlatives, shaky numbers, and "commonly said" claims. If you must use a date, be sure of it.
2. **Nothing after 2023**, and nothing that goes stale (no "current" leader, champion, record holder, tallest/newest). Phrase as "In 2019, …".
3. **One right answer.** If a clue could fairly have two answers, add detail until it has one.
4. **No giveaways.** The clue text must not contain the answer or a word of it; avoid clues that translate the answer.
5. **Tone:** fun, respectful, neutral. No stereotypes, gore, atrocities, disaster/war/poverty as trivia, no politically divisive framing, no praising or condemning governments, parties, or religions.
6. **No repeated answers** anywhere in the pack — including the boards that already exist (the validator's `--base` option checks this; fix every repeat it reports).
7. Difficulty rises with value; boards of the same round should be comparably difficult. Vary topics, countries/regions, eras.
8. Straight JSON, no comments, no trailing commas. Use typographic quotes “ ” inside strings.

When you finish, reply with: the validator's final line, the category names of each board you wrote, and the facts you are least sure of (a separate fact-checker will review them).
