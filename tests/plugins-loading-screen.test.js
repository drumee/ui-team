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

test("the lockup scales by height, never by two fixed sides", () => {
  // The file is 120.723 x 24 — a 5.03:1 lockup. Pinning both sides to hand
  // -picked numbers is how it gets subtly squashed, and nobody notices a
  // wordmark that is 4% too narrow. Height plus `width: auto` cannot distort
  // it, and the tag's width/height attributes still supply the ratio the
  // browser reserves space with before the CSS lands.
  const img = skin.match(/&__logo[\s\S]*?img\s*\{([\s\S]*?)\}/);
  assert.ok(img, "no img rule under __logo");
  assert.match(img[1], /width:\s*auto/, "width must be auto so the ratio is preserved");
  assert.match(img[1], /height:\s*(\d+)px/, "the lockup is sized by its height");
  assert.ok(Number(img[1].match(/height:\s*(\d+)px/)[1]) > 24,
    "this is a full-screen state — the lockup should be bigger than the sign-in card's 24px");
});

test("the lockup and the message are not crowded together", () => {
  const main = skin.match(/&__main\s*\{([\s\S]*?)\n {2}\}/);
  assert.ok(main, "no __main block");
  const gap = Number((main[1].match(/gap:\s*(\d+)px/) || [])[1]);
  assert.ok(gap >= 24, `the stack needs breathing room, got gap: ${gap}px`);
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
