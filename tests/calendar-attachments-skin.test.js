// calendar-attachments-skin.test.js — the modal's Attachments block.
//
// Every ui-core widget root carries `.drumee-widget[data-flow=…]` and
// ui-styles/container.css gives it `display: flex` at (0,2,0). A hide rule at
// (0,1,0) therefore loses: the "Drop files to attach" overlay showed all the
// time, covering the hint and every attached file. Any rule that hides a part
// of the block has to outrank that flow rule.
//
//   node --test tests/calendar-attachments-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/panel/calendar/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");

// (ids, classes+attributes+pseudo-classes) — enough for these selectors.
// :not(x) contributes x's specificity, not its own.
function specificity(sel) {
  const s = sel.replace(/:not\(([^)]*)\)/g, " $1 ");
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const cls = (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) || []).length;
  return ids * 100 + cls;
}

// Every [selector, body] pair whose selector names `part` and whose body hides it.
function hideRules(part) {
  const out = [];
  // Lookbehind, not a consumed "}", or every other rule would be skipped.
  const re = /(?<=^|\})\s*([^{}@]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const body = m[2];
    if (!/display:\s*none/.test(body)) continue;
    for (const sel of m[1].split(",").map((x) => x.trim())) {
      // The part must be the selector's SUBJECT (its last compound).
      const subject = sel.split(/[\s>+~]+/).pop();
      if (subject.includes(part)) out.push(sel);
    }
  }
  return out;
}

const FLOW = specificity('.drumee-widget[data-flow="y"]');

for (const part of ["calendar-main__files-overlay", "calendar-main__files-list"]) {
  test(`${part}: hidden by a rule that beats the data-flow flex rule`, () => {
    const rules = hideRules(part);
    assert.ok(rules.length, `no rule hides ${part}`);
    for (const sel of rules) {
      assert.ok(specificity(sel) > FLOW, `${sel} (${specificity(sel)}) loses to data-flow (${FLOW})`);
    }
  });
}

test("the overlay only shows while a drag is over the zone", () => {
  assert.match(css, /\.calendar-main__files\[data-drop-active="1"\] \.calendar-main__files-overlay \{[^}]*display: flex/);
});

test("the drop row hides once the zone holds files, beating the data-flow rule", () => {
  const sel = '.calendar-main__files[data-has-files="1"] .calendar-main__files-drop';
  assert.ok(hideRules("calendar-main__files-drop").includes(sel), `missing ${sel}`);
  assert.ok(specificity(sel) > FLOW);
});
