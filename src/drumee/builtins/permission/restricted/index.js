const { roleByValue } = require("../../../builtins/skeleton/toolkit");
const { attachEmailLookup, fillEntry } = require("libs/contact-lookup");

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
    this.declareHandlers();
    // Pending-invite role, same default as the base panel's invite row.
    this._inviteRole = roleByValue("edit");
    this._members = [];
    this._membersLoaded = false;
    // The inline message under the invite field, as STATE rather than a DOM
    // write alone: _loadMembers re-feeds the whole skeleton, and the
    // hub.member_joined push lands within a second of a successful invite —
    // an imperative-only notice would be wiped by its own success.
    this._inviteNotice = null;
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
    this._loadMembers();
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
    this.feed(require("./skeleton")(this));
    if (draft) {
      this.ensurePart("invite-email").then((p) => fillEntry(p, draft));
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
    try {
      const rows = await this.fetchService(SERVICE.hub.get_members_by_type, {
        hub_id,
        type: "all",
      });
      this._members = Array.isArray(rows) ? rows : [];
    } catch (e) {
      this.warn("Failed to load workspace members", e);
    } finally {
      this._membersLoaded = true;
      this._render();
      this._reveal();
    }
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
   */
  _onWsEvent(args = {}) {
    const { data, options } = args || {};
    if (!options || options.service !== "hub.member_joined") return;
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;
    // Several panels can be open on different workspaces — only ours reacts.
    if (data && data.hub_id && `${data.hub_id}` !== `${hub_id}`) return;
    this._loadMembers();
  }

  onBeforeDestroy(opt) {
    Wm.off(WS_EVENT, this._onWsEvent);
    if (super.onBeforeDestroy) super.onBeforeDestroy(opt);
  }

  /** Slide the dock in. Was driven by the members list's `eod`; the list is
   *  gone, so the fetch that replaced it drives it. */
  _reveal() {
    if (this.el?.dataset) this.el.dataset.position = "1";
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
      });
    } catch (_) {
      this._confirmInFlight = false;
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
        return Wm.alert(res.reason || res.error || LOCALE.TRY_AGAIN);
      }
      // Trust the POST and redraw from local state: get_members_by_type can
      // still answer with the pre-write row on an immediate read-after-write.
      raw.privilege = privilege;
      this._render();
    } catch (e) {
      Wm.alert(e?.reason || e?.error || LOCALE.TRY_AGAIN);
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
        return Wm.alert(res.reason || res.error || LOCALE.TRY_AGAIN);
      }
      // A rejected POST (403 for a non-admin, DB error) resolves to `undefined`
      // — doRequest hands non-200 to onServerComplain, which only warns. On
      // success the service answers with the remaining member list, so an array
      // is the only proof the write happened; without this test the row below
      // would vanish from a removal the server refused.
      if (!Array.isArray(res)) {
        return Wm.alert(LOCALE.TRY_AGAIN);
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
      Wm.alert(e?.reason || e?.error || LOCALE.TRY_AGAIN);
    } finally {
      this._confirmInFlight = false;
    }
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
    const email = this._getInviteEmail(cmd);
    if (!email) {
      return this._setInviteError(
        LOCALE.EMAIL_REQUIRED || LOCALE.ENTER_VALID_EMAIL,
      );
    }
    if (!email.isEmail()) {
      return this._setInviteError(
        LOCALE.ENTER_VALID_EMAIL || LOCALE.INVALID_EMAIL,
      );
    }
    if (this._emailIsMember(email)) {
      return this._setInviteError(
        LOCALE.MEMBER_ALREADY_HAS_ACCESS
        || "This email already has access to this folder.",
      );
    }
    this._setInviteError();

    const privilege = this._inviteRole?.privilege || _K.privilege.write;
    const btn = cmd?.el;
    if (btn?.dataset.pending === "1") return;
    if (btn) btn.dataset.pending = "1";

    return this.postService(SERVICE.hub.invite, {
      hub_id: this.mget(_a.hub_id),
      invitees: [email],
      privilege,
    })
      .then((res) => {
        if (res && (res.error || res.error_code)) {
          return this._setInviteError(
            res.reason || res.error || LOCALE.TRY_AGAIN,
          );
        }
        const r = (res && res.results && res.results[0]) || {};
        if (r.status === "failed") {
          return this._setInviteError(r.reason || LOCALE.TRY_AGAIN);
        }
        // A rejected POST resolves `undefined` — doRequest hands a non-200 to
        // onServerComplain, which only warns — so a falsy answer is a failure
        // and must not be reported as a sent invitation.
        if (!res) {
          return this._setInviteError(LOCALE.TRY_AGAIN);
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
        // Empty the field before the notice, not after: the address is now a
        // member, so leaving it there would fail this panel's own
        // _emailIsMember check on a second click and answer a successful
        // invitation with "already has access". Clearing also readies the row
        // for the next one — fillEntry refocuses the input.
        fillEntry(this.getPart?.("invite-email"), "");
        this._setInviteNotice(
          LOCALE.INVITATION_SENT_SUCCESSFULLY,
          "success",
        );
      })
      .catch((e) =>
        this._setInviteError(e?.reason || e?.error || LOCALE.TRY_AGAIN),
      )
      .finally(() => {
        if (btn) delete btn.dataset.pending;
      });
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
        this.el.dataset.position = "0";
        setTimeout(() => {
          this.suppress();
        }, 500);
        return;

      case "send-invitation":
        return this._sendInvitation(cmd);

      case "pick-invite-contact":
        return this._pickInviteContact(cmd);

      case "select-invite-role":
        return this._selectInviteRole(cmd);

      case "select-member-role":
        return this._selectMemberRole(cmd);

      case "remove-member":
        return this._removeMember(cmd);

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __permission_restricted;
