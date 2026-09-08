// Render the REAL mobile-sheet builders into a descriptor tree.
//
// Same reason render-desk-sidebar.js exists: the create sheet's rows are
// privilege-gated and carry their target service as a model field, so a
// hand-built fixture cannot see a row that was silently dropped or one that
// lost its goTarget.
const Module = require("node:module");

const node = (kind) => (props = {}) => ({ __kind: kind, ...props });

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
  const restoreGlobals = installGlobals();
  const restoreResolver = installResolver();
  try {
    const p = require.resolve("../../src/drumee/modules/desk/skeleton/mobile-sheets.js");
    const items = require.resolve("../../src/drumee/modules/desk/skeleton/create-items.js");
    delete require.cache[p];
    delete require.cache[items];
    const tree = require(p)[sheet](UI, ...args);
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

module.exports = { render, walk, find, findAll, hasClass, goTargetsIn, labelsIn };
