const { io } = require("socket.io-client");
const caseData = require("../server/caseData");
const { approachForQuestion, caseIndex } = require("../server/gameLogic");

const target = process.argv[2] || process.env.NOCTURNE_URL || "http://localhost:4173";
const timeoutMs = 5000;

function connect() {
  return new Promise((resolve, reject) => {
    const socket = io(target, { forceNew: true, reconnection: false, timeout: timeoutMs });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

function ack(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} acknowledgement timed out`)), timeoutMs);
    socket.emit(event, payload, (result) => {
      clearTimeout(timer);
      if (!result || !result.ok) reject(new Error(`${event} failed: ${(result && result.error) || "no response"}`));
      else resolve(result);
    });
  });
}

function softAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} soft acknowledgement timed out`)), timeoutMs);
    socket.emit(event, payload, (result) => {
      clearTimeout(timer);
      if (result && !result.ok && result.soft) resolve(result);
      else reject(new Error(`${event} did not return a recoverable failure`));
    });
  });
}

function stateAfter(socket, predicate, action, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("room:state", onState);
      reject(new Error(`${label} state timed out`));
    }, timeoutMs);
    function onState(state) {
      if (!predicate(state)) return;
      clearTimeout(timer);
      socket.off("room:state", onState);
      resolve(state);
    }
    socket.on("room:state", onState);
    Promise.resolve()
      .then(action)
      .catch((error) => {
        clearTimeout(timer);
        socket.off("room:state", onState);
        reject(error);
      });
  });
}

