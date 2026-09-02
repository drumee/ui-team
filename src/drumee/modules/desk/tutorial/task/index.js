const skeleton = require('./skeleton');
const { isLastScreen, entryScreen } = require('../tours');

/**
 * The `task` tour — Figma 146:40534 and 162:20161.
 *
 * TWO steps: the Task empty state, whose carousel walks the five views by
 * itself, and then the Board with the New task dialog open.
 *
 * The carousel used to be five separate STEPS, one per card, which made the
 * card index and the step number the same value. That was wrong in both
 * directions. The CTA reads "Create your first task", but on four of those five
 * steps all it did was nudge the track — so reaching the dialog it names took
 * five presses. And the progress pill counted to six through what the user sees
 * as one screen.
 *
 * The cards are content this screen animates through (`_card`), not steps of
 * the flow (`_screenIndex`). Keeping the two apart is the whole point of the
 * split: the timer and the drag move the first, the CTA and the callout's
 * Next/Back move the second.
 */
const SCREENS = [
  // The empty state. No `desc` — it carries no callout (see _showScreen), and
  // each card names its own view through the skeleton's VIEWS titles.
  { target: 'es-viewport', anchor: 'es-cta', direction: 'north' },
  // The dialog the flow ends on.
  //
  // `gap` because spotlight's GAP is measured to the ANCHOR, and this anchor —
  // the submit button — sits 30px inside the dialog's edge, that being the
  // dialog's own padding. The default 32 would put the card 2px off the dialog:
  // not overlapping it, but touching. 30 + 24 clears it by the 24 the backdrop
  // reserves for exactly this (see $nt-callout-col in ./skin/index.scss).
  { dialog: true, target: 'nt-dialog', anchor: 'nt-submit', direction: 'west',
    gap: 54, desc: () => LOCALE.TUTORIAL_TASK_NEW },
];

// How long each card holds before the track moves on.
//
// The carousel screen carries no callout (see the note in _showScreen), so
// nothing on it asks the user to press anything — the track advancing is what
// shows the five views. 3.5s is long enough to read the title under a card and
// take in the artwork, short enough that all five have been seen before someone
// reaches for the CTA.
const AUTO_SLIDE_MS = 3500;

// How far a drag must travel to count as "next card" rather than a slip. A
// quarter of the pitch: far enough that a click with a shaky hand does not
// move the carousel, close enough that a deliberate flick always does.
const DRAG_SNAP = 0.25;

// The last card, taken from the skeleton's own list so the two cannot drift: a
// cursor that thinks there is a sixth card would slide the track into blank
// space, and one that stopped at four would never show Project Health.
const LAST_CARD = Math.max(0, skeleton.VIEWS.length - 1);

