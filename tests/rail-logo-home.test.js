// The rail's drumee logo is the desk's temporary Home.
//
// Lexis, 2026-09-15: people who open the Calendar / Inbox / a Settings screen
// have no single way back and "get lost in navigation". The logo, which used to
// be decoration, now leads out — to the organisation screen when this account
// has one it may browse, and back to the workspace otherwise.
//
// TWO HALVES, TESTED TWO WAYS. The skeleton half is rendered for real through
// tests/helpers/render-desk-sidebar.js, so a glyph that loses its service or a
// pin toggle that accidentally gains one shows up here. The desk half is a pair
// of methods inside a 9000-line class that needs the whole runtime to
// instantiate, so — exactly as tests/call-tile-drag.test.js does — they are cut
// out of the SOURCE FILE and run against a fake `this`. Both therefore test the
// shipped text rather than a copy of it.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { render, find, findAll, walk, servicesIn } =
  require("./helpers/render-desk-sidebar.js");

const FIG = "desk-module-sidebar";
const DESK = resolve(__dirname, "../src/drumee/modules/desk/index.js");
const src = readFileSync(DESK, "utf8");

// ── the skeleton ────────────────────────────────────────────────────────────

test("both logo glyphs carry the Home gesture", () => {
  const tree = render();
  const wordmark = find(tree, `${FIG}__logo-icon`);
  const mark = find(tree, `${FIG}__logo-mark`);

  // Both, because the skin swaps one for the other at the mini/expanded
  // boundary — whichever is on screen has to be the one that works.
  for (const [name, n] of [["wordmark", wordmark], ["mark", mark]]) {
    assert.ok(n, `${name} not rendered`);
    assert.equal(n.service, "rail-home", `${name} lost its service`);
    assert.ok(Array.isArray(n.uiHandler) && n.uiHandler.length === 1,
      `${name} needs uiHandler as a one-element ARRAY (getHandlers returns it verbatim)`);
    // The flag desk_module.onUiEvent reads off the clicked view to drop the
    // transient cards a navigation gesture must not leave standing.
    assert.equal(n.railRow, 1, `${name} lost railRow`);
  }

  // Same desk, but NOT the same array instance: the renderer keeps `uiHandler`
  // per descriptor, so a shared literal would hand two views one array.
  assert.equal(wordmark.uiHandler[0], mark.uiHandler[0]);
  assert.notStrictEqual(wordmark.uiHandler, mark.uiHandler);
});

test("nothing around the logo fires Home by accident", () => {
  const tree = render();

  // The row also holds the collapse toggle. If the ROW carried the gesture,
  // pinning the rail would navigate.
  assert.equal(find(tree, `${FIG}__logo-row`).service, undefined);
  assert.equal(find(tree, `${FIG}__logo`).service, undefined);

  const pin = find(tree, `${FIG}__logo-pin-btn`);
  assert.equal(pin.service, "toggle-sidebar-pin");

  // The organisation name under the wordmark stays inert — it is a label, and
  // it is the one node in the block that is NOT the logo.
  const header = find(tree, `${FIG}__header`);
  assert.equal(header.service, undefined);
  assert.equal(header.active, 0);

  // Exactly two nodes in the whole rail fire it.
  const homes = [...walk(tree)].filter((n) => n.service === "rail-home");
  assert.equal(homes.length, 2);
});

test("the five tabs and the two footer rows are untouched", () => {
  const tree = render();
  assert.deepEqual(
    servicesIn(find(tree, `${FIG}__nav-main`)),
    ["rail-files", "rail-chat", "rail-task", "rail-meet", "rail-access"],
  );
  assert.deepEqual(
    servicesIn(find(tree, `${FIG}__footer`)),
    ["invite-member", "upgrade-plan"],
  );
  // The logo is deliberately NOT in the rail's radio group: it is not a sixth
  // tab, and lighting it would claim a screen it does not own.
  for (const n of findAll(tree, `${FIG}__logo-icon`).concat(findAll(tree, `${FIG}__logo-mark`))) {
    assert.equal(n.radio, undefined);
  }
});

// ── the desk ────────────────────────────────────────────────────────────────

// One class method, lifted out of index.js. Every one of these closes at the
// first line that is exactly "  }" — nothing inside them is indented that
// shallowly — so the slice is unambiguous.
function grab(name) {
  const start = src.indexOf(`  ${name}(`);
  assert.ok(start > 0, `${name} not found in ${DESK}`);
  const end = src.indexOf("\n  }\n", start) + 4;
  assert.ok(end > start, `${name} has no end`);
  return src.slice(start, end);
}

