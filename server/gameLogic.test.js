const test = require("node:test");
const assert = require("node:assert/strict");
const caseData = require("./caseData");
const {
  accusationUnlocked,
  approachForQuestion,
  bothPlayersReady,
  buildCaseIndex,
  canAskInterviewQuestion,
  canAdvancePhase,
  canRevealClue,
  canRevealFlavor,
  clampBoardPosition,
  cleanPlayerName,
  chooseRoleForJoin,
  deductionForLink,
  evaluateThreadDraft,
  fieldModeMatches,
  pinPositionForFoundCount,
  sanitizeAccusationUpdate,
  sanitizeThreadUpdate,
  scoreAccusation,
  threadSolutionMatches,
  validPuzzleHotspot
} = require("./gameLogic");

function room(overrides = {}) {
  return {
    phase: "investigation",
    actUnlocked: 1,
    found: { A: [], B: [] },
    questionsAsked: [],
    confrontationsSolved: [],
    deductionsSolved: [],
    threadsSolved: [],
    ...overrides
  };
}

test("every clue and hotspot has one valid role owner", () => {
  const index = buildCaseIndex(caseData);
  assert.equal(index.clues.size, Object.keys(caseData.clueText).length);
  for (const [clueId, meta] of index.clues) {
    assert.ok(caseData.clueText[clueId], `missing clue text for ${clueId}`);
    assert.ok(meta.role === "A" || meta.role === "B");
    assert.ok(meta.act === 1 || meta.act === 2);
  }
});

test("all 17 automatic board positions remain visible and unique", () => {
  const positions = Array.from({ length: 17 }, (_, i) => pinPositionForFoundCount(i + 1));
  assert.equal(new Set(positions.map((p) => `${p.x},${p.y}`)).size, 17);
  for (const position of positions) {
    assert.ok(position.x >= 8 && position.x <= 92);
    assert.ok(position.y >= 8 && position.y <= 92);
    assert.equal(position.moved, false);
  }
});

test("manual board moves are numeric, bounded, and marked as moved", () => {
  assert.deepEqual(clampBoardPosition(-20, 140), { x: 8, y: 92, moved: true });
  assert.deepEqual(clampBoardPosition(35, 70), { x: 35, y: 70, moved: true });
  assert.equal(clampBoardPosition(Number.NaN, 20), null);
});

test("clues, flavor, and puzzles respect role and act access", () => {
  const actOne = room();
  assert.equal(canRevealClue(actOne, "A", "A1"), true);
  assert.equal(canRevealClue(actOne, "B", "A1"), false);
  assert.equal(canRevealClue(actOne, "A", "A2"), false, "field evidence can require an earlier find");
  actOne.found.A.push("A1");
  assert.equal(canRevealClue(actOne, "A", "A2"), true);
  assert.equal(canRevealClue(actOne, "B", "B1"), false, "testimony clues must use the interview route");
  assert.equal(canRevealClue(actOne, "B", "B2"), false, "records can require earlier testimony");
  actOne.questionsAsked.push("victor-finance");
  assert.equal(canRevealClue(actOne, "B", "B2"), true);
  assert.equal(canRevealClue(actOne, "A", "A7"), false);
  assert.equal(canRevealClue(actOne, "A", "A9"), false, "locked clues must use the puzzle route");
  assert.equal(canRevealFlavor(actOne, "A", "theatre-boxoffice"), true);
  assert.equal(canRevealFlavor(actOne, "B", "theatre-boxoffice"), false);
  assert.equal(fieldModeMatches("A1", "access"), true);
  assert.equal(fieldModeMatches("A1", "mechanism"), false);
  assert.equal(validPuzzleHotspot(actOne, "A", "supplyCloset", "studio-closet", "timeline"), true);
  assert.equal(validPuzzleHotspot(actOne, "A", "supplyCloset", "studio-closet", "motive"), false);
  assert.equal(validPuzzleHotspot(actOne, "B", "supplyCloset", "studio-closet", "timeline"), false);
});

test("the accusation requires evidence, all deductions, and two broken contradictions", () => {
  const confrontationsSolved = ["ivy-alibi", "dane-payments"];
  const deductionsSolved = ["victor-cleared", "sal-cleared"];
  const threadsSolved = ["timeline", "money-trail", "reel-route"];
  const thirteen = room({
    actUnlocked: 2,
    found: { A: Array(7).fill("a"), B: Array(6).fill("b") },
    deductionsSolved,
    threadsSolved,
    confrontationsSolved
  });
  const fourteenNoDeduction = room({ actUnlocked: 2, found: { A: Array(7).fill("a"), B: Array(7).fill("b") } });
  const fourteenNoConfrontations = room({
    actUnlocked: 2,
    found: { A: Array(7).fill("a"), B: Array(7).fill("b") },
    deductionsSolved,
    threadsSolved
  });
  const fourteen = room({
    actUnlocked: 2,
    found: { A: Array(7).fill("a"), B: Array(7).fill("b") },
    deductionsSolved,
    threadsSolved,
    confrontationsSolved
  });
  assert.equal(accusationUnlocked(thirteen), false);
  assert.equal(accusationUnlocked(fourteenNoDeduction), false);
  assert.equal(accusationUnlocked(fourteenNoConfrontations), false);
  assert.equal(accusationUnlocked(fourteen), true);
  assert.equal(canAdvancePhase(thirteen, "accusation"), false);
  assert.equal(canAdvancePhase(fourteen, "accusation"), false, "forward transition uses two-player call readiness");
  assert.equal(canAdvancePhase({ ...fourteen, phase: "accusation" }, "investigation"), true);
  assert.equal(canAdvancePhase(fourteen, "ending"), false);
});

