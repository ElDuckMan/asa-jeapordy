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
