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

// ── the top-bar address track (Figma 59:55943) ───────────────────────────────
//
// The frame draws every crumb as the same icon+name pill. Home was a bare Note
// at a hardcoded #65656c while each crumb was a widget on var(--normal-fg-10),
// so the two rendered in different greys on different baselines. Nothing but a
// side-by-side check catches that, because each rule is defensible alone.
test("Home and the crumbs share one type ramp", () => {
  // Comment-stripped: the prose in these files quotes the very values it
  // warns about (the old #65656c), which a raw match reads as the declaration.
  const bc = stripComments(
    readFileSync(join(SRC, "modules/desk/breadcrumb/skin/index.scss"), "utf8"),
  );
  const item = stripComments(
    readFileSync(join(SRC, "modules/desk/breadcrumb/item/skin/index.scss"), "utf8"),
  );

  const ramp = (src, sel) => {
    const i = src.indexOf(sel);
    assert.ok(i > 0, `${sel} not found`);
    const rule = src.slice(i, src.indexOf("\n  }", i));
    return {
      size: (rule.match(/\$size:\s*([\w.]+)/) || [])[1],
      line: (rule.match(/\$line:\s*([\w.]+)/) || [])[1],
      color: (rule.match(/\$color:\s*([^,)]+)/) || [])[1],
      weight: (rule.match(/font-weight:\s*(\d+)/) || [])[1],
    };
  };

  const home = ramp(bc, "&__context-label {");
  const crumb = ramp(item, "&__filename {");
  assert.deepEqual(home, crumb, "Home and crumb labels must match exactly");

  // No hardcoded grey: that literal is what made Home a different colour.
  assert.doesNotMatch(bc, /#65656c/i, "use a token, not a hardcoded grey");

  // drumee.typo() emits no font-weight, so passing $weight to it is a silent
  // no-op — the weight must be written out.
  assert.ok(home.weight, "the weight must be an explicit font-weight");
  assert.doesNotMatch(bc, /typo\([^)]*\$weight/, "$weight in typo() does nothing");
  assert.doesNotMatch(item, /typo\([^)]*\$weight/, "$weight in typo() does nothing");
});

test("every crumb renders a real workspace icon", () => {
  const skel = stripComments(
    readFileSync(join(SRC, "modules/desk/breadcrumb/item/skeleton/index.js"), "utf8"),
  );

  // The four raw-drumee-folder-* names exist in NEITHER sprite; they were
  // computed into a variable the skeleton never used, so the breadcrumb drew
  // no icon at all.
  assert.doesNotMatch(skel, /raw-drumee-folder-/, "those sprite names do not exist");
  assert.match(skel, /require\("media\/grid\/template\/folder"\)/);
  assert.match(
    skel,
    /Skeletons\.Element\(\{[\s\S]*?content:\s*folderArt\(/,
    "the template returns markup — Element + content, not Image.Svg + ico",
  );

  // And it must be sized, or the 105x86 source renders at intrinsic size.
  const skin = stripComments(
    readFileSync(join(SRC, "modules/desk/breadcrumb/item/skin/index.scss"), "utf8"),
  );
  const i = skin.indexOf("&__icon {");
  assert.ok(i > 0, "__icon rule missing");
  assert.match(skin.slice(i, i + 400), /width:\s*20px/, "the icon must be sized");
  assert.match(skin, /\.folder-shape\s*\{[\s\S]{0,120}width:/, ".folder-shape must be sized");
});

// ── Personal Calendar toolbar (Figma 43:31159) ───────────────────────────────
test("the calendar toolbar paints no unstyled tooltip", () => {
  // ui-core's `tooltips` builds a bare <div class="tooltips"> and shows it on
  // hover. That class is styled ONLY in the editor skins, so anywhere else it
  // renders as unstyled floating text over the UI.
  const dir = join(SRC, "builtins/panel/calendar/skeleton");
  const offenders = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    if (stripComments(readFileSync(join(dir, f), "utf8")).includes("tooltips:")) {
      offenders.push(f);
    }
  }
  assert.deepEqual(
    offenders, [],
    "`tooltips` renders unstyled here — use attrOpt aria-label:\n  " + offenders.join("\n  "),
  );

  // The icon-only arrows must still be labelled for assistive tech.
  const bar = stripComments(readFileSync(join(dir, "toolbar.js"), "utf8"));
  assert.match(bar, /"aria-label": LOCALE\.PREVIOUS/);
  assert.match(bar, /"aria-label": LOCALE\.NEXT/);
});

test("‹ Today › matches the frame and its neighbours", () => {
  const skin = stripComments(
    readFileSync(join(SRC, "builtins/panel/calendar/skin/index.scss"), "utf8"),
  );
  const rule = (sel) => {
    const i = skin.indexOf(sel);
    assert.ok(i > 0, `${sel} not found`);
    return skin.slice(i, skin.indexOf("\n  }", i));
  };

  // 43:31159 gives the nav group `fills: []` and no radius — it is a bare
  // group, not the filled capsule this used to be.
  const nav = rule("&__nav {");
  assert.doesNotMatch(nav, /background:/, "the nav group carries no fill in the frame");
  assert.doesNotMatch(nav, /border-radius:\s*999px/, "and no capsule radius");

  // Today and the range label are both 16px/w600 in the frame and sit on the
  // same row, so their ramps must be identical or they land on different
  // baselines.
  const ramp = (sel) => {
    const r = rule(sel);
    return [
      (r.match(/\$size:\s*([\w.]+)/) || [])[1],
      (r.match(/\$line:\s*([\w.]+)/) || [])[1],
      (r.match(/font-weight:\s*(\d+)/) || [])[1],
    ];
  };
  assert.deepEqual(ramp("&__nav-today {"), ramp("&__range-label {"));
  assert.deepEqual(ramp("&__nav-today {"), ["16px", "20px", "600"]);
});
