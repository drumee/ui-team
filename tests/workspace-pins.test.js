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

// _pinOp against a stub desk: `server` plays drumate.pinned_workspaces.
function pinDesk({ fail = false, service = "drumate.pinned_workspaces", server } = {}) {
  const posted = [];
  const alerts = [];
  const refreshed = [];
  const fn = load("_pinOp(op, key, before = null)", {
    SERVICE: { drumate: { update_settings: "drumate.update_settings", pinned_workspaces: service } },
    Visitor: { id: "U1" },
    LOCALE: { PIN_WORKSPACE_FAILED: "failed" },
    window: { Wm: { alert: (m) => alerts.push(m) } },
  });
  const self = {
    local: ["hub:1"],
    _pinnedKeys() { return this.local; },
    _setLocalPins(k) { this.local = k; },
    _refreshPins() { refreshed.push(1); },
    postService: (o) => {
      posted.push(o);
      if (fail) return Promise.reject(new Error("x"));
      return Promise.resolve(server ? server(o) : {});
    },
  };
  self.op = (...a) => fn.apply(self, a);
  return { self, posted, alerts, refreshed };
}

test("_pinOp: sends ONE operation, redraws at once, adopts the server's list", async () => {
  // The server holds a pin made on another device ("hub:9") that this tab has
  // never seen; its answer must win over the tab's own guess.
  const { self, posted } = pinDesk({ server: () => ({ pinned_workspaces: ["hub:2", "hub:9", "hub:1"] }) });
  const p = self.op("pin", "hub:2");
  assert.deepEqual(self.local, ["hub:2", "hub:1"], "optimistic, before the answer");
  assert.equal(await p, true);
  assert.deepEqual(posted[0], {
    service: "drumate.pinned_workspaces", op: "pin", key: "hub:2", before: "", hub_id: "U1",
  });
  assert.deepEqual(self.local, ["hub:2", "hub:9", "hub:1"]);
});

test("_pinOp: move carries `before`; a no-op sends nothing", async () => {
  const { self, posted } = pinDesk({ server: () => ({}) });
  self.local = ["hub:1", "hub:2"];
  await self.op("move", "hub:2", "hub:1");
  assert.equal(posted[0].before, "hub:1");
  assert.deepEqual(self.local, ["hub:2", "hub:1"]);
  const n = posted.length;
  assert.equal(await self.op("unpin", "hub:gone"), true);
  assert.equal(posted.length, n);
});

test("_pinOp: only the LAST queued answer is adopted", async () => {
  const answers = [["hub:2", "hub:1"], ["hub:3", "hub:2", "hub:1"]];
  const { self } = pinDesk({ server: () => ({ pinned_workspaces: answers.shift() }) });
  const a = self.op("pin", "hub:2");
  const b = self.op("pin", "hub:3");
  await a;
  // The first answer predates "hub:3": adopting it would flicker the pin away.
  assert.deepEqual(self.local, ["hub:3", "hub:2", "hub:1"]);
  await b;
  assert.deepEqual(self.local, ["hub:3", "hub:2", "hub:1"]);
});

test("_pinOp: failure alerts and re-reads the server's list", async () => {
  const { self, alerts, refreshed } = pinDesk({ fail: true });
  assert.equal(await self.op("pin", "hub:2"), false);
  assert.deepEqual(alerts, ["failed"]);
  assert.equal(refreshed.length, 1);
});

test("_pinOp: a server without the op service falls back to update_settings", async () => {
  const { self, posted } = pinDesk({ service: null });
  await self.op("pin", "hub:2");
  assert.deepEqual(posted[0], {
    service: "drumate.update_settings",
    settings: { pinned_workspaces: ["hub:2", "hub:1"] },
    hub_id: "U1",
  });
});

test("_onPinsPushed: adopts another device's list, defers while this tab is writing", () => {
  const fn = load("_onPinsPushed(data)");
  const self = {
    local: ["hub:1"],
    _pinnedKeys() { return this.local; },
    _setLocalPins(k) { this.local = k; },
  };
  fn.call(self, { pinned_workspaces: ["hub:5", "hub:1", "junk"] });
  assert.deepEqual(self.local, ["hub:5", "hub:1"]);
  fn.call(self, {});
  assert.deepEqual(self.local, ["hub:5", "hub:1"], "malformed push ignored");
  self._pinInFlight = 1;
  fn.call(self, { pinned_workspaces: ["hub:7"] });
  assert.deepEqual(self.local, ["hub:5", "hub:1"]);
  assert.equal(self._pinsStale, 1, "re-read once the write lands");
});

test("push is routed from Wm to the desk", () => {
  const PUSH = fs.readFileSync(path.join(__dirname, "../src/drumee/modules/desk/wm/push.js"), "utf8");
  assert.match(PUSH, /case "drumate\.pinned_workspaces":\s*\n\s*if \(typeof Desk !== "undefined" && Desk && _\.isFunction\(Desk\._onPinsPushed\)\) \{\s*\n\s*Desk\._onPinsPushed\(data\);/);
});

test("landing: the first pinned workspace, else the first row", () => {
  assert.match(
    SRC,
    /const first = rows && \(\s*workspacePins\.firstPinned\(rows, this\._pinnedKeys\(\), \(r\) => this\._workspaceKey\(r\)\)\s*\|\| rows\[0\]\s*\);/,
  );
});
