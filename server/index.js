const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const caseData = require("./caseData");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 4173;

app.use(express.static(path.join(__dirname, "..", "public")));
app.get("/api/case", (req, res) => res.json(caseData));

// In-memory rooms. This is a private two-player party game — no DB needed.
// rooms[code] = {
//   code, phase: 'lobby'|'briefing'|'investigation'|'accusation'|'ending',
//   players: { A: {socketId, name, connected}, B: {...} },
//   found: { A: [clueId...], B: [clueId...] },   // clues each role has revealed
//   board: { pins: {clueId: {x,y}}, links: [[id,id]] },
//   chat: [{role, name, text, ts}],
//   accusationDraft: { suspect, location, motive, readyA, readyB },
//   result: null
// }
const rooms = new Map();

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function freshRoom(code) {
  return {
    code,
    phase: "lobby",
    players: { A: null, B: null },
    found: { A: [], B: [] },
    board: { pins: {}, links: [] },
    chat: [],
    accusationDraft: { suspect: null, location: null, motive: null, readyA: false, readyB: false },
    result: null
  };
}

function publicRoomState(room) {
  return {
    code: room.code,
    phase: room.phase,
    players: {
      A: room.players.A ? { name: room.players.A.name, connected: room.players.A.connected } : null,
      B: room.players.B ? { name: room.players.B.name, connected: room.players.B.connected } : null
    },
    found: room.found,
    board: room.board,
    chat: room.chat,
    accusationDraft: room.accusationDraft,
    result: room.result
  };
}

function broadcast(room) {
  io.to(room.code).emit("room:state", publicRoomState(room));
}

io.on("connection", (socket) => {
  let joinedCode = null;
  let joinedRole = null;

  socket.on("room:create", ({ name }, cb) => {
    const code = makeRoomCode();
    const room = freshRoom(code);
    rooms.set(code, room);
    cb && cb({ ok: true, code });
  });

  socket.on("room:join", ({ code, role, name }, cb) => {
    code = (code || "").toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return cb && cb({ ok: false, error: "No case open with that code." });

    // Auto-assign role if not specified or taken
    let takeRole = role;
    if (!takeRole || (room.players[takeRole] && room.players[takeRole].connected)) {
      takeRole = !room.players.A ? "A" : !room.players.B ? "B" : null;
    }
    if (!takeRole || (room.players[takeRole] && room.players[takeRole].connected)) {
      return cb && cb({ ok: false, error: "Both detectives are already on this case." });
    }

    room.players[takeRole] = { socketId: socket.id, name: name || `Detective ${takeRole}`, connected: true };
    socket.join(code);
    joinedCode = code;
    joinedRole = takeRole;

    if (room.players.A && room.players.B && room.phase === "lobby") {
      room.phase = "briefing";
    }

    cb && cb({ ok: true, code, role: takeRole, name: room.players[takeRole].name, case: caseData });
    broadcast(room);
  });

  socket.on("phase:advance", ({ phase }) => {
    const room = rooms.get(joinedCode);
    if (!room) return;
    room.phase = phase;
    broadcast(room);
  });

  socket.on("clue:found", ({ clueId }) => {
    const room = rooms.get(joinedCode);
    if (!room || !joinedRole) return;
    if (!room.found[joinedRole].includes(clueId)) {
      room.found[joinedRole].push(clueId);
      // default pin position: staggered grid so new cards don't stack exactly
      const totalFound = room.found.A.length + room.found.B.length;
      const col = totalFound % 4;
      const row = Math.floor(totalFound / 4);
      room.board.pins[clueId] = { x: 14 + col * 22, y: 18 + row * 28 };
    }
    broadcast(room);
  });

  socket.on("board:move", ({ clueId, x, y }) => {
    const room = rooms.get(joinedCode);
    if (!room) return;
    room.board.pins[clueId] = { x, y };
    broadcast(room);
  });

  socket.on("board:link", ({ a, b }) => {
    const room = rooms.get(joinedCode);
    if (!room) return;
    const exists = room.board.links.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (exists) {
      room.board.links = room.board.links.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a)));
    } else {
      room.board.links.push([a, b]);
    }
    broadcast(room);
  });

  socket.on("chat:send", ({ text }) => {
    const room = rooms.get(joinedCode);
    if (!room || !joinedRole || !text || !text.trim()) return;
    const player = room.players[joinedRole];
    room.chat.push({ role: joinedRole, name: player ? player.name : joinedRole, text: text.trim().slice(0, 500), ts: Date.now() });
    if (room.chat.length > 200) room.chat.shift();
    broadcast(room);
  });

  socket.on("accusation:update", (partial) => {
    const room = rooms.get(joinedCode);
    if (!room) return;
    Object.assign(room.accusationDraft, partial);
    // Any edit to the core fields clears both ready flags
    if ("suspect" in partial || "location" in partial || "motive" in partial) {
      room.accusationDraft.readyA = false;
      room.accusationDraft.readyB = false;
    }
    broadcast(room);
  });

  socket.on("accusation:ready", ({ ready }) => {
    const room = rooms.get(joinedCode);
    if (!room || !joinedRole) return;
    room.accusationDraft[joinedRole === "A" ? "readyA" : "readyB"] = !!ready;

    if (room.accusationDraft.readyA && room.accusationDraft.readyB) {
      const { suspect, location, motive } = room.accusationDraft;
      const sol = caseData.solution;
      let ending;
      if (suspect === sol.suspect && location === sol.location && motive === sol.motive) {
        ending = "correct";
      } else if (suspect === sol.suspect) {
        ending = "partial";
      } else {
        ending = "wrong";
      }
      room.result = ending;
      room.phase = "ending";
    }
    broadcast(room);
  });

  socket.on("room:restart", () => {
    const room = rooms.get(joinedCode);
    if (!room) return;
    room.phase = "briefing";
    room.found = { A: [], B: [] };
    room.board = { pins: {}, links: [] };
    room.accusationDraft = { suspect: null, location: null, motive: null, readyA: false, readyB: false };
    room.result = null;
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(joinedCode);
    if (!room || !joinedRole) return;
    if (room.players[joinedRole]) room.players[joinedRole].connected = false;
    broadcast(room);
    // Clean up empty rooms after a while
    setTimeout(() => {
      const r = rooms.get(joinedCode);
      if (r && !(r.players.A && r.players.A.connected) && !(r.players.B && r.players.B.connected)) {
        rooms.delete(joinedCode);
      }
    }, 30 * 60 * 1000);
  });
});

server.listen(PORT, () => {
  console.log(`NOCTURNE running at http://localhost:${PORT}`);
});
