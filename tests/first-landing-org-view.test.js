// tests/first-landing-org-view.test.js — opening Drumee with nothing to
// restore lands on the organisation screen, which now lists the caller's
// personal workspaces too (Lexis, 2026-10-14).
//
//   node --test tests/first-landing-org-view.test.js
//
// The reload-restore must not move: a remembered workspace / screen / deep
// link still wins, and the organisation screen itself now survives a reload.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const DESK_SRC = fs.readFileSync(path.join(ROOT, "src/drumee/modules/desk/index.js"), "utf8");
const ORG_SRC = fs.readFileSync(path.join(ROOT, "src/drumee/modules/desk/org-view/index.js"), "utf8");

global._a = Object.assign(global._a || {}, { kind: "kind", folder: "folder", hub: "hub" });
global._ = global._ || { isFunction: (f) => typeof f === "function", uniqueId: (p) => `${p}1` };
global.LOCALE = { PERSONAL: "Personal", WORKSPACE: "workspace", WORKSPACES: "workspaces", NO_DEPARTMENTS_YET: "none" };

// The static registry the sliced methods read off the class.
global.desk_module = {
  _DESK_STATE_KEY: "k",
  _RESTORABLE_SCREENS: { "toggle-settings": "sidebar-settings", "toggle-trash": "sidebar-trash" },
};

// Module-level names the sliced desk methods read.
global.withTimeout = require("../src/drumee/libs/screen-restore").withTimeout;
global.ORG_LANDING_WAIT = 50;

const method = (src, sig) => eval(`(${sliceFunction(src, sig)})`);

// ── desk ────────────────────────────────────────────────────────────────────

const landOnOrgView = method(DESK_SRC, "async _landOnOrgView(paneComing, opt = {})");
const restoreDeskState = method(DESK_SRC, "async _restoreDeskState()");
const persistDeskState = method(DESK_SRC, "_persistDeskState()");
const savedStateIsRestorable = method(DESK_SRC, "_savedStateIsRestorable(state)");
const orgViewOnScreen = method(DESK_SRC, "_orgViewOnScreen()");

// libs/org-overview, resolved by its webpack alias.
let overview = { can_browse: 1 };
let feature = true;
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === "libs/org-overview") return "org-overview-stub";
  return origResolve.call(this, req, ...rest);
};
require.cache["org-overview-stub"] = {
  id: "org-overview-stub", filename: "org-overview-stub", loaded: true,
  exports: {
    orgFeature: () => feature,
    orgOverview: () => Promise.resolve(overview),
  },
};

function resetEnv({ mobile = false, can_browse = 1, org = true } = {}) {
  global.Visitor = { isMobile: () => mobile, parseModuleArgs: () => ({}) };
  overview = { can_browse };
  feature = org;
}

function desk(extra = {}) {
  const calls = [];
  const d = {
    calls,
    _restoreScreen(service, onOpened, opt) {
      calls.push(["restoreScreen", service, opt]);
      if (onOpened) onOpened();
      return Promise.resolve("ready");
    },
    _bootTourComing: () => false,
    _openDefaultWorkspace: async () => { calls.push(["openDefault"]); return true; },
    _restoreWorkspace: async () => { calls.push(["restoreWorkspace"]); return true; },
    _restoreFloatingWindows: async () => calls.push(["windows"]),
    _clearRestoreInFlight: (ms) => calls.push(["clearFlag", ms]),
    _settleHomeGrid: () => calls.push(["settle"]),
    _waitForWm: async () => ({ route: () => calls.push(["route"]) }),
    _savedStateIsRestorable: savedStateIsRestorable,
    warn() {},
    isDestroyed: () => false,
    _restoreInFlight: true,
    ...extra,
  };
  d._landOnOrgView = landOnOrgView.bind(d);
  return d;
}

