const skeleton = require('./skeleton');
const { BLOCKS } = require('../skeleton/toolkit/workspace-dialog');
const { stepProgress, isLastScreen, entryScreen } = require('../tours');

// The type keys the dialog uses are the design's; the create service's are the
// product's, and they are not the same three words. One map, at the boundary.
const SERVICE_TYPE = { internal: 'team', external: 'share', personal: 'personal' };

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
// Card-edge to dialog-edge on the dialog screens, against the shared default of
// 32 (spotlight/index.js GAP). That default is an average taken across the
// import, share and chat frames, and it puts this card closer to the dialog
// than it wants to be — the dialog is the widest surface any tour lights, and
// the callout reads as stuck to it. 40 gives it room without letting the tail
// point at nothing: the beak juts 14px, so the tip still clears the dialog by
// only ~26.
//
// One number, here, because every screen of this step sits beside the same
// dialog. Screen 1 raises no callout at all, so it is unaffected.
const DIALOG_GAP = 40;

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

  // ── from here it is not a tour any more ────────────────────────────────────
  //
  // These two run ONLY on the post-signup pass — the host slices the table to
  // `screen_count`, and _screensFor drops them for a preview or for the full
  // tour (see ../index.js). Five screens of being shown the dialog, and then
  // the dialog.
  {
    // Every section at full strength, because there is no longer one being
    // taught: the user is filling it in.
    live: true,
    target: 'wsd-dialog',
    anchor: 'wsd-dialog',
    direction: 'west',
    text: () => LOCALE.TUTORIAL_WS_NOW_CREATE,
  },
  {
    // Its own sentence. It used to raise no callout at all, which — with
    // feed(null) being a no-op in ui-core — meant it inherited the create
    // screen's card and told the user to make a workspace they had just made.
    //
    // Except on the personal card, which says "You can't invite member to
    // personal workspace!" and needs nothing beside it saying otherwise. The
    // type is not known when this table is written, so the callout is dropped
    // in _showScreen where `_created` is.
    invite: true,
    target: 'inv-card',
    anchor: 'inv-card',
    direction: 'west',
    text: () => LOCALE.TUTORIAL_INVITE_CALLOUT,
  },
];

