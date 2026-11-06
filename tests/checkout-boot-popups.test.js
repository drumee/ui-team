// tests/checkout-boot-popups.test.js — back from a successful Checkout, a new
// account saw THREE modals at once: "Payment Success!", "Ready for more room?"
// (upgrade to Business) and the "Happy Monday" daily reminder (recording
// 2026-11-02). On a Checkout boot the receipt now owns the screen: the daily
// reminder and the upgrade nudge stand down without being consumed, and the
// shared busy check sees the result modal and both cards.
//
//   node --test tests/checkout-boot-popups.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const DESK_SRC = fs.readFileSync(path.join(ROOT, "src/drumee/modules/desk/index.js"), "utf8");
const LIB_PATH = path.join(ROOT, "src/drumee/libs/checkout-return.js");

// A fresh copy of the lib per test: it caches its one read per page.
function freshLib(search) {
  global.window = { location: { search } };
  global.location = { pathname: "/-/", hash: "#/desk/" };
  global.history = { state: null, replaced: [], replaceState(s, t, url) { this.replaced.push(url); } };
  delete require.cache[require.resolve(LIB_PATH)];
  return require(LIB_PATH);
}

// Evaluate a real desk method with `require` answering the webpack aliases.
function method(sig, lib, extra = {}) {
  const src = sliceFunction(DESK_SRC, sig);
  const fakeRequire = (m) => {
    if (m === "libs/checkout-return") return lib;
    if (m in extra) return extra[m];
    throw new Error(`unexpected require ${m}`);
  };
  return new Function("require", `return (${src});`)(fakeRequire);
}

// ── the lib ────────────────────────────────────────────────────────────────

test("lib reads ?checkout once, scrubs it, and caches the answer", () => {
  const lib = freshLib("?checkout=success&session_id=cs_1&x=1");
  assert.deepEqual(lib.get(), { result: "success", session_id: "cs_1" });
  assert.deepEqual(global.history.replaced, ["/-/?x=1#/desk/"]);
  global.window.location.search = "?x=1"; // what the browser now shows
  assert.equal(lib.isCheckoutBoot(), true, "a later caller still knows");
  assert.equal(global.history.replaced.length, 1, "scrubbed once");
});

test("lib: an ordinary boot is not a Checkout boot", () => {
  const lib = freshLib("");
  assert.equal(lib.get(), null);
  assert.equal(lib.isCheckoutBoot(), false);
});

test("lib counts the result modal open/closed", () => {
  const lib = freshLib("");
  assert.equal(lib.isModalOpen(), false);
  lib.setModalOpen(true);
  assert.equal(lib.isModalOpen(), true);
  lib.setModalOpen(false);
  lib.setModalOpen(false);
  assert.equal(lib.isModalOpen(), false, "never goes negative");
});

test("lib: whenResultDone is 'none' on an ordinary boot", async () => {
  const lib = freshLib("");
  assert.equal(await lib.whenResultDone(), "none");
});

test("lib: whenResultDone waits for the modal to open AND close → 'closed'", async () => {
  const lib = freshLib("?checkout=success&session_id=cs_1");
  let how = null;
  const p = lib.whenResultDone().then((h) => { how = h; });
  await Promise.resolve();
  assert.equal(how, null, "still waiting before the modal opened");
  lib.setModalOpen(true);
  await Promise.resolve();
  assert.equal(how, null, "still waiting while it is up");
  lib.setModalOpen(false);
  await p;
  assert.equal(how, "closed");
  assert.equal(await lib.whenResultDone(), "closed", "late askers get the answer at once");
});

test("lib: a modal action headed for Billing resolves 'left'", async () => {
  const lib = freshLib("?checkout=success&session_id=cs_1");
  lib.setModalOpen(true);
  const p = lib.whenResultDone();
  lib.leftForBilling();
  lib.setModalOpen(false);
  assert.equal(await p, "left");
});

test("lib: a modal that never appears resolves 'timeout'", async () => {
  const lib = freshLib("?checkout=cancel");
  assert.equal(await lib.whenResultDone({ openTimeout: 10 }), "timeout");
});

// ── _homePopupsBusy ───────────────────────────────────────────────────────────

function busyWith({ lib, flags = {}, open = [] }) {
  global.window.Wm = {
    getItemsByKind: (k) => (open.includes(k) ? [{ isDestroyed: () => false }] : []),
  };
  global.Wm = global.window.Wm;
  const fn = method("_homePopupsBusy()", lib);
  return fn.call({ ...flags });
}