test("interview questions unlock in stages and cannot be farmed", () => {
  const interview = room();
  assert.equal(canAskInterviewQuestion(interview, "B", "victor", "victor-where"), true);
  assert.equal(canAskInterviewQuestion(interview, "A", "victor", "victor-where"), false);
  assert.equal(canAskInterviewQuestion(interview, "B", "victor", "victor-finance"), false);
  interview.questionsAsked.push("victor-where");
  assert.equal(canAskInterviewQuestion(interview, "B", "victor", "victor-where"), false);
  assert.equal(canAskInterviewQuestion(interview, "B", "victor", "victor-finance"), true);
  assert.equal(canAskInterviewQuestion(interview, "B", "ivy", "victor-finance"), false);
});

test("interview approaches reward reading the line without exposing a hidden answer field", () => {
  const index = buildCaseIndex(caseData);
  assert.equal(approachForQuestion(index.questions.get("sal-renata")), "rapport");
  assert.equal(approachForQuestion(index.questions.get("sal-threat")), "pressure");
  assert.equal(approachForQuestion(index.questions.get("victor-where")), "direct");
  assert.equal(approachForQuestion(index.questions.get("dane-note")), "evidence");
});

test("case threads accept only found evidence and require every slot to support the theory", () => {
  const state = room({ found: { A: ["A9"], B: ["B3", "B4"] } });
  assert.deepEqual(sanitizeThreadUpdate(state, "timeline", { claim: "B3", contradiction: "A9", verification: "B4", injected: "A1" }), {
    claim: "B3",
    contradiction: "A9",
    verification: "B4"
  });
  assert.equal(threadSolutionMatches("timeline", { claim: "B3", contradiction: "A9", verification: "B4" }), true);
  assert.equal(threadSolutionMatches("timeline", { claim: "A9", contradiction: "B3", verification: "B4" }), false);
  assert.deepEqual(evaluateThreadDraft("timeline", { claim: "B3", contradiction: "A9", verification: "B4" }), {
    matched: 3,
    total: 3,
    weakSlotId: null,
    weakLabel: null
  });
  assert.deepEqual(evaluateThreadDraft("timeline", { claim: "A9", contradiction: "B3", verification: "B4" }), {
    matched: 1,
    total: 3,
    weakSlotId: "claim",
    weakLabel: "The original claim"
  });
});

test("every interrogation prerequisite references real case content", () => {
  const index = buildCaseIndex(caseData);
  const questionIds = new Set(index.questions.keys());
  assert.equal(questionIds.size, caseData.people.reduce((total, person) => total + person.interrogation.questions.length, 0));
  for (const question of index.questions.values()) {
    (question.requiresQuestions || []).forEach((id) => assert.ok(questionIds.has(id), `missing prerequisite question ${id}`));
    (question.requiresClues || []).forEach((id) => assert.ok(caseData.clueText[id], `missing prerequisite clue ${id}`));
    if (question.clueId) assert.ok(caseData.clueText[question.clueId], `missing interview clue ${question.clueId}`);
  }
});

test("the complete two-role critical path is solvable without exhaustive clicking", () => {
  const state = room();
  const ask = (personId, questionId) => {
    assert.equal(canAskInterviewQuestion(state, "B", personId, questionId), true, `question blocked: ${questionId}`);
    const question = buildCaseIndex(caseData).questions.get(questionId);
    state.questionsAsked.push(questionId);
    if (question.clueId) state.found.B.push(question.clueId);
    if (question.confrontationId) state.confrontationsSolved.push(question.confrontationId);
  };
  const find = (role, clueId) => {
    assert.equal(canRevealClue(state, role, clueId), true, `clue blocked: ${clueId}`);
    state.found[role].push(clueId);
  };

  find("A", "A1");
  find("A", "A2");
  find("A", "A3");
  find("A", "A5");
  find("A", "A6");
  ask("victor", "victor-where");
  ask("victor", "victor-finance");
  find("B", "B2");
  find("A", "A4");
  ask("victor", "victor-insurance");
  ask("ivy", "ivy-timeline");
  ask("ivy", "ivy-relationship");
  ask("ivy", "ivy-reel");
  find("B", "B4");
  ask("sal", "sal-renata");
  ask("sal", "sal-debt");
  ask("sal", "sal-records");
  find("B", "B6");
  state.actUnlocked = 2;
  state.found.A.push("A9"); // Validated through the separate cross-role combination puzzle route.
  find("A", "A7");
  find("A", "A8");
  ask("dane", "dane-renata");
  ask("dane", "dane-gala");
  ask("dane", "dane-permit");
  find("B", "B8");
  ask("ivy", "ivy-courier");
  ask("dane", "dane-ivy");
  ask("dane", "dane-note");
  state.deductionsSolved.push("victor-cleared", "sal-cleared");
  state.threadsSolved.push("timeline", "money-trail", "reel-route");

  assert.ok(state.found.A.length + state.found.B.length >= caseData.accusationUnlockThreshold);
  assert.deepEqual(state.confrontationsSolved, ["ivy-alibi", "dane-payments"]);
  assert.equal(accusationUnlocked(state), true);
});

