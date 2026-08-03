const { menuScreen, dialogScreen, verifyScreen } = require('./skeleton');

/**
 * Step 6 — importing from Google Drive. Three internal screens behind ONE
 * parent step, the same shape as steps 2, 4 and 5: navigation stays inside this
 * widget until the last screen, and only then does it hand back to
 * tutorial_main, which ends the tour.
 *
 * Figma 3314:86172 (the + New menu), 3314:86343 (the import dialog),
 * 3314:86542 (Verify & import). The badge reads 6/6 there and the tour now has
 * six steps, so it says the same here.
 *
 * Directions follow the design: the menu drops from the topbar so its card sits
 * BELOW it (north); the dialog is centred so its card sits to the RIGHT (west).
 */
const SCREENS = [
  {
    skeleton: menuScreen,
    target: 'menu',
    direction: 'north',
    badge: {
      badge_text: 'STEP 6/6',
      title: 'Google Migrate',
      desc: 'Import folders or files from Google Drive',
    },
  },
  {
    skeleton: dialogScreen,
    target: 'address',
    direction: 'west',
    // The address row is a thin strip; light the dialog around it.
    radius: 420,
    badge: {
      badge_text: 'STEP 6/6',
      title: 'Google Migrate',
      desc: 'Copy this email and share the folder in google drive that you want to migrate',
    },
  },
  {
    skeleton: verifyScreen,
    target: 'verify',
    direction: 'west',
    radius: 420,
    badge: {
      badge_text: 'STEP 6/6',
      title: 'Google Migrate',
      desc: 'Migrate now',
    },
  },
];

class __tutorial_migrate extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
  }

  async onDomRefresh() {
    // Re-entered via Back from a later step: resume where we left off. Step 6
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
      // Back is live on every screen: from the first it walks out to Step 5.
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
        // Step 6 is last, so that completes the tutorial.
        if (this._screenIndex >= SCREENS.length - 1) return this.triggerHandlers();
        this._screenIndex = this._screenIndex + 1;
        return this._showScreen();
      case 'back-step':
        // Back off the first screen leaves Step 6 entirely (→ Step 5).
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
    }
  }
}

module.exports = __tutorial_migrate;
