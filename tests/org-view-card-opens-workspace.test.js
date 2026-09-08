// An org view card opens its workspace the way a switcher row does.
//
// The card already had a click and already opened the pane — it called
// `Wm.loadWorkspace(workspaceTarget(row))` itself, which also closes the screen
// over it, so it LOOKED finished. What it left behind is everything the desk
// does AROUND the open for a switcher row:
//
//   * the rail stayed lit on the tab the PREVIOUS workspace was on
//     (_resetRailToFiles, and only on a real change of workspace),
//   * the switcher's label and its `data-current` mark still named the
//     workspace the user had just left (_setWorkspaceLabel,
//     _renderWorkspaceMenu),
//   * a tour painted on the pane being replaced was never handed over
//     (_endWindowTourOnSwitch / the migrate offer in
//     _switchWorkspaceAndOffer).
//
// So the card now raises the gesture to the desk, which owns all of it, and the
// desk derives the identity with its OWN _workspaceKey rather than teaching a
// second widget to spell that rule.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const DESK = join(ROOT, "src/drumee/modules/desk/index.js");
const ORG = join(ROOT, "src/drumee/modules/desk/org-view/index.js");

// Same lift as tests/crumb-loading.test.js, plus `async`: write the signature
// exactly as the class declares it ("async _foo(bar)") and the rebuilt function
// keeps the keyword. Without that the body's `await` lands inside a plain
// function and the lift throws a SyntaxError rather than failing an assertion,
// which reads like a broken test instead of a missing method.
function lift(file, signature, params = [], args = []) {
  const src = readFileSync(file, "utf8");
  const re = new RegExp(
    `\\n {2}${signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`,
  );
  const m = src.match(re);
  assert.ok(m, `${signature} not found in ${file}`);
  const isAsync = /^async\s/.test(signature);
  const inner = signature.slice(signature.indexOf("("));
  return new Function(
    ...params,
    `return ${isAsync ? "async " : ""}function ${inner} {\n${m[1]}\n};`,
  )(...args);
}

// An org_workspaces row: always filetype 'hub' (the proc selects e.type='hub'),
// with desk.home column names so the desk's own helpers can read it.
const CARD_ROW = {
  hub_id: 4021, id: 4021, home_id: 9, filename: "Engineering",
  area: "private", filetype: "hub", department_id: 3, members: 12,
};

test("the card hands the row to the desk instead of opening it itself", () => {
  const open = lift(ORG, "_openWorkspace(cmd)");
  const raised = [];
  const self = {
    _rows: new Map([["4021", CARD_ROW]]),
    triggerHandlers: (a) => raised.push(a),
  };
  open.call(self, { mget: () => 4021 });
  assert.deepEqual(raised, [{ service: "switch-workspace-row", row: CARD_ROW }]);

  // An unknown card is a no-op, not a raise with no row — the desk would have
  // nothing to resolve.
  raised.length = 0;
  open.call(self, { mget: () => 999 });
  assert.equal(raised.length, 0);
});

test("the org view no longer opens workspaces on its own", () => {
  const src = readFileSync(ORG, "utf8");
  // Only inside the comment that explains what it used to do.
  const code = src.split("\n").filter((l) => !/^\s*(\*|\/\/)/.test(l)).join("\n");
  assert.ok(!/Wm\.loadWorkspace/.test(code), "the screen still calls loadWorkspace");
  assert.ok(!/require\("libs\/workspace-target"\)/.test(code),
    "the target helper is still imported — the desk resolves the target now");
});

test("a workspace the user has goes through the switcher's own path", async () => {
  const lodash = require("lodash");
  const sw = lift(DESK, "async _switchWorkspaceRow(row)", ["_", "window"], [lodash, {}]);
  const calls = [];
  const self = {
    // The real rule, lifted too — so this asserts the card's row and a switcher
    // row resolve to the SAME key, rather than trusting a hand-written string.
    _workspaceKey: lift(DESK, "_workspaceKey(row)", ["_a", "Visitor"],
      [{ folder: "folder", personal: "personal" }, { id: 77 }]),
    // Not the open workspace — these three are about the SWITCH branch. The
    // real helper, against a real _curWorkspace, is exercised in the
    // already-open tests below.
    _leavesWorkspace: () => true,
    _fetchWorkspaces: async () => [
      { hub_id: 4021, id: 4021, filename: "Engineering", filetype: "hub", area: "private" },
      { hub_id: 77, nid: 512, filename: "Notes", filetype: "folder" },
    ],
    _switchWorkspaceAndOffer: (k) => calls.push(["andOffer", k]),
    _workspaceTarget: (r) => ["target", r],
  };

  await sw.call(self, CARD_ROW);
  assert.deepEqual(calls, [["andOffer", "hub:4021"]]);
});

