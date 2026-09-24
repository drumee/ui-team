// Compiles the invite popup skin and pins the rules whose absence is a
// functional bug, not a cosmetic one.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/widget/invite-popup/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
  })
  .css.replace(/\s+/g, " ");

// The role menu is absolutely positioned inside the scrolling __tree: without
// this escape it opens INTO the scroll overflow (invisible on a short list) and
// its hover descriptions are clipped on the right. The pre-redesign skin had
// the same escape on __workspaces for the same reason.
test("an open role menu lifts the tree's overflow clip", () => {
  const m = css.match(/\.invite-popup__tree:has\(\.invite-popup__role-options\[data-state="1"\]\) \{([^}]*)\}/);
  assert.ok(m, "missing :has(role-options open) rule on __tree");
  assert.match(m[1], /overflow: visible/);
});

// The org card is a slot fed after the overview answers; while empty it must
// not take a 24px gap or draw its border.
test("an empty org slot is not rendered", () => {
  assert.match(css, /\.invite-popup__org-card\[data-state="0"\] \{ display: none !important; \}/);
});

// Compact variant (requested after the Figma pass): every item ~85% of the
// design's size. Pinned on the dimensions that set the popup's footprint.
const rule = (sel) => {
  const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};
test("compact sizes: card, type, rows, controls", () => {
  assert.match(rule(".invite-popup__ui"), /width: 440px/);
  assert.match(rule(".invite-popup__container"), /padding: 24px; gap: 16px/);
  assert.match(rule(".invite-popup__title"), /font: 600 16px/);
  assert.match(rule(".invite-popup__field-label"), /font: 600 13px/);
  assert.match(rule(".invite-popup__row-box"), /min-height: 32px/);
  assert.match(rule(".invite-popup__check"), /width: 16px; height: 16px/);
  assert.match(rule(".invite-popup__switch"), /width: 32px; height: 16px/);
  assert.match(rule(".invite-popup__get-link, .invite-popup__send-btn"), /padding: 8px 16px/);
});

// The folder template emits `.media-grid__folder-art > svg.folder-shape + .badge`
// sized for grid cards. Without the shared ws-folder-icon sizing the art box
// has no size, the folder draws at 0×0 and its area badge (globe / lock) falls
// out below the row — seen live on team-9637.
test("workspace glyph uses the shared folder-icon sizing", () => {
  assert.match(rule(".invite-popup__ws-icon"), /width: 20px; height: 20px;.*display: flex !important;.*overflow: visible; position: relative/);
  assert.match(rule(".invite-popup__ws-icon .media-grid__folder-art"), /width: 20px; height: 16px/);
  assert.match(rule(".invite-popup__ws-icon .folder-shape"), /width: 20px; height: 16px/);
  assert.match(rule(".invite-popup__ws-icon .badge"), /position: absolute/);
});
