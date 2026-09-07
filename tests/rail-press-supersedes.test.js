// A rail press invalidates what the press before it parked.
//
// THE REPORT: Files is open, press Task — the task tour comes up, and "show
// the Task tab" is parked on that tour's release (_railTabWithTour defers the
// tab so the tour is seen BEFORE the screen it teaches). Press Files: that
// press ends the task tour and shows Files, the ended tour releases, and the
// parked callback fires — the Task panel lands on top of the Files pane the
// user just asked for. Pressing Files again works, because by then nothing is
// parked.
//
// The count that guards this existed already and only a workspace switch
// bumped it, which is the same fault on the other axis. `_navigated` is now
// bumped by every navigation, and this file runs the reported sequence.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const DESK = readFileSync(
  join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");

/** Lift one method out of the desk so it can be run rather than matched. */
function method(name, params = []) {
  const plain = DESK.indexOf(`\n  ${name}(`);
  const asyn = DESK.indexOf(`\n  async ${name}(`);
  const from = plain > 0 ? plain : asyn;
  assert.ok(from > 0, `${name} is missing`);
  let paren = 0;
  let open = -1;
  for (let j = DESK.indexOf("(", from); j < DESK.length; j++) {
    if (DESK[j] === "(") paren++;
    else if (DESK[j] === ")" && --paren === 0) { open = DESK.indexOf("{", j); break; }
  }
  let depth = 0;
  for (let j = open; j < DESK.length; j++) {
    if (DESK[j] === "{") depth++;
    else if (DESK[j] === "}" && --depth === 0) {
      const body = DESK.slice(from + 3, j + 1);
      const decl = plain < 0
        ? `async function ${body.replace(/^async /, "")}`
        : `function ${body}`;
      const make = (...args) => new Function(...params, `return ${decl}`)(...args);
      // The text too, for the assertions that are about ORDER inside the body.
      make.source = body;
      return make;
    }
  }
  throw new Error(`unbalanced ${name}`);
}

/**
 * A desk with the rail's collaborators stubbed, and a `whenDone` registry that
 * holds its callbacks so a release can be fired at the moment the report
 * describes rather than immediately.
 */
function desk(opt = {}) {
  const log = [];
  const parked = [];
  const Tours = {
    offerable: (tour) => (opt.offerable || {})[tour] !== false,
    whenDone: (tour, cb) => parked.push([tour, cb]),
  };
  const req = () => Tours;
  const d = {
    log,
    parked,
    isDestroyed: () => false,
    _railWorkspace: () => ({ raise: () => {} }),
    _leaveSectionScreen: () => {},
    _endWindowTourUnlessAbout: (tab) => log.push(`end-unless:${tab}`),
    _openDefaultWorkspace: async () => log.push("open-ws"),
    _raiseRailTour: async (tour) => {
      log.push(`raise:${tour}`);
      return (opt.raises || {})[tour] !== false;
    },
    _railTab: (tab) => log.push(`tab:${tab}`),
  };
  d._navigated = method("_navigated")();
  d._railTabWithTour = method("_railTabWithTour", ["require"])(req);
  // Fire what a tour's release would fire.
  d.release = (tour) => {
    // Only this tour's callbacks — the others stay parked, which is the whole
    // point of the three-press case below.
    for (let i = parked.length - 1; i >= 0; i--) {
      if (parked[i][0] === tour) parked.splice(i, 1)[0][1]();
    }
  };
  return d;
}

const press = (d, tab, tour) => d._railTabWithTour.call(d, tab, tour);

test("the reported sequence: pressing Files does not land the Task panel", async () => {
  // migrate is done for this account, which is what makes Files show at once
  // and puts the two screens in the order the report gives.
  const d = desk({ offerable: { migrate: false } });

  await press(d, "task", "folder_task");
  assert.deepEqual(d.log, ["end-unless:task", "raise:folder_task"]);
  assert.equal(d.parked.length, 1, "the Task tab is parked on the tour's release");

  d.log.length = 0;
  await press(d, "files", "migrate");
  assert.deepEqual(d.log, ["end-unless:files", "tab:files"], "Files shows at once");

  // The task tour, ended by that press, now releases.
  d.release("folder_task");
  assert.deepEqual(d.log, ["end-unless:files", "tab:files"],
    "the parked Task tab must not fire — the user pressed Files");
});

