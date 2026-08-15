const { io } = require("socket.io-client");
const caseTwoData = require("../server/caseTwoData");

const target = process.argv[2] || process.env.NOCTURNE_URL || "http://localhost:4173";
const timeoutMs = 7000;

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

function rejectedAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} rejection timed out`)), timeoutMs);
    socket.emit(event, payload, (result) => {
      clearTimeout(timer);
      if (result && result.ok === false) resolve(result);
      else reject(new Error(`${event} unexpectedly succeeded`));
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
    Promise.resolve().then(action).catch((error) => {
      clearTimeout(timer);
      socket.off("room:state", onState);
      reject(error);
    });
  });
}

async function run() {
  const street = await connect();
  let desk = await connect();
  try {
    const created = await ack(street, "room:create", { caseId: caseTwoData.id });
    const joinedStreet = await ack(street, "room:join", {
      code: created.code,
      name: "Smoke Street",
      expectedCaseId: caseTwoData.id
    });
    const wrongSurface = await rejectedAck(desk, "room:join", {
      code: created.code,
      name: "Wrong Surface",
      expectedCaseId: "the-last-reel"
    });
    if (wrongSurface.destination !== "/case-two.html") throw new Error("wrong-case redirect was not returned");

    let joinedDeskPromise;
    await stateAfter(
      street,
      (state) => state.phase === "briefing" && state.players.A && state.players.B,
      () => {
        joinedDeskPromise = ack(desk, "room:join", { code: created.code, name: "Smoke Desk", expectedCaseId: caseTwoData.id });
        return joinedDeskPromise;
      },
      "File 02 two-player briefing"
    );
    const joinedDesk = await joinedDeskPromise;
    if (joinedStreet.case.id !== caseTwoData.id || joinedDesk.case.id !== caseTwoData.id) throw new Error("wrong case data joined");
    if (joinedStreet.case.stages.some((stage) => stage.answers || stage.outcome || stage.failure)) throw new Error("Street payload leaked stage solution data");
    if (joinedDesk.case.stages.some((stage) => stage.answers || stage.outcome || stage.failure)) throw new Error("Desk payload leaked stage solution data");
    if (joinedStreet.case.solution || joinedStreet.case.nextHook || joinedStreet.case.finalProtocol.answers) throw new Error("Street payload leaked ending data");
    if (!joinedStreet.case.stages[0].roleBrief.facts.join(" ").includes("COBALT")) throw new Error("Street private dispatch missing");
    if (!joinedDesk.case.stages[0].roleBrief.facts.join(" ").includes("access index")) throw new Error("Desk private dispatch missing");

    await ack(street, "notes:update", { text: "Street private note: Line VI." });
    const streetNotes = await ack(street, "notes:get", {});
    const deskNotes = await ack(desk, "notes:get", {});
    if (streetNotes.text !== "Street private note: Line VI." || deskNotes.text !== "") throw new Error("private notebook crossed detective roles");

    await stateAfter(
      street,
      (state) => state.difficultyVotes.A === "field" && !state.difficulty,
      () => ack(street, "case2:difficulty:vote", { difficulty: "field" }),
      "Street File 02 mode"
    );
    await stateAfter(
      street,
      (state) => state.difficultyVotes.B === "signal" && !state.difficulty,
      () => ack(desk, "case2:difficulty:vote", { difficulty: "signal" }),
      "mismatched File 02 mode"
    );
    await stateAfter(
      street,
      (state) => state.difficulty === "field",
      () => ack(desk, "case2:difficulty:vote", { difficulty: "field" }),
      "unanimous File 02 mode"
    );

    await stateAfter(
      street,
      (state) => state.phase === "briefing" && state.briefingReady.A && !state.briefingReady.B,
      () => ack(street, "case2:briefing:ready", { ready: true }),
      "Street File 02 readiness"
    );
    let latest = await stateAfter(
      street,
      (state) => state.phase === "operation" && state.stageIndex === 0,
      () => ack(desk, "case2:briefing:ready", { ready: true }),
      "joint File 02 operation start"
    );

    latest = await stateAfter(
      street,
      (state) => state.chat.length === 1,
      () => street.emit("case2:chat", { text: "Line VI. Which protocol color?" }),
      "File 02 Radio Line"
    );
    if (latest.chat[0].text !== "Line VI. Which protocol color?") throw new Error("radio message changed in transit");
    if (JSON.stringify(latest).includes("Street private note")) throw new Error("private notebook leaked into shared room state");

    const hint = await ack(desk, "case2:hint", {});
    if (!hint.hint.includes("line number")) throw new Error("role-private nudge missing");

    await stateAfter(
      street,
      (state) => state.stageLocks.A && !state.stageLocks.B,
      () => ack(street, "case2:stage:lock", { choiceId: "ivory-door" }),
      "wrong Street checkpoint half"
    );
    latest = await stateAfter(
      street,
      (state) => state.alertLevel === 1 && !state.stageLocks.A && !state.stageLocks.B,
      () => ack(desk, "case2:stage:lock", { choiceId: "saint-orison" }),
      "recoverable paired failure"
    );
    if (!latest.lastFailure || latest.lastFailure.includes("cobalt-door")) throw new Error("paired failure leaked an answer or lacked feedback");

    for (let index = 0; index < caseTwoData.stages.length; index += 1) {
      const stage = caseTwoData.stages[index];
      await stateAfter(
        street,
        (state) => state.stageIndex === index && state.stageLocks.A && !state.stageLocks.B,
        () => ack(street, "case2:stage:lock", { choiceId: stage.answers.A }),
        `${stage.id} Street half`
      );
      latest = await stateAfter(
        street,
        (state) => state.stageIndex === index && state.stageResolved && state.stageHistory.length === index + 1,
        () => ack(desk, "case2:stage:lock", { choiceId: stage.answers.B }),
        `${stage.id} joint resolution`
      );
      if (typeof latest.stageLocks.A !== "boolean" || JSON.stringify(latest).includes(stage.answers.A)) {
        throw new Error(`${stage.id} public state leaked a private selection`);
      }
      if (index === 0) {
        latest = await stateAfter(
          street,
          (state) => state.players.B && !state.players.B.connected && state.stageResolved,
          () => desk.disconnect(),
          "Desk checkpoint disconnect"
        );
        desk = await connect();
        let resumedPromise;
        latest = await stateAfter(
          street,
          (state) => state.players.B && state.players.B.connected && state.stageResolved && state.alertLevel === 1,
          () => {
            resumedPromise = ack(desk, "room:join", {
              code: created.code,
              role: "B",
              name: "Smoke Desk",
              resumeToken: joinedDesk.resumeToken,
              expectedCaseId: caseTwoData.id
            });
            return resumedPromise;
          },
          "Desk checkpoint resume"
        );
        const resumed = await resumedPromise;
        if (resumed.role !== "B") throw new Error("Desk did not reclaim its private role");
        const resumedDeskNotes = await ack(desk, "notes:get", {});
        if (resumedDeskNotes.text !== "") throw new Error("Desk resumed with the Street notebook");
      }
      await stateAfter(
        street,
        (state) => state.stageIndex === index && state.stageAcknowledged.A && !state.stageAcknowledged.B,
        () => ack(street, "case2:stage:acknowledge", { ready: true }),
        `${stage.id} Street acknowledgement`
      );
      latest = await stateAfter(
        street,
        (state) => index === caseTwoData.stages.length - 1 ? state.phase === "convergence" : state.stageIndex === index + 1 && !state.stageResolved,
        () => ack(desk, "case2:stage:acknowledge", { ready: true }),
        `${stage.id} joint advance`
      );
    }

    await stateAfter(
      street,
      (state) => state.phase === "convergence" && state.finalLocked.A && !state.finalLocked.B,
      () => ack(street, "case2:final:lock", { draft: caseTwoData.finalProtocol.answers.A }),
      "Street final protocol"
    );
    latest = await stateAfter(
      street,
      (state) => state.phase === "ending",
      () => ack(desk, "case2:final:lock", { draft: caseTwoData.finalProtocol.answers.B }),
      "joint final protocol"
    );
    if (latest.result !== "exposed") throw new Error(`expected exposed ending after one alert, received ${latest.result}`);
    if (!latest.endingReveal || latest.endingReveal.decisionReview.length !== 4 || !latest.endingReveal.nextHook) {
      throw new Error("File 02 ending reveal is incomplete");
    }

    await stateAfter(
      street,
      (state) => state.phase === "ending" && state.restartReady.A && !state.restartReady.B,
      () => ack(street, "case2:restart:ready", { ready: true }),
      "Street replay readiness"
    );
    latest = await stateAfter(
      street,
      (state) => state.phase === "briefing" && state.stageIndex === 0 && state.alertLevel === 0,
      () => ack(desk, "case2:restart:ready", { ready: true }),
      "joint File 02 replay"
    );
    if (latest.stageHistory.length || latest.finalLocked.A || latest.finalLocked.B) throw new Error("File 02 replay did not reset private state");
    const resetStreetNotes = await ack(street, "notes:get", {});
    if (resetStreetNotes.text !== "") throw new Error("File 02 replay did not clear the prior notebook");

    console.log(`File 02 socket smoke passed: ${created.code}, four paired checkpoints and all shared gates verified.`);
  } finally {
    street.disconnect();
    desk.disconnect();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
