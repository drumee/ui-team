// Both Google Drive import cards — the popup and the migrate tour's dialog
// that teaches it — are drawn at one shared, smaller scale.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/widget/migrate-gdrive-popup/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
  })
  .css.replace(/\s+/g, " ");

test("one zoom scales the popup's content and the tour's dialog alike", () => {
  const m = css.match(/\.migrate-gdrive-popup__container, \.tutorial-migrate__dialog \{([^}]*)\}/);
  assert.ok(m, "missing the shared scale rule");
  assert.match(m[1], /zoom: 0\.85;/);
});

test("the popup card's own width shrinks to match its scaled content", () => {
  assert.match(css, /\.migrate-gdrive-popup__ui \{[^}]*width: min\(436px, (calc\()?100vw - 32px\)?\);/);
});
