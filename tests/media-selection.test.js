/**
 * libs/media-selection — how a trash action divides the selection, and when it
 * has to ask first.
 *
 * This is the decision behind "Move to trash": it acts on the whole selection,
 * not the clicked item, and the buckets are not equivalent — one of them is
 * carried out with no dialog at all. It lived inline in the window manager,
 * which cannot be required outside webpack, so none of it could be checked.
 *
 * bucketFor's TEST ORDER is the behaviour, so most of what follows is about
 * precedence rather than about the happy path.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BUCKETS, bucketFor, emptyBuckets, needsBulkConfirm, actionableCount,
} = require("../src/drumee/libs/media-selection");

// ───────── bucketFor ─────────

test("a plain disposable file is allowed — the silent bucket", () => {
  assert.equal(bucketFor({ canRemove: true }), "allowed");
});

test("a file the caller cannot remove is rejected, not trashed", () => {
  assert.equal(bucketFor({ canRemove: false }), "rejected");
});

test("an owned hub goes to own_hubs, someone else's to other_hubs", () => {
  assert.equal(bucketFor({ isHub: true, isOwner: true }), "own_hubs");
  assert.equal(bucketFor({ isHub: true, isOwner: false }), "other_hubs");
});

test("a hub's canRemove is never consulted", () => {
  // Preserved from the inline original: ownership alone decides, and a hub is
  // destroyed rather than trashed, so it must never fall into `allowed`.
  assert.equal(bucketFor({ isHub: true, isOwner: true, canRemove: false }), "own_hubs");
  assert.equal(bucketFor({ isHub: true, isOwner: false, canRemove: true }), "other_hubs");
});

test("locked beats everything, including an owned hub", () => {
  assert.equal(bucketFor({ locked: true, canRemove: true }), "locked");
  assert.equal(
    bucketFor({ locked: true, isHub: true, isOwner: true }),
    "locked",
  );
});

test("a folder containing a hub is neither trashed nor rejected", () => {
  // It gets its own question — trashing it would take the hub with it.
  assert.equal(
    bucketFor({ isFolder: true, containsHub: true, canRemove: true }),
    "hubs_inside",
  );
  // …and that holds even when the folder is NOT removable, which is the case the
  // inline version's nesting made easy to get wrong.
  assert.equal(
    bucketFor({ isFolder: true, containsHub: true, canRemove: false }),
    "hubs_inside",
  );
});

test("a folder with no hub inside is treated as an ordinary item", () => {
  assert.equal(bucketFor({ isFolder: true, canRemove: true }), "allowed");
  assert.equal(bucketFor({ isFolder: true, canRemove: false }), "rejected");
});

test("containsHub on a non-folder is ignored", () => {
  // Only a folder routes to hubs_inside; a file claiming containsHub is a
  // nonsense the classifier should not act on.
  assert.equal(bucketFor({ containsHub: true, canRemove: true }), "allowed");
});

test("absent flags read as false, and an empty row is rejected", () => {
  // The safe default: nothing happens to a `rejected` item.
  assert.equal(bucketFor({}), "rejected");
  assert.equal(bucketFor(), "rejected");
});

test("every bucket bucketFor can return is declared in BUCKETS", () => {
  const produced = new Set([
    bucketFor({ locked: true }),
    bucketFor({ isHub: true, isOwner: true }),
    bucketFor({ isHub: true }),
    bucketFor({ isFolder: true, containsHub: true }),
    bucketFor({ canRemove: true }),
    bucketFor({}),
  ]);
  assert.deepEqual([...produced].sort(), [...BUCKETS].sort());
});

test("emptyBuckets has one array per bucket and nothing else", () => {
  const b = emptyBuckets();
  assert.deepEqual(Object.keys(b).sort(), [...BUCKETS].sort());
  for (const k of BUCKETS) assert.deepEqual(b[k], []);
});

// ───────── needsBulkConfirm ─────────

/** Buckets holding `n` placeholder items under `key`. */
const withItems = (spec) => {
  const b = emptyBuckets();
  for (const [k, n] of Object.entries(spec)) {
    b[k] = Array.from({ length: n }, (_, i) => `${k}-${i}`);
  }
  return b;
};

test("a single deliberate trash is NOT gated", () => {
  // The everyday action. Gating it would tax every trash in the app to fix a
  // case that only arises with a stale selection.
  assert.equal(needsBulkConfirm(withItems({ allowed: 1 })), false);
});

test("more than one silent item IS gated", () => {
  assert.equal(needsBulkConfirm(withItems({ allowed: 2 })), true);
  assert.equal(needsBulkConfirm(withItems({ allowed: 9 })), true);
});

test("one file caught alongside a hub is gated — that file is the hazard", () => {
  // The hub asks for itself by name; the file would have gone silently.
  assert.equal(
    needsBulkConfirm(withItems({ allowed: 1, own_hubs: 1 })),
    true,
  );
});

test("hubs only are NOT gated — each already asks by name", () => {
  // Adding a gate here would put a question in front of questions.
  assert.equal(needsBulkConfirm(withItems({ own_hubs: 3 })), false);
  assert.equal(needsBulkConfirm(withItems({ other_hubs: 2 })), false);
  assert.equal(
    needsBulkConfirm(withItems({ own_hubs: 1, other_hubs: 1, hubs_inside: 1 })),
    false,
  );
});

test("rejected and locked items do not make an action bulk", () => {
  // Nothing happens to them, so they must not push a single real trash over the
  // threshold and start asking.
  assert.equal(
    needsBulkConfirm(withItems({ allowed: 1, rejected: 5, locked: 5 })),
    false,
  );
});

test("an action with nothing actionable is not gated", () => {
  assert.equal(needsBulkConfirm(emptyBuckets()), false);
  assert.equal(needsBulkConfirm(withItems({ rejected: 3 })), false);
  assert.equal(needsBulkConfirm({}), false);
  assert.equal(needsBulkConfirm(), false);
});

// ───────── actionableCount ─────────

test("actionableCount counts what will be touched, and only that", () => {
  assert.equal(
    actionableCount(withItems({
      allowed: 2, own_hubs: 1, other_hubs: 1, hubs_inside: 1,
      rejected: 4, locked: 3,
    })),
    5,
  );
});

test("actionableCount survives a partial or missing shape", () => {
  assert.equal(actionableCount(emptyBuckets()), 0);
  assert.equal(actionableCount({ allowed: ["a"] }), 1);
  assert.equal(actionableCount({}), 0);
  assert.equal(actionableCount(), 0);
});
