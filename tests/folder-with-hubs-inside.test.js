#!/usr/bin/env node

/**
 * A FOLDER THAT CONTAINS HUBS IS NOT A HUB.
 *
 * Reported as: deleting a personal workspace says "Could not delete the
 * workspace. The listing has been restored." — from both the grid's own
 * context menu and the desk topbar's ⋯.
 *
 * THE CHAIN, end to end:
 *
 *   1. media/grid initContainer() raises `isHub` on ANY node whose `hubs`
 *      attribute is non-empty:
 *
 *        this.containsHub = filetype == _a.hub;
 *        if (!_.isEmpty(hubs)) { this.containsHub = true; this.isHub = 1; }
 *
 *      For a folder that means "there are hubs somewhere inside me", not
 *      "I am one" — and both flags are then set at once.
 *
 *   2. bucketFor tested `isHub` BEFORE `isFolder && containsHub`, so the
 *      hubs_inside branch was unreachable for every tile that could ever
 *      qualify for it. Such a folder went to `own_hubs`.
 *
 *   3. own_hubs → Wm.confirmRemoveHub → POST hub.delete_hub with the tile's
 *      hub_id. For a PERSONAL workspace that id is the user's OWN entity — a
 *      personal workspace is a folder in the user's home, not a hub — so the
 *      server refused it:
 *
 *        if (data.type !== Attr.hub) return this.exception.user("WRONG_ENTITY_TYPE")
 *
 *      `exception.user` sets 400, and the caller answered it with
 *      DELETE_WORKSPACE_FAILED + Wm.reload().
 *
 * Stage's access log for vowaw91171@robustq.com, 2026-09-04:
 *
 *   02:38:50 GET  media.attributes?hub_id=745df7d0745df7d5&nid=33c81b2e33c81b32
 *   02:38:54 POST hub.delete_hub                                           400
 *   02:38:55 GET  desk.home  (the failure's reload)
 *
 * 33c81b2e33c81b32 is `rrr`, and desk.home reports `hubs = 34df038c34df0391`
 * for it. The account's other personal workspaces carry no hubs and deleted
 * perfectly well — which is what made this look like a personal-workspace bug
 * rather than a contains-a-hub one.
 *
 * Run from ui-team with:
 *   node --test tests/folder-with-hubs-inside.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const { bucketFor, emptyBuckets } = require(
  join(REPO_ROOT, "src/drumee/libs/media-selection.js"),
);
const GRID = read("src/drumee/builtins/media/grid/index.js");
const WM = read("src/drumee/modules/desk/wm/index.js");
const DESK = read("src/drumee/modules/desk/index.js");

function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  const open = src.indexOf("{", start + header.length - 1);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  assert.fail(`${header} unbalanced`);
}

// ── the premise still holds ────────────────────────────────────────────────

test("a grid tile still raises isHub for a folder with hubs inside", () => {
  // If this ever stops being true the ordering below is merely harmless
  // rather than load-bearing — but it is true today, and it is why the
  // hubs_inside branch was dead.
  const body = slice(GRID, "  initContainer() {");
  const stripped = body.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /if \(!_\.isEmpty\(hubs\)\) \{/);
  assert.match(stripped, /this\.isHub = 1;/);
  assert.match(stripped, /this\.containsHub = true;/);
});

// ── the classifier ─────────────────────────────────────────────────────────

// `rrr`, as its grid tile describes itself: BOTH flags, because of the above.
const RRR = {
  isFolder: true,
  containsHub: true,
  isHub: true,
  isOwner: true,
  canRemove: true,
};

test("a personal workspace with a hub inside goes to hubs_inside", () => {
  assert.equal(
    bucketFor(RRR),
    "hubs_inside",
    "own_hubs is what posted hub.delete_hub with the user's own id",
  );
});

test("…and NOT to own_hubs, whoever owns it", () => {
  assert.notEqual(bucketFor({ ...RRR, isOwner: false }), "own_hubs");
  assert.notEqual(bucketFor({ ...RRR, isOwner: false }), "other_hubs");
  assert.equal(bucketFor({ ...RRR, isOwner: false }), "hubs_inside");
});

test("a REAL hub is still own_hubs — it is never a folder", () => {
  // initContainer sets containsHub for a hub too (filetype == hub), so the new
  // first test would catch it if isFolder were ever set alongside. initData
  // (ui-core mfs.js) sets exactly one of isHub / isFolder from the filetype.
  const hub = { isHub: true, containsHub: true, isOwner: true, canRemove: true };
  assert.equal(bucketFor(hub), "own_hubs");
  assert.equal(bucketFor({ ...hub, isOwner: false }), "other_hubs");
});

test("a plain personal workspace is still trashed outright", () => {
  // 111 / 222(1): no hubs inside, so no isHub and no question.
  assert.equal(
    bucketFor({ isFolder: true, containsHub: false, canRemove: true }),
    "allowed",
  );
});

test("locked still wins over everything", () => {
  assert.equal(bucketFor({ ...RRR, locked: true }), "locked");
});

test("a folder with hubs it cannot remove is still hubs_inside, not rejected", () => {
  // The order is the behaviour: this folder gets its own question rather than
  // a flat refusal, exactly as before for the case that used to reach it.
  assert.equal(bucketFor({ ...RRR, canRemove: false }), "hubs_inside");
});

test("every bucket is still reachable", () => {
  const seen = new Set(
    [
      { locked: true },
      { isHub: true, isOwner: true },
      { isHub: true, isOwner: false },
      { isFolder: true, containsHub: true },
      { canRemove: true },
      { canRemove: false },
    ].map(bucketFor),
  );
  assert.deepEqual(
    [...seen].sort(),
    Object.keys(emptyBuckets()).sort(),
    "a bucket became unreachable — which is the bug this fixes",
  );
});

// ── hubs_inside actually handles it ────────────────────────────────────────

test("confirmRemoveHubsInside deletes the INNER hubs by their own ids", () => {
  const body = slice(WM, "  confirmRemoveHubsInside(media) {");
  // It reads the `hubs` list off the tile, resolves each, and deletes the hub
  // by `actual_hub_id` — never by the folder's own hub_id, which is what the
  // own_hubs path got wrong.
  assert.match(body, /media\.mget\(_a\.hubs\)/);
  assert.match(body, /hub_id: item\.actual_hub_id/);
  assert.ok(
    !/hub_id: media\.mget\(_a\.hub_id\)/.test(body),
    "it must not post the FOLDER's hub_id as a hub to delete",
  );
  // …and then trashes the folder itself.
  assert.match(body, /media\.putIntoTrash\(1\)/);
});

// ── the topbar ⋯ is the grid's menu, opened from elsewhere ─────────────────

test("the topbar menu dispatches to the media item, as the grid's does", () => {
  const body = slice(DESK, "  _toggleWorkspaceMenu(cmd) {");
  const stripped = body.replace(/\/\/[^\n]*/g, "");
  // ui-core buildContextmenu: `p.contextmenuSkeleton(p, trigger, e)` with the
  // tile as both, then `uiHandler: [p]`.
  assert.match(stripped, /item\(target, target, k\)/, "the trigger is still the ⋯ button");
  assert.match(stripped, /uiHandler: \[target\]/);
});

test("it carries the media family, like every other contextmenu", () => {
  const body = slice(DESK, "  _toggleWorkspaceMenu(cmd) {");
  const stripped = body.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /drumee-contextmenu \$\{/);
  assert.match(stripped, /target\.fig && target\.fig\.family/);
  assert.match(stripped, /desk-module-topbar/, "the topbar token must survive");
});
