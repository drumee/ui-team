// Switching workspace while a tour is up, and what happens on arrival.
//
// The switcher (desk-module-topbar__ws-list) is reachable from UNDER a running
// in-window tour: the tour covers the work area at z 50000 and the topbar was
// lifted clear of that overlay, so the rows can be pressed. What used to happen
// then is that the workspace really did change and the tour stayed painted over
// the pane of the workspace that was gone.
//
// Three things are worth pinning, and the first two pull in opposite directions:
//   - the tour comes DOWN, on a real switch and only on a real switch;
//   - it is NOT recorded as done, so it is offered again;
//   - the workspace it lands in offers the migrate tour, because a switch
//     always arrives on Files and Files is what that tour is about.
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
 * The desk cannot be required here (webpack aliases, a live DOM, Wm), but these
 * methods touch only their own `this`, `window` and `require`, so they survive
 * being taken out on their own.
 */
function source(name) {
  const plain = DESK.indexOf(`\n  ${name}(`);
  const asyn = DESK.indexOf(`\n  async ${name}(`);
  const from = plain > 0 ? plain : asyn;
  assert.ok(from > 0, `${name} is missing`);
  let depth = 0;
  for (let j = DESK.indexOf("{", from); j < DESK.length; j++) {
    if (DESK[j] === "{") depth++;
    else if (DESK[j] === "}" && --depth === 0) {
      return { src: DESK.slice(from + 3, j + 1), async: plain < 0 };
    }
  }
  throw new Error(`unbalanced ${name}`);
}

function method(name) {
  const { src, async } = source(name);
  const decl = async ? `async function ${src.replace(/^async /, "")}` : `function ${src}`;
  // new Function only PARSES — free identifiers are resolved at call time — so
  // a method that reaches for the module's own imports still lifts cleanly.
  return new Function("window", "require", `return ${decl}`);
}

/**
 * A desk with just the collaborators these methods reach for, and a log of
 * what they did to it.
 */
function desk(curKey, opt = {}) {
  const win = { Wm: { _curWorkspace: curKey ? { key: curKey } : null } };
  const Tours = {
    offerable: () => opt.offerable !== false,
    whenDone: (tour, cb) => log.push(`whenDone:${tour}`) && cb(),
  };
  const log = [];
  const d = {
    log,
    win,
    isDestroyed: () => false,
    _workspaceKey: (row) => (row ? row.key : null),
    _endWindowTour() {
      log.push("end");
      return true;
    },
    _showTourCurtain: () => log.push("curtain:up"),
    _hideTourCurtain: () => log.push("curtain:down"),
    _raiseRailTour: async (tour) => {
      log.push(`raise:${tour}`);
      return opt.raises !== false;
    },
    async _switchWorkspace(wsKey) {
      log.push(`switch:${wsKey}`);
      // loadWorkspace overwrites _curWorkspace on its way in — unless the row
      // is gone from the list, where it declines and nothing moves.
      if (!opt.rowGone) win.Wm._curWorkspace = { key: wsKey };
    },
  };
  const req = () => Tours;
  d._leavesWorkspace = method("_leavesWorkspace")(win, req);
  d._endWindowTourOnSwitch = method("_endWindowTourOnSwitch")(win, req);
  d._switchWorkspaceAndOffer = method("_switchWorkspaceAndOffer")(win, req);
  return d;
}

const go = (d, wsKey) => d._switchWorkspaceAndOffer.call(d, wsKey);

// ── leaving ─────────────────────────────────────────────────────────────────

test("another workspace takes the tour down, before the switch", async () => {
  const d = desk("hub:7");
  await go(d, "hub:9");
  assert.deepEqual(
    d.log.filter((l) => l === "end" || l.startsWith("switch:")),
    ["end", "switch:hub:9"],
    "the pane the tour is drawn on is replaced by the switch",
  );
});

