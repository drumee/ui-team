// Render the REAL desk sidebar skeleton into a descriptor tree.
//
// Same reason render-skeleton.js exists for the tasks panel: the drawer's three
// modes are picked by a `data-mode` attribute against slots the skeleton emits,
// so a hand-built fixture cannot see a slot that was never rendered or a row
// that lost its service.
//
// Unlike that helper this one cannot lean on alias-stub for everything. The
// sidebar asks `libs/over-limit` whether the org is locked and `libs/billing`
// whether the plan can be upgraded, and alias-stub answers every call with `{}`
// — truthy — which would silently drop the very rows under test. Both get real
// stubs whose answers the caller sets.
const Module = require("node:module");
const path = require("node:path");

const node = (kind) => (props = {}) => ({ __kind: kind, ...props });

// Set by installResolver's stubs; the caller drives them through render(opt).
const state = { locked: false, canUpgrade: true };

function installGlobals() {
  const saved = {};
  const set = (k, v) => {
    saved[k] = global[k];
    global[k] = v;
  };

  const Box = node("box");
  set("Skeletons", {
    Box: Object.assign(node("box"), { X: Box, Y: Box, Z: Box, G: Box }),
    Note: node("note"),
    Element: node("element"),
    Button: { Svg: node("button.svg"), Label: node("button.label") },
    Image: { Svg: node("image.svg") },
    UserProfile: node("profile"),
    Menu: node("menu"),
  });
  // Keys echo back as their own name, so a missing translation is visible
  // rather than blank — and `label` assertions can match on the key.
  set("LOCALE", new Proxy({}, { get: (_t, k) => String(k) }));
  set("Organization", { name: () => "Acme" });
  set("Platform", { get: () => null });
  // The footer's Sign out row passes Butler.logout as its on_click.
  set("Butler", { logout: () => {}, say: () => {} });
  set("Visitor", {
    id: "me",
    get: () => "",
    firstname: () => "Me",
    isMobile: () => true,
    device: () => "mobile",
    domainCan: () => false,
  });
  set("_a", new Proxy({}, { get: (_t, k) => String(k) }));
  set("_e", new Proxy({}, { get: (_t, k) => String(k) }));
  set("_K", { permission: { admin_member: "admin_member" }, char: { empty: "" } });
  set("_", require("lodash"));

  // `"{0} Plan".format(...)` — a runtime extension the app installs and node
  // does not have. The footer calls it unconditionally.
  const savedFormat = String.prototype.format;
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...a) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (a[i] == null ? m : String(a[i])));
  };

  return () => {
    if (savedFormat === undefined) delete String.prototype.format;
    else String.prototype.format = savedFormat;
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete global[k];
      else global[k] = saved[k];
    }
  };
}

// webpack aliases `libs/...`, `media/...`, `assets/...`. The two libs whose
// ANSWER changes the markup get real stubs; the rest fall through to
// alias-stub.
function installResolver() {
  const orig = Module._resolveFilename;
  const OVER_LIMIT = path.join(__dirname, "over-limit-stub.js");
  const BILLING = path.join(__dirname, "billing-stub.js");
  Module._resolveFilename = function (request, ...rest) {
    if (request === "libs/over-limit") return OVER_LIMIT;
    if (request === "libs/billing") return BILLING;
    if (/^media\//.test(request) || /^libs\//.test(request) || /^assets\//.test(request)) {
      return require.resolve("./alias-stub.js");
    }
    return orig.call(this, request, ...rest);
  };
  return () => {
    Module._resolveFilename = orig;
  };
}

// `ui` is the desk module. The sidebar reads its BEM family off fig.family and
// asks it for the current-workspace write privilege.
function makeUi(over = {}) {
  return {
    fig: { family: "desk-module" },
    mget: () => null,
    _curWorkspaceCanWrite: () => true,
    ...over,
  };
}

function render(over = {}, opt = {}) {
  state.locked = !!opt.locked;
  state.canUpgrade = opt.canUpgrade !== false;
  const restoreGlobals = installGlobals();
  const restoreResolver = installResolver();
  try {
    const p = require.resolve("../../src/drumee/modules/desk/skeleton/sidebar.js");
    // The create-items list and the sidebar itself both close over LOCALE at
    // require time, so both have to be re-required under these globals.
    const items = require.resolve("../../src/drumee/modules/desk/skeleton/create-items.js");
    delete require.cache[p];
    delete require.cache[items];
    return require(p)(makeUi(over));
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

// Every service reachable inside `n`, in render order.
const servicesIn = (n) => [...walk(n)].map((k) => k.service).filter(Boolean);

// The visible label of a row: its Note descendant's content.
const labelsIn = (n) =>
  [...walk(n)]
    .filter((k) => k.__kind === "note" && k.content)
    .map((k) => String(k.content));

module.exports = { render, walk, find, findAll, hasClass, servicesIn, labelsIn, state };
