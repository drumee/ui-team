// Reloading the page on an open file reopens it (Duy, 2026-10-30).
//
// The address bar mirrors where the visitor is (libs/location-url): an open
// note or PDF puts its compact Internal Link there. A reload of a mirrored
// entry used to be left to the remembered-screen restore, which only knows
// the workspace and folder windows — so the file was lost and the desk
// landed on its folder. A FILE entry is now armed as a link
// (libs/file-deep-link), the path a pasted link takes; a folder entry is
// still left to the restore.
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const SRC = path.join(__dirname, "../src/drumee");

const store = new Map();
global.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const loc = { hash: "" };
global.window = { location: loc };

// The two answers file-deep-link asks libs/location-url for.
const mirror = { entry: true, remembered: true };
const LOCATION_URL = "location-url-stub";
require.cache[LOCATION_URL] = {
  id: LOCATION_URL,
  filename: LOCATION_URL,
  loaded: true,
  exports: { isMirrorEntry: () => mirror.entry, restsOnReload: () => mirror.remembered },
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === "libs/location-url") return LOCATION_URL;
  return origResolve.call(this, req, ...rest);
};
const fileDeepLink = require(path.join(SRC, "libs/file-deep-link.js"));

function reload(hash, { entry = true, remembered = true } = {}) {
  store.clear();
  loc.hash = hash;
  Object.assign(mirror, { entry, remembered });
  return fileDeepLink.captureFromUrl();
}

for (const type of ["note", "document", "image"]) {
  test(`a reload on an open ${type} reopens it`, () => {
    const hash = `#/desk/wm/o/n1/h1/${type}`;
    assert.equal(reload(hash), true);
    assert.equal(fileDeepLink.peek(), hash);
  });
}

test("a reload on a folder is still left to the remembered screen", () => {
  assert.equal(reload("#/desk/wm/o/n1/h1/folder"), false);
  assert.equal(fileDeepLink.peek(), null);
});

test("with nothing remembered, a folder entry opens as a link, as before", () => {
  assert.equal(reload("#/desk/wm/o/n1/h1/folder", { remembered: false }), true);
});

test("a pasted link (no mirror marker) arms as before", () => {
  assert.equal(reload("#/desk/wm/o/n1/h1/folder", { entry: false }), true);
});
