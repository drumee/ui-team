// media-contextmenu-selection-menu.test.js — the right-click menu of a
// multi-selection.
//
//   node --test tests/media-contextmenu-selection-menu.test.js
//
// Right-clicking one of several selected rows (media-row__container) keeps the
// selection (media/row onToggle), and the menu offers only what acts on all of
// it: Download · Make a copy, Organize, Move to trash. "Make a copy" used to
// copy the right-clicked row only. Runs the real media/core and media/interact
// methods against stubs.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const read = (f) => fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/media", f), "utf8")
  .replace(/\r\n/g, "\n");
const CORE = read("core.js");
const INTERACT = read("interact.js");

const _a = { download: "download", trash: "trash", separator: "separator", status: "status", deleted: "deleted" };
const win = { Wm: null };
const load = (src, sig) => new Function("_", "_a", "window", `return ${sliceFunction(src, sig)}`)(_, _a, win);
const methods = {
  _menuSelection: load(CORE, "_menuSelection()"),
  contextmenuItemsForSelection: load(CORE, "contextmenuItemsForSelection(selection)"),
  _duplicateFromMenu: load(INTERACT, "async _duplicateFromMenu()"),
};

function media(name, { edit = true, download = true, remove = true, status } = {}) {
  return {
    ...methods,
    name,
    copied: 0,
    mget: (k) => (k === "status" ? status : undefined),
    canOrganize: () => edit,
    isMediaOwner: () => false,
    canDownload: () => download,
    canRemove: () => remove,
    async duplicateInPlace() {
      this.copied++;
      // As the real one: a copy ends by clearing the selection.
      selection.length = 0;
    },
  };
}
let selection = [];
win.Wm = { getGlobalSelection: () => selection.slice() };

const menuOf = (m) => {
  const sel = m._menuSelection();
  return sel.length > 1 ? m.contextmenuItemsForSelection(sel) : null;
};

test("one of several selected rows: Download, Make a copy, Organize, Move to trash", () => {
  const a = media("a");
  const b = media("b");
  selection = [a, b];
  assert.deepEqual(menuOf(a), ["download", "makeACopy", "separator", "organize", "separator", "trash"]);
});

test("a lone row, or a row outside the selection, keeps its own menu", () => {
  const a = media("a");
  const b = media("b");
  const c = media("c");
  selection = [a];
  assert.equal(menuOf(a), null);
  selection = [a, b];
  assert.equal(menuOf(c), null);
});

test("a row is offered only when every selected item allows it", () => {
  const a = media("a");
  const shared = media("s", { edit: false, download: true, remove: false });
  selection = [a, shared];
  assert.deepEqual(menuOf(a), ["download"]);
  const viewOnly = media("v", { edit: false, download: false, remove: true });
  selection = [a, viewOnly];
  assert.deepEqual(menuOf(a), ["trash"]);
});

test("the trash panel keeps its own rows", () => {
  const a = media("a", { status: "deleted" });
  const b = media("b", { status: "deleted" });
  selection = [a, b];
  assert.equal(menuOf(a), null);
});

test("Make a copy copies every selected item, though each copy clears the selection", async () => {
  const a = media("a");
  const b = media("b");
  const c = media("c");
  selection = [a, b, c];
  await b._duplicateFromMenu();
  assert.deepEqual([a.copied, b.copied, c.copied], [1, 1, 1]);
});

test("Make a copy on a lone row copies that row", async () => {
  const a = media("a");
  const b = media("b");
  selection = [a];
  await b._duplicateFromMenu();
  assert.deepEqual([a.copied, b.copied], [0, 1]);
});
