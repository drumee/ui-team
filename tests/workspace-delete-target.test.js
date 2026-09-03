#!/usr/bin/env node

/**
 * Deleting a workspace from the switcher ⋯ menu must actually delete it.
 *
 * THE BUG. `folder-delete` → confirmFolderDelete() resolved its target through
 * getFolderActionTarget(), which ends in `|| this`:
 *
 *   return this.mget(_a.trigger) || this.mget(_a.media) || this;
 *
 * A window is not a media view. `trash()` and `delete()` live on
 * builtins/media/core; nothing in the window_folder chain (folder → interact →
 * core → utils/__window_mfs → ui-core DrumeeMFS) defines either. So both
 * branches of
 *
 *   if (target?.trash) return target.trash();
 *   if (target?.delete) return target.delete();
 *
 * missed, and the action was a SILENT no-op: confirm pressed, settings closed,
 * no request, no error.
 *
 * It worked only by accident of how the workspace was opened. `media` /
 * `trigger` are set on exactly one launch path — opening a node from its grid
 * tile (desk/wm/index.js passes `media` and `trigger: media`) — while
 * Wm.loadWorkspace (switcher row, sidebar row, boot default) sets neither.
 *
 * Reported against vowaw91171@robustq.com / workspace "test(1)", where
 * privilege was 63, the entity active, and the hub database intact — nothing
 * was wrong with the data.
 *
 * The fixtures use that account's real id shapes, read off stage:
 *   hub tile       nid === hub_id      (desk.home lists the hub placeholder)
 *   personal tile  nid = folder nid, hub_id = the USER's id
 *
 * Run from ui-team with:
 *   node --test tests/workspace-delete-target.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const FOLDER = read("src/drumee/builtins/window/folder/index.js");
const UTILS = read("src/drumee/builtins/window/utils.js");
const MEDIA_CORE = read("src/drumee/builtins/media/core.js");
const WM = read("src/drumee/modules/desk/wm/index.js");

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

// ── the premise: only media views can trash ────────────────────────────────

test("trash() exists on media/core and NOWHERE in the window chain", () => {
  assert.match(MEDIA_CORE, /^  trash\(\) \{/m, "media/core must own trash()");
  for (const [label, src] of [
    ["window/folder", FOLDER],
    ["window/utils", UTILS],
  ]) {
    assert.ok(
      !/^\s{2}(async\s+)?(trash|delete)\s*\(\s*\)/m.test(src),
      `${label} defines trash/delete — the premise of this fix changed`,
    );
  }
});

test("only the grid-tile launch passes media/trigger", () => {
  // The one place that sets them.
  assert.match(WM, /trigger:\s*media,/, "the tile path must still pass trigger");
  // loadWorkspace's window_folder payload must NOT — that is the broken path.
  const body = slice(WM, "    const apply = (data) => {");
  assert.ok(
    !/\b(media|trigger):/.test(body),
    "loadWorkspace now passes a media view; this fix may be redundant",
  );
});

// ── the resolver, run for real ─────────────────────────────────────────────

const USER_ID = "745df7d0745df7d5";

// vowaw91171@robustq.com's "test(1)", read off stage.
const HUB_TILE = {
  isHub: true,
  isFolder: false,
  _nid: "b5d38adab5d38ade",
  trash() {
    return "trashed:hub";
  },
  mget(k) {
    return k === "nid" ? this._nid : k === "filename" ? "test(1)" : undefined;
  },
};
const PERSONAL_TILE = {
  isHub: false,
  isFolder: true,
  _nid: "c58792dbc58792df",
  trash() {
    return "trashed:personal";
  },
  mget(k) {
    return k === "nid"
      ? this._nid
      : k === "filename"
        ? "Personal Workspace"
        : undefined;
  },
};
// A node deeper in the tree that happens to share the user's id — what a
// hub_id-based lookup for a personal workspace could land on.
const DECOY = {
  isHub: false,
  isFolder: false,
  _nid: USER_ID,
  trash() {
    return "trashed:DECOY";
  },
  mget(k) {
    return k === "nid" ? this._nid : undefined;
  },
};

/** Wm.getItemsByAttr as ui-core implements it: strict === over the tree. */
function makeWm(tiles) {
  return {
    getItemsByAttr: (attr, val) =>
      tiles.filter((t) => t.mget(attr) === val),
    alert(msg) {
      this.alerted = msg;
    },
    alerted: null,
  };
}

