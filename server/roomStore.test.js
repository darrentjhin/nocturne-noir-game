const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createRoomStore } = require("./roomStore");

function exampleRoom(updatedAt) {
  return {
    code: "N0IR5",
    phase: "investigation",
    players: {
      A: { socketId: "socket-a", name: "Mara", connected: true, resumeToken: "token-a" },
      B: { socketId: "socket-b", name: "Jules", connected: true, resumeToken: "token-b" }
    },
    found: { A: ["A4"], B: ["B2"] },
    flavorSeen: { A: [], B: [] },
    puzzlesSolved: {},
    actUnlocked: 2,
    board: { pins: {}, links: [["A4", "B2"]] },
    chat: [],
    questionsAsked: ["victor-where", "victor-finance"],
    confrontationsSolved: ["dane-payments"],
    deductionsSolved: ["victor-cleared"],
    threadDrafts: { timeline: { claim: "B3" } },
    threadsSolved: ["timeline"],
    briefingReady: { A: false, B: false },
    callReady: { A: false, B: false },
    restartReady: { A: false, B: false },
    accusationDraft: { suspect: null, location: null, motive: null, method: null, readyA: false, readyB: false },
    result: null,
    updatedAt
  };
}

test("file persistence restores a resumable case without stale sockets", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nocturne-store-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "rooms.json");
  const now = 1_800_000_000_000;
  const store = createRoomStore(file, { now: () => now });
  store.saveNow(new Map([["N0IR5", exampleRoom(now)]]));

  const loaded = store.load();
  const room = loaded.get("N0IR5");
  assert.equal(store.mode, "file");
  assert.ok(room);
  assert.equal(room.players.A.connected, false);
  assert.equal(room.players.A.socketId, null);
  assert.equal(room.players.A.resumeToken, "token-a");
  assert.deepEqual(room.deductionsSolved, ["victor-cleared"]);
  assert.deepEqual(room.threadDrafts, { timeline: { claim: "B3" } });
  assert.deepEqual(room.threadsSolved, ["timeline"]);
  assert.deepEqual(room.interviewEvidence, {});
  assert.deepEqual(room.operation, { submissions: { A: false, B: false }, solved: false });
  assert.deepEqual(room.difficultyVotes, { A: null, B: null });
  assert.equal(room.difficulty, null);
  assert.deepEqual(room.hunches, { A: null, B: null });
  assert.deepEqual(room.hintState, { threadFailures: 0 });
  assert.equal(room.progressAt, now);
  assert.deepEqual(room.questionsAsked, ["victor-where", "victor-finance"]);
  assert.deepEqual(room.confrontationsSolved, ["dane-payments"]);
  assert.deepEqual(room.briefingReady, { A: false, B: false });
  assert.deepEqual(room.callReady, { A: false, B: false });
  assert.deepEqual(room.restartReady, { A: false, B: false });
  assert.deepEqual(room.board.links, [["A4", "B2"]]);
});

test("expired and corrupt room stores fail closed", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nocturne-store-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "rooms.json");
  const now = 1_800_000_000_000;
  const store = createRoomStore(file, { now: () => now, maxAgeMs: 1_000 });
  store.saveNow(new Map([["N0IR5", exampleRoom(now - 1_001)]]));
  assert.equal(store.load().size, 0);

  fs.writeFileSync(file, "not-json", "utf8");
  assert.equal(store.load().size, 0);
});

test("memory mode performs no filesystem work", () => {
  const store = createRoomStore();
  assert.equal(store.mode, "memory");
  assert.equal(store.load().size, 0);
  assert.doesNotThrow(() => store.saveNow(new Map()));
  assert.doesNotThrow(() => store.flush(new Map()));
});