test("first open: default workspace underneath, then the organisation screen", async () => {
  resetEnv();
  const d = desk({ _bootDeepLink: false, _bootSavedState: null });
  await restoreDeskState.call(d);
  const names = d.calls.map((c) => c[0]);
  assert.deepEqual(names.slice(0, 3), ["openDefault", "restoreScreen", "clearFlag"]);
  assert.equal(d.calls[1][1], "open-org-view");
  assert.deepEqual(d.calls[1][2], { paneComing: true });
  assert.equal(d.calls[2][1], 2500, "flag still held a beat after the open");
});

test("first open with no workspace at all keeps the no-workspace screen", async () => {
  resetEnv();
  const d = desk({
    _bootDeepLink: false,
    _bootSavedState: null,
    _openDefaultWorkspace: async () => false,
  });
  await restoreDeskState.call(d);
  assert.ok(!d.calls.some((c) => c[0] === "restoreScreen"));
  assert.ok(d.calls.some((c) => c[0] === "settle"));
});

for (const [label, env] of [
  ["no organisation", { org: false }],
  ["a member who may not browse", { can_browse: 0 }],
  ["a phone", { mobile: true }],
]) {
  test(`first open for ${label} stays on the workspace (old behaviour)`, async () => {
    resetEnv(env);
    const d = desk({ _bootDeepLink: false, _bootSavedState: null });
    await restoreDeskState.call(d);
    assert.deepEqual(d.calls.map((c) => c[0]), ["openDefault", "clearFlag"]);
  });
}

test("first open stands down when a tour is coming", async () => {
  resetEnv();
  const d = desk({ _bootDeepLink: false, _bootSavedState: null, _bootTourComing: () => true });
  await restoreDeskState.call(d);
  assert.ok(!d.calls.some((c) => c[0] === "restoreScreen"));
});

test("first open yields to a billing deep link that already took the screen", async () => {
  resetEnv();
  const d = desk({ _bootDeepLink: false, _bootSavedState: null, _restoreInFlight: false });
  await restoreDeskState.call(d);
  assert.ok(!d.calls.some((c) => c[0] === "restoreScreen"));
});

test("a hung org overview cannot hold the landing: the workspace stays", async () => {
  resetEnv();
  require.cache["org-overview-stub"].exports.orgOverview = () => new Promise(() => {});
  try {
    const d = desk({ _bootDeepLink: false, _bootSavedState: null });
    await restoreDeskState.call(d);
    assert.deepEqual(d.calls.map((c) => c[0]), ["openDefault", "clearFlag"]);
  } finally {
    require.cache["org-overview-stub"].exports.orgOverview = () => Promise.resolve(overview);
  }
});

test("the org landing never sweeps away a dialog that is up", async () => {
  const openRestored = method(DESK_SRC, "async _openRestoredScreen(service)");
  const sent = [];
  const d = {
    el: { dataset: { wmModal: "open" } },
    onUiEvent: (cmd, a) => sent.push(a.service),
  };
  await assert.rejects(openRestored.call(d, "open-org-view"));
  await openRestored.call(d, "toggle-settings");
  d.el.dataset = {};
  await openRestored.call(d, "open-org-view");
  assert.deepEqual(sent, ["toggle-settings", "open-org-view"]);
});

test("reload on a workspace still restores that workspace, no org screen", async () => {
  resetEnv();
  const saved = { workspace: { hub_id: "h1", nid: "n1" } };
  const d = desk({ _bootDeepLink: false, _bootSavedState: saved });
  await restoreDeskState.call(d);
  const names = d.calls.map((c) => c[0]);
  assert.ok(names.includes("restoreWorkspace"));
  assert.ok(!names.includes("restoreScreen"));
  assert.ok(!names.includes("openDefault"));
});

test("reload on a remembered screen restores only that screen", async () => {
  resetEnv();
  const saved = { workspace: { hub_id: "h1", nid: "n1" }, service: "toggle-settings" };
  const d = desk({ _bootDeepLink: false, _bootSavedState: saved });
  await restoreDeskState.call(d);
  const screens = d.calls.filter((c) => c[0] === "restoreScreen").map((c) => c[1]);
  assert.deepEqual(screens, ["toggle-settings"]);
});

