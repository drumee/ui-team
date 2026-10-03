// folder-files-search-wiring.test.js — the folder window delegates its
// toolbar search and Files-list loading to ./files-search and ./icons-loading.
// folder/index.js cannot be loaded under node, so this pins the wiring on its
// source (same approach as tests/chat-topic-scope.test.js).
//
//   node --test tests/folder-files-search-wiring.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/window/folder/index.js"), "utf8");
const method = (name) => {
  const i = src.indexOf(`\n  ${name}(`);
  assert.ok(i >= 0, `missing method ${name}`);
  return src.slice(i, src.indexOf("\n  }\n", i));
};

test("getCurrentApi answers {} while searching, only for the dynamic (untyped) call", () => {
  const m = method("getCurrentApi");
  assert.match(m, /type == null && FilesSearch\.isSearching\(this\)\) return \{\}/);
  assert.match(m, /super\.getCurrentApi\(type\)/);
});

test("loadContent defers to search, and begins the skeleton after restart", () => {
  const m = method("loadContent");
  assert.match(m, /if \(FilesSearch\.onLoadContent\(this\)\) return;/);
  assert.ok(m.indexOf("l.restart()") < m.indexOf("IconsLoading.begin(this, l)"), "begin must follow restart");
});

test("the list part re-runs an active search and covers its own first load", () => {
  const i = src.indexOf("if (pn === _a.list) {");
  const block = src.slice(i, src.indexOf("\n    }\n", i));
  assert.match(block, /if \(FilesSearch\.onListReady\(this, child\)\) return;/);
  assert.match(block, /IconsLoading\.begin\(this, child\);/);
  assert.match(block, /child\._started \|\| child\._end_of_data\) IconsLoading\.end\(this\)/);
});

test("events: typed → onTyped; a type tab leaves the search; teardown", () => {
  assert.match(src, /case "ws-search-typed":\s*return FilesSearch\.onTyped\(this, \(args && args\.value\) \|\| ""\);/);
  const f = src.slice(src.indexOf('case "filter-by-type": {'));
  assert.ok(f.indexOf("FilesSearch.exit(this, { reload: false, clearInput: true })") < f.indexOf("this._filterType ="));
  assert.match(method("onBeforeDestroy"), /FilesSearch\.teardown\(this\)/);
});

test("the dropdown code is gone", () => {
  for (const gone of ["_runWorkspaceSearch", "_wsSearchRows", "_showWorkspaceSearch", "_openWorkspaceSearchPanel", "_hideWorkspaceSearch", "_teardownWorkspaceSearch", "_openWorkspaceSearchHit", "WS_SEARCH_", "ws-search-hit", "ws-search-suggestions", "ws-search-results", "_wsSearchPanel", "_wsSearchResults"]) {
    assert.ok(!src.includes(gone), `still present: ${gone}`);
  }
  assert.match(src, /focusWorkspaceSearch\(\) \{/);
});
