const skeleton = require('./skeleton');
const { isLastScreen, entryScreen } = require('../tours');

/**
 * The `meeting` tour — Figma 148:44759, 149:44974, 156:19597.
 *
 * TWO steps: the Meet empty state, whose carousel walks the two previews by
 * itself, then the Schedule-a-meeting dialog over the week view.
 *
 * The two previews used to be two STEPS, which made the card index and the step
 * number the same value — pressing Next only slid the track. They are content
 * this screen animates through (`_card`), not steps of the flow
 * (`_screenIndex`). The timer moves the first; the CTA and the callout's
 * Next/Back move the second. Same split as the task tour, for the same reason.
 *
 * The scheduler used to be `tutorial_schedule`, a step of its own inside
 * folder_task. 2.0 puts it at the end of the MEET flow, which is where anyone
 * would actually reach it.
 */
const SCREENS = [
  // The empty state. No `desc` — it carries no callout (see _showScreen), and
  // each preview names itself through the caption under the track.
  { target: 'es-viewport', anchor: 'es-cta', direction: 'north' },
  { dialog: true, target: 'sc-dialog', anchor: 'sc-submit', direction: 'west',
    desc: () => LOCALE.TUTORIAL_MEET_SCHEDULE },
];

// How long each preview holds before the track moves on. The same 3.5s the
// task tour's carousel uses — long enough to read the caption and take in the
// screenshot, short enough that both have been seen before someone reaches for
// the CTA.
const AUTO_SLIDE_MS = 3500;

// The last card, from the skeleton's own list so the two cannot drift: a cursor
// that thinks there is a third preview would slide the track into blank space.
const LAST_CARD = Math.max(0, skeleton.ITEMS.length - 1);

class __tutorial_meeting extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
    // Which preview the carousel is resting on. Survives a walk into the
    // dialog and back, so Back returns to the card the user left.
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
    // The callout appears on the DIALOG screen only. The carousel screen is a
    // landscape screenshot of the product with a caption under it — a card over
    // that was covering the thing it was describing.
    //
    // That leaves the carousel with no Next, since the callout footer was its
    // only control. The CTA carries the flow instead (`cta_service` in
    // skeleton/index.js), the arrangement the task and chat tours already use.
    const tooltip = s.dialog
      ? {
          title: LOCALE.MEET_HERO_TITLE_SHORT,
          desc: s.desc(),
          // NO stepProgress spread: without `step`/`steps` the callout draws no
          // progress pill at all (progress() in
          // ../skeleton/toolkit/tooltip.js needs both, and the header collapses
          // rather than leaving an empty band). The tour is one carousel and
          // one dialog; a "STEP 2/2" badge counted screens the user never
          // experienced as steps. Same as the task and workspace tours.
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
      // No film on either screen. The carousel is about the screenshot in the
      // track, and dimming the pane to light the viewport held back the only
      // thing worth looking at; the scheduler then follows suit, so the flow
      // does not fade a scrim in at the end of a tour that has not shown one.
      // The callout's beak is what points at the form being described.
      dim: false,
      owner: this,
    });
    this._armAutoSlide();
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

  /** Queue the next slide, or stand down on the dialog / under reduced motion. */
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
   * Move the track one preview on, IN PLACE.
   *
   * Not through _showScreen: that re-feeds the whole empty state, which
   * rebuilds the track element — and a freshly mounted node has no previous
   * transform to transition from, so the skin's `transition: transform` never
   * runs and the carousel jumps. Setting the transform on the node that is
   * already there is what makes it a slide.
   *
   * Safe to bypass a re-render only because the previews are not steps: there
   * is no spotlight focus to re-raise and no callout copy to swap.
   */
  async _slideOn() {
    // Past the last card, back to the first. With two of them the wrap is the
    // same distance as the step, so the loop reads as a shuttle between the
    // two previews.
    const next = this._card >= LAST_CARD ? 0 : this._card + 1;
    if (!(await this._moveTrack(next))) return;
    this._armAutoSlide();
  }

  /**
   * Put the track on card `i` without re-rendering, moving the caption with it.
   *
   * Returns false when it could not — the step is gone, or the screen changed
   * while the part was being awaited and there is no track on show any more.
   *
   * `--es-pitch` is read rather than recomputed: the skin sets it per variant
   * AND per size tier, so a distance worked out here would desync on a narrow
   * pane (see the note on PITCH in ../skeleton/toolkit/empty-state.js).
   */
  async _moveTrack(i) {
    const track = await this.ensurePart('es-track');
    if (this.isDestroyed && this.isDestroyed()) return false;
    const s = SCREENS[this._screenIndex];
    if (!s || s.dialog) return false;
    if (!track || !track.el) return false;

    this._card = i;
    track.el.style.transform = `translateX(calc(var(--es-pitch) * -${i}))`;
    this._syncCaption(i);
    return true;
  }

  /**
   * The caption names the card, so it moves with it. Both are in the DOM and
   * the active one is shown — see the caption deck in
   * ../skeleton/toolkit/empty-state.js for why it is not one row being rewritten.
   */
  async _syncCaption(i) {
    const deck = await this.ensurePart('es-captions');
    if (!deck || !deck.el) return;
    const row = deck.el.children;
    for (let k = 0; k < row.length; k++) {
      row[k].dataset.on = k === i ? '1' : '0';
    }
  }

  /**
   * An arrow was pressed: move one card that way, wrapping at both ends.
   *
   * The timer is PAUSED rather than stopped — it is re-armed from wherever the
   * press left the track, so the carousel carries on afterwards. Someone
   * stepping through the previews by hand has not asked for the showcase to
   * end, and the two previews wrap, so there is no end for it to stop at.
   */
  async _stepCard(delta) {
    const n = LAST_CARD + 1;
    const to = ((this._card + delta) % n + n) % n;
    clearTimeout(this._slideTimer);
    this._slideTimer = null;
    if (!(await this._moveTrack(to))) return;
    this._armAutoSlide();
  }

  onBeforeDestroy() {
    clearTimeout(this._slideTimer);
    this._slideTimer = null;
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        // Raised by the empty state's CTA on the carousel screen and by the
        // callout's Next on the dialog. The previews are not steps, so the CTA
        // goes straight to the scheduler — one press, not two.
        if (this._screenIndex >= SCREENS.length - 1) return this.triggerHandlers({ service: 'next-step' });
        this._screenIndex = this._screenIndex + 1;
        return this._showScreen();
      case 'back-step':
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
      // The caption arrows. They move the CARD, never the step — pressing
      // "previous" on the first preview wraps to the last rather than walking
      // out of the tour, which is what a back-step would do.
      case 'prev-card':
        return this._stepCard(-1);
      case 'next-card':
        return this._stepCard(1);
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_meeting;
