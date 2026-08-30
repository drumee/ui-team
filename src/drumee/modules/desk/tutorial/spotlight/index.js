require('./skin');
const { tooltipBubble } = require('../skeleton/toolkit');

// Card edge to target edge.
//
// Measured off the frames rather than guessed: the import dialog's right edge
// sits at x1056 and its callout's left edge at x1090 (176:47527); the share
// panel and its callout are 31px apart (148:41197); the chat callout clears
// the composer by 30 (142:39178). 16 — what this was — reads as the card being
// stuck to the thing it points at.
//
// The beak occupies about 13 of this, leaving ~19px of clear space, which is
// what the frames show.
const GAP = 32;

// One frame per sample, so this is also the wall-clock ceiling in frames
// (~330ms at 60Hz).
const STABLE_MAX_TRIES = 20;

function nextFrameRect(el) {
  return new Promise((resolve) =>
    requestAnimationFrame(() => resolve(el.getBoundingClientRect())),
  );
}

// Wait until the element's measured size stops changing between consecutive
// frames. Covers async children that resize the target after it first lands in
// the DOM — without which the very first focus measures a collapsed rect and
// the callout lands off-screen.
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

// The element a step hands over can belong to the PREVIOUS render.
//
// ensurePart answers out of ui-core's `_branches`, which keeps pointing at the
// old child until the new one registers itself (letc.js registerPart), and it
// only rejects that entry if the view has been destroyed — detached-but-alive
// passes. A detached node measures 0x0, which used to make focus() give up
// without a callout.
//
// registerPart stamps the part's name on the element it registers, so the live
// one can always be found in the document. Cheap, and it runs before anything
// is measured.
function live(el) {
  if (!el || el.isConnected) return el;
  const name = el.dataset && el.dataset.partname;
  const found = name && document.querySelector(`[data-partname="${name}"]`);
  return found || el;
}

// What to call the thing in a warning: its part name if it has one, else its
// class. Enough to name the culprit in a console line someone can paste back.
function nameOf(el) {
  if (!el) return '(none)';
  return (el.dataset && el.dataset.partname) || el.className || el.tagName;
}

// One above the scrim (10003), below the callout (10010).
const LIT_Z = '10004';
// The callout card, and how far its tail sits from the card's own corner —
// both shared with skin/tooltip.scss, which is where the beak is drawn.
const BUBBLE_CLASS = 'tutorial__bubble-card';
const BEAK_INSET = 26;
// Breathing room between the card and the edge of the tour.
const EDGE = 12;
// Where the ancestor walk stops: the tour's own root, which is the scrim's
// containing block. Going past it would start lifting the desk.
const LAYOUT_CLASS = 'tutorial-main__layout';

/**
 * Does this element open a stacking context its children cannot escape?
 *
 * Not the complete list from the spec — it is the list that occurs in these
 * mocks: a positioned element with an explicit z-index, a transform (the four
 * step roots centre themselves with one), a filter, or partial opacity.
 * Anything missed here fails the same way an unpromoted target does, which is
 * visible immediately on the screen that hits it.
 */
function opensStackingContext(node) {
  const s = getComputedStyle(node);
  if (s.position !== 'static' && s.zIndex !== 'auto') return true;
  if (s.transform && s.transform !== 'none') return true;
  if (s.filter && s.filter !== 'none') return true;
  if (s.opacity !== '' && parseFloat(s.opacity) < 1) return true;
  return false;
}

/**
 * Where the card sits, given the rect it is talking about.
 *
 * The four names mean what they have always meant — the direction the callout
 * reaches out in, NOT the side of the target it lands on. 'west' reaches west,
 * so the card sits to the target's right.
 */
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

