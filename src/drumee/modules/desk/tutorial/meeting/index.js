const skeleton = require('./skeleton');
const { stepProgress, isLastScreen, entryScreen } = require('../tours');

/**
 * The `meeting` tour — Figma 148:44759, 149:44974, 156:19597.
 *
 * Three screens, the same shape as the Task tour: two carousel positions on
 * the Meet empty state, then the Schedule-a-meeting dialog over the week view.
 * Pressing Next slides the track; the caption under it names the card, which
 * is what the first two frames differ by.
 *
 * The scheduler used to be `tutorial_schedule`, a step of its own inside
 * folder_task. 2.0 puts it at the end of the MEET flow, which is where anyone
 * would actually reach it.
 */
const SCREENS = [
  { index: 0, target: 'es-viewport', anchor: 'es-cta', direction: 'north',
    desc: () => LOCALE.INSTANT_MEETING_HINT },
  { index: 1, target: 'es-viewport', anchor: 'es-viewport', direction: 'south',
    desc: () => LOCALE.SCHEDULE_MEETING_HINT },
  { dialog: true, target: 'sc-dialog', anchor: 'sc-submit', direction: 'west',
    desc: () => LOCALE.TUTORIAL_MEET_SCHEDULE },
];

class __tutorial_meeting extends LetcBox {

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
        title: LOCALE.MEET_HERO_TITLE_SHORT,
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

module.exports = __tutorial_meeting;
