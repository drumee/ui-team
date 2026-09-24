// The invite popup controller against stub LetcBox / services. The widget and
// the tree model are real; the skeletons, skin and network are not.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const DIR = path.join(__dirname, "..", "src/drumee/builtins/widget/invite-popup");
const ADMIN = 31;
let orgAnswer = { organisation: null, can_browse: 0, departments: [], workspaces: [] };

const STUBS = {
  "./skin": {},
  "./skeleton": Object.assign(() => ({}), {
    ROLES: [{ id: "view", bit: 3 }, { id: "edit", bit: 15 }, { id: "admin", bit: 31 }],
    DEFAULT_ROLE_IDS: ["edit"],
    computePrivilege: (ids) => ({ view: 3, edit: 15, admin: 31 })[ids[0]] || 15,
    summarizeRoles: (ids) => ids[0],
    workspaceGlyph: () => "",
    linkPanelKids: () => [],
    orgCardKids: () => [],
  }),
  "./skeleton/tree": { rows: (ui, tree, st) => [{ rows: true, st }] },
  "libs/contact-lookup": { lookupContacts: async () => [], suggestionRows: () => [] },
  "libs/billing": { isSeatLimitReply: () => false, showSeatLimitReached() {} },
  "libs/org-overview": {
    orgOverview: async () => orgAnswer,
    inOrganization: () => !!orgAnswer.organisation,
  },
  "media/grid/template/folder": () => "",
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};

global.SERVICE = { desk: { home: "desk.home" }, hub: { invite: "hub.invite" } };
global._a = { hub: "hub", commit: "commit", service: "service" };
global._e = { close: "close", destroy: "destroy" };
global.LOCALE = new Proxy({}, { get: (t, k) => k });
global.Visitor = { id: "me", profile: () => ({ email: "me@x.com" }) };
global.Wm = { alert() {} };
global._ = { isFunction: (f) => typeof f === "function", isArray: Array.isArray };
global.document = { addEventListener() {}, removeEventListener() {} };

const part = () => ({
  el: { dataset: {}, querySelector: () => null, querySelectorAll: () => [] },
  feed(x) { this.fed = x; },
  clear() {},
  set() {},
});
global.LetcBox = class {
  constructor(opt = {}) {
    this._opt = opt;
    this.el = { dataset: {}, addEventListener() {}, contains: () => false };
    this.fig = { family: "invite-popup" };
  }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._opt[k]; }
  // Counts WHOLE-widget re-feeds: each one rebuilds every part (chips included).
  feed() { this.wholeFeeds = (this.wholeFeeds || 0) + 1; }
  triggerHandlers(a) { (this.triggered = this.triggered || []).push(a); }
  warn() {}
};

const Popup = require(DIR);
const home = [
  { hub_id: "h1", filename: "Design", area: "private", privilege: ADMIN },
  { hub_id: "h2", filename: "Sales", area: "private", privilege: ADMIN },
  { hub_id: "h3", filename: "Nope", area: "private", privilege: 3 },
];
const cmd = (service, dataset = {}) => ({
  mget: (k) => (k === "service" ? service : undefined),
  el: { dataset },
});

function make(opt = {}) {
  const p = new Popup(opt);
  p.initialize(opt);
  p.fetchService = async () => home;
  p.posted = [];
  p.postService = async (svc, args) => { p.posted.push([svc, args]); return { results: [] }; };
  for (const pn of ["org", "tree", "all-check", "send-btn", "email-error", "workspace-error", "link-panel", "tabs"])
    p.onPartReady(part(), pn);
  return p;
}

test("development build: an org without departments gets mock ones", async () => {
  global.__BUILD__ = "development";
  try {
    const p = make();
    await p._loadData();
    assert.deepEqual(p._tree.departments.map((d) => d.id), ["mock-1"]);
    assert.deepEqual(p._tree.departments[0].workspaces.map((w) => w.hub_id), ["h1", "h2"]);
  } finally {
    delete global.__BUILD__;
  }
});

test("production build: no mock departments", async () => {
  global.__BUILD__ = "production";
  try {
    const p = make();
    await p._loadData();
    assert.equal(p._tree.departments.length, 0);
  } finally {
    delete global.__BUILD__;
  }
});

test("loads a flat tree from desk.home when there is no organisation", async () => {
  const p = make();
  await p._loadData();
  assert.deepEqual(p._tree.ungrouped.map((w) => w.hub_id), ["h1", "h2"]);
  assert.equal(p._org, null);
  assert.ok(p._treeBox.fed[0].rows, "tree part was fed");
});

test("kebab seed pre-checks that workspace and expands its department", async () => {
  orgAnswer = {
    organisation: { name: "Acme" }, can_browse: 1,
    departments: [{ id: 7, name: "D" }], workspaces: [{ hub_id: "h2", department_id: 7 }],
  };
  try {
    const p = make({ hub_id: "h2", hub_name: "Sales" });
    await p._loadData();
    assert.deepEqual([...p._checked], ["h2"]);
    assert.deepEqual([...p._expanded], ["7"]);
    assert.equal(p._org.name, "Acme");
  } finally {
    orgAnswer = { organisation: null, can_browse: 0, departments: [], workspaces: [] };
  }
});

