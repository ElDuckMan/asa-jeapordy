# ASA Jeopardy

Arts-and-crafts multiplayer Jeopardy for the Asian Student Association.

| Page | Who uses it |
|---|---|
| `/` | **Sign in.** Choose Player (room code, name, team, section) or Host (PIN required) |
| `/host` | Host panel after signing in. Runs the game, judges answers, edits questions. Sends you back to sign-in without a valid session |
| `/board?room=CODE` | Big screen / projector (the host panel links to it) |
| `/preview` | Practice mode with CPU teams (linked from the host panel) |

Players only ever see the sign-in form, their buzzer/answer screen, and a Leave button.
All game controls (rounds, scoring, new game, kick) exist only on the host panel.

## Deploy on Render

1. Put this folder in a GitHub repo.
2. In Render: **New → Blueprint**, pick the repo (it reads `render.yaml`).
   Or **New → Web Service** with build `npm install` and start `npm start`.
3. Set the environment variable **`HOST_PIN`** to the PIN you want (if unset, it is `1234`).
4. Open `https://<your-app>.onrender.com`, tap **Host**, enter the PIN, and open the big screen link it shows.

Free Render instances sleep after ~15 minutes idle; open the site a minute before the meeting.
Rooms live in memory, so a restart ends the current game. **Export your questions** from the Game editor
(they are also saved in the host browser).

## Running it locally

```
npm install
HOST_PIN=2468 npm start      # then visit http://localhost:3000
```

## Question packs

After the host enters the PIN they pick a pack; the room opens with it. The pack can be changed from the lobby.

| Pack | What's in it |
|---|---|
| ASA Classic | The original pan-Asian set + a hard tier with hints |
| Standard | General world trivia |
| East Asia | China, Japan, Korea, Taiwan, Mongolia, Hong Kong, Macau |
| South Asia | India, Pakistan, Bangladesh, Sri Lanka, Nepal, Bhutan, Maldives, Afghanistan |
| Africa | The whole continent |

Every round comes in two versions, **A** and **B**; the host picks one when starting the round.
Every board has **Music**, **Movies & TV**, **Ancient History**, and **Recent History**.
Pack sources live outside the site; `public/js/packs/*.js` and `public/js/sample-game.js` are generated files.

## Party games

The lobby has a **🎉 Party games** card in every pack, so you can play any of these between rounds and scores carry over. There is also a **Party Games** pack that has all of them. Each game has a General, an Asia and a Church set.

| Game | How it plays |
|---|---|
| ⚡ Speed Quiz | Every team answers multiple choice on phones. Faster correct answers score more. |
| 😀 Emoji Decode | Buzz-in lightning round: decode the emoji. |
| 🎯 Closest Guess | Type a number. Closest team wins; an exact hit scores double. |
| 🎭 Fake Out | Write a believable fake answer, then find the truth. You score for finding it and for fooling others. |
| 📋 Survey Says | The room answers a survey on phones. The host tidies the answers and then plays a Feud board with strikes and a bank. |
| 🤥 Two Truths & a Lie | Players write their own statements and the other teams vote on the lie. |
| 🎡 Wheel | Spin, call consonants, buy vowels and solve. The active team plays from its phones. |
| ✏️ Draw & Guess | One phone draws live onto the big screen and the other teams type guesses. |
| 🎵 Name That Tune | 12 songs per set (official YouTube uploads). The song plays on the big screen behind a cover, teams pick the title on their phones, and the video shows on reveal. The host has 🔁 Replay. To use your own songs, go to the Game editor, add the “Name That Tune” template and paste YouTube links (add `?t=45` to start at 0:45). |

The host can remove player-written entries, such as fakes and Two Truths, before they reach the screen. Party content lives in `packs-src/party-*.json` (format: `packs-src/PARTY.md`). Run `node packs-src/build.js` after editing it.

## Category Bingo (Asia)

Before you start, choose one of two modes.

