// The phone's workspace sheet names the workspace you are in.
//
// The desktop switcher (`desk-module-topbar__ws-menu`) is three blocks: the
// header that NAMES the open workspace (`__ws-head`), the list of everywhere
// else, and the pinned "New workspace" button. The sheet had the last two only,
// so on a phone the one thing the panel could not tell you was which workspace
// you had open — the list's tick is the whole answer, and it is below the fold
// as soon as there are more than a few.
//
// This renders the REAL builder, so a header that loses its glyph, its name or
// its place above the list shows up here.
//
// The second half is the collision that made the header worth testing at all.
// Every PERSONAL workspace carries the user's own hub_id (a personal workspace
// IS the user), so any "is this the open one?" test written against hub_id
// answers YES for all of them at once. The desktop surfaces resolve this with
// `_workspaceKey` — `folder:<nid>` vs `hub:<id>` — and the sheet did not: it was
// handed `cur.hub_id` and compared ids, which ticked the entire PERSONAL
// section whenever a personal workspace was open, and would have pointed the
// new header at the first personal row whichever one was really open.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const {
  renderWith,
  find,
  findAll,
  walk,
  hasClass,
} = require("./helpers/render-mobile-sheets.js");

const DESK = resolve(__dirname, "../src/drumee/modules/desk/index.js");
const src = readFileSync(DESK, "utf8");

// One class method lifted out of index.js, the same way
// tests/workspace-delete-admin-only.js lifts _mayDeleteWorkspace: it closes at
// the first line that is exactly "  }", and nothing inside it is indented that
// shallowly.
function grab(name) {
  const start = src.indexOf(`  ${name}(`);
  assert.ok(start > 0, `${name} not found in ${DESK}`);
  const end = src.indexOf("\n  }\n", start) + 4;
  assert.ok(end > start, `${name} has no end`);
  return src.slice(start, end);
}

// The SHIPPED _workspaceKey, run against the globals the sheet builder sees.
// _a echoes its keys (so `_a.folder` is "folder") and Visitor.id is "me", which
// is what makes the personal rows below collide the way the real ones do.
const _workspaceKey = new Function(
  "_a",
  "Visitor",
  `return { ${grab("_workspaceKey")} }._workspaceKey;`,
)(
  new Proxy({}, { get: (_t, k) => String(k) }),
  { id: "me" },
);

// The SHIPPED grouping too — the sheet calls `ui._groupWorkspaces` now, so the
// headings under test are the desk's real taxonomy and not a copy. It reads no
// `this`, only _a and LOCALE, both of which echo their keys here (so
// `LOCALE.INTERNAL` is "INTERNAL" and `_a.private` is "private").
const _groupWorkspaces = new Function(
  "_a",
  "LOCALE",
  `return { ${grab("_groupWorkspaces")} }._groupWorkspaces;`,
)(
  new Proxy({}, { get: (_t, k) => String(k) }),
  new Proxy({}, { get: (_t, k) => String(k) }),
);

// Two hubs and two personal workspaces. Both personal rows carry hub_id "me" —
// that is the point, not an accident of the fixture.
const HUB_A = { hub_id: "h1", filename: "Marketing", area: "private", filetype: "hub" };
const HUB_B = { hub_id: "h2", filename: "Partners", area: "share", filetype: "hub" };
const MINE_1 = { hub_id: "me", nid: "n1", filename: "My files", filetype: "folder" };
const MINE_2 = { hub_id: "me", nid: "n2", filename: "Drafts", filetype: "folder" };
const ROWS = [HUB_A, HUB_B, MINE_1, MINE_2];

// The areas that only the shared taxonomy has an opinion about: `restricted`
// belongs with INTERNAL and `dmz` with EXTERNAL, and the sheet's old
// `filetype !== folder` test put both under one WORKSPACES heading.
const HUB_R = { hub_id: "h3", filename: "Legal", area: "restricted", filetype: "hub" };
const HUB_D = { hub_id: "h4", filename: "Clients", area: "dmz", filetype: "hub" };
const HUB_P = { hub_id: "h5", filename: "Website", area: "public", filetype: "hub" };

const sheet = (cur, rows = ROWS) =>
  renderWith({ _workspaceKey, _groupWorkspaces }, "workspaceSheet", rows, cur);

