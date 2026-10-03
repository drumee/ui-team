// folder-files-search.test.js — workspace search shown IN the Files list
// (window__icons-list / window__content-row), driven against a fake window.
//
//   node --test tests/folder-files-search.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
global._ = require("underscore");
global._a = { nid: "nid", hub_id: "hub_id", actual_hub_id: "actual_hub_id", filetype: "filetype", ownpath: "ownpath", hub: "hub", list: "list" };
global._e = { data: "data", eod: "eod", error: "error" };
global._K = { permission: { read: 0b10 } };
global.SERVICE = { media: { search_all: "media.search_all" } };
const docListeners = [];
global.document = {
  addEventListener: (t, fn) => docListeners.push(fn),
  removeEventListener: (t, fn) => docListeners.splice(docListeners.indexOf(fn), 1),
};

const S = require("../src/drumee/builtins/window/folder/files-search");
const flush = () => new Promise((r) => setImmediate(r));
const deferred = () => { let resolve; const promise = new Promise((r) => (resolve = r)); return { promise, resolve }; };

function fakeList() {
  const em = new EventEmitter();
  const panel = { dataset: {} };
  const list = {
    panel, restarts: 0, responses: [], _end_of_data: false,
    el: { closest: () => panel },
    once: (e, f) => em.once(e, f), off: (e, f) => em.off(e, f),
    restart() { this.restarts++; this._end_of_data = false; em.emit("eod"); },
    handleResponse(rows) { this.responses.push(rows); em.emit("data"); if (!rows.length) this._eod(); },
    _eod() { this._end_of_data = true; em.emit("eod"); },
  };
  return list;
}

function fakeWin({ attrs = {}, grid = true } = {}) {
  const list = fakeList();
  const calls = [];
  const box = { _input: {}, value: "x", setValue(v) { this.value = v; } };
  const win = {
    fig: { group: "window" },
    attrs: { hub_id: "H1", nid: "N1", filetype: "hub", ...attrs },
    mget(k) { return this.attrs[k]; },
    iconsList: list,
    _wsSearchBox: box,
    _wsSearchContainer: { el: { contains: () => true } },
    _navStack: [],
    calls, list, box,
    pending: [],
    ensurePart: () => Promise.resolve(list),
    fetchService(api) { calls.push(api); const d = deferred(); this.pending.push(d); return d.promise; },
    loadContent() { calls.push("loadContent"); },
    _resetFileTypeFilter() { calls.push("resetFilter"); },
    _isFolderGridMode: () => grid,
    _prepareListPartition() { calls.push("partition"); },
  };
  return win;
}

test("normalizeQuery trims and collapses spaces", () => {
  assert.equal(S.normalizeQuery("  q1   report \n"), "q1 report");
  assert.equal(S.normalizeQuery(undefined), "");
});

test("searchRows: bare object, foreign hub, privilege, scope fence (fails closed)", () => {
  const one = S.searchRows({ nid: 1, hub_id: "H1" }, { hub_id: "H1", scope: "", readMask: 2 });
  assert.equal(one.length, 1);
  const rows = [
    { nid: 1, hub_id: "H1", ownpath: "/WS/a.pdf", privilege: 3 },
    { nid: 2, hub_id: "H2", ownpath: "/WS/b.pdf" },          // other hub
    { nid: 3, hub_id: "H1", ownpath: "/WS/c.pdf", privilege: 0 }, // no read
    { nid: 4, hub_id: "H1", ownpath: "/Other/d.pdf" },       // sibling workspace
    { nid: 5, hub_id: "H1" },                                // no path → dropped when scoped
    { nid: 6, hub_id: "H1", ownpath: "//WS//e.pdf" },        // repeated slashes
    { nid: 7, hub_id: "H1", ownpath: "/WSX/f.pdf" },         // prefix but not subtree
  ];
  const got = S.searchRows(rows, { hub_id: "H1", scope: "/WS", readMask: 2 }).map((r) => r.nid);
  assert.deepEqual(got, [1, 6]);
  const hubWide = S.searchRows(rows, { hub_id: "H1", scope: "", readMask: 2 }).map((r) => r.nid);
  assert.deepEqual(hubWide, [1, 4, 5, 6, 7]);
});

test("scopeOf: hub root → ''; personal workspace → root ownpath from the nav stack", () => {
  assert.equal(S.scopeOf(fakeWin()), "");
  const w = fakeWin({ attrs: { filetype: "folder", ownpath: "/WS/deep" } });
  w._navStack = [{ filetype: "folder", ownpath: "/WS/" }];
  assert.equal(S.scopeOf(w), "/WS");
});