async function run() {
  const street = await connect();
  const desk = await connect();
  try {
    const created = await ack(street, "room:create", {});
    const joinedStreet = await ack(street, "room:join", { code: created.code, name: "Smoke Street" });
    const joinedDesk = await stateAfter(
      street,
      (state) => state.phase === "briefing" && state.players.A && state.players.B,
      () => ack(desk, "room:join", { code: created.code, name: "Smoke Desk" }),
      "two-player briefing"
    );
    if (
      joinedStreet.case.solution ||
      joinedStreet.case.endings ||
      joinedStreet.case.puzzles.supplyCloset.code ||
      Object.values(joinedStreet.case.clueText).some((clue) => clue.text) ||
      joinedStreet.case.deductions.some((deduction) => deduction.title || deduction.text || deduction.clueIds) ||
      joinedStreet.case.locations.flatMap((location) => location.hotspots).some((hotspot) => hotspot.result || hotspot.mode) ||
      joinedStreet.case.investigationThreads.some((thread) => thread.result || thread.slots.some((slot) => slot.clueId)) ||
      joinedStreet.case.people.flatMap((person) => person.interrogation.questions).some((question) => question.tag || !question.topic)
    ) {
      throw new Error("join payload leaked a hidden answer");
    }
    if (!joinedDesk.players.B.connected) throw new Error("Desk did not join");

    await stateAfter(
      street,
      (state) => state.phase === "briefing" && state.briefingReady.A && !state.briefingReady.B,
      () => street.emit("briefing:ready", { ready: true }),
      "Street briefing readiness"
    );
    await stateAfter(
      street,
      (state) => state.phase === "investigation",
      () => desk.emit("briefing:ready", { ready: true }),
      "two-player investigation start"
    );

    let latest;
    const find = async (roleSocket, role, clueId) => {
      const meta = caseIndex.clues.get(clueId);
      latest = await stateAfter(
        street,
        (state) => state.found[role].includes(clueId),
        () => roleSocket.emit("clue:found", { clueId, sceneMode: role === "A" ? meta.mode : undefined }),
        `clue ${clueId}`
      );
    };
    const ask = async (personId, questionId) => {
      const question = caseIndex.questions.get(questionId);
      latest = await stateAfter(
        street,
        (state) => state.questionsAsked.includes(questionId),
        () => ack(desk, "interview:ask", { personId, questionId, approach: approachForQuestion(question) }),
        `question ${questionId}`
      );
      const result = latest.interviewResults.find((item) => item.id === questionId);
      if (!result || !result.response || !result.after) throw new Error(`earned answer missing for ${questionId}`);
    };

    const fieldMisread = await softAck(street, "clue:inspect", { clueId: "A1", sceneMode: "mechanism" });
    if (!fieldMisread.error.includes("reconstruction focus")) throw new Error("Scene focus did not explain the recoverable failure");
    latest = await stateAfter(
      street,
      (state) => state.interviewStates.victor && state.interviewStates.victor.composure === 2 && !state.questionsAsked.includes("victor-where"),
      () => softAck(desk, "interview:ask", { personId: "victor", questionId: "victor-where", approach: "pressure" }),
      "recoverable interview misread"
    );

    await find(street, "A", "A1");
    await find(street, "A", "A2");
    await find(street, "A", "A3");
    await find(street, "A", "A5");
    await find(street, "A", "A6");
    await ask("victor", "victor-where");
    await ask("victor", "victor-finance");
    await find(desk, "B", "B2");
    await find(street, "A", "A4");
    await ask("victor", "victor-insurance");
    await ask("ivy", "ivy-timeline");
    await ask("ivy", "ivy-relationship");
    await ask("ivy", "ivy-reel");
    await find(desk, "B", "B4");
    await ask("sal", "sal-renata");
    await ask("sal", "sal-debt");
    await ask("sal", "sal-records");
    await find(desk, "B", "B6");
    latest = await stateAfter(
      street,
      (state) => state.found.A.includes("A9"),
      () => ack(street, "puzzle:attempt", { puzzleId: "supplyCloset", hotspotId: "studio-closet", code: "817", sceneMode: "timeline" }),
      "combination puzzle"
    );
    if (latest.actUnlocked !== 2) throw new Error("Act 2 did not unlock");
    await find(street, "A", "A7");
    await find(street, "A", "A8");
    await ask("dane", "dane-renata");
    await ask("dane", "dane-gala");
    await ask("dane", "dane-permit");
    await find(desk, "B", "B8");
    await ask("ivy", "ivy-courier");
    await ask("dane", "dane-ivy");
    await ask("dane", "dane-note");

    const timeline = caseData.investigationThreads.find((thread) => thread.id === "timeline");
    const wrongTimeline = {
      claim: timeline.slots.find((slot) => slot.id === "contradiction").clueId,
      contradiction: timeline.slots.find((slot) => slot.id === "claim").clueId,
      verification: timeline.slots.find((slot) => slot.id === "verification").clueId
    };
    latest = await stateAfter(
      street,
      (state) => Object.entries(wrongTimeline).every(([slotId, clueId]) => state.threadDrafts.timeline && state.threadDrafts.timeline[slotId] === clueId),
      () => street.emit("thread:update", { threadId: "timeline", update: wrongTimeline }),
      "incorrect timeline draft"
    );
    latest = await stateAfter(
      street,
      (state) => state.hintState && state.hintState.threadFailures === 1,
      () => softAck(street, "thread:submit", { threadId: "timeline" }),
      "first recoverable theory failure"
    );
    latest = await stateAfter(
      street,
      (state) => state.hintState && state.hintState.threadFailures === 2,
      () => softAck(street, "thread:submit", { threadId: "timeline" }),
      "adaptive theory guidance threshold"
    );

    for (const thread of caseData.investigationThreads) {
      const update = Object.fromEntries(thread.slots.map((slot) => [slot.id, slot.clueId]));
      latest = await stateAfter(
        street,
        (state) => Object.entries(update).every(([slotId, clueId]) => state.threadDrafts[thread.id] && state.threadDrafts[thread.id][slotId] === clueId),
        () => street.emit("thread:update", { threadId: thread.id, update }),
        `thread draft ${thread.id}`
      );
      latest = await stateAfter(
        street,
        (state) => state.threadsSolved.includes(thread.id),
        () => ack(street, "thread:submit", { threadId: thread.id }),
        `thread ${thread.id}`
      );
    }
    for (const [a, b] of [["A2", "B1"], ["A5", "B6"]]) {
      latest = await stateAfter(
        street,
        (state) => state.board.links.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
        () => ack(street, "board:link", { a, b }),
        `deduction ${a}+${b}`
      );
    }
    if (latest.deductionsSolved.length !== 2 || latest.threadsSolved.length !== 3 || latest.confrontationsSolved.length !== 2) {
      throw new Error("The complete theory did not unlock");
    }

    await stateAfter(
      street,
      (state) => state.phase === "investigation" && state.callReady.A && !state.callReady.B,
      () => street.emit("call:ready", { ready: true }),
      "Street call readiness"
    );
    await stateAfter(
      street,
      (state) => state.phase === "accusation",
      () => desk.emit("call:ready", { ready: true }),
      "two-player accusation entry"
    );
    for (const update of [
      { suspect: "ivy" },
      { location: "docks" },
      { motive: "silence-footage" },
      { method: "staged-sabotage" }
    ]) {
      latest = await stateAfter(
        street,
        (state) => Object.entries(update).every(([key, value]) => state.accusationDraft[key] === value),
        () => street.emit("accusation:update", update),
        `accusation ${Object.keys(update)[0]}`
      );
    }
    await stateAfter(street, (state) => state.accusationDraft.readyA, () => street.emit("accusation:ready", { ready: true }), "Street ready");
    latest = await stateAfter(
      street,
      (state) => state.phase === "ending",
      () => desk.emit("accusation:ready", { ready: true }),
      "ending"
    );
    if (
      latest.result !== "correct" ||
      !latest.endingReveal ||
      latest.endingReveal.solution.suspect !== "ivy" ||
      !latest.endingReveal.solutionContributions
    ) {
      throw new Error("Correct ending reveal was not delivered");
    }
    await stateAfter(
      street,
      (state) => state.phase === "ending" && state.restartReady.A && !state.restartReady.B,
      () => street.emit("restart:ready", { ready: true }),
      "Street restart readiness"
    );
    latest = await stateAfter(
      street,
      (state) => state.phase === "briefing",
      () => desk.emit("restart:ready", { ready: true }),
      "two-player case restart"
    );
    if (latest.found.A.length || latest.found.B.length || latest.briefingReady.A || latest.briefingReady.B) {
      throw new Error("Restart did not reset the case cleanly");
    }
    console.log(`Socket smoke passed: ${created.code}, all four shared transitions required both detectives.`);
  } finally {
    street.disconnect();
    desk.disconnect();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