const HEAD = "desk-module__msheet-ws-head";
const LIST = "desk-module__msheet-list";
const CHECK = "desk-module__msheet-check";

const textIn = (n) =>
  [...walk(n)].filter((k) => k.__kind === "note" && k.content).map((k) => String(k.content));

const HEADING = "desk-module__msheet-heading";

const headingsOf = (tree) =>
  findAll(tree, HEADING).map((h) => String(h.content));

// The list is a FLAT array — heading, its rows, next heading — so "under" is
// document order, not nesting. Reading it this way is also what proves the
// rows land beneath the right heading rather than merely existing somewhere.
const rowsUnder = (tree, label) => {
  const kids = [].concat((find(tree, LIST) || {}).kids || []);
  const at = kids.findIndex(
    (k) => hasClass(k, HEADING) && String(k.content) === label,
  );
  if (at < 0) return null;
  const out = [];
  for (const k of kids.slice(at + 1)) {
    if (hasClass(k, HEADING)) break;
    out.push(textIn(k)[0]);
  }
  return out;
};

test("the header names the open HUB workspace", () => {
  const head = find(sheet(HUB_A), HEAD);
  assert.ok(head, "no open-workspace header");
  assert.deepEqual(textIn(head), ["Marketing"]);
});

test("the header names the open PERSONAL workspace, not the first one", () => {
  // The whole point: MINE_2 and MINE_1 are indistinguishable by hub_id.
  const head = find(sheet(MINE_2), HEAD);
  assert.ok(head, "no open-workspace header");
  assert.deepEqual(textIn(head), ["Drafts"]);
});

test("the header carries the area-tinted glyph", () => {
  const head = find(sheet(HUB_B), HEAD);
  const ico = [...walk(head)].find(
    (n) => typeof n.className === "string" && n.className.includes("__msheet-ws-ico"),
  );
  assert.ok(ico, "header has no workspace glyph");
  // The area rides the class list — that is what tints the folder shape.
  assert.ok(ico.className.includes("share"), `glyph lost its area: ${ico.className}`);
  assert.ok(
    ico.className.includes("desk-module__msheet-ws-ico--head"),
    `glyph lost its header size: ${ico.className}`,
  );
});

test("the header sits above the list, outside it", () => {
  const tree = sheet(HUB_A);
  const top = tree.kids.map((k) => (typeof k.className === "string" ? k.className : ""));
  const headAt = top.findIndex((c) => c.includes("__msheet-ws-head"));
  const listAt = top.findIndex((c) => c.includes("__msheet-list"));
  assert.ok(headAt > -1, "header is not a top-level block");
  assert.ok(listAt > -1, "list is not a top-level block");
  assert.ok(headAt < listAt, "header must precede the list");
  // Outside the scroller, or it scrolls away with the rows it names.
  assert.equal(find(find(tree, LIST), HEAD), null);
});

test("no header when the open workspace is not in the payload", () => {
  // First paint, and the signed-out-of-everything case. A header fed empty
  // would still draw its rule and its padding.
  assert.equal(find(sheet(null), HEAD), null);
  assert.equal(find(sheet({ hub_id: "gone", filetype: "hub" }), HEAD), null);
});

// ── the header and the list do not say the same thing twice ────────────────
//
// The open workspace is drawn once, by the header. It is NOT repeated in the
// rows below, and there is no tick — the list is everywhere ELSE to go, so
// there is nothing in it to mark as "you are here".
//
// The personal cases carry the weight. Every personal workspace has the user's
// own hub_id, so a filter written against the id would empty the whole PERSONAL
// section the moment any one of them was open. Only the key distinguishes them.
test("the open workspace is not repeated in the list", () => {
  for (const [cur, gone] of [
    [HUB_A, "Marketing"],
    [MINE_1, "My files"],
    [MINE_2, "Drafts"],
  ]) {
    const tree = sheet(cur);
    const names = findAll(find(tree, LIST), "desk-module__msheet-row").map(
      (r) => textIn(r)[0],
    );
    assert.ok(
      !names.includes(gone),
      `"${gone}" is in the header AND the list: ${JSON.stringify(names)}`,
    );
    // The header is where it went, not nowhere.
    assert.deepEqual(textIn(find(tree, HEAD)), [gone]);
  }
});