test("busy: the Payment result modal counts", () => {
  const lib = freshLib("");
  assert.equal(busyWith({ lib }), false);
  lib.setModalOpen(true);
  assert.equal(busyWith({ lib }), true);
});

test("busy: an open daily reminder or upgrade nudge counts", () => {
  const lib = freshLib("");
  assert.equal(busyWith({ lib, open: ["daily_reminder_popup"] }), true);
  assert.equal(busyWith({ lib, open: ["upgrade_nudge_popup"] }), true);
});

test("busy: either card's in-flight fetch counts", () => {
  const lib = freshLib("");
  assert.equal(busyWith({ lib, flags: { _dailyReminderInFlight: true } }), true);
  assert.equal(busyWith({ lib, flags: { _upgradeNudgeInFlight: true } }), true);
});

// ── the two boot cards stand down on a Checkout boot ─────────────────────────

test("upgrade nudge: no server call on a Checkout boot (the grant is not burned)", async () => {
  const lib = freshLib("?checkout=success&session_id=cs_1");
  global.SERVICE = { payment: { upgrade_nudge_state: "payment.upgrade_nudge_state" } };
  const fn = method("async _maybeShowUpgradeNudge()", lib, {
    "libs/over-limit": { enforcementOn: () => false, isLocked: () => false },
  });
  let fetched = 0;
  const self = {
    _homePopupsBusy: () => false,
    fetchService: async () => { fetched++; return {}; },
    _openUpgradeNudgePopup: async () => {},
  };
  await fn.call(self);
  assert.equal(fetched, 0);
});

test("upgrade nudge: holds the slot during its fetch and releases it after", async () => {
  const lib = freshLib("");
  global.SERVICE = { payment: { upgrade_nudge_state: "payment.upgrade_nudge_state" } };
  global.Visitor = { id: "u1" };
  const fn = method("async _maybeShowUpgradeNudge()", lib, {
    "libs/over-limit": { enforcementOn: () => false, isLocked: () => false },
  });
  let duringFetch = null;
  let opened = 0;
  const self = {
    _homePopupsBusy: () => false,
    fetchService: async () => { duringFetch = self._upgradeNudgeInFlight; return { show: 1, trigger: "age_14d" }; },
    _openUpgradeNudgePopup: async () => { opened++; },
  };
  await fn.call(self);
  assert.equal(duringFetch, true);
  assert.equal(opened, 1);
  assert.equal(self._upgradeNudgeInFlight, false);
});

test("daily reminder: a Checkout boot shows nothing and does not consume the day", async () => {
  const lib = freshLib("?checkout=success&session_id=cs_1");
  let marked = 0;
  const Popup = { dayKey: () => "2026-11-02", alreadyShownToday: () => false, markShownToday: () => { marked++; } };
  const fn = method("async _maybeShowDailyReminder()", lib, {
    "builtins/widget/daily-reminder-popup": Popup,
  });
  let waited = 0;
  const self = {
    _waitForWm: async () => { waited++; return true; },
    _waitForHomePopups: async () => true,
    _showDailyReminder: async () => { marked++; },
  };
  await fn.call(self);
  assert.equal(marked, 0);
  assert.equal(waited, 0);
});

test("daily reminder: waits for the home popups, then shows while holding the slot", async () => {
  const lib = freshLib("");
  const Popup = { dayKey: () => "2026-11-02", alreadyShownToday: () => false, markShownToday: () => {} };
  const fn = method("async _maybeShowDailyReminder()", lib, {
    "builtins/widget/daily-reminder-popup": Popup,
  });
  const order = [];
  const self = {
    _waitForWm: async () => true,
    _waitForHomePopups: async () => { order.push("wait"); return true; },
    _showDailyReminder: async () => { order.push(`show:${self._dailyReminderInFlight}`); },
  };
  await fn.call(self);
  assert.deepEqual(order, ["wait", "show:true"]);
  assert.equal(self._dailyReminderInFlight, false);
});

test("daily reminder: popups never cleared → nothing shown, day not consumed", async () => {
  const lib = freshLib("");
  const Popup = { dayKey: () => "2026-11-02", alreadyShownToday: () => false, markShownToday: () => {} };
  const fn = method("async _maybeShowDailyReminder()", lib, {
    "builtins/widget/daily-reminder-popup": Popup,
  });
  let shown = 0;
  const self = {
    _waitForWm: async () => true,
    _waitForHomePopups: async () => false,
    _showDailyReminder: async () => { shown++; },
  };
  await fn.call(self);
  assert.equal(shown, 0);
});
