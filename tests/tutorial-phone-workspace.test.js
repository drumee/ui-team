// Workspace tour, phone layout — Figma flow "org home -> create wp"
// (380:54433, 380:54800, 385:938, 385:1090, 385:1226, 385:1364, 385:54554).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const SRC = path.join(__dirname, "..", "src/drumee");
const ALIASES = {
  "media/grid/template/folder": () => ({ type: "folderArt" }),
  "libs/billing": { planLabel: () => "Plan" },
};
const load = Module._load;
Module._load = function (r, p, m) {
  if (/^assets\//.test(r)) return `asset:${r}`;
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
global.Visitor = { id: "u1", firstname: () => "Ann", lastname: () => "Lee" };
const SCREENS = require(path.join(SRC, "modules/desk/tutorial/workspace/screens.js"));
const view = require(path.join(SRC, "modules/desk/tutorial/workspace/skeleton/phone.js"));
test.after(() => {
  Module._load = load;
  for (const k of ["Skeletons", "LOCALE", "_a", "_K", "_", "Visitor"]) delete global[k];
});

const ui = { fig: { family: "tutorial-workspace", group: "tutorial" }, mget: () => null };
const find = (t, pn) => {
  if (!t || typeof t !== "object") return null;
  if (t.sys_pn === pn) return t;
  for (const k of t.kids || []) { const r = find(k, pn); if (r) return r; }
  return null;
};
const findClass = (t, cls) => {
  if (!t || typeof t !== "object") return null;
  if (typeof t.className === "string" && t.className.split(/\s+/).includes(cls)) return t;
  for (const k of t.kids || []) { const r = findClass(k, cls); if (r) return r; }
  return null;
};

test("every workspace screen has a phone entry", () => {
  assert.equal(SCREENS.length, 7);
  assert.ok(SCREENS.every((s) => s.phone && s.phone.view && s.phone.target));
});

for (const [i, s] of SCREENS.entries()) {
  if (s.phone.skip) continue;
  test(`workspace phone screen ${i + 1}: the target exists`, () => {
    const tree = view(ui, s, { selected: "internal", created: { type: "team", hub_id: "h" } });
    assert.ok(find(tree, s.phone.target), s.phone.target);
  });
}

test("the desk's separate live form is skipped on a phone — the create screen IS the live form there", () => {
  assert.equal(SCREENS[5].phone.skip, true);
  assert.equal(SCREENS[4].phone.live, true);
  assert.equal(SCREENS[1].phone.live, true);
});

test("home: hero CTA, Search pill, FAB, mockup, no overlay", () => {
  const tree = view(ui, SCREENS[0], {});
  assert.equal(find(tree, "ph-cta").service, "next-step");
  assert.ok(find(tree, "ph-search"));
  assert.ok(find(tree, "ph-fab"));
  assert.equal(findClass(tree, "tutorial-phone__overlay"), null);
  assert.ok(findClass(tree, "tutorial-wsp__mockup"), "the phone mockup illustration");
});

test("sheet screens: overlay + the Figma sheet with all six blocks", () => {
  const tree = view(ui, SCREENS[1], { selected: "internal" });
  assert.ok(findClass(tree, "tutorial-phone__overlay"));
  const sheet = find(tree, "wsd-dialog");
  assert.ok(sheet);
  for (const pn of ["wsp-head", "wsp-org", "wsp-dept", "wsd-name", "wsd-type", "wsd-create"]) {
    assert.ok(find(sheet, pn), pn);
  }
  for (const k of ["internal", "external", "personal"]) assert.ok(find(sheet, `wsd-type-${k}`), k);
});

test("each sheet screen stamps which block it is about (drives the Figma opacities)", () => {
  const lit = (i) => find(view(ui, SCREENS[i], {}), "wsd-dialog").dataset.lit;
  assert.equal(lit(1), "name");
  assert.equal(lit(2), "internal");
  assert.equal(lit(3), "external");
  assert.equal(lit(4), "create");
});

test("live name screen: a real Entry under the part name the step reads", () => {
  const live = view(ui, SCREENS[1], { live: true, name: "Acme" });
  const entry = find(live, "wsd-name-input");
  assert.ok(entry, "live entry");
  assert.equal(entry.value, "Acme");
  const mock = view(ui, SCREENS[1], { live: false });
  assert.equal(find(mock, "wsd-name-input"), null, "mock draws a placeholder");
});

test("live create screen: rows pick a type, Create submits", () => {
  const tree = view(ui, SCREENS[4], { live: true, selected: "external" });
  assert.equal(find(tree, "wsd-type-external").service, "wsd-select-type");
  assert.equal(find(tree, "wsd-type-external").dataset.type, "external");
  assert.equal(find(tree, "wsd-type-external").dataset.on, "1");
  assert.equal(find(tree, "wsd-create").service, "wsd-create");
});

test("invite: the Figma sheet with the live email field, Send and Skip", () => {
  const tree = view(ui, SCREENS[6], { created: { type: "team", hub_id: "h" } });
  const card = find(tree, "inv-card");
  assert.ok(findClass(card, "tutorial-wsp__invite") || card.className.includes("tutorial-wsp__invite"));
  assert.ok(find(card, "inv-email"));
  assert.ok(find(card, "inv-error"));
  const services = [];
  (function walk(n) { if (n && typeof n === "object") { if (n.service) services.push(n.service); (n.kids || []).forEach(walk); } })(card);
  assert.deepEqual(services, ["inv-send", "inv-skip"]);
});

test("invite for a personal workspace: the centred modal with Invite later", () => {
  const tree = view(ui, SCREENS[6], { created: { type: "personal", hub_id: "h" } });
  const card = find(tree, "inv-card");
  assert.ok(card.className.includes("tutorial-wsp__modal"));
  assert.ok(findClass(tree, "tutorial-phone__overlay"));
});

test("index picks the phone skeleton and raises step-live", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/workspace/index.js"), "utf8");
  assert.match(src, /require\('\.\/skeleton\/phone'\)/);
  assert.match(src, /service: 'step-live'/);
  assert.match(src, /require\('\.\/screens'\)/);
});

test("every locale has the phone workspace copy", () => {
  for (const l of ["en", "fr", "es", "ru", "zh", "km"]) {
    const j = require(path.join(__dirname, "..", "locale", `${l}.json`));
    for (const k of ["WS_TYPE_PHONE_INTERNAL_DESC", "WS_TYPE_PHONE_EXTERNAL_DESC", "TUTORIAL_WS_IN_DEPARTMENT"]) {
      assert.ok(j[k], `${l} ${k}`);
    }
  }
});

test("home card has no top border", () => {
  const sass = require("sass");
  const css = sass.compile(path.join(SRC, "modules/desk/tutorial/workspace/skin/index.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\.tutorial-wsp__card \{[^}]*border-top: 0/);
});
