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
    if (/builtins\/skeleton\/toolkit$/.test(request)) {
      return { roleByValue: () => ({}), roleFromPrivilege: () => ({}) };
    }
    if (request === "./skin" || request === "./skeleton") return () => ({});
    return origLoad.call(this, request, ...rest);
  };
  global.DrumeeMFS = class { initialize() {} declareHandlers() {} };
  global.Wm = { on() {}, off() {} };
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
