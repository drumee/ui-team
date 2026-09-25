const { roleByValue, roleFromPrivilege } = require("../../../builtins/skeleton/toolkit");
const { attachEmailLookup, fillEntry } = require("libs/contact-lookup");
const { membersFor } = require("libs/members-prefetch");
const { isSeatLimitReply, seatLimitMessage } = require("libs/billing");

// Wm's inbound-websocket bus. Same name and same channel window/utils.js and
// modules/desk use; wm/push.js re-emits every push it does not itself consume
// onto it, carrying the service in `options.service`.
const WS_EVENT = "ws:event";

/**
 * Workspace-members panel (private/team workspaces).
 *
 * Its Invite and Permissions-Matrix sections are the folder Settings panel's
 * two sections rebuilt under this widget's prefix — see skeleton/index.js. That
 * means this panel now owns the member list itself (hub.get_members_by_type)
 * and renders the rows, where it used to hand the job to a List.Smart of
 * `settings_member` widgets whose row shape is a different design.
 */
class __permission_restricted extends DrumeeMFS {
  /**
   * @param {Object} opt
   */
  initialize(opt = {}) {
    opt.dataset = { ...opt.dataset, position: "0" };

    require("./skin");
    super.initialize(opt);
    // Column mode: a view of the folder window's split body (the rail's Access,
    // see window/folder/access-column), not a drawer; the skins key the layout
    // on data-mode. Written to the element, NOT into opt.dataset: this widget is
    // always fed as a kid, so its model is the descriptor its parent built, and
    // ui-core's View.initialize only makes a model from `opt` when there is
    // none — an opt.dataset edit here never reaches onRender's data-* stamp.
    // That is how the panel came up in column mode drawn as the 360px drawer.
    if (this.mget("mode") === "column") this.el.dataset.mode = "column";
    this.declareHandlers();
    // Pending-invite role, same default as the base panel's invite row.
    this._inviteRole = roleByValue("edit");
    this._members = [];
    this._membersLoaded = false;
    // Addresses already committed as chips, waiting to be sent together. State
    // rather than DOM for the same reason _inviteNotice is: the skeleton is
    // re-fed on every member push, and chips read off the DOM would be lost
    // exactly when an admin is halfway through entering a list.
    this._inviteChips = [];
    // Invitations this workspace is waiting on (hub.invitations). Null until
    // the first read answers, which is how the skeleton tells "not fetched
    // yet" from "none" — an empty section and a missing one look different.
    this._invitations = null;
    // The inline message under the invite field, as STATE rather than a DOM
    // write alone: _loadMembers re-feeds the whole skeleton, and the
    // hub.member_joined push lands within a second of a successful invite —
    // an imperative-only notice would be wiped by its own success.
    this._inviteNotice = null;
    // The members search query. State, like the chips: the skeleton is re-fed
    // on every member push and draws the field and the filter from this.
    this._memberQuery = "";
    // The members role filter: "all" or a role value (view/chat/edit/admin).
    this._memberRole = "all";
    // Registered BEFORE the `opt.media` early return below: this panel is fed
    // without a media from the creation flow (media/form) and from Wm's own
    // wrapper-modal, and the matrix has to stay live in those too.
    this._onWsEvent = this._onWsEvent.bind(this);
    Wm.on(WS_EVENT, this._onWsEvent);
    let m = opt.media;
    if (!m) return;
    this.media = m;
    this.copyPropertiesFrom(m);
  }

  /**
   * Upon DOM refresh, after element actually inserted into DOM
   */
  onDomRefresh() {
    this._render();
    // Typing in the invite field also searches the address book by email —
    // matches land in the "invite-suggestions" part (libs/contact-lookup).
    attachEmailLookup(this, {
      entryClass: `${this.fig.family}__invite-entry`,
      listPart: "invite-suggestions",
      service: "pick-invite-contact",
      itemClass: `${this.fig.family}__invite-suggestion`,
    });
    this._installChipInput();
    this._installMemberSearch();
    this._loadMembers();
    // Not awaited and not gated on anything: the card draws without it and
    // fills the chip in when the answer lands.
    this._loadSpaceUsage();
  }

  /**
   * Turn the single-address field into a chip field: several people, one send.
   *
   * 🚨 DELEGATED ON THE WIDGET ROOT AND INSTALLED ONCE, exactly like
   * attachEmailLookup and for the same reason — _render() re-feeds the whole
   * skeleton on every member push, so a listener bound to the input element
   * itself would be thrown away a second after a successful invite, silently
   * turning the field back into a single-address one.
   *
   * SEPARATORS ARE HANDLED ON `input`, NOT ON keydown, so one rule covers both
   * typing a comma and PASTING "a@x.com, b@y.com" — a paste fires input and
   * never fires a keydown per character. Enter and Backspace are genuinely
   * keys and stay on keydown.
   *
   * The server has accepted an array since before this panel existed
   * (hub.invite loops over `invitees`), and the rail's Invite popup already
   * sends several. This is the panel catching up, not a new server contract.
   */
  _installChipInput() {
    if (this._chipInputInstalled) return;
    this._chipInputInstalled = 1;
    const cls = `${this.fig.family}__invite-entry`;
    const isInput = (t) =>
      t && t.matches && t.matches("input") && t.closest(`.${cls}`);

    this.el.addEventListener("input", (e) => {
      if (!isInput(e.target)) return;
      // Only when a separator is actually present: every other keystroke has
      // to fall through untouched or the address-book lookup never sees a
      // string long enough to search on.
      if (!/[,;]/.test(e.target.value)) return;
      this._commitChips(e.target.value, { keepTail: true });
    });

    this.el.addEventListener("keydown", (e) => {
      if (!isInput(e.target)) return;
      if (e.key === "Enter") {
        // preventDefault, or the Entry's own commit handling (and any form
        // wrapping it) also reacts and the address is consumed twice.
        e.preventDefault();
        this._commitChips(e.target.value);
        return;
      }
      // Backspace on an EMPTY field takes back the previous chip — the
      // convention every chip field has, and the only way to correct the one
      // you just entered without reaching for the mouse.
      if (e.key === "Backspace" && !e.target.value && (this._inviteChips || []).length) {
        e.preventDefault();
        this._inviteChips.pop();
        this._setInviteError();
        this._render();
      }
    });
  }

