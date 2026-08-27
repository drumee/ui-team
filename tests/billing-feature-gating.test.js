// Tier gating for task-tracker views (libs/billing).
//
// The case this file exists for is #2 below: `task_views` does not exist in any
// deployed plan row until the schemas patch lands, so an absent entitlement MUST
// read as "no restriction". Fail it closed instead and the day this ships every
// user on every tier — Business included — silently loses Calendar, Gantt and
// Project Health. Every other case here is cheap; that one is the release.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

// libs/billing reads its inputs off globals at CALL time (never at module load),
// so one require up front is enough and the stubs can move between cases.
let platform = {};
let quota = {};
let service = {};

global.Platform = { get: (k) => platform[k] };
global.Visitor = { quota: () => quota, domainCan: () => false };
global.SERVICE = new Proxy({}, { get: (_t, k) => service[k] });
global._K = { permission: { owner: 1 } };
global.LOCALE = new Proxy({}, { get: (_t, k) => String(k) });

const billing = require("../src/drumee/libs/billing");
const { taskViewsAllowed, isTaskViewAllowed, featureGatingActive } = billing;

const ALL_VIEWS = ["board", "list", "calendar", "gantt", "summary"];
const GATED = ["calendar", "gantt", "summary"];
const FREE_VIEWS = ["board", "list"];

/** A cloud deployment with a live payment backend — gating is in force here. */
function sellingDeployment() {
  service = { payment: { checkout: "payment.checkout" } };
  platform = { arch: "cloud" };
  quota = { plan: "free", domain_id: 1 };
}

function allowedFor(views) {
  return views.filter((v) => isTaskViewAllowed(v));
}

test("pod install (no payment backend) never gates a feature", () => {
  service = {};
  platform = { arch: "pod" };
  quota = { plan: "free", task_views: "board,list" };

  assert.equal(featureGatingActive(), false);
  assert.equal(taskViewsAllowed(), null);
  // Even with the entitlement explicitly present and restrictive: an install
  // with no checkout offers no way to lift the gate, so it must not gate.
  assert.deepEqual(allowedFor(ALL_VIEWS), ALL_VIEWS);
});

test("operator switched billing off — no gating", () => {
  sellingDeployment();
  platform = { arch: "cloud", billing_upgrade: 0 };
  quota = { plan: "free", task_views: "board,list" };

  assert.equal(featureGatingActive(), false);
  assert.deepEqual(allowedFor(ALL_VIEWS), ALL_VIEWS);
});

test("entitlement not deployed yet — every view stays open", () => {
  // THE rollout-safety case. Ship the client, nothing changes; the gate turns
  // on from the database afterwards.
  sellingDeployment();
  assert.ok(!("task_views" in quota));

  assert.equal(featureGatingActive(), true);
  assert.equal(taskViewsAllowed(), null, "unknown must mean unrestricted");
  assert.deepEqual(allowedFor(ALL_VIEWS), ALL_VIEWS);
});

test("quota not loaded yet (bootstrap) — every view stays open", () => {
  sellingDeployment();
  quota = null;
  assert.deepEqual(allowedFor(ALL_VIEWS), ALL_VIEWS);

  // Visitor itself may not be there yet either.
  const saved = global.Visitor;
  global.Visitor = undefined;
  try {
    assert.deepEqual(allowedFor(ALL_VIEWS), ALL_VIEWS);
  } finally {
    global.Visitor = saved;
  }
});

test("free plan — board and list only", () => {
  sellingDeployment();
  quota.task_views = "board,list";

  assert.deepEqual(taskViewsAllowed(), FREE_VIEWS);
  assert.deepEqual(allowedFor(ALL_VIEWS), FREE_VIEWS);
  for (const v of GATED) {
    assert.equal(isTaskViewAllowed(v), false, `${v} must be gated`);
  }
});

test("team plan — the wildcard opens everything", () => {
  sellingDeployment();
  for (const wildcard of ["*", "all", "ALL"]) {
    quota.task_views = wildcard;
    assert.equal(taskViewsAllowed(), null, wildcard);
    assert.deepEqual(allowedFor(ALL_VIEWS), ALL_VIEWS, wildcard);
  }
});

