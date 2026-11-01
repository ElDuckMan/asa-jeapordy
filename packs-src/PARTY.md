# Party-mode content format

Audience: college students at an Asian Student Association night, sometimes a church youth group. Fun, respectful, neutral, no stereotypes, no politics, no gore. Facts must be widely documented and stable (nothing after 2023, nothing that goes stale). Every item comes in one of three **sets**: `"general"` (world trivia / everyday life), `"asia"` (pan-Asian culture, food, places, history, pop culture), `"church"` (Bible and church life; ecumenical, true in every major Christian tradition).

Write plain JSON (no comments, no trailing commas; typographic quotes “ ” inside strings). Each file is `{ "<mode>": { "general": [...], "asia": [...], "church": [...] }, ... }`.

## fakeout — "Fake Out" (bluffing)
A surprising-but-TRUE fact with one blank. Players invent fake answers; the room tries to spot the real one, so the truth must sound odd enough that fakes can compete.
`{ "q": "In 2019, a ____ was elected mayor of a small town in Kentucky.", "a": "dog", "alts": ["a dog", "dogs"] }`
- The blank is written `____` (four underscores), exactly once. The answer `a` is 1–4 words that fill the blank exactly. `alts`: other spellings/forms that should count as the truth (so a player can't submit the real answer as a fake).
- The truth must be verifiable and uncontroversial. Avoid anything a quick guess gets right.
- 12 items per set.

## closest — "Closest Guess"
A question with a single, stable, well-documented numeric answer.
`{ "q": "How tall is Mount Fuji, in meters?", "a": 3776, "unit": "meters", "note": "Japan's highest peak" }`
- `a` is a number (integer unless a decimal is essential). `unit` is a short label shown with the answer. `note` (optional) is a one-line fun fact shown on reveal.
- Only numbers that do not change (heights, distances, historical years, counts in a fixed text, etc.). No populations, prices, records, "current" anything.
- 10 items per set.

## speed — "Speed Quiz" (everyone answers on phones, multiple choice)
`{ "q": "Which planet is known as the Red Planet?", "options": ["Venus", "Mars", "Jupiter", "Mercury"], "correct": 1 }`
- Exactly 4 options, exactly one correct; short options (fit on a phone button). Quick to read (people have ~15 seconds).
- 15 items per set.

## emoji — "Emoji Decode" (buzz-in)
`{ "q": "🦁👑", "a": "The Lion King", "hint": "Disney, 1994" }`
- `q` is only emoji (2–6). `a` is the one clear answer (movie, song, book, food, place, saying, Bible story…). `hint` says what kind of thing it is (e.g. "Movie", "K-pop song", "Bible story", "Food") — keep it short.
- Must be decodable by a smart college student; avoid emoji that render differently across phones (flags are OK).
- 15 items per set.

## wheel — "Wheel" (letter puzzles)
`{ "category": "Proverb", "phrase": "ACTIONS SPEAK LOUDER THAN WORDS" }`
- `phrase` in CAPITAL letters, A–Z plus spaces, apostrophes, hyphens, ampersands; 2–6 words, max 40 characters; must be a well-known exact phrase/title/name (check exact wording of titles and verses).
- 12 items per set. Categories like Proverb, Movie Title, Food & Drink, Place, Famous Phrase, Song Title, Bible Verse (exact common wording), Book of the Bible, Before & After is NOT allowed (too confusing).

## survey — "Survey Says" (the room answers live on phones first)
`{ "q": "Name something you bring to a potluck." }`
- Open prompts with many possible everyday answers, answerable in 1–3 words. No facts, no right answer, nothing embarrassing or personal.
- 12 items per set.

## draw — "Draw & Guess" (one player draws on their phone)
A list of simple drawable words or short phrases (1–3 words), e.g. `"dumpling"`, `"Noah's ark"`.
- 50 items per set; concrete and drawable in 60 seconds; no proper names of living people.