test("deep link wins: no default workspace, no org screen", async () => {
  resetEnv();
  const d = desk({ _bootDeepLink: true, _bootSavedState: null });
  await restoreDeskState.call(d);
  const names = d.calls.map((c) => c[0]);
  assert.ok(names.includes("route"));
  assert.ok(!names.includes("restoreScreen"));
  assert.ok(!names.includes("openDefault"));
});

test("reload on the org screen puts it back, under a slide-out that was over it", async () => {
  resetEnv();
  const saved = { workspace: { hub_id: "h1", nid: "n1" }, orgView: 1, service: "toggle-trash" };
  const d = desk({ _bootDeepLink: false, _bootSavedState: saved });
  await restoreDeskState.call(d);
  const screens = d.calls.filter((c) => c[0] === "restoreScreen").map((c) => c[1]);
  assert.deepEqual(screens, ["open-org-view", "toggle-trash"]);
});

test("orgView alone is a restorable state; old snapshots are unchanged", () => {
  assert.equal(savedStateIsRestorable({ orgView: 1 }), true);
  assert.equal(savedStateIsRestorable({}), false);
  assert.equal(savedStateIsRestorable(null), false);
});

function slotWith(child) {
  return { getPart: (pn) => (pn === "settings-main-slot" ? { children: { last: () => child } } : null) };
}
function view(kind, anim) {
  return { el: { dataset: anim ? { anim } : {} }, mget: (k) => (k === "kind" ? kind : undefined), isDestroyed: () => false };
}

test("_orgViewOnScreen reads the full-canvas slot", () => {
  assert.equal(orgViewOnScreen.call(slotWith(view("desk_org_view"))), true);
  assert.equal(orgViewOnScreen.call(slotWith(view("settings_main"))), false);
  assert.equal(orgViewOnScreen.call(slotWith(view("desk_org_view", "out"))), false);
  assert.equal(orgViewOnScreen.call(slotWith(null)), false);
});

test("pagehide saves orgView beside the workspace, and nothing new otherwise", () => {
  const store = {};
  global.sessionStorage = {
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  const base = {
    _currentScreenService: () => null,
    _snapshotWorkspace: () => ({ hub_id: "h1", nid: "n1" }),
    _snapshotFloatingWindows: () => [],
  };
  persistDeskState.call({ ...base, _orgViewOnScreen: () => true });
  assert.deepEqual(JSON.parse(store.k), { workspace: { hub_id: "h1", nid: "n1" }, orgView: 1 });
  persistDeskState.call({ ...base, _orgViewOnScreen: () => false });
  assert.deepEqual(JSON.parse(store.k), { workspace: { hub_id: "h1", nid: "n1" } });
});

// ── org view: personal workspaces ───────────────────────────────────────────

global.Skeletons = {
  Box: {
    X: (o) => ({ t: "X", ...o }),
    Y: (o) => ({ t: "Y", ...o }),
    G: (o) => ({ t: "G", ...o }),
  },
  Note: (o) => ({ t: "Note", ...o }),
  Element: (o) => ({ t: "Element", ...o }),
  Image: { Svg: (o) => ({ t: "Svg", ...o }) },
  Button: { Svg: (o) => ({ t: "BtnSvg", ...o }), Label: (o) => ({ t: "BtnLabel", ...o }) },
};
Module._resolveFilename = function (req, ...rest) {
  if (req === "libs/org-overview") return "org-overview-stub";
  if (req === "media/grid/template/folder") return "folder-art-stub";
  return origResolve.call(this, req, ...rest);
};
require.cache["folder-art-stub"] = {
  id: "folder-art-stub", filename: "folder-art-stub", loaded: true, exports: () => "<svg/>",
};
const { sections } = require("../src/drumee/modules/desk/org-view/skeleton");

function flat(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    node.forEach((n) => flat(n, out));
    return out;
  }
  out.push(node);
  flat(node.kids, out);
  return out;
}

