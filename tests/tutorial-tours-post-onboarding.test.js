#!/usr/bin/env node

/**
 * Contextual sub-tours — Phase 3, the post-onboarding path.
 *
 * This phase touches the one route every new signup takes, so the overlay
 * branch and its launcher are exercised for real: both are lifted out of the
 * production source and run against a fake desk with mocked timers, rather than
 * asserted structurally.
 *
 * The defect under test: fire() can legitimately no-op (seen, mobile,
 * single-flight, kill switch), and the branch arms a 20s net on the assumption
 * that a tutorial WILL mount. Left alone, every mobile signup would wait 20s
 * for the reward flow, LAUNCH30 and the invited-workspace prompt instead of 2s.
 *
 * Run from ui-team with:
 *   node --test tests/tutorial-tours-post-onboarding.test.js
 */

const test = require("node:test");
const { after } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const DESK_RAW = readFileSync(join(REPO_ROOT, "src/drumee/modules/desk/index.js"), "utf8");
const DESK = stripComments(DESK_RAW);

const Tours = require(join(REPO_ROOT, "src/drumee/libs/tutorial-tours.js"));
const { TOURS, stepBadge, isLastScreen, BADGE_BY_FLOW } =
  require(join(REPO_ROOT, "src/drumee/modules/desk/tutorial/tours.js"));

if (!String.prototype.format) {
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : args[i]));
  };
}
global.LOCALE = { TUTORIAL_STEP: "STEP {0}/{1}" };

after(() => Tours.__resetModuleState());

// ── lifting the two units out of the desk ────────────────────────────────────

/** Body of a `name(args) { ... }` method, matched on its two-space indent. */
function methodBody(src, signature) {
  const start = src.indexOf(`  ${signature} {`);
  assert.notEqual(start, -1, `${signature} not found`);
  const from = start + `  ${signature} {`.length;
  let depth = 1;
  for (let i = from; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(from, i);
    }
  }
  throw new Error(`unterminated ${signature}`);
}

/** The `case "overlay":` arm, up to the next case at the same indent. */
function overlayCase(src) {
  const start = src.indexOf('      case "overlay":');
  assert.notEqual(start, -1, "case overlay not found");
  const end = src.indexOf("\n      case ", start + 1);
  assert.notEqual(end, -1);
  return src.slice(start + '      case "overlay":'.length, end);
}

const LAUNCH_BODY = methodBody(DESK, "_launchHomeTutorial(explicit, forced)");
const OVERLAY_BODY = overlayCase(DESK);

/**
 * A fake desk.
 *
 * `Visitor` is installed as a GLOBAL rather than passed as a parameter, because
 * realFire() below also sets global.Visitor — and a name that is both a harness
 * parameter and a global is exactly what harness-hygiene.test.js forbids: the
 * extracted code would close over the parameter while the assertions read the
 * global. Setting the global is also the more faithful arrangement, since the
 * production code reads it as an injected global.
 */
function makeDesk({ hash = {}, toursEnabled = true, fireResult = true } = {}) {
  const log = [];
  const desk = {
    _postOnboardingTutorial: false,
    _homeSettledFallback: null,
    warn: () => {},
    _forcedTourId: () => (typeof hash.tutorial === "string" && TOURS[hash.tutorial] ? hash.tutorial : "full"),
    _forcedTourOpt: () => ({ preview: 1 }),
    _showTutorial: (t, o) => log.push(`show:${t || "full"}${o && o.preview ? ":preview" : ""}`),
    _afterHomeSettled: () => log.push("settled"),
  };
  global.Visitor = { parseModuleArgs: () => hash };
  const fakeRequire = () => ({
    enabled: () => toursEnabled,
    fire: (id) => {
      log.push(`fire:${id}`);
      if (fireResult) log.push("show:workspace"); // the channel listener, synchronously
      return fireResult;
    },
    reset: () => log.push("reset"),
    markSeen: (id) => log.push(`markSeen:${id}`),
  });

  // eslint-disable-next-line no-new-func
  desk._launchHomeTutorial = new Function(
    "require", `return function (explicit, forced) {${LAUNCH_BODY}};`,
  )(fakeRequire).bind(desk);

  // eslint-disable-next-line no-new-func
  const runOverlay = new Function(
    "require", `return function () {${OVERLAY_BODY}};`,
  )(fakeRequire).bind(desk);

  return { desk, log, runOverlay };
}

