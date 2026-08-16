const VALID_CASES = new Set(["the-last-reel", "black-sun-ledger"]);
const VALID_ROLES = new Set(["A", "B"]);
const VALID_CLARITY = new Set(["clear", "some-confusion", "confusing"]);
const VALID_CHALLENGE = new Set(["too-easy", "balanced", "too-hard"]);
const VALID_BALANCE = new Set(["equal", "mostly-equal", "unequal"]);
const VALID_ENDING = new Set(["earned", "mixed", "unearned"]);
const VALID_CONTINUE = new Set(["yes", "maybe", "no"]);
const VALID_EXIT_REASONS = new Set(["returning-later", "partner-left", "instructions-unclear", "too-difficult", "too-long", "technical-issue"]);

function sanitizeFeedback(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.kind === "exit") {
    const exit = {
      kind: "exit",
      caseId: typeof payload.caseId === "string" ? payload.caseId : "",
      role: typeof payload.role === "string" ? payload.role : "",
      reason: typeof payload.reason === "string" ? payload.reason : ""
    };
    return VALID_CASES.has(exit.caseId) && VALID_ROLES.has(exit.role) && VALID_EXIT_REASONS.has(exit.reason) ? exit : null;
  }
  const entry = {
    kind: "completion",
    caseId: typeof payload.caseId === "string" ? payload.caseId : "",
    role: typeof payload.role === "string" ? payload.role : "",
    clarity: typeof payload.clarity === "string" ? payload.clarity : "",
    challenge: typeof payload.challenge === "string" ? payload.challenge : "",
    roleBalance: typeof payload.roleBalance === "string" ? payload.roleBalance : "",
    ending: typeof payload.ending === "string" ? payload.ending : "",
    continueSeries: typeof payload.continueSeries === "string" ? payload.continueSeries : ""
  };
  if (
    !VALID_CASES.has(entry.caseId) ||
    !VALID_ROLES.has(entry.role) ||
    !VALID_CLARITY.has(entry.clarity) ||
    !VALID_CHALLENGE.has(entry.challenge) ||
    !VALID_BALANCE.has(entry.roleBalance) ||
    !VALID_ENDING.has(entry.ending) ||
    !VALID_CONTINUE.has(entry.continueSeries)
  ) return null;
  return entry;
}

module.exports = { sanitizeFeedback };
