# NOCTURNE — "The Last Reel"

**Play now: https://nocturne-noir-game-production.up.railway.app**

A two-player online noir detective game, built from scratch (original story, art direction, and code — not a clone of any existing game). Deployed on Railway, auto-redeploys on every push to `main`.

## The twist

You and your partner play **two different detectives working the same case from different angles**:

- **Detective A — "The Street"** explores physical locations — walk into a scene and examine multiple hotspots (desks, drawers, booths, lockers), not just click-and-read.
- **Detective B — "The Desk"** works people — interviews, bank statements, personnel files, permits.

Each location/person is a small scene with several things to examine: some hand over a real clue, some are pure atmosphere/flavor, and **one is physically locked** — the 3-digit code is buried in a document only the *other* detective can find, so you have to actually radio it over. A second act of leads (two more locations/people) unlocks mid-case once you've both found enough. Everything you find is browsable anytime in a proper **Case Files** gallery, styled by document type (ledger, transcript, photo, ticket, form...), plus the shared **corkboard** for drawing connections between clues in real time. At the end, you make one joint accusation together.

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
