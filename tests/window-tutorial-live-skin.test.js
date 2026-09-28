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

// After Done the live dialog sits on the tour's own drawn Files screen, as it
// did during the walkthrough — the tour canvas stays, nothing is see-through.
test("live: the tour canvas is kept (no see-through override)", () => {
  assert.doesNotMatch(css, /\[data-live="1"\] \.tutorial-main__(content|layout)/);
});

// No backdrop behind the live dialog: the tour screen is shown at full
// strength, exactly as on the walkthrough's dialog screens.
const mig = sass
  .compile(path.join(SRC, "modules/desk/tutorial/migrate/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
  })
  .css.replace(/\s+/g, " ");
test("live: no backdrop dim on the stage", () => {
  assert.doesNotMatch(mig, /\.tutorial-migrate__stage--live \{[^}]*background/);
});
