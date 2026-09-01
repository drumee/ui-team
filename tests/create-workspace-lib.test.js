#!/usr/bin/env node

/**
 * libs/create-workspace — the three types are three different calls.
 *
 * This lib was extracted from the create-workspace form so the post-signup
 * tutorial could create a workspace without restating any of it. The whole
 * value of that is that there is now ONE copy of the branching, so what is
 * tested here is the branching itself: that `personal` never reaches
 * create_hub, that the hub types carry the right area, that the descriptor
 * broadcast for each is the shape a listener can REOPEN the workspace from,
 * and that a refusal comes back as data rather than a throw.
 *
 * Run from ui-team with:
 *   node --test tests/create-workspace-lib.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const LIB_PATH = join(REPO_ROOT, "src/drumee/libs/create-workspace.js");
const FORM_PATH = join(REPO_ROOT, "src/drumee/builtins/media/form/index.js");

/**
 * Load the lib with the globals it reaches for stubbed, and record everything
 * it does to the outside world.
 */
function load(opt = {}) {
  const calls = { posts: [], broadcasts: [], tracked: [], folders: [] };

  const Visitor = { id: "u1", get: () => "home1" };
  const SERVICE = { desk: { create_hub: "desk.create_hub" } };
  const _a = { personal: "personal" };
  const _ = { isArray: Array.isArray };
  const LOCALE = { SOME_ERROR: "translated", TRY_AGAIN: "Please try again" };
  const RADIO_BROADCAST = {
    trigger: (channel, payload) => calls.broadcasts.push({ channel, payload }),
  };
  const Wm = {
    createFolderFromDialog: (cmd) => {
      calls.folders.push(cmd.getValue());
      return opt.folder === undefined ? { nid: "n9" } : opt.folder;
    },
  };
  const trackStub = {
    trackWorkspace: (host, type, o) => calls.tracked.push({ type, ...o }),
  };
  const require_ = (id) => {
    if (id === "libs/track-workspace") return trackStub;
    throw new Error(`unexpected require(${id})`);
  };

  const src = readFileSync(LIB_PATH, "utf8");
  const module_ = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function(
    "module", "require", "Visitor", "SERVICE", "_a", "_", "LOCALE",
    "RADIO_BROADCAST", "Wm", src,
  )(module_, require_, Visitor, SERVICE, _a, _, LOCALE, RADIO_BROADCAST, Wm);

  const host = {
    warn: () => {},
    postService: (service, payload) => {
      calls.posts.push({ service, payload });
      if (opt.reject) return Promise.reject(opt.reject);
      // Key PRESENCE, not value: a test has to be able to say "the server
      // answered with undefined", which is a real shape here — the proc's
      // success SELECT matches no rows on the rollback path.
      return Promise.resolve(
        "hub" in opt ? opt.hub : { hub_id: "h1", actual_home_id: "root1" },
      );
    },
  };
  return { ...module_.exports, host, calls };
}

// ── personal is not a hub ────────────────────────────────────────────────────

test("personal goes through the folder flow and never touches create_hub", async () => {
  const { createWorkspace, host, calls } = load();
  const res = await createWorkspace(host, "personal", "  Mine  ");
  assert.equal(res.ok, true);
  assert.equal(res.personal, true);
  assert.deepEqual(calls.posts, [], "create_hub must not be called for personal");
  assert.deepEqual(calls.folders, ["Mine"], "and the name is trimmed on the way in");
});

test("personal broadcasts a descriptor the sidebar shape can reopen", async () => {
  const { createWorkspace, host, calls } = load();
  await createWorkspace(host, "personal", "Mine");
  const [b] = calls.broadcasts;
  assert.equal(b.channel, "workspace:refresh");
  assert.equal(b.payload.personal, 1, "listeners are told there is no panel coming");
  // The user's own hub_id plus the folder's nid — a hub home_id here would
  // reopen Home instead of the workspace.
  assert.deepEqual(b.payload.workspace, {
    hub_id: "u1", nid: "n9", area: "personal", filename: "Mine",
  });
});

test("personal reports itself to analytics, since yp.hub cannot see it", async () => {
  const { createWorkspace, host, calls } = load();
  await createWorkspace(host, "personal", "Mine");
  assert.deepEqual(calls.tracked, [
    { type: "personal", wid: "n9", area: "personal", filename: "Mine" },
  ]);
});

