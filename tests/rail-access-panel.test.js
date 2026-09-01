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
  new Function("_a", `return function () {${methodSlice(FOLDER, name)}};`)(ATTRS);

/**
 * Run the real openManageAccess() — and the real payload builders it delegates
 * to — against a fake window. The payloads are the point of the branch, so they
 * are extracted rather than stubbed.
 */
function runOpenManageAccess({ internal, isShowSettings = false, area }) {
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
  asMethod("openManageAccess").call(ctx);
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
function runManageAccess({ internal, isShowSettings = false, canUpload = true }) {
  const body = caseSlice(FOLDER, "folder-manage-access")
    .replace(/^case "folder-manage-access":/, "");
  const calls = { fire: [], open: 0, say: [] };
  const ctx = {
    isShowSettings,
    canUpload: () => canUpload,
    _manageAccessIsInternal: () => internal,
    openManageAccess() { calls.open++; },
  };
  const fakeRequire = () => ({ fire: (id) => calls.fire.push(id) });
  const win = { Butler: { say: (m) => calls.say.push(m) } };
  // eslint-disable-next-line no-new-func
  const fn = new Function("require", "window", "Butler", `return function () {${body}};`);
  fn(fakeRequire, win, win.Butler).call(ctx);
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
