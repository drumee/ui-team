#!/usr/bin/env node

/**
 * Rail "Access" → the right panel for the workspace's area.
 *
 * The rail item (desk/skeleton/sidebar.js "rail-access") is GLOBAL — it is
 * shown for every open workspace, unlike the topbar share icon and the
 * overflow entry, which are both gated on `area === share` in their skeletons.
 * So the rail is the only caller that can reach folder-manage-access with an
 * INTERNAL (private/team) workspace, and internal workspaces manage PEOPLE,
 * not secure-share links.
 *
 * Structural + behavioural, mirroring tutorial-tours-share.test.js: the case
 * body and openManageAccess are extracted from the real source and run against
 * a fake window, because the branch is invisible at runtime when wrong (the
 * user just gets the other panel).
 *
 * Run from ui-team with:
 *   node --test tests/rail-access-panel.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const read = (p) => stripComments(readFileSync(join(REPO_ROOT, p), "utf8"));

const FOLDER = read("src/drumee/builtins/window/folder/index.js");
const DESK = read("src/drumee/modules/desk/index.js");
const TOPBAR = read("src/drumee/builtins/window/folder/skeleton/topbar.js");
const TOOLKIT = read("src/drumee/builtins/window/skeleton/toolkit/index.js");

global.LOCALE = { WEAK_PRIVILEGE: "weak", MANAGE_ACCESS: "Manage access" };

/** The body of one `case "x":` up to its `return`/next case. */
function caseSlice(src, label, quote = '"') {
  const start = src.indexOf(`case ${quote}${label}${quote}:`);
  assert.notEqual(start, -1, `case ${label} not found`);
  const next = src.indexOf("\n      case ", start + 1);
  return src.slice(start, next === -1 ? src.length : next);
}

/** The body of one `methodName(...) {` up to its closing brace at 2-space indent. */
function methodSlice(src, name) {
  const start = src.indexOf(`\n  ${name}(`);
  assert.notEqual(start, -1, `method ${name} not found`);
  const open = src.indexOf("{", start);
  const end = src.indexOf("\n  }", open);
  assert.notEqual(end, -1, `method ${name} has no 2-space-indented close`);
  return src.slice(open + 1, end);
}

// ── the predicate ────────────────────────────────────────────────────────────

test("the internal test reads area, and private is the only internal area", () => {
  const body = methodSlice(FOLDER, "_manageAccessIsInternal");
  assert.match(body, /_a\.area/, "must read the window's area");
  assert.match(body, /_a\.private/, "private is what internal means");
  // share/dmz/public/personal all keep the secure-share panel (agreed fallback).
  assert.ok(!/_a\.share|_a\.dmz|_a\.public/.test(body),
    "the predicate names private only — everything else falls through");
});

// ── the panel choice ─────────────────────────────────────────────────────────

const ATTRS = {
  nid: "nid", hub_id: "hub_id", area: "area", filetype: "filetype",
  actual_home_id: "actual_home_id", folder: "folder", hub: "hub",
  media: "media", private: "private", share: "share",
};

/** Turn a real method body into a callable, with `_a` bound to the map above. */
const asMethod = (name) =>
  // eslint-disable-next-line no-new-func
  new Function("_a", `return function (opt) {${methodSlice(FOLDER, name)}};`)(ATTRS);

/**
 * Run the real openManageAccess() — and the real payload builders it delegates
 * to — against a fake window. The payloads are the point of the branch, so they
 * are extracted rather than stubbed.
 */
function runOpenManageAccess({ internal, isShowSettings = false, area, members = false }) {
  const calls = { fed: [], cleared: 0 };
  const model = {
    nid: 77, hub_id: 42, area, filetype: "hub", actual_home_id: 99,
    media: null,
  };
  const ctx = {
    isShowSettings,
    _manageAccessIsInternal: () => internal,
    _internalAccessPanel: asMethod("_internalAccessPanel"),
    _secureSharePanel: asMethod("_secureSharePanel"),
    media: { id: "m1" },
    mget: (k) => model[k],
    dialogWrapper: {
      feed: (o) => calls.fed.push(o),
      clear: () => { calls.cleared++; },
      children: { last: () => null },
    },
  };
  asMethod("openManageAccess").call(ctx, { members });
  return calls;
}

test("an INTERNAL workspace gets the members panel, not secure share", () => {
  const { fed } = runOpenManageAccess({ internal: true, area: "private" });
  assert.equal(fed.length, 1, "exactly one panel is fed");
  assert.equal(fed[0].kind, "permission_restricted");
  assert.equal(fed[0].hub_id, 42, "the members list is workspace-scoped");
});

test("an EXTERNAL workspace still gets secure share, unchanged", () => {
  const { fed } = runOpenManageAccess({ internal: false, area: "share" });
  assert.equal(fed.length, 1);
  assert.equal(fed[0].kind, "window_secure_share");
  assert.equal(fed[0].manage_access, 1, "still titled Manage access");
  assert.equal(fed[0].embedded, 1, "still an embedded drawer");
  // Workspace ROOT sharing: actual_home_id wins over nid for a hub window.
  assert.equal(fed[0].nid, 99);
});

test("both branches keep the toggle: a second click closes and feeds nothing", () => {
  for (const internal of [true, false]) {
    const { fed, cleared } = runOpenManageAccess({ internal, isShowSettings: true });
    assert.equal(fed.length, 0, `internal=${internal}: nothing re-fed on close`);
    assert.equal(cleared, 1, `internal=${internal}: the drawer is cleared`);
  }
}); 

// ── the belt and the tour, scoped to the secure-share branch ─────────────────

