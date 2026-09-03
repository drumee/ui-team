#!/usr/bin/env node

/**
 * The ⋯ in the workspace switcher's header opens a drumee-contextmenu.
 *
 * It follows the SAME path a right-click on a home-grid tile takes
 * (ui-core letc.js buildContextmenu): rows from builtins/contextmenu/skeleton/
 * items, a `.drumee-contextmenu` box fed into the global drumeeDialog part,
 * volatility 4 so the next click dismisses it, and a viewport clamp. Position
 * comes from the button's own rect — the trick media/grid dispatchUiEvent
 * already uses for the kebab, because a synthetic 'contextmenu' event does not
 * reach property-style oncontextmenu handlers.
 *
 * What it does NOT do is borrow the grid tile's menu: loadWorkspaceNode
 * repoints that same list to media.show_node_by and resets the collection, so
 * the tile for the open workspace is not reliably mounted.
 *
 * Items dispatch to the OPEN WINDOW, which already implements every one of
 * them (folder-manage-access / -rename / -duplicate / -organize / -delete).
 *
 * Run from ui-team with:
 *   node --test tests/ws-head-context-menu.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const DESK = read("src/drumee/modules/desk/index.js");
const ITEMS = read("src/drumee/builtins/contextmenu/skeleton/items.js");
const SCSS = read("src/drumee/modules/desk/skin/topbar.scss");

/** Strip comments — assertions must read code, not the prose explaining it. */
const strip = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  // From the END of the header: a signature like `onUiEvent(cmd, args = {})`
  // contains braces of its own, and matching from `start` would lock onto the
  // `{}` in the default value and return a two-character body.
  const open = src.indexOf("{", start + header.length - 1);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  assert.fail(`${header} unbalanced`);
}

// ── the vocabulary ──────────────────────────────────────────────────────────

const WS_ITEMS = {
  workspaceAccess: "folder-manage-access",
  // Raised as `_e.download`, not as a quoted string, because that is how
  // window_folder writes the case it already handles (`case _e.download:` →
  // runFolderMediaAction → target.download()). The two forms are the same
  // service at runtime — `_e` is a createSafeObject proxy, so an undefined key
  // returns its own name — so both spellings are accepted below.
  workspaceDownload: "download",
  workspaceRename: "folder-rename",
  workspaceDuplicate: "folder-duplicate",
  workspaceOrganize: "folder-organize",
  workspaceDelete: "folder-delete",
};

test("each workspace row raises the service the window already handles", () => {
  const FOLDER = read("src/drumee/builtins/window/folder/index.js");
  for (const [key, service] of Object.entries(WS_ITEMS)) {
    const row = ITEMS.match(new RegExp(`${key}\\s*:\\s*button\\(\\{[^}]*\\}\\)`));
    assert.ok(row, `items.js has no \`${key}\``);
    assert.match(row[0], new RegExp(`service:\\s*(?:['"]${service}['"]|_e\\.${service})`),
      `${key} must raise ${service}`);
    assert.match(FOLDER, new RegExp(`case\\s+(?:"${service}"|_e\\.${service})\\s*:`),
      `window_folder does not handle ${service} — the row would be inert`);
  }
});

// ── the menu builder ────────────────────────────────────────────────────────