test("a folder flow that handled its own failure reports nothing", async () => {
  // createFolderFromDialog resolves falsy once it has already told the user
  // (invalid name, server error), so there is nothing left to announce.
  const { createWorkspace, host, calls } = load({ folder: null });
  const res = await createWorkspace(host, "personal", "Mine");
  assert.equal(res.ok, false);
  assert.equal(res.handled, true);
  assert.deepEqual(calls.broadcasts, [], "nothing was created, so nothing is announced");
  assert.deepEqual(calls.tracked, []);
});

// ── the hub types ────────────────────────────────────────────────────────────

test("team and share are the same call with different areas", async () => {
  for (const [type, area] of [["team", "private"], ["share", "share"]]) {
    const { createWorkspace, host, calls } = load();
    await createWorkspace(host, type, "W");
    assert.equal(calls.posts.length, 1);
    assert.equal(calls.posts[0].service, "desk.create_hub");
    assert.equal(calls.posts[0].payload.area, area, `${type} -> ${area}`);
  }
});

test("a hub's descriptor uses the ROOT node, not the hub's own nid", async () => {
  const { createWorkspace, host, calls } = load({
    hub: { hub_id: "h1", nid: "hub/0", actual_home_id: "root1", area: "private" },
  });
  await createWorkspace(host, "team", "W");
  const [b] = calls.broadcasts;
  assert.equal(b.payload.workspace.nid, "root1", "hub/0 would not open anything");
  assert.equal(b.payload.personal, undefined);
});

test("analytics gets the HUB id, or the backfill counts it twice", async () => {
  const { createWorkspace, host, calls } = load({
    hub: { hub_id: "h1", actual_home_id: "root1", area: "private" },
  });
  await createWorkspace(host, "team", "W");
  assert.equal(calls.tracked[0].wid, "h1");
  assert.notEqual(calls.tracked[0].wid, "root1");
});

// ── refusals come back as data ───────────────────────────────────────────────

test("an in-band quota refusal is flagged, not printed", async () => {
  for (const hub of [
    { error: "QUOTA_EXCEEDED" },
    { error_code: 1, reason: "_private_hub_limit_reached" },
  ]) {
    const { createWorkspace, host, calls } = load({ hub });
    const res = await createWorkspace(host, "team", "W");
    assert.equal(res.ok, false);
    assert.equal(res.quota, true, JSON.stringify(hub));
    assert.deepEqual(calls.broadcasts, [], "a refusal announces nothing");
  }
});

test("any other in-band error comes back translated where it can be", async () => {
  const { createWorkspace, host } = load({ hub: { error: "SOME_ERROR" } });
  const res = await createWorkspace(host, "team", "W");
  assert.equal(res.message, "translated");
});

test("a rejection settles instead of throwing", async () => {
  const { createWorkspace, host } = load({ reject: new Error("offline") });
  const res = await createWorkspace(host, "team", "W");
  assert.equal(res.ok, false);
  assert.ok(res.error, "the caller decides what to do, but is not handed a throw");
});

test("an empty name never reaches the network", async () => {
  const { createWorkspace, host, calls } = load();
  const res = await createWorkspace(host, "team", "   ");
  assert.equal(res.empty, true);
  assert.deepEqual(calls.posts, []);
});

// ── one copy, not two ────────────────────────────────────────────────────────

