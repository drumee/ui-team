#!/usr/bin/env node

/**
 * Contextual sub-tours — Phase 4, the skip control.
 *
 * The whole point of this phase is that skip is NOT Done. _enterWorkspace()
 * writes `tutorial_done` and, for the full tour, marks all five flagged tours
 * seen; routing skip through it would record a user who dismissed three screens
 * as having seen the entire product. So the tests here exist mainly to fail
 * loudly if someone later points `end-tour` back at _enterWorkspace().
 *
 * Run from ui-team with:
 *   node --test tests/tutorial-tours-skip.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const HOST_SRC = read("src/drumee/modules/desk/tutorial/index.js");
const TOOLTIP_SRC = read("src/drumee/modules/desk/tutorial/skeleton/toolkit/tooltip.js");
const SPOT_SRC = read("src/drumee/modules/desk/tutorial/spotlight/index.js");

/** Body of a `name(args) { ... }` method at class indent. */
function methodBody(src, signature) {
  const start = src.indexOf(`  ${signature} {`);
  assert.notEqual(start, -1, `${signature} not found`);
  const from = start + `  ${signature} {`.length;
  let depth = 1;
  for (let i = from; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(from, i);
    }
  }
  throw new Error(`unterminated ${signature}`);
}

// ── the two exits, run for real ──────────────────────────────────────────────

/**
 * A fake tour host. Everything the two exits touch is a parameter, and NOTHING
 * here is assigned on `global` — harness-hygiene.test.js forbids a name being
 * both, and a shadowed global would let the extracted code read a stub the
 * assertions never see.
 */
function makeHost({ tourId = "migrate", flagged = ["workspace", "folder_task", "share", "migrate"] } = {}) {
  const log = [];
  const store = {};
  const host = {
    _tour: { id: tourId, flag: tourId === "full" ? null : tourId },
    softDestroy: () => log.push("softDestroy"),
    postService: (svc, payload) => {
      log.push(`post:${svc}:${JSON.stringify(payload.settings || payload)}`);
      return Promise.resolve({});
    },
    // Done marks its button pending for the length of the write, which it
    // reaches through the spotlight. Recorded rather than ignored so the
    // ordering below can be asserted: the button has to go busy BEFORE the
    // post, or the spinner only appears once there is nothing left to wait for.
    ensurePart: (pn) => {
      log.push(`ensurePart:${pn}`);
      return Promise.resolve({ busy: () => log.push("busy") });
    },
  };
  const deps = {
    Tours: { markSeen: (id) => log.push(`markSeen:${id}`) },
    flaggedIds: () => flagged,
    SERVICE: { drumate: { update_settings: "drumate.update_settings" } },
    Visitor: { id: "u_test" },
    SVC_OPT: { async: 1 },
    // A plain object, deliberately: the production code writes
    // `localStorage.onboarding_step = "0"` as a PROPERTY, not via setItem(), so
    // a stub that only implements setItem records nothing and the assertion
    // silently tests nothing.
    localStorage: store,
  };
  const bind = (sig) =>
    // eslint-disable-next-line no-new-func
    new Function(
      "Tours", "flaggedIds", "SERVICE", "Visitor", "SVC_OPT", "localStorage",
      `return function () {${methodBody(HOST_SRC, sig)}};`,
    )(deps.Tours, deps.flaggedIds, deps.SERVICE, deps.Visitor, deps.SVC_OPT, deps.localStorage)
      .bind(host);

  return { host, log, store, skip: bind("_skipTour()"), done: bind("_enterWorkspace()") };
}

test("skip on a contextual tour writes nothing at all", () => {
  const { log, store, skip } = makeHost({ tourId: "migrate" });
  skip();
  assert.deepEqual(log, ["softDestroy"]);
  assert.deepEqual(Object.keys(store), [], "not even the onboarding_step poke");
  // Specifically: no tutorial_done, no markSeen, no localStorage poke. The tour
  // was already recorded when it mounted, which is what stops it re-triggering.
  assert.ok(!log.some((l) => l.includes("tutorial_done")));
  assert.ok(!log.some((l) => l.startsWith("markSeen")));
});

