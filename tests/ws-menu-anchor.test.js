#!/usr/bin/env node

/**
 * WHERE THE WORKSPACE ⋯ MENU LANDS.
 *
 * Per the frame, `.drumee-contextmenu.media-grid.desk-module-topbar` opens
 * BESIDE the switcher card — its left edge a hair off the card's right, its top
 * level with the card's — not under the ⋯ that opened it.
 *
 * WHY THE CARD AND NOT THE BUTTON. The ⋯ is the last chip of __ws-head, which
 * is the first row INSIDE the card, so anything anchored to the button lands
 * over the workspace list the user is choosing from. Beside the card it covers
 * nothing.
 *
 * The original code fed `left: rect.right` against the BUTTON, which puts the
 * panel's LEFT edge on the ⋯'s RIGHT edge — 200px of menu hanging into empty
 * topbar, clear of the card and attached to nothing. Measured in headless
 * chromium against a DOM built from topbar.scss and builtins/contextmenu/skin,
 * card 180→440, button 406→433:
 *
 *   before   menu 433 → 633   (200px clear of the ⋯, over nothing)
 *   after    menu 448 → 648   (8px off the card, tops level)
 *
 * The numbers below are that same arithmetic, run against the real source.
 *
 * Run from ui-team with:
 *   node --test tests/ws-menu-anchor.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const DESK = readFileSync(
  join(REPO_ROOT, "src/drumee/modules/desk/index.js"),
  "utf8",
);

function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  const open = src.indexOf("{", start + header.length - 1);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  assert.fail(`${header} unbalanced`);
}

/**
 * Run the REAL positioning block — from the rect down to the last line of the
 * method — against fakes, and report where the menu ended up.
 *
 * Sliced by its opening line rather than by a line count, so an edit anywhere
 * above it cannot silently change what is under test.
 */
const METHOD = slice(DESK, "  _toggleWorkspaceMenu(cmd, retried) {");
const TAIL = METHOD.slice(
  METHOD.indexOf("    const rect = cmd && cmd.el"),
  METHOD.lastIndexOf("}"),
);
assert.ok(TAIL.includes("dialog.feed("), "the positioning block moved");

const rectOf = (r) => ({ ...r, width: r.right - r.left, height: r.bottom - r.top });

function place({
  button,
  // The switcher card the ⋯ sits in. `null` models a ⋯ mounted outside one.
  card,
  cardClass = ".menu-topic-items",
  menu = { w: 200, h: 326 },
  viewport = { w: 1440, h: 813 },
  scroll = { x: 0, y: 0 },
  noClosest = false,
}) {
  const fedStyle = {};
  const el = { offsetWidth: menu.w, offsetHeight: menu.h, style: {} };
  const node = { el, once() {} };
  const globals = {
    _: { isFunction: (f) => typeof f === "function" },
    _e: { destroy: "destroy" },
    Skeletons: { Box: { Y: (o) => o } },
    window: {
      innerWidth: viewport.w,
      innerHeight: viewport.h,
      scrollX: scroll.x,
      scrollY: scroll.y,
    },
  };
  const ctx = { _closeWorkspaceMenu() {}, _wsMenu: null, _wsMenuBtn: null };
  const asked = [];
  const cmdEl = {
    getBoundingClientRect: () => rectOf(button),
  };
  if (!noClosest) {
    cmdEl.closest = (sel) => {
      asked.push(sel);
      if (!card) return null;
      return sel === cardClass
        ? { getBoundingClientRect: () => rectOf(card) }
        : null;
    };
  }
  const cmd = { el: cmdEl, setState() {} };
  const dialog = {
    feed(o) {
      Object.assign(fedStyle, o.style);
      fedStyle.className = o.className;
    },
    children: { last: () => node },
  };
  const names = Object.keys(globals);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...names, "cmd, dialog, target, kids", TAIL);
  fn.call(
    ctx,
    ...names.map((n) => globals[n]),
    cmd,
    dialog,
    { fig: { family: "media-grid" } },
    ["a"],
  );
  const left = parseFloat(el.style.left);
  const top = parseFloat(el.style.top);
  return {
    fed: fedStyle,
    asked,
    left,
    top,
    right: left + menu.w,
    bottom: top + menu.h,
  };
}

