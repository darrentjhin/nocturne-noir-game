function questionResult(question, personId, evidenceId) {
  return {
    id: question.id,
    personId,
    response: question.response,
    after: question.after,
    breakthrough: !!question.confrontationId,
    evidenceId: evidenceId || null
  };
}

function neutralQuestionTopic(tag) {
  return {
    PRESS: "REPUTATION",
    RAPPORT: "RELATIONSHIP",
    CONFRONT: "DISCREPANCY",
    EVIDENCE: "PAYMENTS",
    PERSONAL: "HISTORY"
  }[tag] || tag;
}

function clientOperation(data, role) {
  const operation = data.cooperativeOperation;
  if (!operation) return null;
  return {
    id: operation.id,
    title: operation.title,
    summary: operation.summary,
    roleBrief: role && operation.roles[role] ? operation.roles[role] : null
  };
}

function createClientCase(data, role) {
  return {
    ...data,
    puzzles: Object.fromEntries(
      Object.entries(data.puzzles || {}).map(([id, puzzle]) => [id, { hint: puzzle.hint }])
    ),
    deductions: (data.deductions || []).map(({ id }) => ({ id })),
    investigationThreads: (data.investigationThreads || []).map(({ result, ...thread }) => ({
      ...thread,
      slots: thread.slots.map(({ clueId, ...slot }) => slot)
    })),
    clueText: Object.fromEntries(
      Object.entries(data.clueText || {}).map(([id, { title, docType }]) => [id, { title, docType }])
    ),
    locations: (data.locations || []).map((location) => ({
      ...location,
      hotspots: location.hotspots.map(({ result, mode, ...hotspot }) => hotspot)
    })),
    people: (data.people || []).map((person) => ({
      ...person,
      interrogation: person.interrogation
        ? {
            ...person.interrogation,
            questions: person.interrogation.questions.map(({ response, after, tag, presentClueId, ...question }) => ({
              ...question,
              topic: neutralQuestionTopic(tag)
            }))
          }
        : person.interrogation
    })),
    solution: undefined,
    solutionEvidence: undefined,
    solutionContributions: undefined,
    cooperativeOperation: clientOperation(data, role),
    seriesHook: undefined,
    endings: undefined
  };
}

function fieldResultsForRoom(data, room) {
  const found = new Set(room.found.A || []);
  const results = {};
  for (const location of data.locations || []) {
    for (const hotspot of location.hotspots || []) {
      if (hotspot.clueId && found.has(hotspot.clueId) && hotspot.result) results[hotspot.clueId] = hotspot.result;
    }
  }
  return results;
}

function evidenceDetailsForRoom(data, room) {
  const found = new Set([...(room.found.A || []), ...(room.found.B || [])]);
  return Object.fromEntries([...found].filter((id) => data.clueText[id]).map((id) => [id, data.clueText[id]]));
}

function deductionDetailsForRoom(data, room) {
  const solved = new Set(room.deductionsSolved || []);
  return (data.deductions || [])
    .filter((deduction) => solved.has(deduction.id))
    .map(({ id, title, text }) => ({ id, title, text }));
}

function threadDetailsForRoom(data, room) {
  const solved = new Set(room.threadsSolved || []);
  return (data.investigationThreads || [])
    .filter((thread) => solved.has(thread.id))
    .map(({ id, title, result }) => ({ id, title, result }));
}

function interviewResultsForRoom(data, room) {
  const asked = new Set(room.questionsAsked || []);
  const results = [];
  for (const person of data.people || []) {
    for (const question of (person.interrogation && person.interrogation.questions) || []) {
      if (asked.has(question.id)) results.push(questionResult(question, person.id, room.interviewEvidence && room.interviewEvidence[question.id]));
    }
  }
  return results;
}

function endingRevealForRoom(data, room) {
  if (room.phase !== "ending" || !room.result || !data.endings[room.result]) return null;
  return {
    ending: data.endings[room.result],
    solution: data.solution,
    solutionEvidence: data.solutionEvidence,
    solutionContributions: data.solutionContributions,
    operation: data.cooperativeOperation && room.operation && room.operation.solved
      ? { title: data.cooperativeOperation.title, result: data.cooperativeOperation.result }
      : null,
    debrief: {
      difficulty: room.difficulty || "detective",
      durationMs: Math.max(0, Number(room.completedAt || Date.now()) - Number(room.startedAt || room.updatedAt || Date.now())),
      activity: room.activity || null,
      hunches: room.hunches || { A: null, B: null }
    },
    seriesHook: data.seriesHook
  };
}

module.exports = {
  createClientCase,
  deductionDetailsForRoom,
  endingRevealForRoom,
  evidenceDetailsForRoom,
  fieldResultsForRoom,
  interviewResultsForRoom,
  threadDetailsForRoom
};
