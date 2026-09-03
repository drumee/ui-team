// The Files empty state is driven by ONE flag written onto the grid list:
// `data-empty`. The skin uses it twice, in opposite directions —
//
//   .window__icons-list[data-empty="1"]                    { display: none }
//   .window__icons-list[data-empty="1"] ~ .window__fe-hero { display: flex }
//
// — so a wrong `1` does not merely add a hero, it REPLACES the grid with one.
// Writing it is gated on `_gridLoaded` ("this grid finished loading once"),
// which exists so the empty state cannot flash over a fetch that is about to
// return files.
//
// The regression: that flag was set at the first EOD and never cleared, so it
// guarded only the FIRST list. The view toggle and the file-type filter both
// re-feed the content part, which mounts a NEW list — and _syncGridEmpty runs
// as soon as the list is wired, before its fetch. With the gate stuck open the
// new, still-empty collection measured 0, and a populated folder showed the
// "no files yet" hero with no tiles and no context menu. It could not recover
// on its own either: a `display: none` list has no viewport for a scroll-driven
// fetch, so the EOD that would clear the flag need never arrive.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = join(__dirname, "..", "src", "drumee");
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const utils = stripComments(
  readFileSync(join(SRC, "builtins/window/utils.js"), "utf8"),
);

const body = (src, sig) => {
  const i = src.indexOf(sig);
  assert.ok(i > -1, `${sig} not found`);
  // To the next method at the same indentation.
  const j = src.indexOf("\n  }", i);
  return src.slice(i, j > -1 ? j : undefined);
};

