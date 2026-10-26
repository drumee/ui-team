// tests/tasks-subtask-menu-dismiss.test.js — a click outside a subtask chip
// menu (Priority / Status / assignee) closes it.
//
//   node --test tests/tasks-subtask-menu-dismiss.test.js
//
// Runs the REAL panel methods, sliced out of index.js, against a stub `this`
// and a stub document (no DOM library in this repo).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/tasks/index.js"),
  "utf8",
);
const method = (sig) => new Function(`return ${sliceFunction(SRC, sig)}`)();

const listeners = new Set();
global.document = {
  addEventListener: (type, fn, capture) => {
    assert.equal(type, "click");
    assert.equal(capture, true);
    listeners.add(fn);
  },
  removeEventListener: (_type, fn) => listeners.delete(fn),
};
const click = (target) => [...listeners].forEach((fn) => fn({ target }));

// A node knows the selectors it (or an ancestor) matches, its parent and attrs.
function node(classes = [], parent = null) {
  const attrs = {};
  const n = {
    classes,
    parentElement: parent,
    style: {},
    attrs,
    setAttribute: (k, v) => (attrs[k] = v),
    closest(sel) {
      const want = sel.split(",").map((s) => s.trim());
      for (let cur = n; cur; cur = cur.parentElement) {
        if (want.some((w) => (w === "[data-open]" ? "data-open" in cur.attrs : cur.classes.includes(w.slice(1))))) {
          return cur;
        }
      }
      return null;
    },
  };
  return n;
}

function makePanel() {
  const pfx = "tasks-panel";
  const root = node(["root"]);
  const chip = node([`${pfx}__subtask-chip`], root);
  chip.attrs["data-open"] = "1";
  const menu = node([`${pfx}__subtask-menu`], chip);
  const item = node([`${pfx}__subtask-menu-item`], menu);
  const title = node([`${pfx}__subtask-card-title`], root);
  const inPanel = new Set([root, chip, menu, item, title]);
  const p = {
    fig: { family: pfx },
    isDestroyed: () => false,
    el: {
      contains: (x) => inPanel.has(x),
      querySelectorAll: () => [menu],
    },
    _subtaskDraft: { menu: "priority" },
    _subtaskRowMenu: null,
    _createSubtaskDraft: null,
    _createSubtaskRowMenu: null,
    nodes: { chip, menu, item, title },
  };
  for (const sig of [
    "_anySubtaskMenuOpen()",
    "_bindSubtaskMenuDismiss()",
    "_unbindSubtaskMenuDismiss()",
    "_closeSubtaskMenus()",
  ]) {
    const fn = method(sig);
    p[fn.name] = fn;
  }
  return p;
}

test("a click outside the panel closes the open menu and unbinds", () => {
  listeners.clear();
  const p = makePanel();
  p._bindSubtaskMenuDismiss();
  assert.equal(listeners.size, 1);
  click(node(["elsewhere"]));
  assert.equal(p._subtaskDraft.menu, null);
  assert.equal(p.nodes.menu.style.display, "none");
  assert.equal(p.nodes.chip.attrs["data-open"], "0");
  assert.equal(listeners.size, 0);
});

test("a click on the card's title (inside the panel, not a menu) closes it too", () => {
  listeners.clear();
  const p = makePanel();
  p._bindSubtaskMenuDismiss();
  click(p.nodes.title);
  assert.equal(p._subtaskDraft.menu, null);
});

test("clicks on a menu item or on the chip are left to their own handlers", () => {
  listeners.clear();
  const p = makePanel();
  p._bindSubtaskMenuDismiss();
  click(p.nodes.item);
  click(p.nodes.chip);
  assert.equal(p._subtaskDraft.menu, "priority");
  assert.equal(p.nodes.menu.style.display, undefined);
  assert.equal(listeners.size, 1);
});

test("a row menu (either scope) closes the same way; binding twice adds one listener", () => {
  listeners.clear();
  const p = makePanel();
  p._subtaskDraft = null;
  p._createSubtaskRowMenu = { id: "t1", kind: "status" };
  p._bindSubtaskMenuDismiss();
  p._bindSubtaskMenuDismiss();
  assert.equal(listeners.size, 1);
  click(node(["elsewhere"]));
  assert.equal(p._createSubtaskRowMenu, null);
});

test("nothing open any more → the next click just unbinds", () => {
  listeners.clear();
  const p = makePanel();
  p._bindSubtaskMenuDismiss();
  p._subtaskDraft.menu = null; // closed by a pick
  click(node(["elsewhere"]));
  assert.equal(listeners.size, 0);
  assert.equal(p.nodes.menu.style.display, undefined);
});

test("each toggle case binds the dismiss and closes the sibling menu", () => {
  const body = (c) => SRC.slice(SRC.indexOf(`case "${c}": {`), SRC.indexOf("}\n\n", SRC.indexOf(`case "${c}": {`)));
  for (const c of [
    "toggle-subtask-menu",
    "toggle-subtask-row-menu",
    "toggle-create-subtask-menu",
    "toggle-create-subtask-row-menu",
  ]) {
    assert.match(body(c), /this\._bindSubtaskMenuDismiss\(\)/, c);
  }
  assert.match(body("toggle-subtask-menu"), /this\._subtaskRowMenu = null/);
  assert.match(body("toggle-subtask-row-menu"), /this\._subtaskDraft\.menu = null/);
  assert.match(body("toggle-create-subtask-menu"), /this\._createSubtaskRowMenu = null/);
  assert.match(body("toggle-create-subtask-row-menu"), /this\._createSubtaskDraft\.menu = null/);
  assert.match(SRC, /this\._unbindSubtaskMenuDismiss\(\);\n    \/\/ Parts/);
});
