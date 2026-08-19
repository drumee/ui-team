#!/usr/bin/env node

/**
 * Contextual sub-tours — Phase 2, the cross-tree triggers.
 *
 * Two kinds of assertion here:
 *
 *  - BEHAVIOURAL, against the real libs/tutorial-tours module with globals
 *    stubbed: the shared share-flag in both orders, single-flight across trees,
 *    and channel delivery from a builtins/* caller.
 *  - STRUCTURAL, read from the production sources, for the orderings that are
 *    invisible at runtime when wrong (same rationale as the Phase 1 wiring
 *    suite).
 *
 * Run from ui-team with:
 *   node --test tests/tutorial-tours-share.test.js
 */

const test = require("node:test");
const { after } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const read = (p) => stripComments(readFileSync(join(REPO_ROOT, p), "utf8"));

const FOLDER = read("src/drumee/builtins/window/folder/index.js");
const INTERACT = read("src/drumee/builtins/media/interact.js");
const TOOLKIT = read("src/drumee/builtins/window/skeleton/toolkit/index.js");

const Tours = require(join(REPO_ROOT, "src/drumee/libs/tutorial-tours.js"));
const {
  TOURS,
  stepBadge,
  isLastScreen,
  BADGE_BY_FLOW,
} = require(join(REPO_ROOT, "src/drumee/modules/desk/tutorial/tours.js"));

// ── stubs ────────────────────────────────────────────────────────────────────

let posts = [];
let broadcasts = [];
let store = {};

function stubGlobals({ settings = {}, enabled = 1 } = {}) {
  posts = [];
  broadcasts = [];
  store = {};
  global.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  global.Platform = { get: (k) => (k === "contextual_tours" ? enabled : undefined) };
  global.Visitor = { id: "u_test", isMobile: () => false, settings: () => settings };
  global.RADIO_BROADCAST = {
    trigger: (channel, payload) => broadcasts.push({ channel, payload }),
  };
  global.SERVICE = { drumate: { tutorial_seen: "drumate.tutorial_seen" } };
  const host = {
    postService: (svc, payload) => {
      posts.push({ svc, payload });
      return Promise.resolve({ tutorials_seen: {} });
    },
  };
  global.window = { Wm: host };
  return host;
}

function fresh(opts) {
  const host = stubGlobals(opts);
  Tours.__resetModuleState();
  return host;
}

after(() => Tours.__resetModuleState());

/**
 * What a trigger site does: fire, then (if it mounted) the host marks it seen.
 * Split exactly as production splits it — fire() never records.
 */
function triggerAndMount(tourId, host) {
  const fired = Tours.fire(tourId, host);
  if (fired) {
    Tours.armed();
    Tours.markSeen(tourId, host);
  }
  return fired;
}

const LOCALE_FMT = "STEP {0}/{1}";
if (!String.prototype.format) {
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : args[i]));
  };
}
global.LOCALE = { TUTORIAL_STEP: LOCALE_FMT };

const widget = (attrs) => ({ mget: (k) => attrs[k] });

// ── the shared share flag, both orders ───────────────────────────────────────

test("share: Manage access first, then the kebab — one tour, one record", () => {
  const host = fresh();
  assert.equal(triggerAndMount("share", host), true, "icon fires");
  Tours.release("share"); // the tour is dismissed

  assert.equal(Tours.fire("share", host), false, "kebab must not fire again");
  assert.equal(broadcasts.length, 1);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].payload.tour_id, "share");
});

test("share: kebab first, then Manage access — identical outcome", () => {
  const host = fresh();
  assert.equal(triggerAndMount("share", host), true, "kebab fires");
  Tours.release("share");

  assert.equal(Tours.fire("share", host), false, "icon must not fire again");
  assert.equal(broadcasts.length, 1);
  assert.equal(posts.length, 1);
});

test("share and folder_task are independent flags", () => {
  const host = fresh();
  triggerAndMount("share", host);
  Tours.release("share");
  assert.equal(Tours.fire("folder_task", host), true, "a different tour");
  assert.deepEqual(broadcasts.map((b) => b.payload.tour), ["share", "folder_task"]);
  Tours.release("folder_task");
});

test("a share recorded on a previous device suppresses both entries", () => {
  const host = fresh({ settings: { tutorials_seen: { share: 1787000000 } } });
  assert.equal(Tours.fire("share", host), false);
  assert.equal(broadcasts.length, 0);
  assert.equal(posts.length, 0);
});

// ── single-flight across trees ───────────────────────────────────────────────

test("a share click during a running folder tour mounts nothing AND records nothing", () => {
  const host = fresh();
  // A desk tile mounted the folder tour; it is on screen.
  assert.equal(triggerAndMount("folder_task", host), true);
  assert.equal(Tours.inFlight(), "folder_task");

  // The user reaches a share control while it is up.
  assert.equal(Tours.fire("share", host), false, "single-flight holds");
  assert.equal(broadcasts.length, 1, "only the folder tour was broadcast");

  // The half that is easy to miss: `share` must NOT be marked seen, or the
  // user loses it permanently to a tour they were not shown.
  assert.equal(Tours.isSeen("share", host), false);
  assert.deepEqual(posts.map((p) => p.payload.tour_id), ["folder_task"]);

  // Once the folder tour is dismissed, the next share click works.
  Tours.release("folder_task");
  assert.equal(Tours.fire("share", host), true);
  Tours.release("share");
});

