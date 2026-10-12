// activity-mute-boot.test.js — the mute cache is actually read at boot, and
// the account menu hears about every change.
//   node --test tests/activity-mute-boot.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fired = [];
global.RADIO_BROADCAST = { trigger: (name, payload) => fired.push([name, payload]) };
global.SERVICE = { activity: { mute_set: "activity.mute_set", mute_state: "activity.mute_state" } };
global.Visitor = { id: "me0000000000000a" };
const M = require("../src/drumee/builtins/panel/activity/mute");

test.beforeEach(() => {
  M.resetMuteState();
  fired.length = 0;
});

test("a server answer broadcasts MUTE_CHANGED with the folded state", () => {
  M.applyMuteState({ global: 1, hubs: [] });
  assert.equal(fired.length, 1);
  assert.equal(fired[0][0], M.MUTE_CHANGED);
  assert.equal(fired[0][1].global, 1);
});

test("a junk answer changes nothing and broadcasts nothing", () => {
  M.applyMuteState(undefined);
  assert.equal(fired.length, 0);
  assert.equal(M.muteState().loaded, 0);
});

test("a successful global mute broadcasts, so the menu row can repaint", async () => {
  const host = { postService: async () => ({ status: "ok", global: 1, hubs: [] }) };
  const r = await M.setMute(host, "", true);
  assert.equal(r.ok, true);
  assert.deepEqual(fired.map((f) => f[0]), [M.MUTE_CHANGED]);
});

test("loadMuteState asks the server and fills the cache", async () => {
  const asked = [];
  const host = { fetchService: async (svc, p) => (asked.push(svc), { global: 1, hubs: ["h1"] }) };
  await M.loadMuteState(host);
  assert.deepEqual(asked, ["activity.mute_state"]);
  assert.equal(M.muteState().loaded, 1);
  assert.equal(M.isPopupMuted({ hub_id: "anything" }), true);
});

// ui-core's Box binds this.fetchService only AFTER super() returns, and
// Marionette runs initialize() inside super(). A loadMuteState call from
// initialize therefore saw no fetchService and silently never asked.
test("the panel reads the mute state from onDomRefresh, never from initialize", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../src/drumee/builtins/panel/activity/index.js"),
    "utf8",
  );
  const body = (name) => {
    const at = src.indexOf(`\n  ${name}(`);
    assert.ok(at > 0, `${name} not found`);
    const next = src.indexOf("\n  }\n", at);
    return src.slice(at, next);
  };
  assert.ok(!/loadMuteState\(/.test(body("initialize")), "initialize must not call loadMuteState");
  assert.ok(/loadMuteState\(this\)/.test(body("onDomRefresh")), "onDomRefresh must call loadMuteState(this)");
});
