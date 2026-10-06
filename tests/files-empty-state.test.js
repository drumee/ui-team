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