function makeHost(win, Wm) {
  const globals = { _: require("underscore"), _a: A, Wm, Visitor: { id: USER_ID } };
  const host = Object.create({
    _findMediaByNid: method(UTILS, "_findMediaByNid(nid) {", globals),
    _workspaceTrashTarget: method(FOLDER, "_workspaceTrashTarget() {", globals),
  });
  Object.assign(host, win);
  return host;
}

const A = {
  nid: "nid",
  hub_id: "hub_id",
  trigger: "trigger",
  media: "media",
  filename: "filename",
};

/** A window as Wm.loadWorkspace builds it: no media, no trigger. */
const viaSwitcher = (attrs) => ({
  warn() {},
  mget(k) {
    return attrs[k];
  },
});

test("hub workspace via the switcher: resolves its own tile", () => {
  const Wm = makeWm([HUB_TILE, PERSONAL_TILE]);
  const host = makeHost(
    // A hub window's own nid is the ROOT node inside the hub, not the tile's.
    viaSwitcher({ hub_id: HUB_TILE._nid, nid: "b67d187ab67d187e" }),
    Wm,
  );
  const t = host._workspaceTrashTarget();
  assert.equal(t, HUB_TILE, "this is the reported bug — it used to be null");
  assert.equal(t.trash(), "trashed:hub");
});

test("personal workspace: resolved by nid, NOT by the user hub_id", () => {
  const Wm = makeWm([HUB_TILE, PERSONAL_TILE, DECOY]);
  const host = makeHost(
    // hub_id IS the user's id for a personal workspace.
    viaSwitcher({ hub_id: USER_ID, nid: PERSONAL_TILE._nid }),
    Wm,
  );
  const t = host._workspaceTrashTarget();
  assert.equal(
    t,
    PERSONAL_TILE,
    "looking up by hub_id would have found the decoy sharing the user's id",
  );
  assert.notEqual(t, DECOY);
});

test("the grid-tile path still wins outright", () => {
  const explicit = { trash: () => "trashed:explicit" };
  const Wm = makeWm([HUB_TILE]);
  const host = makeHost(
    {
      warn() {},
      mget: (k) => (k === "trigger" ? explicit : undefined),
    },
    Wm,
  );
  assert.equal(host._workspaceTrashTarget(), explicit);
});

test("no tile in the tree → null, never the window itself", () => {
  const Wm = makeWm([]);
  const win = viaSwitcher({ hub_id: HUB_TILE._nid, nid: "x" });
  const host = makeHost(win, Wm);
  const t = host._workspaceTrashTarget();
  assert.equal(t, null);
  assert.notEqual(t, host, "returning the window is what made this silent");
});

test("a same-id node of the wrong TYPE is rejected", () => {
  // nid matches the hub id, but it is not a hub.
  const impostor = { ...HUB_TILE, isHub: false, isFolder: false };
  impostor.mget = HUB_TILE.mget.bind(impostor);
  const Wm = makeWm([impostor]);
  const host = makeHost(viaSwitcher({ hub_id: HUB_TILE._nid, nid: "x" }), Wm);
  assert.equal(host._workspaceTrashTarget(), null);
});

test("a tile without trash() is rejected", () => {
  const noTrash = { isHub: true, isFolder: false, mget: (k) => (k === "nid" ? "H" : undefined) };
  const Wm = makeWm([noTrash]);
  const host = makeHost(viaSwitcher({ hub_id: "H", nid: "x" }), Wm);
  assert.equal(host._workspaceTrashTarget(), null);
});

test("a numeric id on either side still matches", () => {
  const numeric = {
    isHub: true,
    isFolder: false,
    trash: () => "ok",
    mget: (k) => (k === "nid" ? 12345 : undefined),
  };
  const Wm = makeWm([numeric]);
  const host = makeHost(viaSwitcher({ hub_id: "12345", nid: "x" }), Wm);
  assert.equal(host._workspaceTrashTarget(), numeric);
});

