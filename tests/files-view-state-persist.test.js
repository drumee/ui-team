// tests/files-view-state-persist.test.js — the folder window reopens in the
// Group / List / Grid view the user last picked, not always Group.
//
//   node --test tests/files-view-state-persist.test.js
//
// Bad or missing storage must fall back to Group (the old default) and never
// throw: Safari private mode raises on setItem.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  VIEW_STATE_KEY,
  loadViewState,
  saveViewState,
} = require("../src/drumee/builtins/window/skeleton/toolkit/file-group");

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

const throwing = {
  getItem() { throw new Error("denied"); },
  setItem() { throw new Error("denied"); },
};

test("nothing saved opens in Group", () => {
  assert.equal(loadViewState(fakeStorage()), "group");
});

test("each view round-trips", () => {
  for (const state of ["list", "grid", "group"]) {
    const s = fakeStorage();
    saveViewState(state, s);
    assert.equal(loadViewState(s), state);
  }
});

test("an unknown stored value falls back to Group", () => {
  const s = fakeStorage();
  s.setItem(VIEW_STATE_KEY, "tree");
  assert.equal(loadViewState(s), "group");
});

test("an unknown state is not written", () => {
  const s = fakeStorage();
  saveViewState("tree", s);
  assert.equal(s.getItem(VIEW_STATE_KEY), null);
});

test("storage that throws never breaks load or save", () => {
  assert.equal(loadViewState(throwing), "group");
  assert.doesNotThrow(() => saveViewState("list", throwing));
});

test("no storage at all", () => {
  assert.equal(loadViewState(undefined), "group");
  assert.doesNotThrow(() => saveViewState("list", undefined));
});

// ── folder window: restore on open, record on toggle ─────────────────────────
// The real methods, sliced out of folder/index.js and run against a stub window
// (the file itself only loads under webpack).
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const FOLDER_SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/folder/index.js"),
  "utf8",
);
Object.assign(global, require("../src/drumee/builtins/window/skeleton/toolkit/file-group"));
global._a = Object.assign(global._a || {}, { row: "row", icon: "icon", value: "value", content: "content" });
global.window = global.window || { pointerDragged: 0 };

const method = (sig) => eval(`(${sliceFunction(FOLDER_SRC, sig)})`);
const applySaved = method("_applySavedViewState()");
const toggleFilesLayout = method("toggleFilesLayout(cmd)");

let cidSeq = 0;
function stubWindow() {
  return {
    cid: `c${++cidSeq}`,
    fig: { family: "window-folder" },
    setViewMode(m) { this.mode = m; },
    getViewMode() { return this.mode; },
    ensurePart: () => Promise.resolve(null),
  };
}

function withStorage(fn) {
  const s = fakeStorage();
  let writes = 0;
  const set = s.setItem;
  s.setItem = (k, v) => { writes++; set(k, v); };
  const prev = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { value: s, configurable: true, writable: true });
  try {
    return fn(s, () => writes);
  } finally {
    if (prev) Object.defineProperty(globalThis, "localStorage", prev);
    else delete globalThis.localStorage;
  }
}

test("folder opens in a saved List view", () => withStorage((s) => {
  s.setItem(VIEW_STATE_KEY, "list");
  const w = stubWindow();
  applySaved.call(w);
  assert.equal(w.mode, "row");
  assert.equal(isGrouped(w), false);
}));

test("folder opens in a saved Grid view", () => withStorage((s) => {
  s.setItem(VIEW_STATE_KEY, "grid");
  const w = stubWindow();
  applySaved.call(w);
  assert.equal(w.mode, "icon");
  assert.equal(isGrouped(w), false);
}));

test("folder with nothing saved opens in Group", () => withStorage(() => {
  const w = stubWindow();
  applySaved.call(w);
  assert.equal(w.mode, "icon");
  assert.equal(isGrouped(w), true);
}));

test("picking List records it", () => withStorage((s) => {
  const w = stubWindow();
  applySaved.call(w); // Group
  toggleFilesLayout.call(w, { mget: () => "list" });
  assert.equal(s.getItem(VIEW_STATE_KEY), "list");
}));

test("re-pressing the active view writes nothing", () => withStorage((s, writes) => {
  const w = stubWindow();
  applySaved.call(w); // Group
  toggleFilesLayout.call(w, { mget: () => "group" });
  assert.equal(writes(), 0);
}));
