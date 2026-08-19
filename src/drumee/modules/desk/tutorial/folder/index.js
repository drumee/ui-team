const { folder } = require('../skeleton/toolkit');
const { chatScreen, threadHintScreen, menuScreen } = require('./skeleton');
const { stepBadge, isLastScreen, entryScreen } = require('../tours');

/**
 * Step 2 runs three internal screens behind ONE parent step, the same way
 * tutorial_workspace runs its three sub-badges: navigation stays inside this
 * widget until the last screen, and only then does it hand back to
 * tutorial_main. The badge therefore reads STEP 2/5 throughout — three screens
 * are still one step of the tour.
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
      title: 'Chat lives in folder',
      desc: 'Chat lives here. Every folder has its own persistent context. Discuss files and tag teammates without leaving your workspace.',
    },
  },
  {
    // Figma 3202:3732 — the hover toolbar that starts a thread. Same view and
    // same copy as the screen after it: the pair reads as one idea, shown then
    // explained, which is how the design frames it.
    skeleton: threadHintScreen,
    // Lit area taken from the design's own vignette (Figma 3202:3811): a
    // radialGradient at (1297.5, 374) of the 1440x1024 frame whose gradient
    // transform works out to radii of 729 x 1279 — so horizontally it reaches
    // about 730px, and vertically it exceeds the frame, i.e. full height.
    //
    // Ours is a circle, so it is centred on the panel and given that 730. That
    // one hole covers BOTH things this screen is about: the panel is at its
    // centre, and the hover tooltip + action bar sit 368px away, inside the
    // 402px clear core (55% of the radius — see spotlight/skin). Targeting the
    // hint group instead, as this did before, lit a ~230x50 strip at the bottom
    // of the screen and left the panel in the fade.
    target: 'thread-panel',
    // The hole is sized from the panel; the callout is placed against the
    // Drumee_Strategy_Q2 card at the top of it, which is where the design puts
    // it (card top 182 of 1024, level with the thread card — not the panel's
    // mid-height, ~220px lower). target and anchor exist precisely so the lit
    // area and the callout can be measured from different elements.
    anchor: 'thread-card',
    radius: 730,
    direction: 'east',
    badge: {
      title: 'Chat in threads',
      desc: 'Drop a file, chat in the threads without context loss',
    },
  },
  {
    skeleton: menuScreen,
    // The files panel is lit — its own rect sizes the hole, which takes in the
    // grid and the menu opened over it — while the callout points at the
    // "Chat thread" row inside the menu (see ctxmenu.js).
    target: 'files-panel',
    anchor: 'ctx-focus',
    direction: 'east',
    badge: {
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
    // A screen may light one element and point the callout at another.
    const anchor = screen.anchor ? await this.ensurePart(screen.anchor) : null;
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      anchor: anchor && anchor.el,
      // Numbering, the Back button and the Done wording all come from the tour: these three screens
      // read "STEP 1/3 … 3/3" and end with Done when this is the `folder`
      // tour, and "STEP 2/6" with Next throughout as step two of the full one.
      tooltip: {
        ...screen.badge,
        badge_text: stepBadge(this, this._screenIndex),
        // Live whenever a previous step exists (step two of the full tour);
        // hidden on screen 1 of its own tour, where back-step would reach the
        // host with nowhere to go.
        hide_back: !!this.mget('is_first') && this._screenIndex === 0,
        variant: 'figma',
        done: isLastScreen(this, this._screenIndex, SCREENS.length),
      },
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
