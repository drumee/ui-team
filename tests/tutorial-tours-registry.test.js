#!/usr/bin/env node

/**
 * Contextual sub-tours — registry invariants, badge derivation, and the
 * host's step-payload builder.
 *
 * Run from ui-team with:
 *   node --test tests/tutorial-tours-registry.test.js
 *
 * Covers plan §8 tests 48 and 49, plus a static guard on the four-site tour-id
 * allow-list (§4 S2 / M2), which otherwise fails as a silently rejected write
 * with no client-side symptom.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const TOURS_PATH = join(REPO_ROOT, "src/drumee/modules/desk/tutorial/tours.js");
const HOST_PATH = join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js");
const LIB_PATH = join(REPO_ROOT, "src/drumee/libs/tutorial-tours.js");

// The registry reads LOCALE for the badge format; nothing else is global.
global.LOCALE = { TUTORIAL_STEP: "STEP {0}/{1}" };

// `"{0}".format(...)` is a prototype extension the app installs at bootstrap
// (skeleton/sidebar.js uses it for the plan badge). Provide the same contract.
if (!String.prototype.format) {
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : args[i]));
  };
}

const Tours = require(TOURS_PATH);
const { TOURS, tour, flaggedIds, stepProgress, isLastScreen } = Tours;

/** Minimal stand-in for a step widget: only mget is read. */
const widget = (attrs) => ({ mget: (k) => attrs[k] });

// ── registry invariants ──────────────────────────────────────────────────────

test("there is one way to count, and it counts screens", () => {
  // A second mode used to count STEPS, so every screen of a multi-step step
  // carried the same number — `full`'s four chat screens all read "STEP 2/6"
  // and none of them could be named. One mode now.
  const src = readFileSync(TOURS_PATH, "utf8");
  assert.ok(!/BY_STEPS|progress:/.test(src), "no per-tour counting mode remains");
  assert.equal(Tours.BY_STEPS, undefined);
  assert.equal(Tours.BY_FLOW, undefined);

  // Every screen of every tour gets a distinct number.
  for (const id of Object.keys(TOURS)) {
    const t = TOURS[id];
    const total = t.steps.reduce((n, s) => n + s.screens, 0);
    const seen = new Set();
    let offset = 0;
    for (const step of t.steps) {
      for (let k = 0; k < step.screens; k++) {
        const { step: at, steps } = stepProgress(
          { mget: (x) => ({ screen_offset: offset, tour_screens: total }[x]) }, k,
        );
        assert.equal(steps, total, `${id} total`);
        assert.ok(!seen.has(at), `${id} numbers two screens the same`);
        seen.add(at);
      }
      offset += step.screens;
    }
    assert.equal(seen.size, total, `${id} numbers every screen`);
  }
});

test("counting runs cumulatively across steps", () => {
  const t = TOURS.full;
  const total = t.steps.reduce((n, s) => n + s.screens, 0);
  assert.ok(total > 6, "full is the multi-step tour now");

  const seen = [];
  let offset = 0;
  for (const step of t.steps) {
    for (let k = 0; k < step.screens; k++) {
      seen.push(stepProgress(
        { mget: (x) => ({ screen_offset: offset, tour_screens: total }[x]) },
        k,
      ));
    }
    offset += step.screens;
  }
  // The count must NOT restart at the step boundary — that is the whole point.
  assert.deepEqual(seen.map((x) => x.step), seen.map((_x, i) => i));
  assert.ok(seen.every((x) => x.steps === total));
});

test("a single-step tour's flow count is just its own screens", () => {
  for (const id of ["workspace", "chat", "share", "migrate"]) {
    const n = TOURS[id].steps[0].screens;
    const ui = { mget: (x) => ({ screen_offset: 0, tour_screens: n }[x]) };
    assert.deepEqual(
      Array.from({ length: n }, (_, i) => stepProgress(ui, i)),
      Array.from({ length: n }, (_, i) => ({ step: i, steps: n })),
      id,
    );
  }
});

test("the host stamps screen_offset and tour_screens per step", () => {
  const out = build(TOURS.full);
  let running = 0;
  for (let i = 0; i < out.length; i++) {
    assert.equal(out[i].screen_offset, running, `step ${i} offset`);
    running += TOURS.full.steps[i].screens;
  }
  assert.ok(out.every((w) => w.tour_screens === running));
});

test("full walks every step in product order, and is never suppressed", () => {
  assert.equal(TOURS.full.flag, null);
  // `tutorial_folder` left this list when 2.0 promoted its screens to the
  // `chat` tour. Anything added to the registry that a user can reach only
  // through `full` (meeting) has to stay here or it becomes dead code.
  assert.deepEqual(
    TOURS.full.steps.map((s) => s.kind),
    [
      "tutorial_workspace",
      "tutorial_chat",
      "tutorial_meeting",
      "tutorial_task",
      "tutorial_share",
      "tutorial_migrate",
    ],
  );
});

test("meeting has no flag and no contextual trigger, so full is its only route", () => {
  assert.equal(TOURS.meeting.flag, null);
  assert.ok(TOURS.full.steps.some((s) => s.kind === "tutorial_meeting"));
});

test("an unknown tour id falls back to full rather than rendering nothing", () => {
  assert.equal(tour("nope").id, "full");
  assert.equal(tour(undefined).id, "full");
  assert.equal(tour("migrate").id, "migrate");
});

test("a tour's flag matches its id, since both are posted as one wire value", () => {
  for (const id of flaggedIds()) assert.equal(TOURS[id].flag, id);
});

// ── test 48 / 49 — badge derivation ──────────────────────────────────────────

test("48 a single-step tour counts SCREENS, never 1 of 1", () => {
  for (const id of flaggedIds()) {
    const t = TOURS[id];
    if (t.steps.length !== 1) continue; // folder_task is multi-step
    const n = t.steps[0].screens;
    const ui = widget({ tour_screens: n });
    const seen = [];
    for (let i = 0; i < n; i++) seen.push(stepProgress(ui, i));
    assert.deepEqual(
      seen,
      Array.from({ length: n }, (_, i) => ({ step: i, steps: n })),
      `${id} progress`,
    );
    assert.ok(n > 1, `${id} must have more than one screen to count`);
  }
});

