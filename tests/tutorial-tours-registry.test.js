#!/usr/bin/env node

/**
 * Contextual sub-tours — registry invariants, badge derivation, and the
 * host's step-payload builder.
 *
 * Run from ui-team with:
 *   node --test tests/tutorial-tours-registry.test.js
 *
 * Covers plan §8 tests 48 and 49, plus a static guard on the four-site tour-id
 * allow-list (§4 S2 / M2), which otherwise fails as a silently rejected write
 * with no client-side symptom.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const TOURS_PATH = join(REPO_ROOT, "src/drumee/modules/desk/tutorial/tours.js");
const HOST_PATH = join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js");
const LIB_PATH = join(REPO_ROOT, "src/drumee/libs/tutorial-tours.js");

// The registry reads LOCALE for the badge format; nothing else is global.
global.LOCALE = { TUTORIAL_STEP: "STEP {0}/{1}" };

// `"{0}".format(...)` is a prototype extension the app installs at bootstrap
// (skeleton/sidebar.js uses it for the plan badge). Provide the same contract.
if (!String.prototype.format) {
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : args[i]));
  };
}

const Tours = require(TOURS_PATH);
const { TOURS, tour, flaggedIds, stepBadge, isLastScreen, BADGE_BY_SCREENS, BADGE_BY_STEPS } = Tours;

/** Minimal stand-in for a step widget: only mget is read. */
const widget = (attrs) => ({ mget: (k) => attrs[k] });

// ── registry invariants ──────────────────────────────────────────────────────

test("badge mode matches step count for every flagged tour", () => {
  // Single-step tours count screens (migrate 1/3 -> 3/3); a multi-step tour
  // must count steps, because screen numbering inside one step would claim to
  // be counting the whole tour. folder_task is the only multi-step flagged one.
  for (const id of flaggedIds()) {
    const t = TOURS[id];
    if (t.steps.length === 1) {
      assert.equal(t.badge, BADGE_BY_SCREENS, `${id} is single-step, should count screens`);
    } else {
      assert.equal(t.badge, BADGE_BY_STEPS, `${id} is multi-step, must count steps`);
    }
  }
  assert.equal(TOURS.folder_task.steps.length, 2);
  assert.equal(TOURS.folder_task.badge, BADGE_BY_STEPS);
});

test("full keeps the original six steps, in order, and is never suppressed", () => {
  assert.equal(TOURS.full.flag, null);
  assert.equal(TOURS.full.badge, BADGE_BY_STEPS);
  assert.deepEqual(
    TOURS.full.steps.map((s) => s.kind),
    [
      "tutorial_workspace",
      "tutorial_folder",
      "tutorial_meeting",
      "tutorial_task",
      "tutorial_share",
      "tutorial_migrate",
    ],
  );
});

test("meeting has no flag and no contextual trigger, so full is its only route", () => {
  assert.equal(TOURS.meeting.flag, null);
  assert.ok(TOURS.full.steps.some((s) => s.kind === "tutorial_meeting"));
});

test("an unknown tour id falls back to full rather than rendering nothing", () => {
  assert.equal(tour("nope").id, "full");
  assert.equal(tour(undefined).id, "full");
  assert.equal(tour("migrate").id, "migrate");
});

test("a tour's flag matches its id, since both are posted as one wire value", () => {
  for (const id of flaggedIds()) assert.equal(TOURS[id].flag, id);
});

// ── test 48 / 49 — badge derivation ──────────────────────────────────────────

test("48 a single-step tour numbers SCREENS, never 1/1", () => {
  for (const id of flaggedIds()) {
    const t = TOURS[id];
    const n = t.steps[0].screens;
    const ui = widget({ badge_mode: BADGE_BY_SCREENS, screen_count: n });
    const seen = [];
    for (let i = 0; i < n; i++) seen.push(stepBadge(ui, i));
    assert.deepEqual(
      seen,
      Array.from({ length: n }, (_, i) => `STEP ${i + 1}/${n}`),
      `${id} badges`,
    );
    assert.ok(!seen.includes("STEP 1/1") || n === 1, `${id} must not read 1/1`);
  }
});

test("48 migrate and folder read 1/3 -> 3/3 standing alone", () => {
  const ui = widget({ badge_mode: BADGE_BY_SCREENS, screen_count: 3 });
  assert.deepEqual(
    [0, 1, 2].map((i) => stepBadge(ui, i)),
    ["STEP 1/3", "STEP 2/3", "STEP 3/3"],
  );
});

