#!/usr/bin/env node

/**
 * DELETING A PERSONAL WORKSPACE.
 *
 * Reported as: the workspace does not go, and "Could not delete the workspace.
 * The listing has been restored." (LOCALE.DELETE_WORKSPACE_FAILED) appears.
 *
 * THE BUG. confirmFolderDelete() took the hub off the home-grid tile when the
 * same message was reported for hub workspaces, and left PERSONAL on it:
 *
 *   const tile = this._workspaceTrashTarget();
 *   if (isHubWorkspace) return Wm.confirmRemoveWorkspace(hubId, filename, tile);
 *   if (!tile) { Wm.alert(LOCALE.DELETE_WORKSPACE_FAILED); return; }
 *   ... tile.trash()
 *
 * A personal workspace is a home-root FOLDER, so it has no delete_hub and the
 * tile was how it was trashed. But the ⋯ menu that offers Delete is only there
 * while the workspace is OPEN, and that is exactly when there may be no tile:
 * the home grid is `display: none` for the whole time one is open
 * (wm _syncHomeGrid), and a reload that restores straight into a workspace may
 * never have fetched the grid at all. No tile → the refusal above.
 *
 * AND THE SUCCESSFUL LOOKUP WAS WORSE. It keyed on `this.mget(_a.nid)`, which
 * openNode() (window/core.js) rewrites to whatever folder the pane is
 * browsing — so from inside a subfolder it trashed the SUBFOLDER.
 *
 * Reported against vowaw91171@robustq.com, whose three personal workspaces
 * (rrr / 111 / 222(1)) are home-root folders: `area` NULL, `hub_id` the user's
 * own id — read off stage, and the shape every fixture here uses.
 *
 * Run from ui-team with:
 *   node --test tests/personal-workspace-delete.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const FOLDER = read("src/drumee/builtins/window/folder/index.js");
const WM = read("src/drumee/modules/desk/wm/index.js");
const DESK = read("src/drumee/modules/desk/index.js");
const MEDIA_CORE = read("src/drumee/builtins/media/core.js");

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

// The account's real ids.
const USER = "745df7d0745df7d5";
const RRR = "33c81b2e33c81b32";
const W111 = "ef1c0513ef1c0518";
const W222 = "03edbded03edbdf1";
const HUB = "bcdd264ebcdd2654";
// A folder the user opened INSIDE 111 — what the pane's own nid becomes.
const INNER = "aa11bb22aa11bb23";

const A = new Proxy({}, { get: (_t, k) => String(k) });
const _ = require("underscore");

// ── confirmFolderDelete: the personal branch, run for real ─────────────────

function makeWindow({ attrs, cur, tile = null, node }) {
  const calls = { alerts: [], hub: null, personal: null, closed: 0 };
  const Wm = {
    _curWorkspace: cur,
    alert: (m) => calls.alerts.push(m),
    unselect: () => {},
    confirmRemoveWorkspace: (hub_id, filename, t) => {
      calls.hub = { hub_id, filename, tile: t };
    },
    confirmRemovePersonalWorkspace: (n, t) => {
      calls.personal = { node: n, tile: t };
    },
    mget: (k) => (cur ? cur[`wm_${k}`] : undefined),
  };
  const globals = {
    _,
    _a: A,
    Wm,
    Visitor: { id: USER },
    LOCALE: { DELETE_WORKSPACE_FAILED: "FAILED", DELETE: "Delete" },
  };
  const host = Object.create({
    confirmFolderDelete: method(FOLDER, "  confirmFolderDelete() {", globals),
    _personalWorkspaceNode: method(
      FOLDER,
      "  _personalWorkspaceNode() {",
      globals,
    ),
  });
  Object.assign(host, {
    mget: (k) => attrs[k],
    warn: () => {},
    closeFolderSettings: () => {
      calls.closed++;
    },
    _workspaceTrashTarget: () => tile,
    // Overridden only where a test wants to pin the node; otherwise the real
    // resolver runs.
    ...(node ? { _personalWorkspaceNode: () => node } : {}),
  });
  return { host, calls, Wm };
}

test("personal workspace with NO tile is deleted, not refused", () => {
  // THE REPORTED BUG. Open 111 from the switcher after a reload: the home grid
  // was never fetched, so there is no tile anywhere to find.
  const { host, calls } = makeWindow({
    attrs: { hub_id: USER, nid: W111, filename: "111", filepath: "/111" },
    cur: { hub_id: USER, nid: W111, wm_filepath: "/111", wm_filename: "111" },
    tile: null,
  });
  host.confirmFolderDelete();
  assert.deepEqual(calls.alerts, [], "it still refuses with the failure alert");
  assert.ok(calls.personal, "nothing was asked to delete the workspace");
  assert.equal(calls.personal.node.nid, W111);
  assert.equal(calls.personal.tile, null, "a tile is optional, not invented");
});

test("a tile, when there is one, is passed through for the animation", () => {
  const tile = { mget: () => "111", isDestroyed: () => false };
  const { host, calls } = makeWindow({
    attrs: { hub_id: USER, nid: W111, filename: "111" },
    cur: { hub_id: USER, nid: W111 },
    tile,
  });
  host.confirmFolderDelete();
  assert.equal(calls.personal.tile, tile);
});

test("a hub workspace still goes to the hub path", () => {
  const { host, calls } = makeWindow({
    attrs: { hub_id: HUB, nid: "someRootNid", filename: "ppp" },
    cur: { hub_id: HUB, nid: "someRootNid" },
  });
  host.confirmFolderDelete();
  assert.ok(calls.hub, "the hub branch was diverted");
  assert.equal(calls.hub.hub_id, HUB);
  assert.equal(calls.personal, null);
});

test("both branches close the settings panel", () => {
  for (const attrs of [
    { hub_id: USER, nid: W111 },
    { hub_id: HUB, nid: "r" },
  ]) {
    const { host, calls } = makeWindow({ attrs, cur: { hub_id: attrs.hub_id, nid: attrs.nid } });
    host.confirmFolderDelete();
    assert.equal(calls.closed, 1, `settings stayed open for ${attrs.hub_id}`);
  }
});

test("with no resolvable node it still SAYS so — never a silent no-op", () => {
  const { host, calls } = makeWindow({
    attrs: { hub_id: USER },
    cur: null,
    node: null,
  });
  host.confirmFolderDelete();
  assert.deepEqual(calls.alerts, ["FAILED"]);
  assert.equal(calls.personal, null);
});

// ── _personalWorkspaceNode: the WORKSPACE, not the pane's cursor ───────────

test("the open workspace wins over the folder the pane is browsing", () => {
  // The user opened 111, then navigated into a subfolder. openNode() rewrote
  // the pane's nid to that subfolder — deleting "the workspace" from there
  // used to trash the subfolder.
  const { host } = makeWindow({
    attrs: { hub_id: USER, nid: INNER, filepath: "/111/inner", filename: "inner" },
    cur: { hub_id: USER, nid: W111, wm_filepath: "/111", wm_filename: "111" },
  });
  const node = host._personalWorkspaceNode();
  assert.equal(node.nid, W111, "it targeted the subfolder, not the workspace");
  assert.equal(node.filepath, "/111");
  assert.equal(node.filename, "111");
  assert.equal(node.hub_id, USER);
});

test("with no workspace open it falls back to the window's own node", () => {
  const { host } = makeWindow({
    attrs: { hub_id: USER, nid: RRR, filepath: "/rrr", filename: "rrr" },
    cur: null,
  });
  const node = host._personalWorkspaceNode();
  assert.equal(node.nid, RRR);
  assert.equal(node.filepath, "/rrr");
});

test("a HUB is open: its context is not borrowed for a personal node", () => {
  // _curWorkspace points at a hub, so its nid is a node in ANOTHER database.
  const { host } = makeWindow({
    attrs: { hub_id: USER, nid: RRR, filepath: "/rrr" },
    cur: { hub_id: HUB, nid: "hubRootNid", wm_filepath: "/" },
  });
  assert.equal(host._personalWorkspaceNode().nid, RRR);
});

test("no nid anywhere → null, so the caller can say so", () => {
  const { host } = makeWindow({ attrs: { hub_id: USER }, cur: null });
  assert.equal(host._personalWorkspaceNode(), null);
});

// ── the request and the echo ───────────────────────────────────────────────

const REMOVE = slice(WM, "  confirmRemovePersonalWorkspace(node, media) {");

test("it posts the same media.trash request the tile always did", () => {
  // media/core makeTrashOptions: {service, nid: [{nid, hub_id}], hub_id}.
  const canonical = slice(MEDIA_CORE, "  makeTrashOptions() {");
  assert.match(canonical, /service:\s*svc/);
  assert.match(canonical, /nid:\s*list/);
  assert.match(REMOVE, /service:\s*SERVICE\.media\.trash/);
  assert.match(REMOVE, /nid:\s*\[\{\s*nid,\s*hub_id\s*\}\]/);
});

test("the echo uses media.remove — the name that travels", () => {
  // media.trash is the REQUEST name; the server broadcasts media.remove, and
  // the switcher's listener whitelists that one. Echoing the request name
  // would leave every service-filtered subscriber waiting for the server.
  const stripped = REMOVE.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /options:\s*\{\s*service:\s*"media\.remove"\s*\}/);
  const white = slice(DESK, "  _onWorkspaceWsEvent(args = {}) {").replace(
    /\/\/[^\n]*/g,
    "",
  );
  assert.ok(
    /media\\\.\(new\|remove\|rename\)/.test(white),
    "the switcher no longer whitelists media.remove",
  );
});