test("missing hub_id and nid → null, no throw", () => {
  const Wm = makeWm([HUB_TILE]);
  const host = makeHost(viaSwitcher({}), Wm);
  assert.equal(host._workspaceTrashTarget(), null);
});

// ── confirmFolderDelete, run for real ──────────────────────────────────────
//
// TWO CORRECTIONS, in order.
//
// 1. `trash()` vs `delete()`. trash() is the FILE path (media/core
//    putIntoTrash -> SERVICE.media.trash); a workspace goes through
//    hub.delete_hub. Every media view HAS trash(), so trying it first made the
//    delete() fallback dead code and sent workspaces down the file path —
//    request sent, hub not removed.
//
// 2. Needing a TILE at all. Resolving a media view and refusing without one
//    put "Could not delete the workspace" in front of a perfectly deletable
//    workspace: the ⋯ menu acts on the workspace the user has OPEN, and while
//    one is open the home grid that owns the tiles is `display: none`
//    (wm _syncHomeGrid), so its children are not something this path can count
//    on. A hub delete needs only the hub_id, which the window already has.

function makeWrapper({ confirmed = true } = {}) {
  const w = {
    fed: null,
    cleared: 0,
    feed(skel) {
      w.fed = skel;
    },
    clear() {
      w.cleared++;
    },
    children: {
      last: () => ({
        ask: () =>
          confirmed ? Promise.resolve() : Promise.reject(new Error("cancel")),
      }),
    },
  };
  return w;
}

const L = {
  DELETE: "Delete",
  CONFIRM_DELETE: "Confirm deletion of",
  DELETE_WORKSPACE_FAILED: "Could not delete the workspace.",
};

const HUB_ID = "b5d38adab5d38ade"; // "test(1)" on stage

function makeDeleteHost({ tile, Wm, wrapper, hubId = HUB_ID }) {
  const globals = {
    _: require("underscore"),
    _a: A,
    Wm,
    LOCALE: L,
    Visitor: { id: USER_ID },
  };
  const host = Object.create({
    confirmFolderDelete: method(FOLDER, "confirmFolderDelete() {", globals),
  });
  host.warn = () => {};
  host.mget = (k) =>
    k === "hub_id" ? hubId : k === "nid" ? "N" : k === "filename" ? "test(1)" : undefined;
  host.dialogWrapper = wrapper;
  host.closeFolderSettings = () => {
    host.closed = (host.closed || 0) + 1;
  };
  host._workspaceTrashTarget = () => tile;
  return host;
}

function deleteWm() {
  const calls = { removeWs: [], alerted: null, unselected: 0 };
  return {
    calls,
    confirmRemoveWorkspace(hub_id, filename, media) {
      calls.removeWs.push({ hub_id, filename, media });
      return Promise.resolve({});
    },
    alert(msg) {
      calls.alerted = msg;
    },
    unselect() {
      calls.unselected++;
    },
  };
}

/** A media tile that records which method was called on it. */
function tileView({ isHub }) {
  const calls = [];
  return {
    calls,
    isHub,
    isFolder: !isHub,
    isDestroyed: () => false,
    mget: (k) => (k === "filename" ? "test(1)" : undefined),
    trash() {
      calls.push("trash");
      return "trash";
    },
    delete() {
      calls.push("delete");
      return "delete";
    },
  };
}

test("a hub workspace deletes BY ID, with no tile at all", async () => {
  const Wm = deleteWm();
  const wrapper = makeWrapper();
  const host = makeDeleteHost({ tile: null, Wm, wrapper });
  await host.confirmFolderDelete();
  assert.equal(
    Wm.calls.removeWs.length,
    1,
    'this is the reported bug — it said "Could not delete the workspace"',
  );
  assert.equal(Wm.calls.removeWs[0].hub_id, HUB_ID);
  assert.equal(Wm.calls.alerted, null, "nothing failed");
});

