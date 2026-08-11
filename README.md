# NOCTURNE — "The Last Reel"

**Play now: https://nocturne-noir-game-production.up.railway.app**

A two-player online noir detective game, built from scratch (original story, art direction, and code — not a clone of any existing game). Deployed on Railway, auto-redeploys on every push to `main`.

## The twist

You and your partner play **two different detectives working the same case from different angles**:

- **Detective A — "The Street"** investigates physical locations (a theatre, a studio, an apartment, the docks).
- **Detective B — "The Desk"** investigates people (interviews and paper trails on four suspects).

Each of you finds different clues. They land on a **shared corkboard in real time**, where you drag cards around and draw string connections between them, plus a live chat line — so you actually have to talk to each other to solve it. At the end, you make one joint accusation together.

## Run it

```bash
npm install
npm start
```

Then open **http://localhost:4173** — one of you clicks "Open a Case" to get a 5-letter code, the other clicks "Join a Case" and enters it. Works across two devices on the same network, or on the same machine in two tabs.

## Project structure

- `server/index.js` — Express + Socket.io server, in-memory room state, real-time relay.
- `server/caseData.js` — the whole mystery: locations, people, clues, suspects, motives, and all three endings. Edit this to change the story.
- `public/` — the client (vanilla HTML/CSS/JS, no build step).

## Adding a new case later

Everything about "The Last Reel" lives in `server/caseData.js`. To build a second case, duplicate that file's shape (roles, locations, people, clues, solution, endings) and swap it in — the server and client code don't need to change.
