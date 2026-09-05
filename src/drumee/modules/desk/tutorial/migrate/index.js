const skeleton = require('./skeleton');
const { isLastScreen, entryScreen } = require('../tours');

/**
 * The `migrate` tour — importing from Google Drive, five screens.
 *
 * Three Files-pane screens, then the import dialog at three points in the form:
 *
 *   1  142:34981  the pane — the user PRESSES one of its three buttons
 *   2  142:35805  the same pane with the + New dropdown open
 *   3            —the pane with Upload lit (no frame; see the screen)
 *   4  176:47527  the dialog, on the address to copy
 *   5  180:49109  …the link to paste
 *   6  180:49990  …and the verify step
 *
 * The dialog screens' copy is the design's, verbatim.
 *
 * Screens 1-3 say HOW THE DIALOG IS REACHED, which is the half the tour was
 * missing: it opened mid-task, on a dialog the user had no idea they had three
 * ways to summon.
 *
 * TRIGGERED BY THE RAIL'S FILES BUTTON (modules/desk/index.js, case
 * "rail-files"), so the tour opens on a drawing of the pane the user has just
 * navigated to. It used to be raised by the surfaces that ask for the import
 * dialog directly — the folder window's + New gdrive row and the Files hero
 * button — which had it backwards: someone who has already found "+ New ->
 * Migrate from Google Drive" does not need to be taught where it is, and
 * gating on that meant the one tour about importing never ran for anyone who
 * had not already solved the discovery problem. Those surfaces now only open
 * the dialog (they still defer it past a tour raised elsewhere, via
 * Tours.whenDone). The desk topbar's own + New still fires on open.
 *
 * NO PROGRESS PILL anywhere in this tour. `stepProgress` is deliberately not
 * spread into any tooltip below, so tooltipBubble draws no header row at all —
 * not an empty band above the copy (see `progress()` in
 * skeleton/toolkit/tooltip.js, which returns null without `step`/`steps`).
 * A count would be wrong here anyway now that the tour branches: screen 1 has
 * no card to carry one, and no run of this tour visits all six screens.
 *
 * SCREEN 1 IS A BRANCH, not a slide. The frame carries no callout, and it does
 * not get one: all THREE of its hero buttons are the controls, and which one is
 * pressed decides where the tour goes —
 *
 *   Migrate from Google Drive  →  screen 4, the import dialog it opens
 *   + New                      →  screen 2, the dropdown it opens
 *   Upload                     →  screen 3, the picker it opens
 *
 * which is what those buttons do outside the tour. So screens 2 and 3 are
 * BRANCHES rather than steps on the way to the dialog, and each carries Back
 * only — there is nothing for a Next to mean on either. Every branch returns to
 * screen 1, where the other buttons are waiting, so `back` is named per screen
 * rather than being index-1 (see _showScreen's back-step case).
 *
 * `direction: 'west'` puts the card to the RIGHT of what it points at, which is
 * where the frames put it for the dialog and where the upload screen wants it.
 * Screen 2 reaches 'east' — see it.
 */
