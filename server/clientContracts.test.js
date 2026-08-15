const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(projectRoot, "public", "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(projectRoot, "public", "index.html"), "utf8");
const cssSource = fs.readFileSync(path.join(projectRoot, "public", "style.css"), "utf8");
const serverSource = fs.readFileSync(path.join(projectRoot, "server", "index.js"), "utf8");

test("the clue dialog stacks above the scene dialog", () => {
  assert.match(cssSource, /\.modal-overlay\s*\{[\s\S]*?z-index:\s*100;/);
  assert.match(cssSource, /#clue-modal,\s*#doc-modal\s*\{\s*z-index:\s*120;\s*\}/);
});

test("the client gates accusations using the case threshold", () => {
  assert.match(appSource, /foundTotal\s*>=\s*caseData\.accusationUnlockThreshold/);
  assert.match(appSource, /deductionsSolved\s*>=\s*caseData\.requiredDeductions/);
  assert.match(appSource, /confrontationsSolved\s*>=\s*caseData\.requiredConfrontations/);
  assert.match(appSource, /threadsSolved\s*>=\s*caseData\.requiredThreads/);
  assert.match(appSource, /operationsSolved\s*>=\s*caseData\.requiredOperations/);
  assert.match(appSource, /callButton\.dataset\.locked\s*=\s*callUnlocked/);
  assert.match(htmlSource, /id="call-lock-modal"/);
});

test("interrogation UI supports portraits, transcripts, locked lines, and records", () => {
  assert.match(htmlSource, /id="interview-portrait"/);
  assert.match(htmlSource, /id="interview-transcript"/);
  assert.match(htmlSource, /id="interview-questions"/);
  assert.match(htmlSource, /id="interview-approaches"/);
  assert.match(htmlSource, /id="interview-composure"/);
  assert.match(htmlSource, /id="interview-evidence-select"/);
  assert.match(appSource, /socket\.emit\("interview:ask"/);
  assert.match(appSource, /evidenceId/);
  assert.match(appSource, /sourceRequirementsMet/);
  assert.match(cssSource, /assets\/interrogation-portraits\.png/);
});

test("investigation strategy includes shared case threads and selectable field focus", () => {
  assert.match(htmlSource, /id="threads-workspace"/);
  assert.match(htmlSource, /id="scene-focus-options"/);
  assert.match(appSource, /socket\.emit\("thread:update"/);
  assert.match(appSource, /socket\.emit\("thread:submit"/);
  assert.match(appSource, /sceneMode:/);
});

test("difficulty, Cross-Wire, hunches, and the series debrief remain part of the case", () => {
  assert.match(htmlSource, /id="difficulty-options"/);
  assert.match(appSource, /socket\.emit\("difficulty:vote"/);
  assert.match(htmlSource, /id="operation-workspace"/);
  assert.match(appSource, /socket\.emit\("operation:submit"/);
  assert.match(htmlSource, /id="hunch-panel"/);
  assert.match(appSource, /socket\.emit\("hunch:lock"/);
  assert.match(htmlSource, /id="ending-debrief"/);
  assert.match(htmlSource, /id="series-hook"/);
  assert.match(cssSource, /\.evidence-workspace\[hidden\]\s*\{\s*display:\s*none;/);
});

test("the final theory asks who, where, why, and how", () => {
  assert.match(htmlSource, /id="accuse-methods"/);
  assert.match(appSource, /accusation:update", \{ method: method\.id \}/);
  assert.match(appSource, /All four parts matched the evidence/);
  assert.match(htmlSource, /id="accusation-connection"/);
  assert.match(appSource, /partnerConnected/);
  assert.match(serverSource, /partner must be connected before you can ready the final call/);
  assert.match(serverSource, /room\.phase === "accusation"[\s\S]*?readyA/);
});

test("invite, reconnect, tutorial, and ending recap paths remain present", () => {
  assert.match(appSource, /url\.searchParams\.set\("case", code\)/);
  assert.match(appSource, /socket\.on\("disconnect"/);
  assert.match(appSource, /You only get half the case/);
  assert.match(appSource, /reveal\.solutionEvidence\.slice\(0, 4\)\.forEach/);
  assert.match(htmlSource, /id="ending-evidence-grid"/);
  assert.match(htmlSource, /id="ending-reconstruction"/);
  assert.match(htmlSource, /id="ending-contributions"/);
  assert.match(htmlSource, /id="ending-debrief"/);
  assert.match(appSource, /sessionStorage\.setItem\(SESSION_KEY/);
  assert.match(appSource, /freshInviteTab/);
  assert.match(appSource, /TUTORIAL_SEEN_KEY.*myCode.*myRole/s);
  assert.match(htmlSource, /HOW TO PLAY · YOUR OWN COPY|id="tutorial-role-label"/);
  assert.match(htmlSource, /Skip for me/);
  assert.match(htmlSource, /id="notebook-modal"/);
  assert.match(appSource, /socket\.emit\("notes:get"/);
  assert.match(appSource, /socket\.emit\("notes:update"/);
  assert.match(appSource, /socket\.emit\("notes:append"/);
  assert.match(appSource, /radio-note-save/);
  assert.match(appSource, /appendNotebookLine/);
});

test("the cover introduces both detective roles with original portrait art", () => {
  assert.match(htmlSource, /class="detective-preview"/);
  assert.match(htmlSource, /The Street/);
  assert.match(htmlSource, /The Desk/);
  assert.match(cssSource, /assets\/detective-roles\.png/);
  assert.ok(fs.existsSync(path.join(projectRoot, "public", "assets", "detective-roles.png")));
});

test("interactive cards expose button semantics", () => {
  assert.match(appSource, /document\.createElement\(locked \? "div" : "button"\)/);
  assert.match(appSource, /const tile = document\.createElement\("button"\)/);
  assert.match(appSource, /const opt = document\.createElement\("button"\)/);
  assert.match(htmlSource, /role="dialog" aria-modal="true"/);
});

test("board dragging uses card-scoped pointer events without leaked window listeners", () => {
  assert.match(appSource, /card\.addEventListener\("pointerdown", start\)/);
  assert.doesNotMatch(appSource, /window\.addEventListener\("mousemove"/);
  assert.doesNotMatch(appSource, /window\.addEventListener\("touchmove"/);
});

test("fieldwork, case-file sharing, and board guidance remain available", () => {
  assert.match(cssSource, /assets\/location-atlas\.png/);
  assert.match(htmlSource, /id="scene-image"/);
  assert.match(htmlSource, /id="objective-list"/);
  assert.match(htmlSource, /id="files-search"/);
  assert.match(htmlSource, /id="link-status"[^>]*aria-live="polite"/);
  assert.match(appSource, /function shareEvidence/);
  assert.match(appSource, /class="pin-id">\$\{clueId\}/);
});

test("the Radio Line composer remains compact and prominent in the investigation", () => {
  assert.match(htmlSource, /class="chat-panel" aria-label="Radio Line communication"/);
  assert.match(htmlSource, /Live with partner/);
  assert.match(cssSource, /\.chat-form \.btn \{[^}]*width:\s*auto;[^}]*margin:\s*0;/s);
  assert.match(cssSource, /\.chat-log \{[^}]*max-height:\s*260px;/s);
  assert.match(htmlSource, /class="radio-quick-actions"/);
  assert.match(appSource, /radio-evidence-link/);
});

test("progressive guidance and lead states stay available without revealing answers", () => {
  assert.match(htmlSource, /id="adaptive-hint"/);
  assert.match(appSource, /function renderAdaptiveHint/);
  assert.match(appSource, /lead-state-badge/);
  assert.match(appSource, /function renderCallLock/);
  assert.match(cssSource, /\.lead-state-badge/);
});

test("interview and ending answers arrive through earned room state", () => {
  assert.match(appSource, /state\.interviewResults/);
  assert.match(appSource, /state\.endingReveal/);
  assert.doesNotMatch(appSource, /caseData\.solution\./);
  assert.doesNotMatch(appSource, /caseData\.endings\[/);
});

test("the delivery server sets basic browser security boundaries", () => {
  assert.match(serverSource, /app\.disable\("x-powered-by"\)/);
  assert.match(serverSource, /Content-Security-Policy/);
  assert.match(serverSource, /X-Content-Type-Options/);
  assert.match(serverSource, /Cache-Control", "no-store"/);
});

test("shared transitions and radio notifications are explicit in the client", () => {
  assert.match(htmlSource, /id="briefing-ready-status"/);
  assert.match(htmlSource, /id="restart-ready-status"/);
  assert.match(htmlSource, /id="radio-alert"/);
  assert.match(htmlSource, /id="board-empty"/);
  assert.match(appSource, /socket\.emit\("briefing:ready"/);
  assert.match(appSource, /socket\.emit\("call:ready"/);
  assert.match(appSource, /socket\.emit\("restart:ready"/);
  assert.match(appSource, /function notifyPartnerMessages/);
  assert.doesNotMatch(appSource, /socket\.emit\("room:restart"/);
});
