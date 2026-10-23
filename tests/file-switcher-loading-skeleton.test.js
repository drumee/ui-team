// tests/file-switcher-loading-skeleton.test.js — the player's Files panel shows
// placeholder rows under "Other files" while the folder listing is in flight,
// not "No files yet".
//
//   node --test tests/file-switcher-loading-skeleton.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/player/widget/file-switcher/index.js"),
  "utf8",
);
global.MAX_RECENT = 5;
global.LOCALE = { NO_FILE_RESULTS: "none", NO_FILES_YET: "empty" };
// "Other files" is grouped by type (groupedRows + groupFiles); the stub keeps
// the flat row list these tests read.
global.skeleton = {
  rows: (ui, list, section, empty) => ({ rows: list.map((n) => n.nid), section, empty }),
  groupedRows: (ui, groups, section, empty) => ({ rows: groups.flatMap((g) => g.items.map((n) => n.nid)), section, empty }),
  loadingRows: () => "LOADING",
};
global.groupFiles = (list) => (list.length ? [{ key: "other", label: "OTHER", items: list }] : []);
const renderLists = eval(`(${sliceFunction(SRC, "renderLists()")})`);

function panel(state) {
  const fed = {};
  return {
    fed,
    _query: "",
    _recent: [],
    _folder: [],
    _loadingOthers: false,
    ...state,
    match: () => true,
    node: () => ({ nid: 1 }),
    ensurePart(pn) {
      return Promise.resolve({ feed: (v) => { fed[pn] = v; } });
    },
  };
}

const flush = () => new Promise((r) => setImmediate(r));

test("in flight with nothing known yet: Other files shows the skeleton", async () => {
  const p = panel({ _loadingOthers: true });
  renderLists.call(p);
  await flush();
  assert.equal(p.fed["other-list"], "LOADING");
});

test("in flight with a handed-over folder: real rows, no skeleton", async () => {
  const p = panel({ _loadingOthers: true, _folder: [{ nid: 2 }] });
  renderLists.call(p);
  await flush();
  assert.deepEqual(p.fed["other-list"].rows, [2]);
});

test("loaded and empty: the empty line, not the skeleton", async () => {
  const p = panel({ _loadingOthers: false });
  renderLists.call(p);
  await flush();
  assert.deepEqual(p.fed["other-list"], { rows: [], section: "other", empty: "empty" });
});
