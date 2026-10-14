// Touch has no Escape: a visible Skip is the only way out of a tour there.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
global.LOCALE = { TUTORIAL_SKIP: "Skip tour" };
global.Skeletons = { Note: (o) => ({ type: "Note", ...o }) };
const skip = require(path.join(SRC, "modules/desk/tutorial/skeleton/toolkit/skip.js"));
test.after(() => { delete global.LOCALE; delete global.Skeletons; });

test("skip raises end-tour on the host", () => {
  const ui = { id: "host" };
  const n = skip(ui);
  assert.equal(n.service, "end-tour");
  assert.deepEqual(n.uiHandler, [ui]);
  assert.equal(n.content, "Skip tour");
});

const css = sass.compile(path.join(SRC, "modules/desk/tutorial/skin/index.scss"),
  { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");

test("skip is hidden by default", () => {
  assert.match(css, /\.tutorial-skip \{[^}]*display: none/);
});
test("skip is shown on touch", () => {
  assert.match(css, /\[data-touch="1"\] \.tutorial-skip \{[^}]*display: flex/);
});
test("skip is hidden while a live screen is up", () => {
  assert.match(css, /\[data-live="1"\] \.tutorial-skip \{[^}]*display: none/);
});

test("both shells mount the skip control", () => {
  const fs = require("node:fs");
  for (const f of ["modules/desk/tutorial/skeleton/index.js", "builtins/window/tutorial/skeleton/index.js"]) {
    assert.match(fs.readFileSync(path.join(SRC, f), "utf8"), /toolkit\/skip'\)\(ui\)/, f);
  }
});

test("every locale has TUTORIAL_SKIP", () => {
  for (const l of ["en", "fr", "es", "ru", "zh", "km"]) {
    const j = require(path.join(__dirname, "..", "locale", `${l}.json`));
    assert.ok(j.TUTORIAL_SKIP, l);
  }
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
