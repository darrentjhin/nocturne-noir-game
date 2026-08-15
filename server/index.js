const path = require("path");
const crypto = require("node:crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const caseData = require("./caseData");
const caseTwoData = require("./caseTwoData");
const {
  createClientCase,
  deductionDetailsForRoom,
  endingRevealForRoom,
  evidenceDetailsForRoom,
  fieldResultsForRoom,
  interviewResultsForRoom,
  threadDetailsForRoom
} = require("./clientCase");
const {
  accusationUnlocked,
  approachForQuestion,
  bothPlayersReady,
  canAskInterviewQuestion,
  canAdvancePhase,
  canRevealClue,
  canRevealFlavor,
  caseIndex,
  chooseRoleForJoin,
  clampBoardPosition,
  cleanPlayerName,
  deductionForLink,
  difficultyConfirmed,
  evidenceMatchesQuestion,
  evaluateThreadDraft,
  fieldModeMatches,
  isValidRole,
  ownsFoundClue,
  operationAnswerMatches,
  operationUnlocked,
  pinPositionForFoundCount,
  sanitizeAccusationUpdate,
  sanitizeThreadUpdate,
  scoreAccusation,
  threadSolutionMatches,
  validPuzzleHotspot
} = require("./gameLogic");
const {
  caseTwoDifficultyConfirmed,
  createClientCaseTwo,
  freshCaseTwoRoom,
  publicCaseTwoRoomState,
  resetCaseTwoRoom,
  sanitizeFinalDraft,
  scoreFinalProtocol,
  stageAt,
  stagePairMatches,
  validStageChoice
} = require("./caseTwoLogic");
const { createRoomStore } = require("./roomStore");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 4173;
const roomStore = createRoomStore(process.env.ROOM_STORE_PATH);
const rooms = roomStore.load();
const clientCaseData = createClientCase(caseData);
const publicCaseTwoData = createClientCaseTwo(caseTwoData);

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  );
  next();
});
app.use(express.static(path.join(__dirname, "..", "public")));
app.get("/api/case", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(clientCaseData);
});
app.get("/api/cases/black-sun-ledger", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(publicCaseTwoData);
});
app.get("/api/health", (req, res) => res.json({ ok: true, rooms: rooms.size, persistence: roomStore.mode }));

// Rooms live in memory by default. Set ROOM_STORE_PATH to keep active cases in
// an atomic JSON file as well (useful with a mounted Railway volume).
// rooms[code] = {
//   code, phase: 'lobby'|'briefing'|'investigation'|'accusation'|'ending',
//   players: { A: {socketId, name, connected}, B: {...} },
//   found: { A: [clueId...], B: [clueId...] },   // real clues each role has revealed
//   flavorSeen: { A: [hotspotId...], B: [...] }, // flavor-only hotspots already examined
//   puzzlesSolved: { supplyCloset: false, ... },
//   actUnlocked: 1,                              // bumps to 2 once enough is found
//   board: { pins: {clueId: {x,y}}, links: [[id,id]] },
//   chat: [{role, name, text, ts}],
//   questionsAsked: [questionId...], confrontationsSolved: [confrontationId...],
//   accusationDraft: { suspect, location, motive, method, readyA, readyB },
//   result: null
// }
function addClueToRoom(room, role, clueId) {
  if (!isValidRole(role) || !caseIndex.clues.has(clueId)) return false;
  if (room.found[role].includes(clueId)) return;
  room.found[role].push(clueId);
  if (room.activity && room.activity[role]) room.activity[role].evidenceFound += 1;
  room.progressAt = Date.now();
  const totalFound = room.found.A.length + room.found.B.length;
  room.board.pins[clueId] = pinPositionForFoundCount(totalFound);
  const act1Found = room.found.A.filter((id) => /^A[1-6]$/.test(id)).length + room.found.B.filter((id) => /^B[1-6]$/.test(id)).length;
  if (room.actUnlocked < 2 && act1Found >= caseData.actUnlockThreshold) {
    room.actUnlocked = 2;
  }
  return true;
}

