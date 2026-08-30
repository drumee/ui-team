const skeleton = require('./skeleton');
const { stepProgress, isLastScreen, entryScreen } = require('../tours');

/**
 * The `task` tour — Figma 146:40534 and 162:20161.
 *
 * Six screens. The first five are ONE screen of chrome with the carousel
 * scrolled to a different card each time: pressing Next slides the track from
 * right to left rather than replacing the pane, which is what the frames
 * describe. The sixth is the Board with the New task dialog open.
 *
 * Built as a single screen before this, which lost both the sliding and the
 * dialog.
 */
const SCREENS = [
  { index: 0, target: 'es-viewport', anchor: 'es-cta', direction: 'north',
    desc: () => LOCALE.TUTORIAL_TASK_BOARD },
  { index: 1, target: 'es-viewport', anchor: 'es-viewport', direction: 'south',
    desc: () => LOCALE.TUTORIAL_TASK_CALENDAR },
  { index: 2, target: 'es-viewport', anchor: 'es-viewport', direction: 'south',
    desc: () => LOCALE.TUTORIAL_TASK_GANTT },
  { index: 3, target: 'es-viewport', anchor: 'es-viewport', direction: 'south',
    desc: () => LOCALE.TUTORIAL_TASK_LIST },
  { index: 4, target: 'es-viewport', anchor: 'es-viewport', direction: 'south',
    desc: () => LOCALE.TUTORIAL_TASK_HEALTH },
  // The dialog the flow ends on.
  { dialog: true, target: 'nt-dialog', anchor: 'nt-submit', direction: 'west',
    desc: () => LOCALE.TUTORIAL_TASK_NEW },
];

class __tutorial_task extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
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
    this.feed(skeleton(this, s));
    const [target, anchor] = await Promise.all([
      this.ensurePart(s.target),
      this.ensurePart(s.anchor),
    ]);
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      anchor: anchor && anchor.el,
      tooltip: {
        title: LOCALE.TASK_HERO_TITLE_SHORT,
        desc: s.desc(),
        ...stepProgress(this, this._screenIndex),
        hide_back: !!this.mget('is_first') && this._screenIndex === 0,
        done: isLastScreen(this, this._screenIndex, SCREENS.length),
      },
      direction: s.direction,
      owner: this,
    });
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'next-step':
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