test("the echo carries what closes an open pane", () => {
  const stripped = REMOVE.replace(/\/\/[^\n]*/g, "");
  // removeContent short-circuits a HUB on hub_id; a folder is matched on its
  // path, so filepath is not optional decoration here.
  assert.match(stripped, /filepath\s*\?\s*\{\s*filepath\s*\}/);
  assert.match(stripped, /filetype:\s*_a\.folder/);
});

test("a failed request still explains itself and restores the listing", () => {
  const stripped = REMOVE.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /Butler\.say\(LOCALE\.DELETE_WORKSPACE_FAILED\)/);
  assert.match(stripped, /this\.reload\(\)/);
  // doRequest resolves undefined on failure, so no-data must count as one.
  assert.match(stripped, /!data \|\| data\.error/);
});

// ── the desk must not keep showing a workspace that is gone ────────────────

function makeWm({ cur }) {
  const seen = [];
  const globals = {
    _,
    _a: A,
    Visitor: { id: USER },
    SERVICE: { media: { trash: "media.trash" } },
  };
  const wm = Object.create({
    handleWsEvent: method(WM, "  handleWsEvent(args = {}) {", globals),
  });
  Object.assign(wm, {
    _curWorkspace: cur,
    onCurrentWorkspaceRemoved: (hub_id, nid) => seen.push({ hub_id, nid }),
  });
  return { wm, seen };
}

