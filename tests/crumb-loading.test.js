// The address chip must not offer a control it has not drawn.
//
// THE REPORT, three times over: the workspace-switcher caret appeared ahead of
// the breadcrumb, over an all-but-empty chip.
//
// THREE FLAG-BASED FIXES FAILED, each passing its tests and each failing in the
// app: `data-loading` on the breadcrumb root, `data-address` on it, then
// `data-address` on the chip. A flag has to be written at the right moment and
// cleared at the right moment, and here that means
//   - a widget that does not exist for the whole of its own lazy chunk load
//     (seeds.js: `desk_breadcrumb: () => e.e(345)`),
//   - a `_buildContent` that paints inside an `ensurePart` promise,
//   - ~10 broadcast paths into `_updateContext`/`loadDefault` that can declare
//     "no address" and so reveal the caret,
//   - and a chip that outlives the widget across a topbar re-feed and can
//     therefore hold a stale answer.
// Every one of those reveals the caret while the address is missing.
//
// SO THERE IS NO FLAG. The condition is asked of the DOM, at the moment it
// matters: in CSS with `:has()` (desk/skin/topbar.scss) for the caret, the
// spinner and the crumbs, and with `querySelector` at click time for the gate.
// Nothing can go stale, and an absent breadcrumb simply has no crumbs in it.
//
// The VISUAL half is measured against the real compiled skin in
// tests/harness/crumb-loading.js. What is testable here is the click gate and
// the absence of the machinery that kept going wrong.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const BC = join(ROOT, "src/drumee/modules/desk/breadcrumb/index.js");
const DESK = join(ROOT, "src/drumee/modules/desk/index.js");
const SKIN = join(ROOT, "src/drumee/modules/desk/skin/topbar.scss");

// Lift a method body out of the class so it runs without booting the desk.
function lift(file, signature, params = [], args = []) {
  const src = readFileSync(file, "utf8");
  const re = new RegExp(
    `\\n {2}${signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`,
  );
  const m = src.match(re);
  assert.ok(m, `${signature} not found in ${file}`);
  const inner = signature.slice(signature.indexOf("("));
  return new Function(...params, `return function ${inner} {\n${m[1]}\n};`)(...args);
}

// ── The click gate ──────────────────────────────────────────────────────────
//
// `crumbs` lists which crumb parts are in the chip, so the stub answers
// querySelector the way the real chip would.
function deskStub(crumbs) {
  const gate = lift(DESK, "_crumbClickOpensSwitcher(target)", ["_"], [
    { isFunction: (f) => typeof f === "function" },
  ]);
  const part = crumbs === undefined
    ? null
    : { el: { querySelector: (sel) => (crumbs.includes(sel) ? {} : null) } };
  return gate.bind({ _crumbGroupPart: part });
}

const ICON = ".breadcrumb-item__icon";
const NAME = ".breadcrumb-item__filename";

// `closest` answers for the selectors the chip's own rules name.
const target = (matches = []) => ({
  closest: (sel) => (matches.includes(sel)
    ? { classList: { contains: () => false }, dataset: {} }
    : null),
  classList: { contains: () => false },
  dataset: {},
});

test("an empty chip is not a control", () => {
  assert.equal(deskStub([])(target()), false);
});

// THE LAZY-CHUNK WINDOW: the breadcrumb is not in the bar yet, so the chip
// holds no crumbs and the part may not even be registered.
test("no crumbs and no chip part both refuse", () => {
  assert.equal(deskStub(undefined)(target()), false, "no chip part means no control");
  assert.equal(deskStub([])(target()), false, "no crumbs means no control");
});

test("a HALF-drawn crumb is not an address either", () => {
  assert.equal(deskStub([ICON])(target()), false, "a glyph with no name");
  assert.equal(deskStub([NAME])(target()), false, "a name with no glyph");
});

test("both parts present opens the switcher", () => {
  assert.equal(deskStub([ICON, NAME])(target()), true);
});

test("a complete address does not break the panel and rename exemptions", () => {
  const gate = deskStub([ICON, NAME]);
  assert.equal(gate(target([".menu-topic-items__wrapper"])), false);
  assert.equal(gate(target([".desk-module-topbar__ws-rename"])), false);
});

// ── The machinery must stay gone ─────────────────────────────────────────────
//
// Not style policing: each of these names IS one of the three fixes that
// shipped and did not work. Re-introducing one re-introduces a moment when the
// caret's answer and the chip's contents disagree.
test("no flag machinery survives in the breadcrumb", () => {
  const src = readFileSync(BC, "utf8");
  for (const dead of [
    "_syncPathLoading", "_hasAddress", "_clearChipAddress",
    "_addressGaveUp", "_pathPending", "dataset.loading", "dataset.address",
  ]) {
    assert.ok(!src.includes(dead), `${dead} is back — the flag returned`);
  }
});

test("the gate reads the DOM, not a stamp", () => {
  const src = readFileSync(DESK, "utf8");
  const from = src.indexOf("\n  _crumbClickOpensSwitcher(");
  const body = src.slice(from, src.indexOf("\n  }\n", from));
  assert.ok(body.includes(ICON) && body.includes(NAME),
    "the gate must ask for both crumb parts");
  assert.ok(!/dataset\.(address|loading)/.test(body),
    "the gate must not read a stamp");
});

// ── The skin's condition ────────────────────────────────────────────────────
test("the caret is hidden by default and revealed only by :has()", () => {
  const css = readFileSync(SKIN, "utf8");
  // Hidden on the bare chip: that is what makes an absent breadcrumb — or a
  // dropped :has() — fail CLOSED rather than open.
  //
  // Anchored on the STATE section: the file also has an earlier
  // `&__crumb-group {` block carrying the chip's layout, and indexOf would
  // find that one and prove nothing.
  const section = css.indexOf("// ── The chip is waiting for its address");
  assert.ok(section > 0, "the chip's state section is gone");
  const base = css.indexOf("&__crumb-group {", section);
  assert.ok(base > section, "the base chip block is gone");
  const baseBlock = css.slice(base, css.indexOf("\n  }\n", base));
  assert.match(baseBlock, /__ws-btn\s*\{\s*\n\s*visibility:\s*hidden/,
    "the caret must start hidden");

  // Revealed only when BOTH parts are present. Two chained :has(), because the
  // glyph and the name are siblings — neither contains the other.
  assert.match(css,
    /&__crumb-group:has\(\.breadcrumb-item__icon\):has\(\.breadcrumb-item__filename\)/,
    "the reveal must require both crumb parts");
});

test("no rule keys the chip's state on a stamp any more", () => {
  const css = readFileSync(SKIN, "utf8");
  const chip = css.slice(css.indexOf("// ── The chip is waiting for its address"));
  assert.ok(!/crumb-group:not\(\[data-address\]\)/.test(chip),
    "the data-address gate is back");
});