test("48 each single-step tour counts its own screens", () => {
  // The counts come from the flows themselves: migrate walks the Files empty
  // state, its + New menu and three dialog states; share has six panel blocks;
  // chat has four thread screens.
  assert.equal(TOURS.migrate.steps[0].screens, 5);
  assert.equal(TOURS.share.steps[0].screens, 6);
  assert.equal(TOURS.chat.steps[0].screens, 5);
  const five = widget({ tour_screens: 5 });
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((i) => stepProgress(five, i)),
    [0, 1, 2, 3, 4].map((i) => ({ step: i, steps: 5 })),
  );
});

test("49 inside full, a step's screens continue the tour's count", () => {
  // tutorial_chat is full's second step and runs five screens. They pick up
  // where the workspace step left off rather than all sharing one number —
  // which is what made them impossible to point at.
  const total = TOURS.full.steps.reduce((n, s) => n + s.screens, 0);
  const offset = TOURS.full.steps[0].screens;
  const ui = widget({ screen_offset: offset, tour_screens: total });
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((i) => stepProgress(ui, i).step),
    [0, 1, 2, 3, 4].map((i) => offset + i),
  );
});

test("49 full's step numbering is 1/6 .. 6/6 with meeting at 3/6", () => {
  const n = TOURS.full.steps.length;
  const labels = TOURS.full.steps.map((s, i) => LOCALE.TUTORIAL_STEP.format(i + 1, n));
  assert.deepEqual(labels, [
    "STEP 1/6",
    "STEP 2/6",
    "STEP 3/6",
    "STEP 4/6",
    "STEP 5/6",
    "STEP 6/6",
  ]);
  assert.equal(TOURS.full.steps[2].kind, "tutorial_meeting");
});

// ── Done wording ─────────────────────────────────────────────────────────────

test("Done shows only on the last screen of the LAST step", () => {
  const last = widget({ is_last: true });
  assert.equal(isLastScreen(last, 0, 3), false);
  assert.equal(isLastScreen(last, 1, 3), false);
  assert.equal(isLastScreen(last, 2, 3), true);

  // Same widget, same screens, as a middle step of the full tour: Next
  // throughout, because there is a step after it.
  const middle = widget({ is_last: false });
  assert.equal(isLastScreen(middle, 2, 3), false);
});

// ── host: step payloads ──────────────────────────────────────────────────────

/** Lift one method out of the host so it can run without ui-core. */
function methodFn(signature, args) {
  const src = readFileSync(HOST_PATH, "utf8");
  const start = src.indexOf(`  ${signature} {`);
  assert.notEqual(start, -1, `${signature} not found in production source`);
  const end = src.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, `${signature} has no closing brace`);
  const body = src.slice(start + `  ${signature} {`.length, end);
  // eslint-disable-next-line no-new-func
  return new Function("BACKDROPS", `return function (${args}) {${body}};`);
}

const BACKDROP_STUB = {
  filesPane: () => ({ backdrop: "files" }),
};

/**
 * A host stand-in carrying the three methods that decide a step's payload, so
 * the gate is exercised through the real source rather than a restatement.
 *
 * @param {Object} [opt]
 * @param {String} [opt.tourId]  which tour is running
 * @param {Number} [opt.preview] the `preview` model attribute
 */
function hostStub(opt = {}) {
  const { tourId = "workspace", preview = 0 } = opt;
  return {
    warn: () => {},
    _tour: { id: tourId },
    mget: (k) => (k === "preview" ? preview : undefined),
    // methodFn returns a FACTORY taking BACKDROPS; these two do not use it.
    _canCreate: methodFn("_canCreate()", "")(),
    _screensFor: methodFn("_screensFor(step)", "step")(),
    _buildWidgets: methodFn("_buildWidgets(t)", "t")(BACKDROP_STUB),
  };
}

function build(tourDef, opt) {
  const host = hostStub({ tourId: tourDef && tourDef.id, ...opt });
  return host._buildWidgets(tourDef);
}



