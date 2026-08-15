# NOCTURNE release playtest

Use this pass with two people who have not read `server/caseData.js`. Separate devices are ideal. Budget 60 minutes for play and 10 minutes for notes.

## Preflight

1. Run `npm run check`.
2. Start the game with `npm start`.
3. In another terminal, run `npm run smoke -- http://localhost:4173`.
4. Open a fresh case on one device and join through the copied invite link on the other.

Release preflight passes when the automated suite is green, both players receive different roles, and the case moves to the briefing without a refresh.

Before investigating, have only one detective mark ready. Confirm both remain on the briefing. The investigation should begin only when the second detective independently marks ready.

## First ten minutes

Watch without coaching beyond the in-game tutorial.

- Each player should understand that they own only half the investigation.
- The Street should choose a reconstruction focus, recognize a mismatched approach from its feedback, and use field notes to unlock another search.
- The Desk should choose an interview approach, recover from one composure misread, recognize gated follow-ups, and use the persistent transcript.
- At least one exact clue, time, name, or number should be sent over the Radio Line.
- A player should be able to reopen filed evidence from Case Files.

If either player asks “what am I supposed to do?” before trying one of the visible Next moves, record the exact screen and wording that failed them.

## Mid-case pressure

- Confirm Act 2 opens only after combined progress.
- Confirm the locked supply closet cannot be bypassed without the partner's record.
- Confirm a confrontation remains locked until both its earlier testimony and evidence prerequisites exist.
- Submit one plausible but incorrect Case Thread arrangement. It should be rejected without consuming evidence or revealing the answer.
- Complete one Case Thread. Both players should see its conclusion.
- Try one plausible but unsupported Evidence Board pair. It should be rejected without consuming evidence, then complete one valid suspect-elimination link.
- Disconnect one device for 15 seconds, reconnect, and confirm it reclaims the same role and case state.

The case should feel demanding because players must compare information and infer relationships—not because controls or goals are unclear.

## Final call

- The call remains locked until 14 evidence items, three Case Threads, two suspect eliminations, and two contradictions are complete.
- One detective marking “Ready to Make Call” must leave both players on the board until the partner also agrees.
- Both players can review the same four-part theory: who, where, why, and how.
- Editing any answer clears both ready checks.
- One ready player cannot submit alone.
- The ending explains the submitted theory, the correct theory when needed, the supporting evidence, and why the two strongest alternative suspects fail.
- One player marking “Play Again” must not remove the other from the ending recap; restart only after both agree.

## Accessibility and device checks

- Complete one search, one interview question, one evidence link, and the accusation using keyboard controls.
- Press Escape on each modal type and confirm focus returns to the control that opened it.
- At 390 px width, confirm fieldwork and interrogation stack vertically, buttons remain reachable, and board pins do not overlap into an unusable pile.
- With reduced motion enabled, confirm ambient animations and transitions no longer distract.
- With sound off, confirm no gameplay information depends on audio.

## Exit questions

Ask each player separately:

1. Who did you suspect at the 15-minute mark, and why?
2. Which discovery changed your theory?
3. Where did you feel stuck for more than two minutes?
4. Did your role feel equally important?
5. Did the final explanation feel earned?

Ship when both roles can finish without outside hints, neither role feels like a checklist, and players can explain the culprit using cross-role evidence rather than guessing.