  /**
   * The Members search field filters the rows as you type.
   *
   * Delegated on the widget root and installed once, for the reason
   * _installChipInput gives: _render() re-feeds the whole skeleton on every
   * member push, and a listener on the input itself would go with it.
   *
   * Each keystroke re-feeds only the `members-list` part (_filterMembers), not
   * the panel — that would rebuild the search field under the caret. Escape
   * clears the query.
   */
  _installMemberSearch() {
    if (this._memberSearchInstalled) return;
    this._memberSearchInstalled = 1;
    const cls = `${this.fig.family}__member-search-entry`;
    const isSearch = (t) =>
      t && t.matches && t.matches("input") && t.closest(`.${cls}`);

    this.el.addEventListener("input", (e) => {
      if (!isSearch(e.target)) return;
      this._filterMembers(e.target.value);
    });

    this.el.addEventListener("keydown", (e) => {
      if (!isSearch(e.target) || e.key !== "Escape" || !e.target.value) return;
      // Stop here, or the Escape also reaches whatever closes the panel.
      e.preventDefault();
      e.stopPropagation();
      e.target.value = "";
      this._filterMembers("");
    });
  }

  /** Apply a search query to the member rows, repainting only the list. */
  _filterMembers(query) {
    const next = String(query || "");
    if (next === this._memberQuery) return;
    this._memberQuery = next;
    this._repaintMembersList();
  }

  _repaintMembersList() {
    const list = this.getPart?.("members-list");
    if (!list || !_.isFunction(list.feed)) return this._render();
    list.feed(require("./skeleton").membersList(this));
  }

  /**
   * Role filter pick. Same shape as _selectInviteRole, for the same reason:
   * NOT a full re-feed — that would rebuild the still-open menu mid-click —
   * so the pill's label is set in place, the menu closed explicitly, and only
   * the member rows re-fed.
   */
  _filterMembersByRole(cmd) {
    const value = cmd?.el?.dataset?.role_value || "all";
    const item = require("./skeleton").roleFilterItem(value);
    const label = this.el?.querySelector(
      `.${this.fig.family}__role-filter .${this.fig.family}__role-label .note-content`,
    );
    if (label) label.textContent = item.label;
    const menu = cmd.getParentByKind?.(KIND.menu.topic);
    if (menu?.changeState) menu.changeState(0);
    if (item.value === this._memberRole) return;
    this._memberRole = item.value;
    this._repaintMembersList();
  }

  /**
   * Take what is typed and turn the complete addresses in it into chips.
   *
   * @param {String} raw   the field's current value
   * @param {Object} [opt]
   * @param {Boolean} [opt.keepTail] leave the last fragment in the field. True
   *   while TYPING a list — "a@x.com, b@" must keep "b@" so the user can go on
   *   typing it — and false on Enter, where the whole value is meant.
   * @returns {Boolean} whether everything offered was accepted
   */
  _commitChips(raw, { keepTail = false } = {}) {
    const parts = String(raw || "").split(/[,;]+/);
    const tail = keepTail ? parts.pop() : "";
    let ok = true;
    let firstBad = "";
    for (const part of parts) {
      const email = String(part || "").trim();
      if (!email) continue;
      if (!email.isEmail()) {
        ok = false;
        if (!firstBad) firstBad = email;
        continue;
      }
      if (this._emailIsMember(email)) {
        ok = false;
        if (!firstBad) firstBad = email;
        this._setInviteError(
          LOCALE.MEMBER_ALREADY_HAS_ACCESS
          || "This email already has access to this folder.",
        );
        continue;
      }
      this._addInviteChip(email);
    }
    if (firstBad && !this._inviteNotice) {
      this._setInviteError(LOCALE.ENTER_VALID_EMAIL || LOCALE.INVALID_EMAIL);
    }
    if (ok && !firstBad) this._setInviteError();
    // A rejected address stays in the field so it can be corrected rather than
    // silently dropped; accepted ones have become chips and must not also be
    // left behind as text.
    const remainder = [firstBad, String(tail || "").trim()]
      .filter(Boolean)
      .join(", ");
    this._closeEmailLookup?.();
    this._render();
    this.ensurePart("invite-email").then((p) => fillEntry(p, remainder));
    return ok;
  }

  /** Add one address, case-folded against the chips already there so the same
   *  person cannot be invited twice in one send. */
  _addInviteChip(email) {
    if (!this._inviteChips) this._inviteChips = [];
    const key = String(email).trim().toLowerCase();
    if (this._inviteChips.some((e) => e.toLowerCase() === key)) return;
    this._inviteChips.push(String(email).trim());
  }

