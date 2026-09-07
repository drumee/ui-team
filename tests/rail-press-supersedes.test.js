// A rail press invalidates what the press before it parked.
//
// THE REPORT: Files is open, press Task — the task tour comes up, and "show
// the Task tab" is parked on that tour's release (_railTabWithTour defers the
// tab so the tour is seen BEFORE the screen it teaches). Press Files: that
// press ends the task tour and shows Files, the ended tour releases, and the
// parked callback fires — the Task panel lands on top of the Files pane the
// user just asked for. Pressing Files again works, because by then nothing is
// parked.
//
// The count that guards this existed already and only a workspace switch
// bumped it, which is the same fault on the other axis. `_navigated` is now
// bumped by every navigation, and this file runs the reported sequence.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const DESK = readFileSync(
  join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");

/** Lift one method out of the desk so it can be run rather than matched. */
function method(name, params = []) {
  const plain = DESK.indexOf(`\n  ${name}(`);
  const asyn = DESK.indexOf(`\n  async ${name}(`);
  const from = plain > 0 ? plain : asyn;
  assert.ok(from > 0, `${name} is missing`);
  let paren = 0;
  let open = -1;
  for (let j = DESK.indexOf("(", from); j < DESK.length; j++) {
    if (DESK[j] === "(") paren++;
    else if (DESK[j] === ")" && --paren === 0) { open = DESK.indexOf("{", j); break; }
  }
  let depth = 0;
  for (let j = open; j < DESK.length; j++) {
    if (DESK[j] === "{") depth++;
    else if (DESK[j] === "}" && --depth === 0) {
      const body = DESK.slice(from + 3, j + 1);
      const decl = plain < 0
        ? `async function ${body.replace(/^async /, "")}`
        : `function ${body}`;
      const make = (...args) => new Function(...params, `return ${decl}`)(...args);
      // The text too, for the assertions that are about ORDER inside the body.
      make.source = body;
      return make;
    }
  }
  throw new Error(`unbalanced ${name}`);
}

/**
 * A desk with the rail's collaborators stubbed, and a `whenDone` registry that
 * holds its callbacks so a release can be fired at the moment the report
 * describes rather than immediately.
 */
function desk(opt = {}) {
  const log = [];
  const parked = [];
  const Tours = {
    offerable: (tour) => (opt.offerable || {})[tour] !== false,
    whenDone: (tour, cb) => parked.push([tour, cb]),
  };
  const req = () => Tours;
  const d = {
    log,
    parked,
    isDestroyed: () => false,
    _railWorkspace: () => ({ raise: () => {} }),
    _leaveSectionScreen: () => {},
    _endWindowTourUnlessAbout: (tab) => log.push(`end-unless:${tab}`),
    _openDefaultWorkspace: async () => log.push("open-ws"),
    _raiseRailTour: async (tour) => {
      log.push(`raise:${tour}`);
      return (opt.raises || {})[tour] !== false;
    },
    _railTab: (tab) => log.push(`tab:${tab}`),
  };
  d._navigated = method("_navigated")();
  d._railTabWithTour = method("_railTabWithTour", ["require"])(req);
  // Fire what a tour's release would fire.
  d.release = (tour) => {
    // Only this tour's callbacks — the others stay parked, which is the whole
    // point of the three-press case below.
    for (let i = parked.length - 1; i >= 0; i--) {
      if (parked[i][0] === tour) parked.splice(i, 1)[0][1]();
    }
  };
  return d;
}

const press = (d, tab, tour) => d._railTabWithTour.call(d, tab, tour);

test("the reported sequence: pressing Files does not land the Task panel", async () => {
  // migrate is done for this account, which is what makes Files show at once
  // and puts the two screens in the order the report gives.
  const d = desk({ offerable: { migrate: false } });

  await press(d, "task", "folder_task");
  assert.deepEqual(d.log, ["end-unless:task", "raise:folder_task"]);
  assert.equal(d.parked.length, 1, "the Task tab is parked on the tour's release");

  d.log.length = 0;
  await press(d, "files", "migrate");
  assert.deepEqual(d.log, ["end-unless:files", "tab:files"], "Files shows at once");

  // The task tour, ended by that press, now releases.
  d.release("folder_task");
  assert.deepEqual(d.log, ["end-unless:files", "tab:files"],
    "the parked Task tab must not fire — the user pressed Files");
});

test("and one press on its own still switches when its tour ends", async () => {
  // The guard must not swallow the ordinary case, which is the whole feature:
  // the tour is seen first, then the tab it teaches.
  const d = desk();
  await press(d, "task", "folder_task");
  d.release("folder_task");
  assert.deepEqual(d.log, ["end-unless:task", "raise:folder_task", "tab:task"]);
});

test("a press with no tour to raise shows its tab immediately", async () => {
  const d = desk({ offerable: { migrate: false } });
  await press(d, "files", "migrate");
  assert.deepEqual(d.log, ["end-unless:files", "tab:files"]);
  assert.equal(d.parked.length, 0, "nothing to park");
});

