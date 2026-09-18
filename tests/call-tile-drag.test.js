// The parked-call tile can be dragged anywhere on screen
// (builtins/webrtc/call-parking.js — _bindCallTileDrag and friends).
//
// The drag used to live inside window/meeting's 2000-line window class; it now
// lives in the call-parking mixin, which window_meeting and window_connect are
// both given (Object.assign onto the prototype, like webrtc/reactions and
// webrtc/screenshare). That is the only thing that changed for this test — the
// methods, the constants and the arithmetic are the same shipped text, now read
// from their new home.
//
// The block still needs the whole runtime to instantiate through a real window,
// so this pulls the constants and the drag block out of the SOURCE FILE and
// evaluates them against a minimal DOM. It therefore tests the shipped text
// rather than a copy of it: rename a method or change the clamp and this fails.
//
// What is worth testing here is the arithmetic and the state machine, which is
// exactly what a browser makes hardest to see: where the tile lands, when a
// press is a click and when it is a move, the corner it keeps across a resize,
// and that nothing is left listening on `window` afterwards.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const _ = require("underscore");

const SRC = resolve(__dirname, "../src/drumee/builtins/webrtc/call-parking.js");
const src = readFileSync(SRC, "utf8");

const CONSTS = src
  .split("\n")
  .filter((l) => l.startsWith("const CALL_TILE_"))
  .join("\n");

// Everything from the first drag helper to the end of _unbindCallTileDrag.
const from = src.indexOf("  _callTileBox() {");
const last = src.indexOf("  _unbindCallTileDrag() {");
// The mixin is an object literal, so each method closes with "  }," rather
// than the class body's "  }". Accept either, and strip a trailing comma so the
// slice is still a run of METHOD DEFINITIONS that can be wrapped in a class.
const endTok = src.indexOf("\n  },\n", last) >= 0 ? "\n  },\n" : "\n  }\n";
const METHODS = src
  .slice(from, src.indexOf(endTok, last) + endTok.length)
  // object-literal method separators -> class-body (no separators)
  .replace(/^  \},$/gm, "  }");
assert.ok(from > 0 && last > from, "drag block not found in " + SRC);

const TILE = { width: 300, height: 180 };
const PHONE_TILE = { width: 168, height: 100 };

function element(rect, parent) {
  return {
    dataset: {},
    style: {},
    parentNode: parent || null,
    offsetLeft: rect.left,
    offsetTop: rect.top,
    rect,
    // Position comes from the stylesheet until the drag writes it out, so the
    // box reports its inline left/top once there is one — same as a browser.
    getBoundingClientRect() {
      const x = parseFloat(this.style.left);
      const y = parseFloat(this.style.top);
      return {
        left: isNaN(x) ? this.rect.left : x,
        top: isNaN(y) ? this.rect.top : y,
        width: this.rect.width,
        height: this.rect.height,
      };
    },
    addEventListener() { },
    removeEventListener() { },
  };
}

/**
 * A meeting window parked as a tile, with just enough of the class around the
 * drag block for it to run.
 * @param {Object} opt  docked: park in the desk dock (default) or, false, in
 *                      place the way a DMZ session does.
 */
