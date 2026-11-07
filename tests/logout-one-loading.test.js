// tests/logout-one-loading.test.js — one loading screen per sign-out.
//
// Recording 2026-11-07 07:07: sign-out showed the goodbye CARD ("You will be
// shortly disconnected. See you soon!", its own bar) at 0:07.5–0:09, then the
// boot WARM-UP screen at 0:09.5 — two different loading screens in a row. The
// hop from the org host to drumee.in is a real page load, so the warm-up is
// unavoidable; the goodbye step therefore now IS the warm-up picture (same
// backdrop, lockup, track, fill, position), so the two read as one screen, and
// logout leaves as soon as the session is closed instead of holding a full bar
// for another second.
//
//   node --test tests/logout-one-loading.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC = (p) => fs.readFileSync(path.join(__dirname, "../src/drumee", p), "utf8");

test("goodbye skeleton: the warm-up picture, no card", () => {
  const s = SRC("router/butler/skeleton/goodbye.js");
  assert.doesNotMatch(s, /__card`/, "no sign-in card");
  assert.match(s, /sys_pn: "disconnected"/, "logout still awaits this part");
  assert.match(s, /sys_pn: "goodbye-progress"/, "the fill Butler drives");
  assert.match(s, /sys_pn: _a\.loader/);
});

test("goodbye skin: warm-up backdrop and metrics", () => {
  const s = SRC("router/butler/skin/goodbye.scss");
  assert.doesNotMatch(s, /radial-gradient/, "no sign-in backdrop");
  assert.match(s, /#f4f4f6/i, "warm-up background");
  assert.match(s, /position:\s*fixed/);
  assert.match(s, /#d8d6f3/i, "warm-up track");
  assert.match(s, /#433cc5/i, "warm-up fill");
  assert.match(s, /300px/, "warm-up bar length");
});

test("logout does not fill the bar and hold it before leaving", () => {
  const s = SRC("router/butler/index.js");
  const body = s.slice(s.indexOf("async logout()"), s.indexOf("async logout()") + 5000);
  assert.doesNotMatch(body, /_logoutProgress\(100\)/, "no full bar that the next page resets");
  assert.doesNotMatch(body, /Visitor\.timeout\(1000\)/, "no extra second on screen");
});
