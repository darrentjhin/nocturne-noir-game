(function () {
  const socket = io();

  const SESSION_KEY = "nocturne_session";

  let myRole = null;
  let myCode = null;
  let caseData = null;
  let latestState = null;
  let linkMode = false;
  let linkSelectFirst = null;
  let pendingClueId = null; // clue just revealed, waiting to be "pinned" via modal close
  let topZ = 10;
  let currentSceneLeadId = null; // which location/person the scene modal is currently showing
  let lastActUnlocked = 1;

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

  // ---------- Clue index (built once caseData arrives) ----------
  // clueMeta[clueId] = { ...clueText, ownerRole, parentName, parentId }
  const clueMeta = {};
  function buildClueMeta() {
    caseData.locations.forEach((loc) => {
      loc.hotspots.forEach((h) => {
        if (h.clueId) {
          clueMeta[h.clueId] = { ...caseData.clueText[h.clueId], ownerRole: "A", parentName: loc.name, parentId: loc.id };
        }
      });
    });
    caseData.people.forEach((p) => {
      p.hotspots.forEach((h) => {
        if (h.clueId) {
          clueMeta[h.clueId] = { ...caseData.clueText[h.clueId], ownerRole: "B", parentName: p.name, parentId: p.id };
        }
      });
    });
  }

  function leadsForMyRole() {
    return myRole === "A" ? caseData.locations : caseData.people;
  }

  function hotspotCountable(h) {
    return h.type === "clue" || h.type === "locked";
  }

  // ---------- Investigation ----------
  function renderInvestigation(state) {
    if (!Object.keys(clueMeta).length) buildClueMeta();

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

    const totalClues = Object.keys(caseData.clueText).length;
    const foundTotal = state.found.A.length + state.found.B.length;
    $("#case-progress").textContent = `${foundTotal}/${totalClues} clues`;

    maybeShowUnlockBanner(state);

    $("#leads-title").textContent = myRole === "A" ? "Locations" : "People";
    const leadsList = $("#leads-list");
    leadsList.innerHTML = "";
    const myFound = state.found[myRole];
    const myFlavor = state.flavorSeen[myRole] || [];

    leadsForMyRole().forEach((lead) => {
      const locked = lead.act === 2 && state.actUnlocked < 2;
      const div = document.createElement("div");

      if (locked) {
        div.className = "lead-item locked";
        div.innerHTML = `
          <div class="lead-name">🔒 New lead</div>
          <div class="lead-blurb">Keep digging — this opens up once you two have found more.</div>
        `;
        leadsList.appendChild(div);
        return;
      }

      const countable = lead.hotspots.filter(hotspotCountable);
      const foundCount = countable.filter((h) => myFound.includes(h.clueId)).length;
      const allSeen = lead.hotspots.every((h) => (hotspotCountable(h) ? myFound.includes(h.clueId) : myFlavor.includes(h.id)));

      div.className = "lead-item" + (allSeen ? " exhausted" : "");
      div.innerHTML = `
        <div class="lead-name">${lead.name}${lead.role ? " — " + lead.role : ""}</div>
        <div class="lead-blurb">${lead.blurb}</div>
        <div class="lead-progress">${foundCount}/${countable.length} clues found${allSeen ? " · fully explored" : ""}</div>
      `;
      div.addEventListener("click", () => openScene(lead));
      leadsList.appendChild(div);
    });

    if (currentSceneLeadId) {
      const lead = leadsForMyRole().find((l) => l.id === currentSceneLeadId);
      if (lead) renderScene(lead, state);
    }

    renderCorkboard(state);
    renderChat(state);
  }

  function maybeShowUnlockBanner(state) {
    if (state.actUnlocked > lastActUnlocked) {
      const banner = $("#unlock-banner");
      banner.textContent = "🗞️ New leads have opened up across the city.";
      banner.classList.add("show");
      setTimeout(() => banner.classList.remove("show"), 5500);
    }
    lastActUnlocked = state.actUnlocked;
  }

  // ---------- Scene modal (examine a location/person) ----------
  function openScene(lead) {
    currentSceneLeadId = lead.id;
    $("#scene-flavor-reveal").innerHTML = "";
    renderScene(lead, latestState);
    $("#scene-modal").classList.add("active");
  }

  $("#scene-modal-close").addEventListener("click", () => {
    $("#scene-modal").classList.remove("active");
    currentSceneLeadId = null;
  });

  function renderScene(lead, state) {
    const myFound = state.found[myRole];
    const myFlavor = state.flavorSeen[myRole] || [];

    $("#scene-modal-kicker").textContent = (lead.role ? lead.role.toUpperCase() : "LOCATION");
    $("#scene-modal-title").textContent = lead.name;
    $("#scene-modal-blurb").textContent = lead.blurb;

    const container = $("#scene-hotspots");
    container.innerHTML = "";

    lead.hotspots.forEach((h) => {
      const row = document.createElement("div");
      row.className = "hotspot-row";

      if (h.type === "clue") {
        const done = myFound.includes(h.clueId);
        row.className += done ? " hotspot-done" : "";
        row.innerHTML = `
          <button class="hotspot-btn" type="button">
            <span class="hotspot-icon">${done ? "✓" : "🔎"}</span>
            <span class="hotspot-label">${h.label}</span>
            ${done ? '<span class="hotspot-tag">examined</span>' : ""}
          </button>
        `;
        row.querySelector(".hotspot-btn").addEventListener("click", () => {
          if (done) {
            openDoc(h.clueId);
          } else {
            revealClue(h.clueId, lead.name);
          }
        });
      } else if (h.type === "flavor") {
        const seen = myFlavor.includes(h.id);
        row.className += seen ? " hotspot-done" : "";
        row.innerHTML = `
          <button class="hotspot-btn" type="button">
            <span class="hotspot-icon">${seen ? "•" : "👁"}</span>
            <span class="hotspot-label">${h.label}</span>
          </button>
          <div class="hotspot-inline-text" style="display:${seen ? "block" : "none"}">${h.text}</div>
        `;
        row.querySelector(".hotspot-btn").addEventListener("click", () => {
          const textEl = row.querySelector(".hotspot-inline-text");
          const willShow = textEl.style.display === "none";
          textEl.style.display = willShow ? "block" : "none";
          if (willShow && !seen) {
            socket.emit("flavor:seen", { hotspotId: h.id });
          }
        });
      } else if (h.type === "locked") {
        const solved = !!state.puzzlesSolved[h.puzzleId];
        const done = solved && myFound.includes(h.clueId);
        row.className += done ? " hotspot-done" : " hotspot-locked";
        if (done) {
          row.innerHTML = `
            <button class="hotspot-btn" type="button">
              <span class="hotspot-icon">✓</span>
              <span class="hotspot-label">${h.label}</span>
              <span class="hotspot-tag">unlocked</span>
            </button>
          `;
          row.querySelector(".hotspot-btn").addEventListener("click", () => openDoc(h.clueId));
        } else {
          row.innerHTML = `
            <div class="hotspot-btn hotspot-btn-static">
              <span class="hotspot-icon">🔒</span>
              <span class="hotspot-label">${h.label}</span>
            </div>
            <div class="lock-hint">${h.lockedHint || "Locked."}</div>
            <form class="lock-form">
              <input type="text" maxlength="8" placeholder="Code..." class="lock-input" />
              <button type="submit" class="btn primary small">Try</button>
            </form>
            <div class="lock-error"></div>
          `;
          const form = row.querySelector(".lock-form");
          form.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = row.querySelector(".lock-input");
            const errEl = row.querySelector(".lock-error");
            socket.emit("puzzle:attempt", { puzzleId: h.puzzleId, code: input.value, hotspotId: h.id }, (res) => {
              if (res && res.ok) {
                errEl.textContent = "";
                if (res.clueId) revealClue(res.clueId, lead.name, { alreadyFound: true });
              } else {
                errEl.textContent = (res && res.error) || "Wrong code.";
                input.value = "";
              }
            });
          });
        }
      }

      container.appendChild(row);
    });
  }

  function revealClue(clueId, parentName, opts) {
    opts = opts || {};
    pendingClueId = opts.alreadyFound ? null : clueId;
    const meta = clueMeta[clueId] || caseData.clueText[clueId];
    $("#clue-modal-kicker").textContent = (parentName || "").toUpperCase();
    $("#clue-modal-title").textContent = meta.title;
    $("#clue-modal-text").textContent = meta.text;
    $("#clue-modal").classList.add("active");
  }

  $("#clue-modal-close").addEventListener("click", () => {
    if (pendingClueId) {
      socket.emit("clue:found", { clueId: pendingClueId });
      pendingClueId = null;
    }
    $("#clue-modal").classList.remove("active");
  });

  // ---------- Case Files gallery ----------
  $("#btn-open-files").addEventListener("click", () => {
    renderFilesGrid();
    $("#files-modal").classList.add("active");
  });
  $("#files-modal-close").addEventListener("click", () => $("#files-modal").classList.remove("active"));

  function renderFilesGrid() {
    const grid = $("#files-grid");
    grid.innerHTML = "";
    const allFound = [...latestState.found.A, ...latestState.found.B];
    if (!allFound.length) {
      grid.innerHTML = '<div class="files-empty">Nothing filed yet. Go examine something.</div>';
      return;
    }
    allFound.forEach((clueId) => {
      const meta = clueMeta[clueId];
      const tile = document.createElement("div");
      tile.className = "file-tile";
      tile.innerHTML = `
        <div class="file-tile-type">${docTypeIcon(meta.docType)} ${meta.docType}</div>
        <div class="file-tile-title">${meta.title}</div>
        <div class="file-tile-source">${meta.parentName}</div>
      `;
      tile.addEventListener("click", () => openDoc(clueId));
      grid.appendChild(tile);
    });
  }

  function docTypeIcon(type) {
    return { ticket: "🎟️", evidence: "🔍", note: "📝", photo: "🖼️", form: "📋", ledger: "📒", transcript: "🗣️" }[type] || "📄";
  }

  function openDoc(clueId) {
    const meta = clueMeta[clueId];
    const card = $("#doc-reader-card");
    card.className = "modal-card doc-reader doctype-" + meta.docType;
    $("#doc-type-tag").textContent = docTypeIcon(meta.docType) + " " + meta.docType.toUpperCase();
    $("#doc-title").textContent = meta.title;
    $("#doc-source").textContent = "Found at: " + meta.parentName;
    $("#doc-text").textContent = meta.text;
    $("#doc-modal").classList.add("active");
  }
  $("#doc-modal-close").addEventListener("click", () => $("#doc-modal").classList.remove("active"));

  // ---------- Corkboard ----------
  function renderCorkboard(state) {
    const board = $("#corkboard");
    $$(".pin-card").forEach((el) => el.remove());

    const allFoundIds = [...state.found.A, ...state.found.B];
    allFoundIds.forEach((clueId) => {
      const clue = clueMeta[clueId];
      const pos = state.board.pins[clueId] || { x: 50, y: 50 };
      const card = document.createElement("div");
      card.className = "pin-card";
      card.dataset.clueId = clueId;
      card.style.left = pos.x + "%";
      card.style.top = pos.y + "%";
      card.innerHTML = `
        <div class="pin-title">${clue.title}</div>
        <div class="pin-text">${clue.text}</div>
        <div class="pin-owner">${clue.parentName}</div>
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

    card.addEventListener("mousedown", (e) => {
      start(e.clientX, e.clientY);
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", end);

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
