// panel-trash-filters.test.js — the Trash panel's Latest / Earliest /
// Expiring soon filters: the value module, the filter dropdown, where it sits
// in the header, the per-filter empty state and the locale keys.
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
  Menu: node("Menu"),
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
global._a = { down: "down", once: "once" };
global._e = { click: "click" };

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

test("filter dropdown: a click-opened menu that closes on a pick", () => {
  const menu = require(path.join(DIR, "skeleton/filters"))(ui());
  assert.equal(menu.type, "Menu");
  assert.ok(has(menu, "filter-menu"));
  assert.equal(menu.opening, "click");
  assert.equal(menu.direction, "down");
  assert.equal(menu.persistence, "once");
  // ui-core falls back to a 2000 s gsap open when duration is left out.
  assert.ok(menu.duration > 0 && menu.duration < 1);
});

test("trigger names the current filter and is the one clickable node", () => {
  for (const [f, key] of [["latest", "TRASH_FILTER_LATEST"], ["expiring", "TRASH_FILTER_EXPIRING"]]) {
    const { trigger } = require(path.join(DIR, "skeleton/filters"))(ui({ _filter: f }));
    assert.ok(has(trigger, "filter-trigger"));
    // A trigger must raise an event, or the menu never opens.
    assert.equal(typeof trigger.service, "string");
    assert.ok(walk(trigger).some((n) => n.content === en[key]));
    // Any live child eats the click before the menu sees it.
    for (const k of walk(trigger).slice(1)) assert.equal(k.active, 0);
  }
});

test("one menu row per filter, wired to trash-filter on the panel", () => {
  const u = ui();
  const { items } = require(path.join(DIR, "skeleton/filters"))(u);
  const rows = walk(items).filter((n) => has(n, "filter"));
  assert.deepEqual(rows.map((r) => r.name), ["latest", "earliest", "expiring"]);
  for (const r of rows) {
    assert.equal(r.service, "trash-filter");
    assert.deepEqual([].concat(r.uiHandler), [u]);
    assert.notEqual(r.active, 0);
    assert.ok(has(r, `filter--${r.name}`));
    assert.ok(walk(r).some((n) => has(n, "filter-check")), "row carries its tick");
  }
  assert.deepEqual(rows.map((r) => walk(r).find((n) => n.type === "Note").content),
    [en.TRASH_FILTER_LATEST, en.TRASH_FILTER_EARLIEST, en.TRASH_FILTER_EXPIRING]);
});

test("the dropdown sits in the header, right before the close button", () => {
  const top = require(path.join(DIR, "skeleton/topbar"))(ui());
  const header = walk(top).find((n) => has(n, "header"));
  const actions = walk(header).find((n) => has(n, "header-actions"));
  assert.ok(actions, "header carries an actions group");
  assert.equal(actions.kids.length, 2);
  assert.ok(has(actions.kids[0], "filter-menu"));
  assert.equal(actions.kids[1].service, "toggle-trash");
  // Nothing filter-related is left in the status bar (hidden when empty).
  const status = walk(top).find((n) => has(n, "status-bar"));
  assert.ok(!walk(status).some((n) => has(n, "filter-menu") || has(n, "filters")));
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