class __tutorial_workspace extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._screenIndex = 0;
    // Which type the live dialog has selected. Starts on the design's default,
    // and the five mock screens before it show the same one selected.
    this._type = 'internal';
  }

  /**
   * The screens this run actually has.
   *
   * The table holds all eight; `screen_count` is what the host worked out for
   * this run, and on a preview or inside the full tour that is six. Sliced
   * rather than branched on, so every `SCREENS.length` below keeps meaning
   * "the end of this run".
   */
  get _screens() {
    const n = ~~this.mget('screen_count') || SCREENS.length;
    return SCREENS.slice(0, Math.min(n, SCREENS.length));
  }

  async onDomRefresh() {
    // Re-entered via Back from a later step: resume where we left off.
    this._screenIndex = entryScreen(this, this._screens.length);
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
    const s = this._screens[this._screenIndex];
    if (!s) {
      this.warn(`Data not found for screen ${this._screenIndex}`);
      return;
    }
    // The name survives a re-render. Picking a type rebuilds this dialog, and
    // a rebuilt Entry is an empty one — so read what is in the field first and
    // hand it back through the composer.
    this._name = this._readName() || this._name || '';
    this.feed(skeleton(this, s, {
      selected: this._type,
      pending: !!this._pending,
      created: this._created,
      name: this._name,
    }));
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
    // A screen the user FILLS IN keeps its number and its Back, and loses only
    // Next: the form has Create and the invite card has Send and Skip, so a
    // Next beside either is a second way forward that skips what is being
    // asked for. Back is the one thing those screens do not offer themselves.
    const live = !!(s.live || s.invite);
    // The personal card is already a full sentence explaining itself, and a
    // callout beside it would be a second one. Only that variant: the invite
    // card has room for a caption and wants one.
    const mute = !!(s.invite && this._created && this._created.type === 'personal');
    const chrome = {
      hide_next: live,
      // Numbered like every other tour. The frames leave these callouts
      // uncounted, but a screen nobody can name is a screen nobody can report
      // — see the note on progressStyle in toolkit/tooltip.js.
      ...stepProgress(this, this._screenIndex),
      // No way back once the workspace exists. The create form would happily
      // make a second one with no sign the first happened, and the invite card
      // may already have sent an invitation — neither is somewhere to return
      // to.
      hide_back: (!!this.mget('is_first') && this._screenIndex === 0)
        || !!s.invite,
      // Done belongs to the last screen with a Next on it. The live tail has
      // its own controls, so it never wears one.
      done: !live && isLastScreen(this, this._screenIndex, this._screens.length),
    };
    // `bare` raises the screen with no tooltip at all: focus() feeds the
    // callout null and returns, so nothing is drawn and nothing is left over
    // from the previous screen either.
    const tooltip = s.bare || mute
      ? null
      : s.text
        ? { text: s.text(), ...chrome }
        : { title: s.title(), desc: s.desc(), ...chrome };
    this._raise({
      service: 'spotlight:focus',
      target: target.el,
      anchor: anchor && anchor.el,
      tooltip,
      direction: s.direction || 'west',
      beak: s.beak,
      gap: DIALOG_GAP,
      owner: this,
    });
  }

  // ── the live screens ───────────────────────────────────────────────────────

  /** Whatever the live dialog's name field currently holds. */
  _readName() {
    const entry = this.getPart && this.getPart('wsd-name-input');
    return String((entry && entry.getValue && entry.getValue()) || '').trim();
  }

  /** Show or clear the message under the name field. */
  _setNameError(msg) {
    const err = this.getPart && this.getPart('wsd-name-error');
    if (!err || !err.el) {
      if (msg) Wm.alert(msg);
      return;
    }
    if (_.isFunction(err.set)) err.set({ content: msg || '' });
    else err.el.textContent = msg || '';
    err.el.dataset.state = msg ? 1 : 0;
  }

  /** Show or clear the message under the invite field. */
  _setInviteError(msg) {
    const err = this.getPart && this.getPart('inv-error');
    if (!err || !err.el) return;
    if (_.isFunction(err.set)) err.set({ content: msg || '' });
    else err.el.textContent = msg || '';
    err.el.dataset.state = msg ? 1 : 0;
  }

  /**
   * Create the workspace.
   *
   * The create, the analytics row and the workspace:refresh broadcast are
   * libs/create-workspace's — the same code the desk's own create form runs, so
   * a workspace made here is indistinguishable from one made any other way.
   * What is this step's is the validation copy, where the error goes, and what
   * happens next.
   */
  async _create() {
    if (this._pending) return;
    const name = this._readName();
    this._name = name;
    this._setNameError(null);
    if (!name) {
      return this._setNameError(LOCALE.REQUIRE_THIS_FIELD || LOCALE.ENTER_A_NAME);
    }

    // Mark the button, DO NOT re-render. _showScreen() rebuilds the whole
    // dialog, which destroys the name Entry and takes the user's typed name
    // with it — so a failed create would hand back an empty form and ask them
    // to type it again. The attribute goes straight onto the node, the way the
    // invite button below does it.
    //
    // `_pending` is also the re-entrancy guard above: Create is the one control
    // in this tour that waits on the network, so it is the one that can be
    // pressed twice.
    const btn = this.getPart && this.getPart(BLOCKS.CREATE);
    const setPending = (on) => {
      this._pending = on ? 1 : 0;
      if (btn && btn.el) btn.el.dataset.pending = on ? 1 : 0;
    };
    setPending(true);

    const type = SERVICE_TYPE[this._type] || 'team';
    const res = await require('libs/create-workspace')
      .createWorkspace(this, type, name);

    setPending(false);
    if (!res.ok) {
      // The personal path reports its own failures before resolving.
      if (res.handled) return;
      const msg = res.quota
        ? (LOCALE.QUOTA_EXCEEDED || LOCALE.TRY_AGAIN)
        : (res.message || LOCALE.TRY_AGAIN);
      return this._setNameError(msg);
    }

    // Carried to the next screen, which needs the type to pick its card and the
    // hub_id to invite anyone to — and to the HOST, which is what opens it and
    // throws the confetti once the tour is done.
    this._created = { type, ...res.workspace };
    this._raise({ service: 'workspace-created', workspace: this._created });
    this._screenIndex = this._screenIndex + 1;
    return this._showScreen();
  }

  /**
   * Hand something to the host — from code, not from a click.
   *
   * NOT triggerHandlers. That is ui-core's CLICK dispatcher, and it carries the
   * click's gating: it returns without dispatching when `window.pointerDragged`
   * is set (letc/addons/letc.js), a flag the RESIZE handler raises
   * (letc/addons/dom/events-handler.js sets it before its own
   * `srcElement != window` guard, so any element's resize counts) and which
   * nothing clears but a pointerup or a keyup.
   *
   * Harmless for a raise made straight out of a click — the pointerup that
   * delivered the click has just cleared the flag. NOT harmless for a raise
   * made after an `await`, and both of this step's network calls end in one:
   * _create tells the host what it built, _invite hands the tour back. A resize
   * anywhere in that round trip sets the flag, nothing clears it before the
   * raise, and the raise is dropped in silence — the workspace exists on the
   * server, the host never hears about it, and the tour ends on a desk that
   * never opens it.
   *
   * So: dispatch the way ui-core dispatches, straight to the ui handlers,
   * without the click gate in front. Same signal, same (source, payload)
   * arguments, so the host's onUiEvent cannot tell the difference.
   *
   * @param {Object} payload `{ service, ...}` — what onUiEvent receives as args
   */
  _raise(payload) {
    const handlers = (this.getHandlers && this.getHandlers(_a.ui)) || [];
    for (const ui of handlers) {
      // ui-core skips the source itself; so must this, or a step that handles
      // its own service re-enters here.
      if (!ui || ui === this || !_.isFunction(ui.triggerMethod)) continue;
      ui.triggerMethod(_e.ui.event, this, payload);
    }
  }

  /**
   * Invite one person to the workspace that was just made.
   *
   * Same call and same guards as the members panel
   * (builtins/permission/restricted), because it is the same act — this screen
   * is just the first time it is offered.
   */
  async _invite() {
    if (this._pending) return;
    const entry = this.getPart && this.getPart('inv-email');
    const email = String((entry && entry.getValue && entry.getValue()) || '').trim();
    this._setInviteError(null);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return this._setInviteError(LOCALE.ENTER_VALID_EMAIL || LOCALE.INVALID_EMAIL);
    }
    const hub_id = this._created && this._created.hub_id;
    if (!hub_id) return this._advance();

    const btn = this.getPart && this.getPart('inv-send');
    if (btn && btn.el) btn.el.dataset.pending = 1;
    this._pending = 1;
    try {
      const res = await this.postService(SERVICE.hub.invite, {
        hub_id,
        invitees: [email],
        privilege: _K.privilege.write,
      });
      const r = (res && res.results && res.results[0]) || {};
      if ((res && (res.error || res.error_code)) || r.status === 'failed') {
        this._pending = 0;
        if (btn && btn.el) btn.el.dataset.pending = 0;
        return this._setInviteError(r.reason || (res && res.reason) || LOCALE.TRY_AGAIN);
      }
      // Flows that only observe the desk use this — the reward flow's Step 1
      // walkthrough skips its own invite step on it.
      RADIO_BROADCAST.trigger('invitation:sent', { hub_id });
    } catch (e) {
      this._pending = 0;
      if (btn && btn.el) btn.el.dataset.pending = 0;
      this.warn('invite failed', e);
      return this._setInviteError(LOCALE.TRY_AGAIN);
    }
    this._pending = 0;
    return this._advance();
  }

  /**
   * Move to the next screen, or hand the tour back when there is none.
   *
   * ONE way forward, and that is the point. There used to be two: the callout's
   * Next walked the screen list, while the live screens' own controls called an
   * `_endTour` that went straight to the host — so Send, Skip, Invite later and
   * the ✕ each ended the tour by their own route, and any screen added after
   * the invite card was unreachable.
   *
   * Every exit off the invite card — sent, skipped, closed, or the personal
   * card's "Invite later" — therefore lands on the same `next-step`, which is
   * what the tour ends on. The host takes it from there: it opens the workspace
   * that was made and throws the confetti over it (see _enterCreated in
   * ../index.js). Nothing else would — `workspace:refresh` is heard only by the
   * sidebar list and the activate-workspace flow, and neither navigates.
   */
  _advance() {
    if (this._screenIndex >= this._screens.length - 1) {
      return this._raise({ service: 'next-step' });
    }
    this._screenIndex = this._screenIndex + 1;
    return this._showScreen();
  }

  /** Is the screen on show one the user is filling in rather than watching? */
  isLive() {
    const s = this._screens[this._screenIndex];
    return !!(s && (s.live || s.invite));
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case 'wsd-select-type': {
        const key = (trigger.el && trigger.el.dataset && trigger.el.dataset.type)
          || trigger.mget(_a.type);
        if (!key || key === this._type) return;
        this._type = key;
        return this._showScreen();
      }

      case 'wsd-create':
        return this._create();

      case 'inv-send':
        return this._invite();

      case 'inv-skip':
        return this._advance();

      case 'next-step':
        // Through _advance, like every other way forward. Only the last screen
        // hands the tour back to tutorial_main, and it NAMES the service — the
        // step widget carries no `service` of its own (see _buildWidgets in
        // ../index.js).
        return this._advance();
      case 'back-step':
        // Back off the first screen leaves this step entirely.
        if (this._screenIndex <= 0) return this._raise({ service: 'back-step' });
        this._screenIndex = this._screenIndex - 1;
        return this._showScreen();
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __tutorial_workspace;
