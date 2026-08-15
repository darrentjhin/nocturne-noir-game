const caseData = require("./caseData");

const VALID_ROLES = new Set(["A", "B"]);
const VALID_PHASE_TRANSITIONS = {
  accusation: new Set(["investigation"])
};

function buildCaseIndex(data) {
  const hotspots = new Map();
  const clues = new Map();
  const questions = new Map();

  for (const [role, leads] of [
    ["A", data.locations],
    ["B", data.people]
  ]) {
    for (const lead of leads) {
      for (const hotspot of lead.hotspots) {
        const meta = { ...hotspot, role, act: lead.act, leadId: lead.id };
        hotspots.set(hotspot.id, meta);
        if (hotspot.clueId) clues.set(hotspot.clueId, meta);
      }
    }
  }

  for (const person of data.people) {
    for (const question of (person.interrogation && person.interrogation.questions) || []) {
      const meta = { ...question, role: "B", act: person.act, leadId: person.id, type: "interviewQuestion" };
      questions.set(question.id, meta);
      if (question.clueId) clues.set(question.clueId, meta);
    }
  }

  return { hotspots, clues, questions };
}

const caseIndex = buildCaseIndex(caseData);
const threadIndex = new Map((caseData.investigationThreads || []).map((thread) => [thread.id, thread]));

function isValidRole(role) {
  return VALID_ROLES.has(role);
}

function cleanPlayerName(value, role) {
  const cleaned = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 24) : "";
  return cleaned || `Detective ${role}`;
}

function chooseRoleForJoin(players, requestedRole, suppliedToken) {
  const role = isValidRole(requestedRole) ? requestedRole : null;
  const requestedPlayer = role ? players[role] : null;
  const token = typeof suppliedToken === "string" ? suppliedToken : "";
  if (requestedPlayer && requestedPlayer.connected && token && token === requestedPlayer.resumeToken) return null;
  const reclaim = !!(
    role &&
    requestedPlayer &&
    !requestedPlayer.connected &&
    ((!requestedPlayer.resumeToken && !token) || token === requestedPlayer.resumeToken)
  );
  if (reclaim) return { role, reclaim: true };
  if (!players.A) return { role: "A", reclaim: false };
  if (!players.B) return { role: "B", reclaim: false };
  return null;
}

function pinPositionForFoundCount(foundCount) {
  const index = Math.max(0, foundCount - 1);
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 14 + col * 24, y: 14 + row * 18, moved: false };
}

function clampBoardPosition(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(8, Math.min(92, x)),
    y: Math.max(8, Math.min(92, y)),
    moved: true
  };
}

function foundIds(room) {
  return [...room.found.A, ...room.found.B];
}

function ownsFoundClue(room, clueId) {
  return typeof clueId === "string" && foundIds(room).includes(clueId);
}

function requirementsMet(room, source) {
  const clues = foundIds(room);
  const asked = Array.isArray(room.questionsAsked) ? room.questionsAsked : [];
  const requiredClues = Array.isArray(source.requiresClues) ? source.requiresClues : [];
  const requiredQuestions = Array.isArray(source.requiresQuestions) ? source.requiresQuestions : [];
  return requiredClues.every((clueId) => clues.includes(clueId)) && requiredQuestions.every((questionId) => asked.includes(questionId));
}

function canRevealClue(room, role, clueId) {
  const meta = caseIndex.clues.get(clueId);
  return !!meta && meta.role === role && meta.act <= room.actUnlocked && meta.type === "clue" && requirementsMet(room, meta);
}

function canRevealFlavor(room, role, hotspotId) {
  const meta = caseIndex.hotspots.get(hotspotId);
  return !!meta && meta.role === role && meta.act <= room.actUnlocked && meta.type === "flavor";
}

function fieldModeMatches(clueId, mode) {
  const meta = caseIndex.clues.get(clueId);
  return !!meta && meta.role === "A" && typeof mode === "string" && meta.mode === mode;
}

function validPuzzleHotspot(room, role, puzzleId, hotspotId, mode) {
  const meta = caseIndex.hotspots.get(hotspotId);
  return !!meta && meta.role === role && meta.act <= room.actUnlocked && meta.type === "locked" && meta.puzzleId === puzzleId && meta.mode === mode;
}

function canAskInterviewQuestion(room, role, personId, questionId) {
  const question = caseIndex.questions.get(questionId);
  if (!question || role !== "B" || question.leadId !== personId || question.act > room.actUnlocked) return false;
  if ((room.questionsAsked || []).includes(questionId)) return false;
  return requirementsMet(room, question);
}

