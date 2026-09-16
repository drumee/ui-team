// The organisation screen showed a workspace list from page load.
//
// Duy, 2026-09-16: a workspace was missing from the org management tab.
// libs/org-overview keeps ONE module-level promise for the whole page session
// and hands it to every reader. Its only invalidator was org-tab._refresh,
// which runs on the "org:refresh" broadcast, raised only from inside
// desk_org_view — so a workspace created or deleted while that screen was shut
// never reached the cache. desk_org_view is destroy-on-close, so the next open
// re-rendered from the boot-time answer.
//
// TWO ENDS, BOTH REAL. The lib is required and exercised as shipped; the desk's
// chokepoint is lifted out of index.js and run against a fake `this`, the same
// technique tests/call-tile-drag.test.js uses. The perf guard is a first-class
// case here, not an afterthought: the obvious one-line fix (org-tab._refresh)
// would have put an organization.overview round trip — three result sets, a
// whole-domain scan — on every workspace mutation.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const LIB = resolve(__dirname, "../src/drumee/libs/org-overview.js");
const DESK = resolve(__dirname, "../src/drumee/modules/desk/index.js");
const src = readFileSync(DESK, "utf8");

// ── the cache itself ────────────────────────────────────────────────────────

// A fresh copy of the module per case: `__pending` is module state, so a cached
// require would leak one case's answer into the next.
function freshLib({ domain = 29 } = {}) {
  const saved = { Visitor: global.Visitor, SERVICE: global.SERVICE };
  global.Visitor = { id: "me", get: (k) => (k === "domain_id" ? domain : null) };
  global.SERVICE = { organization: { overview: "organization.overview" } };
  delete require.cache[LIB];
  const lib = require(LIB);
  return { lib, restore: () => Object.assign(global, saved) };
}

// Counts round trips. Resolves whatever the caller queued.
function fetcher(answers) {
  const view = {
    calls: 0,
    fetchService() {
      view.calls += 1;
      return Promise.resolve(answers[Math.min(view.calls - 1, answers.length - 1)]);
    },
  };
  return view;
}

test("the cache still works — two readers, one round trip", async () => {
  // The property the fix must NOT break. The chip and the org view ask the same
  // question and share one answer; that is why this module exists.
  const { lib, restore } = freshLib();
  try {
    const view = fetcher([{ workspaces: [{ hub_id: "a" }] }]);
    const [first, second] = await Promise.all([
      lib.orgOverview(view),
      lib.orgOverview(view),
    ]);
    assert.equal(view.calls, 1);
    assert.equal(first.workspaces.length, 1);
    assert.equal(second.workspaces.length, 1);
    // And a later reader is still served from the cache — no TTL.
    await lib.orgOverview(view);
    assert.equal(view.calls, 1);
  } finally {
    restore();
  }
});

test("invalidate() makes the next read fetch again — and sees the new workspace", async () => {
  const { lib, restore } = freshLib();
  try {
    const view = fetcher([
      { workspaces: [{ hub_id: "a" }] },
      { workspaces: [{ hub_id: "a" }, { hub_id: "sc2" }] },
    ]);
    const before = await lib.orgOverview(view);
    assert.deepEqual(before.workspaces.map((w) => w.hub_id), ["a"]);

    lib.invalidate();

    const after = await lib.orgOverview(view);
    assert.equal(view.calls, 2);
    assert.deepEqual(after.workspaces.map((w) => w.hub_id), ["a", "sc2"]);
  } finally {
    restore();
  }
});

test("invalidate() costs nothing on its own", async () => {
  // It must not reach the network. The whole point of doing this instead of
  // org-tab._refresh() is that a workspace mutation pays for no request.
  const { lib, restore } = freshLib();
  try {
    const view = fetcher([{ workspaces: [] }]);
    await lib.orgOverview(view);
    assert.equal(view.calls, 1);
    for (let i = 0; i < 50; i += 1) lib.invalidate();
    assert.equal(view.calls, 1);
  } finally {
    restore();
  }
});

test("an account with no organisation never fetches at all", async () => {
  // domain 1 — the majority. Dropping a cache that was never populated is a
  // no-op, and the read still costs nothing.
  const { lib, restore } = freshLib({ domain: 1 });
  try {
    const view = fetcher([{ workspaces: [{ hub_id: "a" }] }]);
    const data = await lib.orgOverview(view);
    lib.invalidate();
    await lib.orgOverview(view);
    assert.equal(view.calls, 0);
    assert.deepEqual(data.workspaces, []);
    assert.equal(data.can_browse, 0);
  } finally {
    restore();
  }
});

