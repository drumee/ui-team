// The upload-progress warning card: compact, never clipped, legible ring.
//   node --test tests/upload-progress-warning-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/upload-progress/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
  })
  .css.replace(/\s+/g, " ");
const rule = (sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(?:^|\\} )${esc} \\{([^}]*)\\}`));
  assert.ok(m, `no rule for ${sel}`);
  return m[1];
};

test("the window lets go of its fixed 280px while the card is up", () => {
  // data-expanded="1" pins height: 280px !important; the card is taller, and
  // __ui has overflow: hidden, so the buttons were cut off.
  const r = rule(".window-upload-progress__ui[data-expanded][data-phase=warning]");
  assert.match(r, /height: auto !important/);
  assert.match(r, /min-height: 0 !important/);
  assert.match(r, /width: 320px !important/);
});

test("the card is compact", () => {
  assert.match(rule(".window-upload-progress__warning"), /padding: 16px/);
  assert.match(rule(".window-upload-progress__warning-icon"), /width: 32px/);
  assert.match(rule(".window-upload-progress__warning-title"), /font-size: 14px/);
  assert.match(rule(".window-upload-progress__warning-body"), /font-size: 12px/);
});

test("button labels never spill out of the button", () => {
  const b = rule(".window-upload-progress__warning-keep, .window-upload-progress__warning-skip");
  assert.match(b, /height: 32px/);
  assert.match(b, /font-size: 13px/);
  assert.match(b, /white-space: nowrap/);
  assert.match(b, /text-overflow: ellipsis/);
  assert.match(b, /min-width: 0/);
  // The 1px border of "Keep" made it 2px taller than "Create…" beside it.
  assert.match(b, /box-sizing: border-box/);
});

test("buttons size to their labels and wrap rather than cut a label off", () => {
  // Two equal halves of a 320px card cut "Create without this file" off, and
  // "Update without these files" (or a longer translation) still does at any
  // fixed split. Content-based widths + wrap: the long one takes its own line
  // only when it has to.
  assert.match(rule(".window-upload-progress__warning-actions"), /flex-wrap: wrap/);
  assert.match(rule(".window-upload-progress__warning-keep"), /flex: 1 0 auto/);
  assert.match(rule(".window-upload-progress__warning-skip"), /flex: 1 1 auto/);
});

test("the ring's track is a light tint, not the near-black foreground", () => {
  const r = rule(".window-upload-progress__warning-ring");
  assert.doesNotMatch(r, /--normal-fg-10/);
  assert.match(r, /color-mix\(in srgb, var\(--primary-40\) 18%, transparent\)/);
  assert.match(r, /width: 18px/);
});