test("skip on `full` does NOT mark the five flagged tours", () => {
  const { log, skip } = makeHost({ tourId: "full" });
  skip();
  assert.deepEqual(log, ["softDestroy"]);
  // This is the case that distinguishes skip from Done. A user who left the
  // six-step tour early has not seen the contextual tours, so they stay armed.
  assert.ok(!log.some((l) => l.startsWith("markSeen")), "full-skip must record nothing");
});

test("Done on a contextual tour still writes tutorial_done, unchanged", () => {
  const { log, store, done } = makeHost({ tourId: "migrate" });
  done();
  assert.equal(store.onboarding_step, "0");
  assert.ok(log.some((l) => l.includes("tutorial_done")), "S7's legacy write must survive");
  assert.ok(!log.some((l) => l.startsWith("markSeen")), "a contextual tour marks only itself, at mount");
});

test("Done on `full` still marks every flagged tour — S7 regression cover", () => {
  const { log, done } = makeHost({ tourId: "full" });
  done();
  assert.deepEqual(
    log.filter((l) => l.startsWith("markSeen")),
    ["markSeen:workspace", "markSeen:folder_task", "markSeen:share", "markSeen:migrate"],
  );
  assert.ok(log.some((l) => l.includes("tutorial_done")));
});

test("skip and Done are different code paths, not one calling the other", () => {
  const body = methodBody(HOST_SRC, "_skipTour()");
  assert.ok(!/_enterWorkspace/.test(body), "skip must never route through Done");
  assert.match(body, /this\.softDestroy\(\)/);
});

// ── the control itself ───────────────────────────────────────────────────────

/**
 * Build tooltipBadge with a recording Skeletons. `Skeletons` and `LOCALE` are
 * parameters only — never globals in this file.
 */
function buildBadge(opts) {
  const nodes = [];
  const mk = (kind) => (o = {}) => {
    const n = { kind, ...o };
    nodes.push(n);
    return n;
  };
  const Skeletons = {
    Box: { X: mk("Box.X"), Y: mk("Box.Y") },
    Note: mk("Note"),
    Button: { Svg: mk("Button.Svg"), Label: mk("Button.Label") },
  };
  const LOCALE = { SKIP_TOUR: "Skip tour", BACK: "Back", NEXT: "Next", DONE: "Done" };

  const src = TOOLTIP_SRC
    .replace(/^const \{ fileItem \} = require\("\.\/folder"\)\s*$/m, "")
    .replace(/^export function/gm, "function");
  // eslint-disable-next-line no-new-func
  const badge = new Function("Skeletons", "LOCALE", `${src}\n;return tooltipBadge;`)(Skeletons, LOCALE);

  const ui = { fig: { family: "tutorial-migrate", group: "tutorial" } };
  const tree = badge(ui, opts);
  return { tree, nodes };
}

const skipNodes = (nodes) => nodes.filter((n) => n.service === "end-tour");

test("the skip control is on every screen, first and last alike", () => {
  for (const opts of [
    { badge_text: "STEP 1/3", hide_back: true },                 // first screen
    { badge_text: "STEP 2/3" },                                  // middle
    { badge_text: "STEP 3/3", done: true },                      // last
  ]) {
    const { nodes } = buildBadge({ title: "t", desc: "d", ...opts });
    assert.equal(skipNodes(nodes).length, 1, JSON.stringify(opts));
  }
});

test("hide_back removes Back but never the skip control", () => {
  const { nodes } = buildBadge({ title: "t", desc: "d", badge_text: "STEP 1/3", hide_back: true });
  assert.equal(nodes.filter((n) => n.service === "back-step").length, 0, "Back is hidden");
  assert.equal(skipNodes(nodes).length, 1, "skip stays");
  assert.equal(nodes.filter((n) => n.service === "next-step").length, 1);
});

