// files-empty-state.test.js — the Files grid's onboarding empty state
// (Figma 920:123317) and the strings / assets it depends on.
//
//   node --test tests/files-empty-state.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const LANGS = ["en", "fr", "es", "ru", "zh", "km"];
const NEW_KEYS = [
  "FILES_EMPTY_ADD_SPREADSHEET", "FILES_EMPTY_ADD_SPREADSHEET_DESC",
  "FILES_EMPTY_ADD_DOCUMENT", "FILES_EMPTY_ADD_DOCUMENT_DESC",
  "FILES_EMPTY_ADD_PRESENTATION", "FILES_EMPTY_ADD_PRESENTATION_DESC",
  "FILES_EMPTY_UPLOAD", "FILES_EMPTY_UPLOAD_DESC",
  "FILES_EMPTY_GDRIVE_DESC", "FILES_EMPTY_START_SCRATCH",
  "CHAT_EMPTY_TITLE", "CHAT_EMPTY_TEXT",
];
const ASSETS = [
  "es-spreadsheet.svg", "es-document.svg", "es-presentation.svg", "es-upload.svg",
  "es-gdrive.png", "es-scratch.png", "chat-empty-back.svg", "chat-empty-front.svg",
];

test("every language carries every empty-state key, non-empty", () => {
  for (const lang of LANGS) {
    const table = require(`../locale/${lang}.json`);
    for (const k of NEW_KEYS) {
      assert.equal(typeof table[k], "string", `${lang}.${k} missing`);
      assert.ok(table[k].trim().length > 0, `${lang}.${k} empty`);
    }
  }
});

test("en copy is the Figma copy, verbatim", () => {
  const en = require("../locale/en.json");
  assert.equal(en.FILES_EMPTY_ADD_SPREADSHEET, "Add spreadsheet");
  assert.equal(en.FILES_EMPTY_ADD_PRESENTATION, "Add Presentation");
  assert.equal(en.FILES_EMPTY_START_SCRATCH, "Start from scratch");
  assert.equal(en.CHAT_EMPTY_TITLE, "Start discuss with your team now");
  assert.equal(en.CHAT_EMPTY_TEXT, "Share announcements and updates about company news, upcoming events,...");
});

test("assets are byte-identical to the Figma downloads", () => {
  const src = path.join(ROOT, "docs/superpowers/plans/2026-10-05-empty-states-assets");
  const dst = path.join(ROOT, "src/drumee/assets/empty-states");
  for (const f of ASSETS) {
    const a = fs.readFileSync(path.join(dst, f));
    assert.ok(a.length > 0, `${f} empty`);
    if (fs.existsSync(path.join(src, f))) {
      assert.ok(a.equals(fs.readFileSync(path.join(src, f))), `${f} differs from the Figma download`);
    }
  }
});

// ── skeleton ──────────────────────────────────────────────────────────────
const Module = require("node:module");
const _load = Module._load;
Module._load = function (request, ...rest) {
  // webpack alias: the module only needs the emitted URL, a string.
  if (request.startsWith("assets/")) return `/static/${request}`;
  return _load.call(this, request, ...rest);
};
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: (o, cls) => (typeof o === "string" ? { type: "Note", content: o, className: cls } : { type: "Note", ...o }),
  Element: node("Element"),
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._e = { upload: "upload" };

const FE = require("../src/drumee/builtins/window/skeleton/toolkit/files-empty-state");
const ui = { fig: { group: "window", family: "window-folder" } };
const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const byClass = (t, c) => walk(t).filter((n) => String(n.className || "").split(" ").includes(c));

test("root keeps no-content (centring + search hiding key on it)", () => {
  const s = FE.filesEmptyState(ui);
  assert.deepEqual(s.className.split(" ").sort(), ["no-content", "window__files-empty"]);
});

test("heading reuses the existing FILES_EMPTY_* copy", () => {
  const s = FE.filesEmptyState(ui);
  assert.equal(byClass(s, "window__files-empty-title")[0].content, en.FILES_EMPTY_TITLE);
  assert.equal(byClass(s, "window__files-empty-desc")[0].content, en.FILES_EMPTY_DESC);
});

test("six cards, Figma order, each wired to the + New service", () => {
  const cards = byClass(FE.filesEmptyState(ui), "window__files-empty-card");
  assert.deepEqual(cards.map((c) => c.dataset.card),
    ["spreadsheet", "document", "presentation", "upload", "gdrive", "scratch"]);
  assert.deepEqual(cards.map((c) => [c.service, c.name || null]), [
    ["new-document", "spreadsheet.xlsx"],
    ["new-document", "document.docx"],
    ["new-document", "presentation.pptx"],
    ["upload", null],
    ["launch-gdrive-migration", null],
    ["add-folder", null],
  ]);
  for (const c of cards) assert.deepEqual(c.uiHandler, [ui], `${c.dataset.card} uiHandler`);
});

test("everything inside a card is inactive so taps reach the card", () => {
  for (const c of byClass(FE.filesEmptyState(ui), "window__files-empty-card")) {
    const inner = walk(c.kids);
    assert.ok(inner.length > 0);
    for (const n of inner) assert.equal(n.active, 0, `${c.dataset.card}: ${n.className} is active`);
  }
});

test("icons are the Figma assets, decorative", () => {
  const imgs = byClass(FE.filesEmptyState(ui), "window__files-empty-img");
  assert.deepEqual(imgs.map((i) => i.attribute.src), [
    "/static/assets/empty-states/es-spreadsheet.svg",
    "/static/assets/empty-states/es-document.svg",
    "/static/assets/empty-states/es-presentation.svg",
    "/static/assets/empty-states/es-upload.svg",
    "/static/assets/empty-states/es-gdrive.png",
    "/static/assets/empty-states/es-scratch.png",
  ]);
  for (const i of imgs) { assert.equal(i.tagName, "img"); assert.equal(i.attribute.alt, ""); }
});

test("scratch card has a title and no description; the others have both", () => {
  for (const c of byClass(FE.filesEmptyState(ui), "window__files-empty-card")) {
    const descs = byClass(c, "window__files-empty-card-desc");
    assert.equal(descs.length, c.dataset.card === "scratch" ? 0 : 1, c.dataset.card);
    assert.equal(byClass(c, "window__files-empty-card-title").length, 1);
  }
});

test("filtered fallback carries the old plain copy", () => {
  const f = byClass(FE.filesEmptyState(ui), "window__files-empty-filtered");
  assert.equal(f.length, 1);
  assert.equal(f[0].content, en.NO_FOLDERS_OR_FILES_YET);
});

test("gridFilesBrowser uses the hero for window-folder only", () => {
  const src = fs.readFileSync(path.join(ROOT, "src/drumee/builtins/window/skeleton/toolkit/index.js"), "utf8");
  const fn = src.slice(src.indexOf("export function gridFilesBrowser"), src.indexOf("export function tooltips"));
  assert.match(fn, /evArgs:\s*ui\.fig\.family === "window-folder"\s*\?\s*filesEmptyState\(ui\)\s*:\s*Skeletons\.Note\(LOCALE\.NO_FOLDERS_OR_FILES_YET, "no-content"\)/);
  assert.match(src, /require\("\.\/files-empty-state"\)/);
});