test("49 inside full, every screen of a step carries that STEP's number", () => {
  // tutorial_folder is step 2 of 6 and runs three screens; all three read 2/6,
  // which is what the six-step tour has always shown.
  const ui = widget({ badge_mode: BADGE_BY_STEPS, badge_text: "STEP 2/6", screen_count: 3 });
  assert.deepEqual(
    [0, 1, 2].map((i) => stepBadge(ui, i)),
    ["STEP 2/6", "STEP 2/6", "STEP 2/6"],
  );
});

test("49 full's step numbering is 1/6 .. 6/6 with meeting at 3/6", () => {
  const n = TOURS.full.steps.length;
  const labels = TOURS.full.steps.map((s, i) => LOCALE.TUTORIAL_STEP.format(i + 1, n));
  assert.deepEqual(labels, [
    "STEP 1/6",
    "STEP 2/6",
    "STEP 3/6",
    "STEP 4/6",
    "STEP 5/6",
    "STEP 6/6",
  ]);
  assert.equal(TOURS.full.steps[2].kind, "tutorial_meeting");
});

// ── Done wording ─────────────────────────────────────────────────────────────

test("Done shows only on the last screen of the LAST step", () => {
  const last = widget({ is_last: true });
  assert.equal(isLastScreen(last, 0, 3), false);
  assert.equal(isLastScreen(last, 1, 3), false);
  assert.equal(isLastScreen(last, 2, 3), true);

  // Same widget, same screens, as a middle step of the full tour: Next
  // throughout, because there is a step after it.
  const middle = widget({ is_last: false });
  assert.equal(isLastScreen(middle, 2, 3), false);
});

// ── host: step payloads ──────────────────────────────────────────────────────

/** Lift _buildWidgets out of the host so it can run without ui-core. */
function buildWidgetsFn() {
  const src = readFileSync(HOST_PATH, "utf8");
  const start = src.indexOf("  _buildWidgets(t) {");
  assert.notEqual(start, -1, "_buildWidgets not found in production source");
  const end = src.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, "_buildWidgets has no closing brace");
  const body = src.slice(start + "  _buildWidgets(t) {".length, end);
  return new Function("BACKDROPS", "BADGE_BY_SCREENS", `return function (t) {${body}};`);
}

const BACKDROP_STUB = {
  workspaceFaded: () => ({ backdrop: "faded" }),
  workspaceGrid: () => ({ backdrop: "grid" }),
};

function build(tourDef) {
  const fn = buildWidgetsFn()(BACKDROP_STUB, BADGE_BY_SCREENS);
  return fn.call({ warn: () => {} }, tourDef);
}

test("a step with a backdrop feeds [backdrop, widget], interactive LAST", () => {
  const out = build(TOURS.folder_task);
  assert.equal(out.length, 2);
  assert.ok(Array.isArray(out[0]));
  assert.deepEqual(out[0][0], { backdrop: "faded" });
  // _widgetAt merges enter_at_last onto the LAST entry, so the interactive
  // widget must stay there.
  assert.equal(out[0][out[0].length - 1].kind, "tutorial_folder");
});

test("a step with no backdrop feeds the bare widget", () => {
  const out = build(TOURS.workspace);
  assert.equal(Array.isArray(out[0]), false);
  assert.equal(out[0].kind, "tutorial_workspace");
});

test("migrate's backdrop is the un-faded grid — its own subject matter", () => {
  const out = build(TOURS.migrate);
  assert.deepEqual(out[0][0], { backdrop: "grid" });
});

test("is_first / is_last / screen_count are stamped per step", () => {
  const out = build(TOURS.full).map((e) => (Array.isArray(e) ? e[e.length - 1] : e));
  assert.equal(out.length, 6);
  assert.equal(out[0].is_first, true);
  assert.equal(out[0].is_last, false);
  assert.equal(out[5].is_first, false);
  assert.equal(out[5].is_last, true);
  assert.deepEqual(out.map((w) => w.screen_count), [3, 3, 1, 5, 3, 3]);
  assert.deepEqual(out.map((w) => w.badge_mode), Array(6).fill("steps"));
  assert.deepEqual(out.map((w) => w.badge_text), [
    "STEP 1/6", "STEP 2/6", "STEP 3/6", "STEP 4/6", "STEP 5/6", "STEP 6/6",
  ]);
});

test("a single-step tour is stamped first AND last, and badges by screens", () => {
  const w = build(TOURS.migrate)[0].slice(-1)[0];
  assert.equal(w.is_first, true);
  assert.equal(w.is_last, true);
  assert.equal(w.badge_mode, BADGE_BY_SCREENS);
  assert.equal(w.screen_count, 3);
  assert.equal(w.service, "next-step");
});