test("a workspace the user is not in still opens, rather than doing nothing", async () => {
  // The org view lists the whole organisation on purpose, including private
  // workspaces the caller is not a member of — yp cannot say which, so the
  // cards cannot be greyed. _switchWorkspaceAndOffer returns in SILENCE for a
  // row absent from the caller's list, which would make those cards dead
  // clicks. They open instead, and the server refuses audibly.
  const lodash = require("lodash");
  const loaded = [];
  const win = { Wm: { loadWorkspace: (t) => loaded.push(t) } };
  const sw = lift(DESK, "async _switchWorkspaceRow(row)", ["_", "window"], [lodash, win]);
  const calls = [];
  const self = {
    _workspaceKey: lift(DESK, "_workspaceKey(row)", ["_a", "Visitor"],
      [{ folder: "folder", personal: "personal" }, { id: 77 }]),
    // Not the open workspace — these three are about the SWITCH branch. The
    // real helper, against a real _curWorkspace, is exercised in the
    // already-open tests below.
    _leavesWorkspace: () => true,
    _fetchWorkspaces: async () => [{ hub_id: 1, id: 1, filetype: "hub" }],
    _switchWorkspaceAndOffer: (k) => calls.push(["andOffer", k]),
    _workspaceTarget: (r) => ({ target: r.hub_id }),
  };

  await sw.call(self, CARD_ROW);
  assert.equal(calls.length, 0, "the switcher path cannot resolve this row");
  assert.deepEqual(loaded, [{ target: 4021 }], "the card click did nothing at all");
});

test("a failed workspace fetch still opens the card", async () => {
  // _fetchWorkspaces is a round trip on a cold cache. If it rejects, the
  // gesture must not be swallowed — the user pressed a workspace.
  const lodash = require("lodash");
  const loaded = [];
  const win = { Wm: { loadWorkspace: (t) => loaded.push(t) } };
  const sw = lift(DESK, "async _switchWorkspaceRow(row)", ["_", "window"], [lodash, win]);
  const self = {
    _workspaceKey: lift(DESK, "_workspaceKey(row)", ["_a", "Visitor"],
      [{ folder: "folder", personal: "personal" }, { id: 77 }]),
    // Not the open workspace — these three are about the SWITCH branch. The
    // real helper, against a real _curWorkspace, is exercised in the
    // already-open tests below.
    _leavesWorkspace: () => true,
    _fetchWorkspaces: async () => { throw new Error("offline"); },
    _switchWorkspaceAndOffer: () => assert.fail("nothing to resolve against"),
    _workspaceTarget: (r) => ({ target: r.hub_id }),
  };

  await sw.call(self, CARD_ROW);
  assert.deepEqual(loaded, [{ target: 4021 }]);
});

test("no row, no open", async () => {
  const lodash = require("lodash");
  const win = { Wm: { loadWorkspace: () => assert.fail("opened nothing") } };
  const sw = lift(DESK, "async _switchWorkspaceRow(row)", ["_", "window"], [lodash, win]);
  await sw.call({}, null);
});

test("the desk routes the card's service, and the switcher's is untouched", () => {
  const src = readFileSync(DESK, "utf8");
  assert.match(src, /case "switch-workspace-row":\n\s*return this\._switchWorkspaceRow\(args\.row\)/);
  // The row rides in `args`, which is what triggerHandlers passes — reading it
  // off `cmd` would find nothing, since the raiser is the screen, not the card.
  assert.ok(!/case "switch-workspace-row":[\s\S]{0,120}cmd\.mget/.test(src),
    "the row must come from args, not from the raising view");
  // The switcher row still goes straight to the key-taking entry.
  assert.match(src, /case "switch-workspace":[\s\S]{0,400}_switchWorkspaceAndOffer\(cmd\.mget\("wsKey"\)\)/);
});