function parked(opt = {}) {
  const docked = opt.docked !== false;
  const area = opt.area || { width: 1440, height: 900 };
  const size = opt.size || TILE;
  const store = opt.store || {};
  const at = { left: area.width - size.width - 24, top: area.height - size.height - 24 };

  const dock = docked ? element({ ...at, ...size }) : null;
  const win = element({ ...at, ...size }, dock);
  win.dataset.callTile = "1";

  const listeners = {};
  global.window = {
    innerWidth: area.width,
    innerHeight: area.height,
    addEventListener(t, f, opt) {
      (listeners[t] = listeners[t] || []).push({ f, once: !!(opt && opt.once) });
    },
    removeEventListener(t, f) {
      listeners[t] = (listeners[t] || []).filter((x) => x.f !== f);
    },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
  };
  global._ = _;

  const Window = eval(`(() => {
${CONSTS}
return class ParkedMeeting {
  constructor(el, dockEl, workArea) {
    this.el = el;
    this._dock = dockEl;
    this._area = workArea;
  }
  _callDockEl() { return this._dock; }
  _callTileArea() { return this._area; }
${METHODS}
};
})()`);

  const ui = new Window(win, dock, area);
  ui._bindCallTileDrag();

  return {
    ui, win, dock, store,
    box: dock || win,
    listeners,
    live: () => Object.values(listeners).reduce((n, a) => n + a.length, 0),
    /** Fire an event at the window listeners, retiring the `once` ones. */
    dispatch(type, ev) {
      for (const l of [...(listeners[type] || [])]) {
        if (l.once) listeners[type] = listeners[type].filter((x) => x !== l);
        l.f(ev);
      }
      return ev;
    },
    /** Press, travel in five steps, release. */
    drag(fromX, fromY, toX, toY) {
      ui._callTileDown({ button: 0, clientX: fromX, clientY: fromY, pointerId: 1 });
      for (let i = 1; i <= 5; i++) {
        ui._callTileMove({
          pointerId: 1,
          pointerType: "mouse",
          buttons: 1,
          clientX: fromX + ((toX - fromX) * i) / 5,
          clientY: fromY + ((toY - fromY) * i) / 5,
          preventDefault() { },
        });
      }
      ui._callTileUp();
      return { left: this.box.style.left, top: this.box.style.top };
    },
  };
}

test("a drag moves the tile to where it was dropped", () => {
  const t = parked();
  // 1200,760 is on the resting tile; 500 left and 360 up from there.
  assert.deepStrictEqual(t.drag(1200, 760, 700, 400), { left: "616px", top: "336px" });
  // The resting rules position the dock from the far edges: both have to be
  // released, or the box is stretched between left and right instead of moved.
  assert.strictEqual(t.box.style.right, "auto");
  assert.strictEqual(t.box.style.bottom, "auto");
  assert.strictEqual(t.win.dataset.callDrag, undefined, "drag state cleared on release");
});

test("a press that barely travels stays a click, and is left to the click handler", () => {
  const t = parked();
  t.ui._callTileDown({ button: 0, clientX: 1200, clientY: 760, pointerId: 1 });
  t.ui._callTileMove({
    pointerId: 1, pointerType: "mouse", buttons: 1,
    clientX: 1202, clientY: 761, preventDefault() { },
  });
  t.ui._callTileUp();
  assert.strictEqual(t.box.style.left, undefined, "2px of travel must not move the tile");
  // _callTileClick only swallows the click when this is set — a 2px press has
  // to come back to the call, which is the whole point of the slop threshold.
  assert.ok(!t.ui._callTileDragAt);
});

test("a real drag swallows the click its own release fires", () => {
  const t = parked();
  t.drag(1200, 760, 700, 400);
  // The tile's own click handler is armed against it...
  assert.ok(Date.now() - t.ui._callTileDragAt < 100);

  // ...and so is the desk behind it: a drag that ends off the tile fires its
  // click on the common ancestor, where a bare click closes whatever menu or
  // drawer was open. Nothing should happen but the tile having moved.
  let stopped = 0;
  t.dispatch("click", {
    stopPropagation() { stopped++; },
    preventDefault() { stopped++; },
  });
  assert.strictEqual(stopped, 2, "the drag's own click must not reach the desk");
  assert.strictEqual(t.ui._callTileDragAt, 0, "and it is consumed exactly once");
});

test("a click that is not the drag's own is left alone", () => {
  const t = parked();
  t.drag(1200, 760, 700, 400);
  // The release landed outside the browser, so no click ever came; the next one
  // belongs to the user.
  t.ui._callTileDragAt = Date.now() - 1000;
  let stopped = 0;
  t.dispatch("click", {
    stopPropagation() { stopped++; },
    preventDefault() { stopped++; },
  });
  assert.strictEqual(stopped, 0);
  assert.strictEqual((t.listeners.click || []).length, 0, "and the guard retires itself");
});

test("a second finger cannot take over a drag in flight", () => {
  const t = parked();
  t.ui._callTileDown({ button: 0, clientX: 1200, clientY: 760, pointerId: 1 });
  t.ui._callTileDown({ button: 0, clientX: 300, clientY: 300, pointerId: 2 });
  assert.strictEqual(t.ui._callTileDrag.id, 1, "the first pointer keeps the tile");
  // ...and the second pointer's moves are ignored while it does.
  t.ui._callTileMove({
    pointerId: 2, pointerType: "touch", buttons: 1,
    clientX: 400, clientY: 400, preventDefault() { },
  });
  assert.strictEqual(t.box.style.left, undefined);
  t.ui._callTileUp();
});

