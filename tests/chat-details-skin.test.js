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
  // The panel itself never scrolls (on request): lists and page bodies do.
  assert.match(card, /overflow: hidden/);
  assert.doesNotMatch(card, /overflow-y: auto/);
  const tile = rule(".window-folder .window__chat-details-action");
  // Downsized from Figma (8px 20px / 12px radius / 24px icon / 14px label) on request.
  assert.match(tile, /padding: 6px 12px/);
  assert.match(tile, /border-radius: 10px/);
  assert.match(rule(".window-folder .window__chat-details-action-ico"), /width: 20px; height: 20px/);
  assert.match(rule(".window-folder .window__chat-details-action-label"), /font-size: 12px/);
  assert.match(rule(".window-folder .window__chat-details-avatar"), /width: 32px; height: 32px/);
  assert.match(rule(".window-folder .window__chat-details-tile"), /width: 61px; height: 61px/);
  // Widened from Figma's 4px on request: tiles read as separate items.
  assert.match(rule(".window-folder .window__chat-details-grid"), /gap: 8px/);
  assert.match(rule(".window-folder .window__chat-details-duration"), /background: rgba\(20, 17, 35, 0\.4\)/);
  assert.match(rule('.window-folder .window__chat-details-member-status[data-online="1"]'), /color: var\(--primary-40, #5950ff\)/);
});

test("every text in the panel uses the app font", () => {
  assert.match(rule(".window-folder .window__chat-details, .window-folder .window__chat-details *"), /font-family: var\(--font-main\)/);
});

// Back must stay reachable on a long Files / Links list.
test("the header sticks to the top of the scrolling panel", () => {
  const h = rule(".window-folder .window__chat-details-header");
  assert.match(h, /position: sticky/);
  // -12px cancels the panel padding: sticky clamps inside the scrollport padding otherwise,
  // which left the header 12px low with rows showing above it.
  assert.match(h, /top: -12px/);
  assert.match(h, /z-index: 1/);
});

test("count rows and every page item answer the pointer", () => {
  for (const item of ["count", "file", "link"]) {
    assert.match(rule(`.window-folder .window__chat-details-${item}:hover`), /background: rgba\(0, 0, 0, 0\.05\)/, item);
  }
  assert.match(rule(".window-folder .window__chat-details-tile:hover"), /opacity: 0\.85/);
});

test("link and file thumbnails are compact, their glyph sized, not left to fill the box", () => {
  assert.match(rule(".window-folder .window__chat-details-link-thumb"), /width: 32px; height: 32px/);
  assert.match(rule(".window-folder .window__chat-details-link-thumb svg"), /width: 16px; height: 16px/);
  assert.match(rule(".window-folder .window__chat-details-file-ico svg"), /width: 18px; height: 18px/);
});

