#!/usr/bin/env node

/**
 * Opening a workspace from the desk HOME GRID, and keeping the switcher's
 * highlight honest afterwards.
 *
 * Two facts make this coherent, and both are asserted below:
 *
 *  - The grid and the switcher are fed from the SAME payload. The grid's
 *    List.Smart and Desk._fetchWorkspaces both call SERVICE.desk.home with
 *    hub_id: Visitor.id, which server-side is mfs_show_node_by(home_id, uid,
 *    {type:'node'}) — the directories directly under the user's home. So every
 *    folder tile in .folder-section IS a Personal workspace, and every hub tile
 *    in .workspace-section is a hub workspace.
 *
 *  - .workspace-section / .folder-section are runtime DOM wrappers that
 *    window/utils.js _doPartition creates and moves tiles into by
 *    dataset.filetype. They are presentation only, so the discriminator here is
 *    the MODEL's filetype, never the section element.
 *
 * Run from ui-team with:
 *   node --test tests/workspace-open-from-grid.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const WM = read("src/drumee/modules/desk/wm/index.js");
const DESK = read("src/drumee/modules/desk/index.js");
const WM_SKEL = read("src/drumee/modules/desk/wm/skeleton/index.js");

const ATTRS = new Proxy({}, { get: (_t, p) => String(p) });
const lodashish = { isArray: Array.isArray, isFunction: (f) => typeof f === "function" };

/** Balanced-brace slice of `<indent><name>(` … used for methods and functions. */
function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  assert.fail(`${header} has no balanced body`);
}

// ── the shared target shaper ────────────────────────────────────────────────

const LIB = "src/drumee/libs/workspace-target.js";

function loadTarget() {
  const src = read(LIB);
  const body = slice(src, "function workspaceTarget(");
  // eslint-disable-next-line no-new-func
  return new Function("_a", "Visitor", `${body}; return workspaceTarget;`)(
    ATTRS, { id: "me" });
}

test("a hub row passes through unchanged", () => {
  const t = loadTarget();
  const row = { filetype: "hub", hub_id: "H1", nid: "N1", area: "private", filename: "Team" };
  assert.deepEqual(t(row), row);
  assert.notEqual(t(row), row, "a copy, so callers cannot mutate the cached row");
});

test("a PERSONAL row keeps its own nid instead of the home root", () => {
  // The trap: a home-root folder carries home_id pointing at the user's HOME.
  // loadWorkspace prefers actual_home_id || home_id || nid, so passing the row
  // raw opens Home instead of the folder.
  const t = loadTarget();
  const row = { filetype: "folder", id: "F1", nid: "F1", home_id: "HOME", filename: "Photos" };
  const got = t(row);
  assert.equal(got.nid, "F1", "the folder's own node, not HOME");
  assert.equal(got.hub_id, "me", "personal workspaces live under the visitor's hub");
  assert.equal(got.area, "personal");
  assert.ok(!("home_id" in got), "home_id must not survive, or loadWorkspace prefers it");
});

test("a personal row identified only by `id` still resolves", () => {
  const t = loadTarget();
  assert.equal(t({ filetype: "folder", id: "F9" }).nid, "F9");
});

test("null in, null out", () => {
  assert.equal(loadTarget()(null), null);
});

// ── Desk delegates rather than keeping a second copy ────────────────────────

