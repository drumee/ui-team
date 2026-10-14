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

test("folder mode keeps the header: it names the open folder", () => {
  assert.doesNotMatch(css, scoped("ws-head"));
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

// The group label ("In aaaa", "INTERNAL") stays at the top of a long list.
const ruleOf = (sel) => {
  const m = css.match(new RegExp("(?:^|\\} )" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing ${sel}`);
  return m[1];
};

test("group label: sticky on the panel's own ground", () => {
  const r = ruleOf(".desk-module-topbar__ws-section");
  assert.match(r, /position: sticky/);
  assert.match(r, /top: 0/);
  assert.match(r, /background-color: var\(--normal-bg-elevated, #fff\)/);
  assert.match(r, /text-transform: uppercase/);
});

test("the old crumb-shaped heading is gone", () => {
  assert.doesNotMatch(css, /ws-section--crumb|ws-section-icon|ws-section-name/);
});
