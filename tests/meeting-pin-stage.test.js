const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pinStageWanted,
  enterPinStage,
  leavePinStage,
  MARKER,
} = require("../src/drumee/builtins/webrtc/pin-stage");

// Just enough of a DOM node for the moves pin-stage makes. appendChild /
// insertBefore MOVE an attached node, like the real DOM.
class Node {
  constructor(name, nodeType = 1) {
    this.name = name;
    this.nodeType = nodeType;
    this.childNodes = [];
    this.parentNode = null;
  }
  get firstChild() { return this.childNodes[0] || null; }
  removeChild(c) {
    const i = this.childNodes.indexOf(c);
    if (i < 0) throw new Error("not a child");
    this.childNodes.splice(i, 1);
    c.parentNode = null;
    return c;
  }
  insertBefore(c, ref) {
    if (c.parentNode) c.parentNode.removeChild(c);
    const i = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
    if (i < 0) throw new Error("ref is not a child");
    this.childNodes.splice(i, 0, c);
    c.parentNode = this;
    return c;
  }
  appendChild(c) { return this.insertBefore(c, null); }
}

const doc = {
  createComment(data) {
    const n = new Node("#comment", 8);
    n.data = data;
    return n;
  },
};

const names = (n) => n.childNodes.map((c) => (c.nodeType === 8 ? `<${c.data}>` : c.name));
const markers = (n) => n.childNodes.filter((c) => c.nodeType === 8 && c.data === MARKER);

// The share layout as the meeting has it once docked: the stage (__endpoints)
// holds the shared screen, the strip (__float-tiles) holds the participants
// manager, which holds the tiles in join order.
function sharing() {
  const stage = new Node("stage");
  const strip = new Node("strip");
  const presenter = new Node("presenter");
  const home = new Node("manager");
  const a = new Node("a"), b = new Node("b"), c = new Node("c");
  stage.appendChild(presenter);
  strip.appendChild(home);
  [a, b, c].forEach((t) => home.appendChild(t));
  return { stage, strip, presenter, home, a, b, c, doc };
}

test("wanted only while docked, not parked, with every part present", () => {
  const s = sharing();
  const parts = { stage: s.stage, strip: s.strip, home: s.home, presenter: s.presenter, tile: s.b };
  assert.equal(pinStageWanted({ ...parts, docked: true, parked: false }), true);
  assert.equal(pinStageWanted({ ...parts, docked: false, parked: false }), false);
  assert.equal(pinStageWanted({ ...parts, docked: true, parked: true }), false);
  assert.equal(pinStageWanted({ ...parts, tile: null, docked: true }), false);
  assert.equal(pinStageWanted({ ...parts, presenter: null, docked: true }), false);
  assert.equal(pinStageWanted(undefined), false);
});

test("enter: pinned tile takes the stage, the screen takes the strip's first slot", () => {
  const s = sharing();
  enterPinStage({ ...s, tile: s.b });
  assert.deepEqual(names(s.stage), ["b"]);
  assert.deepEqual(names(s.strip), ["presenter", "manager"]);
  assert.deepEqual(names(s.home), ["a", `<${MARKER}>`, "c"]);
});

test("enter twice is a no-op: still one marker", () => {
  const s = sharing();
  enterPinStage({ ...s, tile: s.b });
  enterPinStage({ ...s, tile: s.b });
  assert.deepEqual(names(s.stage), ["b"]);
  assert.deepEqual(names(s.strip), ["presenter", "manager"]);
  assert.equal(markers(s.home).length, 1);
});

test("leave: screen back on the stage, tile back in join order, marker gone", () => {
  const s = sharing();
  enterPinStage({ ...s, tile: s.b });
  leavePinStage({ ...s, tile: s.b });
  assert.deepEqual(names(s.stage), ["presenter"]);
  assert.deepEqual(names(s.strip), ["manager"]);
  assert.deepEqual(names(s.home), ["a", "b", "c"]);
});

test("leave puts the screen in FRONT of whatever the stage already holds", () => {
  // Share stopped: _dockParticipants(false) appends the manager back to the
  // stage first; the screen must still be its first child (grid order).
  const s = sharing();
  enterPinStage({ ...s, tile: s.b });
  s.stage.appendChild(s.home);
  leavePinStage({ ...s, tile: s.b });
  assert.deepEqual(names(s.stage), ["presenter", "manager"]);
  assert.deepEqual(names(s.home), ["a", "b", "c"]);
});

test("leave skips a tile that was destroyed, and still restores the screen", () => {
  const s = sharing();
  enterPinStage({ ...s, tile: s.b });
  s.stage.removeChild(s.b); // the pinned person left: their widget is gone
  leavePinStage({ ...s, tile: s.b });
  assert.equal(s.b.parentNode, null);
  assert.deepEqual(names(s.stage), ["presenter"]);
  assert.deepEqual(names(s.home), ["a", "c"]);
});

test("re-enter after a re-render pulled the tile home keeps one marker", () => {
  const s = sharing();
  enterPinStage({ ...s, tile: s.b });
  s.home.appendChild(s.b); // a collection re-render re-appends every child
  enterPinStage({ ...s, tile: s.b });
  assert.deepEqual(names(s.stage), ["b"]);
  assert.equal(markers(s.home).length, 1);
  assert.deepEqual(names(s.home), ["a", "c", `<${MARKER}>`]);
});

test("switching pins leaves exactly one tile on the stage", () => {
  const s = sharing();
  enterPinStage({ ...s, tile: s.b });
  leavePinStage({ ...s, tile: s.b });
  enterPinStage({ ...s, tile: s.c });
  assert.deepEqual(names(s.stage), ["c"]);
  assert.deepEqual(names(s.strip), ["presenter", "manager"]);
  assert.deepEqual(names(s.home), ["a", "b", `<${MARKER}>`]);
});

test("leave with nothing entered is harmless", () => {
  const s = sharing();
  leavePinStage({ ...s, tile: null });
  assert.deepEqual(names(s.stage), ["presenter"]);
  assert.deepEqual(names(s.home), ["a", "b", "c"]);
});
