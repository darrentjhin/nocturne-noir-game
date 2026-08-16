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

async function submitFeedback(caseId, role) {
  const response = await fetch(`${target}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      caseId,
      role,
      clarity: "clear",
      challenge: "balanced",
      roleBalance: "equal",
      ending: "earned",
      continueSeries: "yes"
    })
  });
  if (response.status !== 201) throw new Error(`anonymous feedback endpoint returned ${response.status}`);
}

async function run() {
  let street = await connect();
  const desk = await connect();
  try {
    const created = await ack(street, "room:create", {});
    const joinedStreet = await ack(street, "room:join", { code: created.code, name: "Smoke Street" });
    let joinedDeskPromise;
    const joinedDesk = await stateAfter(
      street,
      (state) => state.phase === "briefing" && state.players.A && state.players.B,
      () => { joinedDeskPromise = ack(desk, "room:join", { code: created.code, name: "Smoke Desk" }); return joinedDeskPromise; },
      "two-player briefing"
    );
    const joinedDeskResponse = await joinedDeskPromise;
    if (
      joinedStreet.case.solution ||
      joinedStreet.case.endings ||
      joinedStreet.case.puzzles.supplyCloset.code ||
      Object.values(joinedStreet.case.clueText).some((clue) => clue.text) ||
      joinedStreet.case.deductions.some((deduction) => deduction.title || deduction.text || deduction.clueIds) ||
      joinedStreet.case.locations.flatMap((location) => location.hotspots).some((hotspot) => hotspot.result || hotspot.mode) ||
      joinedStreet.case.investigationThreads.some((thread) => thread.result || thread.slots.some((slot) => slot.clueId)) ||
      joinedStreet.case.people.flatMap((person) => person.interrogation.questions).some((question) => question.tag || question.presentClueId || !question.topic) ||
      joinedStreet.case.cooperativeOperation.answers ||
      joinedStreet.case.cooperativeOperation.result ||
      joinedStreet.case.seriesHook
    ) {
      throw new Error("join payload leaked a hidden answer");
    }
    if (!joinedDesk.players.B.connected) throw new Error("Desk did not join");
    if (!joinedStreet.case.cooperativeOperation.roleBrief.brief.includes("BERTH SIX")) throw new Error("Street did not receive its private Cross-Wire copy");
    if (!joinedDeskResponse.case.cooperativeOperation.roleBrief.brief.includes("dispatch index")) throw new Error("Desk did not receive its private Cross-Wire copy");

    await ack(street, "notes:update", { text: "Street private note: berth six, line 138." });
    await ack(street, "notes:append", { text: "[Radio · Smoke Desk] Confirm MARROW." });
    const streetNotes = await ack(street, "notes:get", {});
    const deskNotes = await ack(desk, "notes:get", {});
    if (streetNotes.text !== "Street private note: berth six, line 138.\n[Radio · Smoke Desk] Confirm MARROW." || deskNotes.text !== "") {
      throw new Error("private notebook crossed detective roles");
    }

    const postNotebookState = await stateAfter(
      street,
      (state) => state.phase === "briefing" && state.difficultyVotes.A === "detective" && !state.difficulty,
      () => ack(street, "difficulty:vote", { difficulty: "detective" }),
      "Street difficulty vote"
    );
    if (JSON.stringify(postNotebookState).includes("Street private note")) throw new Error("private notebook leaked into shared room state");
    await stateAfter(
      street,
      (state) => state.phase === "briefing" && state.difficulty === "detective",
      () => ack(desk, "difficulty:vote", { difficulty: "detective" }),
      "unanimous difficulty"
    );

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
      const approach = approachForQuestion(question);
      latest = await stateAfter(
        street,
        (state) => state.questionsAsked.includes(questionId),
        () => ack(desk, "interview:ask", { personId, questionId, approach, evidenceId: approach === "evidence" ? question.presentClueId : undefined }),
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
    latest = await stateAfter(
      street,
      (state) => state.hunchLocked.A && !state.hunchLocked.B,
      () => ack(street, "hunch:lock", { suspectId: "victor" }),
      "Street private hunch"
    );
    latest = await stateAfter(
      street,
      (state) => state.hunchLocked.A && state.hunchLocked.B,
      () => ack(desk, "hunch:lock", { suspectId: "ivy" }),
      "Desk private hunch"
    );
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
    if (!latest.operation.unlocked) throw new Error("Cross-Wire did not unlock from the two role records");
    const wrongTrace = await softAck(street, "operation:submit", { answer: "381" });
    if (!wrongTrace.error.includes("exact order")) throw new Error("Cross-Wire did not explain the recoverable route error");
    latest = await stateAfter(
      street,
      (state) => state.operation.submissions.A && !state.operation.submissions.B,
      () => ack(street, "operation:submit", { answer: "138" }),
      "Street Cross-Wire half"
    );
    latest = await stateAfter(
      street,
      (state) => state.operation.solved,
      () => ack(desk, "operation:submit", { answer: "marrow" }),
      "joint Cross-Wire completion"
    );
    latest = await stateAfter(
      street,
      (state) => state.interviewStates.ivy && state.interviewStates.ivy.missteps === 1 && !state.questionsAsked.includes("ivy-courier"),
      () => softAck(desk, "interview:ask", { personId: "ivy", questionId: "ivy-courier", approach: "evidence", evidenceId: "B3" }),
      "recoverable wrong evidence presentation"
    );
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
    if (latest.deductionsSolved.length !== 2 || latest.threadsSolved.length !== 3 || latest.confrontationsSolved.length !== 2 || !latest.operation.solved) {
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
    await stateAfter(street, (state) => state.accusationDraft.readyA, () => ack(street, "accusation:ready", { ready: true }), "Street ready");
    await stateAfter(
      desk,
      (state) => state.phase === "accusation" && !state.players.A.connected && !state.accusationDraft.readyA,
      () => street.disconnect(),
      "disconnected final readiness cleared"
    );
    const absentPartner = await softAck(desk, "accusation:ready", { ready: true });
    if (!absentPartner.error.includes("partner must be connected")) throw new Error("Final call did not explain the two-player connection gate");
    const resumedStreet = await connect();
    let resumedStreetJoin;
    await stateAfter(
      desk,
      (state) => state.phase === "accusation" && state.players.A.connected,
      () => {
        resumedStreetJoin = ack(resumedStreet, "room:join", {
          code: created.code,
          role: "A",
          name: "Smoke Street",
          resumeToken: joinedStreet.resumeToken
        });
        return resumedStreetJoin;
      },
      "Street final-call reconnect"
    );
    await resumedStreetJoin;
    street = resumedStreet;
    await stateAfter(street, (state) => state.accusationDraft.readyB && !state.accusationDraft.readyA, () => ack(desk, "accusation:ready", { ready: true }), "Desk ready");
    latest = await stateAfter(
      street,
      (state) => state.phase === "ending",
      () => ack(street, "accusation:ready", { ready: true }),
      "ending"
    );
    if (
      latest.result !== "correct" ||
      !latest.endingReveal ||
      latest.endingReveal.solution.suspect !== "ivy" ||
      !latest.endingReveal.solutionContributions ||
      !latest.endingReveal.debrief ||
      latest.endingReveal.debrief.hunches.A !== "victor" ||
      !latest.endingReveal.seriesHook
    ) {
      throw new Error("Correct ending reveal was not delivered");
    }
    await submitFeedback("the-last-reel", "A");
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
    if (latest.found.A.length || latest.found.B.length || latest.briefingReady.A || latest.briefingReady.B || latest.difficulty || latest.operation.solved) {
      throw new Error("Restart did not reset the case cleanly");
    }
    const resetStreetNotes = await ack(street, "notes:get", {});
    if (resetStreetNotes.text !== "") throw new Error("Restart did not clear the prior notebook");
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
