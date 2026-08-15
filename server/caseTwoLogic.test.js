const test = require("node:test");
const assert = require("node:assert/strict");
const caseTwoData = require("./caseTwoData");
const {
  caseTwoDifficultyConfirmed,
  caseTwoEndingReveal,
  createClientCaseTwo,
  freshCaseTwoRoom,
  publicCaseTwoRoomState,
  sanitizeFinalDraft,
  scoreFinalProtocol,
  stagePairMatches,
  validStageChoice
} = require("./caseTwoLogic");

test("File 02 sends each detective only their own private operation copy", () => {
  const street = createClientCaseTwo(caseTwoData, "A");
  const desk = createClientCaseTwo(caseTwoData, "B");
  const generic = createClientCaseTwo(caseTwoData);
  assert.equal(street.stages.length, 4);
  assert.match(street.stages[0].roleBrief.facts.join(" "), /COBALT/);
  assert.doesNotMatch(street.stages[0].roleBrief.facts.join(" "), /facility index/i);
  assert.match(desk.stages[0].roleBrief.facts.join(" "), /access index/i);
  assert.equal(generic.stages[0].roleBrief, null);
  assert.equal(street.stages[0].answers, undefined);
  assert.equal(street.stages[0].outcome, undefined);
  assert.equal(street.stages[0].failure, undefined);
  assert.equal(street.finalProtocol.answers, undefined);
  assert.equal(street.solution, undefined);
  assert.equal(street.nextHook, undefined);
});

test("every private stage answer belongs to its visible role choices", () => {
  const ids = new Set();
  for (const stage of caseTwoData.stages) {
    assert.equal(ids.has(stage.id), false);
    ids.add(stage.id);
    for (const role of ["A", "B"]) {
      const choices = stage.roles[role].choices.map((choice) => choice.id);
      assert.ok(choices.includes(stage.answers[role]), `${stage.id} ${role} answer is playable`);
      assert.equal(new Set(choices).size, choices.length);
    }
  }
});

test("File 02 rooms begin sealed and require unanimous difficulty", () => {
  const room = freshCaseTwoRoom("BL4CK");
  assert.equal(room.caseId, caseTwoData.id);
  assert.equal(room.phase, "lobby");
  assert.deepEqual(room.stageLocks, { A: null, B: null });
  assert.equal(caseTwoDifficultyConfirmed(room), false);
  room.difficultyVotes = { A: "field", B: "field" };
  room.difficulty = "field";
  assert.equal(caseTwoDifficultyConfirmed(room), true);
});

test("checkpoint choices validate per role and resolve only as a correct pair", () => {
  const room = freshCaseTwoRoom("BL4CK");
  assert.equal(validStageChoice(room, "A", "cobalt-door"), true);
  assert.equal(validStageChoice(room, "A", "saint-orison"), false);
  room.stageLocks = { A: "cobalt-door", B: "north-pier" };
  assert.equal(stagePairMatches(room), false);
  room.stageLocks.B = "saint-orison";
  assert.equal(stagePairMatches(room), true);
});

test("the split final protocol rejects partial or cross-role answers", () => {
  assert.deepEqual(sanitizeFinalDraft("A", { priority: "rescue-witness", exit: "bell-tunnel" }), {
    priority: "rescue-witness",
    exit: "bell-tunnel"
  });
  assert.equal(sanitizeFinalDraft("A", { priority: "rescue-witness" }), null);
  assert.equal(sanitizeFinalDraft("A", { priority: "commissioner-rook", exit: "bell-tunnel" }), null);
});

test("final outcomes reflect both deductions and operational exposure", () => {
  const room = freshCaseTwoRoom("BL4CK");
  room.finalDrafts = JSON.parse(JSON.stringify(caseTwoData.finalProtocol.answers));
  assert.equal(scoreFinalProtocol(room), "clean");
  room.alertLevel = 1;
  assert.equal(scoreFinalProtocol(room), "exposed");
  room.finalDrafts.A.priority = "ledger-first";
  room.finalDrafts.A.exit = "service-arcade";
  assert.equal(scoreFinalProtocol(room), "partial");
  room.finalDrafts.B.controller = "clerk-vale";
  assert.equal(scoreFinalProtocol(room), "failed");
});

test("public room state exposes lock booleans but not private choices", () => {
  const room = freshCaseTwoRoom("BL4CK");
  room.players.A = { name: "Mara", connected: true };
  room.players.B = { name: "Jules", connected: true };
  room.stageLocks.A = "cobalt-door";
  const state = publicCaseTwoRoomState(room);
  assert.deepEqual(state.stageLocks, { A: true, B: false });
  assert.equal(JSON.stringify(state).includes("cobalt-door"), false);
  assert.equal(state.endingReveal, null);
});

test("the ending reveals the truth, scored decisions, debrief, and File 03 hook", () => {
  const room = freshCaseTwoRoom("BL4CK");
  room.phase = "ending";
  room.result = "clean";
  room.difficulty = "field";
  room.startedAt = 1000;
  room.completedAt = 121000;
  room.finalDrafts = JSON.parse(JSON.stringify(caseTwoData.finalProtocol.answers));
  const reveal = caseTwoEndingReveal(room);
  assert.equal(reveal.debrief.durationMs, 120000);
  assert.equal(reveal.decisionReview.length, 4);
  assert.ok(reveal.decisionReview.every((item) => item.correct));
  assert.equal(reveal.solution.controller, "commissioner-rook");
  assert.equal(reveal.nextHook.title, "The City Without Rain");
});
