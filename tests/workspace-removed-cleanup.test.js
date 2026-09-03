#!/usr/bin/env node

/**
 * When the OPEN workspace is removed, the desk must stop pointing at it.
 *
 * Reported after deleting "test(1)": the topbar left cluster still named it,
 * `.desk-module__wm-container` still showed its content, and a page refresh
 * tried to reopen it. All three were one upstream failure — the headless
 * `window_folder` pane was never destroyed — plus one independent gap, the
 * restore path never checking that the saved workspace still exists.
 *
 * The pane's own close is covered in window-remove-content-path.test.js. This
 * file covers what has to happen around it:
 *
 *   - Wm notices the removal and drops the context EXPLICITLY, rather than
 *     leaving it to the pane's once(destroy) handler. `_curWorkspace` is what
 *     the breadcrumb and the state snapshot read, so a stale one is what kept
 *     the dead workspace on screen and in sessionStorage.
 *   - Wm's own model is reset. loadWorkspace msets hub_id / nid / ownpath onto
 *     Wm, so it keeps claiming to be inside a workspace that is gone — the
 *     stale state that once made Wm's removeContent match ITSELF and destroy
 *     the desk's work area.
 *   - A saved workspace that no longer exists is refused, and the desk opens
 *     the default instead of landing on nothing.
 *
 * Run from ui-team with:
 *   node --test tests/workspace-removed-cleanup.test.js
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

const HUB = "b5d38adab5d38ade"; // "test(1)" on stage
const tick = () => new Promise((r) => setTimeout(r, 5));

// ── Wm.onCurrentWorkspaceRemoved ───────────────────────────────────────────

function wmHost({ curHub = HUB, withDesk = true } = {}) {
  const opened = { count: 0 };
  const globals = {
    _: require("underscore"),
    window: {
      Desk: withDesk
        ? {
            _openDefaultWorkspace() {
              opened.count++;
            },
          }
        : undefined,
    },
  };
  const host = Object.create({
    onCurrentWorkspaceRemoved: method(
      WM,
      "onCurrentWorkspaceRemoved(hub_id) {",
      globals,
    ),
  });
  host.opened = opened;
  host.mods = [];
  host._curWorkspace = curHub ? { hub_id: curHub, nid: "N", area: "private" } : null;
  host._wsGeneration = 7;
  host.warn = () => {};
  host.isDestroyed = () => false;
  host.mset = (patch) => host.mods.push(patch);
  return host;
}

test("the open workspace's removal clears the context", async () => {
  const wm = wmHost();
  wm.onCurrentWorkspaceRemoved(HUB);
  assert.equal(
    wm._curWorkspace,
    null,
    "_curWorkspace is what the breadcrumb and the state snapshot read",
  );
});

test("Wm's own model is reset, not just the context", async () => {
  const wm = wmHost();
  wm.onCurrentWorkspaceRemoved(HUB);
  assert.equal(wm.mods.length, 1);
  const patch = wm.mods[0];
  for (const k of ["hub_id", "nid", "ownpath", "home_id", "filepath"]) {
    assert.equal(patch[k], null, `${k} must be cleared`);
  }
});

test("the loadWorkspace generation is bumped so an in-flight open cannot win", () => {
  const wm = wmHost();
  wm.onCurrentWorkspaceRemoved(HUB);
  assert.equal(wm._wsGeneration, 8);
});

test("a default workspace is opened, so the rail has something to act on", async () => {
  const wm = wmHost();
  wm.onCurrentWorkspaceRemoved(HUB);
  await tick();
  assert.equal(wm.opened.count, 1);
});

test("removing a DIFFERENT workspace changes nothing", async () => {
  const wm = wmHost();
  wm.onCurrentWorkspaceRemoved("SOME_OTHER_HUB");
  await tick();
  assert.deepEqual(wm._curWorkspace, { hub_id: HUB, nid: "N", area: "private" });
  assert.equal(wm.mods.length, 0);
  assert.equal(wm.opened.count, 0);
});

test("with no workspace open it is a no-op", async () => {
  const wm = wmHost({ curHub: null });
  wm.onCurrentWorkspaceRemoved(HUB);
  await tick();
  assert.equal(wm.opened.count, 0);
});

test("a missing hub_id is ignored", () => {
  const wm = wmHost();
  wm.onCurrentWorkspaceRemoved(undefined);
  assert.notEqual(wm._curWorkspace, null);
});

test("if something already opened a workspace, the default is skipped", async () => {
  const wm = wmHost();
  wm.onCurrentWorkspaceRemoved(HUB);
  // The user clicked another workspace before the deferred callback ran.
  wm._curWorkspace = { hub_id: "NEWLY_OPENED", nid: "N2" };
  await tick();
  assert.equal(
    wm.opened.count,
    0,
    "opening the default over a workspace the user just chose would yank it away",
  );
});

test("a missing Desk global does not throw", async () => {
  const wm = wmHost({ withDesk: false });
  assert.doesNotThrow(() => wm.onCurrentWorkspaceRemoved(HUB));
  await tick();
  assert.equal(wm._curWorkspace, null, "the context still had to clear");
});

// ── Wm.handleWsEvent routing ───────────────────────────────────────────────

function routeHost() {
  const seen = [];
  const globals = { _: require("underscore") };
  const fn = method(WM, "handleWsEvent(args = {}) {", globals);
  const host = {
    seen,
    superCalls: 0,
    onCurrentWorkspaceRemoved(hub_id) {
      seen.push(hub_id);
    },
  };
  // `super.handleWsEvent` — the extracted body has no prototype chain, so the
  // optional-call guard is what runs. Assert on the notice instead.
  return { host, fn };
}

for (const svc of ["hub.delete_hub", "desk.leave_hub"]) {
  test(`${svc} reaches onCurrentWorkspaceRemoved`, () => {
    const { host, fn } = routeHost();
    fn.call(host, { data: { hub_id: HUB }, options: { service: svc } });
    assert.deepEqual(host.seen, [HUB]);
  });
}

test("unrelated services do not", () => {
  const { host, fn } = routeHost();
  for (const svc of ["media.remove", "media.trash", "media.rename", "hub.invite", ""]) {
    fn.call(host, { data: { hub_id: HUB }, options: { service: svc } });
  }
  assert.deepEqual(host.seen, []);
});

test("an echo with no hub_id is ignored", () => {
  const { host, fn } = routeHost();
  fn.call(host, { data: {}, options: { service: "hub.delete_hub" } });
  assert.deepEqual(host.seen, []);
});

// ── the restore guard ──────────────────────────────────────────────────────

function restoreHost({ rows, throws = false }) {
  const calls = { load: 0, forgot: 0 };
  const globals = {
    _: require("underscore"),
    _a: { kind: "kind", headless: "headless", hub_id: "hub_id" },
    Kind: { waitFor: () => Promise.resolve() },
    window: { Wm: { headlessLayer: { children: { toArray: () => [] } } } },
    Wm: {
      loadWorkspace() {
        calls.load++;
      },
      headlessLayer: { children: { toArray: () => [] } },
    },
  };
  const host = Object.create({
    _restoreWorkspace: method(DESK, "async _restoreWorkspace(workspace) {", globals),
  });
  host.calls = calls;
  host.warn = () => {};
  host.isDestroyed = () => false;
  host._fetchWorkspaces = () =>
    throws ? Promise.reject(new Error("offline")) : Promise.resolve(rows);
  host._forgetSavedWorkspace = () => calls.forgot++;
  return host;
}

const SAVED = { hub_id: HUB, nid: "N", area: "private", filename: "test(1)" };

test("a saved workspace that is GONE is refused, and forgotten", async () => {
  const host = restoreHost({ rows: [{ hub_id: "STILL_HERE" }] });
  const ok = await host._restoreWorkspace(SAVED);
  assert.equal(ok, false, "this is the refresh-reopens-test(1) bug");
  assert.equal(host.calls.load, 0, "loadWorkspace must not be called for a dead hub");
  assert.equal(host.calls.forgot, 1, "or every later reload pays the same check");
});

test("a saved workspace that still exists is restored", async () => {
  const host = restoreHost({ rows: [{ hub_id: HUB }, { hub_id: "OTHER" }] });
  // The pane never appears in this harness, so it times out to false — what
  // matters here is that it got as far as asking.
  await host._restoreWorkspace(SAVED);
  assert.equal(host.calls.load, 1);
  assert.equal(host.calls.forgot, 0);
});

test("`id` is accepted as well as `hub_id`", async () => {
  const host = restoreHost({ rows: [{ id: HUB }] });
  await host._restoreWorkspace(SAVED);
  assert.equal(host.calls.load, 1);
});

test("a FAILED workspace fetch does not throw the user's place away", async () => {
  const host = restoreHost({ rows: [], throws: true });
  await host._restoreWorkspace(SAVED);
  assert.equal(
    host.calls.load,
    1,
    "an unreachable list is not evidence the workspace was deleted",
  );
  assert.equal(host.calls.forgot, 0);
});

test("an EMPTY list is treated the same way — not as proof of deletion", async () => {
  const host = restoreHost({ rows: [] });
  await host._restoreWorkspace(SAVED);
  assert.equal(host.calls.load, 1);
  assert.equal(host.calls.forgot, 0);
});

test("an incomplete snapshot is refused outright", async () => {
  const host = restoreHost({ rows: [{ hub_id: HUB }] });
  assert.equal(await host._restoreWorkspace(null), false);
  assert.equal(await host._restoreWorkspace({ hub_id: HUB }), false);
  assert.equal(await host._restoreWorkspace({ nid: "N" }), false);
  assert.equal(host.calls.load, 0);
});

test("the caller falls back to the default when a restore is refused", () => {
  const body = slice(DESK, "  async _restoreDeskState() {");
  assert.match(
    body,
    /const restored = await this\._restoreWorkspace\(saved\.workspace\);[\s\S]{0,120}if \(!restored\) await this\._openDefaultWorkspace\(\);/,
    "without this the desk lands on NO workspace, which the rail cannot render",
  );
});