test("a tour that is refused shows its tab immediately too", async () => {
  // Offerable, but single-flight or a failed chunk means it never rose.
  const d = desk({ raises: { folder_task: false } });
  await press(d, "task", "folder_task");
  assert.deepEqual(d.log, ["end-unless:task", "raise:folder_task", "tab:task"]);
});

test("three presses: only the last one's tab survives", async () => {
  const d = desk();
  await press(d, "task", "folder_task");
  await press(d, "chat", "chat");
  await press(d, "meet", "meeting");
  d.log.length = 0;
  // Every earlier tour releases, in any order.
  for (const t of ["folder_task", "chat"]) d.release(t);
  assert.deepEqual(d.log, [], "neither superseded tab may fire");
  d.release("meeting");
  assert.deepEqual(d.log, ["tab:meet"], "the press the user last made wins");
});

test("the count is bumped before the tour that would fire the callback is ended", () => {
  // Order, not presence: _endWindowTourUnlessAbout is what starts the release
  // that runs the parked callback, so counting after it would be too late.
  const body = method("_railTabWithTour").source;
  assert.ok(
    body.indexOf("this._navigated();") < body.indexOf("_endWindowTourUnlessAbout"),
    "count first, then end the tour",
  );
});

// ── the pane must not flash between two tours ───────────────────────────────

test("a tour being replaced by another tour does not fade out", () => {
  // REPORTED: switching between rail items showed the folder pane before the
  // next tutorial. softDestroy fades for half a second, and the next tour
  // cannot even be CLAIMED until that fade's destroy releases single-flight —
  // so the sequence was: tour dissolves, pane revealed, next tour lands on it.
  //
  // Order matters as much as the flag: `offerable` has to be asked BEFORE the
  // outgoing tour is ended, or there is nothing to decide the swap on.
  const body = method("_railTabWithTour").source;
  const gate = body.indexOf("offerable(tour, this)");
  const end = body.indexOf("_endWindowTourUnlessAbout(");
  assert.ok(gate > 0 && end > 0, "expected both");
  assert.ok(gate < end, "ask whether a replacement is coming, then end the tour");
  assert.match(body, /_endWindowTourUnlessAbout\(tab, \{ immediate: offerable \}\)/);
});

test("every other exit keeps the fade", () => {
  // The fade is right when the window is being uncovered on purpose: Escape,
  // a section screen, a workspace switch, completion. Only a swap skips it.
  const end = method("_endWindowTour", ["_"])(require("lodash"));
  const calls = [];
  const tour = () => ({
    isDestroyed: () => false,
    softDestroy: () => calls.push("soft"),
    destroy: () => calls.push("hard"),
  });

  const host = { warn: () => {} };
  host._windowTour = tour();
  end.call(host);
  assert.deepEqual(calls, ["soft"], "the default is still a fade");

  calls.length = 0;
  host._windowTour = tour();
  end.call(host, { immediate: true });
  assert.deepEqual(calls, ["hard"], "a swap destroys at once");

  // And it still reports what it did, and clears its reference either way.
  host._windowTour = tour();
  assert.equal(end.call(host, { immediate: true }), true);
  assert.equal(host._windowTour, null);
  assert.equal(end.call(host), false, "nothing left to end");
});

