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

const FILES = '.window-folder__split-body[data-view=files] .widget-chat__team-empty';

test("hidden by default; the icon geometry is Figma's 80px tile", () => {
  const ico = rule(`${T}-ico`);
  assert.match(ico, /display: none !important/);
  assert.match(ico, /width: 80px/); assert.match(ico, /height: 80px/);
  assert.match(ico, /overflow: hidden/); assert.match(ico, /opacity: 0\.6/);
});

// Rail "Files" active = split body data-view="files" (showFolderTab): the side
// column always shows the icon, everything at ~0.75x (user, 2026-10-05).
test("Files tab side column: icon always shown, ~0.75x sizes", () => {
  const ico = rule(`${FILES}-ico`);
  assert.match(ico, /display: block !important/);
  assert.match(ico, /zoom: 0\.75/);              // 80px tile drawn at 60px
  assert.match(ico, /margin-bottom: 18px/);       // 12px gap + 18 = 30 = 40 x 0.75
  assert.match(rule(FILES), /gap: 12px/);
  const title = rule(`${FILES}-title`);
  assert.match(title, /font-size: 18px/);
  const text = rule(`${FILES}-text`);
  assert.match(text, /font-size: 13px/); assert.match(text, /max-width: 300px/);
  assert.match(rule(`${T}-title`), /#34343a/i);
});

test("full Chat tab: 80px icon tile, 40px title, 18px text, 40px icon gap", () => {
  const ico = rule(`${FULL}-ico`);
  assert.match(ico, /display: block !important/);
  assert.match(ico, /margin-bottom: 24px/); // 16px flex gap + 24px = Figma's 40px
  assert.match(rule(`${FULL}-title`), /font-size: 40px/);
  assert.match(rule(`${FULL}-text`), /font-size: 18px/);
});

test("icon SVGs keep their root size", () => {
  const img = rule(`${T}-img`);
  assert.doesNotMatch(img, /(^|;)\s*(width|height):/);
  assert.match(img, /position: absolute/);
});
