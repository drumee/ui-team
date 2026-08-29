// Widget methods must not shadow Marionette's CollectionView API.
//
// This exists because of a bug that cost a full day. The Personal Calendar
// rendered a completely blank panel: the widget mounted, its element was
// 810x1010, the fed skeleton tree was valid, `Kind.get('box')` resolved, the
// model landed in the collection — and Marionette built ZERO child views and
// showed its emptyView instead. No error, anywhere.
//
// The cause was a name. LetcBox extends Marionette's CollectionView, which
// already owns `getFilter()`. Marionette calls it internally and, when the
// result is a STRING, treats that string as a model-attribute name to filter
// children by:
//
//     _getFilter() { var viewFilter = this.getFilter(); ...
//       if (_.isString(viewFilter))
//         return view => view.model && view.model.get(viewFilter);
//
// The panel had defined getFilter() to return its own All/Task/Meeting toolbar
// state — "all" — so every child was filtered on model.get("all"), an
// attribute no skeleton node carries. The tree was fed and immediately
// filtered back out.
//
// Nothing about that is visible at the call site: the override looks like an
// ordinary accessor, the base class is three levels up, and filtering is
// normal operation rather than an error. Only a name check catches it, so
// this is a name check.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src/drumee");
const MARIONETTE = join(
  ROOT,
  "node_modules/backbone.marionette/lib/backbone.marionette.esm.js",
);

// ── the names Marionette's CollectionView actually owns ──────────────────────
//
// Read from the shipped bundle rather than hardcoded, so a Marionette upgrade
// that adds an API name is covered without anyone remembering to edit a list.
// Only the CollectionView block counts: `getView` for instance lives on
// Application, which no widget inherits, and flagging it would be noise.
function collectionViewApi() {
  const src = readFileSync(MARIONETTE, "utf8");
  const start = src.indexOf("var CollectionView = Backbone.View.extend({");
  assert.ok(start > 0, "CollectionView block not found — did Marionette move?");
  // The next top-level `var X = ` after it bounds the block.
  const rest = src.slice(start + 10);
  const endRel = rest.search(/\nvar [A-Za-z_$][\w$]* = /);
  const block = endRel === -1 ? rest : rest.slice(0, endRel);
  const names = new Set();
  for (const m of block.matchAll(/^\s{2}([a-zA-Z_$][\w$]*): function/gm)) {
    names.add(m[1]);
  }
  return names;
}

// Overriding these is the documented way to build a widget; they are contracts,
// not accidents.
const INTENTIONAL = new Set([
  // A JS language construct, not an override of Marionette's.
  "constructor",
  "initialize",
  "render",
  "destroy",
  "onRender",
  "onDestroy",
  "buildChildView",
  "childView",
  "childViewOptions",
  "emptyViewOptions",
]);

function jsFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) jsFiles(p, out);
    else if (e.endsWith(".js")) out.push(p);
  }
  return out;
}

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// A class-body method at two-space indent inside `class X extends <base> {`.
// Only widget classes matter — a plain helper class inherits nothing.
const WIDGET_BASES = /\b(LetcBox|DrumeeMFS|LetcList|LetcText)\b/;

function widgetMethods(file) {
  const raw = readFileSync(file, "utf8");
  if (!WIDGET_BASES.test(raw)) return [];
  const src = stripComments(raw);
  if (!/class\s+[\w$]+\s+extends\s+/.test(src)) return [];
  const found = [];
  for (const m of src.matchAll(/^ {2}(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\(/gm)) {
    found.push(m[1]);
  }
  return found;
}

test("no widget method shadows a Marionette CollectionView API name", () => {
  const api = collectionViewApi();
  // Sanity: if the parse silently yields nothing, the test would pass for the
  // wrong reason forever.
  assert.ok(api.size > 20, `parsed only ${api.size} CollectionView methods`);
  assert.ok(api.has("getFilter"), "getFilter should be in the parsed API");

  const offenders = [];
  for (const file of jsFiles(SRC)) {
    for (const name of widgetMethods(file)) {
      if (api.has(name) && !INTENTIONAL.has(name)) {
        offenders.push(`${file.slice(ROOT.length + 1)} :: ${name}()`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "These widget methods shadow Marionette CollectionView API names. " +
      "Marionette calls them internally, so the widget silently misbehaves — " +
      "getFilter() returning a string filters every child view away and the " +
      "widget renders its emptyView. Rename them (e.g. getFilter -> " +
      "getActiveFilter):\n  " + offenders.join("\n  "),
  );
});

test("the calendar's filter accessor is the renamed one, and is used", () => {
  const panel = join(SRC, "builtins/panel/calendar/index.js");
  const src = stripComments(readFileSync(panel, "utf8"));

  assert.match(
    src,
    /^ {2}getActiveFilter\(\)/m,
    "the calendar must expose getActiveFilter()",
  );
  assert.doesNotMatch(
    src,
    /^ {2}getFilter\(\)/m,
    "getFilter() is Marionette's — defining it blanks the whole panel",
  );

  // Every call site moved with it: a stale ui.getFilter() would resolve to
  // Marionette's own accessor and quietly return undefined instead of the
  // toolbar state, so the All/Task/Meeting selection would stop rendering.
  for (const f of ["skeleton/index.js", "skeleton/toolbar.js"]) {
    const s = stripComments(
      readFileSync(join(SRC, "builtins/panel/calendar", f), "utf8"),
    );
    assert.doesNotMatch(s, /ui\.getFilter\(\)/, `${f} still calls ui.getFilter()`);
  }
});