/** Run the real `folder-manage-access` case body against a fake window. */
function runManageAccess({ internal, isShowSettings = false, canUpload = true, args = {} }) {
  const body = caseSlice(FOLDER, "folder-manage-access")
    .replace(/^case "folder-manage-access":/, "");
  const calls = { fire: [], open: 0, say: [] };
  const ctx = {
    isShowSettings,
    canUpload: () => canUpload,
    _manageAccessIsInternal: () => internal,
    openManageAccess(o) { calls.open++; calls.openedWith = o; },
  };
  const fakeRequire = () => ({ fire: (id) => calls.fire.push(id) });
  const win = { Butler: { say: (m) => calls.say.push(m) } };
  // eslint-disable-next-line no-new-func
  const fn = new Function("require", "window", "Butler", "args", `return function () {${body}};`);
  fn(fakeRequire, win, win.Butler, args).call(ctx);
  return calls;
}

test("a read-only member is refused on EXTERNAL but not on INTERNAL", () => {
  // External: minting a can_edit link needs the write bit — unchanged.
  const ext = runManageAccess({ internal: false, canUpload: false });
  assert.equal(ext.open, 0, "the secure-share drawer never opens");
  assert.deepEqual(ext.say, ["weak"]);

  // Internal: seeing who is in your own team workspace is not link-minting.
  // Folder Settings already shows this same matrix to every member.
  const int = runManageAccess({ internal: true, canUpload: false });
  assert.equal(int.open, 1, "the members panel opens");
  assert.deepEqual(int.say, [], "and says nothing about privilege");
});

test("the secure-share tour does not fire over the members panel", () => {
  // The `share` tour is a six-screen walkthrough of secure-share LINKS
  // (tutorial/share: LOCALE.SECURE_SHARE). The members panel has no links.
  const int = runManageAccess({ internal: true });
  assert.deepEqual(int.fire, []);

  const ext = runManageAccess({ internal: false });
  assert.deepEqual(ext.fire, ["share"], "external still teaches secure share");
});

test("the tour still fires only on the OPENING click", () => {
  assert.deepEqual(runManageAccess({ internal: false, isShowSettings: false }).fire, ["share"]);
  assert.deepEqual(runManageAccess({ internal: false, isShowSettings: true }).fire, []);
});

// ── the rail is the only way in ──────────────────────────────────────────────

test("the rail reaches this through folder-manage-access, unchanged", () => {
  const rail = methodSlice(DESK, "_railAccess");
  assert.match(rail, /service: "folder-manage-access"/,
    "the desk still delegates; the panel choice belongs to the window");
});

test("the two skeleton entry points stay share-only, so only the rail branches", () => {
  // If either gate ever dropped `area === _a.share`, an internal workspace
  // would grow a second Access affordance and this branch would need revisiting.
  for (const [name, src] of [["topbar", TOPBAR], ["overflow", TOOLKIT]]) {
    const at = src.indexOf('service: "folder-manage-access"');
    assert.notEqual(at, -1, `${name}: entry point not found`);
    const gate = src.slice(Math.max(0, at - 600), at);
    assert.match(gate, /area === _a\.share/, `${name}: gate is no longer share-only`);
  }
});

// ── the rail forces the members matrix, external included (Natrix, 2026-09-03) ──
//
// Access means "who can get in", so the rail shows the permissions matrix for
// EVERY workspace. The link builder keeps its own entry points — the header's
// chain icon and the ⋯ row — which is why the flag rides on the call rather
// than changing openManageAccess's own branch.

test("the rail's flag forces the members panel on an EXTERNAL workspace", () => {
  const { fed } = runOpenManageAccess({ internal: false, area: "share", members: true });
  assert.equal(fed.length, 1, "exactly one panel is fed");
  assert.equal(fed[0].kind, "permission_restricted",
    "external + members must show the matrix, not the link builder");
});

test("without the flag an EXTERNAL workspace is untouched", () => {
  // The header chain icon and the ⋯ row both reach openManageAccess with no
  // flag, and they must keep minting links.
  const { fed } = runOpenManageAccess({ internal: false, area: "share" });
  assert.equal(fed[0].kind, "window_secure_share");
});

test("the members flag skips the write belt and the secure-share tour", () => {
  // A view-only member of an EXTERNAL workspace may still ask who has access:
  // nothing on the matrix mints a link, so the belt must not refuse them.
  const r = runManageAccess({ internal: false, canUpload: false, args: { members: 1 } });
  assert.equal(r.say.length, 0, "a members-only open must not be refused");
  assert.equal(r.open, 1, "the panel never opened");
  assert.equal(r.openedWith && r.openedWith.members, true,
    "openManageAccess was not told this is a members open");
  assert.deepEqual(r.fire, [], "the link tour fired over a panel with no links");
});

test("the belt still guards the LINK builder when the flag is absent", () => {
  const r = runManageAccess({ internal: false, canUpload: false });
  assert.equal(r.open, 0, "a view-only member reached the link builder");
  assert.deepEqual(r.say, ["weak"]);
});

test("the rail passes the flag and the header's chain icon does not", () => {
  // Both go through _railAccess, so the difference has to be visible at the
  // two call sites or the chain icon silently loses the link builder.
  const railCase = DESK.slice(DESK.indexOf('case "rail-access":'));
  assert.match(railCase.slice(0, 200), /_railAccess\(\s*\{\s*members:\s*1\s*\}\s*\)/,
    "the rail no longer asks for the members matrix");
  const header = DESK.slice(DESK.indexOf("_workspaceAccessFromHeader("));
  const call = header.slice(0, header.indexOf("\n  }"));
  assert.match(call, /this\._railAccess\(\)/,
    "the header must call _railAccess with NO flag — it is the link button");
});
