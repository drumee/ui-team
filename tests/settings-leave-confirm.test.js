// Unsaved-profile guard on the Settings screen: settings_main's dirty check
// and leave dialog flow, and the dialog skeleton. The widget methods are
// real; LetcBox, Visitor and the overlay part are stubs.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SETTINGS = path.join(__dirname, "..", "src/drumee/builtins/widget/settings");

const STUBS = {
  "./skin": {},
  "./skeleton": { default: () => ({ type: "page" }) },
  "@drumee/ui-essentials": { uploadFile() {}, copyToClipboard() {} },
  "../../otp-gate": { sendOtp() {}, openOtpModal() {}, resendOtpGate() {} },
  "libs/read-cache": { signature: () => "" },
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};

global._ = require("lodash");
global.window = { addEventListener() {}, removeEventListener() {} };
let profile;
global.Visitor = { profile: () => profile };
global.Kind = { waitFor: () => Promise.resolve() };
global.LetcBox = class {
  initialize() {}
  declareHandlers() {}
  warn() {}
  isDestroyed() { return false; }
};

const SettingsMain = require(path.join(SETTINGS, "main"));

// A settings_main whose form currently reads `form`, with a stub overlay.
function settings(form) {
  const s = Object.create(SettingsMain.prototype);
  s.el = {};
  s.fed = 0;
  s.overlay = { fed: [], cleared: 0, feed(x) { this.fed.push(x); }, clear() { this.cleared++; } };
  s.getData = () => form;
  s.feed = () => { s.fed++; };
  s.ensurePart = () => Promise.resolve(s.overlay);
  s.closeOverlay = () => Promise.resolve(s.overlay.clear());
  return s;
}
const tick = () => new Promise((r) => setImmediate(r));

test.beforeEach(() => {
  profile = { firstname: "John", lastname: "Doe", username: "john", bio: "Hi" };
});

test("the untouched card is clean, including whitespace around the name", () => {
  assert.equal(settings({ display_name: "John Doe", username: "john", bio: "Hi" }).hasUnsavedProfile(), false);
  assert.equal(settings({ display_name: " John Doe ", username: "john ", bio: "Hi" }).hasUnsavedProfile(), false);
});

test("any edited field makes it dirty", () => {
  assert.equal(settings({ display_name: "John", username: "john", bio: "Hi" }).hasUnsavedProfile(), true);
  assert.equal(settings({ display_name: "John Doe", username: "jd", bio: "Hi" }).hasUnsavedProfile(), true);
  assert.equal(settings({ display_name: "John Doe", username: "john", bio: "" }).hasUnsavedProfile(), true);
});

test("nothing to guard before the card renders or while a save is in flight", () => {
  assert.equal(settings({}).hasUnsavedProfile(), false);
  const s = settings({ display_name: "Jane", username: "john", bio: "Hi" });
  s._savingProfile = true;
  assert.equal(s.hasUnsavedProfile(), false);
});

test("the dialog opens in the overlay, and staying closes it and resolves false", async () => {
  const s = settings({ display_name: "Jane", username: "john", bio: "Hi" });
  const answer = s.confirmLeave();
  assert.equal(s.confirmLeave(), answer, "a second leave reuses the open dialog");
  await tick();
  assert.equal(s.overlay.fed[0].kind, "settings_leave_confirm");
  s.onUiEvent({}, { service: "leave-confirm-stay" });
  assert.equal(await answer, false);
  assert.equal(s.overlay.cleared, 1);
});

test("discard re-renders the saved values and lets the user leave", async () => {
  const s = settings({ display_name: "Jane", username: "john", bio: "Hi" });
  const answer = s.confirmLeave();
  await tick();
  s.onUiEvent({}, { service: "leave-confirm-discard" });
  assert.equal(await answer, true);
  assert.equal(s.fed, 1);
});

test("save leaves only once the save succeeded", async () => {
  const s = settings({ display_name: "Jane", username: "john", bio: "Hi" });
  let busy = false;
  const dialog = { setBusy: (on) => { busy = on; } };
  s._saveProfile = async () => true;
  const answer = s.confirmLeave();
  await tick();
  s.onUiEvent(dialog, { service: "leave-confirm-save" });
  assert.equal(await answer, true);
  assert.equal(busy, true);
});

test("a failed save (e.g. username taken) keeps the user here with the dialog closed", async () => {
  const s = settings({ display_name: "Jane", username: "taken", bio: "Hi" });
  s._saveProfile = async () => false;
  const answer = s.confirmLeave();
  await tick();
  s.onUiEvent({}, { service: "leave-confirm-save" });
  assert.equal(await answer, false);
  assert.equal(s.overlay.cleared, 1);
});

