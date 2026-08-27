// `__handleContextmenu` decides, for every right-click in the app, whether the
// browser keeps its own menu or the owning window opens the app menu over it.
//
// The handler lives in the vendored SDK (`@drumee/ui-core`), patched in place by
// patch-package. It cannot be `require`d here: it is an addon module that
// mutates a Backbone prototype and reaches for app-level globals (`_`, `_a`,
// `Skeletons`, `drumeeDialog`) plus a webpack alias (`libs/is-text-entry`) that
// only exists inside the bundle. So it is read as source and instantiated with
// its free variables injected — the same extraction the folder/task tests use,
// pointed at node_modules instead of src.
//
// A side effect worth having: this file only passes when the patch is actually
// applied to the installed copy, which is the thing that ships.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const { isTextEntry } = require("../src/drumee/libs/is-text-entry");

const LETC = join(
  __dirname,
  "..",
  "node_modules/@drumee/ui-core/letc/addons/letc.js",
);

function handlerSource() {
  assert.ok(
    existsSync(LETC),
    "@drumee/ui-core is not installed — run `npm ci` so postinstall applies patches/",
  );
  const src = readFileSync(LETC, "utf8");
  const start = src.indexOf("View.prototype.__handleContextmenu = function (e) {");
  assert.notEqual(start, -1, "__handleContextmenu not found in the installed SDK");
  const end = src.indexOf("\n}\n", start);
  assert.notEqual(end, -1, "__handleContextmenu has no closing brace");
  return src.slice(start + "View.prototype.__handleContextmenu = ".length, end + 2);
}

// Every free name the handler closes over inside letc.js, injected rather than
// stubbed on `global` (see harness-hygiene.test.js).
function buildHandler(fed) {
  const menuFor = (p) => ({ menuFor: p.name });
  return new Function(
    "isTextEntry",
    "localStorage",
    "_a",
    "_",
    "drumeeDialog",
    "buildContextmenu",
    "window",
    `return (${handlerSource()});`,
  )(
    isTextEntry,
    { logLevel: 0 },
    { debug: "debug", ui: "ui", toggle: "toggle" },
    { isFunction: (f) => typeof f === "function" },
    {
      isDestroyed: () => false,
      feed: (kids) => fed.push(kids),
      children: {
        last: () => ({
          $el: { height: () => 10, width: () => 10 },
          el: { style: {} },
        }),
      },
    },
    menuFor,
    { innerHeight: 800, innerWidth: 1200 },
  );
}

// A view stand-in. `owner` is the ancestor carrying contextmenuSkeleton — the
// folder window, in the real tree.
function view(opt = {}) {
  const owner = opt.orphan
    ? null
    : { name: "window-folder", contextmenuSkeleton: () => [], mget: () => null };
  return {
    escapeContextmenu: opt.escapeContextmenu,
    forceContextmenu: opt.forceContextmenu,
    parent: owner,
    mget: (k) => (k === "escapeContextmenu" || k === "forceContextmenu" ? undefined : null),
    triggerMethod: () => {},
    getHandlers: () => [],
    debug: () => {},
  };
}

const el = (tagName, attrs = {}) => ({
  tagName,
  isContentEditable: attrs.isContentEditable || false,
  getAttribute: (k) => (attrs[k] == null ? null : attrs[k]),
});

function rightClick(target) {
  const calls = { preventDefault: 0, stopPropagation: 0, stopImmediatePropagation: 0 };
  return {
    calls,
    event: {
      target,
      pageX: 40,
      pageY: 60,
      shiftKey: false,
      ctrlKey: false,
      preventDefault: () => calls.preventDefault++,
      stopPropagation: () => calls.stopPropagation++,
      stopImmediatePropagation: () => calls.stopImmediatePropagation++,
    },
  };
}

test("a right-click on a text input never reaches preventDefault", () => {
  const fed = [];
  const handler = buildHandler(fed);
  const { calls, event } = rightClick(el("INPUT", { type: "text" }));

  const result = handler.call(view(), event);

  assert.equal(calls.preventDefault, 0, "the native menu must not be cancelled");
  assert.deepEqual(fed, [], "no app menu is built over an input");
  // The killer detail: `oncontextmenu` is a property-style handler, so a
  // returned `false` cancels the default just as preventDefault() would. The
  // early return must yield undefined.
  assert.notEqual(result, false, "returning false would cancel the native menu");
});