test("a multi-step tour asking for 'screens' is refused, not silently mis-numbered", () => {
  const warnings = [];
  const fn = buildWidgetsFn()(BACKDROP_STUB, BADGE_BY_SCREENS);
  const bad = {
    id: "bogus",
    badge: BADGE_BY_SCREENS,
    steps: [{ kind: "a", screens: 2 }, { kind: "b", screens: 3 }],
  };
  const out = fn.call({ warn: (m) => warnings.push(m) }, bad);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /cannot use the "screens" badge mode/);
  // Falls back to step numbering rather than labelling screen 4 of step 2 "4/5".
  assert.deepEqual(out.map((w) => w.badge_mode), ["steps", "steps"]);
  assert.deepEqual(out.map((w) => w.badge_text), ["STEP 1/2", "STEP 2/2"]);
});

// ── the four-site allow-list (§4 S2 / M2) ────────────────────────────────────

test("the lib's TOUR_IDS matches the registry's flagged tours", () => {
  const src = readFileSync(LIB_PATH, "utf8");
  const m = src.match(/const TOUR_IDS = \[([^\]]*)\]/);
  assert.ok(m, "TOUR_IDS not found in libs/tutorial-tours.js");
  const ids = [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
  assert.deepEqual(ids.slice().sort(), flaggedIds().slice().sort());
});

test("the two server-team sites match too, when that repo is checked out", (t) => {
  // Sibling checkout; CI for ui-team alone will not have it. Skipping is
  // honest — the guard is for a developer changing one site of four.
  const SERVER = join(REPO_ROOT, "..", "server-team");
  const svc = join(SERVER, "service/private/drumate.js");
  const acl = join(SERVER, "acl/drumate.json");
  if (!existsSync(svc) || !existsSync(acl)) {
    t.skip("server-team not checked out beside ui-team");
    return;
  }
  const src = readFileSync(svc, "utf8");
  const m = src.match(/const __TUTORIAL_TOURS = \[([^\]]*)\]/);
  assert.ok(m, "__TUTORIAL_TOURS not found in service/private/drumate.js");
  const ids = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  assert.deepEqual(ids.slice().sort(), flaggedIds().slice().sort());

  const doc = JSON.parse(readFileSync(acl, "utf8")).services.tutorial_seen.doc;
  for (const id of flaggedIds()) {
    assert.ok(doc.includes(id), `acl doc string does not mention "${id}"`);
  }
});

// ── the shell must not decide step one (regression) ──────────────────────────

test("the shell's step slot is EMPTY — it must not hardcode a step", () => {
  // It used to plant `tutorial_workspace` here. That was correct while there
  // was one tour that always began with the workspace step, and became a bug
  // the moment the registry decided which tour runs: every contextual tour
  // opened on the workspace step regardless of what was asked for, because the
  // registry chose steps 2..n while the skeleton silently chose step 1.
  const shell = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skeleton/index.js"), "utf8",
  );
  // Bound the slice to the content Box itself — reading to EOF would catch the
  // spotlight entry below it, which legitimately names a kind.
  const at = shell.indexOf("sys_pn: _a.content");
  assert.notEqual(at, -1, "the content slot moved");
  const slot = shell.slice(at, shell.indexOf("})", at));
  assert.ok(
    !/kind:\s*['"`]tutorial_/.test(slot),
    "the step slot must not name a step widget — the registry decides",
  );
  assert.ok(!/kids/.test(slot), "slot must have no kids");
});

test("the host feeds step one from the registry on mount", () => {
  const host = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js"), "utf8",
  );
  const dom = host.slice(host.indexOf("  onDomRefresh() {"));
  const body = dom.slice(0, dom.indexOf("\n  }\n"));
  assert.match(body, /ensurePart\(_a\.content\)[\s\S]*?_widgetAt\(0\)/);
  // And it must come after the shell exists, or there is no part to feed.
  assert.ok(body.indexOf("require('./skeleton')") < body.indexOf("_widgetAt(0)"));
});

test("every tour's step one is its OWN first step, not the workspace step", () => {
  const first = {};
  for (const id of Object.keys(TOURS)) first[id] = TOURS[id].steps[0].kind;
  assert.deepEqual(first, {
    workspace: "tutorial_workspace",
    folder_task: "tutorial_folder",
    share: "tutorial_share",
    migrate: "tutorial_migrate",
    meeting: "tutorial_meeting",
    full: "tutorial_workspace",
  });
});