test("no step takes a backdrop; every step draws its own pane", () => {
  // Steps used to be able to be an ARRAY — inert scenery followed by the
  // interactive widget — so several could share one drawing of the Files pane.
  // 2.0 removed the need: each step's pane is part of what that step teaches
  // (migrate points at the Files CTA, share at the grid it shares from), so
  // nothing is inert scenery any more and the mechanism went with it.
  for (const t of Object.values(TOURS)) {
    for (const step of t.steps) {
      assert.equal(step.backdrop, undefined, `${t.id} still declares a backdrop`);
    }
  }
  for (const t of Object.values(TOURS)) {
    for (const w of build(t)) {
      assert.equal(Array.isArray(w), false, `${t.id} feeds an array`);
    }
  }
  const host = readFileSync(HOST_PATH, "utf8");
  assert.ok(!/BACKDROPS/.test(host), "the host no longer resolves backdrops");
  assert.ok(
    !existsSync(join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skeleton/toolkit/backdrops.js")),
    "the composer file is gone too",
  );
});

// ── the live-screen gate ─────────────────────────────────────────────────────
//
// The workspace step's last two screens stop being a mock: a real create form
// and the invite screen after it. They must run on the post-signup run and
// NOWHERE else, because the other two ways into this tour are a QA preview
// (exempt from the seen-set, so the same URL works twice) and a re-watch from
// Get help (by someone who already has workspaces). Both would create real
// workspaces, silently, every time.

test("the post-signup workspace run is eight screens, badge included", () => {
  // The live tail is counted. It was briefly left out on the argument that a
  // form is not a step of a walkthrough — true of the form, false of the user,
  // who is still being led somewhere and wants to know how far along that is.
  const [step] = build(TOURS.workspace);
  assert.equal(step.screen_count, 8, "the form and the invite card run");
  assert.equal(step.tour_screens, 8, "and the pill counts them");
});

test("the preview URL reaches the create form too", () => {
  // It was gated off at first, on the grounds that ?tutorial=workspace is
  // exempt from the seen-set and so runs twice. But loading it twice does not
  // create two workspaces — nothing is created until someone types a name and
  // presses Create. Gating it only made the feature unreachable for anyone who
  // is not a fresh signup, which is everyone testing it.
  const [step] = build(TOURS.workspace, { preview: 1 });
  assert.equal(step.screen_count, 8);
  assert.equal(step.tour_screens, 8);
});

test("the workspace step inside `full` is mock-only", () => {
  // The one gate that still protects a user: someone re-watching the tour from
  // Get help already has workspaces and asked to SEE the product. `full`
  // declares no live tail, so there is nothing to run.
  const out = build(TOURS.full);
  assert.equal(out[0].kind, "tutorial_workspace");
  assert.equal(out[0].screen_count, 6);
  // Every later step's offset shifts if this one is miscounted.
  assert.equal(out[1].screen_offset, 6, "chat starts after six workspace screens");
  assert.equal(
    out[out.length - 1].tour_screens,
    TOURS.full.steps.reduce((n, s) => n + s.screens, 0),
    "the full tour's own total is unchanged",
  );
});

test("the registry declares live screens on the standalone tour only", () => {
  assert.equal(TOURS.workspace.steps[0].live_screens, 2);
  for (const [id, t] of Object.entries(TOURS)) {
    if (id === "workspace") continue;
    for (const step of t.steps) {
      assert.ok(
        !step.live_screens,
        `${id} must not declare live screens — only the post-signup run creates`,
      );
    }
  }
});

test("a step with no live_screens is untouched by the gate", () => {
  for (const opt of [{}, { preview: 1 }]) {
    const out = build(TOURS.share, opt);
    assert.equal(out[0].screen_count, TOURS.share.steps[0].screens);
  }
});

test("is_first / is_last / screen_count are stamped per step", () => {
  const out = build(TOURS.full);
  assert.equal(out.length, 6);
  assert.equal(out[0].is_first, true);
  assert.equal(out[0].is_last, false);
  assert.equal(out[5].is_first, false);
  assert.equal(out[5].is_last, true);
  assert.deepEqual(out.map((w) => w.screen_count), [6, 5, 3, 6, 6, 5]);
  // The numbers are drawn from the screen offsets, not from a pre-formatted
  // string and not from a step index.
  assert.deepEqual(out.map((w) => w.screen_offset), [0, 6, 11, 14, 20, 26]);
  assert.ok(out.every((w) => w.tour_screens === 31));
  assert.ok(out.every((w) => w.badge_text === undefined), "badge_text is retired");
  assert.ok(out.every((w) => w.progress_mode === undefined), "the mode is retired");
});

test("a single-step tour is stamped first AND last, and counts by screens", () => {
  // Bare, not an array: migrate draws its own Files pane now — two of its five
  // screens are ABOUT that pane — so it takes no backdrop.
  const w = build(TOURS.migrate)[0];
  assert.equal(Array.isArray(w), false);
  assert.equal(w.is_first, true);
  assert.equal(w.is_last, true);
  assert.equal(w.screen_count, 5);
});

// Regression: the full tour used to jump from step 8 to step 12.
//
// ui-core binds an onclick to every widget that is not `active: 0` and
// dispatches that widget's own `service` to its uiHandler. The step widget's
// element IS the step's whole pane, and the scenery inside it is all
// `active: 0` — so it has no handler of its own and every click bubbles up to
// the step wrapper. While the wrapper named `next-step`, one stray click
// anywhere on a pane advanced the whole STEP rather than the screen: clicking
// the chat pane on screen 2 of 5 skipped straight to the meeting step, and
// screens 3, 4 and 5 (steps 9, 10 and 11) never rendered.
//
// The handoff is explicit now — triggerHandlers({ service: 'next-step' }) from
// the step's last screen — so the wrapper must stay service-less.
test("a step widget names no service, so its pane is not a giant Next button", () => {
  const every = [...build(TOURS.full), ...build(TOURS.migrate), ...build(TOURS.chat)];
  for (const w of every.flat()) {
    assert.equal(w.service, undefined, `${w.kind} must not carry a clickable service`);
    // It still has to be able to reach the host when it does hand off.
    assert.ok(Array.isArray(w.uiHandler) && w.uiHandler.length === 1);
  }
});

test("offsets carry the count across a step boundary", () => {
  const t = { id: "bogus", steps: [{ kind: "a", screens: 2 }, { kind: "b", screens: 3 }] };
  const out = build(t);
  assert.deepEqual(out.map((w) => w.screen_offset), [0, 2]);
  assert.deepEqual(out.map((w) => w.tour_screens), [5, 5]);
});

// ── the four-site allow-list (§4 S2 / M2) ────────────────────────────────────

test("the lib's TOUR_IDS matches the registry's flagged tours", () => {
  const src = readFileSync(LIB_PATH, "utf8");
  const m = src.match(/const TOUR_IDS = \[([^\]]*)\]/);
  assert.ok(m, "TOUR_IDS not found in libs/tutorial-tours.js");
  const ids = [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
  assert.deepEqual(ids.slice().sort(), flaggedIds().slice().sort());
});

test("the two server-team sites match too, when that repo is checked out", (t) => {
  // Sibling checkout; CI for ui-team alone will not have it. Skipping is
  // honest — the guard is for a developer changing one site of four.
  const SERVER = join(REPO_ROOT, "..", "server-team");
  const svc = join(SERVER, "service/private/drumate.js");
  const acl = join(SERVER, "acl/drumate.json");
  if (!existsSync(svc) || !existsSync(acl)) {
    t.skip("server-team not checked out beside ui-team");
    return;
  }
  const src = readFileSync(svc, "utf8");
  const m = src.match(/const __TUTORIAL_TOURS = \[([^\]]*)\]/);
  assert.ok(m, "__TUTORIAL_TOURS not found in service/private/drumate.js");
  const ids = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  assert.deepEqual(ids.slice().sort(), flaggedIds().slice().sort());

  const doc = JSON.parse(readFileSync(acl, "utf8")).services.tutorial_seen.doc;
  for (const id of flaggedIds()) {
    assert.ok(doc.includes(id), `acl doc string does not mention "${id}"`);
  }
});

