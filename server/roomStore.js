const fs = require("node:fs");
const path = require("node:path");

const STORE_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SEAT_RELEASE_MS = 2 * 60 * 1000;

function roomForStorage(room) {
  return {
    ...room,
    players: {
      A: room.players.A ? { ...room.players.A, socketId: null, connected: false } : null,
      B: room.players.B ? { ...room.players.B, socketId: null, connected: false } : null
    }
  };
}

function normalizeRoom(room, now, maxAgeMs, seatReleaseMs = DEFAULT_SEAT_RELEASE_MS) {
  if (!room || typeof room !== "object" || typeof room.code !== "string") return null;
  if (!Number.isFinite(room.updatedAt) || now - room.updatedAt > maxAgeMs) return null;
  const caseId = room.caseId || "the-last-reel";
  const normalizePlayer = (player) => player ? {
    ...player,
    socketId: null,
    connected: false,
    disconnectedAt: Number.isFinite(player.disconnectedAt) ? player.disconnectedAt : now,
    releaseEligibleAt: Number.isFinite(player.releaseEligibleAt) ? player.releaseEligibleAt : now + seatReleaseMs
  } : null;
  const players = {
    A: normalizePlayer(room.players && room.players.A),
    B: normalizePlayer(room.players && room.players.B)
  };

  if (caseId === "black-sun-ledger") {
    return {
      ...room,
      caseId,
      players,
      phase: ["lobby", "briefing", "operation", "convergence", "ending"].includes(room.phase) ? room.phase : "lobby",
      difficultyVotes: { A: null, B: null, ...(room.difficultyVotes || {}) },
      difficulty: typeof room.difficulty === "string" ? room.difficulty : null,
      briefingReady: { A: false, B: false, ...(room.briefingReady || {}) },
      stageIndex: Number.isInteger(room.stageIndex) ? Math.max(0, Math.min(3, room.stageIndex)) : 0,
      stageLocks: { A: null, B: null, ...(room.stageLocks || {}) },
      stageResolved: !!room.stageResolved,
      stageAcknowledged: { A: false, B: false, ...(room.stageAcknowledged || {}) },
      stageHistory: Array.isArray(room.stageHistory) ? room.stageHistory.slice(0, 4) : [],
      lastFailure: typeof room.lastFailure === "string" ? room.lastFailure : null,
      alertLevel: Number.isInteger(room.alertLevel) ? Math.max(0, Math.min(3, room.alertLevel)) : 0,
      chat: Array.isArray(room.chat) ? room.chat.slice(-200) : [],
      notes: {
        A: typeof (room.notes && room.notes.A) === "string" ? room.notes.A.slice(0, 6000) : "",
        B: typeof (room.notes && room.notes.B) === "string" ? room.notes.B.slice(0, 6000) : ""
      },
      finalDrafts: { A: null, B: null, ...(room.finalDrafts || {}) },
      finalLocked: { A: false, B: false, ...(room.finalLocked || {}) },
      restartReady: { A: false, B: false, ...(room.restartReady || {}) },
      activity: {
        A: { locks: 0, radioMessages: 0, hintsUsed: 0, ...((room.activity && room.activity.A) || {}) },
        B: { locks: 0, radioMessages: 0, hintsUsed: 0, ...((room.activity && room.activity.B) || {}) },
        pairAttempts: Number.isFinite(room.activity && room.activity.pairAttempts) ? room.activity.pairAttempts : 0
      },
      startedAt: Number.isFinite(room.startedAt) ? room.startedAt : null,
      completedAt: Number.isFinite(room.completedAt) ? room.completedAt : null,
      result: room.result || null
    };
  }

  if (!room.found || !Array.isArray(room.found.A) || !Array.isArray(room.found.B)) return null;

  return {
    ...room,
    caseId,
    players,
    flavorSeen: room.flavorSeen || { A: [], B: [] },
    puzzlesSolved: room.puzzlesSolved || {},
    board: room.board || { pins: {}, links: [] },
    chat: Array.isArray(room.chat) ? room.chat.slice(-200) : [],
    notes: {
      A: typeof (room.notes && room.notes.A) === "string" ? room.notes.A.slice(0, 6000) : "",
      B: typeof (room.notes && room.notes.B) === "string" ? room.notes.B.slice(0, 6000) : ""
    },
    questionsAsked: Array.isArray(room.questionsAsked) ? room.questionsAsked : [],
    interviewEvidence: room.interviewEvidence && typeof room.interviewEvidence === "object" ? room.interviewEvidence : {},
    interviewStates: room.interviewStates && typeof room.interviewStates === "object" ? room.interviewStates : {},
    confrontationsSolved: Array.isArray(room.confrontationsSolved) ? room.confrontationsSolved : [],
    deductionsSolved: Array.isArray(room.deductionsSolved) ? room.deductionsSolved : [],
    threadDrafts: room.threadDrafts && typeof room.threadDrafts === "object" ? room.threadDrafts : {},
    threadsSolved: Array.isArray(room.threadsSolved) ? room.threadsSolved : [],
    operation: {
      submissions: { A: false, B: false, ...((room.operation && room.operation.submissions) || {}) },
      solved: !!(room.operation && room.operation.solved)
    },
    hintState: { threadFailures: 0, ...(room.hintState || {}) },
    progressAt: Number.isFinite(room.progressAt) ? room.progressAt : room.updatedAt,
    briefingReady: { A: false, B: false, ...(room.briefingReady || {}) },
    difficultyVotes: { A: null, B: null, ...(room.difficultyVotes || {}) },
    difficulty: typeof room.difficulty === "string" ? room.difficulty : null,
    callReady: { A: false, B: false, ...(room.callReady || {}) },
    restartReady: { A: false, B: false, ...(room.restartReady || {}) },
    accusationDraft: {
      suspect: null,
      location: null,
      motive: null,
      method: null,
      readyA: false,
      readyB: false,
      ...(room.accusationDraft || {})
    },
    hunches: { A: null, B: null, ...(room.hunches || {}) },
    activity: room.activity && typeof room.activity === "object" ? room.activity : null,
    startedAt: Number.isFinite(room.startedAt) ? room.startedAt : null,
    completedAt: Number.isFinite(room.completedAt) ? room.completedAt : null,
    result: room.result || null
  };
}

