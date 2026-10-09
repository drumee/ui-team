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

test("strip: one row of underlined text tabs on a hairline; the active tab is brand", () => {
  const s = rule(".window-folder .window__topic-strip");
  assert.match(s, /display: flex/);
  assert.match(s, /flex-wrap: nowrap/);
  assert.match(s, /padding: 0 12px/);
  assert.match(s, /box-shadow: inset 0 -1px 0 rgba\(0, 0, 0, 0\.08\)/);
  const t = rule(".window-folder .window__topic-tab");
  assert.match(t, /flex: 0 0 auto/);
  assert.match(t, /background: transparent/);
  assert.match(t, /border-radius: 0/);
  assert.match(t, /white-space: nowrap/);
  assert.match(t, /color: #65656c/);
  const a = rule('.window-folder .window__topic-tab[data-active="1"]');
  assert.match(a, /color: #5950ff/);
  assert.match(a, /box-shadow: inset 0 -2px 0 #5950ff/);
  // Whole names: the page scrolls rather than ellipsizing.
  assert.doesNotMatch(rule(".window-folder .window__topic-tab-name"), /ellipsis|max-width/);
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

// The tabs overflow by scrolling sideways (no scrollbar drawn); "+ Create
// topic" sits after them and never scrolls away.
test("page: scrolls horizontally, hidden scrollbar, never wider than its tabs", () => {
  const p = rule(".window-folder .window__topic-page");
  assert.match(p, /overflow-x: auto/);
  assert.match(p, /overflow-y: hidden/);
  assert.match(p, /flex: 0 1 auto/);
  assert.match(p, /min-width: 0/);
  assert.match(p, /scrollbar-width: none/);
  assert.match(rule(".window-folder .window__topic-page::-webkit-scrollbar"), /display: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^@]*\.window__topic-page \{ scroll-behavior: auto/);
  assert.doesNotMatch(css, /window__topic-arrow|@keyframes topic-page-/);
});

test("strip: the create tab follows the tabs, styled like them", () => {
  const c = rule(".window-folder .window__topic-strip .window__topic-tab--create");
  assert.match(c, /flex: 0 0 auto/);
  assert.doesNotMatch(c, /margin-left: auto|--primary/);
  assert.match(rule(".window-folder .window__topic-create-label"), /color: currentColor/);
});