/** Run the real _openWorkspaceMenu against fakes; report what it fed. */
function run({ win, dialog = true, rect = { right: 100, bottom: 40 }, mayWrite = true, mayManage = true, mayDownload = true, alreadyOpen = false }) {
  const body = slice(DESK, "  _toggleWorkspaceMenu(cmd) {");
  const fed = [];
  const dlg = dialog
    ? {
        feed: (v) => { fed.push(v); },
            children: {
          last: () => ({
            el: { style: {} },
            $el: { height: () => 50, width: () => 200 },
            // Capture what the code hooks the menu's destruction to.
            once: (ev, fn) => { ctx.__destroyHook = fn; },
            isDestroyed: () => false,
          }),
        },
        isDestroyed: () => false,
      }
    : null;
  const ctx = {
    _wsMenu: alreadyOpen ? { isDestroyed: () => false, goodbye() {}, destroy() {} } : null,
    _activeWorkspace: () => win,
    // The REAL close, not a stub: the toggle and the destroy hook both go
    // through it, and its clearing of the active mark is the thing under test.
    _closeWorkspaceMenu: null,
    _curWorkspaceCanWrite: () => mayWrite,
    _curWorkspaceCanManage: () => mayManage,
    _curWorkspaceCanDownload: () => mayDownload,
  };
  const states = [];
  const cmd = {
    el: { getBoundingClientRect: () => rect },
    setState: (v) => states.push(v),
    isDestroyed: () => false,
  };
  const _ = { isEmpty: (v) => !v || (Array.isArray(v) && !v.length), isFunction: (f) => typeof f === "function" };
  // `require` is not defined inside new Function. The row builder is stubbed to
  // the REAL key -> service table asserted by the first test, so these tests
  // check which keys the builder picks and how it wires them, while that test
  // checks the vocabulary itself.
  const globals = {
    // `_e` is a createSafeObject proxy in the app: any key it does not define
    // comes back as its own name, so _e.destroy === "destroy".
    _e: new Proxy({}, { get: (_t, k) => String(k) }),
    require: (m) => {
      assert.equal(m, "builtins/contextmenu/skeleton/items", `unexpected require(${m})`);
      return (ui, trigger, k) => {
        if (k === "separator") return { __row: k };
        assert.ok(WS_ITEMS[k], `builder asked for an unknown item key: ${k}`);
        return { __row: k, service: WS_ITEMS[k] };
      };
    },
    _,
    window: { drumeeDialog: dlg, innerWidth: 1400, innerHeight: 900, scrollX: 0, scrollY: 0 },
    Skeletons: {
      Box: { Y: (o) => ({ __box: "y", ...o }), X: (o) => ({ __box: "x", ...o }) },
      Note: (o) => ({ __note: 1, ...o }),
      Image: { Svg: (o) => ({ __svg: 1, ...o }) },
    },
  };
  const keys = Object.keys(globals);
  const mk = (src) =>
    // eslint-disable-next-line no-new-func
    new Function(...keys, `return function (cmd) {${slice(src, "{").slice(1, -1)}};`)(
      ...keys.map((k) => globals[k]));
  ctx._closeWorkspaceMenu = mk(slice(DESK, "  _closeWorkspaceMenu() {"));
  const fn = mk(body);
  fn.call(ctx, cmd);
  return Object.assign(fed[0] || {}, { __fed: fed.length, __states: states, __ctx: ctx });
}

const fakeWin = (over = {}) => ({
  mget: (k) => ({ filetype: "hub", area: "private" }[k]),
  isDestroyed: () => false,
  ...over,
});

test("with a workspace open it feeds a .drumee-contextmenu into drumeeDialog", () => {
  const box = run({ win: fakeWin() });
  assert.equal(box.__fed, 1, "nothing was fed");
  assert.match(box.className, /drumee-contextmenu/);
  assert.equal(box.volatility, 4, "next click dismisses it, as every other menu does");
  assert.ok(Array.isArray(box.kids) && box.kids.length, "no rows");
});

test("rows dispatch to the OPEN WINDOW, not to the desk", () => {
  const win = fakeWin();
  const box = run({ win });
  assert.deepEqual(box.uiHandler, [win],
    "uiHandler must be the window that implements the folder-* services");
});

test("it is positioned from the button's rect", () => {
  const box = run({ win: fakeWin(), rect: { right: 640, bottom: 88 } });
  assert.equal(box.style.left, 640);
  assert.equal(box.style.top, 88);
});

test("with NO workspace open nothing is fed", () => {
  assert.equal(run({ win: null }).__fed, 0, "a menu of workspace actions needs a workspace");
});

test("a missing drumeeDialog is survived, not thrown through", () => {
  assert.doesNotThrow(() => run({ win: fakeWin(), dialog: false }));
});

// ── the gates ───────────────────────────────────────────────────────────────

const labels = (box) => ((box && box.kids) ? box.kids.map((k) => k && k.service).filter(Boolean) : []);

