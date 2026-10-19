// tests/audio-player-switcher-css.test.js — the audio window is pinned to
// 360px by CSS, so it must open up when it hosts the Open-File Switcher,
// or the 248px panel leaves the player ~110px.
//
//   node --test tests/audio-player-switcher-css.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "../src/drumee");

function compile(rel) {
  return sass.compile(path.join(SRC, rel), {
    loadPaths: [SRC, path.join(SRC, "skin"), path.join(__dirname, "../node_modules")],
  }).css;
}

// Declarations of the first rule whose selector list contains `selector`.
function rule(css, selector) {
  const i = css.indexOf(selector);
  assert.ok(i >= 0, `no rule for ${selector}`);
  const open = css.indexOf("{", i);
  return css.slice(open + 1, css.indexOf("}", open));
}

const audio = compile("builtins/player/audio/skin/index.scss");

test("hosting the panel widens the audio window by the panel", () => {
  const r = rule(audio, ".player-audio__ui:has(.file-switcher__frame)");
  assert.match(r, /min-width:\s*608px/);
  assert.match(r, /max-width:\s*608px/);
});

test("a collapsed panel takes only its icon column", () => {
  const r = rule(audio, '.player-audio__ui:has(.file-switcher__ui[data-collapsed="1"])');
  assert.match(r, /min-width:\s*428px/);
  assert.match(r, /max-width:\s*428px/);
});

test("the window is tall enough for the panel's list", () => {
  const r = rule(audio, ".player-audio__ui:has(.file-switcher__frame)");
  assert.match(r, /min-height:\s*400px/);
});

test("raw-svg row icons (audio, note) are sized to the tile", () => {
  const css = compile("builtins/player/widget/file-switcher/skin/index.scss");
  const r = rule(css, ".file-switcher__row-icon > svg");
  assert.match(r, /width:\s*22px/);
  assert.match(r, /height:\s*22px/);
});