// ── cross-tree channel delivery ──────────────────────────────────────────────

test("a fire raised from builtins reaches the desk's channel listener", () => {
  const host = fresh();
  // Stand in for desk_module: the only listener, bound in its initialize.
  const seen = [];
  global.RADIO_BROADCAST = {
    _subs: {},
    on(ch, fn) { (this._subs[ch] = this._subs[ch] || []).push(fn); },
    trigger(ch, payload) { (this._subs[ch] || []).forEach((f) => f(payload)); },
  };
  global.RADIO_BROADCAST.on(Tours.CHANNEL, (args) => seen.push(args));

  Tours.fire("share", host); // as raised from builtins/window/folder
  assert.deepEqual(seen, [{ tour: "share" }]);
  Tours.release("share");
});

// ── badges (§8 48) ───────────────────────────────────────────────────────────

test("folder_task badges as one flow: 1/9 through 9/9", () => {
  const t = TOURS.folder_task;
  assert.deepEqual(t.steps.map((s) => s.screens), [3, 5, 1]);
  const folder = widget({ badge_mode: "flow", screen_offset: 0, tour_screens: 9 });
  assert.deepEqual([0, 1, 2].map((i) => stepBadge(folder, i)),
    ["STEP 1/9", "STEP 2/9", "STEP 3/9"]);
  // The tracker continues the count rather than restarting it.
  const task = widget({ badge_mode: "flow", screen_offset: 3, tour_screens: 9 });
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => stepBadge(task, i)),
    ["STEP 4/9", "STEP 5/9", "STEP 6/9", "STEP 7/9", "STEP 8/9"]);
  // The scheduler closes it. Figma 5:75093 badges this exact screen "STEP 9/9",
  // so this assertion is what ties the registry to the design.
  const sched = widget({ badge_mode: "flow", screen_offset: 8, tour_screens: 9 });
  assert.deepEqual([0].map((i) => stepBadge(sched, i)), ["STEP 9/9"]);
});

test("share badges 1/3 .. 3/3 standing alone, never 1/1", () => {
  const ui = widget({ badge_mode: BADGE_BY_FLOW, screen_offset: 0, tour_screens: 3 });
  assert.deepEqual(
    [0, 1, 2].map((i) => stepBadge(ui, i)),
    ["STEP 1/3", "STEP 2/3", "STEP 3/3"],
  );
});

test("inside full, the tracker's five views all read 4/6 and share's three read 5/6", () => {
  const task = widget({ badge_mode: "steps", badge_text: "STEP 4/6" });
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => stepBadge(task, i)), Array(5).fill("STEP 4/6"));
  const share = widget({ badge_mode: "steps", badge_text: "STEP 5/6" });
  assert.deepEqual([0, 1, 2].map((i) => stepBadge(share, i)), Array(3).fill("STEP 5/6"));
});

test("Done lands on the last view of the tracker and the last screen of share", () => {
  const last = widget({ is_last: true });
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => isLastScreen(last, i, 5)), [false, false, false, false, true]);
  assert.deepEqual([0, 1, 2].map((i) => isLastScreen(last, i, 3)), [false, false, true]);
  // As middle steps of the full tour, neither ends anything.
  const middle = widget({ is_last: false });
  assert.equal(isLastScreen(middle, 4, 5), false);
  assert.equal(isLastScreen(middle, 2, 3), false);
});

// ── structural: ordering and placement ───────────────────────────────────────

/** The body of one `case "x":` up to its `return`/next case. */
function caseSlice(src, label, quote = '"') {
  const start = src.indexOf(`case ${quote}${label}${quote}:`);
  assert.notEqual(start, -1, `case ${label} not found`);
  const next = src.indexOf("\n      case ", start + 1);
  return src.slice(start, next === -1 ? src.length : next);
}

test("share A fires BEFORE openManageAccess, which toggles", () => {
  const block = caseSlice(FOLDER, "folder-manage-access");
  const fire = block.indexOf('fire("share"');
  const open = block.indexOf("this.openManageAccess()");
  assert.notEqual(fire, -1);
  assert.notEqual(open, -1);
  assert.ok(fire < open, "reading isShowSettings after the toggle inverts it");
});

