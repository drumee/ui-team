// migrate_gdrive_popup's result card (done / cancelled): renders the real
// skeleton against stub globals and reads the text it would show.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const STUBS = {
  "libs/gdrive-sa-import": require(path.join(SRC, "libs/gdrive-sa-import.js")),
  "media/grid/template/folder": () => "<svg></svg>",
  "@drumee/ui-essentials": { filesize: (n) => `${n}B` },
  "./skin": {},
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
  Entry: node("Entry"),
  Image: { Svg: node("Image.Svg") },
  Button: { Svg: node("Button.Svg") },
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : undefined) });
global._ = { uniqueId: (p) => `${p}1` };
global._a = new Proxy({}, { get: (t, k) => k });

const skeleton = require(path.join(SRC, "builtins/widget/migrate-gdrive-popup/skeleton/index.js"));

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
const texts = (tree) => walk(tree).map((n) => n.content).filter((c) => typeof c === "string");

// The popup instance as the skeleton sees it; unknown getters answer null.
function ui(state, snap, extra = {}) {
  const base = {
    fig: { family: "p" }, _destinationName: "Team", _destArea: "private", _destFiletype: "hub",
    getState: () => state, getJobSnap: () => snap, getFileLog: () => [], ...extra,
  };
  return new Proxy(base, {
    get: (t, k) => (k in t ? t[k] : (typeof k === "string" && /^(get|is|has)/.test(k) ? () => null : undefined)),
  });
}

test("done with new files: imported count and the usual hint", () => {
  const tx = texts(skeleton(ui("done", { status: "done", processed_files: 3, total_folders: 1, errors: [] })));
  assert.ok(tx.includes("Imported 3 files in 1 folders."));
  assert.ok(tx.includes(en.MIGRATE_GDRIVE_DONE_HINT));
  assert.ok(!tx.includes(en.MIGRATE_GDRIVE_DONE_HINT_NONE));
  assert.ok(!tx.includes(en.MIGRATE_GDRIVE_CANCEL_TOO_LATE));
});

test("done with nothing new: skipped files are not called imported, hint says so", () => {
  const snap = { status: "done", processed_files: 1, skipped_existing: 1, total_folders: 0, errors: [] };
  const tx = texts(skeleton(ui("done", snap)));
  assert.ok(tx.includes("Imported 0 files in 0 folders. 1 already existed, skipped."));
  assert.ok(tx.includes(en.MIGRATE_GDRIVE_DONE_HINT_NONE));
  assert.ok(!tx.includes(en.MIGRATE_GDRIVE_DONE_HINT));
});

test("done after a late cancel: says the cancel came too late", () => {
  const snap = { status: "done", processed_files: 1, total_folders: 0, errors: [] };
  const tx = texts(skeleton(ui("done", snap, { _cancelLate: 1 })));
  assert.ok(tx.includes(en.MIGRATE_GDRIVE_CANCEL_TOO_LATE));
});

test("cancelled: title and the imported count without skipped files", () => {
  const snap = { status: "cancelled", processed_files: 2, skipped_existing: 1, total_folders: 1, errors: [] };
  const tx = texts(skeleton(ui("cancelled", snap)));
  assert.ok(tx.includes(en.MIGRATION_CANCELLED_TITLE));
  assert.ok(tx.includes("Imported 1 files in 1 folders. 1 already existed, skipped."));
});