test("no row is ticked any more", () => {
  for (const cur of [HUB_A, MINE_1, MINE_2]) {
    assert.equal(findAll(sheet(cur), CHECK).length, 0, "a tick survived");
  }
});

test("only the open workspace leaves — its siblings stay", () => {
  // The precise shape of the personal collision: MINE_2 open must remove
  // "Drafts" and keep "My files", which shares its hub_id.
  const names = findAll(find(sheet(MINE_2), LIST), "desk-module__msheet-row").map(
    (r) => textIn(r)[0],
  );
  assert.deepEqual(names, ["Marketing", "Partners", "My files"]);
});

test("the list is whole when there is no header to duplicate", () => {
  // Nothing open, and a workspace reached by deep link that this payload does
  // not carry: no header is built, so nothing may be hidden either.
  for (const cur of [null, { hub_id: "gone", filetype: "hub" }]) {
    const tree = sheet(cur);
    assert.equal(find(tree, HEAD), null);
    const names = findAll(find(tree, LIST), "desk-module__msheet-row").map(
      (r) => textIn(r)[0],
    );
    assert.deepEqual(names, ["Marketing", "Partners", "My files", "Drafts"]);
  }
});

test("a section disappears when its last workspace is the open one", () => {
  // One internal hub, one personal, the hub open: INTERNAL must go with its
  // only row rather than stand over nothing.
  const headings = headingsOf(sheet(HUB_A, [HUB_A, MINE_1]));
  assert.deepEqual(headings, ["PERSONAL"]);
});

// ── the headings ───────────────────────────────────────────────────────────
//
// INTERNAL / EXTERNAL / PUBLIC / PERSONAL, the create dialog's vocabulary, via
// the desk's own _groupWorkspaces. The sheet used to put every hub under one
// WORKSPACES heading, which said the same word about a private workspace and
// one shared with people outside the organisation.
test("workspaces are split into internal and external", () => {
  const rows = [HUB_A, HUB_B, MINE_1];
  const tree = sheet(null, rows);
  assert.deepEqual(headingsOf(tree), ["INTERNAL", "EXTERNAL", "PERSONAL"]);
  assert.deepEqual(rowsUnder(tree, "INTERNAL"), ["Marketing"]);
  assert.deepEqual(rowsUnder(tree, "EXTERNAL"), ["Partners"]);
  assert.deepEqual(rowsUnder(tree, "PERSONAL"), ["My files"]);
});

test("restricted joins internal and dmz joins external", () => {
  // The two areas the old `filetype !== folder` split had no opinion on.
  const rows = [HUB_A, HUB_R, HUB_B, HUB_D];
  const tree = sheet(null, rows);
  assert.deepEqual(headingsOf(tree), ["INTERNAL", "EXTERNAL"]);
  assert.deepEqual(rowsUnder(tree, "INTERNAL"), ["Marketing", "Legal"]);
  assert.deepEqual(rowsUnder(tree, "EXTERNAL"), ["Partners", "Clients"]);
});

test("public is its own heading, not folded into external", () => {
  const tree = sheet(null, [HUB_B, HUB_P]);
  assert.deepEqual(headingsOf(tree), ["EXTERNAL", "PUBLIC"]);
  assert.deepEqual(rowsUnder(tree, "PUBLIC"), ["Website"]);
});

test("an unknown area still gets a row", () => {
  // _groupWorkspaces keeps a WORKSPACES bucket for whatever matches no rule, so
  // a new area cannot make a workspace vanish from this sheet.
  const odd = { hub_id: "h9", filename: "Experiment", area: "brand-new", filetype: "hub" };
  const tree = sheet(null, [HUB_A, odd]);
  assert.deepEqual(headingsOf(tree), ["INTERNAL", "WORKSPACES"]);
  assert.deepEqual(rowsUnder(tree, "WORKSPACES"), ["Experiment"]);
});

test("the open workspace leaves its group, not another", () => {
  // Filtered BEFORE grouping: with the external one open, EXTERNAL empties and
  // INTERNAL is untouched.
  const tree = sheet(HUB_B, [HUB_A, HUB_B, HUB_D]);
  assert.deepEqual(headingsOf(tree), ["INTERNAL", "EXTERNAL"]);
  assert.deepEqual(rowsUnder(tree, "EXTERNAL"), ["Clients"]);
  assert.deepEqual(rowsUnder(tree, "INTERNAL"), ["Marketing"]);
});

