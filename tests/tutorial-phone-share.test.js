// Share tour, phone layout (Figma flow "share": 386:59700 → 386:61932).
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
  if (/^assets\//.test(r)) return "asset.png";
  if (/^libs\//.test(r) && !(r in ALIASES)) return load.call(this, path.join(SRC, r), p, m);
  return Object.prototype.hasOwnProperty.call(ALIASES, r) ? ALIASES[r] : load.call(this, r, p, m);
};
const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({}, { get: (_, k) => String(k) });
global._ = require("lodash");
const SCREENS = require(path.join(SRC, "modules/desk/tutorial/share/screens.js"));
const view = require(path.join(SRC, "modules/desk/tutorial/share/skeleton/phone.js"));
test.after(() => { Module._load = load; for (const k of ["Skeletons", "LOCALE", "_a", "_"]) delete global[k]; });

const ui = { fig: { family: "tutorial-share", group: "tutorial" }, mget: () => null };
const find = (t, pn) => {
  if (!t || typeof t !== "object") return null;
  if (t.sys_pn === pn) return t;
  for (const k of t.kids || []) { const r = find(k, pn); if (r) return r; }
  return null;
};

test("every share screen has a phone entry lighting its own block", () => {
  assert.equal(SCREENS.length, 6);
  for (const s of SCREENS) assert.equal(s.phone.target, s.lit);
});

for (const [i, s] of SCREENS.entries()) {
  test(`share phone screen ${i + 1}: the block exists in the full-page panel`, () => {
    const tree = view(ui, { lit: s.lit, subject: "folder", subject_data: { name: "Specs" } });
    assert.ok(find(tree, "sp-panel"));
    assert.ok(find(tree, s.phone.target), s.phone.target);
  });
}

test("the phone page has no tab bar (a full page, not a tab)", () => {
  const tree = view(ui, { lit: SCREENS[0].lit });
  assert.equal(find(tree, "ph-tab-files"), null);
});

test("index wires the phone skeleton, dashes and no Back", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/share/index.js"), "utf8");
  assert.match(src, /require\('\.\/screens'\)/);
  assert.match(src, /require\('\.\/skeleton\/phone'\)/);
  assert.match(src, /progressStyle: 'dashes'/);
});

test("phone skin: the panel fills the page, the lit block sits on white", () => {
  const sass = require("sass");
  const css = sass.compile(path.join(SRC, "modules/desk/tutorial/share/skin/index.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\.tutorial-phone \.tutorial-share__panel \{[^}]*width: 100%/);
  assert.match(css, /\[data-layout=phone\] \.tutorial-share__panel \.is-lit \{[^}]*background: #fff/);
});

test("share phone follows the Figma frames: title bar, card above after screen 1", () => {
  const S = require(path.join(__dirname, "..", "src/drumee/modules/desk/tutorial/share/screens.js"));
  assert.equal(S[0].phone.prefer, undefined);
  assert.ok(S.slice(1).every((s) => s.phone.prefer === "above" && s.phone.margin === 17));
  assert.ok(S.every((s) => s.phone.gap === 30));
  const sass = require("sass");
  const SRCD = path.join(__dirname, "..", "src/drumee");
  const css = sass.compile(path.join(SRCD, "modules/desk/tutorial/share/skin/index.scss"),
    { loadPaths: [SRCD, path.join(SRCD, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\.tutorial-share__head \{ display: none; \}/);
  assert.match(css, /\.is-lit \{[^}]*box-shadow: 0 0 0 16px #fff/);
  assert.match(css, /\.tutorial-share__phone\[data-view=share\] \{[^}]*background: #ccc/);
  assert.match(css, /\[data-blur="1"\]::before \{ background: rgba\(204, 204, 204, 0\.8\)/);
});

test("share phone page title reads Secure Share for every subject", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/share/skeleton/phone.js"), "utf8");
  assert.match(src, /ph\.titleBar\(ui, \{ title: LOCALE\.SECURE_SHARE \}\)/);
});