test("trashing the OPEN personal workspace tears the desk context down", () => {
  const { wm, seen } = makeWm({ cur: { hub_id: USER, nid: W111 } });
  wm.handleWsEvent({
    data: { nid: W111, hub_id: USER, filetype: "folder" },
    options: { service: "media.remove" },
  });
  assert.deepEqual(seen, [{ hub_id: USER, nid: W111 }]);
});

test("trashing a folder INSIDE it does not", () => {
  const { wm, seen } = makeWm({ cur: { hub_id: USER, nid: W111 } });
  wm.handleWsEvent({
    data: { nid: INNER, hub_id: USER, filetype: "folder" },
    options: { service: "media.remove" },
  });
  assert.deepEqual(seen, [], "an ordinary delete closed the workspace");
});

test("trashing a DIFFERENT personal workspace does not", () => {
  // They all carry the user's id, so hub_id alone cannot tell them apart.
  const { wm, seen } = makeWm({ cur: { hub_id: USER, nid: W111 } });
  for (const other of [RRR, W222]) {
    wm.handleWsEvent({
      data: { nid: other, hub_id: USER, filetype: "folder" },
      options: { service: "media.remove" },
    });
  }
  assert.deepEqual(seen, []);
});

test("a trash echo while a HUB is open is left alone", () => {
  const { wm, seen } = makeWm({ cur: { hub_id: HUB, nid: W111 } });
  wm.handleWsEvent({
    data: { nid: W111, hub_id: USER },
    options: { service: "media.remove" },
  });
  assert.deepEqual(seen, []);
});

test("a LIST of trashed nodes is read too", () => {
  // removeContent takes either shape, so this must as well.
  const { wm, seen } = makeWm({ cur: { hub_id: USER, nid: W111 } });
  wm.handleWsEvent({
    data: [{ nid: INNER, hub_id: USER }, { nid: W111, hub_id: USER }],
    options: { service: "media.remove" },
  });
  assert.deepEqual(seen, [{ hub_id: USER, nid: W111 }]);
});

test("no workspace open: a trash echo is harmless", () => {
  const { wm, seen } = makeWm({ cur: null });
  assert.doesNotThrow(() =>
    wm.handleWsEvent({
      data: { nid: W111, hub_id: USER },
      options: { service: "media.remove" },
    }),
  );
  assert.deepEqual(seen, []);
});

test("delete_hub still reaches the hook with NO nid", () => {
  // The hub callers must keep matching on hub_id alone — a hub's echo nid is
  // the hub id, not the pane's node.
  const { wm, seen } = makeWm({ cur: { hub_id: HUB, nid: "r" } });
  wm.handleWsEvent({
    data: { hub_id: HUB, nid: HUB, filetype: "hub" },
    options: { service: "hub.delete_hub" },
  });
  assert.deepEqual(seen, [{ hub_id: HUB, nid: undefined }]);
});

// ── onCurrentWorkspaceRemoved: the nid gate ────────────────────────────────

function runRemoved(cur, args) {
  const reset = [];
  const globals = { _, _a: A, window: {} };
  const fn = method(WM, "  onCurrentWorkspaceRemoved(hub_id, nid) {", globals);
  const wm = {
    _curWorkspace: cur,
    _wsGeneration: 0,
    mset: (v) => reset.push(v),
    warn: () => {},
    isDestroyed: () => true,
  };
  fn.apply(wm, args);
  return { wm, reset };
}

test("a nid that does not match leaves the context alone", () => {
  const { wm, reset } = runRemoved({ hub_id: USER, nid: W111 }, [USER, RRR]);
  assert.ok(wm._curWorkspace, "another personal workspace's delete cleared it");
  assert.deepEqual(reset, []);
});

test("a matching nid clears it", () => {
  const { wm, reset } = runRemoved({ hub_id: USER, nid: W111 }, [USER, W111]);
  assert.equal(wm._curWorkspace, null);
  assert.equal(reset.length, 1);
});

test("NO nid keeps the hub behaviour: hub_id alone decides", () => {
  const { wm } = runRemoved({ hub_id: HUB, nid: "r" }, [HUB]);
  assert.equal(wm._curWorkspace, null);
});
