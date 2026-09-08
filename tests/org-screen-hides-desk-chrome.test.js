// The desk chrome that has no business on the organisation screen.
//
// desk_org_view is a full-canvas screen with its own header, and two pieces of
// desk chrome around it are either pointing at where the user already is or
// acting on something the screen has covered:
//
//   .desk-org-tab__open             the org dropdown's "Open" pill, which opens
//                                   THIS screen.
//   .desk-module-sidebar__nav-main  the workspace rail (Files / Chat / Task /
//                                   Meet / Access). Every item drives the
//                                   ACTIVE WORKSPACE WINDOW, and the org screen
//                                   is not a workspace.
//
// The rail's PARENT, __nav, stays: it also holds the logo row — wordmark, org
// name, collapse/pin toggle — which the screen has no quarrel with. An earlier
// revision hid __nav and took the logo with it.
//
// Both are suppressed by ONE rule in desk/skin/index.scss, keyed on the DOM
// rather than on a flag. The condition is the interesting part and it is
// asserted here in full, because two earlier attempts at chrome-vs-state in
// this desk went wrong in exactly the two ways it guards against: a flag that
// goes stale (tests/crumb-loading.test.js records three of those) and a
// presence test that outlives the thing it was watching.
//
// Measured against a real browser in
// tests/harness/org-screen-hides-desk-chrome.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const SKIN = join(ROOT, "src/drumee/modules/desk/skin/index.scss");
const SEL = '.desk-module:has(.desk-org-view__ui:not([data-anim="out"]) .desk-org-view__main)';

function rule() {
  const css = readFileSync(SKIN, "utf8");
  const i = css.indexOf(SEL);
  assert.ok(i > 0, "nothing suppresses the desk chrome on the org screen");
  return css.slice(i, css.indexOf("\n}", i));
}

test("both pieces of chrome are hidden, in one rule", () => {
  const r = rule();
  assert.match(r, /\.desk-org-tab__open/);
  assert.match(r, /\.desk-module-sidebar__nav-main/);
  assert.match(r, /display:\s*none/);

  // ONE home for the condition. It was briefly in org-tab/skin — a lazily
  // loaded chunk — and the sidebar rail is not the org chip's business, so a
  // second copy of this `:has()` would have had to be kept in step with it.
  const tab = readFileSync(
    join(ROOT, "src/drumee/modules/desk/org-tab/skin/index.scss"), "utf8");
  assert.ok(!/desk-module:has/.test(tab),
    "the condition is spelled twice — one copy will drift");
});

test("a PARKED org screen does not count", () => {
  // desk_org_view is destroyed on close today, so a bare `:has(__main)` would
  // be correct. A screen that joins KEEP_ALIVE_MAIN_KINDS is parked in the DOM
  // with data-anim="out" instead, and this rule would then hide the workspace
  // rail for the rest of the session — with the rail gone, that is the desk's
  // main navigation.
  assert.match(rule(), /:not\(\[data-anim="out"\]\)/);

  // The desk's own liveness test, quoted so the two cannot drift apart.
  const desk = readFileSync(join(ROOT, "src/drumee/modules/desk/index.js"), "utf8");
  assert.match(desk, /dataset\.anim !== "out"/,
    "the desk no longer decides liveness this way — the CSS should follow");
});

test("the rule keys on the screen being drawn, from the desk root", () => {
  const r = rule();
  // __main, not the root alone: the widget root mounts a moment before its
  // skeleton is fed.
  assert.match(r, /\.desk-org-view__main/);
  // From .desk-module — the one ancestor the topbar chip and the settings slot
  // share. Anything rooted inside the topbar cannot see the screen at all.
  assert.ok(r.startsWith(".desk-module:has("), "the rule must start at the desk root");
});

test("the rail items are the only chrome removed from the sidebar", () => {
  const r = rule();

  // __nav ITSELF must not be a subject: it carries the logo row (wordmark, org
  // name, collapse/pin toggle) above the rail, and hiding it emptied the column
  // above the footer. The negative lookahead is the point of this assertion —
  // `__nav` is a prefix of `__nav-main`, so a plain substring test would pass
  // on the wrong selector and prove nothing.
  assert.ok(!/\.desk-module-sidebar__nav(?![-\w])/.test(r),
    "the whole nav column is hidden again — the logo row goes with it");

  // Two more siblings that are not workspace controls: the footer's upgrade row
  // and the rail container that reserves the column's width.
  assert.ok(!/__footer/.test(r), "the sidebar footer went with the rail");
  assert.ok(!/\.desk-module-sidebar__rail\b/.test(r), "the whole sidebar was hidden");
});

test("the rule survives a compile, and lands on both subjects", () => {
  // The assertions above read source. This one reads what the browser gets:
  // `:has()` inside a nested block is exactly the shape sass has silently
  // reordered before.
  const css = execFileSync("sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/skin/index.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });
  const i = css.indexOf(".desk-module:has(.desk-org-view__ui");
  assert.ok(i > 0, "the rule did not survive the compile");
  const block = css.slice(i, css.indexOf("}", i) + 1);
  assert.match(block, /\.desk-org-tab__open/);
  assert.match(block, /\.desk-module-sidebar__nav-main/);
  assert.match(block, /display:\s*none/);
});
