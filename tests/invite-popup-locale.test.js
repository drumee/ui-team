// Every string the Drumee 2.0 invite popup adds must exist, non-empty, in all
// six shipped locales — a missing key renders as its own name.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const LANGS = ["en", "es", "fr", "km", "ru", "zh"];
const KEYS = [
  "INVITE_VIA_EMAIL", "INVITE_PUBLIC_LINK", "INVITE_TO",
  "INVITE_DEPARTMENTS", "INVITE_WORKSPACE_ONE", "INVITE_WORKSPACE_OTHER",
  "INVITE_LINK_EXPIRATION", "INVITE_GET_LINK", "INVITE_REVOKE",
  "INVITE_EXPIRY_1H", "INVITE_EXPIRY_24H", "INVITE_EXPIRY_7D",
  "INVITE_NO_WORKSPACE", "INVITE_WORKSPACE_TITLE",
];

for (const lang of LANGS) {
  test(`${lang}.json carries every invite-popup key`, () => {
    const t = require(path.join(__dirname, "..", "locale", `${lang}.json`));
    for (const k of KEYS) {
      assert.equal(typeof t[k], "string", `${lang}: missing ${k}`);
      assert.ok(t[k].trim(), `${lang}: empty ${k}`);
    }
  });
}