test("a load STARTING closes the gate and unwrites the stale flag", () => {
  // The collection's `reset` is the reliable "a load is starting" signal:
  // start(1) empties before it refetches, and EVERY reload goes through it
  // whatever called it.
  const wire = body(utils, "_wireGridEmpty(listPart) {");
  const i = wire.indexOf('collection.on("reset"');
  assert.ok(i > -1, "reset must be handled on its own, not lumped with add/remove");
  const handler = wire.slice(i, i + 260);
  assert.match(handler, /this\._gridLoaded\s*=\s*false/, "close the gate");
  assert.match(handler, /delete\s+listPart\.el\.dataset\.empty/, "and unwrite the flag");

  // Lumping reset in with add/remove is the original defect: reset would then
  // WRITE data-empty="1" off the momentarily-empty collection mid-fetch.
  assert.doesNotMatch(
    utils,
    /collection\.on\("add remove reset"/,
    "reset must not share the plain sync handler",
  );
});

test("a load FINISHING re-arms, on every reload not just the first", () => {
  // Persistent, not once(): plenty of reloads never come back through
  // _prepareListPartition — the WS changelog refresh (utils updateContent),
  // core's restart(w, type), make_root_dirs — and each still has to re-arm on
  // its own EOD, or an empty folder would stop showing the hero entirely.
  const wire = body(utils, "_wireGridEmpty(listPart) {");
  const i = wire.indexOf("listPart.on(EOD");
  assert.ok(i > -1, "EOD is bound persistently inside the empty-state wiring");
  const handler = wire.slice(i, i + 200);
  assert.match(handler, /this\._gridLoaded\s*=\s*true/);
  assert.match(handler, /_syncGridEmpty/);
});

test("the wiring is bound once per list, and re-arms every time", () => {
  const wire = body(utils, "_wireGridEmpty(listPart) {");
  // The re-arm runs on EVERY call...
  const armed = wire.indexOf("this._gridLoaded = false");
  const guard = wire.indexOf("__gridEmptyWired");
  assert.ok(armed > -1 && guard > -1, "both the re-arm and the bind-once guard exist");
  assert.ok(
    armed < guard,
    "…and it must run BEFORE the early return, or a revisited list never re-arms",
  );
  // ...while the listeners are bound only once, else every visited folder
  // stacks another handler set on the same collection.
  assert.match(wire, /if \(listPart\.__gridEmptyWired\) return/);
});

test("_syncGridEmpty still refuses to write while the gate is closed", () => {
  const sync = body(utils, "_syncGridEmpty(listPart) {");
  assert.match(
    sync,
    /if \(!this\._gridLoaded\) return/,
    "the guard is what makes re-arming meaningful",
  );
  assert.match(sync, /dataset\.empty\s*=/, "and it is what writes the flag");
});

test("the gate is only ever opened by an end-of-data", () => {
  // Two writers now — the persistent handler in _wireGridEmpty and the
  // existing once(EOD) block that also drives partitioning. Both are EOD
  // handlers, which is the point: opening the gate anywhere else would let
  // _syncGridEmpty measure a collection that is still filling.
  const lines = utils
    .split("\n")
    .map((l, i) => [i, l])
    .filter(([, l]) => /this\._gridLoaded\s*=\s*true/.test(l));
  assert.ok(lines.length > 0, "the gate is opened somewhere");
  for (const [i] of lines) {
    const before = utils.split("\n").slice(Math.max(0, i - 6), i).join("\n");
    assert.match(
      before,
      /\bEOD\b/,
      `_gridLoaded is opened at line ${i + 1} outside an EOD handler`,
    );
  }
});

test("a file-type filter never counts as an empty workspace", () => {
  // The Docs/PDF/Images/Other tabs filter server-side (`type`), and the filter
  // returns matching FILES only — no folders. So a workspace of twenty folders
  // and no PDF answers zero rows for "PDF". Flagging that empty replaced the
  // whole folder with the hero's "Chat live in files. No more context loss."
  // pitch, because the flag hides the list AND reveals the hero.
  const sync = body(utils, "_syncGridEmpty(listPart) {");
  const guard = sync.indexOf("this._filterType");
  assert.ok(guard > -1, "_syncGridEmpty must consider the active filter");
  const write = sync.indexOf("dataset.empty =");
  assert.ok(write > -1, "it still writes the flag for the unfiltered case");
  assert.ok(guard < write, "and the filter check has to come FIRST");
  assert.match(
    sync.slice(guard, write),
    /delete\s+el\.dataset\.empty/,
    "a filtered view clears the flag rather than leaving a stale one",
  );
});

test("the filtered-no-match case still says something", () => {
  // Suppressing the hero must not leave a blank pane: the list carries its own
  // empty view for exactly this case.
  const toolkit = stripComments(
    readFileSync(join(SRC, "builtins/window/skeleton/toolkit/index.js"), "utf8"),
  );
  const i = toolkit.indexOf("__icons-list");
  assert.ok(i > -1, "gridFilesBrowser builds the grid list");
  const listCfg = toolkit.slice(i, i + 1800);
  assert.match(listCfg, /evArgs:\s*Skeletons\.Note\(LOCALE\.FILES_NOT_FOUND/);

  // LOCALE is a safe object: a missing key renders as the key's own NAME
  // rather than failing, so the key has to actually exist.
  const en = JSON.parse(
    readFileSync(join(__dirname, "..", "locale", "en.json"), "utf8"),
  );
  assert.ok(en.FILES_NOT_FOUND, "FILES_NOT_FOUND is a real key in en.json");
});

test("both directions of the skin rule still key off the same flag", () => {
  // If either selector is renamed, the JS above is writing a flag nothing
  // reads — the failure mode that made the first version of this invisible.
  const skin = stripComments(
    readFileSync(join(SRC, "builtins/window/skin/common.scss"), "utf8"),
  );
  assert.match(
    skin,
    /\.window__icons-list\[data-empty="1"\]\s*\{[^}]*display:\s*none/,
    "the populated list hides itself when flagged empty",
  );
  assert.match(
    skin,
    /\.window__icons-list\[data-empty="1"\]\s*~\s*\.window__fe-hero/,
    "and the hero is revealed across the sibling combinator",
  );
});
