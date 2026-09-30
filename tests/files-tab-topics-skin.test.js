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
test("strip: the create button sits at the far end, styled like the '+ New' primary button", () => {
  const c = rule(".window-folder .window__topic-strip .window__topic-tab--create");
  assert.match(c, /margin-left: auto/);
  assert.match(c, /background-color: var\(--primary-40\)/);
  assert.match(c, /border-radius: 8px/);
  assert.match(c, /height: 30px/);
  assert.match(c, /color: var\(--white\)/);
  assert.match(rule(".window-folder .window__topic-strip .window__topic-tab--create:hover"), /background-color: var\(--primary-50\)/);
});

test("carousel: a page of tabs between two arrow buttons; disabled arrows are dimmed and inert", () => {
  assert.match(rule(".window-folder .window__topic-page"), /overflow: hidden/);
  const arrow = rule(".window-folder .window__topic-arrow");
  assert.match(arrow, /width: 24px/);
  assert.match(arrow, /cursor: pointer/);
  const off = rule('.window-folder .window__topic-arrow[data-disabled="1"]');
  assert.match(off, /opacity: 0\.3/);
  assert.match(off, /pointer-events: none/);
});

// Three tabs + the arrows + "Create topic" must fit the side chat: a tab in
// the page shrinks and its name ellipsizes instead of being clipped mid-word.
test("carousel: tabs in a page shrink and ellipsize, never clip", () => {
  const t = rule(".window-folder .window__topic-page .window__topic-tab");
  assert.match(t, /flex: 0 1 auto/);
  assert.match(t, /min-width: 0/);
  assert.match(t, /padding: 8px 12px/);
  const n = rule(".window-folder .window__topic-page .window__topic-tab-name");
  assert.match(n, /min-width: 0/);
  assert.match(n, /text-overflow: ellipsis/);
  // ui-core renders a Note as .note > .note-content: the dots belong there.
  const inner = rule(".window-folder .window__topic-page .window__topic-tab-name .note-content");
  assert.match(inner, /text-overflow: ellipsis/);
  assert.match(inner, /overflow: hidden/);
  // The page takes the room between the arrows (tabs are not squeezed early).
  assert.match(rule(".window-folder .window__topic-page"), /flex: 1 1 auto/);
});

// #General is short and always there: it keeps its full width, topics give way.
test("carousel: the #General tab never shrinks", () => {
  assert.match(rule(".window-folder .window__topic-page .window__topic-tab--general"), /flex-shrink: 0/);
});

// The picked tab shows its whole name; the other tabs of the page give way.
test("carousel: the active tab keeps its full name, the others shrink", () => {
  const a = rule('.window-folder .window__topic-page .window__topic-tab[data-active="1"]');
  assert.match(a, /flex-shrink: 0/);
  const n = rule('.window-folder .window__topic-page .window__topic-tab[data-active="1"] .window__topic-tab-name');
  assert.match(n, /max-width: none/);
  assert.match(n, /overflow: visible/);
  const inner = rule('.window-folder .window__topic-page .window__topic-tab[data-active="1"] .window__topic-tab-name .note-content');
  assert.match(inner, /overflow: visible/);
  assert.match(inner, /text-overflow: clip/);
});
