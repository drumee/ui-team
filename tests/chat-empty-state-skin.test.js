// chat-empty-state-skin.test.js — side column (Files tab) vs full Chat tab
// geometry of the team chat empty state.
//
//   node --test tests/chat-empty-state-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rule = (sel) => {
  const m = css.match(new RegExp("(?:^|[}\\s])" + esc(sel) + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};
const T = ".window-folder .widget-chat__team-empty";
const FULL = '.window-folder__split-body[data-view=chat] .widget-chat__team-empty';

test("side column: no icon, 24px title, 16px text capped at 401px", () => {
  assert.match(rule(`${T}-ico`), /display: none !important/);
  const title = rule(`${T}-title`);
  assert.match(title, /font-size: 24px/); assert.match(title, /line-height: 1\.1/); assert.match(title, /#34343a/i);
  const text = rule(`${T}-text`);
  assert.match(text, /font-size: 16px/); assert.match(text, /max-width: 401px/);
  assert.match(rule(T), /gap: 16px/);
});

test("full Chat tab: 80px icon tile, 40px title, 18px text, 40px icon gap", () => {
  const ico = rule(`${FULL}-ico`);
  assert.match(ico, /display: block !important/);
  assert.match(ico, /width: 80px/); assert.match(ico, /height: 80px/);
  assert.match(ico, /overflow: hidden/); assert.match(ico, /opacity: 0\.6/);
  assert.match(ico, /margin-bottom: 24px/); // 16px flex gap + 24px = Figma's 40px
  assert.match(rule(`${FULL}-title`), /font-size: 40px/);
  assert.match(rule(`${FULL}-text`), /font-size: 18px/);
});

test("icon SVGs keep their root size", () => {
  const img = rule(`${T}-img`);
  assert.doesNotMatch(img, /(^|;)\s*(width|height):/);
  assert.match(img, /position: absolute/);
});