// ── the shell must not decide step one (regression) ──────────────────────────

test("the shell's step slot is EMPTY — it must not hardcode a step", () => {
  // It used to plant `tutorial_workspace` here. That was correct while there
  // was one tour that always began with the workspace step, and became a bug
  // the moment the registry decided which tour runs: every contextual tour
  // opened on the workspace step regardless of what was asked for, because the
  // registry chose steps 2..n while the skeleton silently chose step 1.
  const shell = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skeleton/index.js"), "utf8",
  );
  // Bound the slice to the content Box itself — reading to EOF would catch the
  // spotlight entry below it, which legitimately names a kind.
  const at = shell.indexOf("sys_pn: _a.content");
  assert.notEqual(at, -1, "the content slot moved");
  const slot = shell.slice(at, shell.indexOf("})", at));
  assert.ok(
    !/kind:\s*['"`]tutorial_/.test(slot),
    "the step slot must not name a step widget — the registry decides",
  );
  assert.ok(!/kids/.test(slot), "slot must have no kids");
});

test("the host feeds the entry step from the registry on mount", () => {
  const host = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js"), "utf8",
  );
  const dom = host.slice(host.indexOf("  onDomRefresh() {"));
  const body = dom.slice(0, dom.indexOf("\n  }\n"));
  // _stepIndex is 0 for every normal run; only ?tutorial=…&step=n moves it.
  assert.match(body, /ensurePart\(_a\.content\)[\s\S]*?_widgetAt\(this\._stepIndex/);
  // And it must come after the shell exists, or there is no part to feed.
  assert.ok(body.indexOf("require('./skeleton')") < body.indexOf("_widgetAt("));
  assert.match(host, /this\._stepIndex = this\._entryStep\(\)/);
});

test("every tour's step one is its OWN first step, not the workspace step", () => {
  const first = {};
  for (const id of Object.keys(TOURS)) first[id] = TOURS[id].steps[0].kind;
  assert.deepEqual(first, {
    workspace: "tutorial_workspace",
    folder_task: "tutorial_task",
    chat: "tutorial_chat",
    share: "tutorial_share",
    migrate: "tutorial_migrate",
    meeting: "tutorial_meeting",
    full: "tutorial_workspace",
  });
});

// ── ?tutorial= as a UI-testing tool ──────────────────────────────────────────

test("entryScreen: default 0, enter_at_last, and a 1-based screen target", () => {
  const { entryScreen } = require(join(REPO_ROOT, "src/drumee/modules/desk/tutorial/tours.js"));
  const ui = (a) => ({ mget: (k) => a[k] });

  assert.equal(entryScreen(ui({}), 5), 0, "normal run opens on screen 1");
  assert.equal(entryScreen(ui({ enter_at_last: true }), 5), 4, "Back resumes on the last");

  // 1-based in the URL, because that is what the badge shows.
  assert.equal(entryScreen(ui({ enter_at_screen: "1" }), 5), 0);
  assert.equal(entryScreen(ui({ enter_at_screen: "3" }), 5), 2);
  assert.equal(entryScreen(ui({ enter_at_screen: 5 }), 5), 4);

  // Clamped: a nonsense value must land somewhere real, never render nothing.
  assert.equal(entryScreen(ui({ enter_at_screen: "0" }), 5), 0);
  assert.equal(entryScreen(ui({ enter_at_screen: "99" }), 5), 4);
  assert.equal(entryScreen(ui({ enter_at_screen: "junk" }), 5), 0);

  // An explicit screen wins over enter_at_last — the URL is the later intent.
  assert.equal(entryScreen(ui({ enter_at_last: true, enter_at_screen: "2" }), 5), 1);
});