test("a read-only member gets neither Manage access nor the write actions", () => {
  const box = run({ win: fakeWin(), mayWrite: false, mayManage: false });
  const s = labels(box);
  assert.ok(!s.includes("folder-manage-access"), "minting links needs write");
  assert.ok(!s.includes("folder-organize"), "organize moves things");
  // ...but Download stays. It is granted by the DOWNLOAD bit, which a view-only
  // member holds, and taking a copy is the one useful thing they can do with a
  // workspace. This is the row's whole reason for being in this menu: the
  // folder Settings panel that used to carry it is no longer the workspace's
  // entry point, so gating it on write would leave them no way to download.
  assert.ok(s.includes("download"), "a view-only member lost Download");
});

test("Download leads the menu, and is gated on the download bit alone", () => {
  // Position: Duy's requirement is that it sits ABOVE Rename.
  const r = rows(run({ win: fakeWin(), mayWrite: true, mayManage: true }));
  assert.equal(r[0], "workspaceDownload", "Download must be the first row");
  assert.ok(r.indexOf("workspaceDownload") < r.indexOf("workspaceRename"),
    "Download must come before Rename");

  // Gate: write and admin must NOT be what decides it, in either direction.
  const noDl = labels(run({ win: fakeWin(), mayWrite: true, mayManage: true, mayDownload: false }));
  assert.ok(!noDl.includes("download"),
    "the row ignored canDownload() — it is riding on write/admin instead");
});

test("a non-admin keeps write actions but loses rename and delete", () => {
  const s = labels(run({ win: fakeWin(), mayWrite: true, mayManage: false }));
  assert.ok(!s.includes("folder-rename"));
  assert.ok(!s.includes("folder-delete"));
  assert.ok(s.includes("folder-manage-access"), "write is enough to manage access");
});

test("an admin sees the whole set", () => {
  const s = labels(run({ win: fakeWin(), mayWrite: true, mayManage: true }));
  for (const svc of Object.values(WS_ITEMS)) assert.ok(s.includes(svc), `missing ${svc}`);
});

// ── the trigger ─────────────────────────────────────────────────────────────

test("both header actions are real Buttons carrying their service", () => {
  // Neither can be an Image.Svg: image_svg views raise no ui event, so a
  // service on one would never reach a handler.
  const body = slice(DESK, "  _feedWorkspaceHead(head, rows, cur) {");
  const more = body.slice(body.indexOf("ph-dots-three") - 400, body.indexOf("ph-dots-three") + 200);
  assert.match(more, /Skeletons\.Button\.Svg/);
  assert.match(more, /service:\s*"workspace-menu"/);
  const link = body.slice(body.indexOf("apps-link-simple") - 500, body.indexOf("apps-link-simple") + 200);
  assert.match(link, /Skeletons\.Button\.Svg/);
  assert.match(link, /service:\s*"workspace-access"/);
});

test("the desk routes workspace-menu to the builder", () => {
  assert.match(DESK, /case "workspace-menu":/);
  const c = DESK.slice(DESK.indexOf('case "workspace-menu":'));
  assert.match(c.slice(0, 200), /_toggleWorkspaceMenu\(cmd\)/);
});

test("the ⋯ keeps its resting fill and a DARKER hover", () => {
  // Its grey is the Figma component's normal state, not a hover — so it cannot
  // use the shared hover introduced on the base rule, or hovering would look
  // identical to resting. The pointer itself now comes from that shared rule
  // (asserted separately), which is why it is not expected here.
  const rule = slice(SCSS, "    &--more {");
  assert.match(rule, /background:\s*var\(--overlay-bg-05\)/, "resting fill lost");
  assert.match(rule, /&:hover[\s\S]*--normal-bg-80/, "hover must differ from resting");
});

// ── toggle + active state ───────────────────────────────────────────────────

test("a second click CLOSES and does not reopen", () => {
  // The pointerdown before this click already queued the menu's own volatility
  // destroy, but that is a 300ms timeout — the view is still alive here, so
  // without an explicit close the click would fall straight through and feed a
  // second menu.
  const r = run({ win: fakeWin(), alreadyOpen: true });
  assert.equal(r.__fed, 0, "no second menu");
});

test("opening marks the button active; the menu's destroy clears it", () => {
  const r = run({ win: fakeWin() });
  assert.deepEqual(r.__states, [1], "active while open");
  const hook = r.__ctx.__destroyHook;
  assert.ok(hook, "no destroy hook — dismissal by click-outside would strand the flag");
  hook();
  assert.deepEqual(r.__states, [1, 0], "cleared when the menu goes");
});

