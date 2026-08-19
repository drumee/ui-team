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