test("the rail press's chunks are warmed at boot, and only when owed", () => {
  // The other half of the report: window_tutorial and tutorial_spotlight are
  // lazy seeds, so the FIRST press that raises a tour paid a fetch for each
  // while the previous pane sat on screen.
  const src = readFileSync(
    join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");
  const body = method("_warmWindowTourKinds").source;
  assert.match(body, /Kind\.waitFor/);
  for (const kind of ["window_tutorial", "tutorial_spotlight"]) {
    assert.ok(body.includes(`"${kind}"`), `${kind} is not warmed`);
  }
  // Gated, or every session fetches two chunks it will never use.
  assert.match(body, /offerable\(t, this\)/);
  // Fire and forget — a warm-up that throws must not break the boot.
  assert.match(body, /\.catch\(/);
  // Wired into the boot, beside the boot tour.
  assert.match(src, /this\._maybeRunBootTour\(\);\n[\s\S]{0,300}this\._warmWindowTourKinds\(\);/);
});

// ── and the desk-hosted tour, coming out of the wizard ──────────────────────

test("the post-onboarding tour warms its step and its spotlight, not just its shell", () => {
  // REPORTED: the workspace tutorial took a moment to appear after onboarding.
  // `desk_tutorial` was already warmed during the wizard — but the shell is
  // not what the user waits for. It mounts and THEN feeds two more gated
  // kinds: its spotlight, and step 1, which is `tutorial_workspace` and its
  // own 44K chunk. The host's _preloadSteps cannot cover step 1 (it warms
  // slice(1), and the workspace tour has exactly one step), so that fetch
  // happened with the tour's shell already on screen around a hole.
  //
  // RUN, not matched: what matters is that the step kind is DERIVED from the
  // registry, so a tour that gains a step is warmed without anyone editing
  // this method.
  const warm = method("_warmDeskTourKinds", ["Kind", "_", "require"]);
  const asked = [];
  const registry = require(join(__dirname, "..",
    "src/drumee/modules/desk/tutorial/tours.js"));
  const fn = warm(
    { waitFor: (k) => { asked.push(k); return Promise.resolve(); } },
    require("lodash"),
    (id) => {
      assert.equal(id, "desk/tutorial/tours", `unexpected require(${id})`);
      return registry;
    },
  );
  fn.call({ warn: () => {} }, "workspace");

  assert.ok(asked.includes("desk_tutorial"), "the shell");
  assert.ok(asked.includes("tutorial_spotlight"), "the spotlight it feeds");
  // The step, as the registry states it — not as this test restates it.
  const steps = registry.tour("workspace").steps.map((s) => s.kind);
  assert.ok(steps.length > 0, "the workspace tour has no steps?");
  for (const kind of steps) {
    assert.ok(asked.includes(kind), `step kind ${kind} was not warmed`);
  }
  assert.equal(new Set(asked).size, asked.length, "nothing warmed twice");
});

test("a missing registry does not stop the shell being warmed", () => {
  // A prefetch must never be load-bearing.
  const warm = method("_warmDeskTourKinds", ["Kind", "_", "require"]);
  const asked = [];
  const fn = warm(
    { waitFor: (k) => { asked.push(k); return Promise.resolve(); } },
    require("lodash"),
    () => { throw new Error("no registry"); },
  );
  const warns = [];
  fn.call({ warn: (m) => warns.push(m) }, "workspace");
  assert.deepEqual(asked, ["desk_tutorial", "tutorial_spotlight"]);
  assert.equal(warns.length, 1, "and it says so");
});

test("the wizard is what warms them", () => {
  // While onboarding is on screen, which is several screens long — so by the
  // time the tour is raised Kind.get() answers synchronously.
  const src = readFileSync(join(__dirname, "..",
    "src/drumee/modules/desk/index.js"), "utf8");
  const body = method("_loadOnboarding").source;
  assert.match(body, /this\._warmDeskTourKinds\("workspace"\)/);
  // Before the wizard is fed, so the fetch overlaps the screens rather than
  // following them. Against `this.feed({`, not `kind: "onboarding"` — that
  // string is also in the loadPlugin call at the top of the method, and
  // indexOf would find that one and prove nothing.
  assert.ok(
    body.indexOf("_warmDeskTourKinds") < body.indexOf("this.feed({"),
    "warm first, then render the wizard",
  );
  // And the handover itself still has no delay of its own.
  assert.match(src, /const delay = postOnboarding \? 0 : 2000;/);
});

// ── the real topbar, during a desk-hosted tour ──────────────────────────────

test("a desk tour leaves the bar its strip and lets its menus open over it", () => {
  // REPORTED: the workspace switcher and the account menu had to be reachable
  // during the desk workspace tour.
  //
  // WHY THEY WERE NOT: that tour draws its own rail and canvas but NO topbar —
  // the mock one was removed as scenery — and its canvas is `inset: 0` of the
  // desk's overlay, which an open Wrapper lifts to 50000 (utils.scss, from
  // --z-index-context). The bar sits at 10003. So the tour covered the bar and
  // both menus, which hang DOWN off it into exactly that area.
  //
  // Measured against the real cascade in tests/harness/desk-tour-topbar.js —
  // without the stamp, elementFromPoint returns the tour at all three points.
  // This pins the two rules that harness proves.
  const sass = (e) => execFileSync("sass",
    ["-I", ".", "-I", "skin", "--no-source-map", e],
    { cwd: join(__dirname, "..", "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });
  const css = sass("modules/desk/skin/index.scss");
  const i = css.indexOf('.desk-module[data-desk-tour="1"]');
  assert.ok(i > 0, "no block for a desk-hosted tour");
  const block = css.slice(i, i + 1200);

  // The tour takes the body's area, so the bar keeps the 46px it occupies —
  // its own fixed height, not a guess.
  assert.match(block, /top: 46px/);
  assert.match(block, /height: auto/, "or it hangs 46px past the bottom");
  assert.match(block, /bottom: 0/);
  // 100002 for the same reason the in-window block uses it: it has to clear a
  // 50000 stacking context, not the overlay's declared 10010.
  assert.match(block, /z-index: 100002/);
  // Not on mobile, where the desktop bar is display:none.
  // Quotes optional — sass strips them from simple attribute values.
  assert.match(block, /:not\(\[data-device="?mobile"?\]\)/);

  // And the tour must keep its own clicks once the overlay stands down.
  const tourCss = sass("modules/desk/tutorial/skin/index.scss");
  assert.match(tourCss, /\.tutorial-main__ui \{[^}]*pointer-events: auto/);

  // The stamp is raised and cleared by the desk.
  const desk = readFileSync(join(__dirname, "..",
    "src/drumee/modules/desk/index.js"), "utf8");
  assert.match(desk, /dataset\.deskTour = "1"/);
  assert.match(desk, /delete this\.el\.dataset\.deskTour/);
});
