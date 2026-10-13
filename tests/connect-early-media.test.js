// connect-early-media.test.js — camera/mic are requested at the click, in
// parallel with conference.join, and a denied mic stops the join.
//
//   node --test tests/connect-early-media.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { beginEarlyMedia, joinAfterEarlyMedia } = require(path.join(
  __dirname, "..", "src/drumee/builtins/window/connect/call-start.js"
));

test("media is requested before join resolves, and only once", async () => {
  const log = [];
  const host = { _createStartupTracks: () => { log.push("gum"); return Promise.resolve(["a"]); } };
  beginEarlyMedia(host);
  beginEarlyMedia(host);
  const room = await joinAfterEarlyMedia(host, async () => { log.push("join"); return { user: {} }; });
  assert.deepEqual(log, ["gum", "join"]);
  assert.deepEqual(room, { user: {} });
});

// The server join runs in parallel by design; what must not happen is the
// caller USING that room (entering Jitsi) with no media.
test("denied media returns no room", async () => {
  const host = {
    _createStartupTracks: () => { host._startupMediaFailed = 1; return Promise.reject(new Error("NotAllowedError")); },
  };
  beginEarlyMedia(host);
  const room = await joinAfterEarlyMedia(host, async () => ({ user: { permission: 1 } }));
  assert.equal(room, null);
});