// ── Re-picking the workspace that is already open ───────────────────────────
//
// Two cards, workspace 1 already open (the boot logic landed there). Clicking
// card 1 did nothing at all: the org screen stayed up, and with the address
// chip and the rail both hidden by it the desk looked stuck.
//
// It is not the card that is wrong, it is where the cleanup lives.
// Wm.loadWorkspace early-returns for the workspace it is already on (same
// hub_id + nid, wm/index.js:852) and that return sits ABOVE its panel cleanup
// (Desk.closeAllPanels / _closeMainPanels, ~line 890) — deliberately, with the
// reason written there: "Only close when actually opening a NEW workspace (not
// when raising an existing tab) — otherwise switching tabs would close shared
// panels."
//
// That reasoning is right for the sidebar and the switcher, where the open
// panel is unrelated to the gesture. From a CARD it is inverted: the panel IS
// the screen the click came from, and the click means "take me to that
// workspace". So this gesture makes the exit itself, through the desk's own
// _leaveSectionScreen — the same call the rail uses (_railTab) — which closes
// the three main slots AND rebuilds the workspace path, the second half being
// what brings the hidden address chip back.
//
// loadWorkspace is still called on this branch: its early return raises a pane
// that a popup folder window is covering, which is the other half of "open it".

const CUR = { hub_id: 4021, nid: 9, area: "private" };

function rowStub(over = {}) {
  const log = [];
  const win = { Wm: { _curWorkspace: CUR, loadWorkspace: (t) => log.push(["load", t.hub_id]) } };
  const sw = lift(DESK, "async _switchWorkspaceRow(row)", ["_", "window"], [lodashMod, win]);
  const self = {
    _workspaceKey: lift(DESK, "_workspaceKey(row)", ["_a", "Visitor"],
      [{ folder: "folder", personal: "personal" }, { id: 77 }]),
    _leavesWorkspace: lift(DESK, "_leavesWorkspace(wsKey)", ["_", "window"], [lodashMod, win]),
    _railWorkspace: () => ({ pane: 1 }),
    _leaveSectionScreen: (w) => log.push(["leave", w && w.pane]),
    // BOTH cards' workspaces are the caller's own, which is the case in the
    // report: two cards, one of them already open.
    _fetchWorkspaces: async () => [
      { hub_id: 4021, id: 4021, filetype: "hub" },
      { hub_id: 5000, id: 5000, filetype: "hub" },
    ],
    _switchWorkspaceAndOffer: (k) => log.push(["andOffer", k]),
    _workspaceTarget: (r) => ({ hub_id: r.hub_id }),
    ...over,
  };
  return { sw, self, log };
}
const lodashMod = require("lodash");

test("the card for the OPEN workspace leaves the screen it was clicked on", async () => {
  const { sw, self, log } = rowStub();
  await sw.call(self, CARD_ROW);

  // Not through the switcher path: there is no switch to make, and
  // _switchWorkspaceAndOffer would end on loadWorkspace's early return with
  // the screen still up.
  assert.ok(!log.some(([k]) => k === "andOffer"), "took the switch path for a non-switch");
  // Raised, then the screen behind it uncovered.
  assert.deepEqual(log, [["load", 4021], ["leave", 1]]);
});

test("a DIFFERENT workspace still goes through the switch, which cleans up itself", async () => {
  // loadWorkspace does close the panels on a real change, so this branch must
  // NOT also call _leaveSectionScreen — that would rebuild the breadcrumb from
  // the OUTGOING pane and pay a get_path round trip for a path about to be
  // replaced.
  const { sw, self, log } = rowStub();
  await sw.call(self, { ...CARD_ROW, hub_id: 5000, id: 5000 });
  assert.deepEqual(log, [["andOffer", "hub:5000"]]);
});

test("a row with no derivable key is not mistaken for the open one", async () => {
  // _leavesWorkspace answers FALSE for a falsy key ("nothing to leave"), which
  // reads identically to "already open" — so the branch has to test the key
  // itself. Without that, an unkeyable row would close the screen and open
  // nothing.
  const { sw, self, log } = rowStub({ _workspaceKey: () => null });
  await sw.call(self, CARD_ROW);
  assert.ok(!log.some(([k]) => k === "leave"), "closed the screen for a row it could not resolve");
  assert.deepEqual(log, [["load", 4021]], "the fallback open did not happen");
});
