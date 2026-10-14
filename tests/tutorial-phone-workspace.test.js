// Workspace tour, phone layout (Figma flow "org home -> create wp").
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const SRC = path.join(__dirname, "..", "src/drumee");
const Module = require("node:module");
const ALIASES = {
  "media/grid/template/folder": () => ({ type: "folderArt" }),
  "libs/billing": { planLabel: () => "Plan" },
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(ALIASES, r) ? ALIASES[r] : load.call(this, r, p, m);
};

// Any Skeletons.X.Y(...) builds {type, ...opt}.
const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({}, { get: (_, k) => String(k) });
global._K = { privilege: { write: 4 } };
global._ = require("lodash");
const SCREENS = require(path.join(SRC, "modules/desk/tutorial/workspace/screens.js"));
const view = require(path.join(SRC, "modules/desk/tutorial/workspace/skeleton/phone.js"));
test.after(() => { Module._load = load; for (const k of ["Skeletons", "LOCALE", "_a", "_K", "_"]) delete global[k]; });

const ui = { fig: { family: "tutorial-workspace", group: "tutorial" }, mget: () => null };
const find = (t, pn) => {
  if (!t || typeof t !== "object") return null;
  if (t.sys_pn === pn) return t;
  for (const k of t.kids || []) { const r = find(k, pn); if (r) return r; }
  return null;
};

test("every workspace screen has a phone entry", () => {
  assert.equal(SCREENS.length, 7);
  assert.ok(SCREENS.every((s) => s.phone && s.phone.view && s.phone.target));
});

for (const [i, s] of SCREENS.entries()) {
  test(`workspace phone screen ${i + 1}: the target exists`, () => {
    const tree = view(ui, s, { selected: "internal", created: { type: "team", hub_id: "h" } });
    assert.ok(find(tree, s.phone.target), s.phone.target);
  });
}

test("home is the phone hero with the pre-workspace search pill", () => {
  const tree = view(ui, SCREENS[0], {});
  assert.equal(find(tree, "ph-cta").service, "next-step");
  assert.ok(find(tree, "ph-search"));
});

test("dialog screens put the real dialog in a bottom sheet", () => {
  const tree = view(ui, SCREENS[1], { selected: "internal" });
  const sheet = find(tree, "ph-sheet");
  assert.ok(sheet);
  assert.ok(find(sheet, "wsd-dialog"));
  // The live form (screen 6) is the real one: its name field is the part the
  // step reads on Create, so it must survive the move into the sheet.
  const live = find(view(ui, SCREENS[5], { selected: "internal" }), "ph-sheet");
  assert.ok(find(live, "wsd-name-input"), "the live name field survives");
});

test("index picks the phone skeleton and raises step-live", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/workspace/index.js"), "utf8");
  assert.match(src, /require\('\.\/skeleton\/phone'\)/);
  assert.match(src, /service: 'step-live'/);
  assert.match(src, /require\('\.\/screens'\)/);
});

test("phone skin unboxes the desktop dialog inside the sheet", () => {
  const sass = require("sass");
  const css = sass.compile(path.join(SRC, "modules/desk/tutorial/workspace/skin/index.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\.tutorial-phone__sheet \.tutorial-workspace__wsd-dialog \{[^}]*width: 100%/);
});