class __tutorial_spotlight extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    // Every focus/clear takes a ticket. Both do async work before they touch
    // the callout, so without this the LAST one to finish wins rather than the
    // last one asked for — and a step swap asks for clear-then-focus in that
    // order but resolves them in whichever order the awaits happen to land.
    this._seq = 0;
  }

  /** Has a newer focus/clear been asked for since `ticket` was taken? */
  _stale(ticket) {
    return ticket !== this._seq;
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this.setState(0);
  }

  onPartReady(child, pn) {
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Light one surface and put the callout beside it.
   *
   * The 2.0 design does NOT cut a hole. It lays a flat scrim over the whole
   * mock desk and raises the surface being taught above it — which is why
   * every `radius` this used to compute is gone, along with `_holeRadius()` in
   * the tracker and share steps. A circle sized to keep a full-width toolbar
   * legible had to be so large it stopped dimming anything; a scrim has no
   * such tension.
   *
   * @param {Object} args
   * @param {*} args.target   what is raised out of the scrim
   * @param {*} [args.anchor] what the callout points at, when that is not the
   *   whole target — e.g. a panel is lit but the beak marks one row inside it.
   *   Defaults to `target`.
   * @param {Object} [args.tooltip] see tooltipBubble
   * @param {String} [args.direction]
   * @param {String} [args.beak]
   * @param {Object} [args.owner] the step widget; Back/Next are routed at it
   */
  async focus(args = {}) {
    const { target, anchor, tooltip, direction = 'north', beak, owner } = args;
    if (!target) return this.clear();
    // Kept so the screen can be laid out again without the step having to
    // re-raise it — see reflow(). The step is the only object that knows what
    // its current screen points at, and it is not watching the window.
    this._args = args;
    const el = live(elementOf(target));
    if (!el || typeof el.getBoundingClientRect !== 'function') return;

    const ticket = ++this._seq;

    // The previous screen's element has to drop back into the scrim before
    // this one comes out of it, or two surfaces read as lit at once during
    // the crossfade.
    this._unlight();

    // The target rect, the anchor rect and the callout part do not depend on
    // one another, so they are resolved together rather than in the order they
    // happen to be written in.
    const anchorEl = anchor ? live(elementOf(anchor)) : null;
    const [rect, measuredAnchor, callout] = await Promise.all([
      waitForStableRect(el),
      anchorEl && anchorEl !== el ? waitForStableRect(anchorEl) : null,
      this.ensurePart('callout'),
    ]);
    if (this._stale(ticket)) return;
    // A zero-size target means waitForStableRect gave up: the element is in the
    // DOM but has no box, usually because the step's own layout has not settled
    // or the part named here is not the one that carries the size.
    //
    // Returning here used to be the end of it, and that was worse than it
    // looks. Between two SCREENS of one step nothing clears the callout first
    // — only _showStep does, and that runs on step boundaries — so bailing
    // left the PREVIOUS screen's card on screen with a live Next on it. The
    // tour then walked forward on someone else's control, one dead screen at a
    // time, showing nothing new until it fell out the far end of the step.
    //
    // So the measurement degrades instead of giving up. In order: the target,
    // the anchor inside it, the step's own root — and failing all three, the
    // middle of the tour with nothing lit. A misplaced callout is a cosmetic
    // bug; a missing one strands the user on a screen with no way out, which
    // is what "stuck on step 8, can't go next or back" was.
    const usable = (r) => !!(r && r.width && r.height);
    let box = rect;
    let lit = el;
    if (!usable(box)) {
      const rootEl = owner && owner.el;
      const rootRect = rootEl && rootEl.getBoundingClientRect
        ? rootEl.getBoundingClientRect() : null;
      this.warn && this.warn(
        `[tutorial] spotlight target "${nameOf(el)}" has no box`, el,
      );
      if (usable(measuredAnchor)) {
        // Pointing at the row rather than the panel it sits in is a smaller
        // error than not pointing at all.
        box = measuredAnchor;
        lit = anchorEl;
      } else if (usable(rootRect)) {
        box = rootRect;
        lit = rootEl;
      } else {
        const b = this.el.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        box = { left: cx, right: cx, top: cy, bottom: cy, width: 0, height: 0 };
        lit = null;
      }
    }

    if (lit) this._light(lit);
    this.setState(1);

    if (!tooltip) {
      callout.feed(null);
      return;
    }
    if (this._stale(ticket)) return;
    const anchorRect = measuredAnchor && measuredAnchor.width ? measuredAnchor : box;
    callout.feed(tooltipBubble(owner || this, {
      ...tooltip,
      direction,
      beak,
      style: anchorFor(anchorRect, direction),
      // Back/Next belong to the step that owns the screen; ending the tour
      // belongs to the tour. This widget is the only object holding both
      // references — `owner` is the step, and its own partHandler is
      // tutorial_main — so it is where the two are separated.
      host: this._tourHost(),
    }));
    await this._keepInView(callout, ticket);
  }

  /**
   * Nudge the callout back inside the tour if the anchor pushed it out.
   *
   * anchorFor places the card from the ANCHOR's centre and nothing bounds it,
   * so a block near an edge puts part of the card outside — and `__layout` is
   * `overflow: hidden`, so what lands outside is clipped, buttons included.
   * Share's step 5 rings Link Expiration near the bottom of the panel and lost
   * its Next that way: the callout was on screen, its control was not.
   *
   * The nudge is applied as a transform offset through two custom properties,
   * so it composes with the placement transform the skin already sets per
   * direction rather than fighting it. The beak is moved the opposite way by
   * the same amount, so the tail stays on the anchor while the card shifts —
   * and the nudge is clamped so the beak cannot slide off the card's own edge.
   *
   * @param {Object} callout the callout part
   * @param {Number} ticket  the focus ticket, so a stale pass does nothing
   */
  async _keepInView(callout, ticket) {
    const card = callout && callout.el && callout.el.querySelector(`.${BUBBLE_CLASS}`);
    if (!card) return;
    // Settled, not just next-frame. feed() mounts the card's children over
    // several frames, so a single rAF measures a card that is still growing —
    // and a short measurement under-nudges, which is the same clipped button
    // with extra steps. This is the helper the targets already use.
    const r = await waitForStableRect(card);
    if (this._stale(ticket) || !card.isConnected) return;
    if (!r.width || !r.height) return;

    const bounds = this.el.getBoundingClientRect();

    const over = (lo, hi, min, max) => {
      if (lo < min) return min - lo;
      if (hi > max) return max - hi;
      return 0;
    };
    let dx = over(r.left, r.right, bounds.left + EDGE, bounds.right - EDGE);
    let dy = over(r.top, r.bottom, bounds.top + EDGE, bounds.bottom - EDGE);

    // Past this the tail would leave the card it belongs to, and a beak
    // pointing at nothing is worse than a card slightly off-centre. The cap is
    // measured from the card's own edge, so a taller card can move further.
    const capX = Math.max(0, r.width / 2 - BEAK_INSET);
    const capY = Math.max(0, r.height / 2 - BEAK_INSET);
    const capped = { x: Math.max(-capX, Math.min(capX, dx)), y: Math.max(-capY, Math.min(capY, dy)) };

    // …but the cap only holds while the capped nudge is ENOUGH. A card that
    // lands well outside the tour cannot be pulled back within half its own
    // height, and the part left outside is usually the footer — which is where
    // Back and Next are. An unreachable button is not a cosmetic problem, so
    // past that point the card moves as far as it must and gives up its tail:
    // a detached beak reads as a stray triangle, a clipped one reads as a
    // broken tour.
    const detached = capped.x !== dx || capped.y !== dy;
    if (!detached) {
      dx = capped.x;
      dy = capped.y;
    }
    card.dataset.tail = detached ? 'off' : 'on';

    card.style.setProperty('--bubble-nudge-x', `${Math.round(dx)}px`);
    card.style.setProperty('--bubble-nudge-y', `${Math.round(dy)}px`);
  }

  /** tutorial_main, from the partHandler the shell fed us. */
  _tourHost() {
    const h = this.mget(_a.partHandler);
    if (!h) return null;
    return _.isArray(h) ? h[0] : h;
  }

  /**
   * Raise an element out of the scrim.
   *
   * A z-index only wins inside its own stacking context, and the step skins are
   * full of them: four of the step roots centre themselves with
   * `transform: translate(-50%, -50%)`, which opens a context whether or not
   * anything asks for one. Promoting the target alone would leave it stuck at
   * its ancestor's level — under the scrim — with no error and nothing to
   * inspect, on exactly the steps that look most finished.
   *
   * So the promotion walks up to the tutorial layout and lifts every ancestor
   * that opens a context on the way. That is a handful of nodes, computed once
   * per screen, and it makes the mechanism independent of skin discipline
   * rather than dependent on it.
   *
   * Every element's own inline values are remembered, so a step that styles a
   * block inline is handed back exactly what it had.
   */
  _light(el) {
    if (!el || !el.style) return;
    const touched = [];
    const raise = (node) => {
      touched.push({ node, position: node.style.position, zIndex: node.style.zIndex });
      // Only reposition a statically-positioned element; anything already
      // positioned keeps the position it chose for its own layout reasons.
      if (getComputedStyle(node).position === 'static') node.style.position = 'relative';
      node.style.zIndex = LIT_Z;
    };

    raise(el);
    for (let n = el.parentElement; n && !n.classList.contains(LAYOUT_CLASS); n = n.parentElement) {
      if (opensStackingContext(n)) raise(n);
    }

    this._lit = touched;
    el.classList.add('is-lit');
  }

  _unlight() {
    const touched = this._lit;
    if (!touched) return;
    this._lit = null;
    for (const { node, position, zIndex } of touched) {
      if (!node || !node.style) continue;
      node.style.position = position || '';
      node.style.zIndex = zIndex || '';
    }
    const el = touched[0] && touched[0].node;
    if (el && el.classList) el.classList.remove('is-lit');
  }

  /**
   * Put the callout's Done button into its pending state.
   *
   * The tour host calls this while the tour's closing write is in flight: on a
   * slow link that write is a visible pause during which the callout just sits
   * there, and the button the user pressed is where the wait belongs.
   *
   * The node is queried rather than held as a part because the callout is
   * rebuilt on every screen, so the one that matters is whichever is on screen
   * now; `is-done` marks it, and only the last screen carries it.
   *
   * @returns {Boolean} whether a button was actually found and marked
   */
  async busy() {
    const callout = await this.ensurePart('callout');
    const btn = callout && callout.el && callout.el.querySelector('.is-done');
    if (btn) btn.classList.add('loading');
    return !!btn;
  }

  /**
   * Put the spotlight down.
   *
   * Awaitable, and ticketed: a clear that loses its race against a newer focus
   * must not wipe that focus's callout. Returning the promise lets the host
   * order a step swap (see tutorial/index.js _showStep).
   */
  /**
   * Lay the current screen out again, in place.
   *
   * The callout's position comes from the rect of what it points at, measured
   * once when the screen was raised. A window resize — or a tablet rotating,
   * which arrives as the same event — invalidates that: the card keeps the
   * coordinates the old viewport gave it, which near an edge means its buttons
   * end up somewhere the user cannot reach.
   *
   * Re-entering focus() re-measures everything and re-runs _keepInView, and it
   * is safe to call at any time: the sequence ticket makes the newer call the
   * winner if one is already in flight.
   *
   * @returns {Promise|undefined}
   */
  reflow() {
    const args = this._args;
    if (!args) return;
    const el = elementOf(args.target);
    // The step that raised this screen may be long gone (its pane rebuilt, or
    // the tour moved on). Nothing to re-place, and re-running focus on a
    // detached node would only warn.
    if (!el || !el.isConnected) return;
    return this.focus(args);
  }

  async clear() {
    const ticket = ++this._seq;
    // The screen is coming down; there is nothing left to lay out again.
    this._args = null;
    this._unlight();
    this.setState(0);
    const callout = await this.ensurePart('callout');
    if (this._stale(ticket)) return;
    callout.feed(null);
  }

  onBeforeDestroy() {
    // The lit element belongs to a step, which may outlive this widget during
    // teardown; leaving it promoted would strand an inline z-index on it.
    this._unlight();
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }
}

module.exports = __tutorial_spotlight;
