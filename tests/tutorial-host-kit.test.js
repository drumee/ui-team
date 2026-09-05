// The tier table and the step-payload builder, shared by both tutorial hosts.
//
// Extracted from tutorial_main so window_tutorial can reuse them rather than
// copy them. These are the numbers the mock panes are fitted against
// (--pane-fit, modules/desk/tutorial/skin/index.scss) and the attributes every
// step widget reads, so a drift here is invisible until a tour renders wrong.
const test = require("node:test");
const assert = require("node:assert/strict");

const kit = require("../src/drumee/modules/desk/tutorial/host-kit.js");
const { TOURS } = require("../src/drumee/modules/desk/tutorial/tours.js");

// A host stand-in: buildStepWidgets only ever reads three attributes off it.
const ui = (over = {}) => ({ mget: (k) => (k in over ? over[k] : null) });

test("tierFor: the four width tiers, on their exact boundaries", () => {
  assert.equal(kit.tierFor(759, 900).size, "mobile");
  assert.equal(kit.tierFor(760, 900).size, "narrow");
  assert.equal(kit.tierFor(1023, 900).size, "narrow");
  assert.equal(kit.tierFor(1024, 900).size, "compact");
  assert.equal(kit.tierFor(1365, 900).size, "compact");
  assert.equal(kit.tierFor(1366, 900).size, "wide");
  assert.equal(kit.tierFor(3840, 900).size, "wide");
});

test("tierFor: short is its own axis, and 720 is not short", () => {
  assert.equal(kit.tierFor(1440, 719).short, "1");
  assert.equal(kit.tierFor(1440, 720).short, "0");
  // A height of 0 means "not measured yet", which is not a claim of shortness.
  assert.equal(kit.tierFor(1440, 0).short, "0");
});

test("screensFor: a live tail runs only when the host may create", () => {
  const step = TOURS.workspace.steps[0];
  assert.equal(step.screens, 8, "registry changed; update this test");
  assert.equal(step.live_screens, 2, "registry changed; update this test");
  assert.equal(kit.screensFor(step, true), 8);
  assert.equal(kit.screensFor(step, false), 6);
});

test("screensFor: a step with no live tail is unaffected", () => {
  const step = TOURS.share.steps[0];
  assert.equal(kit.screensFor(step, true), 6);
  assert.equal(kit.screensFor(step, false), 6);
});

test("buildStepWidgets: offsets accumulate across a multi-step tour", () => {
  const w = kit.buildStepWidgets(ui(), TOURS.full, { canCreate: false });
  assert.equal(w.length, 6);
  // 6 + 5 + 2 + 2 + 6 + 6 = 27 screens.
  assert.deepEqual(w.map((x) => x.screen_count), [6, 5, 2, 2, 6, 6]);
  assert.deepEqual(w.map((x) => x.screen_offset), [0, 6, 11, 13, 15, 21]);
  for (const x of w) assert.equal(x.tour_screens, 27);
  assert.equal(w[0].is_first, true);
  assert.equal(w[0].is_last, false);
  assert.equal(w[5].is_last, true);
});

test("buildStepWidgets: the total follows canCreate", () => {
  const yes = kit.buildStepWidgets(ui(), TOURS.workspace, { canCreate: true });
  const no = kit.buildStepWidgets(ui(), TOURS.workspace, { canCreate: false });
  assert.equal(yes[0].tour_screens, 8);
  assert.equal(no[0].tour_screens, 6);
});

test("buildStepWidgets: names no service, and routes events at the host", () => {
  const host = ui();
  const w = kit.buildStepWidgets(host, TOURS.share, {});
  // A `service` here would make every pixel of a step's scenery a button that
  // advances the whole step — see the comment in tutorial/index.js.
  assert.equal("service" in w[0], false);
  assert.deepEqual(w[0].uiHandler, [host]);
  assert.equal(w[0].kind, "tutorial_share");
});

test("buildStepWidgets: passes the trigger's context through", () => {
  const w = kit.buildStepWidgets(
    ui({ subject: "workspace", subject_data: { name: "Acme" }, celebrate: 1 }),
    TOURS.share,
    {},
  );
  assert.equal(w[0].subject, "workspace");
  assert.deepEqual(w[0].subject_data, { name: "Acme" });
  assert.equal(w[0].celebrate, 1);
});

test("buildStepWidgets: absent context is null, never undefined", () => {
  const w = kit.buildStepWidgets(ui(), TOURS.share, {});
  assert.equal(w[0].subject, null);
  assert.equal(w[0].subject_data, null);
  assert.equal(w[0].celebrate, null);
});