// As headless chromium measured them: a 260px switcher card at x 180, dropped
// under a 56px topbar, with the ⋯ as the right-hand chip of its header row.
const CARD = { left: 180, right: 440, top: 62, bottom: 478 };
const BUTTON = { left: 406, right: 433, top: 69, bottom: 96 };

// ── the anchor ─────────────────────────────────────────────────────────────

test("it opens 8px off the CARD's right edge", () => {
  const p = place({ button: BUTTON, card: CARD });
  assert.equal(p.left - CARD.right, 8);
  assert.equal(p.left, 448);
});

test("its top is level with the card's", () => {
  const p = place({ button: BUTTON, card: CARD });
  assert.equal(p.top, CARD.top);
});

test("the CARD is the anchor, not the ⋯ inside it", () => {
  // This is the whole correction. The button's right edge is 7px inside the
  // card, so anchoring to it would drop the menu over the workspace list.
  const p = place({ button: BUTTON, card: CARD });
  assert.notEqual(p.left, BUTTON.right, "still anchored to the button");
  assert.ok(p.left > CARD.right, "the menu overlaps the card");
  assert.notEqual(p.top, BUTTON.bottom + 8);
});

test("moving the ⋯ within the card does not move the menu", () => {
  const a = place({ button: BUTTON, card: CARD });
  const b = place({
    button: { left: 200, right: 227, top: 69, bottom: 96 },
    card: CARD,
  });
  assert.deepEqual(
    { left: b.left, top: b.top },
    { left: a.left, top: a.top },
    "the placement is still reading the button",
  );
});

test("a wider card pushes it further right, by the card's width", () => {
  const wide = { ...CARD, right: CARD.right + 120 };
  const p = place({ button: BUTTON, card: wide });
  assert.equal(p.left, wide.right + 8);
});

// ── which element it anchors to ────────────────────────────────────────────

test("it looks for the card that PAINTS the panel, then its fallbacks", () => {
  const p = place({ button: BUTTON, card: null });
  assert.deepEqual(p.asked, [
    ".menu-topic-items",
    ".menu-topic-items__wrapper",
    ".desk-module-topbar__ws-menu",
  ]);
});

test("a fallback selector is used when the first does not match", () => {
  for (const sel of [".menu-topic-items__wrapper", ".desk-module-topbar__ws-menu"]) {
    const p = place({ button: BUTTON, card: CARD, cardClass: sel });
    assert.equal(p.left, CARD.right + 8, `${sel} was not honoured`);
  }
});

test("with no card at all it falls back to the button", () => {
  // A ⋯ mounted outside a panel still has to put its menu somewhere sane.
  const p = place({ button: BUTTON, card: null });
  assert.equal(p.left, BUTTON.right + 8);
  assert.equal(p.top, BUTTON.top);
});

test("an element without closest() does not throw", () => {
  const p = place({ button: BUTTON, card: CARD, noClosest: true });
  assert.equal(p.left, BUTTON.right + 8);
});

// ── edges ──────────────────────────────────────────────────────────────────

test("no room on the right → it flips to the LEFT of the card", () => {
  const nearRight = { left: 1100, right: 1360, top: 62, bottom: 478 };
  const p = place({
    button: { left: 1326, right: 1353, top: 69, bottom: 96 },
    card: nearRight,
    viewport: { w: 1440, h: 813 },
  });
  assert.equal(p.right, nearRight.left - 8, "it did not flip");
  assert.equal(p.top, nearRight.top, "flipping must not lose the vertical anchor");
});

