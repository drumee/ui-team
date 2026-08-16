/**
 * activate-workspace's exit guard — the one decision in it that is pure.
 *
 * The flow is force-completed, so refresh keystrokes are cancelled outright.
 * Which keystrokes those are is worth pinning down: too broad and the guard eats
 * ordinary typing, too narrow and the flow leaks. Everything else in that module
 * is history and `beforeunload` plumbing, which needs a browser.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classifyKey, SENTINEL, ExitGuard,
} = require("../src/drumee/builtins/widget/activate-workspace/exit-guard");

/** A KeyboardEvent-alike. */
const key = (k, mods = {}) => ({
  key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods,
});

test("F5 alone is a reload", () => {
  assert.equal(classifyKey(key("F5")), "reload");
});

test("Ctrl+R and Cmd+R are reloads", () => {
  assert.equal(classifyKey(key("r", { ctrlKey: true })), "reload");
  assert.equal(classifyKey(key("r", { metaKey: true })), "reload");
  // Capitals arrive when Shift is held; the test is case-insensitive.
  assert.equal(classifyKey(key("R", { ctrlKey: true })), "reload");
});

test("Shift is allowed through — a hard reload is the same intent", () => {
  // Ctrl+Shift+R loses the same walkthrough as Ctrl+R.
  assert.equal(classifyKey(key("r", { ctrlKey: true, shiftKey: true })), "reload");
  assert.equal(classifyKey(key("F5", { shiftKey: true })), "reload");
});

test("Alt is not — Alt+R is a menu on some platforms, nobody's refresh", () => {
  assert.equal(classifyKey(key("r", { ctrlKey: true, altKey: true })), null);
  assert.equal(classifyKey(key("F5", { altKey: true })), null);
});

test("a bare r is ordinary typing", () => {
  // The guard runs in capture phase over the whole window, so this mattering is
  // the difference between blocking refresh and blocking the letter R in the
  // workspace-name field.
  assert.equal(classifyKey(key("r")), null);
});

test("modified F5 is left to the browser", () => {
  // Ctrl+F5 / Cmd+F5 are the browser's own hard-reload bindings and are not
  // reliably cancellable; claiming them would suggest a block that is not there.
  assert.equal(classifyKey(key("F5", { ctrlKey: true })), null);
  assert.equal(classifyKey(key("F5", { metaKey: true })), null);
});

test("other keys and junk are not reloads", () => {
  for (const k of ["Enter", "Escape", "Tab", "F4", "F6", "t", ""]) {
    assert.equal(classifyKey(key(k)), null, `${k} should not classify`);
  }
  assert.equal(classifyKey(null), null);
  assert.equal(classifyKey(undefined), null);
  assert.equal(classifyKey({}), null);
});

test("the history sentinel is namespaced to this widget", () => {
  // reward-flow pushes its own sentinel under a different key; the two flows
  // must never read each other's history entries as their own.
  assert.equal(SENTINEL, "activate-workspace-exit-guard");
  assert.notEqual(SENTINEL, "reward-flow-exit-guard");
});

test("the guard loads and starts/stops without a window", () => {
  // It is constructed in initialize(), which runs under Node in tests of the
  // modules around it; every browser API it touches is guarded.
  const guard = new ExitGuard({ isDestroyed: () => false });
  assert.doesNotThrow(() => guard.start());
  assert.doesNotThrow(() => guard.stop());
});