// ── the desk's chokepoint ───────────────────────────────────────────────────

// One class method, lifted out of index.js as shipped.
function grab(name) {
  const start = src.indexOf(`  async ${name}(`);
  assert.ok(start > 0, `${name} not found in ${DESK}`);
  const end = src.indexOf("\n  }\n", start) + 4;
  assert.ok(end > start, `${name} has no end`);
  return src.slice(start, end);
}

function runCreated(payload = {}, { wsListPart = { el: {} } } = {}) {
  const log = [];
  const org = {
    invalidate: () => log.push("invalidate"),
    // Present so the test can prove it is NEVER reached.
    orgOverview: () => {
      log.push("FETCH");
      return Promise.resolve({});
    },
    orgFeature: () => true,
  };
  const api = new Function("require", `return { ${grab("_onWorkspaceCreated")} };`)(
    (m) => {
      assert.equal(m, "libs/org-overview");
      return org;
    },
  );
  const self = {
    ...api,
    el: { dataset: {} },
    _wsListPart: wsListPart,
    _wsHeadPart: null,
    _renderWorkspaceMenu: async () => log.push("render-switcher"),
    _syncWorkspaceLabel: () => log.push("sync-label"),
    _refreshHomeGrid: () => log.push("home-grid"),
    _openWorkspaceOrEmptyScreen: async () => log.push("open-empty"),
    _openWorkspaceAfterAccessPanel: () => log.push("open-after-access"),
    _walkthroughRunning: () => false,
    _workspaceKey: (w) => (w ? "key" : null),
    _openCreatedWorkspace: async () => log.push("open-created"),
    _showEmptyWorkspaceScreen: async () => log.push("empty-screen"),
    _fetchWorkspaces: async () => {
      log.push("fetch-workspaces");
      return [{}];
    },
  };
  return self._onWorkspaceCreated(payload).then(() => log);
}

test("a workspace change drops the org cache", async () => {
  const log = await runCreated();
  assert.ok(log.includes("invalidate"), log.join(" > "));
});

test("...and does not pay for a refetch", async () => {
  // THE PERF GUARD. org-tab._refresh() would have fetched here; this must not.
  // If someone later 'improves' this into a refresh, this case fails.
  const log = await runCreated();
  assert.ok(!log.includes("FETCH"), `org overview refetched on a create: ${log.join(" > ")}`);
});

test("the cache is dropped BEFORE the first await", async () => {
  // A fetch already in flight must not be able to re-cache the stale answer
  // behind the invalidate. Nothing may run ahead of it.
  const log = await runCreated();
  assert.equal(log[0], "invalidate", log.join(" > "));
});

test("every branch of the handler still drops it", async () => {
  // The three early returns: created-from-empty (personal), created-from-empty
  // (hub), and the switch-to-it path. All are downstream of the invalidate, but
  // asserting it keeps a future reorder honest.
  for (const [label, payload, opts] of [
    ["personal from empty", { personal: 1 }, {}],
    ["hub from empty", {}, {}],
    ["open the created one", { open: 1, workspace: { hub_id: "x" } }, {}],
    ["no switcher parts yet", {}, { wsListPart: null }],
  ]) {
    const self = { el: { dataset: { noWorkspace: label.includes("empty") ? "1" : "0" } } };
    const log = await runCreated(payload, opts).catch((e) => {
      assert.fail(`${label} threw: ${e.message}`);
    });
    assert.equal(log[0], "invalidate", `${label}: ${log.join(" > ")}`);
    assert.ok(!log.includes("FETCH"), `${label} refetched`);
    void self;
  }
});

test("nothing else in the desk refetches the overview on workspace:refresh", async () => {
  // The two "workspace:refresh" subscriptions are _onWorkspaceCreated (above)
  // and _onWorkspaceListChanged. The second one resyncs the SWITCHER, which is
  // a different cache (desk.home) — it must not have grown an org read.
  const start = src.indexOf("  _onWorkspaceListChanged() {");
  assert.ok(start > 0);
  const body = src.slice(start, src.indexOf("\n  }\n", start));
  assert.ok(!/org-overview|orgOverview/.test(body), body);
});
