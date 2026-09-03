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
// The track no longer opens with a Home tab: Home's only destination was the
// legacy all-workspaces grid, which is retired (the 2.0 shell is always inside
// a workspace — Desk._restoreDeskState opens one rather than showing an empty
// desk). The track now starts at the workspace crumb.
test("the Home crumb is gone, and nothing can still summon the home grid", () => {
  const skel = stripComments(
    readFileSync(join(SRC, "modules/desk/breadcrumb/skeleton/index.js"), "utf8"),
  );
  assert.doesNotMatch(skel, /load-home/, "the Home crumb must not be rendered");
  assert.doesNotMatch(skel, /__context/, "…nor its slot");

  const bc = stripComments(
    readFileSync(join(SRC, "modules/desk/breadcrumb/index.js"), "utf8"),
  );
  assert.doesNotMatch(bc, /case "load-home"/, "…nor handled");
  // ensurePart NEVER resolves for a part that will not mount, so a leftover
  // wait on the removed context slot would hang its caller silently forever.
  assert.doesNotMatch(
    bc,
    /ensurePart\(_a\.context\)/,
    "no ensurePart on the removed context slot",
  );
  assert.doesNotMatch(bc, /Desk\.loadHome\(\)/, "loadDefault must not reset the desk");

  // The rail is the other way in, and it is the one that reaches the phone:
  // with no workspace open its tabs used to fall back to the same grid.
  const desk = stripComments(readFileSync(join(SRC, "modules/desk/index.js"), "utf8"));
  for (const fn of ["_railTab(tab) {", "_railAccess(opt) {"]) {
    const i = desk.indexOf(fn);
    assert.ok(i > -1, `${fn} exists`);
    const body = desk.slice(i, i + 500);
    assert.match(
      body,
      /if \(!w\) return this\._openDefaultWorkspace\(\)/,
      `${fn} must open a workspace, not the retired home grid`,
    );
  }
});

