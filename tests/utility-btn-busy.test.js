// Topbar utility icons (bell / calendar / inbox / contacts / trash / admin
// console) show a spinner on the pressed icon and disable the others until the
// screen behind it is up.
//
// The desk class needs the whole runtime to instantiate, so — as
// tests/rail-logo-home.test.js does — the methods are cut out of the SOURCE
// FILE and run against a fake `this` and fake elements.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const DESK = resolve(__dirname, "../src/drumee/modules/desk/index.js");
const src = readFileSync(DESK, "utf8");

function grab(name) {
  const start = src.indexOf(`  ${name}(`);
  assert.ok(start > 0, `${name} not found in ${DESK}`);
  const end = src.indexOf("\n  }\n", start) + 4;
  return src.slice(start, end);
}

function build(scope) {
  const keys = Object.keys(scope);
  const body = `return { ${["_isUtilityBtn", "_runUtilityBusy"].map(grab).join(",\n")} };`;
  return new Function(...keys, body)(...keys.map((k) => scope[k]));
}

function fakeDom() {
  const cluster = { dataset: {} };
  const btn = (cls = "desk-module-topbar__utility-btn") => ({
    dataset: {},
    classList: { contains: (c) => c === cls },
    closest: (sel) =>
      sel === ".desk-module-topbar__utility-cluster" ? cluster : null,
  });
  return { cluster, btn };
}

const tick = () => new Promise((r) => setImmediate(r));

function desk({ waitFor } = {}) {
  const waited = [];
  const scope = {
    _: { isFunction: (f) => typeof f === "function" },
    Kind: {
      waitFor: (k) => {
        waited.push(k);
        return waitFor ? waitFor(k) : Promise.resolve({});
      },
    },
    requestAnimationFrame: (f) => setImmediate(f),
    UTILITY_KINDS: { "toggle-trash": "panel_trash" },
    UTILITY_BUSY_MAX: 10000,
    setTimeout: (f, ms) => setTimeout(f, ms).unref(),
    clearTimeout,
  };
  return { d: build(scope), waited };
}

test("only a real utility button is intercepted", () => {
  const { d } = desk();
  const { btn } = fakeDom();
  assert.equal(d._isUtilityBtn({ el: btn() }), true);
  assert.equal(d._isUtilityBtn({ el: btn("other") }), false);
  // Synthetic dispatches (_deskServiceShim) carry no element.
  assert.equal(d._isUtilityBtn({ mget: () => null }), false);
});

test("spins the button and locks the cluster until the kind has loaded", async () => {
  let loadChunk;
  const chunk = new Promise((r) => (loadChunk = r));
  const { d, waited } = desk({ waitFor: () => chunk });
  const { cluster, btn } = fakeDom();
  const el = btn();
  const cmd = { el };
  let ran = 0;
  let inner;
  d._runUtilityBusy(cmd, "toggle-trash", () => {
    ran++;
    inner = d._utilityInner;
    return Promise.resolve();
  });

  assert.equal(ran, 1);
  assert.equal(inner, cmd, "the inner onUiEvent must see its own guard");
  assert.equal(d._utilityInner, null);
  assert.equal(el.dataset.loading, "1");
  assert.equal(cluster.dataset.busy, "1");

  await tick();
  await tick();
  assert.deepEqual(waited, ["panel_trash"]);
  assert.equal(el.dataset.loading, "1", "released before the chunk landed");

  loadChunk({});
  for (let i = 0; i < 6; i++) await tick();
  assert.equal(el.dataset.loading, undefined);
  assert.equal(cluster.dataset.busy, undefined);
});

test("a second press while busy does nothing", async () => {
  const { d } = desk();
  const { cluster, btn } = fakeDom();
  let ran = 0;
  const pending = new Promise(() => {});
  d._runUtilityBusy({ el: btn() }, "toggle-trash", () => (ran++, pending));
  d._runUtilityBusy({ el: btn() }, "toggle-inbox", () => (ran++, pending));
  assert.equal(ran, 1);
  assert.equal(cluster.dataset.busy, "1");
});

test("a failing or throwing service still releases", async () => {
  const { d } = desk();
  const { cluster, btn } = fakeDom();
  const el = btn();
  d._runUtilityBusy({ el }, "toggle-apps", () => Promise.reject(new Error("x")));
  for (let i = 0; i < 6; i++) await tick();
  assert.equal(el.dataset.loading, undefined);
  assert.equal(cluster.dataset.busy, undefined);

  const el2 = btn();
  assert.throws(() =>
    d._runUtilityBusy({ el: el2 }, "toggle-apps", () => {
      throw new Error("boom");
    }),
  );
  assert.equal(el2.dataset.loading, undefined);
  assert.equal(cluster.dataset.busy, undefined);
  assert.equal(d._utilityInner, null);
});

test("onUiEvent routes utility presses through _runUtilityBusy before the switch", () => {
  const body = src.slice(src.indexOf("  onUiEvent(cmd, args = {}) {"));
  const guard = body.indexOf("this._utilityInner !== cmd && this._isUtilityBtn(cmd)");
  assert.ok(guard > 0, "guard missing");
  assert.ok(guard < body.indexOf("switch (service)"));
  assert.ok(body.indexOf("pointerDragged") < guard);
});

// The bell leaves an in-window tour (e.g. migrate) running and shows the panel
// OVER it: no _endWindowTour in its case, and the skin lifts the right panel
// container above the tour overlay (50000) while the tour flag is up.
test("the bell keeps an in-window tour and its panel is lifted over it", () => {
  const start = src.indexOf('      case "toggle-activity":');
  assert.ok(start > 0);
  const body = src.slice(start, src.indexOf('      case "toggle-inbox":', start));
  assert.ok(!/this\._endWindowTour\(/.test(body), "the bell must not end the tour");

  const skin = readFileSync(
    resolve(__dirname, "../src/drumee/modules/desk/skin/index.scss"), "utf8");
  const tour = skin.slice(skin.indexOf('.desk-module[data-window-tour="1"] {'));
  const block = tour.slice(tour.indexOf(".desk-module__panel-container.right {"));
  const z = /z-index:\s*(\d+)/.exec(block);
  assert.ok(z && +z[1] > 50000 && +z[1] < 100002, "panel must sit above the tour and below the topbar");
});
