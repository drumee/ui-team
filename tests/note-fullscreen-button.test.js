// Note full screen (tester, 2026-10-30): in full screen the Expand button
// stayed the expand glyph. It now turns into the shrink glyph with "Exit full
// screen", following the fullscreenchange event (Esc and the browser's own
// exit included).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const NOTE = path.join(ROOT, "src/drumee/builtins/editor/blocknote");
const INDEX_SRC = fs.readFileSync(path.join(NOTE, "index.js"), "utf8");

global._ = { isFunction: (f) => typeof f === "function" };
global._a = { tooltips: "tooltips" };
global.LOCALE = { FULL_SCREEN: "Full screen", EXIT_FULLSCREEN: "Exit full screen" };
const syncFullscreenBtn = eval(`(${sliceFunction(INDEX_SRC, "_syncFullscreenBtn()")})`);

function button() {
  const btn = {
    el: { dataset: {} },
    model: {},
    icon: "ph-arrows-out-simple",
    isDestroyed: () => false,
    setIcon: (id) => (btn.icon = id),
    mset: (k, v) => (btn.model[k] = v),
    __tooltips: { content: "Full screen", el: { innerHTML: "Full screen" } },
  };
  return btn;
}

test("in full screen the button is the way out: shrink glyph, 'Exit full screen'", () => {
  const el = {};
  const btn = button();
  global.document = { fullscreenElement: el };
  syncFullscreenBtn.call({ el, __noteFullscreen: btn });
  assert.equal(btn.icon, "ph-arrows-in-simple");
  assert.equal(btn.el.dataset.fullscreen, "1");
  assert.equal(btn.model.tooltips, "Exit full screen");
  assert.equal(btn.__tooltips.el.innerHTML, "Exit full screen");
  // Out again (Esc, the X, the browser's own exit): back to Expand.
  global.document = { fullscreenElement: null };
  syncFullscreenBtn.call({ el, __noteFullscreen: btn });
  assert.equal(btn.icon, "ph-arrows-out-simple");
  assert.equal(btn.el.dataset.fullscreen, "0");
  assert.equal(btn.__tooltips.el.innerHTML, "Full screen");
});

test("another element in full screen is not this note's", () => {
  const btn = button();
  global.document = { fullscreenElement: {} };
  syncFullscreenBtn.call({ el: {}, __noteFullscreen: btn });
  assert.equal(btn.icon, "ph-arrows-out-simple");
});

test("no button (topbar not built, or gone) is not an error", () => {
  global.document = { fullscreenElement: null };
  syncFullscreenBtn.call({ el: {} });
  syncFullscreenBtn.call({ el: {}, __noteFullscreen: { el: {}, isDestroyed: () => true } });
});

test("the button follows fullscreenchange, and lets go of it on close", () => {
  assert.match(INDEX_SRC, /document\.addEventListener\("fullscreenchange", this\._onFullscreenChange\)/);
  assert.match(INDEX_SRC, /document\.removeEventListener\("fullscreenchange", this\._onFullscreenChange\)/);
});

test("the shrink glyph is in the icon sprite, as Phosphor draws it", () => {
  const sprite = fs.readFileSync(path.join(ROOT, "icons/sprites/normalized.sprite.svg"), "utf8");
  assert.match(sprite, /id="--icon-ph-arrows-in-simple"/);
  const src = fs.readFileSync(path.join(ROOT, "icons/src/normalized/ph-arrows-in-simple.svg"), "utf8");
  const phosphor = fs.readFileSync(
    path.join(ROOT, "node_modules/@phosphor-icons/core/assets/regular/arrows-in-simple.svg"),
    "utf8"
  );
  assert.equal(src.trim(), phosphor.trim());
});

test("'Exit full screen' reads like 'Full screen' (and is Spanish in Spanish)", () => {
  const en = require(path.join(ROOT, "locale/en.json"));
  assert.equal(en.EXIT_FULLSCREEN, "Exit full screen");
  const es = require(path.join(ROOT, "locale/es.json"));
  assert.notEqual(es.EXIT_FULLSCREEN, "Exit fullscreen");
});
