// The create-workspace dialog (media/form, `form-folder`) and the workspace
// tour's drawing of it are both drawn at 85% — one scale, written in each
// skin because webpack only injects a widget's stylesheet when it loads.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const compile = (f) => sass
  .compile(path.join(SRC, f), { loadPaths: [SRC, path.join(SRC, "skin")] })
  .css.replace(/\s+/g, " ");
const form = compile("builtins/media/form/skin/index.scss");
const tour = compile("modules/desk/tutorial/workspace/skin/index.scss");

test("the form's content is zoomed to 85%", () => {
  assert.match(form, /\.form-folder__main \{[^}]*zoom: 0\.85;/);
});

test("the form's frame is sized to its scaled content", () => {
  assert.match(form, /\.form-folder__ui \{[^}]*width: 391px;/);
  assert.match(form, /\.form-folder__ui \{[^}]*max-width: calc\(100vw - 32px\);/);
});

test("the tour's drawing of the dialog is zoomed the same", () => {
  assert.match(tour, /\.tutorial-workspace__wsd-dialog \{[^}]*zoom: 0\.85;/);
});
