// tests/checkout-return-lands-on-billing.test.js — back from Stripe Checkout
// the desk lands on Billing and shows the result card over it (not over the
// workspace), with the Calendar modal's backdrop: no scrim/blur, the page
// behind faded to 20%.
//
//   node --test tests/checkout-return-lands-on-billing.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const WM_SRC = read("src/drumee/modules/desk/wm/index.js");
const DESK_SRC = read("src/drumee/modules/desk/index.js");
const RESULT_SRC = read("src/drumee/builtins/widget/settings/account/billing/result/index.js");
const DESK_SKIN = read("src/drumee/modules/desk/skin/index.scss");

const flush = () => new Promise((r) => setTimeout(r, 0));

test("Checkout return: Billing opens FIRST, the card is fed only once it is open", async () => {
  const log = [];
  let opened = null;
  global.RADIO_BROADCAST = { trigger: (ev, opt) => { log.push(ev); opened = opt; } };
  global.Kind = { waitFor: async () => true };
  const part = { el: { dataset: { overlay: "blur" } }, feed: (o) => log.push(`feed:${o.kind}:${o.result}`) };
  const fn = new Function("require", `return (${sliceFunction(WM_SRC, "checkCheckoutReturn()")});`)(
    (m) => {
      if (m === "libs/checkout-return") return { get: () => ({ result: "success", session_id: "cs_1" }) };
      throw new Error(`unexpected require ${m}`);
    },
  );
  fn.call({ ensurePart: async () => part });
  await flush();
  assert.deepEqual(log, ["desk:open-billing-page"], "no card before Billing is open");
  assert.equal(opened.noTrack, 1, "an automatic open is not an upgrade CTA");
  opened.onOpened(); // the desk reports Billing open
  await flush(); await flush();
  assert.deepEqual(log, ["desk:open-billing-page", "feed:settings_billing_result:success"]);
  assert.equal(part.el.dataset.overlay, "none", "no blur / scrim left over from another dialog");
});

test("not a Checkout boot: nothing opens", () => {
  const log = [];
  global.RADIO_BROADCAST = { trigger: (ev) => log.push(ev) };
  const fn = new Function("require", `return (${sliceFunction(WM_SRC, "checkCheckoutReturn()")});`)(
    () => ({ get: () => null }),
  );
  fn.call({ ensurePart: async () => ({}) });
  assert.deepEqual(log, []);
});

test("openBillingPage: noTrack skips the cta_click, and never reaches the panel", async () => {
  const posted = [];
  const toggled = [];
  global.LOCALE = {};
  global.Visitor = { id: "u1" };
  global.SERVICE = { desk: { cta_click: "desk.cta_click" } };
  global.RADIO_BROADCAST = { trigger: () => {} };
  global.Kind = { waitFor: async () => true };
  const fn = new Function(`return (${sliceFunction(DESK_SRC, "openBillingPage(preselect)")});`)();
  const self = {
    postService: (s) => { posted.push(s); return Promise.resolve(); },
    _showBillingLoader() {}, _hideBillingLoader() {}, _lightRestoredRow() {},
    togglePanel: async (k, pn, a, opt) => { toggled.push(opt); },
  };
  await fn.call(self, { noTrack: 1 });
  assert.deepEqual(posted, []);
  assert.deepEqual(toggled, [{ page: 1 }]);
  await fn.call(self, {});
  assert.deepEqual(posted, ["desk.cta_click"]);
});

test("the card stamps WHAT it sits on: 'screen' over Billing, 'pane' over the workspace", () => {
  const root = { dataset: {} };
  global.document = { querySelector: (q) => (q === ".desk-module" ? root : null) };
  global._ = { isFunction: (f) => typeof f === "function" };
  const stamp = new Function(`return (${sliceFunction(RESULT_SRC, "_stampDesk(on)")});`)();
  global.window = { Desk: { _mainScreenOnTop: () => true } };
  stamp.call({}, true);
  assert.equal(root.dataset.billingResult, "screen");
  global.window = { Desk: { _mainScreenOnTop: () => false } };
  stamp.call({}, true);
  assert.equal(root.dataset.billingResult, "pane");
  stamp.call({}, false);
  assert.equal(root.dataset.billingResult, undefined);
  assert.match(sliceFunction(RESULT_SRC, "async onDomRefresh()"), /this\._stampDesk\(true\);/);
  assert.match(sliceFunction(RESULT_SRC, "onBeforeDestroy()"), /this\._stampDesk\(false\);/);
});

// THE GHOSTING (2026-11-05): with the Billing slot at 20% the workspace pane
// beneath it showed through. Over a screen, that layer is hidden.
test("backdrop over a screen: the screen fades, the workspace beneath is HIDDEN", () => {
  const block = DESK_SKIN.slice(DESK_SKIN.indexOf('.desk-module[data-billing-result="screen"]'));
  const screen = block.slice(0, block.indexOf('.desk-module[data-billing-result="pane"]'));
  assert.match(screen, /\.desk-module__settings-main-slot\s*\{\s*opacity: 0\.2;\s*transition: opacity 0\.15s ease;/);
  // opacity too — `visibility: hidden` alone is undone by any descendant
  // setting `visibility: visible`, which is how the ghosting survived f63a2099c.
  assert.match(screen, /\.window-manager__layer:not\(\.upload-progress-layer\):not\(\.meeting-toast-layer\)\s*\{\s*visibility: hidden;\s*opacity: 0;\s*pointer-events: none;/);
  assert.doesNotMatch(screen, /headless\s*\{\s*opacity/, "the pane is not merely faded under a screen");
});

test("backdrop over the workspace: the pane fades (Calendar values)", () => {
  const block = DESK_SKIN.slice(DESK_SKIN.indexOf('.desk-module[data-billing-result="pane"]'));
  assert.match(block, /\.window-manager__layer\.headless\s*\{\s*opacity: 0\.2;\s*transition: opacity 0\.15s ease;/);
  assert.doesNotMatch(DESK_SKIN, /data-billing-result="1"/, "the old all-layers rule is gone");
});
