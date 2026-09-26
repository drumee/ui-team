// The migrate tour's dialog once it goes live: renders the real skeleton for
// every controller state against stub globals and inspects the descriptors.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const STUBS = {
  "media/grid/template/folder": (o) => `<svg class="folder ${o.area} ${o.filetype}"></svg>`,
  "libs/gdrive-sa-import": require(path.join(SRC, "libs/gdrive-sa-import.js")),
  "@drumee/ui-essentials": { filesize: (n) => `${n}B` },
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
global._a = { hub: "hub", folder: "folder", personal: "personal" };

const live = require(path.join(SRC, "modules/desk/tutorial/migrate/skeleton/live.js"));

test.after(() => {
  Module._load = load;
  for (const k of ["Skeletons", "LOCALE", "_", "_a"]) delete global[k];
});

const P = "tutorial-migrate";
const ui = { fig: { family: P } };
const dest = { hub_id: "h", nid: "n", name: "Team docs", area: "private", filetype: "hub" };
const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const has = (n, c) => String(n.className || "").split(/\s+/).includes(`${P}__${c}`);
const find = (tree, c) => walk(tree).filter((n) => has(n, c));
const bySvc = (tree, s) => walk(tree).filter((n) => n.service === s);
const snap = (o) => ({ state: "idle", saEmail: "sa@drumee", folder: null, error: null, job: null, fileLog: [], cancelRequested: 0, ...o });

test("idle: real address, real controls, no tour fixtures", () => {
  const t = live(ui, snap(), dest, {});
  assert.equal(find(t, "address-text")[0].content, "sa@drumee");
  assert.equal(bySvc(t, "mg-live-copy").length, 1);
  const entry = walk(t).find((n) => n.type === "Entry");
  assert.equal(entry.service, "mg-live-verify");
  assert.equal(entry.sys_pn, "mg-live-link");
  assert.equal(entry.escapeContextmenu, true);
  assert.equal(bySvc(t, "mg-live-start").length, 1);
  assert.equal(bySvc(t, "mg-live-close").length, 1);
  const text = JSON.stringify(t);
  assert.ok(!text.includes("growth-hacking"), "mock address leaked");
  assert.ok(!text.includes("https://drive.google.com"), "mock link leaked");
});

test("dest card names the real destination", () => {
  const t = live(ui, snap(), dest, {});
  assert.ok(JSON.stringify(t).includes("Team docs"));
});

test("typed link survives the re-render", () => {
  const t = live(ui, snap({ state: "checking" }), dest, { link: "https://drive/x" });
  assert.equal(walk(t).find((n) => n.type === "Entry").value, "https://drive/x");
});

test("checking: submit inert, status pending", () => {
  const t = live(ui, snap({ state: "checking" }), dest, {});
  assert.equal(bySvc(t, "mg-live-start").length, 0);
  assert.equal(find(t, "live-status")[0].dataset.kind, "pending");
});

test("error: the shared wording", () => {
  const t = live(ui, snap({ error: "SA_NOT_OWNER" }), dest, {});
  const st = find(t, "live-status")[0];
  assert.equal(st.dataset.kind, "error");
  assert.equal(st.content, en.GDRIVE_SA_NOT_OWNER);
});

test("verified: folder found line", () => {
  const t = live(ui, snap({ state: "verified", folder: { folder_id: "F", name: "Docs", raw: "L" } }), dest, {});
  const st = find(t, "live-status")[0];
  assert.equal(st.dataset.kind, "ok");
  assert.ok(st.content.includes("Docs"));
});

test("in-progress: bar by bytes; cancel has no service; requested → disabled", () => {
  const job = { job_id: 1, status: "running", total_files: 4, processed_files: 1, bytes_total: 200, bytes_done: 100 };
  const t = live(ui, snap({ state: "in-progress", job, fileLog: [{ name: "a.pdf", status: "uploading" }] }), dest, {});
  assert.equal(find(t, "live-fill")[0].styleOpt.width, "50%");
  const c = find(t, "live-cancel")[0];
  assert.equal(c.service, undefined);
  assert.equal(find(t, "live-log-row").length, 1);
  const t2 = live(ui, snap({ state: "in-progress", job, cancelRequested: 1 }), dest, {});
  assert.equal(find(t2, "live-cancel")[0].attrOpt["data-disabled"], 1);
});

test("done: summary and the two actions", () => {
  const job = { job_id: 1, status: "done", processed_files: 3, total_folders: 1, errors: [{ code: "SHORTCUT_SKIPPED" }] };
  const t = live(ui, snap({ state: "done", job }), dest, {});
  assert.ok(find(t, "live-summary")[0].content.includes("3"));
  assert.equal(bySvc(t, "mg-live-again").length, 1);
  assert.ok(bySvc(t, "mg-live-close").length >= 1);
});

test("failed ACCESS_REVOKED: the popup's wording", () => {
  const job = { job_id: 1, status: "failed", failed_reason: "ACCESS_REVOKED" };
  const t = live(ui, snap({ state: "failed", job }), dest, {});
  assert.ok(find(t, "live-status").some((n) => n.content === en.MIGRATE_GDRIVE_ACCESS_REVOKED));
});

test("never a data-state attribute (globally hidden values)", () => {
  for (const state of ["loading", "idle", "checking", "in-progress", "done", "failed", "cancelled"]) {
    const t = live(ui, snap({ state, job: { job_id: 1, status: state } }), dest, {});
    for (const n of walk(t)) {
      assert.ok(!(n.attrOpt && "data-state" in n.attrOpt), `${state}: data-state attr`);
      assert.ok(!(n.dataset && "state" in n.dataset), `${state}: dataset.state`);
    }
  }
});
