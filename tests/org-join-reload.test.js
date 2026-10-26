// The desk reloads when the server makes us an organisation member (or stops
// that) through a workspace we joined or left -- server lib/org-membership
// pushes hub.org_joined / hub.org_left. Plan, quota, org tab and Admin
// Console gates are frozen in Visitor at bootstrap, so a reload is the one
// way to apply the new plan, the same as payment.org_provisioned.
//
// Run: node --test tests/org-join-reload.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const push = fs.readFileSync(path.join(ROOT, "src/drumee/modules/desk/wm/push.js"), "utf8");

test("both pushes are handled next to the other membership pushes", () => {
  for (const svc of ["hub.org_joined", "hub.org_left"]) {
    const at = push.indexOf(`case "${svc}":`);
    assert.ok(at > 0, svc);
    const body = push.slice(at, push.indexOf("return;", at));
    assert.match(body, /location\.reload\(\)/, svc);
    assert.match(body, /Visitor\.respawn\(\{ quota: data\.quota \}\)/, svc);
    assert.match(body, /Wm\.alert\(LOCALE\./, svc);
  }
  assert.ok(push.indexOf('case "hub.org_joined":') > push.indexOf('case "hub.member_removed":'));
});

test("the two messages exist in all six locales, the join one names the organisation", () => {
  for (const lang of ["en", "es", "fr", "km", "ru", "zh"]) {
    const l = JSON.parse(fs.readFileSync(path.join(ROOT, "locale", `${lang}.json`), "utf8"));
    assert.equal(typeof l.ORG_JOINED_RELOAD, "string", lang);
    assert.ok(l.ORG_JOINED_RELOAD.includes("{0}"), lang);
    assert.equal(typeof l.ORG_LEFT_RELOAD, "string", lang);
  }
});
