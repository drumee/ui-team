// The Meet schedule stamps data-painted on its panel part when the grid it is
// showing reflects an ANSWER — rows it already had, or a settled fetch. The
// skin draws a loading skeleton until then, so the stamp is what ends it, and
// a first load with nothing cached must not stamp early: room.list is what
// decides between "no meetings" and "not loaded yet".
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const SRC = fs.readFileSync(require.resolve("../src/drumee/builtins/window/folder/index.js"), "utf8");
const m = SRC.match(/\n  _refreshSchedule\(opt = \{\}\) \{\n([\s\S]*?)\n  \}\n/);
assert.ok(m, "_refreshSchedule not found");
const body = m[1];

const DAY = "2026-09-13";
const Dayjs = () => ({ format: () => DAY });

// A window whose schedule part is mounted and visible, with the fetch and the
// cache under the test's control.
function win(over = {}) {
  const el = { dataset: {} };
  const w = {
    el,
    activeTab: "meeting",
    _meetings: null,
    _meetingPanelMounted: true,
    _meetingsCacheKey: () => "k",
    isDestroyed: () => false,
    getPart: () => ({ el, feed: () => w.fed++ }),
    fed: 0,
    ...over,
  };
  return w;
}

function run(w, opt = {}, { peek = () => undefined, fetched = [] } = {}) {
  const readCache = { peek, signature: (rows) => JSON.stringify(rows || null) };
  w._fetchMeetings = () => {
    w._meetings = fetched;
    return Promise.resolve();
  };
  const fn = new Function("opt", "Dayjs", "readCache", "require", body);
  // The schedule skeleton module is called with the window: require(path)(this).
  return fn.call(w, opt, Dayjs, readCache, () => () => ({ kids: [] }));
}

test("a first load with nothing cached waits for the fetch", async () => {
  const w = win();
  const p = run(w, {});
  assert.equal(w.el.dataset.painted, undefined, "stamped before room.list answered");
  await p;
  assert.equal(w.el.dataset.painted, "1");
});

test("rows already known are painted without waiting", () => {
  const w = win();
  run(w, {}, { peek: () => [{ id: 1 }] });
  assert.equal(w.el.dataset.painted, "1");
});

test("a fetch that returns nothing still ends the skeleton", async () => {
  // _fetchMeetings swallows its own failures and leaves _meetings an empty
  // array, so this is also the lost-request case: it must not pulse forever.
  const w = win();
  await run(w, {}, { fetched: [] });
  assert.equal(w.el.dataset.painted, "1");
});

test("a quiet refresh trusts the grid already on screen", () => {
  const w = win({ _schedPaintedDay: DAY });
  run(w, { quiet: 1 });
  assert.equal(w.el.dataset.painted, "1");
  assert.equal(w.fed, 0, "a quiet refresh rebuilt the grid");
});

test("a window destroyed mid-fetch is not touched", async () => {
  const w = win({ isDestroyed: () => true });
  await run(w, {});
  assert.equal(w.el.dataset.painted, undefined);
});

test("a hidden Meet tab neither fetches nor paints", () => {
  const w = win({ activeTab: "files" });
  run(w, {});
  assert.equal(w.el.dataset.painted, undefined);
  assert.equal(w._schedStale, 1);
});
