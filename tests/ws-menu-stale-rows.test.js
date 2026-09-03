#!/usr/bin/env node

/**
 * The switcher must show workspaces that EXIST.
 *
 * Two independent reasons a removed workspace kept showing in
 * `.desk-module-topbar__ws-menu`, both covered here.
 *
 * ── 1. The server still sends it ──────────────────────────────────────────
 * `desk.home` runs mfs_show_node_by, which for a hub FILTERS on the media
 * placeholder's status but RETURNS the entity's:
 *
 *   WHERE ... m.`status` NOT IN ('hidden', 'deleted')
 *   COALESCE(he.status, m.status) AS status
 *
 * A hub whose entity is deleted or frozen keeps an `active` placeholder row
 * under the user's home, so it passes the filter and arrives carrying
 * `status: "deleted"`. Confirmed against the DEPLOYED proc, not just the repo
 * copy. `_fetchWorkspaces` had no status filter, so it was rendered.
 *
 * The fixtures below are the real shapes read off a local instance:
 * `mfs_show_node_by(home, uid, 'rank', 'asc', 1)` returns the "System" public
 * hub with `status: "system"`, which the area gate alone lets through.
 *
 * ── 2. Nothing told the switcher it was gone ──────────────────────────────
 * `workspace:refresh` fires on CREATE only. Removal is announced on Wm's
 * `ws:event`, which the sidebar has always listened to and the desk did not.
 *
 * Run from ui-team with:
 *   node --test tests/ws-menu-stale-rows.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");
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

/** Compile one class method into a standalone function. */
function method(src, header, globals) {
  const body = slice(src, header);
  const names = Object.keys(globals);
  const name = header.replace(/^async\s+/, "").split("(")[0].trim();
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return ({ ${body} }).${name};`)(
    ...names.map((n) => globals[n]),
  );
}

const _a = {
  folder: "folder",
  hub: "hub",
  personal: "personal",
  home_id: "home_id",
};

const GLOBALS = {
  _: require("underscore"),
  _a,
  SERVICE: { desk: { home: "desk.home" } },
  Visitor: { id: "V1", get: (k) => (k === "home_id" ? "HOME1" : null) },
};

const fetchWorkspaces = method(DESK, "async _fetchWorkspaces(force) {", GLOBALS);

function hostWith(rows) {
  return {
    _workspaces: null,
    warn() {},
    fetchService: () => Promise.resolve(rows),
  };
}
const names = (list) => list.map((r) => r.filename);

// ── fixtures: the real desk.home type=node payload from a local instance ────

const LIVE_ROWS = [
  { filename: "Photos", filetype: "folder", area: null, status: "active" },
  { filename: "Documents", filetype: "folder", area: null, status: "active" },
  { filename: "System", filetype: "hub", area: "public", status: "system" },
  { filename: "admin internal sharebox", filetype: "hub", area: "private", status: "active" },
  { filename: "admin external sharebox", filetype: "hub", area: "dmz", status: "active" },
  { filename: "onboarding", filetype: "hub", area: "public", status: "active" },
];

test("a deleted hub the server still sends is dropped", async () => {
  const rows = await fetchWorkspaces.call(
    hostWith([
      { filename: "Alive", filetype: "hub", area: "private", status: "active" },
      { filename: "Deleted", filetype: "hub", area: "private", status: "deleted" },
    ]),
  );
  assert.deepEqual(names(rows), ["Alive"], "this is the reported bug");
});

test("frozen and hidden are dropped too — the same leak sends them", async () => {
  const rows = await fetchWorkspaces.call(
    hostWith([
      { filename: "Frozen", filetype: "hub", area: "private", status: "frozen" },
      { filename: "Hidden", filetype: "hub", area: "share", status: "hidden" },
      { filename: "Alive", filetype: "hub", area: "share", status: "active" },
    ]),
  );
  assert.deepEqual(names(rows), ["Alive"]);
});

test("a deleted PERSONAL workspace (home-root folder) is dropped", async () => {
  const rows = await fetchWorkspaces.call(
    hostWith([
      { filename: "Gone", filetype: "folder", area: null, status: "deleted" },
      { filename: "Kept", filetype: "folder", area: null, status: "active" },
    ]),
  );
  assert.deepEqual(names(rows), ["Kept"], "folders pass the area gate unconditionally");
});

test("the live payload: System is out, dmz stays out, the rest stay in", async () => {
  const rows = await fetchWorkspaces.call(hostWith(LIVE_ROWS));
  assert.deepEqual(
    names(rows).sort(),
    ["Documents", "Photos", "admin internal sharebox", "onboarding"].sort(),
    "System (status=system) was listed as a user workspace; area=public let it "
      + "through the only gate there was",
  );
});

test("a row with NO status still passes — an over-full menu beats an empty one", async () => {
  const rows = await fetchWorkspaces.call(
    hostWith([{ filename: "NoStatus", filetype: "hub", area: "private" }]),
  );
  assert.deepEqual(names(rows), ["NoStatus"]);
});

test("personal area is still stamped onto bare folders", async () => {
  const rows = await fetchWorkspaces.call(
    hostWith([{ filename: "P", filetype: "folder", area: null, status: "active" }]),
  );
  assert.equal(rows[0].area, "personal");
});

// ── the ws:event subscription ───────────────────────────────────────────────

test("the desk subscribes to ws:event and tears it down", () => {
  assert.match(DESK, /Wm\.on\("ws:event",\s*this\._onWorkspaceWsEvent\)/);
  assert.match(DESK, /Wm\.off\("ws:event",\s*this\._onWorkspaceWsEvent\)/);
  assert.match(
    DESK,
    /this\._onWorkspaceWsEvent\s*=\s*this\._onWorkspaceWsEvent\.bind\(this\)/,
    "unbound, `off` gets a different function object and does nothing",
  );
});

const onWsEvent = method(DESK, "_onWorkspaceWsEvent(args = {}) {", {
  _a,
  Visitor: GLOBALS.Visitor,
});

/** Drive the handler and report whether a resync was scheduled. */
function fire(service, data) {
  let synced = 0;
  const host = {
    _wsSyncTimer: null,
    // No cache: these cases must be decided by filetype/pid alone.
    _workspaces: null,
    _namesAWorkspace: (d) => namesAWorkspace.call(host, d),
    _onWorkspaceCreated() {
      synced++;
    },
  };
  onWsEvent.call(host, { data, options: { service } });
  const scheduled = !!host._wsSyncTimer;
  if (host._wsSyncTimer) {
    clearTimeout(host._wsSyncTimer);
    host._wsSyncTimer = null;
  }
  return { scheduled, synced };
}

for (const svc of [
  "hub.delete_hub",
  "desk.leave_hub",
  "hub.update_name",
  "hub.add_contributors",
  "hub.invite_received",
  "desk.create_hub",
]) {
  test(`${svc} resyncs the switcher`, () => {
    assert.equal(fire(svc, {}).scheduled, true);
  });
}

test("media.remove on a HUB resyncs — that is a workspace delete", () => {
  assert.equal(fire("media.remove", { filetype: "hub" }).scheduled, true);
});

test("media.remove on a home-root FOLDER resyncs — a Personal workspace", () => {
  assert.equal(
    fire("media.remove", { filetype: "folder", pid: "HOME1" }).scheduled,
    true,
  );
});

test("media.remove on a file does NOT resync", () => {
  assert.equal(
    fire("media.remove", { filetype: "document", pid: "SOMEFOLDER" }).scheduled,
    false,
    "media.* fires for every node; resyncing on all of them puts a desk.home "
      + "request behind ordinary file activity",
  );
});

test("media.rename on a nested folder does NOT resync", () => {
  assert.equal(
    fire("media.rename", { filetype: "folder", pid: "NOT_HOME" }).scheduled,
    false,
  );
});

test("an unrelated service does NOT resync", () => {
  assert.equal(fire("chat.post_message", {}).scheduled, false);
  assert.equal(fire("", {}).scheduled, false);
});

test("bursts are coalesced into ONE resync", async () => {
  let synced = 0;
  const host = {
    _wsSyncTimer: null,
    _workspaces: null,
    _namesAWorkspace: () => false,
    _onWorkspaceCreated() {
      synced++;
    },
  };
  // A delete emits the local echo and then the server's, so the handler runs
  // more than once for one user action.
  for (let i = 0; i < 4; i++) {
    onWsEvent.call(host, { data: {}, options: { service: "hub.delete_hub" } });
  }
  assert.equal(synced, 0, "nothing should have run synchronously");
  // Let the debounce window (250ms) elapse. The timers must be REPLACED, not
  // stacked — a missing clearTimeout leaves the earlier ones armed and each
  // costs its own cache-busted desk.home request.
  await new Promise((r) => setTimeout(r, 450));
  assert.equal(synced, 1, `expected one resync for one action, got ${synced}`);
  assert.equal(host._wsSyncTimer, null, "the timer handle was not released");
});

// ── trashing from the context menu (the sparse payload) ────────────────────
//
// "Move to trash" (contextmenu items `trash`, service _e.remove) and the
// switcher ⋯ menu's Delete (`workspaceDelete` → folder-delete →
// confirmFolderDelete → target.trash()) both land on media/core `trash()` →
// `putIntoTrash` → SERVICE.media.trash.
//
// The server answers that by broadcasting `media.remove` with
// `keys: [Attr.nid, Attr.hub_id]` — so the payload has NO filetype and NO pid.
// Judged on those two alone, trashing a workspace is indistinguishable from
// deleting a file, which is why the workspace stayed in the menu.
//
// Fixtures are the real id shapes from a local instance: a hub row has
// nid === hub_id, a personal (folder) row has hub_id === the USER's id.

const HUB_ROW = {
  filename: "onboarding",
  filetype: "hub",
  area: "public",
  status: "active",
  nid: "ba165287ba16528a",
  hub_id: "ba165287ba16528a",
  home_id: "ecf5ff78ecf5ff7e",
};
const PERSONAL_ROW = {
  filename: "Photos",
  filetype: "folder",
  area: "personal",
  status: "active",
  nid: "3640e7793640e77b",
  pid: "HOME1",
  hub_id: "3638701f36387021",
  home_id: "HOME1",
};

/** Drive the handler with a populated switcher cache. */
function fireWithCache(service, data, rows) {
  let synced = 0;
  const host = {
    _wsSyncTimer: null,
    _workspaces: rows,
    _namesAWorkspace: namesAWorkspace,
    _onWorkspaceCreated() {
      synced++;
    },
  };
  onWsEvent.call(host, { data, options: { service } });
  const scheduled = !!host._wsSyncTimer;
  if (host._wsSyncTimer) clearTimeout(host._wsSyncTimer);
  return { scheduled, synced };
}

const namesAWorkspace = method(DESK, "_namesAWorkspace(d) {", GLOBALS);

test("trashing a HUB workspace resyncs, on nid alone", () => {
  // Exactly what the wire carries: nid + hub_id, nothing else.
  const { scheduled } = fireWithCache(
    "media.remove",
    { nid: HUB_ROW.nid, hub_id: HUB_ROW.hub_id },
    [HUB_ROW, PERSONAL_ROW],
  );
  assert.equal(scheduled, true, "this is the reported bug");
});

test("trashing a PERSONAL workspace resyncs, on nid alone", () => {
  const { scheduled } = fireWithCache(
    "media.remove",
    { nid: PERSONAL_ROW.nid, hub_id: PERSONAL_ROW.hub_id },
    [HUB_ROW, PERSONAL_ROW],
  );
  assert.equal(scheduled, true);
});

test("trashing a FILE does not resync, even though it shares the user hub_id", () => {
  const { scheduled } = fireWithCache(
    "media.remove",
    // A file in the user's own home: hub_id matches every personal row, so a
    // hub_id-based match would fire here. nid does not match any row.
    { nid: "ffffffffffffffff", hub_id: PERSONAL_ROW.hub_id },
    [HUB_ROW, PERSONAL_ROW],
  );
  assert.equal(
    scheduled,
    false,
    "matching on hub_id would put a desk.home request behind every file delete "
      + "in the user's home",
  );
});

test("the request-shaped nid list is accepted too", () => {
  const { scheduled } = fireWithCache(
    "media.remove",
    { nid: [{ nid: HUB_ROW.nid, hub_id: HUB_ROW.hub_id }] },
    [HUB_ROW],
  );
  assert.equal(scheduled, true);
});

test("an empty cache falls back to the pid test and does not throw", () => {
  assert.equal(
    fireWithCache("media.remove", { nid: "x", hub_id: "y" }, null).scheduled,
    false,
  );
  assert.equal(
    fireWithCache("media.remove", { nid: "x", hub_id: "y" }, []).scheduled,
    false,
  );
});

test("_namesAWorkspace matches nid and id, and nothing else", () => {
  const rows = [HUB_ROW, PERSONAL_ROW];
  const call = (d) => namesAWorkspace.call({ _workspaces: rows }, d);
  assert.equal(call({ nid: HUB_ROW.nid }), true);
  assert.equal(call({ id: PERSONAL_ROW.nid }), true, "id is an accepted alias");
  assert.equal(call({ hub_id: HUB_ROW.hub_id }), false, "hub_id alone must not match");
  assert.equal(call({ nid: "nope" }), false);
  assert.equal(call({}), false);
  assert.equal(call(null), false);
  // A row carrying `id` instead of `nid` still matches.
  assert.equal(
    namesAWorkspace.call({ _workspaces: [{ id: "abc" }] }, { nid: "abc" }),
    true,
  );
});

test("numeric and string ids compare equal, in BOTH directions", () => {
  // Row numeric, payload string.
  assert.equal(
    namesAWorkspace.call({ _workspaces: [{ nid: 12345 }] }, { nid: "12345" }),
    true,
  );
  // Row string, payload numeric — this is the direction the coercion on the
  // payload side protects; ids on the wire are strings, but nothing guarantees
  // a locally echoed payload did not build one as a number.
  assert.equal(
    namesAWorkspace.call({ _workspaces: [{ nid: "12345" }] }, { nid: 12345 }),
    true,
  );
  // And the list shape, numeric.
  assert.equal(
    namesAWorkspace.call(
      { _workspaces: [{ nid: "678" }] },
      { nid: [{ nid: 678 }] },
    ),
    true,
  );
});