function createRoomStore(filePath, options = {}) {
  const maxAgeMs = options.maxAgeMs || DEFAULT_MAX_AGE_MS;
  const seatReleaseMs = options.seatReleaseMs || DEFAULT_SEAT_RELEASE_MS;
  const now = options.now || (() => Date.now());
  const resolvedPath = filePath ? path.resolve(filePath) : null;
  let timer = null;
  let pendingRooms = null;

  function load() {
    if (!resolvedPath || !fs.existsSync(resolvedPath)) return new Map();
    try {
      const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
      if (!parsed || parsed.version !== STORE_VERSION || !Array.isArray(parsed.rooms)) return new Map();
      const loaded = new Map();
      for (const rawRoom of parsed.rooms) {
        const room = normalizeRoom(rawRoom, now(), maxAgeMs, seatReleaseMs);
        if (room) loaded.set(room.code, room);
      }
      return loaded;
    } catch (error) {
      console.warn(`NOCTURNE room store could not be loaded: ${error.message}`);
      return new Map();
    }
  }

  function saveNow(rooms) {
    if (!resolvedPath) return;
    const directory = path.dirname(resolvedPath);
    fs.mkdirSync(directory, { recursive: true });
    const temporaryPath = `${resolvedPath}.${process.pid}.tmp`;
    const payload = {
      version: STORE_VERSION,
      savedAt: now(),
      rooms: Array.from(rooms.values(), roomForStorage)
    };
    fs.writeFileSync(temporaryPath, JSON.stringify(payload), "utf8");
    fs.renameSync(temporaryPath, resolvedPath);
  }

  function scheduleSave(rooms) {
    if (!resolvedPath) return;
    pendingRooms = rooms;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const roomsToSave = pendingRooms;
      pendingRooms = null;
      try {
        saveNow(roomsToSave);
      } catch (error) {
        console.error(`NOCTURNE room store could not be saved: ${error.message}`);
      }
    }, 100);
    if (timer.unref) timer.unref();
  }

  function flush(rooms) {
    if (!resolvedPath) return;
    if (timer) clearTimeout(timer);
    timer = null;
    pendingRooms = null;
    saveNow(rooms);
  }

  return {
    mode: resolvedPath ? "file" : "memory",
    path: resolvedPath,
    load,
    saveNow,
    scheduleSave,
    flush
  };
}

module.exports = { createRoomStore, normalizeRoom, roomForStorage };