test("share A only fires on the OPENING click", () => {
  const block = caseSlice(FOLDER, "folder-manage-access");
  assert.match(block, /if \(!this\.isShowSettings\) \{[\s\S]*?fire\("share"/);
});

test("share A sits in the handler, clear of the duplicated visibility gate", () => {
  // X1: the four-condition gate is copy-pasted into the topbar skeleton and the
  // overflow menu. Both raise the same service with uiHandler: [ui], so the
  // handler covers both and neither copy needs touching.
  assert.match(TOOLKIT, /service: "folder-manage-access"/);
  assert.match(TOOLKIT, /uiHandler: \[ui\]/);
  const topbar = read("src/drumee/builtins/window/folder/skeleton/topbar.js");
  assert.match(topbar, /service: "folder-manage-access"/);
  // The trigger must live in neither skeleton.
  assert.ok(!/tutorial-tours/.test(TOOLKIT));
  assert.ok(!/tutorial-tours/.test(topbar));
});

/**
 * Run the `folder-manage-access` case body against a fake window.
 *
 * Behavioural rather than structural, because the open/close asymmetry is the
 * single most consequential line in this phase: read the flag on the wrong side
 * of openManageAccess and the CLOSING click becomes the trigger, so the tour
 * fires when the user dismisses the panel and never when they open it.
 */
function runManageAccess({ isShowSettings }) {
  const body = caseSlice(FOLDER, "folder-manage-access")
    .replace(/^case "folder-manage-access":/, "");
  const calls = { fire: [], open: 0, say: [] };
  const ctx = {
    isShowSettings,
    canUpload: () => true,
    openManageAccess() { calls.open++; },
  };
  const fakeRequire = () => ({ fire: (id) => calls.fire.push(id) });
  // `LOCALE` is deliberately NOT a parameter here: this file also sets
  // global.LOCALE for the badge tests, and shadowing it would let the extracted
  // code close over a no-op while the assertions read the stub — the exact
  // collision harness-hygiene.test.js exists to catch. It resolves to the
  // global, and only inside the canUpload()-false branch this never takes.
  // eslint-disable-next-line no-new-func
  const fn = new Function("require", `return function () {${body}};`);
  fn(fakeRequire).call(ctx);
  return calls;
}

test("share A fires on the opening click and NOT on the closing one", () => {
  const opening = runManageAccess({ isShowSettings: false });
  assert.deepEqual(opening.fire, ["share"]);
  assert.equal(opening.open, 1, "the drawer still opens");

  const closing = runManageAccess({ isShowSettings: true });
  assert.deepEqual(closing.fire, [], "dismissing a drawer is not reaching Manage access");
  assert.equal(closing.open, 1, "and the toggle still runs, so the drawer closes");
});

test("share B fires once, outside every branch of the latch", () => {
  // The case races wrapper-resolved / wrapper-rejected / 600ms-timeout and ends
  // in either an embedded drawer or a floating window. Proving the tour is
  // raised for all three outcomes = it is raised exactly once, and not inside
  // any of them.
  const block = caseSlice(INTERACT, "secure-share", "'");
  const fires = block.match(/fire\("share"/g) || [];
  assert.equal(fires.length, 1, "exactly one fire in the case");

  // No branch of the race may contain it.
  const branches = [
    /host\.ensurePart\('wrapper-dialog'\)\.then\(([\s\S]*?)\)\);/,
    /\.catch\(\(\) => once\(launchFloating\)\)/,
    /setTimeout\(\(\) => once\(launchFloating\), 600\)/,
    /if \(!host \|\| !host\.ensurePart\) return launchFloating\(\);/,
  ];
  for (const re of branches) {
    const m = block.match(re);
    assert.ok(m, `latch branch not found: ${re}`);
    assert.ok(!/fire\("share"/.test(m[0]), `fire must not live inside ${re}`);
  }
});

test("share B fires at the top of the case, before the latch race starts", () => {
  const block = caseSlice(INTERACT, "secure-share", "'");
  const fire = block.indexOf('fire("share"');
  assert.notEqual(fire, -1);
  for (const marker of ["Wm.getWindowPreset(this)", "launchFloating", "once(", "600"]) {
    const at = block.indexOf(marker);
    assert.notEqual(at, -1, `${marker} not found — the latch may have changed shape`);
    assert.ok(fire < at, `the tour must be raised before ${marker}`);
  }
});

test("tab-task raises NO tour — the tracker belongs to folder_task", () => {
  // It had its own trigger for one revision. Merged back on request: the
  // tracker is step two of the tour the desk raises when a folder is opened,
  // and the Tasks tab is not where a first-time user looks for it.
  const block = caseSlice(FOLDER, "tab-task");
  assert.ok(!/fire\(/.test(block), "the Tasks tab must not fire a tour");
  assert.match(block, /return this\.showFolderTab\(_a\.task\)/, "the tab still opens");
  assert.ok(!/fire\("task"/.test(FOLDER), "no `task` tour id survives anywhere");
});

test("the folder window warms only the tour it can still trigger", () => {
  assert.match(FOLDER, /Kind\.waitFor\("tutorial_share"\)/);
  assert.ok(!/Kind\.waitFor\("tutorial_task"\)/.test(FOLDER),
    "the tracker moved back to folder_task, which the desk warms");
});

test("no builtins site marks a tour seen", () => {
  for (const [name, src] of [["folder", FOLDER], ["interact", INTERACT]]) {
    assert.ok(!/markSeen\(/.test(src), `${name} must only fire, never record`);
  }
});
