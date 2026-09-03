#!/usr/bin/env node

/**
 * No workspace left: open another, or show the screen that says there are none.
 *
 * With workspaces 1, 2 and 3, deleting 1 lands on 2 and deleting 3 lands on 2
 * — that is step 1, and it always worked. Delete 2 as well and there is nothing
 * to fall back to: `_openDefaultWorkspace()` returned false into six call sites
 * that all ignored it, leaving the desk on a shape its own chrome cannot draw
 * (the rail's Files / Chat / Task / Meet all act on an OPEN workspace).
 *
 *   step 1  any workspace left in the list the topbar switcher is fed from?
 *           open it.
 *   step 2  otherwise show desk/home-empty — logo, title, and the button that
 *           opens the create dialog (`.form-folder__main`). On a successful
 *           create, open the new workspace.
 *
 * Run from ui-team with:
 *   node --test tests/desk-empty-workspace-screen.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");
const DESK = read("src/drumee/modules/desk/index.js");
const DESK_SCSS = read("src/drumee/modules/desk/skin/index.scss");
const WM = read("src/drumee/modules/desk/wm/index.js");

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

const A = { once: "once" };

// ── the widget ─────────────────────────────────────────────────────────────

test("the screen is logo, title and one button — and nothing else", () => {
  const skel = read("src/drumee/modules/desk/home-empty/skeleton/index.js");
  assert.match(skel, /ico: "raw-logo-drumee-full"/, "the full wordmark");
  assert.match(skel, /LOCALE\.HOME_HERO_TITLE/);
  assert.match(skel, /LOCALE\.CREATE_FIRST_WORKSPACE/);
  // No description paragraph. Matched on the USAGE form: the skeleton's own
  // docblock names HOME_HERO_DESC while explaining why it is not drawn, and a
  // raw match reads that prose as the thing it warns about — the same reason
  // desk-panel-geometry-and-icons strips comments before matching.
  assert.ok(
    !/LOCALE\.HOME_HERO_DESC/.test(skel),
    "the ask was logo, title, button",
  );
});

test("its copy needs no new locale keys", () => {
  for (const lang of ["en", "fr", "es", "ru", "zh", "km"]) {
    const d = JSON.parse(read(`locale/${lang}.json`));
    assert.ok(d.HOME_HERO_TITLE, `HOME_HERO_TITLE missing from ${lang}`);
    assert.ok(d.CREATE_FIRST_WORKSPACE, `CREATE_FIRST_WORKSPACE missing from ${lang}`);
  }
});

test("the button opens form-folder__main through the desk", () => {
  const widget = read("src/drumee/modules/desk/home-empty/index.js");
  // The FORCED variant: "a workspace, whatever is open".
  assert.match(widget, /service: "new-workspace-form"/);
  // Wm's case is what feeds media_form (= .form-folder__main).
  assert.match(WM, /kind: "media_form"/);
  assert.match(
    DESK,
    /case "new-workspace-form":/,
    "the desk must handle what the button raises",
  );
});

test("it is registered and has its own slot", () => {
  assert.match(read("src/drumee/seeds.js"), /desk_home_empty:[\s\S]{0,80}desk\/home-empty/);
  assert.match(
    read("src/drumee/modules/desk/skeleton/index.js"),
    /sys_pn: "home-empty-slot"/,
  );
});

// ── steps 1 and 2, run for real ────────────────────────────────────────────

function deskHost({ rows, throws = false, mounted = 0 }) {
  const calls = { fetched: [], opened: [], fed: 0, cleared: 0 };
  const slot = {
    el: {},
    collection: { length: mounted },
    feed() {
      calls.fed++;
      slot.collection.length = 1;
    },
    clear() {
      calls.cleared++;
      slot.collection.length = 0;
    },
  };
  const globals = {
    _: require("underscore"),
    _a: A,
    Kind: { waitFor: () => Promise.resolve() },
  };
  const host = Object.create({
    _openWorkspaceOrEmptyScreen: method(
      DESK,
      "async _openWorkspaceOrEmptyScreen(opt = {}) {",
      globals,
    ),
    _showEmptyWorkspaceScreen: method(
      DESK,
      "async _showEmptyWorkspaceScreen(empty) {",
      globals,
    ),
  });
  host.calls = calls;
  host.el = { dataset: {} };
  host.warn = () => {};
  host.isDestroyed = () => false;
  host._fetchWorkspaces = (force) => {
    calls.fetched.push(!!force);
    return throws ? Promise.reject(new Error("offline")) : Promise.resolve(rows);
  };
  host.ensurePart = () => Promise.resolve(slot);
  const crumb = {
    cleared: 0,
    isDestroyed: () => false,
    loadDefault() {
      crumb.cleared++;
      calls.crumbCleared = crumb.cleared;
    },
  };
  host.crumb = crumb;
  host.getPart = (pn) => (pn === "breadcrumb" ? crumb : null);
  host._workspaceTarget = (r) => ({ hub_id: r.hub_id });
  host._waitForWm = () =>
    Promise.resolve({
      loadWorkspace: (t) => calls.opened.push(t.hub_id),
    });
  return host;
}

test("STEP 1: a surviving workspace is opened, and no screen goes up", async () => {
  const host = deskHost({ rows: [{ hub_id: "2" }, { hub_id: "3" }] });
  const opened = await host._openWorkspaceOrEmptyScreen();
  assert.equal(opened, true);
  assert.deepEqual(host.calls.opened, ["2"], "the first row is the fallback");
  assert.equal(host.calls.fed, 0);
  assert.equal(host.el.dataset.noWorkspace, "0");
});

test("STEP 2: with none left, the screen goes up and nothing is opened", async () => {
  const host = deskHost({ rows: [] });
  const opened = await host._openWorkspaceOrEmptyScreen();
  assert.equal(opened, false);
  assert.deepEqual(host.calls.opened, [], "there is nothing to open");
  assert.equal(host.calls.fed, 1, "this is the reported gap");
  assert.equal(host.el.dataset.noWorkspace, "1");
});

test("the screen comes down again when a workspace exists", async () => {
  const host = deskHost({ rows: [{ hub_id: "9" }], mounted: 1 });
  await host._openWorkspaceOrEmptyScreen();
  assert.equal(host.calls.cleared, 1, "it must be reversible without a reload");
  assert.equal(host.el.dataset.noWorkspace, "0");
});

test("3 → 2 → 1 → 0 → 1, the whole sequence", async () => {
  const host = deskHost({ rows: [{ hub_id: "1" }, { hub_id: "2" }, { hub_id: "3" }] });
  await host._openWorkspaceOrEmptyScreen();
  assert.deepEqual(host.calls.opened, ["1"]);
  host._fetchWorkspaces = () => Promise.resolve([{ hub_id: "2" }, { hub_id: "3" }]);
  await host._openWorkspaceOrEmptyScreen();
  assert.deepEqual(host.calls.opened, ["1", "2"], "delete 1 → land on 2");
  host._fetchWorkspaces = () => Promise.resolve([{ hub_id: "2" }]);
  await host._openWorkspaceOrEmptyScreen();
  assert.deepEqual(host.calls.opened, ["1", "2", "2"], "delete 3 → still 2");
  host._fetchWorkspaces = () => Promise.resolve([]);
  await host._openWorkspaceOrEmptyScreen();
  assert.equal(host.calls.fed, 1, "delete 2 → the screen, not a blank desk");
  assert.equal(host.calls.opened.length, 3);
  host._fetchWorkspaces = () => Promise.resolve([{ hub_id: "new" }]);
  await host._openWorkspaceOrEmptyScreen();
  assert.equal(host.calls.cleared, 1);
  assert.deepEqual(host.calls.opened, ["1", "2", "2", "new"]);
});

test("running step 2 twice does not stack a second screen", async () => {
  const host = deskHost({ rows: [] });
  await host._openWorkspaceOrEmptyScreen();
  await host._openWorkspaceOrEmptyScreen();
  assert.equal(host.calls.fed, 1);
});

test("force is passed through to the fetch", async () => {
  const host = deskHost({ rows: [{ hub_id: "1" }] });
  await host._openWorkspaceOrEmptyScreen({ force: true });
  assert.deepEqual(host.calls.fetched, [true]);
  await host._openWorkspaceOrEmptyScreen();
  assert.deepEqual(host.calls.fetched, [true, false]);
});

test("a FAILED fetch shows no screen and opens nothing", async () => {
  const host = deskHost({ rows: null, throws: true });
  assert.equal(await host._openWorkspaceOrEmptyScreen(), false);
  assert.equal(host.calls.fed, 0, "an unreachable list is not an empty account");
  assert.equal(host.el.dataset.noWorkspace, undefined);
});

test("_openDefaultWorkspace still exists and forwards its options", () => {
  const body = slice(DESK, "  async _openDefaultWorkspace(opt = {}) {");
  assert.match(body, /_openWorkspaceOrEmptyScreen\(opt\)/);
});

// ── after a create, open it ────────────────────────────────────────────────

test("a create from the empty screen is forced, whichever path it takes", () => {
  const body = slice(DESK, "  async _onWorkspaceCreated(payload = {}) {");
  assert.match(body, /const wasEmpty =/, "it must read the stamp before refetching");
  // Personal opens immediately; internal / external go through the deferred
  // path. Both end in a FORCED list — unforced, step 1 would see the empty list
  // the screen was built from. The deferral is asserted below.
  assert.match(
    body,
    /if \(wasEmpty\) \{[\s\S]{0,400}_openWorkspaceOrEmptyScreen\(\{ force: true \}\)/,
  );
  const deferred = slice(DESK, "  _openWorkspaceAfterAccessPanel() {");
  assert.match(deferred, /_openWorkspaceOrEmptyScreen\(\{ force: true \}\)/);
});

// ── the removal path must not reopen what it just deleted ──────────────────

test("removal opens the default with force", () => {
  const body = slice(WM, "  onCurrentWorkspaceRemoved(hub_id) {");
  assert.match(
    body,
    /_openDefaultWorkspace\(\{ force: true \}\)/,
    "the cached list still holds the hub that was just deleted",
  );
});

// ── the slot must actually collapse ────────────────────────────────────────

test("the slot is NOT gated on :empty", () => {
  const at = DESK_SCSS.indexOf("&__home-empty-slot");
  assert.notEqual(at, -1);
  const rule = DESK_SCSS.slice(at, DESK_SCSS.indexOf("&__settings-main-slot", at));
  assert.ok(
    !/&:empty/.test(rule),
    "a Skeletons.Box is never CSS-empty — its emptyView renders an element, so "
      + "this would leave an opaque overlay over the open workspace",
  );
  assert.match(rule, /display: none/, "it must fail CLOSED");
  assert.ok(!/background:/.test(rule), "no paint outside the shown state");
  assert.ok(!/z-index:/.test(rule), "no stacking outside the shown state");
});

test("ui-core's Box really does render an emptyView", () => {
  // The premise for the rule above.
  const box = read("node_modules/@drumee/ui-core/letc/widgets/box/index.js");
  assert.match(box, /extends Marionette\.CollectionView/);
  assert.match(box, /emptyView\s*=\s*LetcBlank/);
  assert.match(
    read("node_modules/@drumee/ui-core/letc/widgets/blank/index.js"),
    /extends Marionette\.View/,
  );
});

test("the shown state is what paints, and the rail is gated with it", () => {
  const at = DESK_SCSS.indexOf('.desk-module[data-no-workspace="1"]');
  assert.notEqual(at, -1);
  const rule = DESK_SCSS.slice(at, at + 1200);
  assert.match(rule, /\.desk-module__home-empty-slot \{[\s\S]{0,200}display: flex/);
  assert.match(rule, /desk-module-sidebar__nav-main .desk-module-sidebar__item/);
  assert.match(rule, /desk-module-topbar__actions-cluster/);
});

test("the gated class names are the ones actually rendered", () => {
  const sidebar = read("src/drumee/modules/desk/skeleton/sidebar.js");
  assert.match(sidebar, /__nav-main/);
  assert.match(sidebar, /cls\(fig, "item"\)/);
  assert.match(read("src/drumee/modules/desk/skeleton/topbar.js"), /__actions-cluster/);
});

// ── the wordmark has to survive the dark theme ─────────────────────────────

test("the logo's letters are re-pointed at a token", () => {
  // assets/drumee-logo.svg hardcodes fill="#0B0A21" on the letters, which is
  // --normal-fg on light and almost exactly --normal-bg (#0b0a21) on dark — so
  // untouched, the word "drumee" all but vanishes and only the purple mark is
  // left. The sidebar hit the same thing and swapped in `rail-logo` for the
  // indigo rail.
  const skin = read("src/drumee/modules/desk/home-empty/skin/index.scss");
  assert.match(skin, /\[fill="#0B0A21"\]/);
  assert.match(skin, /fill: var\(--normal-fg\)/);
});

test("the asset still carries the fill this depends on", () => {
  // The premise. If the brand asset is re-exported with a different value, the
  // rule above silently stops matching — better to be told.
  const svg = read("src/drumee/assets/drumee-logo.svg");
  assert.match(svg, /fill="#0B0A21"/, "the letters' hardcoded fill changed");
  // And the dark theme's background really is that close to it.
  const dark = read("src/drumee/router/skin/themes/dark.scss");
  assert.match(dark, /--normal-bg:\s*#0b0a21/i);
});

// ── the topbar track ───────────────────────────────────────────────────────

test("with no workspace left, the left cluster's breadcrumb is cleared", async () => {
  const host = deskHost({ rows: [] });
  await host._openWorkspaceOrEmptyScreen();
  assert.equal(
    host.crumb.cleared,
    1,
    ".desk-module-topbar__left-cluster kept naming the deleted workspace",
  );
});

test("with a workspace, the breadcrumb is left alone", async () => {
  // Opening one repaints it via updateBreadcrumb — clearing here would fight
  // that and blank the track for a frame.
  const host = deskHost({ rows: [{ hub_id: "2" }] });
  await host._openWorkspaceOrEmptyScreen();
  assert.equal(host.crumb.cleared, 0);
});

test("a destroyed or missing breadcrumb part does not throw", async () => {
  const host = deskHost({ rows: [] });
  host.getPart = () => null;
  await assert.doesNotReject(() => host._openWorkspaceOrEmptyScreen());
  const host2 = deskHost({ rows: [] });
  host2.getPart = () => ({ isDestroyed: () => true, loadDefault() {} });
  await assert.doesNotReject(() => host2._openWorkspaceOrEmptyScreen());
});

test("loadDefault is what empties the track", () => {
  // The premise: the desk calls the part directly rather than broadcasting,
  // because the broadcast route compares data.event against `_a.home` while the
  // desk's own other caller sends `_e.home`.
  const bc = read("src/drumee/modules/desk/breadcrumb/index.js");
  assert.match(bc, /loadDefault\(\) \{[\s\S]{0,60}_buildContent\(\)/);
  // Anchored on the NAME, not the parameter list: upstream added an `opt`
  // argument (`_buildContent(data, opt = {})`) and a signature-exact match
  // failed on a change that left the behaviour alone.
  assert.match(
    bc,
    /_buildContent\(data[^)]*\) \{[\s\S]{0,260}isEmpty\(data\)[\s\S]{0,200}clear\(\)/,
    "no-data _buildContent must clear the content part",
  );
});

test("the breadcrumb really is inside __left-cluster", () => {
  const topbar = read("src/drumee/modules/desk/skeleton/topbar.js");
  const at = topbar.indexOf("__left-cluster");
  assert.notEqual(at, -1);
  const cluster = topbar.slice(at, at + 500);
  assert.match(cluster, /kind: "desk_breadcrumb"/);
  assert.match(cluster, /sys_pn: "breadcrumb"/);
});

// ── the workspace opens when the access panel is dismissed ─────────────────
//
// Creating an internal or external workspace from the empty screen ends on
// `.permission-restricted__main`. The workspace CANNOT be opened alongside it,
// because loadWorkspace clears the wrapper-modal that panel lives in — open
// first and the panel the user was about to invite people from is destroyed
// under them.
//
// THE BUG THIS NOW COVERS. The first version decided on the collection's state
// at ARM time, and it arms from `workspace:refresh` — which
// libs/create-workspace fires from INSIDE createWorkspace, BEFORE media/form's
// `.then` feeds the panel. So arm time sees whatever the create left in the
// wrapper, and reading "empty" as "no panel to wait for" was a guess about a
// state that had not happened yet: it opened the workspace immediately and the
// panel was destroyed a beat later. Reported as "it opens
// permission-restricted__main, next opens the workspace without waiting".
//
// It is a state machine now: nothing opens until a panel has been SEEN and then
// gone. Driven below against a real Backbone collection, because `feed` uses
// `collection.set()` and the event shape is the whole question.

const Backbone = require("backbone");

const PANEL = { kind: "permission_restricted" };
const FORM = { kind: "media_form" };

/** Arm the real method against a real collection and report what it opened. */
function armed(start) {
  const collection = new Backbone.Collection(start);
  const part = { el: {}, collection };
  const wm = { ensurePart: () => Promise.resolve(part), getPart: () => part };
  const fn = method(DESK, "  _openWorkspaceAfterAccessPanel() {", {
    _: require("underscore"),
    window: { Wm: wm },
    Wm: wm,
  });
  const opens = [];
  const host = {
    isDestroyed: () => false,
    _openWorkspaceOrEmptyScreen: (opt) => {
      opens.push(opt);
      return Promise.resolve(true);
    },
  };
  fn.call(host);
  return { collection, opens, host };
}

