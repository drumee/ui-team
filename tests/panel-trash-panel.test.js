// panel-trash-panel.test.js — the Trash panel's filter wiring: the REAL panel
// class (builtins/panel/trash) on a stub base, plus its compiled skin.
//
//   node --test tests/panel-trash-panel.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const DIR = path.join(SRC, "builtins/panel/trash");

// Like the real mount: the desk feeds { kind } and ui-core stamps data-* from
// the model, so opt.dataset edits made in initialize() never reach the element.
class StubBase {
  initialize(opt) { this.opt = opt; this.el = { dataset: {} }; this.fed = []; }
  declareHandlers() { }
  mset() { }
  feed(x) { this.fed.push(x); }
  isDestroyed() { return false; }
  ensurePart(name) { return Promise.resolve(this.parts[name]); }
}
// Webpack-alias / widget requests node cannot resolve. './skeleton' is
// stubbed so a feed records which filter it was built with.
const STUBS = {
  "../../window/utils": StubBase,
  "@drumee/ui-essentials": { filesize: (n) => `${n}` },
  "./skin": {},
  "libs/desk-canvas": { trackDeskCanvas: () => () => { } },
  "libs/items-ready": { armItemsReady: (w) => w, markItemsReady: () => { } },
  "./item/group": { markDayGroups: (root) => { STUBS.marked.push(root); } },
  marked: [],
  "./skeleton": (ui) => ({ skeleton: true, filter: ui._filter }),
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};

const debounce = (fn) => {
  const d = (...a) => { d.calls = (d.calls || 0) + 1; return fn(...a); };
  d.cancelled = 0;
  d.cancel = () => { d.cancelled++; };
  d.flush = () => { };
  return d;
};
Object.assign(global, {
  _: { debounce },
  _a: { name: "name", service: "service", list: "list", kind: "kind", nid: "nid" },
  _e: { click: "click" },
  _K: { privilege: { owner: 63 } },
  LOCALE: { TRASH: "Trash" },
  SERVICE: { media: { show_bin: "media.show_bin" } },
  Visitor: { id: "u1" },
  window: {},
});

const Panel = require(DIR);

test.after(() => {
  Module._load = load;
  for (const k of ["_", "_a", "_e", "_K", "LOCALE", "SERVICE", "Visitor", "window"]) delete global[k];
});

const panel = () => {
  const p = Object.create(Panel.prototype);
  p.initialize({});
  p.parts = {};
  return p;
};
const chip = (value) => ({
  get: (k) => ({ service: "trash-filter", name: value })[k],
  mget: (k) => ({ service: "trash-filter", name: value })[k],
});

test("opens on Latest deleted, stamped on the root", () => {
  const p = panel();
  assert.equal(p._filter, "latest");
  assert.equal(p.el.dataset.filter, "latest");
});

test("the bin request carries the current filter as sort", () => {
  const p = panel();
  assert.deepEqual(p.getCurrentApi(), {
    service: "media.show_bin", page: 1, hub_id: "u1", sort: "latest",
  });
});

test("a chip switches the filter, restamps the root and re-feeds once", () => {
  const p = panel();
  p._pendingWsRefresh = true;
  p._staleWhileParked = true;
  p.onUiEvent(chip("expiring"));
  assert.equal(p._filter, "expiring");
  assert.equal(p.el.dataset.filter, "expiring");
  assert.deepEqual(p.fed, [{ skeleton: true, filter: "expiring" }]);
  assert.equal(p.getCurrentApi().sort, "expiring");
});

test("switching drops a queued or held echo reload (no second, stale fetch)", () => {
  const p = panel();
  p._pendingWsRefresh = true;
  p._staleWhileParked = true;
  p.onUiEvent(chip("earliest"));
  assert.equal(p._wsRefresh.cancelled, 1);
  assert.equal(p._pendingWsRefresh, false);
  assert.equal(p._staleWhileParked, false);
});

test("leaving an empty Expiring soon keeps the chip row until the new list lands", () => {
  const p = panel();
  p.onUiEvent(chip("expiring"));
  p.el.dataset.empty = 1;
  p.onUiEvent(chip("latest"));
  assert.notEqual(`${p.el.dataset.empty}`, "1");
});

test("the active chip, or an unknown value, changes nothing", () => {
  const p = panel();
  p.onUiEvent(chip("latest"));
  p.onUiEvent(chip("bogus"));
  assert.deepEqual(p.fed, []);
  assert.equal(p._filter, "latest");
});

const css = sass
  .compile(path.join(DIR, "skin/index.scss"), { loadPaths: [SRC, path.join(SRC, "skin")] })
  .css.replace(/\s+/g, " ");

// Every rule as { selectors: [...], body }, so a selector is found whether
// sass emitted it alone or grouped with others.
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, sel, body]) => ({ selectors: sel.split(",").map((x) => x.trim()), body }));
const declares = (selector, decl) =>
  rules.some((r) => r.selectors.includes(selector) && r.body.includes(decl));

test("after a row leaves, the day groups are re-marked on what remains", async () => {
  const p = panel();
  const listEl = { tag: "list" };
  p.parts.list = { el: listEl, collection: { filter: () => [{}], length: 1 } };
  p.getPart = (n) => p.parts[n];
  STUBS.marked.length = 0;
  await p._updateItemsCount();
  assert.deepEqual(STUBS.marked, [listEl]);
  assert.equal(`${p.el.dataset.empty}`, "0");
});

test("regroup walks the list element; rows and list events ask for it", () => {
  const p = panel();
  const listEl = { tag: "list" };
  const handlers = {};
  const list = {
    el: listEl,
    on: (evts, fn) => evts.split(" ").forEach((e) => (handlers[e] = fn)),
    once: () => { },
  };
  p.getPart = () => list;
  p.onPartReady(list, "list");
  STUBS.marked.length = 0;
  handlers["render:children"]();
  handlers["remove:child"]();
  p.regroupSoon();
  assert.deepEqual(STUBS.marked, [listEl, listEl, listEl]);
});

test("the panel is the design's 512px card", () => {
  assert.ok(declares(".panel-trash__ui", "width: 512px"));
});

test("Empty trash hides only when the whole bin is empty", () => {
  assert.ok(declares('.panel-trash__ui[data-empty="1"]:not([data-filter=expiring]) .panel-trash__empty-trash', "display: none"));
  assert.doesNotMatch(css, /data-empty[^{]*(filter-menu|filter-trigger)/);
});

test("the row matching data-filter is lit and ticked", () => {
  for (const f of ["latest", "earliest", "expiring"]) {
    const row = `.panel-trash__ui[data-filter=${f}] .panel-trash__filter--${f}`;
    assert.ok(declares(row, "color: var(--active-border)"), `${f} row not lit`);
    assert.ok(declares(`${row} .panel-trash__filter-check`, "visibility: visible"), `${f} row not ticked`);
  }
  assert.ok(declares(".panel-trash__filter-check", "visibility: hidden"));
});

test("Empty trash answers the pointer like the row bin, without moving the header", () => {
  const h = ".panel-trash__empty-trash:hover";
  assert.ok(declares(h, "background-color: rgba(255, 106, 101, 0.15)"));
  assert.ok(declares(h, "box-shadow: 0 0 0 6px rgba(255, 106, 101, 0.15)"));
  assert.ok(declares(`${h} .panel-trash__empty-trash-label`, "color: var(--signal-error)"));
  assert.ok(!declares(h, "opacity"));
});
