require('./skin');
const { tooltipBadge } = require('../skeleton/toolkit');

const GAP = 12;
const MIN_RADIUS = 120;
const RADIUS_PADDING = 40;
// One frame per sample, so this is also the wall-clock ceiling in frames
// (~330ms at 60Hz) — the same ceiling the two-RAF version had at half the
// sample count.
const STABLE_MAX_TRIES = 20;

function nextFrameRect(el) {
  return new Promise((resolve) =>
    requestAnimationFrame(() => resolve(el.getBoundingClientRect())),
  );
}

// Wait until the element's measured size stops changing between consecutive
// frames. Covers async children (e.g. media_grid icon) that resize the target
// after it first lands in the DOM — without which the very first focus measures
// a collapsed rect and the tooltip lands off-screen.
//
// Sampled once per frame, seeded from a free synchronous read. It used to call
// getElStablePosition (two RAFs) twice, so an element that had ALREADY settled —
// which is every screen change after the first, the common case by far — still
// cost four frames to confirm, and focus() paid that twice when a screen passes
// an anchor. Measured 118ms per screen change; one frame confirms the same
// thing. Per-frame sampling also spots a late resize a frame sooner than
// per-two-frames did, so the case this exists for got quicker too.
async function waitForStableRect(el) {
  let prev = el.getBoundingClientRect();
  for (let i = 0; i < STABLE_MAX_TRIES; i++) {
    const next = await nextFrameRect(el);
    if (next.width > 0 && next.width === prev.width && next.height === prev.height) {
      return next;
    }
    prev = next;
  }
  return prev;
}

// Accepts a raw node, a widget, or a Backbone-ish view.
function elementOf(t) {
  if (!t) return null;
  return t.nodeType ? t : t.el || (t.$el && t.$el[0]);
}

function anchorFor(rect, direction) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  switch (direction) {
    case 'south':
      return { left: `${cx}px`, bottom: `${window.innerHeight - rect.top + GAP}px` };
    case 'east':
      return { right: `${window.innerWidth - rect.left + GAP}px`, top: `${cy}px` };
    case 'west':
      return { left: `${rect.right + GAP}px`, top: `${cy}px` };
    case 'north':
    default:
      return { left: `${cx}px`, top: `${rect.bottom + GAP}px` };
  }
}

function autoRadius(rect) {
  // Half-diagonal + padding ensures the entire target fits inside the
  // transparent center of the vignette (see gradient stops in skin/index.scss).
  const halfDiag = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
  return Math.max(MIN_RADIUS, halfDiag + RADIUS_PADDING);
}

class __tutorial_spotlight extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this.setState(0);
  }

  onPartReady(child, pn) {
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * @param {Object} args
   * @param {*} args.target   what the hole is cut around
   * @param {*} [args.anchor] what the callout points at, when that is not the
   *   whole target — e.g. a panel is lit but the badge marks one card inside
   *   it. Defaults to `target`.
   * @param {Object} [args.tooltip]
   * @param {String} [args.direction]
   * @param {Number} [args.radius]
   * @param {Object} [args.owner]
   */
  async focus(args = {}) {
    const { target, anchor, tooltip, direction = 'north', radius, owner } = args;
    if (!target) return this.clear();
    const el = elementOf(target);
    if (!el || typeof el.getBoundingClientRect !== 'function') return;

    // The target rect, the anchor rect and the callout part do not depend on
    // one another, so they are resolved together. Awaiting them one after the
    // other put two full settle waits on the critical path of every screen that
    // passes an anchor, for no reason other than the order they were written in.
    const anchorEl = anchor ? elementOf(anchor) : null;
    const [rect, measuredAnchor, callout] = await Promise.all([
      waitForStableRect(el),
      anchorEl && anchorEl !== el ? waitForStableRect(anchorEl) : null,
      this.ensurePart('callout'),
    ]);
    if (!rect.width || !rect.height) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = radius || autoRadius(rect);
    this.el.style.setProperty('--spot-x', `${cx}px`);
    this.el.style.setProperty('--spot-y', `${cy}px`);
    this.el.style.setProperty('--spot-radius', `${r}px`);
    this.setState(1);

    if (!tooltip) {
      callout.feed(null);
      return;
    }
    const anchorRect = measuredAnchor && measuredAnchor.width ? measuredAnchor : rect;
    callout.feed(tooltipBadge(owner || this, {
      ...tooltip,
      direction,
      style: anchorFor(anchorRect, direction),
      // Back/Next belong to the step that owns the screen; ending the tour
      // belongs to the tour. The spotlight is the only object holding both
      // references — `owner` is the step, and its own partHandler is
      // tutorial_main — so it is where the two are separated.
      host: this._tourHost(),
    }));
  }

  /** tutorial_main, from the partHandler the shell fed us. */
  _tourHost() {
    const h = this.mget(_a.partHandler);
    if (!h) return null;
    return _.isArray(h) ? h[0] : h;
  }

  /**
   * Put the callout's Done button into its pending state.
   *
   * The tour host calls this while the tour's closing write is in flight: on a
   * slow link that write is a visible pause during which the callout just sits
   * there, and the button the user pressed is where the wait belongs.
   *
   * Nothing clears it — the host destroys the tour once the write settles,
   * whether it succeeded or not. The node is queried rather than held as a
   * part because the callout is rebuilt on every screen, so the one that
   * matters is whichever is on screen now; `is-done` marks it, and only the
   * last screen carries it (see toolkit/tooltip.js).
   *
   * @returns {Boolean} whether a button was actually found and marked
   */
  async busy() {
    const callout = await this.ensurePart('callout');
    const btn = callout && callout.el && callout.el.querySelector('.is-done');
    if (btn) btn.classList.add('loading');
    return !!btn;
  }

  clear() {
    this.setState(0);
    this.ensurePart('callout').then((p) => p.feed(null));
  }
}

module.exports = __tutorial_spotlight;