const settle = () => new Promise((r) => setTimeout(r, 5));

test("the real flow: form → panel → close", async () => {
  const { collection, opens } = armed([FORM]);
  await settle();
  collection.set([PANEL]); // media/form feeds the panel over itself
  await settle();
  assert.equal(opens.length, 0, "the panel is up — opening would destroy it");
  collection.remove(collection.first()); // the panel suppresses on close
  await settle();
  assert.deepEqual(opens, [{ force: true }]);
});

test("EMPTY at arm time, panel arrives after — it still waits", async () => {
  // This is the reported bug. `workspace:refresh` fires before the panel is
  // fed, so an empty reading at arm time proves nothing.
  const { collection, opens } = armed([]);
  await settle();
  collection.set([PANEL]);
  await settle();
  assert.equal(
    opens.length,
    0,
    "it opened immediately and the panel was destroyed a beat later",
  );
  collection.remove(collection.first());
  await settle();
  assert.deepEqual(opens, [{ force: true }]);
});

test("a panel already up at arm time is waited for", async () => {
  const { collection, opens } = armed([PANEL]);
  await settle();
  assert.equal(opens.length, 0);
  collection.remove(collection.first());
  await settle();
  assert.equal(opens.length, 1);
});

test("the form → panel swap does not release the choke-point hold", () => {
  // media/form feeds the panel over itself: one `update`, the panel still
  // there. Releasing on that would open the workspace the instant the panel
  // appeared — the reported behaviour.
  const host = wmHost([{ kind: "media_form", hub_id: "H1" }]);
  // Arm the hold with the panel already up, then swap it for an identical one.
  host.collection.set([PANEL_FOR("H1")]);
  host.loadWorkspace({ hub_id: "H1" });
  assert.deepEqual(host.opens, [], "held");
  host.collection.set([PANEL_FOR("H1")]);
  assert.deepEqual(host.opens, [], "a swap between panels is not a close");
  host.collection.remove(host.collection.first());
  assert.equal(host.opens.length, 1);
});