test("the destroy hook also drops the tracked menu", () => {
  const r = run({ win: fakeWin() });
  assert.ok(r.__ctx._wsMenu, "menu not tracked");
  r.__ctx.__destroyHook();
  assert.ok(!r.__ctx._wsMenu, "a stale ref would make the next click a no-op close");
});

test("the close path is shared, not inlined at the call site", () => {
  assert.match(DESK, /_closeWorkspaceMenu\(\)/,
    "dismissal happens from the destroy hook AND the toggle; one implementation");
});

test("the open state is tracked but deliberately not drawn", () => {
  // setState still writes data-state (tests above cover that it is set on open
  // and cleared on every dismissal); the skin just does not style it. Pinned so
  // a lit look cannot reappear by accident.
  const rule = slice(SCSS, "    &--more {");
  assert.ok(!/\[data-state="1"\]/.test(rule), "the open state must not be styled");
});

// ── the look ────────────────────────────────────────────────────────────────

const rows = (box) => ((box && box.kids) ? box.kids.map((k) => k.__row) : []);

test("every workspace row carries an icon and the delete row reads destructive", () => {
  // The shared skin already draws the panel, the 20px icon slot and
  // `.trash { color: --red-500 }`. These rows only had to opt in — via the
  // icons and classes maps, which is where the omission was.
  const ICONS = read("src/drumee/builtins/contextmenu/skeleton/icons.js");
  const CLASSES = read("src/drumee/builtins/contextmenu/skeleton/classes.js");
  const expect = {
    workspaceAccess: "ctxmenu-share",
    workspaceDownload: "ctxmenu-download",
    workspaceRename: "ctxmenu-rename",
    workspaceDuplicate: "ctxmenu-copy",
    workspaceOrganize: "ctxmenu-organize",
    workspaceDelete: "ctxmenu-delete",
  };
  const SPRITE = read("icons/sprites/normalized.sprite.svg");
  for (const [key, ico] of Object.entries(expect)) {
    assert.match(ICONS, new RegExp(`${key}:\\s*"${ico}"`), `${key} has no icon`);
    assert.match(SPRITE, new RegExp(`id="--icon-${ico}"`), `${ico} is not in the sprite`);
  }
  assert.match(CLASSES, /workspaceDelete:\s*'trash'/,
    "`trash` is the class the skin paints red");
});

test("sections are separated, and a separator never dangles", () => {
  const admin = rows(run({ win: fakeWin(), mayWrite: true, mayManage: true }));
  assert.ok(admin.includes("separator"), "no grouping at all");
  assert.notEqual(admin[0], "separator", "leading separator");
  assert.notEqual(admin[admin.length - 1], "separator", "trailing separator");
  for (let i = 1; i < admin.length; i++) {
    assert.ok(!(admin[i] === "separator" && admin[i - 1] === "separator"),
      "two separators in a row — a gate emptied a section");
  }
});

test("a gate emptying a section removes its separator too", () => {
  // Write-only: the rename/duplicate and delete sections vanish. What is left
  // must still be cleanly divided, not fringed with orphan rules.
  // Download survives — it is gated on the DOWNLOAD bit, not on write/admin —
  // so three sections remain: download | organize | access.
  const r = rows(run({ win: fakeWin(), mayWrite: true, mayManage: false }));
  assert.notEqual(r[0], "separator");
  assert.notEqual(r[r.length - 1], "separator");
  assert.equal(r.filter((k) => k === "separator").length, 2,
    "three remaining sections need exactly two dividers");

  // And the same must hold when it is the DOWNLOAD section that empties: its
  // divider has to go with it, or the menu opens with a rule against its top.
  const nd = rows(run({ win: fakeWin(), mayWrite: true, mayManage: false, mayDownload: false }));
  assert.ok(!nd.includes("workspaceDownload"), "download row survived its own gate");
  assert.notEqual(nd[0], "separator", "the emptied download section left its rule behind");
  assert.equal(nd.filter((k) => k === "separator").length, 1,
    "two remaining sections need exactly one divider");
});

// ── the link icon is external-only ──────────────────────────────────────────