test("and one press on its own still switches when its tour ends", async () => {
  // The guard must not swallow the ordinary case, which is the whole feature:
  // the tour is seen first, then the tab it teaches.
  const d = desk();
  await press(d, "task", "folder_task");
  d.release("folder_task");
  assert.deepEqual(d.log, ["end-unless:task", "raise:folder_task", "tab:task"]);
});

test("a press with no tour to raise shows its tab immediately", async () => {
  const d = desk({ offerable: { migrate: false } });
  await press(d, "files", "migrate");
  assert.deepEqual(d.log, ["end-unless:files", "tab:files"]);
  assert.equal(d.parked.length, 0, "nothing to park");
});

test("a tour that is refused shows its tab immediately too", async () => {
  // Offerable, but single-flight or a failed chunk means it never rose.
  const d = desk({ raises: { folder_task: false } });
  await press(d, "task", "folder_task");
  assert.deepEqual(d.log, ["end-unless:task", "raise:folder_task", "tab:task"]);
});

test("three presses: only the last one's tab survives", async () => {
  const d = desk();
  await press(d, "task", "folder_task");
  await press(d, "chat", "chat");
  await press(d, "meet", "meeting");
  d.log.length = 0;
  // Every earlier tour releases, in any order.
  for (const t of ["folder_task", "chat"]) d.release(t);
  assert.deepEqual(d.log, [], "neither superseded tab may fire");
  d.release("meeting");
  assert.deepEqual(d.log, ["tab:meet"], "the press the user last made wins");
});

test("the count is bumped before the tour that would fire the callback is ended", () => {
  // Order, not presence: _endWindowTourUnlessAbout is what starts the release
  // that runs the parked callback, so counting after it would be too late.
  const body = method("_railTabWithTour").source;
  assert.ok(
    body.indexOf("this._navigated();") < body.indexOf("_endWindowTourUnlessAbout"),
    "count first, then end the tour",
  );
});

// ── the pane must not flash between two tours ───────────────────────────────

test("a tour being replaced by another tour does not fade out", () => {
  // REPORTED: switching between rail items showed the folder pane before the
  // next tutorial. softDestroy fades for half a second, and the next tour
  // cannot even be CLAIMED until that fade's destroy releases single-flight —
  // so the sequence was: tour dissolves, pane revealed, next tour lands on it.
  //
  // Order matters as much as the flag: `offerable` has to be asked BEFORE the
  // outgoing tour is ended, or there is nothing to decide the swap on.
  const body = method("_railTabWithTour").source;
  const gate = body.indexOf("offerable(tour, this)");
  const end = body.indexOf("_endWindowTourUnlessAbout(");
  assert.ok(gate > 0 && end > 0, "expected both");
  assert.ok(gate < end, "ask whether a replacement is coming, then end the tour");
  assert.match(body, /_endWindowTourUnlessAbout\(tab, \{ immediate: offerable \}\)/);
});

test("every other exit keeps the fade", () => {
  // The fade is right when the window is being uncovered on purpose: Escape,
  // a section screen, a workspace switch, completion. Only a swap skips it.
  const end = method("_endWindowTour", ["_"])(require("lodash"));
  const calls = [];
  const tour = () => ({
    isDestroyed: () => false,
    softDestroy: () => calls.push("soft"),
    destroy: () => calls.push("hard"),
  });

  const host = { warn: () => {} };
  host._windowTour = tour();
  end.call(host);
  assert.deepEqual(calls, ["soft"], "the default is still a fade");

  calls.length = 0;
  host._windowTour = tour();
  end.call(host, { immediate: true });
  assert.deepEqual(calls, ["hard"], "a swap destroys at once");

  // And it still reports what it did, and clears its reference either way.
  host._windowTour = tour();
  assert.equal(end.call(host, { immediate: true }), true);
  assert.equal(host._windowTour, null);
  assert.equal(end.call(host), false, "nothing left to end");
});

