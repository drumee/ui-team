// folder-chat-export-overlay.test.js — the folder window's "Export chat"
// dialog must open and close WITHOUT touching the window's own collection.
//
// It used to `this.append()` a Wrapper to the window and `goodbye()` it on
// close. Both are collection updates on the window, and Marionette 4 answers an
// update with sort() → _renderChildren() over EVERY child (the default
// sortWithCollection comparator drops the add-at-end shortcut): __main was
// detached and re-attached, dom:refresh ran down the tree, and the file grid,
// the chat and the thread rail reloaded on every Download click (and again on
// close). The overlay now lives in a slot the skeleton builds with the window.
//
//   node --test tests/folder-chat-export-overlay.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const sass = require("sass");

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Wrapper: { Y: node("Wrapper.Y") } };
global._a = new Proxy({}, { get: (t, k) => k });
global._e = new Proxy({}, { get: (t, k) => k });
const _load = Module._load;
Module._load = function (r, ...a) {
  if (r === "../../skeleton/toolkit") {
    return { dialog: () => node("dialog")(), tooltips: () => node("tooltips")(), tabBar: () => node("tabBar")(), splitBody: () => node("splitBody")() };
  }
  if (r === "./topbar") return () => node("topbar")();
  return _load.call(this, r, ...a);
};

const O = require("../src/drumee/builtins/window/folder/chat-export-overlay");
const grid = require("../src/drumee/builtins/window/folder/skeleton");

const ui = (headless) => ({ fig: { family: "window-folder", group: "window" }, mget: (k) => (k === "headless" ? headless : undefined) });

test("the export slot is a Wrapper named chat-export, owned by the window", () => {
  const u = ui(1);
  const s = O.slot(u);
  assert.equal(s.type, "Wrapper.Y");
  assert.equal(s.name, "chat-export");
  assert.match(s.className, /widget-chat-export__viewport-backdrop/);
  assert.equal(s.partHandler, u);
});

test("both window shapes build the export slot with the window", () => {
  for (const headless of [1, 0]) {
    const main = grid(ui(headless));
    assert.ok(main.kids.some((k) => k && k.name === "chat-export"), `headless=${headless}`);
  }
});

function fakeWindow() {
  const wrapper = {
    el: { dataset: {} }, fed: [], cleared: 0, gone: 0,
    feed(k) { this.fed.push(k); }, clear() { this.cleared++; },
    goodbye() { this.gone++; }, suppress() { this.gone++; },
  };
  const w = {
    wrapper, appended: 0,
    append() { this.appended++; },
    ensurePart: (pn) => Promise.resolve(pn === "wrapper-chat-export" ? wrapper : null),
    _wireChatExportBackdrop() { this.wired = 1; },
  };
  return w;
}

test("mount feeds the slot; the window's collection is never touched", async () => {
  const w = fakeWindow();
  let waited;
  const r = await O.mount(w, { kind: "widget_chat_export", hub_id: "h1" }, { Kind: { waitFor: async (k) => (waited = k) } });
  assert.equal(w.appended, 0);
  assert.equal(w.wrapper.fed.at(-1).kind, "widget_chat_export");
  assert.equal(w._chatExportWrapper, w.wrapper);
  assert.equal(w.wired, 1);
  assert.equal(waited, "widget_chat_export");
  assert.equal(r, "widget_chat_export");
});

test("unmount empties the slot, never destroys it, so the next Download reuses it", async () => {
  const w = fakeWindow();
  await O.mount(w, { kind: "widget_chat_export" });
  O.unmount(w);
  assert.equal(w.wrapper.cleared, 1);
  assert.equal(w.wrapper.gone, 0, "goodbye/suppress would remove it from the window's collection");
  assert.equal(w._chatExportWrapper, null);
  await O.mount(w, { kind: "widget_chat_export", nid: "2" });
  assert.equal(w.wrapper.fed.at(-1).nid, "2");
  assert.equal(w.appended, 0);
});

// An always-mounted, fixed, full-viewport backdrop must never show (or take
// clicks) while the dialog is closed — whatever data-state it renders with.
test("skin: the backdrop is displayed only while open", () => {
  const SRC = path.join(__dirname, "..", "src/drumee");
  const css = sass
    .compile(path.join(SRC, "builtins/widget/chat-export/skin/index.scss"), { loadPaths: [SRC, path.join(SRC, "skin")], logger: sass.Logger.silent })
    .css.replace(/\s+/g, " ");
  assert.match(css, /\.widget-chat-export__viewport-backdrop:not\(\[data-state=open\]\) \{ display: none !important; \}/);
});
