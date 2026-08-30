const skeleton = require('./skeleton');
const { stepProgress, isLastScreen, entryScreen } = require('../tours');

/**
 * The `migrate` tour — importing from Google Drive, five screens.
 *
 * Figma, in the flow's own order: 142:34981 (the Files empty state and its
 * Migrate CTA), 142:35805 (the + New menu open), then 176:47527, 180:49109 and
 * 180:49990 (the import dialog at three points in the form).
 *
 * This was built as three screens — the dialog only — which started the tour
 * mid-task, on a dialog the user had not been shown how to open. The two Files
 * screens are where the flow actually begins.
 *
 * Those first two frames carry no callout of their own, so their copy is ours;
 * the three dialog frames' copy is the design's, verbatim.
 *
 * `direction: 'west'` on the dialog screens puts the card to the RIGHT of the
 * dialog, where the frames put it.
 */
const SCREENS = [
  {
    // The Files empty state. The Migrate CTA is what the flow leaves from.
    target: 'fp-migrate',
    anchor: 'fp-migrate',
    direction: 'north',
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_START_DESC,
  },
  {
    // The + New menu, open over the same pane.
    menu: true,
    target: 'fp-new-menu',
    anchor: 'fp-new-menu',
    direction: 'west',
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_NEW_DESC,
  },
  {
    dialog: true,
    target: 'mg-dialog',
    anchor: 'mg-address',
    direction: 'west',
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_COPY_DESC,
  },
  {
    // The address has been copied; the link is still empty.
    dialog: true,
    copied: true,
    target: 'mg-dialog',
    anchor: 'mg-link',
    direction: 'west',
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_PASTE_DESC,
  },
  {
    dialog: true,
    copied: true,
    linked: true,
    target: 'mg-dialog',
    anchor: 'mg-verify',
    direction: 'west',
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_PASTE_DESC,
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
    // Re-entered via Back from a later step: resume where we left off.
    this._screenIndex = entryScreen(this, SCREENS.length);
    this._showScreen();
  }

  onPartReady(child, pn) {
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Render the current screen and move the callout onto its target.
   *
   * The parts are awaited rather than read straight after `feed`, because the
   * body is rebuilt on every screen change and only answers once the new DOM
   * has landed.
   */
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
        title: s.title(),
        desc: s.desc(),
        // 1/5 … 5/5 standing alone, and this step's number inside `full`.
        ...stepProgress(this, this._screenIndex),
        // Live whenever a previous screen exists; hidden on screen 1 of its
        // own tour, where back-step would reach the host with nowhere to go.
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

module.exports = __tutorial_migrate;
