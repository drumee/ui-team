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
  }));
}

/**
 * Where the callout card sits, given the rect of what it is talking about.
 *
 * The four direction names mean the direction the callout REACHES OUT in, NOT
 * the side of the target it lands on: 'west' reaches west, so the card sits to
 * the target's right.
 *
 * BOTH BOXES ARE VIEWPORT RECTS, and the result is expressed relative to
 * `host`. That parameter is the fix for a real bug: this used to read `rect`
 * from getBoundingClientRect() and the far edges from window.innerWidth /
 * innerHeight — both viewport-relative — and write them straight onto an
 * absolutely-positioned callout, which resolves against its CONTAINING BLOCK.
 *
 * NEITHER host is the viewport, which is the part that went unnoticed. Measured
 * with the real skins: the callout's offset parent is the spotlight in both, and
 * its origin sits at (0, 60) under the desk — `.desk-module__overlay` is
 * positioned and starts below the desk topbar — and at (80, 60) inside a folder
 * window, which is positioned too. So the desk tour's callouts have ALWAYS been
 * one topbar too low; it reads as a near-miss there because the horizontal
 * offset is zero and the mock's targets are large. In a window the error is on
 * both axes against small targets, which is what made it obvious.
 *
 * Passing the host's own rect makes the caller say which box it means. A caller
 * that genuinely fills the viewport passes the viewport and gets exactly the old
 * numbers — that equivalence is pinned by a test — but no caller in this app
 * actually does.
 *
 * @param {Object} rect      what the callout points at, in viewport coordinates
 * @param {String} direction north | south | east | west
 * @param {Number} gap       card edge to target edge
 * @param {Object} host      the callout's containing block, in viewport
 *   coordinates — `{left, top, right, bottom}`
 * @returns {Object} CSS placement relative to `host`
 */
function anchorFor(rect, direction, gap, host) {
  const cx = rect.left + rect.width / 2 - host.left;
  const cy = rect.top + rect.height / 2 - host.top;
  switch (direction) {
    case 'south':
      return { left: `${cx}px`, bottom: `${host.bottom - rect.top + gap}px` };
    case 'east':
      return { right: `${host.right - rect.left + gap}px`, top: `${cy}px` };
    case 'west':
      return { left: `${rect.right + gap - host.left}px`, top: `${cy}px` };
    case 'north':
    default:
      return { left: `${cx}px`, top: `${rect.bottom + gap - host.top}px` };
  }
}

/**
 * One rect's horizontal edges on another rect's vertical ones.
 *
 * A callout sometimes has to CLEAR one box while POINTING AT another inside it:
 * the migrate tour's import dialog is the case the design states outright
 * (176:47527 puts the dialog's right edge at x1056 and the card's left at
 * x1090), while the beak still has to mark the row the step is about.
 *
 * WHY THIS IS A FUNCTION AND NOT A SPREAD — the obvious one-liner is
 * `{ ...vertical, left: h.left, right: h.right, width: h.width }`, and it is
 * silently, totally wrong. These rects come from getBoundingClientRect(), and a
 * DOMRect carries every property as a PROTOTYPE GETTER, not an own enumerable
 * one, so `{ ...domRect }` is `{}`. The merge then has no `top` and no
 * `height`, the centre works out to NaN, and `top: "NaNpx"` is an invalid
 * declaration the browser drops without a word — leaving the card pinned to the
 * top of the callout layer, horizontally correct and vertically nowhere.
 *
 * So the fields are named. A plain object out is also what `_keepInView` wants,
 * since it re-reads this rect on a flip.
 *
 * @param {Object} vertical   the rect that decides top/bottom — what is pointed at
 * @param {Object} horizontal the rect that decides left/right — what is cleared
 * @returns {Object} a plain rect, safe to read and to spread
 */
function splitAnchor(vertical, horizontal) {
  const h = horizontal && horizontal.width ? horizontal : vertical;
  return {
    top: vertical.top,
    bottom: vertical.bottom,
    height: vertical.height,
    left: h.left,
    right: h.right,
    width: h.width,
  };
}

module.exports = {
  SIZE_TIERS,
  SHORT_HEIGHT,
  REFLOW_MS,
  tierFor,
  screensFor,
  buildStepWidgets,
  anchorFor,
  splitAnchor,
};
