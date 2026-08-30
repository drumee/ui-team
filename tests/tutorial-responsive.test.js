/**
 * The tour's size tiers.
 *
 * The tier is decided in JS (tutorial/index.js _applySize) and acted on in CSS,
 * across several skins. That is two places, so the thing worth testing is that
 * they still agree: a tier the CSS styles but the JS never stamps is dead
 * styling, and a tier the JS stamps with no CSS behind it is a layout that
 * silently falls back to the widest composition on a phone.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

const TUT = join(__dirname, "..", "src/drumee/modules/desk/tutorial");
const host = readFileSync(join(TUT, "index.js"), "utf8");

/** Every .scss under the tutorial, at any depth. */
function skins(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) skins(p, out);
    else if (name.endsWith(".scss")) out.push(p);
  }
  return out;
}
const css = skins(TUT).map((f) => readFileSync(f, "utf8")).join("\n");

/** The tier ids the host can stamp. */
const declared = [...host.matchAll(/\{ id: ['"]([a-z]+)['"], max: /g)].map((m) => m[1]);
/** The tier ids the stylesheets actually key on. */
const styled = new Set(
  [...css.matchAll(/\[data-size="([a-z]+)"\]/g)].map((m) => m[1]),
);

test("the host declares the four tiers, widest last", () => {
  assert.deepEqual(declared, ["mobile", "narrow", "compact", "wide"]);
});

test("every tier the CSS styles is one the host can stamp", () => {
  for (const id of styled) {
    assert.ok(declared.includes(id), `[data-size="${id}"] is styled but never stamped`);
  }
});

test("every tier below the widest has styling behind it", () => {
  // `wide` is the composition the skins are written in, so it needs no block of
  // its own; the other three are departures from it and must each say so.
  for (const id of declared.filter((d) => d !== "wide")) {
    assert.ok(styled.has(id), `tier "${id}" is stamped but nothing styles it`);
  }
});

test("the boundaries ascend, and only the widest is open-ended", () => {
  const maxes = [...host.matchAll(/\{ id: ['"][a-z]+['"], max: ([^ },]+)/g)].map((m) => m[1]);
  assert.equal(maxes[maxes.length - 1], "Infinity");
  const finite = maxes.slice(0, -1).map(Number);
  for (let i = 1; i < finite.length; i++) {
    assert.ok(finite[i] > finite[i - 1], "tier boundaries must ascend");
  }
});

test("height is its own axis, so a short wide window is not treated as narrow", () => {
  assert.match(host, /SHORT_HEIGHT/);
  assert.match(host, /dataset\.short/);
  assert.ok(
    css.includes('[data-short="1"]'),
    "something has to act on the short flag or it is dead weight",
  );
});

test("a resize re-places the callout, not just the styling", () => {
  // The card's position comes from a rect measured once. Restyling without
  // re-measuring leaves it where the old viewport put it — which near an edge
  // is where its buttons cannot be reached.
  assert.match(host, /addEventListener\(['"]resize['"]/);
  assert.match(host, /orientationchange/);
  assert.match(host, /reflow\(\)/);
  const spot = readFileSync(join(TUT, "spotlight/index.js"), "utf8");
  assert.match(spot, /reflow\(\)\s*\{[\s\S]{0,400}this\.focus\(args\)/);
});

test("the resize listener is released with the widget", () => {
  assert.match(host, /_unbindResize\(\)/);
  const destroy = host.slice(host.indexOf("onBeforeDestroy()"));
  assert.ok(
    destroy.indexOf("_unbindResize") < destroy.indexOf("}"),
    "onBeforeDestroy must unbind it",
  );
});

test("the carousel's slide distance is the one CSS is using", () => {
  // The cards shrink per tier; a distance baked into the JS would stop the
  // track half a card short, which reads as broken rather than small.
  const es = readFileSync(join(TUT, "skeleton/toolkit/empty-state.js"), "utf8");
  assert.match(es, /var\(--es-pitch/);
  const esCss = readFileSync(join(TUT, "skin/empty-state.scss"), "utf8");
  assert.match(esCss, /--es-pitch:\s*457px/);
  assert.match(esCss, /--es-pitch:\s*792px/);
});
