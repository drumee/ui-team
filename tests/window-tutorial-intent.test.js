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
  const body = deskSrc.slice(deskSrc.indexOf("async _maybeRunWindowTutorial"));
  // Reached through _awaitRailWorkspace, which polls _railWorkspace — a single
  // read is what opened a second workspace (see the pane test below).
  assert.match(body.slice(0, 900), /_awaitRailWorkspace\(/);
  assert.ok(
    !/_activeWorkspace\(\)/.test(body.slice(0, 900)),
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

test("the desk waits for the restore's PANE, not just its flag", () => {
  // The flag is not the pane. `_clearRestoreInFlight` clears _restoreInFlight on
  // a 2.5s timer while `loadWorkspace` mounts its pane from inside a fetch, so
  // the flag routinely clears with the restore's pane still in flight — and
  // `_railWorkspace()` answers null until Wm._findWorkspaceWindow has something.
  //
  // Peeking once there opened a SECOND workspace and mounted the tour on it,
  // and the restore's original pane then took the screen. Nothing was destroyed
  // — the tour was left alive on the pane behind, which is why no teardown ever
  // fired. So the first look must be a poll, gated on whether a pane is
  // actually coming (Wm._curWorkspace), not a single read.
  const body = deskSrc.slice(deskSrc.indexOf("async _maybeRunWindowTutorial"), );
  const head = body.slice(0, 900);
  assert.match(head, /_awaitRailWorkspace\(this\._workspaceIncoming\(\)/,
    "the first look must poll for an incoming pane");
  // The bare single read is what caused the bug; it must not come back.
  assert.ok(
    !/let ws = this\._railWorkspace\(\);/.test(head),
    "a single peek at _railWorkspace reintroduces the double-open",
  );
  assert.match(deskSrc, /_workspaceIncoming\(\)\s*{/);
  assert.match(deskSrc, /Wm\._curWorkspace/);
});

test("the wm's URL reset stands down when a tour was launched from the URL", () => {
  // wm.route() unconditionally scheduled `location.hash = '#/desk/wm/home'` 5s
  // after boot. That re-routes the app, re-renders the workspace pane, and drops
  // the overlay appended to it — WITHOUT destroying the window, so no destroy
  // handler fires. The tour appeared, vanished a few seconds later, and left a
  // workspace behind, with every lifecycle hook silent. It took three rounds to
  // find because the only visible trace was the address bar changing.
  const wmSrc = stripComments(
    readFileSync(join(ROOT, "src/drumee/modules/desk/wm/index.js"), "utf8"),
  );
  const i = wmSrc.indexOf("location.hash='#/desk/wm/home'");
  assert.ok(i > 0, "the reset moved; this guard needs revisiting");
  // The stand-down must come BEFORE the assignment, inside the same timeout.
  const before = wmSrc.slice(Math.max(0, i - 400), i);
  assert.match(before, /window-tutorial-intent/);
  assert.match(before, /armed\(\)/);
  assert.match(before, /return;/);
});

test("armed() survives take(), so the URL reset stays suppressed all session", () => {
  // The reset fires ~5s in, long after the desk has consumed the intent. If
  // `armed` were cleared by take(), the guard above would already be false by
  // the time it mattered.
  reset("#/desk?window_tutorial=migrate");
  intent.captureFromUrl();
  intent.take();
  assert.equal(intent.has(), false, "the intent itself is one-shot");
  assert.equal(intent.armed(), true, "but armed() must outlive it");
});

test("the desk owns the mount, in the slot that nothing else re-feeds", () => {
  // THE FIX. `Box.feed()` is `collection.set()`, so appending the overlay to the
  // folder window meant any feed on that window replaced the collection and
  // dropped it — with the window alive, the tour's part never registered, and
  // every lifecycle handler silent. A workspace pane is fed repeatedly while it
  // builds, so a tour on a freshly opened pane always lost that race.
  //
  // The desk's `overlay` Wrapper is where desk_tutorial has always mounted and
  // nothing else re-feeds it, so the tour is mounted there and lays itself over
  // the window instead of living inside it.
  assert.match(deskSrc, /mountWindowTutorial\(ws, tour, opt/);
  const body = deskSrc.slice(deskSrc.indexOf("mountWindowTutorial(ws, tour, opt"));
  assert.match(body.slice(0, 700), /ensurePart\("overlay"\)/);
  assert.match(body.slice(0, 700), /kind: "window_tutorial"/);
  assert.match(body.slice(0, 700), /target_window: ws/);
  // and it answers the folder window's broadcast
  assert.match(deskSrc, /"window-tutorial:mount"/);
  assert.match(deskSrc, /_onWindowTutorial/);
});

test("single-flight is released from the desk now that it owns the mount", () => {
  // The handshake moved with the mount. Without it a claimed tour would hold the
  // account-wide latch forever and no later tour would ever run.
  const i = deskSrc.indexOf('case "window-tutorial"');
  assert.ok(i > 0, "no onPartReady case for the in-window tour");
  const body = deskSrc.slice(i, i + 800);
  assert.match(body, /once\(_e\.destroy/);
  assert.match(body, /release\(/);
  assert.match(body, /preview/);
});

test("the tour lays itself over its window, and follows it", () => {
  const hostSrc = stripComments(
    readFileSync(join(ROOT, "src/drumee/builtins/window/tutorial/index.js"), "utf8"),
  );
  assert.match(hostSrc, /_syncToWindow\(\)\s*{/);
  assert.match(hostSrc, /target_window/);
  // _applySize measures this host's own box for the tier, so the geometry has to
  // be applied before it reads that box.
  const size = hostSrc.slice(hostSrc.indexOf("_applySize() {"));
  assert.match(size.slice(0, 400), /_syncToWindow\(\)/);
  // The host no longer lives inside the window, so watching only itself would
  // miss the window being dragged, zoomed or tiled.
  assert.match(hostSrc, /_ro\.observe\(ws\.el\)/);
});

test("the host forwards a step's action to the window it is drawn over", () => {
  const hostSrc = stripComments(
    readFileSync(join(ROOT, "src/drumee/builtins/window/tutorial/index.js"), "utf8"),
  );
  // Dispatched at the window's own onUiEvent — where the real menu's rows land
  // too — so a create goes through the product's dialog and Upload opens the
  // real picker, instead of the tour reimplementing either.
  assert.match(hostSrc, /window-tutorial:act/);
  assert.match(hostSrc, /_actOnWindow\(action, cmd\)/);
  // The CLICKED ROW is forwarded as the handler's `cmd`, not this host. The
  // product reads its payload off the trigger — newDocument takes the file name
  // from cmd.mget(_a.name) — so handing it anything else creates a document
  // with no template name and it refuses.
  assert.match(hostSrc, /ws\.onUiEvent\(cmd \|\| this,/);
});

test("the migrate tour is recorded on the action landing, not on mount", () => {
  const hostSrc = stripComments(
    readFileSync(join(ROOT, "src/drumee/builtins/window/tutorial/index.js"), "utf8"),
  );
  const deskTutSrc = stripComments(
    readFileSync(join(ROOT, "src/drumee/modules/desk/tutorial/index.js"), "utf8"),
  );
  // BOTH hosts must skip mount-marking for it, or the desk one burns the flag
  // and the in-window one never gets the chance to earn it.
  for (const src of [hostSrc, deskTutSrc]) {
    assert.match(src, /mark_on !== 'success'/);
  }
  // newContent is the folder window's arrival hook for a create AND an upload,
  // so it distinguishes "did it" from "opened a picker and cancelled" — which
  // is the entire reason this tour is marked on success.
  assert.match(hostSrc, /newContent/);
  assert.match(hostSrc, /_markDone\(\)\s*{/);
  // Walking every step to the last Done is the tour's other completion, so
  // _nextStep records it rather than falling through to a plain exit.
  assert.match(hostSrc, /_markDone\(\);\s*}\s*_prevStep/);
  // A preview must not burn the flag on the way out any more than on the way in.
  //
  // Anchored on the DEFINITION, not on the first mention of the name: the call
  // sites now come first in the file, and slicing from one of those read the
  // wrong function's body.
  const done = hostSrc.slice(hostSrc.search(/_markDone\(\)\s*{/));
  assert.match(done.slice(0, 400), /mget\('preview'\)/);
});

test("the tour hosts a real dialog itself, because a window's cannot be seen", () => {
  // `isolation: isolate` on the window manager's root traps every layer inside
  // it (wm/skin/index.scss), so a dialog opened in a folder window can never
  // paint above a desk-level screen — nor can its window or its layer, both of
  // which are inside that same isolated context. Two z-index fixes failed on
  // exactly that before this was understood.
  //
  // So the tour draws the product's own dialog, with the window's BEM prefix so
  // it keeps its styles, and hands the typed name back to the window — whose
  // createFolderFromDialog reads cmd.getValue() before its own part, so the
  // entry widget is all it needs. The creating stays the window's.
  const hostSrc = stripComments(
    readFileSync(join(ROOT, "src/drumee/builtins/window/tutorial/index.js"), "utf8"),
  );
  assert.match(hostSrc, /action === 'add-folder'/);
  assert.match(hostSrc, /create-folder-dialog/);
  assert.match(hostSrc, /prefix: 'window-folder__create-folder'/);
  // The typed name is READ BEFORE the dialog is torn down and handed over in a
  // stand-in. Closing first destroyed the entry_reminder, whose getValue() then
  // returns undefined through a gone `_entry` — and the window's own fallback
  // looks in ITS tree, where this dialog was never rendered. Every folder came
  // out named "New folder".
  const submit = hostSrc.slice(hostSrc.indexOf("_submitCreateFolder(_trigger)"));
  // Looked UP, never taken from the trigger: the field and the Create button
  // both raise this service and only the field has a value, so trusting the
  // trigger worked from the keyboard and produced "New folder" from the button.
  assert.match(submit.slice(0, 900), /getPart\('create-folder-name'\)/);
  const read = submit.indexOf("entry.getValue()");
  const close = submit.indexOf("_closeCreateFolder()");
  assert.ok(read > -1 && close > -1, "submit must read then close");
  assert.ok(read < close, "the name must be read before the dialog is cleared");
  assert.match(submit.slice(0, 900), /getValue: \(\) => name/);
  // and both of the dialog's own controls are routed
  assert.match(hostSrc, /case 'create-folder-submit'/);
  assert.match(hostSrc, /case 'close-folder-dialog'/);
});

test("an in-window tour stands the desk's overlay down instead of taking the desk", () => {
  // The `overlay` slot is built for full-screen guests: opening it paints a
  // body-wide scrim and takes pointer-events across the whole desk. An in-window
  // tour covers ONE window, so both defaults are wrong for it — the rail could
  // not be clicked at all, and the topbar's switcher, tooltips and account menu
  // were painted over.
  const { readFileSync: rf } = require("node:fs");
  const deskSkin = rf(join(ROOT, "src/drumee/modules/desk/skin/index.scss"), "utf8");
  const i = deskSkin.indexOf('.desk-module[data-window-tour="1"]');
  assert.ok(i > 0, "no stand-down block for an in-window tour");
  const block = deskSkin.slice(i, i + 2200);
  assert.match(block, /background-color: transparent/);
  assert.match(block, /pointer-events: none/);
  // 100001, and the number matters. The overlay is NOT at its declared 10010
  // while it holds the tour: it is a Wrapper, so receiving one stamps
  // `data-state="open"`, and skin/lib/utils.scss lifts anything carrying that to
  // `--z-index-context` (50000) with !important. A lift to 10011 lost to it in
  // silence. This is the same value the workspace-switcher lift in that file
  // already uses, for the same reason.
  assert.match(block, /z-index: 100001/);
  assert.ok(!/z-index: 10011/.test(block), "10011 loses to the 50000 data-state lift");
  assert.match(block, /\.desk-module__sidebar \{/);

  // The desk raises and clears the flag itself.
  assert.match(deskSrc, /dataset\.windowTour = "1"/);
  assert.match(deskSrc, /delete this\.el\.dataset\.windowTour/);

  // And the tour takes events back for its own box, or nothing in it is clickable.
  const tourSkin = rf(join(ROOT, "src/drumee/builtins/window/tutorial/skin/index.scss"), "utf8");
  assert.match(tourSkin, /pointer-events: auto/);
});
