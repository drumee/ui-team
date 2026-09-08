// The whole card opens the workspace, not just its padding.
//
// Clicking the glyph, the name or the member count did nothing. ui-core binds a
// click to any widget whose `active` is not 0, and that handler calls
// `e.stopPropagation()` BEFORE it dispatches:
//
//   letc/addons/letc.js  __handleClick
//     e.stopPropagation();
//     this.triggerHandlers(e);
//
// so a live child swallows the press — its own triggerHandlers finds no ui
// handler and returns — and the card, which carries the `service` and the
// `uiHandler`, never sees it. Those three children are most of the card's
// surface, so the tile read as broken.
//
// The fix is an explicit `active: 0` on every widget under the card. This file
// pins that, and pins the two traps that make it easy to undo.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const H = require("./helpers/render-skeleton.js");

const ROOT = join(__dirname, "..");
const SKEL = join(ROOT, "src/drumee/modules/desk/org-view/skeleton/index.js");
const CORE = join(ROOT, "node_modules/@drumee/ui-core/letc/addons/letc.js");

// The real card, from the real builder the widget uses.
function build(rows, canManage = true) {
  const restoreG = H.installGlobals();
  const restoreR = H.installResolver();
  global.Skeletons.Menu = (props = {}) => ({ __kind: "menu", ...props });
  try {
    delete require.cache[require.resolve(SKEL)];
    const skl = require(SKEL);
    return { kids: skl.sections("desk-org-view",
      { fig: { family: "desk-org-view" }, mget: () => null },
      rows, canManage) };
  } finally { restoreR(); restoreG(); }
}

const WS = { hub_id: 7, filename: "Engineering", area: "private", filetype: "hub", members: 12 };

test("every widget under the card is inert, so the click reaches the card", () => {
  const tree = build({ sections: [], ungrouped: [WS] });
  const card = H.find(tree, "desk-org-view__card");
  assert.ok(card, "no card in the rendered tree");

  // The card itself must stay LIVE and keep carrying the gesture.
  assert.equal(card.service, "open-workspace");
  assert.notEqual(card.active, 0, "the card went inert — nothing would open");

  // Every descendant, at any depth. `walk` yields the node itself first, so it
  // is skipped by identity rather than by class name.
  const dead = [];
  const live = [];
  for (const n of H.walk(card)) {
    if (n === card) continue;
    (n.active === 0 ? dead : live).push(n.className || n.__kind || "?");
  }
  assert.ok(dead.length >= 4, `expected the glyph, name, count box and count: ${dead}`);
  assert.deepEqual(live, [],
    `these swallow the click instead of opening the workspace: ${live.join(", ")}`);
});

test("the three reported dead spots are each covered by name", () => {
  // Named individually because "a click does nothing" was reported against
  // these three specifically, and a future refactor that drops one would
  // otherwise only fail the count above.
  const tree = build({ sections: [], ungrouped: [WS] });
  for (const cls of [
    "desk-org-view__card-icon",
    "desk-org-view__card-name",
    "desk-org-view__members",
    "desk-org-view__members-value",
    "desk-org-view__members-ico",
  ]) {
    const n = H.find(tree, cls);
    assert.ok(n, `${cls} is gone from the card`);
    assert.equal(n.active, 0, `${cls} is live — a click on it opens nothing`);
  }
});

test("a department header's count keeps its tooltip, and stays live for it", () => {
  // `active: 0` is NOT free: ui-core's gate returns BEFORE __addTooltips, so an
  // inert widget silently loses its tooltip. The header's count is a bare
  // number whose only label is that bubble, so it must stay live — and it can,
  // because nothing in the header is a click target.
  const tree = build({
    sections: [{ department: { id: 3, name: "Eng", member_count: 9 }, workspaces: [WS] },],
    ungrouped: [],
  });
  const icons = H.findAll(tree, "desk-org-view__members-ico");
  const withTip = icons.filter((n) => n.tooltips);
  const withoutTip = icons.filter((n) => !n.tooltips);

  assert.equal(withTip.length, 1, "the header's count lost its tooltip");
  assert.notEqual(withTip[0].active, 0, "an inert widget cannot show a tooltip");
  assert.ok(withoutTip.length >= 1, "the card's count is missing");
  for (const n of withoutTip) assert.equal(n.active, 0);
});

test("kidsOpt is not used for this, because ui-core discards it", () => {
  // THE TRAP. `kidsOpt: { active: 0 }` reads as the obvious way to write the
  // rule above once instead of five times, and the org chip's chip() appears to
  // use it. It does nothing: mergeKidsOptions rebuilds each kid into a LOCAL
  // inside a `.map()` and never writes it back, so the option is dropped. The
  // chip works because it ALSO sets the flag on every kid by hand.
  //
  // Proven against the shipped function rather than asserted from reading it,
  // so a ui-core release that fixes the merge shows up here as a failure and
  // this file can then be simplified on purpose.
  const src = readFileSync(CORE, "utf8");
  const m = src.match(/\nView\.prototype\.mergeKidsOptions = function \(kids\) \{\n([\s\S]*?)\n\};\n/);
  assert.ok(m, "mergeKidsOptions is gone from ui-core");
  const merge = new Function("_", "_a", `return function (kids) {\n${m[1]}\n};`)(
    require("lodash"), new Proxy({}, { get: (_t, k) => String(k) }));
  const kids = [{ className: "a" }, { className: "b" }];
  merge.call({ mget: (k) => (k === "kidsOpt" ? { active: 0 } : null) }, kids);
  assert.ok(kids.every((k) => k.active === undefined),
    "ui-core now applies kidsOpt — the per-kid flags could be collapsed into it");

  // And the card does not lean on it. CODE lines only — the comment in card()
  // names `kidsOpt` precisely to warn the next reader off it, and a naive
  // substring test on the whole body flags that warning as the offence.
  const skel = readFileSync(SKEL, "utf8");
  const from = skel.indexOf("function card(");
  const body = skel.slice(from, skel.indexOf("\n}\n", from))
    .split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  assert.ok(!/kidsOpt/.test(body), "card() relies on kidsOpt, which is discarded");
});

test("ui-core still stops the event before dispatching", () => {
  // The reason any of this is needed. If a future ui-core dispatches first (or
  // stops propagating only after finding a handler), a live child would be
  // harmless and these flags become belt-and-braces rather than load-bearing.
  const src = readFileSync(CORE, "utf8");
  const from = src.indexOf("View.prototype.__handleClick");
  const body = src.slice(from, src.indexOf("\nView.prototype.", from + 10));
  const stop = body.indexOf("e.stopPropagation()");
  const fire = body.indexOf("this.triggerHandlers(e)");
  assert.ok(stop > 0 && fire > 0, "__handleClick no longer looks like this");
  assert.ok(stop < fire,
    "ui-core now dispatches before stopping propagation — the active:0 flags may be reviewable");
});
