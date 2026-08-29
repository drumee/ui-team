// Two shell bugs that shipped as visual breakage with no error.
//
//  1. MARKUP PASSED AS AN ICON NAME. media/grid/template/folder returns an
//     HTML STRING, while `ico` names a symbol in the sprite. The workspace
//     switcher passed the markup as `ico` to Image.Svg, which built
//     `<use href="#<markup>">` — resolving to nothing and painting a broken
//     oversized glyph on the first row. The correct wrapper is Element +
//     content, which is what the inbox's workspace rows already used.
//
//  2. SLIDE-OUTS SIZED TO THE VIEWPORT. Trash and Contacts were
//     `position: fixed; height: 100vh; top: 0`, which was right for the old
//     full-bleed shell. The new shell is a padded CANVAS (43:23955): 8px
//     gutters under a 46px top bar. Sized to the viewport they covered the top
//     bar and overran both gutters.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src/drumee");

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

function jsFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) jsFiles(p, out);
    else if (e.endsWith(".js")) out.push(p);
  }
  return out;
}

test("no Image.Svg/Button.Svg is fed computed markup as its icon name", () => {
  // `ico` must be a static icon NAME. A call expression there is almost always
  // a template helper returning HTML, which silently renders nothing.
  const FOLDER_HELPERS = /ico:\s*(glyph|folderIcon|getFolderIcon)\s*\(/;
  const offenders = [];
  for (const file of jsFiles(SRC)) {
    const src = stripComments(readFileSync(file, "utf8"));
    if (FOLDER_HELPERS.test(src)) {
      offenders.push(file.slice(ROOT.length + 1));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "`ico` names a sprite symbol; these pass a function that returns HTML " +
      "markup, which builds <use href=\"#<markup>\"> and renders a broken " +
      "glyph. Use Skeletons.Element({ content: ... }) instead:\n  " +
      offenders.join("\n  "),
  );
});

test("the workspace switcher renders its folder icon as markup", () => {
  const desk = stripComments(readFileSync(join(SRC, "modules/desk/index.js"), "utf8"));
  const start = desk.indexOf("async _renderWorkspaceMenu(");
  assert.ok(start > 0, "_renderWorkspaceMenu not found");
  const body = desk.slice(start, desk.indexOf("\n  }", start));

  assert.match(
    body,
    /Skeletons\.Element\(\{[\s\S]*?content:\s*glyph\(row\)/,
    "the row icon must be Element + content",
  );
  assert.doesNotMatch(
    body,
    /Skeletons\.Image\.Svg\(\{[\s\S]*?ico:\s*glyph\(row\)/,
    "Image.Svg + ico is the broken shape",
  );
});

test("the desk publishes its canvas geometry once", () => {
  const skin = stripComments(
    readFileSync(join(SRC, "modules/desk/skin/index.scss"), "utf8"),
  );
  // A fixed-position panel is viewport-relative and knows nothing about the
  // padded canvas, so the geometry has to be published for it to read.
  assert.match(skin, /--desk-gutter:\s*8px/);
  assert.match(skin, /--desk-topbar-h:\s*46px/);
  assert.match(skin, /--desk-canvas-top:\s*calc\(/);
});

test("slide-out panels sit inside the canvas, not over the whole viewport", () => {
  const panels = {
    Trash: "builtins/panel/trash/skin/index.scss",
    Contacts: "builtins/widget/address-book/skin/index.scss",
  };

  for (const [name, rel] of Object.entries(panels)) {
    // Comment-stripped: these rules are documented at length, and the prose
    // says things like "it used to be height:100vh" that a naive match reads
    // as the declaration it warns about.
    const skin = stripComments(readFileSync(join(SRC, rel), "utf8"));
    const start = skin.indexOf("&__ui {");
    assert.ok(start > 0, `${name}: __ui rule not found`);
    const rule = skin.slice(start, skin.indexOf("\n  }", start));

    assert.match(
      rule,
      /top:\s*var\(--desk-canvas-top/,
      `${name} must start below the top bar`,
    );
    assert.match(
      rule,
      /bottom:\s*var\(--desk-gutter/,
      `${name} must stop at the bottom gutter`,
    );
    assert.doesNotMatch(
      rule,
      /height:\s*100vh/,
      `${name} must not be sized to the viewport — that covers the top bar`,
    );
    assert.doesNotMatch(rule, /^\s*top:\s*0;/m, `${name} must not anchor at top:0`);
    assert.match(rule, /border-radius:\s*8px/, `${name} must be a r=8 canvas panel`);

    // Parked off-screen it must clear the gutter too, or a sliver shows.
    assert.match(
      rule,
      /translateX\(calc\(100% \+ var\(--desk-gutter/,
      `${name} must park clear of the right gutter`,
    );
  }
});
