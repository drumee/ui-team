/**
 * Invite popup widget
 * Mirrors Figma 316:77288 / 316:77652. Hooks the address-book lookup
 * (libs/contact-lookup → contact.lookup) + hub.invite APIs.
 */
const { lookupContacts, suggestionRows } = require("libs/contact-lookup");
const skeletonModule = require("./skeleton");
const { ROLES, DEFAULT_ROLE_IDS, computePrivilege, summarizeRoles } =
  skeletonModule;

class __invite_popup extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._onSearchInput = this._onSearchInput.bind(this);
    this._onWorkspaceInput = this._onWorkspaceInput.bind(this);
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
    // Pre-seed the first workspace row when the caller opened the popup from a
    // specific workspace (the kebab "Invite" on a hub passes hub_id + hub_name).
    // Require BOTH the id and the name: seeding only the id would enable Send
    // while the input shows an empty placeholder. Skip the personal home
    // (Visitor.id) — it is not an invitable workspace, so callers that fall back
    // to it (e.g. the topbar with no current workspace) still get the picker.
    const seedId =
      opt.hub_id && opt.hub_name && String(opt.hub_id) !== String(Visitor.id)
        ? opt.hub_id
        : null;
    this._workspaces = [
      {
        hub_id: seedId,
        name: seedId ? opt.hub_name : "",
        roleIds: DEFAULT_ROLE_IDS.slice(),
      },
    ];
    this._suggestions = [];
    this._workspacesCache = null;
    this._workspaceSearchTimers = {};
    this._partRefs = {
      workspaceInputs: {},
      workspaceSuggestions: {},
      roleLabels: {},
      roleOptions: {},
      workspaceRows: {},
    };
    this._nextRowIdx = 1;
  }

  onDomRefresh() {
    this.feed(skeletonModule(this));
    this.el.dataset.state = 1;
    if (this.parent && this.parent.el) {
      this._wrapperEl = this.parent.el;
      this._wrapperEl.dataset.state = "open";
      this._wrapperEl.dataset.overlay = "blur";
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
    // Delegated click handler for the per-row × button. Two reasons to
    // delegate at the document level with capture-phase:
    //   1. The framework wires `service:` click handlers during initial
    //      feed() but not on rows appended via _workspacesBox.append() —
    //      so per-row handlers don't fire.
    //   2. Some inner widget on the bubble path calls stopPropagation,
    //      so even attaching at the popup root caught the event only
    //      occasionally. Capture phase fires before any bubble-stop.
    this._onRowRemoveClick = (e) => {
      const target =
        e.target.closest && e.target.closest(".invite-popup__row-remove");
      if (!target) return;
      if (this.el && !this.el.contains(target)) return;
      const idx = parseInt(target.dataset.idx, 10);
      if (!isNaN(idx)) this._removeWorkspaceRow(idx);
    };
    document.addEventListener("click", this._onRowRemoveClick, true);
  }

  onBeforeDestroy() {
    if (this._wrapperEl) {
      this._wrapperEl.dataset.state = "closed";
      delete this._wrapperEl.dataset.overlay;
    }
    if (this._dismissDropdowns) {
      document.removeEventListener("mousedown", this._dismissDropdowns);
    }
    if (this._onRowRemoveClick) {
      document.removeEventListener("click", this._onRowRemoveClick, true);
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

  _maybeCloseDropdowns(target) {
    Object.entries(this._partRefs.roleOptions).forEach(([idx, optBox]) => {
      const label = this._partRefs.roleLabels[idx]?.el;
      const cell = label?.parentElement;
      if (
        optBox &&
        optBox.el?.dataset.state === "1" &&
        cell &&
        !cell.contains(target)
      ) {
        optBox.el.dataset.state = 0;
      }
    });
    Object.entries(this._partRefs.workspaceSuggestions).forEach(
      ([idx, sugBox]) => {
        const inputEl = this._partRefs.workspaceInputs[idx]?.el;
        if (
          sugBox &&
          sugBox.el?.dataset.state === "1" &&
          inputEl &&
          !inputEl.contains(target) &&
          !sugBox.el.contains(target)
        ) {
          sugBox.el.dataset.state = 0;
        }
      },
    );
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

  _closePopup() {
    if (this.parent && _.isFunction(this.parent.clear)) {
      this.parent.clear();
    } else {
      this.softDestroy();
    }
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
    } else if (pn === "workspaces") {
      this._workspacesBox = child;
    } else if (pn.startsWith("workspace-input:")) {
      const idx = pn.split(":")[1];
      this._partRefs.workspaceInputs[idx] = child;
      // Same late-<input> problem as the email field; this one used to paper
      // over it with a 50ms timer. The widget's own "input:ready" is the real
      // signal, so use it here too.
      this._whenInputReady(child, (inputEl) => {
        inputEl.addEventListener("input", (e) =>
          this._onWorkspaceInput(idx, e),
        );
        inputEl.addEventListener("focus", () => {
          this._fetchWorkspaces(idx, inputEl.value.trim());
        });
        inputEl.addEventListener("click", () => {
          this._fetchWorkspaces(idx, inputEl.value.trim());
        });
      });
    } else if (pn.startsWith("workspace-suggestions:")) {
      const idx = pn.split(":")[1];
      this._partRefs.workspaceSuggestions[idx] = child;
    } else if (pn.startsWith("role-label:")) {
      const idx = pn.split(":")[1];
      this._partRefs.roleLabels[idx] = child;
    } else if (pn.startsWith("role-options:")) {
      const idx = pn.split(":")[1];
      this._partRefs.roleOptions[idx] = child;
      child.el.addEventListener("mousedown", (e) => {
        const opt =
          e.target.closest(".invite-popup__role-option") ||
          e.target.closest(".inner")?.parentElement;
        if (!opt || !opt.dataset.id) return;
        e.stopPropagation();
        e.preventDefault();
        this._pickRole(opt.dataset.idx, opt.dataset.id);
      });
    } else if (pn.startsWith("workspace-row:")) {
      const idx = pn.split(":")[1];
      this._partRefs.workspaceRows[idx] = child;
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
  _fetchSuggestions(value) {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    // Each keystroke supersedes the one before: a slow answer that comes
    // back after the user typed on must not repopulate the dropdown.
    const seq = (this._searchSeq = (this._searchSeq || 0) + 1);
    this._searchTimer = setTimeout(async () => {
      const rows = await lookupContacts(this, {
        value,
        exclude: this._invitees.map((i) => i.email),
        limit: 8,
      });
      if (seq !== this._searchSeq) return;
      this._showSuggestions(rows);
    }, 250);
  }

  // `rows` are normalized lookup rows — self and already-picked addresses
  // are filtered out upstream.
  _showSuggestions(rows) {
    this._suggestions = rows;
    if (!this._suggestionsBox) return;
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
      this._suggestionsBox.el.dataset.state = 0;
      this._suggestionsBox.clear();
    }
  }

  _addInvitee(data, opt) {
    if (!data || !data.email) return;
    const ownEmail = (Visitor.profile() || {}).email;
    if (ownEmail && data.email.toLowerCase() === ownEmail.toLowerCase()) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_SELF || "You cannot invite yourself.",
      );
      return;
    }
    if (this._invitees.find((i) => i.email === data.email)) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_DUPLICATE || "This email is already in the list.",
      );
      return;
    }
    this._invitees.push(data);
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
    const hasWorkspace = Object.values(this._workspaces).some(
      (w) => w && w.hub_id,
    );
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
    for (const tok of tokens) {
      if (__invite_popup._EMAIL_RE.test(tok)) {
        this._addInvitee({ email: tok });
      } else {
        leftovers.push(tok);
      }
    }
    if (inputEl) inputEl.value = leftovers.join(" ");
    if (leftovers.length) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_INVALID || "Please enter a valid email address.",
      );
    }
  }

  /* ── Workspace search ─────────────────────────────────────── */

  _onWorkspaceInput(idx, e) {
    this._fetchWorkspaces(idx, (e.target.value || "").trim());
  }

  /**
   * Show all workspaces user can invite into (privilege >= 31 = admin/owner).
   * desk.home returns hubs with privilege bitmask per workspace.
   * `value` (optional) narrows the list by filename match.
   */
  _fetchWorkspaces(idx, value) {
    clearTimeout(this._workspaceSearchTimers[idx]);
    this._workspaceSearchTimers[idx] = setTimeout(
      async () => {
        let list = this._workspacesCache;
        if (!list) {
          const data = await this.fetchService(
            {
              service: SERVICE.desk.home,
              hub_id: Visitor.id,
              type: _a.hub,
            },
            { async: 1 },
          );
          list = _.isArray(data) ? data : [];
          this._workspacesCache = list;
        }
        const ADMIN = 0b0011111;
        // Areas that are NOT user-invitable workspaces:
        //   - personal: each user's home space, owned by them
        //   - system / pool / pool/dmz / template / dummy: infra
        //   - dmz / dmz-public / dmz-private: one-shot share buckets, not workspaces
        // Everything else (private, restricted, share, public, limited) is a
        // collaborative workspace the admin can invite into. Earlier this
        // filter excluded `private` too, which silently dropped most users'
        // workspaces — `private` and `restricted` are both valid areas and
        // represent the same UX concept.
        const NON_INVITEABLE = new Set([
          _a.personal,
          "system",
          "pool",
          "pool/dmz",
          "template",
          "dummy",
          "dmz",
          "dmz-public",
          "dmz-private",
        ]);
        const inviteable = list.filter((w) => {
          if (((w.privilege | 0) & ADMIN) !== ADMIN) return false;
          const area = w.area || "";
          if (NON_INVITEABLE.has(area)) return false;
          return true;
        });
        const filtered = value
          ? inviteable.filter((w) =>
              (w.filename || w.name || "")
                .toLowerCase()
                .includes(value.toLowerCase()),
            )
          : inviteable;
        this._showWorkspaceSuggestions(idx, filtered);
      },
      value ? 200 : 0,
    );
  }

  _showWorkspaceSuggestions(idx, list) {
    const sugBox = this._partRefs.workspaceSuggestions[idx];
    if (!sugBox) return;
    const picked = this._pickedHubIds(idx);
    const dedup = list.filter((row) => {
      const id = String(row.hub_id || row.id || row.actual_hub_id || "");
      return id && !picked.has(id);
    });
    if (!dedup.length) {
      this._hideWorkspaceSuggestions(idx);
      return;
    }
    const pfx = this.fig.family;
    const items = dedup.map((row) =>
      Skeletons.Note({
        className: `${pfx}__workspace-option`,
        content: row.filename || row.name,
        dataset: {
          idx,
          hub_id: row.hub_id || row.id || row.actual_hub_id,
          name: row.filename || row.name,
        },
        service: "pick-workspace",
        uiHandler: [this],
      }),
    );
    sugBox.feed(items);
    sugBox.el.dataset.state = 1;
  }

  _pickedHubIds(excludeIdx) {
    const set = new Set();
    Object.entries(this._workspaces).forEach(([k, w]) => {
      if (!w || !w.hub_id) return;
      if (excludeIdx != null && String(k) === String(excludeIdx)) return;
      set.add(String(w.hub_id));
    });
    return set;
  }

  _hideWorkspaceSuggestions(idx) {
    const sugBox = this._partRefs.workspaceSuggestions[idx];
    if (sugBox) {
      sugBox.el.dataset.state = 0;
      sugBox.clear();
    }
  }

  /* ── Role / workspace row management ──────────────────────── */

  _toggleRoleDropdown(idx) {
    const opt = this._partRefs.roleOptions[idx];
    if (!opt) return;
    const cur = opt.el.dataset.state === "1";
    Object.values(this._partRefs.roleOptions).forEach(
      (o) => (o.el.dataset.state = 0),
    );
    opt.el.dataset.state = cur ? 0 : 1;
  }

  _pickRole(idx, roleId) {
    const role = ROLES.find((r) => r.id === roleId);
    if (!role) return;
    const wsIdx = this._workspaceIdxByRowIdx(idx);
    if (wsIdx == null) return;
    const ws = this._workspaces[wsIdx];
    if (!ws.roleIds) ws.roleIds = [];
    ws.roleIds = [roleId];

    const optsBox = this._partRefs.roleOptions[idx];
    if (optsBox) {
      optsBox.el
        .querySelectorAll(".invite-popup__role-option")
        .forEach((node) => {
          node.dataset.checked = node.dataset.id === roleId ? 1 : 0;
        });
      optsBox.el.dataset.state = 0;
    }
    if (this._partRefs.roleLabels[idx]) {
      this._partRefs.roleLabels[idx].set({
        content: summarizeRoles(ws.roleIds),
      });
    }
  }

  _pickWorkspace(idx, hub_id, name) {
    const wsIdx = this._workspaceIdxByRowIdx(idx);
    if (wsIdx == null) return;
    if (this._pickedHubIds(wsIdx).has(String(hub_id))) {
      // Inline error, not Wm.alert: Wm.alert replaces __wrapperModal's
      // content with a window_info dialog, which destroys this popup.
      this._setWorkspaceError(
        LOCALE.INVITE_WORKSPACE_ALREADY_SELECTED ||
          "This workspace is already selected.",
      );
      this._hideWorkspaceSuggestions(idx);
      return;
    }
    this._workspaces[wsIdx].hub_id = hub_id;
    this._workspaces[wsIdx].name = name;
    const inputEl =
      this._partRefs.workspaceInputs[idx]?.el?.querySelector("input");
    if (inputEl) inputEl.value = name;
    this._hideWorkspaceSuggestions(idx);
    this._setWorkspaceError(null);
    this._refreshSendState();
  }

  _workspaceIdxByRowIdx(rowIdx) {
    return parseInt(rowIdx, 10);
  }

  _addWorkspaceRow() {
    if (!this._workspacesBox) return;
    const hasEmpty = Object.values(this._workspaces).some(
      (w) => w && !w.hub_id,
    );
    if (hasEmpty) {
      // Inline error, not Wm.alert: Wm.alert replaces __wrapperModal's
      // content with a window_info dialog, which destroys this popup.
      this._setWorkspaceError(
        LOCALE.INVITE_WORKSPACE_PICK_FIRST ||
          "Please pick a workspace before adding another.",
      );
      return;
    }
    const idx = this._nextRowIdx++;
    this._workspaces[idx] = {
      hub_id: null,
      name: "",
      roleIds: DEFAULT_ROLE_IDS.slice(),
    };
    const row = skeletonModule.buildWorkspaceRow(this, idx);
    this._workspacesBox.append(row);
  }

  _removeWorkspaceRow(idx) {
    if (idx == null || isNaN(idx)) return;
    const row = this._partRefs.workspaceRows[idx];
    if (row && _.isFunction(row.goodbye)) {
      row.goodbye();
    } else if (row && row.el) {
      row.el.remove();
    } else {
      // Fallback when the framework didn't register the row (which is
      // exactly what's happening for rows appended after initial render):
      // strip the matching DOM node by data-idx so the click still
      // succeeds even without a widget reference.
      const dom =
        this.el &&
        this.el.querySelector(
          `.invite-popup__workspace-row[data-idx="${idx}"]`,
        );
      if (dom) dom.remove();
    }
    delete this._partRefs.workspaceRows[idx];
    delete this._partRefs.workspaceInputs[idx];
    delete this._partRefs.workspaceSuggestions[idx];
    delete this._partRefs.roleLabels[idx];
    delete this._partRefs.roleOptions[idx];
    delete this._workspaces[idx];
    this._refreshSendState();
  }

  _sendInvitation() {
    this._addPendingEmailFromInput();
    if (!this._invitees.length) {
      this._setEmailError(
        LOCALE.INVITE_EMAIL_INVALID || "Please enter a valid email address.",
      );
      return;
    }

    const emails = this._invitees.map((i) => i.email || i.id || i.uid);
    const assignments = Object.values(this._workspaces)
      .filter((w) => w && w.hub_id)
      .map((w) => ({
        hub_id: w.hub_id,
        permission: computePrivilege(w.roleIds || DEFAULT_ROLE_IDS),
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

    Promise.all(promises)
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
        this._closePopup();
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

      case "search-workspace":
        return;

      case "toggle-role":
        return this._toggleRoleDropdown(this._get(cmd, "idx"));

      case "pick-role":
        return this._pickRole(this._get(cmd, "idx"), this._get(cmd, "id"));

      case "pick-workspace":
        return this._pickWorkspace(
          this._get(cmd, "idx"),
          this._get(cmd, "hub_id"),
          this._get(cmd, "name"),
        );

      case "add-workspace-role":
        return this._addWorkspaceRow();

      case "remove-workspace-row":
        return this._removeWorkspaceRow(parseInt(this._get(cmd, "idx"), 10));

      case "send-invitation":
        return this._sendInvitation();
    }
  }
}

__invite_popup._EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

__invite_popup.initClass();
module.exports = __invite_popup;
