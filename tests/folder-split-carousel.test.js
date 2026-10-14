// folder-split-carousel.test.js — on a narrow folder window (the phone) the
// Files view's split body is a two-page carousel: page 1 the files panel,
// page 2 the chat panel, each the full width, snapping a page at a time.
//
//   node --test tests/folder-split-carousel.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");

// The compact block: @container window-folder-w (max-width: 700px).
const compact = (() => {
  const i = css.indexOf("@container window-folder-w (max-width: 700px)");
  assert.ok(i >= 0, "compact container block");
  return css.slice(i);
})();
const FILES = /\.window__split-body\[data-view=files\]/.source;

test("compact Files view: two full-width pages, no gap", () => {
  assert.match(compact, new RegExp(`${FILES} \\{[^}]*grid-template-columns: 100% 100% !important`));
  assert.match(compact, new RegExp(`${FILES} \\{[^}]*column-gap: 0`));
});

test("compact Files view: snaps one page at a time", () => {
  assert.match(compact, new RegExp(`${FILES} \\{[^}]*scroll-snap-type: x mandatory`));
  for (const panel of ["files-panel", "chat-panel", "chat-details"]) {
    assert.match(compact, new RegExp(`${FILES} > \\.window__${panel}[^{]*\\{[^}]*scroll-snap-align: start`), panel);
  }
});

test("re-entering Files lands on page 1 (the files panel)", () => {
  const src = fs.readFileSync(path.join(SRC, "builtins/window/folder/index.js"), "utf8");
  assert.match(src, /view\.el\.dataset\.view = tab;\s*\n\s*this\._firstSplitPage\(view\);/);
  const m = src.match(/\n {2}_firstSplitPage\(view\) \{\n([\s\S]*?)\n {2}\}\n/);
  assert.ok(m, "_firstSplitPage defined");
  const el = { scrollLeft: 900, dataset: { view: "files" } };
  new Function("view", m[1])({ el });
  assert.equal(el.scrollLeft, 0);
  const chat = { scrollLeft: 900, dataset: { view: "chat" } };
  new Function("view", m[1])({ el: chat });
  assert.equal(chat.scrollLeft, 900, "other views untouched");
});
