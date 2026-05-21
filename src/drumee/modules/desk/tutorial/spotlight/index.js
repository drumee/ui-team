require('./skin');
const { tooltipBadge } = require('../skeleton/toolkit');
const { getElStablePosition } = require('@drumee/ui-essentials');

const GAP = 12;
const MIN_RADIUS = 120;
const RADIUS_PADDING = 40;
const STABLE_MAX_TRIES = 10;

// Wait until the element's measured size stops changing across two RAFs.
// Covers async children (e.g. media_grid icon) that resize the target after
// it first lands in the DOM — without which the very first focus measures
// a collapsed rect and the tooltip lands off-screen.
async function waitForStableRect(el) {
  let prev = await getElStablePosition(el);
  for (let i = 0; i < STABLE_MAX_TRIES; i++) {
    const next = await getElStablePosition(el);
    if (next.width === prev.width && next.height === prev.height && next.width > 0) {
      return next;
    }
    prev = next;
  }
  return prev;
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

  async focus(args = {}) {
    const { target, tooltip, direction = 'north', radius, owner } = args;
    if (!target) return this.clear();
    const el = target.nodeType ? target : target.el || (target.$el && target.$el[0]);
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const rect = await waitForStableRect(el);
    if (!rect.width || !rect.height) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = radius || autoRadius(rect);
    this.el.style.setProperty('--spot-x', `${cx}px`);
    this.el.style.setProperty('--spot-y', `${cy}px`);
    this.el.style.setProperty('--spot-radius', `${r}px`);
    this.setState(1);

    const callout = await this.ensurePart('callout');
    if (!tooltip) {
      callout.feed(null);
      return;
    }
    callout.feed(tooltipBadge(owner || this, {
      ...tooltip,
      direction,
      style: anchorFor(rect, direction),
    }));
  }

  clear() {
    this.setState(0);
    this.ensurePart('callout').then((p) => p.feed(null));
  }
}

module.exports = __tutorial_spotlight;
