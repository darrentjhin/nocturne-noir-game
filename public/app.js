(function () {
  const socket = io();

  const SESSION_KEY = "nocturne_session";

  let myRole = null;
  let myCode = null;
  let caseData = null;
  let latestState = null;
  let linkMode = false;
  let linkSelectFirst = null;
  let openLeadId = null; // location/person id currently showing its clue list
  let pendingClueId = null; // clue just clicked, waiting to be "pinned" via modal close
  let topZ = 10;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    $("#" + id).classList.add("active");
  }

  function saveSession(code, role, name) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ code, role, name }));
    } catch (e) {}
  }
  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }
  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  // ---------- Landing tabs ----------
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      $$(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      $("#tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  $("#btn-create").addEventListener("click", () => {
    const name = $("#create-name").value.trim() || "Detective";
    socket.emit("room:create", { name }, (res) => {
      if (!res.ok) return showError(res.error);
      socket.emit("room:join", { code: res.code, name }, (res2) => {
        if (!res2.ok) return showError(res2.error);
        onJoined(res2);
      });
    });
  });

  $("#btn-join").addEventListener("click", () => {
    const name = $("#join-name").value.trim() || "Detective";
    const code = $("#join-code").value.trim().toUpperCase();
    if (!code) return showError("Enter a case code.");
    socket.emit("room:join", { code, name }, (res) => {
      if (!res.ok) return showError(res.error);
      onJoined(res);
    });
  });

  function showError(msg) {
    $("#landing-error").textContent = msg;
  }

  function onJoined(res) {
    myRole = res.role;
    myCode = res.code;
    caseData = res.case;
    saveSession(res.code, res.role, res.name || "");
    $("#lobby-code").textContent = myCode;
    showScreen("screen-lobby");
  }

  // ---------- Reconnect on load (survives refresh / phone lock / tab switch) ----------
  (function tryResume() {
    const saved = loadSession();
    if (!saved || !saved.code || !saved.role) return;
    showScreen("screen-lobby");
    $("#lobby-code").textContent = saved.code;
    $("#lobby-slot-A").textContent = "Reconnecting to your case...";
    socket.emit("room:join", { code: saved.code, role: saved.role, name: saved.name }, (res) => {
      if (!res || !res.ok) {
        clearSession();
        showScreen("screen-landing");
        return;
      }
      myRole = res.role;
      myCode = res.code;
      caseData = res.case;
    });
  })();

  $$(".leave-case").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      clearSession();
      window.location.reload();
    })
  );

  // ---------- State rendering ----------
  socket.on("room:state", (state) => {
    latestState = state;
    render(state);
  });

  function render(state) {
    // Lobby slots
    if (state.phase === "lobby" || (!$("#screen-lobby").classList.contains("active") === false)) {
      updateLobby(state);
    }

    if (state.phase === "lobby") {
      showScreen("screen-lobby");
      updateLobby(state);
      return;
    }

    if (state.phase === "briefing") {
      renderBriefing();
      showScreen("screen-briefing");
      return;
    }

    if (state.phase === "investigation") {
      renderInvestigation(state);
      showScreen("screen-investigation");
      return;
    }

    if (state.phase === "accusation") {
      renderAccusation(state);
      showScreen("screen-accusation");
      return;
    }

    if (state.phase === "ending") {
      renderEnding(state);
      showScreen("screen-ending");
      return;
    }
  }

  function updateLobby(state) {
    const a = $("#lobby-slot-A");
    const b = $("#lobby-slot-B");
    if (state.players.A) {
      a.textContent = `Detective A — ${state.players.A.name} ${state.players.A.connected ? "(connected)" : "(left)"}`;
      a.classList.toggle("filled", state.players.A.connected);
    } else {
      a.textContent = "Detective A — waiting...";
      a.classList.remove("filled");
    }
    if (state.players.B) {
      b.textContent = `Detective B — ${state.players.B.name} ${state.players.B.connected ? "(connected)" : "(left)"}`;
      b.classList.toggle("filled", state.players.B.connected);
    } else {
      b.textContent = "Detective B — waiting...";
      b.classList.remove("filled");
    }
  }

  // ---------- Briefing ----------
  function renderBriefing() {
    $("#briefing-headline").textContent = caseData.briefing.headline;
    $("#briefing-body").innerHTML = caseData.briefing.body.map((p) => `<p>${p}</p>`).join("");
    const role = caseData.roles[myRole];
    $("#role-callout").innerHTML = `
      <div class="role-name">You are: ${role.name}</div>
      <div class="role-tag">${role.tagline}</div>
    `;
  }

  $("#btn-begin").addEventListener("click", () => {
    socket.emit("phase:advance", { phase: "investigation" });
  });

  // ---------- Investigation ----------
  function leadsForMyRole() {
    return myRole === "A" ? caseData.locations : caseData.people;
  }

  function allCluesFlat() {
    const list = [];
    caseData.locations.forEach((l) => l.clues.forEach((c) => list.push({ ...c, ownerRole: "A", parent: l.name })));
    caseData.people.forEach((p) => p.clues.forEach((c) => list.push({ ...c, ownerRole: "B", parent: p.name })));
    return list;
  }
  const clueIndex = {};
  function buildClueIndex() {
    allCluesFlat().forEach((c) => (clueIndex[c.id] = c));
  }

  function renderInvestigation(state) {
    if (!Object.keys(clueIndex).length) buildClueIndex();

    $("#my-role-pill").textContent = caseData.roles[myRole].name;
    const partner = myRole === "A" ? state.players.B : state.players.A;
    const ps = $("#partner-status");
    if (partner && partner.connected) {
      ps.textContent = `${partner.name} — online`;
      ps.className = "partner-status online";
    } else if (partner) {
      ps.textContent = `${partner.name} — offline`;
      ps.className = "partner-status offline";
    } else {
      ps.textContent = "waiting for partner...";
      ps.className = "partner-status offline";
    }

    const totalClues = caseData.locations.reduce((n, l) => n + l.clues.length, 0) + caseData.people.reduce((n, p) => n + p.clues.length, 0);
    const foundTotal = state.found.A.length + state.found.B.length;
    $("#case-progress").textContent = `${foundTotal}/${totalClues} clues`;

    $("#leads-title").textContent = myRole === "A" ? "Locations" : "People";
    const leadsList = $("#leads-list");
    leadsList.innerHTML = "";
    const myFound = state.found[myRole];
    leadsForMyRole().forEach((lead) => {
      const foundCount = lead.clues.filter((c) => myFound.includes(c.id)).length;
      const exhausted = foundCount === lead.clues.length;
      const div = document.createElement("div");
      div.className = "lead-item" + (exhausted ? " exhausted" : "");
      div.innerHTML = `
        <div class="lead-name">${lead.name}${lead.role ? " — " + lead.role : ""}</div>
        <div class="lead-blurb">${lead.blurb}</div>
        <div class="lead-progress">${foundCount}/${lead.clues.length} clues found</div>
      `;
      div.addEventListener("click", () => openLead(lead, myFound));
      leadsList.appendChild(div);
    });

    renderCorkboard(state);
    renderChat(state);
  }

  function openLead(lead, myFound) {
    const next = lead.clues.find((c) => !myFound.includes(c.id));
    if (!next) return; // fully explored
    pendingClueId = next.id;
    $("#clue-modal-kicker").textContent = lead.name.toUpperCase();
    $("#clue-modal-title").textContent = next.title;
    $("#clue-modal-text").textContent = next.text;
    $("#clue-modal").classList.add("active");
  }

  $("#clue-modal-close").addEventListener("click", () => {
    if (pendingClueId) {
      socket.emit("clue:found", { clueId: pendingClueId });
      pendingClueId = null;
    }
    $("#clue-modal").classList.remove("active");
  });

  // ---------- Corkboard ----------
  function renderCorkboard(state) {
    const board = $("#corkboard");
    // remove old pin cards (keep svg)
    $$(".pin-card").forEach((el) => el.remove());

    const allFoundIds = [...state.found.A, ...state.found.B];
    allFoundIds.forEach((clueId) => {
      const clue = clueIndex[clueId];
      const pos = state.board.pins[clueId] || { x: 50, y: 50 };
      const card = document.createElement("div");
      card.className = "pin-card";
      card.dataset.clueId = clueId;
      card.style.left = pos.x + "%";
      card.style.top = pos.y + "%";
      card.innerHTML = `
        <div class="pin-title">${clue.title}</div>
        <div class="pin-text">${clue.text}</div>
        <div class="pin-owner">${clue.parent}</div>
      `;
      wireCardDrag(card, board);
      card.addEventListener("click", (e) => {
        if (!linkMode) return;
        e.stopPropagation();
        handleLinkClick(clueId, card);
      });
      board.appendChild(card);
    });

    drawLinks(state);
  }

  function wireCardDrag(card, board) {
    let dragging = false;

    function moveTo(clientX, clientY, rect) {
      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;
      x = Math.max(8, Math.min(92, x));
      y = Math.max(8, Math.min(92, y));
      card.style.left = x + "%";
      card.style.top = y + "%";
      return { x, y };
    }

    function start(clientX, clientY) {
      if (linkMode) return;
      dragging = true;
      card.style.zIndex = ++topZ;
      const rect = board.getBoundingClientRect();
      moveTo(clientX, clientY, rect);
    }

    function move(clientX, clientY) {
      if (!dragging) return;
      const rect = board.getBoundingClientRect();
      const { x, y } = moveTo(clientX, clientY, rect);
      redrawLinksFromDom();
      card._lastPos = { x, y };
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      if (card._lastPos) {
        socket.emit("board:move", { clueId: card.dataset.clueId, x: card._lastPos.x, y: card._lastPos.y });
      }
    }

    // Mouse (desktop)
    card.addEventListener("mousedown", (e) => {
      start(e.clientX, e.clientY);
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", end);

    // Touch (phones/tablets)
    card.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        start(t.clientX, t.clientY);
        e.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        if (!dragging) return;
        const t = e.touches[0];
        move(t.clientX, t.clientY);
        e.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
  }

  $("#btn-link-mode").addEventListener("click", () => {
    linkMode = !linkMode;
    linkSelectFirst = null;
    $("#btn-link-mode").textContent = "Link Mode: " + (linkMode ? "On" : "Off");
    $("#corkboard").classList.toggle("link-mode", linkMode);
    $$(".pin-card").forEach((c) => c.classList.remove("selected"));
  });

  function handleLinkClick(clueId, card) {
    if (!linkSelectFirst) {
      linkSelectFirst = clueId;
      card.classList.add("selected");
      return;
    }
    if (linkSelectFirst === clueId) {
      card.classList.remove("selected");
      linkSelectFirst = null;
      return;
    }
    socket.emit("board:link", { a: linkSelectFirst, b: clueId });
    $$(".pin-card").forEach((c) => c.classList.remove("selected"));
    linkSelectFirst = null;
  }

  function drawLinks(state) {
    const svg = $("#link-svg");
    svg.innerHTML = "";
    const board = $("#corkboard");
    const rect = board.getBoundingClientRect();
    state.board.links.forEach(([a, b]) => {
      const pa = state.board.pins[a];
      const pb = state.board.pins[b];
      if (!pa || !pb) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", (pa.x / 100) * rect.width);
      line.setAttribute("y1", (pa.y / 100) * rect.height);
      line.setAttribute("x2", (pb.x / 100) * rect.width);
      line.setAttribute("y2", (pb.y / 100) * rect.height);
      svg.appendChild(line);
    });
  }

  function redrawLinksFromDom() {
    if (!latestState) return;
    // Recompute using DOM positions for the currently-dragged card by rebuilding from latestState + live style
    const svg = $("#link-svg");
    const board = $("#corkboard");
    const rect = board.getBoundingClientRect();
    const liveIds = {};
    $$(".pin-card").forEach((c) => {
      liveIds[c.dataset.clueId] = {
        x: parseFloat(c.style.left),
        y: parseFloat(c.style.top)
      };
    });
    svg.innerHTML = "";
    latestState.board.links.forEach(([a, b]) => {
      const pa = liveIds[a] || latestState.board.pins[a];
      const pb = liveIds[b] || latestState.board.pins[b];
      if (!pa || !pb) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", (pa.x / 100) * rect.width);
      line.setAttribute("y1", (pa.y / 100) * rect.height);
      line.setAttribute("x2", (pb.x / 100) * rect.width);
      line.setAttribute("y2", (pb.y / 100) * rect.height);
      svg.appendChild(line);
    });
  }

  window.addEventListener("resize", () => {
    if (latestState) drawLinks(latestState);
  });

  // ---------- Chat ----------
  function renderChat(state) {
    const log = $("#chat-log");
    log.innerHTML = state.chat
      .map((m) => {
        const time = new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        return `<div class="chat-msg"><span class="chat-time">${time}</span><span class="chat-name">${escapeHtml(m.name)}:</span><span class="chat-text">${escapeHtml(m.text)}</span></div>`;
      })
      .join("");
    log.scrollTop = log.scrollHeight;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text) return;
    socket.emit("chat:send", { text });
    input.value = "";
  });

  // ---------- Accusation ----------
  $("#btn-goto-accuse").addEventListener("click", () => {
    socket.emit("phase:advance", { phase: "accusation" });
  });
  $("#btn-back-to-board").addEventListener("click", () => {
    socket.emit("phase:advance", { phase: "investigation" });
  });

  function renderAccusation(state) {
    const draft = state.accusationDraft;

    const suspectsEl = $("#accuse-suspects");
    suspectsEl.innerHTML = "";
    caseData.suspects.forEach((sid) => {
      const person = caseData.people.find((p) => p.id === sid);
      const opt = document.createElement("div");
      opt.className = "accuse-option" + (draft.suspect === sid ? " selected" : "");
      opt.textContent = `${person.name} — ${person.role}`;
      opt.addEventListener("click", () => socket.emit("accusation:update", { suspect: sid }));
      suspectsEl.appendChild(opt);
    });

    const locsEl = $("#accuse-locations");
    locsEl.innerHTML = "";
    caseData.accusationLocations.forEach((lid) => {
      const loc = caseData.locations.find((l) => l.id === lid);
      const opt = document.createElement("div");
      opt.className = "accuse-option" + (draft.location === lid ? " selected" : "");
      opt.textContent = loc.name;
      opt.addEventListener("click", () => socket.emit("accusation:update", { location: lid }));
      locsEl.appendChild(opt);
    });

    const motivesEl = $("#accuse-motives");
    motivesEl.innerHTML = "";
    caseData.motives.forEach((m) => {
      const opt = document.createElement("div");
      opt.className = "accuse-option" + (draft.motive === m.id ? " selected" : "");
      opt.textContent = m.text;
      opt.addEventListener("click", () => socket.emit("accusation:update", { motive: m.id }));
      motivesEl.appendChild(opt);
    });

    $("#ready-A").checked = draft.readyA;
    $("#ready-B").checked = draft.readyB;
  }

  $("#ready-A").addEventListener("change", (e) => {
    if (myRole === "A") socket.emit("accusation:ready", { ready: e.target.checked });
    else e.target.checked = latestState.accusationDraft.readyA;
  });
  $("#ready-B").addEventListener("change", (e) => {
    if (myRole === "B") socket.emit("accusation:ready", { ready: e.target.checked });
    else e.target.checked = latestState.accusationDraft.readyB;
  });

  // ---------- Ending ----------
  function renderEnding(state) {
    const ending = caseData.endings[state.result];
    $("#ending-title").textContent = ending.title;
    $("#ending-body").innerHTML = ending.text.map((p) => `<p>${p}</p>`).join("");
  }

  $("#btn-restart").addEventListener("click", () => {
    socket.emit("room:restart");
  });
})();
