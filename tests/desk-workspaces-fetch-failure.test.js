// tests/desk-workspaces-fetch-failure.test.js — a desk.home that FAILS must
// not read as an account with no workspaces.
//
// fetchService never rejects on a server error (every view inherits
// onServerComplain), so a failed desk.home resolves to undefined. That used to
// become [] and put up "Create your first workspace" over an account with
// twelve (s110 on stage: mfs_show_node_by threw ER_TOO_MANY_ROWS).
//
// Runs the REAL desk methods against a stub `this` (the desk only loads under
// webpack).
//
//   node --test tests/desk-workspaces-fetch-failure.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DESK = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/index.js"),
  "utf8",
);

global._a = { folder: "folder", hub: "hub", personal: "personal" };
global._ = {
  isArray: Array.isArray,
  isFunction: (f) => typeof f === "function",
  sortBy: (list, fn) => [...list].sort((a, b) => fn(a) - fn(b)),
};
global.Visitor = { id: "u1" };
global.SERVICE = { desk: { home: "desk.home" } };
global.WS_CACHE_TTL = 60000;
global.WS_PAGE_SIZE = 45;
global.WS_MAX_PAGES = 20;
global.workspacePins = { firstPinned: () => null };

const method = (sig) => new Function(`return ${sliceFunction(DESK, sig)}`)();
const fetchWorkspaces = method("async _fetchWorkspaces(force, strict)");
const fetchPages = method("async _fetchWorkspacePages(force)");
const openOrEmpty = method("async _openWorkspaceOrEmptyScreen(opt = {})");

const HUB = { id: "h1", hub_id: "h1", filetype: "hub", area: "share", status: "active" };

function desk(answer) {
  const d = {
    empty: [],
    opened: [],
    warn() {},
    fetchService: async () => answer,
    _fetchWorkspaces: fetchWorkspaces,
    _fetchWorkspacePages: fetchPages,
    _workspaceKey: (r) => r && r.hub_id,
    _pinnedKeys: () => [],
    _workspaceTarget: (r) => r,
    _showEmptyWorkspaceScreen: async (e) => d.empty.push(e),
    _waitForWm: async () => ({ loadWorkspace: (w) => d.opened.push(w) }),
  };
  return d;
}

test("a failed desk.home does not put up the empty screen", async () => {
  const d = desk(undefined);
  assert.equal(await openOrEmpty.call(d), false);
  assert.deepEqual(d.empty, []);
});

test("an error payload is a failure too", async () => {
  const d = desk({ error: "SERVICE_FAILED" });
  assert.equal(await openOrEmpty.call(d), false);
  assert.deepEqual(d.empty, []);
});

test("a genuinely empty account still gets the empty screen", async () => {
  const d = desk([]);
  assert.equal(await openOrEmpty.call(d), false);
  assert.deepEqual(d.empty, [true]);
});

test("an account with a workspace opens it", async () => {
  const d = desk([HUB]);
  assert.equal(await openOrEmpty.call(d), true);
  assert.deepEqual(d.empty, [false]);
  assert.equal(d.opened[0].hub_id, "h1");
});

test("non-strict callers keep the last good list on a failure", async () => {
  const d = desk([HUB]);
  await d._fetchWorkspaces(true);
  d.fetchService = async () => undefined;
  const rows = await d._fetchWorkspaces(true);
  assert.equal(rows.length, 1);
});