  /**
   * Repaint the panel.
   *
   * Carries the half-typed address across the feed. The matrix repaints on the
   * server's `hub.member_joined` push, and that lands a second or two after a
   * successful invite — precisely when an admin adding two people in a row is
   * already typing the second address into a field this would otherwise
   * recreate empty. `_inviteNotice` survives for the same reason, by being
   * read from state in the skeleton.
   *
   * Restored through fillEntry, so the input's model value is updated too and
   * `_getInviteEmail` cannot disagree with what is on screen. It refocuses the
   * field, which is correct here: a draft exists only because the user was
   * typing in it. With no draft nothing is touched and focus stays put.
   */
  _render() {
    const draft = this._inviteDraft();
    // A member push can land while someone is typing a search. The query
    // survives as state (the skeleton draws the value from it); the focus and
    // caret are put back here so the next keystroke still goes to the field.
    const active = document.activeElement;
    const searching = !!(
      active
      && active.closest
      && active.closest(`.${this.fig.family}__member-search-entry`)
    );
    // The matrix has already faded in once: this feed must not fade it in
    // again. feed() rebuilds __main, and a freshly created element replays its
    // CSS animation, so every refresh — members landing, the storage chip, the
    // invitations, each member push — blinked the whole panel to transparent
    // and back (reported by Lexis on opening Access). Set BEFORE the feed so
    // the new __main never picks the animation up (see the skin).
    if (this.el?.dataset?.position === "1") this.el.dataset.settled = "1";
    this.feed(require("./skeleton")(this));
    if (draft) {
      this.ensurePart("invite-email").then((p) => fillEntry(p, draft));
    } else if (searching) {
      this.ensurePart("member-search").then((p) => {
        const input = p?.el?.querySelector?.("input");
        if (!input) return;
        input.focus();
        const end = input.value.length;
        input.setSelectionRange?.(end, end);
      });
    }
  }

  /** What is currently typed in the invite field, "" when there is nothing
   *  (or no field at all — a non-admin viewer gets no invite section). */
  _inviteDraft() {
    const input = this.getPart?.("invite-email")?.el?.querySelector?.("input");
    return String(input?.value || "").trim();
  }