/** Run the real _feedWorkspaceHead and report the action rows it built. */
function head({ area, filetype = "hub" }) {
  const body = slice(DESK, "  _feedWorkspaceHead(head, rows, cur) {");
  let fed = null;
  const ctx = {};
  const globals = {
    _: { isArray: Array.isArray, isFunction: (f) => typeof f === "function", uniqueId: (p) => `${p}1` },
    _a: new Proxy({}, { get: (_t, k) => String(k) }),
    folderIcon: () => "<svg/>",
    Skeletons: {
      Element: (o) => ({ __el: 1, ...o }),
      Box: { X: (o) => ({ __box: 1, ...o }) },
      Note: (o) => ({ __note: 1, ...o }),
      Image: { Svg: (o) => ({ __img: 1, ...o }) },
      Button: { Svg: (o) => ({ __btn: 1, ...o }) },
    },
  };
  const keys = Object.keys(globals);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, `return function (head, rows, cur) {${slice(body, "{").slice(1, -1)}};`)(
    ...keys.map((k) => globals[k]));
  const rows = [{ hub_id: "H", filename: "W", area, filetype }];
  fn.call(ctx, { feed: (v) => { fed = v; } }, rows, { hub_id: "H" });
  const actions = (fed || []).find((n) => n && /ws-head-actions/.test(n.className || ""));
  return (actions ? actions.kids : []).filter(Boolean);
}

const isLink = (n) => /__ws-head-action$/.test((n.className || "").trim());
const isMore = (n) => /--more/.test(n.className || "");

for (const area of ["share", "dmz"]) {
  test(`an EXTERNAL workspace (${area}) shows the link`, () => {
    const a = head({ area });
    assert.ok(a.some(isLink), "the link icon is missing");
    assert.ok(a.some(isMore), "the ⋯ must survive on every area");
  });
}

for (const area of ["private", "public", "personal", "", undefined]) {
  test(`a NON-external workspace (${area || "no area"}) hides the link`, () => {
    // A share link only exists for a workspace reached BY link. An internal one
    // is reached by membership — the same split that decides which panel the
    // rail's Access opens.
    const a = head({ area });
    assert.ok(!a.some(isLink), `the link must not render for area=${area}`);
    assert.ok(a.some(isMore), "but the ⋯ still has rename/duplicate/delete to offer");
  });
}

test("a personal workspace (home-root folder) hides it too", () => {
  const a = head({ area: "personal", filetype: "folder" });
  assert.ok(!a.some(isLink));
});

// ── the link opens Manage access ────────────────────────────────────────────

test("the link is a Button carrying a service — an Image.Svg raises nothing", () => {
  // Same reason the ⋯ had to become a Button: image_svg views raise no ui
  // event, so a service on one would never reach a handler.
  const body = slice(DESK, "  _feedWorkspaceHead(head, rows, cur) {");
  const link = body.slice(body.indexOf("apps-link-simple") - 400,
                          body.indexOf("apps-link-simple") + 200);
  assert.match(link, /Skeletons\.Button\.Svg/, "still an inert Image.Svg");
  assert.match(link, /service:\s*"workspace-access"/);
  assert.match(link, /uiHandler:\s*\[this\]/, "must reach the desk");
});