test("the form delegates rather than keeping its own branch", () => {
  const form = readFileSync(FORM_PATH, "utf8");
  assert.match(form, /libs\/create-workspace/);
  for (const gone of [
    /SERVICE\.desk\.create_hub/,
    /createFolderFromDialog/,
    /RADIO_BROADCAST\.trigger\("workspace:refresh"/,
    /trackWorkspace/,
  ]) {
    assert.doesNotMatch(form, gone, `the form still restates ${gone}`);
  }
});

// ── desk_create_hub's OWN failure shape ──────────────────────────────────────
//
// The proc does not signal failure the way this lib was reading for. It ends:
//
//   SELECT *, 0 as failed, _default_privilege default_privilege
//     FROM yp.entity WHERE db_name=_hub_db;      -- runs UNCONDITIONALLY
//
//   IF _rollback THEN
//     ROLLBACK;
//     SELECT 1 as failed, IFNULL(_reason, @full_error) AS reason;
//   END IF;
//
// So a refusal carries `failed: 1` and `reason` — never `error` or
// `error_code`, which is all this lib used to look at. And because that first
// SELECT runs even on the rollback path, where `_hub_db` is NULL, it matches
// zero rows: the caller can also just get nothing back.
//
// Both were read as SUCCESS. `hub_id: hub.hub_id || hub.id` then came out
// undefined, the tour advanced to its invite screen with nothing to invite to,
// the host's `if (ws.hub_id)` guard declined to open anything, and no error was
// ever shown. Personal workspaces were unaffected because they never call the
// proc — which is exactly how it presented: personal worked, internal and
// external silently did not.
//
// Seen for real on stage: the hub pool was exhausted (no entity with
// pool_state='clean'), so pickupEntity returned nothing and EVERY internal and
// external create took the rollback branch.

test("a `failed` row is a refusal, however cheerful the rest of it looks", async () => {
  const { createWorkspace, host } = load({ hub: { failed: 1, reason: "Pool private is empty. Considerer runing factory" } });
  const res = await createWorkspace(host, "team", "Design");
  assert.equal(res.ok, false, "this is the bug: it used to come back ok:true");
  assert.ok(res.message, "and it must say something rather than nothing");
});

test("`failed: 0` is the success row and still passes", async () => {
  // The success SELECT carries `0 as failed`. A naive truthiness check on the
  // field would refuse every real create.
  const { createWorkspace, host } = load({
    hub: { failed: 0, hub_id: "h1", actual_home_id: "root1", area: "private" },
  });
  const res = await createWorkspace(host, "team", "Design");
  assert.equal(res.ok, true);
  assert.equal(res.workspace.hub_id, "h1");
});

test("a string `failed` counts too — the wire is not typed", async () => {
  const { createWorkspace, host } = load({ hub: { failed: "1", reason: "nope" } });
  assert.equal((await createWorkspace(host, "team", "Design")).ok, false);
  const ok = load({ hub: { failed: "0", hub_id: "h1", actual_home_id: "r1" } });
  assert.equal((await ok.createWorkspace(ok.host, "team", "Design")).ok, true);
});

test("an empty result is a refusal, not a crash", async () => {
  // The rollback path's first SELECT matches no rows, so this is what a caller
  // can actually receive. Reading .hub_id off it threw a TypeError that only
  // surfaced as a generic try-again.
  for (const empty of [undefined, null, [], {}]) {
    const { createWorkspace, host } = load({ hub: empty });
    const res = await createWorkspace(host, "team", "Design");
    assert.equal(res.ok, false, `empty response ${JSON.stringify(empty)}`);
    assert.ok(res.message || res.error, "and it is reported");
  }
});

test("a hub row with no id at all is refused rather than half-built", async () => {
  // Belt and braces: whatever the shape, a workspace with no hub_id cannot be
  // opened, invited to, or reported — so it must never be called ok.
  const { createWorkspace, host } = load({ hub: { failed: 0, actual_home_id: "root1" } });
  const res = await createWorkspace(host, "team", "Design");
  assert.equal(res.ok, false, "no hub_id is not a workspace");
});

test("an exhausted pool reads as a real message, and the reason is kept", async () => {
  // The reason is a server diagnostic, not user prose, so it must reach the
  // console for whoever debugs this next — the message shown is the generic one.
  const warned = [];
  const { createWorkspace, host } = load({
    hub: { failed: 1, reason: "Pool share is empty. Considerer runing factory" },
  });
  host.warn = (...a) => warned.push(a.join(" "));
  const res = await createWorkspace(host, "share", "Partners");
  assert.equal(res.ok, false);
  assert.match(warned.join(" "), /Pool share is empty/, "the reason is not swallowed");
});

test("a quota refusal delivered as `failed` is still a quota refusal", async () => {
  // The legacy quota path answers with a reason naming the area. That check
  // must run on the failed-row branch too, or it lands as a generic error.
  const { createWorkspace, host } = load({
    hub: { failed: 1, reason: "_private_hub_limit_reached" },
  });
  const res = await createWorkspace(host, "team", "Design");
  assert.equal(res.ok, false);
  assert.equal(res.quota, true, "flagged, so the caller shows the quota block");
});
