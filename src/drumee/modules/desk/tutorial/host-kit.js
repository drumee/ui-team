/**
 * What a tutorial HOST needs, regardless of where it mounts.
 *
 * There are two hosts now: `desk_tutorial`, which draws a full-screen mock of
 * the product, and `window_tutorial`, which overlays a folder window. They
 * differ in what they draw AROUND a step and in what happens when a tour ends.
 * They do not differ in the numbers below, and they must not: the tier table is
 * what `--pane-fit` is keyed on (skin/index.scss), and the payload is the whole
 * of what a step widget knows about the tour it is in.
 *
 * Pure: no DOM, no globals, no `this`. That is what makes it testable, and it
 * is also the reason the box being measured is passed in rather than read —
 * the desk host measures the viewport and the window host measures its own
 * overlay, and neither answer belongs in here.
 */

// ── Responsive tiers ─────────────────────────────────────────────────────────
//
// A tour draws a MOCK of the product, so it cannot simply reflow the way a
// document would. Four tiers rather than a continuum, because each one is a
// different composition, not the same one squeezed.
//
// The boundaries are where this particular layout breaks, measured against the
// mock rather than borrowed from a framework: below 1366 the empty-state hero
// and its carousel stop both fitting at full size, below 1024 they stop sharing
// a row at all, and below 760 the rail and the panes have to give up their
// fixed widths.
const SIZE_TIERS = [
  { id: 'mobile', max: 759 },
  { id: 'narrow', max: 1023 },
  { id: 'compact', max: 1365 },
  { id: 'wide', max: Infinity },
];

// Height is its own axis, and the one that aspect ratio actually moves: a 21:9
// window and a rotated phone are both SHORT, and shortness is what pushes a
// callout off the bottom of the tour. Kept separate from the width tier so the
// two compose instead of multiplying into eight cases.
const SHORT_HEIGHT = 720;

// Resize settles before anything is re-measured. Long enough to sit out a drag
// of the window edge, short enough that a rotation feels immediate.
const REFLOW_MS = 160;

/**
 * Which tier a box falls in.
 *
 * @param {Number} width  of the box the tour is drawn in
 * @param {Number} height of the same box
 * @returns {{size: String, short: String}} `short` is '0'/'1' because it is
 *   written straight into a dataset, where everything is a string anyway.
 */
function tierFor(width, height) {
  const w = ~~width;
  const h = ~~height;
  const tier = SIZE_TIERS.find((t) => w <= t.max) || SIZE_TIERS[SIZE_TIERS.length - 1];
  return { size: tier.id, short: h > 0 && h < SHORT_HEIGHT ? '1' : '0' };
}

/**
 * How many screens of a step actually run.
 *
 * A step may declare a `live_screens` tail — screens that stop being a mock and
 * do something real. Today that is the workspace step's create form and the
 * invite screen after it. Declared as a COUNT off the end so the registry still
 * says what the whole step is, and the host subtracts rather than the step
 * guessing.
 *
 * @param {Object} step a TOURS step
 * @param {Boolean} canCreate whether this run may create a real workspace
 * @returns {Number}
 */
function screensFor(step, canCreate) {
  const declared = ~~step.screens || 1;
  const live = ~~step.live_screens;
  if (!live) return declared;
  return canCreate ? declared : Math.max(1, declared - live);
}

/**
 * Turn a registry entry into the feed payloads a host hands out.
 *
 * Everything a step needs to know about its position in the tour is stamped
 * here as model attributes, so the step widgets stay ignorant of which tour —
 * and now of which HOST — they are in.
 *
 * Progress counts every screen in the tour, so the host has to know the total
 * and where each step starts; a step widget can see its own screens and nothing
 * else.
 *
 * @param {Object} ui the host, read for the trigger's context only
 * @param {Object} t a TOURS entry
 * @param {Object} [opt]
 * @param {Boolean} [opt.canCreate=false]
 * @returns {Array<Object>}
 */
function buildStepWidgets(ui, t, opt = {}) {
  const canCreate = !!opt.canCreate;
  const steps = (t && t.steps) || [];
  const runs = (s) => screensFor(s, canCreate);
  const total = steps.reduce((n, s) => n + runs(s), 0);
  const offsets = [];
  steps.reduce((n, s) => (offsets.push(n), n + runs(s)), 0);

  return steps.map((step, i) => ({
    kind: step.kind,
    // NO `service` here, deliberately. ui-core binds an onclick to every widget
    // that is not `active: 0` and dispatches its own `service` to its uiHandler,
    // and the step widget's element is the whole pane — so a service here made
    // every part of a step's scenery a button that advanced the WHOLE STEP.
    // The handoff is explicit instead: a step's last screen calls
    // triggerHandlers({ service: 'next-step' }).
    uiHandler: [ui],
    screen_count: runs(step),
    screen_offset: offsets[i],
    tour_screens: total,
    is_first: i === 0,
    is_last: i === steps.length - 1,
    // What the tour is ABOUT, when the trigger knew and said so. Stamped on
    // every step rather than special-cased, because a step is not supposed to
    // know which tour it is in.
    subject: ui.mget('subject') || null,
    subject_data: ui.mget('subject_data') || null,
    celebrate: ui.mget('celebrate') || null,
  }));
}

module.exports = {
  SIZE_TIERS,
  SHORT_HEIGHT,
  REFLOW_MS,
  tierFor,
  screensFor,
  buildStepWidgets,
};