test("org answer fills the org slot without re-feeding the popup", async () => {
  orgAnswer = { organisation: { name: "Acme" }, can_browse: 0, departments: [], workspaces: [] };
  try {
    const p = make();
    p._invitees = [{ email: "a@b.co" }];
    await p._loadData();
    assert.equal(p.wholeFeeds || 0, 0, "a whole re-feed rebuilds the email row and drops chips");
    assert.equal(p._orgBox.el.dataset.state, 1);
    assert.ok(Array.isArray(p._orgBox.fed));
  } finally {
    orgAnswer = { organisation: null, can_browse: 0, departments: [], workspaces: [] };
  }
});

// desk.home is paginated at 45 (desk _fetchWorkspacePages); a workspace on
// page 2 must still be offered — and pre-checked from its kebab.
test("reads every desk.home page and pre-checks a page-2 seed", async () => {
  const page1 = Array.from({ length: 45 }, (_, i) => ({ hub_id: `p${i}`, filename: `W${i}`, area: "private", privilege: ADMIN }));
  const page2 = [{ hub_id: "late", filename: "Late", area: "private", privilege: ADMIN }];
  const p = make({ hub_id: "late", hub_name: "Late" });
  const pages = [];
  p.fetchService = async (svc, args) => {
    const page = (svc && svc.page) || (args && args.page);
    pages.push(page);
    return page === 1 ? page1 : page === 2 ? page2 : [];
  };
  await p._loadData();
  assert.deepEqual(pages, [1, 2]);
  assert.equal(p._tree.ungrouped.length, 46);
  assert.deepEqual([...p._checked], ["late"]);
});

test("a single-object desk.home answer still lists that workspace", async () => {
  const p = make();
  p.fetchService = async () => home[0];
  await p._loadData();
  assert.deepEqual(p._tree.ungrouped.map((w) => w.hub_id), ["h1"]);
});

test("toggle-ws and toggle-all update selection and the All stamp", async () => {
  const p = make();
  await p._loadData();
  p.onUiEvent(cmd("toggle-ws", { hub_id: "h1" }));
  assert.deepEqual([...p._checked], ["h1"]);
  assert.equal(p._allCheck.el.dataset.state, "mixed");
  p.onUiEvent(cmd("toggle-all"));
  assert.deepEqual([...p._checked].sort(), ["h1", "h2"]);
  assert.equal(p._allCheck.el.dataset.state, 1);
});

test("no invitable workspace: All is hidden and Send stays off", async () => {
  const p = make();
  p.fetchService = async () => [];
  await p._loadData();
  p._invitees = [{ email: "a@b.co" }];
  p._refreshSendState();
  assert.equal(p._allCheck.el.dataset.state, "hidden");
  assert.equal(p._sendBtn.el.dataset.state, 0);
});

test("send is enabled only with an invitee AND a checked workspace", async () => {
  const p = make();
  await p._loadData();
  p._invitees = [{ email: "a@b.co" }];
  p._refreshSendState();
  assert.equal(p._sendBtn.el.dataset.state, 0);
  p._checked = new Set(["h1"]);
  p._refreshSendState();
  assert.equal(p._sendBtn.el.dataset.state, 1);
});

test("send posts one hub.invite per checked workspace with that row's role", async () => {
  const p = make();
  await p._loadData();
  p._invitees = [{ email: "a@b.co" }];
  p._checked = new Set(["h1", "h2"]);
  p._roles.set("h2", "admin");
  p._closePopup = () => {};
  await p._sendInvitation();
  assert.deepEqual(p.posted.map(([s, a]) => [s, a.hub_id, a.permission, a.invitees]), [
    ["hub.invite", "h1", 15, ["a@b.co"]],
    ["hub.invite", "h2", 31, ["a@b.co"]],
  ]);
  assert.equal(p.triggered[0].service, "invitation-sent");
});

test("no checked workspace: workspace error, nothing posted", async () => {
  const p = make();
  await p._loadData();
  p._invitees = [{ email: "a@b.co" }];
  await p._sendInvitation();
  assert.equal(p.posted.length, 0);
  assert.equal(p._workspaceError.el.dataset.state, 1);
});

test("public link tab is local state only: no server call", async () => {
  const p = make();
  await p._loadData();
  p.onUiEvent(cmd("switch-tab", { tab: "link" }));
  assert.equal(p.el.dataset.tab, "link");
  p.onUiEvent(cmd("toggle-expiry"));
  p.onUiEvent(cmd("pick-expiry", { preset: "24h" }));
  assert.deepEqual([p._link.expiry, p._link.preset], [1, "24h"]);
  p.onUiEvent(cmd("get-link"));
  assert.equal(p.posted.length, 0);
  p._setLink("https://x/s/1");
  assert.equal(p._link.url, "https://x/s/1");
  p.onUiEvent(cmd("revoke-link"));
  assert.equal(p._link.url, null);
});
