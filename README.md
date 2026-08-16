# NOCTURNE — Two-Detective Case Files

**Play now: https://nocturne-noir-game-production.up.railway.app**

NOCTURNE is an original online mystery series for exactly two players on separate devices. The same detectives return across connected cases, but every file uses a different cooperative gameplay structure. The project is deployed on Railway and auto-redeploys when `main` is pushed.

## The detectives

- **The Street** works inside the danger: physical scenes, access, reconstruction, and field decisions.
- **The Desk** works the invisible system: people, records, contradictions, identities, and remote guidance.

Each player receives private information. The server sends neither role the partner's private copy, and hidden answers stay server-side until they are legitimately earned or revealed at the ending.

## File 01 — The Last Reel

**Type:** evidence investigation · **Length:** roughly 50–70 minutes

A filmmaker vanishes before her premiere. The Street reconstructs physical scenes by choosing a field focus; The Desk conducts portrait-driven interviews using Rapport, Direct, Pressure, or an exact piece of filed evidence. The pair must recover 17 records, break two contradictions, establish three structured Case Threads, eliminate two alternate suspects, and complete a private Cross-Wire before agreeing on a four-part accusation.

Additional systems include three unanimous difficulty modes, searchable Case Files, lead states, adaptive nudges, private opening hunches, a private autosaving detective notebook, one-click Radio-to-Notes capture, a joint ending debrief, reconnect support, and mutual readiness for every major transition. Final-call readiness is cleared on disconnect and cannot be restored until both detectives are back on the line.

## File 02 — The Black-Sun Ledger

**Type:** live asymmetric infiltration · **Length:** roughly 35–50 minutes

Three nights later, the black-sun stamp leads to an abandoned telephone exchange that is erasing protected witnesses from city records. The Street enters the building while The Desk operates a stolen ledger and ghost circuit.

This is a different game, not a reskin of File 01:

- Four sequential live checkpoints give each detective different facts, questions, and answer choices.
- Players must describe their private dispatches, choose independently, and lock a correct pair.
- A wrong pair resets both choices and raises a shared alert level that changes the ending.
- A solved checkpoint reveals a shared field record, but the next location opens only after both players acknowledge it.
- Each detective has a private autosaving notebook that survives reconnects without exposing its contents to the partner; crucial Radio transmissions can be filed into it directly.
- The finale is split into six evidence-based decisions: The Street seals the recovery priority, shutdown-safe route, and supporting records while The Desk identifies the controller, purpose, and the records proving both.
- Tutorial, difficulty, checkpoint advance, final resolution, and replay all preserve two-player consent.
- The ending offers a five-field anonymous check-in about clarity, challenge, role balance, payoff, and interest in the next file; no name, room code, Radio content, notes, or private case data is collected.

File 02 is available from the Case Files selector on the File 01 cover or directly at `/case-two.html`.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4173`. One player opens a case and sends the five-character code or invite link to the other. Separate devices are recommended; two independent browser tabs also work.

## Release verification

Run syntax, security-boundary, persistence, state-machine, UI-contract, and game-logic tests:

```bash
npm run check
```

With the server running, execute both complete two-player paths:

```bash
npm run smoke -- http://localhost:4173
npm run smoke:case2 -- http://localhost:4173
```

The File 01 smoke completes every clue, interview prerequisite, contradiction, theory, deduction, Cross-Wire half, mutual transition, accusation, ending, notebook privacy, and replay. The File 02 smoke tests wrong-case routing, mismatched difficulty, private role payloads and notebooks, a recoverable paired failure, all four checkpoints, mutual acknowledgements, the split final protocol, ending, and replay.

GitHub Actions runs the same locked install, checks, production dependency audit, health probe, and both complete two-player smoke paths on every pull request and every push to `main`. Railway uses `railway.json` for its start command, health gate, graceful overlap/draining window, and restart policy.

See `PLAYTEST.md` for the human two-device QA pass.

## Optional durable rooms

Rooms stay in memory by default. To let an active case survive a server restart, point `ROOM_STORE_PATH` at durable storage:

```bash
ROOM_STORE_PATH=/data/nocturne-rooms.json npm start
```

On Railway, mount a volume at `/data` and set `ROOM_STORE_PATH=/data/nocturne-rooms.json`. Set `FEEDBACK_STORE_PATH=/data/nocturne-feedback.jsonl` to retain the anonymous structured check-ins on the same volume. Both case formats are normalized on restore, stale sockets are removed, resume tokens are preserved, and abandoned rooms expire after 24 hours.

## Project structure

- `server/index.js` — Express, Socket.IO, room routing, and both real-time game protocols.
- `server/caseData.js` / `server/gameLogic.js` — File 01 mystery and validation.
- `server/caseTwoData.js` / `server/caseTwoLogic.js` — File 02 story, private checkpoints, scoring, and client-safe payloads.
- `server/clientCase.js` — File 01 earned-information boundary.
- `server/roomStore.js` — atomic optional persistence for both room formats.
- `public/index.html`, `public/app.js`, `public/style.css` — File 01 client and Case Files selector.
- `public/case-two.html`, `public/case-two.js`, `public/case-two.css` — dedicated File 02 operations interface.
- `public/assets/` — original detective, character, and location art.
- `scripts/socket-smoke.js` — full File 01 two-player path.
- `scripts/socket-smoke-case-two.js` — full File 02 two-player path.

## Series direction

File 01 establishes the black-sun stamp. File 02 reveals the witness-erasure network behind it. File 02's ending plants File 03, **The City Without Rain**, while preserving The Street and The Desk as the continuing leads.
