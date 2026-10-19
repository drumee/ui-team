// tests/file-switcher-panel.test.js — the Open-File Switcher panel follows a
// file changed in place (audio next, image slideshow) and lets the player
// veto a switch (unsaved text).
//
//   node --test tests/file-switcher-panel.test.js
//
// The panel only loads under webpack (LetcBox, aliases), so the REAL methods
// are sliced out and run against a stub `this`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/player/widget/file-switcher/index.js"),
  "utf8"
);

global._ = { isFunction: (f) => typeof f === "function" };

function spy(impl = () => {}) {
  const f = (...args) => {
    f.calls.push(args);
    return impl(...args);
  };
  f.calls = [];
  return f;
}

const build = (signature, names = [], values = []) =>
  new Function(...names, `return ${sliceFunction(SRC, signature)}`)(...values);

test("syncCurrent records and redraws", () => {
  const n1 = { nid: 1, hub_id: "h" };
  const n2 = { nid: 2, hub_id: "h" };
  const recent = { remember: spy(), read: () => [n2, n1] };
  const syncCurrent = build("syncCurrent(node)", ["recent"], [recent]);
  const self = { player: {}, renderLists: spy() };
  syncCurrent.call(self, n2);
  assert.deepEqual(recent.remember.calls, [[n2]]);
  assert.deepEqual(self._recent, [n2, n1]);
  assert.equal(self.renderLists.calls.length, 1);
});

// Kept on the player, not the panel: a re-fed skeleton (image restart)
// mounts a new panel that must still know the slide on screen.
test("syncCurrent keeps the current file on the player", () => {
  const n2 = { nid: 2, hub_id: "h" };
  const syncCurrent = build("syncCurrent(node)", ["recent"], [{ remember() {}, read: () => [] }]);
  const self = { player: {}, renderLists() {} };
  syncCurrent.call(self, n2);
  assert.equal(self.player._switcherCurrent, n2);
});

test("node() prefers the in-place current over a stale media model", () => {
  const node = build("node()");
  const self = {
    player: {
      model: { toJSON: () => ({ nid: 1, pid: 9 }) },
      media: { isDestroyed: () => false, model: { toJSON: () => ({ nid: 1 }) } },
      _switcherCurrent: { nid: 2 },
    },
  };
  const n = node.call(self);
  assert.equal(n.nid, 2);
  assert.equal(n.pid, 9);
});

test("Cancel in confirmLeave creates no file", async () => {
  const fakeRequire = () => ({ guardWrite: () => false });
  const createFile = build("async createFile(name)", ["require"], [fakeRequire]);
  const self = {
    player: { confirmLeave: async () => false },
    el: { dataset: {} },
    setCreateMenu() {},
    createService: () => "svc",
    node: () => ({ nid: 1, pid: 9, hub_id: "h" }),
    postService: spy(async () => ({ nid: 3 })),
    switchTo: spy(),
    isDestroyed: () => false,
    warn() {},
  };
  await createFile.call(self, "document.docx");
  assert.equal(self.postService.calls.length, 0);
  assert.equal(self.switchTo.calls.length, 0);
  assert.equal(self.el.dataset.busy, 0);
});

function switchSelf(player) {
  return {
    player,
    el: { dataset: {} },
    node: () => ({ nid: 1, pid: 9, hub_id: "h" }),
    getPart: () => null,
    waitForPlayer: async () => ({}),
    isDestroyed: () => false,
    fetchService: () => {},
    warn: () => {},
  };
}

test("Cancel in confirmLeave aborts the switch", async () => {
  const openMedia = spy(async () => ({}));
  const switchTo = build("async switchTo(nid, hub_id)", ["openMedia", "recent", "handoff"], [openMedia, {}, null]);
  const self = switchSelf({ confirmLeave: async () => false, goodbye: spy(), isDestroyed: () => false });
  await switchTo.call(self, 5, "h");
  assert.equal(openMedia.calls.length, 0);
  assert.equal(self._switching, 0);
  assert.equal(self.el.dataset.busy, 0);
  assert.equal(self.player.goodbye.calls.length, 0);
});

test("no confirmLeave → switch proceeds", async () => {
  const openMedia = spy(async () => ({}));
  const switchTo = build("async switchTo(nid, hub_id)", ["openMedia", "recent", "handoff"], [openMedia, {}, null]);
  const self = switchSelf({ goodbye: spy(), isDestroyed: () => false });
  await switchTo.call(self, 5, "h");
  assert.deepEqual(openMedia.calls[0][0], { nid: 5, hub_id: "h" });
  assert.equal(self.player.goodbye.calls.length, 1);
});
