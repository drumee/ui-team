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
