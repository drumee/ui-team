/**
 * Invite popup widget — Drumee 2.0 (Figma 980:172148 and siblings).
 * Hooks the address-book lookup (libs/contact-lookup → contact.lookup),
 * desk.home + organization.overview for the "Invite to" tree, and hub.invite.
 */
const { lookupContacts, suggestionRows } = require("libs/contact-lookup");
const { isSeatLimitReply, showSeatLimitReached } = require("libs/billing");
const { orgOverview, inOrganization } = require("libs/org-overview");
const T = require("./tree");
const treeRows = require("./skeleton/tree").rows;
const skeletonModule = require("./skeleton");
const { ROLES, DEFAULT_ROLE_IDS, computePrivilege, summarizeRoles } = skeletonModule;

class __invite_popup extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._onSearchInput = this._onSearchInput.bind(this);
  }

  static initClass() {
    require("./skin");
  }

  static _splitEmails(value) {
    return (value || "")
      .split(/[\s,;]+/)
      .filter(Boolean)
      .filter((tok) => __invite_popup._EMAIL_RE.test(tok));
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._invitees = [];
    // Pre-check a workspace when the caller opened the popup from one (the
    // kebab "Invite" on a hub passes hub_id + hub_name). Require BOTH the id and
    // the name, and skip the personal home (Visitor.id) — it is not an
    // invitable workspace, so callers that fall back to it (the topbar with no
    // current workspace) start with nothing checked.
    this._seedHubId =
      opt.hub_id && opt.hub_name && String(opt.hub_id) !== String(Visitor.id)
        ? String(opt.hub_id)
        : null;
    this._tree = { departments: [], ungrouped: [] };
    this._checked = new Set();
    this._expanded = new Set();
    // hub_id -> role id; absent = DEFAULT_ROLE_IDS[0]
    this._roles = new Map();
    this._tab = "email";
    this._link = { expiry: 0, preset: "7d", url: null };
    this._org = null;
    this._suggestions = [];
    this._partRefs = { roleLabels: {}, roleOptions: {} };
  }


  onDomRefresh() {
    this.feed(skeletonModule(this));
    this.el.dataset.tab = this._tab;
    this.el.dataset.state = 1;
    if (this.parent && this.parent.el) {
      this._wrapperEl = this.parent.el;
      this._wrapperEl.dataset.state = "open";
      this._wrapperEl.dataset.overlay = "blur";
      // A SECOND marker, alongside `overlay` rather than instead of it.
      //
      // The skin uses it to clear the wrapper's frosted glass entirely —
      // no blur and no tint — so the popup reads as an overlay ON the current
      // tab instead of as a screen that replaced it. The default
      // rgba(255,255,255,.55) + blur(30px) is opaque enough to look like a
      // blank white page.
      //
      // `overlay` MUST stay "blur": libs/guided-flow and reward-flow both
      // select on `[data-guided-overlay][data-overlay="blur"]` /
      // `[data-reward-overlay][data-overlay="blur"]` to swap in their own flat
      // dim, so retagging this would silently drop the backdrop override for
      // the onboarding tours that hand the user to this very popup. Both of
      // those use !important, so they still win when a tour is running.
      this._wrapperEl.dataset.inviteOverlay = "1";
    }
    this._dismissDropdowns = (e) => {
      if (!this.el.contains(e.target)) return;
      this._maybeCommitEmail(e.target);
      setTimeout(() => this._maybeCloseDropdowns(e.target), 0);
    };
    document.addEventListener("mousedown", this._dismissDropdowns);
    // A mousedown inside the dropdown means a pick is starting.
    //
    // The order of events is mousedown → focusout → mouseup → click. The
    // focusout handler below used to run mid-pick: it froze the half-typed
    // address into a chip — rejecting it as invalid, hence the "Please enter
    // a valid email address" — and cleared the list, destroying the row
    // before its click could land. `relatedTarget` cannot be used to detect
    // this: the rows are plain divs, so it is null, and the guard never held.
    this._onSuggestionDown = (e) => {
      if (this._suggestionsBox && this._suggestionsBox.el.contains(e.target)) {
        this._pickingSuggestion = true;
      }
    };
    document.addEventListener("mousedown", this._onSuggestionDown, true);
    // Released one task after mouseup, i.e. after the click has dispatched.
    this._onSuggestionUp = () => {
      if (!this._pickingSuggestion) return;
      setTimeout(() => {
        this._pickingSuggestion = false;
      }, 0);
    };
    document.addEventListener("mouseup", this._onSuggestionUp, true);

    // focusout bubbles (blur does not) so the listener survives Entry re-renders.
    this._onFocusOut = (e) => {
      const inputEl = this._emailInput?.el.querySelector("input");
      if (!inputEl || e.target !== inputEl) return;
      if (this._pickingSuggestion) return;
      const next = e.relatedTarget;
      if (
        next &&
        this._suggestionsBox &&
        this._suggestionsBox.el.contains(next)
      )
        return;
      this._addPendingEmailFromInput();
      this._hideSuggestions();
      this._refreshSendState();
    };
    this.el.addEventListener("focusout", this._onFocusOut);
    this._loadData();
  }

  onBeforeDestroy() {
    if (this._wrapperEl) {
      this._wrapperEl.dataset.state = "closed";
      delete this._wrapperEl.dataset.overlay;
      delete this._wrapperEl.dataset.inviteOverlay;
    }
    if (this._dismissDropdowns) {
      document.removeEventListener("mousedown", this._dismissDropdowns);
    }
    if (this._onFocusOut) {
      this.el.removeEventListener("focusout", this._onFocusOut);
    }
    if (this._onSuggestionDown) {
      document.removeEventListener("mousedown", this._onSuggestionDown, true);
    }
    if (this._onSuggestionUp) {
      document.removeEventListener("mouseup", this._onSuggestionUp, true);
    }
  }

  _maybeCommitEmail(target) {
    const inputEl = this._emailInput?.el.querySelector("input");
    if (!inputEl) return;
    if (this._emailInput.el.contains(target)) return;
    if (this._suggestionsBox && this._suggestionsBox.el.contains(target))
      return;
    this._addPendingEmailFromInput();
    this._refreshSendState();
  }

  // Close an open role menu when the click lands outside its own cell.
  _maybeCloseDropdowns(target) {
    Object.values(this._partRefs.roleOptions).forEach((optBox) => {
      if (!optBox || !optBox.el || optBox.el.dataset.state !== "1") return;
      const cell = optBox.el.parentElement;
      if (cell && !cell.contains(target)) optBox.el.dataset.state = 0;
    });
  }

  _setError(ref, message) {
    if (!ref) return;
    if (message) {
      ref.set({ content: message });
      ref.el.dataset.state = 1;
    } else {
      ref.set({ content: "" });
      ref.el.dataset.state = 0;
    }
  }

  _setEmailError(message) {
    this._setError(this._emailError, message);
  }

  _setWorkspaceError(message) {
    this._setError(this._workspaceError, message);
  }

  /**
   * Close the popup, playing the exit animation on the way out.
   *
   * Still parent.clear() and not goodbye(): goodbye removes the widget
   * silently, leaving the wrapper's data-state stuck at "open" and breaking
   * the next open click. What changed is only WHEN — clearing synchronously
   * destroyed the element on the spot, so invite-popup-out never got a frame.
   * The root is marked instead and the same clear() runs 160ms later.
   *
   * A TIMER, not animationend. Under prefers-reduced-motion the skin sets
   * `animation: none`, and that event would then never fire — the popup would
   * stay open forever for exactly the users who asked for less motion.
   *
   * @param {Object} [opt]
   * @param {Number} [opt.immediate] 1 to skip the animation and close now.
   *   The post-send path passes it: _sendInvitation raises a Wm.alert toast
   *   into THIS SAME wrapper-modal, and that feed destroys this popup. Hold
   *   the close for 160ms and the toast can land first, at which point the
   *   deferred clear() would wipe the confirmation the user is meant to read.
   */
  _closePopup(opt = {}) {
    if (this._closing) return;
    this._closing = 1;
    const done = () => {
      // The wrapper may already have been re-fed while we waited (a Wm.alert
      // toast, another dialog). Clearing it then would destroy THAT, not us.
      if (this.isDestroyed && this.isDestroyed()) return;
      if (this.parent && _.isFunction(this.parent.clear)) {
        return this.parent.clear();
      }
      return this.softDestroy();
    };
    if (opt.immediate || !this.el || !this.el.dataset) return done();
    this.el.dataset.closing = "1";
    setTimeout(done, 160);
  }

  /**
   * Run `fn(inputEl)` once an Entry part owns a real <input>.
   *
   * onPartReady fires when the Entry itself is mounted, but the <input> is
   * created later, by the Entry's OWN onDomRefresh (ui-core
   * widgets/entry/input → `reload()` appends the template and then fires
   * "input:ready"). So `child.el.querySelector("input")` is null here, and a
   * listener attached at this point is attached to nothing — which is exactly
   * why the email autocomplete never fired: no input event, no lookup, no
   * dropdown, whatever the user typed.
   *
   * Bind on the widget's own ready signal rather than on a timeout guess.
   * The immediate attempt covers a part that is already rendered (re-feed).
   */
  _whenInputReady(child, fn) {
    const attach = () => {
      const inputEl = child.el && child.el.querySelector("input");
      if (!inputEl || inputEl.dataset.invitePopupBound === "1") return;
      inputEl.dataset.invitePopupBound = "1";
      fn(inputEl);
    };
    attach();
    if (typeof child.on === "function") child.on("input:ready", attach);
  }

  onPartReady(child, pn) {
    if (pn === "email-chips") {
      this._chipsBox = child;
    } else if (pn === "email-input") {
      this._emailInput = child;
      this._whenInputReady(child, (inputEl) => {
        inputEl.setAttribute("autocomplete", "off");
        inputEl.addEventListener("input", this._onSearchInput);
        inputEl.addEventListener("keydown", (e) => {
          if (
            e.key === "Backspace" &&
            !inputEl.value &&
            this._invitees.length
          ) {
            this._removeInvitee(this._invitees.length - 1);
          }
        });
      });
    } else if (pn === "suggestions") {
      this._suggestionsBox = child;
    } else if (pn === "email-error") {
      this._emailError = child;
    } else if (pn === "workspace-error") {
      this._workspaceError = child;
    } else if (pn === "send-btn") {
      this._sendBtn = child;
    } else if (pn === "org") {
      this._orgBox = child;
    } else if (pn === "tree") {
      this._treeBox = child;
    } else if (pn === "all-check") {
      this._allCheck = child;
    } else if (pn === "link-panel") {
      this._linkPanel = child;
    } else if (pn === "tabs") {
      this._tabsBox = child;
    } else if (pn.startsWith("role-label:")) {
      this._partRefs.roleLabels[pn.slice(11)] = child;
    } else if (pn.startsWith("role-options:")) {
      const hub_id = pn.slice(13);
      this._partRefs.roleOptions[hub_id] = child;
      // Capture the pick on mousedown: a click would land after the document
      // mousedown handler has already closed the menu.
      if (child.el && child.el.addEventListener) {
        child.el.addEventListener("mousedown", (e) => {
          const opt = e.target.closest(".invite-popup__role-option");
          if (!opt || !opt.dataset.id) return;
          e.stopPropagation();
          e.preventDefault();
          this._pickRole(opt.dataset.hub_id, opt.dataset.id);
        });
      }
    }
  }

  /* ── Email autocomplete ───────────────────────────────────── */

  _onSearchInput(e) {
    this._setEmailError(null);
    const value = (e.target.value || "").trim();
    if (!value) {
      this._hideSuggestions();
      this._refreshSendState();
      return;
    }
    this._fetchSuggestions(value);
    this._refreshSendState();
  }

  // The typed string is matched against the whole address book — every
  // address a contact holds, not just their name (see libs/contact-lookup),
  // so a half-typed email offers the contacts that own it.
  /**
   * Show or clear the pending spinner on one of the two dropdown boxes.
   *
   * BOTH flags go on together. Neither box is on screen without
   * data-state="1" — __suggestions is `visibility: hidden` and
   * __workspace-suggestions is `display: none !important` until it flips — so
   * stamping data-loading alone spins something nobody can see.
   *
   * The box is emptied first: whatever is in it belongs to the previous
   * answer, and leaving stale rows under a spinner claims they are still the
   * matches for what is being typed now.
   *
   * @param {Object} box  the part (may be absent — parts mount late)
   * @param {Number} on   1 while the service is in flight, 0 once it answered
   */
  _setBoxLoading(box, on) {
    if (!box || !box.el) return;
    if (!on) {
      delete box.el.dataset.loading;
      return;
    }
    box.clear();
    box.el.dataset.state = 1;
    box.el.dataset.loading = 1;
  }

  _fetchSuggestions(value) {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    // Each keystroke supersedes the one before: a slow answer that comes
    // back after the user typed on must not repopulate the dropdown.
    const seq = (this._searchSeq = (this._searchSeq || 0) + 1);
    this._searchTimer = setTimeout(async () => {
      this._setBoxLoading(this._suggestionsBox, 1);
      const rows = await lookupContacts(this, {
        value,
        exclude: this._invitees.map((i) => i.email),
        limit: 8,
      });
      // Superseded: a newer keystroke is still in flight, so the spinner is
      // deliberately LEFT UP — it belongs to that request now, and clearing
      // it here would blink the box empty between two searches.
      if (seq !== this._searchSeq) return;
      this._showSuggestions(rows);
    }, 250);
  }

  // `rows` are normalized lookup rows — self and already-picked addresses
  // are filtered out upstream.
  _showSuggestions(rows) {
    this._suggestions = rows;
    if (!this._suggestionsBox) return;
    this._setBoxLoading(this._suggestionsBox, 0);
    if (!rows.length) {
      this._hideSuggestions();
      return;
    }
    // Shared renderer: name and address as separate elements. The old
    // "Name <addr>" string lost the address — Note content is sanitized as
    // innerHTML, so <addr> was stripped as an unknown tag.
    const items = suggestionRows(rows, {
      className: `${this.fig.family}__suggestion-item`,
      service: "pick-suggestion",
      uiHandler: this,
    });
    this._suggestionsBox.feed(items);
    this._suggestionsBox.el.dataset.state = 1;
  }

  _hideSuggestions() {
    if (this._suggestionsBox) {
      this._setBoxLoading(this._suggestionsBox, 0);
      this._suggestionsBox.el.dataset.state = 0;
      this._suggestionsBox.clear();
    }
  }

  /**
   * Add one address to the chip list, or refuse it with a reason.
   *
   * ONE CANONICAL FORM, stored and compared. Everything downstream already
   * treats an address case-insensitively — libs/contact-lookup lowercases
   * every suggestion row (normalize()) and its exclude set, the server's seat
   * count lowercases (hub.js _newcomers), and yp.token's UNIQUE KEY
   * (email, method, inviter_id) is utf8mb3_general_ci. The typed path was the
   * one exception: it stored the raw token and compared with ===, so
   * `Bob@acme.com` and `bob@acme.com` both became chips and both went to
   * hub.invite, which loops the array as given. That billed one person two
   * seats (and could refuse the whole call as SEAT_LIMIT_REACHED), then had
   * token_hub_invite_add REPLACE the first invitation with the second —
   * sending two mails whose first link was already dead.
   *
   * @returns {String|null} null when the address was added, else why it was
   *   refused: "empty" | "self" | "duplicate". Callers adding a BATCH use this
   *   to report after the loop — see _addPendingEmailFromInput.
   */
  _addInvitee(data, opt) {
    if (!data || !data.email) return "empty";
    const email = String(data.email).trim().toLowerCase();
    if (!email) return "empty";
    const ownEmail = (Visitor.profile() || {}).email;
    if (ownEmail && email === String(ownEmail).toLowerCase()) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_SELF || "You cannot invite yourself.",
      );
      return "self";
    }
    if (this._invitees.find((i) => i.email === email)) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_DUPLICATE || "This email is already in the list.",
      );
      return "duplicate";
    }
    this._invitees.push({ ...data, email });
    this._setEmailError(null);
    this._renderChips();
    this._refreshSendState();
    if (opt && opt.clearInput && this._emailInput) {
      const inputEl = this._emailInput.el.querySelector("input");
      if (inputEl) {
        inputEl.value = "";
        inputEl.focus();
      }
    }
    this._hideSuggestions();
    return null;
  }

  _removeInvitee(idx) {
    this._invitees.splice(idx, 1);
    this._renderChips();
    this._refreshSendState();
  }

  _renderChips() {
    if (!this._chipsBox) return;
    const pfx = this.fig.family;
    const chips = this._invitees.map((inv, idx) => {
      const label =
        inv.firstname || inv.lastname
          ? [inv.firstname, inv.lastname].filter(Boolean).join(" ")
          : inv.email;
      return Skeletons.Box.X({
        className: `${pfx}__chip`,
        kids: [
          Skeletons.Note({ content: label }),
          Skeletons.Note({
            className: `${pfx}__chip-remove`,
            service: "remove-chip",
            dataset: { idx },
            uiHandler: [this],
            content: "×",
          }),
        ],
      });
    });
    this._chipsBox.feed(chips);
  }

  _refreshSendState() {
    if (!this._sendBtn) return;
    const hasInvitee = this._invitees.length > 0;
    const inputVal = this._emailInput?.el.querySelector("input")?.value?.trim();
    const hasPendingEmail =
      inputVal && __invite_popup._splitEmails(inputVal).length > 0;
    const hasWorkspace = this._checked.size > 0;
    this._sendBtn.el.dataset.state =
      (hasInvitee || hasPendingEmail) && hasWorkspace ? 1 : 0;
  }

  _addPendingEmailFromInput() {
    const inputEl = this._emailInput?.el.querySelector("input");
    const value = (inputEl?.value || "").trim();
    if (!value) return;
    // Leftovers (typos / partial input) stay in the input so the user can fix them.
    const tokens = value.split(/[\s,;]+/).filter(Boolean);
    const leftovers = [];
    // Well-formed but refused (your own address, or already a chip). They are
    // NOT put back in the input: a duplicate is by definition already in the
    // list, and your own address can never be added, so returning either would
    // leave text the user cannot clear by any means but deleting it. They are
    // reported below instead, which is what was missing.
    const refused = [];
    for (const tok of tokens) {
      if (__invite_popup._EMAIL_RE.test(tok)) {
        const reason = this._addInvitee({ email: tok });
        if (reason) refused.push(reason);
      } else {
        leftovers.push(tok);
      }
    }
    if (inputEl) inputEl.value = leftovers.join(" ");
    // THE MESSAGE IS SET AFTER THE LOOP, NEVER INSIDE IT. _addInvitee clears
    // the error on every success, so a refused token followed by a good one
    // used to end the loop with a cleared error — "bob@x.com alice@x.com" with
    // bob already listed dropped bob and said nothing at all.
    //
    // Bad syntax outranks a refusal because those tokens are the ones still
    // sitting in the input waiting to be fixed; a refusal has nothing left on
    // screen to point at. Self outranks duplicate for the same reason it is
    // checked first — it is the more surprising of the two.
    if (leftovers.length) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_INVALID || "Please enter a valid email address.",
      );
    } else if (refused.includes("self")) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_SELF || "You cannot invite yourself.",
      );
    } else if (refused.includes("duplicate")) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_DUPLICATE || "This email is already in the list.",
      );
    }
  }

  /* ── Invite-to tree ───────────────────────────────────────── */

  /**
   * desk.home (what the caller may invite into) + organization.overview (how
   * those group, and member counts). Neither rejects: orgOverview resolves its
   * EMPTY shape on any failure, and a failed desk.home leaves an empty tree
   * showing its empty-state line.
   */
  async _loadData() {
    const [home, overview] = await Promise.all([
      this._fetchHome().catch(() => []),
      orgOverview(this),
    ]);
    if (this.isDestroyed && this.isDestroyed()) return;
    this._tree = T.buildTree({ homeRows: home, overview });
    const org = overview && overview.organisation;
    this._org = inOrganization() && org ? org : null;
    if (this._seedHubId && T.allHubIds(this._tree).includes(this._seedHubId)) {
      this._checked = new Set([this._seedHubId]);
      const d = T.deptOf(this._tree, this._seedHubId);
      if (d) this._expanded = new Set([d]);
    }
    // Feed the org SLOT only. Re-feeding the whole popup rebuilt the email row
    // and dropped any chip the user had added while this was loading — while
    // _invitees still held it, so Send went to a recipient no longer shown.
    if (this._org && this._orgBox) {
      this._orgBox.feed(skeletonModule.orgCardKids(this, this.fig.family));
      this._orgBox.el.dataset.state = 1;
    }
    this._renderTree();
  }

  /**
   * Every page of desk.home, not just the first.
   *
   * desk.home IS PAGINATED AT 45 (mfs_show_node_by's pageToLimits — see the
   * desk's _fetchWorkspacePages for the full story). A home listing is ordered
   * rank asc and a new workspace ranks last, so for anyone with 45+ home items
   * page 1 alone missed it: not offered, and not pre-checked from its own
   * kebab "Invite". A short page is the last one, so the common case still
   * costs one request.
   *
   * @returns {Promise<Array>} every row, in server order
   */
  async _fetchHome() {
    const PAGE_SIZE = 45;
    const MAX_PAGES = 20;
    // A list service with exactly one row answers with the object itself.
    const asRows = (r) => (r == null ? [] : _.isArray(r) ? r : [r]);
    const all = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const rows = asRows(
        await this.fetchService(
          { service: SERVICE.desk.home, hub_id: Visitor.id, type: _a.hub, page },
          { async: 1 },
        ),
      );
      all.push(...rows);
      if (rows.length < PAGE_SIZE) break;
    }
    return all;
  }

  _renderTree() {
    if (!this._treeBox) return;
    this._partRefs.roleLabels = {};
    this._partRefs.roleOptions = {};
    delete this._treeBox.el.dataset.loading;
    this._treeBox.feed(
      treeRows(this, this._tree, {
        checked: this._checked,
        expanded: this._expanded,
        roles: this._roles,
      }),
    );
    if (this._allCheck) {
      const state = T.allHubIds(this._tree).length
        ? T.allState(this._tree, this._checked)
        : "hidden";
      this._allCheck.el.dataset.state = state;
      const box = this._allCheck.el.querySelector(".invite-popup__check");
      if (box) box.dataset.state = state;
    }
    this._refreshSendState();
  }

  _setChecked(next) {
    this._checked = next;
    this._setWorkspaceError(null);
    this._renderTree();
  }

  _toggleRoleDropdown(hub_id) {
    const opt = this._partRefs.roleOptions[hub_id];
    if (!opt) return;
    const open = opt.el.dataset.state === "1";
    Object.values(this._partRefs.roleOptions).forEach((o) => (o.el.dataset.state = 0));
    opt.el.dataset.state = open ? 0 : 1;
  }

  _pickRole(hub_id, roleId) {
    if (!ROLES.find((r) => r.id === roleId)) return;
    this._roles.set(String(hub_id), roleId);
    const opts = this._partRefs.roleOptions[hub_id];
    if (opts) {
      opts.el
        .querySelectorAll(".invite-popup__role-option")
        .forEach((n) => (n.dataset.checked = n.dataset.id === roleId ? 1 : 0));
      opts.el.dataset.state = 0;
    }
    const label = this._partRefs.roleLabels[hub_id];
    if (label) label.set({ content: summarizeRoles([roleId]) });
  }

  /* ── Tabs + public link (UI only) ─────────────────────────── */

  _switchTab(tab) {
    if (tab !== "email" && tab !== "link") return;
    this._tab = tab;
    this.el.dataset.tab = tab;
    const c = this.el.querySelector && this.el.querySelector(".invite-popup__container");
    if (c) c.dataset.tab = tab;
    if (this._tabsBox) {
      this._tabsBox.el
        .querySelectorAll(".invite-popup__tab")
        .forEach((n) => (n.dataset.state = n.dataset.tab === tab ? 1 : 0));
    }
  }

  _renderLinkPanel() {
    if (this._linkPanel) {
      this._linkPanel.feed(skeletonModule.linkPanelKids(this, this.fig.family));
    }
  }

  /**
   * THE BACKEND SEAM. No server endpoint mints a multi-workspace invite link
   * yet (hub.get_external_room_attr is per share-hub and carries no roles), so
   * this deliberately does nothing. When one exists: post the checked hub ids,
   * their roles and the expiry here, and hand the answer to _setLink().
   */
  _requestLink() {}

  _setLink(url) {
    this._link = { ...this._link, url: url || null };
    this._renderLinkPanel();
  }

  _copyLink() {
    if (!this._link.url || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(this._link.url);
    // Transient toast, the same copy-link acknowledgement permission/share uses.
    if (Wm.acknowledge) Wm.acknowledge();
  }

  async _sendInvitation() {
    this._addPendingEmailFromInput();
    if (!this._invitees.length) {
      // Only claim "invalid" when the commit above has not already said
      // something more precise. Sending with your own address as the only
      // entry lands here having just been told "You cannot invite yourself",
      // and overwriting that with "Please enter a valid email address" names
      // the wrong problem — the address is perfectly valid. _setError stamps
      // data-state on the Note, so the error slot is its own flag.
      if (!this._emailError || this._emailError.el.dataset.state !== "1") {
        this._setEmailError(
          LOCALE.INVITE_EMAIL_INVALID || "Please enter a valid email address.",
        );
      }
      return;
    }

    // Belt and braces. _addInvitee is the only writer and it already refuses
    // duplicates, but THIS is the array that spends seats: the server loops it
    // verbatim (hub.js `for (const email of invitees)`) and its seat budget
    // does not dedupe either, so a single slip upstream bills one person twice
    // and can refuse the whole call as SEAT_LIMIT_REACHED.
    const emails = [
      ...new Set(this._invitees.map((i) => i.email || i.id || i.uid)),
    ];
    const assignments = [...this._checked].map((hub_id) => ({
      hub_id,
      permission: computePrivilege([this._roles.get(hub_id) || DEFAULT_ROLE_IDS[0]]),
    }));
    if (!assignments.length) {
      this._setWorkspaceError(
        LOCALE.INVITE_WORKSPACE_REQUIRED ||
          "Please select at least one workspace.",
      );
      return;
    }
    // Show the in-button loading spinner while hub.invite is in flight
    // (data-loading also disables pointer events — prevents double submit).
    if (this._sendBtn) this._sendBtn.el.dataset.loading = 1;

    const promises = assignments.map((a) =>
      this.postService(SERVICE.hub.invite, {
        hub_id: a.hub_id,
        invitees: emails,
        permission: a.permission,
      }),
    );

    return Promise.all(promises)
      .then((results) => {
        // {error, error_code, reason}. One top-level error => alert,
        // don't close popup to let user retry.
        const errored = results.filter((r) => r && (r.error || r.error_code));
        if (errored.length) {
          this.warn("[invite-popup] hub.invite error", errored);
          Wm.alert(
            (errored[0] && (errored[0].reason || errored[0].error)) ||
              LOCALE.TRY_AGAIN,
          );
          if (this._sendBtn) delete this._sendBtn.el.dataset.loading;
          return;
        }
        // Refused for want of seats. That reply carries no `results`, so the
        // branch below counted zero failures and announced the invitation as
        // sent — nothing was granted and no mail left. Say so with the seat
        // card. The popup goes first: both live in the wrapper-modal and the
        // card would replace it anyway.
        if (results.some(isSeatLimitReply)) {
          if (this._sendBtn) delete this._sendBtn.el.dataset.loading;
          this._closePopup();
          showSeatLimitReached();
          return;
        }
        const flat = [].concat(...results.map((r) => (r && r.results) || []));
        const failed = flat.filter((r) => r.status === "failed");
        this.triggerHandlers({
          service: "invitation-sent",
          invitees: this._invitees,
          results: flat,
        });
        if (failed.length) {
          Wm.alert(
            LOCALE.INVITE_PARTIAL_FAILED.format(
              flat.length - failed.length,
              failed.length,
            ),
          );
        } else {
          // Branded "notice" toast (the drumee-logo card with a primary Close),
          // matching the permission panel's invite-sent confirmation. `kind` is
          // set so Wm.alert feeds the object verbatim (variant + actions) into
          // the wrapper-modal instead of wrapping it as a plain grey alert.
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
        }
        // Immediate: the toast Wm.alert just raised takes this same wrapper,
        // so there is nothing left to animate out from under it — and a
        // deferred clear() would take the toast with it. See _closePopup.
        this._closePopup({ immediate: 1 });
      })
      .catch((err) => {
        this.warn("[invite-popup] hub.invite failed", err);
        if (this._sendBtn) delete this._sendBtn.el.dataset.loading;
      });
  }

  _get(cmd, key) {
    const v = cmd.mget ? cmd.mget(key) : undefined;
    if (v != null && v !== "") return v;
    return cmd.el ? cmd.el.dataset[key] : undefined;
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "close-invite-popup":
        return this._closePopup();

      case "submit-email":
        // The email Entry runs with mode:"commit" + interactive:1, so the
        // base widget fires triggerHandlers on every printable keyup with
        // __inputStatus:"interactive". Only convert the typed text into a
        // chip on an explicit Enter (__inputStatus === "commit"); otherwise
        // typing/pasting `a@b.c` would be auto-frozen into a chip and the
        // input cleared mid-edit.
        if (args && args.__inputStatus && args.__inputStatus !== _a.commit) {
          this._refreshSendState();
          return;
        }
        this._addPendingEmailFromInput();
        this._refreshSendState();
        return;

      case "pick-suggestion":
        return this._addInvitee(
          {
            email: this._get(cmd, "email"),
            id: this._get(cmd, "uid") || null,
          },
          { clearInput: true },
        );

      case "remove-chip":
        return this._removeInvitee(parseInt(this._get(cmd, "idx"), 10));

      case "toggle-ws":
        return this._setChecked(T.toggleWorkspace(this._checked, this._get(cmd, "hub_id")));

      case "toggle-dept": {
        const id = String(this._get(cmd, "dept"));
        const d = this._tree.departments.find((x) => x.id === id);
        return d && this._setChecked(T.toggleDept(d, this._checked));
      }

      case "toggle-all":
        return this._setChecked(T.toggleAll(this._tree, this._checked));

      case "expand-dept": {
        const id = String(this._get(cmd, "dept"));
        const next = new Set(this._expanded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        this._expanded = next;
        return this._renderTree();
      }

      case "toggle-role":
        return this._toggleRoleDropdown(this._get(cmd, "hub_id"));

      case "pick-role":
        return this._pickRole(this._get(cmd, "hub_id"), this._get(cmd, "id"));

      case "switch-tab":
        return this._switchTab(this._get(cmd, "tab"));

      case "toggle-expiry":
        this._link = { ...this._link, expiry: this._link.expiry ? 0 : 1 };
        return this._renderLinkPanel();

      case "pick-expiry":
        this._link = { ...this._link, preset: this._get(cmd, "preset") };
        return this._renderLinkPanel();

      case "get-link":
        return this._requestLink();

      case "copy-link":
        return this._copyLink();

      case "revoke-link":
        return this._setLink(null);

      case "send-invitation":
        return this._sendInvitation();
    }
  }
}

__invite_popup._EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

__invite_popup.initClass();
module.exports = __invite_popup;