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
  let pendingClueMode = null;
  let currentDisplayedClueId = null;
  let currentDocClueId = null;
  const inspectedClues = {};
  let topZ = 10;
  let currentSceneLeadId = null; // which location/person the scene modal is currently showing
  let currentInterviewPersonId = null;
  let lastActUnlocked = 1;
  let lastPhase = null;
  let currentBoardPositions = {};
  let resizeTimer = null;
  let lastChatSignature = "";
  let lastDeductionCount = 0;
  let lastConfrontationCount = 0;
  let lastFoundTotal = 0;
  let resumeInFlight = false;
  let reconnecting = false;
  let fileFilter = "all";
  let reasoningView = "evidence";
  let chatInitialized = false;
  const observedChatMessageIds = new Set();
  const contextualTipsShown = new Set();
  const threadFeedback = {};
  const interviewApproaches = {};
  const interviewFeedback = {};
  const fieldFocus = {};
  const fieldFeedback = {};

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------- Hero art ----------
  if (typeof HERO_SVG !== "undefined") {
    const h1 = document.getElementById("hero-art");
    const h2 = document.getElementById("hero-art-briefing");
    if (h1) h1.innerHTML = HERO_SVG;
    if (h2) h2.innerHTML = HERO_SVG;
  }
  function iconFor(id) {
    return typeof ICONS !== "undefined" && ICONS[id] ? ICONS[id] : "";
  }

  // ---------- Ambient sound (synthesized, no audio files / credits needed) ----------
  const Ambience = (function () {
    let ctx = null;
    let rainSource = null;
    let masterGain = null;
    let on = false;

    function ensureCtx() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);

      // Filtered noise buffer, looped, for a soft rain hiss
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2; // brownish noise, gentler than white noise
      }
      rainSource = ctx.createBufferSource();
      rainSource.buffer = buffer;
      rainSource.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1200;

      rainSource.connect(lowpass);
      lowpass.connect(masterGain);
      rainSource.start(0);
    }

    function toggle() {
      ensureCtx();
      if (!ctx) return false;
      on = !on;
      if (ctx.state === "suspended") ctx.resume();
      masterGain.gain.linearRampToValueAtTime(on ? 0.16 : 0, ctx.currentTime + 0.6);
      return on;
    }

    return { toggle };
  })();

  const soundBtn = document.getElementById("sound-toggle");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      const isOn = Ambience.toggle();
      soundBtn.textContent = isOn ? "🔊" : "🔇";
      soundBtn.classList.toggle("on", isOn);
      soundBtn.setAttribute("aria-pressed", isOn ? "true" : "false");
    });
  }

  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    $("#" + id).classList.add("active");
  }

  // ---------- Tutorial ----------
  const TUTORIAL_SEEN_KEY = "nocturne_tutorial_seen";
  const tutorialSteps = [
    {
      icon: "🕵️",
      title: "You only get half the case",
      body: "You and your partner each receive this guide. The Street reconstructs physical scenes; The Desk questions witnesses and obtains records. Neither player can solve the case alone, so use the Radio Line to compare exact names, times, evidence IDs, and codes."
    },
    {
      icon: "🔎",
      title: "The Street tests a theory",
      body: "At each physical scene, choose a reconstruction focus before examining evidence: access, mechanism, timeline, identity, or staging. The wrong focus gives useful feedback and never destroys a lead. Completed field notes open deeper searches."
    },
    {
      icon: "🎙️",
      title: "The Desk chooses how to ask",
      body: "Choose Rapport, Direct, Pressure, or Present Evidence before asking. Read the subject's demeanor and the kind of question you are asking. A poor approach lowers composure but never locks the interview. Earlier answers and partner evidence unlock sharper lines."
    },
    {
      icon: "⚖️",
      title: "Break the contradiction",
      body: "A suspicious answer is not proof. Return to a witness with evidence that contradicts their statement. You must break two important contradictions before the final call becomes available."
    },
    {
      icon: "🧵",
      title: "Build threads, then eliminate",
      body: "Case Threads ask you to assign several filed clues to distinct roles in the timeline, money trail, and reel route. The Evidence Board has a narrower job: connect proof that clears the two strongest alternative suspects. Unsupported theories are rejected without penalty."
    },
    {
      icon: "☎️",
      title: "Advance only together",
      body: "Both detectives must ready the investigation. Later, once you have enough evidence, three Case Threads, two suspect eliminations, and two broken contradictions, each of you must agree to open the final call and ready the same who, where, why, and how theory."
    }
  ];
  let tutorialStep = 0;

  function renderTutorialStep() {
    const s = tutorialSteps[tutorialStep];
    $("#tutorial-icon").textContent = s.icon;
    $("#tutorial-title").textContent = s.title;
    $("#tutorial-body").textContent = s.body;
    $("#tutorial-step-label").textContent = `Step ${tutorialStep + 1} of ${tutorialSteps.length} · ${myRole && caseData ? caseData.roles[myRole].name : "Both detectives"}`;
    $("#tutorial-role-label").textContent = "HOW TO PLAY · YOUR OWN COPY";
    $("#tutorial-dots").innerHTML = tutorialSteps
      .map((_, i) => `<span class="tutorial-dot${i === tutorialStep ? " active" : ""}"></span>`)
      .join("");
    $("#tutorial-back").disabled = tutorialStep === 0;
    $("#tutorial-next").textContent = tutorialStep === tutorialSteps.length - 1 ? "Start investigating" : "Next";
  }

  function openTutorial(fromStep) {
    tutorialStep = fromStep || 0;
    renderTutorialStep();
    $("#tutorial-modal").classList.add("active");
  }

  function closeTutorial() {
    $("#tutorial-modal").classList.remove("active");
    try {
      sessionStorage.setItem(`${TUTORIAL_SEEN_KEY}:${myCode || "preview"}:${myRole || "guest"}`, "1");
    } catch (e) {}
  }

  $("#tutorial-next").addEventListener("click", () => {
    if (tutorialStep === tutorialSteps.length - 1) {
      closeTutorial();
      return;
    }
    tutorialStep++;
    renderTutorialStep();
  });
  $("#tutorial-back").addEventListener("click", () => {
    if (tutorialStep === 0) return;
    tutorialStep--;
    renderTutorialStep();
  });
  $("#tutorial-skip").addEventListener("click", closeTutorial);
  $("#tutorial-close").addEventListener("click", closeTutorial);
  $("#btn-how-to-play").addEventListener("click", () => openTutorial(0));
  const howToPlayLink = document.getElementById("link-how-to-play");
  if (howToPlayLink) {
    howToPlayLink.addEventListener("click", (e) => {
      e.preventDefault();
      openTutorial(0);
    });
  }

  function saveSession(code, role, name, resumeToken) {
    try {
      const serialized = JSON.stringify({ code, role, name, resumeToken });
      sessionStorage.setItem(SESSION_KEY, serialized);
      localStorage.setItem(SESSION_KEY, serialized);
    } catch (e) {}
  }
  function loadTabSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }
  function loadSession() {
    try {
      return loadTabSession() || JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }
  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  // ---------- Landing tabs ----------
  function activateLandingTab(name) {
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
    showError("");
  }

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activateLandingTab(tab.dataset.tab);
    });
  });

  (function prefillInvite() {
    const params = new URLSearchParams(window.location.search);
    const invitedCode = (params.get("case") || "").toUpperCase().trim();
    if (!/^[A-HJ-NP-Z2-9]{5}$/.test(invitedCode)) return;
    activateLandingTab("join");
    $("#join-code").value = invitedCode;
    $("#invite-notice").hidden = false;
    $("#join-name").focus();
  })();

  function doCreate() {
    showError("");
    const name = $("#create-name").value.trim() || "Detective";
    socket.emit("room:create", { name }, (res) => {
      if (!res.ok) return showError(res.error);
      socket.emit("room:join", { code: res.code, name }, (res2) => {
        if (!res2.ok) return showError(res2.error);
        onJoined(res2);
      });
    });
  }

  function doJoin() {
    showError("");
    const name = $("#join-name").value.trim() || "Detective";
    const code = $("#join-code").value.trim().toUpperCase();
    if (!code) return showError("Enter a case code.");
    socket.emit("room:join", { code, name }, (res) => {
      if (!res.ok) return showError(res.error);
      onJoined(res);
    });
  }

  $("#btn-create").addEventListener("click", doCreate);
  $("#btn-join").addEventListener("click", doJoin);

  // Enter submits from any landing input, matching normal form expectations
  ["create-name"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", (e) => e.key === "Enter" && doCreate());
  });
  ["join-name", "join-code"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", (e) => e.key === "Enter" && doJoin());
  });

  function showError(msg) {
    $("#landing-error").textContent = msg;
  }

  function onJoined(res) {
    myRole = res.role;
    myCode = res.code;
    caseData = res.case;
    chatInitialized = false;
    observedChatMessageIds.clear();
    saveSession(res.code, res.role, res.name || "", res.resumeToken || "");
    $("#lobby-code").textContent = myCode;
    showScreen("screen-lobby");
  }

  function inviteUrl(code) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("case", code);
    return url.toString();
  }

  $("#btn-copy-invite").addEventListener("click", async () => {
    if (!myCode) return;
    const url = inviteUrl(myCode);
    const status = $("#lobby-invite-status");
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "Invite link copied.";
    } catch (error) {
      status.textContent = `Copy this link: ${url}`;
    }
  });

  function setConnectionBanner(message, tone) {
    const banner = $("#connection-banner");
    banner.textContent = message || "";
    banner.className = "connection-banner" + (message ? " show" : "") + (tone ? " " + tone : "");
  }

  // ---------- Reconnect on load, phone wake, or a brief network loss ----------
  function tryResume(options) {
    options = options || {};
    if (resumeInFlight) return;
    const saved = loadSession();
    if (!saved || !saved.code || !saved.role) return;
    resumeInFlight = true;
    if (options.showLobby !== false) {
      showScreen("screen-lobby");
      $("#lobby-code").textContent = saved.code;
      $("#lobby-slot-A").textContent = "Reconnecting to your case...";
    }
    socket.emit("room:join", { code: saved.code, role: saved.role, name: saved.name, resumeToken: saved.resumeToken }, (res) => {
      resumeInFlight = false;
      if (!res || !res.ok) {
        clearSession();
        myRole = null;
        myCode = null;
        caseData = null;
        reconnecting = false;
        setConnectionBanner("");
        showScreen("screen-landing");
        showError("That case has expired. Open a new case to keep investigating.");
        return;
      }
      myRole = res.role;
      myCode = res.code;
      caseData = res.case;
      saveSession(res.code, res.role, res.name || saved.name || "", res.resumeToken || saved.resumeToken || "");
      if (reconnecting) {
        reconnecting = false;
        setConnectionBanner("Reconnected to your case.", "success");
        setTimeout(() => setConnectionBanner(""), 1800);
      }
    });
  }

  socket.on("disconnect", () => {
    if (!myCode) return;
    reconnecting = true;
    setConnectionBanner("Signal lost. Rejoining your case…");
  });

  socket.on("connect", () => {
    if (reconnecting) tryResume({ showLobby: false });
  });

  const invitedCodeOnLoad = (new URLSearchParams(window.location.search).get("case") || "").toUpperCase().trim();
  const freshInviteTab = /^[A-HJ-NP-Z2-9]{5}$/.test(invitedCodeOnLoad) && !loadTabSession();
  if (!freshInviteTab) tryResume();

  $$(".leave-case").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      clearSession();
      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = "";
      cleanUrl.hash = "";
      window.history.replaceState({}, "", cleanUrl);
      window.location.reload();
    })
  );

  // ---------- State rendering ----------
  socket.on("room:state", (state) => {
    // Defense in depth: if this socket is (even momentarily) associated with
    // more than one room server-side, ignore broadcasts for any case other
    // than the one we're actually looking at.
    if (myCode && state.code !== myCode) return;
    latestState = state;
    render(state);
  });

  // Modal overlays live outside the .screen sections, so switching screens
  // never auto-hides them. Only clear them on a real phase change — not on
  // every state broadcast — otherwise a modal you're actively reading would
  // slam shut every time your partner so much as sends a chat message.
  function closeAllModals() {
    $$(".modal-overlay").forEach((m) => m.classList.remove("active"));
    currentSceneLeadId = null;
    currentInterviewPersonId = null;
    linkMode = false;
    linkSelectFirst = null;
    pendingClueId = null;
    pendingClueMode = null;
    currentDisplayedClueId = null;
    currentDocClueId = null;
    const linkButton = $("#btn-link-mode");
    if (linkButton) {
      linkButton.textContent = "Test Link: Off";
      linkButton.setAttribute("aria-pressed", "false");
    }
    const board = $("#corkboard");
    if (board) board.classList.remove("link-mode");
    const linkStatus = $("#link-status");
    if (linkStatus) linkStatus.textContent = "Open a card to review it, or turn on Test Link.";
    const radioAlert = $("#radio-alert");
    if (radioAlert) {
      radioAlert.hidden = true;
      radioAlert.dataset.unreadCount = "0";
    }
  }

  function topActiveModal() {
    return $$(".modal-overlay.active")
      .map((modal) => ({ modal, z: Number(window.getComputedStyle(modal).zIndex) || 0 }))
      .sort((a, b) => b.z - a.z)[0]?.modal || null;
  }

  const modalObserver = new MutationObserver((entries) => {
    entries.forEach((entry) => {
      const modal = entry.target;
      if (modal.classList.contains("active")) {
        modal._returnFocus = document.activeElement;
        window.requestAnimationFrame(() => {
          const target = modal.querySelector(".modal-x, button:not([disabled]), input:not([disabled])");
          if (target) target.focus();
        });
      } else if (modal._returnFocus && modal._returnFocus.isConnected && !topActiveModal()) {
        modal._returnFocus.focus();
      }
    });
  });
  $$(".modal-overlay").forEach((modal) => modalObserver.observe(modal, { attributes: true, attributeFilter: ["class"] }));

  document.addEventListener("keydown", (event) => {
    const modal = topActiveModal();
    if (!modal) return;
    if (event.key === "Escape") {
      const closeControl = modal.id === "clue-modal" ? $("#clue-modal-close") : modal.querySelector(".modal-x");
      if (closeControl) {
        event.preventDefault();
        closeControl.click();
      }
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(
      (element) => element.offsetParent !== null
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function render(state) {
    if (state.phase !== lastPhase) {
      closeAllModals();
      const enteringBriefing = state.phase === "briefing";
      lastPhase = state.phase;
      if (enteringBriefing) {
        contextualTipsShown.clear();
        lastFoundTotal = 0;
        let seen = null;
        try {
          seen = sessionStorage.getItem(`${TUTORIAL_SEEN_KEY}:${myCode}:${myRole}`);
        } catch (e) {}
        if (!seen) {
          // Teach the loop during the briefing, before the active investigation
          // begins, so the first clue is never interrupted by instructions.
          setTimeout(() => openTutorial(0), 300);
        }
      }
    }

    if (state.phase === "lobby") {
      showScreen("screen-lobby");
      updateLobby(state);
      return;
    }

    if (state.phase === "briefing") {
      lastActUnlocked = 1;
      lastDeductionCount = 0;
      lastConfrontationCount = 0;
      renderBriefing(state);
      showScreen("screen-briefing");
      return;
    }

    if (state.phase === "investigation") {
      showScreen("screen-investigation");
      renderInvestigation(state);
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
  function renderTeamReadiness(containerId, state, readinessKey) {
    const container = $(containerId);
    container.innerHTML = "";
    ["A", "B"].forEach((roleId) => {
      const player = state.players[roleId];
      const ready = !!(state[readinessKey] && state[readinessKey][roleId]);
      const item = document.createElement("span");
      item.className = "team-ready-chip" + (ready ? " ready" : "");
      const roleName = caseData.roles[roleId].name;
      item.textContent = `${roleName} — ${player ? player.name : `Detective ${roleId}`}: ${ready ? "Ready" : "Reviewing"}${roleId === myRole ? " (you)" : ""}`;
      container.appendChild(item);
    });
  }

  function renderBriefing(state) {
    $("#briefing-headline").textContent = caseData.briefing.headline;
    $("#briefing-body").innerHTML = caseData.briefing.body.map((p) => `<p>${p}</p>`).join("");
    const role = caseData.roles[myRole];
    $("#role-callout").innerHTML = `
      <div class="role-portrait role-${myRole.toLowerCase()}" role="img" aria-label="Portrait of ${role.name}"></div>
      <div>
        <div class="role-name">You are: ${role.name}</div>
        <div class="role-tag">${role.tagline}</div>
      </div>
    `;
    renderTeamReadiness("#briefing-ready-status", state, "briefingReady");
    const myReady = !!(state.briefingReady && state.briefingReady[myRole]);
    const partnerRole = myRole === "A" ? "B" : "A";
    const partnerReady = !!(state.briefingReady && state.briefingReady[partnerRole]);
    const begin = $("#btn-begin");
    begin.setAttribute("aria-pressed", myReady ? "true" : "false");
    begin.textContent = myReady ? (partnerReady ? "Starting Together…" : "Ready — Waiting for Partner") : (partnerReady ? "Join Partner — I'm Ready" : "I'm Ready to Investigate");
  }

  $("#btn-begin").addEventListener("click", () => {
    if (!latestState || latestState.phase !== "briefing") return;
    const ready = !!(latestState.briefingReady && latestState.briefingReady[myRole]);
    socket.emit("briefing:ready", { ready: !ready });
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
      ((p.interrogation && p.interrogation.questions) || []).forEach((question) => {
        if (question.clueId) {
          clueMeta[question.clueId] = { ...caseData.clueText[question.clueId], ownerRole: "B", parentName: p.name, parentId: p.id };
        }
      });
    });
  }

  function clueRecord(clueId) {
    return {
      ...(clueMeta[clueId] || caseData.clueText[clueId] || {}),
      ...((latestState && latestState.evidenceDetails && latestState.evidenceDetails[clueId]) || {}),
      ...(inspectedClues[clueId] || {})
    };
  }

  function leadsForMyRole() {
    return myRole === "A" ? caseData.locations : caseData.people;
  }

  function hotspotCountable(h) {
    return h.type === "clue" || h.type === "locked";
  }

  function canMakeCall(state) {
    const foundTotal = state.found.A.length + state.found.B.length;
    const deductionsSolved = (state.deductionsSolved || []).length;
    const confrontationsSolved = (state.confrontationsSolved || []).length;
    const threadsSolved = (state.threadsSolved || []).length;
    return (
      state.actUnlocked >= 2 &&
      foundTotal >= caseData.accusationUnlockThreshold &&
      deductionsSolved >= caseData.requiredDeductions &&
      threadsSolved >= caseData.requiredThreads &&
      confrontationsSolved >= caseData.requiredConfrontations
    );
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
    const confrontationCount = (state.confrontationsSolved || []).length;
    const deductionCount = (state.deductionsSolved || []).length;
    const threadCount = (state.threadsSolved || []).length;
    $("#case-progress").textContent = `${foundTotal}/${totalClues} evidence · ${threadCount}/${caseData.requiredThreads} theories · ${deductionCount}/${caseData.requiredDeductions} eliminations · ${confrontationCount}/${caseData.requiredConfrontations} contradictions`;

    const callButton = $("#btn-goto-accuse");
    const callUnlocked = canMakeCall(state);
    const cluesRemaining = Math.max(0, caseData.accusationUnlockThreshold - foundTotal);
    const deductionsRemaining = Math.max(0, caseData.requiredDeductions - (state.deductionsSolved || []).length);
    const threadsRemaining = Math.max(0, caseData.requiredThreads - (state.threadsSolved || []).length);
    const confrontationsRemaining = Math.max(0, caseData.requiredConfrontations - confrontationCount);
    callButton.disabled = !callUnlocked;
    const callReady = state.callReady || { A: false, B: false };
    const myCallReady = !!callReady[myRole];
    const partnerCallReady = !!callReady[myRole === "A" ? "B" : "A"];
    callButton.setAttribute("aria-pressed", myCallReady ? "true" : "false");
    if (callUnlocked) {
      callButton.textContent = myCallReady ? "Ready · Waiting" : partnerCallReady ? "Join Partner" : "Ready to Make Call";
      callButton.title = myCallReady ? "Click to withdraw your readiness" : "Both detectives must be ready before the accusation opens";
    } else if (cluesRemaining > 0 || state.actUnlocked < 2) {
      callButton.textContent = `Call Locked (${foundTotal}/${caseData.accusationUnlockThreshold})`;
      callButton.title = `Find ${cluesRemaining} more clue${cluesRemaining === 1 ? "" : "s"} before making the call`;
    } else if (threadsRemaining > 0) {
      callButton.textContent = `Build Theory (${threadCount}/${caseData.requiredThreads})`;
      callButton.title = `Establish ${threadsRemaining} more case thread${threadsRemaining === 1 ? "" : "s"}`;
    } else if (deductionsRemaining > 0) {
      callButton.textContent = "Link Evidence";
      callButton.title = `Eliminate ${deductionsRemaining} remaining alternative suspect${deductionsRemaining === 1 ? "" : "s"} on the Evidence Board`;
    } else {
      callButton.textContent = `Break ${confrontationsRemaining} Contradiction${confrontationsRemaining === 1 ? "" : "s"}`;
      callButton.title = "Return to interviews and confront a statement with evidence";
    }

    maybeShowUnlockBanner(state);

    $("#leads-title").textContent = myRole === "A" ? "Locations" : "People";
    renderObjectives(state);
    const leadsList = $("#leads-list");
    leadsList.innerHTML = "";
    const myFound = state.found[myRole];
    const myFlavor = state.flavorSeen[myRole] || [];

    leadsForMyRole().forEach((lead) => {
      const locked = lead.act === 2 && state.actUnlocked < 2;
      const div = document.createElement(locked ? "div" : "button");

      if (locked) {
        div.className = "lead-item locked";
        div.innerHTML = `
          <div class="lead-icon">🔒</div>
          <div class="lead-item-body">
            <div class="lead-name">New lead</div>
            <div class="lead-blurb">Keep digging — this opens up once you two have found more.</div>
          </div>
        `;
        leadsList.appendChild(div);
        return;
      }

      div.type = "button";
      const visibleHotspots = lead.hotspots.filter((h) => h.type !== "interview");
      const countable = visibleHotspots.filter(hotspotCountable);
      const foundCount = countable.filter((h) => myFound.includes(h.clueId)).length;
      const recordsComplete = visibleHotspots.every((h) => (hotspotCountable(h) ? myFound.includes(h.clueId) : myFlavor.includes(h.id)));
      const questions = (lead.interrogation && lead.interrogation.questions) || [];
      const askedCount = questions.filter((question) => (state.questionsAsked || []).includes(question.id)).length;
      const allSeen = recordsComplete && (!questions.length || askedCount === questions.length);
      const icon = lead.interrogation
        ? `<span class="lead-portrait" style="background-position:${lead.portraitPosition}" aria-hidden="true"></span>`
        : lead.scenePosition
          ? `<span class="lead-scene" style="background-position:${lead.scenePosition}" aria-hidden="true"></span>`
          : `<div class="lead-icon">${iconFor(lead.id)}</div>`;
      const progress = questions.length
        ? `${askedCount}/${questions.length} questions · ${foundCount}/${countable.length} records`
        : `${foundCount}/${countable.length} evidence found`;

      div.className = "lead-item" + (allSeen ? " exhausted" : "");
      div.innerHTML = `
        ${icon}
        <div class="lead-item-body">
          <div class="lead-name">${lead.name}${lead.role ? " — " + lead.role : ""}</div>
          <div class="lead-blurb">${lead.blurb}</div>
          <div class="lead-progress">${progress}${allSeen ? " · complete" : ""}</div>
        </div>
      `;
      div.addEventListener("click", () => openScene(lead));
      leadsList.appendChild(div);
    });

    if (currentSceneLeadId) {
      const lead = leadsForMyRole().find((l) => l.id === currentSceneLeadId);
      if (lead) renderScene(lead, state);
    }
    if (currentInterviewPersonId) {
      const person = caseData.people.find((lead) => lead.id === currentInterviewPersonId);
      if (person) renderInterview(person, state);
    }

    renderDeductions(state);
    renderCorkboard(state);
    renderThreads(state);
    renderChat(state);
  }

  function renderObjectives(state) {
    const objectives = [];
    const found = [...state.found.A, ...state.found.B];
    const asked = state.questionsAsked || [];
    const leads = leadsForMyRole().filter((lead) => lead.act <= state.actUnlocked);
    const unsolvedThreads = caseData.investigationThreads.filter((thread) => !(state.threadsSolved || []).includes(thread.id));

    if (myRole === "A") {
      leads.forEach((lead) => {
        lead.hotspots.forEach((hotspot) => {
          const complete = hotspot.type === "flavor"
            ? (state.flavorSeen.A || []).includes(hotspot.id)
            : hotspot.clueId && found.includes(hotspot.clueId);
          if (complete) return;
          if (hotspot.type === "locked") {
            objectives.push({ text: `${lead.name}: find and enter the three-digit closet combination`, waiting: true });
          } else if (sourceRequirementsMet(hotspot, state)) {
            objectives.push({ text: `${lead.name}: ${hotspot.actionLabel || hotspot.label}`, waiting: false });
          } else {
            objectives.push({ text: `${lead.name}: ${hotspot.unlockHint || "waiting on a lead from the Desk"}`, waiting: true });
          }
        });
      });
    } else {
      leads.forEach((person) => {
        (person.interrogation.questions || []).forEach((question) => {
          if (asked.includes(question.id)) return;
          objectives.push({
            text: `${person.name}: ${sourceRequirementsMet(question, state) ? question.prompt : requirementMessage(question, state)}`,
            waiting: !sourceRequirementsMet(question, state)
          });
        });
        person.hotspots.filter((hotspot) => hotspot.type === "clue").forEach((hotspot) => {
          if (found.includes(hotspot.clueId)) return;
          objectives.push({
            text: `${person.name}: ${sourceRequirementsMet(hotspot, state) ? `examine ${hotspot.label}` : hotspot.unlockHint}`,
            waiting: !sourceRequirementsMet(hotspot, state)
          });
        });
      });
    }

    objectives.sort((a, b) => Number(a.waiting) - Number(b.waiting));
    if (found.length >= 3 && unsolvedThreads.length) {
      objectives.unshift({ text: `Case Threads: assemble “${unsolvedThreads[0].title}” from filed evidence`, waiting: false });
    }
    if (!objectives.some((objective) => !objective.waiting) && canMakeCall(state)) {
      objectives.unshift({ text: "Review your four-part theory with your partner and make the call", waiting: false });
    } else if (!objectives.length) {
      objectives.push({ text: "Review filed evidence and test a defensible connection on the board", waiting: false });
    }

    const list = $("#objective-list");
    list.innerHTML = "";
    objectives.slice(0, 3).forEach((objective) => {
      const item = document.createElement("div");
      item.className = "objective-item" + (objective.waiting ? " waiting" : "");
      item.textContent = objective.text;
      list.appendChild(item);
    });
  }

  function showUnlockBanner(message) {
    const banner = $("#unlock-banner");
    banner.textContent = message;
    banner.classList.add("show");
    clearTimeout(banner._hideTimer);
    banner._hideTimer = setTimeout(() => banner.classList.remove("show"), 5500);
  }

  function maybeShowUnlockBanner(state) {
    const foundTotal = state.found.A.length + state.found.B.length;
    if (foundTotal > lastFoundTotal && lastFoundTotal === 0 && !contextualTipsShown.has("first-evidence")) {
      contextualTipsShown.add("first-evidence");
      showUnlockBanner("📌 First evidence filed. Open its board card to reread it or send it over the Radio Line.");
    } else if (foundTotal >= 2 && lastFoundTotal < 2 && !contextualTipsShown.has("board-ready")) {
      contextualTipsShown.add("board-ready");
      showUnlockBanner("🧵 The Evidence Board is ready. Test a pair only when the two files prove one conclusion together.");
    }
    if (state.actUnlocked > lastActUnlocked) {
      showUnlockBanner("🗞️ New leads have opened up across the city.");
    }
    const confrontationCount = (state.confrontationsSolved || []).length;
    if (confrontationCount > lastConfrontationCount) {
      showUnlockBanner("⚖️ Contradiction broken. Their story no longer holds.");
    }
    lastActUnlocked = state.actUnlocked;
    lastConfrontationCount = confrontationCount;
    lastFoundTotal = foundTotal;
  }

  function renderDeductions(state) {
    const solvedIds = state.deductionsSolved || [];
    const details = state.deductionDetails || [];
    const log = $("#deduction-log");
    log.innerHTML = "";
    solvedIds
      .map((id) => details.find((deduction) => deduction.id === id))
      .filter(Boolean)
      .forEach((deduction) => {
        const chip = document.createElement("span");
        chip.className = "deduction-chip";
        chip.title = deduction.text;
        chip.textContent = `✓ ${deduction.title}`;
        log.appendChild(chip);
      });
    if (solvedIds.length > lastDeductionCount) {
      const newest = details.find((deduction) => deduction.id === solvedIds[solvedIds.length - 1]);
      if (newest) showUnlockBanner(`🧵 Deduction unlocked: ${newest.title}`);
    }
    lastDeductionCount = solvedIds.length;
  }

  function setReasoningView(view) {
    reasoningView = view === "threads" ? "threads" : "evidence";
    const evidenceActive = reasoningView === "evidence";
    $("#evidence-workspace").hidden = !evidenceActive;
    $("#threads-workspace").hidden = evidenceActive;
    $("#tab-evidence").classList.toggle("active", evidenceActive);
    $("#tab-evidence").setAttribute("aria-selected", evidenceActive ? "true" : "false");
    $("#tab-threads").classList.toggle("active", !evidenceActive);
    $("#tab-threads").setAttribute("aria-selected", evidenceActive ? "false" : "true");
  }

  $("#tab-evidence").addEventListener("click", () => setReasoningView("evidence"));
  $("#tab-threads").addEventListener("click", () => setReasoningView("threads"));

  function renderThreads(state) {
    const solvedIds = state.threadsSolved || [];
    const details = state.threadDetails || [];
    const drafts = state.threadDrafts || {};
    const foundIds = [...state.found.A, ...state.found.B];
    const list = $("#threads-list");
    $("#threads-progress").textContent = `${solvedIds.length}/${caseData.requiredThreads} established`;
    $("#tab-threads").textContent = `Case Threads ${solvedIds.length}/${caseData.requiredThreads}`;
    list.innerHTML = "";

    caseData.investigationThreads.forEach((thread) => {
      const solved = solvedIds.includes(thread.id);
      const solvedDetail = details.find((detail) => detail.id === thread.id);
      const draft = drafts[thread.id] || {};
      const card = document.createElement("article");
      card.className = "thread-card" + (solved ? " solved" : "");

      const head = document.createElement("div");
      head.className = "thread-card-head";
      const identity = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = thread.title;
      const question = document.createElement("div");
      question.className = "thread-question";
      question.textContent = thread.question;
      identity.append(title, question);
      const status = document.createElement("span");
      status.className = "thread-state";
      status.textContent = solved ? "Established" : `${Object.values(draft).filter(Boolean).length}/${thread.slots.length} placed`;
      head.append(identity, status);
      card.appendChild(head);

      if (solved && solvedDetail) {
        const result = document.createElement("div");
        result.className = "thread-result";
        result.textContent = solvedDetail.result;
        card.appendChild(result);
      } else {
        const slots = document.createElement("div");
        slots.className = "thread-slots";
        thread.slots.forEach((slot) => {
          const wrapper = document.createElement("div");
          wrapper.className = "thread-slot";
          const label = document.createElement("label");
          const selectId = `thread-${thread.id}-${slot.id}`;
          label.htmlFor = selectId;
          label.textContent = slot.label;
          const prompt = document.createElement("small");
          prompt.textContent = slot.prompt;
          const select = document.createElement("select");
          select.id = selectId;
          const empty = document.createElement("option");
          empty.value = "";
          empty.textContent = "Choose filed evidence…";
          select.appendChild(empty);
          foundIds.forEach((clueId) => {
            const clue = clueRecord(clueId);
            const option = document.createElement("option");
            option.value = clueId;
            option.textContent = `${clueId} — ${clue.title}`;
            select.appendChild(option);
          });
          select.value = draft[slot.id] || "";
          select.addEventListener("change", () => {
            threadFeedback[thread.id] = "";
            socket.emit("thread:update", { threadId: thread.id, update: { [slot.id]: select.value || null } });
          });
          wrapper.append(label, prompt, select);
          slots.appendChild(wrapper);
        });
        card.appendChild(slots);

        const actions = document.createElement("div");
        actions.className = "thread-actions";
        const submit = document.createElement("button");
        submit.type = "button";
        submit.className = "btn ghost small";
        submit.textContent = "Test This Theory";
        submit.disabled = !thread.slots.every((slot) => draft[slot.id]);
        const feedback = document.createElement("span");
        feedback.className = "thread-feedback";
        feedback.setAttribute("role", "status");
        feedback.textContent = threadFeedback[thread.id] || "";
        submit.addEventListener("click", () => {
          submit.disabled = true;
          socket.emit("thread:submit", { threadId: thread.id }, (response) => {
            if (!response || !response.ok) {
              threadFeedback[thread.id] = (response && response.error) || "That theory could not be tested.";
              renderThreads(latestState);
            }
          });
        });
        actions.append(submit, feedback);
        card.appendChild(actions);
      }
      list.appendChild(card);
    });
    setReasoningView(reasoningView);
  }

  // ---------- Scene modal (examine a location/person) ----------
  function sourceRequirementsMet(source, state) {
    const found = [...state.found.A, ...state.found.B];
    const asked = state.questionsAsked || [];
    return (
      (source.requiresClues || []).every((clueId) => found.includes(clueId)) &&
      (source.requiresQuestions || []).every((questionId) => asked.includes(questionId))
    );
  }

  function openScene(lead) {
    if (lead.interrogation) {
      openInterview(lead);
      return;
    }
    currentSceneLeadId = lead.id;
    currentInterviewPersonId = null;
    renderScene(lead, latestState);
    $("#scene-modal").classList.add("active");
    if (!contextualTipsShown.has("fieldwork")) {
      contextualTipsShown.add("fieldwork");
      showUnlockBanner("🔎 Start with an available approach. Completed field notes can open deeper searches.");
    }
  }

  $("#scene-modal-close").addEventListener("click", () => {
    $("#scene-modal").classList.remove("active");
    currentSceneLeadId = null;
  });

  function openInterview(person) {
    currentSceneLeadId = null;
    currentInterviewPersonId = person.id;
    if (!interviewApproaches[person.id]) interviewApproaches[person.id] = "direct";
    $("#scene-modal").classList.remove("active");
    renderInterview(person, latestState);
    $("#interview-modal").classList.add("active");
    if (!contextualTipsShown.has("interview")) {
      contextualTipsShown.add("interview");
      showUnlockBanner("🎙️ Choose how to ask, not only what to ask. Demeanor, question type, and evidence all matter.");
    }
  }

  $("#interview-modal-close").addEventListener("click", () => {
    $("#interview-modal").classList.remove("active");
    currentInterviewPersonId = null;
  });

  function requirementMessage(source, state) {
    const found = [...state.found.A, ...state.found.B];
    const asked = state.questionsAsked || [];
    const missingClues = (source.requiresClues || []).filter((clueId) => !found.includes(clueId));
    const missingQuestions = (source.requiresQuestions || []).filter((questionId) => !asked.includes(questionId));
    const parts = [];
    if (missingQuestions.length) parts.push("Pursue the earlier line of questioning first");
    if (missingClues.length) {
      parts.push(`Needs evidence: ${missingClues.map((clueId) => caseData.clueText[clueId].title).join(" + ")}`);
    }
    return parts.join(" · ");
  }

  function renderInterview(person, state) {
    const workspace = document.querySelector(".interrogation-workspace");
    const layout = document.querySelector(".interrogation-layout");
    const workspaceScroll = workspace ? workspace.scrollTop : 0;
    const layoutScroll = layout ? layout.scrollTop : 0;
    const interrogation = person.interrogation;
    const questions = interrogation.questions;
    const askedIds = state.questionsAsked || [];
    const interviewResults = new Map((state.interviewResults || []).map((result) => [result.id, result]));
    const askedForPerson = askedIds.map((id) => questions.find((question) => question.id === id)).filter(Boolean);

    const portrait = $("#interview-portrait");
    portrait.style.backgroundPosition = person.portraitPosition;
    portrait.setAttribute("aria-label", `Portrait of ${person.name}`);
    $("#interview-role").textContent = person.role;
    $("#interview-name").textContent = person.name;
    $("#interview-demeanor").textContent = interrogation.demeanor;
    $("#interview-opening").textContent = interrogation.opening;
    $("#interview-progress").textContent = `${askedForPerson.length}/${questions.length} lines pursued`;

    const interviewState = (state.interviewStates && state.interviewStates[person.id]) || { composure: 3, missteps: 0 };
    const composureLabels = { 3: "Composure: Stable", 2: "Composure: Guarded", 1: "Composure: Tense" };
    $("#interview-composure").textContent = composureLabels[interviewState.composure] || "Composure: Stable";
    $("#interview-strategy-feedback").textContent = interviewFeedback[person.id] || "";
    $$("#interview-approaches button").forEach((approachButton) => {
      const selected = approachButton.dataset.approach === interviewApproaches[person.id];
      approachButton.classList.toggle("active", selected);
      approachButton.setAttribute("aria-pressed", selected ? "true" : "false");
      approachButton.onclick = () => {
        interviewApproaches[person.id] = approachButton.dataset.approach;
        interviewFeedback[person.id] = "";
        renderInterview(person, latestState);
      };
    });

    const transcript = $("#interview-transcript");
    transcript.innerHTML = "";
    if (!askedForPerson.length) {
      const empty = document.createElement("div");
      empty.className = "interview-empty";
      empty.textContent = "No statement yet. Start broad, listen for exact details, then return with proof.";
      transcript.appendChild(empty);
    } else {
      askedForPerson.forEach((question) => {
        const result = interviewResults.get(question.id);
        if (!result) return;
        const exchange = document.createElement("article");
        exchange.className = "transcript-exchange" + (result.breakthrough ? " breakthrough" : "");
        const prompt = document.createElement("div");
        prompt.className = "transcript-question";
        prompt.textContent = `YOU — ${question.prompt}`;
        const answer = document.createElement("div");
        answer.className = "transcript-answer";
        answer.textContent = `${person.name.toUpperCase()} — ${result.response}`;
        const tell = document.createElement("div");
        tell.className = "transcript-tell";
        tell.textContent = result.after;
        exchange.append(prompt, answer, tell);
        transcript.appendChild(exchange);
      });
    }

    const questionList = $("#interview-questions");
    questionList.innerHTML = "";
    const remainingQuestions = questions.filter((question) => !askedIds.includes(question.id));
    if (!remainingQuestions.length) {
      const complete = document.createElement("div");
      complete.className = "interview-empty";
      complete.textContent = "No unasked lines remain. Review the statement and compare it with the case file.";
      questionList.appendChild(complete);
    }
    remainingQuestions.forEach((question) => {
      const available = sourceRequirementsMet(question, state);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "interview-question";
      button.disabled = !available;
      const tag = document.createElement("span");
      tag.className = "question-tag";
      tag.textContent = available ? question.tag : "LOCKED";
      const copy = document.createElement("span");
      copy.className = "question-copy";
      copy.textContent = question.prompt;
      button.append(tag, copy);
      if (!available) {
        const lock = document.createElement("span");
        lock.className = "question-lock";
        lock.textContent = requirementMessage(question, state);
        button.appendChild(lock);
      } else {
        button.addEventListener("click", () => {
          button.disabled = true;
          socket.emit("interview:ask", { personId: person.id, questionId: question.id, approach: interviewApproaches[person.id] }, (res) => {
            if (!res || !res.ok) {
              button.disabled = false;
              if (res && res.soft) {
                interviewFeedback[person.id] = res.error;
                renderInterview(person, latestState);
              } else {
                setConnectionBanner((res && res.error) || "That question could not be asked.");
              }
              return;
            }
            interviewFeedback[person.id] = "The approach works. They stay with the question.";
            renderInterview(person, latestState);
            if (res.clueId) {
              revealClue(res.clueId, person.name, { alreadyFound: true, viaInterview: true });
            }
          });
        });
      }
      questionList.appendChild(button);
    });

    renderInterviewRecords(person, state);
    if (workspace) workspace.scrollTop = workspaceScroll;
    if (layout) layout.scrollTop = layoutScroll;
  }

  function renderInterviewRecords(person, state) {
    const container = $("#interview-records");
    const myFound = state.found.B;
    const myFlavor = state.flavorSeen.B || [];
    container.innerHTML = "";
    person.hotspots.filter((hotspot) => hotspot.type !== "interview").forEach((hotspot) => {
      const row = document.createElement("div");
      row.className = "hotspot-row";
      row.dataset.hotspotId = hotspot.id;
      if (hotspot.type === "clue") {
        const done = myFound.includes(hotspot.clueId);
        const available = sourceRequirementsMet(hotspot, state);
        row.className += done ? " hotspot-done" : available ? "" : " hotspot-gated";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "hotspot-btn";
        button.disabled = !done && !available;
        button.innerHTML = `<span class="hotspot-icon">${done ? "✓" : available ? "▤" : "◌"}</span><span class="hotspot-label">${hotspot.label}</span>${done ? '<span class="hotspot-tag">filed</span>' : ""}`;
        if (done || available) {
          button.addEventListener("click", () => (done ? openDoc(hotspot.clueId) : revealClue(hotspot.clueId, person.name)));
        }
        row.appendChild(button);
        if (!done && !available) {
          const gate = document.createElement("div");
          gate.className = "hotspot-gate";
          gate.textContent = hotspot.unlockHint || requirementMessage(hotspot, state);
          row.appendChild(gate);
        }
      } else if (hotspot.type === "flavor") {
        const seen = myFlavor.includes(hotspot.id);
        row.className += seen ? " hotspot-done" : "";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "hotspot-btn";
        button.disabled = seen;
        button.innerHTML = `<span class="hotspot-icon">${seen ? "•" : "👁"}</span><span class="hotspot-label">${hotspot.label}</span>`;
        if (!seen) button.addEventListener("click", () => socket.emit("flavor:seen", { hotspotId: hotspot.id }));
        row.appendChild(button);
        if (seen) {
          const detail = document.createElement("div");
          detail.className = "hotspot-inline-text";
          detail.textContent = hotspot.text;
          row.appendChild(detail);
        }
      }
      container.appendChild(row);
    });
  }

  function renderScene(lead, state) {
    const workspace = document.querySelector(".fieldwork-workspace");
    const layout = document.querySelector(".fieldwork-layout");
    const workspaceScroll = workspace ? workspace.scrollTop : 0;
    const layoutScroll = layout ? layout.scrollTop : 0;
    const myFound = state.found[myRole];
    const myFlavor = state.flavorSeen[myRole] || [];

    // A state broadcast can arrive from something your partner did that has
    // nothing to do with this scene (a chat message, a card drag). Rebuilding
    // the hotspot list from scratch on every one of those would blow away
    // whatever you're mid-typing into a lock code field. Snapshot any typed
    // (not-yet-submitted) code input before the rebuild and restore it after.
    const inProgressCodes = {};
    $$(".lock-input").forEach((inp) => {
      const hid = inp.closest(".hotspot-row") && inp.closest(".hotspot-row").dataset.hotspotId;
      if (hid && inp.value) inProgressCodes[hid] = inp.value;
    });

    $("#scene-modal-kicker").textContent = "LOCATION REPORT";
    $("#scene-modal-title").textContent = lead.name;
    $("#scene-modal-blurb").textContent = lead.blurb;
    $("#scene-modal-method").textContent = lead.fieldMethod || "Observe · test · document";
    $("#scene-modal-opening").textContent = lead.fieldOpening || "Read the scene before choosing what to disturb.";
    const sceneImage = $("#scene-image");
    sceneImage.style.backgroundPosition = lead.scenePosition || "0% 0%";
    sceneImage.setAttribute("aria-label", `Crime scene view of ${lead.name}`);

    renderFieldNotes(lead, state);

    const focusOptions = $("#scene-focus-options");
    focusOptions.innerHTML = "";
    (lead.fieldModes || []).forEach((mode) => {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("active", fieldFocus[lead.id] === mode.id);
      button.setAttribute("aria-pressed", fieldFocus[lead.id] === mode.id ? "true" : "false");
      button.textContent = mode.label;
      button.title = mode.prompt;
      button.addEventListener("click", () => {
        fieldFocus[lead.id] = mode.id;
        fieldFeedback[lead.id] = mode.prompt;
        renderScene(lead, latestState);
      });
      focusOptions.appendChild(button);
    });
    $("#scene-strategy-feedback").textContent = fieldFeedback[lead.id] || "Choose a focus before testing an evidence approach.";

    const container = $("#scene-hotspots");
    container.innerHTML = "";

    lead.hotspots.forEach((h) => {
      const row = document.createElement("div");
      row.className = "hotspot-row";
      row.dataset.hotspotId = h.id;

      if (h.type === "clue") {
        const done = myFound.includes(h.clueId);
        const available = sourceRequirementsMet(h, state);
        const hasFocus = !!fieldFocus[lead.id];
        row.className += done ? " hotspot-done" : available && hasFocus ? "" : " hotspot-gated";
        row.innerHTML = `
          <button class="hotspot-btn field-action-btn" type="button" ${!done && (!available || !hasFocus) ? "disabled" : ""}>
            <span class="hotspot-icon">${done ? "✓" : available && hasFocus ? "🔎" : "◌"}</span>
            <span class="field-action-copy">
              <span class="field-action-tag">${h.tag || "SEARCH"}</span>
              <span class="hotspot-label">${h.actionLabel || h.label}</span>
              <span class="field-action-location">${h.label}</span>
            </span>
            ${done ? '<span class="hotspot-tag">examined</span>' : ""}
          </button>
          ${!done && (!available || !hasFocus) ? `<div class="hotspot-gate">${!hasFocus ? "Choose a reconstruction focus above." : h.unlockHint || "Another lead must be established first."}</div>` : ""}
        `;
        if (done || (available && hasFocus)) {
          row.querySelector(".hotspot-btn").addEventListener("click", () => {
            if (done) {
              openDoc(h.clueId);
            } else {
              revealClue(h.clueId, lead.name, { sceneMode: fieldFocus[lead.id], sceneId: lead.id });
            }
          });
        }
      } else if (h.type === "flavor") {
        // Once examined, flavor text stays visible permanently (same pattern
        // as an "examined" clue) — no toggle-to-hide, so there's nothing for
        // an unrelated re-render to inconsistently snap back open or shut.
        const seen = myFlavor.includes(h.id);
        row.className += seen ? " hotspot-done" : "";
        row.innerHTML = `
          <button class="hotspot-btn field-action-btn" type="button" ${seen ? "disabled" : ""}>
            <span class="hotspot-icon">${seen ? "•" : "👁"}</span>
            <span class="field-action-copy">
              <span class="field-action-tag">${h.tag || "OBSERVE"}</span>
              <span class="hotspot-label">${h.actionLabel || h.label}</span>
              <span class="field-action-location">${h.label}</span>
            </span>
          </button>
        `;
        if (!seen) {
          row.querySelector(".hotspot-btn").addEventListener("click", () => {
            socket.emit("flavor:seen", { hotspotId: h.id });
          });
        }
      } else if (h.type === "locked") {
        const solved = !!state.puzzlesSolved[h.puzzleId];
        const done = solved && myFound.includes(h.clueId);
        row.className += done ? " hotspot-done" : " hotspot-locked";
        if (done) {
          row.innerHTML = `
            <button class="hotspot-btn field-action-btn" type="button">
              <span class="hotspot-icon">✓</span>
              <span class="field-action-copy">
                <span class="field-action-tag">${h.tag || "UNLOCK"}</span>
                <span class="hotspot-label">${h.actionLabel || h.label}</span>
                <span class="field-action-location">${h.label}</span>
              </span>
              <span class="hotspot-tag">unlocked</span>
            </button>
          `;
          row.querySelector(".hotspot-btn").addEventListener("click", () => openDoc(h.clueId));
        } else {
          row.innerHTML = `
            <div class="hotspot-btn field-action-btn hotspot-btn-static">
              <span class="hotspot-icon">🔒</span>
              <span class="field-action-copy">
                <span class="field-action-tag">${h.tag || "COMBINATION"}</span>
                <span class="hotspot-label">${h.actionLabel || h.label}</span>
                <span class="field-action-location">${h.label}</span>
              </span>
            </div>
            <div class="lock-hint">${h.lockedHint || "Locked."}</div>
            <form class="lock-form">
              <input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8" placeholder="Code..." class="lock-input" aria-label="Supply closet combination" />
              <button type="submit" class="btn primary small" ${!fieldFocus[lead.id] ? "disabled" : ""}>Try</button>
            </form>
            <div class="lock-error"></div>
          `;
          const restoreVal = inProgressCodes[h.id];
          if (restoreVal) row.querySelector(".lock-input").value = restoreVal;
          const form = row.querySelector(".lock-form");
          form.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = row.querySelector(".lock-input");
            const errEl = row.querySelector(".lock-error");
            socket.emit("puzzle:attempt", { puzzleId: h.puzzleId, code: input.value, hotspotId: h.id, sceneMode: fieldFocus[lead.id] }, (res) => {
              if (res && res.ok) {
                errEl.textContent = "";
                if (res.clueId) revealClue(res.clueId, lead.name, { alreadyFound: true, viaPuzzle: true });
              } else {
                errEl.textContent = (res && res.error) || "Wrong code.";
                if (res && res.soft) fieldFeedback[lead.id] = res.error;
                input.value = "";
              }
            });
          });
        }
      }

      container.appendChild(row);
    });
    if (workspace) workspace.scrollTop = workspaceScroll;
    if (layout) layout.scrollTop = layoutScroll;
  }

  function renderFieldNotes(lead, state) {
    const found = state.found.A || [];
    const seen = state.flavorSeen.A || [];
    const completed = lead.hotspots.filter((hotspot) => {
      if (hotspot.type === "flavor") return seen.includes(hotspot.id);
      if (hotspot.type === "locked") return !!state.puzzlesSolved[hotspot.puzzleId] && found.includes(hotspot.clueId);
      return hotspot.clueId ? found.includes(hotspot.clueId) : false;
    });
    $("#scene-progress").textContent = `${completed.length}/${lead.hotspots.length} approaches completed`;
    const notes = $("#scene-notes");
    notes.innerHTML = "";
    if (!completed.length) {
      const empty = document.createElement("div");
      empty.className = "interview-empty";
      empty.textContent = "No field notes yet. Choose an approach; unavailable searches explain what information is missing.";
      notes.appendChild(empty);
      return;
    }
    completed.forEach((hotspot) => {
      const note = document.createElement("article");
      note.className = "scene-note";
      const heading = document.createElement("div");
      heading.className = "scene-note-heading";
      heading.textContent = `${hotspot.tag || "OBSERVE"} — ${hotspot.label}`;
      const result = document.createElement("p");
      result.textContent =
        (hotspot.clueId && state.fieldResults && state.fieldResults[hotspot.clueId]) ||
        hotspot.text ||
        "The approach has been documented.";
      note.append(heading, result);
      if (hotspot.clueId && caseData.clueText[hotspot.clueId]) {
        const filed = document.createElement("button");
        filed.type = "button";
        filed.className = "scene-note-file";
        filed.textContent = `Filed evidence: ${caseData.clueText[hotspot.clueId].title}`;
        filed.addEventListener("click", () => openDoc(hotspot.clueId));
        note.appendChild(filed);
      }
      notes.appendChild(note);
    });
  }

  function revealClue(clueId, parentName, opts) {
    opts = opts || {};
    const existing = clueRecord(clueId);
    if (!existing.text) {
      socket.emit("clue:inspect", { clueId, sceneMode: opts.sceneMode }, (response) => {
        if (!response || !response.ok || !response.clue) {
          if (response && response.soft && opts.sceneId) {
            fieldFeedback[opts.sceneId] = response.error;
            const lead = caseData.locations.find((location) => location.id === opts.sceneId);
            if (lead) renderScene(lead, latestState);
          } else {
            setConnectionBanner((response && response.error) || "That evidence could not be opened.");
          }
          return;
        }
        inspectedClues[clueId] = response.clue;
        revealClue(clueId, parentName, opts);
      });
      return;
    }
    pendingClueId = opts.alreadyFound ? null : clueId;
    pendingClueMode = opts.alreadyFound ? null : (opts.sceneMode || null);
    currentDisplayedClueId = clueId;
    const meta = clueRecord(clueId);
    $("#clue-modal-kicker").textContent = opts.viaPuzzle
      ? "UNLOCKED"
      : opts.viaInterview
        ? "STATEMENT FILED"
        : (parentName || "").toUpperCase();
    $("#clue-modal-title").textContent = meta.title;
    $("#clue-modal-text").textContent = meta.text;
    $("#clue-modal-close").textContent = opts.alreadyFound ? "Continue" : "File Evidence";
    $("#clue-share").textContent = "Send to Radio";
    $("#clue-share").disabled = false;
    $("#clue-modal").classList.add("active");
  }

  $("#clue-modal-close").addEventListener("click", () => {
    if (pendingClueId) {
      socket.emit("clue:found", { clueId: pendingClueId, sceneMode: pendingClueMode });
      pendingClueId = null;
      pendingClueMode = null;
    }
    $("#clue-modal").classList.remove("active");
    currentDisplayedClueId = null;
  });

  function shareEvidence(clueId, button) {
    if (!clueId || !caseData.clueText[clueId]) return;
    if (pendingClueId === clueId) {
      socket.emit("clue:found", { clueId, sceneMode: pendingClueMode });
      pendingClueId = null;
      pendingClueMode = null;
      $("#clue-modal-close").textContent = "Continue";
    }
    const clue = clueRecord(clueId);
    if (!clue.text) return;
    const excerpt = clue.text.length > 165 ? clue.text.slice(0, 162).trimEnd() + "…" : clue.text;
    socket.emit("chat:send", { text: `📎 ${clueId} — ${clue.title}: ${excerpt}` });
    if (button) {
      button.textContent = "Sent to Radio";
      button.disabled = true;
    }
  }

  $("#clue-share").addEventListener("click", (event) => shareEvidence(currentDisplayedClueId, event.currentTarget));

  // ---------- Case Files gallery ----------
  $("#btn-open-files").addEventListener("click", () => {
    $("#files-search").value = "";
    fileFilter = "all";
    $$(".file-filter").forEach((button) => {
      const active = button.dataset.fileFilter === "all";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    renderFilesGrid();
    $("#files-modal").classList.add("active");
  });
  $("#files-modal-close").addEventListener("click", () => $("#files-modal").classList.remove("active"));
  $("#files-search").addEventListener("input", renderFilesGrid);
  $$(".file-filter").forEach((button) => {
    button.addEventListener("click", () => {
      fileFilter = button.dataset.fileFilter;
      $$(".file-filter").forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderFilesGrid();
    });
  });

  function renderFilesGrid() {
    const grid = $("#files-grid");
    grid.innerHTML = "";
    const query = $("#files-search").value.trim().toLowerCase();
    const allFound = [...latestState.found.A, ...latestState.found.B]
      .filter((clueId) => fileFilter === "all" || clueMeta[clueId].ownerRole === fileFilter)
      .filter((clueId) => {
        if (!query) return true;
        const meta = clueRecord(clueId);
        return `${clueId} ${meta.title} ${meta.parentName} ${meta.text}`.toLowerCase().includes(query);
      });
    if (!allFound.length) {
      grid.innerHTML = '<div class="files-empty">No filed evidence matches this view.</div>';
      return;
    }
    allFound.forEach((clueId) => {
      const meta = clueRecord(clueId);
      const tile = document.createElement("button");
      tile.type = "button";
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
    currentDocClueId = clueId;
    const meta = clueRecord(clueId);
    const card = $("#doc-reader-card");
    card.className = "modal-card doc-reader doctype-" + meta.docType;
    $("#doc-type-tag").textContent = docTypeIcon(meta.docType) + " " + meta.docType.toUpperCase();
    $("#doc-title").textContent = meta.title;
    $("#doc-source").textContent = "Found at: " + meta.parentName;
    $("#doc-text").textContent = meta.text;
    $("#doc-share").textContent = "Cite on Radio";
    $("#doc-share").disabled = false;
    $("#doc-modal").classList.add("active");
  }
  $("#doc-share").addEventListener("click", (event) => shareEvidence(currentDocClueId, event.currentTarget));
  $("#doc-modal-close").addEventListener("click", () => {
    $("#doc-modal").classList.remove("active");
    currentDocClueId = null;
  });

  // ---------- Corkboard ----------
  function displayPositionFor(pos, index, board) {
    if (pos && pos.moved) return pos;
    if (board.clientWidth <= 520) {
      return { x: index % 2 === 0 ? 25 : 75, y: 7 + Math.floor(index / 2) * 10.75 };
    }
    return pos || { x: 14 + (index % 4) * 24, y: 14 + Math.floor(index / 4) * 18 };
  }

  function renderCorkboard(state) {
    const board = $("#corkboard");
    $$(".pin-card").forEach((el) => el.remove());
    currentBoardPositions = {};

    const allFoundIds = [...state.found.A, ...state.found.B];
    const emptyState = $("#board-empty");
    const linkButton = $("#btn-link-mode");
    const pinRows = Math.max(1, Math.ceil(allFoundIds.length / 2));
    board.style.setProperty("--mobile-board-height", `${Math.min(920, Math.max(340, 220 + pinRows * 82))}px`);
    board.classList.toggle("is-empty", allFoundIds.length === 0);
    emptyState.hidden = allFoundIds.length >= 2;
    if (allFoundIds.length === 0) {
      emptyState.querySelector("strong").textContent = "No evidence filed yet";
      emptyState.querySelector("span").textContent = "Follow a Next Move. Your first filed clue will appear here.";
    } else if (allFoundIds.length === 1) {
      emptyState.querySelector("strong").textContent = "One file is not a deduction";
      emptyState.querySelector("span").textContent = "Find at least one more piece of evidence before testing a connection.";
    }
    linkButton.disabled = allFoundIds.length < 2;
    if (allFoundIds.length < 2 && linkMode) {
      linkMode = false;
      linkSelectFirst = null;
      linkButton.textContent = "Test Link: Off";
      linkButton.setAttribute("aria-pressed", "false");
      board.classList.remove("link-mode");
    }
    allFoundIds.forEach((clueId, index) => {
      const clue = clueRecord(clueId);
      if (!clue) return;
      const pos = displayPositionFor(state.board.pins[clueId], index, board);
      currentBoardPositions[clueId] = pos;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "pin-card";
      card.dataset.clueId = clueId;
      card.setAttribute("aria-label", `${linkMode ? "Select" : "Open"} evidence ${clueId}: ${clue.title}`);
      card.setAttribute("aria-pressed", linkMode && linkSelectFirst === clueId ? "true" : "false");
      if (linkMode && linkSelectFirst === clueId) card.classList.add("selected");
      card.style.left = pos.x + "%";
      card.style.top = pos.y + "%";
      card.innerHTML = `
        <div class="pin-heading"><span class="pin-id">${clueId}</span><span class="pin-title">${clue.title}</span></div>
        <div class="pin-text">${clue.text}</div>
        <div class="pin-owner">${clue.parentName}</div>
      `;
      wireCardDrag(card, board);
      card.addEventListener("click", (e) => {
        if (card._suppressNextClick) {
          card._suppressNextClick = false;
          return;
        }
        if (!linkMode) {
          openDoc(clueId);
          return;
        }
        e.stopPropagation();
        handleLinkClick(clueId, card);
      });
      board.appendChild(card);
    });

    drawLinks(state);
  }

  function wireCardDrag(card, board) {
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;

    function moveTo(clientX, clientY, rect) {
      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;
      x = Math.max(8, Math.min(92, x));
      y = Math.max(8, Math.min(92, y));
      card.style.left = x + "%";
      card.style.top = y + "%";
      return { x, y };
    }

    function start(e) {
      if (linkMode) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      const cardRect = card.getBoundingClientRect();
      offsetX = e.clientX - (cardRect.left + cardRect.width / 2);
      offsetY = e.clientY - (cardRect.top + cardRect.height / 2);
      card.style.zIndex = ++topZ;
      if (card.setPointerCapture) card.setPointerCapture(e.pointerId);
    }

    function move(e) {
      if (!dragging) return;
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return;
      moved = true;
      const rect = board.getBoundingClientRect();
      const { x, y } = moveTo(e.clientX - offsetX, e.clientY - offsetY, rect);
      redrawLinksFromDom();
      card._lastPos = { x, y };
      e.preventDefault();
    }

    function end(e) {
      if (!dragging) return;
      dragging = false;
      if (card.releasePointerCapture && card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) {
        card.releasePointerCapture(e.pointerId);
      }
      if (moved && card._lastPos) {
        card._suppressNextClick = true;
        socket.emit("board:move", { clueId: card.dataset.clueId, x: card._lastPos.x, y: card._lastPos.y });
      }
    }

    card.addEventListener("pointerdown", start);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }

  $("#btn-link-mode").addEventListener("click", () => {
    linkMode = !linkMode;
    linkSelectFirst = null;
    $("#btn-link-mode").textContent = "Test Link: " + (linkMode ? "On" : "Off");
    $("#btn-link-mode").setAttribute("aria-pressed", linkMode ? "true" : "false");
    $("#corkboard").classList.toggle("link-mode", linkMode);
    $$(".pin-card").forEach((c) => c.classList.remove("selected"));
    updateBoardCardSemantics();
    setLinkStatus(linkMode ? "Choose the first piece of evidence." : "Open a card to review it, or turn on Test Link.");
  });

  function setLinkStatus(message) {
    $("#link-status").textContent = message;
  }

  function updateBoardCardSemantics() {
    $$(".pin-card").forEach((card) => {
      const clue = clueMeta[card.dataset.clueId];
      card.setAttribute("aria-label", `${linkMode ? "Select" : "Open"} evidence ${card.dataset.clueId}: ${clue ? clue.title : "case file"}`);
      card.setAttribute("aria-pressed", linkMode && linkSelectFirst === card.dataset.clueId ? "true" : "false");
    });
  }

  function handleLinkClick(clueId, card) {
    if (!linkSelectFirst) {
      linkSelectFirst = clueId;
      card.classList.add("selected");
      updateBoardCardSemantics();
      setLinkStatus(`First item: ${clueId}. Choose evidence that proves one conclusion with it.`);
      return;
    }
    if (linkSelectFirst === clueId) {
      card.classList.remove("selected");
      linkSelectFirst = null;
      updateBoardCardSemantics();
      setLinkStatus("Selection cleared. Choose the first piece of evidence.");
      return;
    }
    const firstId = linkSelectFirst;
    socket.emit("board:link", { a: linkSelectFirst, b: clueId }, (res) => {
      if (!res || !res.ok) {
        const message = (res && res.error) || "That connection does not hold.";
        showUnlockBanner(`No deduction: ${message}`);
        setLinkStatus(`${firstId} + ${clueId}: no defensible conclusion. Try another pair.`);
      } else if (res.alreadySolved) {
        setLinkStatus(`${firstId} + ${clueId} is already on the board.`);
      } else {
        setLinkStatus(`${firstId} + ${clueId}: deduction accepted.`);
      }
    });
    $$(".pin-card").forEach((c) => c.classList.remove("selected"));
    linkSelectFirst = null;
    updateBoardCardSemantics();
  }

  function drawLinks(state) {
    const svg = $("#link-svg");
    svg.innerHTML = "";
    const board = $("#corkboard");
    const rect = board.getBoundingClientRect();
    state.board.links.forEach(([a, b]) => {
      const pa = currentBoardPositions[a] || state.board.pins[a];
      const pb = currentBoardPositions[b] || state.board.pins[b];
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
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (latestState && lastPhase === "investigation") renderCorkboard(latestState);
    }, 120);
  });

  // ---------- Chat ----------
  function notifyPartnerMessages(state) {
    const messageId = (message) => message.id || `${message.ts}:${message.role}:${message.name}:${message.text}`;
    if (!chatInitialized) {
      chatInitialized = true;
      state.chat.forEach((message) => observedChatMessageIds.add(messageId(message)));
      return;
    }
    const unseen = state.chat.filter((message) => !observedChatMessageIds.has(messageId(message)));
    unseen.forEach((message) => observedChatMessageIds.add(messageId(message)));
    const newPartnerMessages = unseen.filter((message) => message.role !== myRole);
    if (!newPartnerMessages.length || state.phase !== "investigation") return;
    const latest = newPartnerMessages[newPartnerMessages.length - 1];
    const alert = $("#radio-alert");
    const excerpt = latest.text.length > 70 ? latest.text.slice(0, 67).trimEnd() + "…" : latest.text;
    alert.textContent = `RADIO · ${latest.name}: ${excerpt}`;
    alert.hidden = false;
    alert.dataset.unreadCount = String(Number(alert.dataset.unreadCount || 0) + newPartnerMessages.length);
  }

  function renderChat(state) {
    notifyPartnerMessages(state);
    const signature = `${state.code}|${state.chat.map((m) => `${m.ts}:${m.role}:${m.text}`).join("|")}`;
    if (signature === lastChatSignature) return;
    lastChatSignature = signature;
    const log = $("#chat-log");
    log.innerHTML = state.chat
      .map((m) => {
        const time = new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        return `<div class="chat-msg"><span class="chat-time">${time}</span><span class="chat-name">${escapeHtml(m.name)}:</span><span class="chat-text">${escapeHtml(m.text)}</span></div>`;
      })
      .join("");
    log.scrollTop = log.scrollHeight;
  }

  $("#radio-alert").addEventListener("click", () => {
    if (pendingClueId) socket.emit("clue:found", { clueId: pendingClueId, sceneMode: pendingClueMode });
    closeAllModals();
    const alert = $("#radio-alert");
    alert.hidden = true;
    alert.dataset.unreadCount = "0";
    window.requestAnimationFrame(() => {
      $("#chat-input").scrollIntoView({ behavior: "smooth", block: "center" });
      $("#chat-input").focus();
    });
  });

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
  $("#chat-input").addEventListener("focus", () => {
    const alert = $("#radio-alert");
    alert.hidden = true;
    alert.dataset.unreadCount = "0";
  });

  // ---------- Accusation ----------
  $("#btn-goto-accuse").addEventListener("click", () => {
    if (!latestState || !canMakeCall(latestState)) return;
    const ready = !!(latestState.callReady && latestState.callReady[myRole]);
    socket.emit("call:ready", { ready: !ready });
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
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "accuse-option" + (draft.suspect === sid ? " selected" : "");
      opt.setAttribute("aria-pressed", draft.suspect === sid ? "true" : "false");
      opt.textContent = `${person.name} — ${person.role}`;
      opt.addEventListener("click", () => socket.emit("accusation:update", { suspect: sid }));
      suspectsEl.appendChild(opt);
    });

    const locsEl = $("#accuse-locations");
    locsEl.innerHTML = "";
    caseData.accusationLocations.forEach((lid) => {
      const loc = caseData.locations.find((l) => l.id === lid);
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "accuse-option" + (draft.location === lid ? " selected" : "");
      opt.setAttribute("aria-pressed", draft.location === lid ? "true" : "false");
      opt.textContent = loc.name;
      opt.addEventListener("click", () => socket.emit("accusation:update", { location: lid }));
      locsEl.appendChild(opt);
    });

    const motivesEl = $("#accuse-motives");
    motivesEl.innerHTML = "";
    caseData.motives.forEach((m) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "accuse-option" + (draft.motive === m.id ? " selected" : "");
      opt.setAttribute("aria-pressed", draft.motive === m.id ? "true" : "false");
      opt.textContent = m.text;
      opt.addEventListener("click", () => socket.emit("accusation:update", { motive: m.id }));
      motivesEl.appendChild(opt);
    });

    const methodsEl = $("#accuse-methods");
    methodsEl.innerHTML = "";
    caseData.methods.forEach((method) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "accuse-option" + (draft.method === method.id ? " selected" : "");
      opt.setAttribute("aria-pressed", draft.method === method.id ? "true" : "false");
      opt.textContent = method.text;
      opt.addEventListener("click", () => socket.emit("accusation:update", { method: method.id }));
      methodsEl.appendChild(opt);
    });

    const nameA = (state.players.A && state.players.A.name) || "Detective A";
    const nameB = (state.players.B && state.players.B.name) || "Detective B";
    $("#ready-A-label").textContent = nameA + " ready" + (myRole === "A" ? " (you)" : "");
    $("#ready-B-label").textContent = nameB + " ready" + (myRole === "B" ? " (you)" : "");
    $("#ready-A").checked = draft.readyA;
    $("#ready-B").checked = draft.readyB;
    $("#ready-A").disabled = myRole !== "A";
    $("#ready-B").disabled = myRole !== "B";
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
    const reveal = state.endingReveal;
    if (!reveal || !reveal.ending || !reveal.solution || !reveal.solutionEvidence) return;
    const ending = reveal.ending;
    $("#ending-title").textContent = ending.title;
    const endingBody = $("#ending-body");
    endingBody.innerHTML = "";
    ending.text.forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      endingBody.appendChild(paragraph);
    });

    const draft = state.accusationDraft || {};
    const suspect = caseData.people.find((person) => person.id === draft.suspect);
    const location = caseData.locations.find((place) => place.id === draft.location);
    const motive = caseData.motives.find((item) => item.id === draft.motive);
    const method = caseData.methods.find((item) => item.id === draft.method);
    const solutionSuspect = caseData.people.find((person) => person.id === reveal.solution.suspect);
    const solutionLocation = caseData.locations.find((place) => place.id === reveal.solution.location);
    const solutionMotive = caseData.motives.find((item) => item.id === reveal.solution.motive);
    const solutionMethod = caseData.methods.find((item) => item.id === reveal.solution.method);
    const accusation = `${suspect ? suspect.name : "Unknown"} · ${location ? location.name : "Unknown location"} · ${motive ? motive.text : "Unknown motive"} · ${method ? method.text : "Unknown method"}`;
    const solution = `${solutionSuspect.name} · ${solutionLocation.name} · ${solutionMotive.text} · ${solutionMethod.text}`;

    const summary = $("#ending-accusation-summary");
    summary.innerHTML = "";
    const submitted = document.createElement("p");
    submitted.textContent = `Your call: ${accusation}`;
    summary.appendChild(submitted);
    const verdict = document.createElement("p");
    verdict.className = state.result === "correct" ? "recap-correct" : "recap-correction";
    verdict.textContent = state.result === "correct" ? "All four parts matched the evidence." : `The complete answer: ${solution}`;
    summary.appendChild(verdict);

    const grid = $("#ending-evidence-grid");
    grid.innerHTML = "";
    reveal.solutionEvidence.forEach((item) => {
      const card = document.createElement("article");
      card.className = "ending-evidence-card";
      const title = document.createElement("h3");
      title.textContent = item.title;
      const explanation = document.createElement("p");
      explanation.textContent = item.text;
      const clues = document.createElement("div");
      clues.className = "ending-evidence-clues";
      clues.textContent = item.clueIds.map((id) => `${id}: ${caseData.clueText[id].title}`).join(" · ");
      card.append(title, explanation, clues);
      grid.appendChild(card);
    });

    renderTeamReadiness("#restart-ready-status", state, "restartReady");
    const myReady = !!(state.restartReady && state.restartReady[myRole]);
    const partnerReady = !!(state.restartReady && state.restartReady[myRole === "A" ? "B" : "A"]);
    const restart = $("#btn-restart");
    restart.setAttribute("aria-pressed", myReady ? "true" : "false");
    restart.textContent = myReady ? (partnerReady ? "Reopening Together…" : "Ready — Waiting for Partner") : (partnerReady ? "Join Partner — Play Again" : "I'm Ready to Play Again");
  }

  $("#btn-restart").addEventListener("click", () => {
    if (!latestState || latestState.phase !== "ending") return;
    const ready = !!(latestState.restartReady && latestState.restartReady[myRole]);
    socket.emit("restart:ready", { ready: !ready });
  });
})();
