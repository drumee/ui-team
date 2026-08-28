// "Loading plans…" while the billing chunk downloads.
//
// WHAT IT COVERS, and the boundary is the whole point. openBillingPage awaits
// Kind.waitFor("settings_billing") — a dynamic import of a ~280KB chunk, during
// which nothing on screen changes and the click looks like it did nothing.
//
// WHAT IT MUST NOT COVER is the widget's own data load. settings_billing's
// onDomRefresh paints immediately from Visitor.quota()'s cache and re-renders
// when the catalog and subscription land; its own comment records that as a fix
// for this screen "sitting blank for both round-trips back to back". A spinner
// over that would put the blank screen back, dressed as progress.
//
// Two behaviours carry real risk and are driven here rather than read:
//
//   the DELAY   the chunk is cached after the first open, so the common case
//               resolves in milliseconds. Raising a window for that is a flash,
//               which reads as a glitch and is worse than the nothing it
//               replaced.
//   the LATCH   billing can be opened repeatedly, unlike the invited-workspace
//               loader this is modelled on, whose flag is never cleared because
//               its intent is consumed once. Fail to release it and only the
//               SECOND visit — the cached, fast one — could ever show a loader,
//               while the first, the slow one, could not.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = readFileSync(
  join(__dirname, "../src/drumee/modules/desk/index.js"), "utf8");

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

function methodBody(sig) {
  const i = SRC.indexOf(sig);
  assert.ok(i > 0, `${sig} not found`);
  return SRC.slice(i, SRC.indexOf("\n  }", i));
}

const DELAY = Number(/const DESK_BILLING_LOADER_DELAY = (\d+)/.exec(SRC)?.[1]);

/**
 * The real show/hide pair, lifted onto a stub.
 *
 * Compiled out of the source so these cases cannot pass against timing the desk
 * does not actually apply. Wm and Skeletons are stubbed to record rather than
 * render; only the scheduling is under test.
 */
function harness() {
  const raised = [];
  const ctx = {
    _billingLoaderPending: false,
    _billingLoaderTimer: null,
    _goodbyes: 0,
    _billingLoader() { return ctx._live || null; },
  };
  const Wm = {
    info: (o) => {
      raised.push(o);
      ctx._live = { mget: (k) => o[k], goodbye: () => { ctx._goodbyes++; ctx._live = null; } };
    },
    getItemsByKind: () => [],
  };
  // Callable AND indexable at every depth: the loader uses both shapes —
  // Skeletons.Element({...}) and Skeletons.Box.X({...}) — so a one-level proxy
  // returns a function for `Box` and then dies on `.X`.
  const stub = () => new Proxy(function (o) { return o; }, { get: () => stub() });
  const Skeletons = stub();
  const mk = (sig) => {
    const body = methodBody(sig);
    const inner = body.slice(body.indexOf("{") + 1);
    return new Function(
      "ctx", "window", "Wm", "Skeletons", "LOCALE", "DESK_BILLING_LOADER_DELAY",
      "setTimeout", "clearTimeout",
      inner.replace(/\bthis\b/g, "ctx"),
    );
  };
  const show = mk("_showBillingLoader() {");
  const hide = mk("_hideBillingLoader() {");
  const args = [ctx, { Wm }, Wm, Skeletons, {}, DELAY, setTimeout, clearTimeout];
  return {
    ctx, raised,
    show: () => show(...args),
    hide: () => hide(...args),
  };
}

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

// ── the delay: a cached open must not flash ────────────────────────────
test("the delay is short enough to be unfelt and long enough to skip a cache hit", () => {
  assert.ok(Number.isFinite(DELAY), "DESK_BILLING_LOADER_DELAY is gone");
  assert.ok(DELAY > 0, "the loader is raised synchronously — a cached open would flash");
  assert.ok(DELAY <= 250,
    `${DELAY}ms is past the point a wait starts being felt — a slow connection `
    + "would sit with no feedback for longer than the loader exists to prevent");
});

test("a fast (cached) open raises nothing at all", async () => {
  const h = harness();
  h.show();
  h.hide();                 // resolves well inside the delay
  await tick(DELAY + 40);
  assert.equal(h.raised.length, 0,
    "a spinner appeared for an import that had already resolved — that is the flash");
});

test("a slow open raises exactly one loader", async () => {
  const h = harness();
  h.show();
  await tick(DELAY + 40);
  assert.equal(h.raised.length, 1, "nothing was raised for a slow import");
  assert.equal(h.raised[0].billing_loading, 1, "the window is not findable as the billing loader");
  assert.equal(h.raised[0].mode, "hb",
    "mode is not header+body — a loader with no footer needs its header ✕ to be closable by hand");
  assert.ok(h.raised[0].dismiss_after > 0,
    "no dismiss_after backstop — a footerless loader that a future path forgets to "
    + "hide would stand forever");
});

test("show is idempotent while one wait is in flight", async () => {
  const h = harness();
  h.show(); h.show(); h.show();
  await tick(DELAY + 40);
  assert.equal(h.raised.length, 1, "a double-click stacked loaders");
});

// ── the latch: every visit, not just the second ────────────────────────
test("the latch is released, so a later open can raise it again", async () => {
  const h = harness();
  h.show();
  await tick(DELAY + 40);
  assert.equal(h.raised.length, 1);
  h.hide();
  assert.equal(h.ctx._billingLoaderPending, false,
    "the pending flag survived hide — modelled on the invited-workspace loader, "
    + "which latches once because its intent is consumed once. Billing is opened "
    + "as often as somebody clicks Upgrade plan.");
  h.show();
  await tick(DELAY + 40);
  assert.equal(h.raised.length, 2, "the second slow open raised nothing");
});

test("hide takes down a raised loader and is safe to call twice", async () => {
  const h = harness();
  h.show();
  await tick(DELAY + 40);
  h.hide();
  assert.equal(h.ctx._goodbyes, 1, "the loader was not dismissed");
  h.hide();
  assert.equal(h.ctx._goodbyes, 1, "a second hide threw or double-dismissed");
});

// ── the boundary: what openBillingPage wraps ───────────────────────────
test("the loader wraps the import, and comes down even if it fails", () => {
  const body = stripComments(methodBody("openBillingPage(preselect) {"));
  const show = body.indexOf("_showBillingLoader()");
  const wait = body.indexOf('Kind.waitFor("settings_billing")');
  assert.ok(show > 0 && wait > show,
    "the loader is raised after the import starts — the gap it covers is that wait");
  assert.match(body, /\.finally\(\(\) => this\._hideBillingLoader\(\)\)/,
    "hide is not in a finally — a chunk 404 after a redeploy would leave a "
    + "spinner over a desk that has stopped trying");
});

test("it does not reach into the widget's own data load", () => {
  // settings_billing paints from cache on mount and re-renders when the network
  // answers. That was a deliberate fix; covering it would undo it.
  const widget = readFileSync(
    join(__dirname,
      "../src/drumee/builtins/widget/settings/account/billing/index.js"), "utf8");
  assert.ok(!/_showBillingLoader|_hideBillingLoader/.test(widget),
    "the billing widget drives the desk's loader — the spinner would cover a "
    + "page that is already readable");
});

test("the label has a locale key and a literal fallback", () => {
  const show = methodBody("_showBillingLoader() {");
  assert.match(show, /LOCALE\.LOADING_BILLING \|\| "Loading plans…"/,
    "no fallback — a missing key would render the loader with an empty label");
  const en = JSON.parse(readFileSync(join(__dirname, "../locale/en.json"), "utf8"));
  assert.equal(en.LOADING_BILLING, "Loading plans…", "en.json is missing the key");
});
