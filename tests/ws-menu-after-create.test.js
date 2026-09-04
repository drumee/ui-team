#!/usr/bin/env node

/**
 * THE ⋯ MENU MUST OPEN ON A WORKSPACE THAT WAS JUST CREATED.
 *
 * Reported as: create a workspace from form-folder__main, then press
 * desk-module-topbar__ws-head-action — nothing happens, and it keeps not
 * happening until the page is reloaded.
 *
 * THE CAUSE. The menu is built from the workspace's HOME-GRID TILE
 * (_workspaceMediaItem): only a media widget carries the privilege-gated row
 * list and can be the target the rows act on, so with no tile there are no
 * rows and _toggleWorkspaceMenu returns without feeding anything.
 *
 * And a create never puts a tile there. Wm inherits newContent from
 * window/utils, whose first test is
 *
 *     if (this.mget(_a.nid) != pid) return;   // only my own children
 *
 * While a workspace is open, loadWorkspace's apply() has done
 * `this.mset(data)` with that WORKSPACE's attributes, so Wm's nid is the
 * workspace root — while the new workspace's pid is the HOME root. They never
 * match. Only Wm.reload() (or a page load) puts Wm's nid back to home_id and
 * has the List.Smart fetch from scratch, which is why a refresh "fixed" it.
 *
 * Run from ui-team with:
 *   node --test tests/ws-menu-after-create.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const DESK = read("src/drumee/modules/desk/index.js");
const UTILS = read("src/drumee/builtins/window/utils.js");

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

const _ = require("underscore");
const A = new Proxy({}, { get: (_t, k) => String(k) });

// ── the premise ────────────────────────────────────────────────────────────

test("newContent only accepts children of the node Wm is showing", () => {
  // If this guard ever goes, a create WOULD reach the grid on its own and the
  // refresh below becomes belt-and-braces rather than the fix.
  const body = slice(UTILS, "  newContent(xhr, options = {}) {");
  const stripped = body.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /if \(this\.mget\(_a\.nid\) != pid\) return;/);
});

test("loadWorkspace points Wm at the workspace, not at home", () => {
  // The other half of the mismatch: while a workspace is open Wm's own nid is
  // that workspace's root, so a new workspace's pid (the home root) cannot
  // match it.
  const WM = read("src/drumee/modules/desk/wm/index.js");
  const apply = slice(WM, "    const apply = (data) => {");
  assert.match(apply, /this\.mset\(data\)/);
  const reload = slice(WM, "  reload() {");
  assert.match(reload, /nid: Visitor\.get\(_a\.home_id\)/, "reload is what put it back");
});

// ── the refresher ──────────────────────────────────────────────────────────

function makeDesk({ list } = {}) {
  const calls = { restarts: 0, warns: [] };
  const globals = {
    _,
    _a: A,
    window: { Wm: { iconsList: list } },
    setTimeout,
  };
  const desk = Object.create({
    _refreshHomeGrid: method(DESK, "  _refreshHomeGrid() {", globals),
  });
  desk.calls = calls;
  desk.warn = (...a) => calls.warns.push(a);
  return desk;
}

const liveList = (calls, { throws = false, answers = true } = {}) => {
  const handlers = [];
  return {
    el: {},
    isDestroyed: () => false,
    collection: { once: (e, f) => e === "update" && handlers.push(f) },
    restart() {
      calls.restarts++;
      if (throws) throw new Error("boom");
      if (answers) setTimeout(() => handlers.forEach((f) => f()), 1);
    },
  };
};

test("it restarts the grid and resolves when the list answers", async () => {
  const calls = { restarts: 0 };
  const desk = makeDesk({ list: liveList(calls) });
  assert.equal(await desk._refreshHomeGrid(), true);
  assert.equal(calls.restarts, 1);
});

test("a fetch that never answers still settles the caller", async () => {
  // A failed or empty fetch raises no collection update at all — the caller is
  // a click handler and must not be left hanging on it.
  //
  // Raced against a deadline rather than simply awaited: without the floor this
  // promise never settles, and an await would hang the whole file instead of
  // failing this one test.
  const calls = { restarts: 0 };
  const desk = makeDesk({ list: liveList(calls, { answers: false }) });
  const t = Date.now();
  const HUNG = Symbol("hung");
  const settled = await Promise.race([
    desk._refreshHomeGrid(),
    new Promise((r) => setTimeout(() => r(HUNG), 3000)),
  ]);
  assert.notEqual(settled, HUNG, "it never settled — the 2s floor is gone");
  assert.equal(settled, false);
  assert.ok(Date.now() - t >= 1900, "it resolved early — the floor is gone");
});

test("a restart that throws is survived", async () => {
  const calls = { restarts: 0 };
  const desk = makeDesk({ list: liveList(calls, { throws: true }) });
  assert.equal(await desk._refreshHomeGrid(), false);
  assert.equal(desk.calls.warns.length, 1);
});

test("no grid, a destroyed grid, or one that cannot restart: resolves false", async () => {
  for (const list of [
    null,
    undefined,
    { el: {}, isDestroyed: () => true, restart() {} },
    { el: {}, isDestroyed: () => false },
  ]) {
    assert.equal(await makeDesk({ list })._refreshHomeGrid(), false);
  }
});

// ── it is called where it has to be ────────────────────────────────────────

test("a create refreshes the grid", () => {
  const body = slice(DESK, "  async _onWorkspaceCreated(payload = {}) {");
  const stripped = body.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /this\._refreshHomeGrid\(\)/);
  // Before the branch that opens the new workspace and returns, or the two
  // early returns there would skip it.
  const at = stripped.indexOf("this._refreshHomeGrid()");
  const firstReturn = stripped.indexOf("if (wasEmpty)");
  assert.notEqual(firstReturn, -1);
  assert.ok(at < firstReturn, "the early-return branches skip the refresh");
});

test("…and it is NOT awaited on that path", () => {
  // This handler is what opens a freshly created workspace; nothing below it
  // needs the tiles, and a 2s floor in front of that open would be felt.
  const body = slice(DESK, "  async _onWorkspaceCreated(payload = {}) {");
  assert.ok(
    !/await this\._refreshHomeGrid\(\)/.test(body),
    "the open of the new workspace now waits on a grid fetch",
  );
});

// ── the menu recovers instead of doing nothing ─────────────────────────────

const MENU = slice(DESK, "  _toggleWorkspaceMenu(cmd, retried) {");

test("with no media the menu refreshes and retries, rather than returning", () => {
  const stripped = MENU.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /if \(!keys\.length\) \{/);
  assert.match(stripped, /this\._refreshHomeGrid\(\)\.then\(/);
  assert.match(stripped, /this\._toggleWorkspaceMenu\(cmd, 1\)/);
});

test("it retries exactly ONCE", () => {
  const stripped = MENU.replace(/\/\/[^\n]*/g, "");
  // The second miss returns: the workspace genuinely is not in the grid, and a
  // request per press would buy nothing.
  const at = stripped.indexOf("if (!keys.length) {");
  assert.notEqual(at, -1);
  assert.match(stripped.slice(at, at + 200), /if \(retried\) return;/);
});

test("the retry does not re-enter the close-on-second-click branch", () => {
  // That branch answers a menu the FIRST press opened. The retry is the same
  // press continuing, so going through it again would shut what it just built.
  const stripped = MENU.replace(/\/\/[^\n]*/g, "");
  assert.match(stripped, /if \(!retried && this\._closeWorkspaceMenu\(\)\) return;/);
});

test("the retry checks both itself and the button are still alive", () => {
  const stripped = MENU.replace(/\/\/[^\n]*/g, "");
  const at = stripped.indexOf("_refreshHomeGrid().then(");
  const tail = stripped.slice(at, at + 400);
  assert.match(tail, /this\.isDestroyed/);
  assert.match(tail, /cmd\.isDestroyed/);
});
