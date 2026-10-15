// Touch has no Escape: a visible Skip is the only way out of a tour there.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
global.LOCALE = { TUTORIAL_SKIP: "Skip tour" };
global.Skeletons = { Note: (o) => ({ type: "Note", ...o }) };
test.after(() => { delete global.LOCALE; delete global.Skeletons; });

test("no tour shell mounts a Skip control any more", () => {
  const fs = require("node:fs");
  for (const f of ["modules/desk/tutorial/skeleton/index.js", "builtins/window/tutorial/skeleton/index.js"]) {
    assert.doesNotMatch(fs.readFileSync(path.join(SRC, f), "utf8"), /toolkit\/skip/, f);
  }
  assert.equal(fs.existsSync(path.join(SRC, "modules/desk/tutorial/skeleton/toolkit/skip.js")), false);
});

test("desk host stamps data-live from a step's step-live", () => {
  const Module = require("node:module");
  const STUBS = {
    "./skin": {},
    "libs/tutorial-tours": { armed() {}, markSeen() {} },
    "./tours": {
      tour: () => ({ id: "workspace", flag: "workspace", steps: [{ kind: "tutorial_workspace", screens: 7, live_screens: 2 }] }),
      flaggedIds: () => [], stepChrome: () => ({ rail: null }),
    },
  };
  const load = Module._load;
  Module._load = function (r, p, m) {
    return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
  };
  global._a = { service: "service", content: "content" };
  global.LetcBox = class {
    constructor(m = {}) { this._m = { ...m }; }
    initialize() {}
    declareHandlers() {}
    mget(k) { return this._m[k]; }
  };
  try {
    const Desk = require(path.join(SRC, "modules/desk/tutorial/index.js"));
    const h = new Desk({ tour: "workspace" });
    h.initialize({});
    h.el = { dataset: {} };
    const trigger = { mget: () => null };
    h.onUiEvent(trigger, { service: "step-live", live: true });
    assert.equal(h.el.dataset.live, "1");
    h.onUiEvent(trigger, { service: "step-live", live: false });
    assert.equal(h.el.dataset.live, "0");
  } finally {
    Module._load = load;
    delete global._a; delete global.LetcBox;
  }
});
