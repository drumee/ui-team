// How the folder window raises an in-window tour.
//
// Three things are pinned, and each of them is a bug that has a precedent in
// this file's history —
//
//  1. THE CLAIM CANNOT STRAND SINGLE-FLIGHT. libs/tutorial-tours holds
//     `_inFlight` from the claim until the tour is destroyed and release()
//     runs. If the caller claims and then declines to mount, nothing is ever
//     destroyed, release() is never reached, and every later tour is dropped in
//     silence. So the already-mounted guard must come BEFORE the claim.
//  2. THE RELEASE IS WIRED TO destroy. The same handshake the desk makes.
//  3. THE OVERLAY IS ITS OWN WRAPPER. Not `wrapper-dialog`: that slot is
//     claimed by the create-folder, rename and meeting dialogs, and a tour must
//     not evict one of those, or be evicted by one.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const FOLDER = join(ROOT, "src/drumee/builtins/window/folder/index.js");
const SKIN = join(ROOT, "src/drumee/builtins/window/folder/skin/index.scss");

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const src = stripComments(readFileSync(FOLDER, "utf8"));
const skin = readFileSync(SKIN, "utf8");

// The showTutorial() body, so assertions cannot accidentally match one of the
// other twenty overlay openers in this 6000-line file.
//
// Anchored on the definition's signature, not the bare name: `showTutorial(`
// alone also matches every CALL site (_maybeRunPreviewTour, the share
// trigger), and whichever of those happens to sit first in the file would be
// picked up instead of the definition. Matching `showTutorial(tour, opt`
// isolates the definition regardless of where in the class it lives, so the
// guard-before-claim ordering below is asserted against the right text no
// matter how the three tutorial methods get reordered later.
function showTutorialBody() {
  const start = src.indexOf("showTutorial(tour, opt");
  assert.ok(
    start > 0,
    "showTutorial(tour, opt = {}) definition not found in folder/index.js",
  );
  // Far enough to cover the method and nothing like a whole neighbour.
  return src.slice(start, start + 1600);
}

test("showTutorial exists and takes a tour plus options", () => {
  assert.match(src, /showTutorial\(tour,\s*opt\s*=\s*\{\}\)/);
});

test("the already-mounted guard comes BEFORE the claim", () => {
  const body = showTutorialBody();
  const guard = body.indexOf("_tutorialOverlay");
  const claim = body.indexOf("claim(");
  assert.ok(guard > -1, "no already-mounted guard");
  assert.ok(claim > -1, "no claim");
  assert.ok(
    guard < claim,
    "claiming before the guard strands single-flight when the guard refuses",
  );
});

test("a preview skips the claim entirely", () => {
  // An explicitly requested tour is never gated, matching the desk's ?tutorial=.
  assert.match(showTutorialBody(), /opt\.preview/);
});

test("it mounts the window_tutorial kind into its own wrapper", () => {
  const body = showTutorialBody();
  assert.match(body, /window-folder__wrapper-tutorial/);
  assert.match(body, /name:\s*["']tutorial["']/);
  assert.match(body, /kind:\s*["']window_tutorial["']/);
  assert.match(body, /ensurePart\(["']wrapper-tutorial["']\)/);
});

test("it does NOT reuse wrapper-dialog", () => {
  assert.ok(!/wrapper-dialog/.test(showTutorialBody()));
});

test("destroy releases single-flight", () => {
  assert.match(src, /window-tutorial/);
  assert.match(src, /require\(["']libs\/tutorial-tours["']\)\.release\(|Tours\.release\(/);
});

test("the share trigger mounts in-window instead of broadcasting", () => {
  // fire() would broadcast, and the desk would mount a second, full-screen copy
  // of the same tour.
  const i = src.indexOf('"share"') >= 0 ? src.indexOf('"share"') : src.indexOf("'share'");
  assert.ok(i > 0);
  const around = src.slice(Math.max(0, i - 600), i + 600);
  assert.match(around, /showTutorial\(/);
  assert.ok(
    !/fire\(\s*["']share["']/.test(src),
    "the share trigger must no longer go through fire()",
  );
});

test("the folder window does not read the URL itself", () => {
  // It used to: `_maybeRunPreviewTour()` sat at the end of buildContent and
  // parsed `?window_tutorial=` there. Wrong twice over — the hash is already
  // rewritten to `#/desk` by then, and buildContent only runs when a folder
  // window mounts, so with nothing open it never ran at all. The desk owns the
  // read now (libs/window-tutorial-intent, armed by the router); this window
  // only exposes showTutorial for the desk to call.
  assert.ok(!/previewRequest/.test(src), "URL parsing belongs to the desk now");
  assert.ok(!/_maybeRunPreviewTour/.test(src));
  assert.ok(!/_previewConsumed/.test(src));
  assert.match(src, /showTutorial\(tour, opt/);
});

test("the overlay covers the whole window and stops at its corners", () => {
  const i = skin.indexOf("__wrapper-tutorial");
  assert.ok(i > 0, "no __wrapper-tutorial rule in the folder skin");
  const block = skin.slice(i, i + 700);
  assert.match(block, /position:\s*absolute\s*!important/);
  assert.match(block, /inset:\s*0/);
  assert.match(block, /border-radius:\s*inherit/);
  assert.match(block, /overflow:\s*hidden/);
  assert.match(block, /z-index:/);
});
