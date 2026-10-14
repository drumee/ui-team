// tests/folder-nav-latency.test.js — in-pane folder navigation does not wait on
// round trips it does not need:
//   - desk_breadcrumb paints a child / ancestor crumb before get_path answers,
//     and an older get_path answer never paints over a newer navigation;
//   - Wm.openWorkspaceFolder walks to an ANCESTOR from the pane's _navStack
//     without waiting for media.attributes, and falls back to the full lookup
//     when the server disagrees.
//
//   node --test tests/folder-nav-latency.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

global._a = new Proxy({}, { get: (t, k) => (typeof k === "string" ? k : t[k]) });
global._ = require("lodash");
global.window = global.window || {};

const CRUMB_SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/breadcrumb/index.js"),
  "utf8",
);
const WM_SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/wm/index.js"),
  "utf8",
);

const holds = { on: false };
const sectionHold = { holds: () => holds.on };
const optimisticPath = new Function(
  "sectionHold",
  `return ${sliceFunction(CRUMB_SRC, "_optimisticPath(nid, hub_id, hint)")}`,
)(sectionHold);

function crumbs(data) {
  const painted = [];
  return {
    _section: false,
    _data: data,
    painted,
    _buildContent(d) {
      painted.push(d);
      this._data = d;
    },
  };
}

const root = { nid: "R1", hub_id: "H1", filetype: "hub", filename: "/", hub_name: "WS", area: "private" };
const a = { nid: "A", hub_id: "H1", pid: "R1", filetype: "folder", filename: "a" };
const b = { nid: "B", hub_id: "H1", pid: "A", filetype: "folder", filename: "b" };

test("child of the last crumb is appended before get_path", () => {
  const w = crumbs([root, a]);
  optimisticPath.call(w, "B", "H1", { pid: "A", filename: "b", area: "private" });
  assert.equal(w.painted.length, 1);
  assert.deepEqual(w.painted[0].map((r) => r.nid), ["R1", "A", "B"]);
  assert.equal(w.painted[0][2].filename, "b");
  assert.equal(w.painted[0][2].area, "private");
});

test("ancestor already on the track crops to it", () => {
  const w = crumbs([root, a, b]);
  optimisticPath.call(w, "R1", "H1", {});
  assert.deepEqual(w.painted[0].map((r) => r.nid), ["R1"]);
});

test("current node repaints nothing", () => {
  const w = crumbs([root, a]);
  optimisticPath.call(w, "A", "H1", { pid: "R1", filename: "a" });
  assert.equal(w.painted.length, 0);
});

test("deep jump / other hub / no name / section → waits for get_path", () => {
  for (const [nid, hub, hint] of [
    ["Z", "H1", { pid: "Y", filename: "z" }],
    ["B", "H2", { pid: "A", filename: "b" }],
    ["B", "H1", { pid: "A" }],
  ]) {
    const w = crumbs([root, a]);
    optimisticPath.call(w, nid, hub, hint);
    assert.equal(w.painted.length, 0, `${nid}/${hub}`);
  }
  const s = crumbs([root, a]);
  s._section = true;
  optimisticPath.call(s, "B", "H1", { pid: "A", filename: "b" });
  assert.equal(s.painted.length, 0);
  holds.on = true;
  const h = crumbs([root, a]);
  optimisticPath.call(h, "B", "H1", { pid: "A", filename: "b" });
  assert.equal(h.painted.length, 0);
  holds.on = false;
});

test("empty track → nothing to build on", () => {
  const w = crumbs([]);
  optimisticPath.call(w, "B", "H1", { pid: "A", filename: "b" });
  assert.equal(w.painted.length, 0);
});

test("_updatePath: an older get_path answer never paints over a newer one", async () => {
  const resolvers = {};
  const getPath = (view, { nid }) =>
    new Promise((r) => {
      resolvers[nid] = r;
    });
  const updatePath = new Function(
    "getPath",
    "sectionHold",
    `return ${sliceFunction(CRUMB_SRC, "_updatePath(nid, hub_id, hint)")}`,
  )(getPath, sectionHold);
  const painted = [];
  const w = {
    warn() {},
    isDestroyed: () => false,
    _optimisticPath() {},
    _buildContent: (d) => painted.push(d[d.length - 1].nid),
  };
  updatePath.call(w, "A", "H1");
  updatePath.call(w, "B", "H1");
  resolvers.B([root, a, b]);
  await new Promise((r) => setImmediate(r));
  resolvers.A([root, a]);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(painted, ["B"]);
});