test("a text input still gets the propagation stops, like escapeContextmenu", () => {
  const fed = [];
  const { calls, event } = rightClick(el("TEXTAREA"));

  buildHandler(fed).call(view(), event);

  assert.equal(calls.stopPropagation, 1);
  assert.equal(calls.stopImmediatePropagation, 1);
});

test("contenteditable is treated as a text input", () => {
  const fed = [];
  const { calls, event } = rightClick(el("DIV", { isContentEditable: true }));

  buildHandler(fed).call(view(), event);

  assert.equal(calls.preventDefault, 0);
  assert.deepEqual(fed, []);
});

test("a plain element inside a window with contextmenuSkeleton still gets the app menu", () => {
  const fed = [];
  const { calls, event } = rightClick(el("DIV"));

  buildHandler(fed).call(view(), event);

  assert.equal(calls.preventDefault, 1, "the app menu suppresses the native one");
  assert.deepEqual(fed, [{ menuFor: "window-folder" }]);
});

test("a checkbox keeps the app menu", () => {
  const fed = [];
  const { calls, event } = rightClick(el("INPUT", { type: "checkbox" }));

  buildHandler(fed).call(view(), event);

  assert.equal(calls.preventDefault, 1);
  assert.deepEqual(fed, [{ menuFor: "window-folder" }]);
});

test("the kebab's synthetic event still builds its menu", () => {
  // Exactly what media/grid/index.js hands to el.oncontextmenu: a plain object
  // with the tile root as target and no-op event methods.
  const fed = [];
  const tile = el("DIV");
  const synthetic = {
    pageX: 120,
    pageY: 240,
    clientX: 120,
    clientY: 240,
    target: tile,
    shiftKey: false,
    ctrlKey: false,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  };

  buildHandler(fed).call(view(), synthetic);

  assert.deepEqual(fed, [{ menuFor: "window-folder" }], "kebab menu still opens");
});

test("a synthetic event with no target falls through to existing behaviour", () => {
  const fed = [];
  const synthetic = {
    pageX: 1,
    pageY: 2,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  };

  buildHandler(fed).call(view(), synthetic);

  assert.deepEqual(fed, [{ menuFor: "window-folder" }]);
});

test("escapeContextmenu on a Note behaves exactly as before", () => {
  const fed = [];
  const { calls, event } = rightClick(el("SECTION"));

  const result = buildHandler(fed).call(view({ escapeContextmenu: true }), event);

  assert.equal(calls.preventDefault, 0);
  assert.deepEqual(fed, []);
  assert.notEqual(result, false);
});

test("forceContextmenu reclaims the app menu on a text input", () => {
  const fed = [];
  const { calls, event } = rightClick(el("INPUT", { type: "text" }));

  buildHandler(fed).call(view({ forceContextmenu: true }), event);

  assert.equal(calls.preventDefault, 1);
  assert.deepEqual(fed, [{ menuFor: "window-folder" }]);
});

test("forceContextmenu is also read off the model, like escapeContextmenu", () => {
  const fed = [];
  const { calls, event } = rightClick(el("INPUT", { type: "text" }));
  const v = view();
  v.mget = (k) => (k === "forceContextmenu" ? true : null);

  buildHandler(fed).call(v, event);

  assert.equal(calls.preventDefault, 1);
  assert.deepEqual(fed, [{ menuFor: "window-folder" }]);
});

test("the Shift/Ctrl debug hatch still wins over the text-entry check", () => {
  // Ordering guard: the escape hatch is documented as the first thing that
  // runs, so a shift-right-click on an input must still dump to the console
  // rather than fall out through the new early return.
  const fed = [];
  const debugged = [];
  const handler = new Function(
    "isTextEntry",
    "localStorage",
    "_a",
    "_",
    "drumeeDialog",
    "buildContextmenu",
    "window",
    `return (${handlerSource()});`,
  )(
    isTextEntry,
    { logLevel: 3 },
    { debug: "debug", ui: "ui", toggle: "toggle" },
    { isFunction: (f) => typeof f === "function" },
    { isDestroyed: () => false, feed: (k) => fed.push(k), children: { last: () => ({ $el: { height: () => 1, width: () => 1 }, el: { style: {} } }) } },
    (p) => ({ menuFor: p.name }),
    { innerHeight: 800, innerWidth: 1200 },
  );

  const { event } = rightClick(el("INPUT", { type: "text" }));
  event.shiftKey = true;
  const v = view();
  v.debug = (...args) => debugged.push(args);
  v.mget = () => "skeleton.js";

  handler.call(v, event);

  assert.ok(debugged.length > 0, "the debug dump still runs");
  assert.deepEqual(fed, []);
});
