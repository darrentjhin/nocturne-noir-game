const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public", "case-two.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "case-two.css"), "utf8");
const app = fs.readFileSync(path.join(root, "public", "case-two.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server", "index.js"), "utf8");

function missingCssVariables(source) {
  const definitions = new Set([...source.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((match) => match[1]));
  const references = new Set([...source.matchAll(/var\(--([a-z0-9-]+)/gi)].map((match) => match[1]));
  return [...references].filter((name) => !definitions.has(name));
}

test("File 02 has a distinct private-operation interface", () => {
  assert.match(html, /id="dispatch-facts"/);
  assert.match(html, /id="checkpoint-track"/);
  assert.match(html, /id="alert-pips"/);
  assert.match(html, /id="stage-choices"/);
  assert.match(html, /id="record-grid"/);
  assert.doesNotMatch(html, /id="corkboard"/);
  assert.doesNotMatch(html, /id="interview-modal"/);
});

test("every File 02 shared transition is represented in the client", () => {
  assert.match(app, /case2:difficulty:vote/);
  assert.match(app, /case2:briefing:ready/);
  assert.match(app, /case2:stage:lock/);
  assert.match(app, /case2:stage:acknowledge/);
  assert.match(app, /case2:final:lock/);
  assert.match(app, /case2:restart:ready/);
  assert.match(server, /bothPlayersReady\(room, "stageAcknowledged"\)/);
});

test("File 02 supports separate-device invitations, reconnect, radio, and tutorial copies", () => {
  assert.match(app, /expectedCaseId: CASE_ID/);
  assert.match(app, /sessionStorage\.setItem\(SESSION_KEY/);
  assert.match(app, /socket\.on\("disconnect"/);
  assert.match(app, /case2:chat/);
  assert.match(html, /id="tutorial-modal"/);
  assert.match(html, /id="notebook-modal"/);
  assert.match(app, /socket\.emit\("notes:get"/);
  assert.match(app, /socket\.emit\("notes:update"/);
  assert.match(app, /socket\.emit\("notes:append"/);
  assert.match(app, /radio-note-save/);
  assert.match(app, /appendNotebookLine/);
  assert.match(html, /PRIVATE · DO NOT ASSUME PARTNER CAN SEE/);
  assert.match(html, /id="feedback-form"/);
  assert.match(app, /fetch\("\/api\/feedback"/);
  assert.match(html, /id="final-role-brief"/);
});

test("File 02 stays usable on narrow screens and respects hidden state", () => {
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none !important;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /id="operation-guide-action"/);
  assert.match(app, /function renderOperationGuide/);
  assert.match(css, /body\.modal-open\s*\{\s*overflow:\s*hidden;/);
});

test("both case themes resolve every CSS custom property", () => {
  const caseOneCss = fs.readFileSync(path.join(root, "public", "style.css"), "utf8");
  assert.deepEqual(missingCssVariables(caseOneCss), []);
  assert.deepEqual(missingCssVariables(css), []);
});

test("File 01 links to the continuation", () => {
  const caseOne = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  const caseOneCss = fs.readFileSync(path.join(root, "public", "style.css"), "utf8");
  assert.match(caseOne, /href="\/case-two\.html"/);
  assert.match(caseOne, /The Black-Sun Ledger/);
  assert.match(caseOneCss, /\.case-file\.active\s*\{[^}]*border-color:\s*var\(--gold\)/s);
});
