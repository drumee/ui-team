// p2p-header-expand-button.test.js — the 1:1 call header's expand button
// carries both icons and the part name window-fullscreen syncs it through.
//
//   node --test tests/p2p-header-expand-button.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.Skeletons = { Box: { X: (o) => o }, Note: (o) => o, Button: { Svg: (o) => o } };
global.LOCALE = {};
global._e = { close: "close" };
const header = require(path.join(__dirname, "..", "src/drumee/builtins/webrtc/skeleton/p2p-header.js"));

test("expand button: icon pair, starts windowed, reachable as call-expand", () => {
  const h = header({ fig: { family: "window-connect" } });
  const actions = h.kids[1].kids;
  const expand = actions.find((b) => b.service === "toggle-fullscreen");
  assert.deepEqual(expand.icons, ["meet-expand", "meet-collapse"]);
  assert.equal(expand.state, 0);
  assert.equal(expand.sys_pn, "call-expand");
});