test("the rail press's chunks are warmed at boot, and only when owed", () => {
  // The other half of the report: window_tutorial and tutorial_spotlight are
  // lazy seeds, so the FIRST press that raises a tour paid a fetch for each
  // while the previous pane sat on screen.
  const src = readFileSync(
    join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");
  const body = method("_warmWindowTourKinds").source;
  assert.match(body, /Kind\.waitFor/);
  for (const kind of ["window_tutorial", "tutorial_spotlight"]) {
    assert.ok(body.includes(`"${kind}"`), `${kind} is not warmed`);
  }
  // Gated, or every session fetches two chunks it will never use.
  assert.match(body, /offerable\(t, this\)/);
  // Fire and forget — a warm-up that throws must not break the boot.
  assert.match(body, /\.catch\(/);
  // Wired into the boot, beside the boot tour.
  assert.match(src, /this\._maybeRunBootTour\(\);\n[\s\S]{0,300}this\._warmWindowTourKinds\(\);/);
});

// ── and the desk-hosted tour, coming out of the wizard ──────────────────────

test("the post-onboarding tour warms its step and its spotlight, not just its shell", () => {
  // REPORTED: the workspace tutorial took a moment to appear after onboarding.
  // `desk_tutorial` was already warmed during the wizard — but the shell is
  // not what the user waits for. It mounts and THEN feeds two more gated
  // kinds: its spotlight, and step 1, which is `tutorial_workspace` and its
  // own 44K chunk. The host's _preloadSteps cannot cover step 1 (it warms
  // slice(1), and the workspace tour has exactly one step), so that fetch
  // happened with the tour's shell already on screen around a hole.
  //
  // RUN, not matched: what matters is that the step kind is DERIVED from the
  // registry, so a tour that gains a step is warmed without anyone editing
  // this method.
  const warm = method("_warmDeskTourKinds", ["Kind", "_", "require"]);
  const asked = [];
  const registry = require(join(__dirname, "..",
    "src/drumee/modules/desk/tutorial/tours.js"));
  const fn = warm(
    { waitFor: (k) => { asked.push(k); return Promise.resolve(); } },
    require("lodash"),
    (id) => {
      assert.equal(id, "desk/tutorial/tours", `unexpected require(${id})`);
      return registry;
    },
  );
  fn.call({ warn: () => {} }, "workspace");

  assert.ok(asked.includes("desk_tutorial"), "the shell");
  assert.ok(asked.includes("tutorial_spotlight"), "the spotlight it feeds");
  // The step, as the registry states it — not as this test restates it.
  const steps = registry.tour("workspace").steps.map((s) => s.kind);
  assert.ok(steps.length > 0, "the workspace tour has no steps?");
  for (const kind of steps) {
    assert.ok(asked.includes(kind), `step kind ${kind} was not warmed`);
  }
  assert.equal(new Set(asked).size, asked.length, "nothing warmed twice");
});

test("a missing registry does not stop the shell being warmed", () => {
  // A prefetch must never be load-bearing.
  const warm = method("_warmDeskTourKinds", ["Kind", "_", "require"]);
  const asked = [];
  const fn = warm(
    { waitFor: (k) => { asked.push(k); return Promise.resolve(); } },
    require("lodash"),
    () => { throw new Error("no registry"); },
  );
  const warns = [];
  fn.call({ warn: (m) => warns.push(m) }, "workspace");
  assert.deepEqual(asked, ["desk_tutorial", "tutorial_spotlight"]);
  assert.equal(warns.length, 1, "and it says so");
});

test("the wizard is what warms them", () => {
  // While onboarding is on screen, which is several screens long — so by the
  // time the tour is raised Kind.get() answers synchronously.
  const src = readFileSync(join(__dirname, "..",
    "src/drumee/modules/desk/index.js"), "utf8");
  const body = method("_loadOnboarding").source;
  assert.match(body, /this\._warmDeskTourKinds\("workspace"\)/);
  // Before the wizard is fed, so the fetch overlaps the screens rather than
  // following them. Against `this.feed({`, not `kind: "onboarding"` — that
  // string is also in the loadPlugin call at the top of the method, and
  // indexOf would find that one and prove nothing.
  assert.ok(
    body.indexOf("_warmDeskTourKinds") < body.indexOf("this.feed({"),
    "warm first, then render the wizard",
  );
  // And the handover itself still has no delay of its own.
  assert.match(src, /const delay = postOnboarding \? 0 : 2000;/);
});

// ── the real topbar, during a desk-hosted tour ──────────────────────────────

test("a desk tour lets the topbar's menus open over it", () => {
  // REQUESTED: the workspace switcher and the account menu had to be usable
  // during the desk workspace tour.
  //
  // WHAT WAS ACTUALLY WRONG, after two attempts at something larger: only the
  // MENUS. The slot this tour mounts into is a child of `__body`
  // (desk/skeleton/index.js pushes the overlay onto `bodyKids`), so the tour
  // has always been confined to the body and the bar was always visible and
  // clickable. But the menus hang DOWN off the bar into the body, which is
  // where the tour is, and the overlay holding it is lifted to 50000 by
  // utils.scss (`[data-state="open"]` -> --z-index-context) against the bar's
  // 10003. So they were painted underneath.
  //
  // Insetting the overlay — first by a literal 46px, then by the bar's
  // measured height — pushed the tour BELOW the body's top and uncovered the
  // real desk in the gap. Measured in tests/harness/desk-tour-topbar.js, whose
  // fixture now puts the overlay inside `__body` as the desk does; with the
  // stamp removed, both menus come back as `tutorial-main__body`.
  const sass = (e) => execFileSync("sass",
    ["-I", ".", "-I", "skin", "--no-source-map", e],
    { cwd: join(__dirname, "..", "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });
  const css = sass("modules/desk/skin/index.scss");
  const i = css.indexOf('.desk-module[data-desk-tour="1"]');
  assert.ok(i > 0, "no block for a desk-hosted tour");
  const block = css.slice(i, css.indexOf("}", css.indexOf("{", i)) + 1);

  // 100002 for the same reason the in-window block uses it: it has to clear a
  // 50000 stacking context, not the overlay's declared 10010.
  assert.match(block, /z-index: 100002/);
  // AND NOTHING ELSE. The tour's box is already right; an inset moves it wrong.
  assert.ok(!/top:/.test(block), "the overlay must not be inset — see above");
  assert.ok(!/pointer-events/.test(block), "the bar was never covered");
  assert.ok(!/sidebar__main/.test(css.slice(i, i + 400)),
    "the rail must not be lifted: this tour draws its own");

  // The stamp is raised and cleared by the desk, and nothing measures anything.
  const desk = readFileSync(join(__dirname, "..",
    "src/drumee/modules/desk/index.js"), "utf8");
  assert.match(desk, /dataset\.deskTour = "1"/);
  assert.match(desk, /delete this\.el\.dataset\.deskTour/);
  assert.ok(!/--desk-tour-top/.test(desk), "the measurement is gone");
});

// ── the workspace tour's two live screens ───────────────────────────────────

test("the create and invite screens raise no callout", () => {
  // Five screens explain the dialog field by field; a sixth card beside the
  // filled-in version of it talks over what they just introduced. And the
  // invite card is already a complete screen with Send and Skip on it.
  //
  // `bare: true` RATHER THAN NO TEXT, and the difference is a bug that has
  // been here before: feed(null) is a no-op in ui-core, so a screen that
  // raises nothing INHERITS the previous screen's card — which is how the
  // invite screen once told the user to create a workspace they had just
  // created. `bare` is what makes focus() feed the callout null and clear it.
  const src = readFileSync(join(__dirname, "..",
    "src/drumee/modules/desk/tutorial/workspace/index.js"), "utf8");
  const table = src.slice(src.indexOf("const SCREENS = ["), src.indexOf("\n];"));

  // Split the table into entries and find the two live ones by their flags.
  const entries = table.split(/\n  \{/).slice(1);
  const live = entries.filter((e) => /\blive: true/.test(e));
  const invite = entries.filter((e) => /\binvite: true/.test(e));
  assert.equal(live.length, 1, "expected one live create screen");
  assert.equal(invite.length, 1, "expected one invite screen");

  for (const [name, e] of [["create", live[0]], ["invite", invite[0]]]) {
    assert.match(e, /\bbare: true/, `${name} still raises a callout`);
    assert.ok(!/\btext:/.test(e), `${name} still carries callout text`);
    assert.ok(!/\btitle:/.test(e), `${name} still carries a callout title`);
  }

  // And the mechanism they rely on: bare feeds null, it does not just skip.
  assert.match(src, /const tooltip = s\.bare\s*\n?\s*\? null/);

  // The two strings they used are gone from every locale, not left orphaned.
  for (const lang of ["en", "es", "fr", "km", "ru", "zh"]) {
    const d = JSON.parse(readFileSync(join(__dirname, "..", `locale/${lang}.json`), "utf8"));
    for (const k of ["TUTORIAL_WS_NOW_CREATE", "TUTORIAL_INVITE_CALLOUT"]) {
      assert.ok(!(k in d), `${lang} still carries ${k}`);
    }
  }
});

// ── the invite card names its workspace the way the topbar does ─────────────

test("the invite blurb draws the workspace as a breadcrumb crumb", () => {
  const { installGlobals, installResolver } = require("./helpers/render-skeleton.js");
  const { find } = require("./helpers/render-skeleton.js");
  const rg = installGlobals();
  const rr = installResolver();
  let named;
  let unnamed;
  try {
    // A REAL TEMPLATE. The default stub answers every key with its own name,
    // and the name has no `{0}` in it — so the split-and-join would find
    // nothing, the crumb would never appear, and this test would pass on a
    // string that cannot work.
    const keys = { TUTORIAL_INVITE_BLURB_NAMED: "Don't work alone in {0} — collaborate now!" };
    global.LOCALE = new Proxy(keys, { get: (t, k) => (k in t ? t[k] : String(k)) });
    for (const k of Object.keys(require.cache)) if (/tutorial/.test(k)) delete require.cache[k];
    const { inviteScreen } = require(join(__dirname, "..",
      "src/drumee/modules/desk/tutorial/skeleton/toolkit/invite.js"));
    const ui = { fig: { family: "tutorial-workspace", group: "tutorial" }, mget: () => null };
    // A name with markup in it, because this one is USER INPUT — whatever they
    // typed into the create dialog one screen earlier.
    named = inviteScreen(ui, { filename: "R&D <team>", area: "private", hub_id: 7 });
    unnamed = inviteScreen(ui, {});
  } finally { rr(); rg(); }

  const blurb = find(named, "tutorial__inv-blurb");
  assert.ok(blurb, "no blurb");
  // An Element, because a Note renders its content as TEXT and the crumb would
  // appear as its own markup.
  assert.equal(blurb.__kind, "element");
  assert.match(blurb.content, /tutorial__inv-crumb\b/, "no crumb in the sentence");
  assert.match(blurb.content, /tutorial__inv-crumb-icon/);
  assert.match(blurb.content, /tutorial__inv-crumb-name/);
  // INLINE, so the sentence stays a sentence: the copy's `{0}` is mid-string,
  // and there has to be text on both sides of the chip.
  const [before, after] = blurb.content.split('<span class="tutorial__inv-crumb"');
  assert.ok(before.trim().length > 0, "nothing before the crumb");
  assert.ok(/\w/.test(after.split("</span>").pop()), "nothing after it");

  // ESCAPED. Raw interpolation would put the user's typing into the page as
  // markup.
  assert.match(blurb.content, /R&amp;D &lt;team&gt;/, "the name is not escaped");
  assert.ok(!/R&D <team>/.test(blurb.content));

  // With no workspace to name, the copy is a plain sentence and a Note is right.
  const plain = find(unnamed, "tutorial__inv-blurb");
  assert.equal(plain.__kind, "note");
  assert.ok(!/inv-crumb/.test(String(plain.content)));

  // AND THE SHIPPED STRING STILL HAS THE SLOT. Without `{0}` the crumb has
  // nowhere to go and the card silently loses it, in every locale.
  for (const lang of ["en", "es", "fr", "km", "ru", "zh"]) {
    const d = JSON.parse(readFileSync(join(__dirname, "..", `locale/${lang}.json`), "utf8"));
    assert.match(d.TUTORIAL_INVITE_BLURB_NAMED, /\{0\}/,
      `${lang}'s named blurb has no slot for the workspace`);
  }

  const sass = (e) => execFileSync("sass",
    ["-I", ".", "-I", "skin", "--no-source-map", e],
    { cwd: join(__dirname, "..", "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });
  const css = sass("modules/desk/tutorial/skin/index.scss");
  // Prose, not a flex row — the same trap `tutorial-chat__msg-text` fell into.
  assert.match(css, /\.tutorial__inv-blurb \{[^}]*display: block !important/);

  // ONE WORKSPACE, ONE COLOUR. The tints and the shape box are the
  // breadcrumb's own numbers, so a workspace looks like itself in both places.
  const crumbCss = sass("modules/desk/breadcrumb/item/skin/index.scss");
  const tints = (s) => (s.match(/fill: var\(--area-[a-z]+\)/g) || []).sort();
  const mine = tints(css.slice(css.indexOf(".tutorial__inv-crumb-icon")));
  assert.ok(mine.length >= 4, `expected the four area tints, saw ${mine}`);
  for (const t of tints(crumbCss)) {
    assert.ok(mine.includes(t), `${t} is in the breadcrumb but not the crumb`);
  }
  assert.match(css, /\.tutorial__inv-crumb-icon \{[^}]*width: 20px/);
});

// ── the meet carousel's second card ─────────────────────────────────────────

test("both meet cards are composed, and only the faces stay photographs", () => {
  // meet-schedule.png was a week calendar over the workspace chrome and
  // meet-instant.jpg was a whole video call, chrome and all — one frame each,
  // exported flat.
  //
  // Both are composed now. The plate, the topbar and the rail are the
  // workspace preview's, the week is a grid with five placed meetings
  // (meeting/skeleton/calendar.js), and the call is a header bar over a 2x2
  // grid (meeting/skeleton/call.js). WHAT STAYS BITMAP is the four video
  // tiles, because a video tile is a picture of a person — supplied as their
  // own crops, with the name bars and mute pills the design baked into them.
  for (const gone of ["meet-schedule.png", "meet-instant.jpg"]) {
    assert.ok(!existsSync(join(__dirname, "..", `src/drumee/assets/tutorial/${gone}`)),
      `${gone} is still on disk`);
  }
  for (let i = 1; i <= 4; i++) {
    assert.ok(existsSync(join(__dirname, "..",
      `src/drumee/assets/tutorial/meeting-user${i}.png`)), `tile ${i} is missing`);
  }

  const src = readFileSync(join(__dirname, "..",
    "src/drumee/modules/desk/tutorial/meeting/skeleton/index.js"), "utf8");
  assert.ok(!/require\([^)]*meet-(schedule|instant)/.test(src), "a frame is still required");
  assert.match(src, /scheduleCard/);
  assert.match(src, /callCard/);

  const { installGlobals, installResolver, find, findAll } =
    require("./helpers/render-skeleton.js");
  const rg = installGlobals();
  const rr = installResolver();
  try {
    for (const k of Object.keys(require.cache)) if (/tutorial/.test(k)) delete require.cache[k];
    const ui = { fig: { family: "tutorial-meeting", group: "tutorial" }, mget: () => null };
    const { scheduleCard, EVENTS, DAYS, HOURS, ROW_H } = require(join(__dirname, "..",
      "src/drumee/modules/desk/tutorial/meeting/skeleton/calendar.js"));
    const { callCard, TILES } = require(join(__dirname, "..",
      "src/drumee/modules/desk/tutorial/meeting/skeleton/call.js"));

    // ── the week ────────────────────────────────────────────────────────────
    const cal = scheduleCard(ui);
    // Placed BY TIME, not a pixel each: `top` comes from the event's own start,
    // so a half-past meeting lands half way down its hour and the card
    // survives a change of row height.
    const events = findAll(cal, "tutorial__mc-event");
    assert.equal(events.length, EVENTS.length, "not every meeting was drawn");
    const half = EVENTS.find((e) => e.from % 60 === 30);
    assert.ok(half, "expected a half-past meeting in the fixture");
    const want = `${Math.round(((half.from - 8 * 60) / 60) * ROW_H)}px`;
    assert.ok(events.some((n) => n.styleOpt && n.styleOpt.top === want),
      `no event placed at ${want} for ${half.title}`);
    for (const n of events) {
      assert.ok(n.styleOpt && n.styleOpt.top && n.styleOpt.height, "an event has no box");
    }
    assert.equal(findAll(cal, "tutorial__mc-head-day").length, DAYS.length);
    assert.equal(findAll(cal, "tutorial__mc-hour").length, HOURS.length);
    assert.ok(find(cal, "tutorial__mc-switch"), "no Weekly switch");
    assert.ok(find(cal, "tutorial__mc-today"), "no Today control");
    // Its window ends where the card does, because the toolbar right-aligns
    // that switch onto the card's own edge.
    assert.equal(find(cal, "tutorial__pv-scale").style.width, `${Math.round(691 / 0.62)}px`);

    // ── the call ────────────────────────────────────────────────────────────
    const call = callCard(ui);
    assert.equal(findAll(call, "tutorial__mv-tile").length, TILES.length);
    assert.equal(TILES.length, 4);
    const videos = findAll(call, "tutorial__mv-video");
    assert.equal(videos.length, 4, "a tile has no video");
    for (const v of videos) {
      // `attribute`, which is the channel ui-core takes plain HTML attributes
      // through — `attrOpt` is for data-*, and an <img> fed through it has no
      // src at all.
      assert.ok(v.attribute && "src" in v.attribute, "a video carries no src");
      assert.equal(v.tagName, "img");
    }
    assert.ok(find(call, "tutorial__mv-head-title"), "no call header");
    assert.ok(find(call, "tutorial__mv-end"), "no End control");

    // Both cards are pictures of the Meet tab, so both light Meet and nothing
    // else — from the same rail every other card uses.
    for (const [name, card] of [["calendar", cal], ["call", call]]) {
      const lit = findAll(card, "tutorial__pv-rail-item")
        .filter((n) => n.attrOpt["data-active"] === 1);
      assert.equal(lit.length, 1, `${name} lit ${lit.length} tabs`);
      assert.equal(lit[0].kids[1].content, "MEET", `${name} lit the wrong tab`);
    }

    // Scenery: the carousel owns every control on that screen.
    for (const card of [cal, call]) {
      for (const n of require("./helpers/render-skeleton.js").walk(card)) {
        assert.ok(!n.service, `${n.className} raises ${n.service}`);
        assert.ok(!n.sys_pn, `${n.className} claims a part name`);
      }
    }
  } finally { rr(); rg(); }
});
