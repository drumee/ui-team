// The disconnect screen — what you see after Sign out, or after "Back to
// sign in" on the analytics authorization card.
//
// It joins the plugin loading screen and analytics-ui's authorization screen
// on one template: the sign-in page's backdrop, the sign-in card, the drumee
// lockup at the card's top-left, the message centred in the analytics purple.
//
// TWO THINGS HERE ARE LOAD-BEARING, and neither is cosmetic:
//
//   `sys_pn: "disconnected"`. Butler.logout AWAITS ensurePart('disconnected')
//     before it posts drumate.logout. Rename or drop that part and logout
//     stops mid-flight — overlay up, session never ended, no error.
//
//   The stylesheet's selector. Butler's fig.family is "router-butler", so
//     this emits router-butler-goodbye__*, but goodbye.scss targeted
//     ".router-buler-goodbye" — no `t` — so NOTHING matched and the screen
//     rendered unstyled. Derived here the same way ui-core does it, rather
//     than hardcoded, so the two cannot drift apart again.
//
//   node --test tests/goodbye-screen.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const Module = require("node:module");

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (/\.svg$/.test(request)) return require.resolve("./helpers/svg-asset-stub.js");
  if (/^assets\//.test(request)) return require.resolve("./helpers/alias-stub.js");
  return origResolve.call(this, request, ...rest);
};

const node = (kind) => (props = {}) => ({ __kind: kind, ...props });
const Box = node("box");
global.Skeletons = {
  Box: Object.assign(Box, { X: Box, Y: Box, Z: Box, G: Box }),
  Note: node("note"),
  Element: node("element"),
  Image: { Smart: node("image.smart") },
};
global._a = new Proxy({}, { get: (t, k) => String(k) });
global.LOCALE = new Proxy({ GOODBYE_SEE_YOU_LATER: "You will be disconnected shortly. See you later !" },
  { get: (t, k) => (k in t ? t[k] : String(k)) });

const DIR = join(__dirname, "..", "src", "drumee", "router", "butler");
const skeleton = require(join(DIR, "skeleton", "goodbye.js"));
const skin = readFileSync(join(DIR, "skin", "goodbye.scss"), "utf8");

/** fig.family, derived exactly as ui-core's letc.js does it. */
const FAMILY = "__router_butler".replace(/^(_+)/, "").replace(/_/g, "-");
const render = () => (skeleton.default || skeleton)({ fig: { family: FAMILY } });

function walk(n, out = []) {
  if (!n || typeof n !== "object") return out;
  out.push(n);
  [].concat(n.kids || []).forEach((k) => walk(k, out));
  return out;
}
const markup = () => walk(render()).map((n) => n.content).filter(Boolean).join(" ");
const part = (name) => walk(render()).find((n) => n.sys_pn === name);

// ── the parts logout depends on ────────────────────────────────────────

test("the 'disconnected' part survives", () => {
  // Butler.logout awaits ensurePart('disconnected'). Without it the promise
  // never resolves: the goodbye overlay sits there and the session is never
  // ended. Silent, and only reproducible by actually signing out.
  assert.ok(part("disconnected"), "logout will hang forever without this part");
});

test("the loader part survives", () => {
  assert.ok(part("loader"), "the spinner slot is gone");
});

test("it still says goodbye", () => {
  assert.match(markup(), /disconnected shortly/i);
});

test("the spinner is still shown", () => {
  const spinner = walk(render()).find((n) => n.kind === "spinner");
  assert.ok(spinner, "no spinner — the screen looks frozen rather than working");
});

// ── the stylesheet actually applies ────────────────────────────────────

test("the stylesheet targets the class the skeleton emits", () => {
  // The bug this file was written for: goodbye.scss said ".router-buler-",
  // the skeleton emits "router-butler-", and nothing matched for as long as
  // that typo stood.
  const emitted = walk(render()).map((n) => n.className || "").filter(Boolean);
  assert.ok(emitted.length, "the screen renders no classes at all");
  assert.match(skin, new RegExp(`\\.${FAMILY}-goodbye\\b`),
    `goodbye.scss must target .${FAMILY}-goodbye — the class the skeleton actually emits`);
  emitted.forEach((c) => {
    assert.ok(c.startsWith(`${FAMILY}-goodbye__`), `unexpected class: ${c}`);
  });
});

// ── the shared template ────────────────────────────────────────────────

test("the card is the sign-in card", () => {
  assert.ok(part("card") || /&__card/.test(skin), "no card block");
  const card = skin.match(/&__card\s*\{([\s\S]*?)\n {2}\}/);
  assert.ok(card, "no __card rule");
  assert.match(card[1], /max-width:\s*520px/, "the card width must match the other screens");
  assert.match(card[1], /border-radius:\s*12px/);
});

test("the backdrop is the sign-in page's", () => {
  const main = skin.match(/&__main\s*\{([\s\S]*?)\n {2}\}/);
  assert.ok(main, "no __main rule");
  assert.match(main[1], /#f2f2f7/i, "the sign-in base colour is missing");
  assert.match(main[1], /radial-gradient/, "the brand glow is missing");
  assert.match(main[1], /89,\s*80,\s*255/, "the glow is not the brand purple");
});

test("the lockup is at the card's top-left, at the shared size", () => {
  assert.match(markup(), /<img[^>]*alt="drumee"/, "no lockup on the card");
  const logo = skin.match(/&__logo\s*\{([\s\S]*?)\n {4}img/);
  assert.ok(logo, "no __logo rule");
  assert.match(logo[1], /align-self:\s*flex-start/, "the lockup must opt out of the centring");
  const img = skin.match(/&__logo[\s\S]*?img\s*\{([\s\S]*?)\}/);
  assert.match(img[1], /width:\s*auto/, "width must be auto so the ratio holds");
  assert.match(img[1], /height:\s*32px/, "the lockup height must match the other screens");
});

test("the message is centred, in the analytics purple, with a fallback", () => {
  const note = skin.match(/&__note\s*\{([\s\S]*?)\n {2}\}/);
  assert.ok(note, "no __note rule");
  assert.match(note[1], /text-align:\s*center/);
  const m = note[1].match(/var\(\s*--an-purple\s*([^)]*)\)/);
  assert.ok(m, "the message is not painted with --an-purple");
  assert.match(m[1], /,\s*#[0-9a-f]{3,8}/i,
    "--an-purple is analytics-ui's token and is undefined here; without a hex fallback " +
    "the colour silently inherits");
});

test.after(() => { Module._resolveFilename = origResolve; });
