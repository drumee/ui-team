const { menuScreen, dialogScreen, verifyScreen } = require('./skeleton');
const { stepBadge, isLastScreen, entryScreen } = require('../tours');

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
    this._screenIndex = entryScreen(this, SCREENS.length);
    this._showScreen();
  }

  onPartReady(child, pn) {
    switch (pn) {
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Drop the menu under the topbar's Add-new button.
   *
   * The button belongs to the tutorial shell (tutorial/skeleton/topbar.js), not
   * to this widget, so there is no CSS relationship to lean on and a fixed
   * offset would drift with the topbar. Measure it instead: left edges aligned,
   * hanging just below, the way a real menu opens from its trigger.
   *
   * No-ops when the button cannot be found, leaving the fallback position in
   * the stylesheet.
   */
  _placeMenu() {
    const GAP = 8;
    if (!this.el || typeof this.el.querySelector !== 'function') return;
    const menu = this.el.querySelector(`.${this.fig.family}__menu`);
    if (!menu) return;
    const scope = (this.el.closest && this.el.closest('.tutorial-main__layout')) || document;
    const btn = scope.querySelector('.tutorial-main__tb-new-workspace-btn');
    const box = menu.offsetParent || menu.parentElement;
    if (!btn || !box) return;
    const b = btn.getBoundingClientRect();
    const s = box.getBoundingClientRect();
    if (!b.width) return;
    menu.style.left = `${b.left - s.left}px`;
    menu.style.top = `${b.bottom - s.top + GAP}px`;
    menu.style.right = 'auto';
  }

  /**
   * Render the current screen and move the spotlight onto its target.
   *
   * The part is awaited rather than read straight after `feed`, because the
   * body is rebuilt on every screen change and only answers once the new DOM
   * has landed. The menu is placed BEFORE the spotlight is told about it, so
   * the badge measures it where it has come to rest.
   */
  async _showScreen() {
    const s = SCREENS[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    this.feed(s.skeleton(this));
    const target = await this.ensurePart(s.target);
    this._placeMenu();
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      // badge_text, hide_back and done all come from the tour, not from this widget: the
      // same three screens read "STEP 1/3 … 3/3" as their own tour and
      // "STEP 6/6" throughout as the last step of the full one, and only end
      // the tour ("Done") when this step is the tour's last.
      tooltip: {
        ...s.badge,
        badge_text: stepBadge(this, this._screenIndex),
        // Back walks out to the previous step when there is one. As the first
        // step of its own tour there is nothing behind screen 1, so the button
        // is hidden rather than left to raise back-step at a host with nowhere
        // to go.
        hide_back: !!this.mget('is_first') && this._screenIndex === 0,
        variant: 'figma',
        done: isLastScreen(this, this._screenIndex, SCREENS.length),
      },
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
