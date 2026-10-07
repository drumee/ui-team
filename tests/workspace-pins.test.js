// tests/workspace-pins.test.js — pinned workspaces (Lexis, 2026-10-07): the
// rules in libs/workspace-pins, and the desk methods that use them.
//
//   node --test tests/workspace-pins.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");
const pins = require("../src/drumee/libs/workspace-pins");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/index.js"),
  "utf8",
);

const keyOf = (r) => r.key;
const R = (key, extra = {}) => ({ key, ...extra });

// ── lib ──────────────────────────────────────────────────────────────────────

test("readPins: only switcher keys, first occurrence wins, junk ignored", () => {
  assert.deepEqual(pins.readPins(null), []);
  assert.deepEqual(pins.readPins({}), []);
  assert.deepEqual(pins.readPins({ pinned_workspaces: "hub:1" }), []);
  assert.deepEqual(
    pins.readPins({
      pinned_workspaces: ["hub:1", "folder:9", "hub:1", 7, null, "x:1", "hub:", "hub:a b", "folder:9"],
    }),
    ["hub:1", "folder:9"],
  );
});

test("pin: newest first; re-pinning moves to the top", () => {
  assert.deepEqual(pins.pin([], "hub:1"), ["hub:1"]);
  assert.deepEqual(pins.pin(["hub:1", "hub:2"], "hub:3"), ["hub:3", "hub:1", "hub:2"]);
  assert.deepEqual(pins.pin(["hub:1", "hub:2"], "hub:2"), ["hub:2", "hub:1"]);
  assert.deepEqual(pins.pin(["hub:1"], null), ["hub:1"]);
});

test("unpin: removes only that key, order kept", () => {
  assert.deepEqual(pins.unpin(["hub:1", "hub:2", "hub:3"], "hub:2"), ["hub:1", "hub:3"]);
  assert.deepEqual(pins.unpin(["hub:1"], "hub:9"), ["hub:1"]);
});

test("move: before a key, to the end, and no-ops", () => {
  const l = ["a", "b", "c", "d"];
  assert.deepEqual(pins.move(l, "d", "a"), ["d", "a", "b", "c"]);
  assert.deepEqual(pins.move(l, "a", "c"), ["b", "a", "c", "d"]);
  assert.deepEqual(pins.move(l, "a", null), ["b", "c", "d", "a"]);
  assert.deepEqual(pins.move(l, "b", "b"), l);
  assert.deepEqual(pins.move(l, "zz", "a"), l);
  assert.deepEqual(pins.move(l, "a", "zz"), l);
  assert.deepEqual(l, ["a", "b", "c", "d"], "input not mutated");
});

test("split: pinned in pin order, rest in their own order, gone pins hidden", () => {
  const rows = [R("hub:1"), R("hub:2"), R("folder:3"), R("hub:4")];
  const { pinned, rest } = pins.split(rows, ["hub:4", "gone:1", "hub:1"], keyOf);
  assert.deepEqual(pinned.map(keyOf), ["hub:4", "hub:1"]);
  assert.deepEqual(rest.map(keyOf), ["hub:2", "folder:3"]);
});

test("prune: drops gone pins, but never against an empty (unloaded) list", () => {
  const rows = [R("hub:1"), R("hub:2")];
  assert.deepEqual(pins.prune(["hub:2", "hub:9", "hub:1"], rows, keyOf), ["hub:2", "hub:1"]);
  assert.deepEqual(pins.prune(["hub:2", "hub:9"], [], keyOf), ["hub:2", "hub:9"]);
  assert.deepEqual(pins.prune(["hub:2", "hub:9"], null, keyOf), ["hub:2", "hub:9"]);
});

test("firstPinned: first pin still listed, else null", () => {
  const rows = [R("hub:1"), R("hub:2")];
  assert.equal(pins.firstPinned(rows, ["gone", "hub:2", "hub:1"], keyOf).key, "hub:2");
  assert.equal(pins.firstPinned(rows, [], keyOf), null);
  assert.equal(pins.firstPinned(rows, ["gone"], keyOf), null);
});

// ── desk ─────────────────────────────────────────────────────────────────────

const _ = {
  isFunction: (f) => typeof f === "function",
  isObject: (o) => o !== null && typeof o === "object",
  isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
};
const _a = { trash: "trash", folder: "folder" };

function load(sig, extra = {}) {
  const deps = { _, _a, workspacePins: pins, window: {}, ...extra };
  return new Function(...Object.keys(deps), `return ${sliceFunction(SRC, sig)}`)(
    ...Object.values(deps),
  );
}

