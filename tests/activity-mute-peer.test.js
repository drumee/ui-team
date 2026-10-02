// activity-mute-peer.test.js — per-person DM popup mute in the client cache.
//   node --test tests/activity-mute-peer.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
global.SERVICE = { activity: { mute_set: "activity.mute_set", mute_peer_set: "activity.mute_peer_set", mute_state: "activity.mute_state" } };
global.Visitor = { id: "me0000000000000a" };
const M = require("../src/drumee/builtins/panel/activity/mute");

test.beforeEach(() => M.resetMuteState());

test("setPeerMute posts the person on the viewer's own hub and caches peers from the answer", async () => {
  const posted = [];
  const host = { postService: async (svc, p) => (posted.push([svc, p]), { status: "ok", global: 0, hubs: [], peers: ["p1"] }) };
  const r = await M.setPeerMute(host, "p1", true);
  assert.equal(r.ok, true);
  assert.deepEqual(posted[0], ["activity.mute_peer_set", { hub_id: "me0000000000000a", peer_id: "p1", muted: 1 }]);
  assert.equal(M.isPeerMuted("p1"), true);
  assert.equal(M.isPeerMuted("p2"), false);
});

test("a failed write changes nothing", async () => {
  const host = { postService: async () => ({ status: "error", peers: ["p1"] }) };
  assert.equal((await M.setPeerMute(host, "p1", true)).ok, false);
  assert.equal(M.isPeerMuted("p1"), false);
});

test("a DM popup from a muted person is muted; a muted person still toasts in a workspace", () => {
  M.applyMuteState({ global: 0, hubs: [], peers: ["p1"] });
  assert.equal(M.isPopupMuted({ author_id: "p1" }), true);
  assert.equal(M.isPopupMuted({ author_id: "p2" }), false);
  assert.equal(M.isPopupMuted({ author_id: "p1", hub_id: "h1" }), false);
});

test("global mute covers every person; an old server answer (no peers) mutes nobody", () => {
  M.applyMuteState({ global: 1, hubs: [] });
  assert.equal(M.isPeerMuted("anyone"), true);
  M.applyMuteState({ global: 0, hubs: [] });
  assert.equal(M.isPopupMuted({ author_id: "p1" }), false);
});

test("no service (old server) → setPeerMute is a no-op, not a false confirmation", async () => {
  const saved = SERVICE.activity.mute_peer_set;
  delete SERVICE.activity.mute_peer_set;
  const r = await M.setPeerMute({ postService: async () => ({ status: "ok" }) }, "p1", true);
  SERVICE.activity.mute_peer_set = saved;
  assert.equal(r.ok, false);
});