test("skip is routed at the host, while Back and Next stay on the step", () => {
  const step = { id: "step" };
  const host = { id: "host" };
  const ui = { fig: { family: "tutorial-migrate", group: "tutorial" } };
  const nodes = [];
  const mk = (kind) => (o = {}) => { const n = { kind, ...o }; nodes.push(n); return n; };
  const Skeletons = { Box: { X: mk("Box.X"), Y: mk("Box.Y") }, Note: mk("Note"),
    Button: { Svg: mk("Button.Svg"), Label: mk("Button.Label") } };
  const LOCALE = { SKIP_TOUR: "Skip tour", BACK: "Back", NEXT: "Next", DONE: "Done" };
  const src = TOOLTIP_SRC
    .replace(/^const \{ fileItem \} = require\("\.\/folder"\)\s*$/m, "")
    .replace(/^export function/gm, "function");
  // eslint-disable-next-line no-new-func
  const badge = new Function("Skeletons", "LOCALE", `${src}\n;return tooltipBadge;`)(Skeletons, LOCALE);
  badge({ ...ui, id: "step" }, { title: "t", desc: "d", badge_text: "1/3", host });

  const skip = nodes.find((n) => n.service === "end-tour");
  const next = nodes.find((n) => n.service === "next-step");
  const back = nodes.find((n) => n.service === "back-step");
  assert.deepEqual(skip.uiHandler, [host], "end-tour goes to the tour host");
  assert.equal(next.uiHandler[0].id, "step", "next stays on the step");
  assert.equal(back.uiHandler[0].id, "step", "back stays on the step");
  void step;
});

test("with no host supplied the control still raises something", () => {
  const { nodes } = buildBadge({ title: "t", desc: "d", badge_text: "1/3" });
  const skip = skipNodes(nodes)[0];
  assert.equal(skip.uiHandler.length, 1);
  assert.ok(skip.uiHandler[0], "falls back to ui rather than an undefined handler");
});

test("the skip control carries the localised label", () => {
  const { nodes } = buildBadge({ title: "t", desc: "d", badge_text: "1/3" });
  assert.equal(skipNodes(nodes)[0].tooltips, "Skip tour");
});

// ── routing and Esc, in the sources ──────────────────────────────────────────