test("every step widget resolves its entry screen through the shared helper", () => {
  // Five widgets used to each carry `if (mget('enter_at_last')) …`. Screen
  // targeting has to work in all of them or it works in none.
  const dir = join(REPO_ROOT, "src/drumee/modules/desk/tutorial");
  for (const step of ["workspace", "chat", "task", "share", "migrate"]) {
    const src = readFileSync(join(dir, step, "index.js"), "utf8");
    // `\w+.length` or `this._screens.length` — the workspace step slices its
    // table per run (the live tail is post-signup only), so the length it
    // resolves against is a getter rather than the module constant.
    assert.match(
      src, /entryScreen\(this, (?:this\.)?[\w.]+\.length\)/,
      `${step} must use entryScreen`,
    );
    assert.ok(
      !/mget\(['"]enter_at_last['"]\)/.test(src),
      `${step} must not hand-roll the entry rule any more`,
    );
  }
});

test("a forced tour is a PREVIEW — it must not burn the flag", () => {
  const host = readFileSync(join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js"), "utf8");
  // markSeen is skipped when the widget was launched with preview set.
  assert.match(host, /if \(this\._tour\.flag && !this\.mget\('preview'\)\)/);

  const desk = readFileSync(join(REPO_ROOT, "src/drumee/modules/desk/index.js"), "utf8");
  assert.match(desk, /_forcedTourOpt\(\)[\s\S]*?preview: 1/);
  // …and only the explicit branch passes it; a contextual tour still records.
  assert.match(desk, /if \(explicit\) \{\s*this\._showTutorial\(forced, this\._forcedTourOpt\(\)\)/);
  assert.match(desk, /return Tours\.fire\("workspace", this\)/);
});

// ── the chat-feature screen (Figma 3202:3732) ────────────────────────────────

test("chat runs five screens, in its own tour and inside full alike", () => {
  // Five: the Chat empty state (142:38674) that opens the flow, then the four
  // thread screens. The empty state was missing.
  assert.equal(TOURS.chat.steps[0].screens, 5);
  // The same widget renders both, so a count that differs between them
  // mis-numbers one of the two tours.
  assert.equal(TOURS.full.steps[1].kind, "tutorial_chat");
  assert.equal(TOURS.full.steps[1].screens, 5);
});

/** Every registry step that names this kind, across all tours. */
function allSteps(kind) {
  const out = [];
  for (const t of Object.values(TOURS)) {
    for (const step of t.steps) if (step.kind === kind) out.push(step);
  }
  return out;
}

test("each step widget's SCREENS table matches the registry count", () => {
  // The registry says how many screens a step has; the widget owns the table.
  // They are declared in different files and nothing links them at runtime, so
  // a screen added to one and not the other mis-counts every dash after it.
  //
  // A kind MAY be declared at two counts, but only one way: the larger
  // declaration carries a `live_screens` tail that the smaller one leaves off,
  // and the difference is exactly that tail. Any other disagreement is the bug
  // this test was written for. The widget's table holds the larger count and
  // the host slices it per run (_screensFor).
  const declared = {};
  for (const t of Object.values(TOURS)) {
    for (const step of t.steps) {
      const dir = step.kind.replace(/^tutorial_/, "");
      const prev = declared[dir];
      if (prev !== undefined && prev !== step.screens) {
        const [big, small] = prev > step.screens
          ? [{ ...t.steps.find((x) => x.kind === step.kind), screens: prev }, step]
          : [step, { screens: prev }];
        const live = ~~allSteps(step.kind)
          .map((x) => ~~x.live_screens)
          .reduce((a, b) => Math.max(a, b), 0);
        assert.ok(live > 0, `${step.kind} differs with no live_screens to explain it`);
        assert.equal(
          big.screens - live, small.screens,
          `${step.kind}: the gap between declarations must be exactly the live tail`,
        );
      }
      declared[dir] = Math.max(prev || 0, step.screens);
    }
  }
  for (const [dir, screens] of Object.entries(declared)) {
    const src = readFileSync(
      join(REPO_ROOT, `src/drumee/modules/desk/tutorial/${dir}/index.js`), "utf8",
    );
    const table = src.slice(src.indexOf("const SCREENS = ["));
    if (!table) continue;
    const body = table.slice(0, table.indexOf("\n];"));
    // One entry per screen. Every table names a target, an anchor or a lit
    // block on each row, so the row count is what the depth-1 `{` count gives.
    const rows = (body.match(/^ {2}\{/gm) || []).length;
    if (rows === 0) continue; // single-screen steps (meeting, schedule)
    assert.equal(rows, screens, `${dir}'s SCREENS table is out of step`);
  }
});


test("the cursor icon exists in the sprite", () => {
  // It is not a hand-drawn path: it is the design's own vector, added to the
  // icon pipeline. Without the sprite entry the glyph renders empty.
  const sprite = readFileSync(join(REPO_ROOT, "icons/sprites/normalized.sprite.svg"), "utf8");
  assert.ok(sprite.includes('id="--icon-tutorial-cursor"'), "run npm run build:icons");
  assert.ok(
    require("node:fs").existsSync(join(REPO_ROOT, "icons/src/normalized/tutorial-cursor.svg")),
    "the source svg must be committed, not just the built sprite",
  );
});





// ── the two failures that render as "nothing happens" ───────────────────────

test("every decorative node in the mock is inert", () => {
  // ui-core binds an onclick to EVERY widget that does not say `active: 0`,
  // and __handleClick stopPropagation()s before dispatching. A decorative node
  // therefore swallows the click meant for whatever is under it — which is how
  // the tour shipped stuck on screen one: the bare bubble's only control is the
  // card itself, and its one child ate every press.
  //
  // Two halves of one rule, and the second is the trap: a node either declares
  // a service or is inert, AND a node that declares a service must not also be
  // inert — ui-core only binds the click when `active` is truthy, so
  // `active: 0` beside a service is a control that silently does nothing.
  //
  // Both are judged on the node's OWN keys. A container whose descendant has a
  // service is still decorative, and a descendant's `dataset: { active: 1 }`
  // says nothing about the container.
  const files = [
    "skeleton/toolkit/tooltip.js",
    "skeleton/toolkit/files.js",
    "skeleton/toolkit/workspace-dialog.js",
    "skeleton/sidebar.js",
    "skeleton/topbar.js",
    "chat/skeleton/index.js",
    "migrate/skeleton/index.js",
    "meeting/skeleton/index.js",
    "schedule/skeleton/index.js",
    "task/skeleton/index.js",
    "task/skeleton/board.js",
    "share/skeleton/panel.js",
  ];
  const CALL = /Skeletons\.(?:Box\.[XYGZ]|Note|Image\.Svg|Element|Button\.Svg|Button\.Label)\(\{/g;

  /** Values of the object literal's depth-1 keys, keyed by name. */
  const ownKeys = (body) => {
    const out = {};
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (c === "{" || c === "[" || c === "(") depth++;
      else if (c === "}" || c === "]" || c === ")") depth--;
      else if (depth === 1 && /[,{\s]/.test(body[i - 1] || "{")) {
        const m = /^([A-Za-z_$][\w$]*)\s*:\s*([^,\n]*)/.exec(body.slice(i));
        if (m) { out[m[1]] = m[2].trim(); i += m[1].length; }
      }
    }
    return out;
  };

  for (const rel of files) {
    const src = readFileSync(
      join(REPO_ROOT, "src/drumee/modules/desk/tutorial", rel), "utf8",
    );
    let m;
    while ((m = CALL.exec(src))) {
      let depth = 0;
      let i = m.index + m[0].length - 1;
      for (; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}" && --depth === 0) break;
      }
      const body = src.slice(m.index + m[0].length - 1, i + 1);
      const keys = ownKeys(body);
      const head = body.slice(0, 180);
      const hasService = "service" in keys;
      const spreadsControl = /\.\.\.\(/.test(body) && /service:/.test(body);
      assert.ok(
        hasService || spreadsControl || keys.active === "0",
        `${rel}: a node with no service must carry active: 0 —\n${head}`,
      );
      if (hasService && !spreadsControl) {
        assert.notEqual(
          keys.active, "0",
          `${rel}: a node with a service must not be inert —\n${head}`,
        );
      }
    }
  }
});

test("the callout's beak hangs outside the card, not inside it", () => {
  // The tail is a rotated square positioned against one edge. At `0` its whole
  // box sits inside the card and the callout renders with no tail at all —
  // which is not an error, just a bubble that points at nothing. Its CENTRE has
  // to land on the card's edge, which is what puts the kept half outside.
  //
  // It used to be a whole square at `z-index: -1`, on the understanding that
  // the inner half was covered by the card. It never was: a negative z-index
  // child paints in its parent's stacking context AFTER the parent's background
  // (CSS 2.1 Appendix E — step 2 follows step 1), so the inner half sat ON the
  // card. Invisible while both were white, but its inherited box-shadow drew a
  // grey seam across the card's face beside the tail. Only the outer half is
  // drawn now, so what is asserted here is the clip and the shadow that follows
  // it — a box-shadow would be clipped away with everything else.
  const tip = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skin/tooltip.scss"), "utf8",
  );
  for (const [dir, side] of [
    ["north", "top"], ["south", "bottom"], ["east", "right"], ["west", "left"],
  ]) {
    const re = new RegExp(
      `data-direction="${dir}"\\]::after \\{ ${side}: -\\$beak \\+ 1px; \\}`,
    );
    assert.match(tip, re, `${dir}'s beak must be offset outward on ${side}`);
    // One clip per direction, or a card would show the whole square again.
    assert.match(
      tip,
      new RegExp(`\\[data-direction="${dir}"\\]::after \\{ clip-path: polygon\\(`),
      `${dir}'s beak must be clipped to its outer wedge`,
    );
  }
  assert.match(
    tip,
    /&::after \{[\s\S]*?background: inherit;[\s\S]*?filter: drop-shadow\(/,
    "the beak takes the card's surface and carries its own clipped shadow",
  );
  assert.doesNotMatch(
    tip,
    /&::after \{[\s\S]*?box-shadow: inherit;/,
    "a box-shadow on the beak is clipped away by clip-path — use the filter",
  );
});

test("a step swap clears the spotlight BEFORE feeding the next step", () => {
  // These were two independent promise chains, and clear() ends in a second
  // async hop of its own. A step that mounted quickly raised spotlight:focus,
  // got its callout rendered, and then the PREVIOUS step's stale clear landed
  // and wiped it — a scrim with no callout, i.e. a tour with no way forward.
  // The meeting step hit it every time: one screen, one part to await, and
  // preloaded, so it had the shortest path from mount to callout.
  const host = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js"), "utf8",
  );
  const body = host.slice(host.indexOf("  async _showStep("));
  const fn = body.slice(0, body.indexOf("\n  }\n"));
  assert.ok(
    fn.indexOf("clear()") < fn.indexOf("content.feed("),
    "the spotlight must be put down before the next step is fed",
  );
  assert.match(fn, /await\s+spotlight\.clear\(\)/, "and the clear must be awaited");
  // Both entry points go through it, so neither can drift back to the old shape.
  assert.match(host, /_nextStep\(\)[\s\S]{0,400}this\._showStep\(/);
  assert.match(host, /_prevStep\(\)[\s\S]{0,600}this\._showStep\(/);

  // …and the spotlight refuses a stale clear on its own side, so a late one
  // from anywhere else cannot wipe a newer callout either.
  const spot = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/spotlight/index.js"), "utf8",
  );
  assert.match(spot, /async clear\(\) \{[\s\S]*?\+\+this\._seq/);
  assert.match(spot, /if \(this\._stale\(ticket\)\) return;/);
  // A target with no box must not end the screen in silence. Between two
  // SCREENS of one step nothing else clears the callout — _showStep only runs
  // on step boundaries — so bailing used to leave the PREVIOUS screen's card
  // up with a live Next on it, and the tour walked forward on a control that
  // belonged to a screen the user had already passed.
  assert.match(spot, /const usable = \(r\) => !!\(r && r\.width && r\.height\)/);
  assert.match(spot, /if \(!usable\(box\)\) \{/);
  // Prefer the anchor while it still measures: pointing at the row instead of
  // the panel it sits in beats showing no callout.
  assert.match(spot, /usable\(measuredAnchor\)[\s\S]{0,200}box = measuredAnchor/);
  // Failing that, the step's own root, and failing THAT, the middle of the
  // tour with nothing lit — but a callout, always. A missing one strands the
  // user on a screen with no way out.
  assert.match(spot, /usable\(rootRect\)[\s\S]{0,120}box = rootRect/);
  // Inside focus(), the only callout-less answer left is an explicit focus with
  // no tooltip at all — clear() is the other, and it is meant to empty it. A
  // screen that HAS a tooltip always gets it drawn.
  //
  // `clear()`, never `feed(null)`. ui-core's feed treats a falsy payload as
  // "nothing to do" and returns the last child untouched (widgets/box), so
  // feeding null emptied nothing and left the PREVIOUS screen's card up — which
  // is exactly how the invite screen came to wear the create screen's callout.
  // Every step boundary happens to feed a new card straight afterwards, which
  // is the only reason it went unnoticed for so long.
  const focusBody = spot.slice(spot.indexOf("async focus("), spot.indexOf("async clear("));
  assert.equal(focusBody.split("callout.clear()").length - 1, 1);
  assert.match(focusBody, /if \(!tooltip\) \{[\s\S]{0,400}callout\.clear\(\);/);
  assert.doesNotMatch(spot, /callout\.feed\(null\)/, "feed(null) clears nothing");
  // And a part handed over from the previous render is re-resolved to the live
  // element before anything is measured, since a detached node measures 0x0.
  assert.match(spot, /function live\(el\)[\s\S]{0,500}data-partname/);
  assert.match(spot, /const el = live\(elementOf\(target\)\)/);
});

test("the callout outranks the lit surface it may overlap", () => {
  // The three layers interleave with something the spotlight does not contain:
  // the lit surface, which _light promotes to 10004 out in the pane. The order
  // has to be scrim 10003 < lit 10004 < callout 10010, and that only holds
  // while the scrim and the callout share a stacking context with the lit
  // element.
  //
  // A z-index (or an opacity below 1) on the spotlight ROOT opens a context of
  // its own and flattens everything inside it to that single level, so the lit
  // element wins every overlap. The callout was still painted — just under a
  // transparent box that swallowed the clicks. Verified by hit-testing: with a
  // z-index on the root, elementFromPoint at the centre of Next answers the lit
  // element; without it, Next. On step 8 the lit `stream` is 1315x961 and the
  // card sits inside it, so Back and Next were visible and dead.
  const skin = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/spotlight/skin/index.scss"), "utf8",
  );
  const root = skin.slice(skin.indexOf("&__ui {"), skin.indexOf("&__scrim,"));
  assert.ok(root.indexOf("z-index") === -1, "the spotlight root must open no stacking context");
  assert.ok(root.indexOf("opacity") === -1, "…and an opacity below 1 opens one too");
  // The layers that DO carry a level, and their order.
  // lastIndexOf: `&__callout {` also appears in the shared fade block above,
  // which carries no level of its own.
  const zOf = (sel) => {
    const at = skin.lastIndexOf(sel);
    const m = /z-index:\s*(\d+)/.exec(skin.slice(at));
    return m ? Number(m[1]) : null;
  };
  const scrim = zOf("&__scrim {");
  const callout = zOf("&__callout {");
  assert.ok(scrim < 10004, `scrim (${scrim}) must sit under the lit surface`);
  assert.ok(callout > 10004, `callout (${callout}) must sit over it`);
});

test("the callout is kept inside the tour, tail still on its anchor", () => {
  // anchorFor places the card from the ANCHOR's centre and bounds nothing, and
  // __layout is overflow:hidden — so a block near an edge put part of the card
  // outside and the clip took its buttons with it. Share's step 5 rings Link
  // Expiration near the bottom of the panel and lost its Next exactly that way:
  // the callout was on screen, its control was not.
  const spot = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/spotlight/index.js"), "utf8",
  );
  assert.match(spot, /_keepInView\(/, "focus must bound the callout");
  assert.match(spot, /await this\._keepInView\(callout, ticket\)/,
    "and do it under the same staleness ticket");
  // Measured after it SETTLES, not next-frame: feed() mounts the card's
  // children over several frames, and a short measurement under-nudges.
  const body = spot.slice(spot.indexOf("async _keepInView("));
  const fn = body.slice(0, body.indexOf("\n  }\n"));
  assert.match(fn, /await waitForStableRect\(card\)/);
  assert.match(fn, /BEAK_INSET/, "the nudge is capped so the tail stays on the card");
  assert.match(fn, /--bubble-nudge-x/);
  assert.match(fn, /--bubble-nudge-y/);

  // The skin has to COMPOSE the nudge with each placement transform rather
  // than replace it, and subtract it from the beak so the tail holds its
  // place on the anchor while the card moves.
  const tip = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skin/tooltip.scss"), "utf8",
  );
  const placements = tip.match(/transform: translate[XY]\([^;]*;/g) || [];
  assert.ok(placements.length >= 6, "six placements: 3 beak offsets x 2 axes");
  for (const rule of placements) {
    assert.match(rule, /\$nudge|--bubble-nudge/,
      `a placement transform drops the nudge: ${rule}`);
  }
  assert.match(tip, /margin-left: calc\(-1 \* #\{\$beak\} - var\(--bubble-nudge-x/);
  assert.match(tip, /margin-top: calc\(-1 \* #\{\$beak\} - var\(--bubble-nudge-y/);
  // The cap is shared with the JS; they have to agree or the tail can leave.
  assert.match(tip, /\$beak-inset: 26px;/);
  assert.match(spot, /const BEAK_INSET = 26;/);
});

test("every step numbers its screens", () => {
  // Only the share flow showed a step counter, so a reviewer could point at
  // "share step 4" and nothing else. Every step passes stepProgress now, and
  // the callout's default indicator is the pill, because a dash bar shows how
  // far along you are without letting anyone NAME the screen.
  const dir = join(REPO_ROOT, "src/drumee/modules/desk/tutorial");
  for (const step of ["workspace", "chat", "task", "meeting", "share", "migrate", "schedule"]) {
    const src = readFileSync(join(dir, step, "index.js"), "utf8");
    // Spread directly, or spread through a condition — the workspace step
    // numbers its six walkthrough screens and deliberately leaves the live
    // tail after them unnumbered, because "STEP 7/6" is what numbering the
    // create form would print.
    assert.match(
      src, /\.\.\.\(?[\w\s?]*stepProgress\(/,
      `${step} must number its screens`,
    );
  }
  const tip = readFileSync(join(dir, "skeleton/toolkit/tooltip.js"), "utf8");
  assert.match(tip, /progressStyle = "pill"/);
  // Both shapes of the card carry the header, so a bare bubble is numbered too.
  assert.equal((tip.match(/header\(\),/g) || []).length, 2);
  // …and the pill must not depend on String.prototype.format, which is a
  // bootstrap patch and now on the hot path of every callout.
  assert.ok(!/TUTORIAL_STEP \|\| "STEP \{0\}\/\{1\}"\)\.format/.test(tip));
});

// ── the chat tour (Figma 142:39178 / 169:39799 / 142:39530 / 169:40101) ─────

test("the action bar mirrors the real one, icon for icon", () => {
  const fixture = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/chat/fixture.js"), "utf8",
  );
  const real = readFileSync(
    join(REPO_ROOT, "src/drumee/builtins/widget/chat-item/skeleton/menu.js"), "utf8",
  );
  // Every glyph the tour draws must be one the live toolbar actually uses,
  // otherwise the tour teaches a bar the user will never meet.
  for (const ico of [
    "chat-action-reply", "ctxmenu-chat-thread", "chat-action-copy",
    "chat-action-forward", "chat-action-trash", "chat-action-check",
    "chat-action-smiley",
  ]) {
    assert.ok(fixture.includes(ico), `tour is missing ${ico}`);
    assert.ok(real.includes(ico), `${ico} is not in the real toolbar any more`);
  }
});

test("reply-in-thread leads the bar and carries the cursor", () => {
  const fixture = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/chat/fixture.js"), "utf8",
  );
  const list = fixture.slice(fixture.indexOf("const ACTIONS = ["));
  const order = [...list.slice(0, list.indexOf("];")).matchAll(/ico: "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(order[0], "ctxmenu-chat-thread", "the thread control must lead");
  // The cursor and the brand tint hang off the same `mark`, so they cannot
  // drift onto different icons.
  assert.match(fixture, /ico: "ctxmenu-chat-thread", mark: "thread"/);
  const skel = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/chat/skeleton/index.js"), "utf8",
  );
  assert.match(skel, /a\.mark === 'thread'[\s\S]{0,800}ico: 'tutorial-cursor'/);
});

test("the cursor icon exists in the sprite", () => {
  // It is not a hand-drawn path: it is the design's own vector, added to the
  // icon pipeline. Without the sprite entry the glyph renders empty.
  const sprite = readFileSync(join(REPO_ROOT, "icons/sprites/normalized.sprite.svg"), "utf8");
  assert.ok(sprite.includes('id="--icon-tutorial-cursor"'), "run npm run build:icons");
  assert.ok(
    existsSync(join(REPO_ROOT, "icons/src/normalized/tutorial-cursor.svg")),
    "the source svg must be committed, not just the built sprite",
  );
});

test("the lit surface and the callout's anchor are separate elements", () => {
  // Deliberately different: the panel decides how much comes out of the scrim,
  // one row inside it decides where the beak lands. target/anchor exist for
  // exactly this, and collapsing them is what makes a callout point at the
  // middle of a panel instead of at the thing it names.
  const chat = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/chat/index.js"), "utf8",
  );
  const table = chat.slice(chat.indexOf("const SCREENS = ["), chat.indexOf("\n];"));
  const rows = table.split(/^ {2}\{/m).slice(1);
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.match(row, /target: '/, "every screen names what is lit");
    assert.match(row, /anchor: '/, "every screen names what the beak points at");
  }
  // Screen 2 marks the reply-in-thread control specifically, not the bar.
  assert.match(rows[2], /anchor: 'hint-thread'/);

  const skel = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/chat/skeleton/index.js"), "utf8",
  );
  // Both parts have to exist, or the spotlight silently falls back to
  // measuring one element for both jobs.
  for (const pn of ["stream", "composer", "hint-thread", "thread", "thread-file", "thread-composer", "msg-"]) {
    assert.ok(skel.includes(pn), `the pane never names ${pn}`);
  }
});

test("the hover bar shows on screen 2 only", () => {
  const chat = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/chat/index.js"), "utf8",
  );
  assert.equal((chat.match(/pane: \{ hint: true \}/g) || []).length, 1);
});

// ── the scheduler, folder_task's closing screen ──────────────────────────────

test("folder_task is the tracker, and the scheduler left it", () => {
  // The scheduler used to be a step of its own here. 2.0 puts it at the end of
  // the MEET flow (156:19597), which is where anyone would reach it — so this
  // tour is the tracker's own six screens and nothing else.
  assert.deepEqual(TOURS.folder_task.steps.map((s) => s.kind), ["tutorial_task"]);
  assert.equal(TOURS.folder_task.steps[0].screens, 6);
  for (const t of Object.values(TOURS)) {
    assert.ok(
      !t.steps.some((s) => s.kind === "tutorial_schedule"),
      `${t.id} still runs the retired scheduler step`,
    );
  }
});

test("full is untouched by the scheduler", () => {
  // tutorial_meeting is the call itself and stays full's third step; the
  // scheduler is where a call is started from and belongs to folder_task. If
  // these ever merge, `full` is where the regression will show first.
  assert.equal(TOURS.full.steps.length, 6);
  assert.ok(!TOURS.full.steps.some((s) => s.kind === "tutorial_schedule"));
  assert.ok(TOURS.full.steps.some((s) => s.kind === "tutorial_meeting"));
});

test("every kind a tour names is registered in seeds.js", () => {
  // A kind with no seeds entry does not throw — Kind.waitFor simply never
  // resolves, so the tour stalls on a blank screen with nothing in the console.
  // Cheaper to catch here.
  const seeds = readFileSync(join(REPO_ROOT, "src/drumee/seeds.js"), "utf8");
  const kinds = new Set();
  for (const t of Object.values(TOURS)) t.steps.forEach((s) => kinds.add(s.kind));
  for (const kind of kinds) {
    assert.ok(
      new RegExp(`\\b${kind}:\\s*function`).test(seeds),
      `${kind} is named by a tour but has no seeds.js entry`,
    );
  }
});

test("the scheduler's slot unit matches the rules its blocks sit on", () => {
  // Meeting blocks are positioned in multiples of SLOT while the grid rules are
  // drawn from $slot. If the two drift, every block lands off its hour line —
  // which looks like a data bug and is not one.
  const dir = "src/drumee/modules/desk/tutorial/schedule";
  const skel = readFileSync(join(REPO_ROOT, `${dir}/skeleton/index.js`), "utf8");
  const skin = readFileSync(join(REPO_ROOT, `${dir}/skin/index.scss`), "utf8");
  const js = /const SLOT = (\d+);/.exec(skel);
  const scss = /\$slot: (\d+)px;/.exec(skin);
  assert.ok(js && scss, "both slot constants must be findable");
  assert.equal(js[1], scss[1], "SLOT and $slot must agree");
});
