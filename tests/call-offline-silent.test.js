// Calling someone who is offline shows the panel and stays SILENT
// (builtins/window/connect/index.js — stateMachine, case 'offline').
//
// Dialling a contact who is not connected drops the call window straight into
// the 'offline' state: it swaps the controls for a single Cancel, flags
// data-call-state="offline" and writes "<name> is not currently online.".
// It used to ALSO start `musics/dialtones/offline-seagull.mp3` on `loop = 1`,
// so the caller got a seagull squawking over the notice until they closed the
// window. The panel is the whole message; the clip is gone.
//
// The state machine lives in a window class that needs the entire runtime
// (Skeletons, a jitsi room, the window manager) to instantiate, so this pulls
// the 'offline' case out of the SOURCE FILE and runs it against stubs — it
// tests the shipped text, not a copy of it. The negative control re-inserts the
// old playSound line into the extracted text and proves the harness fails on it,
// so a revert cannot slip through green.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

// The real String.prototype.format the app ships — LOCALE.X_IS_NOT_ONLINE
// carries a {0} placeholder and the panel text depends on it.
require("@drumee/ui-core/letc/addons/string");

const SRC = resolve(__dirname, "../src/drumee/builtins/window/connect/index.js");
const src = readFileSync(SRC, "utf8");

// ── extract `case 'offline':` … `break;` ──────────────────────────────────
const OFFLINE_CASE = "      case 'offline':";
const start = src.indexOf(OFFLINE_CASE);
assert.ok(start > 0, "the 'offline' case is gone from " + SRC);
const end = src.indexOf("        break;", start);
assert.ok(end > start, "the 'offline' case has no break in " + SRC);
const OFFLINE = src.slice(start, end + "        break;".length);

const PRE_FIX = OFFLINE.replace(
  "        break;",
  "        Visitor.playSound(_K.dialtones.offline, 1);\n        break;",
);

const LOCALE = { X_IS_NOT_ONLINE: "{0} is not currently online." };
const _a = { none: "none", cancel: "cancel" };
const _K = { dialtones: { offline: "musics/dialtones/offline-seagull.mp3" } };

/**
 * Run the extracted 'offline' branch against a stubbed call window.
 * @param {string} body  the case text to execute (shipped, or the pre-fix one)
 * @returns {Object} what the branch did: sounds played/muted, panel state
 */
function runOffline(body, display = "Lexis") {
  const sounds = { played: [], muted: 0 };
  const Visitor = {
    playSound: (url, loop) => sounds.played.push({ url, loop }),
    muteSound: () => sounds.muted++,
  };
  const win = {
    el: { dataset: {} },
    beforeLeavingState: "cancel",
    defaultState: (s) => (win._defaultState = s),
    stateMessage: (m) => win._messages.push(m),
    mget: (k) => (k === "display" ? display : null),
    _messages: [],
    _defaultState: null,
  };
  const run = new Function(
    "Visitor",
    "LOCALE",
    "_a",
    "_K",
    `return function () { switch ('offline') {\n${body}\n} };`,
  )(Visitor, LOCALE, _a, _K);
  run.call(win);
  return { sounds, win };
}

test("no sound plays on the offline panel", () => {
  const { sounds } = runOffline(OFFLINE);
  assert.deepStrictEqual(sounds.played, [], "the offline screen must be silent");
});

test("the seagull clip is what the pre-fix code played (negative control)", () => {
  const { sounds } = runOffline(PRE_FIX);
  assert.strictEqual(sounds.played.length, 1);
  assert.match(sounds.played[0].url, /offline-seagull\.mp3$/);
  // loop = 1 — it squawked until the window closed, which is what Lexis heard.
  assert.strictEqual(sounds.played[0].loop, 1);
});

test("dropping the clip does not silence anything else instead", () => {
  const { sounds } = runOffline(OFFLINE);
  assert.strictEqual(
    sounds.muted,
    0,
    "the fix removes a sound; it must not start muting the shared audio element",
  );
});

test("the panel still says who is not online", () => {
  const { win } = runOffline(OFFLINE, "Somanos");
  assert.deepStrictEqual(win._messages, ["Somanos is not currently online."]);
});

test("the panel still flags data-call-state and the Cancel-only controls", () => {
  const { win } = runOffline(OFFLINE);
  assert.strictEqual(win.el.dataset.callState, "offline");
  assert.strictEqual(win._defaultState, _a.cancel);
  assert.strictEqual(
    win.beforeLeavingState,
    _a.none,
    "closing the offline panel must not fire a cancel signal",
  );
});

test("the offline panel survives a window with no element yet", () => {
  const sounds = { played: [], muted: 0 };
  const Visitor = {
    playSound: (url, loop) => sounds.played.push({ url, loop }),
    muteSound: () => sounds.muted++,
  };
  const win = {
    el: null,
    defaultState: () => { },
    stateMessage: () => { },
    mget: () => "Nobody",
  };
  const run = new Function(
    "Visitor",
    "LOCALE",
    "_a",
    "_K",
    `return function () { switch ('offline') {\n${OFFLINE}\n} };`,
  )(Visitor, LOCALE, _a, _K);
  assert.doesNotThrow(() => run.call(win));
});

// ── the rest of the call sounds are untouched ─────────────────────────────

test("the seagull clip is played nowhere in the app any more", () => {
  assert.strictEqual(
    (src.match(/_K\.dialtones\.offline/g) || []).length,
    0,
    "nothing may play the offline dial tone",
  );
});

test("a live dial still gets its ring-back tone", () => {
  const plays = src.match(/Visitor\.playSound\(([^)]*)\)/g) || [];
  assert.deepStrictEqual(
    plays,
    ["Visitor.playSound(_K.dialtones.rinback, 10)"],
    "the only sound this window plays is the ring-back on a dial that connects",
  );
});

test("an offline callee never reaches the ring-back line", () => {
  // The guard that sends the caller to 'offline' sits BEFORE playSound in
  // `case 'dial'`, so no looping ring-back can outlive the fix and keep
  // playing over the silent panel.
  const dial = src.indexOf("      case 'dial':");
  const guard = src.indexOf("this.stateMachine('offline');", dial);
  const ringback = src.indexOf("Visitor.playSound(_K.dialtones.rinback", dial);
  assert.ok(dial > 0 && guard > dial, "the offline guard left `case 'dial'`");
  assert.ok(
    guard < ringback,
    "the offline guard must stay ahead of the ring-back tone",
  );
});
