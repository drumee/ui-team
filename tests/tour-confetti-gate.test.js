// The confetti fires for ONE arrival, not for a tour id.
//
// It belongs to the moment a workspace has just been made, opened and confirmed
// on screen — the workspace tour handing over to migrate. The SAME tour is
// raised from the rail's Files button, in the same in-window host, and that is
// an ordinary Tuesday.
//
// So the host cannot be the condition and a flag has to be: `celebrate`, set by
// the hand-off and by nothing else. This pins both ends of that, because the
// failure mode is silent in both directions — a third setter would celebrate
// the rail, and a missing reader would celebrate nothing.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

test("the hand-off is the only thing that sets the flag", () => {
  const setters = [
    "src/drumee/modules/desk/tutorial/index.js",
    "src/drumee/modules/desk/index.js",
    "src/drumee/builtins/window/folder/index.js",
    "src/drumee/builtins/media/interact.js",
  ].flatMap((f) => {
    const hits = strip(read(f)).match(/celebrate\s*:/g) || [];
    return hits.map(() => f);
  });
  assert.deepEqual(
    setters,
    ["src/drumee/modules/desk/tutorial/index.js"],
    "only _chainMigrateTour may set `celebrate`",
  );
});

test("and it is set on the hand-off itself", () => {
  const src = strip(read("src/drumee/modules/desk/tutorial/index.js"));
  assert.match(src, /showTutorial\('migrate',\s*\{\s*celebrate:\s*1\s*\}\)/);
});

test("the host refuses to celebrate without it", () => {
  const src = strip(read("src/drumee/builtins/window/tutorial/index.js"));
  const i = src.search(/_maybeCelebrate\(\)\s*\{/);
  assert.ok(i > 0, "no _maybeCelebrate");
  const body = src.slice(i, src.indexOf("\n  }", i));
  // The flag is checked FIRST — before the tour id and the step index, so a
  // rail-raised migrate tour returns on the cheapest test.
  assert.match(body, /mget\('celebrate'\)/);
  assert.ok(
    body.indexOf("celebrate') ") < body.indexOf("_tour.id"),
    "the flag must be the first gate",
  );
});

test("the rail raises the same tour and passes nothing", () => {
  const src = strip(read("src/drumee/modules/desk/index.js"));
  // fire() with no third argument — the opt channel a trigger would use to say
  // it knew something the tour could not.
  assert.match(src, /fire\(tour,\s*this\)/);
});