test("whitespace and casing in the entitlement are tolerated", () => {
  // yp.plan.quota is hand-edited in SQL patches; a stray space must not
  // silently lock a view the plan pays for.
  sellingDeployment();
  quota.task_views = " Board ,  LIST ";
  assert.deepEqual(taskViewsAllowed(), FREE_VIEWS);
  assert.deepEqual(allowedFor(ALL_VIEWS), FREE_VIEWS);
  assert.equal(isTaskViewAllowed(" GANTT "), false);
});

test("present but unparseable entitlement fails OPEN, not shut", () => {
  sellingDeployment();
  for (const junk of ["", "   ", ",,,", " , , "]) {
    quota.task_views = junk;
    assert.equal(taskViewsAllowed(), null, JSON.stringify(junk));
    assert.deepEqual(allowedFor(ALL_VIEWS), ALL_VIEWS, JSON.stringify(junk));
  }
});

test("an unknown view name is refused by a restrictive entitlement", () => {
  // A view added later must not be free-for-all on plans that never listed it.
  sellingDeployment();
  quota.task_views = "board,list";
  assert.equal(isTaskViewAllowed("timeline"), false);
  assert.equal(isTaskViewAllowed(""), false);
  assert.equal(isTaskViewAllowed(undefined), false);
});

// ── The three gate points ─────────────────────────────────────────────────
// Structural, in the style of the other panel tests: the logic above is only
// worth anything if the panel actually consults it everywhere it must.

const PANEL = readFileSync(
  join(__dirname, "../src/drumee/builtins/window/tasks/index.js"),
  "utf8",
);
const SKELETON = readFileSync(
  join(__dirname, "../src/drumee/builtins/window/tasks/skeleton/index.js"),
  "utf8",
);

test("gate 1: set-view refuses a gated view before assigning _view", () => {
  const m = /case "set-view": \{([\s\S]*?)\n      \}/.exec(PANEL);
  assert.ok(m, "set-view case not found");
  const body = m[1];
  const guard = body.indexOf("isTaskViewAllowed");
  const assign = body.indexOf("this._view = v");
  assert.notEqual(guard, -1, "set-view must consult isTaskViewAllowed");
  assert.notEqual(assign, -1, "set-view must still assign _view");
  assert.ok(guard < assign, "the gate must come BEFORE _view is assigned");
  assert.match(body, /_showTaskViewUpsell/, "a refused click must upsell");
});

test("gate 2: locked tabs stay rendered and stay clickable", () => {
  const m = /const viewTabs = ([\s\S]*?)\n  \}\);/.exec(SKELETON);
  assert.ok(m, "viewTabs not found");
  const tabs = m[1];
  assert.match(tabs, /isTaskViewAllowed/, "tabs must know what is locked");
  assert.match(tabs, /"data-locked"/, "locked tabs need a styling hook");
  // The click is the upsell — a tab that stops emitting set-view when locked
  // would make the plan limit invisible and unsellable.
  assert.match(tabs, /service: "set-view"/);
  assert.doesNotMatch(
    tabs,
    /service: locked \?|locked \? null : Skeletons\.Box\.X/,
    "a locked tab must not drop its service or disappear",
  );
});

test("gate 3: getView falls back to board for a gated view", () => {
  const m = /\n  getView\(\) \{([\s\S]*?)\n  \}/.exec(PANEL);
  assert.ok(m, "getView not found");
  const body = m[1];
  assert.match(body, /isTaskViewAllowed/, "getView must re-check the gate");
  assert.match(body, /return "board"/, "the fallback is board");
});

test("no direct _view reads bypass the guarded accessor", () => {
  // `_view` may only be touched where it is set. Every READ goes through
  // getView(), or gate 3 is decorative.
  const reads = PANEL.split("\n")
    .map((line, i) => [i + 1, line])
    .filter(([, l]) => l.includes("this._view"))
    .filter(([, l]) => !/this\._view = /.test(l))
    .filter(([, l]) => !/v !== this\._view/.test(l))
    .filter(([, l]) => !/const v = this\._view \|\| "board"/.test(l));
  assert.deepEqual(
    reads.map(([n, l]) => `${n}: ${l.trim()}`),
    [],
    "these read _view directly and skip the tier gate",
  );
});
