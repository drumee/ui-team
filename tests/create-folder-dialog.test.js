// The folder window's create-folder card: drawn at 85% like the other create
// dialogs, and headed by a folder glyph in the window's own area colour.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const STUBS = {
  "media/grid/template/folder": (o) => `<svg class="folder ${o.area} ${o.filetype}" data-role="${o.role}"></svg>`,
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"), Element: node("Element"), EntryBox: node("EntryBox"),
  Button: { Svg: node("Button.Svg") },
};
global.LOCALE = {};
global._ = { uniqueId: (p) => `${p}1` };
global._a = { cross: "cross", text: "text", commit: "commit", folder: "folder", personal: "personal", area: "area" };

const dialog = require(path.join(SRC, "builtins/window/folder/skeleton/create-folder-dialog.js"));

test.after(() => {
  Module._load = load;
  for (const k of ["Skeletons", "LOCALE", "_", "_a"]) delete global[k];
});

const walk = (n, out = []) => {
  if (!n || typeof n !== "object") return out;
  out.push(n); (n.kids || []).forEach((k) => walk(k, out)); return out;
};
const P = "window-folder__create-folder";
const ui = (area) => ({ fig: { family: "window-folder" }, mget: (k) => (k === "area" ? area : undefined) });
const icoOf = (t) => walk(t).find((n) => n.className === `${P}-icon`);

test("the header leads with a folder glyph in the window's area", () => {
  const t = dialog(ui("private"));
  const header = walk(t).find((n) => n.className === `${P}-header`);
  const ico = icoOf(t);
  assert.ok(ico, "no folder icon");
  assert.equal(header.kids[0], ico, "icon is not the header's first item");
  assert.match(ico.content, /folder private folder/);
});

test("no area → the personal folder", () => {
  assert.match(icoOf(dialog(ui(undefined))).content, /folder personal folder/);
});

test("a host that is not the window passes the area explicitly (migrate tour)", () => {
  const t = dialog(ui(undefined), { prefix: P, area: "share" });
  assert.match(icoOf(t).content, /folder share folder/);
});

const css = sass
  .compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), { loadPaths: [SRC, path.join(SRC, "skin")] })
  .css.replace(/\s+/g, " ");

test("the card is drawn at 85%", () => {
  assert.match(css, /\.window-folder__create-folder-dialog \{[^}]*zoom: 0\.85;/);
});
