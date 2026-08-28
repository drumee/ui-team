// The plugin-loading screen: the drumee lockup over "the plugin X is loading".
//
// THE TRAP THIS FILE EXISTS FOR: --an-purple is not the host's token. It is
// declared in analytics-ui's own stylesheet, which that plugin loads from
// `require('./skin')` inside its initialize() — i.e. only once the plugin
// bundle has downloaded and the widget is being constructed, which is the
// exact moment this screen is replaced. Nothing in ui-team declares it.
//
// So on this screen `color: var(--an-purple)` resolves to nothing. It is not
// ignored: an unresolved var() is invalid at computed-value time, so `color`
// falls back to INHERITED — the message would render in the panel's default
// text colour and look simply unstyled, with no error anywhere. The token
// therefore has to carry a literal fallback, which is what the last case
// below pins.
//
//   node --test tests/plugins-loading-screen.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const Module = require("node:module");

// webpack aliases `assets/...` and inlines .svg through url-loader; node does
// neither, so point that request at the suite's stub. Same trick as
// tests/helpers/render-skeleton.js.
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  // .svg first: url-loader yields a data-URI STRING, and the generic
  // alias-stub is a callable Proxy whose source would land in the markup.
  if (/\.svg$/.test(request)) return require.resolve("./helpers/svg-asset-stub.js");
  if (/^assets\//.test(request)) return require.resolve("./helpers/alias-stub.js");
  return origResolve.call(this, request, ...rest);
};

// Descriptor factory, as in tests/helpers/render-skeleton.
const node = (kind) => (props = {}) => ({ __kind: kind, ...props });
const Box = node("box");
global.Skeletons = {
  Box: Object.assign(Box, { X: Box, Y: Box, Z: Box, G: Box }),
  Note: node("note"),
  Element: node("element"),
  Button: { Svg: node("button.svg") },
};

const DIR = join(__dirname, "..", "src", "drumee", "modules", "plugins");
const skeleton = require(join(DIR, "skeleton", "index.js"));
const source = readFileSync(join(DIR, "skeleton", "index.js"), "utf8");
const skin = readFileSync(join(DIR, "skin", "index.scss"), "utf8");

const ASSET = join(__dirname, "..", "src", "drumee", "assets", "drumee-logo.svg");
const SIGNIN_ASSET = "/home/drumee/signin/src/assets/drumee-logo.svg";

const render = (name = "analytics-ui") => skeleton({ fig: { family: "module-plugins" } }, name);

function walk(n, out = []) {
  if (!n || typeof n !== "object") return out;
  out.push(n);
  [].concat(n.kids || []).forEach((k) => walk(k, out));
  return out;
}

const markup = () => walk(render()).map((n) => n.content).filter(Boolean).join(" ");

test("the screen shows the exported drumee lockup", () => {
  assert.match(markup(), /<img[^>]*alt="drumee"/, "no lockup on the screen");
});

test("it is the lockup, not the sprite approximation", () => {
  // The sprite's `logo` symbol is the mark ALONE and carries no fill, so it
  // painted black until coloured. The signin form deliberately uses the
  // exported file instead; this screen now matches it.
  const icons = walk(render()).map((n) => n.ico).filter(Boolean);
  assert.deepEqual(icons, [], "still drawing the sprite symbol");
});

test("it is byte-for-byte the asset the signin form uses", () => {
  // The file is COPIED across repos, so it can drift silently. Checked
  // against the sibling checkout when present — skipped, not failed.
  assert.ok(existsSync(ASSET), "src/drumee/assets/drumee-logo.svg is missing");
  if (!existsSync(SIGNIN_ASSET)) {
    console.log("       (skipped — /home/drumee/signin not checked out)");
    return;
  }
  assert.equal(
    readFileSync(ASSET, "utf8"),
    readFileSync(SIGNIN_ASSET, "utf8"),
    "the copy has drifted from signin/src/assets/drumee-logo.svg",
  );
});

