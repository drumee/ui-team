// tests/tasks-rich-text-skin.test.js — the rich text the editors draw is
// actually styled. The app-wide reset (src/drumee/skin/lib/reset.scss) takes
// the markers off every li/ul, `font: inherit`s b / i / em / s, and strips
// u's underline (greying it): so the task editors and posted comment bodies
// have to put each one back.
//
//   node --test tests/tasks-rich-text-skin.test.js
//
// QA (2026-10-26): a bulleted list in __desc-editor showed no bullet — the
// list was there (button lit, 20px indent), its items were list-style none.
//
// Compiles the REAL tasks skin with sass and reads the rules; headless
// Chromium on the compiled app CSS is the visual check (see the plan).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const ROOT = path.join(__dirname, "..");
const css = sass
  .compile(path.join(ROOT, "src/drumee/builtins/window/tasks/skin/index.scss"), {
    loadPaths: [path.join(ROOT, "src/drumee"), path.join(ROOT, "src/drumee/skin"), path.join(ROOT, "skin")],
    style: "compressed",
    logger: sass.Logger.silent,
  })
  .css;

// Every surface the rich-text grammar is drawn on.
const SURFACES = ["desc-editor", "comment-input", "comment-edit-input", "comment-reply-input", "comment-body"];

// The declarations of the compressed rule whose selector list holds `sel`.
function declsFor(sel) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1].split(",").map((s) => s.trim()).includes(sel)) out.push(m[2]);
  }
  return out.join(";");
}

const RESTORES = [
  ["ul", /list-style-type:disc/],
  ["ol", /list-style-type:decimal/],
  ["li", /list-style-type:inherit/],
  ["b", /font-weight:700/],
  ["strong", /font-weight:700/],
  ["i", /font-style:italic/],
  ["em", /font-style:italic/],
  ["u", /text-decoration:underline/],
  ["u", /color:inherit/],
  ["s", /text-decoration:line-through/],
  ["strike", /text-decoration:line-through/],
];

test("a lit toolbar button is the primary fill with a white glyph, hovered or not", () => {
  for (const sel of ['.tasks-panel__format-btn[data-active="1"]', '.tasks-panel__format-btn[data-active="1"]:hover']) {
    const d = declsFor(sel);
    assert.match(d, /background:var\(--col-primary-40, ?#5950ff\)/, sel);
    // The glyph is a mask over currentColor, so white text is a white icon.
    assert.match(d, /color:#fff/, sel);
  }
});

for (const surface of SURFACES) {
  test(`${surface} puts back what the reset takes off lists and marks`, () => {
    for (const [tag, want] of RESTORES) {
      const sel = `.tasks-panel__${surface} ${tag}`;
      assert.match(declsFor(sel), want, sel);
    }
  });
}
