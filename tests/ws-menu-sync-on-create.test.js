#!/usr/bin/env node

/**
 * Creating a workspace must resync the topbar switcher
 * (`.desk-module-topbar__ws-menu`).
 *
 * THE GAP THIS COVERS. Both create surfaces already announced themselves — the
 * desk dialog (builtins/media/form, `.form-folder__main`) and the tour's live
 * create screen (desk/tutorial/workspace, `.tutorial-workspace__wsd-dialog`)
 * both go through libs/create-workspace, which fires `workspace:refresh` for
 * all three types. What was missing was a LISTENER on the desk: the sidebar
 * (desk/workspace-list) subscribed and the desk did not, so a workspace you had
 * just made showed up in the sidebar but was absent from the only global way to
 * switch workspace.
 *
 * Two of the tests below run the real `_fetchWorkspaces` / `_onWorkspaceCreated`
 * bodies against a fake host, because the two things that can silently break
 * this are both behavioural: serving the cache on the forced path, and the GET
 * being answered from the browser's HTTP cache.
 *
 * Run from ui-team with:
 *   node --test tests/ws-menu-sync-on-create.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const DESK = read("src/drumee/modules/desk/index.js");
const TOPBAR = read("src/drumee/modules/desk/skeleton/topbar.js");
const CREATE_WS = read("src/drumee/libs/create-workspace.js");
const FORM = read("src/drumee/builtins/media/form/index.js");
const TUTORIAL = read("src/drumee/modules/desk/tutorial/workspace/index.js");
const WS_LIST = read("src/drumee/modules/desk/workspace-list/index.js");

const strip = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** Pull one balanced `{...}` block starting at `header`. */
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

/**
 * Compile one `async name(...) {...}` class method into a standalone function,
 * with the module globals it reads supplied as parameters.
 */
function method(src, header, globals) {
  const body = slice(src, header);
  const names = Object.keys(globals);
  // eslint-disable-next-line no-new-func
  const make = new Function(
    ...names,
    `return ({ ${body} }).${header.replace(/^async\s+/, "").split("(")[0]};`,
  );
  return make(...names.map((n) => globals[n]));
}

// ── the class the switcher renders into ─────────────────────────────────────

test("the switcher list is the ws-menu part this syncs", () => {
  const sw = slice(TOPBAR, "function workspaceSwitcher(pfx, ui) {");
  assert.match(sw, /className:\s*`\$\{pfx\}__ws-menu`/);
  assert.match(sw, /sys_pn:\s*"ws-list"/);
  assert.match(sw, /sys_pn:\s*"ws-head"/);
});

// ── the signal already existed ──────────────────────────────────────────────

