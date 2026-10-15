// font-main-base.test.js — every text node resolves to var(--font-main):
// body sets it, form controls inherit it, ui-styles' alias tokens exist.
//
//   node --test tests/font-main-base.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const { CHROMIUM, runInChromium } = require("./helpers/chromium-dom");

const SRC = path.join(__dirname, "..", "src/drumee");
const raw = sass.compile(path.join(SRC, "skin/index.scss"), {
  loadPaths: [SRC, path.join(SRC, "skin")],
  silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
  logger: sass.Logger.silent,
}).css;
const css = raw.replace(/\s+/g, " ");

test("html and body carry var(--font-main)", () => {
  assert.match(css, /html, body \{[^}]*font-family: var\(--font-main\)/);
});

test("form controls inherit the font", () => {
  assert.match(css, /button, input, select, optgroup, textarea \{[^}]*font-family: inherit/);
});

test("alias tokens read by @drumee/ui-styles are defined and valid", () => {
  assert.match(css, /--font-main-light: var\(--font-main\)/);
  for (const [k, v] of [
    ["main-typo-light", "font-light"], ["main-typo", "font-main"],
    ["main-typo-medium", "font-medium"], ["main-typo-bold", "font-bold"],
    ["main-typo-light-italic", "font-light-italic"], ["main-typoitalic", "font-italic"],
    ["main-typo-medium-italic", "font-medium-italic"], ["main-typo-bold-italic", "font-bold-italic"],
  ]) {
    assert.match(css, new RegExp(`--${k}: var\\(--${v}\\)`), `--${k}`);
  }
});

test("computed: portaled node, bare controls, and a classed override", { skip: !CHROMIUM }, () => {
  const out = runInChromium({
    body:
      `<style>${raw}\n.mono-x{font-family:monospace}</style>` +
      `<div id="portal">Thiết kế ưu tiên</div><button id="b">b</button>` +
      `<input id="i"><select id="s"><option>o</option></select>` +
      `<textarea id="t"></textarea><textarea id="m" class="mono-x"></textarea>`,
    fn: (_m, d) =>
      Object.fromEntries(["portal", "b", "i", "s", "t", "m"].map((id) =>
        [id, getComputedStyle(d.getElementById(id)).fontFamily])),
  });
  for (const id of ["portal", "b", "i", "s", "t"]) {
    assert.match(out[id], /^"Armin Grotesk", "Segoe UI"/, `${id}: ${out[id]}`);
  }
  assert.equal(out.m, "monospace");
});