test("the dialog offers Discard and Save changes; X, backdrop and card are wired", () => {
  const node = (type) => (o = {}) => ({ type, ...o });
  global.Skeletons = { Box: { X: node("X"), Y: node("Y") }, Note: node("Note"), Button: { Svg: node("Svg") } };
  global.LOCALE = require("../locale/en.json");
  delete require.cache[require.resolve(path.join(SETTINGS, "leave-confirm/skeleton"))];
  const Module2 = require("node:module");
  // The skeleton is an ES module (export default); load it through a shim.
  const fs = require("node:fs");
  const src = fs.readFileSync(path.join(SETTINGS, "leave-confirm/skeleton/index.js"), "utf8")
    .replace("export default leaveConfirm;", "module.exports = leaveConfirm;");
  const m = new Module2("leave-confirm-skeleton");
  m._compile(src, "leave-confirm-skeleton.js");
  const skel = m.exports;
  const walk = (n, out = []) => { if (!n) return out; out.push(n); (n.kids || []).forEach((k) => walk(k, out)); return out; };
  const nodes = walk(skel({ fig: { family: "settings-leave-confirm" }, _busy: false }));
  const by = (svc) => nodes.filter((n) => n.service === svc);
  assert.deepEqual(nodes.filter((n) => n.content).map((n) => n.content), [
    "Unsaved changes",
    "You've changed your profile. Save the changes before you leave?",
    "Discard",
    "Save Changes",
  ]);
  assert.equal(by("leave-confirm-stay").length, 2, "the X and the backdrop");
  assert.equal(nodes.find((n) => n.service === "leave-confirm-noop").bubble, 0);
  const busy = walk(skel({ fig: { family: "settings-leave-confirm" }, _busy: true }));
  assert.ok(!busy.some((n) => /^leave-confirm-(save|discard|stay)$/.test(n.service || "")), "locked while saving");
});

// desk_module._guardSettingsLeave, lifted out of the (webpack-only) desk
// module with the service list it reads, and run against a stub desk.
function loadGuard() {
  const fs = require("node:fs");
  const src = fs.readFileSync(path.join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");
  const pick = (start, end) => {
    const i = src.indexOf(start);
    assert.ok(i >= 0, `missing ${start}`);
    return src.slice(i, src.indexOf(end, i) + end.length);
  };
  const rail = pick("const RAIL_NAV_SERVICES = new Set([", "]);");
  const leave = pick("const SETTINGS_LEAVE_SERVICES = new Set([", "]);");
  const body = pick("  _guardSettingsLeave(cmd, service, args) {", "\n    return true;\n  }");
  const make = new Function("_", "_e", `${rail}\n${leave}\nreturn { ${body} };`);
  return make(require("lodash"), { home: "home" })._guardSettingsLeave;
}

function desk({ dirty = true, parked = false, leave = true } = {}) {
  const d = { events: [], unlit: 0, asked: 0 };
  const settings = {
    el: { dataset: { anim: parked ? "out" : "in" } },
    hasUnsavedProfile: () => dirty,
    confirmLeave: () => { d.asked++; return Promise.resolve(leave); },
  };
  d.getPart = () => ({ children: { last: () => settings } });
  d.onUiEvent = (cmd, args) => d.events.push(args.service);
  d._railUnlight = () => { d.unlit++; };
  d._isUtilityBtn = () => false;
  d._guardSettingsLeave = loadGuard();
  return d;
}

test("desk: leaving dirty Settings is held and replayed after save/discard", async () => {
  const d = desk();
  assert.equal(d._guardSettingsLeave({ mget: () => 0 }, "rail-files", { service: "rail-files" }), true);
  await tick();
  assert.equal(d.asked, 1);
  assert.deepEqual(d.events, ["rail-files"]);
});

test("desk: choosing to stay replays nothing and unlights the pressed rail row", async () => {
  const d = desk({ leave: false });
  const row = { mget: (k) => (k === "railRow" ? 1 : undefined) };
  assert.equal(d._guardSettingsLeave(row, "rail-chat", { service: "rail-chat" }), true);
  await tick();
  assert.deepEqual(d.events, []);
  assert.equal(d.unlit, 1);
});

test("desk: no prompt when clean, parked, or when the service keeps Settings up", () => {
  assert.equal(desk({ dirty: false })._guardSettingsLeave({}, "rail-files", {}), false);
  assert.equal(desk({ parked: true })._guardSettingsLeave({}, "rail-files", {}), false);
  for (const s of ["toggle-trash", "toggle-contacts", "toggle-activity", "toggle-settings", "save-profile"]) {
    assert.equal(desk()._guardSettingsLeave({}, s, {}), false, s);
  }
  assert.equal(desk()._guardSettingsLeave({ mget: () => 0 }, "home", {}), true, "_e.home counts as Home");
});

test("Export / Delete buttons spin until their dialog is up, and ignore a second click", async () => {
  const s = settings({});
  const btn = { el: { dataset: {} } };
  let opened = 0;
  let finish;
  const run = () => { opened++; return new Promise((r) => { finish = r; }); };
  const first = s._withButtonLoading(btn, run);
  assert.equal(btn.el.dataset.loading, "1");
  await s._withButtonLoading(btn, run); // double click while loading
  assert.equal(opened, 1);
  finish();
  await first;
  assert.equal(btn.el.dataset.loading, "0");
});

test("a failed open still stops the spinner", async () => {
  const s = settings({});
  const btn = { el: { dataset: {} } };
  await assert.rejects(s._withButtonLoading(btn, () => Promise.reject(new Error("chunk failed"))));
  assert.equal(btn.el.dataset.loading, "0");
});