test("the spotlight supplies the host, so no step file forwards end-tour", () => {
  assert.match(SPOT_SRC, /host: this\._tourHost\(\)/);
  assert.match(SPOT_SRC, /_tourHost\(\)\s*\{[\s\S]*?partHandler/);
  const dir = "src/drumee/modules/desk/tutorial";
  for (const step of ["workspace", "folder", "meeting", "task", "share", "migrate"]) {
    assert.ok(
      !/end-tour/.test(read(`${dir}/${step}/index.js`)),
      `${step} must not need a forwarding case`,
    );
  }
});

test("the host routes end-tour to skip, not to the Done path", () => {
  const body = methodBody(HOST_SRC, "onUiEvent(trigger, args = {})");
  assert.match(body, /case 'end-tour':[\s\S]{0,80}this\._skipTour\(\)/);
});

test("Escape is registered at capture phase and unregistered on destroy", () => {
  const bind = methodBody(HOST_SRC, "_bindEscape()");
  assert.match(bind, /phase: 'capture'/);
  assert.match(bind, /e\.key === 'Escape'/);
  // The desk's own Escape (bubble phase) declines a keypress whose default was
  // already prevented, so returning true here is what makes the two interlock.
  assert.match(bind, /this\._skipTour\(\);\s*return true;/);
  assert.match(bind, /!e\.defaultPrevented/);

  const destroy = methodBody(HOST_SRC, "onBeforeDestroy()");
  assert.match(destroy, /unregister\(this\._escapeHotkey\)/);
});

test("Escape is bound only once the tour has actually mounted", () => {
  const dom = methodBody(HOST_SRC, "onDomRefresh()");
  assert.match(dom, /this\._bindEscape\(\)/);
});

test("the desk's own Escape still guards on defaultPrevented", () => {
  // The interlock depends on it; if this ever changes, the tour's capture
  // binding would stop suppressing the desk's handler.
  const desk = read("src/drumee/modules/desk/index.js");
  assert.match(desk, /name: "desk-escape"[\s\S]{0,300}!e\.defaultPrevented/);
});

// ── Done's pending state ─────────────────────────────────────────────────────
//
// Done is the only control in the tour that waits on the network: it writes
// tutorial_done (and, for `full`, the seen-set) and only then destroys the
// tour. Until this existed the callout simply sat there for the length of that
// round trip, which on a slow link reads as a dead button — and invited the
// second press these tests guard against.

test("Done marks its button pending before it starts writing", async () => {
  const { log, done } = makeHost({ tourId: "migrate" });
  done();
  // The part lookup is what has to come first. Ordering is the whole point:
  // asking for the spotlight after the post would only raise a spinner once
  // the thing it is waiting for had already finished.
  const ask = log.indexOf("ensurePart:spotlight");
  const post = log.findIndex((l) => l.startsWith("post:"));
  assert.notEqual(ask, -1, "the spinner must be reached for");
  assert.notEqual(post, -1);
  assert.ok(ask < post, "the button is claimed before the write it covers");
  // ensurePart resolves a promise, so the class lands one microtask after the
  // press rather than in the same tick — invisible to a person, but it means
  // the assertion has to wait for it.
  await Promise.resolve();
  assert.ok(log.includes("busy"), "the spinner must actually be turned on");
});

test("a second Done press writes nothing — one exit per tour", async () => {
  const { log, done } = makeHost({ tourId: "migrate" });
  done();
  done();
  done();
  assert.equal(log.filter((l) => l.startsWith("post:")).length, 1);
  await Promise.resolve();
  assert.equal(log.filter((l) => l === "busy").length, 1, "and one spinner");
});

test("the double-press guard also covers full's markSeen round", () => {
  // `full` posts one markSeen per flagged tour on top of the settings write, so
  // an unguarded second press is five duplicate writes, not one.
  const { log, done } = makeHost({ tourId: "full" });
  done();
  done();
  assert.deepEqual(
    log.filter((l) => l.startsWith("markSeen")),
    ["markSeen:workspace", "markSeen:folder_task", "markSeen:share", "markSeen:migrate"],
  );
});

test("skip stays instant — it writes nothing, so it has nothing to wait for", () => {
  const { log, skip } = makeHost({ tourId: "migrate" });
  skip();
  assert.ok(!log.includes("busy"), "no spinner on a control that does not write");
  assert.deepEqual(log, ["softDestroy"]);
});

test("only the last screen's button can enter the pending state", () => {
  // `is-done` is what spotlight.busy() looks for. If it were on every screen,
  // Back/Next on an ordinary screen could be left spinning by a stray call.
  const last = buildBadge({ title: "t", desc: "d", badge_text: "STEP 3/3", done: true });
  const mid = buildBadge({ title: "t", desc: "d", badge_text: "STEP 2/3" });
  const nextOf = (r) => r.nodes.find((n) => n.service === "next-step");
  assert.match(nextOf(last).className, /\bis-done\b/);
  assert.ok(!/\bis-done\b/.test(nextOf(mid).className));
  // The service is unchanged — only the wording and the marker differ.
  assert.equal(nextOf(last).service, "next-step");
});

test("the spinner is defined once, on the shared badge rule", () => {
  // Both card looks (default and variant:'figma') share .tutorial__s1-next, and
  // the figma block deliberately does not restyle the buttons — so one rule
  // covers every tour. A second definition would mean one of them drifting.
  const tip = read("src/drumee/modules/desk/tutorial/skin/tooltip.scss");
  assert.match(tip, /&__s1-next\s*\{[\s\S]*?&\.loading\s*\{/);
  assert.match(tip, /@keyframes tutorial-spin/);
  // Taken out of the event stream, not merely dimmed.
  assert.match(tip, /&\.loading\s*\{[\s\S]*?pointer-events: none/);
  assert.equal((tip.match(/&\.loading\s*\{/g) || []).length, 1, "one definition only");
});

test("busy() finds the button by marker and leaves everything else alone", () => {
  const src = read("src/drumee/modules/desk/tutorial/spotlight/index.js");
  const body = methodBody(src, "async busy()");
  assert.match(body, /ensurePart\('callout'\)/);
  assert.match(body, /querySelector\('\.is-done'\)/);
  assert.match(body, /classList\.add\('loading'\)/);
  // Nothing clears it: the host destroys the tour once the write settles, so a
  // reset would only ever run on a node about to be removed.
  assert.ok(!/classList\.remove/.test(body));
});