test("workspace-access shares the rail's handler, not a second copy", () => {
  // The rail's Access and this icon do the identical thing: hand
  // folder-manage-access to the active workspace window. The header goes
  // through a loading wrapper, but that wrapper DELEGATES — a second copy of
  // the hop is what would drift.
  const c = DESK.slice(DESK.indexOf('case "workspace-access":'));
  assert.match(c.slice(0, 200), /_workspaceAccessFromHeader\(cmd\)/);
  assert.match(slice(DESK, "  _workspaceAccessFromHeader(cmd) {"), /this\._railAccess\(\)/,
    "the wrapper must delegate, not reimplement");
  const rail = DESK.slice(DESK.indexOf('case "rail-access":'));
  // `_railAccess(` — the rail now passes { members: 1 } to force the
  // permissions matrix. The header's delegation above is asserted as `()` on
  // purpose: it must NOT pass that flag, or the chain icon loses the link
  // builder it exists for.
  assert.match(rail.slice(0, 300), /_railAccess\(/);
});

test("the affordance is on the SHARED rule, not just the ⋯", () => {
  // The first version of this test sliced the whole __ws-head-action block,
  // which contains the nested &--more — so it passed on --more's cursor while
  // the link, the thing under test, had none.
  const rule = slice(SCSS, "  &__ws-head-action {");
  const base = rule.slice(0, rule.indexOf("&--more"));
  assert.match(base, /cursor:\s*pointer/, "the link has no pointer cursor");
  assert.match(base, /&:hover/, "and no hover feedback");
});

test("it is still external-only, so it cannot open a link panel that has none", () => {
  // The panel it opens mints secure-share links. An internal workspace has no
  // such link — and folder/index.js routes `private` to the members panel
  // instead — so the icon must stay off there.
  assert.ok(!head({ area: "private" }).some(isLink));
  assert.ok(head({ area: "share" }).some(isLink));
});

// ── loading while the panel's kind is imported ──────────────────────────────

/** Run the real _workspaceAccessFromHeader; report the button's dataset over time. */
async function loadRun({ kindResolves = true, hasKind = true } = {}) {
  const body = slice(DESK, "  _workspaceAccessFromHeader(cmd) {");
  const dataset = {};
  const seen = [];
  const cmd = { el: { dataset }, isDestroyed: () => false };
  const calls = { rail: 0 };
  const ctx = {
    _railAccess() {
      // Snapshot at dispatch time: the flag must still be up here, or it
      // covered nothing.
      seen.push(dataset.loading);
      calls.rail++;
    },
  };
  const globals = {
    _: { isFunction: (f) => typeof f === "function" },
    Kind: hasKind
      ? { waitFor: () => (kindResolves ? Promise.resolve() : Promise.reject(new Error("chunk failed"))) }
      : undefined,
  };
  const keys = Object.keys(globals);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, `return function (cmd) {${slice(body, "{").slice(1, -1)}};`)(
    ...keys.map((k) => globals[k]));
  await fn.call(ctx, cmd);
  return { dataset, seen, ...calls };
}

test("the flag is up while the chunk loads and gone once it is open", async () => {
  const r = await loadRun();
  assert.deepEqual(r.seen, ["1"], "the flag was not up when the panel was dispatched");
  assert.equal(r.dataset.loading, undefined, "still spinning after the panel opened");
  assert.equal(r.rail, 1);
});

test("a FAILED import clears the flag instead of stranding it", async () => {
  // window_secure_share is a dynamic import; a dropped chunk must not leave the
  // button spinning forever.
  const r = await loadRun({ kindResolves: false });
  assert.equal(r.dataset.loading, undefined, "stuck spinning after a failed import");
});

test("it still opens the panel when Kind is unavailable", async () => {
  // The desk boots before some globals exist; no Kind must not mean no panel.
  const r = await loadRun({ hasKind: false });
  assert.equal(r.rail, 1);
  assert.equal(r.dataset.loading, undefined);
});

