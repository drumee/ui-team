/**
 * Invite popup widget
 * Mirrors Figma 316:77288 / 316:77652. Hooks the address-book lookup
 * (libs/contact-lookup → contact.lookup) + hub.invite APIs.
 */
const { lookupContacts, suggestionRows } = require("libs/contact-lookup");
const { isSeatLimitReply, showSeatLimitReached } = require("libs/billing");
// The area-tinted folder glyph the desk topbar's workspace switcher draws.
// Returns an HTML STRING, not a sprite name — see its use below.
const folderIcon = require("media/grid/template/folder");
// The desk's own Internal/External/Public/Personal split — see the lib on
// why the rule is shared rather than restated here.
const { groupWorkspaces } = require("libs/workspace-groups");
const skeletonModule = require("./skeleton");
const { ROLES, DEFAULT_ROLE_IDS, computePrivilege, summarizeRoles, workspaceGlyph } =
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
        // Tints the picked-workspace glyph. Only the kebab "Invite" path
        // seeds a row at all, and it is the only caller that can know this —
        // see media/interact.openInvitePopup. Absent is fine: the folder
        // template falls back to its own base fill.
        area: seedId ? opt.hub_area || "" : "",
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
      workspaceIcons: {},
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
      delete this._wrapperEl.dataset.inviteOverlay;
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
    } else if (pn.startsWith("workspace-icon:")) {
      this._partRefs.workspaceIcons[pn.split(":")[1]] = child;
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

  /* ── Workspace search ─────────────────────────────────────── */

  _onWorkspaceInput(idx, e) {
    // The field no longer reads as the picked workspace, so the glyph must go.
    // NOTE it only clears the GLYPH — _workspaces[idx].hub_id keeps the last
    // pick until a new one replaces it, which is how this has always behaved.
    this._renderWorkspaceIcon(idx, 0);
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
          // Only on a REAL round trip. Every later call is answered from
          // _workspacesCache in the same tick, and a spinner that appears and
          // vanishes within one frame just makes the list flicker on open.
          this._setBoxLoading(this._partRefs.workspaceSuggestions[idx], 1);
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
    this._setBoxLoading(sugBox, 0);
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
    // Built to match the desk topbar's workspace switcher row
    // (desk-module-topbar__ws-item): glyph + name, same geometry, same
    // colours. These are the same workspaces that list offers, so a picker
    // that renders them as bare text read as a different component.
    const rowFor = (row) => {
      const name = row.filename || row.name || "";
      return Skeletons.Box.X({
        className: `${pfx}__workspace-option`,
        service: "pick-workspace",
        uiHandler: [this],
        dataset: {
          idx,
          hub_id: row.hub_id || row.id || row.actual_hub_id,
          name,
          area: row.area || "",
        },
        // The ROW owns the click, its kids must not — the same pairing the
        // switcher uses. triggerHandlers returns early on an active:0 view,
        // so a tap on the glyph or the label falls through to this Box, which
        // is what carries `service`.
        kidsOpt: { active: 0 },
        kids: [
          // Element + content, NOT Image.Svg + ico: media/grid/template/folder
          // emits MARKUP, and handing that to `ico` builds
          // `<use href="#<markup>">`, which resolves to nothing and draws a
          // broken oversized glyph. The topbar row carries the same warning.
          Skeletons.Element({
            className: `${pfx}__workspace-option-icon ${row.area || ""}`,
            content: folderIcon({
              // `|| ""` — see the skeleton's workspaceGlyph: an undefined area
              // reaches the markup as a literal `folder-shape undefined`.
              area: row.area || "",
              filetype: row.filetype === _a.folder ? _a.folder : _a.hub,
              role: row.filetype === _a.folder ? "" : "desk",
              widgetId: _.uniqueId("invite-ws-icon-"),
              isAttachment: 1,
            }),
          }),
          Skeletons.Note({
            className: `${pfx}__workspace-option-name`,
            content: name,
          }),
        ],
      });
    };

    // GROUPED BY THE DESK'S OWN RULE, not a second one written here — the same
    // call the topbar switcher and the phone's workspace sheet make. An
    // INTERNAL workspace and one shared with people outside the organisation
    // are different answers to "who am I inviting them into", and this picker
    // said nothing about which was which.
    //
    // GROUPED AFTER THE DEDUP above, so a workspace already chosen on another
    // row is gone before the buckets are counted — groupWorkspaces drops empty
    // groups, which is what makes a heading leave with its last row.
    //
    // Nothing is ever dropped: a row matching no rule keeps the generic
    // "Workspaces" heading at the end. That matters more here than in the
    // switcher — a workspace missing from this list cannot be invited into at
    // all.
    const section = (label, group) =>
      group.length
        ? [
            Skeletons.Note({
              className: `${pfx}__workspace-section`,
              content: label,
            }),
            ...group.map(rowFor),
          ]
        : [];
    const items = groupWorkspaces(dedup).flatMap((g) =>
      section(g.label, g.rows),
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
      this._setBoxLoading(sugBox, 0);
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

  /**
   * Draw (or clear) the glyph sitting over one row's workspace field.
   *
   * @param {String|Number} idx  the ROW index (not the model index)
   * @param {Number} on 1 to show the picked workspace's glyph, 0 to clear it.
   *   Cleared while the user types: the text in the field no longer names the
   *   workspace the glyph stands for, and a glyph that outlives its label
   *   claims a pick that is no longer on screen.
   */
  _renderWorkspaceIcon(idx, on) {
    const slot = this._partRefs.workspaceIcons[idx];
    if (!slot || !slot.el) return;
    const wsIdx = this._workspaceIdxByRowIdx(idx);
    const ws = wsIdx == null ? null : this._workspaces[wsIdx];
    if (!on || !ws || !ws.hub_id) {
      slot.el.dataset.state = 0;
      return;
    }
    // innerHTML DIRECTLY, and deliberately not slot.set()/slot.feed().
    //
    // Skeletons.Element is ui-core's `blank` widget, whose whole rendering is
    //     onDomRefresh() { if (content) this.el.innerHTML = content; }
    // — content is written ONCE at mount and the model is never re-read. It
    // has no set() either: in all of ui-core only text, text/editable and
    // entry/input define one, and Backbone.View.prototype.set is undefined.
    // An earlier version called slot.set() behind an _.isFunction guard, so
    // the glyph silently never rendered on the only path that matters (pick a
    // workspace on a row that had none when it was built) while data-state
    // still said it was showing — a visible empty box.
    //
    // feed() is not the alternative: that appends child WIDGETS, and this is
    // a markup string. Assigning innerHTML is exactly what the widget does to
    // itself, and assignment replaces, so re-picking retints rather than
    // stacking a second glyph.
    slot.el.innerHTML = workspaceGlyph(ws);
    slot.el.dataset.state = 1;
  }

  _pickWorkspace(idx, hub_id, name, area) {
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
    // Carried on the row's dataset by _showWorkspaceSuggestions, purely so the
    // glyph over the field can be tinted the same as the row that was clicked.
    this._workspaces[wsIdx].area = area || "";
    const inputEl =
      this._partRefs.workspaceInputs[idx]?.el?.querySelector("input");
    if (inputEl) inputEl.value = name;
    this._renderWorkspaceIcon(idx, 1);
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
    delete this._partRefs.workspaceIcons[idx];
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
          this._get(cmd, "area"),
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