test("icons are painted through fill (sprite glyphs ignore color alone); thread paperclip is brand purple", () => {
  assert.match(rule(".window-folder .window__chat-details-thread-ico"), /fill: var\(--primary-40, #5950ff\)/);
  assert.match(rule(".window-folder .window__chat-details-count-ico"), /fill: var\(--normal-fg-50, #65656c\)/);
  assert.match(rule(".window-folder .window__chat-details-action-ico"), /fill: var\(--normal-fg, #0b0a21\)/);
});

// Hover rows carry 4px of vertical padding each, so the list gap shrinks by
// the same 8px to keep Figma's 12px between rows.
test("file and link lists keep Figma's row rhythm with hover padding", () => {
  assert.match(rule(".window-folder .window__chat-details-body[data-page=file], .window-folder .window__chat-details-body[data-page=link]"), /gap: 4px/);
});

// Photos / Videos: a hovered tile gets a border. Drawn on an overlay above the
// absolutely placed image (a box-shadow on the tile itself would sit under it),
// as an inset ring so the 61px grid never shifts, and click-through.
test("photo and video tiles show a border on hover", () => {
  const ring = rule(".window-folder .window__chat-details-tile::after");
  assert.match(ring, /position: absolute/);
  assert.match(ring, /inset: 0/);
  assert.match(ring, /border-radius: 8px/);
  assert.match(ring, /pointer-events: none/);
  assert.match(rule(".window-folder .window__chat-details-tile:hover::after"), /box-shadow: inset 0 0 0 2px var\(--primary-40, #5950ff\)/);
});

// Same painting as a chat attachment chip (widget/chat/skin/attachment.scss):
// the glyph takes the text colour, and the office raw icons get their page
// body whitened (it has no fill of its own and would default to black).
test("file tiles are painted like chat attachment chips", () => {
  assert.match(rule(".window-folder .window__chat-details-file-ico svg"), /color: var\(--normal-fg-10, #0b0a21\); fill: currentcolor/);
  const office = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"]
    .map((e) => `.window-folder .window__chat-details-file-ico[data-ext=${e}] svg`).join(", ");
  assert.match(rule(office), /color: var\(--white, #ffffff\); fill: var\(--white, #ffffff\)/);
  assert.doesNotMatch(css, /window__chat-details-file-ico--/);
});

// Mute / Meeting / Download labels are Regular in Figma (775:132186); global
// button typography must not bold them.
test("action tiles are not bold", () => {
  assert.match(rule(".window-folder .window__chat-details-actions, .window-folder .window__chat-details-actions *"), /font-weight: 400/);
});

// Long thread / member lists scroll inside their own box instead of pushing
// the panel: threads capped, members take the remaining height.
test("thread and member lists handle overflow with their own scrollbar", () => {
  const threads = rule(".window-folder .window__chat-details-thread-list");
  assert.match(threads, /max-height: 108px/); // ~3 rows
  assert.match(threads, /overflow-y: auto/);
  const members = rule(".window-folder .window__chat-details-members-list");
  assert.match(members, /flex: 1 1 0/);
  assert.match(members, /min-height: 0/);
  assert.match(members, /overflow-y: auto/);
  // No floor: with a non-scrolling panel the members list absorbs whatever is left.
  assert.match(rule(".window-folder .window__chat-details-members"), /flex: 1 1 0; min-height: 0/);
  for (const sel of ["thread-list", "members-list"]) {
    assert.match(rule(`.window-folder .window__chat-details-${sel}`), /scrollbar-width: thin/, sel);
  }
});

// With the panel fixed, a page (Photos / Videos / Files / Links) scrolls its
// own body under the header.
test("page body fills the panel and scrolls itself", () => {
  const body = rule(".window-folder .window__chat-details-body");
  assert.match(body, /flex: 1 1 0/);
  assert.match(body, /min-height: 0/);
  assert.match(body, /overflow-y: auto/);
  assert.match(body, /scrollbar-width: thin/);
});

// Header controls downsized from Figma's 24px on request.
test("back and close are 18px", () => {
  assert.match(rule(".window-folder .window__chat-details-back, .window-folder .window__chat-details-close"), /width: 18px; height: 18px/);
});

// Loading state set by chat-details/controller openItem on the clicked item.
test("a loading tile / file row / link row shows a spinning indicator and takes no clicks", () => {
  assert.match(css, /@keyframes chat-details-spin \{ to \{ transform: rotate\(360deg\); \} \}/);
  const tile = rule('.window-folder .window__chat-details-tile[data-loading="1"]::before');
  assert.match(tile, /animation: chat-details-spin 0\.7s linear infinite/);
  assert.match(tile, /border-top-color: #fff/);
  assert.match(rule('.window-folder .window__chat-details-tile[data-loading="1"]::after'), /background: rgba\(0, 0, 0, 0\.3\)/);
  const row = rule('.window-folder .window__chat-details-file[data-loading="1"]::before, .window-folder .window__chat-details-link[data-loading="1"]::before');
  assert.match(row, /animation: chat-details-spin 0\.7s linear infinite/);
  assert.match(row, /border-top-color: var\(--primary-40, #5950ff\)/);
  for (const i of ["tile", "file", "link"]) {
    assert.match(css, new RegExp(`\\.window__chat-details-${i}\\[data-loading="1"\\][^{]*\\{[^}]*pointer-events: none`), i);
  }
});

// The "Meeting" tile follows the Meet start button's two states
// (meeting-schedule.scss &__meeting-sched-start-btn).
test("action tiles: spinner in place of the icon while working; meeting tile brand + locked once joined", () => {
  // Every action tile (Mute / Meeting / Download) shows the same loading state.
  const loading = '.window-folder .window__chat-details-action[data-loading="1"]';
  assert.match(rule(loading), /pointer-events: none/);
  assert.match(rule(`${loading} .window__chat-details-action-ico`), /display: none/);
  const spin = rule(`${loading}::before`);
  assert.match(spin, /animation: chat-details-spin 0\.7s linear infinite/);
  assert.match(spin, /width: 16px; height: 16px/);
  const joined = rule('.window-folder .window__chat-details-action--meeting[data-joined="1"]');
  assert.match(joined, /pointer-events: none/);
  assert.match(joined, /background: var\(--primary-40, #5950ff\)/);
  assert.match(rule('.window-folder .window__chat-details-action--meeting[data-joined="1"] *'), /color: #fff; fill: #fff/);
});