// ── the rows have to be TAPPABLE, not merely well-formed ────────────────────
//
// Everything below the surface was right — `service`, `goTarget`, `wsKey` all
// present — and tapping a workspace still did nothing, because the rows were
// inert. `View.prototype.triggerHandlers` (ui-core letc/addons/letc.js) opens
// with `if (this.mget(_a.active) === 0) return;`, so a widget carrying
// `active: 0` raises no ui event at all: no "mobile-sheet-go", no re-dispatch,
// no switch, and nothing thrown to notice.
//
// The 0 came from the wrapper. `__msheet-list` was given
// `kidsOpt: { active: 0 }` when the list was split into its own scrolling box
// (c59b3d2a, "Fix/access panel header and mobile sheet scroll"), and ui-core's
// builder merges a box's kidsOpt into every DIRECT kid — which here is the
// workspace rows themselves. The row builder's OWN `kidsOpt: { active: 0 }` is
// the correct use of it: that one deactivates a row's icon and label so a child
// cannot swallow the tap meant for the row.
//
// It fitted the report exactly: the "New workspace" button is a SIBLING of the
// list, not a kid of it, so creating still worked; and the other three sheets
// put their rows straight into __msheet-content, which has no kidsOpt, so they
// were never affected.
test("every workspace row is tappable", () => {
  const rows = findAll(find(sheet(HUB_A), LIST), "desk-module__msheet-row");
  assert.ok(rows.length, "no rows to tap");
  for (const r of rows) {
    assert.notEqual(
      r.active,
      0,
      `row "${textIn(r)[0]}" is inert — triggerHandlers returns on active:0`,
    );
  }
});

test("the list wrapper does not deactivate what it holds", () => {
  // The guard at the source, so the wrapper cannot quietly regain a kidsOpt
  // that reaches the rows. A row's own kidsOpt is a different thing and stays.
  const list = find(sheet(HUB_A), LIST);
  assert.ok(list, "no list");
  assert.equal(
    list.kidsOpt && list.kidsOpt.active,
    undefined,
    "__msheet-list is deactivating its kids again",
  );
});

test("the New workspace button stays tappable too", () => {
  const btn = find(sheet(HUB_A), "desk-module__msheet-row--new");
  assert.ok(btn, "no create button");
  assert.notEqual(btn.active, 0, "create button is inert");
  assert.equal(btn.goTarget, "new-workspace");
});

test("every workspace row still re-dispatches with a key to switch on", () => {
  const rows = findAll(find(sheet(HUB_A), LIST), "desk-module__msheet-row");
  for (const r of rows) {
    assert.equal(r.service, "mobile-sheet-go");
    assert.equal(r.goTarget, "switch-workspace");
    // _switchWorkspace bails on a falsy key, so a row without one closes the
    // sheet and changes nothing.
    assert.ok(r.wsKey, `row ${textIn(r)[0]} lost its wsKey`);
  }
  // hub:h1 is absent because HUB_A is the open one and the header has it.
  assert.deepEqual(
    rows.map((r) => r.wsKey),
    ["hub:h2", "folder:n1", "folder:n2"],
  );
});