// ── the launcher's contract ──────────────────────────────────────────────────

test("explicit ?tutorial=<id> launches unconditionally, past every gate", () => {
  const { desk, log } = makeDesk({ hash: { tutorial: "migrate" }, toursEnabled: false });
  assert.equal(desk._launchHomeTutorial(true, "migrate"), true);
  // Explicit runs are previews: they must not record the tour as seen, or one
  // look at ?tutorial=migrate kills the real + New trigger for the account.
  assert.deepEqual(log, ["show:migrate:preview"]);
});

test("kill switch off launches the six-step tour, never fire()", () => {
  const { desk, log } = makeDesk({ toursEnabled: false });
  assert.equal(desk._launchHomeTutorial(false, "full"), true);
  assert.deepEqual(log, ["show:full"], "no fire(), so nothing is gated or written");
});

test("switch on: the post-signup run is gated like any other trigger", () => {
  const ok = makeDesk({ fireResult: true });
  assert.equal(ok.desk._launchHomeTutorial(false, "full"), true);
  assert.deepEqual(ok.log, ["fire:workspace", "show:workspace"]);

  const gated = makeDesk({ fireResult: false });
  assert.equal(gated.desk._launchHomeTutorial(false, "full"), false);
  assert.deepEqual(gated.log, ["fire:workspace"], "gated: nothing mounted");
});

// ── the branch: one case per reason fire() can no-op ──────────────────────────

/** Run the overlay arm and advance the clock. */
function runAt(t, opts, ms) {
  const made = makeDesk(opts);
  made.desk._postOnboardingTutorial = true;
  made.runOverlay();
  t.mock.timers.tick(ms);
  return made;
}

/**
 * Drive the REAL fire() so each no-op reason is genuinely produced, not stubbed
 * into returning false. Returns what fire() decided.
 */
function realFire({ settings = {}, mobile = false, inFlight = null }) {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  global.Platform = { get: () => 1 };
  global.Visitor = { id: "u", isMobile: () => mobile, settings: () => settings };
  global.RADIO_BROADCAST = { trigger: () => {} };
  global.SERVICE = { drumate: { tutorial_seen: "drumate.tutorial_seen" } };
  global.window = { Wm: { postService: () => Promise.resolve({}) } };
  Tours.__resetModuleState();
  if (inFlight) Tours.fire(inFlight, global.window.Wm);
  const out = Tours.fire("workspace", global.window.Wm);
  Tours.__resetModuleState();
  return out;
}

// One case per reason, each producing the no-op for real rather than asserting
// against a stub that was told to return false.
const GATES = [
  ["already seen", { settings: { tutorials_seen: { workspace: 1787000000 } } }],
  ["a legacy tutorial_done user", { settings: { tutorial_done: true } }],
  ["mobile", { mobile: true }],
  ["another tour already in flight", { inFlight: "folder_task" }],
];

for (const [reason, opts] of GATES) {
  test(`fire() really does decline for "${reason}"`, () => {
    assert.equal(realFire(opts), false);
  });

  test(`a post-signup tour gated by "${reason}" settles home at 2s, not 20s`, (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const { log } = runAt(t, { fireResult: false }, 2000);
    assert.deepEqual(log, ["fire:workspace", "settled"], reason);
  });
}

// The kill switch is deliberately NOT in that list: it is the one "no tour
// fires" reason that does not reach fire() at all. _launchHomeTutorial answers
// it earlier by running the six-step tour, so the branch behaves exactly as it
// did before this feature — see the dedicated case further down.
test("the kill switch never reaches fire(); it is answered before the gate", () => {
  const { desk, log } = makeDesk({ toursEnabled: false });
  desk._launchHomeTutorial(false, "full");
  assert.ok(!log.some((l) => l.startsWith("fire:")));
});

