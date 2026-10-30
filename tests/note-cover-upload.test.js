// Add cover ▸ Upload file opens the computer's file picker (tester, 2026-10-30).
//
// Skeletons.FileSelector (ui-core) writes its own part name, "fileselector",
// over the sys_pn it is given. The cover popup named its input "cover-file",
// so `ensurePart("cover-file")` never resolved — Upload did nothing — and the
// `change` listener keyed on that name was never attached either: only paste
// could set a cover. These tests run page.js itself with its one dependency
// stubbed.
const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");
const PAGE = resolve(ROOT, "src/drumee/builtins/editor/blocknote/page.js");
const POPUP = resolve(ROOT, "src/drumee/builtins/editor/blocknote/skeleton/cover-popup.js");

const uploads = [];
function loadPage() {
  const orig = Module._load;
  Module._load = function (req, ...rest) {
    if (req === "@drumee/ui-essentials") {
      return {
        uploadFile(file, params) {
          uploads.push({ file, params });
          return { addEventListener() {} };
        },
      };
    }
    return orig.call(this, req, ...rest);
  };
  try {
    delete require.cache[PAGE];
    return require(PAGE);
  } finally {
    Module._load = orig;
  }
}

// An <input type=file> inside the FileSelector's wrapper <div>.
function fileSelectorPart() {
  const input = { tagName: "INPUT", value: "C:\\fakepath\\a.png", files: [], clicks: 0 };
  input.click = () => input.clicks++;
  const listeners = {};
  const el = {
    tagName: "DIV",
    querySelector: (sel) => (/input/.test(sel) ? input : null),
    addEventListener: (type, fn) => (listeners[type] = fn),
  };
  return { el, input, listeners, isDestroyed: () => false };
}

function fakeUi(extra = {}) {
  return {
    _saveTarget: () => ({ hub_id: "hub1", pid: "folder1", target: null }),
    _setStatus() {},
    warn() {},
    ensurePart: () => new Promise(() => {}), // never resolves, like a missing part
    ...extra,
  };
}

test("the popup's FileSelector carries no sys_pn of its own (ui-core overwrites it)", () => {
  global.LOCALE = new Proxy({}, { get: (_t, k) => String(k) });
  const seen = [];
  global.Skeletons = {
    Box: { Y: (o) => o },
    Note: (o) => o,
    Button: { Svg: (o) => o },
    FileSelector: (o) => (seen.push(o), o),
  };
  delete require.cache[POPUP];
  require(POPUP)({ fig: { family: "editor-blocknote" }, page: () => ({}) });
  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].sys_pn, undefined);
  assert.strictEqual(seen[0].accept, "image/*");
});

test("Upload file clicks the input at once, inside the user's click", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  const ui = fakeUi({ __fileselector: part });
  assert.strictEqual(page.onUiEvent(ui, {}, "pick-cover-file"), true);
  // Synchronous: a click() deferred past the gesture opens no picker.
  assert.strictEqual(part.input.clicks, 1);
});

test("Upload file falls back to the part once it is ready", async () => {
  const page = loadPage();
  const part = fileSelectorPart();
  let asked;
  const ui = fakeUi({ ensurePart: (pn) => ((asked = pn), Promise.resolve(part)) });
  page.onUiEvent(ui, {}, "pick-cover-file");
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(asked, "fileselector");
  assert.strictEqual(part.input.clicks, 1);
});

test("a stale part from a closed popup is not clicked", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  part.isDestroyed = () => true;
  let asked;
  const ui = fakeUi({ __fileselector: part, ensurePart: (pn) => ((asked = pn), new Promise(() => {})) });
  page.onUiEvent(ui, {}, "pick-cover-file");
  assert.strictEqual(part.input.clicks, 0);
  assert.strictEqual(asked, "fileselector");
});

test("picking an image uploads it next to the note, and the same file can be picked again", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  const ui = fakeUi();
  assert.strictEqual(page.onPartReady(ui, part, "fileselector"), true);
  assert.ok(part.listeners.change, "a change listener is attached to the part");
  const file = { name: "a.png", type: "image/png" };
  part.input.files = [file];
  uploads.length = 0;
  part.listeners.change({ target: part.input });
  assert.strictEqual(uploads.length, 1);
  assert.strictEqual(uploads[0].file, file);
  assert.deepStrictEqual(uploads[0].params, { hub_id: "hub1", nid: "folder1" });
  assert.strictEqual(part.input.value, "");
});

test("the old part name is gone from the page module", () => {
  const src = require("node:fs").readFileSync(PAGE, "utf8");
  assert.doesNotMatch(src, /"cover-file"/);
});
