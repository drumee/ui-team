// The settings change-password modal must enforce the SAME password rules as
// the signup form and the server. Exercises the real policy module against
// the real en locale.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const en = require("../locale/en.json");
global.LOCALE = en;

const POLICY = path.join(__dirname, "..", "src/drumee/builtins/widget/settings/password-policy");
const { missingPasswordRules, passwordNeedsMessage } = require(POLICY);

test("a signup-compliant password passes", () => {
  assert.deepEqual(missingPasswordRules("Abcdefg1!"), []);
});

test("8 lowercase letters (the old settings rule) is rejected", () => {
  assert.deepEqual(missingPasswordRules("abcdefgh"), [
    "PW_NEEDS_UPPERCASE",
    "PW_NEEDS_NUMBER",
    "PW_NEEDS_SYMBOL",
  ]);
});

test("the message lists every unmet rule in the user's language", () => {
  assert.equal(
    passwordNeedsMessage(["PW_NEEDS_UPPERCASE", "PW_NEEDS_NUMBER"]),
    "Your password still needs: an uppercase letter, a number"
  );
});

test("a server response without `missing` still shows a message", () => {
  assert.equal(passwordNeedsMessage(undefined), en.PASSWORD_TOO_SHORT);
  assert.equal(passwordNeedsMessage(["PW_NEEDS_SOMETHING_NEW"]), en.PASSWORD_TOO_SHORT);
});

test("every locale carries the rule labels", () => {
  const dir = path.join(__dirname, "..", "locale");
  for (const f of ["en", "es", "fr", "km", "ru", "zh"]) {
    const l = JSON.parse(fs.readFileSync(path.join(dir, `${f}.json`), "utf8"));
    for (const k of ["PASSWORD_STILL_NEEDS", "PW_NEEDS_MIN", "PW_NEEDS_UPPERCASE", "PW_NEEDS_NUMBER", "PW_NEEDS_SYMBOL"]) {
      assert.ok(l[k], `${f}.json is missing ${k}`);
    }
  }
});

// Guards the "KEEP IN STEP" comments: the symbol set and the rule keys must be
// identical in the signup form and the server. Skipped where those checkouts
// are not beside this one.
test("rules match the signup form and the server byte for byte", (t) => {
  const specials = (src) => (src.match(/SPECIALS = (\/.*\/);/) || [])[1];
  const keys = (src) => [...src.matchAll(/(?:key|labelKey): ['"](PW_NEEDS_\w+)['"]/g)].map((m) => m[1]);
  const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
  const mine = read(POLICY + ".js");
  const signup = read("/home/drumee/signup/src/widgets/form/index.js");
  const server = read("/home/drumee/server-team/service/lib/password-policy.js");
  if (!signup || !server) return t.skip("signup/server-team checkouts not found");
  for (const other of [signup, server]) {
    assert.equal(specials(mine), specials(other));
    assert.deepEqual(keys(mine), keys(other));
  }
});
