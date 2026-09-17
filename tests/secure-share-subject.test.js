// The secure-share panel names what is being shared at the top of "Recipients
// mode" (builtins/window/secure-share/skeleton/subject.js): a file gets its
// type glyph in a box, a folder the plain folder shape, a workspace the folder
// shape with its area emblem.
//
// The skeleton is required as shipped, with the real folder template and the
// real glyph map behind it; only the webpack aliases are resolved by hand.
const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "../src/drumee");
const SUBJECT = resolve(ROOT, "builtins/window/secure-share/skeleton/subject.js");
const ALIASES = {
  "media/grid/template/folder": resolve(ROOT, "builtins/media/grid/template/folder/index.js"),
  "libs/file-meta": resolve(ROOT, "libs/file-meta.js"),
};

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  if (ALIASES[req]) return ALIASES[req];
  return origResolve.call(this, req, parent, ...rest);
};
global._ = require("underscore");
global._a = new Proxy({}, { get: (_t, k) => k });
global.Visitor = { inDmz: 0 };
const node = (kind) => (props = {}) => ({ __kind: kind, ...props });
global.Skeletons = {
  Box: { X: node("box.x"), Y: node("box.y") },
  Note: node("note"),
  Element: node("element"),
  Image: { Svg: node("image.svg") },
};
const subject = require(SUBJECT);
Module._resolveFilename = origResolve;

function ui(attrs) {
  return { fig: { family: "window-secure-share" }, mget: (k) => attrs[k] };
}

test("file: type glyph in a box, then the name", () => {
  const row = subject(ui({
    subject: "file",
    subject_data: { name: "spec_v2.docx", filetype: "document", ext: "docx", area: "private" },
  }));
  assert.strictEqual(row.className, "window-secure-share__subject");
  assert.deepStrictEqual(row.dataset, { subject: "file" });
  const [icon, name] = row.kids;
  assert.strictEqual(icon.className, "window-secure-share__subject-ico");
  assert.strictEqual(icon.kids[0].ico, "app-doc-file");
  assert.strictEqual(name.content, "spec_v2.docx");
});

test("image: picture mark, by filetype or by extension", () => {
  const byType = subject(ui({ subject: "file", subject_data: { name: "a", filetype: "image" } }));
  const byExt = subject(ui({ subject: "file", subject_data: { name: "b.JPG", filetype: "", ext: "JPG" } }));
  assert.strictEqual(byType.kids[0].className, "window-secure-share__subject-ico");
  assert.strictEqual(byType.kids[0].kids[0].ico, "bg-image");
  assert.strictEqual(byExt.kids[0].kids[0].ico, "bg-image");
});

test("folder: area-tinted folder shape, no workspace emblem", () => {
  const row = subject(ui({
    subject: "folder",
    subject_data: { name: "Contracts", filetype: "folder", area: "private" },
  }));
  const [art, name] = row.kids;
  assert.strictEqual(art.className, "window-secure-share__subject-art");
  assert.match(art.content, /class="folder-shape private"/);
  assert.doesNotMatch(art.content, /badge/);
  assert.doesNotMatch(art.content, /folder-trigger/, "no kebab");
  assert.strictEqual(name.content, "Contracts");
});

test("workspace: folder shape with its area emblem", () => {
  const row = subject(ui({
    subject: "workspace",
    subject_data: { name: "Acme external", filetype: "hub", area: "share" },
  }));
  const [art, name] = row.kids;
  assert.deepStrictEqual(row.dataset, { subject: "workspace" });
  assert.match(art.content, /class="folder-shape share"/);
  assert.match(art.content, /badge/);
  assert.strictEqual(name.content, "Acme external");
});

test("no subject passed: derived from filetype", () => {
  const hub = subject(ui({ filetype: "hub", filename: "WS" }));
  const folder = subject(ui({ filetype: "folder", filename: "F" }));
  const file = subject(ui({ filetype: "image", filename: "a.png" }));
  assert.strictEqual(hub.dataset.subject, "workspace");
  assert.strictEqual(folder.dataset.subject, "folder");
  assert.strictEqual(file.dataset.subject, "file");
});

test("no name: no row", () => {
  assert.strictEqual(subject(ui({ subject: "file", subject_data: {} })), null);
});
