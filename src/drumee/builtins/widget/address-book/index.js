const idOf = (c) =>
  (c && (c.id || c.contact_id || c.drumate_id || c.entity_id || c.entity)) ||
  null;

// Backend may return c.tag as an array of objects, an array of strings,
// a single object, a single string, or a comma-separated string. Normalize
// to an array of { tag_id, name } so the rest of the code is uniform.
function normalizeTags(raw) {
  if (raw == null || raw === "") return [];
  let arr = raw;
  if (typeof arr === "string")
    arr = arr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (!Array.isArray(arr)) arr = [arr];
  return arr
    .map((t) => {
      if (t == null) return null;
      if (typeof t === "string") return { tag_id: t, name: t };
      return {
        tag_id: t.tag_id || t.id || "",
        name: t.name || t.tag_name || "",
      };
    })
    .filter((t) => t && t.tag_id);
}

class __address_book extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    // `mview` drives the single-pane mobile/tablet layout (≤ 1024px):
    // "sidebar" shows the contact list, "detail" shows the selected
    // contact. On wider screens both panes show side-by-side and the
    // attribute is ignored.
    opt.dataset = { ...opt.dataset, anim: "out", mview: "sidebar" };
    super.initialize(opt);
    this.declareHandlers();
    this._tab = "all";
    this._search = "";
    this._contacts = [];
    this._invitations = [];
    this._sentInvitations = [];
    this._tags = [];
    this._selectedTagId = null;
    this._selectedKey = null;
    this._inviteDraft = { email: "", message: "" };
    this._inviteError = null;
    this._inviteSubmitting = false;
    this._editing = false;
    this._editError = null;
    this._editFirstname = "";
    this._editLastname = "";
    this._editComment = "";
    this._editEmails = [];
    this._editPhones = [];
    this._editTags = [];
    this._editSubmitting = false;
    this._importing = false;
    this._importError = null;
    this._importProgress = null;
    this._toast = null;
    this._toastTimer = null;
    this.bindEvent(_a.live);
    this._onOutsideClick = this._onOutsideClick.bind(this);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
  }

  /**
   * True when the panel is in single-pane mode (≤ 1024px). 1024 matches the
   * SCSS @media fallback in skin/index.scss so JS and CSS agree on what
   * counts as compact. `Visitor.isMobile()` is OR'd in to catch DevTools
   * emulator cases where data-device tags mobile but innerWidth differs.
   */
  _isMobile() {
    return (
      window.innerWidth <= 1024 ||
      (typeof Visitor.isMobile === "function" && Visitor.isMobile())
    );
  }

  async onDomRefresh() {
    this.feed(require("./skeleton")(this));
    await Promise.all([
      this._loadContacts(),
      this._loadInvitations(),
      this._loadSentInvitations(),
      this._loadTags(),
    ]);
    this._refreshList();
    this.el.dataset.anim = "in";
    RADIO_CLICK.on(_e.click, this._onOutsideClick);
  }

  /**
   *
   * @param {*} e
   */
  _onOutsideClick(e, source) {
    // Clicks coming from a sidebar toggle button are owned by
    // Desk.togglePanel — bail so we don't race it (flip anim to "out"
    // here and have togglePanel read it as closed and reopen).
    const svc = source && source.mget && source.mget(_a.service);
    if (typeof svc === "string" && svc.startsWith("toggle-")) return;
    // Opening the desk's mobile sidebar/drawer via a topbar button must not
    // dismiss the contact panel — the drawer overlays on top and the panel
    // stays open behind it. Bail on those clicks (they read as "outside").
    if (
      e.target &&
      e.target.closest &&
      e.target.closest(".desk-module__mobile-topbar-btn")
    )
      return;
    // Likewise on mobile/tablet, interacting with the desk sidebar drawer or
    // tapping its close-backdrop must not close the contact panel behind it.
    if (this._isMobile()) {
      if (svc === "mobile-close-drawer") return;
      if (
        e.target &&
        e.target.closest &&
        e.target.closest(".desk-module-sidebar__main")
      )
        return;
    }
    if (this.el.dataset.anim === "in" && !this.el.contains(e.target)) {
      Desk.closeAllPanels();
    }
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case "tab-all":
        return this.switchTab("all");
      case "tab-pending":
        return this.switchTab("pending");
      case "tab-archived":
        return this.switchTab("archived");
      case "tab-blocked":
        return this.switchTab("blocked");

      case "filter-tag":
        this._selectedTagId = trigger.mget("tagId") || null;
        return this._refreshList();

      case "select-contact":
        this._selectedKey = trigger.mget("contactKey");
        this._editing = false;
        this._updateSelectionDom();
        // Single-pane mobile/tablet: reveal the detail pane (inert ≥ 1024px).
        this.el.dataset.mview = "detail";
        return this._selectContact();

      case "back-to-list":
        // Mobile/tablet: return from the detail pane to the contact list.
        this.el.dataset.mview = "sidebar";
        break;

      case "open-invite":
        this._inviteDraft = { email: "", message: "" };
        this._inviteError = null;
        return this._renderInviteModal();

      case "cancel-invite":
        this._inviteError = null;
        return this._closeInviteModal();

      case "submit-invite":
        return this._submitInvite();

      case "open-import":
        this._importError = null;
        this._importProgress = null;
        return this._renderImportModal();

      case "cancel-import":
        return this._closeImportModal();

      case "pick-import-file":
        return this._pickImportFile();

      case "google-sync":
        return this._googleSync();

      case "accept-invitation":
        return this._acceptInvitation(trigger);
      case "refuse-invitation":
        return this._refuseInvitation(trigger);
      case "delete-contact":
        return this._deleteContact(trigger);
      case "archive-contact":
        return this._setStatus(trigger, "archived");
      case "restore-contact":
        return this._setStatus(trigger, "active");
      case "block-contact":
        return this._block(trigger);
      case "unblock-contact":
        return this._unblock(trigger);

      case "edit-contact":
        return this._beginEdit();

      case "cancel-edit":
        this._editing = false;
        this._editError = null;
        return this._refreshDetail();

      case "save-edit":
        return this._saveEdit(trigger);

      case "edit-add-email":
        this._syncEditDom();
        this._editEmails.push({ email: "", category: "priv", is_default: 0 });
        return this._refreshDetail();

      case "edit-remove-email": {
        this._syncEditDom();
        const idx = trigger.mget("rowIndex");
        const row = this._editEmails[idx];
        // Refuse to drop the only default — the contact must always have a
        // default email. The UI already hides × on the default row, but this
        // guards against any other trigger path.
        const otherDefaults = this._editEmails.some(
          (e, i) => i !== idx && e.is_default === 1,
        );
        if (row && row.is_default === 1 && !otherDefaults) {
          this._editError = LOCALE.CANNOT_REMOVE_ONLY_DEFAULT_EMAIL;
          return this._refreshDetail();
        }
        this._editEmails.splice(idx, 1);
        if (
          this._editEmails.length &&
          !this._editEmails.some((e) => e.is_default === 1)
        ) {
          this._editEmails[0].is_default = 1;
        }
        this._editError = null;
        return this._refreshDetail();
      }

      case "edit-set-default-email": {
        this._syncEditDom();
        const idx = trigger.mget("rowIndex");
        this._editEmails = this._editEmails.map((e, i) => ({
          ...e,
          is_default: i === idx ? 1 : 0,
        }));
        return this._refreshDetail();
      }

      case "edit-add-phone":
        this._syncEditDom();
        this._editPhones.push({ phone: "", areacode: "", category: "priv" });
        return this._refreshDetail();

      case "edit-remove-phone":
        this._syncEditDom();
        this._editPhones.splice(trigger.mget("rowIndex"), 1);
        return this._refreshDetail();

      case "edit-toggle-tag": {
        this._syncEditDom();
        const tagId = trigger.mget("tagId");
        if (!tagId) return;
        if (this._editTags.includes(tagId)) {
          this._editTags = this._editTags.filter((t) => t !== tagId);
        } else {
          this._editTags = [...this._editTags, tagId];
        }
        return this._refreshDetail();
      }

      case "create-tag":
        return this._createTag();

      case "delete-tag":
        return this._deleteTag(trigger);

      case "close-panel":
        return Desk.togglePanel("address_book", "chat-panel");

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  onWsMessage(svc, data, options = {}) {
    const { service } = options || svc;
    switch (service) {
      case SERVICE.contact.invite:
      case SERVICE.contact.invite_accept:
      case SERVICE.contact.invite_refuse:
      case SERVICE.contact.delete_contact:
      case SERVICE.contact.update:
      case SERVICE.contact.change_status:
      case SERVICE.contact.block:
      case SERVICE.contact.unblock:
        Promise.all([
          this._loadContacts(this._contactsOption || "active"),
          this._loadInvitations(),
          this._loadSentInvitations(),
        ]).then(() => {
          this._refreshList();
          this._refreshDetail();
        });
        return;
      case SERVICE.contact.load:
        // CSV/VCF import progress
        if (data && typeof data === "object") {
          this._importProgress = data;
          if (this._importing) this._renderImportModal();
        }
        return;
      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }

  // ─── Data ───────────────────────────────────────────────────────

  async _loadContacts(option = "active") {
    try {
      const rows = await this.fetchService({
        service: SERVICE.contact.show_contact,
        hub_id: Visitor.id,
        option,
      });
      this._contacts = (Array.isArray(rows) ? rows : []).map((c) => ({
        ...c,
        tag: normalizeTags(c.tag),
      }));
      this._contactsOption = option;
    } catch (err) {
      this._contacts = [];
    }
  }

  async _loadInvitations() {
    try {
      // `invite_get` is a GET endpoint (per `_get` suffix). Using postService
      // here returned empty silently and left the Pending tab blank for
      // recipients — the legacy invite-notification widget uses fetchService.
      const rows = await this.fetchService({
        service: SERVICE.contact.invite_get,
        hub_id: Visitor.id,
      });
      this._invitations = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._invitations = [];
    }
  }

  // Invitations the current user has SENT (rows in `contact` with status='sent').
  // Distinct from `_loadInvitations` which returns invitations received by us.
  async _loadSentInvitations() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.contact.show_contact,
        hub_id: Visitor.id,
        option: "sent",
      });
      this._sentInvitations = (Array.isArray(rows) ? rows : []).map((c) => ({
        ...c,
        tag: normalizeTags(c.tag),
      }));
    } catch (err) {
      this._sentInvitations = [];
    }
  }

  async _loadTags() {
    // The public service is `show_tag_by` (defined in `server-team/acl/tagcontact.json`),
    // which is routed to the underlying `tag_get_next` stored procedure. The method
    // name itself isn't exposed as a service, so calling `tag_get_next` silently
    // no-ops and leaves the tag picker empty.
    if (!SERVICE.tagcontact || !SERVICE.tagcontact.show_tag_by) return;
    try {
      const rows = await this.postService({
        service: SERVICE.tagcontact.show_tag_by,
        hub_id: Visitor.id,
      });
      this._tags = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._tags = [];
    }
  }

  async switchTab(tab) {
    this._tab = tab;
    this._selectedKey = null;
    this._editing = false;
    // `my_contact_show_next` honours 'active', 'archived', or 'sent'. The All
    // and Blocked tabs share the 'active' fetch (Blocked filters client-side
    // on `is_blocked`). Pending combines received invitations (notification
    // proc) with sent ones (option='sent').
    const want = tab === "archived" ? "archived" : "active";
    const tasks = [];
    if (this._contactsOption !== want) tasks.push(this._loadContacts(want));
    if (tab === "pending") {
      tasks.push(this._loadInvitations());
      tasks.push(this._loadSentInvitations());
    }
    if (tasks.length) await Promise.all(tasks);
    this._refreshList();
    this._refreshDetail();
  }

  // ─── Mutations ──────────────────────────────────────────────────

  async _submitInvite() {
    if (this._inviteSubmitting) return;

    const fields = this.getData?.(_a.formItem) || {};
    const email = String(fields.email || "").trim();
    const message = String(fields.message || "").trim();

    if (!email) {
      this._inviteError = LOCALE.EMAIL_REQUIRED;
      this._inviteDraft = { email, message };
      return this._renderInviteModal();
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this._inviteError = LOCALE.INVALID_EMAIL_FORMAT;
      this._inviteDraft = { email, message };
      return this._renderInviteModal();
    }

    const ownEmail = String((Visitor.profile() || {}).email || "")
      .trim()
      .toLowerCase();
    if (ownEmail && email.toLowerCase() === ownEmail) {
      this._inviteError = LOCALE.CANNOT_ADD_SELF_AS_CONTACT;
      this._inviteDraft = { email, message };
      return this._renderInviteModal();
    }

    this._inviteDraft = { email, message };
    this._inviteError = null;
    this._inviteSubmitting = true;
    this._renderInviteModal();

    try {
      const data = await this.postService({
        service: SERVICE.contact.invite,
        email,
        message,
        hub_id: Visitor.id,
      });
      const errorMsg = this._inviteErrorMessage(data && data.status);
      if (errorMsg) {
        this._inviteError = errorMsg;
        this._inviteSubmitting = false;
        return this._renderInviteModal();
      }
      this._inviteSubmitting = false;
      this._inviteError = null;
      this._inviteDraft = { email: "", message: "" };
      this._closeInviteModal();
      this._showToast(
        LOCALE.INVITATION_MAIL_SENT
          ? `${LOCALE.INVITATION_MAIL_SENT} ${email}`
          : "Invitation sent",
      );
      await Promise.all([
        this._loadContacts(this._contactsOption || "active"),
        this._loadSentInvitations(),
      ]);
      this._refreshList();
    } catch (err) {
      console.error("[address_book] contact.invite failed:", err);
      this._inviteSubmitting = false;
      this._inviteError = LOCALE.SOMETHING_WENT_WRONG;
      this._renderInviteModal();
    }
  }

  _inviteErrorMessage(status) {
    switch (status) {
      case "INVALID_DATA":
        return LOCALE.INVALID_EMAIL_FORMAT;
      case "SAME_DOMAIN":
      case "ALREADY_IN_CONTACT":
        return LOCALE.ALREADY_CONTACT_LIST;
      case "INVITE_RECEIVED":
        return LOCALE.INVITE_AWAITING_FOR_YOUR_RESPONSE;
      case "EMAIL_NOT_SENT":
        return LOCALE.MESSAGE_NOT_SENT_RETRY;
      case "SELF_CONTACT":
        return LOCALE.CANNOT_ADD_SELF_AS_CONTACT;
      case "NO_DEFAULT_MAIL":
        return LOCALE.AT_LEAST_ONE_DEFAULT_EMAIL || "Mark one email as default";
      case "MANY_DEFAULT_EMAIL":
        return LOCALE.ONLY_ONE_DEFAULT_EMAIL || "Only one email can be default";
      default:
        return null;
    }
  }

  async _acceptInvitation(trigger) {
    const email = trigger.mget("contactEmail");
    if (!email) return;
    try {
      await this.postService({
        service: SERVICE.contact.invite_accept,
        email,
        hub_id: Visitor.id,
      });
    } catch (err) {
      console.error("[address_book] invite_accept failed:", err);
    }
    this._selectedKey = null;
    await Promise.all([this._loadContacts(), this._loadInvitations()]);
    this._refreshList();
    this._refreshDetail();
  }

  async _refuseInvitation(trigger) {
    const email = trigger.mget("contactEmail");
    if (!email) return;
    try {
      await this.postService({
        service: SERVICE.contact.invite_refuse,
        email,
        hub_id: Visitor.id,
      });
    } catch (err) {
      console.error("[address_book] invite_refuse failed:", err);
    }
    this._selectedKey = null;
    await Promise.all([this._loadContacts(), this._loadInvitations()]);
    this._refreshList();
    this._refreshDetail();
  }

  async _deleteContact(trigger) {
    const id = trigger.mget("contactId");
    if (!id) return;
    try {
      await this.postService({
        service: SERVICE.contact.delete_contact,
        contact_id: id,
        hub_id: Visitor.id,
      });
      // The list merges _contacts + _invitations + _sentInvitations, and
      // "Cancel invite" rows live in _sentInvitations — filter all three so the
      // row disappears immediately. Relying on the WS echo to reload the lists
      // means a stale/dropped socket leaves the canceled row on screen.
      this._contacts = this._contacts.filter((c) => idOf(c) !== id);
      this._invitations = (this._invitations || []).filter((c) => idOf(c) !== id);
      this._sentInvitations = (this._sentInvitations || []).filter((c) => idOf(c) !== id);
      this._selectedKey = null;
      this._refreshList();
      this._refreshDetail();
    } catch (err) {
      console.error("[address_book] delete_contact failed:", err);
      this._showToast(LOCALE.TRY_AGAIN, "error");
      // Resync from the server: the row may already be deleted there (second
      // click on a row a lost WS echo left behind) — a reload clears it.
      await Promise.all([
        this._loadContacts(this._contactsOption || "active"),
        this._loadInvitations(),
        this._loadSentInvitations(),
      ]);
      this._selectedKey = null;
      this._refreshList();
      this._refreshDetail();
    }
  }

  async _setStatus(trigger, status) {
    const id = trigger.mget("contactId");
    if (!id) return;
    try {
      await this.postService({
        service: SERVICE.contact.change_status,
        contact_id: id,
        status,
        hub_id: Visitor.id,
      });
      await this._loadContacts(this._contactsOption || "active");
      this._selectedKey = null;
      this._refreshList();
      this._refreshDetail();
    } catch (err) {
      console.error("[address_book] change_status failed:", err);
    }
  }

  async _block(trigger) {
    const id = trigger.mget("contactId");
    if (!id) return;
    try {
      await this.postService({
        service: SERVICE.contact.block,
        contact_id: id,
        hub_id: Visitor.id,
      });
    } catch (err) {
      console.error("[address_book] block failed:", err);
    }
    await this._loadContacts(this._contactsOption || "active");
    this._refreshList();
    this._refreshDetail();
  }

  async _unblock(trigger) {
    const id = trigger.mget("contactId");
    if (!id) return;
    try {
      await this.postService({
        service: SERVICE.contact.unblock,
        contact_id: id,
        hub_id: Visitor.id,
      });
    } catch (err) {
      console.error("[address_book] unblock failed:", err);
    }
    await this._loadContacts(this._contactsOption || "active");
    this._refreshList();
    this._refreshDetail();
  }

  // ─── Edit form ──────────────────────────────────────────────────

  // `show_contact` (used by `_loadContacts`) only returns scalar columns,
  // so `_contacts[i]` has no `mobile`, `tag`, `address`, or multi-`email`
  // arrays. Hydrate those from `get_contact` whenever the detail/edit view
  // needs them — otherwise the edit form opens blank and freshly-saved
  // phones/tags don't reappear after the post-save reload.
  async _loadSelectedContactDetails(contactId) {
    if (!contactId || !SERVICE.contact || !SERVICE.contact.get_contact)
      return null;
    let full;
    try {
      full = await this.fetchService({
        service: SERVICE.contact.get_contact,
        contact_id: contactId,
        hub_id: Visitor.id,
      });
    } catch (err) {
      console.error("[address_book] get_contact failed:", err);
      return null;
    }
    // Auto-generated "colleague" rows (drumate union in `my_contact_show_next`)
    // have no row in the contact table, so `_show` returns nothing usable.
    if (!full || !full.id) return null;
    const merged = { ...full, tag: normalizeTags(full.tag) };
    const idx = this._contacts.findIndex((c) => idOf(c) === idOf(full));
    if (idx >= 0) {
      this._contacts[idx] = { ...this._contacts[idx], ...merged };
    }
    return merged;
  }

  // Paint the detail panel immediately with the scalar data we already have,
  // then hydrate phones/tags/etc. via `get_contact` and repaint. Without the
  // hydration step, first-time clicks on a sidebar item leave Mobile/Tags
  // blank because `show_contact` (used by `_loadContacts`) omits those arrays.
  async _selectContact() {
    this._refreshDetail();
    const sel = this.getSelectedContact();
    if (!sel) return;
    const contactId = sel.id || sel.contact_id;
    const hydrated = await this._loadSelectedContactDetails(contactId);
    if (hydrated && this._selectedKey === idOf(sel)) {
      this._refreshDetail();
    }
  }

  async _beginEdit() {
    const c = this.getSelectedContact();
    if (!c) return;
    await this._loadSelectedContactDetails(c.id || c.contact_id);
    const full = this.getSelectedContact() || c;
    this._editing = true;
    this._editError = null;
    this._editFirstname = full.firstname || "";
    this._editLastname = full.lastname || "";
    this._editComment = full.comment || "";
    const looksLikeEmail = (s) => typeof s === "string" && s.includes("@");
    // `full.entity` is a UID for drumate contacts (e.g. "1fe9136a1fe9137f")
    // and only equals the email when the contact isn't a drumate. Prefer the
    // top-level `email` string so the edit input shows "h0anghu7n@gmail.com"
    // instead of the entity UID.
    const primaryEmail = looksLikeEmail(full.email)
      ? full.email
      : looksLikeEmail(full.email_default)
        ? full.email_default
        : looksLikeEmail(full.entity)
          ? full.entity
          : "";
    this._editEmails =
      Array.isArray(full.email) && full.email.length
        ? full.email.map((e) => ({
            email: e.email || "",
            category: e.category || "priv",
            is_default: e.is_default || 0,
          }))
        : [{ email: primaryEmail, category: "priv", is_default: 1 }];
    if (
      !this._editEmails.some((e) => e.is_default === 1) &&
      this._editEmails.length
    ) {
      this._editEmails[0].is_default = 1;
    }
    this._editPhones = (Array.isArray(full.mobile) ? full.mobile : []).map(
      (p) => ({
        phone: p.phone || "",
        areacode: p.areacode || "",
        category: p.category || "priv",
      }),
    );
    this._editTags = (full.tag || []).map((t) => t.tag_id).filter(Boolean);
    this._refreshDetail();
  }

  _readEditFields() {
    const root = this.el?.querySelector(`.${this.fig.family}__detail-panel`);
    if (!root) return null;

    const emails = Array.from(
      root.querySelectorAll(`[data-row-kind="email"]`),
    ).map((row) => ({
      email: row.querySelector("input")?.value?.trim() || "",
      is_default: row.dataset.default === "1" ? 1 : 0,
      category: row.dataset.category || "priv",
    }));

    const mobile = Array.from(
      root.querySelectorAll(`[data-row-kind="phone"]`),
    ).map((row) => {
      const inputs = row.querySelectorAll("input");
      return {
        areacode: inputs[0]?.value?.trim() || "",
        phone: inputs[1]?.value?.trim() || "",
        category: row.dataset.category || "priv",
      };
    });

    return {
      firstname:
        root.querySelector("[data-field='firstname'] input")?.value?.trim() ||
        "",
      lastname:
        root.querySelector("[data-field='lastname']  input")?.value?.trim() ||
        "",
      comment:
        root
          .querySelector(
            "[data-field='comment'] textarea, [data-field='comment'] input",
          )
          ?.value?.trim() || "",
      email: emails,
      mobile,
    };
  }

  // Pull the current DOM values into _editEmails/_editPhones so that an
  // upcoming re-render keeps the user's typed text instead of resetting.
  _syncEditDom() {
    const dom = this._readEditFields();
    if (!dom) return;
    this._editFirstname = dom.firstname || "";
    this._editLastname = dom.lastname || "";
    this._editComment = dom.comment || "";
    if (dom.email.length === this._editEmails.length) {
      this._editEmails = dom.email.map((e, i) => ({
        ...this._editEmails[i],
        ...e,
      }));
    }
    if (dom.mobile.length === this._editPhones.length) {
      this._editPhones = dom.mobile.map((p, i) => ({
        ...this._editPhones[i],
        ...p,
      }));
    }
  }

  async _saveEdit(trigger) {
    if (this._editSubmitting) return;
    const contactId = trigger.mget("contactId");
    if (!contactId) return;

    // DOM is the source of truth — the user might have just typed values
    // that haven't been reflected in _editEmails/_editPhones yet.
    const dom = this._readEditFields() || {};

    const firstname = String(dom.firstname || "").trim();
    const lastname = String(dom.lastname || "").trim();
    const comment = String(dom.comment || "").trim();

    // Persist what the user typed so a validation-failure re-render keeps
    // their values instead of reverting to the original contact data.
    this._editFirstname = firstname;
    this._editLastname = lastname;
    this._editComment = comment;
    this._editEmails = (dom.email || []).map((e, i) => ({
      ...(this._editEmails[i] || {}),
      ...e,
    }));
    this._editPhones = (dom.mobile || []).map((p, i) => ({
      ...(this._editPhones[i] || {}),
      ...p,
    }));

    const emails = (dom.email || []).filter((e) => e.email && e.email.trim());
    const mobile = (dom.mobile || []).filter((p) => p.phone && p.phone.trim());
    if (emails.length && !emails.some((e) => e.is_default === 1)) {
      emails[0].is_default = 1;
    }

    if (firstname.length === 0) {
      this._editError = LOCALE.FIRST_NAME_REQUIRED;
      return this._refreshDetail();
    }
    if (firstname.length < 2) {
      this._editError = LOCALE.FIRSTNAME_MIN_2_CHARS;
      return this._refreshDetail();
    }
    if (lastname.length === 0) {
      this._editError = LOCALE.LASTNAME_REQUIRED;
      return this._refreshDetail();
    }
    if (lastname.length < 2) {
      this._editError = LOCALE.LASTNAME_MIN_2_CHARS;
      return this._refreshDetail();
    }
    if (!emails.length) {
      this._editError = LOCALE.EMAIL_REQUIRED;
      return this._refreshDetail();
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emails.some((e) => !emailRegex.test(e.email.trim()))) {
      this._editError = LOCALE.INVALID_EMAIL_FORMAT;
      return this._refreshDetail();
    }
    const defaultEmails = emails.filter((e) => e.is_default === 1);
    if (defaultEmails.length === 0) {
      this._editError = LOCALE.AT_LEAST_ONE_DEFAULT_EMAIL;
      return this._refreshDetail();
    }
    if (defaultEmails.length > 1) {
      this._editError = LOCALE.ONLY_ONE_DEFAULT_EMAIL;
      return this._refreshDetail();
    }
    const defaultValue = defaultEmails[0].email.trim().toLowerCase();
    const additionalDuplicate = emails.some(
      (e) =>
        e.is_default !== 1 && e.email.trim().toLowerCase() === defaultValue,
    );
    if (additionalDuplicate) {
      this._editError = LOCALE.EMAIL_DUPLICATE_OF_DEFAULT;
      return this._refreshDetail();
    }
    const phoneRegex = /^[+]?[\d\s\-()]{6,}$/;
    if (mobile.some((p) => !phoneRegex.test(p.phone.trim()))) {
      this._editError = LOCALE.INVALID_PHONE_FORMAT;
      return this._refreshDetail();
    }

    // Cross-contact email dedup. Two layers, both run before submit so we
    // never reach `contact.update` (which clears the email list before
    // reinserting it, so a mid-update collision would leave a partial state):
    //
    //   1. Local pass against `_contacts` — catches the common "this email is
    //      another contact's default" case using the data already in memory,
    //      and works even before the server endpoint is deployed.
    //   2. Server pass via `contact.email_in_use` — comprehensive (checks
    //      every contact_email row, not just defaults). Skipped silently if
    //      the endpoint isn't registered yet.
    const seenEmails = new Set();
    const uniqueEmails = [];
    for (const e of emails) {
      const v = (e.email || "").trim().toLowerCase();
      if (v && !seenEmails.has(v)) {
        seenEmails.add(v);
        uniqueEmails.push(v);
      }
    }

    const reportConflict = (email, conflict) => {
      const who =
        [conflict.firstname, conflict.lastname]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        conflict.entity ||
        conflict.email ||
        "";
      const tmpl = LOCALE.EMAIL_ALREADY_USED_BY_CONTACT;
      this._editError = tmpl
        ? typeof tmpl === "function"
          ? tmpl(email, who)
          : tmpl.replace("{email}", email).replace("{name}", who)
        : `${email} is already used by ${who || "another contact"}`;
      return this._refreshDetail();
    };

    // Local pass.
    const localContactEmail = (c) => {
      if (!c) return "";
      if (typeof c.email === "string") return c.email.trim().toLowerCase();
      if (Array.isArray(c.email)) {
        const def = c.email.find((x) => x && x.is_default === 1) || c.email[0];
        return ((def && (def.email || def)) || "")
          .toString()
          .trim()
          .toLowerCase();
      }
      if (typeof c.email_default === "string")
        return c.email_default.trim().toLowerCase();
      return "";
    };
    for (const v of uniqueEmails) {
      const conflict = (this._contacts || []).find(
        (c) => idOf(c) !== contactId && localContactEmail(c) === v,
      );
      if (conflict) return reportConflict(v, conflict);
    }

    // Server pass.
    if (SERVICE.contact && SERVICE.contact.email_in_use) {
      try {
        for (const v of uniqueEmails) {
          const hit = await this.fetchService({
            service: SERVICE.contact.email_in_use,
            email: v,
            contact_id: contactId,
            hub_id: Visitor.id,
          });
          if (hit && hit.id) return reportConflict(v, hit);
        }
      } catch (err) {
        // Don't hard-block on a check-call failure; `contact.update`'s own
        // ALREADY_IN_CONTACT check still backstops entity-level collisions.
        console.warn("[address_book] email_in_use check failed:", err);
      }
    }

    this._editError = null;

    const payload = {
      service: SERVICE.contact.update,
      contact_id: contactId,
      firstname,
      lastname,
      comment,
      hub_id: Visitor.id,
    };
    if (emails.length) payload.email = emails;
    if (mobile.length) payload.mobile = mobile;

    this._editSubmitting = true;
    this._refreshDetail();

    try {
      const data = await this.postService(payload);
      const status = data && data.status;
      // On success the server returns the contact record whose `status` is
      // the contact's lifecycle state (lowercase: "active", "sent", etc.).
      // Error responses use SHOUT_CASE codes ("CONACT_NOT_EXIST", etc.).
      // Only treat SHOUT_CASE statuses as errors so a successful update is
      // not mistaken for one.
      const isErrorStatus =
        typeof status === "string" && /^[A-Z][A-Z0-9_]*$/.test(status);
      if (isErrorStatus) {
        this._editError =
          this._inviteErrorMessage(status) ||
          this._editErrorMessage(status) ||
          LOCALE.SOMETHING_WENT_WRONG;
        this._editSubmitting = false;
        return this._refreshDetail();
      }

      // Tags: assign list via tagcontact.entity_assign.
      // `entity_id` here is the contact row's id (matches `c.id` from
      // `my_contact_show_next`), not the linked drumate id. The server
      // resolves the resource via `my_contact_get_next(_key, null)` which
      // does `WHERE c.id = _key`; passing the drumate id makes the ACL
      // framework fail to resolve a node → PERMISSION_DENIED.
      if (SERVICE.tagcontact && SERVICE.tagcontact.entity_assign) {
        const c = this.getSelectedContact();
        const entityId =
          (c && (c.id || c.contact_id || c.entity_id)) || contactId;
        if (entityId) {
          try {
            await this.postService({
              service: SERVICE.tagcontact.entity_assign,
              entity_id: entityId,
              tag: this._editTags || [],
              hub_id: Visitor.id,
            });
          } catch (err) {
            console.error("[address_book] tag assign failed:", err);
          }
        }
      }

      this._editing = false;
      this._editError = null;
      this._editSubmitting = false;
      await this._loadContacts(this._contactsOption || "active");
      await this._loadSelectedContactDetails(contactId);
      this._refreshList();
      this._refreshDetail();
      this._showToast(LOCALE.SAVED || "Saved");
    } catch (err) {
      console.error("[address_book] update failed:", err);
      this._editError = LOCALE.SOMETHING_WENT_WRONG;
      this._editSubmitting = false;
      this._refreshDetail();
    }
  }

  _editErrorMessage(status) {
    switch (status) {
      case "CONACT_NOT_EXIST":
      case "CONTACT_NOT_EXIST":
        return LOCALE.SOMETHING_WENT_WRONG;
      case "EMPTY_FIRSTNAME":
        return LOCALE.FIRST_NAME_REQUIRED;
      case "EMPTY_LASTNAME":
        return LOCALE.LASTNAME_REQUIRED;
      case "MANY_DEFAULT_EMAIL":
        return LOCALE.ONLY_ONE_DEFAULT_EMAIL;
      case "NO_DEFAULT_MAIL":
        return LOCALE.AT_LEAST_ONE_DEFAULT_EMAIL;
      case "SERVICE_ERROR":
        return LOCALE.SOMETHING_WENT_WRONG;
      default:
        return null;
    }
  }

  async _createTag() {
    // Preserve the user's typed firstname/lastname/comment/emails/phones
    // before the upcoming re-render — otherwise creating a tag would wipe
    // any in-flight edits in the form.
    if (this._editing) this._syncEditDom();
    const root = this.el?.querySelector(
      `.${this.fig.family}__new-tag-input input`,
    );
    const name = root?.value?.trim();
    if (!name) return;
    try {
      const tag = await this.postService({
        service: SERVICE.tagcontact.add,
        name,
        hub_id: Visitor.id,
      });
      if (tag && tag.tag_id) {
        this._tags = [...this._tags, tag];
        if (this._editing) {
          this._editTags = [...this._editTags, tag.tag_id];
        }
      }
    } catch (err) {
      console.error("[address_book] tag create failed:", err);
    }
    if (root) root.value = "";
    this._refreshDetail();
    this._refreshList();
  }

  async _deleteTag(trigger) {
    const tagId = trigger.mget("tagId");
    if (!tagId) return;
    if (this._editing) this._syncEditDom();
    if (!confirm(LOCALE.CONFIRM_DELETE_TAG)) return;
    try {
      await this.postService({
        service: SERVICE.tagcontact.remove,
        tag_id: tagId,
        hub_id: Visitor.id,
      });
      this._tags = this._tags.filter((t) => t.tag_id !== tagId);
      this._editTags = (this._editTags || []).filter((id) => id !== tagId);
      if (this._selectedTagId === tagId) this._selectedTagId = null;
      // Tag chips also appear in the contact rows — drop the deleted tag
      // from every loaded contact so the sidebar updates without a refetch.
      const stripTag = (c) => ({
        ...c,
        tag: (c.tag || []).filter((t) => (t.tag_id || t) !== tagId),
      });
      this._contacts = this._contacts.map(stripTag);
      this._sentInvitations = this._sentInvitations.map(stripTag);
    } catch (err) {
      console.error("[address_book] tag remove failed:", err);
    }
    this._refreshDetail();
    this._refreshList();
  }

  // ─── Import / Google sync ───────────────────────────────────────

  _renderImportModal() {
    return this.ensurePart("wrapper-invite-modal").then((wrap) => {
      wrap.clear();
      wrap.feed(require("./skeleton/import-modal")(this));
    });
  }

  _closeImportModal() {
    this._importing = false;
    this._importProgress = null;
    return this.ensurePart("wrapper-invite-modal").then((w) => w.clear());
  }

  _pickImportFile() {
    return this.ensurePart("ab-fileselector").then((sel) => {
      const input = sel.el.querySelector?.("input[type='file']") || sel.el;
      input.click?.();
    });
  }

  _onImportFilePicked(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    e.target.value = "";
    this._importing = true;
    this._importError = null;
    this._importProgress = { stage: "uploading", filename: file.name };
    this._renderImportModal();

    this._pendingImportName = file.name;
    this.uploadFile(file, { hub_id: Visitor.id });
  }

  async onUploadResponse(data) {
    if (!this._pendingImportName) return;
    this._pendingImportName = null;
    const uploadedId = data?.nid || data?.id;
    if (!uploadedId) {
      this._importError = LOCALE.SOMETHING_WENT_WRONG;
      this._renderImportModal();
      return;
    }
    this._importProgress = { stage: "loading" };
    this._renderImportModal();
    try {
      const result = await this.postService({
        service: SERVICE.contact.load,
        socket_id: Visitor.get(_a.socket_id) || "",
        uploaded_id: uploadedId,
        hub_id: Visitor.id,
      });
      this._importProgress = { stage: "done", ...result };
      this._renderImportModal();
      await this._loadContacts(this._contactsOption || "active");
      this._refreshList();
    } catch (err) {
      console.error("[address_book] import failed:", err);
      this._importError = LOCALE.SOMETHING_WENT_WRONG;
      this._renderImportModal();
    }
  }

  async _googleSync() {
    try {
      const res = await this.postService({
        service: SERVICE.contact.google_auth,
        hub_id: Visitor.id,
      });
      const url = res && (res.url || res.authUrl);
      if (url) {
        window.open(url, "_blank", "noopener");
      }
    } catch (err) {
      console.error("[address_book] google_auth failed:", err);
      this._importError = LOCALE.SOMETHING_WENT_WRONG;
      this._renderImportModal();
    }
  }

  // ─── Partial renders ────────────────────────────────────────────

  _refreshList() {
    return this.ensurePart("ab-list").then((part) => {
      part.feed(require("./skeleton/contact-list")(this, this._listForView()));
    });
  }

  _refreshDetail() {
    return this.ensurePart("ab-detail").then((part) => {
      const sel = this.getSelectedContact();
      part.feed(
        sel
          ? require("./skeleton/contact-detail")(this, sel)
          : require("./skeleton/empty-detail")(this),
      );
    });
  }

  _renderInviteModal() {
    return this.ensurePart("wrapper-invite-modal").then((wrap) => {
      wrap.clear();
      wrap.feed(require("./skeleton/invite-modal")(this));
    });
  }

  _closeInviteModal() {
    return this.ensurePart("wrapper-invite-modal").then((w) => w.clear());
  }

  _showToast(message, kind = "success") {
    this._toast = { message, kind };
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = null;
      this._renderToast();
    }, 3500);
    this._renderToast();
  }

  _renderToast() {
    return this.ensurePart("ab-toast").then((part) => {
      if (!this._toast) return part.feed([]);
      part.feed(
        Skeletons.Note({
          className: `${this.fig.family}__toast ${this.fig.family}__toast--${this._toast.kind}`,
          content: this._toast.message,
        }),
      );
    });
  }

  _updateSelectionDom() {
    const root = this.el;
    if (!root) return;
    const sel = this._selectedKey;
    root.querySelectorAll(`.${this.fig.family}__contact-item`).forEach((el) => {
      el.dataset.selected =
        el.getAttribute("data-contact-key") === sel ? "1" : "0";
    });
  }

  onPartReady(child, pn) {
    if (pn === "ab-fileselector") {
      child.el.onchange = (e) => this._onImportFilePicked(e);
      return;
    }
    if (pn === "ab-search") {
      const bind = () => {
        const input = child.el.querySelector("input");
        if (!input) return;
        const sync = () => {
          const next = (input.value || "").trim();
          if (next === this._search) return;
          this._search = next;
          this._refreshList();
        };
        input.addEventListener("input", sync);
      };
      if (child.waitElement) child.waitElement(child.el, bind);
      else bind();
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  // ─── View accessors ─────────────────────────────────────────────

  _listForView() {
    let list =
      this._tab === "pending"
        ? [...this._invitations, ...this._sentInvitations]
        : this._contacts;

    if (this._search) {
      const term = this._search.toLowerCase();
      list = list.filter((c) => {
        const haystack = [
          c.firstname,
          c.lastname,
          c.surname,
          c.fullname,
          ...(Array.isArray(c.email) ? c.email.map((e) => e.email || e) : []),
          c.entity,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    if (this._tab === "pending") return list;

    const isBlocked = (c) => c.is_blocked === 1 || c.status === "blocked";
    if (this._tab === "blocked") {
      list = list.filter(isBlocked);
    } else if (this._tab === "all") {
      // Server's my_contact_show_next returns blocked rows inside the active
      // set; mirror the archived-tab isolation by excluding them from All.
      list = list.filter((c) => !isBlocked(c));
    }
    // Archived tab is already filtered server-side (option="archived").
    if (this._selectedTagId) {
      list = list.filter((c) =>
        (c.tag || []).some((t) => t.tag_id === this._selectedTagId),
      );
    }
    return list;
  }

  getTab() {
    return this._tab;
  }
  getSearch() {
    return this._search;
  }
  getSelectedKey() {
    return this._selectedKey;
  }
  getInvitations() {
    return [...(this._invitations || []), ...(this._sentInvitations || [])];
  }
  getTags() {
    return this._tags || [];
  }
  getSelectedTagId() {
    return this._selectedTagId;
  }
  keyOf(c) {
    return idOf(c);
  }

  getSelectedContact() {
    if (!this._selectedKey) return null;
    return (
      [...this._contacts, ...this._invitations, ...this._sentInvitations].find(
        (c) => idOf(c) === this._selectedKey,
      ) || null
    );
  }

  isPendingTab() {
    return this._tab === "pending";
  }
  getInviteDraft() {
    return this._inviteDraft || { email: "", message: "" };
  }
  getInviteError() {
    return this._inviteError;
  }
  isInviteSubmitting() {
    return this._inviteSubmitting === true;
  }

  isEditing() {
    return this._editing;
  }
  getEditError() {
    return this._editError;
  }
  getEditEmails() {
    return this._editEmails || [];
  }
  getEditPhones() {
    return this._editPhones || [];
  }
  getEditTags() {
    return this._editTags || [];
  }
  getEditFirstname() {
    return this._editFirstname || "";
  }
  getEditLastname() {
    return this._editLastname || "";
  }
  getEditComment() {
    return this._editComment || "";
  }
  isEditSubmitting() {
    return this._editSubmitting === true;
  }

  getImportError() {
    return this._importError;
  }
  getImportProgress() {
    return this._importProgress;
  }
}

module.exports = __address_book;