class __tutorial_task extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
    // Which card the carousel is resting on. Survives a walk into the dialog
    // and back, so Back returns to the screen the user left rather than
    // snapping the track to the first view.
    this._card = 0;
  }

  async onDomRefresh() {
    this._screenIndex = entryScreen(this, SCREENS.length);
    this._showScreen();
  }

  onPartReady(child, pn) {
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  async _showScreen() {
    const s = SCREENS[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    // `index` is the card, not the step — the dialog screen ignores it.
    this.feed(skeleton(this, { ...s, index: this._card }));
    const [target, anchor] = await Promise.all([
      this.ensurePart(s.target),
      this.ensurePart(s.anchor),
    ]);
    // The callout appears on the DIALOG screen only. The carousel screen is the
    // empty state with its track sliding — the artwork is the thing being
    // shown, and a card over it was covering the view it names.
    //
    // That leaves the carousel with no Next either, since the callout footer
    // was the only control on it. The CTA carries the flow instead
    // (`cta_service` in skeleton/index.js), the same arrangement the chat
    // tour's opening screen and the workspace tour's home screen use — without
    // it the tour would strand on screen 1 and never reach the dialog.
    const tooltip = s.dialog
      ? {
          title: LOCALE.TASK_HERO_TITLE_SHORT,
          desc: s.desc(),
          // NO stepProgress spread: without `step`/`steps` the callout draws
          // no progress pill (see progress() in ../skeleton/toolkit/tooltip.js,
          // which needs both). The tour is one carousel and one dialog, and a
          // "STEP 2/2" badge over the form counted screens the user never
          // experienced as steps — the five views go past on a timer inside
          // the first one. Same reason the workspace tour dropped its pill.
          hide_back: !!this.mget('is_first') && this._screenIndex === 0,
          done: isLastScreen(this, this._screenIndex, SCREENS.length),
        }
      : null;
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      anchor: anchor && anchor.el,
      tooltip,
      direction: s.direction,
      gap: s.gap,
      // No film on either screen of this tour. The carousel screen is about the
      // artwork in the cards, and dimming the pane to light the viewport held
      // back the only thing worth reading; the dialog screen then follows suit
      // so the flow does not flicker a scrim in at the end.
      dim: false,
      owner: this,
    });
    this._armAutoSlide();
    this._armDrag();
  }

  /** Motion the user has not asked for; honour the platform preference. */
  _mayAnimate() {
    try {
      return !(typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return true;
    }
  }

  /**
   * Queue the next slide, or stand down.
   *
   * Stands down on the dialog screen, which has no carousel, and under
   * prefers-reduced-motion. A drag pauses it for the length of the gesture and
   * re-arms on release — the carousel is a showcase, so it carries on once let
   * go rather than freezing wherever the user happened to stop.
   */
  _armAutoSlide() {
    clearTimeout(this._slideTimer);
    this._slideTimer = null;
    if (!this._mayAnimate()) return;
    const s = SCREENS[this._screenIndex];
    // The carousel wraps, so there is no last card to stop on.
    if (!s || s.dialog) return;
    this._slideTimer = setTimeout(() => this._slideOn(), AUTO_SLIDE_MS);
  }

  /**
   * Move the track one card on, IN PLACE.
   *
   * Not through _showScreen: that re-feeds the whole empty state, which
   * rebuilds the track element — and a freshly mounted node has no previous
   * transform to transition from, so the skin's `transition: transform` never
   * runs and the carousel jumps. Setting the transform on the node that is
   * already there is what makes it a slide.
   *
   * Safe to bypass a re-render only because the cards are not steps: there is
   * no spotlight focus to re-raise and no callout copy to swap, so the track
   * and its dot row are the whole of what changes between them.
   *
   * `--es-pitch` is read rather than recomputed — the skin sets it per variant
   * AND per size tier, so a distance worked out here would desync on a narrow
   * pane (see the note on PITCH in skeleton/toolkit/empty-state.js).
   */
  async _slideOn() {
    // Past the last card, back to the first. A plain wrap, so the return trip
    // is one long slide across all five rather than a seam — cloning the items
    // to fake an endless belt would double the artwork and the DOM for a
    // five-card showcase that is only ever glanced at.
    const next = this._card >= LAST_CARD ? 0 : this._card + 1;
    if (!(await this._moveTrack(next))) return;
    this._armAutoSlide();
  }

  /**
   * Put the track on card `i` without re-rendering, moving the lit dot with it.
   *
   * Returns false when it could not — the step is gone, or the screen changed
   * while the part was being awaited and there is no track on show any more.
   */
  async _moveTrack(i) {
    const track = await this.ensurePart('es-track');
    if (this.isDestroyed && this.isDestroyed()) return false;
    const s = SCREENS[this._screenIndex];
    if (!s || s.dialog) return false;
    if (!track || !track.el) return false;

    this._card = i;
    track.el.style.transform = `translateX(calc(var(--es-pitch) * -${i}))`;
    this._syncDots(i);
    return true;
  }

  /**
   * Let the pointer drag the carousel.
   *
   * Bound to the track element itself, which `feed` replaces on every screen
   * render — so `pointerdown` is re-bound each time and the discarded node
   * takes its listener with it. `pointermove`/`pointerup` go on the WINDOW
   * instead, and only for the life of one drag: a pointer that leaves the track
   * mid-gesture still has to be followed, and a release outside it still has to
   * end the drag. They are removed the moment it does, so nothing accumulates.
   */
  async _armDrag() {
    const track = await this.ensurePart('es-track');
    if (!track || !track.el) return;
    if (this.isDestroyed && this.isDestroyed()) return;
    const el = track.el;
    // One pitch, read from CSS so it stays right on a narrow pane.
    const pitch = () =>
      parseFloat(getComputedStyle(el).getPropertyValue('--es-pitch')) || 0;

    const onDown = (e) => {
      if (e.button != null && e.button !== 0) return;
      const p = pitch();
      if (!p) return;
      // A drag is the user driving, so the timer stands down for its duration —
      // paused, not stopped: it is re-armed when the drag ends.
      clearTimeout(this._slideTimer);
      this._slideTimer = null;
      this._drag = { x0: e.clientX, from: this._card, pitch: p, moved: false };
      el.dataset.dragging = '1';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };

    const onMove = (e) => {
      const d = this._drag;
      if (!d) return;
      const dx = e.clientX - d.x0;
      if (Math.abs(dx) > 2) d.moved = true;
      // Rubber-band at both ends: there is nothing beyond card 0 or the last
      // card to pull into view, so the track gives only a third of the travel
      // there rather than dragging emptiness in.
      const raw = -d.from * d.pitch + dx;
      const min = -LAST_CARD * d.pitch;
      const eased = raw > 0 ? raw / 3 : raw < min ? min + (raw - min) / 3 : raw;
      el.style.transform = `translateX(${eased}px)`;
    };

    const onUp = (e) => {
      const d = this._drag;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      this._drag = null;
      delete el.dataset.dragging;
      if (!d) return;
      const dx = (e && typeof e.clientX === 'number' ? e.clientX : d.x0) - d.x0;
      let to = d.from;
      if (Math.abs(dx) > d.pitch * DRAG_SNAP) to = dx < 0 ? d.from + 1 : d.from - 1;
      // Clamp rather than wrap: a wrap on a drag would fling the track the
      // whole way across, which is not what a short pull asked for. The timer
      // still wraps.
      to = Math.max(0, Math.min(LAST_CARD, to));
      this._card = to;
      // Back to a pitch-based transform so the resting position stays correct
      // if the tier changes --es-pitch under it.
      el.style.transform = `translateX(calc(var(--es-pitch) * -${to}))`;
      this._syncDots(to);
      this._armAutoSlide();
    };

    el.addEventListener('pointerdown', onDown);
    this._dragCleanup = () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }

  /** The lit dot is baked in from `index` at build time, so it moves by hand. */
  async _syncDots(i) {
    const dots = await this.ensurePart('es-dots');
    if (!dots || !dots.el) return;
    const row = dots.el.children;
    for (let k = 0; k < row.length; k++) {
      row[k].dataset.on = k === i ? '1' : '0';
    }
  }

  onBeforeDestroy() {
    clearTimeout(this._slideTimer);
    this._slideTimer = null;
    if (this._dragCleanup) this._dragCleanup();
    this._dragCleanup = null;
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        // Raised by the empty state's CTA on the carousel screen (its
        // `cta_service`, skeleton/index.js) and by the callout's Next on the
        // dialog. Now that the cards are not steps, the CTA goes straight to
        // the dialog it is named after — one press, not five.
        if (this._screenIndex >= SCREENS.length - 1) return this.triggerHandlers({ service: 'next-step' });
        this._screenIndex = this._screenIndex + 1;
        return this._showScreen();
      case 'back-step':
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_task;
