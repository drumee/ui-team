// The migrate tour's (mock) import dialog names the workspace the tour is laid
// over, not a fixture — the card the user is taught is the card they get.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const STUBS = {
  "media/grid/template/folder": (o) => `<svg class="folder ${o.area} ${o.filetype} ${o.role}"></svg>`,
  "../../skeleton/toolkit/files": { filesPane: () => ({ type: "pane" }) },
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Element: node("Element"),
  Image: { Svg: node("Image.Svg") },
};
global.LOCALE = { MY_HOME: "My home", DESTINATION: "Destination" };
global._ = { uniqueId: (p) => `${p}1` };
global._a = { hub: "hub", folder: "folder", personal: "personal" };

const skeleton = require(path.join(SRC, "modules/desk/tutorial/migrate/skeleton/index.js"));

test.after(() => {
  Module._load = load;
  for (const k of ["Skeletons", "LOCALE", "_", "_a"]) delete global[k];
});

const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const ui = (model = {}) => ({ fig: { family: "tutorial-migrate" }, mget: (k) => model[k] });
const destOf = (tree) => walk(tree).find((n) => /__destination\b/.test(n.className || ""));
const icoOf = (tree) => walk(tree).find((n) => /__dest-ico\b/.test(n.className || ""));

test("dialog screens name the workspace the tour is over", () => {
  const dest = { hub_id: "h", nid: "n", name: "Team docs", area: "private", filetype: "hub" };
  const t = skeleton(ui({ import_dest: dest }), { dialog: true }, {});
  assert.equal(destOf(t).content, "Team docs");
  assert.match(icoOf(t).content, /private hub desk/);
});

test("a sub-folder destination draws a plain folder", () => {
  const dest = { hub_id: "h", nid: "n", name: "Invoices", area: "private", filetype: "folder" };
  const t = skeleton(ui({ import_dest: dest }), { dialog: true }, {});
  assert.equal(destOf(t).content, "Invoices");
  assert.match(icoOf(t).content, /private folder "?/);
  assert.doesNotMatch(icoOf(t).content, /desk/);
});

test("no window (desk-level run) keeps the example destination", () => {
  const t = skeleton(ui({}), { dialog: true }, {});
  assert.equal(destOf(t).content, "My home");
});
