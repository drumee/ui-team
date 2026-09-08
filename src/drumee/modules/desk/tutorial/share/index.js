const skeleton = require('./skeleton');
const { BLOCKS } = require('./skeleton/panel');
const { stepProgress, isLastScreen, entryScreen } = require('../tours');

/**
 * The `share` tour — six screens of the Secure Share panel.
 * Figma 148:41197, 148:41957, 148:42521, 148:43080, 148:43639, 148:44198.
 *
 * Every screen is the same panel with one block ringed; the callout says what
 * that block is for. The frames badge them "STEP 1/6" … "STEP 6/6" in a pill —
 * which is now the callout's default for every tour, so nothing is asked for
 * here.
 *
 * `direction: 'east'` throughout: the design puts the card to the LEFT of the
 * panel with the beak on its right edge, which is what reaching east produces.
 */
const SCREENS = [
  { lit: BLOCKS.RECIPIENT, desc: () => LOCALE.TUTORIAL_SHARE_RECIPIENT },
  { lit: BLOCKS.ACCESS, desc: () => LOCALE.TUTORIAL_SHARE_ACCESS },
  { lit: BLOCKS.EMAIL, desc: () => LOCALE.TUTORIAL_SHARE_EMAIL },
  { lit: BLOCKS.PASSWORD, desc: () => LOCALE.TUTORIAL_SHARE_PASSWORD },
  { lit: BLOCKS.EXPIRY, desc: () => LOCALE.TUTORIAL_SHARE_EXPIRY },
  // The last block sits at the very bottom of the panel, and 148:44198 does
  // not put its callout beside the panel like the other five: the card goes
  // ON the panel, above the notify row, with the tail pointing down at it
  // (the frame's beak is on the card's bottom edge at y226.875).
  //
  // `south` is that placement — the name is the direction the callout REACHES
  // (spotlight/index.js anchorFor), so reaching south puts the card above the
  // target. A card beside the panel would have had to sit almost off the
  // bottom of the tour to line up with a row 13px from the panel's floor.
  { lit: BLOCKS.NOTIFY, direction: 'south', desc: () => LOCALE.TUTORIAL_SHARE_NOTIFY },
];

// Where the callout sits when a screen does not say otherwise: to the LEFT of
// the panel with the tail on its right edge, which is what the frames show for
// the first five (148:41197 onward).
const DIRECTION = 'east';

class __tutorial_share extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
  }

  async onDomRefresh() {
    // Re-entered via Back from a later step: resume where we left off.
    this._screenIndex = entryScreen(this, SCREENS.length);
    this._showScreen();
  }

  onPartReady(child, pn) {
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Scroll the panel so the ringed block is in view.
   *
   * The panel is taller than the window and the last two screens ring blocks
   * below the fold — the design shows it scrolled for exactly those. Measured
   * rather than tabulated per screen, so it stays right as the panel's
   * contents change.
   *
   * @param {Element} el the block to bring into view
   */
  async _scrollTo(el) {
    const body = await this.ensurePart('sp-body');
    const box = body && body.el;
    if (!box || !el || typeof el.getBoundingClientRect !== 'function') return;
    const b = box.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    if (!b.height || !t.height) return;
    // Leave a margin above the block rather than pinning it to the very top,
    // so the ring does not sit flush against the panel's edge.
    const MARGIN = 24;
    const delta = t.top - b.top - MARGIN;
    if (delta > 0 || t.bottom > b.bottom) box.scrollTop += delta;
  }

  /**
   * Size the ring for a screen whose ring stops short of its block.
   *
   * Step 2 rings the choice — the "Access Management" label, the Public Share
   * row and the Secure Share HEAD — and leaves the email and password cards
   * nested under Secure Share outside it (Figma 148:42515). The block itself
   * runs to the bottom of those cards, so the ring cannot simply trace it.
   *
   * Measured rather than tabulated: the label and the two descriptions all
   * wrap under a longer translation, and a height written down here would then
   * cut through a line of text. Every other screen leaves `--lit-h` unset and
   * the ring falls back to the block's own height (skin/index.scss).
   *
   * @param {Object} block the lit block's part
   */
  async _sizeRing(block) {
    const head = await this.ensurePart('sp-secure-head');
    if (!block || !block.el || !head || !head.el) return;
    const b = block.el.getBoundingClientRect();
    const h = head.el.getBoundingClientRect();
    if (!b.height || !h.height) return;
    // Scroll-invariant: both rects move together.
    //
    // 12 above, the outset every ring uses. Only 6 below, because the gap
    // between the Secure Share head and the email card under it is also 12 —
    // so a symmetric ring would put its bottom edge exactly on the card's top
    // edge and read as the card being underlined. Half the gap leaves the ring
    // visibly ending in the space between them.
    block.el.style.setProperty('--lit-h', `${Math.round(h.bottom - b.top) + 12 + 6}px`);
  }

  /**
   * Render the current screen and move the callout onto its block.
   *
   * The parts are awaited rather than read straight after `feed`, because the
   * panel is rebuilt on every screen change (the ring is baked into the tree)
   * and only answers once the new DOM has landed. The scroll happens BEFORE
   * the callout is told about the block, so it measures where it came to rest.
   */
  async _showScreen() {
    const s = SCREENS[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    // What the panel is about, both stamped by the host from fire()'s third
    // argument (see _buildWidgets in ../index.js):
    //
    //   subject       the row's shape — file, folder or workspace
    //   subject_data  the item's raw fields, when the trigger had them. Absent
    //                 for the full tour and for `?tutorial=share` previews, and
    //                 the panel falls back to the frames' placeholder copy.
    this.feed(skeleton(this, {
      ...s,
      subject: this.mget('subject'),
      subject_data: this.mget('subject_data'),
    }));
    const [panel, block] = await Promise.all([
      this.ensurePart('sp-panel'),
      this.ensurePart(s.lit),
    ]);
    // Before the scroll and before the callout measures anything: the ring is
    // what the callout's beak points at.
    if (s.lit === BLOCKS.ACCESS) await this._sizeRing(block);
    await this._scrollTo(block && block.el);

    this.triggerHandlers({
      service: 'spotlight:focus',
      // The whole panel comes out of the scrim; the ring and the beak mark the
      // block inside it.
      target: panel.el,
      anchor: block && block.el,
      tooltip: {
        title: LOCALE.SECURE_SHARE,
        desc: s.desc(),
        ...stepProgress(this, this._screenIndex),
        // Back on every screen but the one with nothing behind it. Six screens
        // of a form with only a forward button meant a misread was a misread
        // for the rest of the tour; the pill says where you are but does not
        // get you back there.
        //
        // `is_first` is the HOST's flag for the tour's first STEP, so inside
        // `full` — where share is the fifth step — screen 0 keeps its Back and
        // hands off to the step before it (see back-step in onUiEvent).
        hide_back: !!this.mget('is_first') && this._screenIndex === 0,
        done: isLastScreen(this, this._screenIndex, SCREENS.length),
      },
      direction: s.direction || DIRECTION,
      owner: this,
    });
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        // Only the last screen hands the tour back to tutorial_main, and it
        // NAMES the service. The step widget carries no `service` of its own
        // any more — see _buildWidgets in ../index.js.
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

module.exports = __tutorial_share;
