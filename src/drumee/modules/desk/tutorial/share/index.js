const { modeScreen, secureScreen, linkScreen } = require('./skeleton');
const { stepBadge, isLastScreen, entryScreen } = require('../tours');

/**
 * Step 5 — secure share. Three internal screens behind ONE parent step, the
 * same shape as tutorial_folder and tutorial_task: navigation stays inside this
 * widget until the last screen, and only then does it hand back to
 * tutorial_main, which ends the tour.
 *
 * Figma 3314:86712 (recipient mode), 3314:86722 (secure share set up),
 * 3314:140345 (link issued).
 *
 * `direction: 'east'` throughout — the design puts the card to the LEFT of the
 * panel with the connector on the card's right edge.
 */
const SCREENS = [
  {
    skeleton: modeScreen,
    // The recipient-mode block, where the design's connector lands.
    target: 'recipient',
    direction: 'east',
    badge: {
      title: 'Secure share',
      desc: 'Click share and choose recipient mode.',
    },
  },
  {
    skeleton: secureScreen,
    // Secure Share and everything it unfolds: email restriction and password.
    target: 'secure',
    direction: 'east',
    badge: {
      title: 'Secure share',
      desc: 'Choose secure share then set up restricted email and password',
    },
  },
  {
    skeleton: linkScreen,
    // Expiry, Get link, and the issued link with its Revoke control.
    target: 'link',
    direction: 'east',
    badge: {
      title: 'Secure share',
      desc: 'Share to external guest and control the access list',
    },
  },
];

class __tutorial_share extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
  }

  async onDomRefresh() {
    // Re-entered via Back from Step 6: resume on the screen we left off on.
    this._screenIndex = entryScreen(this, SCREENS.length);
    this._showScreen();
  }

  onPartReady(child, pn) {
    switch (pn) {
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /** @returns {Element|null} the panel's scrolling body, when it is in the DOM */
  _panelBody() {
    if (!this.el || typeof this.el.querySelector !== 'function') return null;
    return this.el.querySelector(`.${this.fig.family}__panel-body`);
  }

  /**
   * Scroll the panel so the screen's block sits at the top, which is what the
   * design shows: the panel is taller than the window, and each screen brings
   * its own section into view rather than pointing at something half off the
   * bottom.
   *
   * Done by measuring rather than by tabulated offsets, so it stays right as
   * the panel's contents change between screens.
   *
   * @param {Element} el the block to bring up
   */
  _scrollPanelTo(el) {
    const body = this._panelBody();
    if (!body || !el || typeof el.getBoundingClientRect !== 'function') return;
    const b = body.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    if (!b.height || !t.height) return;
    body.scrollTop += t.top - b.top;
  }

  /**
   * Radius that keeps the whole share panel inside the lit area.
   *
   * The hole is centred on the screen's block and is fully clear out to 55% of
   * its radius (see spotlight/skin). COVERAGE puts the panel's furthest corner
   * at 72% of the radius instead — the panel reads top to bottom while the rest
   * of the window still fades. Same treatment the tracker step gives its view
   * switcher.
   *
   * @param {Element} el the spotlight target
   * @returns {Number|null} null when the panel cannot be measured
   */
  _holeRadius(el) {
    const COVERAGE = 0.72;
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    if (!this.el || typeof this.el.querySelector !== 'function') return null;
    const p = this.el.querySelector(`.${this.fig.family}__panel`);
    if (!p) return null;
    const t = el.getBoundingClientRect();
    const r = p.getBoundingClientRect();
    if (!t.width || !r.width) return null;
    const cx = t.left + t.width / 2;
    const cy = t.top + t.height / 2;
    const far = Math.max(
      Math.hypot(r.left - cx, r.top - cy),
      Math.hypot(r.right - cx, r.top - cy),
      Math.hypot(r.left - cx, r.bottom - cy),
      Math.hypot(r.right - cx, r.bottom - cy),
    );
    return Math.round(far / COVERAGE);
  }

  /**
   * Render the current screen and move the spotlight onto its target.
   *
   * The part is awaited rather than read straight after `feed`, because the
   * body is rebuilt on every screen change and only answers once the new DOM
   * has landed. The panel is scrolled BEFORE the spotlight is told about the
   * target, so it measures the block where it has come to rest.
   */
  async _showScreen() {
    const s = SCREENS[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    this.feed(s.skeleton(this));
    const target = await this.ensurePart(s.target);
    this._scrollPanelTo(target.el);
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      // Numbering, Back and Done all come from the tour: "STEP 1/3 … 3/3"
      // standing alone, "STEP 5/6" throughout as step five of the full one.
      tooltip: {
        ...s.badge,
        badge_text: stepBadge(this, this._screenIndex),
        hide_back: !!this.mget('is_first') && this._screenIndex === 0,
        variant: 'figma',
        done: isLastScreen(this, this._screenIndex, SCREENS.length),
      },
      direction: s.direction,
      // Sized so the whole panel stays lit; s.radius is the fallback.
      radius: this._holeRadius(target.el) || s.radius,
      owner: this,
    });
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        // Only the last screen hands the tour back to tutorial_main; the bare
        // triggerHandlers() lets it read this widget's own service attribute.
        if (this._screenIndex >= SCREENS.length - 1) return this.triggerHandlers();
        this._screenIndex = this._screenIndex + 1;
        return this._showScreen();
      case 'back-step':
        // Back off the first screen leaves Step 5 entirely (→ Step 4).
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
    }
  }
}

module.exports = __tutorial_share;
