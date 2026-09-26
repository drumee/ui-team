// migrate_gdrive_popup's share-to-SA path, now driven by libs/gdrive-sa-import.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const STUBS = {
  "./skin": {},
  "./skeleton": () => ({}),
  "libs/over-limit": { isLocked: () => false },
  "libs/gdrive-sa-import": require(path.join(SRC, "libs/gdrive-sa-import.js")),
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};

let routes = {};
const calls = [];
const handle = (name, args) => {
  calls.push({ name, args });
  const r = routes[name];
  if (r instanceof Error) return Promise.reject(r);
  return Promise.resolve(typeof r === "function" ? r(args) : r);
};
global.window = { addEventListener() {}, removeEventListener() {}, location: { origin: "o" } };
global.Visitor = { id: "me", get: () => "home" };
global.LOCALE = {};
global._ = { isFunction: (f) => typeof f === "function" };
global._a = { home_id: "home_id", personal: "personal", hub: "hub", commit: "commit" };
global.LetcBox = class {
  constructor(m = {}) { this._m = { ...m }; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._m[k]; }
  feed() {}
  warn() {}
  fetchService(n, a) { return handle(n, a); }
  postService(n, a) { return handle(n, a); }
};

const Popup = require(path.join(SRC, "builtins/widget/migrate-gdrive-popup/index.js"));

test.after(() => {
  Module._load = load;
  for (const k of ["window", "Visitor", "LOCALE", "_", "_a", "LetcBox"]) delete global[k];
});

const flush = () => new Promise((r) => setImmediate(r));
function make(opt = {}) {
  calls.length = 0;
  const p = new Popup(opt);
  p.initialize({ hub_id: "h1", nid: "n1", direct: 1, ...opt });
  p._readSaInput = () => "LINK";
  return p;
}

// First, so the pre-refactor popup fails here fast instead of only hanging
// later on its own 2s poll.
test("popup owns a share-to-SA controller on its destination", () => {
  const p = make();
  assert.equal(typeof (p._sa && p._sa.snapshot), "function");
  assert.equal(p._sa.snapshot().state, "loading");
  p.onBeforeDestroy();
});

test("sa verify refused → popup reads the error from the controller", async () => {
  routes = { "google_drive.sa_check": { ok: 0, error: "SA_NOT_OWNER" } };
  const p = make();
  await p.onUiEvent({ mget: () => undefined }, { service: "gdrive-sa-verify" });
  assert.equal(p.getSaError(), "SA_NOT_OWNER");
  assert.equal(p.isSaChecking(), false);
  assert.deepEqual(calls[0], { name: "google_drive.sa_check", args: { hub_id: "me", folder: "LINK" } });
  p.onBeforeDestroy();
});

test("sa start → exact payload, popup in-progress on the job", async () => {
  routes = {
    "google_drive.sa_check": { ok: 1, folder_id: "F", name: "Docs" },
    "google_drive.start_migration": { job_id: 42 },
    "google_drive.get_status": { status: "running", processed_files: 0, total_files: 3 },
  };
  const p = make();
  await p.onUiEvent({ mget: () => undefined }, { service: "gdrive-sa-start" });
  await flush();
  const start = calls.find((c) => c.name === "google_drive.start_migration");
  assert.deepEqual(start.args, {
    hub_id: "h1", nid: "n1", direct_into: 1, auth_kind: "sa", sa_folder: "LINK", conflict_policy: "skip",
  });
  assert.equal(p.getState(), "in-progress");
  assert.equal(p.getJobSnap().job_id, 42);
  p.onBeforeDestroy();
});

test("reopening onto a running job reconnects through the controller", async () => {
  routes = {
    "google_drive.get_state": { ok: 1, sa: 1, sa_email: "sa@x", job: { job_id: 9, status: "running" } },
    "google_drive.get_status": { status: "running" },
  };
  const p = make();
  await p._refreshScope();
  await flush();
  assert.equal(p.getState(), "in-progress");
  assert.equal(p.getJobSnap().job_id, 9);
  assert.ok(calls.some((c) => c.name === "google_drive.get_status"));
  p.onBeforeDestroy();
});

test("reopening the share screen clears a previous link error", async () => {
  routes = { "google_drive.sa_check": { ok: 0, error: "SA_NOT_OWNER" } };
  const p = make();
  await p.onUiEvent({ mget: () => undefined }, { service: "gdrive-sa-verify" });
  p.onUiEvent({ mget: () => undefined }, { service: "gdrive-sa-open" });
  assert.equal(p.getSaError(), null);
  assert.equal(p.getState(), "sa");
  p.onBeforeDestroy();
});

test("Escape in the link field sends nothing", async () => {
  routes = { "google_drive.sa_check": { ok: 0, error: "SA_NOT_OWNER" } };
  const p = make();
  await p.onUiEvent({ mget: () => "gdrive-sa-verify" }, { __inputStatus: "cancel" });
  assert.equal(calls.filter((c) => c.name === "google_drive.sa_check").length, 0);
  assert.equal(p.getSaError(), null);
  p.onBeforeDestroy();
});
