/**
 * Invite popup widget
 * Mirrors Figma 316:77288 / 316:77652. Hooks the existing
 * drumate.my_contacts (autocomplete) + hub.add_contributors (invite) APIs.
 */
const skeletonModule = require("./skeleton");
const { ROLES, DEFAULT_ROLE_IDS, computePrivilege, summarizeRoles } = skeletonModule;

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
    // Don't seed hub_id from opt: the workspace input renders empty, so a
    // pre-seeded id would make the Send button look enabled while the user
    // sees an empty placeholder. Force an explicit pick.
    this._workspaces = [
      {
        hub_id: null,
        name: "",
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
    // focusout bubbles (blur does not) so the listener survives Entry re-renders.
    this._onFocusOut = (e) => {
      const inputEl = this._emailInput?.el.querySelector("input");
      if (!inputEl || e.target !== inputEl) return;
      const next = e.relatedTarget;
      if (next && this._suggestionsBox && this._suggestionsBox.el.contains(next)) return;
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
      const target = e.target.closest && e.target.closest(".invite-popup__row-remove");
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
  }

  _maybeCommitEmail(target) {
    const inputEl = this._emailInput?.el.querySelector("input");
    if (!inputEl) return;
    if (this._emailInput.el.contains(target)) return;
    if (this._suggestionsBox && this._suggestionsBox.el.contains(target)) return;
    this._addPendingEmailFromInput();
    this._refreshSendState();
  }

  _maybeCloseDropdowns(target) {
    Object.entries(this._partRefs.roleOptions).forEach(([idx, optBox]) => {
      const label = this._partRefs.roleLabels[idx]?.el;
      const cell = label?.parentElement;
      if (optBox && optBox.el?.dataset.state === "1" && cell && !cell.contains(target)) {
        optBox.el.dataset.state = 0;
      }
    });
    Object.entries(this._partRefs.workspaceSuggestions).forEach(([idx, sugBox]) => {
      const inputEl = this._partRefs.workspaceInputs[idx]?.el;
      if (sugBox && sugBox.el?.dataset.state === "1" && inputEl && !inputEl.contains(target) && !sugBox.el.contains(target)) {
        sugBox.el.dataset.state = 0;
      }
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

  _closePopup() {
    if (this.parent && _.isFunction(this.parent.clear)) {
      this.parent.clear();
    } else {
      this.softDestroy();
    }
  }

  onPartReady(child, pn) {
    if (pn === "email-chips") {
      this._chipsBox = child;
    } else if (pn === "email-input") {
      this._emailInput = child;
      const inputEl = child.el.querySelector("input");
      if (inputEl) {
        inputEl.setAttribute("autocomplete", "off");
        inputEl.addEventListener("input", this._onSearchInput);
        inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !inputEl.value && this._invitees.length) {
            this._removeInvitee(this._invitees.length - 1);
          }
        });
      }
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
      const bind = () => {
        const inputEl = child.el.querySelector("input");
        if (!inputEl) return;
        inputEl.addEventListener("input", (e) => this._onWorkspaceInput(idx, e));
        inputEl.addEventListener("focus", () => {
          this._fetchWorkspaces(idx, inputEl.value.trim());
        });
        inputEl.addEventListener("click", () => {
          this._fetchWorkspaces(idx, inputEl.value.trim());
        });
      };
      bind();
      if (!child.el.querySelector("input")) setTimeout(bind, 50);
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
        const opt = e.target.closest(".invite-popup__role-option")
          || e.target.closest(".inner")?.parentElement;
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

  _fetchSuggestions(value) {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.fetchService(
        {
          service: SERVICE.drumate.my_contacts,
          status: "paper",
          value: `${value}%`,
          filter: this._invitees.map((i) => i.email),
          hub_id: Visitor.id,
        },
        { async: 1 }
      ).then((data) => {
        this._showSuggestions(_.isArray(data) ? data : []);
      });
    }, 250);
  }

  _showSuggestions(data) {
    this._suggestions = data;
    if (!this._suggestionsBox) return;
    const ownEmail = ((Visitor.profile() || {}).email || "").toLowerCase();
    const filtered = data.filter((row) => row.email && row.email.toLowerCase() !== ownEmail);
    if (!filtered.length) {
      this._hideSuggestions();
      return;
    }
    const items = filtered.map((row) => {
      const fullName = [row.firstname, row.lastname].filter(Boolean).join(" ") || row.email;
      return Skeletons.Box.X({
        className: `${this.fig.family}__suggestion-item`,
        dataset: { email: row.email, uid: row.id || row.uid || "" },
        service: "pick-suggestion",
        uiHandler: [this],
        kids: [Skeletons.Note({ content: `${fullName} <${row.email}>` })],
      });
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
      this._setEmailError(LOCALE.INVITE_EMAIL_SELF || "You cannot invite yourself.");
      return;
    }
    if (this._invitees.find((i) => i.email === data.email)) {
      this._setEmailError(LOCALE.INVITE_EMAIL_DUPLICATE || "This email is already in the list.");
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
      const label = inv.firstname || inv.lastname
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
    const hasPendingEmail = inputVal && __invite_popup._splitEmails(inputVal).length > 0;
    const hasWorkspace = Object.values(this._workspaces).some((w) => w && w.hub_id);
    this._sendBtn.el.dataset.state = (hasInvitee || hasPendingEmail) && hasWorkspace ? 1 : 0;
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
      this._setEmailError(LOCALE.INVITE_EMAIL_INVALID || "Please enter a valid email address.");
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
    this._workspaceSearchTimers[idx] = setTimeout(async () => {
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
        "system", "pool", "pool/dmz", "template", "dummy",
        "dmz", "dmz-public", "dmz-private",
      ]);
      const inviteable = list.filter((w) => {
        if (((w.privilege | 0) & ADMIN) !== ADMIN) return false;
        const area = w.area || "";
        if (NON_INVITEABLE.has(area)) return false;
        return true;
      });
      const filtered = value
        ? inviteable.filter((w) =>
          (w.filename || w.name || "").toLowerCase().includes(value.toLowerCase()),
        )
        : inviteable;
      this._showWorkspaceSuggestions(idx, filtered);
    }, value ? 200 : 0);
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
        dataset: { idx, hub_id: row.hub_id || row.id || row.actual_hub_id, name: row.filename || row.name },
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
    Object.values(this._partRefs.roleOptions).forEach((o) => (o.el.dataset.state = 0));
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
      optsBox.el.querySelectorAll(".invite-popup__role-option").forEach((node) => {
        node.dataset.checked = node.dataset.id === roleId ? 1 : 0;
      });
      optsBox.el.dataset.state = 0;
    }
    if (this._partRefs.roleLabels[idx]) {
      this._partRefs.roleLabels[idx].set({ content: summarizeRoles(ws.roleIds) });
    }
  }

  _pickWorkspace(idx, hub_id, name) {
    const wsIdx = this._workspaceIdxByRowIdx(idx);
    if (wsIdx == null) return;
    if (this._pickedHubIds(wsIdx).has(String(hub_id))) {
      // Inline error, not Wm.alert: Wm.alert replaces __wrapperModal's
      // content with a window_info dialog, which destroys this popup.
      this._setWorkspaceError(
        LOCALE.INVITE_WORKSPACE_ALREADY_SELECTED
        || "This workspace is already selected.",
      );
      this._hideWorkspaceSuggestions(idx);
      return;
    }
    this._workspaces[wsIdx].hub_id = hub_id;
    this._workspaces[wsIdx].name = name;
    const inputEl = this._partRefs.workspaceInputs[idx]?.el?.querySelector("input");
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
        LOCALE.INVITE_WORKSPACE_PICK_FIRST
        || "Please pick a workspace before adding another.",
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
      const dom = this.el && this.el.querySelector(
        `.invite-popup__workspace-row[data-idx="${idx}"]`
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
      this._setEmailError(LOCALE.INVITE_EMAIL_INVALID || "Please enter a valid email address.");
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
        LOCALE.INVITE_WORKSPACE_REQUIRED || "Please select at least one workspace.",
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
          Wm.alert((errored[0] && (errored[0].reason || errored[0].error))
            || LOCALE.TRY_AGAIN);
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
          Wm.alert(LOCALE.INVITE_PARTIAL_FAILED.format(
            flat.length - failed.length, failed.length));
        } else {
          Wm.alert(LOCALE.INVITATION_SENT_SUCCESSFULLY);
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