test("libs/create-workspace broadcasts workspace:refresh", () => {
  assert.match(
    CREATE_WS,
    /RADIO_BROADCAST\.trigger\("workspace:refresh"/,
    "the announce broadcast is what every listener hangs off",
  );
});

test("both create surfaces route through libs/create-workspace", () => {
  // Matched as two independent facts rather than as a windowed span: a comment
  // between the require and the call is not a change in routing, and a fixed
  // character window turns one into a failure.
  for (const [label, src] of [["media/form", FORM], ["tutorial", TUTORIAL]]) {
    assert.match(
      src,
      /require\(['"]libs\/create-workspace['"]\)/,
      `${label} does not require the lib`,
    );
    assert.match(src, /\.createWorkspace\(/, `${label} does not call it`);
  }
});

test("the sidebar already listened — the desk is the half that was missing", () => {
  assert.match(WS_LIST, /RADIO_BROADCAST\.on\("workspace:refresh"/);
});

// ── the new subscription ────────────────────────────────────────────────────

test("the desk subscribes, and unsubscribes the same handler", () => {
  const on = DESK.match(
    /RADIO_BROADCAST\.on\("workspace:refresh",\s*this\.(_\w+)\)/,
  );
  assert.ok(on, "the desk does not subscribe to workspace:refresh");
  const handler = on[1];
  assert.match(
    DESK,
    new RegExp(`RADIO_BROADCAST\\.off\\("workspace:refresh",\\s*this\\.${handler}\\)`),
    "subscribed without a matching off — the desk is remounted, so this leaks "
      + "a handler per mount and fires the render N times",
  );
  assert.match(
    DESK,
    new RegExp(`this\\.${handler}\\s*=\\s*this\\.${handler}\\.bind\\(this\\)`),
    "the handler must be bound, or `off` gets a different function object and "
      + "the unsubscribe silently does nothing",
  );
});

// ── the force actually reaches the fetch ────────────────────────────────────

test("_renderWorkspaceMenu takes force and hands it to _fetchWorkspaces", () => {
  const body = strip(slice(DESK, "async _renderWorkspaceMenu(target, force) {"));
  assert.match(
    body,
    /_fetchWorkspaces\(force\)/,
    "without this the handler re-feeds the SAME cached array and the menu "
      + "never changes",
  );
});

// ── _fetchWorkspaces, run for real ─────────────────────────────────────────

function fetchHost(rows) {
  const calls = [];
  return {
    calls,
    host: {
      _workspaces: null,
      warn() {},
      fetchService(service, payload) {
        calls.push({ service, payload });
        return Promise.resolve(rows);
      },
    },
  };
}

const GLOBALS = {
  _: require("underscore"),
  _a: { folder: "folder", hub: "hub", personal: "personal" },
  SERVICE: { desk: { home: "desk.home" } },
  Visitor: { id: "V1" },
};

const fetchWorkspaces = method(
  DESK,
  "async _fetchWorkspaces(force) {",
  GLOBALS,
);

const HUB = { filetype: "hub", area: "private", hub_id: "H1", filename: "A" };
const NEW_HUB = { filetype: "hub", area: "share", hub_id: "H2", filename: "B" };

test("unforced: the cache is served and no request goes out", async () => {
  const { host, calls } = fetchHost([HUB]);
  host._workspaces = [HUB];
  const rows = await fetchWorkspaces.call(host);
  assert.deepEqual(rows, [HUB]);
  assert.equal(calls.length, 0);
});

test("forced: the cache is bypassed and REPLACED", async () => {
  const { host, calls } = fetchHost([HUB, NEW_HUB]);
  host._workspaces = [HUB];
  const rows = await fetchWorkspaces.call(host, true);
  assert.equal(calls.length, 1);
  assert.equal(rows.length, 2, "the newly created workspace is missing");
  // Replaced, not merely returned: the topbar is rebuilt when a workspace
  // opens, and that rebuild's render reads the cache unforced.
  assert.equal(host._workspaces.length, 2);
});

test("forced: a cache-buster is sent, because this is a read-after-write", async () => {
  const { host, calls } = fetchHost([HUB]);
  await fetchWorkspaces.call(host, true);
  const p = calls[0].payload;
  assert.ok(
    "_ts" in p,
    "fetchService is a GET built with cache:'default' (ui-essentials "
      + "socket/utils.js), so this exact URL can be answered from the browser "
      + "HTTP cache with the PRE-create response",
  );
  assert.equal(typeof p._ts, "number");
});

test("unforced: no cache-buster, so the boot read still hits the cache", async () => {
  const { host, calls } = fetchHost([HUB]);
  await fetchWorkspaces.call(host);
  assert.ok(!("_ts" in calls[0].payload));
});

test("two forced reads produce different URLs", async () => {
  const { host, calls } = fetchHost([HUB]);
  await fetchWorkspaces.call(host, true);
  // Date.now() has ms resolution; busy-wait one tick so the two differ.
  const t0 = Date.now();
  while (Date.now() === t0) { /* spin */ }
  await fetchWorkspaces.call(host, true);
  assert.notEqual(calls[0].payload._ts, calls[1].payload._ts);
});

// ── _onWorkspaceCreated, run for real ──────────────────────────────────────

const onWorkspaceCreated = method(DESK, "async _onWorkspaceCreated(payload = {}) {", {});

/**
 * `wasEmpty` is the desk's `data-no-workspace` stamp. These tests are about the
 * SWITCHER, so they default to a non-empty desk and assert nothing else moved;
 * the empty→non-empty handoff is covered in
 * desk-empty-workspace-screen.test.js.
 */
function deskHost({ list, head, wasEmpty = false, rows = [{ hub_id: HUB }] } = {}) {
  const seen = { render: [], label: 0, openOrScreen: [], screen: [] };
  return {
    seen,
    host: {
      _workspaces: [HUB],
      _wsListPart: list,
      _wsHeadPart: head,
      el: { dataset: { noWorkspace: wasEmpty ? "1" : "0" } },
      _renderWorkspaceMenu(target, force) {
        seen.render.push({ target, force });
        return Promise.resolve();
      },
      _syncWorkspaceLabel() {
        seen.label++;
      },
      // The home grid is refetched alongside the switcher — its tiles are what
      // the workspace ⋯ menu is built from, and a create never reaches them on
      // its own (see _refreshHomeGrid). Recorded so a test can assert it is
      // NOT awaited on the path that opens the new workspace.
      _refreshHomeGrid() {
        seen.gridRefresh = (seen.gridRefresh || 0) + 1;
        return new Promise(() => {});
      },
      _fetchWorkspaces: () => Promise.resolve(rows),
      _openWorkspaceOrEmptyScreen(opt) {
        seen.openOrScreen.push(opt);
        return Promise.resolve(true);
      },
      _showEmptyWorkspaceScreen(empty) {
        seen.screen.push(empty);
        return Promise.resolve();
      },
      // An internal / external create from the empty screen defers the open
      // until the access panel is dismissed — that step is covered in
      // desk-empty-workspace-screen.test.js.
      _openWorkspaceAfterAccessPanel() {
        seen.deferred = (seen.deferred || 0) + 1;
      },
    },
  };
}

const livePart = () => ({ el: {}, isDestroyed: () => false });
const deadPart = () => ({ el: {}, isDestroyed: () => true });

test("with the list mounted: renders FORCED, then syncs the label", async () => {
  const list = livePart();
  const { host, seen } = deskHost({ list });
  await onWorkspaceCreated.call(host);
  assert.deepEqual(seen.render, [{ target: list, force: true }]);
  assert.equal(seen.label, 1);
});

test("the header alone is enough to render", async () => {
  const { host, seen } = deskHost({ head: livePart() });
  await onWorkspaceCreated.call(host);
  assert.equal(seen.render.length, 1);
  assert.equal(seen.render[0].force, true);
});

test("no parts: drop the cache so the mount-time render fetches fresh", async () => {
  const { host, seen } = deskHost({});
  await onWorkspaceCreated.call(host);
  assert.equal(seen.render.length, 0, "nothing to render into");
  assert.equal(
    host._workspaces,
    null,
    "the cache MUST be dropped here — onPartReady renders unforced, so a kept "
      + "cache means the menu mounts stale and nothing ever corrects it",
  );
});

test("destroyed parts count as absent, not as renderable", async () => {
  const { host, seen } = deskHost({ list: deadPart(), head: deadPart() });
  await onWorkspaceCreated.call(host);
  assert.equal(seen.render.length, 0);
  assert.equal(host._workspaces, null);
});

test("a create from a non-empty desk keeps the screen down and opens nothing", async () => {
  const { host, seen } = deskHost({ list: livePart() });
  await onWorkspaceCreated.call(host);
  assert.deepEqual(seen.openOrScreen, [], "the dialog decides its own follow-up");
  assert.deepEqual(seen.screen, [false], "still not empty");
});

test("an internal/external create from the empty screen DEFERS the open", async () => {
  // It waits for `.permission-restricted__main` to be dismissed first —
  // loadWorkspace clears the wrapper-modal that panel lives in.
  const { host, seen } = deskHost({ list: livePart(), wasEmpty: true });
  await onWorkspaceCreated.call(host);
  assert.equal(seen.deferred, 1);
  assert.deepEqual(seen.openOrScreen, [], "not opened yet");
});

test("a PERSONAL create from the empty screen opens immediately", async () => {
  // A home-root folder raises no panel, so there is nothing to wait for.
  const { host, seen } = deskHost({ list: livePart(), wasEmpty: true });
  await onWorkspaceCreated.call(host, { personal: 1 });
  assert.deepEqual(seen.openOrScreen, [{ force: true }]);
  assert.equal(seen.deferred, undefined);
});


test("a REMOVAL of the last workspace raises the screen from here too", async () => {
  // ws:event reaches this same handler.
  const { host, seen } = deskHost({ list: livePart(), rows: [] });
  await onWorkspaceCreated.call(host);
  assert.deepEqual(seen.screen, [true]);
});

test("the home grid is refetched too, and never waited on", async () => {
  // The ⋯ menu is built from the workspace's home-grid TILE, and a create
  // while a workspace is open never puts one there (window/utils newContent
  // only accepts children of the node Wm is showing, and Wm is showing the
  // open workspace). Until this, the button was dead until a page reload.
  //
  // The harness's _refreshHomeGrid returns a promise that NEVER settles, so
  // this awaits the handler for real: if the source ever starts awaiting the
  // grid, this test hangs rather than passing — and the open of a freshly
  // created workspace would hang with it.
  const { host, seen } = deskHost({ list: livePart(), head: livePart() });
  const HUNG = Symbol("hung");
  const settled = await Promise.race([
    onWorkspaceCreated.call(host, {}),
    new Promise((r) => setTimeout(() => r(HUNG), 1000)),
  ]);
  assert.notEqual(settled, HUNG, "_onWorkspaceCreated now waits on the grid");
  assert.equal(seen.gridRefresh, 1, "the grid was left stale");
});
