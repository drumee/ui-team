// desk-mobile-no-new-btn.test.js — the phone's Files action row keeps its
// search pill but no longer carries its own "+ New" (desk-module__mobile-new-btn).
//
//   node --test tests/desk-mobile-no-new-btn.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const SRC = path.join(__dirname, "..", "src/drumee/modules/desk");

test("the mobile action row builds no + New button", () => {
  const sk = fs.readFileSync(path.join(SRC, "skeleton/index.js"), "utf8");
  const row = sk.slice(sk.indexOf("const _build_mobile_action_row"), sk.indexOf("};", sk.indexOf("const _build_mobile_action_row")));
  assert.ok(row.includes("mobile-search-pill"), "search pill stays");
  assert.doesNotMatch(row, /mobile-new-btn/);
});

test("its skin is gone too", () => {
  const scss = fs.readFileSync(path.join(SRC, "skin/mobile-topbar.scss"), "utf8");
  assert.doesNotMatch(scss, /&__mobile-new-(btn|plus|label)/);
});