test("the form → panel swap is not a close", async () => {
  const { collection, opens } = armed([FORM]);
  await settle();
  collection.set([PANEL]);
  await settle();
  assert.equal(opens.length, 0);
});

test("it opens exactly once", async () => {
  const { collection, opens } = armed([FORM]);
  await settle();
  collection.set([PANEL]);
  collection.remove(collection.first());
  await settle();
  collection.set([PANEL]);
  collection.remove(collection.first());
  await settle();
  assert.equal(opens.length, 1, "the listener must be removed after firing");
});

test("no panel ever appears → it still opens, bounded", async () => {
  const { opens } = armed([]);
  await settle();
  assert.equal(opens.length, 0, "not immediately — it gives the panel a chance");
  await new Promise((r) => setTimeout(r, 4200));
  assert.deepEqual(opens, [{ force: true }], "but it must not wait forever");
});

test("a destroyed desk opens nothing", async () => {
  const { collection, opens, host } = armed([PANEL]);
  await settle();
  host.isDestroyed = () => true;
  collection.remove(collection.first());
  await settle();
  assert.equal(opens.length, 0);
});

test("it cannot be armed twice over one create", async () => {
  const collection = new Backbone.Collection([PANEL]);
  const part = { el: {}, collection };
  const wm = { ensurePart: () => Promise.resolve(part), getPart: () => part };
  const fn = method(DESK, "  _openWorkspaceAfterAccessPanel() {", {
    _: require("underscore"),
    window: { Wm: wm },
    Wm: wm,
  });
  const opens = [];
  const host = {
    isDestroyed: () => false,
    _openWorkspaceOrEmptyScreen: (o) => {
      opens.push(o);
      return Promise.resolve(true);
    },
  };
  fn.call(host);
  fn.call(host);
  await settle();
  collection.remove(collection.first());
  await settle();
  assert.equal(opens.length, 1);
});

