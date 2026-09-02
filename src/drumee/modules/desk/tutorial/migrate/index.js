const skeleton = require('./skeleton');
const { stepProgress, isLastScreen, entryScreen } = require('../tours');

/**
 * The `migrate` tour — importing from Google Drive, three screens.
 *
 * Figma 176:47527, 180:49109 and 180:49990: the import dialog at three points
 * in the form. Their copy is the design's, verbatim.
 *
 * The tour used to open on two Files-pane screens ahead of these — the Migrate
 * CTA (142:34981) and the + New menu (142:35805) — so that it showed how the
 * dialog was reached rather than starting mid-task. Those are gone; the tour
 * now opens on the dialog itself. The pane is still drawn BEHIND the dialog
 * (the frames hold it back there), so the removal is of the two screens, not of
 * the pane. `filesPane`'s `menu` option and its `fp-new-menu` part are
 * consequently unused — left in skeleton/toolkit/files.js, which is where a
 * Files flow would pick them up again.
 *
 * `direction: 'west'` puts the card to the RIGHT of the dialog, where the
 * frames put it.
 */
const SCREENS = [
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
