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

module.exports = { compile, declsFor, inMedia };
