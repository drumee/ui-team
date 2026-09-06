// `?window_tutorial=<id>` has to survive the app's own boot.
//
// TWO faults made the URL do nothing at all on stage, and this file pins both.
//
//  1. THE HASH IS REWRITTEN. By the time the desk is up, `location.hash` reads
//     `#/desk` — the query is gone. The old code read the hash at the LAST
//     possible moment (a folder window's buildContent), so it always parsed an
//     empty arg set and returned silently. The router already solves this for
//     campaign and billing links by CAPTURING from the URL early
//     (`captureCampaignArrival()`, `billingDeepLink.captureFromUrl()`), and
//     this module is the same idiom for the same reason.
//
//  2. THE HOOK NEEDED A FOLDER WINDOW. It lived in `__window_folder.buildContent`,
//     so with no workspace open — the desk's home grid, which desk/index.js:6522
//     documents as an ordinary state — it was never called. That is worst for
//     `?window_tutorial=workspace`, the tour that teaches CREATING a workspace:
//     the state you most want it in is the state it could not run in.
//
// The capture must be write-only-on-hit: a later capture from the rewritten
// `#/desk` must NOT clear an intent already taken from the original URL. That
// single property is what makes the fix work, so it gets its own test.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");

// The module reads Visitor off the global, exactly as the rest of the app does.
let hash = "";
global.Visitor = {
  parseModuleArgs() {
    const out = {};
    for (const part of hash.split(/[#/&?]/g)) {
      const kv = part.split(/( *= *)/);
      if (kv[0]) out[kv[0]] = kv[2];
    }
    return out;
  },
};

const intent = require("../src/drumee/libs/window-tutorial-intent.js");

function reset(h) {
  hash = h;
  intent.__reset();
}

test("captures a real tour from the URL", () => {
  reset("#/desk?window_tutorial=workspace");
  assert.equal(intent.captureFromUrl(), true);
  assert.equal(intent.has(), true);
  assert.deepEqual(intent.take(), { tour: "workspace", opt: { preview: 1 } });
});

test("a URL with no parameter captures nothing", () => {
  reset("#/desk");
  assert.equal(intent.captureFromUrl(), false);
  assert.equal(intent.has(), false);
  assert.equal(intent.take(), null);
});

test("an unknown or excluded tour is not an intent", () => {
  for (const id of ["nope", "full", "constructor"]) {
    reset(`#/desk?window_tutorial=${id}`);
    assert.equal(intent.captureFromUrl(), false, `${id} should not capture`);
  }
});

test("THE FIX: a later capture from the rewritten hash does not clear the intent", () => {
  // This is the whole point. The app rewrites the hash to `#/desk` during boot,
  // and route() captures again on that rewrite. If capture cleared on a miss,
  // the intent taken from the real URL would be destroyed before anything could
  // consume it — which is the bug this module exists to fix.
  reset("#/desk?window_tutorial=share");
  intent.captureFromUrl();
  hash = "#/desk";
  intent.captureFromUrl();
  assert.equal(intent.has(), true, "the rewritten hash wiped the captured intent");
  assert.deepEqual(intent.take(), { tour: "share", opt: { preview: 1 } });
});

test("take() is one-shot, so two consumers cannot both run the tour", () => {
  reset("#/desk?window_tutorial=chat");
  intent.captureFromUrl();
  assert.deepEqual(intent.take(), { tour: "chat", opt: { preview: 1 } });
  assert.equal(intent.take(), null);
  assert.equal(intent.has(), false);
});

test("step and screen ride along", () => {
  reset("#/desk?window_tutorial=share&step=2&screen=4");
  intent.captureFromUrl();
  const got = intent.take();
  assert.equal(got.opt.enter_at_step, "2");
  assert.equal(got.opt.enter_at_screen, "4");
});

test("a throwing Visitor never breaks boot", () => {
  intent.__reset();
  const saved = global.Visitor.parseModuleArgs;
  global.Visitor.parseModuleArgs = () => {
    throw new Error("no Visitor yet");
  };
  assert.doesNotThrow(() => intent.captureFromUrl());
  assert.equal(intent.has(), false);
  global.Visitor.parseModuleArgs = saved;
});

// ── wiring ───────────────────────────────────────────────────────────────────
//
// Source assertions, because the router and the desk both extend ui-core classes
// that need the whole browser runtime. They pin that the capture happens EARLY
// and that the desk, not the folder window, is what consumes it.

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const routerSrc = stripComments(
  readFileSync(join(ROOT, "src/drumee/router/index.js"), "utf8"),
);
const deskSrc = stripComments(
  readFileSync(join(ROOT, "src/drumee/modules/desk/index.js"), "utf8"),
);
const folderSrc = stripComments(
  readFileSync(join(ROOT, "src/drumee/builtins/window/folder/index.js"), "utf8"),
);

test("the router captures on BOTH the cold boot and the warm hashchange", () => {
  // Same pair of call sites campaign and billing use: initialize() covers a cold
  // load, route() covers clicking a link in a tab that already runs the app,
  // where initialize() never runs again.
  const hits = routerSrc.match(/windowTutorialIntent\.captureFromUrl\(\)/g) || [];
  assert.equal(hits.length, 2, "expected a capture in initialize() and in route()");
});

test("the desk consumes the intent and opens a workspace when none is open", () => {
  assert.match(deskSrc, /_maybeRunWindowTutorial/);
  assert.match(deskSrc, /_openDefaultWorkspace\(\)/);
  // _railWorkspace, NOT _activeWorkspace: the latter answers "which window is
  // RAISED" and returns null while a workspace is open but unraised, which would
  // open a second, wrong workspace.
  const body = deskSrc.slice(deskSrc.indexOf("_maybeRunWindowTutorial"));
  assert.match(body.slice(0, 1400), /_railWorkspace\(\)/);
  assert.ok(
    !/_activeWorkspace\(\)/.test(body.slice(0, 1400)),
    "_activeWorkspace is the wrong accessor here",
  );
});

test("the folder window no longer reads the URL itself", () => {
  assert.ok(!/_maybeRunPreviewTour/.test(folderSrc), "the URL read moved to the desk");
  assert.ok(!/previewRequest/.test(folderSrc), "the folder window no longer parses args");
  // showTutorial stays — it is what the desk calls.
  assert.match(folderSrc, /showTutorial\(tour, opt/);
});

test("the desk waits for the workspace restore before mounting a tour", () => {
  // loadDefault raises `_restoreInFlight`, feeds the skeleton — which reaches
  // onPartReady("overlay") -> _afterHomeSettled() -> here, synchronously — and
  // only THEN calls _restoreDeskState(). So this hook runs BEFORE the desk has
  // opened its workspace.
  //
  // Without waiting, `_railWorkspace()` is null at that moment, so this opened
  // rows[0] — an arbitrary workspace — mounted the tour on it, and was then
  // replaced by the restore's own workspace. Destroying that folder window
  // takes its overlay with it (__window_folder.onBeforeDestroy ->
  // _closeTutorialOverlay), which is why the tour appeared, vanished, and left
  // a workspace behind. `_restoreInFlight` is the flag that exists to stop
  // exactly this, and ignoring it was the bug.
  const body = deskSrc.slice(deskSrc.indexOf("_maybeRunWindowTutorial"));
  assert.match(body.slice(0, 2000), /_awaitRestoreSettled\(\)/);
  assert.match(deskSrc, /_awaitRestoreSettled\(\)\s*{/);
  assert.match(deskSrc, /_restoreInFlight/);
});
