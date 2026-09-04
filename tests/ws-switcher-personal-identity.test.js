#!/usr/bin/env node

/**
 * Personal workspaces are distinct rows in the switcher.
 *
 * THE COLLISION. A Personal workspace is a home-root FOLDER, and every one of
 * them carries the USER's own hub_id — only hubs carry an id of their own. The
 * switcher keyed rows on `row.hub_id || row.id`, so all of a user's personal
 * workspaces resolved to one identity. Two symptoms, one cause:
 *
 *   - selecting one row under "Personal" marked EVERY row in the section
 *     current, because `cur.hub_id == hubId` was true for all of them;
 *   - clicking any of them opened the FIRST one, because the lookup took
 *     whichever row matched that shared id first.
 *
 * The sidebar has always keyed these correctly (workspace-list
 * `getWorkspaceKey`) and says why in a comment. This is that rule, shared.
 *
 * Run from ui-team with:
 *   node --test tests/ws-switcher-personal-identity.test.js
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

function method(src, header, globals) {
  const body = slice(src, header);
  const names = Object.keys(globals);
  const name = header.replace(/^async\s+/, "").split("(")[0].trim();
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return ({ ${body} }).${name};`)(
    ...names.map((n) => globals[n]),
  );
}

const _a = { folder: "folder", personal: "personal", hub: "hub" };
const USER_ID = "745df7d0745df7d5";
const key = method(DESK, "  _workspaceKey(row) {", {
  _a,
  Visitor: { id: USER_ID },
});
const k = (row) => key.call({}, row);

// The real shapes, from a desk.home dump: four personal folders all carrying
// the same hub_id, hubs carrying their own.
const USER = USER_ID;
const PHOTOS = { filename: "Photos", filetype: "folder", area: "personal", nid: "3640e7793640e77b", hub_id: USER };
const DOCS = { filename: "Documents", filetype: "folder", area: "personal", nid: "3641245c3641245f", hub_id: USER };
const VIDEOS = { filename: "Videos", filetype: "folder", area: "personal", nid: "36413da036413da3", hub_id: USER };
const HUB_A = { filename: "Internal", filetype: "hub", area: "private", nid: "8728d06f8728d083", hub_id: "8728d06f8728d083" };
const HUB_B = { filename: "Onboarding", filetype: "hub", area: "public", nid: "ba165287ba16528a", hub_id: "ba165287ba16528a" };

// ── the key itself ─────────────────────────────────────────────────────────

test("personal workspaces sharing a hub_id get DIFFERENT keys", () => {
  const keys = [PHOTOS, DOCS, VIDEOS].map(k);
  assert.equal(new Set(keys).size, 3, `collapsed to ${JSON.stringify(keys)}`);
});

test("hubs are keyed by their own id", () => {
  assert.notEqual(k(HUB_A), k(HUB_B));
  assert.equal(k(HUB_A), k({ ...HUB_A }), "the same hub is the same key");
});

test("a folder nid can never collide with a hub id", () => {
  // Prefixed for exactly this: the two id spaces are not guaranteed disjoint.
  const sameId = "abc123";
  assert.notEqual(
    k({ filetype: "folder", nid: sameId, hub_id: USER }),
    k({ filetype: "hub", nid: sameId, hub_id: sameId }),
  );
});

test("Wm._curWorkspace is keyed the same way", () => {
  // It carries {hub_id, nid, area} — no filetype — so `area` is what marks a
  // personal one (libs/workspace-target pins it).
  const cur = { hub_id: USER, nid: PHOTOS.nid, area: "personal" };
  assert.equal(k(cur), k(PHOTOS), "the open personal workspace must match its row");
  assert.notEqual(k(cur), k(DOCS), "…and only its row");
  const curHub = { hub_id: HUB_A.hub_id, nid: "someRootNid", area: "private" };
  assert.equal(k(curHub), k(HUB_A), "a hub matches on hub_id, not on nid");
});

test("an unidentifiable row has no key", () => {
  assert.equal(k(null), null);
  assert.equal(k({}), null);
  assert.equal(k({ filetype: "folder" }), null);
  assert.equal(k({ filetype: "folder", nid: "" }), null);
});

// ── what the rows and the lookup do with it ────────────────────────────────

test("only the open personal workspace is marked current", () => {
  const cur = { hub_id: USER, nid: VIDEOS.nid, area: "personal" };
  const curKey = k(cur);
  const marked = [PHOTOS, DOCS, VIDEOS].filter((r) => k(r) === curKey);
  assert.deepEqual(
    marked.map((r) => r.filename),
    ["Videos"],
    "this is the reported bug — the whole section lit up",
  );
});

test("clicking a personal row finds THAT row", () => {
  const rows = [PHOTOS, DOCS, VIDEOS, HUB_A];
  for (const want of [PHOTOS, DOCS, VIDEOS]) {
    const found = rows.find((r) => k(r) === k(want));
    assert.equal(found.filename, want.filename, "the lookup opened another row");
  }
});

test("the old hub_id lookup really did collapse them", () => {
  // The failure this replaces, spelled out: it is not that the ids were
  // missing, it is that they were the same.
  const rows = [PHOTOS, DOCS, VIDEOS];
  const byHub = rows.map((r) => r.hub_id || r.id);
  assert.equal(new Set(byHub).size, 1, "the premise of this whole file");
});

// ── wiring ─────────────────────────────────────────────────────────────────

test("the row, the in-place pass and the click all use the key", () => {
  const render = slice(DESK, "  async _renderWorkspaceMenu(target, force) {");
  assert.match(render, /const curKey = this\._workspaceKey\(cur\)/);
  assert.match(render, /wsKey/, "the row does not carry the key");
  assert.match(
    render,
    /isCurrent = !!wsKey && wsKey === curKey/,
    "the current mark is not keyed",
  );

  const sync = slice(DESK, "  _syncWorkspaceHighlight() {");
  assert.match(sync, /row\.mget\("wsKey"\)/, "the in-place pass is not keyed");
  assert.match(sync, /rowKey === curKey/);

  const sw = slice(DESK, "  async _switchWorkspace(wsKey) {");
  assert.match(sw, /this\._workspaceKey\(r\) === wsKey/, "the lookup is not keyed");
  assert.match(DESK, /_switchWorkspace\(cmd\.mget\("wsKey"\)\)/, "the click sends hub_id");
});

test("the sidebar's rule is the one being shared", () => {
  // If the sidebar ever changes how it identifies a personal row, these two
  // will disagree about which workspace is open.
  const list = read("src/drumee/modules/desk/workspace-list/index.js");
  const fn = slice(list, "  getWorkspaceKey(item) {");
  assert.match(fn, /filetype\) === _a\.folder/);
  assert.match(fn, /mget\(_a\.nid\)/, "the sidebar no longer keys folders by nid");
});

// ── an OPEN personal workspace arrives with no area ────────────────────────
//
// libs/workspace-target pins `area: personal` on the folder TARGET, but
// loadWorkspace overwrites _curWorkspace.area from media.attributes — and a
// home-root folder's area is NULL in the database (verified for
// vowaw91171@robustq.com: rrr, 111 and 222(1) all report area NULL and
// hub_id = the user's id).
//
// Read on area alone, such a `cur` keys as `hub:<user id>`, matches none of the
// `folder:<nid>` rows, and the switcher header renders empty — which is how it
// was reported: click 111, ws-head is null.

const REAL = {
  rrr: { filename: "rrr", filetype: "folder", area: null, nid: "33c81b2e33c81b32", hub_id: USER_ID },
  a111: { filename: "111", filetype: "folder", area: null, nid: "ef1c0513ef1c0518", hub_id: USER_ID },
  b222: { filename: "222(1)", filetype: "folder", area: null, nid: "03edbded03edbdf1", hub_id: USER_ID },
  ppp: { filename: "ppp", filetype: "hub", area: "private", nid: "bcdd264ebcdd2654", hub_id: "bcdd264ebcdd2654" },
};

test("an open personal workspace with NO area still keys as a folder", () => {
  // _curWorkspace carries neither filetype nor area here — only hub_id and nid.
  const cur = { hub_id: USER_ID, nid: REAL.a111.nid, area: null };
  assert.equal(k(cur), k(REAL.a111), "111 does not match its own row");
  assert.notEqual(k(cur), k(REAL.rrr));
  assert.notEqual(k(cur), k(REAL.b222));
});

test("…and the header finds THAT row, not the first personal one", () => {
  const rows = [REAL.rrr, REAL.a111, REAL.b222, REAL.ppp];
  const cur = { hub_id: USER_ID, nid: REAL.a111.nid, area: null };
  const curKey = k(cur);
  const found = rows.find((r) => k(r) === curKey);
  assert.ok(found, "the header went blank — no row matched");
  assert.equal(found.filename, "111");
});

test("an open HUB is still a hub, even though its nid differs from its id", () => {
  // A hub's _curWorkspace.nid is the workspace ROOT node, so nid !== hub_id
  // there too — which is why the discriminator is hub_id vs Visitor.id and not
  // a comparison between the two fields.
  const cur = { hub_id: REAL.ppp.hub_id, nid: "someWorkspaceRootNid", area: "private" };
  assert.equal(k(cur), k(REAL.ppp));
  assert.match(k(cur), /^hub:/);
});

test("the header is keyed, not id-matched", () => {
  const body = slice(DESK, "  _feedWorkspaceHead(head, rows, cur) {");
  assert.match(body, /this\._workspaceKey\(cur\)/);
  assert.match(body, /this\._workspaceKey\(r\) === curKey/);
  assert.ok(
    !/\(r\.hub_id \|\| r\.id\) == cur\.hub_id/.test(body),
    "the header still matches on hub_id",
  );
});
