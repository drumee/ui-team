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
const { TOURS, tour, flaggedIds, stepBadge, isLastScreen, BADGE_BY_FLOW, BADGE_BY_STEPS } = Tours;

/** Minimal stand-in for a step widget: only mget is read. */
const widget = (attrs) => ({ mget: (k) => attrs[k] });

// ── registry invariants ──────────────────────────────────────────────────────

test("every flagged tour badges as one continuous flow", () => {
  // A contextual tour is one thing to the person being shown it, however many
  // step widgets it is built from — so the counter runs straight through.
  // `full` and `meeting` keep step numbering, which is what they have always
  // shown.
  for (const id of flaggedIds()) {
    assert.equal(TOURS[id].badge, BADGE_BY_FLOW, `${id} should badge by flow`);
  }
  assert.equal(TOURS.full.badge, BADGE_BY_STEPS);
  assert.equal(TOURS.meeting.badge, BADGE_BY_STEPS);
});

test("flow badging counts screens cumulatively across steps", () => {
  const t = TOURS.folder_task;
  const total = t.steps.reduce((n, s) => n + s.screens, 0);
  assert.equal(total, 9, "3 folder screens + 5 tracker views + the scheduler");

  const seen = [];
  let offset = 0;
  for (const step of t.steps) {
    for (let k = 0; k < step.screens; k++) {
      seen.push(stepBadge(
        { mget: (x) => ({ badge_mode: "flow", screen_offset: offset, tour_screens: total }[x]) },
        k,
      ));
    }
    offset += step.screens;
  }
  // The counter must NOT restart at the step boundary — that is the whole point.
  assert.deepEqual(seen, [
    "STEP 1/9", "STEP 2/9", "STEP 3/9",
    "STEP 4/9", "STEP 5/9", "STEP 6/9", "STEP 7/9", "STEP 8/9",
    // The scheduler, which Figma 5:75093 badges "STEP 9/9" — the design and
    // the registry have to agree on this number.
    "STEP 9/9",
  ]);
});

test("a single-step tour's flow numbering is just its own screens", () => {
  for (const id of ["workspace", "share", "migrate"]) {
    const n = TOURS[id].steps[0].screens;
    const ui = { mget: (x) => ({ badge_mode: "flow", screen_offset: 0, tour_screens: n }[x]) };
    assert.deepEqual(
      Array.from({ length: n }, (_, i) => stepBadge(ui, i)),
      Array.from({ length: n }, (_, i) => `STEP ${i + 1}/${n}`),
      id,
    );
  }
});

test("the host stamps screen_offset and tour_screens per step", () => {
  const out = build(TOURS.folder_task).map((e) => (Array.isArray(e) ? e[e.length - 1] : e));
  assert.deepEqual(out.map((w) => w.screen_offset), [0, 3, 8]);
  assert.deepEqual(out.map((w) => w.tour_screens), [9, 9, 9]);
  assert.deepEqual(out.map((w) => w.badge_mode), ["flow", "flow", "flow"]);
});