### 🔔 Team board (default): buzz in, connect five
- **The board:** one shared board on the big screen, 5×5 (five in a row) or 4×4 (four in a row). The centre square of the 5×5 is a hard question.
- **Picking a square:** the team in control picks one, either on their phones or by shouting it to the host. The host reads the question and opens the buzzers. Early buzzes are locked out briefly.
- **Right answer:** the team claims the square in its colour (+100, or +200 for a hard square) and gets the next pick.
- **Wrong answer:** that team is locked out and the others can buzz in to steal. If nobody gets it, control passes to the next team.
- **Winning:** the first team with a full row, column or diagonal gets bingo (+500).
- **🎲 Random categories:** squares stay face-down until they're picked.
- **Phones:** just buzzers, plus the square picker for the team in control, so everyone keeps their eyes on the big screen.

### 📱 Everyone's own card

Players get a bingo card on their phone. The big screen calls the categories.

**How a turn works**
1. The host taps **🎲 Draw**. A category is picked and its 4-option question goes to every phone at once.
2. Players have 15 seconds to answer.
3. A right answer marks one square of that category. Each card has every category twice, so the player picks which square.
4. **🔥 Double down:** if right, mark 2 squares; if wrong, lose your last marked square.

**Close finishes:** once anyone is one square away, the next question is a hard one. The big screen shows how many players need just one more.

**Rounds:** any line, then four corners, then the X. Each bingo is worth +500 to the winner's team (a solo player is a team of one). The cards stay the same; only the marks reset.

**Questions:** 12 categories, 216 questions (12 normal + 6 hard each), all fact-checked. They're in `packs-src/bingo-*.json`; the format is in `packs-src/BINGO.md`.

**Simulated length:** with 25 players getting 60% right, the first bingo comes after about 10 questions (8–15).

## Blitz modes (Blooket-style)

Find them in the 🎉 Games menu in the lobby: pick General / Asia / Church once, then tap a game. Each mode has General, Asia and Church question sets. Before you press Start, choose **Individuals** or **Teams**. In team mode, every point a player earns also goes to their team's score.

| Mode | How it plays |
|---|---|
| 💰 Gold Quest | Players answer at their own pace. Each right answer opens a chest: gold, double, +%, steal, swap, or lose some. |
| 🏁 Racing | Each right answer moves you forward. The round ends when the top three finish. |
| 🏰 Tower Defense | Right answers earn coins, which buy Archer, Cannon and Wizard towers. A wave hits every 20 seconds. Fail three waves and your base falls. |
| 🎯 Classic | Everyone answers the same question, which the host advances. Faster correct answers score more. |
| ⚔️ Battle Royale | Each player has 3 hearts. A wrong answer costs a heart, and if everyone gets it right, the slowest player loses one. The last player standing wins. |

## Game features

- **Rounds:** board (Jeopardy grid), lightning (shared clock, rapid buzz-ins), bonus (every team answers on phones), final (wagers).
- **Clue types:** buzz-in, Daily Double (wager), multiple choice (answered on phones), picture/audio/video (paste a direct URL), timed clues.
- **Host decides:** Correct / Incorrect for whoever buzzed, plus "Host rulings" to mark any team right, wrong, or clear it at any time (points move immediately and can be re-judged without double counting), and +/−/Set on any team's score.
- **Buzzer lights:** the first team in lights up on the big screen and its phones glow; teams who miss are locked out for that clue.
- **Fair buzzing:** buzzes arriving within the fairness window (default 300 ms) are ranked by each phone's own measured reaction time, capped by what the server could physically observe, so slower Wi-Fi does not decide who was first. Buzzing before the host opens buzzers causes a short lockout.
- **Sections:** teams pick a section when they join; the big screen and host show section totals.
- **Motion:** tiles bounce in, clues fly out of their tile, sparkles and confetti on correct answers, crayon X on wrong ones, scores roll, and every popup is crumpled into a paper ball and tossed into a wastebasket when closed.

## Files

- `server.js` — Express + socket.io wiring
- `public/js/engine.js` — all game rules (shared by the server and the practice mode)
- `public/js/fx.js` — animations (sparkles, confetti, crumple-and-toss, lightning)
- `public/js/board.js`, `host.js`, `play.js`, `editor.js`, `views.js` — the screens
- `public/js/sample-game.js` — the starter questions