test("the tile is passed along when there IS one, for the animation", async () => {
  const Wm = deleteWm();
  const t = tileView({ isHub: true });
  const host = makeDeleteHost({ tile: t, Wm, wrapper: makeWrapper() });
  await host.confirmFolderDelete();
  assert.equal(Wm.calls.removeWs[0].media, t);
  assert.deepEqual(t.calls, [], "the tile is scenery here, not the mechanism");
});

test("the hub branch raises no confirm of its own", async () => {
  const Wm = deleteWm();
  const wrapper = makeWrapper();
  const host = makeDeleteHost({ tile: null, Wm, wrapper });
  await host.confirmFolderDelete();
  assert.equal(
    wrapper.fed,
    null,
    "confirmRemoveWorkspace asks MSG_DELETE_HUB — ours would be a second dialog",
  );
});

test("a hub workspace never goes through trash()", async () => {
  const Wm = deleteWm();
  const t = tileView({ isHub: true });
  const host = makeDeleteHost({ tile: t, Wm, wrapper: makeWrapper() });
  await host.confirmFolderDelete();
  assert.ok(
    !t.calls.includes("trash"),
    "SERVICE.media.trash does not remove a hub",
  );
});

test("a PERSONAL workspace keeps its confirm and its tile path", async () => {
  // hub_id === the user's own id is what marks it: it is a home-root FOLDER,
  // with no delete_hub to run.
  const Wm = deleteWm();
  const wrapper = makeWrapper();
  const t = tileView({ isHub: false });
  const host = makeDeleteHost({ tile: t, Wm, wrapper, hubId: USER_ID });
  await host.confirmFolderDelete();
  assert.equal(Wm.calls.removeWs.length, 0, "there is no hub to delete");
  assert.match(wrapper.fed.message, /test\(1\)/);
  assert.deepEqual(t.calls, ["trash"]);
  assert.equal(Wm.calls.unselected, 1, "the selection must not go with it");
});

test("the personal branch must ask — its delete path never would", async () => {
  const Wm = deleteWm();
  const wrapper = makeWrapper({ confirmed: false });
  const t = tileView({ isHub: false });
  const host = makeDeleteHost({ tile: t, Wm, wrapper, hubId: USER_ID });
  await host.confirmFolderDelete();
  assert.notEqual(wrapper.fed, null);
  assert.deepEqual(t.calls, [], "cancel must delete nothing");
});

test("a personal workspace with no tile fails loudly", async () => {
  const Wm = deleteWm();
  const host = makeDeleteHost({
    tile: null,
    Wm,
    wrapper: makeWrapper(),
    hubId: USER_ID,
  });
  await host.confirmFolderDelete();
  assert.equal(Wm.calls.alerted, L.DELETE_WORKSPACE_FAILED);
});

// ── Wm.confirmRemoveWorkspace ──────────────────────────────────────────────

test("it runs delete_hub, and needs no media view to do it", () => {
  const body = slice(WM, "  confirmRemoveWorkspace(hub_id, filename, media) {");
  assert.match(body, /SERVICE\.hub\.delete_hub/);
  assert.match(body, /kind: "window_confirm"/, "it asks its own question");
  assert.match(body, /MSG_DELETE_HUB/, "with the workspace-specific copy");
  // The echo that closes open windows of the hub.
  assert.match(body, /filetype: _a\.hub/);
  assert.match(body, /WS_EVENT/);
  // The tile is optional throughout.
  assert.match(body, /const animation = tile\s*\?/);
  assert.match(body, /if \(tile && _\.isFunction\(tile\.suppress\)\)/);
});

test("the echo it sends is enough for removeContent to close the pane", () => {
  // removeContent's hub branch keys on hub_id + filetype, NOT on a path — which
  // is what makes a tile-free echo sufficient.
  const rc = slice(UTILS, "removeContent(args) {");
  assert.match(rc, /sameHub && args\.filetype === _a\.hub/);
});

test("a failed request still explains itself and restores the listing", () => {
  const body = slice(WM, "  confirmRemoveWorkspace(hub_id, filename, media) {");
  assert.match(body, /DELETE_WORKSPACE_FAILED/);
  assert.match(body, /this\.reload\(\)/);
});