test("the lockup is inlined at build time, not fetched", () => {
  // This screen is up precisely BECAUSE the network is busy fetching the
  // plugin. A logo that needs its own request could arrive after the screen
  // it belongs to is gone. Requiring the .svg routes it through url-loader,
  // which turns it into a data URI in the bundle (webpack/module.js).
  assert.match(source, /(require|import)[^\n]*drumee-logo\.svg/,
    "the lockup must come through the bundler, so url-loader inlines it");
  assert.doesNotMatch(markup(), /src="(https?:)?\/\//, "the lockup is fetched over the network");
  assert.match(markup(), /src="data:image\/svg\+xml/, "the lockup did not arrive as a data URI");
});

test("the message is still there", () => {
  // Deliberately NOT the warmup-look rewrite that was reverted: this screen
  // keeps saying what it is waiting for.
  assert.match(markup(), /is being loaded/i);
});

test("the lockup scales by height, and matches the other screen's", () => {
  // The file is 120.723 x 24, a 5.03:1 lockup. Two hand-picked side lengths
  // are how a wordmark ends up quietly squashed; height plus `width: auto`
  // cannot distort it. The 32px is pinned in BOTH copies of this template —
  // see analytics-ui/test/access-limited.test.js.
  const img = skin.match(/&__logo[\s\S]*?img\s*\{([\s\S]*?)\}/);
  assert.ok(img, "no img rule under __logo");
  assert.match(img[1], /width:\s*auto/, "width must be auto so the ratio is preserved");
  assert.match(img[1], /height:\s*32px/, "the lockup height must match the authorization screen's");
});

// ── the shared template ────────────────────────────────────────────────
// One template with analytics-ui's authorization screen: the sign-in page's
// backdrop, the sign-in card, the lockup top-left, text centred. Written
// twice — different repos, no shared package — so both copies pin the same
// values and cannot drift apart in silence.

test("the card is the sign-in card", () => {
  const card = skin.match(/&__card\s*\{([\s\S]*?)\n {2}\}/);
  assert.ok(card, "no __card block — the screen is not on the template");
  assert.match(card[1], /max-width:\s*520px/, "the card width must match the sign-in card");
  assert.match(card[1], /border-radius:\s*12px/);
});

test("the backdrop is the sign-in page's", () => {
  const main = skin.match(/&__main\s*\{([\s\S]*?)\n {2}\}/);
  assert.ok(main, "no __main block");
  assert.match(main[1], /#f2f2f7/i, "the sign-in base colour is missing");
  assert.match(main[1], /radial-gradient/, "the brand glow is missing");
  assert.match(main[1], /89,\s*80,\s*255/, "the glow is not the brand purple");
});

test("the lockup sits at the card's TOP-LEFT", () => {
  // The card centres its children, so the lockup must opt out explicitly or
  // it centres with the message and the template is wrong.
  const logo = skin.match(/&__logo\s*\{([\s\S]*?)\n {4}img/);
  assert.ok(logo, "no __logo block");
  assert.match(logo[1], /align-self:\s*flex-start/,
    "the lockup must opt out of the card's centring");
});

test("the message is centred", () => {
  const msg = skin.match(/&__message\s*\{([\s\S]*?)\n {2}\}/);
  assert.ok(msg, "no __message block");
  assert.match(msg[1], /text-align:\s*center/);
});

test("the message is painted with --an-purple", () => {
  assert.match(skin, /--an-purple/, "the message no longer uses the analytics purple");
});

test("--an-purple carries a literal fallback", () => {
  // See the header: on this screen the token is always undefined, so without
  // a fallback the colour silently inherits and the purple never appears.
  const m = skin.match(/var\(\s*--an-purple\s*([^)]*)\)/);
  assert.ok(m, "--an-purple is not used through var()");
  assert.match(m[1], /,\s*#[0-9a-f]{3,8}/i,
    "var(--an-purple) needs a hex fallback — nothing defines that token while this screen is up");
});

test.after(() => {
  Module._resolveFilename = origResolve;
});
