// The 1:1 call window opens centred in the desk canvas
// (builtins/window/connect/index.js — _workAreaBox, _centerInWorkArea).
//
// The shared webrtc _setSize (window/interact/webrtc.js) centres against the
// VIEWPORT, but the window lives in the call layer, whose origin is the WM work
// area — below the 46px topbar and right of the sidebar rail. A viewport-centred
// offset applied in work-area coordinates lands right and down of centre, by the
// width of the rail and the height of the bar. This is the correction.
//
// Methods are cut out of the SOURCE FILE and run against a fake `this`, the way
// the desk tests do, so this tests the shipped text rather than a copy of it.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const SRC = resolve(
  __dirname,
  "../src/drumee/builtins/window/connect/index.js",
);
const src = readFileSync(SRC, "utf8");

function num(name) {
  const m = new RegExp(`\\nconst ${name} = (\\d+)`).exec(src);
  assert.ok(m, `${name} not found in the source`);
  return Number(m[1]);
}

const W = num("CONNECT_W");
const H = num("CONNECT_H");
const INSET = num("CONNECT_INSET");

function grab(name) {
  const m = new RegExp(`\\n  (async )?${name}\\(`).exec(src);
  assert.ok(m, `${name} not found`);
  const start = m.index + 1;
  return src.slice(start, src.indexOf("\n  }\n", start) + 4);
}

/**
 * A connect window about to be placed.
 * @param {Object} opt
 *   area     the WM work area, or null for "Wm has no element yet"
 *   viewport the window size the fallback reads
 *   mounted  whether this.el exists yet
 */
function win(opt = {}) {
  const area = opt.area === undefined
    ? { width: 1360, height: 838 }
    : opt.area;
  const viewport = opt.viewport || { innerWidth: 1440, innerHeight: 900 };

  const styleSet = [];
  const el = opt.mounted === false ? null : { style: {} };

  const Wm = area
    ? { el: { parentElement: { getBoundingClientRect: () => area } } }
    : {};

  const w = new Function(
    "_", "window", "Wm", "CONNECT_W", "CONNECT_H", "CONNECT_INSET",
    `return { ${["_workAreaBox", "_centerInWorkArea"].map(grab).join(",\n")} };`,
  )(
    { isFunction: (f) => typeof f === "function" },
    { ...viewport, Wm },
    Wm,
    W, H, INSET,
  );

  w.el = el;
  w.size = { width: W, height: H };
  w.style = { set: (o) => styleSet.push(o) };
  return { w, styleSet, el };
}

test("the window is centred in the work area, not the viewport", () => {
  // 1360x838 is a 1440x900 viewport less an expanded rail and the topbar.
  const { w } = win({ area: { width: 1360, height: 838 } });
  const { left, top } = w._centerInWorkArea();
  assert.equal(left, Math.round((1360 - W) / 2));
  assert.equal(top, Math.round((838 - H) / 2));

  // The old viewport-based arithmetic, for contrast: it would put the window
  // this far right of where it belongs.
  const viewportLeft = 1440 / 2 - W / 2;
  assert.ok(viewportLeft > left, "the viewport calculation skews right");
});

test("the window's centre lands on the area's centre", () => {
  // An ODD area, so this also pins the rounding: the offset is a whole number
  // of pixels (a subpixel left/top blurs the text inside), which puts the
  // centre at most half a pixel off. Exact equality here would be wrong.
  const area = { width: 1193, height: 738 };
  const { w } = win({ area });
  const { left, top } = w._centerInWorkArea();
  assert.ok(Math.abs(left + W / 2 - area.width / 2) <= 0.5);
  assert.ok(Math.abs(top + H / 2 - area.height / 2) <= 0.5);
  assert.equal(left, Math.round(left), "whole pixels only");
  assert.equal(top, Math.round(top));
});

test("a work area narrower than the window clamps to the inset", () => {
  const { w } = win({ area: { width: W - 200, height: H - 200 } });
  const { left, top } = w._centerInWorkArea();
  assert.equal(left, INSET, "never a negative offset");
  assert.equal(top, INSET);
});

test("the viewport is the fallback when the WM has no element yet", () => {
  const { w } = win({ area: null, viewport: { innerWidth: 1000, innerHeight: 800 } });
  const { left, top } = w._centerInWorkArea();
  assert.equal(left, Math.round((1000 - W) / 2));
  assert.equal(top, Math.round((800 - H) / 2));
});

test("a zero-sized work area falls back rather than stacking in the corner", () => {
  // The desk can measure 0x0 before it has laid out; centring against that
  // would put every call window at the inset.
  const { w } = win({
    area: { width: 0, height: 0 },
    viewport: { innerWidth: 1200, innerHeight: 900 },
  });
  const { left } = w._centerInWorkArea();
  assert.equal(left, Math.round((1200 - W) / 2));
});

test("the position is written to the style model and to the element", () => {
  const { w, styleSet, el } = win();
  const { left, top } = w._centerInWorkArea();
  assert.deepEqual(styleSet, [{ left, top }]);
  assert.equal(el.style.left, `${left}px`);
  assert.equal(el.style.top, `${top}px`);
  assert.equal(w.size.left, left, "and kept on this.size for change_size");
  assert.equal(w.size.top, top);
});

test("an unmounted window still records where it will go", () => {
  const { w, styleSet } = win({ mounted: false });
  const { left, top } = w._centerInWorkArea();
  assert.deepEqual(styleSet, [{ left, top }]);
  assert.equal(w.size.left, left);
});

test("explicit dimensions override the defaults", () => {
  const { w } = win({ area: { width: 1000, height: 800 } });
  const { left, top } = w._centerInWorkArea(400, 300);
  assert.equal(left, Math.round((1000 - 400) / 2));
  assert.equal(top, Math.round((800 - 300) / 2));
});

test("coming back from the dock restores the SAME frame it launched with", () => {
  // This drifted once already: _onCallTileLeft re-seeded a literal 734x600
  // while the launch had moved to the constants, so a call opened at one size
  // and came back from the dock at another.
  const m = /_onCallTileLeft\(\)\s*\{[\s\S]*?\n  \}/.exec(src);
  assert.ok(m, "_onCallTileLeft not found");
  const body = m[0];
  assert.ok(/width: CONNECT_W/.test(body), "re-seeds the launch width");
  assert.ok(/height: CONNECT_H/.test(body), "re-seeds the launch height");
  assert.ok(/_centerInWorkArea\(\)/.test(body), "and re-centres it");
  assert.ok(!/\b734\b|height: 600\b/.test(body), "no literal dimensions");
});

test("the launch geometry uses the same constants", () => {
  // _setSize and the centring must agree, or the window is centred for a size
  // it is not given.
  const m = /_setSize\(\{\s*width: CONNECT_W,\s*height: CONNECT_H/.exec(src);
  assert.ok(m, "_setSize must be called with CONNECT_W / CONNECT_H");
  assert.ok(W < 734 && H < 600, "the frame is smaller than the 734x600 it replaced");
  assert.ok(W >= 480 && H >= 420, "and not below the window's own minimums");
});
