// tests/page-fade-click-outside.test.js — every modal on the "page fade"
// backdrop (no scrim; the page behind at 20%) closes on a click outside it:
// the Personal Calendar's task / meeting / invite-link / quick-open /
// meeting-info cards and the post-Checkout result card. "Outside" is the
// backdrop itself, pressed AND released there.
//
//   node --test tests/page-fade-click-outside.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const CAL_SRC = read("src/drumee/builtins/panel/calendar/index.js");
const RESULT_SRC = read("src/drumee/builtins/widget/settings/account/billing/result/index.js");

global._ = { isFunction: (f) => typeof f === "function" };

// A minimal DOM: nodes with parent links, classList, contains, closest.
function node(className = "", parent = null) {
  const n = {
    className, parent, children: [],
    classList: { contains: (c) => n.className.split(/\s+/).includes(c) },
    contains(o) { for (let x = o; x; x = x.parent) if (x === n) return true; return false; },
    closest(sel) {
      const cs = sel.split(",").map((t) => t.trim().replace(/^\./, ""));
      for (let x = n; x; x = x.parent) if (cs.some((c) => x.classList.contains(c))) return x;
      return null;
    },
    querySelector(sel) {
      const c = sel.replace(/^\./, "");
      const walk = (x) => { for (const k of x.children) { if (k.classList.contains(c) || (sel === '[data-loading="1"]' && k.loading)) return k; const r = walk(k); if (r) return r; } return null; };
      return walk(n);
    },
    querySelectorAll() { return []; },
  };
  if (parent) parent.children.push(n);
  return n;
}