test("re-picking the open workspace leaves it up and offers nothing", async () => {
  // loadWorkspace is an early return there — the pane the tour is drawn on is
  // the one being asked for, so nothing is being left and nothing arrives.
  const d = desk("hub:7");
  await go(d, "hub:7");
  assert.deepEqual(d.log, ["switch:hub:7"]);
});

test("a row with no key does nothing but hand over", async () => {
  const d = desk("hub:7");
  await go(d, null);
  assert.deepEqual(d.log, ["switch:null"]);
});

test("only a real switch bumps the count the async paths read", () => {
  const d = desk("hub:7");
  d._endWindowTourOnSwitch("hub:7");
  assert.equal(d._wsSwitch, undefined, "re-picking the open one is not a switch");
  d._endWindowTourOnSwitch("hub:9");
  d.win.Wm._curWorkspace = { key: "hub:9" };
  d._endWindowTourOnSwitch("hub:3");
  assert.equal(d._wsSwitch, 2);
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
    assert.match(
      TOURS.slice(at, end),
      /mark_on:\s*"success"/,
      `${id} would be recorded on sight, so leaving it would count as doing it`,
    );
  }
});

// ── arriving ────────────────────────────────────────────────────────────────

test("the workspace it lands in offers the migrate tour", async () => {
  const d = desk("hub:7");
  await go(d, "hub:9");
  // The curtain goes up on the CLICK, before the switch, or the user reads
  // window-manager__main while the tour is still several hops away.
  assert.deepEqual(d.log, [
    "end",
    "curtain:up",
    "switch:hub:9",
    "raise:migrate",
    "whenDone:migrate",
    "curtain:down",
  ]);
});

test("a user who has finished it switches with nothing flashing over them", async () => {
  const d = desk("hub:7", { offerable: false });
  await go(d, "hub:9");
  assert.deepEqual(d.log, ["end", "switch:hub:9"]);
});

test("a tour that will not rise takes its curtain with it", async () => {
  // Refused for single-flight, or claimed and never mounted. The curtain must
  // not be what is left holding the screen.
  const d = desk("hub:7", { raises: false });
  await go(d, "hub:9");
  assert.deepEqual(d.log.slice(-2), ["raise:migrate", "curtain:down"]);
});

test("a switch that does not take puts nothing up", async () => {
  // The row can be gone from the list — deleted in another tab, a stale menu —
  // and _switchWorkspace declines silently. A curtain over the pane the user is
  // still standing on would hide the app for a tour with nothing to draw on.
  const d = desk("hub:7", { rowGone: true });
  await go(d, "hub:9");
  assert.deepEqual(d.log, ["end", "curtain:up", "switch:hub:9", "curtain:down"]);
  assert.ok(!d.log.some((l) => l.startsWith("raise:")), "no tour was raised");
});

test("the switcher is the only gesture that offers", async () => {
  // _openCreatedWorkspace goes through _switchWorkspace: the workspace tour
  // creates a workspace, opens it that way, then chains the migrate tour ITSELF
  // with `celebrate` set. Offering from inside _switchWorkspace would race that
  // chain for single-flight and win, and the walkthrough's confetti would
  // vanish on the one arrival it is for.
  const body = source("_switchWorkspace").src;
  assert.ok(
    !/migrate|_raiseRailTour|TourCurtain/.test(body),
    "_switchWorkspace must stay a switch",
  );
  assert.match(
    DESK,
    /case "switch-workspace":[\s\S]{0,400}this\._switchWorkspaceAndOffer\(cmd\.mget\("wsKey"\)\)/,
    "the switcher row must go through the offering path",
  );
  assert.match(
    DESK.slice(DESK.indexOf("async _openCreatedWorkspace(")),
    /^[\s\S]{0,1200}this\._switchWorkspace\(wsKey\)/,
    "and the create path must stay on the bare switch",
  );
});

// ── the two async paths that had already committed to a workspace ───────────

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
