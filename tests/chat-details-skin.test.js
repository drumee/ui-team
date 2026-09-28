// chat-details-skin.test.js — compiles the folder window skin and pins the
// Chat details rules whose absence is a functional bug: the panel must take
// the chat's cell only while data-details="open" on the Files view, stay out
// of every other view, hide for a gated viewer, and keep the Figma geometry
// (775:131699 / 775:132297..132300) that sets its footprint.
//
//   node --test tests/chat-details-skin.test.js
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

const rule = (sel) => {
  const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};

test("hidden by default in every view", () => {
  assert.match(rule(".window-folder__split-body .window__chat-details"), /display: none !important/);
});

test("open on Files: details takes the chat's cell, the chat steps aside", () => {
  const open = '.window-folder__split-body[data-view=files][data-details=open]';
  assert.match(rule(`${open} > .window__chat-panel`), /display: none !important/);
  assert.match(rule(`${open} > .window__chat-details`), /display: flex !important/);
});

test("a gated viewer sees nothing inside the panel", () => {
  assert.match(rule('.window-folder .window__chat-details[data-chat_gated="1"] > *'), /display: none/);
});

test("Figma geometry: card, action tiles, member avatar, media tiles, duration pill", () => {
  const card = rule(".window-folder .window__chat-details");
  assert.match(card, /gap: 20px/);
  assert.match(card, /padding: 12px/);
  assert.match(card, /border-radius: 8px/);
  assert.match(card, /overflow-y: auto/);
  const tile = rule(".window-folder .window__chat-details-action");
  assert.match(tile, /padding: 8px 20px/);
  assert.match(tile, /border-radius: 12px/);
  assert.match(rule(".window-folder .window__chat-details-avatar"), /width: 32px; height: 32px/);
  assert.match(rule(".window-folder .window__chat-details-tile"), /width: 61px; height: 61px/);
  assert.match(rule(".window-folder .window__chat-details-grid"), /gap: 4px/);
  assert.match(rule(".window-folder .window__chat-details-duration"), /background: rgba\(20, 17, 35, 0\.4\)/);
  assert.match(rule('.window-folder .window__chat-details-member-status[data-online="1"]'), /color: var\(--primary-40, #5950ff\)/);
});

test("icons are painted through fill (sprite glyphs ignore color alone); thread paperclip is brand purple", () => {
  assert.match(rule(".window-folder .window__chat-details-thread-ico"), /fill: var\(--primary-40, #5950ff\)/);
  assert.match(rule(".window-folder .window__chat-details-count-ico"), /fill: var\(--normal-fg-50, #65656c\)/);
  assert.match(rule(".window-folder .window__chat-details-action-ico"), /fill: var\(--normal-fg, #0b0a21\)/);
});
