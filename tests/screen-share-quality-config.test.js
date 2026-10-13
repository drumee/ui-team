// screen-share-quality-config.test.js — screen share is not capped to a
// single 5 fps / 500 kbps layer, and the viewer asks the bridge for it in HD.
//
//   node --test tests/screen-share-quality-config.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
// conference.js reads the app-global Visitor for locale + display name.
global.Visitor = { language: () => "en", fullname: () => "Test User" };
const R = (p) => require(path.join(__dirname, "..", "src/drumee/builtins/webrtc", p));

const conf = R("room/configs/conference.js")({ domain: "x" });
const init = R("room/configs/init.js")();
const { screenOnStage, noScreenOnStage, SCREEN_FPS } = R("screen-receiver-constraints.js");

test("capture and send above 5 fps (5 fps max = single 500 kbps layer)", () => {
  assert.ok(conf.desktopSharingFrameRate.max > 5);
  assert.deepEqual(conf.desktopSharingFrameRate, SCREEN_FPS);
  assert.deepEqual(init.desktopSharingFrameRate, SCREEN_FPS);
});

test("an explicit screen-share bitrate is configured", () => {
  assert.ok(conf.videoQuality.desktopbitrate >= 2000000);
});

test("dead testing.capScreenshareBitrate is gone", () => {
  assert.equal(conf.testing && conf.testing.capScreenshareBitrate, undefined);
});

test("the shared screen is on stage in HD, everything else small", () => {
  assert.deepEqual(screenOnStage("abc-v1"), {
    lastN: -1,
    onStageSources: ["abc-v1"],
    defaultConstraints: { maxHeight: 360 },
    constraints: { "abc-v1": { maxHeight: 2160 } },
  });
});

test("after the share: nothing pinned, library default height", () => {
  assert.deepEqual(noScreenOnStage(), {
    lastN: -1,
    onStageSources: [],
    defaultConstraints: { maxHeight: 2160 },
    constraints: {},
  });
});
