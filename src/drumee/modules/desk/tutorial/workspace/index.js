const skeleton = require('./skeleton');
const { BLOCKS } = require('../skeleton/toolkit/workspace-dialog');
const { isLastScreen, entryScreen } = require('../tours');

// The type keys the dialog uses are the design's; the create service's are the
// product's, and they are not the same words. One map, at the boundary.
//
// `personal` stays in the map although the dialog no longer offers it: the map
// describes the whole boundary, and the service on the other side of it still
// takes that type.
const SERVICE_TYPE = { internal: 'team', external: 'share', personal: 'personal' };

/**
 * The `workspace` tour — five screens of the Create-new-workspace dialog
 * (Figma 176:40762 → 176:41391).
 *
 * 1.x pointed at three workspace TILES on the desk. A brand-new account, which
 * is exactly who this tour runs for, has no tiles — so 2.0 teaches the
 * workspace types where the user actually meets them, inside the dialog that
 * makes one. Personal is not among them: a new account is being set up to
 * collaborate, and the screen that taught that type went with the row.
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

const SCREENS = require('./screens');

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
    // Phone layout (host-kit layoutFor): the Figma mobile frames, built from
    // the same dialog and invite builders. `phone` is null at desk.
    const phone = this.mget('layout') === 'phone' ? s.phone : null;
    const state = {
      selected: this._type,
      pending: !!this._pending,
      created: this._created,
      name: this._name,
    };
    if (phone) return this._showPhone(s, phone, state);
    this.feed(skeleton(this, s, state));
    // Tell the host whether this screen is one the user fills in, so its Skip
    // control can stand down there (those screens carry their own exits).
    this.triggerHandlers({ service: 'step-live', live: this.isLive() });
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
    // THIS CHROME ONLY EVER REACHES THE DIALOG SCREENS NOW. Both live screens
    // are `bare`, so the tooltip below is null for them and none of these
    // flags is read. `live` is kept because the flags stay correct if one of
    // them is ever given a card again: a screen the user fills in has its own
    // way forward — Create on the form, Send and Skip on the invite card — so
    // a Next beside either would be a second one that skips what is asked for.
    const live = !!(s.live || s.invite);
    const chrome = {
      hide_next: live,
      // NO progress indicator on any screen of this tour. No `step`/`steps` are
      // passed, so tooltipBubble's `progress()` returns null on its `total < 2`
      // guard and the card draws no header row at all — not an empty band above
      // the copy.
      //
      // This is what the frames show: the create-workspace callouts are
      // uncounted, and the pill was ours. It briefly carried one on the argument
      // that a screen nobody can name is a screen nobody can report — true of a
      // long tour, and not worth a counter the design does not have on a flow
      // whose screens are each named by the block they point at ("Type your
      // workspace name here", the three type rows, Create).
      //
      // Other tours are untouched: `chat` asks for dashes, the rest take the
      // pill by default (see progressStyle in toolkit/tooltip.js).
      // No way back once the workspace exists — the create form would happily
      // make a second one with no sign the first happened, and the invite card
      // may already have sent an invitation. Moot while that screen is bare,
      // and kept for the same reason as `live` above.
      hide_back: (!!this.mget('is_first') && this._screenIndex === 0)
        || !!s.invite,
      // Done belongs to the last screen with a Next on it. The live tail has
      // its own controls, so it never wears one.
      done: !live && isLastScreen(this, this._screenIndex, this._screens.length),
    };
    // `bare` raises the screen with no tooltip at all: focus() feeds the
    // callout null and returns, so nothing is drawn and nothing is left over
    // from the previous screen either.
    //
    // THREE SCREENS OF THIS TOUR ARE BARE — the home screen it opens on, and
    // both of the live ones at the end. A per-variant `mute` for the personal
    // invite card used to sit beside this test; with the whole invite screen
    // bare it could never fire, so it is gone.
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
      gap: DIALOG_GAP,
      // No film, on every screen of this tour. 140:22684 and the
      // create-workspace frames after it are drawn at full strength: the flow
      // is a walk through a dialog the user is about to fill in, and the beak
      // is what points at the block being described.
      //
      // Said here rather than in the skin, which is where it used to live as
      // `.tutorial-main[data-tour="workspace"]`. A tour attribute could not
      // give the chat flow one undimmed screen out of five, and it stopped
      // applying inside `full`, where the stamped id is "full" — so the rule
      // moved onto the focus call and this is its other caller.
      // On a phone the frames DO dim (380:54800 on): the sheet's other rows
      // fade and the lit one stands out. The home hero is drawn plain.
      dim: false,
      owner: this,
    });
  }

  // ── the live screens ───────────────────────────────────────────────────────

  /** Whatever the live dialog's name field currently holds. */
  /**
   * Is this run allowed to create (the post-signup `workspace` tour)? Its
   * step carries the live tail; `full` and the in-window host drop it.
   */
  _canCreateHere() {
    return this._screens.length > 5;
  }

  /**
   * The phone layout — Figma "org home -> create wp", screen by screen.
   *
   * The frames teach and DO in the same sheet: the name screen's field takes
   * the name, and the create screen picks a type and creates. So on a run
   * that may create, those two are live and carry no buttons (the field and
   * Create are the way forward), and the desk's separate live form is
   * skipped. A run that may not create (`full`) keeps a Next on both, or it
   * would have no way forward at all.
   *
   * Dimming is the frames' own — an overlay and per-block opacities drawn by
   * the skeleton — so the spotlight is asked only for the callout.
   */
  async _showPhone(s, phone, state) {
    if (phone.skip) {
      this._screenIndex = Math.min(this._screenIndex + 1, this._screens.length - 1);
      if (this._screens[this._screenIndex] === s) return null;
      return this._showScreen();
    }
    const live = this._canCreateHere() && !!phone.live;
    this.feed(require('./skeleton/phone')(this, s, { ...state, live: this._canCreateHere() }));
    this.triggerHandlers({ service: 'step-live', live: this.isLive() });
    const target = await this.ensurePart(phone.target);
    if (this.isDestroyed && this.isDestroyed()) return null;
    if (live && phone.lit === 'name') this._bindPhoneName();

    const last = isLastScreen(this, this._screenIndex, this._screens.length);
    let tooltip = null;
    if (phone.lit === 'internal' || phone.lit === 'external') {
      // 385:938 / 385:1090 — title, line, one full-width Next.
      tooltip = { title: s.title(), desc: s.desc(), hide_back: true, done: last, align: 'center' };
    } else if (phone.lit === 'name' || phone.lit === 'create') {
      // 380:54800 / 385:1226 — one line and a full-width Next. On the live
      // create screen that Next creates (see onUiEvent): nothing follows this
      // screen without a workspace, so it never reads Done there.
      tooltip = { text: s.text(), hide_back: true, done: last && !live, align: 'center' };
    }
    this.triggerHandlers({
      service: 'spotlight:focus',
      target: target && target.el,
      anchor: target && target.el,
      tooltip,
      dim: false,
      // The frames' card is 396 on a 430 screen, its beak tip ~8px off the
      // block it names.
      phone_margin: 17,
      phone_gap: 26,
      phone_prefer: 'above',
      owner: this,
    });
    return null;
  }

  /** Is the phone's live create screen (385:1226) up? */
  _phoneLiveCreate() {
    const s = this._screens[this._screenIndex];
    const p = s && this.mget('layout') === 'phone' ? s.phone : null;
    return !!(p && p.live && p.lit === 'create' && this._canCreateHere());
  }

  /**
   * 380:54800: typing the name is the step, and its Next moves on too. Move on once the
   * field is committed with something in it (Enter, Go, or leaving it).
   */
  async _bindPhoneName() {
    const entry = await this.ensurePart('wsd-name-input');
    const input = entry && entry.el && entry.el.querySelector('input');
    if (!input || input.dataset.tourBound) return;
    input.dataset.tourBound = '1';
    input.addEventListener('change', () => {
      const v = String(input.value || '').trim();
      if (!v || this.isDestroyed()) return;
      this._name = v;
      this._advance();
    });
  }

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
    // On a phone the name was taken on an earlier screen (380:54800), so the
    // create screen has no field to read — fall back to what was typed there.
    const name = this._readName() || this._name || '';
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
    // hands on to the migrate tour once this one is done.
    this._created = { type, ...res.workspace };
    this.triggerHandlers({ service: 'workspace-created', workspace: this._created });
    this._screenIndex = this._screenIndex + 1;
    return this._showScreen();
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
   * that was made and hands the migrate tour to it (see _enterCreated in
   * ../index.js). Nothing else would — `workspace:refresh` is heard only by the
   * sidebar list and the activate-workspace flow, and neither navigates.
   */
  _advance() {
    if (this._screenIndex >= this._screens.length - 1) {
      return this.triggerHandlers({ service: 'next-step' });
    }
    this._screenIndex = this._screenIndex + 1;
    return this._showScreen();
  }

  /** Is the screen on show one the user is filling in rather than watching? */
  isLive() {
    const s = this._screens[this._screenIndex];
    if (!s) return false;
    if (s.live || s.invite) return true;
    // Phone: the create screen IS the real form on a run that may create.
    const p = this.mget('layout') === 'phone' ? s.phone : null;
    return !!(p && p.live && p.lit === 'create' && this._canCreateHere());
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
        // Phone, live create screen: the callout's Next is Create.
        if (this._phoneLiveCreate()) return this._create();
        // Through _advance, like every other way forward. Only the last screen
        // hands the tour back to tutorial_main, and it NAMES the service — the
        // step widget carries no `service` of its own (see _buildWidgets in
        // ../index.js).
        return this._advance();
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