test("_onBrowse forwards the mirrored node as the hint", () => {
  assert.match(CRUMB_SRC, /this\._updatePath\(nid, hub_id, data\)/);
});

// ── Wm.openWorkspaceFolder ────────────────────────────────────────────────
const openWorkspaceFolder = new Function(
  "getPath",
  "SERVICE",
  `return ${sliceFunction(WM_SRC, "openWorkspaceFolder(node)")}`,
)(
  () => Promise.resolve([]),
  { media: { attributes: "media.attributes" } },
);

function makePane(model, stack) {
  const m = { ...model };
  return {
    _navStack: stack,
    refreshed: [],
    synced: 0,
    isDestroyed: () => false,
    mget: (k) => m[k],
    mset(o) {
      Object.assign(m, o);
    },
    refreshContent(attrs) {
      this.refreshed.push(attrs.nid);
      Object.assign(m, attrs);
    },
    refreshBreadcrumbsUI() {},
    syncNewCtrlVisibility() {
      this.synced++;
    },
  };
}

function makeWm(pane, answer) {
  const calls = [];
  let release;
  const gate = new Promise((r) => (release = r));
  return {
    calls,
    release: () => release(),
    headlessPane: () => pane,
    getItemsByAttr: () => [],
    warn() {},
    updateBreadcrumb() {},
    loadWorkspace: (x) => calls.push(["loadWorkspace", x]),
    loadWorkspaceNode: (x) => calls.push(["loadWorkspaceNode", x]),
    fetchService(svc, p) {
      calls.push([svc, p.nid]);
      return gate.then(() => answer);
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 5));
// A state the pane captured itself (window/folder _captureNavState marks it).
const stackRow = (nid, priv = 7) =>
  Object.defineProperty({ nid, hub_id: "H1", filename: nid, privilege: priv }, "_live", { value: 1 });
// A get_path row refreshBreadcrumbsUI rebuilt the stack from: no marker.
const pathRow = (nid) => ({ nid, hub_id: "H1", filename: nid, privilege: 7, filetype: "folder" });

test("ancestor in _navStack: content refreshes BEFORE media.attributes answers", async () => {
  const pane = makePane({ nid: "B", hub_id: "H1", privilege: 7 }, [stackRow("R1"), stackRow("A")]);
  const wm = makeWm(pane, { nid: "A", hub_id: "H1", privilege: 7, home_id: "R1" });
  openWorkspaceFolder.call(wm, { nid: "A", hub_id: "H1" });
  assert.deepEqual(pane.refreshed, ["A"], "navigated synchronously");
  assert.deepEqual(pane._navStack.map((s) => s.nid), ["R1"], "stack cropped above target");
  wm.release();
  await flush();
  assert.deepEqual(pane.refreshed, ["A"], "same answer → no second refresh");
  assert.equal(pane.mget("home_id"), "R1", "fresh attributes merged into the model");
});

test("server reports a different privilege → full lookup path re-runs", async () => {
  const pane = makePane({ nid: "B", hub_id: "H1", privilege: 7 }, [stackRow("R1"), stackRow("A", 7)]);
  const wm = makeWm(pane, { nid: "A", hub_id: "H1", privilege: 3, home_id: "R1" });
  openWorkspaceFolder.call(wm, { nid: "A", hub_id: "H1" });
  wm.release();
  await flush();
  assert.deepEqual(pane.refreshed, ["A", "A"]);
  assert.equal(pane.mget("privilege"), 3);
});

test("pane moved on before the answer → answer ignored", async () => {
  const pane = makePane({ nid: "B", hub_id: "H1", privilege: 7 }, [stackRow("R1"), stackRow("A")]);
  const wm = makeWm(pane, { nid: "A", hub_id: "H1", privilege: 3 });
  openWorkspaceFolder.call(wm, { nid: "A", hub_id: "H1" });
  pane.mset({ nid: "C" });
  wm.release();
  await flush();
  assert.deepEqual(pane.refreshed, ["A"]);
  assert.equal(pane.mget("privilege"), 7);
});

test("not an ancestor → waits for media.attributes as before", async () => {
  const pane = makePane({ nid: "B", hub_id: "H1" }, [stackRow("R1")]);
  const wm = makeWm(pane, { nid: "Z", hub_id: "H1", privilege: 7 });
  openWorkspaceFolder.call(wm, { nid: "Z", hub_id: "H1" });
  assert.deepEqual(pane.refreshed, []);
  wm.release();
  await flush();
  assert.deepEqual(pane.refreshed, ["Z"]);
});

test("pane inside a symlinked folder → no shortcut", async () => {
  const pane = makePane({ nid: "B", hub_id: "H1", isalink: 1 }, [stackRow("A")]);
  const wm = makeWm(pane, { nid: "A", hub_id: "H1", privilege: 7 });
  openWorkspaceFolder.call(wm, { nid: "A", hub_id: "H1" });
  assert.deepEqual(pane.refreshed, []);
  wm.release();
  await flush();
  assert.deepEqual(pane.refreshed, ["A"]);
});

// ── the workspace crumb vs. a non-tile widget carrying the root nid ───────
test("a non-tile widget with the target nid (team chat) is NOT 'opened' instead of navigating", async () => {
  const pane = makePane({ nid: "F3", hub_id: "H1", privilege: 7 }, [stackRow("R1"), stackRow("R3")]);
  let chatOpened = 0;
  // The pane's chat is mounted with the pane's original nid: the root.
  const chat = { model: {}, mget: (k) => (k === "nid" ? "R1" : undefined), triggerHandlers: () => chatOpened++ };
  pane.iconsList = { children: [chat] };
  pane.getItemsByAttr = () => [chat];
  const wm = makeWm(pane, { nid: "R1", hub_id: "H1", privilege: 7 });
  openWorkspaceFolder.call(wm, { nid: "R1", hub_id: "H1" });
  assert.equal(chatOpened, 0);
  assert.deepEqual(pane.refreshed, ["R1"], "the pane navigates to the root");
});

test("a folder tile of the listing is still reused (open-node on the tile)", () => {
  const pane = makePane({ nid: "R1", hub_id: "H1" }, []);
  let opened = 0;
  const tile = {
    model: {},
    mget: (k) => ({ nid: "F1", filetype: "folder" })[k],
    triggerHandlers: ({ service }) => service === "open-node" && opened++,
  };
  pane.iconsList = { children: [tile] };
  const wm = makeWm(pane, {});
  openWorkspaceFolder.call(wm, { nid: "F1", hub_id: "H1" });
  assert.equal(opened, 1);
  assert.equal(wm.calls.length, 0, "no lookup request");
});

test("a get_path-rebuilt stack row takes the full lookup path", async () => {
  const pane = makePane({ nid: "B", hub_id: "H1", privilege: 7 }, [pathRow("R1"), pathRow("A")]);
  const wm = makeWm(pane, { nid: "A", hub_id: "H1", privilege: 7, filetype: "folder" });
  openWorkspaceFolder.call(wm, { nid: "A", hub_id: "H1" });
  assert.deepEqual(pane.refreshed, [], "waits for media.attributes");
  wm.release();
  await flush();
  assert.deepEqual(pane.refreshed, ["A"]);
});

test("server reports a different filetype → full lookup path re-runs", async () => {
  const row = stackRow("R1");
  row.filetype = "folder";
  const pane = makePane({ nid: "B", hub_id: "H1", privilege: 7 }, [row]);
  const wm = makeWm(pane, { nid: "R1", hub_id: "H1", privilege: 7, filetype: "hub", actual_home_id: "R1" });
  openWorkspaceFolder.call(wm, { nid: "R1", hub_id: "H1" });
  wm.release();
  await flush();
  assert.deepEqual(pane.refreshed, ["R1", "R1"]);
  assert.equal(pane.mget("filetype"), "hub");
});

test("captured nav state is marked live, and the mark never reaches mset/spread", () => {
  const SRC = fs.readFileSync(
    path.join(__dirname, "../src/drumee/builtins/window/folder/index.js"),
    "utf8",
  );
  const capture = new Function(`return ${sliceFunction(SRC, "_captureNavState()")}`)();
  const view = { mget: () => "x", model: { get: () => "y" } };
  const st = capture.call(view);
  assert.equal(st._live, 1);
  assert.equal(Object.keys(st).includes("_live"), false);
  assert.equal({ ...st }._live, undefined);
});
