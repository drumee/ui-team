// Leaving a workspace while a tour is drawn on it.
//
// The switcher (desk-module-topbar__ws-list) is reachable from UNDER a running
// in-window tour: the tour covers the work area at z 50000 and the topbar was
// lifted clear of that overlay, so the rows can be pressed. What used to happen
// then is that the workspace really did change and the tour stayed painted over
// the pane of the workspace that was gone.
//
// Two halves are worth pinning, and they pull in opposite directions:
//   - the tour comes DOWN, on a real switch and only on a real switch;
//   - it is NOT recorded as done, so it is offered again.
// Miss the first and the user is stuck; miss the second and they never see the
// tour again because they once clicked the wrong row.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const DESK = readFileSync(join(ROOT, "src/drumee/modules/desk/index.js"), "utf8");
const HOST = readFileSync(
  join(ROOT, "src/drumee/builtins/window/tutorial/index.js"),
  "utf8",
);
const TOURS = readFileSync(
  join(ROOT, "src/drumee/modules/desk/tutorial/tours.js"),
  "utf8",
);

/**
 * Lift one method out of the desk module so it can be RUN rather than matched.
 * The desk cannot be required here (webpack aliases, a live DOM, Wm), but the
 * method under test touches only its own `this` and `window`, so it survives
 * being taken out on its own.
 */
function method(name) {
  const at = DESK.indexOf(`\n  ${name}(`);
  assert.ok(at > 0, `${name} is missing`);
  let i = DESK.indexOf("{", at);
  let depth = 0;
  for (let j = i; j < DESK.length; j++) {
    if (DESK[j] === "{") depth++;
    else if (DESK[j] === "}" && --depth === 0) {
      const src = DESK.slice(at + 3, j + 1);
      return new Function("window", `return function ${src}`);
    }
  }
  throw new Error(`unbalanced ${name}`);
}

/** A host with just the collaborators the method reaches for. */
function host(curKey) {
  return {
    ended: 0,
    _workspaceKey: (row) => (row ? row.key : null),
    _endWindowTour() {
      this.ended++;
      return true;
    },
    _cur: curKey ? { key: curKey } : null,
  };
}

function run(h, wsKey) {
  const fn = method("_endWindowTourOnSwitch");
  return fn({ Wm: { _curWorkspace: h._cur } }).call(h, wsKey);
}

test("another workspace takes the tour down", () => {
  const h = host("hub:7");
  assert.equal(run(h, "hub:9"), true);
  assert.equal(h.ended, 1);
});

test("re-picking the open workspace leaves it up", () => {
  // loadWorkspace is an early return there — the pane the tour is drawn on is
  // the one being asked for, so nothing is being left.
  const h = host("hub:7");
  assert.equal(run(h, "hub:7"), false);
  assert.equal(h.ended, 0);
});

test("a row with no key does nothing", () => {
  const h = host("hub:7");
  assert.equal(run(h, null), false);
  assert.equal(h.ended, 0);
});

test("only a real switch bumps the count the async paths read", () => {
  const h = host("hub:7");
  run(h, "hub:7");
  assert.equal(h._wsSwitch, undefined, "re-picking the open one is not a switch");
  run(h, "hub:9");
  run(h, "hub:9");
  assert.equal(h._wsSwitch, 2);
});

test("the switcher ends the tour before it switches", () => {
  // Order matters: _switchWorkspace calls loadWorkspace, which replaces the
  // window the tour is drawn on.
  const at = DESK.indexOf('case "switch-workspace": {');
  assert.ok(at > 0, "the switcher case is gone");
  const body = DESK.slice(at, DESK.indexOf("\n      }", at));
  const end = body.indexOf("_endWindowTourOnSwitch");
  const go = body.indexOf("_switchWorkspace(");
  assert.ok(end > 0 && go > 0, "both calls must be in the case");
  assert.ok(end < go, "the tour must come down first");
});

test("walking out does not count as finishing", () => {
  // The flag is written in ONE place, and this path does not go near it: it
  // ends the tour through softDestroy (_endWindowTour), which releases the
  // guard and records nothing.
  const src = method("_endWindowTourOnSwitch").toString();
  assert.ok(!/markSeen|_markDone/.test(src), "the switch must not record the tour");
  assert.match(src, /_endWindowTour\(\)/);

  // And mounting must not record it either, or the tour would already be done
  // by the time the user left. Every tour the in-window host draws opts out.
  assert.match(
    HOST,
    /this\._tour\.mark_on !== 'success'/,
    "the host no longer gates its mount-time markSeen",
  );
  const tabs = DESK.slice(
    DESK.indexOf("const WINDOW_TOUR_TAB"),
    DESK.indexOf("}", DESK.indexOf("const WINDOW_TOUR_TAB")),
  );
  const ids = [...tabs.matchAll(/(\w+):\s*"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 5, `expected the window tours, found ${ids}`);
  for (const id of ids) {
    const at = TOURS.indexOf(`${id}: {`);
    assert.ok(at > 0, `${id} is not a tour`);
    // Brace-matched rather than a fixed slice: these declarations carry long
    // comments and the flag sits below them.
    let depth = 0;
    let end = at;
    for (let j = TOURS.indexOf("{", at); j < TOURS.length; j++) {
      if (TOURS[j] === "{") depth++;
      else if (TOURS[j] === "}" && --depth === 0) {
        end = j;
        break;
      }
    }
    const decl = TOURS.slice(at, end);
    assert.match(
      decl,
      /mark_on:\s*"success"/,
      `${id} would be recorded on sight, so leaving it would count as doing it`,
    );
  }
});

test("a tour asked for on one workspace never lands on another", () => {
  // _mountWindowTourFor polls up to 3s for a pane, under a curtain the switcher
  // is still reachable through.
  const body = DESK.slice(
    DESK.indexOf("async _mountWindowTourFor("),
    DESK.indexOf("async _raiseRailTour("),
  );
  assert.match(body, /const seq = this\._wsSwitch \|\| 0;/);
  const guard = body.indexOf("!== seq");
  const mount = body.indexOf("mountWindowTutorial(");
  assert.ok(guard > 0 && guard < mount, "the count must be checked before mounting");
  assert.match(body.slice(guard, mount), /Tours\.release\(tour\)/, "and release");
});

test("the deferred tab dies with the workspace it belonged to", () => {
  // _railTabWithTour defers _railTab to the tour's release — which a switch
  // also produces. Running it then would flip the workspace the user has just
  // arrived in to the tab of the tour they walked out of.
  const body = DESK.slice(
    DESK.indexOf("async _railTabWithTour("),
    DESK.indexOf("async _railAccess(") > 0
      ? DESK.indexOf("async _railAccess(")
      : DESK.length,
  );
  assert.match(body, /const seq = this\._wsSwitch \|\| 0;/);
  assert.match(body, /if \(\(this\._wsSwitch \|\| 0\) === seq\) this\._railTab\(tab\);/);
  // Read after the open this method does itself, or its own workspace would
  // read as the user leaving.
  assert.ok(
    body.indexOf("_openDefaultWorkspace()") < body.indexOf("const seq ="),
    "the count must be read after this method's own open",
  );
});
