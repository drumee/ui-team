// tests/tasks-activity-icons.test.js — the Activity tab glyphs (Figma
// 944:107305: ChatCircleDots on Comments, ArrowCounterClockwise on History)
// are symbols of the normalized sprite the tabs draw from.
//
//   node --test tests/tasks-activity-icons.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sprite = fs.readFileSync(
  path.join(__dirname, "../icons/sprites/normalized.sprite.svg"),
  "utf8",
);

test("activity tab icons are in the normalized sprite", () => {
  for (const id of ["ph-chat-circle-dots", "ph-arrow-counter-clockwise"]) {
    assert.ok(sprite.includes(`id="--icon-${id}"`), id);
  }
});
