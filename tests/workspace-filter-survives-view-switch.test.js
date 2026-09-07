// Switching grid ↔ list ↔ group must not throw the file-type filter away.
//
// The workspace toolbar carries two independent controls: the file-type tabs
// (All / Docs / PDF / Images / Other) and, next to "+ New", the three view
// toggles. Pressing a view toggle rebuilds the whole content part — filter bar
// included — while the filter itself lives on the window as `_filterType` and
// survives, because the listing reads it back through getCurrentApi().
//
// The bar used to light tab 0 unconditionally on every rebuild. So after a view
// switch it claimed "All" over a listing that was still filtered, and on a
// filter that matched nothing the workspace read as "All → and no files at
// all". That is the bug Lexis reported.
//
// These tests assert the bar reports the filter the LISTING is actually using,
// which is the only state that is not a lie in either direction.
const test = require("node:test");
const assert = require("node:assert/strict");
const { installGlobals, installResolver, findAll } = require("./helpers/render-skeleton.js");
const { requireEsmish } = require("./helpers/load-esmish.js");

const TOOLKIT = "src/drumee/builtins/window/skeleton/toolkit/index.js";

// The workspace window as the bar sees it: a folder window with an active
// file-type filter. `_id` names the radio channel; `_filterType` is the
// window's own record of the filter, null for All.
const win = (filterType) => ({
  fig: { family: "window-folder", group: "window-body" },
  _id: "w1",
  _filterType: filterType,
  mget: () => null,
  getViewMode: () => "icon",
});

// The bar draws the whole right-hand control group with it (search, + New, the
// view toggles), and the "+ New" dropdown names a ui-core menu kind. Nothing
// under test reads it; it only has to exist for the tree to build.
function withGlobals(fn) {
  const restoreGlobals = installGlobals();
  const restoreResolver = installResolver();
  const savedKind = global.KIND;
  global.KIND = { menu: { topic: "menu.topic" }, blank: "blank" };
  try {
    return fn();
  } finally {
    if (savedKind === undefined) delete global.KIND;
    else global.KIND = savedKind;
    restoreResolver();
    restoreGlobals();
  }
}

// Render the bar and read the tabs back as [value, state] pairs.
//
// button() wraps each tab as `<pfx>-main` and gives the label span inside it
// the bare `<pfx>` class, so the node carrying value/state/radiotoggle — the
// one a click actually lands on — is the `-main` one. Reading the span instead
// finds five tabs that all report `undefined` and asserts nothing.
function tabs(filterType) {
  return withGlobals(() => {
    const { fileTypeFilterBar } = requireEsmish(TOOLKIT);
    const bar = fileTypeFilterBar(win(filterType));
    return findAll(bar, "window-folder__filter-tab-main").map((n) => [n.value, n.state]);
  });
}

const lit = (rows) => rows.filter(([, state]) => state === 1).map(([value]) => value);

test("with no filter the bar lights All — the first render is unchanged", () => {
  const rows = tabs(null);
  assert.deepEqual(
    rows.map(([v]) => v),
    ["all", "docs", "pdf", "image", "other"],
    "the five buckets, in the order the toolbar draws them",
  );
  assert.deepEqual(lit(rows), ["all"]);
});

test("a rebuilt bar lights the filter the window is still applying", () => {
  // Each of these is a bar rebuilt by a view switch while that filter is live.
  // Lighting "all" here is the exact defect: the listing is filtered, so the
  // bar would be naming a filter nobody is using.
  for (const value of ["docs", "pdf", "image", "other"]) {
    assert.deepEqual(lit(tabs(value)), [value], `${value} lost its tab on rebuild`);
  }
});

test("exactly one tab is ever lit", () => {
  // The tabs are a radio group; two lit tabs is as unreadable as none.
  for (const value of [null, "docs", "pdf", "image", "other"]) {
    assert.equal(lit(tabs(value)).length, 1, `wrong number of lit tabs for ${value}`);
  }
});

test("a filter the bar does not list falls back to All, never to nothing", () => {
  // Defensive: the folder window only ever stores one of the five, but a bar
  // with no tab lit at all is a dead-looking control, so an unknown value must
  // still land somewhere.
  assert.deepEqual(lit(tabs("video")), ["all"]);
});

test("the tabs share one radio channel, keyed to the window", () => {
  // _resetFileTypeFilter drives the bar back to All by broadcasting on this
  // channel, so a rebuilt bar that changed channels would leave navigation
  // unable to clear the filter it just dropped.
  withGlobals(() => {
    const { fileTypeFilterBar } = requireEsmish(TOOLKIT);
    const bar = fileTypeFilterBar(win("docs"));
    const chans = new Set(
      findAll(bar, "window-folder__filter-tab-main").map((n) => n.radiotoggle),
    );
    assert.deepEqual([...chans], ["media-filter-w1"]);
  });
});
