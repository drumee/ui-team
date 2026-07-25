const { test } = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const KEYS = [
  "REWARD_FLOW_STEP1_TITLE",
  "REWARD_FLOW_STEP1_DESC",
  "REWARD_FLOW_STEP2_TITLE",
  "REWARD_FLOW_STEP2_DESC",
  "REWARD_FLOW_STEP3_TITLE",
  "REWARD_FLOW_STEP3_DESC",
  "REWARD_FLOW_CONTINUE",
  "REWARD_FLOW_UPLOAD",
  "REWARD_FLOW_INVITE",
  "REWARD_FLOW_WAITING_WORKSPACE",
  "REWARD_FLOW_WAITING_UPLOAD",
  "REWARD_FLOW_WAITING_INVITE",
  "REWARD_FLOW_GUIDE_ADD",
  "REWARD_FLOW_GUIDE_MENU",
  "REWARD_FLOW_GUIDE_FORM",
  "REWARD_FLOW_GUIDE_PERM",
  "REWARD_FLOW_GUIDE_PERM_INTERNAL",
  "REWARD_FLOW_GUIDE_PERM_EXTERNAL",
  "REWARD_FLOW_DROP_TITLE",
  "REWARD_FLOW_DROP_DESC",
  "REWARD_FLOW_DROP_LEAVE",
  "REWARD_FLOW_CONGRATS_TITLE",
  "REWARD_FLOW_CONGRATS_LEAD",
  "REWARD_FLOW_CONGRATS_PRIZE",
  "REWARD_FLOW_CONGRATS_TAIL",
  "REWARD_FLOW_GO_DASHBOARD",
];

const LOCALES = ["en", "fr", "es", "ru", "km", "zh"];

for (const lang of LOCALES) {
  test(`locale/${lang}.json has every REWARD_FLOW key`, () => {
    const path = join(__dirname, "..", "..", "locale", `${lang}.json`);
    const dict = JSON.parse(readFileSync(path, "utf8"));
    for (const k of KEYS) {
      assert.ok(
        typeof dict[k] === "string" && dict[k].length > 0,
        `${lang}.json is missing a non-empty ${k}`,
      );
    }
  });
}

test("BACK already exists in en.json and is reused, not redefined", () => {
  const path = join(__dirname, "..", "..", "locale", "en.json");
  const dict = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(dict.BACK, "Back");
});
