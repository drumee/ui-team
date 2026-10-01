// The viewbar's active view tab and its "New" button use the brand primary,
// the same pair the Filter pill beside them already uses — not --accent
// (orange fallback).
//   node --test tests/tasks-viewbar-primary-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/tasks/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
  })
  .css.replace(/\s+/g, " ");
const rule = (sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(?:^|\\} )${esc} \\{([^}]*)\\}`));
  assert.ok(m, `no rule for ${sel}`);
  return m[1];
};

test("active view tab: primary text on the primary tint", () => {
  const r = rule('.tasks-panel__viewbar-item[data-active="1"]');
  assert.match(r, /color: var\(--col-primary-40, #5950ff\)/);
  assert.match(r, /background: var\(--overlay-brand, rgba\(89, 80, 255, 0\.1\)\)/);
  assert.doesNotMatch(r, /--accent|--active-item-bg/);
});

test("New button: primary background", () => {
  const r = rule(".tasks-panel__viewbar-new");
  assert.match(r, /background: var\(--col-primary-40, #5950ff\)/);
  assert.doesNotMatch(r, /--accent/);
});
