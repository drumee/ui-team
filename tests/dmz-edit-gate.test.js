// The share's edit gate (libs/dmz-edit-gate), as the editors meet it.
//
//   node --test tests/dmz-edit-gate.test.js
//
// In a secure share an edit needs an identity and the edit grant: an anonymous
// visitor meets the sign-up overlay, a signed-in recipient without the grant
// the Request Access popup, the creator or a granted recipient proceeds. The
// server's read-only ceiling refuses the others' writes anyway — without the
// gate they type, nothing is saved, and they are not told why.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { sliceFunction } = require("./helpers/slice-method.js");

const ROOT = resolve(__dirname, "..");
global._K = { permission: { write: 2 } };
global._a = { privilege: "privilege", open: "open" };
const gate = require("../src/drumee/libs/dmz-edit-gate.js");

// The REAL sharebox methods, run against a stub `this`.
const sbSrc = readFileSync(resolve(ROOT, "src/drumee/modules/dmz/sharebox/index.js"), "utf8");
const gateFor = eval(`(${sliceFunction(sbSrc, "_gateFor(hasGrant)")})`);
// The secure-share rebuild adds a `level` argument (the access a Request
// Access popup asks for); accept either signature.
const gateSig = sbSrc.includes("\n  _gateInteraction(hasGrant, level) {")
  ? "_gateInteraction(hasGrant, level)"
  : "_gateInteraction(hasGrant)";
const gateInteraction = eval(`(${sliceFunction(sbSrc, gateSig)})`);

function sharebox({ authenticated = true, uid = "u2", creator = "u1", write = false } = {}) {
  const shown = [];
  const m = { is_authenticated: authenticated, uid, creator_id: creator, privilege: write ? 2 : 1 };
  return {
    shown,
    mget: (k) => m[k],
    havePermission: (bit, priv) => (priv & bit) === bit,
    showSignupRequiredOverlay: () => shown.push("signup"),
    showRequestAccessPopup: () => shown.push("request"),
    _gateFor: gateFor,
    _gateInteraction: gateInteraction,
  };
}

test("the sharebox gate answers as before: anonymous → sign-up, no grant → request, owner/granted → proceed", () => {
  const cases = [
    [{ authenticated: false, write: true }, true, "signup"],
    // a PUBLIC share binds a guest to the creator: still anonymous first
    [{ authenticated: false, uid: "u1", creator: "u1", write: true }, true, "signup"],
    [{ uid: "u1", creator: "u1" }, false, null],
    [{ write: false }, true, "request"],
    [{ write: true }, false, null],
  ];
  for (const [who, gated, shown] of cases) {
    const sb = sharebox(who);
    const grant = sb.havePermission(2, sb.mget("privilege"));
    assert.equal(sb._gateFor(grant) != null, gated, JSON.stringify(who));
    assert.equal(sb.shown.length, 0, "_gateFor shows nothing");
    assert.equal(sb._gateInteraction(grant), gated, JSON.stringify(who));
    assert.deepEqual(sb.shown, shown ? [shown] : []);
  }
});

test("editWouldBeGated asks without showing anything", () => {
  const anon = sharebox({ authenticated: false });
  assert.equal(gate.editWouldBeGated(anon), true);
  assert.deepEqual(anon.shown, []);
  assert.equal(gate.editWouldBeGated(sharebox({ write: true })), false);
  assert.equal(gate.editWouldBeGated(null), false, "outside a share");
  assert.equal(gate.editWouldBeGated({ _gateInteraction() {} }), false, "a sharebox without _gateFor changes nothing");
});

test("only keys that mean editing are gated; reading keys never are", () => {
  const k = (key, mods = {}) => gate.isEditIntentKey({ key, ...mods });
  for (const key of ["a", "Z", "1", " ", "Enter", "Backspace", "Delete"]) assert.ok(k(key), key);
  assert.ok(k("v", { ctrlKey: true }) && k("x", { metaKey: true }), "paste and cut");
  for (const key of ["ArrowLeft", "Home", "PageDown", "Tab", "Escape", "F5", "Shift"]) assert.ok(!k(key), key);
  assert.ok(!k("c", { ctrlKey: true }) && !k("a", { ctrlKey: true }) && !k("f", { metaKey: true }), "copy / select all / find");
  assert.ok(!k("a", { altKey: true }));
});

test("the share's sharebox is found on its window manager, and nowhere else", () => {
  const desk = sharebox();
  const dmzWm = { isDmz: 1, mget: (k) => (k === "desk" ? desk : null) };
  assert.equal(gate.shareDesk(null, dmzWm), desk);
  assert.equal(gate.shareDesk({ mget: () => desk }, null), null, "a desk window is not a share");
  assert.equal(gate.shareDesk({ isDmz: 1, mget: () => ({}) }), null, "no gate on it");
});

test("the gate re-arms, but never re-fires while it is on screen or within 800 ms", () => {
  const sb = sharebox({ authenticated: false });
  const holder = {};
  assert.equal(gate.gateEdit(sb, holder), true);
  assert.deepEqual(sb.shown, ["signup"]);
  assert.equal(gate.gateEdit(sb, holder), true, "a burst is still stopped");
  assert.deepEqual(sb.shown, ["signup"], "…without a second overlay");
  holder._dmzEditGatedAt -= 1000;
  sb.__signupOverlay = { el: { dataset: { mode: "open" } } };
  assert.equal(gate.gateEdit(sb, holder), true);
  assert.deepEqual(sb.shown, ["signup"], "not while the overlay is open");
  sb.__signupOverlay.el.dataset.mode = "closed";
  gate.gateEdit(sb, holder);
  assert.deepEqual(sb.shown, ["signup", "signup"], "the same answer on the next try");
  const granted = sharebox({ write: true });
  assert.equal(gate.gateEdit(granted, {}), false, "a granted recipient proceeds");
  assert.deepEqual(granted.shown, []);
});

test("both editors go through the shared gate", () => {
  const md = readFileSync(resolve(ROOT, "src/drumee/builtins/editor/markdow/index.js"), "utf8");
  assert.match(md, /require\("libs\/dmz-edit-gate"\)/);
  assert.match(md, /if \(!isEditIntentKey\(e\)\) return;\s*\/\/[^\n]*\n[^\n]*\n\s*if \(gateEdit\(desk, this\)\) e\.preventDefault\(\);/);
  assert.ok(!/EDIT_INTENT_KEYS|_isEditIntentKey/.test(md), "no second copy left in the markdown editor");
  const bn = readFileSync(resolve(ROOT, "src/drumee/builtins/editor/blocknote/index.js"), "utf8");
  assert.match(bn, /require\("libs\/dmz-edit-gate"\)/);
  assert.match(bn, /if \(editWouldBeGated\(this\._shareDesk\(\)\)\) return true;/);
  assert.match(bn, /this\._wireShareEditGate\(this\._state\);/);
});
