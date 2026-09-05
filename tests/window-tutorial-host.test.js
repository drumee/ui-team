// The in-window tour host.
//
// It extends LetcBox, so it cannot be instantiated outside a browser: what is
// pinned here is the shape of the file. Three things, each of which fails
// silently and expensively if it drifts —
//
//  1. THE EVENT VOCABULARY. The step widgets bubble a fixed set of services at
//     their uiHandler. A missing case is a tour that stops advancing with no
//     error in the console.
//  2. THE SIZING SOURCE. The desk host reads window.innerWidth. Here that is
//     the wrong box: a popup folder window is ~1000px on a 1920px screen, so
//     the viewport says "wide", --pane-fit stays 1, and a 985px board mock
//     blows straight out of the pane.
//  3. THE ABSENT EXIT PATH. Exit is dismiss-only. Writing tutorial_done or
//     calling loadWorkspace from here would be wrong twice over: neither means
//     anything over an already-open folder window, and tutorial_done is
//     load-bearing for the seen-set inference.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const HOST = join(ROOT, "src/drumee/builtins/window/tutorial/index.js");
const SEEDS = join(ROOT, "src/drumee/seeds.js");

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const src = stripComments(readFileSync(HOST, "utf8"));
const seeds = readFileSync(SEEDS, "utf8");

test("the class name derives the family window-tutorial", () => {
  // ui-core strips leading underscores and maps _ to -, so this name IS the
  // BEM root the skin and the skeleton are written against.
  assert.match(src, /class\s+__window_tutorial\s+extends\s+LetcBox/);
  assert.match(src, /module\.exports\s*=\s*__window_tutorial/);
});

test("it is registered as a lazy kind", () => {
  assert.match(seeds, /window_tutorial:\s*function\s*\(\)\s*\{/);
  assert.match(seeds, /import\(["'].\/builtins\/window\/tutorial["']\)/);
});

test("every service the step widgets raise has a case", () => {
  for (const svc of [
    "next-step",
    "back-step",
    "end-tour",
    "spotlight:focus",
    "spotlight:clear",
  ]) {
    assert.ok(
      src.includes(`case '${svc}'`) || src.includes(`case "${svc}"`),
      `no onUiEvent case for ${svc}`,
    );
  }
});

test("it reuses the shared kit rather than re-declaring the tiers", () => {
  assert.match(src, /require\(['"](desk\/tutorial\/host-kit|.*host-kit)['"]\)/);
  assert.ok(!/SIZE_TIERS\s*=/.test(src), "the tier table must not be duplicated");
  assert.ok(!/SHORT_HEIGHT\s*=/.test(src), "SHORT_HEIGHT must not be duplicated");
});

test("it measures its own box, never the viewport", () => {
  assert.match(src, /getBoundingClientRect\(\)/);
  assert.ok(
    !/window\.innerWidth/.test(src),
    "the viewport is the wrong box for an in-window overlay",
  );
  assert.ok(!/window\.innerHeight/.test(src));
});

test("it watches its own box for resize", () => {
  // A folder window is dragged, zoomed, tiled and snapped with no viewport
  // event at all, so `resize` alone would leave the callout on stale
  // coordinates — off the edge, with its buttons out of reach.
  assert.match(src, /ResizeObserver/);
  assert.match(src, /reflow\(\)/);
});

test("exit is dismiss-only", () => {
  assert.ok(!/tutorial_done/.test(src), "must not write tutorial_done");
  assert.ok(!/loadWorkspace/.test(src), "must not open a workspace");
  assert.ok(!/update_settings/.test(src), "must not write settings");
  assert.ok(!/_chainMigrateTour|fire\(/.test(src), "must not chain a tour");
  assert.match(src, /softDestroy\(\)/);
});

test("no step of any tour is live here", () => {
  // _canCreate is false, so the workspace tour's create form and invite screen
  // are dropped and every screen is a mock.
  assert.match(src, /canCreate:\s*false/);
});

test("the tour is recorded on mount, and a preview is not", () => {
  assert.match(src, /armed\(\)/);
  assert.match(src, /markSeen\(/);
  assert.match(src, /mget\(['"]preview['"]\)/);
});

test("Escape leaves the tour", () => {
  assert.match(src, /libs\/hotkeys/);
  assert.match(src, /['"]Escape['"]/);
  assert.match(src, /phase:\s*['"]capture['"]/);
});

test("it loads the desk tutorial's stylesheet, not only its own", () => {
  // Amendment A. The `.tutorial-main*` rules this widget's shell depends on
  // (the responsive tiers, --pane-fit) live ONLY in
  // desk/tutorial/skin/index.scss, which is otherwise pulled into the bundle
  // only when the desk tour itself mounts. Without this require, a session
  // where the desk tour never ran would find none of those rules in the
  // document: an unstyled, unsized overlay, failing with no error.
  assert.match(src, /require\(['"]desk\/tutorial\/skin['"]\)/);
});

test("the root wears the bare tutorial-main class", () => {
  // Amendment B. The tier rules are written `.tutorial-main[data-size="..."]`,
  // which only match an element that carries BOTH the bare class and the
  // data-size attribute. desk_tutorial gets the class free from its fig
  // family; this widget's family is window-tutorial, so without this the
  // attribute is stamped on an element the selectors never match — every tier
  // rule and the whole --pane-fit scaling silently dead.
  assert.match(src, /classList\.add\((['"])tutorial-main\1\)/);
});
