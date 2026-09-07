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
