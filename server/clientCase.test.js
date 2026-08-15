const test = require("node:test");
const assert = require("node:assert/strict");
const caseData = require("./caseData");
const {
  createClientCase,
  deductionDetailsForRoom,
  endingRevealForRoom,
  evidenceDetailsForRoom,
  fieldResultsForRoom,
  interviewResultsForRoom,
  threadDetailsForRoom
} = require("./clientCase");

test("the public case payload does not reveal answers or valid evidence pairs", () => {
  const clientCase = createClientCase(caseData);
  assert.equal(clientCase.solution, undefined);
  assert.equal(clientCase.solutionEvidence, undefined);
  assert.equal(clientCase.solutionContributions, undefined);
  assert.equal(clientCase.endings, undefined);
  assert.equal(clientCase.puzzles.supplyCloset.code, undefined);
  assert.ok(clientCase.deductions.every((deduction) => deduction.clueIds === undefined));
  assert.ok(clientCase.deductions.every((deduction) => deduction.title === undefined && deduction.text === undefined));
  assert.ok(Object.values(clientCase.clueText).every((clue) => clue.text === undefined));
  assert.ok(clientCase.locations.flatMap((location) => location.hotspots).every((hotspot) => hotspot.result === undefined));
  assert.ok(clientCase.locations.flatMap((location) => location.hotspots).every((hotspot) => hotspot.mode === undefined));
  assert.ok(clientCase.investigationThreads.every((thread) => thread.result === undefined));
  assert.ok(clientCase.investigationThreads.flatMap((thread) => thread.slots).every((slot) => slot.clueId === undefined));
  for (const person of clientCase.people) {
    for (const question of person.interrogation.questions) {
      assert.equal(question.response, undefined);
      assert.equal(question.after, undefined);
      assert.equal(question.tag, undefined);
      assert.ok(question.topic);
    }
  }
});

test("only earned evidence, deductions, and threads return their full details", () => {
  const room = { found: { A: ["A1", "A2"], B: ["B1"] }, deductionsSolved: ["victor-cleared"], threadsSolved: ["timeline"] };
  const evidence = evidenceDetailsForRoom(caseData, room);
  assert.deepEqual(Object.keys(evidence), ["A1", "A2", "B1"]);
  assert.ok(evidence.A1.text);
  assert.equal(evidence.A3, undefined);
  const deductions = deductionDetailsForRoom(caseData, room);
  assert.deepEqual(deductions.map((deduction) => deduction.id), ["victor-cleared"]);
  assert.ok(deductions[0].text);
  const threads = threadDetailsForRoom(caseData, room);
  assert.deepEqual(threads.map((thread) => thread.id), ["timeline"]);
  assert.ok(threads[0].result);
  const fieldResults = fieldResultsForRoom(caseData, room);
  assert.equal(fieldResults.A1, caseData.locations[0].hotspots.find((hotspot) => hotspot.clueId === "A1").result);
  assert.equal(fieldResults.A2, caseData.locations[0].hotspots.find((hotspot) => hotspot.clueId === "A2").result);
  assert.equal(fieldResults.A3, undefined);
});

test("only asked interviews are returned to players", () => {
  const room = { questionsAsked: ["ivy-timeline", "sal-renata"] };
  const results = interviewResultsForRoom(caseData, room);
  assert.deepEqual(results.map((result) => result.id), room.questionsAsked);
  assert.ok(results.every((result) => result.response && result.after));
  assert.equal(results.some((result) => result.id === "ivy-courier"), false);
});

test("the solution reveal appears only after the ending is reached", () => {
  assert.equal(endingRevealForRoom(caseData, { phase: "accusation", result: null }), null);
  const reveal = endingRevealForRoom(caseData, { phase: "ending", result: "correct" });
  assert.equal(reveal.solution.suspect, "ivy");
  assert.equal(reveal.ending.title, caseData.endings.correct.title);
  assert.deepEqual(reveal.solutionContributions, caseData.solutionContributions);
});
