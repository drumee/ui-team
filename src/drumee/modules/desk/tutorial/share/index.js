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
  { lit: BLOCKS.NOTIFY, desc: () => LOCALE.TUTORIAL_SHARE_NOTIFY },
];

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
    this.feed(skeleton(this, s));
    const [panel, block] = await Promise.all([
      this.ensurePart('sp-panel'),
      this.ensurePart(s.lit),
    ]);
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
        // The frames show no Back on any of the six — the pill carries the
        // position and the panel is the thing being read.
        hide_back: true,
        done: isLastScreen(this, this._screenIndex, SCREENS.length),
      },
      direction: 'east',
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
