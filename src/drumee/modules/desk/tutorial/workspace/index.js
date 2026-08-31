const skeleton = require('./skeleton');
const { BLOCKS } = require('../skeleton/toolkit/workspace-dialog');
const { stepProgress, isLastScreen, entryScreen } = require('../tours');

/**
 * The `workspace` tour — five screens of the Create-new-workspace dialog
 * (Figma 176:40762 → 176:41391).
 *
 * 1.x pointed at three workspace TILES on the desk. A brand-new account, which
 * is exactly who this tour runs for, has no tiles — so 2.0 teaches the three
 * workspace types where the user actually meets them, inside the dialog that
 * makes one.
 *
 * The dialog is the lit surface throughout; what changes per screen is which
 * block inside it is at full strength (`lit`) and where the callout's beak
 * lands (`anchor`). Two of the dialog screens are bare bubbles — a line of copy
 * and nothing else — which is what the design shows, so they carry `text`
 * rather than title/desc.
 *
 * Screen 1 has no callout at all (`bare`), because the frame it is drawn from
 * has none; its CTA carries the tour forward instead.
 *
 * `direction: 'west'` on the dialog screens: the design puts the callout to
 * the RIGHT of the dialog, which is what reaching west produces. The opening
 * home screen reaches north instead, so its card hangs under the `+ New`
 * button it names.
 */
const SCREENS = [
  {
    // Figma 140:22684 — the home EMPTY STATE the flow starts on: the
    // "Your workspace starts here." hero and the CTA that opens the dialog.
    // The tour used to open straight onto an already-open dialog, which
    // skipped how the user got there.
    home: true,
    target: 'home-cta',
    anchor: 'home-cta',
    direction: 'north',
    beak: 'end',
    // NO callout. 140:22684 is the entry state the flow arrow leaves from and
    // it carries none — the CTA is the whole instruction, and a card floating
    // beside it was ours.
    //
    // Which leaves the screen with nothing to press Next on, so the CTA
    // becomes the control: it is already the lit surface, it is already what
    // the frame's arrow leaves from, and in the product it is what opens the
    // dialog that screen 2 draws. See `home-cta` in skeleton/toolkit/home.js.
    bare: true,
  },
  {
    lit: BLOCKS.NAME,
    anchor: BLOCKS.NAME,
    text: () => LOCALE.TUTORIAL_WS_NAME,
  },
  {
    lit: BLOCKS.type('internal'),
    anchor: BLOCKS.type('internal'),
    title: () => LOCALE.TUTORIAL_WS_INTERNAL_TITLE,
    desc: () => LOCALE.INTERNAL_WORKSPACE_HINT,
  },
  {
    lit: BLOCKS.type('external'),
    anchor: BLOCKS.type('external'),
    title: () => LOCALE.TUTORIAL_WS_EXTERNAL_TITLE,
    desc: () => LOCALE.EXTERNAL_WORKSPACE_HINT,
  },
  {
    lit: BLOCKS.type('personal'),
    anchor: BLOCKS.type('personal'),
    title: () => LOCALE.TUTORIAL_WS_PERSONAL_TITLE,
    desc: () => LOCALE.PERSONAL_WORKSPACE_HINT,
  },
  {
    // The closing screen lights the type list AND the now-enabled Create
    // button, because it is about the pair.
    lit: BLOCKS.CREATE,
    anchor: BLOCKS.CREATE,
    ready: true,
    text: () => LOCALE.TUTORIAL_WS_CREATE,
  },
];

class __tutorial_workspace extends LetcBox {

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
   * Render the current screen and move the callout onto its block.
   *
   * The parts are awaited rather than read straight after `feed`, because the
   * dialog is rebuilt on every screen change (the dimming is baked into the
   * tree) and only answers once the new DOM has landed.
   */
  async _showScreen() {
    const s = SCREENS[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    this.feed(skeleton(this, s));
    // The dialog screens light the whole dialog and point the beak at one row
    // inside it; the home screen lights the button and points at the same
    // thing, so the target is named per screen rather than assumed.
    const [target, anchor] = await Promise.all([
      this.ensurePart(s.target || 'wsd-dialog'),
      this.ensurePart(s.anchor),
    ]);

    // Back and Done are the same rules on every screen, bare or not — the
    // bare ones differ only in what they SAY, not in how they are left.
    // Deliberately no dashes anywhere here: the design leaves this tour
    // uncounted. `hide_back` comes from the tour, so it reads correctly both
    // standing alone and as step one of `full`.
    const chrome = {
      // Numbered like every other tour. The frames leave these callouts
      // uncounted, but a screen nobody can name is a screen nobody can report
      // — see the note on progressStyle in toolkit/tooltip.js.
      ...stepProgress(this, this._screenIndex),
      hide_back: !!this.mget('is_first') && this._screenIndex === 0,
      done: isLastScreen(this, this._screenIndex, SCREENS.length),
    };
    // `bare` raises the screen with no tooltip at all: focus() feeds the
    // callout null and returns, so nothing is drawn and nothing is left over
    // from the previous screen either.
    const tooltip = s.bare
      ? null
      : s.text
        ? { text: s.text(), ...chrome }
        : { title: s.title(), desc: s.desc(), ...chrome };
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      anchor: anchor && anchor.el,
      tooltip,
      direction: s.direction || 'west',
      beak: s.beak,
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
        // Back off the first screen leaves this step entirely.
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_workspace;
