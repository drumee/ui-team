// tests/signin-handoff.test.js — sign-in / sign-out across accounts on one origin.
//
// Recording 2026-11-06 17:06:
//  1. Signing in at drumee.in showed the warm-up screen TWICE: the "ok" branch
//     of checkLoginStatus never stored the organisation the login answer
//     carries, so router.route() compared the host with the MAIN domain's org,
//     booted the desk on drumee.in, and only then moved to the org's host.
//  2. Signing out kept the address bar's last location (#/desk/wm/o/<nid>/<hub>)
//     — `location.hostname = main_domain` keeps path AND hash — so the NEXT
//     account signing in opened the previous account's workspace link and got
//     "You can't open this link: this account isn't a member of its workspace".
//
//   node --test tests/signin-handoff.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC = (p) => fs.readFileSync(path.join(__dirname, "../src/drumee", p), "utf8");

test("login ok: the organisation is stored BEFORE gotSignedIn", () => {
  const src = SRC("modules/welcome/signin/index.js");
  const start = src.indexOf('case "ALREADY_SIGNED_IN":');
  const end = src.indexOf("return this.gotSignedIn(data);", start);
  assert.ok(start > 0 && end > start);
  const branch = src.slice(start, end);
  assert.match(branch, /Organization\.set\(/, "Organization.set in the ok branch");
});

test("sign-out does not carry the previous account's location", () => {
  const src = SRC("router/butler/index.js");
  const body = src.slice(src.indexOf("async logout()"), src.indexOf("async logout()") + 4000);
  assert.doesNotMatch(body, /location\.hostname\s*=\s*main_domain/, "no hash-keeping host switch");
  assert.match(body, /signedOutUrl\(/, "builds a hash-less sign-out URL");
});

test("signedOutUrl drops the hash and keeps path + search", () => {
  const { signedOutUrl } = require("../src/drumee/libs/session-guard.js");
  const loc = { protocol: "https:", hostname: "yipejo5194.drumee.in", pathname: "/-/huan/",
    search: "?x=1", hash: "#/desk/wm/o/5f58d9065f58d90b/5eac7c405eac7c44/folder" };
  assert.equal(signedOutUrl(loc, "drumee.in"), "https://drumee.in/-/huan/?x=1");
  assert.equal(signedOutUrl({ ...loc, search: "" }, "drumee.in"), "https://drumee.in/-/huan/");
  assert.equal(signedOutUrl(loc, ""), "https://yipejo5194.drumee.in/-/huan/?x=1", "no main domain: stay");
});

test("sign-out drops a link armed on this origin (file-deep-link)", () => {
  const src = SRC("router/butler/index.js");
  const body = src.slice(src.indexOf("async logout()"), src.indexOf("async logout()") + 4000);
  const clear = body.indexOf('require("libs/file-deep-link").clear()');
  const start = body.indexOf("Drumee.start();");
  assert.ok(clear > 0 && clear < start, "cleared before the restart / redirect");
});
