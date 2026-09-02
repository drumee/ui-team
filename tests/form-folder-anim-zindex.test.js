#!/usr/bin/env node

/**
 * The create-workspace form's entrance/exit, and the switcher's stacking above
 * the modal that hosts it.
 *
 * THE Z-INDEX BUG. Not a value problem — the numbers already favour the
 * switcher (99999 vs the modal's 20000). It is stacking contexts:
 *
 *   - opening a wrapper-modal makes desk/skin/index.scss dissolve
 *     `.window-manager__ui`'s isolation, so its children resolve at the
 *     DOCUMENT ROOT, and lifts the modal to --z-index-modal (100000);
 *   - `.desk-module__topbar` is `position: relative; z-index: 10003`, its own
 *     stacking context, so the switcher's 99999 is trapped inside it and the
 *     whole bar competes at 10003 at the root.
 *
 * 10003 < 100000, so the modal paints over the switcher.
 *
 * Run from ui-team with:
 *   node --test tests/form-folder-anim-zindex.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const FORM = read("src/drumee/builtins/media/form/index.js");
const FORM_SCSS = read("src/drumee/builtins/media/form/skin/index.scss");
const DESK_SCSS = read("src/drumee/modules/desk/skin/index.scss");

const strip = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── the stacking fix ────────────────────────────────────────────────────────

test("the lift is gated on BOTH the modal and the switcher being open", () => {
  const at = DESK_SCSS.indexOf("desk-module-topbar__ws-wrapper");
  assert.notEqual(at, -1, "no rule mentions the switcher");
  const rule = DESK_SCSS.slice(Math.max(0, at - 900), at + 500);
  assert.match(rule, /window-manager__wrapper-modal\[data-state="open"\]/,
    "must only apply while a modal is open");
  assert.match(rule, /menu-topic-items__wrapper\[data-state="open"\]/,
    "and only while the switcher itself is open — otherwise the bar sits above "
    + "a dialog inviting clicks on controls behind it");
});

test("the topbar's context is LIFTED, not dissolved", () => {
  // Dissolving it (the trick the WM block uses) would drop the bar below the
  // sidebar (10002) and the slide-out panels (10001), which its 10003 exists
  // to clear.
  const at = DESK_SCSS.indexOf("desk-module-topbar__ws-wrapper");
  const rule = strip(DESK_SCSS.slice(at, at + 600));
  assert.ok(!/isolation:\s*auto/.test(rule), "must not dissolve the topbar context");
  const z = rule.match(/z-index:\s*(\d+)/);
  assert.ok(z, "no z-index in the lift");
  assert.ok(Number(z[1]) > 100000,
    `lift is ${z[1]}; it must beat --z-index-modal's 100000 default`);
});

// ── the animations ──────────────────────────────────────────────────────────

test("the form animates in, and the keyframe cannot outlive itself", () => {
  const anim = FORM_SCSS.match(/animation:\s*form-folder-in[^;]*/);
  assert.ok(anim, "no entrance animation");
  assert.ok(!/\bboth\b/.test(anim[0]),
    "fill:both persists the last keyframe and outranks inline styles");
  assert.match(anim[0], /\bbackwards\b/);
  assert.match(FORM_SCSS, /@keyframes form-folder-in/);
});

test("closing animates before the wrapper is cleared", () => {
  const body = strip(FORM);
  const at = body.indexOf("case _e.close:");
  const c = body.slice(at, at + 700);
  assert.match(c, /data-?[Cc]losing|dataset\.closing/, "nothing marks the exit");
  assert.match(c, /setTimeout|_\.delay/, "the clear is not deferred");
  assert.match(c, /parent\.clear\(\)/,
    "clear() must still be what tears it down — goodbye() leaves the wrapper's "
    + "data-state stuck, which is why the original chose clear()");
});

test("a second close cannot queue a second clear", () => {
  const body = strip(FORM);
  const c = body.slice(body.indexOf("case _e.close:"), body.indexOf("case _e.close:") + 700);
  assert.match(c, /_closing/, "no re-entry guard");
});

test("the exit keyframe exists and reduced motion is honoured", () => {
  assert.match(FORM_SCSS, /@keyframes form-folder-out/);
  assert.match(FORM_SCSS, /prefers-reduced-motion/);
});
