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

function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  const open = src.indexOf("{", start);
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
    assert.match(row[0], new RegExp(`service:\\s*['"]${service}['"]`),
      `${key} must raise ${service}`);
    assert.match(FOLDER, new RegExp(`case "${service}"`),
      `window_folder does not handle ${service} — the row would be inert`);
  }
});

// ── the menu builder ────────────────────────────────────────────────────────

/** Run the real _openWorkspaceMenu against fakes; report what it fed. */
function run({ win, dialog = true, rect = { right: 100, bottom: 40 }, mayWrite = true, mayManage = true, alreadyOpen = false }) {
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

test("the ⋯ is a real button carrying the service; the link icon stays inert", () => {
  const head = slice(DESK, "  _feedWorkspaceHead(head, rows, cur) {");
  const more = head.match(/ws-head-action--more[\s\S]{0,260}/);
  assert.ok(more, "--more row not found");
  assert.match(more[0], /service:\s*"workspace-menu"/);
  assert.match(head, /Skeletons\.Button\.Svg\(\{\s*className: `\$\{cn\}__ws-head-action \$\{cn\}__ws-head-action--more`/,
    "must be a Button.Svg — an Image.Svg raises no ui event");
  // The link icon has no behaviour agreed yet, so it must NOT have become one.
  const link = head.match(/__ws-head-action`[\s\S]{0,200}/);
  assert.ok(link && !/service:/.test(link[0]), "the link icon stays inert");
});

test("the desk routes workspace-menu to the builder", () => {
  assert.match(DESK, /case "workspace-menu":/);
  const c = DESK.slice(DESK.indexOf('case "workspace-menu":'));
  assert.match(c.slice(0, 200), /_toggleWorkspaceMenu\(cmd\)/);
});

test("the ⋯ now looks clickable", () => {
  const rule = slice(SCSS, "    &--more {");
  assert.match(rule, /cursor:\s*pointer/, "it does something now, so it must say so");
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
  const r = rows(run({ win: fakeWin(), mayWrite: true, mayManage: false }));
  assert.notEqual(r[0], "separator");
  assert.notEqual(r[r.length - 1], "separator");
  assert.equal(r.filter((k) => k === "separator").length, 1,
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
