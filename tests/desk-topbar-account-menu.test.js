// The topbar account avatar and its dropdown (Figma 59:55943).
//
// Two separate bugs are pinned here, both of which shipped looking fine:
//
//  1. THE AVATAR RENDERED EMPTY. UserProfile draws from `id` and falls back to
//     initials from the name fields. It was given NEITHER, so it painted an
//     empty circle that read as a missing icon rather than a user.
//
//  2. THE MENU WOULD NOT OPEN. UserProfile cannot be a click trigger. Its own
//     skeleton feeds an inner Box.Y with `active: ui.mget(active)`, and
//     ui-core binds a click to every widget whose `active` is not 0 whose
//     handler calls e.stopPropagation() BEFORE triggerHandlers. The inner box
//     ate the click, so the trigger's `service` never fired and the panel
//     never opened. The fix is a still-active wrapper carrying the service,
//     around an `active: 0` profile — which is also what makes the avatar a
//     real circle, since the wrapper owns the mask instead of whichever
//     element UserProfile happens to render.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const TOPBAR = join(ROOT, "src/drumee/modules/desk/skeleton/topbar.js");
const SKIN = join(ROOT, "src/drumee/modules/desk/skin/topbar.scss");
const DESK = join(ROOT, "src/drumee/modules/desk/index.js");

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const topbarSrc = stripComments(readFileSync(TOPBAR, "utf8"));
const skinSrc = readFileSync(SKIN, "utf8");
const deskSrc = stripComments(readFileSync(DESK, "utf8"));

// The userMenu() body, so assertions cannot accidentally match the workspace
// switcher or the "+ New" menu that live in the same file.
function userMenuBody() {
  const start = topbarSrc.indexOf("function userMenu(");
  assert.ok(start > 0, "userMenu() not found in topbar.js");
  const rest = topbarSrc.slice(start);
  const end = rest.indexOf("\nfunction ");
  return end === -1 ? rest : rest.slice(0, end);
}
const menu = userMenuBody();

test("the avatar carries the viewer's identity", () => {
  // Without these UserProfile has nothing to draw and renders an empty circle.
  assert.match(menu, /Visitor\.firstname\(\)/, "firstname must be read");
  assert.match(menu, /Visitor\.lastname\(\)/, "lastname must be read");
  assert.match(menu, /Visitor\.fullname\(\)/, "fullname must be read");
  assert.match(menu, /id:\s*Visitor\.id/, "id must be passed — it selects the avatar image");

  // Both avatars (30px trigger, 40px menu header) draw the same person.
  const spreads = menu.match(/\.\.\.identity/g) || [];
  assert.equal(
    spreads.length,
    2,
    "both the trigger and the menu header avatar must spread the identity",
  );
});

test("the trigger is an active wrapper around an inert profile", () => {
  // The service must sit on the WRAPPER. On the UserProfile it is swallowed by
  // the profile's own inner box before triggerHandlers runs.
  const trigger = menu.slice(menu.indexOf("trigger:"), menu.indexOf("items:"));

  assert.match(
    trigger,
    /Skeletons\.Box\.X\(\{/,
    "the trigger must be a Box, not a UserProfile — a profile cannot emit a click",
  );
  assert.match(
    trigger,
    /service:\s*"open-account-menu"/,
    "the wrapper must carry the service",
  );
  assert.match(
    trigger,
    /Skeletons\.UserProfile\(\{[\s\S]*?active:\s*0/,
    "the profile inside must be active:0 or it eats the click",
  );

  // The service must NOT be on the profile itself — that is the broken shape.
  assert.doesNotMatch(
    trigger,
    /Skeletons\.UserProfile\(\{[\s\S]*?service:/,
    "the service must not sit on the UserProfile",
  );
});

test("the avatar is a centred circle whose ring cannot clip it", () => {
  const start = skinSrc.indexOf("&__account-avatar {");
  assert.ok(start > 0, "__account-avatar rule not found");
  const rule = skinSrc.slice(start, skinSrc.indexOf("\n  }", start));

  assert.match(rule, /border-radius:\s*50%/, "must be a circle, not a square");
  assert.match(rule, /align-items:\s*center/, "must centre its content vertically");
  assert.match(rule, /justify-content:\s*center/, "must centre its content horizontally");

  // A border would be part of the box and shift the row; the ring is drawn
  // outside via box-shadow, and the element needs margin room or the
  // neighbouring icon clips it.
  assert.match(rule, /box-shadow:\s*0 0 0 2px/, "the ring must be a box-shadow");
  assert.doesNotMatch(
    rule,
    /^\s*border:\s*\d/m,
    "a real border changes the layout width — use the box-shadow ring",
  );
  assert.match(rule, /margin-left/, "must reserve room for the ring");
});

test("every menu row resolves to something that exists", () => {
  // A row whose service has no case is a control that does nothing. Settings
  // and Get Help are handled by the desk; Log out is a direct call.
  assert.match(menu, /service:\s*"toggle-settings"/);
  assert.match(menu, /service:\s*"toggle-help"/);
  assert.match(deskSrc, /case "toggle-settings":/, "desk must handle toggle-settings");
  assert.match(deskSrc, /case "toggle-help":/, "desk must handle toggle-help");
  assert.match(menu, /on_click:\s*Butler\.logout/, "log out is a direct call");

  // Labels come from LOCALE, never literals.
  for (const key of ["SETTINGS", "GET_HELP", "SIGN_OUT"]) {
    assert.match(menu, new RegExp(`LOCALE\\.${key}`), `${key} must come from LOCALE`);
  }
});
