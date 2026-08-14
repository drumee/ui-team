/**
 * activate-workspace's Step 2 beat table.
 *
 * resolveSub is the whole decision behind which upload beat is on screen, and
 * it is pure precisely so it can be checked here — the guide around it needs a
 * live workspace window, which this box cannot provide.
 *
 * `null` means HOLD the current beat, which is a distinct answer from any beat
 * name: it is what keeps a mid-mount surface from rewinding the walkthrough.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveSub, ORDER,
} = require("../src/drumee/builtins/widget/activate-workspace/guide-upload");

/** Nothing on screen, nothing pressed. */
const NONE = {
  folder: false, newCtrl: false, fromDevice: false,
  nextPressed: false, uploading: false, uploaded: false, filesPanel: false,
};

const at = (over) => resolveSub({ ...NONE, ...over });

test("the beats are ordered as the walkthrough walks them", () => {
  assert.deepEqual(
    Object.keys(ORDER),
    ["folder", "new", "device", "uploading", "files"],
  );
  assert.deepEqual(Object.values(ORDER), [1, 2, 3, 4, 5]);
});

test("no workspace window yet → HOLD, never a reset", () => {
  // The window may still be mounting; the orchestrator's open timeout owns the
  // "it never appeared" case.
  assert.equal(at({}), null);
  assert.equal(at({ newCtrl: true }), null);
});

test("the window alone is the 'read this' beat", () => {
  assert.equal(at({ folder: true, newCtrl: true }), "folder");
});

test("the + New pill being on screen does not skip the 'read this' beat", () => {
  // The pill renders the instant the window does, so promoting on visibility
  // alone would run past the beat in the same tick. Next is what releases it.
  assert.equal(at({ folder: true, newCtrl: true }), "folder");
  assert.equal(at({ folder: true, newCtrl: true, nextPressed: true }), "new");
});

test("Next pressed but the pill not resolved yet holds on 'folder'", () => {
  // syncNewCtrlVisibility keeps it display:none until it has confirmed the
  // upload privilege — and for a view-only member it never appears at all.
  assert.equal(at({ folder: true, nextPressed: true }), "folder");
});

test("an open dropdown wins, however the user got there", () => {
  assert.equal(
    at({ folder: true, newCtrl: true, fromDevice: true }),
    "device",
  );
  // Including without ever pressing Next — they opened it themselves.
  assert.equal(at({ folder: true, fromDevice: true }), "device");
});

test("files in flight outrank the dropdown behind them", () => {
  // The picker can leave its dropdown on screen behind the progress window.
  assert.equal(
    at({ folder: true, fromDevice: true, uploading: true }),
    "uploading",
  );
});

test("a landed upload moves to the files panel", () => {
  assert.equal(
    at({ folder: true, uploaded: true, filesPanel: true }),
    "files",
  );
});

test("a landed upload holds when the panel is not showing", () => {
  // They may have flipped to another tab of the window. Rewinding a finished
  // walkthrough to "click + New" would be nonsense; it resolves when they
  // come back.
  assert.equal(at({ folder: true, uploaded: true, filesPanel: false }), null);
});

test("a landed upload outranks a batch still going up", () => {
  // _e.uploaded fires per FILE, so the last beat is reached with the rest still
  // in flight — the guide keeps spotlighting the progress window from there
  // (see _targetEl), but the beat is 'files'.
  assert.equal(
    at({
      folder: true, uploaded: true, filesPanel: true, uploading: true,
    }),
    "files",
  );
});

test("a landed upload survives the workspace window going away", () => {
  // 'uploaded' is checked before the folder gate, so closing the window mid-way
  // through the last beat cannot rewind the walkthrough.
  assert.equal(at({ uploaded: true, filesPanel: true }), "files");
});
