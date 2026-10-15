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
  let synced = 0;
  const ctx = { _syncSplitPage: () => { synced++; } };
  const el = { scrollLeft: 900, dataset: { view: "files" } };
  new Function("view", m[1]).call(ctx, { el });
  assert.equal(el.scrollLeft, 0);
  assert.equal(synced, 1, "the footer follows the reset");
  const chat = { scrollLeft: 900, dataset: { view: "chat" } };
  new Function("view", m[1]).call(ctx, { el: chat });
  assert.equal(chat.scrollLeft, 900, "other views untouched");
});

// ── carousel footer: one dot per page, under the split body ─────────────────
const toolkit = fs.readFileSync(path.join(SRC, "builtins/window/skeleton/toolkit/index.js"), "utf8");
const folderJs = fs.readFileSync(path.join(SRC, "builtins/window/folder/index.js"), "utf8");
const method = (src, name, args) => {
  const m = src.match(new RegExp(`\\n {2}${name}\\(${args}\\) \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`));
  assert.ok(m, `${name} defined`);
  return m[1];
};

test("footer: two dots that page the split body; none for a no-chat share", () => {
  const m = toolkit.match(/export function splitDots\(ui\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(m, "splitDots exported from the toolkit");
  const node = (type) => (o = {}) => ({ type, ...o });
  const Sk = { Box: { X: node("X") } };
  const ui = { fig: { family: "window-folder", group: "window" } };
  const build = (noChat) => new Function("ui", "Skeletons", "_dmzShareWithoutChat", m[1])(ui, Sk, () => noChat);
  const f = build(false);
  assert.equal(f.sys_pn, "split-dots");
  assert.equal(f.dataset.page, 0);
  assert.equal(f.kids.length, 2);
  assert.deepEqual(f.kids.map((k) => [k.service, k.dataset.page]), [["split-page", 0], ["split-page", 1]]);
  assert.equal(build(true), "", "no chat page, no footer");
});

test("footer is mounted right after the split body, in the pane and in the window", () => {
  const sk = fs.readFileSync(path.join(SRC, "builtins/window/folder/skeleton/index.js"), "utf8");
  const after = sk.match(/splitBody\(ui\),\s*splitDots\(ui\)/g) || [];
  assert.equal(after.length, 2);
});

test("footer follows the swipe: data-page from scrollLeft", () => {
  const body = method(folderJs, "_syncSplitPage", "");
  const ctx = {
    __folderView: { el: { scrollLeft: 400, clientWidth: 390 } },
    _splitDots: { el: { dataset: { page: "0" } } },
  };
  new Function(body).call(ctx);
  assert.equal(ctx._splitDots.el.dataset.page, "1");
});

test("a dot press scrolls to its page", () => {
  const body = method(folderJs, "_showSplitPage", "cmd");
  let to = null;
  const ctx = { __folderView: { el: { clientWidth: 390, scrollTo: (o) => { to = o; } } } };
  new Function("cmd", body).call(ctx, { el: { dataset: { page: "1" } } });
  assert.deepEqual(to, { left: 390, behavior: "smooth" });
  assert.match(folderJs, /case "split-page":\s*\n\s*return this\._showSplitPage\(cmd\);/);
});

test("footer skin: hidden by default, shown only on the compact Files view (not over Access)", () => {
  assert.match(css, /\.window-folder__split-dots \{[^}]*display: none/);
  assert.match(compact, /\.window-folder__split-body\[data-view=files\]:not\(\[data-access="1"\]\) \+ \.window-folder__split-dots \{[^}]*display: flex/);
  assert.match(compact, /\.window-folder__split-dots\[data-page="1"\] \.window-folder__split-dot:nth-child\(2\)/);
});