const PERSONAL = [
  { filetype: "folder", area: "personal", hub_id: "me", nid: "p1", filename: "Notes" },
  { filetype: "folder", area: "personal", hub_id: "me", nid: "p2", filename: "Drafts" },
];
const ORG = { sections: [], ungrouped: [{ hub_id: "h1", area: "private", filename: "Team", members: 3 }] };

test("the Personal section lists each personal workspace, keyed by nid", () => {
  const all = flat(sections("org", {}, ORG, true, PERSONAL));
  const head = all.find((n) => n.content === "Personal");
  assert.ok(head, "a Personal header");
  const cards = all.filter((n) => n.className === "org__card");
  assert.equal(cards.length, 3);
  const mine = cards.filter((c) => c.wsNid);
  assert.deepEqual(mine.map((c) => c.wsNid), ["p1", "p2"]);
  assert.ok(mine.every((c) => c.wsHubId === undefined), "no shared hub_id key");
  assert.ok(!flat(mine).some((n) => n.className === "org__members"), "no member count");
  const team = cards.find((c) => c.wsHubId === "h1");
  assert.ok(flat(team).some((n) => n.className === "org__members"), "org card unchanged");
});

test("no personal workspaces: no Personal section, org view as before", () => {
  const before = sections("org", {}, ORG, true);
  const after = sections("org", {}, ORG, true, null);
  assert.deepEqual(after, before);
});

test("an empty organisation still says so above the personal section", () => {
  const kids = sections("org", {}, { sections: [], ungrouped: [] }, true, PERSONAL);
  assert.equal(kids[0].content, "none");
  assert.ok(flat(kids[kids.length - 1]).some((n) => n.content === "Personal"));
});

test("a filter matching no personal workspace keeps the header, drops the grid", () => {
  const all = flat(sections("org", {}, ORG, true, []));
  assert.ok(all.some((n) => n.content === "Personal"));
  assert.ok(!all.some((n) => n.wsNid));
});

const openWorkspace = method(ORG_SRC, "_openWorkspace(cmd)");
const personalWorkspaces = method(ORG_SRC, "_personalWorkspaces(force)");

test("a personal card opens ITS row through the desk's switch path", () => {
  const raised = [];
  const ui = {
    _rows: new Map([["h1", { hub_id: "h1" }]]),
    _personalRows: new Map([["p1", PERSONAL[0]], ["p2", PERSONAL[1]]]),
    triggerHandlers: (a) => raised.push(a),
  };
  const cmd = (o) => ({ mget: (k) => o[k] });
  openWorkspace.call(ui, cmd({ wsNid: "p2" }));
  openWorkspace.call(ui, cmd({ wsHubId: "h1" }));
  assert.deepEqual(raised.map((r) => r.service), ["switch-workspace-row", "switch-workspace-row"]);
  assert.equal(raised[0].row, PERSONAL[1]);
  assert.deepEqual(raised[1].row, { hub_id: "h1" });
});

test("personal rows come from the desk list, folders only, and never reject", async () => {
  global.window = {
    Desk: { _fetchWorkspaces: async () => [PERSONAL[0], { filetype: "hub", hub_id: "h1" }] },
  };
  assert.deepEqual(await personalWorkspaces.call({}), [PERSONAL[0]]);
  global.window = { Desk: { _fetchWorkspaces: async () => { throw new Error("down"); } } };
  assert.deepEqual(await personalWorkspaces.call({}), []);
  // A failed fetch answers [] — fall back to the desk's last good list.
  global.window = { Desk: { _workspaces: [PERSONAL[1]], _fetchWorkspaces: async () => [] } };
  assert.deepEqual(await personalWorkspaces.call({}), [PERSONAL[1]]);
  global.window = {};
  assert.deepEqual(await personalWorkspaces.call({}), []);
});
