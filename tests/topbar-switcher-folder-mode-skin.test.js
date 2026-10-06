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

// The folder-mode heading reads like the crumb it stands for
// (breadcrumb/item/skin __tab, __icon, __filename).
const ruleOf = (sel) => {
  const m = css.match(new RegExp("(?:^|\\} )" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing ${sel}`);
  return m[1];
};

test("crumb heading: tab geometry, no uppercase label styling", () => {
  const r = ruleOf(".desk-module-topbar__ws-section--crumb");
  assert.match(r, /text-transform: none/);
  assert.match(r, /letter-spacing: normal/);
  assert.match(r, /display: flex/);
  assert.match(r, /gap: var\(--crumb-gap, 6px\)/);
  assert.match(r, /height: calc\(var\(--crumb-height, 30px\) - 6px\)/);
  assert.match(r, /padding: 0 var\(--crumb-tab-pad, 4px\)/);
  assert.match(r, /border-radius: var\(--crumb-radius, 8px\)/);
});

test("crumb heading: 20x16 folder art, 13px badge", () => {
  assert.match(ruleOf(".desk-module-topbar__ws-section-icon"), /width: 20px/);
  assert.match(ruleOf(".desk-module-topbar__ws-section-icon .folder-shape"), /height: 16px/);
  // The LAST rule for the badge is the one that applies: the mixin emits the
  // rows' 16px badge first and the crumb's 13px override follows it.
  const all = [...css.matchAll(/(?:^|\} )\.desk-module-topbar__ws-section-icon \.badge \{([^}]*)\}/g)];
  assert.ok(all.length, "missing badge rule");
  const b = all[all.length - 1][1];
  assert.match(b, /width: 13px !important/);
  assert.match(b, /bottom: -2px/);
  assert.match(b, /filter: none/);
});

test("crumb heading: the crumb's name type", () => {
  const n = ruleOf(".desk-module-topbar__ws-section-name");
  assert.match(n, /font-size: 13px/);
  assert.match(n, /line-height: 18px/);
  assert.match(n, /font-weight: 400/);
  assert.match(n, /color: var\(--normal-fg-10\)/);
  assert.match(n, /text-overflow: ellipsis/);
  assert.match(css, /html\[data-theme=dark\] \.desk-module-topbar__ws-section-name \{[^}]*color: var\(--normal-fg\)/);
});
