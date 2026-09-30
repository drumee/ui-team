// files-tab-topics-skin.test.js — the Files-tab chat's topic strip and File
// threads bar: Figma tokens, shown only where the rail is not (Files view,
// compact Chat tab), never for a chat-gated viewer; mounted by chatPanel for
// the workspace folder window only.
//
//   node --test tests/files-tab-topics-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), { loadPaths: [SRC, path.join(SRC, "skin")], logger: sass.Logger.silent })
  .css.replace(/\s+/g, " ");
const rule = (sel) => {
  const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing ${sel}`);
  return m[1];
};

test("strip: one scrolling row; active tab brand + 3px underline; long names ellipsize", () => {
  const s = rule(".window-folder .window__topic-strip");
  assert.match(s, /display: flex/);
  assert.match(s, /gap: 4px/);
  assert.match(s, /overflow-x: auto/);
  assert.match(s, /flex-wrap: nowrap/);
  const a = rule('.window-folder .window__topic-tab[data-active="1"]');
  assert.match(a, /color: #5950ff/);
  assert.match(a, /border-bottom: 3px solid #5950ff/);
  const n = rule(".window-folder .window__topic-tab-name");
  assert.match(n, /max-width: 160px/);
  assert.match(n, /text-overflow: ellipsis/);
});

test("bar card and dropdown tokens", () => {
  const c = rule(".window-folder .window__ft-bar-card");
  assert.match(c, /border-radius: 12px/);
  assert.match(c, /border: 1px solid rgba\(0, 0, 0, 0\.05\)/);
  assert.match(c, /padding: 12px/);
  const l = rule(".window-folder .window__ft-list");
  assert.match(l, /border-radius: 12px/);
  assert.match(l, /position: absolute/);
  assert.match(l, /box-shadow: 0 1px 5\.5px rgba\(0, 0, 0, 0\.13\)/);
});

test("hidden on the wide Chat tab (the rail has both), back on the compact one; hidden when gated", () => {
  const wide = ".window-folder__split-body[data-view=chat] .window__topic-strip, .window-folder__split-body[data-view=chat] .window__ft-bar";
  assert.match(rule(wide), /display: none/);
  assert.match(css, /@container window-folder-w \(max-width: 700px\) \{[^@]*\.window-folder__split-body\[data-view=chat\] \.window__topic-strip, \.window-folder__split-body\[data-view=chat\] \.window__ft-bar \{ display: flex/);
  assert.match(rule('.window-folder .window__chat-panel[data-chat_gated="1"] .window__topic-strip, .window-folder .window__chat-panel[data-chat_gated="1"] .window__ft-bar'), /display: none !important/);
});

test("chatPanel mounts topic-strip and ft-bar for the workspace folder window only", () => {
  const src = fs.readFileSync(path.join(SRC, "builtins/window/skeleton/toolkit/index.js"), "utf8");
  const i = src.indexOf('sys_pn: "topic-strip"');
  const j = src.indexOf('sys_pn: "ft-bar"');
  assert.ok(i > 0 && j > 0);
  const before = src.slice(src.lastIndexOf("const topicSurfaces", i), i);
  assert.match(before, /const topicSurfaces = isFolderChat && !ui\.mget\(_a\.token\)/);
});

// Tabs on the left, "+ Create topic" pushed to the right end of the strip
// (still one scrolling row when the topics overflow).
test("strip: the create button sits at the far end, the tabs stay together", () => {
  assert.match(rule(".window-folder .window__topic-tab--create"), /margin-left: auto/);
  assert.doesNotMatch(rule(".window-folder .window__topic-strip"), /justify-content: space-between/);
});