function build(names, scope = {}) {
  const keys = Object.keys(scope);
  const body = `return { ${names.map(grab).join(",\n")} };`;
  return new Function(...keys, body)(...keys.map((k) => scope[k]));
}

test("the logo is wired to _railHome, once", () => {
  const cases = src.match(/case "rail-home":/g) || [];
  assert.equal(cases.length, 1);
  assert.match(
    src.slice(src.indexOf('case "rail-home":')),
    /^case "rail-home":\n\s*return this\._railHome\(\);/,
  );
});

// The three destinations. What decides between them is `can_browse`, which
// only the server knows (dom_admin_security or above — server-team
// service/private/organization.js), so the answer cannot be baked into the
// skeleton and has to be resolved on the click.
function railHome({ orgFeature, overview }) {
  const calls = [];
  const fakeRequire = (m) => {
    assert.equal(m, "libs/org-overview");
    return { orgFeature: () => orgFeature, orgOverview: () => Promise.resolve(overview) };
  };
  const api = build(["_railHome", "_railHomeWorkspace"], { require: fakeRequire });
  const self = {
    ...api,
    isDestroyed: () => false,
    _openOrgView: () => calls.push("org-view"),
    _railTab: (t) => calls.push(`rail-tab:${t}`),
    _resetRailToFiles: () => calls.push("light-files"),
  };
  return Promise.resolve(self._railHome()).then(() => calls);
}

test("an org admin lands on the organisation screen", async () => {
  assert.deepEqual(
    await railHome({ orgFeature: true, overview: { can_browse: 1 } }),
    ["org-view"],
  );
});

test("a plain member goes back to the workspace, not to an empty org screen", async () => {
  // The topbar chip withholds "Open" from exactly these accounts because the
  // server sends them no departments and no workspaces.
  assert.deepEqual(
    await railHome({ orgFeature: true, overview: { can_browse: 0 } }),
    ["rail-tab:files", "light-files"],
  );
});

test("an account with no organisation still has somewhere to go", async () => {
  // domain 1 — 79% of accounts. A dead click here would be worse than the bug.
  assert.deepEqual(
    await railHome({ orgFeature: false, overview: null }),
    ["rail-tab:files", "light-files"],
  );
  // And a server with no org endpoints at all resolves to the EMPTY shape.
  assert.deepEqual(
    await railHome({ orgFeature: true, overview: { can_browse: 0, organisation: null } }),
    ["rail-tab:files", "light-files"],
  );
});

test("the fallback lights Files AFTER leaving the screen", async () => {
  // Order matters: _railTab closes the section screen, and _resetRailToFiles
  // then re-lights the row the close left dark.
  const calls = await railHome({ orgFeature: true, overview: { can_browse: 0 } });
  assert.ok(calls.indexOf("rail-tab:files") < calls.indexOf("light-files"));
});

test("a desk destroyed mid-fetch navigates nowhere", async () => {
  const fakeRequire = () => ({
    orgFeature: () => true,
    orgOverview: () => Promise.resolve({ can_browse: 1 }),
  });
  const api = build(["_railHome", "_railHomeWorkspace"], { require: fakeRequire });
  const calls = [];
  const self = {
    ...api,
    isDestroyed: () => true,
    _openOrgView: () => calls.push("org-view"),
    _railTab: () => calls.push("rail-tab"),
    _resetRailToFiles: () => calls.push("light"),
  };
  await self._railHome();
  assert.deepEqual(calls, []);
});

// ── the rail must not claim a screen it cannot see ──────────────────────────

function openOrgView(orgFeature) {
  const calls = [];
  const scope = {
    require: () => ({ orgFeature: () => orgFeature }),
    RADIO_BROADCAST: { trigger: (ch) => calls.push(`broadcast:${ch}`) },
    Organization: { name: () => "Acme" },
    LOCALE: { ORGANIZATION: "Organization" },
  };
  const api = build(["_openOrgView"], scope);
  const self = {
    ...api,
    _railUnlight: () => calls.push("unlight"),
    togglePanel: (kind) => calls.push(`panel:${kind}`),
  };
  self._openOrgView();
  return calls;
}

test("opening the org screen puts the rail out", () => {
  // settings-main-slot is inset:0 over the workspace pane, so a lit Files row
  // would be naming a surface nobody can see — the same disagreement
  // toggle-apps / toggle-inbox / toggle-calendar each fix on their way in.
  assert.deepEqual(openOrgView(true), [
    "unlight",
    "broadcast:breadcrumb:context",
    "panel:desk_org_view",
  ]);
});

test("an open that refuses leaves the rail alone", () => {
  // No organisation, no server: nothing changed on screen, so nothing may go
  // dark. The gate has to come first.
  assert.deepEqual(openOrgView(false), []);
});
