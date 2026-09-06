const skeleton = require('./skeleton');
// How long the dialog's exit is given before the next screen replaces it.
// Matches the 0.16s in ./skin.
const CLOSE_MS = 160;
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
    // The dropdown is drawn on this screen now, and its rows act. `+ New` and
    // `Upload` are no longer screens of their own — see the note above the
    // table.
    menu: true,
    live_menu: true,
    target: 'fp-migrate',
    anchor: 'fp-migrate',
    direction: 'north',
    beak: 'start',
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
    // Vertically the card tracks the row it is about; HORIZONTALLY it clears
    // the whole dialog. 176:47527 states both numbers: the dialog's right edge
    // at x1056 and the callout's left at x1090 — 34px clear of the PANEL.
    //
    // Anchoring the placement on the row measured the gap from the wrong edge.
    // Every row stops 28px short of the panel (the dialog's inset), so a 32px
    // gap from the row left the card 4px off the panel — all but touching it,
    // on all three screens.
    anchor_x: 'mg-dialog',
    direction: 'west',
    gap: 34,
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
    // Vertically the card tracks the row it is about; HORIZONTALLY it clears
    // the whole dialog. 176:47527 states both numbers: the dialog's right edge
    // at x1056 and the callout's left at x1090 — 34px clear of the PANEL.
    //
    // Anchoring the placement on the row measured the gap from the wrong edge.
    // Every row stops 28px short of the panel (the dialog's inset), so a 32px
    // gap from the row left the card 4px off the panel — all but touching it,
    // on all three screens.
    anchor_x: 'mg-dialog',
    direction: 'west',
    gap: 34,
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
    // Vertically the card tracks the row it is about; HORIZONTALLY it clears
    // the whole dialog. 176:47527 states both numbers: the dialog's right edge
    // at x1056 and the callout's left at x1090 — 34px clear of the PANEL.
    //
    // Anchoring the placement on the row measured the gap from the wrong edge.
    // Every row stops 28px short of the panel (the dialog's inset), so a 32px
    // gap from the row left the card 4px off the panel — all but touching it,
    // on all three screens.
    anchor_x: 'mg-dialog',
    direction: 'west',
    gap: 34,
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    // Its own line, not the paste screen's. This screen is reached with the
    // link already in the field, so "Paste the link" described a step the user
    // had just finished; the only thing left on it is the button.
    desc: () => LOCALE.TUTORIAL_MIGRATE_VERIFY_DESC,
  },
];

