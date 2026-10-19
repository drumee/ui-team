// file-panel-dock.test.js — a document docked left over its workspace stays
// beside the chat: it takes the files column, follows the splitter, and is not
// buried when the workspace pane becomes the active window.
//
//   node --test tests/file-panel-dock.test.js
//
// QA (2026-10-15, reopened): open a document from the Files view, Move &
// Resize → left, then drag the chat out to half the screen. The pane came to
// the front over the document ("mất phần file dạng panel"). Expected: the
// document stays as the files column's panel, the chat beside it.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const FOLDER_SRC = read("src/drumee/builtins/window/folder/index.js");
const PLAYER_SRC = read("src/drumee/builtins/player/interact.js");
const PLAYER_SKIN = read("src/drumee/builtins/player/skin/index.scss");

global._a = { ...(global._a || {}), hub_id: "hub_id", minimize: "minimize", option: "option" };
const WS = { width: 1424, height: 731 };
global.document = {
  fullscreenElement: null,
  querySelector: () => ({ getBoundingClientRect: () => WS }),
};
global.window = { innerWidth: 1512, innerHeight: 801 };
const snap = require("../src/drumee/builtins/window/snap.js");

function el() {
  return { dataset: {}, style: {} };
}

function player(hub = "H") {
  const css = [];
  const p = {
    isPlayer: 1,
    el: el(),
    size: { minWidth: 300, minHeight: 300 },
    applied: null,
    mget: (k) => (k === "hub_id" ? hub : null),
    style: { set(b) { p.applied = { ...b }; }, toJSON: () => ({}) },
    $el: {
      css: (v) => { css.push(v); return p.$el; },
      resizable: () => {},
      stop: () => ({ css: (v) => css.push(v), animate: (v) => css.push(v) }),
      position: () => ({ left: 0, top: 0 }),
      outerWidth: () => 800,
      outerHeight: () => 600,
    },
  };
  return p;
}

test("tiling records the side; zoom, reframe and the full preset forget it", () => {
  const p = player();
  global.Wm = { getItemsByKind: () => [] };
  snap.tileToSide(p, "left");
  assert.equal(p._tiled, "left");
  assert.equal(p.el.dataset.tiled, "left");
  p.el.dataset.filePanel = "1";
  snap.toggleZoom(p);
  assert.equal(p._tiled, null);
  assert.equal(p.el.dataset.tiled, undefined);
  assert.equal(p.el.dataset.filePanel, undefined, "no longer lifted as a panel");
  snap.tileToSide(p, "right");
  assert.equal(p._tiled, "right");
  snap.reframe(p, { left: 10, top: 10, width: 500, height: 400 });
  assert.equal(p._tiled, null);
  snap.tileToSide(p, "left");
  snap.fillWorkspace(p);
  assert.equal(p._tiled, null);
});

test("left over its workspace's files and chat, a player takes the files column", () => {
  const p = player();
  const panel = { left: 0, top: 0, width: 950, height: 731 };
  global.Wm = {
    getItemsByKind: (k) => (k === "window_folder"
      ? [{ isDestroyed: () => false, filePanelBounds: (ui) => (ui === p ? panel : null) }]
      : []),
  };
  snap.tileToSide(p, "left");
  assert.deepEqual(p.applied, panel, "the pane's files column, not half the screen");
  // Right, or no pane to dock into: half the screen, as before.
  snap.tileToSide(p, "right");
  assert.deepEqual(p.applied, { left: 712, top: 0, width: 712, height: 731 });
  global.Wm = { getItemsByKind: () => [] };
  snap.tileToSide(p, "left");
  assert.deepEqual(p.applied, { left: 0, top: 0, width: 712, height: 731 });
  // Only players dock this way; a folder window tiles itself.
  assert.equal(snap.filePanelBounds({ isPlayer: 0 }), null);
});

