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

// The Office glyphs' back page has no fill of its own; it takes the icon's
// currentcolor, and that page has to read white.
for (const ico of ["raw-documents_word", "raw-documents_excel", "raw-documents_powerpoint"]) {
  test(`${ico} renders white`, () => {
    // Sass drops the quotes around a plain-identifier attribute value.
    const re = new RegExp(`\\.calendar-main__file\\[data-ico="?${ico}"?\\] \\.calendar-main__file-ico[^{]*\\{[^}]*color: (white|#fff(fff)?)`);
    assert.match(css, re);
  });
}

// Five attachments pushed the modal past its 88vh cap; the body (min-height:0,
// no overflow) then slid under the footer and Cancel/Create covered Priority.
const ruleBody = (sel) => {
  const m = css.match(new RegExp("(?<=^|\\})\\s*" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};

test("the attachment list caps its height and scrolls", () => {
  const b = ruleBody(".calendar-main__files-list");
  assert.match(b, /max-height: \d+px/);
  assert.match(b, /overflow-y: auto/);
});

test("the modal body scrolls instead of sliding under the footer", () => {
  assert.match(ruleBody(".calendar-main__modal-body"), /overflow-y: auto/);
});

test("task modal is wide enough for two columns", () => {
  const m = css.match(/\.calendar-main__modal\[data-form="?task"?\] \{[^}]*width: min\((\d+)px/);
  assert.ok(m, "no task modal width");
  assert.ok(Number(m[1]) >= 640, `task modal only ${m[1]}px`);
});

test("on a narrow screen the two columns stack, beating the data-flow row rule", () => {
  const media = css.slice(css.indexOf("@media (max-width: 700px)"));
  const m = media.match(/([^{}]*\.calendar-main__modal-body--split[^{]*)\{[^}]*flex-direction: column/);
  assert.ok(m, "split body does not stack under 700px");
  assert.ok(specificity(m[1].trim()) > FLOW, `${m[1].trim()} loses to data-flow`);
});