function approachForQuestion(question) {
  if (!question) return null;
  if (question.confrontationId || (question.requiresClues || []).length) return "evidence";
  if (question.tag === "PRESS") return "pressure";
  if (question.tag === "RAPPORT" || question.tag === "PERSONAL") return "rapport";
  return "direct";
}

function accusationUnlocked(room) {
  const totalFound = room.found.A.length + room.found.B.length;
  const deductionsSolved = Array.isArray(room.deductionsSolved) ? room.deductionsSolved.length : 0;
  const confrontationsSolved = Array.isArray(room.confrontationsSolved) ? room.confrontationsSolved.length : 0;
  const threadsSolved = Array.isArray(room.threadsSolved) ? room.threadsSolved.length : 0;
  return (
    room.actUnlocked >= 2 &&
    totalFound >= caseData.accusationUnlockThreshold &&
    deductionsSolved >= caseData.requiredDeductions &&
    threadsSolved >= caseData.requiredThreads &&
    confrontationsSolved >= caseData.requiredConfrontations
  );
}

function sanitizeThreadUpdate(room, threadId, partial) {
  const thread = threadIndex.get(threadId);
  if (!thread || !partial || typeof partial !== "object" || Array.isArray(partial)) return {};
  const found = new Set(foundIds(room));
  const slotIds = new Set(thread.slots.map((slot) => slot.id));
  const clean = {};
  for (const [slotId, clueId] of Object.entries(partial)) {
    if (!slotIds.has(slotId)) continue;
    if (clueId === null || clueId === "") clean[slotId] = null;
    else if (typeof clueId === "string" && found.has(clueId)) clean[slotId] = clueId;
  }
  return clean;
}

function threadSolutionMatches(threadId, draft) {
  const thread = threadIndex.get(threadId);
  if (!thread || !draft) return false;
  return thread.slots.every((slot) => draft[slot.id] === slot.clueId);
}

function evaluateThreadDraft(threadId, draft) {
  const thread = threadIndex.get(threadId);
  if (!thread || !draft) return null;
  const correct = thread.slots.filter((slot) => draft[slot.id] === slot.clueId);
  const weak = thread.slots.find((slot) => draft[slot.id] !== slot.clueId);
  return {
    matched: correct.length,
    total: thread.slots.length,
    weakSlotId: weak ? weak.id : null,
    weakLabel: weak ? weak.label : null
  };
}

function bothPlayersReady(room, readinessKey) {
  const readiness = room && room[readinessKey];
  return !!(
    readiness &&
    readiness.A &&
    readiness.B &&
    room.players &&
    room.players.A &&
    room.players.B &&
    room.players.A.connected &&
    room.players.B.connected
  );
}

function canAdvancePhase(room, nextPhase) {
  const allowed = VALID_PHASE_TRANSITIONS[room.phase];
  if (!allowed || !allowed.has(nextPhase)) return false;
  return nextPhase !== "accusation" || accusationUnlocked(room);
}

function sanitizeAccusationUpdate(partial) {
  if (!partial || typeof partial !== "object" || Array.isArray(partial)) return {};
  const clean = {};
  if (caseData.suspects.includes(partial.suspect)) clean.suspect = partial.suspect;
  if (caseData.accusationLocations.includes(partial.location)) clean.location = partial.location;
  if (caseData.motives.some((m) => m.id === partial.motive)) clean.motive = partial.motive;
  if (caseData.methods.some((method) => method.id === partial.method)) clean.method = partial.method;
  return clean;
}

function deductionForLink(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a === b) return null;
  return (
    caseData.deductions.find(
      (deduction) =>
        (deduction.clueIds[0] === a && deduction.clueIds[1] === b) || (deduction.clueIds[0] === b && deduction.clueIds[1] === a)
    ) || null
  );
}

function scoreAccusation(draft) {
  if (
    draft.suspect === caseData.solution.suspect &&
    draft.location === caseData.solution.location &&
    draft.motive === caseData.solution.motive &&
    draft.method === caseData.solution.method
  ) {
    return "correct";
  }
  return draft.suspect === caseData.solution.suspect ? "partial" : "wrong";
}

module.exports = {
  accusationUnlocked,
  bothPlayersReady,
  buildCaseIndex,
  canAskInterviewQuestion,
  canAdvancePhase,
  canRevealClue,
  canRevealFlavor,
  caseIndex,
  chooseRoleForJoin,
  clampBoardPosition,
  cleanPlayerName,
  deductionForLink,
  evaluateThreadDraft,
  fieldModeMatches,
  foundIds,
  isValidRole,
  ownsFoundClue,
  approachForQuestion,
  pinPositionForFoundCount,
  requirementsMet,
  sanitizeAccusationUpdate,
  sanitizeThreadUpdate,
  scoreAccusation,
  threadSolutionMatches,
  threadIndex,
  validPuzzleHotspot
};