test("a gated tour does NOT leave the 20s net armed", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { desk, log } = runAt(t, { fireResult: false }, 2000);
  assert.equal(desk._homeSettledFallback, null, "net must be disarmed");
  t.mock.timers.tick(30000);
  assert.deepEqual(
    log.filter((l) => l === "settled"),
    ["settled"],
    "home must settle exactly once",
  );
});

test("a launched tour keeps the 20s net armed and does not settle early", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { desk, log } = runAt(t, { fireResult: true }, 2000);
  assert.deepEqual(log, ["fire:workspace", "show:workspace"]);
  assert.notEqual(desk._homeSettledFallback, null, "net stays armed for a launched tour");
  assert.ok(!log.includes("settled"), "the chain waits for the tutorial");
});

test("the net still fires when a launched tour never reports in", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { log } = runAt(t, { fireResult: true }, 2000);
  t.mock.timers.tick(20000); // desk-tutorial never became ready
  assert.deepEqual(log, ["fire:workspace", "show:workspace", "settled"]);
});

test("kill switch off: the branch runs the six-step tour and arms the net", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { desk, log } = runAt(t, { toursEnabled: false, fireResult: false }, 2000);
  assert.deepEqual(log, ["show:full"], "no fire(), so nothing is written either");
  assert.notEqual(desk._homeSettledFallback, null);
});

test("no tutorial owed at all: the else-branch settles at 2s, unchanged", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const made = makeDesk();
  made.desk._postOnboardingTutorial = false; // and no ?tutorial=
  made.runOverlay();
  t.mock.timers.tick(2000);
  assert.deepEqual(made.log, ["settled"]);
});

test("?tutorial=reset clears state, mounts nothing, and settles at 2s", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const made = makeDesk({ hash: { tutorial: "reset" } });
  made.runOverlay();
  t.mock.timers.tick(2000);
  assert.deepEqual(made.log, ["reset", "settled"]);
});

// ── the onboarding-skip path ─────────────────────────────────────────────────

