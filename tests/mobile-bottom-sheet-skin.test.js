// tests/mobile-bottom-sheet-skin.test.js — on a phone, the surfaces that used
// to float as centred cards (Activity, Trash, the OTP gate, the desk's search
// card, the invite popup) are drawn as the desk's own bottom sheet
// (.desk-module__msheet), from the shared mixins in skin/mixins/responsive.scss.
//
//   node --test tests/mobile-bottom-sheet-skin.test.js
//
// Compiles the REAL skins with sass and reads the rules; headless Chromium is
// the visual check (see the plan).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sass = require("sass");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src/drumee");

function compile(rel) {
  return sass.compile(path.join(SRC, rel), {
    loadPaths: [SRC, path.join(SRC, "skin"), path.join(ROOT, "skin")],
    style: "compressed",
    logger: sass.Logger.silent,
  }).css;
}

// The declarations of every top-level rule (outside any @media) whose
// selector list holds `sel`.
function declsFor(css, sel) {
  return rulesIn(stripMedia(css), sel);
}

// The declarations of `sel` inside the @media blocks whose prelude starts with
// `prefix` (compressed spelling, e.g. "(max-width:650px)").
function inMedia(css, prefix, sel) {
  return mediaBlocks(css)
    .filter((b) => b.prelude.startsWith(prefix))
    .map((b) => rulesIn(b.body, sel))
    .join(";");
}

function rulesIn(css, sel) {
  // Compressed output drops the quotes around an identifier attribute value
  // (mobile), but keeps them around one that starts with a digit ("0").
  sel = sel.replace(/="([a-z_][\w-]*)"/gi, "=$1");
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1].split(",").map((s) => s.trim()).includes(sel)) out.push(m[2]);
  }
  return out.join(";");
}

