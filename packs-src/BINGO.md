# Category Bingo question format

Audience: college Asian Student Association general meeting (25+ students, mixed backgrounds). Fun, respectful, neutral, no stereotypes, no politics or territorial disputes, no gore. Facts must be widely documented and stable (nothing after 2023, nothing that goes stale: no "current" records, rankings, populations, prices, officeholders).

Each category file is plain JSON (no comments, no trailing commas; typographic quotes “ ” inside strings):

{ "<Category name>": { "normal": [ … 12 items … ], "hard": [ … 6 items … ] } }

Each item: { "q": "Question text?", "options": ["A", "B", "C", "D"], "correct": 0 }
- Exactly 4 short options (fit on a phone button, ideally ≤ 28 characters), exactly one correct; `correct` is its 0-based index. Spread the correct index across 0–3.
- Questions must be readable in ~5 seconds (≤ 110 characters). Everyone answers at once in 15 seconds.
- Distractors plausible but unambiguously wrong. No "all of the above", no trick wording.
- normal: a smart college student has a fair shot. hard: real knowledge needed, still fair and unambiguous.
- Spread across East, Southeast and South Asia where the category allows. No question may duplicate another in any category.
