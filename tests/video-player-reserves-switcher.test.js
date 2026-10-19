// tests/video-player-reserves-switcher.test.js — the video player keeps room
// for the Open-File Switcher: the video is fitted into the viewport minus the
// panel, so the window (video + panel) still fits.
//
//   node --test tests/video-player-reserves-switcher.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/player/video/index.js"),
  "utf8"
);

// marginX 0 / no sidebar: usable width is exactly innerWidth.
const config = () => ({ marginX: 0, marginY: 0, offsetY: 0, topbarHeight: 0 });
const fakeRequire = (p) => {
  if (p === "window/configs/default") return config;
  throw new Error(`unexpected require ${p}`);
};
// Same contract as @drumee/ui-essentials fitBoxes: fit `b` into `a`, keep ratio.
const fitBoxes = (a, b) => {
  const k = Math.min(a.width / b.width, a.height / b.height);
  return { width: b.width * k, height: b.height * k };
};

global.Wm = { $el: null };
global.window = { innerWidth: 1000, innerHeight: 1000 };

function clamp(reserved) {
  const withFileSwitcher = { reservedWidth: () => reserved };
  return new Function("require", "fitBoxes", "withFileSwitcher",
    `return ${sliceFunction(SRC, "_clampToViewport()")}`
  )(fakeRequire, fitBoxes, withFileSwitcher);
}

test("a wide video is fitted beside the expanded panel", () => {
  const self = { width: 1600, height: 800 };
  clamp(248).call(self);
  assert.equal(self.width, 752);
  assert.equal(self.size.width, 752);
  assert.equal(self.height, 376);
});

test("a small video keeps its size", () => {
  const self = { width: 400, height: 300 };
  clamp(248).call(self);
  assert.deepEqual(self.size, { width: 400, height: 300 });
});

test("no panel, no reservation", () => {
  const self = { width: 1600, height: 800 };
  clamp(0).call(self);
  assert.equal(self.width, 1000);
});
