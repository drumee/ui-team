// tests/checkout-receipt-survives-workspace-load.test.js — back from Checkout
// (stage recording 2026-11-04 20:37, OFFER_CARD_USED), the result modal was fed
// into wm's wrapper-modal at boot+1.2s, started its payment.checkout_result
// fetch, and ~60ms later the boot's own loadWorkspace cleared the wrapper-modal.
// The fetch then fed a destroyed view: no modal, no error. Workspace loads now
// leave settings_billing_result alone, and the widget stops if it was removed
// while the receipt was in flight.
//
//   node --test tests/checkout-receipt-survives-workspace-load.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const WM_SRC = read("src/drumee/modules/desk/wm/index.js");
const RESULT_SRC = read("src/drumee/builtins/widget/settings/account/billing/result/index.js");

global._ = { isFunction: (f) => typeof f === "function" };
global._a = { kind: "kind", hub_id: "hub_id", service: "service" };

function method(src, sig, scope = {}) {
  const names = Object.keys(scope);
  return new Function(...names, `return (${sliceFunction(src, sig)});`)(...names.map((n) => scope[n]));
}

const model = (attrs) => ({ get: (k) => attrs[k] });
const part = (...kinds) => ({ collection: kinds.map((kind) => model({ kind, hub_id: "h1" })) });

// ── wm: the guard ─────────────────────────────────────────────────────────────

const holdsResult = method(WM_SRC, "_modalHoldsBillingResult(p)");

test("the guard recognises the result modal, and only it", () => {
  assert.equal(holdsResult.call({}, part("settings_billing_result")), true);
  assert.equal(holdsResult.call({}, part("permission_restricted")), false);
  assert.equal(holdsResult.call({}, part()), false);
  assert.equal(holdsResult.call({}, null), false);
});

// ── wm: both workspace-load clears consult it ─────────────────────────────────

// The two clear sites, read from the source: each must skip the clear for the
// result modal. Sliced as text because loadWorkspace / loadWorkspaceNode are
// long async flows over the window pool, not something to stub whole.
function clearBlocks(src) {
  const blocks = [];
  const re = /this\.ensurePart\("wrapper-modal"\)\.then\(\(p\) => \{([\s\S]*?)\n\s*\}\);/g;
  let m;
  while ((m = re.exec(src))) if (/p\.clear\(\)/.test(m[1])) blocks.push(m[1]);
  return blocks;
}

test("loadWorkspace's clear keeps the receipt (and still keeps the access panel)", () => {
  const body = sliceFunction(WM_SRC, "loadWorkspace(workspace)");
  const blocks = clearBlocks(body);
  assert.equal(blocks.length, 1, "one wrapper-modal clear in loadWorkspace");
  assert.match(blocks[0], /_modalHoldsAccessPanelFor\(p, hub_id\)\) return;/);
  assert.match(blocks[0], /_modalHoldsBillingResult\(p\)\) return;[\s\S]*p\.clear\(\)/);
});

test("loadWorkspaceNode's clear keeps the receipt too", () => {
  const body = sliceFunction(WM_SRC, "loadWorkspaceNode(node)");
  const blocks = clearBlocks(body);
  assert.equal(blocks.length, 1, "one wrapper-modal clear in loadWorkspaceNode");
  assert.match(blocks[0], /_modalHoldsBillingResult\(p\)\) return;[\s\S]*p\.clear\(\)/);
});

test("run the guarded clear: receipt kept, a create dialog still cleared", () => {
  // Same shape as the loadWorkspace block, executed for real.
  const run = (p) => {
    const self = {
      _modalHoldsAccessPanelFor: () => false,
      _modalHoldsBillingResult: holdsResult,
    };
    let cleared = 0;
    p.clear = () => { cleared++; };
    const block = clearBlocks(sliceFunction(WM_SRC, "loadWorkspace(workspace)"))[0];
    new Function("p", "hub_id", block).call(self, p, "h1");
    return cleared;
  };
  assert.equal(run(part("settings_billing_result")), 0);
  assert.equal(run(part("media_form")), 1);
});

// ── result widget: removed mid-fetch → stop, do not feed a dead view ──────────

test("the result modal does not feed itself after being destroyed mid-fetch", async () => {
  const fn = method(RESULT_SRC, "async onDomRefresh()", {
    offerStatusMessage: () => null,
    require: (m) => {
      if (m === "libs/checkout-return") return { setModalOpen() {} };
      if (m === "./skeleton") return { default: () => "skeleton" };
      throw new Error(`unexpected require ${m}`);
    },
  });
  global.SERVICE = { payment: { checkout_result: "payment.checkout_result" } };
  global.Visitor = { id: "u1" };
  let destroyed = false;
  let fed = 0;
  const self = {
    _result: "success",
    _sessionId: "cs_1",
    _stampDesk() {},
    _installBackdropDismiss() {},
    isDestroyed: () => destroyed,
    // The workspace load clears the host while this is in flight.
    fetchService: async () => { destroyed = true; return { status: "OFFER_CARD_USED" }; },
    feed: () => { fed++; },
  };
  await fn.call(self);
  assert.equal(fed, 0);

  // Control: alive → it paints.
  destroyed = false;
  const alive = { ...self, fetchService: async () => ({ status: "OFFER_CARD_USED", offer_code: "TEAM1" }) };
  await fn.call(alive);
  assert.equal(fed, 1);
  assert.equal(alive._result, "offer_card_used");
});
