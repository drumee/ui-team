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
  const LOCALE = { SOME_ERROR: "translated" };
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
      return Promise.resolve(opt.hub === undefined ? { hub_id: "h1", actual_home_id: "root1" } : opt.hub);
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
