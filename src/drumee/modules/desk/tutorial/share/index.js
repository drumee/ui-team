const { modeScreen, secureScreen, linkScreen } = require('./skeleton');

/**
 * Step 5 — secure share. Three internal screens behind ONE parent step, the
 * same shape as tutorial_folder and tutorial_task: navigation stays inside this
 * widget until the last screen, and only then does it hand back to
 * tutorial_main, which ends the tour.
 *
 * Figma 3314:86712 (recipient mode), 3314:86722 (secure share set up),
 * 3314:140345 (link issued). Those frames read STEP 5/6; the tour has five
 * steps, so the badge says 5/5.
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
      badge_text: 'STEP 5/5',
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
      badge_text: 'STEP 5/5',
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
      badge_text: 'STEP 5/5',
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
    // Re-entered via Back from a later step: resume where we left off. Step 5
    // is last today, so nothing exercises this — it is here so appending a step
    // cannot regress the behaviour.
    if (this.mget('enter_at_last')) this._screenIndex = SCREENS.length - 1;
    this._showScreen();
  }

  onPartReady(child, pn) {
    switch (pn) {
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Render the current screen and move the spotlight onto its target.
   *
   * The part is awaited rather than read straight after `feed`, because the
   * body is rebuilt on every screen change and only answers once the new DOM
   * has landed.
   */
  async _showScreen() {
    const s = SCREENS[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    this.feed(s.skeleton(this));
    const target = await this.ensurePart(s.target);
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      // Back is live on every screen: from the first it walks out to Step 4.
      tooltip: { ...s.badge, variant: 'figma' },
      direction: s.direction,
      radius: s.radius,
      owner: this,
    });
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
        // Only the last screen hands the tour back to tutorial_main; the bare
        // triggerHandlers() lets it read this widget's own service attribute.
        // Step 5 is last, so that completes the tutorial.
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
