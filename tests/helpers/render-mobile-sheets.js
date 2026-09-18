// Render the REAL mobile-sheet builders into a descriptor tree.
//
// Same reason render-desk-sidebar.js exists: the create sheet's rows are
// privilege-gated and carry their target service as a model field, so a
// hand-built fixture cannot see a row that was silently dropped or one that
// lost its goTarget.
const Module = require("node:module");

/**
 * What ui-core's skeleton builder does to a box's children before they render
 * (toolkit/builder.js): every DIRECT kid is merged with the parent's `kidsOpt`,
 * and the parent's value WINS — `_.merge(kid, kidsOpt)` there, so a kid cannot
 * hold its own `active` against it.
 *
 * Modelled here because `kidsOpt: { active: 0 }` is not decoration: a widget
 * whose model carries `active: 0` returns on the first line of
 * `View.prototype.triggerHandlers` (letc/addons/letc.js), so it raises NOTHING
 * when tapped. A harness that kept the descriptors verbatim showed a row with
 * its `service` and its `goTarget` intact and could not tell that the row was
 * inert — which is exactly how a dead workspace list passed a suite of
 * descriptor assertions.
 *
 * One level per box, like the real thing: each widget applies its OWN kidsOpt
 * to its OWN kids as it renders, so this is not recursive — it runs again for
 * each nested box as that box is built.
 */
const applyKidsOpt = (props) => {
  const opt = props && props.kidsOpt;
  if (opt && typeof opt === "object" && Array.isArray(props.kids)) {
    for (const kid of props.kids) {
      if (kid && typeof kid === "object") Object.assign(kid, opt);
    }
  }
  return props;
};

const node = (kind) => (props = {}) => ({ __kind: kind, ...applyKidsOpt(props) });

/**
 * Image.Svg / Button.Svg as ui-core really builds them.
 *
 * Their shared builder (toolkit/builder/button/svg.js) RENAMES the prop:
 *
 *   if (this.props.ico) { this.props.chartId = this.props.ico;
 *                         delete this.props.ico; }
 *
 * so a descriptor built by that factory carries `chartId` and has no `ico` at
 * all. Modelled here because code that READS BACK a descriptor someone else
 * built — `_mobileWorkspaceActions` lifting the glyph off a shared contextmenu
 * row — sees `chartId`, and a harness that kept `ico` verbatim reported icons
 * that the real app never had. That is exactly how the sheet shipped action
 * rows with no glyphs while a probe said they were fine.
 */
const svgNode = (kind) => (props = {}) => {
  const p = { ...applyKidsOpt(props) };
  if (p.ico) {
    p.chartId = p.ico;
    delete p.ico;
  }
  return { __kind: kind, ...p };
};

function installGlobals() {
  const saved = {};
  const set = (k, v) => {
    saved[k] = global[k];
    global[k] = v;
  };

  // `flow` is what ui-core stamps as data-flow, and it is the only thing that
  // tells a Box.X from a Box.Y — the descriptor is otherwise identical. Carried
  // here for the same reason render-skeleton.js carries it: a harness that
  // renders these descriptors gets `display:flex` and its direction from
  // `.box[data-flow]` (skin/lib/container.scss), so a box without it stacks its
  // children the wrong way and any `flex: 1` child collapses.
  const boxNode = (flow) => (props = {}) => ({
    __kind: "box",
    __flow: flow,
    ...applyKidsOpt(props),
  });
  set("Skeletons", {
    Box: Object.assign(boxNode("y"), {
      X: boxNode("x"),
      Y: boxNode("y"),
      Z: boxNode("y"),
      G: boxNode("y"),
    }),
    Note: node("note"),
    Element: node("element"),
    Button: { Svg: svgNode("button.svg"), Label: node("button.label") },
    Image: { Svg: svgNode("image.svg") },
    UserProfile: node("profile"),
  });
  // Keys echo back as their own name, so a missing translation is visible
  // rather than blank — and `label` assertions can match on the key.
  set("LOCALE", new Proxy({}, { get: (_t, k) => String(k) }));
  set("Organization", { name: () => "Acme" });
  set("Visitor", {
    id: "me",
    firstname: () => "Me",
    lastname: () => "",
    fullname: () => "Me",
  });
  set("_a", new Proxy({}, { get: (_t, k) => String(k) }));
  set("_e", new Proxy({}, { get: (_t, k) => String(k) }));
  set("_", require("lodash"));

  return () => {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete global[k];
      else global[k] = saved[k];
    }
  };
}

// webpack aliases. The sheets pull the folder-art template (media/) and the
// mute cache (builtins/) — neither answer changes the rows under test, so the
// generic alias-stub (every call answers {}) is enough for both.
function installResolver() {
  const orig = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (/^(media|libs|assets|builtins)\//.test(request)) {
      return require.resolve("./alias-stub.js");
    }
    return orig.call(this, request, ...rest);
  };
  return () => {
    Module._resolveFilename = orig;
  };
}

const UI = { fig: { family: "desk-module" } };

// sheet: "workspaceSheet" | "gotoSheet" | "accountSheet" | "newSheet";
// args are passed through after `ui`.
function render(sheet, ...args) {
  return renderWith({}, sheet, ...args);
}

/**
 * As `render`, with extra members on the `ui` the builder is handed.
 *
 * workspaceSheet is the one sheet that calls back into the desk —
 * `ui._workspaceKey(row)` decides which row is the open workspace, for both the
 * header and the rows' tick — so rendering it needs more than `fig`. The caller
 * supplies that method (lifted from desk/index.js, so the test runs the shipped
 * one) rather than this file carrying a copy that could drift from it.
 */
function renderWith(extra, sheet, ...args) {
  const restoreGlobals = installGlobals();
  const restoreResolver = installResolver();
  try {
    const p = require.resolve("../../src/drumee/modules/desk/skeleton/mobile-sheets.js");
    const items = require.resolve("../../src/drumee/modules/desk/skeleton/create-items.js");
    delete require.cache[p];
    delete require.cache[items];
    const tree = require(p)[sheet]({ ...UI, ...extra }, ...args);
    return { __kind: "box", kids: tree };
  } finally {
    restoreResolver();
    restoreGlobals();
  }
}

function* walk(n) {
  if (!n || typeof n !== "object") return;
  yield n;
  for (const k of [].concat(n.kids || [])) yield* walk(k);
}

const hasClass = (n, cls) =>
  typeof n.className === "string" && n.className.split(/\s+/).includes(cls);

function find(tree, cls) {
  for (const n of walk(tree)) if (hasClass(n, cls)) return n;
  return null;
}

function findAll(tree, cls) {
  const out = [];
  for (const n of walk(tree)) if (hasClass(n, cls)) out.push(n);
  return out;
}

// Every sheet row re-dispatches through "mobile-sheet-go"; the REAL service
// travels as goTarget. This is the sheet-side analogue of servicesIn.
const goTargetsIn = (n) =>
  [...walk(n)].map((k) => k.goTarget).filter(Boolean);

const labelsIn = (n) =>
  [...walk(n)]
    .filter((k) => k.__kind === "note" && k.content)
    .map((k) => String(k.content));

module.exports = {
  render,
  renderWith,
  walk,
  find,
  findAll,
  hasClass,
  goTargetsIn,
  labelsIn,
};
