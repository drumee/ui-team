// device-picker-colours-skin.test.js — the audio device picker uses the same
// brand tint as the camera picker, and Save is the brand colour.
//
//   node --test tests/device-picker-colours-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/connect/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");

// Scoped to the picker's own rules: #879bff is also a global token value and
// overlay-wrapper.scss (meeting-only overlay) keeps its own legacy rows.
test("no legacy slate-blue left in the device picker", () => {
  const rules = css.match(/[^{}]*__devices-list[^{}]*\{[^}]*\}/g) || [];
  assert.ok(rules.length > 0, "no __devices-list rules compiled");
  for (const r of rules) assert.doesNotMatch(r, /#6178d8|#879bff/i, r);
});

test("selected audio row = brand tint + brand text", () => {
  const m = css.match(/__devices-list\.audio \.device-label\[data-state="1"\] \{([^}]*)\}/);
  assert.ok(m, "missing selected audio row rule");
  assert.match(m[1], /var\(--overlay-brand, rgba\(89, 80, 255, 0\.1\)\)/);
  assert.match(m[1], /var\(--primary-40, #5950ff\)/);
});

test("Save is the brand colour, not --primary-500", () => {
  const m = css.match(/__devices-list \.mic-selection\.button-confirm \{([^}]*)\}/);
  assert.ok(m, "missing Save rule");
  assert.match(m[1], /background-color: var\(--primary-40, #5950ff\)/);
});

test("the undriven mic meter is gone from the skeleton", () => {
  const src = fs.readFileSync(path.join(SRC, "builtins/webrtc/skeleton/device-list.js"), "utf8");
  assert.doesNotMatch(src, /device-mic-meter/);
  assert.doesNotMatch(src, /SPEAK_TO_TEST_MIC/);
});
