// tutorial_migrate: Done hands over to the live dialog instead of opening the
// popup, and the live dialog drives the controller and talks to its host.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const made = [];
const fakeRun = () => {
  const r = {
    calls: [],
    load() { r.calls.push(["load"]); return Promise.resolve(); },
    verify(l) { r.calls.push(["verify", l]); },
    start(l) { r.calls.push(["start", l]); },
    cancel() { r.calls.push(["cancel"]); },
    ack() { r.calls.push(["ack"]); return Promise.resolve(); },
    reset() { r.calls.push(["reset"]); },
    dispose() { r.calls.push(["dispose"]); },
    snapshot() { return { saEmail: "sa@x" }; },
  };
  return r;
};
const STUBS = {
  "./skin": {},
  "./skeleton": () => ({ mock: 1 }),
  "./skeleton/live": (ui, snap) => ({ live: snap.state }),
  "builtins/widget/migrate-gdrive-popup/skin": {},
  "libs/gdrive-sa-import": {
    createSaImport: (opt) => { const r = fakeRun(); r.opt = opt; made.push(r); return r; },
  },
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};

global._ = { isFunction: (f) => typeof f === "function", delay: () => {} };
global._a = { service: "service", commit: "commit" };
global.LetcBox = class {
  constructor(m = {}) { this._m = { ...m }; this.raised = []; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._m[k]; }
  feed(x) { this.fed = x; }
  triggerHandlers(a) { this.raised.push(a); }
  warn() {}
  getPart(n) { return this.parts ? this.parts[n] : null; }
  ensurePart() { return Promise.resolve({ el: {} }); }
};

const Step = require(path.join(SRC, "modules/desk/tutorial/migrate/index.js"));

test.after(() => {
  Module._load = load;
  for (const k of ["_", "_a", "LetcBox"]) delete global[k];
});

function host() {
  const h = { events: [], onUiEvent(t, a) { h.events.push(a.service); } };
  return h;
}
function step(model = {}) {
  const h = host();
  const s = new Step({ is_last: true, uiHandler: [h], ...model });
  s.initialize({});
  s._screenIndex = 3; // the verify screen, the tour's last
  return { s, h };
}
const trig = { mget: () => undefined };
const dest = { hub_id: "h1", nid: "n1", name: "Docs", area: "private", filetype: "hub" };

test("Done in the window host → go-live, and never the popup", () => {
  const { s } = step({ live_capable: 1 });
  s.onUiEvent(trig, { service: "next-step" });
  assert.deepEqual(s.raised, [{ service: "window-tutorial:go-live" }]);
  assert.ok(!JSON.stringify(s.raised).includes("launch-gdrive-migration"));
});

test("Done on the desk host (no live_capable) → next-step, unchanged", () => {
  const { s } = step();
  s.onUiEvent(trig, { service: "next-step" });
  assert.deepEqual(s.raised, [{ service: "next-step" }]);
});

test("goLive: controller on the real destination, direct, loaded", async () => {
  const { s } = step({ live_capable: 1 });
  await s.goLive(dest);
  const r = made[made.length - 1];
  assert.equal(r.opt.hub_id, "h1");
  assert.equal(r.opt.nid, "n1");
  assert.equal(r.opt.direct, 1);
  assert.equal(r.opt.service, s);
  assert.deepEqual(r.calls, [["load"]]);
});

test("onChange renders the live skeleton", async () => {
  const { s } = step({ live_capable: 1 });
  await s.goLive(dest);
  made[made.length - 1].opt.onChange({ state: "idle" });
  assert.deepEqual(s.fed, { live: "idle" });
});

test("unavailable → host fallback, called directly (not triggerHandlers)", async () => {
  const { s, h } = step({ live_capable: 1 });
  await s.goLive(dest);
  made[made.length - 1].opt.onChange({ state: "unavailable" });
  assert.deepEqual(h.events, ["window-tutorial:fallback-popup"]);
  assert.equal(s.raised.length, 0);
});

test("finished job → host refresh, called directly", async () => {
  const { s, h } = step({ live_capable: 1 });
  await s.goLive(dest);
  made[made.length - 1].opt.onFinished({ job_id: 1 });
  assert.deepEqual(h.events, ["window-tutorial:refresh-target"]);
  assert.equal(s.raised.length, 0);
});

test("live controls drive the controller with the field's value", async () => {
  const { s } = step({ live_capable: 1 });
  s.parts = { "mg-live-link": { getValue: () => " https://drive/x " } };
  await s.goLive(dest);
  const r = made[made.length - 1];
  s.onUiEvent(trig, { service: "mg-live-verify", __inputStatus: "commit" });
  s.onUiEvent(trig, { service: "mg-live-start" });
  s.onUiEvent(trig, { service: "mg-live-again" });
  assert.deepEqual(r.calls.slice(1), [
    ["verify", "https://drive/x"], ["start", "https://drive/x"], ["ack"], ["reset"],
  ]);
});

test("close → host close-live; mock services are inert while live", async () => {
  const { s, h } = step({ live_capable: 1 });
  await s.goLive(dest);
  s.onUiEvent(trig, { service: "mg-open-dialog" });
  s.onUiEvent(trig, { service: "next-step" });
  s.onUiEvent(trig, { service: "mg-live-close" });
  assert.deepEqual(h.events, ["window-tutorial:close-live"]);
  assert.equal(s.raised.length, 0);
});

test("destroy disposes, never cancels", async () => {
  const { s } = step({ live_capable: 1 });
  await s.goLive(dest);
  s.onBeforeDestroy();
  const r = made[made.length - 1];
  assert.ok(r.calls.some((c) => c[0] === "dispose"));
  assert.ok(!r.calls.some((c) => c[0] === "cancel"));
});

test("Escape in the link field does not verify; Enter (commit) does", async () => {
  const { s } = step({ live_capable: 1 });
  s.parts = { "mg-live-link": { getValue: () => "L" } };
  await s.goLive(dest);
  const r = made[made.length - 1];
  s.onUiEvent(trig, { service: "mg-live-verify", __inputStatus: "cancel" });
  assert.equal(r.calls.filter((c) => c[0] === "verify").length, 0);
  s.onUiEvent(trig, { service: "mg-live-verify", __inputStatus: "commit" });
  assert.equal(r.calls.filter((c) => c[0] === "verify").length, 1);
});

test("closing the dialog acks a finished result before leaving", async () => {
  const { s, h } = step({ live_capable: 1 });
  await s.goLive(dest);
  s.onUiEvent(trig, { service: "mg-live-close" });
  const r = made[made.length - 1];
  assert.ok(r.calls.some((c) => c[0] === "ack"));
  assert.deepEqual(h.events, ["window-tutorial:close-live"]);
});

// ui-core puts el.onclick = __handleClick on every active widget, the Entry
// included, so a click to FOCUS the field raises the Entry's own service with
// the click event as args (no __inputStatus). Verifying there showed the
// bad-link error, re-rendered, and destroyed the field under the cursor.
test("clicking into the link field does not verify", async () => {
  const { s } = step({ live_capable: 1 });
  s.parts = { "mg-live-link": { getValue: () => "" } };
  await s.goLive(dest);
  const r = made[made.length - 1];
  const field = { mget: (k) => (k === "service" ? "mg-live-verify" : undefined) };
  s.onUiEvent(field, { type: "click" });
  assert.equal(r.calls.filter((c) => c[0] === "verify").length, 0);
});