test("moved or resized by hand, a player is no longer tiled", () => {
  assert.match(PLAYER_SRC, /_dragStart\(e, ui\) \{\s*this\.selector\(0\);[\s\S]{0,140}snap\.markTiled\(this, null\);/);
  assert.match(PLAYER_SRC, /_resizeStart\(e, ui\) \{\s*this\.selector\(0\);\s*snap\.markTiled\(this, null\);/);
});

// ── the workspace pane ─────────────────────────────────────────────────────
const fn = (sig) => new Function(
  "showsFileGrid", "snap",
  `return ${sliceFunction(FOLDER_SRC, sig)}`,
)((t) => !t || t === "files", snap);
const filePanels = fn("_filePanels()");
const syncFilePanels = fn("_syncFilePanels()");
const filePanelBounds = fn("filePanelBounds(player)");

function rect(left, top, width, height) {
  return { getBoundingClientRect: () => ({ left, top, width, height }) };
}

function pane({ hub = "H", state = 1, view = "files", kids = [] } = {}) {
  const viewEl = {
    dataset: { view },
    querySelector: (sel) => (/__files-splitter$/.test(sel) ? { ...rect(80 + 950, 62, 12, 731) } : null),
  };
  global.Wm = { headlessLayer: { children: { toArray: () => kids } }, windowsLayer: null };
  return {
    fig: { family: "window-folder" },
    el: { isConnected: true, ...rect(80, 62, 1424, 731) },
    __folderView: { el: viewEl },
    mget: (k) => (k === "hub_id" ? hub : null),
    getState: () => state,
    _filePanels: filePanels,
  };
}

function docked(hub = "H", side = "left") {
  const p = player(hub);
  p._tiled = side;
  p.isDestroyed = () => false;
  p.el.offsetParent = rect(80, 62, 1424, 731);
  return p;
}

test("only this workspace's players tiled left are its file panels", () => {
  const mine = docked();
  const right = docked("H", "right");
  const other = docked("X");
  const folder = { ...docked(), isPlayer: 0 };
  const f = pane({ kids: [mine, right, other, folder] });
  assert.deepEqual(f._filePanels(), [mine]);
});

test("the pane active on its Files view lifts its file panel; anything else drops it", () => {
  const p = docked();
  const f = pane({ kids: [p] });
  syncFilePanels.call(f);
  assert.equal(p.el.dataset.filePanel, "1");
  f.getState = () => 0; // another window took the focus
  syncFilePanels.call(f);
  assert.equal(p.el.dataset.filePanel, undefined);
  const chat = pane({ view: "chat", kids: [p] }); // the Chat tab has no files column
  syncFilePanels.call(chat);
  assert.equal(p.el.dataset.filePanel, undefined);
});

test("a file panel spans the pane's left edge to the splitter", () => {
  const p = docked();
  const f = pane({ kids: [p] });
  assert.deepEqual(filePanelBounds.call(f, p), { left: 0, top: 0, width: 950, height: 731 });
  // Not this workspace's, not the Files view, or no room: no panel.
  assert.equal(filePanelBounds.call(f, docked("X")), null);
  assert.equal(filePanelBounds.call(pane({ view: "task" }), p), null);
});

test("the pane keeps its panels in step with its focus, its tab and its splitter", () => {
  assert.match(FOLDER_SRC, /setState\(state\) \{\s*const r = super\.setState\(state\);\s*this\._syncFilePanels\(\);/);
  assert.match(FOLDER_SRC, /view\.el\.dataset\.view = tab;\s*\/\/[^\n]*\n\s*this\._syncFilePanels\(\);/);
  assert.match(FOLDER_SRC, /view\.el\.style\.setProperty\("--files-w", `\$\{pct\}%`\);\s*this\._fitFilePanels\(\);/);
});

test("a lifted file panel stacks over the active pane, its header not faded", () => {
  assert.match(PLAYER_SKIN, /&\[data-file-panel="1"\] \{\s*z-index: 10001 !important;\s*\.player__header \{\s*opacity: 1;/);
  // After the inactive-window fade, which it has to override.
  assert.ok(PLAYER_SKIN.indexOf('&[data-file-panel="1"]') > PLAYER_SKIN.indexOf('&[data-state="0"]'));
});