test("the crumbs share one type ramp", () => {
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

  const crumb = ramp(item, "&__filename {");
  assert.ok(crumb.size && crumb.line && crumb.color, "the crumb ramp is fully specified");

  // No hardcoded grey: that literal is what made Home a different colour, and
  // the same trap is open to any crumb rule added later.
  assert.doesNotMatch(bc, /#65656c/i, "use a token, not a hardcoded grey");

  // drumee.typo() emits no font-weight, so passing $weight to it is a silent
  // no-op — the weight must be written out.
  assert.ok(crumb.weight, "the weight must be an explicit font-weight");
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

  // Sizing the button is only half of it: the <svg> inside carries the glyph
  // and needs its own box, or it fills the button. Same defect as the
  // workspace tick.
  const arrow = rule("&__nav-arrow {");
  assert.match(arrow, /svg\s*\{[\s\S]{0,80}width:/, "the inner svg must be sized");

  // And the glyph must be SQUARE. `arrow-left`'s symbol is viewBox 40x22, so
  // xMidYMid meet fits it to the full width at half the height and draws a
  // long horizontal arrow beside a 16px label. caret-left/right are 256x256.
  const bar = stripComments(
    readFileSync(join(SRC, "builtins/panel/calendar/skeleton/toolbar.js"), "utf8"),
  );
  assert.doesNotMatch(bar, /ico:\s*"arrow-(left|right)"/, "arrow-* is a 40x22 glyph here");
  assert.match(bar, /ico:\s*"caret-left"/);
  assert.match(bar, /ico:\s*"caret-right"/);

  const sprite = readFileSync(join(ROOT, "icons/sprites/normalized.sprite.svg"), "utf8");
  for (const ico of ["caret-left", "caret-right"]) {
    // viewBox and id sit in the same <symbol ...> tag.
    const sym = sprite.match(new RegExp(`<symbol[^>]*id="--icon-${ico}"[^>]*>`));
    assert.ok(sym, `${ico} missing from the sprite`);
    const vb = sym[0].match(/viewBox="0 0 (\d+) (\d+)"/);
    assert.ok(vb, `${ico} has no viewBox`);
    assert.equal(vb[1], vb[2], `${ico} must be square — a wide glyph fits to the box`);
  }
});

test("opening a calendar dropdown repaints only the toolbar", () => {
  // Every menu toggle used to call _render(), which re-feeds the WHOLE page --
  // header, toolbar and the entire month grid with every chip -- to show a
  // two-item dropdown. Rebuilding the grid reflows the row above it, so the
  // button visibly jumped as its own menu opened.
  const panel = stripComments(
    readFileSync(join(SRC, "builtins/panel/calendar/index.js"), "utf8"),
  );

  for (const svc of [
    "cal-toggle-view-menu",
    "cal-toggle-range-menu",
    "cal-toggle-new-menu",
  ]) {
    const i = panel.indexOf(`case "${svc}":`);
    assert.ok(i > 0, `${svc} not handled`);
    const body = panel.slice(i, panel.indexOf("\n\n", i));
    assert.match(body, /_renderToolbar\(\)/, `${svc} must repaint only the toolbar`);
    assert.doesNotMatch(
      body, /return this\._render\(\)/,
      `${svc} must not repaint the grid`,
    );
  }

  // The part name the panel re-feeds has to be the one the skeleton declares.
  assert.match(panel, /getPart\("toolbar"\)/);

  // And the repaint must be SYNCHRONOUS with a fallback, never a promise whose
  // rejection is swallowed. The first cut used
  // ensurePart(...).then(...).catch(() => {}) — when that never resolved, the
  // dropdown silently refused to open. A dropdown that does nothing is worse
  // than one that reflows.
  const rt = panel.slice(panel.indexOf("_renderToolbar() {"));
  const body = rt.slice(0, rt.indexOf("\n  }"));
  assert.doesNotMatch(body, /catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/,
    "no silent catch — it turns a failure into a dead control");
  assert.doesNotMatch(body, /ensurePart/, "use the synchronous lookup");
  assert.match(body, /return this\._render\(\)/,
    "must fall back to a full render when the part is missing");
  const bar = stripComments(
    readFileSync(join(SRC, "builtins/panel/calendar/skeleton/toolbar.js"), "utf8"),
  );
  assert.match(bar, /sys_pn:\s*"toolbar"/);

  // feed() accepts an array, an object with .kind, or a function -- nothing
  // else, silently. The default export must stay the ARRAY of halves so the
  // array branch applies; the row is a separate export.
  assert.match(bar, /^\s*return \[/m, "the default export must return an array");
  assert.match(bar, /module\.exports\.row = function/);

  // Anything the GRID reads still needs a full render.
  for (const svc of ["cal-set-view", "cal-set-filter"]) {
    const i = panel.indexOf(`case "${svc}"`);
    if (i < 0) continue;
    // Bound to THIS handler: a fixed window runs past the closing brace into
    // the next case, which is how this first read a neighbour's call.
    const rest = panel.slice(i + 6);
    const end = rest.indexOf("\n      case ");
    const body = end === -1 ? rest : rest.slice(0, end);
    assert.doesNotMatch(
      body, /_renderToolbar\(\)/,
      `${svc} changes the grid — it must do a full render`,
    );
  }
});

test("no calendar control lets a child swallow its click", () => {
  // ui-core binds a click to EVERY widget that does not set active:0, and its
  // handler calls e.stopPropagation() BEFORE triggerHandlers. So a Box that
  // carries a `service` and has children must opt those children out, or the
  // child eats the click and the service never fires. Clicking the "+" or the
  // word "New" did nothing while a click on the button's padding worked.
  //
  // The suite already documents this as a repeat offender; this pins the
  // calendar so it cannot come back a fourth time.
  const dir = join(SRC, "builtins/panel/calendar/skeleton");
  const offenders = [];

  for (const f of readdirSync(dir).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(join(dir, f), "utf8");
    for (const m of src.matchAll(/Skeletons\.Box\.[XYZG]\(\{/g)) {
      // Balance braces to get this Box's own block.
      let i = m.index + m[0].length;
      let depth = 1;
      while (i < src.length && depth) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") depth--;
        i++;
      }
      const block = src.slice(m.index + m[0].length, i);
      // Props declared before `kids:` are this Box's own, not a child's.
      const head = block.split("kids:")[0];
      if (head.includes("service:") && block.includes("kids:") &&
          !head.includes("active: 0")) {
        offenders.push(`${f}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
  }

  assert.deepEqual(
    offenders, [],
    "These Boxes carry a service but let their children eat the click — add " +
      "`kidsOpt: { active: 0 }`:\n  " + offenders.join("\n  "),
  );
});

test("the mobile top bar carries workspace identity, not a wordmark", () => {
  // The Figma file has NO mobile frames — every top-level frame is desktop —
  // so this bar is derived from the desktop shell (43:23955 / 59:55943)
  // rather than copied. What it must not do is what it replaced: spend its
  // whole left half on a 101px wordmark and never name the workspace, which
  // left a phone user with no way to tell where they were.
  const skel = stripComments(
    readFileSync(join(SRC, "modules/desk/skeleton/index.js"), "utf8"),
  );

  assert.doesNotMatch(skel, /raw-logo-drumee-full/,
    "the wordmark belongs in the drawer header, not the bar");

  // Identity: the area-tinted folder shape + the name + a caret, mirroring the
  // desktop org-tab.
  assert.match(skel, /__mobile-workspace/);
  assert.match(skel, /require\("media\/grid\/template\/folder"\)/);
  assert.match(skel, /Skeletons\.Element\(\{[\s\S]{0,200}content:\s*require\("media\/grid\/template\/folder"\)/,
    "the folder template returns markup — Element + content, not ico");

  // `ws-current` is the part _setWorkspaceLabel already writes, so the name
  // tracks a switch with no new wiring.
  assert.match(skel, /sys_pn:\s*"ws-current"/);
  const desk = stripComments(readFileSync(join(SRC, "modules/desk/index.js"), "utf8"));
  assert.match(desk, /getPart\("ws-current"\)/, "the desk must still write that part");

  // The bell has its own registered part — see the duplicate-part test below
  // for why it cannot reuse either existing name.
  assert.match(skel, /sys_pn: "activity-count-mobile"/);

  // Every control is a Box carrying the service with its children opted out —
  // otherwise a child eats the tap.
  const bar = skel.slice(skel.indexOf("_build_mobile_topbar"));
  const body = bar.slice(0, bar.indexOf("\n};"));
  // Counting `service:` would overcount: the chip() helper declares it once
  // and each call site passes it again as an option. What matters is that both
  // things that BUILD a Box with a service opt their children out — the shared
  // chip helper, and the workspace pill which builds its own.
  const chipHelper = body.slice(body.indexOf("const chip ="), body.indexOf("return Skeletons.Box.X"));
  assert.match(chipHelper, /kidsOpt: \{ active: 0 \}/,
    "the shared chip helper must opt its children out");

  const pill = body.slice(body.indexOf("__mobile-workspace`"));
  assert.match(pill.slice(0, 400), /kidsOpt: \{ active: 0 \}/,
    "the workspace pill must opt its children out");
});

test("the drawer is gone: the phone's chrome is the sheets", () => {
  // The approved mobile shell (Option A) replaces the legacy drawer with
  // three bottom sheets — the desktop shell's own three surfaces (org-tab
  // dropdown, utility cluster, avatar menu) translated. Nothing may quietly
  // remount the drawer.
  const sidebar = stripComments(
    readFileSync(join(SRC, "modules/desk/skeleton/sidebar.js"), "utf8"),
  );
  // Word-bounded: createNavItem is the rail's own row builder and stays.
  for (const gone of ["createNav", "createActionsNav", "createCreateNav",
                      "createFooter", "createDrawerIdentity", "sidebar-main"]) {
    assert.doesNotMatch(
      sidebar,
      new RegExp(`\\b${gone}\\b(?!Item)`),
      `${gone} should be deleted with the drawer`,
    );
  }

  const skel = stripComments(
    readFileSync(join(SRC, "modules/desk/skeleton/index.js"), "utf8"),
  );
  assert.match(skel, /isMobile \? "" : require\("\.\/sidebar"\)\(ui\)/,
    "the sidebar module must not mount on mobile");
  assert.match(skel, /_build_mobile_sheet_host/, "the sheet host must mount instead");

  // Every sheet row re-dispatches its REAL service through mobile-sheet-go,
  // so the sheets reuse the desktop handlers rather than growing a second
  // implementation of switching / navigation / creation.
  const sheets = stripComments(
    readFileSync(join(SRC, "modules/desk/skeleton/mobile-sheets.js"), "utf8"),
  );
  assert.match(sheets, /service: "mobile-sheet-go"/);
  const desk = stripComments(readFileSync(join(SRC, "modules/desk/index.js"), "utf8"));
  assert.match(desk, /case "mobile-sheet-go":/);
  assert.match(desk, /this\.onUiEvent\(cmd, \{ \.\.\.args, service: target \}\)/,
    "the re-dispatch is what lands rows on the existing handlers");

  // The four sheets exist and lead somewhere real.
  for (const svc of ["mobile-workspace-sheet", "mobile-goto-sheet",
                     "mobile-account-sheet", "mobile-new-sheet"]) {
    assert.match(desk, new RegExp(`case "${svc}":`), `${svc} has no handler`);
  }
});

test("mobile gets the rail as a bottom bar, not a re-themed drawer", () => {
  // The Figma file has NO mobile frames, so this is the desktop rail
  // translated. What it must not be is the five workspace destinations hidden
  // behind a menu: on desktop they are one click from anywhere, and a drawer
  // (or the pane's two-at-a-time tab carousel) makes every view change a trip.
  const skel = stripComments(
    readFileSync(join(SRC, "modules/desk/skeleton/index.js"), "utf8"),
  );

  assert.match(skel, /_build_mobile_rail/, "the bottom bar must exist");
  assert.match(skel, /mainKids\.push\(_build_mobile_rail\(ui\)\)/,
    "and be mounted for mobile");

  // The SAME services as the rail, so _railTab / _railAccess drive both with
  // no second implementation to keep in step.
  const bar = skel.slice(skel.indexOf("_build_mobile_rail"));
  const body = bar.slice(0, bar.indexOf("\n};"));
  for (const svc of ["rail-files", "rail-chat", "rail-task", "rail-meet", "rail-access"]) {
    assert.match(body, new RegExp(`service: "${svc}"`), `${svc} missing from the bar`);
  }
  const desk = stripComments(readFileSync(join(SRC, "modules/desk/index.js"), "utf8"));
  for (const svc of ["rail-files", "rail-chat", "rail-task", "rail-meet", "rail-access"]) {
    assert.match(desk, new RegExp(`case "${svc}":`), `${svc} has no handler`);
  }

  // Its own radio group: the drawer is rendered at the same time, so sharing
  // "sidebar-radio" would let a drawer row and a bar item mark each other.
  assert.match(body, /radio: "mobile-rail-radio"/);
  assert.doesNotMatch(body, /sidebar-radio/);
});

test("the bottom bar keeps the rail's treatment and clears the home indicator", () => {
  const skin = stripComments(
    readFileSync(join(SRC, "modules/desk/skin/mobile-rail.scss"), "utf8"),
  );

  // The rail's own colours, not a new palette.
  assert.match(skin, /background-color:\s*var\(--primary-70\)/, "the navy ground — #3C3989, the token the desktop rail column wears");
  assert.match(skin, /background-color:\s*var\(--primary-40\)/, "the active tile fill");
  assert.match(skin, /border-radius:\s*8px/, "r=8 tiles");
  assert.match(skin, /font-weight:\s*600/, "typo() emits no weight — it must be explicit");

  // A fixed bar over a notched phone must clear the gesture strip, and the
  // scroll box must reserve its height or it covers the last row of content.
  assert.match(skin, /env\(safe-area-inset-bottom/, "must clear the home indicator");
  assert.match(skin, /&__body\[data-device="mobile"\][\s\S]{0,160}padding-bottom/,
    "the body must reserve the bar's height");
});

test("the go-to grid is a real CSS grid, not flex", () => {
  // Box.G renders display: grid (lib/container.scss [data-flow="g"]), so the
  // three columns MUST be grid tracks. flex-basis on the tiles is silently
  // ignored in grid layout — that bug shipped once: the six tiles stacked one
  // per row, full width.
  const skin = stripComments(
    readFileSync(join(SRC, "modules/desk/skin/mobile-sheets.scss"), "utf8"),
  );
  const grid = skin.slice(skin.indexOf("&__msheet-grid"), skin.indexOf("&__msheet-tile"));
  assert.match(grid, /grid-template-columns:\s*repeat\(3, 1fr\)/, "3 grid tracks");
  assert.doesNotMatch(skin, /flex:\s*0 0 calc/, "no flex-basis column sizing");
});

test("mobile labels centre and truncate the note's INNER flex child", () => {
  // A Note is a flex ROW around .note-content (its model defaults flow "wrap"
  // → data-flow → lib/container.scss flex-direction: row). text-align or
  // text-overflow on the wrapper therefore never reaches the text: the label
  // sat packed LEFT of its icon on the rail, and long names clipped without
  // an ellipsis. Same trap the desktop rail hit (sidebar.scss __item-text).
  const block = (src, name) => {
    const i = src.indexOf(name);
    assert.ok(i > -1, `${name} exists`);
    const j = src.indexOf("&__", i + name.length);
    return src.slice(i, j > -1 ? j : undefined);
  };

  const rail = stripComments(
    readFileSync(join(SRC, "modules/desk/skin/mobile-rail.scss"), "utf8"),
  );
  const railLabel = block(rail, "&__mrail-label");
  assert.match(railLabel, /justify-content:\s*center/, "rail label centres the flex child");
  assert.match(railLabel, /\.note-content\s*\{/, "…and styles the inner text box");

  const sheets = stripComments(
    readFileSync(join(SRC, "modules/desk/skin/mobile-sheets.scss"), "utf8"),
  );
  const tileLabel = block(sheets, "&__msheet-tile-label");
  assert.match(tileLabel, /justify-content:\s*center/, "tile label centres the flex child");
  assert.match(tileLabel, /\.note-content\s*\{/, "…and styles the inner text box");
  for (const name of ["&__msheet-label", "&__msheet-identity-name"]) {
    const b = block(sheets, name);
    assert.match(b, /\.note-content\s*\{[^}]*text-overflow:\s*ellipsis/,
      `${name} truncates on the inner .note-content`);
  }

  const topbar = stripComments(
    readFileSync(join(SRC, "modules/desk/skin/mobile-topbar.scss"), "utf8"),
  );
  const wsName = block(topbar, "&__mobile-workspace-name");
  assert.match(wsName, /\.note-content\s*\{[^}]*text-overflow:\s*ellipsis/,
    "the workspace pill name truncates on the inner .note-content");
});

test("no duplicate part names on the mobile tree", () => {
  // registerPart is a plain `_branches[name] = child`, so a duplicate silently
  // replaces the first and one of the two never updates again. The phone bell
  // hit this twice: 'activity-count' is the drawer's row, and
  // 'activity-count-top' is the desktop cluster's — which is still RENDERED on
  // mobile (display:none, not absent).
  const skel = stripComments(
    readFileSync(join(SRC, "modules/desk/skeleton/index.js"), "utf8"),
  );
  const desk = stripComments(readFileSync(join(SRC, "modules/desk/index.js"), "utf8"));

  assert.match(skel, /sys_pn: "activity-count-mobile"/, "the phone bell needs its own name");
  // Three surfaces since the drawer left: the desktop cluster, the phone bar,
  // and the go-to sheet's notifications tile.
  assert.match(
    desk,
    /\["activity-count-top", "activity-count-mobile", "activity-count-sheet"\]/,
    "and the writer must fill all three, or it never shows a count",
  );
});