test("the rail's own Access is NOT wrapped in this", () => {
  // It shares _railAccess but can open permission_restricted, which is not a
  // lazy kind — there is nothing to wait for, so no spinner.
  // Its OWN case body only — the next `case` starts the header's, and a slice
  // wide enough to swallow that would assert nothing.
  // Comments stripped first: the comment BELOW this case explains why the rail
  // is not wrapped, and naming the wrapper there is not the same as calling it.
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const from = DESK.indexOf('case "rail-access":');
  const body = strip(DESK.slice(from, DESK.indexOf("case ", from + 20)));
  assert.match(body, /_railAccess\(/);
  assert.ok(!/_workspaceAccessFromHeader/.test(body),
    "rail-access must not route through the header's loading wrapper");
});

test("the loading state is styled", () => {
  const rule = slice(SCSS, "  &__ws-head-action {");
  assert.match(rule, /\[data-loading="1"\]/, "no visible loading state");
});

// ── closing the panel ───────────────────────────────────────────────────────

const SS = read("src/drumee/builtins/window/secure-share/index.js");
const SS_SCSS = read("src/drumee/builtins/window/secure-share/skin/index.scss");

test("the embedded drawer slides out; the floating window keeps the shrink", () => {
  // selfDestroy already tweens {opacity:0, scale:0.2} — the floating-window
  // shrink. A right-docked drawer has to slide instead, and the defaults must
  // be cancelled explicitly or it would do both at once.
  const body = strip(slice(SS, "  onUiEvent(cmd, args = {}) {"));
  const at = body.indexOf("case _e.close:");
  assert.notEqual(at, -1, "close is not overridden");
  const c = body.slice(at, at + 420);
  assert.match(c, /_embedded/, "the override must not touch the floating window");
  assert.match(c, /xPercent:\s*100/, "not a slide");
  assert.match(c, /opacity:\s*1/, "the inherited opacity:0 must be cancelled");
  assert.match(c, /scale:\s*1/, "the inherited scale:0.2 must be cancelled");
});

test("the open animation must not persist a transform", () => {
  // `fill: both` keeps the last keyframe forever, and a running/filling CSS
  // animation outranks inline styles — so gsap's close transform would be
  // silently overridden. `backwards` still applies the from-state before start,
  // and after the end the element reverts to its untransformed normal state,
  // which IS translateX(0).
  const rule = SS_SCSS.slice(SS_SCSS.indexOf('&[data-embedded="yes"]'));
  const anim = rule.match(/animation:\s*window-secure-share-slide-in[^;]*/);
  assert.ok(anim, "the open animation is gone");
  assert.ok(!/\bboth\b/.test(anim[0]), "fill:both would override the close tween");
  assert.match(anim[0], /\bbackwards\b/);
});

test("the toggle animates the child out instead of clearing it outright", () => {
  // dialogWrapper.clear() destroys children immediately — no animation at all.
  // Only the secure-share child is routed through goodbye(); permission_
  // restricted keeps clear(), since goodbye would give it the framework shrink
  // rather than its own data-position slide.
  const FOLDER = read("src/drumee/builtins/window/folder/index.js");
  const body = slice(FOLDER, "  openManageAccess(opt) {");
  const close = strip(body.slice(0, body.indexOf("this.isShowSettings = true")));
  assert.match(close, /service:\s*_e\.close/,
    "must go through the panel's own close handler, where the slide is defined");
  assert.ok(!/goodbye\(\)/.test(close),
    "a bare goodbye() takes the framework shrink, not the slide");
  assert.match(close, /window_secure_share/, "must not reroute the other panel");
  assert.match(close, /clear\(\)/, "no fallback when there is nothing to animate");
});

// ── the close must START on the click ───────────────────────────────────────

/**
 * selfDestroy's own timeout resolution, copied from
 * @drumee/ui-core letc/addons/backbone/view/utils.js:
 *
 *   selfDestroy(o)  ->  o = { duration: 0.5, timeout: 2000, ...o }
 *                       const timeout = o.timeout || Visitor.timeout()   // 2000
 *                       _.delay(go, timeout)
 *
 * goodbye's `timeout: 2` lives in a PARAMETER DEFAULT — it applies only when
 * goodbye is called with no argument at all. Pass anything and it is gone, and
 * selfDestroy's own 2000 takes over.
 */
const resolveDelay = (args) => {
  const o = { duration: 0.5, timeout: 2000, ...args };
  return o.timeout || 2000; // `|| Visitor.timeout()`, which defaults to 2000
};

test("the framework really does delay a goodbye that was passed options", () => {
  // Pins the trap itself, so the fix below cannot be read as superstition.
  assert.equal(resolveDelay(undefined), 2000);
  assert.equal(resolveDelay({ duration: 0.28 }), 2000, "the omitted timeout is 2000");
  assert.equal(resolveDelay({ duration: 0.28, timeout: 0 }), 2000,
    "0 is FALSY, so it falls through to Visitor.timeout() — not a fix");
  assert.equal(resolveDelay({ duration: 0.28, timeout: 2 }), 2);
});

test("the drawer's close starts on the click, not two seconds later", () => {
  const body = strip(slice(SS, "  onUiEvent(cmd, args = {}) {"));
  const at = body.indexOf("case _e.close:");
  const call = body.slice(at, at + 420);
  const opts = call.match(/goodbye\(\s*(\{[^}]*\})/);
  assert.ok(opts, "no goodbye options object to inspect");
  // eslint-disable-next-line no-eval
  const parsed = eval(`(${opts[1]})`);
  assert.ok(parsed.timeout, "timeout must be set — and truthy, or 0 falls back to 2000");
  assert.ok(resolveDelay(parsed) <= 16,
    `close is delayed ${resolveDelay(parsed)}ms; it must start within a frame`);
});
