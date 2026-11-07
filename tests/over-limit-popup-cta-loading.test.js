// tests/over-limit-popup-cta-loading.test.js — popup CTAs show they are working,
// and a press releases the backdrop at once.
//
// "Resolve now" opens the Admin Console (a lazy chunk, seconds) or the
// organisation screen; "Remind me later" posts the snooze. The card used to
// vanish on the press with nothing on screen until the destination drew.
// Now: the pressed button spins, the BACKDROP comes off immediately (page fade
// gone, outside-click block released, clicks pass through), and the card
// closes when the destination is up / the snooze answered (or a timeout).
//
//   node --test tests/over-limit-popup-cta-loading.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DIR = path.join(__dirname, "../src/drumee/builtins/widget/over-limit-popup");
const SRC = (p) => fs.readFileSync(path.join(DIR, p), "utf8");

test("resolveLanded(): the console or the organisation screen, live", () => {
  const { resolveLanded } = require(path.join(DIR, "landed.js"));
  const doc = (hit) => ({ querySelector: (sel) => (hit && sel.includes(hit) ? {} : null) });
  assert.equal(resolveLanded(doc(null)), false);
  assert.equal(resolveLanded(doc('data-kind="apps_main"')), true);
  assert.equal(resolveLanded(doc('data-kind="desk_org_view"')), true);
  assert.equal(resolveLanded(null), false);
});

test("skeleton stamps data-loading on the pending CTA", () => {
  const s = SRC("skeleton/index.js");
  assert.match(s, /loading:\s*ui\._pendingService === "over-limit-resolve"\s*\?\s*1\s*:\s*0/);
  assert.match(s, /loading:\s*ui\._pendingService === "over-limit-later"\s*\?\s*1\s*:\s*0/);
});

test("resolve: guard → pending → release backdrop → navigate → close on landing", () => {
  const s = SRC("index.js");
  const c = s.slice(s.indexOf('case "over-limit-resolve"'), s.indexOf('case "over-limit-goto-home"'));
  const guard = c.indexOf("if (this._pendingService) return;");
  const pend = c.indexOf('this._setPending("over-limit-resolve")');
  const rel = c.indexOf("this._releaseBackdrop()");
  const nav = c.indexOf("RADIO_BROADCAST.trigger(");
  const wait = c.indexOf("this._closeWhenLanded()");
  assert.ok(guard > 0 && pend > guard && rel > pend && nav > rel && wait > nav, c);
  assert.doesNotMatch(c, /this\._close\(\);/, "no instant close any more");
});

test("later: pending → release backdrop → close when the snooze answers", () => {
  const s = SRC("index.js");
  const c = s.slice(s.indexOf('case "over-limit-later"'), s.indexOf('case "over-limit-close"'));
  assert.match(c, /this\._setPending\("over-limit-later"\)/);
  assert.match(c, /this\._releaseBackdrop\(\)/);
  assert.match(c, /\.finally\(\(\) => this\._finishClose\(\)\)/);
});

test("released backdrop lets clicks through; loading CTA spins", () => {
  const s = SRC("skin/index.scss");
  assert.match(s, /&__ui\[data-backdrop="off"\]/);
  assert.match(s, /pointer-events:\s*none/);
  assert.match(s, /&\[data-loading="1"\]/);
  assert.match(s, /@keyframes over-limit-popup-spin/);
});

test("raise() during a chosen close does not put the fade back", () => {
  const s = SRC("index.js");
  const r = s.slice(s.indexOf("  raise() {"), s.indexOf("  onDomRefresh() {"));
  const guard = r.indexOf("if (this._closing) return this;");
  const stamp = r.indexOf("this._stampDesk(true)");
  assert.ok(guard > 0 && guard < stamp, r);
});

test("the spinner sits right after the label, not pinned to the button edge", () => {
  const s = SRC("skin/index.scss");
  const rule = s.slice(s.indexOf('&[data-loading="1"] {'), s.indexOf("@keyframes over-limit-popup-spin"));
  const own = rule.slice(0, rule.indexOf("// \"Remind me later\""));
  assert.doesNotMatch(own, /position:\s*absolute/, "in the flex flow");
  assert.match(own, /gap:\s*8px/);
});
