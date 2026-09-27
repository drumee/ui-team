// panel-trash-filters.test.js — the Trash panel's Latest / Earliest /
// Expiring soon filters: the value module, the chip row, where the row sits
// in the topbar, the per-filter empty state and the locale keys.
//
//   node --test tests/panel-trash-filters.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const DIR = path.join(__dirname, "..", "src/drumee/builtins/panel/trash");
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Image: { Svg: node("Image.Svg") },
  Button: { Label: node("Button.Label"), Svg: node("Button.Svg") },
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, {
  get: (t, k) => (k === "format" ? undefined : k in t ? t[k] : k),
});
String.prototype.format = String.prototype.format || function () { return String(this); };
global.SERVICE = { media: { show_bin: "media.show_bin" } };
global.Desk = {};

const F = require(path.join(DIR, "filters"));
const P = "panel-trash";
const ui = (o = {}) => ({ fig: { family: P, group: "panel" }, _filter: "latest", ...o });
const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const has = (n, c) => String(n.className || "").split(/\s+/).includes(`${P}__${c}`);

test("the three filters, latest first and default", () => {
  assert.deepEqual([...F.TRASH_FILTERS], ["latest", "earliest", "expiring"]);
  assert.equal(F.DEFAULT_FILTER, "latest");
});

test("normalizeFilter keeps known values and defaults the rest", () => {
  for (const v of F.TRASH_FILTERS) assert.equal(F.normalizeFilter(v), v);
  for (const v of [undefined, null, "", "Latest", "oldest"]) {
    assert.equal(F.normalizeFilter(v), "latest");
  }
});

test("showBinApi sends the sort with the bin request", () => {
  assert.deepEqual(F.showBinApi("expiring", "u1"), {
    service: "media.show_bin", page: 1, hub_id: "u1", sort: "expiring",
  });
  assert.equal(F.showBinApi("junk", "u1").sort, "latest");
});

test("chip row: one chip per filter, wired to trash-filter", () => {
  const u = ui();
  const row = require(path.join(DIR, "skeleton/filters"))(u);
  assert.ok(has(row, "filters"));
  const chips = walk(row).filter((n) => has(n, "filter"));
  assert.deepEqual(chips.map((c) => c.name), ["latest", "earliest", "expiring"]);
  for (const c of chips) {
    assert.equal(c.service, "trash-filter");
    assert.equal(c.uiHandler, u);
    assert.ok(has(c, `filter--${c.name}`));
  }
  assert.deepEqual(chips.map((c) => c.content),
    [en.TRASH_FILTER_LATEST, en.TRASH_FILTER_EARLIEST, en.TRASH_FILTER_EXPIRING]);
});

test("chips sit in the topbar but OUTSIDE the status bar (hidden when empty)", () => {
  const top = require(path.join(DIR, "skeleton/topbar"))(ui());
  const filters = walk(top).find((n) => has(n, "filters"));
  assert.ok(filters, "topbar carries the filter row");
  const status = walk(top).find((n) => has(n, "status-bar"));
  assert.ok(!walk(status).some((n) => has(n, "filters")));
});

test("empty state names the filter when Expiring soon finds nothing", () => {
  const ph = require(path.join(DIR, "skeleton/placeholder"));
  const text = (u) => walk(ph(u)).filter((n) => n.type === "Note").map((n) => n.content);
  assert.ok(text(ui({ _filter: "expiring" })).includes(en.TRASH_EXPIRING_EMPTY_TITLE));
  assert.ok(text(ui({ _filter: "expiring" })).includes(en.TRASH_EXPIRING_EMPTY_HINT));
  for (const f of ["latest", "earliest"]) {
    assert.ok(text(ui({ _filter: f })).includes(en.NOTHING_IN_TRASH));
  }
});

const KEYS = ["TRASH_FILTER_LATEST", "TRASH_FILTER_EARLIEST", "TRASH_FILTER_EXPIRING",
  "TRASH_EXPIRING_EMPTY_TITLE", "TRASH_EXPIRING_EMPTY_HINT"];
for (const lang of ["en", "es", "fr", "km", "ru", "zh"]) {
  test(`${lang}.json carries the trash filter keys`, () => {
    const t = require(path.join(__dirname, "..", "locale", `${lang}.json`));
    for (const k of KEYS) {
      assert.equal(typeof t[k], "string", `${lang}: missing ${k}`);
      assert.ok(t[k].trim(), `${lang}: empty ${k}`);
    }
  });
}
