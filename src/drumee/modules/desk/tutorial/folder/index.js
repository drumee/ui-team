const { folder } = require('../skeleton/toolkit');
const { chatScreen, threadsScreen, menuScreen } = require('./skeleton');

/**
 * Step 2 runs three internal screens behind ONE parent step, the same way
 * tutorial_workspace runs its three sub-badges: navigation stays inside this
 * widget until the last screen, and only then does it hand back to
 * tutorial_main. The badge therefore reads STEP 2/5 throughout — the tour is
 * still five steps.
 *
 * Each entry owns the body it renders, the part the spotlight points at, and
 * the direction the connector leaves the card.
 */
const SCREENS = [
  {
    skeleton: chatScreen,
    // The /bg_concept.png chip, not the panel: the design lands the connector
    // on the chip's centre line.
    target: 'chat-link',
    // Keeps the hole over the whole chat panel (260×533), the way the panel's
    // own rect used to size it — the chip alone would clamp it to ~150.
    radius: 336,
    direction: 'east',
    badge: {
      badge_text: 'STEP 2/5',
      title: 'Chat lives in folder',
      desc: 'Chat lives here. Every folder has its own persistent context. Discuss files and tag teammates without leaving your workspace.',
    },
  },
  {
    skeleton: threadsScreen,
    // The whole thread panel; its own rect sizes the hole, so no radius here.
    target: 'thread-panel',
    direction: 'east',
    badge: {
      badge_text: 'STEP 2/5',
      title: 'Chat in threads',
      desc: 'Drop a file, chat in the threads without context loss',
    },
  },
  {
    skeleton: menuScreen,
    // The "Chat thread" row wrapper, not the whole menu — see ctxmenu.js.
    target: 'ctx-focus',
    // Menu (176×343) plus the submenu that hangs 8px past its right edge:
    // half the diagonal of that union, with the same 40px padding autoRadius
    // uses. Without it the hole would be sized to the 32px row.
    radius: 260,
    direction: 'east',
    badge: {
      badge_text: 'STEP 2/5',
      title: 'View and download chat threads',
      desc: 'View and download whenever you want in one click',
    },
  },
];

class __tutorial_folder extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
  }

  async onDomRefresh() {
    // No service → this instance is the inert faded backdrop behind Step 3.
    if (!this.mget(_a.service)) {
      this.feed(folder(this));
      return;
    }
    // Re-entered via Back from Step 3: resume on the screen we left off on.
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
   * The target part is awaited rather than read straight after `feed`, because
   * the body is rebuilt on every screen change and the part only answers once
   * the new DOM has landed.
   */
  async _showScreen() {
    const screen = SCREENS[this._screenIndex];
    if (!screen) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    this.feed(screen.skeleton(this));
    const target = await this.ensurePart(screen.target);
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      // Back is live on all three screens: from the first one it walks out to
      // Step 1, so there is never a dead end to hide it for.
      tooltip: { ...screen.badge, variant: 'figma' },
      direction: screen.direction,
      radius: screen.radius,
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
        // Back off the first screen leaves Step 2 entirely (→ Step 1).
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
    }
  }
}

module.exports = __tutorial_folder;