test("no room on EITHER side → it stays on screen rather than half off it", () => {
  const p = place({
    button: { left: 240, right: 267, top: 69, bottom: 96 },
    card: { left: 20, right: 280, top: 62, bottom: 478 },
    menu: { w: 200, h: 200 },
    viewport: { w: 400, h: 813 },
  });
  assert.ok(p.left >= 8, `left was ${p.left}`);
  assert.ok(p.right <= 400 - 8 + 0.01, `right was ${p.right}`);
});

test("a menu taller than the room below it slides up", () => {
  const p = place({
    button: BUTTON,
    card: { left: 180, right: 440, top: 600, bottom: 700 },
    menu: { w: 200, h: 326 },
    viewport: { w: 1440, h: 813 },
  });
  assert.equal(p.bottom, 813 - 8);
  assert.equal(p.left, 448, "sliding up must not lose the horizontal anchor");
});

test("a menu taller than the WINDOW is pinned to the top, not pushed off it", () => {
  const p = place({
    button: BUTTON,
    card: CARD,
    menu: { w: 200, h: 900 },
    viewport: { w: 1440, h: 400 },
  });
  assert.equal(p.top, 8);
});

test("the page scroll is carried into both axes", () => {
  const a = place({ button: BUTTON, card: CARD });
  const b = place({ button: BUTTON, card: CARD, scroll: { x: 120, y: 300 } });
  assert.equal(b.left - a.left, 120);
  assert.equal(b.top - a.top, 300);
});

test("a scrolled page still clamps against the VIEWPORT, not the document", () => {
  const p = place({
    button: { left: 240, right: 267, top: 69, bottom: 96 },
    card: { left: 20, right: 280, top: 62, bottom: 478 },
    menu: { w: 200, h: 200 },
    viewport: { w: 400, h: 813 },
    scroll: { x: 500, y: 0 },
  });
  assert.ok(p.left >= 508, `left was ${p.left}`);
  assert.ok(p.right <= 500 + 400 - 8 + 0.01, `right was ${p.right}`);
});

// ── how it is measured ─────────────────────────────────────────────────────

test("it measures the BORDER box, not jQuery's content box", () => {
  // The panel carries 6px padding and a 1px border per side, so .width() reads
  // 14px short — which placed it 14px off and made the clamps wrong by as much.
  const stripped = TAIL.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /l\.el\.offsetWidth/);
  assert.match(stripped, /l\.el\.offsetHeight/);
  assert.ok(
    !/\$el\.width\(\)/.test(stripped) && !/\$el\.height\(\)/.test(stripped),
    "still measuring with jQuery .width()/.height()",
  );
});

test("the fed style is a sane fallback if it is never measured", () => {
  // offsetWidth is 0 for a panel that has not been laid out; the fed position
  // must still be beside the card rather than at the origin.
  const p = place({ button: BUTTON, card: CARD });
  assert.equal(p.fed.left, CARD.right + 8);
  assert.equal(p.fed.top, CARD.top);
  assert.equal(p.fed.zIndex, 100000);
});

test("a button with no rect does not throw", () => {
  const el = { offsetWidth: 200, offsetHeight: 100, style: {} };
  const names = ["_", "_e", "Skeletons", "window"];
  const globals = [
    { isFunction: (f) => typeof f === "function" },
    { destroy: "destroy" },
    { Box: { Y: (o) => o } },
    { innerWidth: 1440, innerHeight: 813, scrollX: 0, scrollY: 0 },
  ];
  // eslint-disable-next-line no-new-func
  const fn = new Function(...names, "cmd, dialog, target, kids", TAIL);
  assert.doesNotThrow(() =>
    fn.call(
      { _closeWorkspaceMenu() {} },
      ...globals,
      { setState() {} },
      { feed() {}, children: { last: () => ({ el, once() {} }) } },
      {},
      ["a"],
    ),
  );
});
