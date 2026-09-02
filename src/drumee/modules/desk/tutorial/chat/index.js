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
    // Figma 142:38674 — the Chat empty state the flow opens on.
    //
    // NO callout: the frame carries none, and the hero already says what this
    // screen is for in its own headline and paragraph. The card that used to
    // float beside the CTA was ours, and it repeated the hero in miniature.
    //
    // Which leaves the screen with nothing to press Next on, so the CTA becomes
    // the control — "Start discovering now" raises `next-step` itself (see
    // `cta_service` in skeleton/index.js). Exactly the arrangement the
    // workspace tour's opening screen uses for `home-cta`.
    //
    // `LOCALE.CHAT_HERO_TITLE_SHORT` and `LOCALE.TUTORIAL_CHAT_START` were this
    // callout's copy and now have no reader; the keys are left in the locale
    // files rather than pruned across all seven.
    pane: { empty: true },
    target: 'es-cta',
    anchor: 'es-cta',
    direction: 'north',
    bare: true,
  },
  {
    // Figma 142:39178 — "Drag and drop a file".
    //
    // The COMPOSER is what this screen is about, so the composer is what is
    // lit. That is the frame's own treatment: every other surface on it is
    // drawn at 40% — the chat panel, the stream's header, all six bubbles —
    // and the Chat Input alone is at full strength. Lighting `stream` (what
    // this did) held the whole message area out of the scrim instead, so the
    // one thing the screen is teaching was the only part of the pane that
    // looked no different from the rest.
    //
    // The beak lands on the PAPERCLIP, not on the composer's mid-point. The
    // frame puts the card over the left end of the input, which is where the
    // attach control is — and it is the control the sentence is about, since
    // dragging a file in is the same act as attaching one. target and anchor
    // exist precisely so the lit area and the beak can be measured off
    // different elements.
    target: 'composer',
    anchor: 'composer-attach',
    direction: 'south',
    title: () => LOCALE.TUTORIAL_CHAT_DROP_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_DROP_DESC,
  },
  {
    // Figma 169:39799. The design lands the beak on the reply-in-thread control
    // specifically, not on the bar: the card's beak is centred at x 1280.5 and
    // that control's centre is ~1278.
    //
    // 46, not the shared default of 32 (spotlight/index.js GAP). The frame puts
    // the card's bottom at y 806 and the toolbar's top at 852 — the extra 14
    // is the "Reply in thread" tip, which stands between the two and which the
    // average default was never measured against.
    pane: { hint: true },
    target: 'msg-file-message',
    anchor: 'hint-thread',
    direction: 'south',
    gap: 46,
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

    // `bare` raises the screen with no tooltip at all: focus() clears the
    // callout and returns, so nothing is drawn and nothing is left over from
    // the previous screen either (feed(null) would be a no-op — see the note
    // in spotlight/index.js).
    // How far through, the way 142:39178 draws it: a row of four dashes with
    // the first filled. FOUR, not five — the design counts only the screens
    // that carry a callout, and the empty-state hero is not one of them.
    //
    // Dashes and local numbering only while this step IS the whole tour.
    // Inside `full` the host's cumulative count is what the badge shows, and
    // 29 dashes would be a ruler rather than a progress bar — which is the
    // reason tours.js settled on one counting mode in the first place.
    const solo = !!this.mget('is_first') && !!this.mget('is_last');
    const carded = SCREENS.filter((x) => !x.bare).length;
    const firstCarded = SCREENS.findIndex((x) => !x.bare);
    const progress = solo
      ? {
          step: this._screenIndex - firstCarded,
          steps: carded,
          progressStyle: 'dashes',
        }
      : stepProgress(this, this._screenIndex);

    const tooltip = s.bare
      ? null
      : {
          title: s.title(),
          desc: s.desc(),
          ...progress,
          // Live whenever a previous step exists; hidden on screen 1 of its own
          // tour, where back-step would reach the host with nowhere to go.
          hide_back: !!this.mget('is_first') && this._screenIndex === 0,
          done: isLastScreen(this, this._screenIndex, SCREENS.length),
        };
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      anchor: anchor && anchor.el,
      tooltip,
      direction: s.direction,
      // Per screen where the frame asks for it; undefined everywhere else,
      // which anchorFor's default parameter reads as the shared 32.
      gap: s.gap,
      // The hero screen's frame carries no film; the four that follow light one
      // surface out of a busy mock and need it. `bare` already marks exactly
      // that screen, so the two cannot drift apart.
      dim: !s.bare,
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
