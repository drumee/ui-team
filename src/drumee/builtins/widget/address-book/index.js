const idOf = (c) =>
  (c && (c.id || c.contact_id || c.drumate_id || c.entity_id || c.entity)) || null;

class __address_book extends LetcBox {

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._tab = "all";
    this._search = "";
    this._contacts = [];
    this._invitations = [];
    this._tags = [];
    this._selectedTagId = null;
    this._serverSearchHits = null;
    this._selectedKey = null;
    this._inviteDraft = { email: "", message: "" };
    this._inviteError = null;
    this._editing = false;
    this._editError = null;
    this._editEmails = [];
    this._editPhones = [];
    this._editTags = [];
    this._importing = false;
    this._importError = null;
    this._importProgress = null;
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
  }

  async onDomRefresh() {
    this.feed(require("./skeleton")(this));
    this.el.dataset.anim = "in";
    await Promise.all([this._loadContacts(), this._loadInvitations(), this._loadTags()]);
    this._refreshList();
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case "tab-all":      return this._switchTab("all");
      case "tab-pending":  return this._switchTab("pending");
      case "tab-archived": return this._switchTab("archived");
      case "tab-blocked":  return this._switchTab("blocked");

      case "filter-tag":
        this._selectedTagId = trigger.mget("tagId") || null;
        return this._refreshList();

      case "select-contact":
        this._selectedKey = trigger.mget("contactKey");
        this._editing = false;
        this._updateSelectionDom();
        return this._refreshDetail();

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

      case "accept-invitation":  return this._acceptInvitation(trigger);
      case "refuse-invitation":  return this._refuseInvitation(trigger);
      case "delete-contact":     return this._deleteContact(trigger);
      case "archive-contact":    return this._setStatus(trigger, "archived");
      case "restore-contact":    return this._setStatus(trigger, "active");
      case "block-contact":      return this._block(trigger);
      case "unblock-contact":    return this._unblock(trigger);

      case "edit-contact":
        return this._beginEdit();

      case "cancel-edit":
        this._editing = false;
        this._editError = null;
        return this._refreshDetail();

      case "save-edit":
        return this._saveEdit(trigger);

      case "edit-add-email":
        this._editEmails.push({ email: "", category: "priv", is_default: 0 });
        return this._refreshDetail();

      case "edit-remove-email":
        this._editEmails.splice(trigger.mget("rowIndex"), 1);
        if (this._editEmails.length && !this._editEmails.some((e) => e.is_default === 1)) {
          this._editEmails[0].is_default = 1;
        }
        return this._refreshDetail();

      case "edit-set-default-email": {
        const idx = trigger.mget("rowIndex");
        this._editEmails = this._editEmails.map((e, i) => ({ ...e, is_default: i === idx ? 1 : 0 }));
        return this._refreshDetail();
      }

      case "edit-add-phone":
        this._editPhones.push({ phone: "", areacode: "", category: "priv" });
        return this._refreshDetail();

      case "edit-remove-phone":
        this._editPhones.splice(trigger.mget("rowIndex"), 1);
        return this._refreshDetail();

      case "edit-toggle-tag": {
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

      case "search-input":
        this._search = String(trigger.mget("value") || "").trim();
        return this._runSearch();

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
        Promise.all([this._loadContacts(this._contactsOption || "active"), this._loadInvitations()])
          .then(() => { this._refreshList(); this._refreshDetail(); });
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
      this._contacts = Array.isArray(rows) ? rows : [];
      this._contactsOption = option;
    } catch (err) {
      this._contacts = [];
    }
  }

  async _loadInvitations() {
    try {
      const rows = await this.postService({
        service: SERVICE.contact.invite_get,
        hub_id: Visitor.id,
      });
      this._invitations = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._invitations = [];
    }
  }

  async _loadTags() {
    if (!SERVICE.tagcontact || !SERVICE.tagcontact.tag_get_next) return;
    try {
      const rows = await this.postService({
        service: SERVICE.tagcontact.tag_get_next,
        hub_id: Visitor.id,
      });
      this._tags = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._tags = [];
    }
  }

  async _switchTab(tab) {
    this._tab = tab;
    this._selectedKey = null;
    this._editing = false;
    const want = tab === "archived" ? "archived" : tab === "blocked" ? "blocked" : "active";
    if (this._contactsOption !== want) {
      await this._loadContacts(want);
    }
    this._refreshList();
    this._refreshDetail();
  }

  async _runSearch() {
    const term = this._search;
    if (!term) {
      this._serverSearchHits = null;
      return this._refreshList();
    }
    if (!SERVICE.contact || !SERVICE.contact.search_my_contacts) {
      // Server search not exposed → fall back to local filter via _refreshList.
      return this._refreshList();
    }
    try {
      const rows = await this.postService({
        service: SERVICE.contact.search_my_contacts,
        name: term,
        page: 1,
        hub_id: Visitor.id,
      });
      this._serverSearchHits = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._serverSearchHits = null;
    }
    this._refreshList();
  }

  // ─── Mutations ──────────────────────────────────────────────────

  async _submitInvite() {
    const fields = (this.getData?.(_a.formItem)) || {};
    const email = String(fields.email || "").trim();
    const message = String(fields.message || "").trim();

    if (!email) {
      this._inviteError = LOCALE.EMAIL_REQUIRED;
      this._inviteDraft = { email, message };
      return this._renderInviteModal();
    }

    this._inviteDraft = { email, message };
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
        return this._renderInviteModal();
      }
      this._inviteError = null;
      this._inviteDraft = { email: "", message: "" };
      this._closeInviteModal();
      await this._loadContacts(this._contactsOption || "active");
      this._refreshList();
    } catch (err) {
      console.error("[address_book] contact.invite failed:", err);
      this._inviteError = LOCALE.SOMETHING_WENT_WRONG;
      this._renderInviteModal();
    }
  }

  _inviteErrorMessage(status) {
    switch (status) {
      case "INVALID_DATA":       return LOCALE.INVALID_EMAIL_FORMAT;
      case "SAME_DOMAIN":
      case "ALREADY_IN_CONTACT": return LOCALE.ALREADY_CONTACT_LIST;
      case "INVITE_RECEIVED":    return LOCALE.INVITE_AWAITING_FOR_YOUR_RESPONSE;
      case "EMAIL_NOT_SENT":     return LOCALE.MESSAGE_NOT_SENT_RETRY;
      case "SELF_CONTACT":       return LOCALE.CANNOT_ADD_SELF_AS_CONTACT;
      case "NO_DEFAULT_MAIL":    return LOCALE.AT_LEAST_ONE_DEFAULT_EMAIL || "Mark one email as default";
      case "MANY_DEFAULT_EMAIL": return LOCALE.ONLY_ONE_DEFAULT_EMAIL || "Only one email can be default";
      default:                   return null;
    }
  }

  async _acceptInvitation(trigger) {
    const email = trigger.mget("contactEmail");
    if (!email) return;
    try {
      await this.postService({ service: SERVICE.contact.invite_accept, email, hub_id: Visitor.id });
    } catch (err) { console.error("[address_book] invite_accept failed:", err); }
    this._selectedKey = null;
    await Promise.all([this._loadContacts(), this._loadInvitations()]);
    this._refreshList();
    this._refreshDetail();
  }

  async _refuseInvitation(trigger) {
    const email = trigger.mget("contactEmail");
    if (!email) return;
    try {
      await this.postService({ service: SERVICE.contact.invite_refuse, email, hub_id: Visitor.id });
    } catch (err) { console.error("[address_book] invite_refuse failed:", err); }
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
      this._contacts = this._contacts.filter((c) => idOf(c) !== id);
      this._selectedKey = null;
      this._refreshList();
      this._refreshDetail();
    } catch (err) {
      console.error("[address_book] delete_contact failed:", err);
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
      await this.postService({ service: SERVICE.contact.block, contact_id: id, hub_id: Visitor.id });
    } catch (err) { console.error("[address_book] block failed:", err); }
    await this._loadContacts(this._contactsOption || "active");
    this._refreshList();
    this._refreshDetail();
  }

  async _unblock(trigger) {
    const id = trigger.mget("contactId");
    if (!id) return;
    try {
      await this.postService({ service: SERVICE.contact.unblock, contact_id: id, hub_id: Visitor.id });
    } catch (err) { console.error("[address_book] unblock failed:", err); }
    await this._loadContacts(this._contactsOption || "active");
    this._refreshList();
    this._refreshDetail();
  }

  // ─── Edit form ──────────────────────────────────────────────────

  _beginEdit() {
    const c = this.getSelectedContact();
    if (!c) return;
    this._editing = true;
    this._editError = null;
    this._editEmails = (Array.isArray(c.email) && c.email.length
      ? c.email.map((e) => ({ email: e.email || "", category: e.category || "priv", is_default: e.is_default || 0 }))
      : [{ email: c.entity || c.email || "", category: "priv", is_default: 1 }]);
    if (!this._editEmails.some((e) => e.is_default === 1) && this._editEmails.length) {
      this._editEmails[0].is_default = 1;
    }
    this._editPhones = (Array.isArray(c.mobile) ? c.mobile : []).map((p) => ({
      phone: p.phone || "", areacode: p.areacode || "", category: p.category || "priv",
    }));
    this._editTags = (Array.isArray(c.tag) ? c.tag : [])
      .map((t) => t.tag_id || t.id || t)
      .filter(Boolean);
    this._refreshDetail();
  }

  _readEditFields() {
    const root = this.el?.querySelector(`.${this.fig.family}__detail-panel`);
    if (!root) return null;
    const get = (sel) => root.querySelector(sel)?.value?.trim() || "";

    const emails = Array.from(root.querySelectorAll(`[data-row-kind="email"]`)).map((row) => ({
      email: row.querySelector("input")?.value?.trim() || "",
      is_default: row.dataset.default === "1" ? 1 : 0,
      category: row.dataset.category || "priv",
    })).filter((e) => e.email);

    const mobile = Array.from(root.querySelectorAll(`[data-row-kind="phone"]`)).map((row) => {
      const inputs = row.querySelectorAll("input");
      return {
        areacode: inputs[0]?.value?.trim() || "",
        phone:    inputs[1]?.value?.trim() || "",
        category: row.dataset.category || "priv",
      };
    }).filter((p) => p.phone);

    return {
      firstname: get("input[name='firstname']") || (root.querySelector("[data-field='firstname'] input")?.value || ""),
      lastname:  get("input[name='lastname']")  || (root.querySelector("[data-field='lastname'] input")?.value || ""),
      comment:   root.querySelector("[data-field='comment'] textarea, [data-field='comment'] input")?.value?.trim() || "",
      email: emails,
      mobile,
    };
  }

  async _saveEdit(trigger) {
    const contactId = trigger.mget("contactId");
    if (!contactId) return;

    const fields = (this.getData?.(_a.formItem)) || {};
    const fallback = this._readEditFields() || {};

    const firstname = String(fields.firstname || fallback.firstname || "").trim();
    const lastname  = String(fields.lastname  || fallback.lastname  || "").trim();
    const comment   = String(fields.comment   || fallback.comment   || "").trim();

    // Pick up edit-form arrays from in-memory state (kept in sync with renders).
    const emails = (this._editEmails || []).filter((e) => e.email && e.email.trim());
    const mobile = (this._editPhones || []).filter((p) => p.phone && p.phone.trim());
    if (emails.length && !emails.some((e) => e.is_default === 1)) {
      emails[0].is_default = 1;
    }

    const payload = {
      service: SERVICE.contact.update,
      contact_id: contactId,
      firstname, lastname, comment,
      hub_id: Visitor.id,
    };
    if (emails.length) payload.email = emails;
    if (mobile.length) payload.mobile = mobile;

    try {
      const data = await this.postService(payload);
      const errorMsg = this._inviteErrorMessage(data && data.status);
      if (errorMsg) {
        this._editError = errorMsg;
        return this._refreshDetail();
      }

      // Tags: assign list via tagcontact.entity_assign.
      if (SERVICE.tagcontact && SERVICE.tagcontact.entity_assign) {
        const c = this.getSelectedContact();
        const entityId = (c && (c.entity_id || c.entity || c.uid)) || null;
        if (entityId) {
          try {
            await this.postService({
              service: SERVICE.tagcontact.entity_assign,
              entity_id: entityId,
              tag: this._editTags || [],
              hub_id: Visitor.id,
            });
          } catch (err) { console.error("[address_book] tag assign failed:", err); }
        }
      }

      this._editing = false;
      this._editError = null;
      await this._loadContacts(this._contactsOption || "active");
      this._refreshList();
      this._refreshDetail();
    } catch (err) {
      console.error("[address_book] update failed:", err);
      this._editError = LOCALE.SOMETHING_WENT_WRONG;
      this._refreshDetail();
    }
  }

  async _createTag() {
    const root = this.el?.querySelector(`.${this.fig.family}__new-tag-input input`);
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
    } catch (err) { console.error("[address_book] tag create failed:", err); }
    if (root) root.value = "";
    this._refreshDetail();
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
      part.feed(sel
        ? require("./skeleton/contact-detail")(this, sel)
        : require("./skeleton/empty-detail")(this));
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

  _updateSelectionDom() {
    const root = this.el;
    if (!root) return;
    const sel = this._selectedKey;
    root.querySelectorAll(`.${this.fig.family}__contact-item`).forEach((el) => {
      el.dataset.selected = el.getAttribute("data-contact-key") === sel ? "1" : "0";
    });
  }

  onPartReady(child, pn) {
    if (pn === "ab-fileselector") {
      child.el.onchange = (e) => this._onImportFilePicked(e);
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  // ─── View accessors ─────────────────────────────────────────────

  _listForView() {
    if (this._tab === "pending") return this._invitations;
    let list;
    if (this._serverSearchHits) {
      list = this._serverSearchHits;
    } else if (this._search) {
      const term = this._search.toLowerCase();
      list = this._contacts.filter((c) => {
        const haystack = [
          c.firstname, c.lastname, c.surname, c.fullname,
          ...(Array.isArray(c.email) ? c.email.map((e) => e.email || e) : []),
          c.entity,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(term);
      });
    } else {
      list = this._contacts;
    }
    if (this._tab === "blocked") {
      list = list.filter((c) => c.is_blocked === 1 || c.status === "blocked");
    }
    if (this._selectedTagId) {
      list = list.filter((c) =>
        Array.isArray(c.tag) && c.tag.some((t) => (t.tag_id || t.id || t) === this._selectedTagId));
    }
    return list;
  }

  getTab() { return this._tab; }
  getSearch() { return this._search; }
  getSelectedKey() { return this._selectedKey; }
  getInvitations() { return this._invitations || []; }
  getTags() { return this._tags || []; }
  getSelectedTagId() { return this._selectedTagId; }
  keyOf(c) { return idOf(c); }

  getSelectedContact() {
    if (!this._selectedKey) return null;
    return [...this._contacts, ...this._invitations]
      .find((c) => idOf(c) === this._selectedKey) || null;
  }

  isPendingTab() { return this._tab === "pending"; }
  getInviteDraft() { return this._inviteDraft || { email: "", message: "" }; }
  getInviteError() { return this._inviteError; }

  isEditing() { return this._editing; }
  getEditError() { return this._editError; }
  getEditEmails() { return this._editEmails || []; }
  getEditPhones() { return this._editPhones || []; }
  getEditTags()   { return this._editTags || []; }

  getImportError() { return this._importError; }
  getImportProgress() { return this._importProgress; }
}

module.exports = __address_book;
