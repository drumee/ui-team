// remote-display-stalled-skin.test.js — a remote screen share is NOT dimmed
// when its track goes `mute`. Chrome's screenshare stops sending frames while
// the content doesn't change — the normal state of a slide or document — so a
// mute-driven dim washed out every static share (final review #5).
//
//   node --test tests/remote-display-stalled-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/webrtc/endpoint/remote/display/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");

test("no stall dim on the shared screen", () => {
  assert.doesNotMatch(css, /data-stalled/);
});

test("the display only reacts to the track ENDING, never to mute", () => {
  const src = fs.readFileSync(path.join(SRC, "builtins/webrtc/endpoint/remote/display/index.js"), "utf8");
  assert.match(src, /watchRemoteScreen\(/);
  assert.doesNotMatch(src, /onStall|onResume|dataset\.stalled/);
});
