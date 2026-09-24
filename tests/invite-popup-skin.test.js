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
