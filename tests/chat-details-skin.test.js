// chat-details-skin.test.js — compiles the widget_chat_details skin (and the
// folder window's slot rules) and pins the
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
const compile = (p) =>
  sass
    .compile(path.join(SRC, p), {
      loadPaths: [SRC, path.join(SRC, "skin")],
      silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
      logger: sass.Logger.silent,
    })
    .css.replace(/\s+/g, " ");
// The panel itself is widget_chat_details (its own skin); the folder window
// keeps only the slot: the column swap and the chat gate.
const css = compile("builtins/widget/chat-details/skin/index.scss");
const folderCss = compile("builtins/window/folder/skin/index.scss");

const ruleIn = (src, sel) => {
  const m = src.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};
const rule = (sel) => ruleIn(/split-body|chat_gated/.test(sel) ? folderCss : css, sel);

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
  const card = rule(".widget-chat-details__ui");
  assert.match(card, /gap: 20px/);
  assert.match(card, /padding: 12px/);
  assert.match(card, /border-radius: 8px/);
  // The panel itself never scrolls (on request): lists and page bodies do.
  assert.match(card, /overflow: hidden/);
  assert.doesNotMatch(card, /overflow-y: auto/);
  const tile = rule(".widget-chat-details__ui .widget-chat-details-action");
  // Downsized from Figma (8px 20px / 12px radius / 24px icon / 14px label) on request.
  assert.match(tile, /padding: 6px 12px/);
  assert.match(tile, /border-radius: 10px/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-action-ico"), /width: 20px; height: 20px/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-action-label"), /font-size: 12px/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-avatar"), /width: 32px; height: 32px/);
  // The picture box keeps the 61px square; the tile is its column with the name.
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-thumb"), /width: 61px; height: 61px/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-tile"), /width: 61px/);
  const name = rule(".widget-chat-details__ui .widget-chat-details-tile-name");
  assert.match(name, /white-space: nowrap/);
  assert.match(name, /text-overflow: ellipsis/);
  // Widened from Figma's 4px on request: tiles read as separate items.
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-grid"), /gap: 8px/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-duration"), /background: rgba\(20, 17, 35, 0\.4\)/);
  assert.match(rule('.widget-chat-details__ui .widget-chat-details-member-status[data-online="1"]'), /color: var\(--primary-40, #5950ff\)/);
});

test("every text in the panel uses the app font", () => {
  assert.match(rule(".widget-chat-details__ui, .widget-chat-details__ui *"), /font-family: var\(--font-main\)/);
});

// Back must stay reachable on a long Files / Links list.
test("the header sticks to the top of the scrolling panel", () => {
  const h = rule(".widget-chat-details__ui .widget-chat-details-header");
  assert.match(h, /position: sticky/);
  // -12px cancels the panel padding: sticky clamps inside the scrollport padding otherwise,
  // which left the header 12px low with rows showing above it.
  assert.match(h, /top: -12px/);
  assert.match(h, /z-index: 1/);
});

test("count rows and every page item answer the pointer", () => {
  for (const item of ["count", "file", "link"]) {
    assert.match(rule(`.widget-chat-details__ui .widget-chat-details-${item}:hover`), /background: rgba\(0, 0, 0, 0\.05\)/, item);
  }
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-tile:hover .widget-chat-details-thumb"), /opacity: 0\.85/);
});

test("link and file thumbnails are compact, their glyph sized, not left to fill the box", () => {
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-link-thumb"), /width: 32px; height: 32px/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-link-thumb svg"), /width: 16px; height: 16px/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-file-ico svg"), /width: 18px; height: 18px/);
});

test("icons are painted through fill (sprite glyphs ignore color alone); thread paperclip is brand purple", () => {
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-thread-ico"), /fill: var\(--primary-40, #5950ff\)/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-count-ico"), /fill: var\(--normal-fg-50, #65656c\)/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-action-ico"), /fill: var\(--normal-fg, #0b0a21\)/);
});

