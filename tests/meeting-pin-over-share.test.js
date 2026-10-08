// tests/meeting-pin-over-share.test.js — while a screen is shared, the pinned
// participant REPLACES it on the stage and the screen takes the strip's first
// slot. (With no share, the pin is _layoutPinStage's grid — not tested here.)
//
// Runs the REAL window_meeting methods against a stub `this` (the file only
// loads under webpack).
//
//   node --test tests/meeting-pin-over-share.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");
const pinStage = require("../src/drumee/builtins/webrtc/pin-stage");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/meeting/index.js"),
  "utf8",
);
const PARKING = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/webrtc/call-parking.js"),
  "utf8",
);
const SHARE = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/webrtc/screenshare.js"),
  "utf8",
);

const method = (sig, deps = {}) =>
  new Function(...Object.keys(deps), `return ${sliceFunction(SRC, sig)}`)(
    ...Object.values(deps),
  );

global.Visitor = { id: "me" };

const el = (dataset = {}) => ({ dataset: { ...dataset }, style: {} });

function syncStub({ docked = true, parked = false, tile = el(), presenter = {} } = {}) {
  const calls = [];
  const deps = {
    pinStageWanted: pinStage.pinStageWanted,
    enterPinStage: (p) => calls.push(["enter", p.tile]),
    leavePinStage: (p) => calls.push(["leave", p.tile]),
  };
  const self = {
    calls,
    el: el(parked ? { callTile: "1" } : {}),
    _pinOverShareTile: null,
    _floatDocked: () => docked,
    _pinOverShareParts: () => ({ stage: {}, strip: {}, home: {}, presenter, tile, doc: {} }),
    _bindPinOverShareClick() { calls.push(["bind"]); },
    _unbindPinOverShareClick() { calls.push(["unbind"]); },
  };
  return { self, deps, tile };
}

test("docked with a pin: the pinned tile takes the stage and the screen slot un-pins", () => {
  const { self, deps, tile } = syncStub();
  const sync = method("_syncPinOverShare()", deps);
  assert.equal(sync.call(self), true);
  assert.deepEqual(self.calls, [["enter", tile], ["bind"]]);
  assert.equal(self.el.dataset.pinOverShare, "1");
  assert.equal(self._pinOverShareTile, tile);
  // Out of the strip: what the strip planner wrote on it is dropped.
  assert.equal(tile.style.order, "");
  assert.equal(tile.dataset.focused, "0");
});

test("no share (not docked): nothing moves, the flag reads 0", () => {
  const { self, deps } = syncStub({ docked: false });
  const sync = method("_syncPinOverShare()", deps);
  assert.equal(sync.call(self), false);
  assert.deepEqual(self.calls, [["unbind"]]);
  assert.equal(self.el.dataset.pinOverShare, "0");
});

test("parked: the tile goes home so the corner thumbnail keeps the strip", () => {
  const { self, deps } = syncStub({ parked: true });
  const prev = el();
  self._pinOverShareTile = prev;
  const sync = method("_syncPinOverShare()", deps);
  assert.equal(sync.call(self), false);
  assert.deepEqual(self.calls, [["leave", prev], ["unbind"]]);
  assert.equal(self._pinOverShareTile, null);
});

test("pinning someone else sends the previous tile home first", () => {
  const { self, deps, tile } = syncStub();
  const prev = el();
  self._pinOverShareTile = prev;
  method("_syncPinOverShare()", deps).call(self);
  assert.deepEqual(self.calls.slice(0, 2), [["leave", prev], ["enter", tile]]);
});

test("the pinned person left (no live tile): the screen goes back to the stage", () => {
  const { self, deps } = syncStub({ tile: null });
  const prev = el();
  self._pinOverShareTile = prev;
  assert.equal(method("_syncPinOverShare()", deps).call(self), false);
  assert.deepEqual(self.calls[0], ["leave", prev]);
});

test("with the pinned tile on the stage, the strip spotlight falls back to the usual order", () => {
  const focus = method("_updateFloatFocus()");
  const calls = [];
  const self = {
    el: el({ pinOverShare: "1" }),
    _floatDocked: () => true,
    _layoutShareStrip: () => calls.push("layout"),
    _pinnedTileEl: () => el(),
    _applyFloatFocus: () => calls.push("pinned-first"),
    _activeRaisedUid: () => null,
    _currentPresenterUid: null,
    _dominantPid: "p2",
    _focusByPid: (pid) => calls.push(`dominant:${pid}`),
  };
  focus.call(self);
  assert.deepEqual(calls, ["layout", "dominant:p2"]);
});

test("pinned but NOT on the stage (e.g. parked): still the strip's first slot", () => {
  const focus = method("_updateFloatFocus()");
  const calls = [];
  const self = {
    el: el({ pinOverShare: "0" }),
    _floatDocked: () => true,
    _layoutShareStrip: () => calls.push("layout"),
    _pinnedTileEl: () => el(),
    _applyFloatFocus: () => calls.push("pinned-first"),
  };
  focus.call(self);
  assert.deepEqual(calls, ["layout", "pinned-first"]);
});

test("the strip hands one slot to the screen while the pinned tile is on stage", () => {
  const slotsSeen = [];
  const layout = method("_layoutShareStrip()", {
    planShareStrip: (tiles, slots) => {
      slotsSeen.push(slots);
      return { rank: tiles.map((_, i) => i), visible: tiles.map(() => true), more: 0 };
    },
    SLOTS: 4,
  });
  const mgr = { dataset: {} };
  const mk = (onStage) => ({
    el: el(),
    __participants: { isDestroyed: () => false, el: mgr },
    _syncPinOverShare: () => onStage,
    _floatDocked: () => true,
    _chatPanelEl: () => null,
    _stripTiles: () => [],
    _watchShareStrip() {},
    _clearShareStrip() {},
  });
  layout.call(mk(true));
  layout.call(mk(false));
  assert.deepEqual(slotsSeen, [3, 4]);
});

test("the share ending swaps back BEFORE the pin grid re-checks the tile", () => {
  // _layoutPinStage drops a pin whose tile is not in the manager; the swap-back
  // runs in _clearFloatFocus -> _clearShareStrip, which must come first.
  const undock = SHARE.slice(SHARE.indexOf("} else {\n        if (this._clearFloatFocus)"));
  assert.ok(undock.indexOf("_clearFloatFocus") < undock.indexOf("_layoutPinStage"));
  assert.match(SRC, /  _clearShareStrip\(\) \{\n    if \(!this\.el\) return;\n    this\._syncPinOverShare\(\);/);
});

test("parking and returning re-run the strip layout (meeting only)", () => {
  const n = (PARKING.match(/if \(_\.isFunction\(this\._layoutShareStrip\)\) this\._layoutShareStrip\(\);/g) || []).length;
  assert.equal(n, 2);
});
