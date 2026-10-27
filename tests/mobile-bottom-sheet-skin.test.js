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
  assert.match(d, /height:62dvh/);
  assert.match(d, /z-index:100000/);
  // Hidden is the default; only data-state="1" reveals it.
  assert.match(d, /transform:translateY\(100%\)/);
  assert.match(d, /visibility:hidden/);
  assert.match(declsFor(css, `${card}[data-state="1"]`), /transform:none/);
  assert.match(declsFor(css, `${card}[data-state="1"]`), /visibility:visible/);
  assert.match(declsFor(css, `${card}::before`), /width:36px/);
  const list = declsFor(css, ".desk-module__mobile-search-suggestions");
  assert.match(list, /min-height:0/);
  assert.match(list, /overflow-y:auto/);
});

module.exports = { compile, declsFor, inMedia };