test("_groupWorkspaces: Pinned (n) first, pinned rows leave their type group", () => {
  const fn = load("_groupWorkspaces(rows)", {
    LOCALE: { PINNED: "Pinned" },
    groupWorkspaces: (rows) => [{ label: "Internal", rows }],
  });
  const rows = [R("hub:1"), R("hub:2"), R("hub:3")];
  const self = { _pinnedKeys: () => ["hub:3", "hub:1"], _workspaceKey: keyOf };
  const groups = fn.call(self, rows);
  assert.equal(groups[0].label, "Pinned (2)");
  assert.equal(groups[0].pinned, 1);
  assert.deepEqual(groups[0].rows.map(keyOf), ["hub:3", "hub:1"]);
  assert.deepEqual(groups[1].rows.map(keyOf), ["hub:2"]);
});

test("_groupWorkspaces: no pins → exactly the type groups, unchanged", () => {
  const typeGroups = [{ label: "Internal", rows: [] }];
  const fn = load("_groupWorkspaces(rows)", {
    LOCALE: { PINNED: "Pinned" },
    groupWorkspaces: () => typeGroups,
  });
  const self = { _pinnedKeys: () => [], _workspaceKey: keyOf };
  assert.equal(fn.call(self, [R("hub:1")]), typeGroups);
});

test("_withPinAction: Pin just above the way out, Unpin when pinned", () => {
  const fn = load("_withPinAction(keys)");
  const self = (pinned) => ({
    _currentWorkspaceKey: () => "hub:1",
    _pinnedKeys: () => (pinned ? ["hub:1"] : []),
  });
  // Owner: download, copy, rename | trash
  assert.deepEqual(
    fn.call(self(false), ["download", "makeACopy", "rename", "separator", "trash"]),
    ["download", "makeACopy", "rename", "pinWorkspace", "separator", "trash"],
  );
  assert.deepEqual(
    fn.call(self(true), ["download", "separator", "leaveWorkspace"]),
    ["download", "unpinWorkspace", "separator", "leaveWorkspace"],
  );
  // View member: the way out alone.
  assert.deepEqual(fn.call(self(false), ["leaveWorkspace"]), ["pinWorkspace", "separator", "leaveWorkspace"]);
  // No exit row: appended.
  assert.deepEqual(fn.call(self(false), ["download"]), ["download", "pinWorkspace"]);
});

test("_withPinAction: empty stays empty (the ⋯ refetch signal), no workspace → unchanged", () => {
  const fn = load("_withPinAction(keys)");
  const self = { _currentWorkspaceKey: () => "hub:1", _pinnedKeys: () => [] };
  assert.deepEqual(fn.call(self, []), []);
  const keys = ["download", "separator", "trash"];
  assert.equal(fn.call({ ...self, _currentWorkspaceKey: () => null }, keys), keys);
});

test("_savePins: posts ONLY pinned_workspaces, prunes, rolls back on failure", async () => {
  const posted = [];
  const alerts = [];
  let fail = false;
  const fn = load("_savePins(next)", {
    SERVICE: { drumate: { update_settings: "drumate.update_settings" } },
    Visitor: { id: "U1" },
    LOCALE: { PIN_WORKSPACE_FAILED: "failed" },
    window: { Wm: { alert: (m) => alerts.push(m) } },
  });
  let local = ["hub:1"];
  const self = {
    _workspaces: [R("hub:1"), R("hub:2")],
    _workspaceKey: keyOf,
    _pinnedKeys: () => local,
    _setLocalPins: (k) => { local = k; },
    postService: (o) => (posted.push(o), fail ? Promise.reject(new Error("x")) : Promise.resolve({})),
  };
  assert.equal(await fn.call(self, ["hub:2", "hub:gone", "hub:1"]), true);
  assert.deepEqual(local, ["hub:2", "hub:1"]);
  assert.deepEqual(posted[0].settings, { pinned_workspaces: ["hub:2", "hub:1"] });
  assert.equal(posted[0].hub_id, "U1");

  fail = true;
  assert.equal(await fn.call(self, ["hub:1"]), false);
  assert.deepEqual(local, ["hub:2", "hub:1"], "rolled back");
  assert.deepEqual(alerts, ["failed"]);

  // Unchanged list: no request at all.
  const n = posted.length;
  assert.equal(await fn.call(self, ["hub:2", "hub:1"]), true);
  assert.equal(posted.length, n);
});

test("landing: the first pinned workspace, else the first row", () => {
  assert.match(
    SRC,
    /const first = rows && \(\s*workspacePins\.firstPinned\(rows, this\._pinnedKeys\(\), \(r\) => this\._workspaceKey\(r\)\)\s*\|\| rows\[0\]\s*\);/,
  );
});