test("the timer is cleared with the desk", () => {
  const body = slice(DESK, "  onDestroy() {");
  assert.match(body, /clearTimeout\(this\._accessPanelTimer\)/);
  assert.match(body, /off\("update reset", this\._onAccessPanelClosed\)/);
});

test("loadWorkspace still clears the wrapper-modal — that is the hazard", () => {
  // The reason the deferral exists at all. It is now GUARDED for this
  // workspace's own access panel (see the survival tests at the end), but it
  // still clears everything else — so opening a workspace during a dialog chain
  // remains destructive and the ordering still matters.
  const body = slice(WM, "  loadWorkspace(workspace) {");
  assert.match(body, /ensurePart\("wrapper-modal"\)\.then\(/);
  assert.match(body, /p\.clear\(\);/);
});

test("`workspace:refresh` really fires before the panel is fed", () => {
  // The premise for the two-stage wait: announce() runs inside createWorkspace,
  // and media/form feeds the panel in the .then AFTER it resolves.
  const lib = read("src/drumee/libs/create-workspace.js");
  assert.match(lib, /announce\(workspace, false\);\n\s*return \{ ok: true/);
  const form = read("src/drumee/builtins/media/form/index.js");
  assert.match(form, /\.then\(\(res\) => \{/);
  assert.match(form, /parent\.feed\(\{[\s\S]{0,80}kind: post/);
});

// ── who waits and who does not ─────────────────────────────────────────────

test("internal / external wait; PERSONAL opens immediately", () => {
  const body = slice(DESK, "  async _onWorkspaceCreated(payload = {}) {");
  assert.match(
    body,
    /if \(payload\.personal\) \{[\s\S]{0,120}_openWorkspaceOrEmptyScreen\(\{ force: true \}\)/,
    "a home-root folder raises no panel, so there is nothing to wait for",
  );
  assert.match(body, /this\._openWorkspaceAfterAccessPanel\(\);/);
});

test("the personal flag really is on the workspace:refresh payload", () => {
  const lib = read("src/drumee/libs/create-workspace.js");
  assert.match(lib, /payload\.personal = 1/);
  assert.match(lib, /RADIO_BROADCAST\.trigger\("workspace:refresh", payload\)/);
});

test("media/form really does chain to permission_restricted", () => {
  const form = read("src/drumee/builtins/media/form/index.js");
  assert.match(form, /post_override"\) \|\| "permission_restricted"/);
  assert.match(form, /parent\.feed\(\{[\s\S]{0,80}kind: post/);
});

test("the pending listener is torn down with the desk", () => {
  // The desk's teardown is onDestroy, not onBeforeDestroy.
  const body = slice(DESK, "  onDestroy() {");
  assert.match(
    body,
    /off\("update reset", this\._onAccessPanelClosed\)/,
    "it lives on Wm's collection, which outlives the desk",
  );
});

// ── internal and external take the SAME client path ────────────────────────
//
// Reported as "creating an external workspace works, internal does not". These
// assert there is nothing area-specific left on the client to explain that: the
// two differ only in the `area` string sent to desk.create_hub, and everything
// after — the follow-up panel, the deferred open, the switcher resync — is one
// code path.
//
// So an internal-only failure is server-side. Confirmed on stage 2026-09-03 for
// vowaw91171@robustq.com: create_hub at 15:13:06 produced a `share` hub ("hhh"),
// the attempt at 15:12:36 produced no row at all, and desk_create_hub's generic
// SQLEXCEPTION handler rolls back with @full_error as the reason.

test("both hub types send only a different `area`", () => {
  const lib = read("src/drumee/libs/create-workspace.js");
  assert.match(lib, /team:\s*"private"/);
  assert.match(lib, /share:\s*"share"/);
  // One request builder, one payload shape.
  const at = lib.indexOf("function createHub(");
  const body = lib.slice(at, lib.indexOf("\n}", at));
  assert.match(body, /const area = HUB_AREA\[type\] \|\| HUB_AREA\.team;/);
  assert.ok(
    !/private|internal/i.test(body.replace(/\/\/[^\n]*/g, "")),
    "no area-specific branch in the request path",
  );
});

test("both end on permission_restricted, then the deferred open", () => {
  const form = read("src/drumee/builtins/media/form/index.js");
  // One `post` for both hub types; only `personal` returns early.
  assert.match(form, /post_override"\) \|\| "permission_restricted"/);
  assert.match(form, /if \(res\.personal\) \{/);
  // And the desk defers for anything that is not personal — no area test.
  const created = slice(DESK, "  async _onWorkspaceCreated(payload = {}) {");
  assert.match(created, /if \(payload\.personal\)/);
  assert.match(created, /this\._openWorkspaceAfterAccessPanel\(\);/);
  assert.ok(
    !/private|share|internal|external/i.test(
      created.replace(/\/\/[^\n]*/g, ""),
    ),
    "the deferred open must not branch on area",
  );
});

test("a rolled-back create is reported, not tracked as a success", () => {
  // The silent half of the report: desk_create_hub emits a success-shaped row
  // BEFORE its rollback row, so res[0] read as success and the client tracked
  // and announced a workspace that did not exist.
  const lib = read("src/drumee/libs/create-workspace.js");
  assert.match(lib, /rows\.find\(\(r\) => ~~r\.failed === 1\)/);
  assert.ok(
    !/const hub = _\.isArray\(res\) \? res\[0\] : res;/.test(lib),
    "res[0] is the success-shaped row that runs on the rollback path too",
  );
});

// ── the panel survives the open, whoever opened it ─────────────────────────
//
// The deferral above is correct and deployed, and the panel still vanished on
// stage — so something other than the desk's own path opens the workspace after
// a create. Rather than keep hunting the caller, the damage is guarded where it
// happens: `loadWorkspace` clears the wrapper-modal, and that clear is what
// destroys the panel. Seven call sites reach it; one guard covers them all.

test("loadWorkspace keeps THIS workspace's access panel", () => {
  const body = slice(WM, "  loadWorkspace(workspace) {");
  assert.match(
    body,
    /_modalHoldsAccessPanelFor\(p, hub_id\)/,
    "the clear is what destroyed the panel the create had just fed",
  );
  // And it is still a clear in every other case.
  assert.match(body, /p\.clear\(\);/);
});

const holdsPanel = method(WM, "  _modalHoldsAccessPanelFor(p, hub_id) {", {
  _: require("underscore"),
  _a: { kind: "kind", hub_id: "hub_id" },
});

/** A wrapper-modal holding the given skeletons. */
function wrapper(items) {
  return { collection: new Backbone.Collection(items) };
}

test("it matches the access panel for the same hub", () => {
  const p = wrapper([{ kind: "permission_restricted", hub_id: "H1" }]);
  assert.equal(holdsPanel.call({}, p, "H1"), true);
});

test("a panel for a DIFFERENT workspace is still cleared", () => {
  // Or it would be left describing a workspace nobody is looking at.
  const p = wrapper([{ kind: "permission_restricted", hub_id: "OTHER" }]);
  assert.equal(holdsPanel.call({}, p, "H1"), false);
});

test("the create form, window_info and the invite popup still clear", () => {
  for (const kind of ["media_form", "window_info", "invite_popup"]) {
    const p = wrapper([{ kind, hub_id: "H1" }]);
    assert.equal(holdsPanel.call({}, p, "H1"), false, `${kind} must clear`);
  }
});

test("numeric and string hub ids compare equal", () => {
  const p = wrapper([{ kind: "permission_restricted", hub_id: 12345 }]);
  assert.equal(holdsPanel.call({}, p, "12345"), true);
});

test("an empty or missing wrapper never blocks the clear", () => {
  assert.equal(holdsPanel.call({}, wrapper([]), "H1"), false);
  assert.equal(holdsPanel.call({}, null, "H1"), false);
  assert.equal(holdsPanel.call({}, { collection: null }, "H1"), false);
});

test("no hub_id never blocks the clear", () => {
  const p = wrapper([{ kind: "permission_restricted", hub_id: "H1" }]);
  assert.equal(holdsPanel.call({}, p, undefined), false);
  assert.equal(holdsPanel.call({}, p, ""), false);
});

test("a throwing collection does not stop the workspace opening", () => {
  const warned = [];
  const p = { collection: { some: () => { throw new Error("boom"); } } };
  assert.equal(holdsPanel.call({ warn: (...a) => warned.push(a) }, p, "H1"), false);
  assert.equal(warned.length, 1, "and it is reported");
});

// ── the open WAITS, enforced at the choke point ────────────────────────────
//
// The desk defers its own open until the access panel closes, and that is
// correct and deployed — but the panel kept being torn out, so something else
// calls loadWorkspace after a create. The live bundle has seven call sites and
// inspection did not identify which. All of them end up in loadWorkspace, so
// the wait is enforced there: nothing the method does runs while
// `.permission-restricted__main` for that workspace is up.
//
// This applies to BOTH hub types — internal and external take one code path
// (asserted above), and the panel is keyed on hub_id, not on area.

const deferForPanel = method(WM, "  _deferForAccessPanel(workspace, hub_id) {", {
  _: require("underscore"),
  _a: { kind: "kind", hub_id: "hub_id" },
});

/** A Wm whose loadWorkspace records opens and honours the hold. */
function wmHost(items) {
  const collection = new Backbone.Collection(items);
  const part = { collection };
  const opens = [];
  const host = {
    opens,
    collection,
    warned: [],
    isDestroyed: () => false,
    warn: (...a) => host.warned.push(a.join(" ")),
    getPart: (n) => (n === "wrapper-modal" ? part : null),
    _modalHoldsAccessPanelFor: holdsPanel,
    _deferForAccessPanel: deferForPanel,
    loadWorkspace(w) {
      if (host._deferForAccessPanel(w, w.hub_id)) return;
      opens.push(w);
    },
  };
  return host;
}

const PANEL_FOR = (h) => ({ kind: "permission_restricted", hub_id: h });

test("the open WAITS while this workspace's panel is up", () => {
  const host = wmHost([PANEL_FOR("H1")]);
  host.loadWorkspace({ hub_id: "H1" });
  assert.deepEqual(host.opens, [], "this is the reported behaviour");
  // Release the hold: the bound is a real 2-minute timer and an armed one
  // keeps node's event loop alive to the end of it.
  host.collection.remove(host.collection.first());
});

test("…and runs once the panel closes, with the original argument", () => {
  const host = wmHost([PANEL_FOR("H1")]);
  const arg = { hub_id: "H1", nid: "N1", area: "private", filename: "x" };
  host.loadWorkspace(arg);
  assert.deepEqual(host.opens, []);
  host.collection.remove(host.collection.first());
  assert.deepEqual(host.opens, [arg], "replayed verbatim, not reconstructed");
});

test("it holds for internal AND external — the panel is keyed on hub_id", () => {
  for (const area of ["private", "share"]) {
    const host = wmHost([PANEL_FOR("H9")]);
    host.loadWorkspace({ hub_id: "H9", area });
    assert.deepEqual(host.opens, [], `${area} must wait too`);
    host.collection.remove(host.collection.first());
    assert.equal(host.opens.length, 1);
  }
});

test("a panel for ANOTHER workspace does not hold this one back", () => {
  // Switching away from it is deliberate; the existing clear handles it.
  const host = wmHost([PANEL_FOR("OTHER")]);
  host.loadWorkspace({ hub_id: "H1" });
  assert.equal(host.opens.length, 1);
});

test("the create form, or an empty wrapper, does not hold anything", () => {
  const a = wmHost([{ kind: "media_form", hub_id: "H1" }]);
  a.loadWorkspace({ hub_id: "H1" });
  assert.equal(a.opens.length, 1);
  const b = wmHost([]);
  b.loadWorkspace({ hub_id: "H1" });
  assert.equal(b.opens.length, 1);
});

test("the replay is not deferred a second time by the same panel", () => {
  const host = wmHost([PANEL_FOR("H1")]);
  host.loadWorkspace({ hub_id: "H1" });
  // Panel replaced by something else rather than removed — still "gone".
  host.collection.set([{ kind: "window_info", hub_id: "H1" }]);
  assert.equal(host.opens.length, 1);
});

test("a second call while held does not stack a second hold", () => {
  // What the per-hub latch is actually for. Two callers racing to open the same
  // workspace must leave ONE listener and open ONCE — otherwise the panel
  // closing replays the open as many times as it was attempted.
  const host = wmHost([PANEL_FOR("H1")]);
  const before = host.collection._events
    ? Object.keys(host.collection._events).length
    : 0;
  host.loadWorkspace({ hub_id: "H1" });
  host.loadWorkspace({ hub_id: "H1" });
  host.loadWorkspace({ hub_id: "H1" });
  assert.deepEqual(host.opens, [], "all three are held");
  const listeners = (host.collection._events.update || []).length;
  assert.equal(listeners, 1, `stacked ${listeners} listeners`);
  host.collection.remove(host.collection.first());
  assert.equal(host.opens.length, 1, "and it opens exactly once");
  assert.ok(before >= 0);
});

test("a panel that is never dismissed cannot strand the desk", () => {
  // Asserted on the source rather than by waiting: the bound is two minutes,
  // which is right for a person reading a members panel and far too long to
  // sit through in a test.
  const body = slice(WM, "  _deferForAccessPanel(workspace, hub_id) {");
  assert.match(body, /setTimeout\(/, "the hold must be bounded");
  assert.match(body, /opening anyway/, "and say so when it gives up");
});

test("a torn-down manager opens nothing", () => {
  const host = wmHost([PANEL_FOR("H1")]);
  host.loadWorkspace({ hub_id: "H1" });
  host.isDestroyed = () => true;
  host.collection.remove(host.collection.first());
  assert.deepEqual(host.opens, []);
});

test("loadWorkspace ITSELF is what returns early on the hold", () => {
  // The harness above supplies its own loadWorkspace, so it proves the
  // predicate and not the wiring. Assert the wiring on the real method — and
  // assert the guarded RETURN, not merely a mention: a bare call would leave
  // the rest of the method running.
  const body = slice(WM, "  loadWorkspace(workspace) {");
  assert.match(
    body,
    /if \(this\._deferForAccessPanel\(workspace, hub_id\)\) return;/,
    "without the early return the open proceeds under the panel",
  );
});

test("the wait is entered before any of loadWorkspace's side effects", () => {
  // _syncHomeGrid, closeAllPanels and the headless re-feed are all visible next
  // to a panel the user is still working in.
  const body = slice(WM, "  loadWorkspace(workspace) {");
  const hold = body.indexOf("_deferForAccessPanel(");
  assert.ok(hold > -1, "the hold is not wired into loadWorkspace at all");
  for (const fx of ["_syncHomeGrid(1)", "closeAllPanels()", "headlessLayer.feed("]) {
    const at = body.indexOf(fx);
    assert.ok(at > -1, `${fx} not found`);
    assert.ok(hold < at, `the hold must precede ${fx}`);
  }
});
