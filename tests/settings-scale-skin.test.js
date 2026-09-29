// The Settings page and its "Unsaved changes" dialog are drawn at 85%, the
// same compact scale as the create-workspace / create-folder dialogs.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const compile = (f) => sass
  .compile(path.join(SRC, f), { loadPaths: [SRC, path.join(SRC, "skin")] })
  .css.replace(/\s+/g, " ");
const main = compile("builtins/widget/settings/main/skin/index.scss");
const leave = compile("builtins/widget/settings/leave-confirm/skin/index.scss");

test("the page's header row and card rows are zoomed to 85%", () => {
  assert.match(main, /\.settings-main__header-row, \.settings-main__row \{ zoom: 0\.85; \}/);
});

test("__ui itself is never zoomed: it holds the fixed overlay and toast", () => {
  const ui = main.match(/\.settings-main__ui \{[^}]*\}/)[0];
  assert.doesNotMatch(ui, /zoom/);
  assert.match(ui, /padding: calc\(var\(--spacer-6\) \* 0\.85\)/);
  assert.match(ui, /gap: calc\(var\(--spacer-6\) \* 0\.85\)/);
});

test("the leave dialog's card is zoomed to 85%, its backdrop is not", () => {
  assert.match(leave, /\.settings-leave-confirm__modal \{ zoom: 0\.85;/);
  const backdrop = leave.match(/\.settings-leave-confirm__backdrop \{[^}]*\}/g).join(" ");
  assert.doesNotMatch(backdrop, /zoom/);
});

test("the change-email, change-password, export-data and delete-account cards are zoomed to 85%", () => {
  for (const d of ["change-email", "change-password", "export-data", "delete-account"]) {
    const css = compile(`builtins/widget/settings/${d}/skin/index.scss`);
    assert.match(css, new RegExp(`\\.settings-${d}__modal \\{ zoom: 0\\.85;`), d);
    // A viewport width inside a zoomed box shrinks too; it is divided back out.
    assert.doesNotMatch(css, /calc\(100vw - 32px\)(?! \/)/, d);
  }
});
