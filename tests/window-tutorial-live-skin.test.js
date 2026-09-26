// Compiles the in-window tour host's skin and pins what the live migrate
// dialog needs to be seen over the real folder window.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/tutorial/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
  })
  .css.replace(/\s+/g, " ");

// The step is fed into tutorial-main__content, which paints --normal-bg for
// the mock. Live, that canvas would hide the folder the import lands in.
test("live: the content canvas is see-through, like the layout", () => {
  assert.match(css, /\.window-tutorial__ui\[data-live="1"\] \.tutorial-main__content[^{]*\{ background: transparent; \}/);
  assert.match(css, /\.window-tutorial__ui\[data-live="1"\] \.tutorial-main__layout[^{]*\{ background: transparent; \}/);
});