test("Desk._workspaceTarget delegates to the shared helper", () => {
  const body = slice(DESK, "  _workspaceTarget(row) {");
  assert.match(body, /workspaceTarget\(/, "must call the shared helper");
  assert.ok(!/_a\.personal/.test(body),
    "the shaping rules live in ONE place; a second copy is what drifts");
});

// ── the grid's tile test ────────────────────────────────────────────────────

test("BOTH hub and folder tiles route to loadWorkspace", () => {
  const block = slice(WM, "      case \"open-node\": {");
  const m = block.match(/_isWorkspaceTile\s*=([\s\S]*?);/);
  assert.ok(m, "_isWorkspaceTile not found");
  const expr = m[1];
  assert.match(expr, /_a\.hub/, "hub tiles (workspace-section)");
  assert.match(expr, /_a\.folder/, "folder tiles (folder-section)");
  assert.match(expr, /_a\.deleted/, "a trashed tile is still not a workspace");
  assert.match(block, /this\.loadWorkspace\(/);
});

test("the tile's MODEL decides, never the section element", () => {
  const block = slice(WM, "      case \"open-node\": {");
  assert.ok(!/workspace-section|folder-section|closest\(/.test(block),
    "_doPartition moves tiles between those wrappers under a MutationObserver, "
    + "so the DOM says nothing reliable about what a tile is");
});

test("the grid and the switcher are fed from the same service", () => {
  assert.match(WM_SKEL, /service:\s*SERVICE\.desk\.home/);
  assert.match(WM_SKEL, /hub_id:\s*Visitor\.id/);
  const fetch = slice(DESK, "  async _fetchWorkspaces(force) {");
  assert.match(fetch, /SERVICE\.desk\.home/);
  assert.match(fetch, /hub_id:\s*Visitor\.id/);
});

// ── the highlight ───────────────────────────────────────────────────────────

/** Run the real _syncWorkspaceHighlight against a fake switcher. */
function runHighlight({ curHubId, rows, headAlive = true }) {
  const body = slice(DESK, "  _syncWorkspaceHighlight() {");
  const children = rows.map((r) => ({
    el: { dataset: { current: r.wasCurrent ? "1" : "0" } },
    mget: (k) => (k === "wsHubId" ? r.hubId : undefined),
    isDestroyed: () => false,
  }));
  const calls = { headFed: 0, fullRefeed: 0 };
  const ctx = {
    _workspaces: rows.map((r) => ({ hub_id: r.hubId, filename: `W-${r.hubId}` })),
    _wsListPart: { el: {}, isDestroyed: () => false, children: { each: (f) => children.forEach(f) } },
    _wsHeadPart: headAlive ? { el: {}, isDestroyed: () => false } : null,
    _feedWorkspaceHead() { calls.headFed++; },
    // If the sync ever reaches for this it is re-feeding the whole menu, which
    // rebuilds every row on every navigation — the thing this must not do.
    _renderWorkspaceMenu() { calls.fullRefeed++; },
  };
  const win = { Wm: curHubId ? { _curWorkspace: { hub_id: curHubId } } : {} };
  // eslint-disable-next-line no-new-func
  new Function("_", "window", `return function () {${slice(body, "{").slice(1, -1)}};`)(
    lodashish, win).call(ctx);
  return { marks: children.map((c) => c.el.dataset.current), ...calls };
}

test("the open workspace is marked and every other row cleared", () => {
  const r = runHighlight({
    curHubId: "B",
    rows: [{ hubId: "A", wasCurrent: true }, { hubId: "B" }, { hubId: "C" }],
  });
  assert.deepEqual(r.marks, ["0", "1", "0"], "the stale mark on A is cleared");
});

test("loose equality, because hub ids arrive as both string and number", () => {
  const r = runHighlight({ curHubId: 42, rows: [{ hubId: "42" }] });
  assert.deepEqual(r.marks, ["1"]);
});

test("no open workspace clears every mark", () => {
  const r = runHighlight({ curHubId: null, rows: [{ hubId: "A", wasCurrent: true }] });
  assert.deepEqual(r.marks, ["0"]);
});

test("the header is re-fed, because it names the current workspace", () => {
  assert.equal(runHighlight({ curHubId: "A", rows: [{ hubId: "A" }] }).headFed, 1);
});

test("it updates in place — the whole menu is never re-fed", () => {
  // Behavioural, not a source grep: the first version of this test only checked
  // for a literal `list.feed(` and happily passed while the code called
  // _renderWorkspaceMenu, which re-feeds the list AND the header.
  const r = runHighlight({ curHubId: "A", rows: [{ hubId: "A" }, { hubId: "B" }] });
  assert.equal(r.fullRefeed, 0, "_renderWorkspaceMenu must not be called");
  assert.equal(r.headFed, 1, "only the header is re-fed");
});

// ── wiring ──────────────────────────────────────────────────────────────────

test("the highlight rides the one broadcast every entry point shares", () => {
  // _updateAddmenu listens to "breadcrumb:content", which sidebar row, switcher
  // row, grid tile, deep link and reload-restore all end in.
  const body = slice(DESK, "  _updateAddmenu() {");
  assert.match(body, /_syncWorkspaceHighlight\(\)/);
  const guarded = body.match(/try\s*\{([\s\S]*?)\}\s*catch/);
  assert.ok(guarded && /_syncWorkspaceHighlight\(\)/.test(guarded[1]),
    "must sit INSIDE the try: a throw here unwinds Wm.initialize before "
    + "window.Wm is assigned — the failure its comment already records");
});