test("correct board links unlock deductions in either direction", () => {
  assert.equal(deductionForLink("A2", "B1").id, "victor-cleared");
  assert.equal(deductionForLink("B6", "A5").id, "sal-cleared");
  assert.equal(deductionForLink("A4", "B2"), null, "theory evidence belongs in structured threads");
  assert.equal(deductionForLink("A4", "B3"), null);
  assert.equal(deductionForLink("A4", "A4"), null);
  for (const deduction of caseData.deductions) {
    assert.equal(deduction.clueIds.length, 2);
    deduction.clueIds.forEach((clueId) => assert.ok(caseData.clueText[clueId], `missing deduction clue ${clueId}`));
  }
});

test("accusation updates only accept known answer values", () => {
  assert.deepEqual(sanitizeAccusationUpdate({ suspect: "ivy", readyA: true, extra: "no" }), { suspect: "ivy" });
  assert.deepEqual(sanitizeAccusationUpdate({ suspect: "nobody", location: "docks", motive: "debt", method: "staged-sabotage" }), {
    location: "docks",
    motive: "debt",
    method: "staged-sabotage"
  });
  assert.deepEqual(sanitizeAccusationUpdate(null), {});
});

test("accusations produce the intended three ending tiers", () => {
  assert.equal(scoreAccusation({ suspect: "ivy", location: "docks", motive: "silence-footage", method: "staged-sabotage" }), "correct");
  assert.equal(scoreAccusation({ suspect: "ivy", location: "studio", motive: "jealousy" }), "partial");
  assert.equal(scoreAccusation({ suspect: "victor", location: "docks", motive: "silence-footage" }), "wrong");
});

test("player names are normalized and bounded", () => {
  assert.equal(cleanPlayerName("  Ada   Noir  ", "A"), "Ada Noir");
  assert.equal(cleanPlayerName("", "B"), "Detective B");
  assert.equal(cleanPlayerName({ unsafe: true }, "A"), "Detective A");
  assert.equal(cleanPlayerName("x".repeat(40), "A").length, 24);
});

test("disconnected roles require their private resume token", () => {
  const players = {
    A: { name: "Mara", connected: false, resumeToken: "secret-a" },
    B: { name: "Jules", connected: false, resumeToken: "secret-b" }
  };
  assert.equal(chooseRoleForJoin(players, "A", "wrong"), null);
  assert.deepEqual(chooseRoleForJoin(players, "A", "secret-a"), { role: "A", reclaim: true });
  assert.deepEqual(chooseRoleForJoin({ A: players.A, B: null }, "A", "wrong"), { role: "B", reclaim: false });
  assert.deepEqual(chooseRoleForJoin({ A: null, B: null }, null, null), { role: "A", reclaim: false });
  assert.equal(chooseRoleForJoin({ A: { ...players.A, connected: true }, B: null }, "A", "secret-a"), null, "an active tab cannot clone its identity into the other role");
});

test("shared transitions require two connected, ready detectives", () => {
  const state = {
    players: {
      A: { connected: true },
      B: { connected: true }
    },
    briefingReady: { A: true, B: false },
    callReady: { A: true, B: true },
    restartReady: { A: true, B: true }
  };
  assert.equal(bothPlayersReady(state, "briefingReady"), false);
  assert.equal(bothPlayersReady(state, "callReady"), true);
  state.players.B.connected = false;
  assert.equal(bothPlayersReady(state, "callReady"), false);
  assert.equal(bothPlayersReady(state, "restartReady"), false);
});

test("the solution is supported by explicit cross-role evidence", () => {
  assert.match(caseData.clueText.A4.text, /Dane|D\.|dailies/i);
  assert.match(caseData.clueText.A4.text, /final reel/i);
  assert.match(caseData.clueText.B2.text, /I\.C\. Post/i);
  assert.match(caseData.clueText.B4.text, /Voss, M\./i);
  assert.match(caseData.clueText.B4.text, /looping note/i);
  assert.equal(caseData.deductions.length, 2);
  assert.equal(caseData.investigationThreads.length, 3);
  assert.equal(caseData.solution.suspect, "ivy");
  assert.equal(caseData.solution.location, "docks");
  assert.equal(caseData.solution.motive, "silence-footage");
  assert.equal(caseData.solution.method, "staged-sabotage");
});
