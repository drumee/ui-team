/**
 * Releasing the shared popup hosts — the one decision in that teardown that is
 * pure. The rest is DOM plumbing that needs a browser.
 *
 * The bug being pinned: the flow empties a host it handed the user to, but
 * leaves `data-state="open"` on it. Both hosts are full-viewport, and open
 * means dimmed and `pointer-events: auto`, so the result is an invisible
 * blocker — popup gone, desk greyed, nothing clickable. Reported right after
 * the tutorial, where this flow mounts on the tour's destroy.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isOrphanHost, releaseIfEmpty,
} = require("../src/drumee/builtins/widget/activate-workspace/hosts");

/** An Element-alike: what the two hosts look like to this rule. */
const host = (state, kids = 0, extra = {}) => ({
  dataset: { state, ...extra },
  childElementCount: kids,
});

test("an open host with nothing in it is an orphan", () => {
  assert.equal(isOrphanHost(host("open", 0)), true);
});

test("an open host with content belongs to someone still using it", () => {
  // The safety property: this rule must never take down a live modal, which is
  // why it tests emptiness rather than trying to work out ownership.
  assert.equal(isOrphanHost(host("open", 1)), false);
  assert.equal(releaseIfEmpty(host("open", 3)), false);
});

test("a closed host is left alone, empty or not", () => {
  assert.equal(isOrphanHost(host("closed", 0)), false);
  assert.equal(isOrphanHost(host("closed", 2)), false);
});

test("a host with no state at all is not ours to close", () => {
  assert.equal(isOrphanHost(host(undefined, 0)), false);
});

test("missing hosts are tolerated — neither is guaranteed to exist", () => {
  // Wm may be absent, and _captureHost may never have run.
  for (const nothing of [null, undefined, {}]) {
    assert.equal(isOrphanHost(nothing), false);
    assert.equal(releaseIfEmpty(nothing), false);
  }
});

test("releasing closes it and strips the dim it was dressed with", () => {
  const el = host("open", 0, { overlay: "blur", guidedOverlay: "bare" });
  assert.equal(releaseIfEmpty(el), true);
  assert.equal(el.dataset.state, "closed");
  assert.equal(el.dataset.overlay, undefined);
  assert.equal(el.dataset.guidedOverlay, undefined);
});

test("releasing twice is a no-op the second time", () => {
  // Teardown paths overlap: _finish closes what it opened and onBeforeDestroy
  // sweeps again.
  const el = host("open", 0);
  assert.equal(releaseIfEmpty(el), true);
  assert.equal(releaseIfEmpty(el), false);
});
