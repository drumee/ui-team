// Add cover ▸ Upload file opens the computer's file picker (tester, 2026-10-30).
// Round 3 (2026-10-30): Add cover itself opens the picker, the way the
// folder's "+ New → From device" does (Wm.handleUpload → FileSelector.open).
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
const SKELETON = resolve(ROOT, "src/drumee/builtins/editor/blocknote/skeleton/index.js");

const uploads = [];
// libs/over-limit is a webpack alias; page.js requires it lazily, at the
// click, so the stub has to outlive loadPage().
const overLimit = { locked: false, guardWrite: () => overLimit.locked };
{
  const orig = Module._load;
  Module._load = function (req, ...rest) {
    if (req === "libs/over-limit") return overLimit;
    return orig.call(this, req, ...rest);
  };
}
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

// ui-core's FileSelector: an <input type=file> inside a wrapper <div>, and
// open(handler), which clears the input, arms onchange and clicks it.
function fileSelectorPart() {
  const input = { tagName: "INPUT", value: "C:\\fakepath\\a.png", files: [], clicks: 0, onchange: null };
  input.click = () => input.clicks++;
  const el = {
    tagName: "DIV",
    querySelector: (sel) => (/input/.test(sel) ? input : null),
  };
  const part = { el, input, isDestroyed: () => false };
  part.open = (handler) => {
    input.onchange = (e) => {
      handler(e);
      input.onchange = null;
    };
    input.value = "";
    input.click();
  };
  return part;
}

function fakeUi(extra = {}) {
  return {
    _saveTarget: () => ({ hub_id: "hub1", pid: "folder1", target: null }),
    _setStatus() {},
    _withNode: (fn) => fn(),
    canEditNote: () => true,
    warn() {},
    ensurePart: () => new Promise(() => {}), // never resolves, like a missing part
    ...extra,
  };
}

function pick(part, file) {
  part.input.files = [file];
  part.input.onchange({ target: part.input });
}

test("the cover popup carries no FileSelector; the editor's cover row does", () => {
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
  assert.strictEqual(seen.length, 0);
  const src = require("node:fs").readFileSync(SKELETON, "utf8");
  const sel = src.slice(src.indexOf("Skeletons.FileSelector("));
  assert.match(sel.slice(0, 200), /accept: "image\/\*"/);
  // ui-core overwrites any sys_pn with "fileselector".
  assert.doesNotMatch(sel.slice(0, 200), /sys_pn/);
});

for (const service of ["add-cover", "pick-cover-file"]) {
  test(`${service} opens the file picker at once, inside the user's click`, () => {
    const page = loadPage();
    const part = fileSelectorPart();
    const ui = fakeUi({ __fileselector: part });
    assert.strictEqual(page.onUiEvent(ui, {}, service), true);
    // Synchronous: a click() deferred past the gesture opens no picker.
    assert.strictEqual(part.input.clicks, 1);
    assert.strictEqual(part.input.value, "", "the same file can be picked again");
  });
}

test("add-cover opens no popup on the way", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  const asked = [];
  const ui = fakeUi({ __fileselector: part, ensurePart: (pn) => (asked.push(pn), new Promise(() => {})) });
  page.onUiEvent(ui, {}, "add-cover");
  assert.ok(!ui._coverPopup);
  assert.ok(!asked.includes("fileselector"));
});

test("a reader's add-cover opens nothing", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  const ui = fakeUi({ __fileselector: part, canEditNote: () => false });
  assert.strictEqual(page.onUiEvent(ui, {}, "add-cover"), true);
  assert.strictEqual(part.input.clicks, 0);
});

test("while the org is read-only the picker stays shut", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  overLimit.locked = true;
  try {
    page.onUiEvent(fakeUi({ __fileselector: part }), {}, "add-cover");
  } finally {
    overLimit.locked = false;
  }
  assert.strictEqual(part.input.clicks, 0);
});

test("a destroyed part is not clicked", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  part.isDestroyed = () => true;
  page.onUiEvent(fakeUi({ __fileselector: part }), {}, "add-cover");
  assert.strictEqual(part.input.clicks, 0);
});

test("picking an image uploads it next to the note", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  const ui = fakeUi({ __fileselector: part });
  assert.strictEqual(page.onPartReady(ui, part, "fileselector"), true);
  page.onUiEvent(ui, {}, "add-cover");
  const file = { name: "a.png", type: "image/png" };
  uploads.length = 0;
  pick(part, file);
  assert.strictEqual(uploads.length, 1);
  assert.strictEqual(uploads[0].file, file);
  assert.deepStrictEqual(uploads[0].params, { hub_id: "hub1", nid: "folder1" });
});

test("a brand-new note is saved first, after the pick, then uploads", () => {
  const page = loadPage();
  const part = fileSelectorPart();
  let afterSave = null;
  const ui = fakeUi({ __fileselector: part, _withNode: (fn) => (afterSave = fn) });
  page.onUiEvent(ui, {}, "add-cover");
  // The picker opened before any save — the gesture is not spent waiting.
  assert.strictEqual(part.input.clicks, 1);
  assert.strictEqual(afterSave, null);
  uploads.length = 0;
  pick(part, { name: "a.png", type: "image/png" });
  assert.strictEqual(uploads.length, 0);
  afterSave();
  assert.strictEqual(uploads.length, 1);
});

test("the old part name is gone from the page module", () => {
  const src = require("node:fs").readFileSync(PAGE, "utf8");
  assert.doesNotMatch(src, /"cover-file"/);
});

// Round 2 (Duy, 2026-10-30): the cover uploaded but showed as a broken image.
// The app also answers at the bare host (`https://team.drumee.in/#/…`, no
// `/-/`), and a URL built from location then pointed at `/file/orig/…` — 404.
test("the cover is read from the app endpoint, whatever the page URL looks like", () => {
  const page = loadPage();
  const prev = global.bootstrap;
  try {
    global.bootstrap = () => ({ endpoint: "/-/" });
    assert.strictEqual(page.coverUrl({ nid: "n1", hub_id: "h1" }), "/-/file/orig/n1/h1");
    // A dmz visitor's share key rides along, as on every other file read.
    global.bootstrap = () => ({ endpoint: "/-/", keysel: "k9" });
    assert.strictEqual(page.coverUrl({ nid: "n1", hub_id: "h1" }), "/-/file/orig/n1/h1?keysel=k9");
  } finally {
    global.bootstrap = prev;
  }
  const src = require("node:fs").readFileSync(PAGE, "utf8");
  const body = src.slice(src.indexOf("function coverUrl"), src.indexOf("function coverUrl") + 200);
  assert.doesNotMatch(body, /location\.href/);
});
