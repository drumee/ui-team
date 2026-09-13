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

test("column mode stamps data-mode on the root", () => {
  const opt = { mode: "column" };
  Object.create(Panel.prototype).initialize(opt);
  assert.equal(opt.dataset.mode, "column");
  assert.equal(opt.dataset.position, "0");
});

test("drawer mode stamps no data-mode", () => {
  const opt = {};
  Object.create(Panel.prototype).initialize(opt);
  assert.equal("mode" in opt.dataset, false);
  assert.equal(opt.dataset.position, "0");
});