test("closing the wizard marks workspace seen and mounts nothing", () => {
  const start = DESK.indexOf('case "onboarding-completed":');
  assert.notEqual(start, -1);
  const block = DESK.slice(start, DESK.indexOf("\n      case ", start + 1));
  assert.match(block, /markSeen\("workspace", this\)/);
  assert.ok(!/_showTutorial|\.fire\(/.test(block), "nothing may mount on this path");
  assert.match(block, /return this\.loadDefault\(\)/);
  // Order: the record is written before the desk is re-fed, so a loadDefault
  // that re-enters onPartReady("overlay") already sees the tour as seen.
  assert.ok(block.indexOf("markSeen") < block.indexOf("return this.loadDefault()"));
});

test("markSeen on that path is the real one, and is kill-switch gated", () => {
  // The gate lives in the lib, so the call site needs no branch of its own.
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const posts = [];
  const host = { postService: (s, p) => { posts.push(p); return Promise.resolve({}); } };
  global.Visitor = { id: "u", isMobile: () => false, settings: () => ({}) };
  global.SERVICE = { drumate: { tutorial_seen: "drumate.tutorial_seen" } };
  global.RADIO_BROADCAST = { trigger: () => {} };
  global.window = { Wm: host };

  global.Platform = { get: () => 0 }; // off
  Tours.__resetModuleState();
  Tours.markSeen("workspace", host);
  assert.equal(posts.length, 0, "nothing to suppress while the feature is off");

  global.Platform = { get: () => 1 }; // on
  Tours.__resetModuleState();
  Tours.markSeen("workspace", host);
  assert.deepEqual(posts.map((p) => p.tour_id), ["workspace"]);
});

// ── C5 for workspace ─────────────────────────────────────────────────────────

const widget = (attrs) => ({ mget: (k) => attrs[k] });

test("workspace badges 1/3 .. 3/3 as its own tour, never 1/1", () => {
  assert.equal(TOURS.workspace.steps[0].screens, 3);
  assert.equal(TOURS.workspace.badge, BADGE_BY_FLOW);
  const ui = widget({ badge_mode: BADGE_BY_FLOW, screen_count: 3 });
  assert.deepEqual(
    [0, 1, 2].map((i) => stepBadge(ui, i)),
    ["STEP 1/3", "STEP 2/3", "STEP 3/3"],
  );
});

test("workspace reads 1/6 on all three sub-badges inside full", () => {
  const ui = widget({ badge_mode: "steps", badge_text: "STEP 1/6" });
  assert.deepEqual([0, 1, 2].map((i) => stepBadge(ui, i)), Array(3).fill("STEP 1/6"));
});

test("workspace ends its own tour but not the full one", () => {
  assert.equal(isLastScreen(widget({ is_last: true }), 2, 3), true);
  assert.equal(isLastScreen(widget({ is_last: false }), 2, 3), false);
});

test("NO step file carries a hardcoded badge — every one is derived", () => {
  // Inverted in phase 5a, when meeting — the last holdout — was derived. It was
  // written in phase 3 as a positive assertion naming the remaining step, so
  // that this phase could not finish C5 without noticing. Kept permanently in
  // this form: a new step widget that hardcodes "STEP n/m" fails here rather
  // than quietly disagreeing with its tour's registry entry.
  const dir = join(REPO_ROOT, "src/drumee/modules/desk/tutorial");
  const hardcoded = [];
  for (const step of ["workspace", "folder", "meeting", "task", "share", "migrate"]) {
    const src = readFileSync(join(dir, step, "index.js"), "utf8");
    if (/badge_text:\s*['"`]STEP/.test(src)) hardcoded.push(step);
  }
  assert.deepEqual(hardcoded, []);
});

test("the retired settings step is gone, by string and not just by import", () => {
  const roots = ["src/drumee", "tests"];
  const hits = [];
  const walk = (dir) => {
    for (const e of require("node:fs").readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(js|scss|json)$/.test(e.name)) continue;
      // Skip this file: it carries the search term in its own regex, and a
      // sweep that matches itself can never go green.
      if (full === __filename) continue;
      const src = readFileSync(full, "utf8");
      if (/tutorial_settings|tutorial-settings/.test(src)) hits.push(full);
    }
  };
  for (const r of roots) walk(join(REPO_ROOT, r));
  assert.deepEqual(hits, [], "a stale reference would only fail at runtime");
  assert.equal(
    require("node:fs").existsSync(
      join(REPO_ROOT, "src/drumee/modules/desk/tutorial/settings"),
    ),
    false,
  );
});

test("Escape does nothing when no tour is mounted", () => {
  // The binding is registered in onDomRefresh and unregistered in
  // onBeforeDestroy, so its lifetime is exactly the tour's. A capture-phase
  // global Escape outranks the app's other handlers, so it must not outlive the
  // thing it belongs to.
  const host = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js"), "utf8",
  );
  const dom = host.slice(host.indexOf("  onDomRefresh() {"));
  assert.match(dom.slice(0, dom.indexOf("\n  }\n")), /this\._bindEscape\(\)/);

  const destroyAt = host.indexOf("  onBeforeDestroy() {");
  assert.notEqual(destroyAt, -1, "no teardown hook");
  const destroy = host.slice(destroyAt, host.indexOf("\n  }\n", destroyAt));
  assert.match(destroy, /unregister\(this\._escapeHotkey\)/);
  assert.match(destroy, /this\._escapeHotkey = null/);

  // Registered nowhere else — not at module load, not from the desk.
  assert.equal((host.match(/hotkeys\.register\(/g) || []).length, 1);
  const desk = readFileSync(join(REPO_ROOT, "src/drumee/modules/desk/index.js"), "utf8");
  assert.ok(!/tutorial-escape/.test(desk), "the desk must not own the tour's Escape");
});

test("the full tour's step numbering is unchanged by any of this", () => {
  const n = TOURS.full.steps.length;
  assert.equal(n, 6);
  assert.deepEqual(
    TOURS.full.steps.map((s, i) => LOCALE.TUTORIAL_STEP.format(i + 1, n)),
    ["STEP 1/6", "STEP 2/6", "STEP 3/6", "STEP 4/6", "STEP 5/6", "STEP 6/6"],
  );
  assert.equal(TOURS.full.steps[0].kind, "tutorial_workspace");
  assert.equal(TOURS.full.steps[2].kind, "tutorial_meeting");
});