// Top-level @media / @keyframes blocks, found by brace matching.
function mediaBlocks(css) {
  const out = [];
  const re = /@(media|keyframes|supports)([^{]*)\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    while (depth && i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    out.push({ kind: m[1], prelude: m[2].trim(), start: m.index, end: i, body: css.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

function stripMedia(css) {
  let out = "";
  let at = 0;
  for (const b of mediaBlocks(css)) {
    out += css.slice(at, b.start);
    at = b.end;
  }
  return out + css.slice(at);
}

test("desk __msheet is drawn by the shared mixin", () => {
  const mixins = fs.readFileSync(path.join(SRC, "skin/mixins/responsive.scss"), "utf8");
  assert.match(mixins, /@mixin mobile-bottom-sheet\(/);
  assert.match(mixins, /@mixin mobile-bottom-sheet-grabber\b/);
  assert.match(mixins, /@mixin mobile-bottom-sheet-scroller\b/);

  const css = compile("modules/desk/skin/mobile-sheets.scss");
  const d = declsFor(css, ".desk-module__msheet");
  assert.match(d, /height:62dvh/);
  assert.match(d, /border-radius:16px 16px 0 0/);
  assert.match(d, /background:var\(--normal-bg\)/);
  assert.match(d, /bottom:0/);
  assert.match(d, /position:absolute/);
  assert.match(declsFor(css, ".desk-module__msheet-grabber"), /width:36px/);
  assert.match(declsFor(css, ".desk-module__msheet-content"), /min-height:0/);
});

test("activity panel is a bottom sheet on mobile", () => {
  const css = compile("builtins/panel/activity/skin/index.scss");
  const root = '.panel-activity__ui[data-device="mobile"]';
  const d = declsFor(css, root);
  assert.match(d, /position:fixed/);
  assert.match(d, /bottom:0/);
  assert.match(d, /height:62dvh !important/);
  assert.match(d, /width:100% !important/);
  assert.match(d, /border-radius:16px 16px 0 0/);
  assert.doesNotMatch(d, /margin:auto/);
  assert.match(inMedia(css, "(orientation: landscape)", root), /height:88dvh !important/);
  // Closed is a fade, never a translate: a transform on __ui would make it the
  // containing block of its fixed ::before scrim.
  assert.match(declsFor(css, `${root}[data-state="0"]`), /transform:none/);
  assert.match(declsFor(css, `${root}[data-state="0"]`), /opacity:0/);
  assert.match(declsFor(css, `${root} .panel-activity__main`), /border-radius:16px 16px 0 0/);
  assert.match(declsFor(css, `${root} .panel-activity__main::before`), /width:36px/);
});

test("trash panel is a bottom sheet on mobile, still closable", () => {
  const css = compile("builtins/panel/trash/skin/index.scss");
  const root = '.panel-trash__ui[data-device="mobile"]';
  const d = declsFor(css, root);
  assert.match(d, /left:0 !important/);
  assert.match(d, /top:auto !important/);
  assert.match(d, /bottom:0 !important/);
  assert.match(d, /height:62dvh !important/);
  assert.match(d, /border-radius:16px 16px 0 0/);
  assert.doesNotMatch(d, /translate\(-50%/);
  // (0,3,0): nested under the device gate, so they beat the desktop pair.
  assert.match(declsFor(css, `${root}[data-anim="in"]`), /transform:translateY\(0\)/);
  assert.match(declsFor(css, `${root}[data-anim="out"]`), /transform:translateY\(100%\)/);
  assert.match(declsFor(css, `${root} .panel-trash__main::before`), /width:36px/);
});

test("otp gate is a bottom sheet on a phone, a card elsewhere", () => {
  const css = compile("builtins/widget/otp-gate/skin/index.scss");
  const d = inMedia(css, "(max-width: 560px)", ".otp-gate-card");
  assert.match(d, /position:fixed/);
  assert.match(d, /bottom:0/);
  assert.match(d, /width:auto/);
  assert.match(d, /max-width:none/);
  assert.match(d, /border-radius:16px 16px 0 0/);
  assert.match(inMedia(css, "(max-width: 560px)", ".otp-gate-card::before"), /width:36px/);
  assert.match(declsFor(css, ".otp-gate-card"), /width:450px/);
  assert.match(declsFor(css, 'html[data-theme="dark"] .otp-gate-card'), /--normal-bg-elevated/);
  // Sign-in draws its own OTP card on .dtk-otp__main; it must not change.
  assert.doesNotMatch(compile("modules/welcome/signin/skin/index.scss"), /62dvh/);
});

test("desk mobile search opens as the bottom sheet", () => {
  const css = compile("modules/desk/skin/mobile-search.scss");
  const card = ".desk-module__mobile-search";
  const d = declsFor(css, card);
  assert.match(d, /bottom:0/);
  assert.match(d, /z-index:100000/);
  // Hidden is the default; only data-state="1" reveals it.
  assert.match(d, /visibility:hidden/);
  assert.match(declsFor(css, `${card}[data-state="1"]`), /visibility:visible/);
  assert.match(declsFor(css, `${card}::before`), /width:36px/);
  const list = declsFor(css, ".desk-module__mobile-search-suggestions");
  assert.match(list, /min-height:0/);
  assert.match(list, /overflow-y:auto/);
});

test("invite popup is a bottom sheet on a phone, over wm's centring", () => {
  const css = compile("builtins/widget/invite-popup/skin/index.scss");
  const wrapped =
    '.window-manager__wrapper-modal.window__wrapper-modal[data-invite-overlay] .invite-popup__ui[data-device="mobile"]';
  for (const [sel, d] of [
    ['.invite-popup__ui[data-device="mobile"]', declsFor(css, '.invite-popup__ui[data-device="mobile"]')],
    [wrapped, declsFor(css, wrapped)],
    ["650px .invite-popup__ui", inMedia(css, "(max-width: 650px)", ".invite-popup__ui")],
  ]) {
    // !important on each: wm's wrapper-modal-mobile-centre pins all of these.
    assert.match(d, /position:fixed !important/, sel);
    assert.match(d, /left:0 !important/, sel);
    assert.match(d, /top:auto !important/, sel);
    assert.match(d, /bottom:0 !important/, sel);
    assert.match(d, /margin:0 !important/, sel);
    assert.match(d, /height:62dvh/, sel);
    assert.match(d, /border-radius:16px 16px 0 0/, sel);
    assert.match(d, /backdrop-filter:none/, sel);
    assert.match(d, /animation:invite-popup-sheet-in/, sel);
  }
  assert.match(declsFor(css, `${wrapped}[data-closing="1"]`), /animation:invite-popup-sheet-out/);
  assert.match(declsFor(css, `${wrapped}::before`), /width:36px/);
  const box = declsFor(css, `${wrapped} .invite-popup__container`);
  assert.match(box, /max-height:none/);
  assert.match(box, /overflow-y:auto/);
  // translate, not transform: wm's transform:none !important would freeze it.
  assert.match(css, /@keyframes invite-popup-sheet-in\{from\{translate:0 100%\}/);
  assert.match(inMedia(css, "(prefers-reduced-motion: reduce)", `${wrapped}[data-closing="1"]`), /animation:none/);
});

// ── Final-review fixes ──────────────────────────────────────────────────

test("invite sheet keeps its white ground: the popup has no dark palette", () => {
  const css = compile("builtins/widget/invite-popup/skin/index.scss");
  const wrapped =
    '.window-manager__wrapper-modal.window__wrapper-modal[data-invite-overlay] .invite-popup__ui[data-device="mobile"]';
  // Last background declaration wins: it must be the white, not --normal-bg.
  const bgs = declsFor(css, wrapped).match(/background(-color)?:[^;]+/g);
  assert.equal(bgs[bgs.length - 1], "background-color:#fff");
});

test("activity sheet has no padding strip under __main; the feed carries the safe area", () => {
  const css = compile("builtins/panel/activity/skin/index.scss");
  const root = '.panel-activity__ui[data-device="mobile"]';
  const pads = declsFor(css, root).match(/padding-bottom:[^;]+/g);
  assert.equal(pads[pads.length - 1], "padding-bottom:0");
  assert.match(declsFor(css, `${root} .panel-activity__feed`), /padding:0 10px calc\(20px \+ env\(safe-area-inset-bottom/);
});

test("the grabber colour is overridable, and dark sheets on an elevated ground override it", () => {
  const desk = compile("modules/desk/skin/mobile-sheets.scss");
  assert.match(declsFor(desk, ".desk-module__msheet-grabber"), /background:var\(--sheet-grabber, var\(--normal-bg-80\)\)/);
  const grab = /--sheet-grabber: ?rgba\(255, ?255, ?255, ?0?\.24\)/;
  assert.match(declsFor(compile("builtins/widget/otp-gate/skin/index.scss"), 'html[data-theme="dark"] .otp-gate-card'), grab);
  assert.match(declsFor(compile("modules/desk/skin/mobile-search.scss"), 'html[data-theme="dark"] .desk-module__mobile-search'), grab);
  assert.match(declsFor(compile("builtins/panel/activity/skin/index.scss"), 'html[data-theme="dark"] .panel-activity__main'), grab);
});

test("search sheet runs full height under the topbar and fades in place", () => {
  const css = compile("modules/desk/skin/mobile-search.scss");
  const d = declsFor(css, ".desk-module__mobile-search");
  // The keyboard covers the lower half of the screen; a 62dvh sheet left one
  // row of results above it. Fades, never slides: _openMobileSearch focuses
  // the input in the opening tap, which must not land on an off-screen input.
  assert.match(d, /top:44px/);
  assert.match(d, /height:auto/);
  assert.doesNotMatch(d, /transform:translateY/);
  assert.match(d, /opacity:0/);
  assert.match(declsFor(css, '.desk-module__mobile-search[data-state="1"]'), /opacity:1/);
});

test("folder window \"+ New\" menu is a bottom sheet on mobile, and still hides when closed", () => {
  const css = compile("builtins/window/folder/skin/index.scss");
  const ctrl = '.window-folder__main .window-folder-topbar__new-ctrl[data-device="mobile"]';
  for (const [where, d] of [
    ["device", declsFor(css, `${ctrl} .menu-topic-items__wrapper`)],
    ["650px", inMedia(css, "(max-width: 650px)", ".window-folder__main .window-folder-topbar__new-ctrl .menu-topic-items__wrapper")],
  ]) {
    assert.match(d, /position:fixed !important/, where);
    assert.match(d, /bottom:0/, where);
    assert.match(d, /height:62dvh/, where);
    assert.match(d, /border-radius:16px 16px 0 0/, where);
    assert.doesNotMatch(d, /translate\(-50%/, where);
  }
  // The sheet mixin's display:flex must not beat the shared closed-state hide.
  assert.match(
    declsFor(css, `${ctrl} .window-button__dropdown-menu__wrapper:not([data-state="1"]) .menu-topic-items__wrapper`),
    /display:none/,
  );
  assert.match(declsFor(css, `${ctrl} .menu-topic-items__wrapper::before`), /width:36px/);
  assert.match(declsFor(css, `${ctrl} .menu-items`), /overflow-y:auto/);
});

module.exports = { compile, declsFor, inMedia };
