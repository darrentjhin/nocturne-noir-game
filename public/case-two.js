(function () {
  const CASE_ID = "black-sun-ledger";
  const SESSION_KEY = "nocturne_case2_session";
  const socket = io();
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  let myRole = null;
  let myCode = null;
  let caseData = null;
  let latestState = null;
  let selectedStageChoice = null;
  let selectedStageId = null;
  let lastFailureText = null;
  let tutorialIndex = 0;
  let tutorialOpenedForRoom = false;
  let resumeInFlight = false;
  let reconnecting = false;
  let notebookDraft = "";
  let notebookSaveTimer = null;
  let notebookLoadId = 0;
  let radioInitialized = false;
  let lastRadioCount = 0;
  let unreadRadioCount = 0;
  const BASE_TITLE = document.title;
  const finalDraft = {};

  function syncModalState() {
    const open = $$(".modal").some((modal) => !modal.hidden);
    document.body.classList.toggle("modal-open", open);
  }

  function showScreen(id) {
    $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
    const active = $("#" + id);
    active.setAttribute("tabindex", "-1");
    $("#skip-link").setAttribute("href", `#${id}`);
    window.scrollTo(0, 0);
  }

  function setConnection(message, tone) {
    const banner = $("#connection-banner");
    banner.textContent = message || "";
    banner.className = `connection-banner${message ? " show" : ""}${tone ? ` ${tone}` : ""}`;
  }

  function saveSession(response) {
    const value = JSON.stringify({
      code: response.code,
      role: response.role,
      name: response.name || "",
      resumeToken: response.resumeToken || ""
    });
    try {
      sessionStorage.setItem(SESSION_KEY, value);
      localStorage.setItem(SESSION_KEY, value);
    } catch (error) {}
  }

  function tabSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (error) { return null; }
  }

  function savedSession() {
    try { return tabSession() || JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (error) { return null; }
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {}
  }

  (function importPrivateResumeLink() {
    const url = new URL(window.location.href);
    const code = (url.searchParams.get("case") || "").toUpperCase().trim();
    const role = url.searchParams.get("role") || "";
    const resumeToken = url.searchParams.get("resume") || "";
    const name = url.searchParams.get("name") || "Detective";
    if (!/^[A-HJ-NP-Z2-9]{5}$/.test(code) || !["A", "B"].includes(role) || resumeToken.length < 20) return;
    saveSession({ code, role, name: name.slice(0, 24), resumeToken });
    url.searchParams.delete("role");
    url.searchParams.delete("resume");
    url.searchParams.delete("name");
    window.history.replaceState({}, "", url);
  })();

  function showLandingError(message) {
    $("#landing-error").textContent = message || "";
  }

  function activateLandingTab(tabName) {
    $$(".landing-tab").forEach((tab) => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    $$(".landing-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${tabName}`));
    showLandingError("");
  }

  $$(".landing-tab").forEach((tab) => tab.addEventListener("click", () => activateLandingTab(tab.dataset.tab)));

  const inviteCode = (new URLSearchParams(window.location.search).get("case") || "").toUpperCase().trim();
  if (/^[A-HJ-NP-Z2-9]{5}$/.test(inviteCode)) {
    activateLandingTab("join");
    $("#join-code").value = inviteCode;
    $("#invite-notice").hidden = false;
  }

  function onJoined(response) {
    myRole = response.role;
    myCode = response.code;
    caseData = response.case;
    latestState = null;
    selectedStageChoice = null;
    selectedStageId = null;
    tutorialOpenedForRoom = false;
    radioInitialized = false;
    lastRadioCount = 0;
    unreadRadioCount = 0;
    document.title = BASE_TITLE;
    notebookDraft = "";
    if (notebookSaveTimer) clearTimeout(notebookSaveTimer);
    notebookSaveTimer = null;
    Object.keys(finalDraft).forEach((key) => delete finalDraft[key]);
    saveSession(response);
    $("#lobby-code").textContent = response.code;
    showScreen("screen-lobby");
  }

  function handleJoinError(response, code) {
    if (response && response.destination) {
      const destination = new URL(response.destination, window.location.origin);
      destination.searchParams.set("case", code);
      window.location.assign(destination.toString());
      return;
    }
    showLandingError((response && response.error) || "The operation could not be opened.");
  }

  function createOperation() {
    showLandingError("");
    const name = $("#create-name").value.trim() || "Detective";
    $("#btn-create").disabled = true;
    socket.emit("room:create", { caseId: CASE_ID }, (response) => {
      $("#btn-create").disabled = false;
      if (!response || !response.ok) return handleJoinError(response, "");
      socket.emit("room:join", { code: response.code, name, expectedCaseId: CASE_ID }, (joined) => {
        if (!joined || !joined.ok) return handleJoinError(joined, response.code);
        onJoined(joined);
      });
    });
  }

  function joinOperation() {
    showLandingError("");
    const name = $("#join-name").value.trim() || "Detective";
    const code = $("#join-code").value.trim().toUpperCase();
    if (!code) return showLandingError("Enter the five-character operation code.");
    $("#btn-join").disabled = true;
    socket.emit("room:join", { code, name, expectedCaseId: CASE_ID }, (response) => {
      $("#btn-join").disabled = false;
      if (!response || !response.ok) return handleJoinError(response, code);
      onJoined(response);
    });
  }

  $("#btn-create").addEventListener("click", createOperation);
  $("#btn-join").addEventListener("click", joinOperation);
  $("#create-name").addEventListener("keydown", (event) => event.key === "Enter" && createOperation());
  ["join-name", "join-code"].forEach((id) => $("#" + id).addEventListener("keydown", (event) => event.key === "Enter" && joinOperation()));

  function inviteUrl(code) {
    const url = new URL("/case-two.html", window.location.origin);
    url.searchParams.set("case", code);
    return url.toString();
  }

  $("#btn-copy-invite").addEventListener("click", async () => {
    if (!myCode) return;
    const url = inviteUrl(myCode);
    try {
      await navigator.clipboard.writeText(url);
      $("#copy-status").textContent = "Encrypted invite copied.";
    } catch (error) {
      $("#copy-status").textContent = `Copy this link: ${url}`;
    }
  });

  $("#btn-copy-resume").addEventListener("click", async () => {
    const saved = savedSession();
    if (!saved || !saved.resumeToken) return;
    const url = new URL("/case-two.html", window.location.origin);
    url.searchParams.set("case", saved.code);
    url.searchParams.set("role", saved.role);
    url.searchParams.set("name", saved.name || "Detective");
    url.searchParams.set("resume", saved.resumeToken);
    try {
      await navigator.clipboard.writeText(url.toString());
      $("#copy-status").textContent = "Private resume link copied. Do not send it to your partner.";
    } catch (error) {
      $("#copy-status").textContent = `Keep this private: ${url}`;
    }
  });

  function closeExitModal() {
    $("#exit-modal").hidden = true;
    syncModalState();
  }

  function releaseSeatAndLeave() {
    flushNotebookSave();
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ kind: "exit", caseId: CASE_ID, role: myRole, reason: $("#exit-reason").value })
    }).catch(() => {});
    const finish = () => {
      clearSession();
      window.location.assign("/case-two.html");
    };
    let completed = false;
    socket.emit("room:leave", {}, () => {
      if (completed) return;
      completed = true;
      finish();
    });
    window.setTimeout(() => {
      if (completed) return;
      completed = true;
      finish();
    }, 800);
  }

  $$(".leave-operation").forEach((button) => button.addEventListener("click", () => {
    $("#exit-modal").hidden = false;
    syncModalState();
    $("#exit-reason").focus();
  }));
  $("#exit-cancel").addEventListener("click", closeExitModal);
  $("#exit-cancel-x").addEventListener("click", closeExitModal);
  $("#exit-confirm").addEventListener("click", releaseSeatAndLeave);

  function renderPartnerRecovery(state) {
    const partnerRole = myRole === "A" ? "B" : "A";
    const partner = state && state.players && state.players[partnerRole];
    const panel = $("#partner-recovery");
    if (!partner || partner.connected) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const remaining = Math.max(0, Number(partner.releaseEligibleAt || 0) - Date.now());
    const button = $("#btn-release-partner");
    button.disabled = remaining > 0;
    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);
      $("#partner-recovery-text").textContent = `${partner.name} disconnected. Their private line is reserved for ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.`;
    } else {
      $("#partner-recovery-text").textContent = `${partner.name} did not reconnect. You may release that line and invite a replacement.`;
    }
  }

  $("#btn-release-partner").addEventListener("click", () => {
    if (!window.confirm("Release the disconnected detective line? Their private notes and resume token will be cleared.")) return;
    socket.emit("room:seat:release", {}, (response) => {
      if (!response || !response.ok) setConnection((response && response.error) || "The line could not be released.");
    });
  });

  window.setInterval(() => {
    if (latestState) renderPartnerRecovery(latestState);
  }, 1000);

  function updateNotebookMeta(status, tone) {
    $("#notebook-count").textContent = `${notebookDraft.length} / 6000`;
    if (status) $("#notebook-status").textContent = status;
    $("#notebook-status").className = tone || "";
  }

  function saveNotebook() {
    if (!myCode || !myRole) return;
    if (notebookSaveTimer) clearTimeout(notebookSaveTimer);
    notebookSaveTimer = null;
    updateNotebookMeta("Saving…", "saving");
    socket.emit("notes:update", { text: notebookDraft }, (response) => {
      updateNotebookMeta(response && response.ok ? "Saved privately" : (response && response.error) || "Could not save", response && response.ok ? "" : "error");
    });
  }

  function flushNotebookSave() {
    if (!notebookSaveTimer) return;
    clearTimeout(notebookSaveTimer);
    notebookSaveTimer = null;
    saveNotebook();
  }

  function scheduleNotebookSave() {
    if (notebookSaveTimer) clearTimeout(notebookSaveTimer);
    updateNotebookMeta("Saving…", "saving");
    notebookSaveTimer = setTimeout(saveNotebook, 650);
  }

  function openNotebook() {
    if (!myCode || !myRole) return;
    $("#tutorial-modal").hidden = true;
    const loadId = ++notebookLoadId;
    $("#notebook-text").disabled = true;
    $("#notebook-modal").hidden = false;
    syncModalState();
    updateNotebookMeta("Loading private page…", "saving");
    socket.emit("notes:get", {}, (response) => {
      if (loadId !== notebookLoadId || $("#notebook-modal").hidden) return;
      $("#notebook-text").disabled = false;
      if (!response || !response.ok) return updateNotebookMeta((response && response.error) || "Could not load notes", "error");
      notebookDraft = response.text || "";
      $("#notebook-text").value = notebookDraft;
      updateNotebookMeta("Saved privately", "");
      $("#notebook-text").focus();
    });
  }

  function closeNotebook() {
    notebookLoadId += 1;
    flushNotebookSave();
    $("#notebook-text").disabled = false;
    $("#notebook-modal").hidden = true;
    syncModalState();
  }

  function appendNotebookLine(line, control) {
    if (!myCode || !myRole) return;
    flushNotebookSave();
    if (control) {
      control.disabled = true;
      control.textContent = "SAVING…";
    }
    const cleanLine = String(line || "").replace(/\r\n?/g, "\n").trim();
    socket.emit("notes:append", { text: cleanLine }, (saved) => {
      if (!saved || !saved.ok) {
        if (control) {
          control.disabled = !!(saved && saved.soft);
          control.textContent = saved && saved.soft ? "NOTEBOOK FULL" : "TRY AGAIN";
        }
        return;
      }
      notebookDraft = saved.text;
      $("#notebook-text").value = saved.text;
      updateNotebookMeta("Saved privately", "");
      if (control) control.textContent = "SAVED TO NOTES";
    });
  }

  $$(".open-notebook").forEach((button) => button.addEventListener("click", openNotebook));
  $("#notebook-close").addEventListener("click", closeNotebook);
  $("#notebook-done").addEventListener("click", closeNotebook);
  $("#notebook-text").addEventListener("input", (event) => {
    notebookDraft = event.target.value.slice(0, 6000);
    scheduleNotebookSave();
  });
  $("#notebook-text").addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveNotebook();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#notebook-modal").hidden) closeNotebook();
    else if (!$("#tutorial-modal").hidden) closeTutorial();
    else if (!$("#exit-modal").hidden) closeExitModal();
  });

  function tryResume(showLobby) {
    if (resumeInFlight) return;
    const saved = savedSession();
    if (!saved || !saved.code || !saved.role) return;
    resumeInFlight = true;
    if (showLobby !== false) {
      showScreen("screen-lobby");
      $("#lobby-code").textContent = saved.code;
      $("#lobby-slot-A").textContent = "Reconnecting to the ghost circuit…";
    }
    socket.emit("room:join", { ...saved, expectedCaseId: CASE_ID }, (response) => {
      resumeInFlight = false;
      if (!response || !response.ok) {
        clearSession();
        if (showLobby !== false) showScreen("screen-landing");
        return;
      }
      onJoined(response);
      if (reconnecting) {
        setConnection("Circuit restored.", "ok");
        window.setTimeout(() => setConnection(""), 1800);
      }
      reconnecting = false;
    });
  }

  socket.on("connect", () => {
    const freshInvite = /^[A-HJ-NP-Z2-9]{5}$/.test(inviteCode) && !tabSession();
    if (!freshInvite) tryResume(true);
  });
  socket.on("disconnect", () => {
    if (!myCode) return;
    reconnecting = true;
    setConnection("Ghost circuit interrupted. Reconnecting…");
  });

  function roleName(role) {
    return caseData && caseData.roles[role] ? caseData.roles[role].name : `Detective ${role}`;
  }

  function renderReadyLines(selector, readiness) {
    const container = $(selector);
    container.innerHTML = "";
    ["A", "B"].forEach((role) => {
      const chip = document.createElement("span");
      const ready = !!(readiness && readiness[role]);
      chip.className = ready ? "ready" : "";
      chip.textContent = `${roleName(role)} · ${ready ? "ready" : "waiting"}`;
      container.appendChild(chip);
    });
  }

  function renderLobby(state) {
    showScreen("screen-lobby");
    $("#lobby-code").textContent = state.code;
    ["A", "B"].forEach((role) => {
      const slot = $(`#lobby-slot-${role}`);
      const player = state.players[role];
      slot.className = player && player.connected ? "connected" : "";
      slot.innerHTML = `<span>${role}</span> ${player ? `${roleName(role)} · ${player.name}${player.connected ? "" : " · reconnecting"}` : `${roleName(role)} · waiting`}`;
    });
  }

  function renderBriefing(state) {
    showScreen("screen-briefing");
    $("#briefing-headline").textContent = caseData.briefing.headline;
    $("#briefing-body").textContent = caseData.briefing.body;
    $("#briefing-objective").textContent = caseData.briefing.objective;
    $("#briefing-role-name").textContent = `${roleName(myRole)} · ${caseData.roles[myRole].tagline}`;
    $("#briefing-role-body").textContent = caseData.roles[myRole].brief;

    const options = $("#mode-options");
    options.innerHTML = "";
    caseData.difficultyOptions.forEach((mode) => {
      const mine = state.difficultyVotes && state.difficultyVotes[myRole] === mode.id;
      const confirmed = state.difficulty === mode.id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `mode-option${mine ? " selected" : ""}${confirmed ? " confirmed" : ""}`;
      button.setAttribute("aria-pressed", mine ? "true" : "false");
      button.innerHTML = `<strong>${mode.label}${mode.id === "field" ? " · Recommended" : ""}</strong><span>${mode.description}</span>`;
      button.addEventListener("click", () => socket.emit("case2:difficulty:vote", { difficulty: mode.id }));
      options.appendChild(button);
    });
    const label = (id) => (caseData.difficultyOptions.find((mode) => mode.id === id) || {}).label || "Not chosen";
    const votes = state.difficultyVotes || {};
    $("#mode-status").textContent = state.difficulty
      ? `${label(state.difficulty)} mode confirmed by both detectives.`
      : `Street: ${label(votes.A)} · Desk: ${label(votes.B)}${votes.A && votes.B ? " · Match modes to continue." : ""}`;
    renderReadyLines("#briefing-ready-lines", state.briefingReady);
    const ready = !!state.briefingReady[myRole];
    const partner = !!state.briefingReady[myRole === "A" ? "B" : "A"];
    const button = $("#btn-briefing-ready");
    button.disabled = !state.difficulty;
    button.setAttribute("aria-pressed", ready ? "true" : "false");
    button.textContent = !state.difficulty ? "Agree on a mode first" : ready ? (partner ? "Opening together…" : "Ready · waiting for partner") : "I'm ready to enter the exchange";

    if (!tutorialOpenedForRoom) {
      tutorialOpenedForRoom = true;
      let seen = false;
      try { seen = sessionStorage.getItem(`nocturne_case2_tutorial:${myCode}:${myRole}`) === "1"; } catch (error) {}
      if (!seen) openTutorial(0);
    }
  }

  $("#btn-briefing-ready").addEventListener("click", () => {
    if (!latestState || !latestState.difficulty) return;
    socket.emit("case2:briefing:ready", { ready: !latestState.briefingReady[myRole] });
  });

  function renderCheckpointTrack(state) {
    const track = $("#checkpoint-track");
    track.innerHTML = "";
    caseData.stages.forEach((stage, index) => {
      const node = document.createElement("div");
      node.className = `checkpoint${index < state.stageIndex || (index === state.stageIndex && state.stageResolved) ? " complete" : ""}${index === state.stageIndex && !state.stageResolved ? " current" : ""}`;
      node.textContent = stage.number;
      track.appendChild(node);
    });
    const pips = $("#alert-pips");
    pips.innerHTML = "";
    for (let index = 0; index < 3; index += 1) {
      const pip = document.createElement("span");
      pip.className = `alert-pip${index < state.alertLevel ? " active" : ""}`;
      pips.appendChild(pip);
    }
  }

  function renderLockStatus(state) {
    const container = $("#stage-lock-status");
    container.innerHTML = "";
    ["A", "B"].forEach((role) => {
      const locked = !!state.stageLocks[role];
      const chip = document.createElement("span");
      chip.className = locked ? "ready" : "";
      chip.textContent = `${roleName(role)} · ${locked ? "locked" : role === myRole ? "choosing" : "waiting"}`;
      container.appendChild(chip);
    });
  }

  function renderRecords(state) {
    const grid = $("#record-grid");
    grid.innerHTML = "";
    caseData.stages.forEach((stage, index) => {
      const history = state.stageHistory.find((item) => item.id === stage.id);
      const card = document.createElement("article");
      card.className = `record-card${history ? "" : " locked"}`;
      card.innerHTML = history
        ? `<span>RECORD ${stage.number}</span><p>${history.outcome.evidence}</p>`
        : `<span>RECORD ${stage.number}</span><p>Encrypted until checkpoint resolution.</p>`;
      grid.appendChild(card);
    });
  }

  function renderRadio(state) {
    if (!radioInitialized) {
      radioInitialized = true;
      lastRadioCount = state.chat.length;
    } else if (state.chat.length > lastRadioCount) {
      const newMessages = state.chat.slice(lastRadioCount).filter((message) => message.role !== myRole);
      if (document.hidden && newMessages.length) {
        unreadRadioCount += newMessages.length;
        document.title = `(${unreadRadioCount}) Radio · ${BASE_TITLE}`;
      }
      lastRadioCount = state.chat.length;
    }
    const log = $("#radio-log");
    const wasNearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 50;
    log.innerHTML = "";
    if (!state.chat.length) {
      const empty = document.createElement("p");
      empty.className = "radio-empty";
      empty.textContent = "The line is open. Transmit the first exact detail.";
      log.appendChild(empty);
      return;
    }
    state.chat.forEach((message) => {
      const item = document.createElement("article");
      item.className = `radio-message${message.role === myRole ? " mine" : ""}`;
      const timestamp = new Date(message.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      item.innerHTML = `<span>${message.role === myRole ? "YOU" : roleName(message.role)} · ${timestamp}</span><p></p>`;
      item.querySelector("p").textContent = message.text;
      const save = document.createElement("button");
      save.type = "button";
      save.className = "radio-note-save";
      save.textContent = "SAVE TO NOTES";
      save.setAttribute("aria-label", "File this transmission in my private notes");
      save.addEventListener("click", () => appendNotebookLine(`[Radio · ${message.name}] ${message.text}`, save));
      item.appendChild(save);
      log.appendChild(item);
    });
    if (wasNearBottom || state.chat.length < 3) log.scrollTop = log.scrollHeight;
  }

  function renderOperation(state) {
    showScreen("screen-operation");
    const stage = caseData.stages[state.stageIndex];
    const brief = stage.roleBrief;
    if (selectedStageId !== stage.id) {
      selectedStageId = stage.id;
      selectedStageChoice = null;
      lastFailureText = null;
      $("#private-hint").textContent = "";
    }
    if (state.lastFailure && state.lastFailure !== lastFailureText) {
      selectedStageChoice = null;
      lastFailureText = state.lastFailure;
    }
    $("#role-pill").textContent = `${roleName(myRole)} · ${state.difficulty}`;
    const partnerRole = myRole === "A" ? "B" : "A";
    const partner = state.players[partnerRole];
    $("#partner-status").textContent = partner && partner.connected ? `${partner.name} on line` : "Partner reconnecting";
    renderOperationGuide(state, partnerRole, partner);
    renderCheckpointTrack(state);
    $("#stage-number").textContent = stage.number;
    $("#stage-title").textContent = stage.title;
    $("#stage-location").textContent = stage.location;
    $("#dispatch-label").textContent = brief.label;
    $("#dispatch-facts").innerHTML = "";
    brief.facts.forEach((fact) => {
      const item = document.createElement("li");
      item.textContent = fact;
      $("#dispatch-facts").appendChild(item);
    });
    $("#dispatch-request").textContent = brief.request;
    $("#stage-objective").textContent = stage.objective;
    $("#decision-prompt").textContent = brief.prompt;

    const choices = $("#stage-choices");
    choices.innerHTML = "";
    brief.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `choice${selectedStageChoice === choice.id ? " selected" : ""}`;
      button.disabled = !!state.stageLocks[myRole] || state.stageResolved;
      button.setAttribute("aria-pressed", selectedStageChoice === choice.id ? "true" : "false");
      button.innerHTML = `<span class="choice-index">${String(index + 1).padStart(2, "0")}</span><strong>${choice.label}</strong><small>${choice.detail}</small>`;
      button.addEventListener("click", () => {
        selectedStageChoice = choice.id;
        renderOperation(latestState);
      });
      choices.appendChild(button);
    });
    renderLockStatus(state);
    const lockButton = $("#btn-lock-stage");
    lockButton.disabled = !selectedStageChoice || !!state.stageLocks[myRole] || state.stageResolved || !(partner && partner.connected);
    lockButton.textContent = state.stageLocks[myRole] ? "My half is locked" : selectedStageChoice ? "Lock my private choice" : "Choose an answer";
    $("#stage-failure").textContent = state.lastFailure || "";
    $("#decision-panel").hidden = state.stageResolved;

    const resolution = $("#resolution-card");
    resolution.hidden = !state.stageResolved;
    if (state.stageResolved && state.stageOutcome) {
      $("#resolution-title").textContent = state.stageOutcome.title;
      $("#resolution-text").textContent = state.stageOutcome.text;
      $("#resolution-evidence").textContent = state.stageOutcome.evidence;
      renderReadyLines("#stage-ready-lines", state.stageAcknowledged);
      const acknowledged = !!state.stageAcknowledged[myRole];
      const partnerAcknowledged = !!state.stageAcknowledged[partnerRole];
      const acknowledge = $("#btn-acknowledge");
      acknowledge.disabled = acknowledged || !(partner && partner.connected);
      acknowledge.textContent = acknowledged ? (partnerAcknowledged ? "Advancing together…" : "Acknowledged · waiting for partner") : "Acknowledge checkpoint";
    }
    renderRadio(state);
    renderRecords(state);
  }

  function renderOperationGuide(state, partnerRole, partner) {
    const action = $("#operation-guide-action");
    const status = $("#operation-guide-status");
    if (!partner || !partner.connected) {
      action.textContent = "Wait for your partner to reconnect.";
      status.textContent = "Your progress is safe. Review your dispatch or Notes; joint choices pause until both detectives are online.";
      return;
    }
    if (state.stageResolved) {
      const acknowledged = state.stageAcknowledged || {};
      const mine = !!acknowledged[myRole];
      const theirs = !!acknowledged[partnerRole];
      action.textContent = mine ? `Checkpoint acknowledged. Wait for ${partner.name}.` : "Read the shared result, then acknowledge it.";
      status.textContent = mine && !theirs ? "Your acknowledgement is saved. The next checkpoint opens after your partner acknowledges too." : "Both detectives must acknowledge before the operation advances.";
      return;
    }
    const locks = state.stageLocks || {};
    if (locks[myRole]) {
      action.textContent = `Your answer is locked. Wait for ${partner.name}.`;
      status.textContent = "Your choice is saved. Use Radio if your partner needs an exact detail from your dispatch.";
      return;
    }
    if (locks[partnerRole]) {
      action.textContent = `${partner.name} has locked an answer. Choose and lock yours.`;
      status.textContent = "Check that your answer matches the exact fact your partner reported before locking.";
      return;
    }
    action.textContent = "Read your dispatch, ask for the missing fact, then choose.";
    status.textContent = "Do not guess from your screen alone. Your partner holds the other half of the checkpoint.";
  }

  $("#btn-lock-stage").addEventListener("click", () => {
    if (!selectedStageChoice) return;
    $("#btn-lock-stage").disabled = true;
    socket.emit("case2:stage:lock", { choiceId: selectedStageChoice }, (response) => {
      if (!response || !response.ok) {
        $("#stage-failure").textContent = (response && response.error) || "The checkpoint could not lock.";
        if (latestState) renderOperation(latestState);
      }
    });
  });

  $("#btn-acknowledge").addEventListener("click", () => socket.emit("case2:stage:acknowledge", { ready: true }));
  $("#btn-private-hint").addEventListener("click", () => {
    socket.emit("case2:hint", {}, (response) => {
      $("#private-hint").textContent = response && response.ok ? response.hint : (response && response.error) || "No additional dispatch received.";
    });
  });

  function sendRadio(text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    socket.emit("case2:chat", { text: clean });
    $("#radio-input").value = "";
  }
  $("#radio-form").addEventListener("submit", (event) => {
    event.preventDefault();
    sendRadio($("#radio-input").value);
  });
  $$("[data-message]").forEach((button) => button.addEventListener("click", () => sendRadio(button.dataset.message)));

  function renderConvergence(state) {
    showScreen("screen-convergence");
    $("#final-headline").textContent = caseData.finalProtocol.headline;
    $("#final-body").textContent = caseData.finalProtocol.body;
    const brief = caseData.finalProtocol.roleBrief;
    $("#final-role-label").textContent = brief.label;
    $("#final-role-brief").textContent = brief.brief;
    const fields = $("#final-fields");
    fields.innerHTML = "";
    brief.fields.forEach((field) => {
      const section = document.createElement("section");
      section.className = "protocol-field";
      const heading = document.createElement("h3");
      heading.textContent = field.prompt;
      const options = document.createElement("div");
      options.className = "protocol-options";
      field.choices.forEach((choice) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `protocol-option${finalDraft[field.id] === choice.id ? " selected" : ""}`;
        button.disabled = !!state.finalLocked[myRole];
        button.textContent = choice.label;
        button.setAttribute("aria-pressed", finalDraft[field.id] === choice.id ? "true" : "false");
        button.addEventListener("click", () => {
          finalDraft[field.id] = choice.id;
          renderConvergence(latestState);
        });
        options.appendChild(button);
      });
      section.append(heading, options);
      fields.appendChild(section);
    });
    const partnerRole = myRole === "A" ? "B" : "A";
    const mine = !!state.finalLocked[myRole];
    const partner = !!state.finalLocked[partnerRole];
    $("#final-status").textContent = `Your half: ${mine ? "sealed" : "open"} · Partner: ${partner ? "sealed" : "working"}`;
    const complete = brief.fields.every((field) => finalDraft[field.id]);
    const lock = $("#btn-final-lock");
    lock.disabled = mine || !complete || !(state.players[partnerRole] && state.players[partnerRole].connected);
    lock.textContent = mine ? (partner ? "Resolving both protocols…" : "Sealed · waiting for partner") : "Seal my final protocol";
  }

  $("#btn-final-lock").addEventListener("click", () => {
    $("#btn-final-lock").disabled = true;
    socket.emit("case2:final:lock", { draft: finalDraft }, (response) => {
      if (!response || !response.ok) {
        $("#final-status").textContent = (response && response.error) || "The final protocol could not be sealed.";
        if (latestState) renderConvergence(latestState);
      }
    });
  });

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }

  function feedbackKey(state) {
    return `nocturne_feedback:${CASE_ID}:${myRole}:${state.completedAt || "ending"}`;
  }

  function renderFeedback(state) {
    const form = $("#feedback-form");
    const status = $("#feedback-status");
    const key = feedbackKey(state);
    form.dataset.storageKey = key;
    let submitted = false;
    try { submitted = sessionStorage.getItem(key) === "1"; } catch (error) {}
    form.hidden = submitted;
    status.textContent = submitted ? "Thank you. Your anonymous operation check-in was received." : "";
  }

  function renderEnding(state) {
    showScreen("screen-ending");
    const reveal = state.endingReveal;
    if (!reveal) return;
    $("#ending-title").textContent = reveal.ending.title;
    $("#ending-body").textContent = reveal.ending.body;
    $("#ending-truth").textContent = reveal.solution.truth;
    const debrief = reveal.debrief;
    const mode = (caseData.difficultyOptions.find((item) => item.id === debrief.difficulty) || {}).label || debrief.difficulty;
    $("#ending-stats").innerHTML = `
      <div class="stat-line"><span>Operation time</span><strong>${formatDuration(debrief.durationMs)}</strong></div>
      <div class="stat-line"><span>Mode</span><strong>${mode}</strong></div>
      <div class="stat-line"><span>Alert level</span><strong>${debrief.alertLevel}/3</strong></div>
      <div class="stat-line"><span>Joint attempts</span><strong>${debrief.pairAttempts}</strong></div>
      <div class="stat-line"><span>Radio traffic</span><strong>${debrief.roles.A.radioMessages + debrief.roles.B.radioMessages} messages</strong></div>
      <div class="stat-line"><span>Private nudges</span><strong>${debrief.roles.A.hintsUsed + debrief.roles.B.hintsUsed}</strong></div>
    `;
    const decisionWrap = $("#ending-decisions");
    decisionWrap.innerHTML = "";
    reveal.decisionReview.forEach((decision) => {
      const card = document.createElement("article");
      card.className = `decision-card ${decision.correct ? "correct" : "wrong"}`;
      card.innerHTML = `<span>${decision.roleName} · ${decision.prompt}</span><strong></strong>`;
      card.querySelector("strong").textContent = `${decision.choiceLabel}${decision.correct ? " · confirmed" : ` · correct: ${decision.correctLabel}`}`;
      decisionWrap.appendChild(card);
    });
    $("#next-label").textContent = reveal.nextHook.label;
    $("#next-title").textContent = reveal.nextHook.title;
    $("#next-text").textContent = reveal.nextHook.text;
    $("#next-status").textContent = reveal.nextHook.status;
    renderFeedback(state);
    renderReadyLines("#restart-ready-lines", state.restartReady);
    const mine = !!state.restartReady[myRole];
    const partner = !!state.restartReady[myRole === "A" ? "B" : "A"];
    const restart = $("#btn-restart");
    restart.disabled = mine;
    restart.textContent = mine ? (partner ? "Reopening together…" : "Ready · waiting for partner") : "I'm ready to run it again";
  }

  $("#feedback-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = $("#feedback-status");
    const button = form.querySelector('button[type="submit"]');
    const fields = Object.fromEntries(new FormData(form).entries());
    button.disabled = true;
    status.textContent = "Sending…";
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: CASE_ID, role: myRole, ...fields })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Feedback could not be sent.");
      try { sessionStorage.setItem(form.dataset.storageKey, "1"); } catch (error) {}
      form.hidden = true;
      status.textContent = "Thank you. Your anonymous operation check-in was received.";
    } catch (error) {
      button.disabled = false;
      status.textContent = error.message || "Feedback could not be sent. Please try again.";
    }
  });

  $("#btn-restart").addEventListener("click", () => socket.emit("case2:restart:ready", { ready: true }));

  function renderState(state) {
    latestState = state;
    if (!caseData || state.caseId !== CASE_ID) return;
    renderPartnerRecovery(state);
    const retention = $("#room-retention");
    if (retention && state.roomRetentionMinutes) {
      const duration = state.roomRetentionMinutes >= 60 ? `${Math.round(state.roomRetentionMinutes / 60)} hours` : `${state.roomRetentionMinutes} minutes`;
      retention.textContent = `Closing this tab preserves your private seat and progress for up to ${duration}. Release it only if another player should replace you.`;
    }
    if (state.phase === "lobby") renderLobby(state);
    if (state.phase === "briefing") renderBriefing(state);
    if (state.phase === "operation") renderOperation(state);
    if (state.phase === "convergence") renderConvergence(state);
    if (state.phase === "ending") renderEnding(state);
  }

  socket.on("room:state", renderState);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      unreadRadioCount = 0;
      document.title = BASE_TITLE;
    }
  });

  function renderTutorial() {
    const step = caseData ? caseData.tutorial[tutorialIndex] : null;
    if (!step) return;
    $("#tutorial-step").textContent = `PROTOCOL ${tutorialIndex + 1} OF ${caseData.tutorial.length} · ${myRole ? roleName(myRole) : "BOTH DETECTIVES"}`;
    $("#tutorial-title").textContent = step.title;
    $("#tutorial-body").textContent = step.body;
    $("#tutorial-icon").textContent = ["⌁", "◈", "✎", "▣", "↠", "△", "◎"][tutorialIndex] || "⌁";
    $("#tutorial-dots").innerHTML = caseData.tutorial.map((_, index) => `<span class="tutorial-dot${index === tutorialIndex ? " active" : ""}"></span>`).join("");
    $("#tutorial-back").disabled = tutorialIndex === 0;
    $("#tutorial-next").textContent = tutorialIndex === caseData.tutorial.length - 1 ? "Return to operation" : "Next";
  }

  function openTutorial(index) {
    if (!caseData) return;
    if (!$("#notebook-modal").hidden) closeNotebook();
    tutorialIndex = index || 0;
    renderTutorial();
    $("#tutorial-modal").hidden = false;
    syncModalState();
  }

  function closeTutorial() {
    $("#tutorial-modal").hidden = true;
    syncModalState();
    try { sessionStorage.setItem(`nocturne_case2_tutorial:${myCode}:${myRole}`, "1"); } catch (error) {}
  }

  $("#tutorial-next").addEventListener("click", () => {
    if (tutorialIndex >= caseData.tutorial.length - 1) return closeTutorial();
    tutorialIndex += 1;
    renderTutorial();
  });
  $("#tutorial-back").addEventListener("click", () => {
    if (tutorialIndex > 0) tutorialIndex -= 1;
    renderTutorial();
  });
  $("#tutorial-close").addEventListener("click", closeTutorial);
  $("#btn-briefing-tutorial").addEventListener("click", () => openTutorial(0));
  $("#btn-operation-tutorial").addEventListener("click", () => openTutorial(0));
})();
