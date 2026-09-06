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

// ── anchorFor ────────────────────────────────────────────────────────────────
//
// Where the callout card is placed, given the rect of the thing it points at.
//
// This moved here from spotlight/index.js to fix a real bug. It used to mix two
// coordinate systems: `getBoundingClientRect()` and `window.innerWidth/Height`
// are VIEWPORT-relative, but the value is written as `top`/`left`/`bottom`/
// `right` on an absolutely-positioned callout, which resolves against its
// CONTAINING BLOCK.
//
// Measured with the real skins: the callout's origin is (0, 60) under the desk
// and (80, 60) inside a folder window — BOTH are offset, because
// `.desk-module__overlay` and `.window__ui` are each positioned. So the desk
// tour's callouts have always been one topbar too low; it passes for a near-miss
// there because the horizontal offset is zero and the mock's targets are large.
//
// So the host box is passed in. The viewport-host case below is a pure
// equivalence check on the arithmetic, not a claim that any real host is the
// viewport — none is.
const VIEWPORT = { left: 0, top: 0, right: 1440, bottom: 900 };

// A folder window inset below the desk topbar and right of the rail.
const WINDOW = { left: 80, top: 60, right: 1440, bottom: 900 };

// The thing being pointed at, in viewport coordinates.
const TARGET = { left: 200, top: 240, right: 500, bottom: 300, width: 300, height: 60 };

test("anchorFor: a viewport host reproduces the pre-move values exactly", () => {
  // cx = 350, cy = 270, gap = 32.
  assert.deepEqual(kit.anchorFor(TARGET, "west", 32, VIEWPORT), {
    left: "532px",
    top: "270px",
  });
  assert.deepEqual(kit.anchorFor(TARGET, "north", 32, VIEWPORT), {
    left: "350px",
    top: "332px",
  });
  assert.deepEqual(kit.anchorFor(TARGET, "east", 32, VIEWPORT), {
    right: "1272px",
    top: "270px",
  });
  assert.deepEqual(kit.anchorFor(TARGET, "south", 32, VIEWPORT), {
    left: "350px",
    bottom: "692px",
  });
});

test("anchorFor: THE FIX — an offset host shifts the card by that offset", () => {
  // The bug: with the host 60px down the page, `top: 270px` put the card 60px
  // too low, because 270 was measured from the viewport and applied from the
  // window. It must be 210 — the target's centre expressed in the host's box.
  const west = kit.anchorFor(TARGET, "west", 32, WINDOW);
  assert.equal(west.top, "210px", "card is a window-offset too low");
  assert.equal(west.left, "452px");

  const north = kit.anchorFor(TARGET, "north", 32, WINDOW);
  assert.equal(north.top, "272px");
  assert.equal(north.left, "270px");
});

test("anchorFor: south and east measure from the HOST's far edges", () => {
  // These used window.innerHeight / window.innerWidth, which is the viewport's
  // far edge — wrong whenever the callout does not fill the viewport.
  assert.equal(kit.anchorFor(TARGET, "south", 32, WINDOW).bottom, "692px");
  assert.equal(kit.anchorFor(TARGET, "east", 32, WINDOW).right, "1272px");
});

test("anchorFor: an unknown direction falls back to north", () => {
  assert.deepEqual(
    kit.anchorFor(TARGET, "nonsense", 32, VIEWPORT),
    kit.anchorFor(TARGET, "north", 32, VIEWPORT),
  );
});

// ── the migrate tour's live controls ─────────────────────────────────────────

test("migrate is four screens now, not six", () => {
  // The `+ New` and `Upload` branches were screens that drew a gesture and
  // described it. Those buttons perform it for real on screen 1 instead, so the
  // table is the Files pane plus the three import-dialog screens.
  assert.equal(TOURS.migrate.steps[0].screens, 4);
  assert.equal(kit.screensFor(TOURS.migrate.steps[0], false), 4);
});

test("migrate is the only tour earned rather than shown", () => {
  assert.equal(TOURS.migrate.mark_on, "success");
  for (const id of ["workspace", "chat", "folder_task", "share", "meeting", "full"]) {
    assert.equal(TOURS[id].mark_on, undefined, `${id} must keep mount-marking`);
  }
});

test("a live menu row carries its payload where each reader looks for it", () => {
  // Regression guard for a bug that made every row a no-op: the row's options
  // were spread first and `dataset`/`attrOpt` re-declared after, so the payload
  // was silently overwritten — later keys win in an object literal.
  //
  // Two readers, two channels, and they are not interchangeable:
  //   name    on the MODEL, because window/core.js newDocument reads
  //           cmd.mget(_a.name) off the clicked row
  //   service in the DATASET, because `service` on the model is already
  //           `mg-do-create` — the tour must see the click before the product
  const { readFileSync } = require("node:fs");
  const { join } = require("node:path");
  const src = readFileSync(
    join(__dirname, "..", "src/drumee/modules/desk/tutorial/skeleton/toolkit/files.js"),
    "utf8",
  );
  const i = src.indexOf("function newMenu(");
  const body = src.slice(i, src.indexOf("\n}", i));
  assert.match(body, /name: item\.name/, "the file name must be on the model");
  assert.match(body, /"data-service": item\.service/, "the service must reach the DOM");
  // Exactly one dataset and one attrOpt in the row, or one silently wins.
  assert.equal((body.match(/\n\s*dataset: \{/g) || []).length, 1);
  assert.equal((body.match(/\n\s*attrOpt: \{/g) || []).length, 1);
});

test("anchorFor: the four directions are exact opposites in pairs", () => {
  // The spotlight flips a callout to the other side when it cannot fit where it
  // was asked to go, so the pairs have to actually mirror: reaching west puts
  // the card to the target's right, east to its left, and the same vertically.
  const T = { left: 400, top: 300, right: 700, bottom: 360, width: 300, height: 60 };
  const H = { left: 0, top: 0, right: 1000, bottom: 800 };
  const west = kit.anchorFor(T, "west", 32, H);
  const east = kit.anchorFor(T, "east", 32, H);
  // west places by `left` past the target's right edge; east by `right`,
  // measured back from the host's far edge to the target's left.
  assert.equal(west.left, `${T.right + 32}px`);
  assert.equal(east.right, `${H.right - T.left + 32}px`);
  // Both sit on the target's vertical centre, so a flip does not move the beak.
  assert.equal(west.top, east.top);

  const north = kit.anchorFor(T, "north", 32, H);
  const south = kit.anchorFor(T, "south", 32, H);
  assert.equal(north.top, `${T.bottom + 32}px`);
  assert.equal(south.bottom, `${H.bottom - T.top + 32}px`);
  assert.equal(north.left, south.left);
});