const SCREENS = [
  {
    // 142:34981, drawn exactly as the frame has it: no callout, no scrim, and
    // the three hero buttons live. `live` is what makes them controls (see
    // ./skeleton/index.js); `bare` is what stops a card being raised over a
    // frame that has none.
    //
    // A target is still named because the spotlight needs one to measure, and
    // the CTA is the thing the screen is about. With `bare` it is only
    // promoted, never ringed — nothing in spotlight/skin styles `.is-lit`.
    key: 'pane',
    pane: true,
    live: true,
    bare: true,
    target: 'fp-migrate',
    anchor: 'fp-migrate',
    direction: 'north',
    beak: 'start',
  },
  {
    // 142:35805. The dropdown is the subject, so it is what is lit — not the
    // button it hangs from, which would leave the menu itself in the scrim.
    //
    // 'east' reaches east, so the card sits to the menu's LEFT. The menu opens
    // at x436 of 1600 with the hero's copy to its left and nothing but pane to
    // its right — but 'west' would put the card over the empty middle of the
    // pane, and the frames keep this flow's callouts beside their subject.
    // East puts it against the hero copy the menu was opened from.
    //
    // BACK ONLY. This screen is the `+ New` branch off screen 1, not a step on
    // the way to the dialog: the dialog is what a DIFFERENT button opens. A
    // Next here would have to invent a transition the product does not make.
    key: 'menu',
    pane: true,
    menu: true,
    back_only: true,
    back: 'pane',
    target: 'fp-new-menu',
    anchor: 'fp-new-menu',
    direction: 'east',
    // Centred on the card's right edge, level with the middle of the dropdown.
    // Stated rather than left to tooltipBubble's default so the screen says
    // where its own tail goes — `start`/`end` are what the other placements in
    // this tour use, and an unstated beak reads as "nobody decided".
    beak: 'center',
    // The card is titled with the BUTTON it points at, not with the tour.
    // LOCALE.NEW is the label on that button (toolkit/files.js), so the two
    // cannot drift apart or disagree in translation.
    title: () => LOCALE.NEW,
    desc: () => LOCALE.TUTORIAL_MIGRATE_MENU_DESC,
  },
  {
    // The `Upload` branch off screen 1 — the third way files arrive, and the
    // one that is not an import at all.
    //
    // 'west' reaches west, so the card sits to the button's RIGHT, level with
    // it. The button is the last of the three, with empty pane to its right,
    // so there is room; 'east' would stack the card over the + New button and
    // the Migrate CTA it sits beside.
    //
    // Nothing is drawn open on the pane for this one. The real Upload opens the
    // OS file picker, which is not ours to mock — so the screen is the pane
    // with the button lit and the card beside it, which is as far as a mock can
    // honestly go.
    key: 'upload',
    pane: true,
    back_only: true,
    back: 'pane',
    target: 'fp-hero-upload',
    anchor: 'fp-hero-upload',
    direction: 'west',
    beak: 'center',
    // Same rule as the menu screen: the card carries the button's own label.
    title: () => LOCALE.UPLOAD,
    desc: () => LOCALE.TUTORIAL_MIGRATE_UPLOAD_DESC,
  },
  {
    // Back goes to the PANE, not to the screen before this one.
    //
    // Screen 2 is the `+ New` branch, and the only way into this screen is the
    // Migrate CTA on screen 1 — so unwinding to index-1 would land the user on
    // a dropdown they never opened. Both branches return to the fork.
    key: 'copy',
    back: 'pane',
    dialog: true,
    target: 'mg-dialog',
    anchor: 'mg-address',
    direction: 'west',
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_COPY_DESC,
  },
  {
    // The address has been copied; the link is still empty.
    key: 'paste',
    dialog: true,
    copied: true,
    target: 'mg-dialog',
    anchor: 'mg-link',
    direction: 'west',
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_PASTE_DESC,
  },
  {
    key: 'verify',
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
    this._maybeCelebrate();
  }

  /**
   * The confetti, over this tour's FIRST SCREEN.
   *
   * `celebrate` is set only when the workspace tour handed over — a workspace
   * was just made, opened, and confirmed on screen before this tour was raised
   * at all (see _chainMigrateTour in ../index.js). It arrives the way `subject`
   * does: fire()'s `opt` -> the broadcast -> the host -> a model attribute on
   * this step. So the same tour opened from the topbar's + New menu carries
   * nothing and throws nothing, which is right — there is no new workspace to
   * celebrate on an ordinary Tuesday.
   *
   * HERE rather than in _showScreen, and that is what keeps it a once. This
   * tour BRANCHES: screens 2 and 3 both name `back: 'pane'`, so screen 1 is
   * returned to rather than passed through, and a burst keyed on "the pane
   * screen is up" would fire again every time the user backed out of a branch.
   * onDomRefresh runs once per mount, and on a chained run entryScreen answers
   * 0 — so this IS "the first screen of the migrate tour", said once.
   */
  _maybeCelebrate() {
    if (!this.mget('celebrate')) return;
    require('../confetti').celebrate(this);
  }

  onPartReady(child, pn) {
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /** Where a named screen sits, so a jump does not hard-code an index. */
  _indexOf(key) {
    const i = SCREENS.findIndex((s) => s.key === key);
    return i < 0 ? 0 : i;
  }

  /** Jump straight to a named screen. */
  _goto(key) {
    this._screenIndex = this._indexOf(key);
    return this._showScreen();
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

    // `bare` raises the screen with NO card: focus() feeds the callout null and
    // returns, so nothing is drawn and nothing is left over from the previous
    // screen either. Deliberately null rather than an empty object — feed(null)
    // is a no-op in ui-core, which is why the spotlight calls clear() instead
    // (see the note on focus() in ../spotlight/index.js).
    //
    // NO `stepProgress` on any screen: this tour draws no pill. Without
    // `step`/`steps` the callout renders no header row at all.
    const tooltip = s.bare ? null : {
      title: s.title(),
      desc: s.desc(),
      // Back is live whenever a previous screen exists; hidden on screen 1 of
      // this tour standing alone, where back-step would reach the host with
      // nowhere to go. (Screen 1 is `bare` today, so this only matters if it
      // ever gains a card.)
      hide_back: !!this.mget('is_first') && this._screenIndex === 0,
      // The `+ New` branch offers Back and nothing else.
      hide_next: !!s.back_only,
      done: !s.back_only && isLastScreen(this, this._screenIndex, SCREENS.length),
    };

    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target.el,
      anchor: anchor && anchor.el,
      tooltip,
      direction: s.direction,
      beak: s.beak,
      // NO scrim on the two pane screens. 142:34981 and 142:35805 are drawn at
      // full strength — they are pictures of the product, and what marks the
      // subject on them is the callout's beak, not a dimmed surround. The
      // dialog screens keep the default: their frames hold the pane back
      // behind the card.
      //
      // Said per SCREEN rather than per tour, for the reason spotlight/index.js
      // gives on its `dim` param: a `[data-tour]` rule cannot give one flow two
      // answers, and it stops applying inside `full`, where the stamped id is
      // "full".
      dim: !s.pane,
      owner: this,
    });
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      // Screen 1's two hero buttons. They are the only controls that screen
      // has — the frame carries no callout — and each goes where its real
      // counterpart goes in the product: the CTA opens the import dialog, the
      // + New button opens the dropdown.
      //
      // Named jumps rather than `_screenIndex = 2`: inserting a screen ahead of
      // the dialog would otherwise silently send the CTA to the wrong one.
      case 'mg-open-dialog':
        return this._goto('copy');
      case 'mg-open-menu':
        return this._goto('menu');
      case 'mg-open-upload':
        return this._goto('upload');

      case 'next-step':
        // Only the last screen hands the tour back to tutorial_main, and it
        // NAMES the service. The step widget carries no `service` of its own
        // any more — see _buildWidgets in ../index.js.
        if (this._screenIndex >= SCREENS.length - 1) return this.triggerHandlers({ service: 'next-step' });
        this._screenIndex = this._screenIndex + 1;
        return this._showScreen();
      case 'back-step': {
        // A screen may name where Back goes, because this tour BRANCHES at
        // screen 1 and index-1 is then the wrong answer — see `back` on the
        // copy screen. Everything else unwinds linearly.
        const back = (SCREENS[this._screenIndex] || {}).back;
        if (back) return this._goto(back);
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
      }
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_migrate;