function fakeDocument() {
  const h = {};
  global.document = {
    addEventListener: (ev, fn) => { h[ev] = fn; },
    removeEventListener: (ev) => { delete h[ev]; },
  };
  return {
    press: (t) => { h.pointerdown({ target: t }); h.click({ target: t }); },
    drag: (from, to) => { h.pointerdown({ target: from }); h.click({ target: to }); },
    bound: () => Object.keys(h).sort(),
  };
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function calendar(kind) {
  const doc = fakeDocument();
  const page = node("calendar-main__page");
  const wrapper = node("calendar-main__modal-wrapper", page);
  const modal = node("calendar-main__modal", wrapper);
  const field = node("calendar-main__field", modal);
  const backdrop = node("tasks-panel__detail-backdrop", modal);
  const outsideEl = node("flatpickr-calendar");     // a picker portalled to <body>
  const topbar = node("desk-module__topbar");
  const topIcon = node("desk-module__utility-icon", topbar);
  const sidebar = node("desk-module-sidebar__main");
  const railItem = node("desk-module-sidebar__item", sidebar);
  const log = [];
  const self = {
    fig: { family: "calendar-main" },
    el: page,
    _form: { kind },
    _modalEl: () => modal,
    _cancelForm: () => log.push("cancel"),
    _syncSubtaskMenuDismiss() {}, _renderSubtasks() {},
  };
  new Function(`return (${sliceFunction(CAL_SRC, "_installBackdropDismiss()")});`)().call(self);
  return { doc, wrapper, modal, field, backdrop, outsideEl, topbar, topIcon, sidebar, railItem, log, self };
}

for (const kind of ["task", "meeting", "invite-link", "meeting-info"]) {
  test(`calendar ${kind}: a click on the backdrop closes it through its cancel path`, () => {
    const c = calendar(kind);
    c.doc.press(c.wrapper);
    assert.deepEqual(c.log, ["cancel"]);
  });
}

test("calendar: a click inside the card, or anywhere that is not the backdrop, closes nothing", () => {
  const c = calendar("task");
  c.doc.press(c.field);
  c.doc.press(c.modal);       // the card itself (not a quick-open card)
  c.doc.press(c.outsideEl);   // a body-portalled picker
  assert.deepEqual(c.log, []);
});

test("calendar: a selection dragged from the card out onto the backdrop does not close it", () => {
  const c = calendar("task");
  c.doc.drag(c.field, c.wrapper);
  assert.deepEqual(c.log, []);
});

test("calendar quick-open: its full-page __modal and the board's detail backdrop count as outside", () => {
  const c = calendar("task-quick-open");
  c.doc.press(c.modal);
  c.doc.press(c.backdrop);
  assert.deepEqual(c.log, ["cancel", "cancel"]);
});

test("calendar: an open subtask menu is closed first, like Escape", () => {
  const c = calendar("task");
  c.self._form.subMenu = { id: 1 };
  c.doc.press(c.wrapper);
  assert.equal(c.self._form.subMenu, null);
  assert.deepEqual(c.log, []);
});

test("calendar: no form open → nothing", () => {
  const c = calendar("task");
  c.self._form = null;
  c.doc.press(c.wrapper);
  assert.deepEqual(c.log, []);
});

test("calendar: Escape and the backdrop share _cancelForm", () => {
  assert.match(sliceFunction(CAL_SRC, "_installFormKeys()"), /claim\(\);\s*\n\s*this\._cancelForm\(\);/);
  const cancel = sliceFunction(CAL_SRC, "_cancelForm()");
  assert.match(cancel, /panel\.onEscape\(\);/);
  assert.match(cancel, /this\._closeForm\(\);/);
});

// ── Post-Checkout result card ─────────────────────────────────────────────────

function resultCard() {
  const doc = fakeDocument();
  const wrap = node("window-manager__wrapper-modal");
  const inner = node("wrapper-inner", wrap);
  const root = node("settings-billing-result", inner);
  const card = node("settings-billing-result__card", root);
  const btn = node("settings-billing-result__done", card);
  const sidebar = node("desk-module-sidebar__main");
  const sent = [];
  const self = {
    fig: { family: "settings-billing-result" },
    el: root,
    isDestroyed: () => false,
    triggerHandlers: (a) => sent.push(a.service),
  };
  new Function("PAGE_FADE_OUTSIDE", `return (${sliceFunction(RESULT_SRC, "_installBackdropDismiss()")});`)(
    ".desk-module__topbar, .desk-module-sidebar__main",
  ).call(self);
  const topbar = node("desk-module__topbar");
  const popup = node("some-popup");
  return { doc, wrap, inner, root, card, btn, sidebar, topbar, popup, sent, self };
}

test("result card: a click on the wrapper-modal (or a container around the card) closes it", () => {
  const r = resultCard();
  r.doc.press(r.wrap);
  r.doc.press(r.inner);
  r.doc.press(r.root);
  assert.deepEqual(r.sent, ["billing-result-close", "billing-result-close", "billing-result-close"]);
});

test("result card: inside the card, a popup elsewhere, or a drag out of the card → nothing", () => {
  const r = resultCard();
  r.doc.press(r.card);
  r.doc.press(r.btn);
  r.doc.press(r.popup);
  r.doc.drag(r.btn, r.wrap);
  assert.deepEqual(r.sent, []);
});

test("result card: a click on the top bar or the sidebar closes it too", () => {
  const r = resultCard();
  r.doc.press(r.topbar);
  r.doc.press(r.sidebar);
  assert.deepEqual(r.sent, ["billing-result-close", "billing-result-close"]);
});

test("result card: ignored while a button is busy (Billing opening)", () => {
  const r = resultCard();
  r.btn.loading = true;
  r.doc.press(r.wrap);
  assert.deepEqual(r.sent, []);
});

test("result card: listeners bound on mount and removed on destroy", () => {
  const r = resultCard();
  assert.deepEqual(r.doc.bound(), ["click", "pointerdown"]);
  new Function(`return (${sliceFunction(RESULT_SRC, "_removeBackdropDismiss()")});`)().call(r.self);
  assert.deepEqual(r.doc.bound(), []);
  assert.match(sliceFunction(RESULT_SRC, "onBeforeDestroy()"), /this\._removeBackdropDismiss\(\);/);
});

test("calendar: a click on the top bar or the sidebar (or anything in them) closes the form", () => {
  const c = calendar("task");
  c.doc.press(c.topbar);
  c.doc.press(c.topIcon);
  c.doc.press(c.sidebar);
  c.doc.press(c.railItem);
  assert.deepEqual(c.log, ["cancel", "cancel", "cancel", "cancel"]);
});
