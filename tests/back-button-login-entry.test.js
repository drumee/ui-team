// The browser's Back button must not land a signed-in visitor on the sign-in
// screen (prod 2026-10-28).
//
// THE REPORT: a user inside a sub folder of his workspace pressed Back
// ("précédent") and got an empty workspace -- one with 7 folders in it. The
// tab's history read [sign-in, desk]: signing in entered the desk with
// `location.hash = "#/desk"`, which ADDS an entry, and nothing inside the desk
// adds any (folder navigation rewrites the address with replaceState). Back
// therefore went to the sign-in screen, which saw a signed-in visitor and
// bounced him back into a rebuilt desk that came up on a remembered workspace
// without loading it. Server logs for the session: no folder listing was
// requested for hours; a reload fixed it.
//
// Two locks, checked from the sources:
//  1. welcome enters the desk by REPLACING the sign-in entry (_enterDesk);
//  2. the router keeps a live desk when the address merely wanders back to the
//     bare sign-in screen (_deskStaysForSignedIn), and routes every welcome
//     address that carries arguments as before.
//
// Run: node --test tests/back-button-login-entry.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("the sign-in screen enters the desk by replacing its own history entry", () => {
  const src = read("src/drumee/modules/welcome/index.js");
  // Every way into the desk goes through the one helper...
  assert.equal((src.match(/this\._enterDesk\(/g) || []).length, 3);
  // ...and the helper replaces, never adds.
  const helper = src.slice(src.indexOf("_enterDesk(hash) {"), src.indexOf("async _redeemInviteThenEnter()"));
  assert.match(helper, /location\.replace\(`\$\{location\.pathname\}\$\{location\.search\}\$\{hash\}`\)/);
  // No desk entry is pushed with a hash assignment any more.
  assert.ok(!/location\.hash\s*=\s*_K\.module\.desk/.test(src));
  assert.ok(!/location\.hash\s*=\s*\n?\s*`#\/desk\/wm\/reveal/.test(src));
});

// Run the router guard against a stub, the way the other router tests do.
function guardWith({ online = true, currentKind = "module_desk", destroyed = false, hash = "#/welcome", args = {}, path = ["welcome"], current = "#/desk/wm/o/n1/h1/folder" } = {}) {
  const src = read("src/drumee/router/index.js");
  const start = src.indexOf("  _deskStaysForSignedIn(name) {");
  const end = src.indexOf("\n  }\n", start) + 4;
  const body = src.slice(start, end).replace(/^\s*_deskStaysForSignedIn\(name\)\s*\{/, "function _deskStaysForSignedIn(name) {");
  const calls = { replaced: [], settled: 0, debug: [] };
  const fn = new Function(
    "Visitor", "location", "history", "locationUrl",
    `const self = { currentKind: ${JSON.stringify(currentKind)}, currentModule: { isDestroyed: () => ${destroyed} }, debug: (...a) => __debug.push(a) };
     const __debug = [];
     ${body}
     return { held: _deskStaysForSignedIn.call(self, "welcome"), debug: __debug };`
  );
  const res = fn(
    { isOnline: () => online, parseModuleArgs: () => args, parseModule: () => path },
    { hash, pathname: "/-/", search: "" },
    { state: null, replaceState: (s, t, url) => calls.replaced.push(url) },
    { currentHash: () => current, settle: () => { calls.settled++; } },
  );
  return { ...res, ...calls };
}

test("Back onto the bare sign-in screen keeps the desk and puts the address back", () => {
  for (const hash of ["#/welcome", "#/welcome/", "#/welcome/signin"]) {
    const path = hash.split("/").filter(Boolean).slice(1);
    const r = guardWith({ hash, path });
    assert.equal(r.held, true, hash);
    assert.deepEqual(r.replaced, ["/-/#/desk/wm/o/n1/h1/folder"], hash);
    assert.equal(r.settled, 1, hash);
  }
  // Nowhere in particular: home.
  const r = guardWith({ current: null });
  assert.deepEqual(r.replaced, ["/-/#/desk/wm/home"]);
});

test("a welcome address with a flow behind it still routes", () => {
  const cases = [
    { hash: "#/welcome/signin?invite=abc", args: { invite: "abc" }, path: ["welcome", "signin"] },
    { hash: "#/welcome?contact_accept=x", args: { contact_accept: "x" }, path: ["welcome"] },
    { hash: "#/welcome/back=secret", args: {}, path: ["welcome", "back=secret"] },
    { hash: "#/welcome/signout", args: {}, path: ["welcome", "signout"] },
  ];
  for (const c of cases) {
    const r = guardWith(c);
    assert.equal(r.held, false, c.hash);
    assert.equal(r.replaced.length, 0, c.hash);
  }
});

test("signed out, or no live desk: the sign-in screen is fed as before", () => {
  assert.equal(guardWith({ online: false }).held, false);
  assert.equal(guardWith({ currentKind: "module_welcome" }).held, false);
  assert.equal(guardWith({ currentKind: null }).held, false);
  assert.equal(guardWith({ destroyed: true }).held, false);
});

test("the guard runs before the welcome screen would replace the desk", () => {
  const src = read("src/drumee/router/index.js");
  const load = src.slice(src.indexOf("  loadModule() {"), src.indexOf("  _deskStaysForSignedIn(name) {"));
  const guard = load.indexOf("if (kind === 'module_welcome' && this._deskStaysForSignedIn(name)) return true;");
  assert.ok(guard > 0);
  assert.ok(guard < load.indexOf("p.feed({ kind, name })"));
  assert.match(src, /const locationUrl = require\('libs\/location-url'\);/);
});
