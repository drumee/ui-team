// tests/calendar-nav-window-cache.test.js — the Personal Calendar's ‹ › (and
// Today / view switch / day picked) paint from a per-window cache, with the
// neighbouring windows prefetched, instead of waiting a calendar.list round
// trip per click. Anything that can change the data (first paint, a push, our
// own writes) still reads uncached.
//
//   node --test tests/calendar-nav-window-cache.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const CAL_SRC = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/builtins/panel/calendar/index.js"),
  "utf8"
);

// Module-level names the sliced methods close over. A window is "the cursor
// itself", which is all the cache keying needs.
/* eslint-disable no-unused-vars */
const PARKED_REFRESH_MS = 60 * 1000;
const SERVICE = {};
const Visitor = { id: "me" };
// A window bound is its label; _readWindow's one-day timezone pad
// (calendar-window-timezone-pad.test.js) is a no-op on it here.
const bound = (k) => ({ k, subtract() { return this; }, add() { return this; } });
const ymd = (v) => (v && v.k) || v;
const viewRange = (view, cursor) => ({ from: bound(`${view}-${cursor}`), to: bound("end") });
const normalizeRow = (r) => r;
/* eslint-enable no-unused-vars */

const method = (sig) => eval(`(${sliceFunction(CAL_SRC, sig)})`);
const tick = () => new Promise((r) => setImmediate(r));

function calendar() {
  const reads = [];
  const pending = [];
  const self = {
    _view: "month",
    _cursor: "2026-10-01",
    _items: [],
    renders: [],
    fetchService(args) {
      reads.push(args.from);
      return new Promise((resolve) => pending.push({ from: args.from, resolve }));
    },
    _render() {
      this.renders.push({ cursor: this._cursor, items: this._items });
    },
    _closeMenus() {},
    _useFixture: () => false,
    _neighbour(d) {
      const m = Number(this._cursor.slice(5, 7)) + d;
      return `2026-${String(m).padStart(2, "0")}-01`;
    },
    warn() {},
  };
  self._loadItems = method("async _loadItems({ cached = false } = {})");
  self._fetchWindow = method("_fetchWindow(from, to, cached)");
  self._readWindow = method("async _readWindow(from, to)");
  self._dropWindowCache = method("_dropWindowCache()");
  self._prefetchNeighbours = method("_prefetchNeighbours()");
  self._navigate = method("async _navigate()");
  self._step = method("_step(direction)");
  // Answer every outstanding read with one row named after its window.
  const answer = async () => {
    await tick();
    pending.splice(0).forEach((p) => p.resolve([{ id: p.from }]));
    await tick();
  };
  return { self, reads, answer };
}

test("› after a load answers from the prefetched neighbour, with no new read", async () => {
  const { self, reads, answer } = calendar();
  self._loadItems();
  await answer();
  self._prefetchNeighbours();
  await answer();
  assert.deepEqual(reads, ["month-2026-10-01", "month-2026-09-01", "month-2026-11-01"]);

  reads.length = 0;
  await self._step(1);
  // Only the NEW neighbour (December) is read; November came from cache.
  assert.deepEqual(reads, ["month-2026-12-01"]);
  assert.equal(self.renders.length, 1);
  assert.deepEqual(self.renders[0], {
    cursor: "2026-11-01",
    items: [{ id: "month-2026-11-01" }],
  });
});

test("a miss paints the new range at once, then again when the read lands", async () => {
  const { self, answer } = calendar();
  const nav = self._step(-1);
  // Painted on the click, before any answer.
  assert.equal(self.renders.length, 1);
  assert.equal(self.renders[0].cursor, "2026-09-01");
  await answer();
  await nav;
  assert.equal(self.renders.length, 2);
  assert.deepEqual(self.renders[1].items, [{ id: "month-2026-09-01" }]);
});

test("an overtaken read never lands its rows under the newer window", async () => {
  const { self, answer } = calendar();
  const first = self._step(1);
  const second = self._step(1);
  await answer();
  await Promise.all([first, second]);
  assert.equal(self._cursor, "2026-12-01");
  assert.deepEqual(self._items, [{ id: "month-2026-12-01" }]);
  assert.deepEqual(self.renders.at(-1).items, [{ id: "month-2026-12-01" }]);
});

test("a plain (push / write) load drops the cache, so › reads again", async () => {
  const { self, reads, answer } = calendar();
  self._loadItems();
  await answer();
  self._prefetchNeighbours();
  await answer();
  self._loadItems(); // e.g. _reload after a task.update push
  await answer();

  reads.length = 0;
  self._step(1);
  await answer();
  assert.ok(reads.includes("month-2026-11-01"));
});

test("a read invalidated mid-flight is not cached", async () => {
  const { self, reads, answer } = calendar();
  self._prefetchNeighbours(); // Sep + Nov in flight
  self._dropWindowCache(); // a push lands before they answer
  await answer();
  reads.length = 0;
  self._step(1);
  await answer();
  assert.ok(reads.includes("month-2026-11-01"));
});

test("a failed read is not cached", async () => {
  const { self, reads } = calendar();
  self.fetchService = (args) => {
    reads.push(args.from);
    return Promise.resolve(undefined);
  };
  await self._loadItems({ cached: true });
  assert.equal(self._loadFailed, 1);
  await self._loadItems({ cached: true });
  assert.equal(reads.length, 2);
});

// The ‹ Today › pill has no loading spinner: navigation paints at once from
// the cache (or the rows held), so there is nothing to wait on to show.
test("the nav pill carries no loading state", () => {
  const TOOLBAR = fs.readFileSync(
    path.join(__dirname, "..", "src/drumee/builtins/panel/calendar/skeleton/toolbar.js"), "utf8");
  const SKIN = fs.readFileSync(
    path.join(__dirname, "..", "src/drumee/builtins/panel/calendar/skin/index.scss"), "utf8");
  assert.doesNotMatch(CAL_SRC, /_navLoading|isNavLoading|_stampNavLoading|NAV_SPINNER_MIN_MS|_navSpinnerTimer/);
  assert.doesNotMatch(TOOLBAR, /isNavLoading|"data-loading"/);
  assert.doesNotMatch(SKIN, /&__nav\[data-loading/);
});
