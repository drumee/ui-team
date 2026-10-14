// The phone mock chrome every step's phone screens are built from.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const Module = require("node:module");
const baseLoad = Module._load;
Module._load = function (r, p, m) {
  if (/^assets\//.test(r)) return `asset:${r}`; // webpack asset modules
  return baseLoad.call(this, r, p, m);
};
const node = (type) => (o = {}) => ({ type, ...o });
global.Skeletons = {
  Box: { X: node("X"), Y: node("Y") }, Note: node("Note"),
  Image: { Svg: node("Svg") }, Element: node("El"), UserProfile: node("UserProfile"),
};
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
const ph = require(path.join(SRC, "modules/desk/tutorial/skeleton/toolkit/phone.js"));
test.after(() => { Module._load = baseLoad; delete global.Skeletons; delete global.LOCALE; });

const ui = { fig: { family: "tutorial-chat", group: "tutorial" } };
const find = (t, pn) => {
  if (!t || typeof t !== "object") return null;
  if (t.sys_pn === pn) return t;
  for (const k of t.kids || []) { const r = find(k, pn); if (r) return r; }
  return null;
};

test("tabBar marks the active tab and names every tab", () => {
  const t = ph.tabBar(ui, "chat");
  for (const k of ["files", "chat", "task", "meet"]) assert.ok(find(t, `ph-tab-${k}`), k);
  assert.equal(find(t, "ph-tab-chat").dataset.active, "1");
  assert.equal(find(t, "ph-tab-files").dataset.active, "0");
});

test("tabBar(null) is the pre-workspace search pill", () => {
  const t = ph.tabBar(ui, null);
  assert.equal(find(t, "ph-tab-chat"), null);
  assert.ok(find(t, "ph-search"));
});

test("hero exposes the CTA with its service, routed to the step", () => {
  const h = ph.hero(ui, { title: "T", desc: "D", cta: "Go", cta_service: "next-step", deck: null });
  assert.equal(find(h, "ph-cta").service, "next-step");
  assert.deepEqual(find(h, "ph-cta").uiHandler, [ui]);
});

test("swipeDeck renders one dot per card and lights the index", () => {
  const d = ph.swipeDeck(ui, { cards: [{}, {}, {}], index: 1, dots: true });
  const dots = find(d, "ph-dots").kids;
  assert.equal(dots.length, 3);
  assert.equal(dots[1].dataset.active, "1");
  assert.equal(dots[0].dataset.active, "0");
});

test("swipeDeck clamps a nonsense index", () => {
  const d = ph.swipeDeck(ui, { cards: [{}, {}], index: 9 });
  assert.equal(find(d, "ph-dots").kids[1].dataset.active, "1");
});

test("screen stacks status pad, top, body, bottom", () => {
  const s = ph.screen(ui, { top: { k: "top" }, body: [{ k: "b" }], bottom: { k: "bot" } });
  assert.ok(find(s, "ph-body"));
  assert.ok(s.className.includes("tutorial-phone"));
  assert.ok(s.className.includes("tutorial-chat__phone"));
});

test("composer exposes the + and the field", () => {
  const c = ph.composer(ui);
  assert.ok(find(c, "ph-composer-plus"));
  assert.ok(find(c, "ph-composer"));
});

test("chrome is inert scenery (active: 0) except the CTA", () => {
  const walk = (t, out = []) => {
    if (!t || typeof t !== "object") return out;
    if (t.active !== 0) out.push(t.sys_pn || t.className);
    for (const k of t.kids || []) walk(k, out);
    return out;
  };
  const s = ph.screen(ui, {
    top: ph.topBar(ui, { title: "W" }),
    body: [ph.hero(ui, { title: "T", desc: "D", cta: "Go", cta_service: "next-step" })],
    bottom: ph.tabBar(ui, "files"),
    fab: ph.fab(ui),
  });
  assert.deepEqual(walk(s), ["ph-cta"]);
});

test("phone skin compiles into the tour skin", () => {
  const css = sass.compile(path.join(SRC, "modules/desk/tutorial/skin/index.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\.tutorial-phone__tab\[data-active="1"\] \{[^}]*background: #eeedff/);
  assert.match(css, /\.tutorial-phone__fab \{[^}]*background: #5950ff/);
});

test("fab can be made live (a step's own control)", () => {
  const f = ph.fab(ui, { service: "mg-toggle-menu", menu: "fab" });
  assert.equal(f.service, "mg-toggle-menu");
  assert.deepEqual(f.uiHandler, [ui]);
  assert.notEqual(f.active, 0);
  assert.equal(f.dataset.menu, "fab");
  assert.equal(ph.fab(ui).active, 0, "inert by default");
});

test("syncDeck: dots follow a native swipe, and it cleans up", () => {
  const handlers = {};
  const deck = {
    scrollLeft: 0, clientWidth: 300,
    addEventListener: (n, f) => { handlers[n] = f; },
    removeEventListener: (n) => { delete handlers[n]; },
  };
  const dots = { children: [{ dataset: {} }, { dataset: {} }, { dataset: {} }] };
  const seen = [];
  const off = ph.syncDeck(deck, dots, (i) => seen.push(i));
  deck.scrollLeft = 610; // past the middle of card 2
  handlers.scroll();
  assert.deepEqual(seen, [2]);
  assert.deepEqual(dots.children.map((d) => d.dataset.active), ["0", "0", "1"]);
  off();
  assert.equal(handlers.scroll, undefined);
});
