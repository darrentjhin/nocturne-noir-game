# NOCTURNE — "The Last Reel"

**Play now: https://nocturne-noir-game-production.up.railway.app**

A two-player online noir detective game, built from scratch (original story, art direction, and code — not a clone of any existing game). Deployed on Railway, auto-redeploys on every push to `main`.

## The twist

You and your partner play **two different detectives working the same case from different angles**:

- **Detective A — "The Street"** explores physical locations — walk into a scene and examine multiple hotspots (desks, drawers, booths, lockers), not just click-and-read.
- **Detective B — "The Desk"** works people — interviews, bank statements, personnel files, permits.

The two roles play differently. The Street chooses a reconstruction focus at each physical scene, tests whether objects answer that question, and uses earlier field notes to open deeper searches. The Desk conducts face-to-face, portrait-driven interviews by choosing Rapport, Direct, Pressure, or Present Evidence; a poor read changes the subject's composure but never permanently locks progress. Broad questions open follow-ups, testimony releases records, and evidence from the Street unlocks confrontations.

One scene is physically locked — its 3-digit code is buried in a document only the *other* detective can earn, so you have to radio it over. A second act of leads unlocks mid-case. Filed evidence remains searchable in **Case Files**. Three shared **Case Threads** require placing multiple clues into distinct reasoning roles; the **Evidence Board** is reserved for defensible links that eliminate two plausible suspects. Players must also break two interview contradictions before making a joint four-part accusation.

The browser receives only what the detectives have earned. Future clue text, field conclusions, interview answers, puzzle solutions, valid board pairs, deduction details, the solution, and ending text stay server-side until the corresponding action or ending is reached.

## Run it

```bash
npm install
npm start
```

Then open **http://localhost:4173** — one of you clicks "Open a Case" to get an invite link and 5-character code. The other opens the link or enters the code under "Join a Case." Separate devices are recommended; two tabs on one computer also work.

Shared transitions are unanimous: both detectives must ready the investigation, both must agree to open and submit the final accusation, and both must ready a case restart. One player cannot advance or reset the other player's screen alone.

The rebuilt case takes roughly **45–60 minutes** and requires exactly **two players**. The six-part in-game tutorial opens during the briefing and remains available from the investigation header.

## Optional durable rooms

Rooms stay in memory by default. To let an active case survive a server restart, point `ROOM_STORE_PATH` at durable storage:

```bash
ROOM_STORE_PATH=/data/nocturne-rooms.json npm start
```

On Railway, mount a volume at `/data` and add `ROOM_STORE_PATH=/data/nocturne-rooms.json` as a service variable. Persisted cases expire after 24 hours and reconnecting players reclaim their prior role. Never point this variable at ephemeral application storage if restart recovery matters.

Before shipping a change, run:

```bash
npm run check
```

This checks every JavaScript file and runs the game-logic regression suite.

For a complete real-time server path, start the game in one terminal and run this in another:

```bash
npm run smoke -- http://localhost:4173
```

The smoke test creates two independent clients and completes all 17 evidence finds, three Case Threads, two suspect eliminations, two contradictions, the combination puzzle, and a correct synchronized ending. See `PLAYTEST.md` for the human QA pass.

## Project structure

- `server/index.js` — Express + Socket.io server, room rules, and real-time relay.
- `server/clientCase.js` — strips future answers from client payloads and releases earned details through room state.
- `server/gameLogic.js` — testable validation, deduction, scoring, and board rules.
- `server/roomStore.js` — optional atomic JSON persistence for active rooms.
- `server/caseData.js` — the whole mystery: locations, people, clues, suspects, motives, and all three endings. Edit this to change the story.
- `public/` — the client (vanilla HTML/CSS/JS, no build step).
- `public/assets/interrogation-portraits.png` — original four-character portrait atlas used by the interview room.
- `public/assets/location-atlas.png` — original four-location environment atlas used by Street fieldwork.
- `scripts/socket-smoke.js` — full two-player protocol and ending smoke test.

## Adding a new case later

Everything about "The Last Reel" lives in `server/caseData.js`. To build a second case, duplicate that file's shape (roles, locations, field modes, people, clues, Case Threads, deductions, unlock thresholds, solution evidence, and endings) and swap it in — the server and client code don't need to change.