test("the desk hands the sheet the workspace OBJECT, not its hub_id", () => {
  // _openWorkspaceSheet is the single call site now — all three states (open,
  // back out of the actions, and the actions) go through it. Passing
  // cur.hub_id again would restore the personal-workspace collision without
  // any of the assertions above noticing.
  const body = grab("_openWorkspaceSheet");
  assert.ok(/workspaceSheet\(/.test(body), "call site moved");
  assert.ok(
    !/cur\s*&&\s*cur\.hub_id/.test(body),
    "the sheet is being handed cur.hub_id again",
  );
});

// ── the header's action button ─────────────────────────────────────────────
//
// The phone's answer to the desktop header's ⋯. That one floats a panel beside
// its card; a bottom sheet has no card to float beside, so the sheet itself
// becomes the panel — the actions take the list's place and the button becomes
// the way back.
const ACTION_BTN = "desk-module__msheet-ws-head-action--more";
const LINK_BTN = "desk-module__msheet-ws-head-action--link";
const CHIPS = "desk-module__msheet-ws-head-action";

// The glyph is a child now, not a prop on the control itself.
//
// `chartId ?? ico`: ui-core's svg factory renames the prop and DELETES `ico`
// (toolkit/builder/button/svg.js), so a descriptor it built carries chartId.
// Reading only `ico` is what let the action rows ship with no glyphs.
const glyphOf = (n) => (n && (n.chartId || n.ico)) || undefined;
const icoOf = (btn) => {
  const kid = [...walk(btn)].find((n) => glyphOf(n));
  return glyphOf(kid);
};

const ACTIONS = [
  { key: "workspace-access", label: "ACCESS", ico: "apps-link-simple", service: "workspace-access", onDesk: 1 },
  { key: "rename", label: "RENAME", ico: "ph-pencil", service: "workspace-rename", onDesk: 1 },
  { key: "makeACopy", label: "MAKE_A_COPY", ico: "ph-copy", service: "duplicate" },
  { key: "trash", label: "MOVE_TO_TRASH", ico: "ph-trash", service: "remove" },
];

const withActions = (cur, actions) =>
  renderWith(
    { _workspaceKey, _groupWorkspaces },
    "workspaceSheet",
    ROWS,
    cur,
    { actions },
  );

test("the header carries an action button that opens the actions", () => {
  const btn = find(sheet(HUB_A), ACTION_BTN);
  assert.ok(btn, "no action button in the header");
  assert.equal(btn.service, "mobile-ws-actions");
  assert.equal(icoOf(btn), "app-dots-horizontal");
});

test("the action button is built like every other control in this sheet", () => {
  // A BOX carrying the service, with an inert glyph inside — the shape
  // __msheet-row / __msheet-tile / __msheet-row--new all have. It was a bare
  // image_svg with a service on it, which is not a control this sheet renders:
  // ui-core's Button.Svg and Image.Svg are literally the same function.
  const tree = sheet(HUB_A);
  const btn = find(tree, ACTION_BTN);
  assert.equal(btn.__kind, "box");
  assert.notEqual(btn.active, 0, "the action button is inert");
  // ...and the header must not have regained a kidsOpt that deactivates it.
  const head = find(tree, HEAD);
  assert.equal(head.kidsOpt && head.kidsOpt.active, undefined);
});

test("no action button when there is no header", () => {
  assert.equal(find(sheet(null), ACTION_BTN), null);
});

// `closed` is not a free value in this app. skin/lib/utils.scss and
// skin/lib/align.scss both carry an unscoped
// `[data-state="closed"] { visibility: hidden !important; height: 0 !important }`,
// so ANY element stamped with it vanishes wherever it lives. The action button
// used data-state to carry its own two faces and was struck out by that rule in
// list mode — rendered, laid out, then hidden by a file it has nothing to do
// with. Nothing this builder emits may carry a reserved global state.
test("no sheet element stamps a reserved global data-state", () => {
  const RESERVED = { "data-state": ["closed", "open"], "data-hide": ["yes", "no"] };
  for (const tree of [
    sheet(HUB_A),
    sheet(null),
    withActions(HUB_A, ACTIONS),
  ]) {
    for (const n of walk(tree)) {
      const attrs = { ...(n.attrOpt || {}), ...(n.attribute || {}) };
      for (const [k, bad] of Object.entries(RESERVED)) {
        if (attrs[k] == null) continue;
        assert.ok(
          !bad.includes(String(attrs[k])),
          `${n.className || n.__kind} sets ${k}="${attrs[k]}" — a global rule hides it`,
        );
      }
    }
  }
});

test("the action button carries its face on data-mode", () => {
  assert.equal(find(sheet(HUB_A), ACTION_BTN).attrOpt["data-mode"], "list");
  assert.equal(
    find(withActions(HUB_A, ACTIONS), ACTION_BTN).attrOpt["data-mode"],
    "actions",
  );
});

test("in actions mode the button closes instead", () => {
  const btn = find(withActions(HUB_A, ACTIONS), ACTION_BTN);
  assert.equal(btn.service, "mobile-ws-actions-close");
  assert.equal(icoOf(btn), "cross");
});

test("both faces of the button name a glyph the sprite actually has", () => {
  // An `ico` with no matching symbol builds `<use href="#--icon-<name>">`,
  // which resolves to nothing: a button that is there, is pressable, and looks
  // empty. Read from the sprite rather than trusted.
  const sprite = readFileSync(
    resolve(__dirname, "../icons/sprites/normalized.sprite.svg"),
    "utf8",
  );
  for (const ico of [
    icoOf(find(sheet(HUB_A), ACTION_BTN)),
    icoOf(find(withActions(HUB_A, ACTIONS), ACTION_BTN)),
  ]) {
    assert.ok(
      sprite.includes(`id="--icon-${ico}"`),
      `the sprite has no symbol for "${ico}"`,
    );
  }
});

test("the actions replace the workspace list", () => {
  const tree = withActions(HUB_A, ACTIONS);
  const labels = findAll(find(tree, LIST), "desk-module__msheet-row").map(
    (r) => textIn(r)[0],
  );
  assert.deepEqual(labels, ["ACCESS", "RENAME", "MAKE_A_COPY", "MOVE_TO_TRASH"]);
  // No workspaces and no group headings while the actions are up.
  assert.deepEqual(headingsOf(tree), []);
  assert.ok(!labels.includes("Partners"), "a workspace row survived");
});

test("the header still names the workspace while the actions are up", () => {
  assert.deepEqual(textIn(find(withActions(HUB_A, ACTIONS), HEAD)), ["Marketing"]);
});

test("New workspace stays reachable in actions mode", () => {
  const btn = find(withActions(HUB_A, ACTIONS), "desk-module__msheet-row--new");
  assert.ok(btn, "the create button went away with the list");
  assert.equal(btn.goTarget, "new-workspace");
});

test("action rows dispatch to the media item, not the desk", () => {
  const rows = findAll(find(withActions(HUB_A, ACTIONS), LIST), "desk-module__msheet-row");
  const byLabel = Object.fromEntries(rows.map((r) => [textIn(r)[0], r]));
  for (const r of rows) {
    // NOT "mobile-sheet-go" — that one re-dispatches on the desk, which cannot
    // answer trash/duplicate/download.
    assert.equal(r.service, "mobile-ws-action", `${textIn(r)[0]} routes to the desk`);
    assert.ok(r.goTarget, `${textIn(r)[0]} lost its service`);
    assert.notEqual(r.active, 0, `${textIn(r)[0]} is inert`);
  }
  assert.equal(byLabel.MOVE_TO_TRASH.goTarget, "remove");
  assert.equal(byLabel.MOVE_TO_TRASH.onDesk, 0);
  // Rename and Manage access are the two the desktop menu answers itself.
  assert.equal(byLabel.RENAME.onDesk, 1);
  assert.equal(byLabel.RENAME.goTarget, "workspace-rename");
  assert.equal(byLabel.ACCESS.onDesk, 1);
});


// ── the header's action cluster ────────────────────────────────────────────
//
// The desktop header's __ws-head-actions, on a phone: the chain chip on an
// EXTERNAL workspace, then the ⋯. Internal and personal workspaces get the ⋯
// alone — they are reached by membership or ownership, so there is no share
// link for a chip to open.
const chipsOf = (tree) =>
  findAll(tree, CHIPS).map((c) =>
    String(c.className).includes("--link") ? "link" : "more",
  );

test("an external workspace shows share AND more", () => {
  for (const ws of [HUB_B /* share */, HUB_D /* dmz */]) {
    const tree = sheet(ws, [HUB_A, HUB_B, HUB_D, MINE_1]);
    assert.deepEqual(chipsOf(tree), ["link", "more"], `${ws.filename}`);
  }
});

test("internal and personal workspaces show ONLY more", () => {
  for (const ws of [HUB_A /* private */, HUB_R /* restricted */, MINE_1, MINE_2]) {
    const tree = sheet(ws, [HUB_A, HUB_R, HUB_B, MINE_1, MINE_2]);
    assert.deepEqual(chipsOf(tree), ["more"], `${ws.filename}`);
    assert.equal(find(tree, LINK_BTN), null, `${ws.filename} grew a share chip`);
  }
});

test("public is not external either", () => {
  // _feedWorkspaceHead gates its chain chip on share/dmz only; public is its
  // own area and reaches sharing elsewhere.
  assert.deepEqual(chipsOf(sheet(HUB_P, [HUB_P, HUB_A])), ["more"]);
});

test("the share chip closes the sheet and opens access on the desk", () => {
  const link = find(sheet(HUB_B, [HUB_A, HUB_B]), LINK_BTN);
  assert.ok(link, "no share chip");
  // Not raising workspace-access directly: that toggles the secure-share view,
  // which would come up underneath an open sheet.
  assert.equal(link.service, "mobile-ws-action");
  assert.equal(link.goTarget, "workspace-access");
  assert.equal(link.onDesk, 1);
  assert.notEqual(link.active, 0, "the share chip is inert");
});

test("the cluster does not deactivate its chips", () => {
  // kidsOpt on the wrapper would merge active:0 into both chips and neither
  // would raise anything — the trap that killed the workspace rows once.
  const tree = sheet(HUB_B, [HUB_A, HUB_B]);
  const cluster = find(tree, "desk-module__msheet-ws-head-actions");
  assert.ok(cluster, "no action cluster");
  assert.equal(cluster.kidsOpt && cluster.kidsOpt.active, undefined);
  for (const c of findAll(tree, CHIPS)) {
    assert.notEqual(c.active, 0, `${c.className} is inert`);
  }
});

test("every chip glyph is a symbol the sprite has", () => {
  const sprite = readFileSync(
    resolve(__dirname, "../icons/sprites/normalized.sprite.svg"),
    "utf8",
  );
  const trees = [
    sheet(HUB_B, [HUB_A, HUB_B]),
    withActions(HUB_A, ACTIONS),
  ];
  const icos = new Set();
  for (const t of trees) for (const c of findAll(t, CHIPS)) icos.add(icoOf(c));
  assert.ok(icos.size >= 3, `expected link + more + close, got ${[...icos]}`);
  for (const ico of icos) {
    assert.ok(sprite.includes(`id="--icon-${ico}"`), `sprite has no "${ico}"`);
  }
});

test("the desk no longer offers Manage access as a menu row", () => {
  // The header's chain chip is that door now. A row here would be the third
  // one, which is exactly what the desktop ⋯ filters secureShare/share out to
  // avoid.
  const body = grab("_mobileWorkspaceActions");
  assert.ok(
    !/workspace-access/.test(body),
    "Manage access is back in the actions menu, duplicating the header chip",
  );
});

test("the desktop more-button uses the same glyph as the phone's", () => {
  const head = grab("_feedWorkspaceHead");
  assert.ok(
    /ico: "app-dots-horizontal"/.test(head),
    "the desktop \u22ef glyph drifted from the phone's",
  );
  assert.ok(!/ph-dots-three/.test(head), "ph-dots-three survived");
});

// ── the actions menu wears the desktop context menu's icons ────────────────
//
// Those rows ARE the desktop workspace context menu
// (`drumee-contextmenu media-grid desk-module-topbar`), so their glyphs must be
// that menu's — read off the shared icon map, not invented here — and drawn the
// way it draws them.
const ACTION_ICO = "desk-module__msheet-action-ico";

test("action icons use the shared contextmenu artwork", () => {
  // The real map, so a rename glyph that changes there changes here too.
  // The icon map reads globals the app provides at runtime.
  const savedLodash = global._;
  const savedLs = global.localStorage;
  global._ = require("lodash");
  global.localStorage = { getItem: () => null, setItem: () => {} };
  const icons = require("../src/drumee/builtins/contextmenu/skeleton/icons.js")({
    fig: { group: "media-grid" },
  });
  if (savedLodash === undefined) delete global._; else global._ = savedLodash;
  if (savedLs === undefined) delete global.localStorage; else global.localStorage = savedLs;
  const acts = [
    { key: "rename", label: "Rename", ico: icons.rename, service: "workspace-rename", onDesk: 1 },
    { key: "makeACopy", label: "Make a copy", ico: icons.makeACopy, service: "duplicate" },
    { key: "download", label: "Download", ico: icons.download, service: "download" },
    { key: "trash", label: "Move to trash", ico: icons.trash, service: "remove" },
  ];
  const tree = withActions(HUB_A, acts);
  const got = findAll(tree, ACTION_ICO).map(glyphOf);
  assert.deepEqual(got, [
    "ctxmenu-rename",
    "ctxmenu-copy",
    "ctxmenu-download",
    "ctxmenu-delete",
  ]);
  // Every one exists — a name with no symbol renders an empty row.
  const sprite = readFileSync(
    resolve(__dirname, "../icons/sprites/normalized.sprite.svg"),
    "utf8",
  );
  for (const ico of got) {
    assert.ok(sprite.includes(`id="--icon-${ico}"`), `sprite has no "${ico}"`);
  }
});

test("action icons are NOT the sheet's own 22px sprite class", () => {
  // __msheet-ico forces svg {22×22}, which oversizes ctxmenu-* artwork and
  // squares off the glyphs that are not square.
  const list = find(withActions(HUB_A, ACTIONS), LIST);
  // Scoped to the LIST: the pinned "New workspace" button keeps __msheet-ico,
  // and it is not part of the actions menu.
  assert.equal(findAll(list, "desk-module__msheet-ico").length, 0);
  assert.equal(findAll(list, ACTION_ICO).length, ACTIONS.length);
});

test("each action icon stamps its sprite name for the size exceptions", () => {
  // The two exceptions (topbar-add, topbar-invite) are keyed on the artwork.
  const acts = [
    { key: "inviteMember", label: "Invite", ico: "topbar-invite", service: "invite-member" },
    { key: "addNew", label: "New", ico: "topbar-add", service: "add-new" },
  ];
  for (const n of findAll(withActions(HUB_A, acts), ACTION_ICO)) {
    assert.equal(n.attrOpt["data-ico"], glyphOf(n), "data-ico must name the sprite");
  }
});

test("a row with no artwork gets no icon, not a stand-in", () => {
  const tree = withActions(HUB_A, [
    { key: "odd", label: "Something", service: "whatever" },
  ]);
  assert.equal(findAll(tree, ACTION_ICO).length, 0);
  // The row itself survives — only its glyph is absent.
  const rows = findAll(find(tree, LIST), "desk-module__msheet-row");
  assert.deepEqual(rows.map((r) => textIn(r)[0]), ["Something"]);
});

// ── the extraction reads what ui-core really produces ──────────────────────
//
// _mobileWorkspaceActions lifts each glyph off a row built by the SHARED
// contextmenu builder. That builder uses Skeletons.Image.Svg, whose factory
// (ui-core toolkit/builder/button/svg.js) does:
//
//   if (this.props.ico) { this.props.chartId = this.props.ico;
//                         delete this.props.ico; }
//
// so the glyph arrives as `chartId` and `ico` does not exist. Reading only
// `ico` found nothing and the sheet drew action rows with no glyph at all —
// while a probe using a verbatim stub reported the icons were fine.
test("the desk reads the glyph off chartId, not just ico", () => {
  const body = grab("_mobileWorkspaceActions");
  assert.ok(
    /chartId/.test(body),
    "_mobileWorkspaceActions reads only `ico` — ui-core renames it to chartId",
  );
});

test("extraction survives ui-core's ico -> chartId rename", () => {
  // The shipped extraction, run against a row shaped exactly as the real
  // builder emits one: the icon kid carries chartId and NO ico.
  const body = grab("_mobileWorkspaceActions");
  const m = body.match(
    /const kids = \[\][\s\S]*?const ico = iconKid && \([^;]+\);/,
  );
  assert.ok(m, "the extraction block moved — update this test");
  const extract = new Function(
    "row",
    `${m[0].replace(/^\s*const kids/m, "const kids")} return ico;`,
  );
  const realShape = {
    kids: [
      { __kind: "image.svg", chartId: "ctxmenu-rename", className: "contextmenu-item__icon" },
      { __kind: "note", content: "Rename", className: "contextmenu-item__label" },
    ],
  };
  assert.equal(extract(realShape), "ctxmenu-rename");
  // A hand-made row that still spells it `ico` keeps working.
  assert.equal(
    extract({ kids: [{ ico: "ctxmenu-delete" }, { content: "Trash" }] }),
    "ctxmenu-delete",
  );
  // No artwork at all -> no glyph, so the row renders without one.
  assert.ok(!extract({ kids: [{ content: "Something" }] }));
});
