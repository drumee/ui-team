// Messenger attach button: the From device / From workspace menu, and the
// opt-in device-only mode the Inbox uses (no_workspace_attach).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@drumee/ui-essentials") return {};
  return load.call(this, request, parent, isMain);
};
global._a = new Proxy({}, { get: (t, k) => k });
global._e = new Proxy({}, { get: (t, k) => k });
global.LetcBox = class {};

const Messenger = require(path.join(__dirname, "..", "src/drumee/builtins/messenger"));

function messenger(model) {
  const m = Object.create(Messenger.prototype);
  const opened = [];
  let menuShown = 0;
  Object.assign(m, {
    mget: (k) => model[k],
    __fileselector: { open: (cb) => opened.push(cb) },
    __wrapperAttachMenu: null,
    _showAttachMenu() { menuShown++; },
    _upload() {},
  });
  return { m, opened, menuShown: () => menuShown };
}

test("attach opens the From device / From workspace menu by default", () => {
  const x = messenger({});
  x.m.onUiEvent({ mget: () => "attach" }, {});
  assert.equal(x.menuShown(), 1);
  assert.equal(x.opened.length, 0);
});

test("no_workspace_attach skips the menu and opens the device picker", () => {
  const x = messenger({ no_workspace_attach: 1 });
  x.m.onUiEvent({ mget: () => "attach" }, {});
  assert.equal(x.menuShown(), 0);
  assert.equal(x.opened.length, 1);
});