  /**
   * Workspace-scoped membership, the same call and the same `type: "all"` the
   * list used to make on this panel's behalf. The panel slides in once it
   * settles — success or not, so a failed fetch shows the empty matrix rather
   * than a panel that never arrives.
   *
   * Also the live refresh (_onWsEvent), which is why a failure no longer
   * clears `_members`: on the FIRST call the list is `[]` anyway, so the
   * empty-matrix behaviour above is unchanged, but a network blip during a
   * refresh must not wipe a matrix that is currently correct.
   */
  async _loadMembers() {
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) {
      this._membersLoaded = true;
      return this._reveal();
    }
    // Refetches are push-driven now (_onWsEvent), and pushes can land back to
    // back — a role change, then a removal — with their answers arriving out
    // of order. Only the newest request may paint.
    const seq = (this._membersSeq = (this._membersSeq || 0) + 1);
    let rows;
    let failed = false;
    try {
      // Whatever the click already started, else a read of our own — the
      // request and the cache-buster are the same either way
      // (libs/members-prefetch). On the first open the answer is usually
      // already on its way: pressing Access starts it while this panel's own
      // chunk is still downloading.
      rows = await membersFor(this, hub_id);
    } catch (e) {
      failed = true;
      this.warn("Failed to load workspace members", e);
    }
    if (seq !== this._membersSeq) return;
    if (!failed) this._members = Array.isArray(rows) ? rows : [];
    this._membersLoaded = true;
    this._render();
    this._reveal();
    // AFTER the render, because that is what publishes `_isAdmin` — the gate
    // _loadInvitations checks. Not awaited: the matrix is already on screen and
    // the invitations section fills in behind it rather than holding it back.
    this._loadInvitations();
  }

  /**
   * How much this workspace occupies, for the card's storage chip.
   *
   * 🚨 hub.show_privilege, NOT hub.get_space_usage. The obvious candidate
   * answers {total, selected, others, free} and `selected` would be exactly
   * this workspace's share — but it returns NOTHING on a live endpoint
   * (measured on drumee.in: undefined, no error), and it has no other caller
   * in the UI, so nothing was keeping it honest. show_privilege is called on
   * every panel that shows a matrix and carries `filesize`, the sum over this
   * hub's media — the same figure, from a path that is exercised.
   *
   * Reported as a STRING by the driver, hence the Number() below.
   *
   * READ ONCE PER PANEL, not per render: the figure moves when files are
   * uploaded, not when a member's role changes, and _render runs on every
   * member push. `_spaceUsed` staying undefined until the first answer is what
   * keeps the chip out of the card rather than showing a zero.
   *
   * 🚨 NEVER THROWS AND NEVER BLOCKS. This service has no other caller in the
   * UI today, so it is the least exercised thing this panel touches — the
   * panel must open identically whether it answers, errors or is not routed
   * at all. A missing chip is a cosmetic loss; a panel that fails to open
   * because a storage figure could not be read is not.
   */
  async _loadSpaceUsage() {
    if (this._spaceRequested) return;
    this._spaceRequested = 1;
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;
    let res;
    try {
      res = await this.postService(
        (SERVICE.hub && SERVICE.hub.show_privilege) || "hub.show_privilege",
        { hub_id },
      );
    } catch (e) {
      this.warn("Failed to read workspace space usage", e);
      return;
    }
    const used = Number(res && res.filesize);
    // An empty workspace answers 0, and the chip is left off for it — see
    // workspaceCard. "0 B" beside the member count is noise, not information.
    if (!Number.isFinite(used)) return;
    this._spaceUsed = used;
    this._render();
  }

  /**
   * The invitations this workspace is still waiting on, and the ones that were
   * turned down — the Pending Invitations section.
   *
   * A SEPARATE READ FROM THE MEMBER LIST, because they are separate states now.
   * Inviting somebody no longer makes them a member, so between the send and
   * their answer they exist in neither the matrix nor anywhere else the admin
   * can see; without this section an invitation would vanish the moment it was
   * sent and the admin would have nothing to tell them apart from a mistake.
   *
   * ADMIN ONLY, matching the service (hub.invitations is `src: admin`) and the
   * invite form above it. A non-admin viewer is not shown a section that would
   * answer 403 — the request is not even made.
   *
   * NEVER THROWS AND NEVER CLEARS ON FAILURE. This runs beside _loadMembers on
   * every refresh, and a blip on the invitations read must not blank a section
   * that is currently correct, nor stop the matrix rendering. `_invitations`
   * stays null until the first answer, which is what lets the skeleton tell
   * "not read yet" from "none" — the section is absent in the first case and
   * present-but-empty in the second.
   */
  async _loadInvitations() {
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;
    // Set by the skeleton on every render — see the note there on why this is
    // published rather than re-derived from a privilege bit here.
    if (!this._isAdmin) return;
    // Same out-of-order guard as the member read: an invite and a decline can
    // land back to back and only the newest answer may paint.
    const seq = (this._invitationsSeq = (this._invitationsSeq || 0) + 1);
    let rows;
    try {
      // Literal fallback, the same shape the activity panel uses for
      // secure_share.respond_to_access_request. SERVICE.hub is published by
      // the SERVER's ACL (Platform.get('services')), so on an endpoint whose
      // server has not shipped hub.invitations yet the key is absent and
      // postService would be handed undefined. The string still resolves, and
      // the request simply 404s into the catch below.
      rows = await this.postService(
        (SERVICE.hub && SERVICE.hub.invitations) || "hub.invitations",
        { hub_id },
      );
    } catch (e) {
      this.warn("Failed to load workspace invitations", e);
      return;
    }
    if (seq !== this._invitationsSeq) return;
    if (!_.isArray(rows)) return;
    this._invitations = rows;
    this._render();
  }

  /**
   * Somebody was added to a workspace: the server pushes `hub.member_joined`
   * to every online member of it (server-team/service/lib/notify-member-joined
   * — fired from the single `_grantMembership` choke point, so it covers
   * hub.invite's existing-account branch and add_contributors alike).
   *
   * That push already existed, and its own comment says it is there so an
   * admin with the permission matrix open sees the new member without a
   * reload — but only the folder window's Folder Settings panel had ever been
   * wired to it. This panel shows the same matrix and was left out, so it sat
   * stale while the invite it had just sent landed.
   *
   * Covers the invite this admin just sent AND one sent by somebody else.
   *
   * `hub.members_changed` is the same refetch for EXISTING rows: another admin
   * set a role (hub.set_privilege) or removed members (hub.delete_contributor).
   * Both used to push only to the member being changed, so this matrix kept
   * the old role, or the removed member, until the panel was reopened.
   *
   * `hub.invitations_changed` is the Pending Invitations section's own: an
   * invitation was accepted or declined (server _closeInvitation).
   */
  _onWsEvent(args = {}) {
    const { data, options } = args || {};
    const service = options && options.service;
    if (
      service !== "hub.member_joined"
      && service !== "hub.members_changed"
      && service !== "hub.invitations_changed"
    ) {
      return;
    }
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;
    // Several panels can be open on different workspaces — only ours reacts.
    if (data && data.hub_id && `${data.hub_id}` !== `${hub_id}`) return;
    // An invitation was ANSWERED (hub.accept_invite / hub.decline_invite). A
    // decline changes no membership, so nothing else would tell this panel —
    // its Pending line kept saying Pending until it was reopened. Only the
    // invitations are re-read: the member list did not move, and an accept
    // that did add somebody also sends hub.member_joined, which reloads both.
    if (service === "hub.invitations_changed") return this._loadInvitations();
    this._loadMembers();
  }

  onBeforeDestroy(opt) {
    Wm.off(WS_EVENT, this._onWsEvent);
    if (super.onBeforeDestroy) super.onBeforeDestroy(opt);
  }

  /** Slide the dock in. Was driven by the members list's `eod`; the list is
   *  gone, so the fetch that replaced it drives it.
   *
   *  Column mode (the rail's Access): nothing slides — the panel is a view of
   *  the split body and enters with the switch. There data-position is what
   *  says the members have LANDED, and the skin holds the panel's loading
   *  skeleton until it does. */
  _reveal() {
    const el = this.el;
    if (!el?.dataset) return;
    el.dataset.position = "1";
  }

  _findMemberRow(memberId) {
    if (!memberId) return null;
    const key = String(memberId);
    return (
      (this._members || []).find(
        (r) => String(r.entity_id || r.drumate_id || r.id || "") === key,
      ) || null
    );
  }

  _formatMemberName(row) {
    const pick = (...vals) =>
      vals.map((v) => (v == null ? "" : String(v).trim())).find(Boolean) || "";
    return pick(
      row.fullname,
      [row.firstname, row.lastname].filter(Boolean).join(" "),
      row.surname,
      row.email,
    );
  }

  /** True when `email` already appears in the matrix — the same list the rows
   *  render from. Trimmed and case-folded: the entry does not normalize. */
  _emailIsMember(email) {
    const target = String(email || "").trim().toLowerCase();
    if (!target) return false;
    return (this._members || []).some(
      (r) => String(r.email || "").trim().toLowerCase() === target,
    );
  }

  _getInviteEmail(cmd) {
    const data = cmd?.getData?.() || {};
    const entry = this.getPart?.("invite-email");
    return String(data.email || entry?.getValue?.() || "").trim();
  }

  /** A row of the address-book dropdown was clicked: put its address in the
   *  field, close the list, and drop any stale error. Send stays a separate
   *  click — picking a contact chooses the address, it does not invite. */
  _pickInviteContact(cmd) {
    const email = String(
      cmd?.mget?.(_a.email) || cmd?.el?.dataset?.email || "",
    ).trim();
    if (!email) return;
    fillEntry(this.getPart?.("invite-email"), email);
    this._closeEmailLookup?.();
    this._setInviteError();
  }

  /**
   * Show / clear the inline message in the slot under the invite input — the
   * way the base panel does, because a message about the address belongs at
   * the address, not in a modal the user has to dismiss before fixing it.
   *
   * Written to `_inviteNotice` AND to the DOM: the state is what survives the
   * next `_render()`, the DOM write is what makes it appear without one.
   *
   * `tone` picks the colour (see the skin's data-tone) and decides whether the
   * input itself is put in its error state — a success must not leave a red
   * ring around a field the user typed correctly.
   *
   * @param {String} [text] message; falsy clears the slot
   * @param {String} [tone] "error" (default) or "success"
   */
  _setInviteNotice(text, tone = "error") {
    this._inviteNotice = text ? { text, tone } : null;
    const wrapper = this.getPart?.("invite-error");
    const note = this.getPart?.("invite-error-message");
    const entry = this.getPart?.("invite-email");
    if (wrapper?.el) {
      wrapper.el.dataset.state = text ? _a.open : _a.closed;
      wrapper.el.dataset.tone = tone;
    }
    if (note?.set) note.set({ content: text || "" });
    if (text && tone === "error") {
      if (entry?.showError) entry.showError();
    } else if (entry?.hideError) {
      entry.hideError();
    }
  }

  /**
   * The panel's remaining MODAL messages, all on the same card.
   *
   * Invite outcomes report inline now (_setInviteNotice). What still has to
   * interrupt is a member mutation that FAILED — a role change or a removal
   * the server refused — because the row on screen no longer matches what the
   * user just asked for.
   *
   * Those went through `Wm.alert(someString)`, which builds a bare
   * `{kind:"window_info", message}` with no `variant`. The notice block in
   * window/info/skin is what sets `min-width: unset`; without it the card
   * inherits `.window__ui`'s `min-width: 600px`, which floors its declared
   * 500px. Measured against the compiled skin:
   *
   *   plain    rendered=600px  width=600px  min-width=600px  padding=0px
   *   notice   rendered=550px  width=500px  min-width=0px    padding=20px 24px 24px
   *
   * `kind` is set so alert feeds the object verbatim (variant + actions)
   * instead of wrapping it as a plain body.
   */
  _notice(message) {
    return Wm.alert({
      kind: "window_info",
      message: message || LOCALE.TRY_AGAIN,
      variant: "notice",
      actions: [
        { label: LOCALE.CLOSE, priority: "primary", service: _e.close },
      ],
    });
  }

  /** The error tone of _setInviteNotice. Kept as its own name because every
   *  validation path reads as "set the invite error". */
  _setInviteError(reason) {
    return this._setInviteNotice(reason, "error");
  }

  /**
   * Menu pick from the invite row — remember the role and repaint just the
   * trigger label.
   *
   * NOT a re-feed: that destroys and recreates the still-open menu_topic
   * mid-click, before it finishes dispatching this very option, and the
   * rebuilt menu's options never get their handlers wired — the role could
   * then be picked exactly once. (The base panel carries the same note.)
   */
  _selectInviteRole(cmd) {
    const privilege = cmd?.el?.dataset?.privilege;
    const roleLabel = cmd?.el?.dataset?.role_label;
    if (privilege == null) return;
    this._inviteRole = {
      label: roleLabel || this._inviteRole?.label || "",
      privilege: Number(privilege),
    };
    const label = this.el?.querySelector(
      `.${this.fig.family}__invite-input-row `
      + `.${this.fig.family}__role-label .note-content`,
    );
    if (label) label.textContent = this._inviteRole.label;
    // The option fires straight at this panel through uiHandler, so the click
    // never bubbles back to the menu for it to auto-close. Close it explicitly.
    const menu = cmd.getParentByKind?.(KIND.menu.topic);
    if (menu?.changeState) menu.changeState(0);
  }

  /**
   * Put a member's role menu back on the role they actually hold.
   *
   * ui-core's radio behaviour moves the menu's highlight to the clicked row ON
   * THE CLICK (behavior/radio.js _on_message), before _selectMemberRole has
   * asked anything. So a change that did not happen — the confirm cancelled,
   * or the server refusing it — left the menu marking the role that was picked
   * instead of the one the member has: View member, pick Chat, Cancel, and the
   * menu said Chat.
   *
   * The rows are the picked row's siblings; each carries its role's privilege
   * as dataset, and roleFromPrivilege resolves the stored mask to the role the
   * skeleton marks (owner 63 → Admin, and so on). Set in place rather than
   * re-rendering: a re-feed would rebuild the whole panel and throw away its
   * scroll position for a change that did not happen.
   */
  _restoreRolePick(cmd, raw) {
    const held = roleFromPrivilege(raw?.privilege);
    const rows = cmd?.parent?.children;
    if (!held || !rows || !_.isFunction(rows.each)) return;
    rows.each((row) => {
      if (!_.isFunction(row?.setState)) return;
      const privilege = Number(row.el?.dataset?.privilege);
      row.setState(privilege === Number(held.privilege) ? 1 : 0);
    });
  }

  /** Menu pick on a member row — confirm, then persist across the workspace. */
  async _selectMemberRole(cmd) {
    if (this._confirmInFlight) return;
    const memberId = cmd?.el?.dataset?.member_id;
    const privilegeAttr = cmd?.el?.dataset?.privilege;
    const roleLabel = cmd?.el?.dataset?.role_label;
    if (!memberId || privilegeAttr == null) return;

    const raw = this._findMemberRow(memberId);
    if (!raw) return;
    if (raw.id === Visitor.id || raw.entity_id === Visitor.id) return;

    const privilege = Number(privilegeAttr);
    if (Number.isNaN(privilege)) return;
    // Picking the role a member already holds: no confirm, no round-trip.
    if (Number(raw.privilege) === privilege) return;

    this._confirmInFlight = true;
    try {
      await Wm.confirm({
        title: LOCALE.CHANGE_MEMBER_ROLE_TITLE || "Change member role",
        message: (
          LOCALE.CHANGE_MEMBER_ROLE_MESSAGE || "Change {name} to {role}?"
        )
          .replace("{name}", this._formatMemberName(raw))
          .replace("{role}", roleLabel || ""),
        confirm: LOCALE.CONFIRM || "Confirm",
        confirm_type: "primary",
        cancel: LOCALE.CANCEL || "Cancel",
        cancel_type: "secondary",
        mode: "hbf",
        // No backdrop, as on the remove prompt below: the member row this
        // names is right there in the matrix, and dimming it hides what the
        // user would check before confirming.
        overlay: "none",
      });
    } catch (_) {
      this._confirmInFlight = false;
      // Cancelled: nothing changed, so neither may the menu.
      this._restoreRolePick(cmd, raw);
      return;
    }

    try {
      // hub.set_privilege REPLACES the workspace privilege bitmask, so it
      // serves both upgrade and downgrade.
      const res = await this.postService(SERVICE.hub.set_privilege, {
        hub_id: this.mget(_a.hub_id),
        users: [memberId],
        privilege,
      });
      if (res && (res.error || res.error_code)) {
        this._restoreRolePick(cmd, raw);
        return this._notice(res.reason || res.error || LOCALE.TRY_AGAIN);
      }
      // Trust the POST and redraw from local state: get_members_by_type can
      // still answer with the pre-write row on an immediate read-after-write.
      raw.privilege = privilege;
      this._render();
    } catch (e) {
      this._restoreRolePick(cmd, raw);
      this._notice(e?.reason || e?.error || LOCALE.TRY_AGAIN);
    } finally {
      this._confirmInFlight = false;
    }
  }

  /** Trash button on a member row — confirm, then drop them. */
  async _removeMember(cmd) {
    if (this._confirmInFlight) return;
    const memberId = cmd?.el?.dataset?.member_id;
    if (!memberId) return;

    const raw = this._findMemberRow(memberId);
    if (!raw) return;
    if (raw.id === Visitor.id || raw.entity_id === Visitor.id) return;

    this._confirmInFlight = true;
    try {
      await Wm.confirm({
        title: LOCALE.REMOVE_MEMBER_TITLE || "Remove member",
        message: (
          LOCALE.REMOVE_MEMBER_MESSAGE
          || "Remove {name} from this folder? They will lose all access."
        ).replace("{name}", this._formatMemberName(raw)),
        confirm: LOCALE.REMOVE || "Remove",
        confirm_type: "danger",
        cancel: LOCALE.CANCEL || "Cancel",
        cancel_type: "secondary",
        mode: "hbf",
        // No backdrop. The prompt names the member being dropped, and the row
        // it names is right there in the matrix behind it — scrimming the
        // panel hides the one thing the user would check before answering.
        // Wm.confirm defaults to "scrim"; every other confirm keeps it.
        overlay: "none",
      });
    } catch (_) {
      this._confirmInFlight = false;
      return;
    }

    try {
      // hub.delete_contributor, NOT hub.remove_member: `remove_member` is not a
      // registered service (acl/hub.json), so SERVICE.hub.remove_member was
      // undefined, the POST went to `<svc>undefined`, and the rejection was
      // swallowed by the default onServerComplain — the click did nothing at
      // all. Same call and same `users: []` payload the folder Settings panel's
      // removeFolderMember uses; it is workspace-scoped, so the member loses
      // access to the whole workspace.
      const res = await this.postService(SERVICE.hub.delete_contributor, {
        hub_id: this.mget(_a.hub_id),
        users: [memberId],
      });
      if (res && (res.error || res.error_code)) {
        return this._notice(res.reason || res.error || LOCALE.TRY_AGAIN);
      }
      // A rejected POST (403 for a non-admin, DB error) resolves to `undefined`
      // — doRequest hands non-200 to onServerComplain, which only warns. On
      // success the service answers with the remaining member list, so an array
      // is the only proof the write happened; without this test the row below
      // would vanish from a removal the server refused.
      if (!Array.isArray(res)) {
        return this._notice(LOCALE.TRY_AGAIN);
      }
      // Splice locally rather than re-reading: hub.get_members_by_type still
      // answers with the pre-write rows on an immediate read-after-write (the
      // same reason _selectMemberRole above redraws from local state), so the
      // refetch this used to do put the removed member straight back on screen.
      this._members = (this._members || []).filter(
        (r) =>
          String(r.entity_id || r.drumate_id || r.id || "")
          !== String(memberId),
      );
      this._render();
    } catch (e) {
      this._notice(e?.reason || e?.error || LOCALE.TRY_AGAIN);
    } finally {
      this._confirmInFlight = false;
    }
  }

  /**
   * "Leave workspace" — the red button under the Permissions Matrix.
   *
   * The panel's own exit door, and for a View or Chat member the ONLY one: the
   * workspace tile's kebab and the switcher's ⋯ only render an exit row for a
   * viewer holding the write bit. See the skeleton's leaveSection.
   *
   * Confirm FIRST, on the same destructive card the member-removal prompt uses
   * (Wm.confirm, `confirm_type: "danger"`), naming the workspace. Cancel, ✕ and
   * Escape all reject that promise, and a rejection means nothing happens —
   * the card is the only thing that can start the request.
   *
   * The backdrop stays at Wm.confirm's "scrim" default here, unlike the role
   * and remove prompts beside it: those name a member row the user would check
   * in the matrix behind the card, this one is about the whole workspace and has
   * nothing behind it worth reading.
   */
  async _leaveWorkspace() {
    if (this._confirmInFlight) return;
    const hubId = this.mget(_a.hub_id);
    // No hub, or the user's OWN entity: there is nothing to leave. A personal
    // workspace is a folder in the caller's home and reports hub_id ===
    // Visitor.id; desk.leave_hub refuses that outright (HUB_ID_NOT_ALLOWED), so
    // stop here rather than posting a request that can only fail. The button is
    // not drawn in either case (skeleton viewerCanLeave) — this is the belt to
    // that brace, for a stale skeleton or a future surface raising the service.
    if (!hubId || `${hubId}` === `${Visitor.id}`) {
      this.warn("leave-workspace: refused, no foreign hub to leave", { hubId });
      return;
    }
    const name = this._workspaceName();

    this._confirmInFlight = true;
    try {
      await Wm.confirm({
        title: LOCALE.LEAVE_WORKSPACE,
        message: LOCALE.MSG_LEAVE_WORKSPACE.format(name),
        confirm: LOCALE.LEAVE,
        confirm_type: "danger",
        cancel: LOCALE.CANCEL,
        cancel_type: "secondary",
        mode: "hbf",
      });
    } catch (_) {
      this._confirmInFlight = false;
      return;
    }

    const btn = this.getPart?.("leave-workspace");
    if (btn?.el) btn.el.dataset.pending = "1";
    try {
      // Same call and same payload the tile path posts (wm/index.js
      // confirmLeaveHub): `nid` is the hub being left, `hub_id` is the caller's
      // own — the ACL resolves this service's scope from hub_id.
      const res = await this.postService(SERVICE.desk.leave_hub, {
        nid: hubId,
        hub_id: Visitor.id,
      });
      // A rejected POST resolves UNDEFINED — doRequest hands a non-200 to
      // onServerComplain, which only warns — so a falsy answer is a failure and
      // must not be reported as a departure.
      if (!res || res.error) {
        return this._notice(
          (res && (res.reason || res.error)) || LOCALE.LEAVE_WORKSPACE_FAILED,
        );
      }
      // The same local echo the tile path emits. The sidebar workspace list
      // (modules/desk _onWorkspaceWsEvent) and any open window of this hub
      // (window/utils handleWsEvent → removeContent) already subscribe to
      // `desk.leave_hub`; the server pushes its own notification to this
      // account's sockets as well, and both handlers are idempotent — the
      // later one finds nothing left to remove.
      //
      // Emitted on Wm, which is where this panel LISTENS for the same bus
      // (see initialize), because the panel is fed into hosts whose uiHandler
      // chain does not reach the desk.
      Wm.trigger(WS_EVENT, {
        data: {
          hub_id: hubId,
          home_id: hubId,
          nid: hubId,
          filetype: _a.hub,
          [_a.filename]: name,
        },
        options: { service: "desk.leave_hub" },
      });
    } catch (e) {
      this._notice(e?.reason || e?.error || LOCALE.LEAVE_WORKSPACE_FAILED);
    } finally {
      this._confirmInFlight = false;
      if (btn?.el) delete btn.el.dataset.pending;
    }
  }

  /**
   * Which workspace this panel is about, in words — for the confirm card.
   *
   * Same order the header's own title tries (skeleton/index.js workspaceTab):
   * the bound media first, the panel's model second, because the two feeds
   * carry different fields — window/folder's access column hands over the
   * window's media (filename + area), while media/form wraps a raw create_hub
   * row, which has no filename at all. Falls back to the generic word rather
   * than naming nothing.
   */
  _workspaceName() {
    const media = this.mget(_a.media);
    const read = (k) => {
      const fromMedia = media && _.isFunction(media.mget) ? media.mget(k) : null;
      return fromMedia || this.mget(k);
    };
    return (
      read(_a.filename) || read("hub_name") || read(_a.name) || LOCALE.WORKSPACE
    );
  }

  /**
   * Send button. EVERY outcome is reported inline at the field, success and
   * failure alike (see _setInviteNotice) — nothing here opens a modal.
   *
   * 🚨 THE CONFIRMATION USED TO BE A MODAL, AND IT TOOK THE PANEL WITH IT.
   * A successful send fed `Wm.alert({kind:"window_info"})` into the shared
   * wrapper-modal, and alert REPLACES what is in there — so the panel the user
   * was working in vanished and the matrix they had just changed went with it.
   * Reported 2026-09-08: "invite xong panel không cập nhật".
   *
   * The obvious repair — `Wm.info` instead, leaving both on screen — is the
   * one thing that must NOT be done, and the old comment here said why: the
   * panel's full-viewport wrapper sits over the toast and swallows its
   * X / Close clicks, stranding the user. So the second surface is dropped
   * altogether rather than restacked. Inline has neither failure mode: there
   * is only ever one thing on screen, and it is the panel.
   *
   * Duy approved this route 2026-09-08.
   */
  _sendInvitation(cmd) {
    // ONE SEND AT A TIME, guarded on STATE. hub.invite answers only once the
    // mail relay has taken every message (~5-7 s measured on stage), and the
    // guard used to be a data-pending flag on the clicked element — but the
    // chip commit just below re-feeds the whole skeleton, so that element was
    // gone before the request even left. The spinner never showed, the panel
    // looked idle with the address sitting in a chip, and a second press sent
    // the same invitations again.
    if (this._inviteSending) return;
    // WHATEVER IS STILL TYPED COUNTS. Somebody who enters one address and
    // presses Send never made a chip out of it, and losing it because they did
    // not press Enter first would be the worst possible reading of "multiple
    // addresses". Committing here also runs the same validation the chips got.
    const typed = this._getInviteEmail(cmd);
    if (typed) this._commitChips(typed);

    const invitees = (this._inviteChips || []).slice();
    if (!invitees.length) {
      // An error is already on screen when the typed text was rejected above;
      // do not replace a specific complaint ("not a valid address") with the
      // generic one.
      if (!this._inviteNotice) {
        this._setInviteError(LOCALE.EMAIL_REQUIRED || LOCALE.ENTER_VALID_EMAIL);
      }
      return;
    }
    this._setInviteError();

    const privilege = this._inviteRole?.privilege || _K.privilege.write;
    this._setInviteSending(true);

    return this.postService(SERVICE.hub.invite, {
      hub_id: this.mget(_a.hub_id),
      invitees,
      privilege,
    })
      .then((res) => {
        if (res && (res.error || res.error_code)) {
          return this._setInviteError(
            res.reason || res.error || LOCALE.TRY_AGAIN,
          );
        }
        // Refused for want of seats: no `results`, which the per-address
        // check below would read as "nothing failed" and report as sent. This
        // panel lives in the wrapper-modal the seat card is fed into, so the
        // card would replace it — keep the panel, say it inline.
        if (isSeatLimitReply(res)) {
          return this._setInviteError(seatLimitMessage(res));
        }
        // A rejected POST resolves `undefined` — doRequest hands a non-200 to
        // onServerComplain, which only warns — so a falsy answer is a failure
        // and must not be reported as a sent invitation.
        if (!res) {
          return this._setInviteError(LOCALE.TRY_AGAIN);
        }
        // PER-ADDRESS RESULTS, because one send can now half-succeed. The
        // server answers with a row per invitee and reports them
        // independently — a mailbox that bounces does not stop the others.
        //
        // The failures are kept as chips and the successes are dropped, so
        // pressing Send again retries exactly what did not go, and the field
        // shows the admin which addresses those were. Clearing everything
        // would tell them five invitations went out when four did.
        const results = (res && res.results) || [];
        const failed = results.filter((r) => r && r.status === "failed");
        if (failed.length) {
          const bad = new Set(
            failed.map((r) => String(r.email || "").trim().toLowerCase()),
          );
          this._inviteChips = invitees.filter((e) =>
            bad.has(String(e).trim().toLowerCase()),
          );
          this._render();
          return this._setInviteError(
            failed.length === results.length
              ? (failed[0].reason || LOCALE.TRY_AGAIN)
              : LOCALE.INVITE_PARTIAL_FAILED.format(
                results.length - failed.length,
                failed.length,
              ),
          );
        }
        // A member was really invited from this panel. Broadcast it so
        // flows that only observe the desk can react — the reward flow's
        // Step 1 walkthrough uses this to skip its own invite step.
        // RADIO_BROADCAST rather than triggerHandlers: this panel is fed
        // into the shared wrapper-modal, so its uiHandler chain never
        // reaches them.
        RADIO_BROADCAST.trigger("invitation:sent", {
          hub_id: this.mget(_a.hub_id),
        });
        // Empty the chips and the field before the notice, not after: those
        // addresses are now invitations, so leaving them would let a second
        // click send the same invitations again. Clearing also readies the row
        // for the next one — fillEntry refocuses the input.
        this._inviteChips = [];
        fillEntry(this.getPart?.("invite-email"), "");
        this._setInviteNotice(
          LOCALE.INVITATION_SENT_SUCCESSFULLY,
          "success",
        );
        // The people just invited are PENDING now, not members, so the matrix
        // below will not show them — the Pending Invitations section is where
        // they appear, and it has to be re-read for them to.
        this._loadInvitations();
      })
      .catch((e) =>
        this._setInviteError(e?.reason || e?.error || LOCALE.TRY_AGAIN),
      )
      .finally(() => this._setInviteSending(false));
  }

  /**
   * Flip the in-flight state of the Send button. Kept on the widget, and read
   * by the skeleton, so a re-render during the send (the chip commit, a
   * member push) redraws the button still busy; the DOM write here only
   * covers the button already on screen.
   */
  _setInviteSending(on) {
    this._inviteSending = !!on;
    const el = this.getPart?.("invite-send")?.el;
    if (!el || !el.dataset) return;
    if (on) el.dataset.pending = "1";
    else delete el.dataset.pending;
  }

  /**
   * User Interaction Event Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _e.close:
        // Column mode: a view of the folder split body, mounted once
        // (window/folder/access-column) — sliding it out and suppress()ing it
        // would leave that view empty for good. The folder window switches the
        // column back to the chat panel and lights the rail's Files instead.
        if (this.mget("mode") === "column") {
          return this.triggerHandlers({ service: "close-access-view" });
        }
        this.el.dataset.position = "0";
        setTimeout(() => {
          this.suppress();
        }, 500);
        return;

      case "send-invitation":
        return this._sendInvitation(cmd);

      case "pick-invite-contact":
        return this._pickInviteContact(cmd);

      case "remove-invite-chip": {
        // The × on one chip. Read off the DOM index the skeleton stamped, so
        // it cannot drift from the array the chips were rendered from.
        const index = Number(cmd?.el?.dataset?.index);
        if (!Number.isInteger(index)) return;
        (this._inviteChips || []).splice(index, 1);
        // A stale "already has access" or "not a valid address" complaint was
        // about an address that may be the one just removed.
        this._setInviteError();
        return this._render();
      }

      case "select-invite-role":
        return this._selectInviteRole(cmd);

      case "select-member-role":
        return this._selectMemberRole(cmd);

      case "filter-member-role":
        return this._filterMembersByRole(cmd);

      case "remove-member":
        return this._removeMember(cmd);

      case "leave-workspace":
        return this._leaveWorkspace();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __permission_restricted;
