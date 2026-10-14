// Migrate tour, phone layout (Figma flow "Files → Migrate").
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const SRC = path.join(__dirname, "..", "src/drumee");
const ALIASES = {
  "media/grid/template/folder": () => ({ type: "folderArt" }),
  "libs/billing": { planLabel: () => "Plan" },
  "libs/gdrive-sa-import": require(path.join(SRC, "libs/gdrive-sa-import.js")),
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(ALIASES, r) ? ALIASES[r] : load.call(this, r, p, m);
};
const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({}, { get: (_, k) => String(k) });
global._e = { upload: "upload" };
global._ = require("lodash");
const SCREENS = require(path.join(SRC, "modules/desk/tutorial/migrate/screens.js"));
const view = require(path.join(SRC, "modules/desk/tutorial/migrate/skeleton/phone.js"));
test.after(() => { Module._load = load; for (const k of ["Skeletons", "LOCALE", "_a", "_e", "_"]) delete global[k]; });

const ui = { fig: { family: "tutorial-migrate", group: "tutorial" }, mget: (k) => (k === "import_dest" ? { name: "Docs" } : null) };
const find = (t, pn) => {
  if (!t || typeof t !== "object") return null;
  if (t.sys_pn === pn) return t;
  for (const k of t.kids || []) { const r = find(k, pn); if (r) return r; }
  return null;
};
const all = (t, pred, out = []) => {
  if (!t || typeof t !== "object") return out;
  if (pred(t)) out.push(t);
  for (const k of t.kids || []) all(k, pred, out);
  return out;
};

test("every migrate screen has a phone entry", () => {
  assert.equal(SCREENS.length, 4);
  assert.ok(SCREENS.every((s) => s.phone && s.phone.target));
});

for (const [i, s] of SCREENS.entries()) {
  test(`migrate phone screen ${i + 1}: the target exists`, () => {
    assert.ok(find(view(ui, s, {}), s.phone.target), s.phone.target);
  });
}

test("pane: the FAB is live and opens the menu", () => {
  const fab = find(view(ui, SCREENS[0], {}), "ph-fab");
  assert.equal(fab.service, "mg-toggle-menu");
  assert.equal(fab.dataset.menu, "fab");
});

test("pane with the menu open: device upload, Google Drive, then the + New rows", () => {
  const tree = view(ui, SCREENS[0], { menuOpen: "fab" });
  const menu = find(tree, "ph-fab-menu");
  assert.ok(menu);
  const services = all(menu, (n) => n.service).map((n) => n.service);
  assert.deepEqual(services.slice(0, 2), ["mg-do-upload", "mg-open-dialog"]);
  assert.ok(services.slice(2).every((s) => s === "mg-do-create"));
  assert.equal(services.length, 6);
});

test("pane: the bottom row is the workspace tabs with Files lit", () => {
  const tree = view(ui, SCREENS[0], {});
  assert.equal(find(tree, "ph-tab-files").dataset.active, "1");
});

test("live skeleton accepts a pane override (the phone pane behind the sheet)", () => {
  const live = require(path.join(SRC, "modules/desk/tutorial/migrate/skeleton/live.js"));
  const tree = live(ui, { state: "idle" }, { name: "Docs" }, { pane: () => ({ sys_pn: "phone-pane" }) });
  assert.ok(find(tree, "phone-pane"));
});

test("index wires the phone skeleton", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/migrate/index.js"), "utf8");
  assert.match(src, /require\('\.\/screens'\)/);
  assert.match(src, /require\('\.\/skeleton\/phone'\)/);
});

test("phone skin turns the import dialog into a bottom sheet", () => {
  const sass = require("sass");
  const css = sass.compile(path.join(SRC, "modules/desk/tutorial/migrate/skin/index.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\[data-layout=phone\] \.tutorial-migrate__dialog \{[^}]*width: 100%/);
});

test("every locale has TUTORIAL_MIGRATE_FAB", () => {
  for (const l of ["en", "fr", "es", "ru", "zh", "km"]) {
    assert.ok(require(path.join(__dirname, "..", "locale", `${l}.json`)).TUTORIAL_MIGRATE_FAB, l);
  }
});
