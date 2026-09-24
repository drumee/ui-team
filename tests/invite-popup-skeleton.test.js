// Renders the REAL invite-popup skeletons (layout + tree rows) against stub
// Skeletons/LOCALE globals and inspects the descriptor tree they return.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const DIR = path.join(__dirname, "..", "src/drumee/builtins/widget/invite-popup");

// Webpack-alias requests node cannot resolve.
const STUBS = {
  "builtins/skeleton/toolkit/permission": {
    roleItems: [
      { value: "view", privilege: 3, label: "View", description: "v" },
      { value: "chat", privilege: 7, label: "Chat", description: "c" },
      { value: "edit", privilege: 15, label: "Edit", description: "e" },
      { value: "admin", privilege: 31, label: "Admin", description: "a" },
    ],
    ROLE_ICONS: { view: "i-v", chat: "i-c", edit: "i-e", admin: "i-a" },
  },
  "media/grid/template/folder": (o) => `<svg class="folder-shape ${o.area}"></svg>`,
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Element: node("Element"),
  Entry: node("Entry"),
  Button: { Svg: node("Button.Svg") },
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._ = { uniqueId: (p) => `${p}1` };
global._a = { hub: "hub" };

const skeleton = require(path.join(DIR, "skeleton"));
const { rows } = require(path.join(DIR, "skeleton/tree"));
const T = require(path.join(DIR, "tree"));

const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const P = "invite-popup";
const cls = (tree, c) =>
  walk(tree).filter((n) => String(n.className || "").split(/\s+/).includes(`${P}__${c}`));
const ui = (o = {}) => ({
  fig: { family: P },
  _org: null,
  _tab: "email",
  _link: { expiry: 0, preset: "7d", url: null },
  ...o,
});

test("root keeps the class the guided flows select on", () => {
  assert.equal(skeleton(ui()).className, `${P}__container`);
});

// A SLOT, filled once organization.overview answers — so the controller feeds
// that one part instead of re-feeding the whole popup (which rebuilt the email
// row and dropped chips the user had already added).
test("org card is an always-present slot, empty and off outside an organisation", () => {
  const slot = cls(skeleton(ui()), "org-card")[0];
  assert.equal(slot.sys_pn, "org");
  assert.equal(slot.dataset.state, 0);
  assert.equal((slot.kids || []).length, 0);
  const org = { name: "Acme", department_count: 3, member_count: 24 };
  const on = cls(skeleton(ui({ _org: org })), "org-card")[0];
  assert.equal(on.dataset.state, 1);
  const texts = walk(skeleton.orgCardKids(ui({ _org: org }), P)).map((n) => n.content).filter(Boolean);
  assert.ok(texts.includes("Acme") && texts.includes("3") && texts.includes("24"));
});

test("two tabs, the active one stamped", () => {
  const tabs = cls(skeleton(ui({ _tab: "link" })), "tab");
  assert.deepEqual(tabs.map((t) => [t.dataset.tab, t.dataset.state]), [["email", 0], ["link", 1]]);
  assert.ok(tabs.every((t) => t.service === "switch-tab"));
});

test("email panel keeps the chips/input/suggestions parts", () => {
  const pns = walk(skeleton(ui())).map((n) => n.sys_pn).filter(Boolean);
  for (const pn of ["email-chips", "email-input", "suggestions", "email-error", "tree", "all-check", "send-btn", "link-panel"])
    assert.ok(pns.includes(pn), `missing part ${pn}`);
});

test("link panel: segments only when expiry is on, url row only when a link exists", () => {
  assert.equal(cls(skeleton(ui()), "expiry-option").length, 0);
  const on = skeleton(ui({ _tab: "link", _link: { expiry: 1, preset: "7d", url: null } }));
  assert.deepEqual(cls(on, "expiry-option").map((n) => [n.dataset.preset, n.dataset.state]),
    [["1h", 0], ["24h", 0], ["7d", 1], ["custom", 0]]);
  assert.equal(cls(on, "link-row").length, 0);
  const got = skeleton(ui({ _tab: "link", _link: { expiry: 1, preset: "7d", url: "https://x/s/abc" } }));
  assert.equal(cls(got, "link-row").length, 1);
  assert.equal(cls(got, "revoke").length, 1);
});

const home = [
  { hub_id: "h1", filename: "Design", area: "private", privilege: 31 },
  { hub_id: "h2", filename: "Sales", area: "private", privilege: 31 },
  { hub_id: "h3", filename: "Loose", area: "share", privilege: 31 },
];
const overview = {
  can_browse: 1,
  departments: [{ id: 10, name: "Product" }],
  workspaces: [{ hub_id: "h1", department_id: 10, members: 24 }, { hub_id: "h2", department_id: 10, members: 3 }],
};

test("department row: cube, name, workspace-count pill, caret, tri-state check", () => {
  const t = T.buildTree({ homeRows: home, overview });
  const out = rows(ui(), t, { checked: new Set(["h1"]), expanded: new Set(), roles: new Map() });
  const dept = cls(out, "dept-row")[0];
  assert.ok(walk(dept).some((n) => n.ico === "ph-cube"));
  assert.ok(walk(dept).some((n) => n.content === "Product"));
  assert.ok(walk(dept).some((n) => n.content === "2"));
  assert.equal(cls(dept, "check")[0].dataset.state, "mixed");
  assert.equal(cls(out, "dept-children").length, 0, "collapsed: children not rendered");
});

test("expanded department nests its workspaces; ungrouped rows follow", () => {
  const t = T.buildTree({ homeRows: home, overview });
  const out = rows(ui(), t, { checked: new Set(["h1"]), expanded: new Set(["10"]), roles: new Map([["h1", "admin"]]) });
  const nested = cls(cls(out, "dept-children")[0], "ws-row");
  assert.deepEqual(nested.map((r) => r.dataset.hub_id), ["h1", "h2"]);
  assert.equal(cls(nested[0], "check")[0].dataset.state, 1);
  assert.ok(walk(nested[0]).some((n) => n.content === "Admin"), "role pill shows the row's role");
  assert.ok(walk(nested[0]).some((n) => n.content === "24"), "member pill");
  const top = out.filter((n) => String(n.className).includes(`${P}__ws-row`));
  assert.deepEqual(top.map((r) => r.dataset.hub_id), ["h3"]);
  assert.equal(walk(top[0]).some((n) => String(n.className || "").includes(`${P}__members`)), false,
    "no member pill when the count is unknown");
});

test("role options keep the class and data the controller resolves", () => {
  const t = T.buildTree({ homeRows: home, overview: { can_browse: 0 } });
  const out = rows(ui(), t, { checked: new Set(), expanded: new Set(), roles: new Map() });
  const opts = walk(out).filter((n) => String(n.className || "").includes(`${P}__role-option`) && n.dataset && n.dataset.id);
  assert.equal(opts.length, 3 * 4);
  assert.deepEqual(Object.keys(opts[0].dataset).sort(), ["checked", "hub_id", "id"]);
});

// Figma draws a plain bold tick and a circle-slash: `app-check` is a CIRCLED
// check and `app-prohibit` is a shield in this sprite (seen in the headless
// render), so the ids are pinned here.
test("checkbox tick and Revoke glyph match the design's icons", () => {
  const t = T.buildTree({ homeRows: home, overview: { can_browse: 0 } });
  const out = rows(ui(), t, { checked: new Set(["h1"]), expanded: new Set(), roles: new Map() });
  assert.ok(cls(out, "check-tick").every((n) => n.ico === "chat-tick"));
  const got = skeleton(ui({ _tab: "link", _link: { expiry: 0, preset: "7d", url: "https://x/s/abc" } }));
  assert.equal(cls(got, "revoke-ico")[0].ico, "app-ban");
});

test("no invitable workspace: one empty-state line", () => {
  const out = rows(ui(), { departments: [], ungrouped: [] }, { checked: new Set(), expanded: new Set(), roles: new Map() });
  assert.equal(out.length, 1);
  assert.equal(out[0].content, en.INVITE_NO_WORKSPACE);
});