class __tutorial_migrate extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    // The destination card in ./skeleton/dialog is the REAL popup's block,
    // wearing the real popup's class names, so it needs the real popup's skin.
    // Nothing else here has loaded it: the widget it belongs to is lazy
    // (seeds.js migrate_gdrive_popup) and may never have been opened in this
    // session — which is the normal case for a user meeting this tour.
    require('builtins/widget/migrate-gdrive-popup/skin');
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

  /** Where a named screen sits, so a jump does not hard-code an index. */
  _indexOf(key) {
    const i = SCREENS.findIndex((s) => s.key === key);
    return i < 0 ? 0 : i;
  }

  /** Jump straight to a named screen. */
  _goto(key) {
    return this._transition(this._indexOf(key));
  }

  /**
   * Move to a screen, letting the dialog leave before the pane comes back.
   *
   * EVERY SCREEN CHANGE REBUILDS THE BODY (`feed` in _showScreen), so a screen
   * that no longer draws the dialog simply does not emit it and the card is
   * gone between two frames. Marking it and deferring is what gives the exit
   * something to play in — the same idiom, and the same 160ms, as the folder
   * window's create dialog.
   *
   * A TIMER, NOT `animationend`: reduced motion disables the animation, and
   * that event would then never fire — Back would stop working entirely for
   * anyone who asked for less motion.
   *
   * Only dialog → no-dialog defers. Between two dialog screens the card stays
   * up and must not flicker, and pane → dialog is the entrance, which the
   * screen's own `enter` flag plays.
   *
   * @param {Number} index into SCREENS
   */
  _transition(index) {
    const next = SCREENS[index] || {};
    if (this._dialogUp && !next.dialog) {
      const part = this.getPart && this.getPart('mg-dialog');
      const card = (part && part.el)
        || (this.el && this.el.querySelector(`.${this.fig.family}__dialog`));
      if (card && card.dataset && !card.dataset.closing) {
        card.dataset.closing = '1';
        _.delay(() => {
          if (this.isDestroyed && this.isDestroyed()) return;
          this._screenIndex = index;
          this._showScreen();
        }, CLOSE_MS);
        return;
      }
    }
    this._screenIndex = index;
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
    // The dialog animates in only when it ARRIVES. Every screen change rebuilds
    // the body, so an entrance that played on render would re-pop the card on
    // each of the three dialog screens — read as a flicker, not a transition.
    const enter = !!s.dialog && !this._dialogUp;
    this._dialogUp = !!s.dialog;
    this.feed(skeleton(this, s, { menuOpen: !!this._menuOpen, enter }));
    const [target, anchor, anchor_x] = await Promise.all([
      this.ensurePart(s.target),
      this.ensurePart(s.anchor),
      s.anchor_x ? this.ensurePart(s.anchor_x) : null,
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
      // Clears the DIALOG, points at the ROW. See the SCREENS entries.
      anchor_x: anchor_x && anchor_x.el,
      tooltip,
      direction: s.direction,
      beak: s.beak,
      gap: s.gap,
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

  /**
   * Hand the user the REAL import dialog as the tour lets go.
   *
   * Every screen up to here has been a drawing. Ending on one leaves the user
   * looking at a picture of a form they were just taught to fill in, with the
   * actual one still three clicks away in a menu the tour spent its first
   * screen showing them. So Done opens it.
   *
   * ORDER MATTERS, and it is why this runs BEFORE `next-step` rather than
   * after. The folder window's own `launch-gdrive-migration` defers through
   * Tours.whenDone("migrate", ...), which only queues while the tour is still
   * claimed — raised after the hand-back, it would find the tour already gone
   * and open the popup underneath one still fading out. Raised here, the launch
   * is queued against this tour's own release and runs the moment it is down.
   *
   * ONLY WHEN THIS SCREEN REALLY ENDS THE TOUR. The same button reads "Next"
   * when migrate is a step inside `full`, where it hands over to the tour after
   * it and opening a dialog would interrupt the run. `isLastScreen` is the same
   * test that decides the wording, so the two can never disagree.
   *
   * Raised at the host, like the create and upload rows: the step does not know
   * which window it is drawn over, and the popup's destination is read off that
   * window. With no host window — the desk-level `full` run — `_actOnWindow`
   * declines and the tour simply ends, which is what it did before.
   */
  _openTheRealThing() {
    if (!isLastScreen(this, this._screenIndex, SCREENS.length)) return;
    this.triggerHandlers({
      service: 'window-tutorial:act',
      action: 'launch-gdrive-migration',
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

      // `+ New` and `Upload` are REAL now. They used to jump to a screen each
      // that drew the gesture and described it; they perform it instead, at the
      // folder window this tour is laid over.
      //
      // Raised at the host rather than handled here: the step has no idea which
      // window it is drawn on — that is the host's `target_window` — and it is
      // deliberately kept that way, because a step that knows its host is a step
      // that only works in one.
      case 'mg-toggle-menu':
        this._menuOpen = !this._menuOpen;
        return this._showScreen();

      case 'mg-do-create': {
        const el = trigger && trigger.el;
        const action = el && el.dataset && el.dataset.service;
        if (!action) return;
        // THE ROW ITSELF is forwarded as the trigger, not this widget. The
        // product's handler reads the file name off the thing that was clicked
        // (`cmd.mget(_a.name)` in window/core.js newDocument), so handing it
        // anything else creates a document with no template name and it refuses.
        return this.triggerHandlers({ service: 'window-tutorial:act', action, cmd: trigger });
      }

      case 'mg-do-upload':
        return this.triggerHandlers({
          service: 'window-tutorial:act',
          action: _e.upload,
          cmd: trigger,
        });

      case 'next-step':
        // Only the last screen hands the tour back to tutorial_main, and it
        // NAMES the service. The step widget carries no `service` of its own
        // any more — see _buildWidgets in ../index.js.
        if (this._screenIndex >= SCREENS.length - 1) {
          this._openTheRealThing();
          return this.triggerHandlers({ service: 'next-step' });
        }
        return this._transition(this._screenIndex + 1);
      case 'back-step': {
        // A screen may name where Back goes, because this tour BRANCHES at
        // screen 1 and index-1 is then the wrong answer — see `back` on the
        // copy screen. Everything else unwinds linearly.
        const back = (SCREENS[this._screenIndex] || {}).back;
        if (back) return this._goto(back);
        if (this._screenIndex <= 0) return this.triggerHandlers({ service: 'back-step' });
        return this._transition(this._screenIndex - 1);
      }
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_migrate;
