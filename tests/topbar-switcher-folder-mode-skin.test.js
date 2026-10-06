// tests/topbar-switcher-folder-mode-skin.test.js — folder mode drops the
// workspace header and "New workspaces"; workspace mode keeps them.
//
//   node --test tests/topbar-switcher-folder-mode-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "modules/desk/skin/topbar.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");

const scoped = (part) =>
  new RegExp(
    `\\.desk-module-topbar__crumb-group\\[data-ws-mode=["']?folders["']?\\] \\.desk-module-topbar__${part}[^{]*\\{[^}]*display: none !important`,
  );

test("folder mode hides the workspace header", () => {
  assert.match(css, scoped("ws-head"));
});

test("folder mode hides New workspaces", () => {
  assert.match(css, scoped("ws-new"));
});

test("the hide is scoped to folder mode only", () => {
  // Anchored at a rule start: the scoped rule's own selector ends in
  // `.desk-module-topbar__ws-new {` too.
  assert.doesNotMatch(css, /(?:^|\} )\.desk-module-topbar__ws-head \{[^}]*display: none/);
  assert.doesNotMatch(css, /(?:^|\} )\.desk-module-topbar__ws-new \{[^}]*display: none/);
});
