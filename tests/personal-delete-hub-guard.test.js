#!/usr/bin/env node

/**
 * A PERSONAL WORKSPACE MUST NEVER REACH hub.delete_hub.
 *
 * Read off stage's access log for vowaw91171@robustq.com on 2026-09-04, with
 * the personal workspace `rrr` open:
 *
 *   02:38:50 GET  media.attributes?hub_id=745df7d0745df7d5&nid=33c81b2e33c81b32
 *   02:38:54 POST hub.delete_hub                                           400
 *   02:38:55 GET  desk.home?...&_ts=...        ← the local echo's refetch
 *   02:38:55 GET  desk.home?...&page=1         ← Wm.reload() after the failure
 *
 * and again at 02:39:30. The 400 is hub.delete_hub's own first test
 * (service/private/hub.js):
 *
 *   let data = this.hub.toJSON();
 *   if (data.type !== Attr.hub) return this.exception.user("WRONG_ENTITY_TYPE");
 *
 * `exception.user` sets 400. Only ONE id in that request could both resolve to
 * a real yp.entity row and fail that test — 745df7d0745df7d5, the user's own
 * `drumate` (the other candidates, the home root and the folder nids, are not
 * entities at all, and would have thrown a 500). So delete_hub was posted with
 * hub_id === Visitor.id.
 *
 * That id is not a workspace. Every PERSONAL workspace reports it, because a
 * personal workspace is a folder in the user's home rather than a hub of its
 * own, and desk.home shows the split plainly for this account:
 *
 *   rrr / 111 / 222(1)   folder   hub_id = 745df7d0745df7d5   (the user)
 *   ppp / ccc / lll      hub      hub_id = its own id
 *
 * The guard is at the REQUEST, not at a caller: four routes reach a workspace
 * delete, the branch that should have caught this reads correctly for all of
 * them, and the failure is unambiguous from hub_id alone at the point the
 * request goes out.
 *
 * Run from ui-team with:
 *   node --test tests/personal-delete-hub-guard.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

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
const PPP = "bcdd264ebcdd2654";

const A = new Proxy({}, { get: (_t, k) => String(k) });
const _ = require("underscore");

// ── the guard, run for real ────────────────────────────────────────────────

function makeWm({ cur = null } = {}) {
  const calls = { posted: [], personal: [], said: [], asked: [], confirms: 0, warns: [] };
  const globals = {
    _,
    _a: A,
    Visitor: { id: USER },
    LOCALE: { DELETE_WORKSPACE_FAILED: "FAILED", DELETE: "Delete", MSG_DELETE_HUB: { format: (n) => n } },
    Butler: { say: (m) => calls.said.push(m) },
    SERVICE: { hub: { delete_hub: "hub.delete_hub" }, media: { trash: "media.trash" } },
    Kind: { waitFor: () => Promise.resolve() },
    WS_EVENT: "ws",
  };
  const wm = Object.create({
    confirmRemoveWorkspace: method(
      WM,
      "  confirmRemoveWorkspace(hub_id, filename, media) {",
      globals,
    ),
    confirmRemoveHub: method(WM, "  confirmRemoveHub(media) {", globals),
    _personalWorkspaceNid: method(WM, "  _personalWorkspaceNid(media) {", globals),
    _personalWorkspacePath: method(WM, "  _personalWorkspacePath(media) {", globals),
  });
  Object.assign(wm, {
    calls,
    _curWorkspace: cur,
    warn: (...a) => calls.warns.push(a),
    mget: () => "",
    // Anything that would actually send a request or raise a dialog is
    // recorded, so a leak through the guard is visible rather than silent.
    postService: (o) => {
      calls.posted.push(o);
      return Promise.resolve({ ok: 1 });
    },
    confirmRemovePersonalWorkspace: (node, media) => {
      calls.personal.push({ node, media });
      return Promise.resolve({ ok: 1 });
    },
    // The confirm ANSWERS YES. A dialog that never settles would let a mutant
    // that removes the guard "pass" these tests by hanging instead of posting
    // — the hub path has to be allowed to run all the way to its request.
    ensurePart: () => {
      calls.confirms++;
      return Promise.resolve({
        feed: (o) => {
          calls.asked.push(o);
          return { ask: () => Promise.resolve() };
        },
        clear: () => {},
      });
    },
    animateMediaToTrash: () => Promise.resolve(),
    trigger: () => {},
    reload: () => {},
  });
  return wm;
}

const tile = (attrs) => ({
  mget: (k) => attrs[k],
  isDestroyed: () => false,
  // confirmRemoveHub reads the tile for its echo and suppresses it after the
  // animation; without these the hub path throws inside a .then() and the
  // request assertion below would pass for the wrong reason.
  getAttr: () => ({ ...attrs }),
  suppress: () => {},
});

test("delete_hub is NEVER posted for the user's own entity", async () => {
  // The exact reported call.
  const wm = makeWm({ cur: { hub_id: USER, nid: RRR } });
  await wm.confirmRemoveWorkspace(USER, "rrr", null);
  const hubPosts = wm.calls.posted.filter((o) => o.service === "hub.delete_hub");
  assert.deepEqual(hubPosts, [], "this is the 400 WRONG_ENTITY_TYPE on stage");
});

test("…it goes to the personal path instead, with the right node", async () => {
  const wm = makeWm({ cur: { hub_id: USER, nid: RRR } });
  await wm.confirmRemoveWorkspace(USER, "rrr", null);
  assert.equal(wm.calls.personal.length, 1, "nothing deleted the workspace");
  assert.equal(wm.calls.personal[0].node.nid, RRR);
  assert.equal(wm.calls.personal[0].node.hub_id, USER);
});

test("a tile's nid wins over the open workspace", async () => {
  // The grid path passes the tile the user acted on; it is the subject even if
  // another workspace happens to be open.
  const wm = makeWm({ cur: { hub_id: USER, nid: RRR } });
  await wm.confirmRemoveWorkspace(USER, "111", tile({ nid: W111, filepath: "/111" }));
  assert.equal(wm.calls.personal[0].node.nid, W111);
  assert.equal(wm.calls.personal[0].node.filepath, "/111");
});

test("with no node it says so rather than posting a doomed request", async () => {
  const wm = makeWm({ cur: null });
  await wm.confirmRemoveWorkspace(USER, "rrr", null);
  assert.deepEqual(wm.calls.posted, []);
  assert.deepEqual(wm.calls.said, ["FAILED"]);
});

test("a HUB workspace is untouched by the guard — it still deletes", async () => {
  const wm = makeWm({ cur: { hub_id: PPP, nid: "root" } });
  wm.confirmRemoveWorkspace(PPP, "ppp", null);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(wm.calls.personal.length, 0, "a real hub was diverted");
  assert.ok(wm.calls.asked.length > 0, "the hub path must still ask its question");
  assert.deepEqual(
    wm.calls.posted.filter((o) => o.service === "hub.delete_hub"),
    [{ service: "hub.delete_hub", hub_id: PPP }],
    "the guard swallowed a legitimate workspace delete",
  );
});

test("confirmRemoveHub is guarded too, and reroutes", async () => {
  // Whatever bucketed a personal workspace as a hub, the request must not go.
  const wm = makeWm({ cur: { hub_id: USER, nid: W222 } });
  await wm.confirmRemoveHub(tile({ hub_id: USER, nid: W222, filename: "222(1)" }));
  assert.deepEqual(
    wm.calls.posted.filter((o) => o.service === "hub.delete_hub"),
    [],
  );
  assert.equal(wm.calls.personal.length, 1);
  assert.equal(wm.calls.personal[0].node.nid, W222);
});

test("confirmRemoveHub still deletes a real hub", async () => {
  const wm = makeWm();
  wm.confirmRemoveHub(tile({ hub_id: PPP, nid: PPP, filename: "ppp" }));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(wm.calls.personal.length, 0);
  assert.deepEqual(
    wm.calls.posted.filter((o) => o.service === "hub.delete_hub"),
    [{ service: "hub.delete_hub", hub_id: PPP }],
  );
});

test("the guard is on the id, so it cannot be fooled by string vs number", async () => {
  const wm = makeWm({ cur: { hub_id: USER, nid: RRR } });
  await wm.confirmRemoveWorkspace(Number.isNaN(+USER) ? USER : USER, "rrr", null);
  assert.equal(wm.calls.personal.length, 1);
});

// ── the ⋯ menu resolved the wrong personal workspace ───────────────────────

function makeDesk(tiles) {
  const globals = { _, _a: A, Visitor: { id: USER }, Wm: { getPart: () => ({ children: { toArray: () => tiles } }) } };
  const desk = Object.create({
    _workspaceMediaItem: method(DESK, "  _workspaceMediaItem(hub_id, nid) {", globals),
    _workspaceKey: method(DESK, "  _workspaceKey(row) {", globals),
  });
  return desk;
}

const GRID = [
  tile({ hub_id: USER, nid: RRR, filename: "rrr", filetype: "folder" }),
  tile({ hub_id: USER, nid: W111, filename: "111", filetype: "folder" }),
  tile({ hub_id: USER, nid: W222, filename: "222(1)", filetype: "folder" }),
  tile({ hub_id: PPP, nid: PPP, filename: "ppp", filetype: "hub" }),
];

test("the ⋯ menu resolves the OPEN personal workspace, not the first one", () => {
  // Every personal tile reports hub_id === Visitor.id, so matching on it alone
  // handed back `rrr` whichever one the user had open.
  const desk = makeDesk(GRID);
  const found = desk._workspaceMediaItem(USER, W111);
  assert.equal(found.mget("filename"), "111");
});

test("…for each of them", () => {
  const desk = makeDesk(GRID);
  for (const [nid, name] of [[RRR, "rrr"], [W111, "111"], [W222, "222(1)"]]) {
    assert.equal(desk._workspaceMediaItem(USER, nid).mget("filename"), name);
  }
});

test("a hub still resolves by its id alone", () => {
  const desk = makeDesk(GRID);
  assert.equal(desk._workspaceMediaItem(PPP, "someWorkspaceRootNid").mget("filename"), "ppp");
  assert.equal(desk._workspaceMediaItem(PPP).mget("filename"), "ppp");
});

test("no nid: it still answers, rather than going blank", () => {
  // A caller that knows only a hub_id must keep working — that is the road the
  // hub tiles take, and a null here means no menu at all.
  const desk = makeDesk(GRID);
  assert.ok(desk._workspaceMediaItem(USER));
});

test("an unknown workspace resolves to nothing, not to a neighbour", () => {
  const desk = makeDesk([GRID[3]]);
  assert.equal(desk._workspaceMediaItem("NO_SUCH_HUB", "x"), null);
});

test("a hub delete with NO id never goes out either", async () => {
  // The other reading of that 400: the ACL resolves `scope: "hub"` from hub_id
  // before delete_hub runs, so a missing one fails there rather than at the
  // WRONG_ENTITY_TYPE test. Either way the request is doomed.
  const wm = makeWm();
  await wm.confirmRemoveHub(tile({ nid: W111, filename: "111" }));
  assert.deepEqual(wm.calls.posted, []);
  assert.deepEqual(wm.calls.said, ["FAILED"]);
});
