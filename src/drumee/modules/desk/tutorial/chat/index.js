const skeleton = require('./skeleton');
const { stepProgress, isLastScreen, entryScreen } = require('../tours');

/**
 * The `chat` tour — four screens about file threads.
 *
 * New in 2.0, and new as a TOUR: in 1.x these were three screens inside the
 * folder step, reached by opening a folder. The design pulls them out and adds
 * an empty state in front of them — Figma 142:38674, 142:39178, 169:39799,
 * 142:39530, 169:40101 — so they are fired the first time someone opens a
 * workspace's Chat rather than buried behind the folder tour.
 *
 * The pane is identical on all four; what changes is which of its three
 * optional pieces is present and where the callout points.
 */
const SCREENS = [
  {
    // Figma 142:38674 — the Chat empty state the flow opens on. Like the other
    // empty states it carries no callout of its own, so the sentence is ours
    // and it points at the CTA the flow leaves from.
    pane: { empty: true },
    target: 'es-cta',
    anchor: 'es-cta',
    direction: 'north',
    title: () => LOCALE.CHAT_HERO_TITLE_SHORT,
    desc: () => LOCALE.TUTORIAL_CHAT_START,
  },
  {
    // The stream as it stands, callout over the composer: "drop a file here".
    target: 'stream',
    anchor: 'composer',
    direction: 'south',
    title: () => LOCALE.TUTORIAL_CHAT_DROP_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_DROP_DESC,
  },
  {
    // The hover toolbar on the file message. The design lands the beak on the
    // reply-in-thread control specifically, not on the bar.
    pane: { hint: true },
    target: 'msg-file-message',
    anchor: 'hint-thread',
    direction: 'south',
    title: () => LOCALE.TUTORIAL_CHAT_HASH_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_HASH_DESC,
  },
  {
    // Thread panel open, callout below its file card.
    pane: { thread: true },
    target: 'thread',
    anchor: 'thread-file',
    direction: 'north',
    title: () => LOCALE.TUTORIAL_CHAT_OPEN_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_OPEN_DESC,
  },
  {
    // The thread, answered.
    pane: { thread: true, replies: true },
    target: 'thread',
    anchor: 'thread-composer',
    direction: 'south',
    title: () => LOCALE.TUTORIAL_CHAT_DISCUSS_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_DISCUSS_DESC,
  },
];

class __tutorial_chat extends LetcBox {

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
   * Render the current screen and move the callout onto its anchor.
   *
   * The parts are awaited rather than read straight after `feed`, because the
   * pane is rebuilt on every screen change and only answers once the new DOM
   * has landed.
   */
  async _showScreen() {
    const s = SCREENS[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    this.feed(skeleton(this, s.pane || {}));
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
        // Numbered: 1/4 … 4/4 standing alone, and this step's number inside
        // `full`, where the mode switches to step counting.
        ...stepProgress(this, this._screenIndex),
        // Live whenever a previous step exists; hidden on screen 1 of its own
        // tour, where back-step would reach the host with nowhere to go.
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

module.exports = __tutorial_chat;
