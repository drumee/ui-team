const { roleByValue } = require("../../../builtins/skeleton/toolkit");
const { attachEmailLookup, fillEntry } = require("libs/contact-lookup");

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

  _render() {
    this.feed(require("./skeleton")(this));
  }

  /**
   * Workspace-scoped membership, the same call and the same `type: "all"` the
   * list used to make on this panel's behalf. The panel slides in once it
   * settles — success or not, so a failed fetch shows the empty matrix rather
   * than a panel that never arrives.
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
      this._members = [];
    } finally {
      this._membersLoaded = true;
      this._render();
      this._reveal();
    }
  }

  /** Re-read the list after a mutation and redraw. */
  async _refreshMembers() {
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;
    try {
      const rows = await this.fetchService(SERVICE.hub.get_members_by_type, {
        hub_id,
        type: "all",
      });
      this._members = Array.isArray(rows) ? rows : [];
    } catch (e) {
      this.warn("Failed to refresh workspace members", e);
    } finally {
      this._render();
    }
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

  /** Show / clear the inline message in the invite-error slot under the input,
   *  the way the base panel does — errors belong at the field, not in a modal
   *  the user has to dismiss before fixing the address. */
  _setInviteError(reason) {
    const wrapper = this.getPart?.("invite-error");
    const note = this.getPart?.("invite-error-message");
    const entry = this.getPart?.("invite-email");
    if (wrapper?.el) wrapper.el.dataset.state = reason ? _a.open : _a.closed;
    if (note?.set) note.set({ content: reason || "" });
    if (reason) {
      if (entry?.showError) entry.showError();
    } else if (entry?.hideError) {
      entry.hideError();
    }
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
      const res = await this.postService({
        service: SERVICE.hub.remove_member,
        hub_id: this.mget(_a.hub_id),
        uid: memberId,
      });
      if (res && (res.error || res.error_code)) {
        return Wm.alert(res.reason || res.error || LOCALE.TRY_AGAIN);
      }
      await this._refreshMembers();
    } catch (e) {
      Wm.alert(e?.reason || e?.error || LOCALE.TRY_AGAIN);
    } finally {
      this._confirmInFlight = false;
    }
  }

  /**
   * Send button. Validation happens inline at the field (see _setInviteError);
   * only server-side failures still surface as a modal.
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
          return Wm.alert(res.reason || res.error || LOCALE.TRY_AGAIN);
        }
        const r = (res && res.results && res.results[0]) || {};
        if (r.status === "failed") {
          return Wm.alert(r.reason || LOCALE.TRY_AGAIN);
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
        // Branded "notice" toast — the compact drumee-logo card with a
        // single primary Close button. Feed it through Wm.alert (into the
        // wrapper-modal) rather than Wm.info (the windows pool): alert
        // REPLACES this permission panel with the toast, so the toast is the
        // sole thing in the modal. Wm.info instead leaves the toast
        // coexisting with the still-open panel, where the panel's
        // full-viewport wrapper sat over the toast and swallowed its
        // X / Close clicks. `kind` is set so alert feeds the object verbatim
        // (variant + actions) instead of wrapping it as a plain body.
        Wm.alert({
          kind: "window_info",
          message: LOCALE.INVITATION_SENT_SUCCESSFULLY,
          variant: "notice",
          actions: [
            {
              label: LOCALE.CLOSE,
              priority: "primary",
              service: _e.close,
            },
          ],
        });
      })
      .catch((e) => Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN))
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
