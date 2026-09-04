#!/usr/bin/env node

/**
 * Move on a WORKSPACE goes to media.merge_workspace — and ONLY on a real one.
 *
 * THE TRAP THIS PINS DOWN. media/grid initContainer() raises `isHub` on any
 * node whose `hubs` attribute is non-empty:
 *
 *     this.containsHub = filetype == _a.hub;
 *     if (!_.isEmpty(hubs)) { this.containsHub = true; this.isHub = 1; }
 *
 * For a FOLDER that means "there are hubs somewhere inside me", not "I am
 * one" — and both flags are set at once. That overload is what sent
 * folders-with-workspaces to hub.delete_hub and answered 400
 * WRONG_ENTITY_TYPE, and it is why libs/media-selection bucketFor now tests
 * hubs_inside BEFORE isHub.
 *
 * move() has exactly the same shape of decision. Keyed on `isHub`, its
 * workspace branch would hijack the move of any folder that happens to hold a
 * workspace: it would post merge_workspace with that folder's hub_id — the
 * user's OWN entity id for anything living in their home — and the server
 * would refuse it, so a folder that used to move fine could not move at all.
 * It keys on `filetype` instead, which is the flag that means "I am one" and
 * is what the move picker keys on too.
 *
 * THE OTHER HALF. merge_workspace is scope:hub on the SOURCE workspace, so it
 * needs `hub_id` = the workspace ITSELF. That differs from Move to trash,
 * which scopes a hub node by `holder_id` because it acts on the card sitting
 * on the user's desk. Sending holder_id here would scope the request to the
 * user's own drumate entity and come back WRONG_ENTITY_TYPE.
 *
 * Run from ui-team with:
 *   node --test tests/workspace-merge-move.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const INTERACT = read("src/drumee/builtins/media/interact.js");
const PICKER = read("src/drumee/builtins/window/move/move-window.js");
const GRID = read("src/drumee/builtins/media/grid/index.js");
const LOCALE_EN = JSON.parse(read("locale/en.json"));

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

function method(src, header, globals) {
  const body = slice(src, header);
  const names = Object.keys(globals);
  const name = header.replace(/^async\s+/, "").split("(")[0].trim();
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return ({ ${body} }).${name};`)(
    ...names.map((n) => globals[n]),
  );
}

// `.format` is an app-provided String extension (ui-essentials), absent in
// plain node. Stub it exactly as the app behaves so the method under test can
// compose its dialog text; without it the strings throw, and this file is the
// reason that throw is no longer mistaken for a cancellation.
if (typeof String.prototype.format !== "function") {
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : args[i]));
  };
}

const _a = {
  hub_id: "hub_id",
  filename: "filename",
  filetype: "filetype",
  hub: "hub",
  nid: "nid",
};

// ── the premise this rests on ──────────────────────────────────────────────

test("the grid really does raise isHub on a folder that only CONTAINS hubs", () => {
  // If this ever stops being true, keying on filetype is merely redundant
  // rather than required — but it is true today, and it is the whole reason.
  assert.match(
    GRID,
    /this\.containsHub\s*=\s*true;\s*\n\s*this\.isHub\s*=\s*1;/,
    "media/grid no longer sets isHub for a folder containing hubs",
  );
});

// ── the branch ─────────────────────────────────────────────────────────────

test("move() routes to the workspace path on filetype, never on bare isHub", () => {
  const body = slice(INTERACT, "  move() {");
  assert.match(
    body,
    /if \(this\.mget\(_a\.filetype\) === _a\.hub\) \{\s*\n\s*return this\._mergeWorkspaceInto\(/,
    "move() must decide the workspace branch on filetype",
  );
  assert.ok(
    !/if \(this\.isHub\)\s*\{\s*\n\s*return this\._mergeWorkspaceInto\(/.test(body),
    "move() must NOT gate the workspace branch on isHub — a folder that "
      + "contains workspaces sets that flag too",
  );
});

// ── what the workspace path sends ──────────────────────────────────────────

function runMerge(destinations, opt = {}) {
  const posted = [];
  const said = [];
  const alerted = [];
  const item = {
    mget(k) {
      if (k === _a.hub_id) return opt.hubId || "WORKSPACE_A";
      if (k === _a.filename) return opt.name || "Workspace A";
      return null;
    },
    warn() {},
    postService(payload) {
      posted.push(payload);
      if (opt.reject) return Promise.reject(opt.reject);
      return Promise.resolve(opt.response || { status: "MERGED", remaining: 0 });
    },
  };
  const globals = {
    _a,
    LOCALE: LOCALE_EN,
    SERVICE: { media: {} },
    Butler: { say: (m) => said.push(m) },
    Wm: {
      alert: (m) => { alerted.push(m); },
      confirm: () => (opt.cancel ? Promise.reject({}) : Promise.resolve()),
    },
  };
  const fn = method(INTERACT, "async _mergeWorkspaceInto(targetDestinations = [])", globals);
  return fn.call(item, destinations).then(() => ({ posted, said, alerted }));
}

const DEST = { hub_id: "WORKSPACE_B", nid: "B_HOME_NODE", wsName: "Workspace B" };

test("scopes the request to the SOURCE WORKSPACE, not to holder_id", async () => {
  const { posted } = await runMerge([DEST]);
  assert.equal(posted.length, 1);
  assert.deepEqual(posted[0], {
    service: "media.merge_workspace",
    hub_id: "WORKSPACE_A",
    nid: "0",
    recipient_id: "WORKSPACE_B",
    pid: "B_HOME_NODE",
  });
});

test("refuses more than one destination, and posts nothing", async () => {
  const { posted, alerted } = await runMerge([DEST, { ...DEST, hub_id: "C" }]);
  assert.equal(posted.length, 0, "a merge must not fan out to several workspaces");
  assert.equal(alerted[0], LOCALE_EN.MERGE_WORKSPACE_ONE_DESTINATION);
});

test("refuses a workspace as its own destination, and posts nothing", async () => {
  const { posted, alerted } = await runMerge([{ ...DEST, hub_id: "WORKSPACE_A" }]);
  assert.equal(posted.length, 0);
  assert.equal(alerted[0], LOCALE_EN.MERGE_WORKSPACE_SAME);
});

test("a cancelled confirmation posts nothing and says nothing", async () => {
  const { posted, alerted, said } = await runMerge([DEST], { cancel: true });
  assert.equal(posted.length, 0);
  assert.equal(alerted.length, 0, "cancelling is not a failure");
  assert.equal(said.length, 0);
});

test("an empty source is SPOKEN, never reported as a success", async () => {
  const { alerted, said } = await runMerge([DEST], {
    response: { status: "SOURCE_EMPTY", merged: 0 },
  });
  assert.equal(alerted.length, 1, "SOURCE_EMPTY must be surfaced");
  assert.equal(said.length, 0, "and must NOT be announced as a completed move");
});

test("a partial move is SPOKEN, never reported as a success", async () => {
  const { alerted, said } = await runMerge([DEST], {
    response: { status: "MERGED", merged: 2, remaining: 1 },
  });
  assert.equal(alerted.length, 1, "a partial merge must be surfaced");
  assert.equal(said.length, 0);
});

test("a clean merge is announced once", async () => {
  const { alerted, said } = await runMerge([DEST]);
  assert.equal(alerted.length, 0);
  assert.equal(said.length, 1);
});

// ── the picker's guard ─────────────────────────────────────────────────────

test("the picker blocks the moved workspace by hub_id, not only by nid", () => {
  assert.match(
    PICKER,
    /this\._blockedHubIds = new Set\(/,
    "the picker must collect blocked hub ids",
  );
  const guard = slice(PICKER, "  _isBlockedDest(node = {}) {");
  assert.match(
    guard,
    /blockedHubs\.has\(String\(node\.hub_id\)\)/,
    "_isBlockedDest must consult the hub ids",
  );
  // A workspace destination row carries the hub's ROOT node as its nid, which
  // is NOT the card's id, so the nid set alone can never match it.
  assert.match(
    PICKER,
    /nid = ws\.actual_home_id \|\| ws\.home_id/,
    "the premise: a workspace row's nid is its root node, not its hub id",
  );
});

// ── the strings ────────────────────────────────────────────────────────────

test("every LOCALE key the workspace path uses exists", () => {
  for (const k of [
    "MERGE_WORKSPACE_TITLE",
    "MERGE_WORKSPACE_CONFIRM",
    "MERGE_WORKSPACE_KEEPS",
    "MERGE_WORKSPACE_ONE_DESTINATION",
    "MERGE_WORKSPACE_SAME",
    "MERGE_WORKSPACE_EMPTY",
    "MERGE_WORKSPACE_PARTIAL",
    "MERGE_WORKSPACE_DONE",
    "MOVE",
    "MOVE_FAILED",
    "WORKSPACE",
  ]) {
    assert.ok(LOCALE_EN[k], `locale/en.json is missing ${k}`);
  }
});

test("the confirmation states what does NOT move", () => {
  const keeps = LOCALE_EN.MERGE_WORKSPACE_KEEPS;
  for (const word of ["Chat", "tasks", "meetings", "share links", "lose access"]) {
    assert.ok(
      keeps.includes(word),
      `the confirmation must mention ${word} — it is what the user loses`,
    );
  }
});