test("full keeps the original six steps, in order, and is never suppressed", () => {
  assert.equal(TOURS.full.flag, null);
  assert.equal(TOURS.full.badge, BADGE_BY_STEPS);
  assert.deepEqual(
    TOURS.full.steps.map((s) => s.kind),
    [
      "tutorial_workspace",
      "tutorial_folder",
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

test("48 a single-step tour numbers SCREENS, never 1/1", () => {
  for (const id of flaggedIds()) {
    const t = TOURS[id];
    const n = t.steps[0].screens;
    const ui = widget({ badge_mode: BADGE_BY_FLOW, screen_count: n });
    const seen = [];
    for (let i = 0; i < n; i++) seen.push(stepBadge(ui, i));
    assert.deepEqual(
      seen,
      Array.from({ length: n }, (_, i) => `STEP ${i + 1}/${n}`),
      `${id} badges`,
    );
    assert.ok(!seen.includes("STEP 1/1") || n === 1, `${id} must not read 1/1`);
  }
});

test("48 migrate and folder read 1/3 -> 3/3 standing alone", () => {
  const ui = widget({ badge_mode: BADGE_BY_FLOW, screen_count: 3 });
  assert.deepEqual(
    [0, 1, 2].map((i) => stepBadge(ui, i)),
    ["STEP 1/3", "STEP 2/3", "STEP 3/3"],
  );
});

test("49 inside full, every screen of a step carries that STEP's number", () => {
  // tutorial_folder is step 2 of 6 and runs three screens; all three read 2/6,
  // which is what the six-step tour has always shown.
  const ui = widget({ badge_mode: BADGE_BY_STEPS, badge_text: "STEP 2/6", screen_count: 3 });
  assert.deepEqual(
    [0, 1, 2].map((i) => stepBadge(ui, i)),
    ["STEP 2/6", "STEP 2/6", "STEP 2/6"],
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

/** Lift _buildWidgets out of the host so it can run without ui-core. */
function buildWidgetsFn() {
  const src = readFileSync(HOST_PATH, "utf8");
  const start = src.indexOf("  _buildWidgets(t) {");
  assert.notEqual(start, -1, "_buildWidgets not found in production source");
  const end = src.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, "_buildWidgets has no closing brace");
  const body = src.slice(start + "  _buildWidgets(t) {".length, end);
  return new Function("BACKDROPS", "BADGE_BY_FLOW", `return function (t) {${body}};`);
}

const BACKDROP_STUB = {
  workspaceFaded: () => ({ backdrop: "faded" }),
  workspaceGrid: () => ({ backdrop: "grid" }),
};

function build(tourDef) {
  const fn = buildWidgetsFn()(BACKDROP_STUB, BADGE_BY_FLOW);
  return fn.call({ warn: () => {} }, tourDef);
}

test("a step with a backdrop feeds [backdrop, widget], interactive LAST", () => {
  const out = build(TOURS.folder_task);
  assert.equal(out.length, 3);
  assert.ok(Array.isArray(out[0]));
  assert.deepEqual(out[0][0], { backdrop: "faded" });
  // _widgetAt merges enter_at_last onto the LAST entry, so the interactive
  // widget must stay there.
  assert.equal(out[0][out[0].length - 1].kind, "tutorial_folder");
});

test("a step with no backdrop feeds the bare widget", () => {
  const out = build(TOURS.workspace);
  assert.equal(Array.isArray(out[0]), false);
  assert.equal(out[0].kind, "tutorial_workspace");
});

test("migrate's backdrop is the un-faded grid — its own subject matter", () => {
  const out = build(TOURS.migrate);
  assert.deepEqual(out[0][0], { backdrop: "grid" });
});

test("is_first / is_last / screen_count are stamped per step", () => {
  const out = build(TOURS.full).map((e) => (Array.isArray(e) ? e[e.length - 1] : e));
  assert.equal(out.length, 6);
  assert.equal(out[0].is_first, true);
  assert.equal(out[0].is_last, false);
  assert.equal(out[5].is_first, false);
  assert.equal(out[5].is_last, true);
  assert.deepEqual(out.map((w) => w.screen_count), [3, 3, 1, 5, 3, 3]);
  assert.deepEqual(out.map((w) => w.badge_mode), Array(6).fill("steps"));
  assert.deepEqual(out.map((w) => w.badge_text), [
    "STEP 1/6", "STEP 2/6", "STEP 3/6", "STEP 4/6", "STEP 5/6", "STEP 6/6",
  ]);
});

test("a single-step tour is stamped first AND last, and badges by screens", () => {
  const w = build(TOURS.migrate)[0].slice(-1)[0];
  assert.equal(w.is_first, true);
  assert.equal(w.is_last, true);
  assert.equal(w.badge_mode, BADGE_BY_FLOW);
  assert.equal(w.screen_count, 3);
  assert.equal(w.service, "next-step");
});

test("an unknown badge mode warns and falls back to step numbering", () => {
  const warnings = [];
  const fn = buildWidgetsFn()(BACKDROP_STUB, BADGE_BY_FLOW);
  const bad = {
    id: "bogus",
    badge: "screens",
    steps: [{ kind: "a", screens: 2 }, { kind: "b", screens: 3 }],
  };
  const out = fn.call({ warn: (m) => warnings.push(m) }, bad);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /unknown badge mode/);
  assert.deepEqual(out.map((w) => w.badge_mode), ["steps", "steps"]);
  assert.deepEqual(out.map((w) => w.badge_text), ["STEP 1/2", "STEP 2/2"]);
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
    folder_task: "tutorial_folder",
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
  for (const step of ["workspace", "folder", "task", "share", "migrate"]) {
    const src = readFileSync(join(dir, step, "index.js"), "utf8");
    assert.match(src, /entryScreen\(this, \w+\.length\)/, `${step} must use entryScreen`);
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

test("the folder step runs three screens, and the flow totals eight", () => {
  assert.equal(TOURS.folder_task.steps[0].screens, 3);
  assert.equal(TOURS.folder_task.steps.reduce((n, s) => n + s.screens, 0), 9);
  // The same step inside `full` gained the screen too — they render the same
  // widget, so a mismatch would mis-number one of the two tours.
  assert.equal(TOURS.full.steps[1].kind, "tutorial_folder");
  assert.equal(TOURS.full.steps[1].screens, 3);
});

test("the folder step's SCREENS table matches the registry count", () => {
  // The registry says how many screens a step has; the widget owns the table.
  // They are declared in different files and nothing links them at runtime, so
  // a screen added to one and not the other mis-numbers every badge after it.
  const src = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/folder/index.js"), "utf8",
  );
  assert.equal(
    (src.match(/^\s{4}skeleton: \w+,/gm) || []).length,
    TOURS.folder_task.steps[0].screens,
  );
});

test("reply-in-thread leads the bar, and carries the tooltip and cursor", () => {
  const threads = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skeleton/toolkit/threads.js"), "utf8",
  );
  const list = threads.slice(threads.indexOf("const CHAT_ACTIONS = ["));
  const order = [...list.slice(0, list.indexOf("];")).matchAll(/ico: "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(order[0], "ctxmenu-chat-thread", "the thread icon must lead");
  assert.equal(order[1], "chat-action-reply", "the divider sits between them");
  // The cursor and the brand tint hang off the same `mark`, so they cannot
  // drift onto different icons.
  assert.match(threads, /ico: "ctxmenu-chat-thread", mark: "thread"/);
  assert.match(threads, /a\.mark === "thread"[\s\S]{0,200}ico: "tutorial-cursor"/);
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

test("the hole is measured from the panel, the callout from the card", () => {
  // These are deliberately different elements. The panel decides how much is
  // lit; the Drumee_Strategy_Q2 card decides where the callout sits, which is
  // ~220px higher than the panel's mid-height and is where the design puts it.
  const folder = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/folder/index.js"), "utf8",
  );
  const screen = folder.slice(folder.indexOf("skeleton: threadHintScreen"));
  const block = screen.slice(0, screen.indexOf("},"));
  assert.match(block, /target: 'thread-panel'/);
  assert.match(block, /anchor: 'thread-card'/);

  const threads = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skeleton/toolkit/threads.js"), "utf8",
  );
  // Both parts have to exist on THIS screen, or the spotlight silently falls
  // back to measuring one element for both jobs.
  assert.match(threads, /__th-panel`[\s\S]{0,200}sys_pn: "thread-panel"/);
  assert.match(threads, /__th-card`[\s\S]{0,300}sys_pn: "thread-card"/);
});

test("the hole is wide enough to hold the panel AND the hover hint", () => {
  const folder = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/folder/index.js"), "utf8",
  );
  const screen = folder.slice(folder.indexOf("skeleton: threadHintScreen"));
  const block = screen.slice(0, screen.indexOf("},"));
  assert.match(block, /target: 'thread-panel'/);
  const radius = Number((block.match(/radius: (\d+)/) || [])[1]);

  // Geometry, measured off the 1:1 design render. The hole is centred on the
  // panel and is clear to 55% of its radius (spotlight/skin), so the hover
  // hint 368px away has to fall inside that core — otherwise this screen
  // lights the panel and leaves its actual subject in the fade.
  const PANEL = { x: 1255, y: 547 };
  const HINT = { x: 920, y: 700 };
  const dist = Math.hypot(HINT.x - PANEL.x, HINT.y - PANEL.y);
  assert.ok(dist < radius * 0.55,
    `hover hint is ${dist.toFixed(0)}px out but the clear core is only ${(radius * 0.55).toFixed(0)}px`);

  // And it should not wildly exceed the design's own vignette (729 across).
  assert.ok(radius <= 900, "wider than the design lights, which dims nothing");

  const threads = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skeleton/toolkit/threads.js"), "utf8",
  );
  // chat-hint still groups the tooltip with the bar for layout, even though the
  // hole is no longer measured from it.
  assert.match(threads, /sys_pn: "chat-hint"[\s\S]{0,200}replyInThreadTip\(pfx\), chatActionBar/);
});

test("the chat action bar mirrors the real one, icon for icon", () => {
  const threads = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/skeleton/toolkit/threads.js"), "utf8",
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
    assert.ok(threads.includes(ico), `tour is missing ${ico}`);
    assert.ok(real.includes(ico), `${ico} is not in the real toolbar any more`);
  }
});

test("the hover bar shows on screen 2 only", () => {
  const skel = readFileSync(
    join(REPO_ROOT, "src/drumee/modules/desk/tutorial/folder/skeleton/index.js"), "utf8",
  );
  assert.match(skel, /threadHintScreen[\s\S]*?threadsView\(ui, \{ hint: true \}\)/);
  // The bar-less variant is gone: it duplicated this screen's copy word for
  // word, so the screen that shows the bar is the only one left.
  assert.ok(!/threadsScreen/.test(skel));
});

// ── the scheduler, folder_task's closing screen ──────────────────────────────

test("folder_task ends on the scheduler, and it is the only new step", () => {
  const kinds = TOURS.folder_task.steps.map((s) => s.kind);
  assert.deepEqual(kinds, ["tutorial_folder", "tutorial_task", "tutorial_schedule"]);
  // One screen: the design is a single frame, and the flow badge on it
  // ("STEP 9/9") only comes out right if this stays 1.
  assert.equal(TOURS.folder_task.steps[2].screens, 1);
  // Faded like its neighbours — the workspace grid behind is not this step's
  // subject, unlike migrate's.
  assert.deepEqual(TOURS.folder_task.steps[2].backdrop, ["workspaceFaded"]);
});

test("full is untouched by the scheduler — still the original six steps", () => {
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
