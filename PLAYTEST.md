# NOCTURNE release playtest

Use this pass with two people who have not read either case-data file. Separate devices are ideal. Run each file with a fresh pair when possible.

## Preflight

1. Run `npm run check`.
2. Start the game with `npm start`.
3. In another terminal, run `npm run smoke -- http://localhost:4173`.
4. Run `npm run smoke:case2 -- http://localhost:4173`.
5. Open a fresh case on one device and join through the copied invite link on the other.

Release preflight passes when the automated suite is green, both players receive different roles, and the case moves to the briefing without a refresh.

Choose different difficulty modes and confirm neither player can ready. Then choose the same mode. Have only one detective mark ready and confirm both remain on the briefing. The investigation should begin only when the second detective independently marks ready.

## First ten minutes

Watch without coaching beyond the in-game tutorial.

- Each player should understand that they own only half the investigation.
- The Street should choose a reconstruction focus, recognize a mismatched approach from its feedback, and use field notes to unlock another search.
- The Desk should choose an interview approach, recover from one composure misread, recognize gated follow-ups, and use the persistent transcript.
- When Present Evidence becomes appropriate, choose one wrong filed document first. The subject should reject its relevance without revealing the correct file; the right document should appear in the earned transcript.
- At least one exact clue, time, name, or number should be sent over the Radio Line.
- A player should be able to reopen filed evidence from Case Files.
- Each player should write a private note, close and reopen the notebook, and confirm it autosaved. The partner must not see it unless it is deliberately sent over Radio.
- Save a partner Radio message directly into Notes and confirm the exact speaker and message appear without copying or exposing the rest of the notebook.

If either player asks “what am I supposed to do?” before trying one of the visible Next moves, record the exact screen and wording that failed them.

## Mid-case pressure

- Confirm Act 2 opens only after combined progress.
- Confirm the locked supply closet cannot be bypassed without the partner's record.
- Confirm a confrontation remains locked until both its earlier testimony and evidence prerequisites exist.
- After A7 and B8 are filed, confirm Cross-Wire opens. The two players should receive different copies, need to speak aloud, and be unable to finish with only one correct half.
- Submit one plausible but incorrect Case Thread arrangement. It should identify one weak role without consuming evidence or revealing the right clue. Repeat the mistake once and confirm an optional nudge appears.
- Complete one Case Thread. Both players should see its conclusion.
- Try one plausible but unsupported Evidence Board pair. It should be rejected without consuming evidence, then complete one valid suspect-elimination link.
- Disconnect one device for 15 seconds, reconnect, and confirm it reclaims the same role and case state.
- Reopen the notebook after reconnecting and confirm that detective's private notes return unchanged.

The case should feel demanding because players must compare information and infer relationships—not because controls or goals are unclear.

## Final call

- The call remains locked until 14 evidence items, three Case Threads, the Cross-Wire, two suspect eliminations, and two contradictions are complete.
- One detective marking “Ready to Make Call” must leave both players on the board until the partner also agrees.
- Both players can review the same four-part theory: who, where, why, and how.
- Editing any answer clears both ready checks.
- One ready player cannot submit alone.
- Ready one detective, disconnect that device, and confirm its readiness clears. The connected detective must be unable to ready or resolve the call until the same role reconnects.
- The ending explains the submitted theory, the correct theory when needed, the supporting evidence, and why the two strongest alternative suspects fail.
- The ending compares sealed hunches, reports team activity, explains the completed Cross-Wire, and reveals the File 02 black-sun continuation hook.
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

## File 02 — The Black-Sun Ledger

Budget 45 minutes for play and 10 minutes for separate player notes.

### Entry and consent

- Open File 02 from the File 01 cover and confirm the visual identity and instructions are clearly different.
- Join through its invite link. Each player should receive the same seven-step tutorial with their own role label.
- Choose mismatched modes and confirm readiness stays disabled. Match modes, ready only one player, and confirm the operation does not begin until the second player readies.
- Confirm The Street sees a field dispatch while The Desk sees a ledger dispatch. Neither player should see the partner's facts or selected answer.

### Live checkpoints

- At checkpoint one, discuss the exact line number and protocol color before selecting.
- Intentionally submit one wrong pair. Both choices should reset, the alert should rise by one, and feedback must not reveal the correct pair.
- Lock only one correct half. The partner should see that the role is locked but not what they selected.
- Complete the pair. Both should receive the same field record, but neither should advance until both acknowledge it.
- Use the Radio Line and one private nudge. Verify the nudge repeats the communication task rather than solving the checkpoint.
- Write a different private note on each device. Close and reopen both notebooks and confirm each detective sees only their own page.
- Disconnect one player during checkpoint two, reconnect, and confirm role, checkpoint, alert, chat, and records are preserved.
- Finish all four checkpoints. Each should require a different exchange of labels, numbers, rules, or physical observations.

### Split final protocol

- Confirm The Street receives only recovery priority, shutdown-safe exit, and supporting-record questions.
- Confirm The Desk receives only controller, purpose, and supporting-record questions.
- Verify Field Record 01 explicitly supports the mechanical route that survives shutdown, and that both record-pair questions can be answered from the four accumulated records.
- Lock one final half. The other player should see only “sealed,” not the selected values.
- Seal the second half and confirm both players reach the same ending.
- Verify a prior alert changes a fully correct ending from “Silent Extraction” to “The City Hears the Alarm.”
- Confirm the ending explains the truth, reviews all six submitted decisions, reports team activity, and introduces File 03.
- Submit the anonymous player check-in and confirm it never asks for a name, operation code, written comment, Radio content, or private notes.
- Ready replay on one device only; the ending must remain until the partner also agrees.

### File 02 usability checks

- Complete a checkpoint and final protocol using keyboard controls.
- At 390 px width, confirm the private dispatch, joint decision, Radio Line, and records become one readable vertical flow without horizontal scrolling.
- Confirm no game information depends on sound, hover, color alone, or animation.
- Ask both players whether the alert created useful pressure or merely discouraged experimentation.

File 02 is ready when both players naturally read exact private details aloud, each role feels indispensable, one failed pair is recoverable without coaching, and the finale feels like the result of the four accumulated records.
