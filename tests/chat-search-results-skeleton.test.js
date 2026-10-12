// chat-search-results-skeleton.test.js — chat-header search result rows.
//
//   node --test tests/chat-search-results-skeleton.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const node = (kind) => (o = {}) => ({ kind, ...o });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Element: node("Element"),
};
global.LOCALE = new Proxy({}, { get: (t, k) => k });
global.Dayjs = { unix: () => ({ fromNow: () => "now" }) };

const { searchResults, searchResultsLoading } = require("../src/drumee/builtins/window/skeleton/toolkit/search-results");
const ui = { fig: { group: "window" } };
const flat = (d, out = []) => {
  out.push(d);
  for (const k of d.kids || []) if (k) flat(k, out);
  return out;
};
const byClass = (tree, cls) => tree.flatMap((d) => flat(d)).filter((d) => d.className === cls);

test("a filename hit shows the matched filename under the preview", () => {
  const tree = searchResults(ui, [
    { message_id: "m2", fullname: "Ann Lee", ctime: 1, preview: "", match_filename: "Q3 Budget" },
  ]);
  const files = byClass(tree, "window__search-result-file");
  assert.equal(files.length, 1);
  assert.equal(files[0].content, "Q3 Budget");
  assert.equal(files[0].active, 0);
  const row = byClass(tree, "window__search-result")[0];
  assert.equal(row.service, "search-result-jump");
  assert.equal(row.message_id, "m2");
});

test("a text hit has no filename line; no rows → No results", () => {
  const tree = searchResults(ui, [{ message_id: "m1", fullname: "Ann", ctime: 1, preview: "the budget", match_filename: null }]);
  assert.equal(byClass(tree, "window__search-result-file").length, 0);
  const empty = searchResults(ui, []);
  assert.equal(empty[0].className, "window__search-results-empty");
});

test("loading: the label + placeholder rows shaped like results, hidden from screen readers", () => {
  const tree = searchResultsLoading(ui);
  assert.equal(tree[0].className, "window__search-results-label");
  const ph = tree[1];
  assert.equal(ph.kind, "Element");
  assert.equal(ph.className, "window__search-results-loading");
  assert.match(ph.content, /^<div aria-hidden="true">/);
  // one placeholder per row: name, time and preview bars like a real result
  assert.equal((ph.content.match(/window__search-result-ph"/g) || []).length, 3);
  // name + time on top, two preview lines under them
  for (const [bar, n] of [["ph-name", 3], ["ph-time", 3], ["ph-preview", 6]]) {
    assert.equal((ph.content.match(new RegExp(`window__search-result-${bar}"`, "g")) || []).length, n, bar);
  }
});
