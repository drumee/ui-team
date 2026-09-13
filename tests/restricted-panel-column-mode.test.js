const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const { installGlobals, installResolver, find } = require("./helpers/render-skeleton");
const { requireEsmish } = require("./helpers/load-esmish");

function renderPanel(mode) {
  const restoreGlobals = installGlobals();
  const restoreResolver = installResolver();
  try {
    const make = requireEsmish("src/drumee/builtins/permission/restricted/skeleton/index.js");
    return make({
      fig: { family: "permission-restricted" },
      mget: (k) => (k === "mode" ? mode : null),
      _membersLoaded: true,
      _members: [],
    });
  } finally {
    restoreResolver();
    restoreGlobals();
  }
}

test("drawer mode keeps the close button", () => {
  assert.ok(find(renderPanel(undefined), "permission-restricted__close"));
});

test("column mode has no close button, and still draws its header", () => {
  const tree = renderPanel("column");
  assert.equal(find(tree, "permission-restricted__close"), null);
  assert.ok(find(tree, "permission-restricted__title"));
});

// The widget itself, with its webpack aliases and framework globals stubbed.
const SRC = require.resolve("../src/drumee/builtins/permission/restricted/index.js");
const origLoad = Module._load;
let Panel;
test.before(() => {
  Module._load = function (request, ...rest) {
    if (request === "libs/contact-lookup") return { attachEmailLookup() {}, fillEntry() {} };
    // The real one: these tests are about the panel USING it.
    if (request === "libs/members-prefetch") return require("../src/drumee/libs/members-prefetch");
    if (/builtins\/skeleton\/toolkit$/.test(request)) {
      return { roleByValue: () => ({}), roleFromPrivilege: () => ({}) };
    }
    if (request === "./skin" || request === "./skeleton") return () => ({});
    return origLoad.call(this, request, ...rest);
  };
  global.DrumeeMFS = class { initialize() {} declareHandlers() {} };
  global.Wm = { on() {}, off() {} };
  global._a = { hub_id: "hub_id", media: "media" };
  global.SERVICE = { hub: { get_members_by_type: "hub.get_members_by_type" } };
  delete require.cache[SRC];
  Panel = require(SRC);
});
test.after(() => {
  Module._load = origLoad;
});

// A fed widget's model is the DESCRIPTOR its parent collection built: ui-core's
// View.initialize only makes a model from `opt` when none exists. So an edit to
// `opt.dataset` inside initialize() never reaches the element — the model is
// kept apart from `opt` here, exactly as it is at runtime.
function panelWith(attrs) {
  const p = Object.create(Panel.prototype);
  p.el = { dataset: {} };
  p.model = { get: (k) => attrs[k] };
  p.mget = (k) => attrs[k];
  return p;
}

// A panel ready to run _loadMembers: it records the requests IT makes, so a
// test can tell the click's request from the panel's own.
function loader(attrs) {
  const p = panelWith(attrs);
  p.own = [];
  p.fetchService = (service, params) => {
    p.own.push(params);
    return Promise.resolve([{ entity_id: "own", email: "own@x.io" }]);
  };
  p._render = () => {};
  p.warn = () => {};
  return p;
}

test("column mode stamps data-mode on the element, from the model", () => {
  const p = panelWith({ kind: "permission_restricted", mode: "column" });
  p.initialize({ kind: "permission_restricted", mode: "column" });
  assert.equal(p.el.dataset.mode, "column");
});

test("drawer mode stamps no data-mode", () => {
  const p = panelWith({ kind: "permission_restricted" });
  p.initialize({ kind: "permission_restricted" });
  assert.equal("mode" in p.el.dataset, false);
});

// In column mode data-position is what says the members have LANDED — it ends
// the panel's loading skeleton (permission/restricted/skin) — so the reveal
// stamps that and nothing else. The entrance belongs to the view switch now.
// Opening Access starts the members read at the click, while the panel's own
// chunk is still downloading (libs/members-prefetch). The panel must take that
// answer — a second identical request would throw the head start away.
test("the panel takes the answer the click already started", async () => {
  const { prefetchMembers } = require("../src/drumee/libs/members-prefetch");
  const clicked = [];
  const opener = {
    fetchService(service, params) {
      clicked.push(params.hub_id);
      return Promise.resolve([{ entity_id: "u1", email: "u1@x.io" }]);
    },
  };
  prefetchMembers(opener, "hub-take");

  const p = loader({ hub_id: "hub-take" });
  await p._loadMembers();
  assert.deepEqual(clicked, ["hub-take"], "the click's request was not the one used");
  assert.equal(p.own.length, 0, "the panel started a second request");
  assert.deepEqual(p._members, [{ entity_id: "u1", email: "u1@x.io" }]);
  assert.equal(p.el.dataset.position, "1", "never revealed");
});

test("with no head start the panel asks for itself", async () => {
  const p = loader({ hub_id: "hub-solo" });
  await p._loadMembers();
  assert.equal(p.own.length, 1);
  assert.equal(p.own[0].hub_id, "hub-solo");
  assert.equal(p.own[0].type, "all");
  assert.ok(p.own[0]._ts, "no cache-buster");
});

test("a workspace-less panel reveals without asking anything", async () => {
  const p = loader({});
  await p._loadMembers();
  assert.equal(p.own.length, 0);
  assert.equal(p.el.dataset.position, "1");
});

test("a reveal stamps data-position, in either mode", () => {
  for (const opt of [{ kind: "permission_restricted", mode: "column" }, { kind: "permission_restricted" }]) {
    const p = panelWith(opt);
    p._reveal();
    assert.equal(p.el.dataset.position, "1");
    assert.equal("entering" in p.el.dataset, false, "the entrance stamp is gone");
  }
});
