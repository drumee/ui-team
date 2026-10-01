// The upload-progress "still uploading" warning: a banner ABOVE the upload
// list, never a view that replaces it. The list stays visible the whole time,
// so when the files land the banner goes and what is left is simply the upload
// window, closing on its normal timing.
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
const P = ".window-upload-progress";

test("the upload list stays on screen under the banner", () => {
  // Header, aggregate bar and file list are never hidden in the warning phase.
  for (const part of ["header", "body"]) {
    assert.doesNotMatch(
      css,
      new RegExp(`__container\\[data-phase=warning\\] \\${P}__${part}[ ,][^{]*\\{[^}]*display: none`),
      part,
    );
  }
  // Only the footer goes: its "Cancel all" would compete with the banner's two
  // answers. Staging never applies here.
  assert.match(rule(`${P}__container[data-phase=warning] ${P}__staging, ${P}__container[data-phase=warning] ${P}__footer`), /display: none/);
});

test("the window grows to fit banner + list, never below its 280px, and still collapses", () => {
  // Only while expanded: collapsing during the warning must still work.
  const r = rule(`${P}__ui[data-expanded="1"][data-phase=warning]`);
  assert.match(r, /height: auto !important/);
  assert.match(r, /min-height: 280px !important/);
  assert.match(r, /display: flex/);
  assert.match(r, /flex-direction: column/);
  assert.match(rule(`${P}__container[data-phase=warning]`), /flex: 1 1 auto/);
});

test("the list keeps a bounded height under the banner", () => {
  const b = rule(`${P}__container[data-phase=warning] ${P}__body`);
  assert.match(b, /flex: 1 1 auto/);
  assert.match(b, /max-height: 180px/);
});

test("the banner takes its own height and sits between header and list", () => {
  const w = rule(`${P}__warning`);
  assert.match(w, /flex: none/);
  assert.match(w, /border-bottom: 1px solid var\(--border-default\)/);
  assert.doesNotMatch(w, /min-height/);
});

test("the banner is compact: inline icon + title, then body, then buttons", () => {
  assert.match(rule(`${P}__warning-head`), /align-items: center/);
  assert.match(rule(`${P}__warning-icon`), /width: 20px/);
  assert.match(rule(`${P}__warning-title`), /font-size: 14px/);
  assert.match(rule(`${P}__warning-body`), /font-size: 12px/);
});

test("its own per-file rows are gone (the upload list below shows the files)", () => {
  for (const gone of ["__warning-list", "__warning-row", "__warning-ring", "__warning-ext"]) {
    assert.doesNotMatch(css, new RegExp(`\\${P}${gone}\\b`), gone);
  }
});

test("button labels never spill out of the button", () => {
  const b = rule(`${P}__warning-keep, ${P}__warning-skip`);
  assert.match(b, /height: 32px/);
  assert.match(b, /font-size: 13px/);
  assert.match(b, /min-width: 0/);
  assert.match(b, /overflow: hidden/);
  assert.match(b, /box-sizing: border-box/);
  const inner = rule(`${P}__warning-keep .note-content, ${P}__warning-skip .note-content`);
  assert.match(inner, /white-space: nowrap/);
  assert.match(inner, /text-overflow: ellipsis/);
});

test("buttons size to their labels and wrap rather than cut a label off", () => {
  assert.match(rule(`${P}__warning-actions`), /flex-wrap: wrap/);
  assert.match(rule(`${P}__warning-keep`), /flex: 1 0 auto/);
  assert.match(rule(`${P}__warning-skip`), /flex: 1 1 auto/);
});

test("button labels are centred, whatever box the Note's inner div gets", () => {
  const b = rule(`${P}__warning-keep, ${P}__warning-skip`);
  assert.match(b, /display: flex/);
  assert.match(b, /align-items: center/);
  assert.match(b, /justify-content: center/);
  assert.match(rule(`${P}__warning-keep .note-content, ${P}__warning-skip .note-content`), /text-align: center/);
});

test("the warning icon is the apps-warning glyph, tinted with the error colour", () => {
  const r = rule(`${P}__warning-icon`);
  assert.match(r, /color: var\(--default-text-error\)/);
  assert.doesNotMatch(r, /font-size/);
  assert.match(rule(`${P}__warning-icon svg`), /fill: currentColor/);
});
