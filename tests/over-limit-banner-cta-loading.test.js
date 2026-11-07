// tests/over-limit-banner-cta-loading.test.js — "Resolve now" shows it is working.
//
// The banner's CTA opens the Admin Console (Team/Business: a lazy plugin chunk)
// or the over-limit popup (Free/Pro). Neither path reports back, and the
// console can take seconds, so the button looked dead after a click. It now
// spins from the click until the destination is on screen (or a safety
// timeout), and ignores repeat clicks meanwhile.
//
//   node --test tests/over-limit-banner-cta-loading.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC = (p) => fs.readFileSync(path.join(__dirname, "../src/drumee", p), "utf8");
const LIB = path.join(__dirname, "../src/drumee/builtins/widget/over-limit-banner/landed.js");

test("landed(): the console slot or the popup card means the click arrived", () => {
  const { landed } = require(LIB);
  const doc = (hits) => ({ querySelector: (sel) => (hits.some((h) => sel.includes(h)) ? {} : null) });
  assert.equal(landed(doc([])), false);
  assert.equal(landed(doc(['data-kind="apps_main"'])), true);
  assert.equal(landed(doc(["over-limit-popup__card"])), true);
  assert.equal(landed(null), false);
});

test("skeleton stamps the CTA with data-loading from the widget state", () => {
  const s = SRC("builtins/widget/over-limit-banner/skeleton/index.js");
  const cta = s.slice(s.indexOf('service: "over-limit-banner-resolve"') - 400,
    s.indexOf('service: "over-limit-banner-resolve"') + 200);
  assert.match(cta, /loading:\s*ui\._resolving\s*\?\s*1\s*:\s*0/);
});

test("the click starts the loading state and a second click is ignored", () => {
  const s = SRC("builtins/widget/over-limit-banner/index.js");
  const c = s.slice(s.indexOf('case "over-limit-banner-resolve"'));
  const guard = c.indexOf("if (this._resolving) return;");
  const start = c.indexOf("this._startResolving()");
  const fire = c.indexOf("RADIO_BROADCAST.trigger(");
  assert.ok(guard > 0 && start > guard && fire > start, "guard → start → navigate");
  assert.match(s, /_stopResolving\(\)/);
  assert.match(s, /RESOLVE_TIMEOUT_MS/);
});

test("skin draws a spinner on [data-loading=\"1\"]", () => {
  const s = SRC("builtins/widget/over-limit-banner/skin/index.scss");
  assert.match(s, /&\[data-loading="1"\]/);
  assert.match(s, /@keyframes over-limit-banner-spin/);
});