test("run: restarts with no fetch, stamps loading+pending, feeds rows, ends loading", async () => {
  const win = fakeWin();
  const p = S.run(win, "report");
  await flush();
  assert.equal(S.isSearching(win), true);
  assert.equal(win.list.restarts, 1);
  assert.equal(win.list.panel.dataset.loading, "1");
  assert.equal(win.list.panel.dataset.search, "pending");
  assert.deepEqual(win.calls.filter((c) => typeof c === "string"), ["resetFilter", "partition"]);
  const api = win.calls.find((c) => c.service);
  assert.deepEqual(api, { service: "media.search_all", hub_id: "H1", string: "report", page: 1, limit: 100 });
  win.pending[0].resolve([{ nid: 9, hub_id: "H1" }]);
  await p;
  assert.deepEqual(win.list.responses, [[{ nid: 9, hub_id: "H1" }]]);
  assert.equal(win.list._end_of_data, true);
  assert.equal(win.list.panel.dataset.search, "results");
  assert.equal(win.list.panel.dataset.loading, undefined);
});

test("run: empty answer and failed request both stamp search=empty", async () => {
  for (const settle of [(d) => d.resolve([]), (d) => d.resolve(Promise.reject(new Error("x")))]) {
    const win = fakeWin();
    const p = S.run(win, "zz");
    await flush();
    settle(win.pending[0]);
    await p;
    assert.equal(win.list.panel.dataset.search, "empty");
    assert.equal(win.list.panel.dataset.loading, undefined);
  }
});

test("row mode does not partition", async () => {
  const win = fakeWin({ grid: false });
  S.run(win, "ab");
  await flush();
  assert.ok(!win.calls.includes("partition"));
});

test("a stale answer never paints", async () => {
  const win = fakeWin();
  S.run(win, "rep");
  await flush();
  const p2 = S.run(win, "report");
  await flush();
  win.pending[1].resolve([{ nid: 2, hub_id: "H1" }]);
  await p2;
  win.pending[0].resolve([{ nid: 1, hub_id: "H1" }]);
  await flush();
  assert.deepEqual(win.list.responses, [[{ nid: 2, hub_id: "H1" }]]);
});

test("an answer after exit never paints; exit reloads the folder once", async () => {
  const win = fakeWin();
  S.run(win, "report");
  await flush();
  S.exit(win, { clearInput: true });
  win.pending[0].resolve([{ nid: 1, hub_id: "H1" }]);
  await flush();
  assert.deepEqual(win.list.responses, []);
  assert.equal(win.calls.filter((c) => c === "loadContent").length, 1);
  assert.equal(win.box.value, "");
  assert.equal(win.list.panel.dataset.search, undefined);
  assert.equal(S.isSearching(win), false);
});

test("onTyped: debounced; <2 chars ends an active search", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const win = fakeWin();
  S.onTyped(win, "r");
  S.onTyped(win, "re");
  S.onTyped(win, "rep");
  t.mock.timers.tick(249);
  assert.equal(S.isSearching(win), false);
  t.mock.timers.tick(1);
  assert.equal(win._wsQuery, "rep");
  S.onTyped(win, "");
  assert.equal(S.isSearching(win), false);
  assert.ok(win.calls.includes("loadContent"));
});

test("loadContent while searching re-runs the search (same folder)", async () => {
  const win = fakeWin();
  S.run(win, "report");
  await flush();
  assert.equal(S.onLoadContent(win), true);
  await flush();
  assert.equal(win.calls.filter((c) => c.service).length, 2);
});

test("navigation ends the search and clears the input", async () => {
  const win = fakeWin();
  S.run(win, "report");
  await flush();
  win.attrs.nid = "N2"; // window navigated into a result folder
  assert.equal(S.onLoadContent(win), false); // the folder listing loads normally
  assert.equal(S.isSearching(win), false);
  assert.equal(win.box.value, "");
  assert.ok(!win.calls.includes("loadContent")); // no double reload
});

test("a rebuilt list re-runs the active search", async () => {
  const win = fakeWin();
  assert.equal(S.onListReady(win, win.list), false); // not searching
  S.run(win, "report");
  await flush();
  assert.equal(S.onListReady(win, win.list), true);
});

test("Esc inside the field exits; teardown drops the listener", async () => {
  docListeners.length = 0; // earlier tests' windows left theirs bound
  const win = fakeWin();
  S.run(win, "report");
  await flush();
  assert.equal(docListeners.length, 1);
  docListeners[0]({ key: "Escape", target: {} });
  assert.equal(S.isSearching(win), false);
  assert.equal(docListeners.length, 0);
  S.run(win, "again");
  await flush();
  S.teardown(win);
  assert.equal(docListeners.length, 0);
});
