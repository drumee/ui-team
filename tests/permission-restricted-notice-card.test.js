// Every message the workspace-members panel raises lands on the same card.
//
// THE REPORT (screenshots, 2026-09-08): the invite-sent toast and the invite
// FAILURE message were visibly different widths and paddings, from the same
// panel, one after the other.
//
// Wm.alert(someString) builds a bare {kind:"window_info", message} with no
// `variant`, and the notice block in window/info/skin is what sets
// `min-width: unset`. Without it the card inherits `.window__ui`'s
// `min-width: 600px`, which floors its declared 500px — measured against the
// real compiled skin:
//
//   plain    rendered=600px  width=600px  min-width=600px  padding=0px
//   notice   rendered=550px  width=500px  min-width=0px    padding=20px 24px 24px
//
// The success toast passed the object form; every failure passed a string.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const PANEL = "src/drumee/builtins/permission/restricted/index.js";
const SRC = readFileSync(join(__dirname, "..", PANEL), "utf8");

test("no message bypasses _notice", () => {
  // The helper itself is the one legitimate Wm.alert; anything else is a
  // message that would render on the 600px card.
  const calls = [...SRC.matchAll(/^[^*\n]*\bWm\.alert\(/gm)].map((m) => m[0].trim());
  assert.deepEqual(calls, ["return Wm.alert("],
    `only _notice may call Wm.alert directly; found: ${calls.join(" | ")}`);
});

test("the panel actually has messages to route", () => {
  // Guards the test above against passing because the calls were all deleted.
  const routed = SRC.match(/this\._notice\(/g) || [];
  assert.ok(routed.length >= 6,
    `expected the panel's messages to go through _notice, found ${routed.length}`);
});

test("_notice asks for the notice card, not a plain body", () => {
  const from = SRC.indexOf("\n  _notice(");
  assert.ok(from > 0, "_notice is missing");
  const body = SRC.slice(from, SRC.indexOf("\n  }", from));
  // `kind` set is what makes alert feed the object verbatim rather than
  // wrapping it as a body — without it the variant never reaches the card.
  assert.match(body, /kind:\s*"window_info"/);
  assert.match(body, /variant:\s*"notice"/);
  assert.match(body, /service:\s*_e\.close/, "the card needs a way to be dismissed");
});

test("the remove-member confirm asks for no backdrop", () => {
  // The prompt names a member whose row is in the matrix behind it; scrimming
  // the panel hides the one thing worth checking before answering.
  const from = SRC.indexOf("async _removeMember(");
  assert.ok(from > 0, "_removeMember is missing");
  const body = SRC.slice(from, SRC.indexOf("\n  }", SRC.indexOf("Wm.confirm", from)));
  assert.match(body, /overlay:\s*"none"/);
});
