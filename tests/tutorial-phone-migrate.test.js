// Migrate tour, phone layout — Figma "Files → Migrate", the three import-sheet
// frames only (385:55398 copy, 386:55610 paste, 386:55759 verify). The blank
// workspace + menu screens are gone on a phone, and the last step is the REAL
// Google Drive import (libs/gdrive-sa-import, as migrate-gdrive-popup uses).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const SRC = path.join(__dirname, "..", "src/drumee");
const T = path.join(SRC, "modules/desk/tutorial");
const load = Module._load;
Module._load = function (r, p, m) {
  if (/^assets\//.test(r)) return `asset:${r}`;
  if (r === "media/grid/template/folder") return () => "<svg/>";
  if (r === "libs/billing") return { planLabel: () => "Plan" };
  if (r === "@drumee/ui-essentials") return { filesize: (n) => `${n}B` };
  if (/^libs\//.test(r)) return load.call(this, path.join(SRC, r), p, m);
  return load.call(this, r, p, m);
};
const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({}, { get: (_, k) => String(k) });
global._e = { upload: "upload" };
global._ = require("lodash");
global.Visitor = { id: "u1", firstname: () => "A", lastname: () => "B" };
const SCREENS = require(path.join(T, "migrate/screens.js"));
const phone = require(path.join(T, "migrate/skeleton/phone.js"));
test.after(() => {
  Module._load = load;
  for (const k of ["Skeletons", "LOCALE", "_a", "_e", "_", "Visitor"]) delete global[k];
});

const ui = {
  fig: { family: "tutorial-migrate", group: "tutorial" },
  mget: (k) => (k === "import_dest" ? { name: "Docs", area: "private" } : null),
};
const find = (t, pn) => {
  if (!t || typeof t !== "object") return null;
  if (t.sys_pn === pn) return t;
  for (const k of t.kids || []) { const r = find(k, pn); if (r) return r; }
  return null;
};
const has = (t, cls) => {
  if (!t || typeof t !== "object") return false;
  if (typeof t.className === "string" && t.className.split(/\s+/).includes(cls)) return true;
  return (t.kids || []).some((k) => has(k, cls));
};
const services = (t, out = []) => {
  if (t && typeof t === "object") { if (t.service) out.push(t.service); (t.kids || []).forEach((k) => services(k, out)); }
  return out;
};

test("the blank-workspace screen is skipped on a phone; three sheet steps remain", () => {
  assert.equal(SCREENS[0].phone.skip, true);
  assert.deepEqual(SCREENS.slice(1).map((s) => s.phone.lit), ["copy", "paste", "verify"]);
  assert.equal(SCREENS[3].phone.live, true, "the last step is the real import");
});

for (const [i, lit, target] of [[1, "copy", "mg-ph-address"], [2, "paste", "mg-ph-link"], [3, "verify", "mg-ph-verify"]]) {
  test(`teaching step ${lit}: the frame's sheet over the workspace, ${target} named for the callout`, () => {
    const tree = phone(ui, SCREENS[i], {});
    assert.ok(has(tree, "tutorial-phone__overlay"), "20% overlay");
    const sheet = find(tree, "mg-ph-sheet");
    assert.equal(sheet.dataset.lit, lit);
    assert.ok(find(sheet, target), target);
  });
}

test("copy step shows the plain Copy; paste and verify show it done (green, check)", () => {
  assert.equal(find(phone(ui, SCREENS[1], {}), "mg-ph-copy").dataset.done, "0");
  assert.equal(find(phone(ui, SCREENS[2], {}), "mg-ph-copy").dataset.done, "1");
  assert.equal(find(phone(ui, SCREENS[3], {}), "mg-ph-copy").dataset.done, "1");
});

test("Verify & Import is solid only on its own step", () => {
  assert.equal(find(phone(ui, SCREENS[2], {}), "mg-ph-verify").dataset.ready, "0");
  assert.equal(find(phone(ui, SCREENS[3], {}), "mg-ph-verify").dataset.ready, "1");
});

test("the workspace behind: the app's top bar, All filter, view toggle, Files tab lit, no FAB", () => {
  const tree = phone(ui, SCREENS[1], {});
  assert.ok(find(tree, "ph-title") && find(tree, "ph-more") && find(tree, "ph-avatar"));
  assert.equal(find(tree, "ph-fab"), null);
  assert.ok(has(tree, "tutorial-migrate__ph-filter-all"));
  assert.ok(has(tree, "tutorial-migrate__ph-view"));
  assert.equal(find(tree, "ph-tab-files").dataset.active, "1");
});

test("live form: no overlay, no fading, the REAL controls", () => {
  const tree = phone.live(ui, { state: "idle", saEmail: "sa@x.iam" }, { name: "Docs" }, { link: "" });
  assert.equal(has(tree, "tutorial-phone__overlay"), false);
  const sheet = find(tree, "mg-ph-sheet");
  assert.equal((sheet.dataset || {}).lit, undefined);
  assert.deepEqual(services(sheet).sort(), ["mg-live-close", "mg-live-copy", "mg-live-start", "mg-live-verify"].sort());
  assert.equal(find(sheet, "mg-live-link").type, "S.Entry");
});

test("live form: Verify & Import waits for the address", () => {
  const tree = phone.live(ui, { state: "loading" }, {}, {});
  assert.ok(!services(tree).includes("mg-live-start"));
});

test("live progress and result keep the import's own content inside the phone sheet", () => {
  const tree = phone.live(ui, { state: "in-progress", job: { total: 4, processed: 1 }, fileLog: [] }, {}, {});
  assert.ok(find(tree, "mg-ph-sheet"));
  assert.ok(has(tree, "tutorial-migrate__live-bar"));
});

test("index: phone skips to copy, goes live on verify, renders the phone live form", () => {
  const src = fs.readFileSync(path.join(T, "migrate/index.js"), "utf8");
  assert.match(src, /phone\.skip/);
  assert.match(src, /service: 'window-tutorial:go-live'/);
  assert.match(src, /require\('\.\/skeleton\/phone'\)\.live\(/);
});
