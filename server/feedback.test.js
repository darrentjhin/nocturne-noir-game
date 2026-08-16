const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeFeedback } = require("./feedback");

test("structured feedback accepts only anonymous enumerated fields", () => {
  const clean = sanitizeFeedback({
    caseId: "the-last-reel",
    role: "A",
    clarity: "clear",
    challenge: "balanced",
    roleBalance: "equal",
    ending: "earned",
    continueSeries: "yes",
    name: "must not survive",
    notes: "must not survive"
  });
  assert.deepEqual(clean, {
    caseId: "the-last-reel",
    role: "A",
    clarity: "clear",
    challenge: "balanced",
    roleBalance: "equal",
    ending: "earned",
    continueSeries: "yes"
  });
  assert.equal(JSON.stringify(clean).includes("must not survive"), false);
});

test("structured feedback rejects incomplete or invented values", () => {
  assert.equal(sanitizeFeedback(null), null);
  assert.equal(sanitizeFeedback({ caseId: "the-last-reel" }), null);
  assert.equal(sanitizeFeedback({
    caseId: "case-three",
    role: "A",
    clarity: "clear",
    challenge: "balanced",
    roleBalance: "equal",
    ending: "earned",
    continueSeries: "yes"
  }), null);
});