function freshActivity() {
  return {
    A: { evidenceFound: 0, fieldMissteps: 0, interviewsCompleted: 0, evidencePresented: 0, radioMessages: 0, operationAttempts: 0 },
    B: { evidenceFound: 0, fieldMissteps: 0, interviewsCompleted: 0, evidencePresented: 0, radioMessages: 0, operationAttempts: 0 },
    team: { threadAttempts: 0, boardAttempts: 0, hintsUsed: 0 }
  };
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function makeResumeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function freshRoom(code) {
  return {
    code,
    caseId: caseData.id,
    phase: "lobby",
    players: { A: null, B: null },
    found: { A: [], B: [] },
    flavorSeen: { A: [], B: [] },
    puzzlesSolved: {},
    actUnlocked: 1,
    board: { pins: {}, links: [] },
    chat: [],
    questionsAsked: [],
    interviewEvidence: {},
    interviewStates: {},
    confrontationsSolved: [],
    deductionsSolved: [],
    threadDrafts: {},
    threadsSolved: [],
    operation: { submissions: { A: false, B: false }, solved: false },
    hintState: { threadFailures: 0 },
    progressAt: Date.now(),
    briefingReady: { A: false, B: false },
    difficultyVotes: { A: null, B: null },
    difficulty: null,
    callReady: { A: false, B: false },
    restartReady: { A: false, B: false },
    accusationDraft: { suspect: null, location: null, motive: null, method: null, readyA: false, readyB: false },
    hunches: { A: null, B: null },
    activity: freshActivity(),
    startedAt: null,
    completedAt: null,
    result: null,
    updatedAt: Date.now()
  };
}

function isCaseOneRoom(room) {
  return !!room && (!room.caseId || room.caseId === caseData.id);
}

function isCaseTwoRoom(room) {
  return !!room && room.caseId === caseTwoData.id;
}

function publicRoomState(room) {
  if (isCaseTwoRoom(room)) return publicCaseTwoRoomState(room);
  return {
    code: room.code,
    phase: room.phase,
    players: {
      A: room.players.A ? { name: room.players.A.name, connected: room.players.A.connected } : null,
      B: room.players.B ? { name: room.players.B.name, connected: room.players.B.connected } : null
    },
    found: room.found,
    evidenceDetails: evidenceDetailsForRoom(caseData, room),
    fieldResults: fieldResultsForRoom(caseData, room),
    flavorSeen: room.flavorSeen,
    puzzlesSolved: room.puzzlesSolved,
    actUnlocked: room.actUnlocked,
    board: room.board,
    chat: room.chat,
    questionsAsked: room.questionsAsked,
    interviewEvidence: room.interviewEvidence,
    interviewStates: room.interviewStates,
    interviewResults: interviewResultsForRoom(caseData, room),
    confrontationsSolved: room.confrontationsSolved,
    deductionsSolved: room.deductionsSolved,
    deductionDetails: deductionDetailsForRoom(caseData, room),
    threadDrafts: room.threadDrafts,
    threadsSolved: room.threadsSolved,
    threadDetails: threadDetailsForRoom(caseData, room),
    operation: {
      unlocked: operationUnlocked(room),
      submissions: room.operation ? room.operation.submissions : { A: false, B: false },
      solved: !!(room.operation && room.operation.solved),
      result: room.operation && room.operation.solved ? caseData.cooperativeOperation.result : null
    },
    hintState: room.hintState,
    progressAt: room.progressAt,
    briefingReady: room.briefingReady,
    difficultyVotes: room.difficultyVotes,
    difficulty: room.difficulty,
    callReady: room.callReady,
    restartReady: room.restartReady,
    accusationDraft: room.accusationDraft,
    hunchLocked: { A: !!(room.hunches && room.hunches.A), B: !!(room.hunches && room.hunches.B) },
    result: room.result,
    endingReveal: endingRevealForRoom(caseData, room)
  };
}

function broadcast(room) {
  room.updatedAt = Date.now();
  roomStore.scheduleSave(rooms);
  io.to(room.code).emit("room:state", publicRoomState(room));
}

io.on("connection", (socket) => {
  let joinedCode = null;
  let joinedRole = null;
  const eventWindows = new Map();

  function allowEvent(key, limit, windowMs) {
    const now = Date.now();
    const recent = (eventWindows.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
    if (recent.length >= limit) {
      eventWindows.set(key, recent);
      return false;
    }
    recent.push(now);
    eventWindows.set(key, recent);
    return true;
  }

  socket.on("room:create", (payload = {}, cb) => {
    if (!allowEvent("room:create", 5, 60_000)) return cb && cb({ ok: false, error: "Too many new cases. Wait a moment." });
    const code = makeRoomCode();
    const requestedCaseId = payload.caseId === caseTwoData.id ? caseTwoData.id : caseData.id;
    const room = requestedCaseId === caseTwoData.id ? freshCaseTwoRoom(code) : freshRoom(code);
    rooms.set(code, room);
    roomStore.scheduleSave(rooms);
    cb && cb({ ok: true, code });
  });

  socket.on("room:join", (payload = {}, cb) => {
    let { code, role, name, resumeToken, expectedCaseId } = payload || {};
    code = typeof code === "string" ? code.toUpperCase().trim() : "";
    const room = rooms.get(code);
    if (!room) return cb && cb({ ok: false, error: "No case open with that code." });
    const roomCaseId = room.caseId || caseData.id;
    if (expectedCaseId && expectedCaseId !== roomCaseId) {
      const destination = roomCaseId === caseTwoData.id ? "/case-two.html" : "/";
      return cb && cb({
        ok: false,
        error: `That code belongs to ${roomCaseId === caseTwoData.id ? "File 02 · The Black-Sun Ledger" : "File 01 · The Last Reel"}.`,
        destination
      });
    }

    const selection = chooseRoleForJoin(room.players, role, resumeToken);
    if (!selection) {
      return cb && cb({ ok: false, error: "Both detective roles are occupied or reserved for reconnecting players." });
    }
    const takeRole = selection.role;
    const requestedPlayer = selection.reclaim ? room.players[takeRole] : null;

    // A single socket switching from one case to another (e.g. an auto-resumed
    // session followed by the player manually joining a different code) must
    // leave its old Socket.IO room first. Otherwise it stays subscribed to
    // both rooms' broadcasts at once, and state from the old case bleeds into
    // the new one on screen.
    if (joinedCode && joinedCode !== code) {
      socket.leave(joinedCode);
      const oldRoom = rooms.get(joinedCode);
      if (oldRoom && joinedRole && oldRoom.players[joinedRole]) {
        oldRoom.players[joinedRole].connected = false;
        broadcast(oldRoom);
      }
    }

    const playerName = cleanPlayerName(name, takeRole);
    const roleToken = selection.reclaim && requestedPlayer.resumeToken ? requestedPlayer.resumeToken : makeResumeToken();
    room.players[takeRole] = { socketId: socket.id, name: playerName, connected: true, resumeToken: roleToken };
    socket.join(code);
    joinedCode = code;
    joinedRole = takeRole;

    if (room.players.A && room.players.B && room.phase === "lobby") {
      room.phase = "briefing";
    }

    const joinedCase = isCaseTwoRoom(room) ? createClientCaseTwo(caseTwoData, takeRole) : createClientCase(caseData, takeRole);
    cb && cb({ ok: true, code, caseId: roomCaseId, role: takeRole, name: room.players[takeRole].name, resumeToken: roleToken, case: joinedCase });
    broadcast(room);
  });

  socket.on("difficulty:vote", (payload = {}, cb) => {
    if (!allowEvent("difficulty:vote", 12, 10_000)) return cb && cb({ ok: false, error: "Slow down and compare the difficulty descriptions together." });
    const room = rooms.get(joinedCode);
    const difficulty = typeof payload.difficulty === "string" ? payload.difficulty : "";
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "briefing" || !(caseData.difficultyOptions || []).some((option) => option.id === difficulty)) {
      return cb && cb({ ok: false, error: "That difficulty is not available." });
    }
    room.difficultyVotes[joinedRole] = difficulty;
    room.difficulty = room.difficultyVotes.A && room.difficultyVotes.A === room.difficultyVotes.B ? difficulty : null;
    room.briefingReady = { A: false, B: false };
    broadcast(room);
    cb && cb({ ok: true, difficulty, confirmed: !!room.difficulty });
  });

  socket.on("phase:advance", (payload = {}) => {
    const { phase } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !canAdvancePhase(room, phase)) return;
    room.phase = phase;
    room.callReady = { A: false, B: false };
    room.accusationDraft.readyA = false;
    room.accusationDraft.readyB = false;
    broadcast(room);
  });

  socket.on("briefing:ready", (payload = {}) => {
    if (!allowEvent("readiness", 20, 10_000)) return;
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "briefing" || !difficultyConfirmed(room)) return;
    room.briefingReady[joinedRole] = !!payload.ready;
    if (bothPlayersReady(room, "briefingReady")) {
      room.phase = "investigation";
      room.startedAt = Date.now();
    }
    broadcast(room);
  });

  socket.on("call:ready", (payload = {}) => {
    if (!allowEvent("readiness", 20, 10_000)) return;
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "investigation" || !accusationUnlocked(room)) return;
    room.callReady[joinedRole] = !!payload.ready;
    if (bothPlayersReady(room, "callReady")) {
      room.callReady = { A: false, B: false };
      room.accusationDraft.readyA = false;
      room.accusationDraft.readyB = false;
      room.phase = "accusation";
    }
    broadcast(room);
  });

  socket.on("clue:found", (payload = {}) => {
    const { clueId, sceneMode } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || !canRevealClue(room, joinedRole, clueId)) return;
    if (joinedRole === "A" && !fieldModeMatches(clueId, sceneMode)) return;
    addClueToRoom(room, joinedRole, clueId);
    broadcast(room);
  });

  socket.on("clue:inspect", (payload = {}, cb) => {
    if (!allowEvent("clue:inspect", 40, 60_000)) return cb && cb({ ok: false, error: "Slow down and review the evidence already open." });
    const { clueId, sceneMode } = payload || {};
    const room = rooms.get(joinedCode);
    const alreadyFound = room && ownsFoundClue(room, clueId);
    if (!isCaseOneRoom(room) || !joinedRole || (!alreadyFound && !canRevealClue(room, joinedRole, clueId))) {
      return cb && cb({ ok: false, error: "That evidence is not available yet." });
    }
    if (!alreadyFound && joinedRole === "A" && !fieldModeMatches(clueId, sceneMode)) {
      if (room.activity && room.activity.A) room.activity.A.fieldMissteps += 1;
      broadcast(room);
      return cb && cb({ ok: false, soft: true, error: "That approach does not answer your current reconstruction focus. Change focus and test the scene again." });
    }
    cb && cb({ ok: true, clue: caseData.clueText[clueId] });
  });

  socket.on("flavor:seen", (payload = {}) => {
    const { hotspotId } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || !canRevealFlavor(room, joinedRole, hotspotId)) return;
    if (!room.flavorSeen[joinedRole].includes(hotspotId)) {
      room.flavorSeen[joinedRole].push(hotspotId);
    }
    broadcast(room);
  });

  socket.on("puzzle:attempt", (payload = {}, cb) => {
    if (!allowEvent("puzzle:attempt", 6, 60_000)) {
      return cb && cb({ ok: false, error: "Too many combination attempts. Compare notes before trying again." });
    }
    const { puzzleId, code, hotspotId, sceneMode } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole) return cb && cb({ ok: false, error: "No active case." });
    const puzzle = caseData.puzzles[puzzleId];
    if (!puzzle || !validPuzzleHotspot(room, joinedRole, puzzleId, hotspotId, sceneMode)) {
      return cb && cb({ ok: false, soft: true, error: "This lock does not fit your current reconstruction focus." });
    }
    if (String(code || "").trim() !== puzzle.code) {
      return cb && cb({ ok: false, error: "That's not it." });
    }
    room.puzzlesSolved[puzzleId] = true;
    const hotspot = caseIndex.hotspots.get(hotspotId);
    if (hotspot && hotspot.clueId) {
      addClueToRoom(room, joinedRole, hotspot.clueId);
    }
    broadcast(room);
    cb && cb({ ok: true, clueId: hotspot ? hotspot.clueId : null });
  });

  socket.on("interview:ask", (payload = {}, cb) => {
    if (!allowEvent("interview:ask", 30, 60_000)) {
      return cb && cb({ ok: false, error: "Slow down and review the statement before continuing." });
    }
    const { personId, questionId, approach, evidenceId } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || room.phase !== "investigation" || !joinedRole) {
      return cb && cb({ ok: false, error: "No active interview." });
    }
    if (!canAskInterviewQuestion(room, joinedRole, personId, questionId)) {
      return cb && cb({ ok: false, error: "That line of questioning is not available yet." });
    }

    const question = caseIndex.questions.get(questionId);
    const interviewState = room.interviewStates[personId] || { composure: 3, missteps: 0 };
    if (approach !== approachForQuestion(question)) {
      interviewState.composure = Math.max(1, interviewState.composure - 1);
      interviewState.missteps += 1;
      room.interviewStates[personId] = interviewState;
      broadcast(room);
      return cb && cb({
        ok: false,
        soft: true,
        error: approach === "pressure"
          ? "They close off under pressure. Read their demeanor and try a different approach."
          : "The question lands badly. Match your approach to the subject, the line, and any proof you hold."
      });
    }
    if (approach === "evidence" && (!ownsFoundClue(room, evidenceId) || !evidenceMatchesQuestion(question, evidenceId))) {
      interviewState.composure = Math.max(1, interviewState.composure - 1);
      interviewState.missteps += 1;
      room.interviewStates[personId] = interviewState;
      broadcast(room);
      return cb && cb({
        ok: false,
        soft: true,
        error: "They read the file and push it back. It does not prove the claim in this question—choose the record that directly bears on their words."
      });
    }
    if (approach === "rapport") interviewState.composure = Math.min(3, interviewState.composure + 1);
    room.interviewStates[personId] = interviewState;
    room.questionsAsked.push(questionId);
    if (approach === "evidence") {
      room.interviewEvidence[questionId] = evidenceId;
      if (room.activity && room.activity.B) room.activity.B.evidencePresented += 1;
    }
    if (room.activity && room.activity.B) room.activity.B.interviewsCompleted += 1;
    room.progressAt = Date.now();
    if (question.clueId) addClueToRoom(room, joinedRole, question.clueId);
    if (question.confrontationId && !room.confrontationsSolved.includes(question.confrontationId)) {
      room.confrontationsSolved.push(question.confrontationId);
    }
    broadcast(room);
    cb && cb({ ok: true, clueId: question.clueId || null, confrontationId: question.confrontationId || null });
  });

  socket.on("board:move", (payload = {}) => {
    if (!allowEvent("board:move", 80, 10_000)) return;
    const { clueId, x, y } = payload || {};
    const room = rooms.get(joinedCode);
    const position = clampBoardPosition(Number(x), Number(y));
    if (!isCaseOneRoom(room) || !position || !ownsFoundClue(room, clueId)) return;
    room.board.pins[clueId] = position;
    broadcast(room);
  });

  socket.on("board:link", (payload = {}, cb) => {
    if (!allowEvent("board:link", 20, 10_000)) return cb && cb({ ok: false, error: "Too many link attempts. Review the files first." });
    const { a, b } = payload || {};
    const room = rooms.get(joinedCode);
    if (room && room.activity && room.activity.team) room.activity.team.boardAttempts += 1;
    if (!isCaseOneRoom(room) || a === b || !ownsFoundClue(room, a) || !ownsFoundClue(room, b)) {
      return cb && cb({ ok: false, error: "Choose two filed pieces of evidence." });
    }
    const exists = room.board.links.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (exists) {
      return cb && cb({ ok: true, alreadySolved: true });
    }
    const deduction = deductionForLink(a, b);
    if (!deduction) {
      return cb && cb({ ok: false, error: "Those two items do not prove a defensible conclusion." });
    }
    room.board.links.push([a, b]);
    if (!room.deductionsSolved.includes(deduction.id)) room.deductionsSolved.push(deduction.id);
    room.progressAt = Date.now();
    broadcast(room);
    cb && cb({ ok: true, deductionId: deduction.id });
  });

  socket.on("thread:update", (payload = {}) => {
    const { threadId, update } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "investigation" || room.threadsSolved.includes(threadId)) return;
    const clean = sanitizeThreadUpdate(room, threadId, update);
    if (!Object.keys(clean).length) return;
    room.threadDrafts[threadId] = { ...(room.threadDrafts[threadId] || {}), ...clean };
    broadcast(room);
  });

  socket.on("thread:submit", (payload = {}, cb) => {
    if (!allowEvent("thread:submit", 12, 60_000)) return cb && cb({ ok: false, error: "Too many theory attempts. Review the case files first." });
    const { threadId } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "investigation") return cb && cb({ ok: false, error: "Return to the investigation first." });
    if (room.activity && room.activity.team) room.activity.team.threadAttempts += 1;
    if (room.threadsSolved.includes(threadId)) return cb && cb({ ok: true, alreadySolved: true });
    const draft = room.threadDrafts[threadId] || {};
    if (!threadSolutionMatches(threadId, draft)) {
      const evaluation = evaluateThreadDraft(threadId, draft);
      room.hintState ||= { threadFailures: 0 };
      room.hintState.threadFailures += 1;
      broadcast(room);
      return cb && cb({
        ok: false,
        soft: true,
        evaluation,
        error: evaluation
          ? room.difficulty === "noir"
            ? "The theory does not hold. At least one file is serving the wrong reasoning role."
            : `${evaluation.matched}/${evaluation.total} roles hold. Reconsider “${evaluation.weakLabel}”; that file proves something else.`
          : "That theory leaves a contradiction unresolved."
      });
    }
    room.threadsSolved.push(threadId);
    room.progressAt = Date.now();
    broadcast(room);
    cb && cb({ ok: true, threadId });
  });

  socket.on("operation:submit", (payload = {}, cb) => {
    if (!allowEvent("operation:submit", 12, 60_000)) return cb && cb({ ok: false, error: "Pause and compare the two copies before trying again." });
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "investigation" || !operationUnlocked(room)) {
      return cb && cb({ ok: false, error: "The cross-wire trace is not available yet." });
    }
    const partnerRole = joinedRole === "A" ? "B" : "A";
    if (!room.players[partnerRole] || !room.players[partnerRole].connected) {
      return cb && cb({ ok: false, error: "Your partner must be on the line to run this trace." });
    }
    if (room.operation.solved || room.operation.submissions[joinedRole]) {
      return cb && cb({ ok: true, alreadySolved: true });
    }
    if (room.activity && room.activity[joinedRole]) room.activity[joinedRole].operationAttempts += 1;
    if (!operationAnswerMatches(joinedRole, payload.answer)) {
      broadcast(room);
      return cb && cb({
        ok: false,
        soft: true,
        error: joinedRole === "A"
          ? "Dispatch rejects the route. Ask your partner for the exact order—not the digits."
          : "That line does not serve the berth on the Street copy. Confirm the stamped berth with your partner."
      });
    }
    room.operation.submissions[joinedRole] = true;
    if (room.operation.submissions.A && room.operation.submissions.B) {
      room.operation.solved = true;
      room.progressAt = Date.now();
    }
    broadcast(room);
    cb && cb({ ok: true, solved: room.operation.solved });
  });

  socket.on("hunch:lock", (payload = {}, cb) => {
    const room = rooms.get(joinedCode);
    const suspectId = typeof payload.suspectId === "string" ? payload.suspectId : "";
    const totalFound = room ? room.found.A.length + room.found.B.length : 0;
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "investigation" || totalFound < 5 || !caseData.suspects.includes(suspectId)) {
      return cb && cb({ ok: false, error: "The private hunch is not available yet." });
    }
    if (room.hunches[joinedRole]) return cb && cb({ ok: true, alreadyLocked: true });
    room.hunches[joinedRole] = suspectId;
    broadcast(room);
    cb && cb({ ok: true, suspectId });
  });

  socket.on("hint:used", () => {
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "investigation") return;
    if (room.activity && room.activity.team) room.activity.team.hintsUsed += 1;
    broadcast(room);
  });

  socket.on("chat:send", (payload = {}) => {
    if (!allowEvent("chat:send", 15, 10_000)) return;
    const { text } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || typeof text !== "string" || !text.trim()) return;
    const player = room.players[joinedRole];
    if (room.activity && room.activity[joinedRole]) room.activity[joinedRole].radioMessages += 1;
    room.chat.push({ id: crypto.randomUUID(), role: joinedRole, name: player ? player.name : joinedRole, text: text.trim().slice(0, 500), ts: Date.now() });
    if (room.chat.length > 200) room.chat.shift();
    broadcast(room);
  });

  socket.on("accusation:update", (partial) => {
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || room.phase !== "accusation" || !accusationUnlocked(room)) return;
    const clean = sanitizeAccusationUpdate(partial);
    if (!Object.keys(clean).length) return;
    Object.assign(room.accusationDraft, clean);
    // Any edit to the core fields clears both ready flags
    room.accusationDraft.readyA = false;
    room.accusationDraft.readyB = false;
    broadcast(room);
  });

  socket.on("accusation:ready", (payload = {}) => {
    const { ready } = payload || {};
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "accusation" || !accusationUnlocked(room)) return;
    const { suspect, location, motive, method } = room.accusationDraft;
    if (!suspect || !location || !motive || !method) return;
    room.accusationDraft[joinedRole === "A" ? "readyA" : "readyB"] = !!ready;

    if (room.accusationDraft.readyA && room.accusationDraft.readyB) {
      room.result = scoreAccusation({ suspect, location, motive, method });
      room.completedAt = Date.now();
      room.phase = "ending";
    }
    broadcast(room);
  });

  socket.on("restart:ready", (payload = {}) => {
    if (!allowEvent("readiness", 20, 10_000)) return;
    const room = rooms.get(joinedCode);
    if (!isCaseOneRoom(room) || !joinedRole || room.phase !== "ending") return;
    room.restartReady[joinedRole] = !!payload.ready;
    if (!bothPlayersReady(room, "restartReady")) {
      broadcast(room);
      return;
    }
    room.phase = "briefing";
    room.found = { A: [], B: [] };
    room.flavorSeen = { A: [], B: [] };
    room.puzzlesSolved = {};
    room.actUnlocked = 1;
    room.board = { pins: {}, links: [] };
    room.chat = [];
    room.questionsAsked = [];
    room.interviewEvidence = {};
    room.interviewStates = {};
    room.confrontationsSolved = [];
    room.deductionsSolved = [];
    room.threadDrafts = {};
    room.threadsSolved = [];
    room.operation = { submissions: { A: false, B: false }, solved: false };
    room.hintState = { threadFailures: 0 };
    room.progressAt = Date.now();
    room.briefingReady = { A: false, B: false };
    room.difficultyVotes = { A: null, B: null };
    room.difficulty = null;
    room.callReady = { A: false, B: false };
    room.restartReady = { A: false, B: false };
    room.accusationDraft = { suspect: null, location: null, motive: null, method: null, readyA: false, readyB: false };
    room.hunches = { A: null, B: null };
    room.activity = freshActivity();
    room.startedAt = null;
    room.completedAt = null;
    room.result = null;
    broadcast(room);
  });

  // File 02 runs on a separate state machine: private paired decisions,
  // shared alert pressure, mutual checkpoint acknowledgements, and a split
  // final protocol. Keeping these events namespaced prevents either case from
  // mutating the other case's room shape.
  socket.on("case2:difficulty:vote", (payload = {}, cb) => {
    if (!allowEvent("case2:difficulty", 12, 10_000)) return cb && cb({ ok: false, error: "Pause and agree on one operation mode." });
    const room = rooms.get(joinedCode);
    const difficulty = typeof payload.difficulty === "string" ? payload.difficulty : "";
    if (!isCaseTwoRoom(room) || !joinedRole || room.phase !== "briefing" || !caseTwoData.difficultyOptions.some((option) => option.id === difficulty)) {
      return cb && cb({ ok: false, error: "That operation mode is not available." });
    }
    room.difficultyVotes[joinedRole] = difficulty;
    room.difficulty = room.difficultyVotes.A && room.difficultyVotes.A === room.difficultyVotes.B ? difficulty : null;
    room.briefingReady = { A: false, B: false };
    broadcast(room);
    cb && cb({ ok: true, confirmed: !!room.difficulty });
  });

  socket.on("case2:briefing:ready", (payload = {}, cb) => {
    if (!allowEvent("case2:readiness", 20, 10_000)) return cb && cb({ ok: false, error: "Readiness is changing too quickly." });
    const room = rooms.get(joinedCode);
    if (!isCaseTwoRoom(room) || !joinedRole || room.phase !== "briefing" || !caseTwoDifficultyConfirmed(room)) {
      return cb && cb({ ok: false, error: "Both detectives must confirm the same mode first." });
    }
    room.briefingReady[joinedRole] = !!payload.ready;
    if (bothPlayersReady(room, "briefingReady")) {
      room.phase = "operation";
      room.startedAt = Date.now();
    }
    broadcast(room);
    cb && cb({ ok: true });
  });

  socket.on("case2:stage:lock", (payload = {}, cb) => {
    if (!allowEvent("case2:stage:lock", 16, 60_000)) return cb && cb({ ok: false, error: "The circuit is rejecting rapid inputs. Compare dispatches first." });
    const room = rooms.get(joinedCode);
    const choiceId = typeof payload.choiceId === "string" ? payload.choiceId : "";
    if (!isCaseTwoRoom(room) || !joinedRole || room.phase !== "operation" || room.stageResolved || !validStageChoice(room, joinedRole, choiceId)) {
      return cb && cb({ ok: false, error: "That checkpoint choice is not available." });
    }
    const partnerRole = joinedRole === "A" ? "B" : "A";
    if (!room.players[partnerRole] || !room.players[partnerRole].connected) {
      return cb && cb({ ok: false, error: "Your partner must be on the line before a checkpoint can lock." });
    }
    if (room.stageLocks[joinedRole]) return cb && cb({ ok: true, waiting: true, alreadyLocked: true });
    room.stageLocks[joinedRole] = choiceId;
    room.activity[joinedRole].locks += 1;
    if (room.stageLocks.A && room.stageLocks.B) {
      room.activity.pairAttempts += 1;
      const stage = stageAt(room);
      if (stagePairMatches(room)) {
        room.stageResolved = true;
        room.stageAcknowledged = { A: false, B: false };
        room.lastFailure = null;
        room.stageHistory.push({ id: stage.id, outcome: stage.outcome });
      } else {
        room.alertLevel = Math.min(3, room.alertLevel + 1);
        room.lastFailure = stage.failure[room.difficulty] || stage.failure.field;
        room.stageLocks = { A: null, B: null };
      }
    }
    broadcast(room);
    cb && cb({ ok: true, resolved: room.stageResolved, waiting: !room.stageLocks[partnerRole] });
  });

  socket.on("case2:stage:acknowledge", (payload = {}, cb) => {
    if (!allowEvent("case2:readiness", 20, 10_000)) return cb && cb({ ok: false, error: "Checkpoint acknowledgement is changing too quickly." });
    const room = rooms.get(joinedCode);
    if (!isCaseTwoRoom(room) || !joinedRole || room.phase !== "operation" || !room.stageResolved) {
      return cb && cb({ ok: false, error: "There is no resolved checkpoint to acknowledge." });
    }
    room.stageAcknowledged[joinedRole] = payload.ready !== false;
    if (bothPlayersReady(room, "stageAcknowledged")) {
      if (room.stageIndex >= caseTwoData.stages.length - 1) {
        room.phase = "convergence";
      } else {
        room.stageIndex += 1;
        room.stageLocks = { A: null, B: null };
        room.stageResolved = false;
        room.stageAcknowledged = { A: false, B: false };
        room.lastFailure = null;
      }
    }
    broadcast(room);
    cb && cb({ ok: true });
  });

  socket.on("case2:hint", (payload = {}, cb) => {
    if (!allowEvent("case2:hint", 4, 60_000)) return cb && cb({ ok: false, error: "No further dispatch is available yet." });
    const room = rooms.get(joinedCode);
    const stage = room && stageAt(room);
    if (!isCaseTwoRoom(room) || !joinedRole || room.phase !== "operation" || !stage) {
      return cb && cb({ ok: false, error: "No active checkpoint." });
    }
    room.activity[joinedRole].hintsUsed += 1;
    broadcast(room);
    cb && cb({ ok: true, hint: stage.roles[joinedRole].request });
  });

  socket.on("case2:chat", (payload = {}) => {
    if (!allowEvent("case2:chat", 15, 10_000)) return;
    const room = rooms.get(joinedCode);
    const message = typeof payload.text === "string" ? payload.text.trim().slice(0, 500) : "";
    if (!isCaseTwoRoom(room) || !joinedRole || !["operation", "convergence"].includes(room.phase) || !message) return;
    const player = room.players[joinedRole];
    room.activity[joinedRole].radioMessages += 1;
    room.chat.push({ id: crypto.randomUUID(), role: joinedRole, name: player ? player.name : joinedRole, text: message, ts: Date.now() });
    if (room.chat.length > 200) room.chat.shift();
    broadcast(room);
  });

  socket.on("case2:final:lock", (payload = {}, cb) => {
    if (!allowEvent("case2:final", 8, 60_000)) return cb && cb({ ok: false, error: "The final circuit needs a moment before another transmission." });
    const room = rooms.get(joinedCode);
    if (!isCaseTwoRoom(room) || !joinedRole || room.phase !== "convergence") {
      return cb && cb({ ok: false, error: "The final protocol is not open." });
    }
    const partnerRole = joinedRole === "A" ? "B" : "A";
    if (!room.players[partnerRole] || !room.players[partnerRole].connected) {
      return cb && cb({ ok: false, error: "Your partner must be connected before you seal the final protocol." });
    }
    if (room.finalLocked[joinedRole]) return cb && cb({ ok: true, alreadyLocked: true });
    const draft = sanitizeFinalDraft(joinedRole, payload.draft);
    if (!draft) return cb && cb({ ok: false, error: "Complete both parts of your private protocol." });
    room.finalDrafts[joinedRole] = draft;
    room.finalLocked[joinedRole] = true;
    if (room.finalLocked.A && room.finalLocked.B) {
      room.result = scoreFinalProtocol(room);
      room.completedAt = Date.now();
      room.phase = "ending";
    }
    broadcast(room);
    cb && cb({ ok: true });
  });

  socket.on("case2:restart:ready", (payload = {}, cb) => {
    if (!allowEvent("case2:readiness", 20, 10_000)) return cb && cb({ ok: false, error: "Readiness is changing too quickly." });
    const room = rooms.get(joinedCode);
    if (!isCaseTwoRoom(room) || !joinedRole || room.phase !== "ending") {
      return cb && cb({ ok: false, error: "The operation has not ended." });
    }
    room.restartReady[joinedRole] = !!payload.ready;
    if (bothPlayersReady(room, "restartReady")) resetCaseTwoRoom(room);
    broadcast(room);
    cb && cb({ ok: true });
  });

  socket.on("disconnect", () => {
    const room = rooms.get(joinedCode);
    if (!room || !joinedRole) return;
    if (room.players[joinedRole]) room.players[joinedRole].connected = false;
    if (room.phase === "briefing" && room.briefingReady) room.briefingReady[joinedRole] = false;
    if (room.phase === "investigation" && room.callReady) room.callReady[joinedRole] = false;
    if (room.phase === "ending" && room.restartReady) room.restartReady[joinedRole] = false;
    broadcast(room);
    // Keep persisted cases resumable for a full day. Memory-only cases use a
    // shorter window so an unattended process cannot grow forever.
    const codeToClean = joinedCode;
    setTimeout(() => {
      const r = rooms.get(codeToClean);
      if (r && !(r.players.A && r.players.A.connected) && !(r.players.B && r.players.B.connected)) {
        rooms.delete(codeToClean);
        roomStore.scheduleSave(rooms);
      }
    }, roomStore.mode === "file" ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000);
  });
});

server.listen(PORT, () => {
  console.log(`NOCTURNE running at http://localhost:${PORT} (${roomStore.mode} room persistence)`);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    roomStore.flush(rooms);
  } catch (error) {
    console.error(`NOCTURNE room store could not be flushed: ${error.message}`);
  }
  server.close(() => process.exit(0));
  const forcedExit = setTimeout(() => process.exit(1), 5000);
  if (forcedExit.unref) forcedExit.unref();
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