// Hover rows carry 4px of vertical padding each, so the list gap shrinks by
// the same 8px to keep Figma's 12px between rows.
test("file and link lists keep Figma's row rhythm with hover padding", () => {
  // Rows now sit in a per-month list (every page groups by month).
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-month-list"), /gap: 4px/);
});

// Photos / Videos: a hovered tile gets a border. Drawn on an overlay above the
// absolutely placed image (a box-shadow on the tile itself would sit under it),
// as an inset ring so the 61px grid never shifts, and click-through.
test("photo and video tiles show a border on hover", () => {
  const ring = rule(".widget-chat-details__ui .widget-chat-details-thumb::after");
  assert.match(ring, /position: absolute/);
  assert.match(ring, /inset: 0/);
  assert.match(ring, /border-radius: 8px/);
  assert.match(ring, /pointer-events: none/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-tile:hover .widget-chat-details-thumb::after"), /box-shadow: inset 0 0 0 2px var\(--primary-40, #5950ff\)/);
});

// Same painting as a chat attachment chip (widget/chat/skin/attachment.scss):
// the glyph takes the text colour, and the office raw icons get their page
// body whitened (it has no fill of its own and would default to black).
test("file tiles are painted like chat attachment chips", () => {
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-file-ico svg"), /color: var\(--normal-fg-10, #0b0a21\); fill: currentcolor/);
  const office = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"]
    .map((e) => `.widget-chat-details__ui .widget-chat-details-file-ico[data-ext=${e}] svg`).join(", ");
  assert.match(rule(office), /color: var\(--white, #ffffff\); fill: var\(--white, #ffffff\)/);
  assert.doesNotMatch(css, /widget-chat-details-file-ico--/);
});

// Mute / Meeting / Download labels are Regular in Figma (775:132186); global
// button typography must not bold them.
test("action tiles are not bold", () => {
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-actions, .widget-chat-details__ui .widget-chat-details-actions *"), /font-weight: 400/);
});

// Long thread / member lists scroll inside their own box instead of pushing
// the panel: threads capped, members take the remaining height.
test("thread and member lists handle overflow with their own scrollbar", () => {
  const threads = rule(".widget-chat-details__ui .widget-chat-details-thread-list");
  assert.match(threads, /max-height: 108px/); // ~3 rows
  assert.match(threads, /overflow-y: auto/);
  const members = rule(".widget-chat-details__ui .widget-chat-details-members-list");
  assert.match(members, /flex: 1 1 0/);
  assert.match(members, /min-height: 0/);
  assert.match(members, /overflow-y: auto/);
  // No floor: with a non-scrolling panel the members list absorbs whatever is left.
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-members"), /flex: 1 1 0; min-height: 0/);
  for (const sel of ["thread-list", "members-list"]) {
    assert.match(rule(`.widget-chat-details__ui .widget-chat-details-${sel}`), /scrollbar-width: thin/, sel);
  }
});

// With the panel fixed, a page (Photos / Videos / Files / Links) scrolls its
// own body under the header.
test("page body fills the panel and scrolls itself", () => {
  const body = rule(".widget-chat-details__ui .widget-chat-details-body");
  assert.match(body, /flex: 1 1 0/);
  assert.match(body, /min-height: 0/);
  assert.match(body, /overflow-y: auto/);
  assert.match(body, /scrollbar-width: thin/);
});

// Header controls downsized from Figma's 24px on request.
test("back and close are 18px", () => {
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-back, .widget-chat-details__ui .widget-chat-details-close"), /width: 18px; height: 18px/);
});

// Loading state set by chat-details/controller openItem on the clicked item.
test("a loading tile / file row / link row shows a spinning indicator and takes no clicks", () => {
  assert.match(css, /@keyframes chat-details-spin \{ to \{ transform: rotate\(360deg\); \} \}/);
  const tile = rule('.widget-chat-details__ui .widget-chat-details-tile[data-loading="1"] .widget-chat-details-thumb::before');
  assert.match(tile, /animation: chat-details-spin 0\.7s linear infinite/);
  assert.match(tile, /border-top-color: #fff/);
  assert.match(rule('.widget-chat-details__ui .widget-chat-details-tile[data-loading="1"] .widget-chat-details-thumb::after'), /background: rgba\(0, 0, 0, 0\.3\)/);
  const row = rule('.widget-chat-details__ui .widget-chat-details-file[data-loading="1"]::before, .widget-chat-details__ui .widget-chat-details-link[data-loading="1"]::before');
  assert.match(row, /animation: chat-details-spin 0\.7s linear infinite/);
  assert.match(row, /border-top-color: var\(--primary-40, #5950ff\)/);
  for (const i of ["tile", "file", "link"]) {
    assert.match(css, new RegExp(`\\.widget-chat-details-${i}\\[data-loading="1"\\][^{]*\\{[^}]*pointer-events: none`), i);
  }
});

// The "Meeting" tile follows the Meet start button's two states
// (meeting-schedule.scss &__meeting-sched-start-btn).
test("action tiles: spinner in place of the icon while working; meeting tile brand + locked once joined", () => {
  // Every action tile (Mute / Meeting / Download) shows the same loading state.
  const loading = '.widget-chat-details__ui .widget-chat-details-action[data-loading="1"]';
  assert.match(rule(loading), /pointer-events: none/);
  assert.match(rule(`${loading} .widget-chat-details-action-ico`), /display: none/);
  const spin = rule(`${loading}::before`);
  assert.match(spin, /animation: chat-details-spin 0\.7s linear infinite/);
  assert.match(spin, /width: 16px; height: 16px/);
  const joined = rule('.widget-chat-details__ui .widget-chat-details-action--meeting[data-joined="1"]');
  assert.match(joined, /pointer-events: none/);
  assert.match(joined, /background: var\(--primary-40, #5950ff\)/);
  assert.match(rule('.widget-chat-details__ui .widget-chat-details-action--meeting[data-joined="1"] *'), /color: #fff; fill: #fff/);
});

// ui-core renders a Note as .note > .note-content: text-overflow on the outer
// box never applies (its content is a block child), so every truncated line in
// the panel — tile names, file / link rows, thread and member names — was cut
// mid-word with no "…". The inner box inherits the ellipsis settings.
test("truncated Note text ends in an ellipsis (inner .note-content)", () => {
  const inner = rule(".widget-chat-details__ui .note-content");
  assert.match(inner, /overflow: hidden/);
  assert.match(inner, /text-overflow: inherit/);
  assert.match(inner, /white-space: inherit/);
});

// Loading skeletons: grey blocks pulsing with the app's own keyframes
// (mixins/drumee drumee-skeleton-pulse), still for reduced motion; real
// sections fade in over them (drumee-skeleton-content-in).
test("skeleton blocks pulse like the rest of the app, real content fades in", () => {
  const block = rule(".widget-chat-details__ui .widget-chat-details-sk");
  assert.match(block, /background-color: var\(--border-default, #e5e5ea\)/);
  assert.match(block, /animation: drumee-skeleton-pulse 1\.2s ease-in-out infinite/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.widget-chat-details__ui \.widget-chat-details-sk \{ animation: none; \} \}/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-sk--circle"), /border-radius: 50%/);
  assert.match(rule(".widget-chat-details__ui .widget-chat-details-sk--tile"), /width: 61px; height: 61px/);
  for (const sec of ["threads", "counts", "members", "body"]) {
    assert.match(rule(`.widget-chat-details__ui .widget-chat-details-${sec}`), /animation: drumee-skeleton-content-in 0\.2s ease-out backwards/, sec);
  }
});

// Chat tab: the ⋮ in the "# General" header opens Chat details as a third
// column — thread rail | chat | details — with the chat still in view. Only
// a compact window (≤700px, one column) swaps details in for the chat.
const DETAILS_COL = "clamp(320px, 26vw, 380px)";
const RAIL_COL = "clamp(240px, 22vw, 300px)";
// Whether the rule at `idx` sits inside an `@container window-folder-w
// (max-width: 700px)` block (brace depth from that block's opening).
const inCompact = (src, idx) => {
  const head = "@container window-folder-w (max-width: 700px) {";
  const start = src.lastIndexOf(head, idx);
  if (start < 0) return false;
  let depth = 0;
  for (let i = start + head.length - 1; i < idx; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
    if (depth === 0) return false;
  }
  return true;
};
test("on the Chat tab, details opens as a third column beside rail and chat", () => {
  const open = ".window-folder__split-body[data-view=chat][data-details=open]";
  const cols = new RegExp(`grid-template-columns: ${RAIL_COL.replace(/[()]/g, "\\$&")} minmax\\(0, 1fr\\) ${DETAILS_COL.replace(/[()]/g, "\\$&")}`);
  assert.match(ruleIn(folderCss, open), cols);
  assert.match(ruleIn(folderCss, `${open} > .window__chat-details`), /display: flex !important/);
  // With a file thread open too: still three columns, the thread panel waits.
  assert.match(ruleIn(folderCss, `${open}[data-thread=open]`), cols);
  assert.match(ruleIn(folderCss, `${open}[data-thread=open] > .window__file-thread-panel`), /display: none !important/);
  // The chat is hidden only in the compact single column.
  const hide = `${open} > .window__chat-panel { display: none !important; }`;
  const at = folderCss.indexOf(hide);
  assert.ok(at >= 0, "compact swap rule missing");
  assert.ok(inCompact(folderCss, at), "the chat must stay visible on a desktop Chat tab");
  assert.equal(folderCss.indexOf(hide, at + 1), -1, "no other rule hides the chat");
});

// A fed widget gets no data-flow (neither host passes `flow`), so the
// framework's [data-flow=y] flex never applies to its root: the root must be
// a flex column by itself, or the section gaps vanish, the tiles are clipped
// and the members list (flex-basis 0) collapses to nothing.
test("the widget root is a flex column by itself (no data-flow on a fed widget)", () => {
  const root = rule(".widget-chat-details__ui");
  assert.match(root, /display: flex/);
  assert.match(root, /flex-direction: column/);
});

test("no divider between the counts and the members", () => {
  assert.doesNotMatch(css, /widget-chat-details-divider/);
});

// Chat tab: every column is its own card (r=8, 5%-black hairline) with a
// gutter between them — rail | chat | file thread | details. The details
// card is the widget root itself, so its slot draws no border of its own.
test("Chat tab: columns are separate cards with a gap between them", () => {
  const body = ".window-folder__split-body.window__split-body[data-view=chat]";
  assert.match(ruleIn(folderCss, body), /gap: 8px/);
  const cards = ruleIn(folderCss, `${body} > .window__thread-rail, ${body} > .window__chat-panel, ${body} > .window__file-thread-panel`);
  assert.match(cards, /border: 1px solid rgba\(0, 0, 0, 0\.05\)/);
  assert.match(cards, /border-radius: 8px/);
  // The card rule must not clip the rail: its thread list scrolls.
  assert.doesNotMatch(cards, /overflow/);
  assert.match(ruleIn(folderCss, ".window-folder .window__thread-rail"), /overflow-y: auto/);
  const root = rule(".widget-chat-details__ui");
  assert.match(root, /border: 1px solid rgba\(0, 0, 0, 0\.05\)/);
  assert.match(root, /border-radius: 8px/);
  assert.doesNotMatch(ruleIn(folderCss, ".window-folder__split-body[data-view=chat][data-details=open] > .window__chat-details"), /border/);
});