test("with no desk, the tile parks at the same inset the drag clamps to", () => {
  const t = parked({ docked: false });
  // What _enterCallTile does after sizing the window: no stored position, so
  // the bottom-right corner comes from the drag's own bounds. A corner of its
  // own here is a tile that jumps 4px the moment it is picked up.
  t.win.style.left = "";
  t.win.style.top = "";
  t.ui._applyCallTilePos({ fx: 1, fy: 1 });
  assert.deepStrictEqual(
    { left: t.win.style.left, top: t.win.style.top },
    { left: "1116px", top: "696px" },
  );
});

test("the tile cannot be dragged off screen, and goes flush at the edges", () => {
  const t = parked();
  // Thrown well past the top-left corner: clamped to the inset, then snapped.
  assert.deepStrictEqual(t.drag(1200, 760, -400, -400), { left: "24px", top: "24px" });
  assert.strictEqual(t.store["drumee:call-tile-pos"], '{"fx":0,"fy":0}');
  // Dropped 22px and 12px short of the far corner: the magnet takes it in.
  assert.deepStrictEqual(t.drag(100, 100, 1170, 760), { left: "1116px", top: "696px" });
  assert.strictEqual(t.store["drumee:call-tile-pos"], '{"fx":1,"fy":1}');
});

test("the corner it was given survives a viewport resize", () => {
  const t = parked();
  t.drag(1200, 760, 30, 30); // top-left
  window.innerWidth = 1024;
  window.innerHeight = 680;
  t.ui._applyCallTilePos();
  assert.deepStrictEqual(
    { left: t.box.style.left, top: t.box.style.top },
    { left: "24px", top: "24px" },
  );

  // ...and the far corner is re-derived from the new viewport rather than kept
  // in pixels, which is what would have put it off screen.
  const b = parked();
  b.drag(1200, 760, 1400, 880);
  window.innerWidth = 1024;
  window.innerHeight = 680;
  b.ui._applyCallTilePos();
  assert.deepStrictEqual(
    { left: b.box.style.left, top: b.box.style.top },
    { left: "700px", top: "476px" },
  );
});

test("a tile nobody has dragged is left to the stylesheet", () => {
  const t = parked();
  t.ui._applyCallTilePos();
  assert.strictEqual(t.box.style.left, undefined);
  assert.strictEqual(t.box.style.top, undefined);
});

test("the phone breakpoint drags against the 12px inset", () => {
  const t = parked({
    area: { width: 600, height: 800 },
    size: PHONE_TILE,
    store: { "drumee:call-tile-pos": '{"fx":0,"fy":0}' },
  });
  t.ui._applyCallTilePos();
  assert.deepStrictEqual(
    { left: t.box.style.left, top: t.box.style.top },
    { left: "12px", top: "12px" },
  );
});

test("with no desk to dock into, the drag moves the window itself", () => {
  const t = parked({ docked: false });
  assert.strictEqual(t.box, t.win);
  assert.deepStrictEqual(t.drag(1200, 760, 900, 500), { left: "816px", top: "436px" });
});

test("a mouse button released out of reach ends the drag", () => {
  const t = parked();
  t.ui._callTileDown({ button: 0, clientX: 1200, clientY: 760, pointerId: 1 });
  t.ui._callTileMove({
    pointerId: 1, pointerType: "mouse", buttons: 0,
    clientX: 900, clientY: 500, preventDefault() { },
  });
  assert.strictEqual(t.ui._callTileDrag, null, "the tile must not follow a pointer with nothing held");
});

test("un-parking leaves nothing listening on window", () => {
  const t = parked();
  t.drag(1200, 760, 700, 400);
  assert.ok(t.live() > 0, "the resize re-fit is bound while parked");
  // The drag's click guard is a `once` listener that retires on the click it
  // was armed for — the one the release is about to fire.
  t.dispatch("click", { stopPropagation() { }, preventDefault() { } });
  t.ui._unbindCallTileDrag();
  assert.strictEqual(t.live(), 0);
  assert.strictEqual(t.win.dataset.callDrag, undefined);
});
