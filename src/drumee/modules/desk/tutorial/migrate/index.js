const skeleton = require('./skeleton');
const liveSkeleton = require('./skeleton/live');
// How long the dialog's exit is given before the next screen replaces it.
// Matches the 0.16s in ./skin.
const CLOSE_MS = 160;
const { isLastScreen, entryScreen } = require('../tours');

/**
 * The `migrate` tour — importing from Google Drive, four screens.
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
 *
 * AFTER DONE, IN A WINDOW, THE CARD GOES LIVE (goLive, ./skeleton/live.js):
 * the same dialog becomes the real share-to-SA import — the popup is no longer
 * opened at the end of the tour.
 */
const SCREENS = require('./screens');

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
    // Live, the dialog on screen is the real import, not a walkthrough screen.
    // A re-render (a rotation: layout.js relayoutStep) redraws THAT, keeping
    // the pasted link; drawing the mock here would strand the user over a
    // dead copy of the dialog.
    if (this._live) {
      this._readLiveLink();
      return this._renderLive(this._sa.snapshot());
    }
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
    // Phone layout (host-kit layoutFor): the Figma mobile frames. `phone` is
    // null at desk. With the + menu open the menu is what is lit, uncarded,
    // as in 385:55247.
    const phone = this.mget('layout') === 'phone' ? s.phone : null;
    if (phone) return this._showPhone(s, phone);
    const menuOpen = this._menuOpen || null;
    const state = { menuOpen, enter };
    this.feed(skeleton(this, s, state));
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
   * The phone layout — Figma 385:55398 / 386:55610 / 386:55759, the import
   * sheet walked in three steps. The blank workspace before them is not a
   * step here (`skip`).
   *
   * The LAST step, on a host that can do it for real (live_capable — the
   * folder-window host), is not a lesson: the host goes live at once (its
   * _goLive applies the same gates as the product, clears the spotlight and
   * hands this step goLive), and the sheet becomes the real import, plain.
   * Elsewhere (a desk preview, `full`) it teaches with a Done.
   */
  async _showPhone(s, phone) {
    if (phone.skip) {
      this._screenIndex = Math.min(this._screenIndex + 1, SCREENS.length - 1);
      return this._showScreen();
    }
    const last = isLastScreen(this, this._screenIndex, SCREENS.length);
    if (phone.live && last && this.mget('live_capable')) {
      return this.triggerHandlers({ service: 'window-tutorial:go-live' });
    }
    this.feed(require('./skeleton/phone')(this, s));
    const target = await this.ensurePart(phone.target);
    if (this.isDestroyed && this.isDestroyed()) return null;
    // Back nowhere: the first step a phone shows, when the tour starts here.
    const firstShown = SCREENS.slice(0, this._screenIndex).every((x) => x.phone && x.phone.skip);
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target && target.el,
      anchor: target && target.el,
      tooltip: {
        title: s.title(),
        // The frames' line for the last step is the button's own label.
        desc: phone.lit === 'verify' ? LOCALE.MIGRATE_PHONE_VERIFY_IMPORT : s.desc(),
        hide_back: !!this.mget('is_first') && firstShown,
        done: last,
        align: 'center',
      },
      // The skeleton draws the frames' overlay and fading itself.
      dim: false,
      phone_margin: 17,
      phone_gap: 26,
      phone_prefer: phone.prefer,
      owner: this,
    });
    return null;
  }

  /**
   * Become the real import, over the window the tour was about.
   *
   * Called by the host once it has decided this may happen (over-limit, write
   * permission, a destination). From here the step renders the controller's
   * snapshot and nothing of the mock.
   *
   * @param {Object} dest {hub_id, nid, name, area, filetype}
   */
  goLive(dest) {
    if (this._live) return;
    this._live = { dest, link: '' };
    const { createSaImport } = require('libs/gdrive-sa-import');
    this._sa = createSaImport({
      service: this,
      hub_id: dest.hub_id,
      nid: dest.nid,
      direct: 1,
      onChange: (snap) => this._renderLive(snap),
      onFinished: () => this._toHost('window-tutorial:refresh-target'),
    });
    this._installLiveCancel();
    return this._sa.load();
  }

  /**
   * Talk to the host WITHOUT triggerHandlers.
   *
   * Everything that calls this runs after a network round trip (get_state,
   * a poll). triggerHandlers is ui-core's click dispatcher and silently drops
   * the event while `window.pointerDragged` is set — which a resize raises and
   * only a pointerup/keyup clears — so an async raise can vanish.
   */
  _toHost(service, args = {}) {
    const h = this.mget('uiHandler');
    const host = Array.isArray(h) ? h[0] : h;
    if (host && _.isFunction(host.onUiEvent)) host.onUiEvent(this, { service, ...args });
  }

  _renderLive(snap) {
    if (this.isDestroyed && this.isDestroyed()) return;
    // No key for share-to-SA on this server: the popup can still fall back to
    // OAuth, this card cannot.
    if (snap.state === 'unavailable') return this._toHost('window-tutorial:fallback-popup');
    if (this.mget('layout') === 'phone') {
      this.feed(require('./skeleton/phone').live(this, snap, this._live.dest, { link: this._live.link }));
    } else {
      this.feed(liveSkeleton(this, snap, this._live.dest, { link: this._live.link }));
    }
    // Each render brings a new fill: run it from where the last one stood.
    if (this.el && this.fig) {
      this._barMemo = this._barMemo || {};
      require('libs/progress-fill').animateFill(this.el, `.${this.fig.family}__live-fill`, this._barMemo);
    }
  }

  /** What the link field holds now, remembered so a re-render keeps it. */
  _readLiveLink() {
    const entry = this.getPart && this.getPart('mg-live-link');
    let v = entry && _.isFunction(entry.getValue) ? entry.getValue() : null;
    if (v == null && this.el) {
      const input = this.el.querySelector(`.${this.fig.family}__live-input input`);
      v = input ? input.value : '';
    }
    this._live.link = String(v || '').trim();
    return this._live.link;
  }

  _liveCopy(trigger) {
    const email = (this._sa.snapshot() || {}).saEmail || '';
    try { navigator.clipboard.writeText(email); } catch (e) { /* http context */ }
    const el = trigger && trigger.el;
    if (!el || !el.dataset) return;
    el.dataset.done = '1';
    clearTimeout(this._copyTimer);
    this._copyTimer = setTimeout(() => {
      if (el.isConnected) el.dataset.done = '0';
    }, 1800);
  }

  /**
   * Cancel on pointerup, not click: the 2s re-feed can replace the button
   * between mousedown and mouseup, and a click needs both on one element.
   */
  _installLiveCancel() {
    if (this._cancelDelegate || !this.el) return;
    this._cancelDelegate = (e) => {
      const btn = e.target && e.target.closest
        && e.target.closest(`.${this.fig.family}__live-cancel`);
      if (!btn || (btn.dataset && btn.dataset.disabled)) return;
      e.stopPropagation();
      if (this._sa) this._sa.cancel();
    };
    this.el.addEventListener('pointerup', this._cancelDelegate, true);
  }

  _onLiveEvent(service, trigger, args = {}) {
    switch (service) {
      case 'mg-live-copy':
        return this._liveCopy(trigger);
      case 'mg-live-verify':
        // ONLY a commit (Enter) means "check it". The field raises this same
        // service on Escape (__inputStatus 'cancel') and — because ui-core
        // puts el.onclick on every active widget — on the click that focuses
        // it, with no __inputStatus at all. Verifying on that click showed the
        // bad-link error and re-rendered the card, destroying the field under
        // the cursor so nothing could be pasted.
        if (args.__inputStatus !== _a.commit) return;
        return this._sa.verify(this._readLiveLink());
      case 'mg-live-start':
        return this._sa.start(this._readLiveLink());
      case 'mg-live-again':
        this._sa.ack();
        this._live.link = '';
        return this._sa.reset();
      case 'mg-live-close':
        // A result the user has now seen: say so, or the popup replays it on
        // its next open. A no-op unless the job has finished.
        this._sa.ack();
        return this._toHost('window-tutorial:close-live');
      default:
        // The drawing's services mean nothing any more.
        return;
    }
  }

  onBeforeDestroy() {
    // Stops watching; the job itself carries on server-side, and the popup's
    // "show a finished result once" reports it next time.
    if (this._sa) this._sa.dispose();
    clearTimeout(this._copyTimer);
    if (this._cancelDelegate && this.el) {
      this.el.removeEventListener('pointerup', this._cancelDelegate, true);
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    // After Done the card is the real import, and the drawing's controls are
    // gone with the drawing — see goLive.
    if (this._live) return this._onLiveEvent(service, trigger, args);
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
      // BOTH `+ New` buttons raise this — the toolbar's and the hero's. They
      // are one control in the product, so they are one service here, and the
      // click says which of the two it was on `data-menu`.
      //
      // The key rather than a flag: the dropdown is a CHILD of the button it
      // hangs off (see the positioning note in skin/files.scss), so drawing it
      // open without knowing which button was pressed puts it under the other
      // one. Pressing the button that already has it closes it; pressing the
      // other MOVES it, which is what a single menu with two triggers does.
      case 'mg-toggle-menu': {
        const el = trigger && trigger.el;
        const at = (el && el.dataset && el.dataset.menu) || 'hero';
        this._menuOpen = this._menuOpen === at ? null : at;
        return this._showScreen();
      }

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
        // Only the last screen hands the tour back, and it NAMES the service.
        if (this._screenIndex >= SCREENS.length - 1) {
          // In a window, Done turns this card into the real import instead of
          // handing the user a popup copy of it (the host decides whether it
          // may — see builtins/window/tutorial, _goLive). On the desk host,
          // and inside `full`, there is no window to import into, so the tour
          // simply goes on or ends as it always did.
          if (this.mget('live_capable') && isLastScreen(this, this._screenIndex, SCREENS.length)) {
            return this.triggerHandlers({ service: 'window-tutorial:go-live' });
          }
          return this.triggerHandlers({ service: 'next-step' });
        }
        return this._transition(this._screenIndex + 1);
      case 'back-step': {
        // A screen may name where Back goes, because this tour BRANCHES at
        // screen 1 and index-1 is then the wrong answer — see `back` on the
        // copy screen. Everything else unwinds linearly.
        // Phone: the screen before is not a step there (`skip`), so Back off
        // the first phone step leaves the tour's step, like screen 1 does.
        if (this.mget('layout') === 'phone') {
          let i = this._screenIndex - 1;
          while (i >= 0 && SCREENS[i].phone && SCREENS[i].phone.skip) i--;
          if (i < 0) return this.triggerHandlers({ service: 'back-step' });
          return this._transition(i);
        }
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
