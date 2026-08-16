const caseTwoData = require("./caseTwoData");

const VALID_ROLES = new Set(["A", "B"]);
const difficultyIds = new Set(caseTwoData.difficultyOptions.map((option) => option.id));

function stageAt(room) {
  return caseTwoData.stages[room.stageIndex] || null;
}

function freshCaseTwoActivity() {
  return {
    A: { locks: 0, radioMessages: 0, hintsUsed: 0 },
    B: { locks: 0, radioMessages: 0, hintsUsed: 0 },
    pairAttempts: 0
  };
}

function freshCaseTwoRoom(code) {
  return {
    code,
    caseId: caseTwoData.id,
    phase: "lobby",
    players: { A: null, B: null },
    difficultyVotes: { A: null, B: null },
    difficulty: null,
    briefingReady: { A: false, B: false },
    stageIndex: 0,
    stageLocks: { A: null, B: null },
    stageResolved: false,
    stageAcknowledged: { A: false, B: false },
    stageHistory: [],
    lastFailure: null,
    alertLevel: 0,
    chat: [],
    notes: { A: "", B: "" },
    finalDrafts: { A: null, B: null },
    finalLocked: { A: false, B: false },
    restartReady: { A: false, B: false },
    activity: freshCaseTwoActivity(),
    startedAt: null,
    completedAt: null,
    result: null,
    updatedAt: Date.now()
  };
}

function createClientCaseTwo(data, role) {
  const validRole = VALID_ROLES.has(role) ? role : null;
  return {
    id: data.id,
    episode: data.episode,
    title: data.title,
    subtitle: data.subtitle,
    estimatedMinutes: data.estimatedMinutes,
    roles: data.roles,
    difficultyOptions: data.difficultyOptions,
    briefing: data.briefing,
    tutorial: data.tutorial,
    stages: data.stages.map(({ answers, outcome, failure, roles, ...stage }) => ({
      ...stage,
      roleBrief: validRole ? roles[validRole] : null
    })),
    finalProtocol: {
      headline: data.finalProtocol.headline,
      body: data.finalProtocol.body,
      roleBrief: validRole ? data.finalProtocol.roles[validRole] : null
    }
  };
}

function caseTwoDifficultyConfirmed(room) {
  const votes = room && room.difficultyVotes;
  return !!(votes && difficultyIds.has(votes.A) && votes.A === votes.B && room.difficulty === votes.A);
}

function validStageChoice(room, role, choiceId) {
  const stage = stageAt(room);
  if (!stage || !VALID_ROLES.has(role) || typeof choiceId !== "string") return false;
  return stage.roles[role].choices.some((choice) => choice.id === choiceId);
}

function stagePairMatches(room) {
  const stage = stageAt(room);
  return !!stage && stage.answers.A === room.stageLocks.A && stage.answers.B === room.stageLocks.B;
}

function sanitizeFinalDraft(role, draft) {
  if (!VALID_ROLES.has(role) || !draft || typeof draft !== "object" || Array.isArray(draft)) return null;
  const fields = caseTwoData.finalProtocol.roles[role].fields;
  const clean = {};
  for (const field of fields) {
    if (!field.choices.some((choice) => choice.id === draft[field.id])) return null;
    clean[field.id] = draft[field.id];
  }
  return clean;
}

function scoreFinalProtocol(room) {
  let correct = 0;
  let total = 0;
  for (const role of VALID_ROLES) {
    const answer = caseTwoData.finalProtocol.answers[role];
    const draft = room.finalDrafts[role] || {};
    for (const [fieldId, value] of Object.entries(answer)) {
      total += 1;
      if (draft[fieldId] === value) correct += 1;
    }
  }
  if (correct === total) return room.alertLevel === 0 ? "clean" : "exposed";
  if (correct >= Math.ceil(total / 2)) return "partial";
  return "failed";
}

function caseTwoEndingReveal(room) {
  if (!room || room.phase !== "ending" || !caseTwoData.endings[room.result]) return null;
  const activity = room.activity || freshCaseTwoActivity();
  const decisionReview = [];
  for (const role of VALID_ROLES) {
    for (const field of caseTwoData.finalProtocol.roles[role].fields) {
      const choiceId = room.finalDrafts[role] && room.finalDrafts[role][field.id];
      const correctId = caseTwoData.finalProtocol.answers[role][field.id];
      const choice = field.choices.find((item) => item.id === choiceId);
      const correct = field.choices.find((item) => item.id === correctId);
      decisionReview.push({
        role,
        roleName: caseTwoData.roles[role].name,
        prompt: field.prompt,
        choiceLabel: choice ? choice.label : "No selection",
        correctLabel: correct ? correct.label : "Unknown",
        correct: choiceId === correctId
      });
    }
  }
  return {
    ending: caseTwoData.endings[room.result],
    solution: caseTwoData.solution,
    decisions: room.finalDrafts,
    decisionReview,
    debrief: {
      difficulty: room.difficulty,
      alertLevel: room.alertLevel,
      pairAttempts: Number(activity.pairAttempts || 0),
      durationMs: Math.max(0, Number(room.completedAt || Date.now()) - Number(room.startedAt || room.updatedAt || Date.now())),
      roles: activity
    },
    nextHook: caseTwoData.nextHook
  };
}

function publicCaseTwoRoomState(room) {
  const stage = stageAt(room);
  return {
    code: room.code,
    caseId: room.caseId,
    phase: room.phase,
    players: {
      A: room.players.A ? { name: room.players.A.name, connected: room.players.A.connected, releaseEligibleAt: room.players.A.releaseEligibleAt || null } : null,
      B: room.players.B ? { name: room.players.B.name, connected: room.players.B.connected, releaseEligibleAt: room.players.B.releaseEligibleAt || null } : null
    },
    difficultyVotes: room.difficultyVotes,
    difficulty: room.difficulty,
    briefingReady: room.briefingReady,
    stageIndex: room.stageIndex,
    stageId: stage ? stage.id : null,
    stageLocks: { A: !!room.stageLocks.A, B: !!room.stageLocks.B },
    stageResolved: room.stageResolved,
    stageAcknowledged: room.stageAcknowledged,
    stageOutcome: room.stageResolved && stage ? stage.outcome : null,
    stageHistory: room.stageHistory.map((item) => ({ id: item.id, outcome: item.outcome })),
    lastFailure: room.lastFailure,
    alertLevel: room.alertLevel,
    chat: room.chat,
    finalLocked: room.finalLocked,
    restartReady: room.restartReady,
    result: room.result,
    endingReveal: caseTwoEndingReveal(room)
  };
}

function resetCaseTwoRoom(room) {
  const players = room.players;
  const code = room.code;
  Object.assign(room, freshCaseTwoRoom(code));
  room.players = players;
  room.phase = "briefing";
  return room;
}

module.exports = {
  caseTwoDifficultyConfirmed,
  caseTwoEndingReveal,
  createClientCaseTwo,
  freshCaseTwoActivity,
  freshCaseTwoRoom,
  publicCaseTwoRoomState,
  resetCaseTwoRoom,
  sanitizeFinalDraft,
  scoreFinalProtocol,
  stageAt,
  stagePairMatches,
  validStageChoice
};
