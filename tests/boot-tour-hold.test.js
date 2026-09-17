// A refresh by a user who has not finished the migrate tour shows the tour, not
// the restored workspace pane first.
//
// The desk hides the headless layer from before the restore
// (`data-boot-tour-hold`) until the tour is on screen, and releases it on every
// other way out. Methods are cut out of the SOURCE FILE and run against a fake
// `this`, as tests/rail-logo-home.test.js does.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const DESK = resolve(__dirname, "../src/drumee/modules/desk/index.js");
const SKIN = resolve(__dirname, "../src/drumee/modules/desk/skin/index.scss");
const src = readFileSync(DESK, "utf8");

function grab(name) {
  const re = new RegExp(`\\n  (async )?${name}\\(`);
  const m = re.exec(src);
  assert.ok(m, `${name} not found`);
  const start = m.index + 1;
  const end = src.indexOf("\n  }\n", start) + 4;
  return src.slice(start, end);
}

function build(names, scope) {
  const keys = Object.keys(scope);
  const body = `return { ${names.map(grab).join(",\n")} };`;
  return new Function(...keys, body)(...keys.map((k) => scope[k]));
}

function scope({ offerable = true, intent = false, urlTour = undefined } = {}) {
  const done = [];
  const Tours = {
    offerable: () => offerable,
    whenDone: (id, cb) => done.push([id, cb]),
  };
  const modules = {
    "libs/tutorial-tours": Tours,
    "libs/window-tutorial-intent": { has: () => intent },
  };
  return {
    done,
    scope: {
      require: (m) => modules[m],
      Visitor: { parseModuleArgs: () => ({ tutorial: urlTour }) },
      BOOT_TOUR_HOLD_MAX: 20000,
      setTimeout: (f, ms) => setTimeout(f, ms).unref(),
      clearTimeout,
    },
  };
}

const METHODS = ["_holdBootTourPane", "_releaseBootTourHold", "_maybeRunBootTour"];

function desk(opts, raise) {
  const { scope: sc, done } = scope(opts);
  const d = build(METHODS, sc);
  d.el = { dataset: {} };
  d._raiseBootTour = raise || (async () => true);
  return { d, done };
}

test("holds the pane when the migrate tour is still to come", () => {
  const { d } = desk();
  d._holdBootTourPane();
  assert.equal(d.el.dataset.bootTourHold, "1");
  d._releaseBootTourHold();
  assert.equal(d.el.dataset.bootTourHold, undefined);
});

test("no hold when the tour would not run", () => {
  for (const opts of [{ offerable: false }, { intent: true }, { urlTour: "full" }]) {
    const { d } = desk(opts);
    d._holdBootTourPane();
    assert.equal(d.el.dataset.bootTourHold, undefined, JSON.stringify(opts));
  }
  const { d } = desk();
  d._postOnboardingTutorial = true;
  d._holdBootTourPane();
  assert.equal(d.el.dataset.bootTourHold, undefined);
});

test("a declined boot tour shows the pane at once", async () => {
  const { d } = desk({}, async () => false);
  d._holdBootTourPane();
  assert.equal(await d._maybeRunBootTour(), false);
  assert.equal(d.el.dataset.bootTourHold, undefined);
});

test("a throw in the boot tour still shows the pane", async () => {
  const { d } = desk({}, async () => { throw new Error("x"); });
  d._holdBootTourPane();
  await assert.rejects(d._maybeRunBootTour());
  assert.equal(d.el.dataset.bootTourHold, undefined);
});

test("a raised tour keeps the pane hidden until its claim is released", async () => {
  const { d, done } = desk();
  d._holdBootTourPane();
  assert.equal(await d._maybeRunBootTour(), true);
  assert.equal(d.el.dataset.bootTourHold, "1");
  assert.equal(done.length, 1);
  assert.equal(done[0][0], "migrate");
  done[0][1]();
  assert.equal(d.el.dataset.bootTourHold, undefined);
});

test("wired: before the restore feed, on the tour mount, on navigation, and in the skin", () => {
  const load = grab("loadDefault");
  const hold = load.indexOf("this._holdBootTourPane()");
  assert.ok(hold > 0, "loadDefault never holds");
  assert.ok(hold < load.indexOf('this.feed(require("./skeleton")(this))'), "hold after the feed");
  assert.ok(hold < load.indexOf("this._restoreDeskState()"));

  assert.match(grab("_navigated"), /this\._releaseBootTourHold\(\)/);

  const part = src.slice(src.indexOf('      case "window-tutorial": {'));
  const caseBody = part.slice(0, part.indexOf("        return;"));
  assert.match(caseBody, /_releaseBootTourHold/);

  const skin = readFileSync(SKIN, "utf8");
  const rule = skin.slice(skin.indexOf('.desk-module[data-boot-tour-hold="1"] .window-manager__layer.headless {'));
  assert.ok(rule.length < skin.length, "skin rule missing");
  const block = rule.slice(0, rule.indexOf("}"));
  assert.match(block, /visibility:\s*hidden/);
  assert.match(block, /opacity:\s*0/);
});
