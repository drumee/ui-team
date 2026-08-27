// File-thread access lifecycle for the folder window — the single owner of
// proactive revocation and recovery for BOTH file-thread presentations (the
// in-place Files-tab scope and the wide Chat-tab side panel). Mixed onto
// __window_folder via Object.assign, same as meeting-desc-editor.
//
// The server announces every durable file-thread access transition on
// `channel.file_thread_access_changed` (server-team/service/private/media.js),
// carrying { hub_id, file_nid, file_thread_id, lineage_id, operation_id, state,
// reason, access_revision, actor, filename }. `state` is "revoked" or
// "restored"; `access_revision` is monotonic per lineage/thread and is the ONLY
// ordering token — never a local counter.
//
// Lifecycle for a revoke that hits the open thread:
//   1. freeze synchronously (before any popup or async work),
//   2. show exactly one warning naming the captured file + actor,
//   3. OK or the 5-second timeout run the SAME idempotent finalizer,
//   4. finalizer tears the scoped state down and returns the window to
//      # General.
// Recovery only refreshes navigation after the server revalidates; it never
// auto-opens a thread and never recreates history client-side.

// The popup dismisses itself after this long when the user does not click OK.
const REVOKE_NOTICE_MS = 5000;

module.exports = {
  // ── access state ────────────────────────────────────────────────────────
  // One record per thread identity: { state, revision, fileNid, fileThreadId }.
  // Keyed on the stable server identity (file_thread_id or lineage_id, with the
  // file nid as the last resort) so a cross-hub rebind to a new nid still lands
  // on the same record.
  _ftAccessKey(payload = {}) {
    const hub = `${payload.hub_id || ""}`;
    const id =
      `${payload.file_thread_id || ""}` ||
      `${payload.lineage_id || ""}` ||
      `${payload.file_nid || ""}`;
    return id ? `${hub}:${id}` : "";
  },

  _ftAccessState(key) {
    if (!this._ftAccess) this._ftAccess = {};
    if (!this._ftAccess[key]) {
      this._ftAccess[key] = { state: "active", revision: -1 };
    }
    return this._ftAccess[key];
  },

  // Accept a transition only when it is strictly newer than the highest
  // revision already applied for this identity. Duplicate echoes and
  // out-of-order deliveries (an older revoke arriving after a newer restore)
  // are dropped here — this is what makes the whole lifecycle replay-safe.
  _ftAcceptRevision(key, payload = {}) {
    const st = this._ftAccessState(key);
    const rev = Number(payload.access_revision);
    // A payload without a usable revision cannot be ordered against anything.
    // Treat it as newer only while nothing has been accepted yet, so a legacy
    // or malformed event can still perform the first transition but can never
    // overwrite a properly-ordered one.
    if (!isFinite(rev)) return st.revision < 0;
    if (rev <= st.revision) return false;
    st.revision = rev;
    return true;
  },

  // ── event interception ──────────────────────────────────────────────────
  // Called from __window_folder.handleWsEvent BEFORE super, so lifecycle state
  // is secured before the base handler repaints the file grid. Returns true
  // when the event was a file-thread access transition (the base handler still
  // runs afterwards — it owns the grid, we own the thread).
  onFileThreadAccessChanged(payload = {}) {
    // Only our own workspace. actualNode() is what the rest of the window uses
    // for cross-hub/symlink correctness.
    const mine = (this.actualNode && this.actualNode()) || {};
    const myHub =
      mine.hub_id || this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    if (payload.hub_id && myHub && `${payload.hub_id}` !== `${myHub}`) return;

    const key = this._ftAccessKey(payload);
    if (!key) return;
    if (!this._ftAcceptRevision(key, payload)) return;

    const st = this._ftAccessState(key);
    if (payload.state === "revoked") {
      // A file that left is locked, not merely frozen: the thread closes back
      // to General and refuses to reopen until the file returns. Recorded as
      // "revoked" so _ftIsFileRevoked — which gates every path that opens a
      // thread — refuses a stale card, rail row, or cross-window launch too.
      //
      // move_back clears it through _onFileThreadRestored, which is the only
      // thing that can: nothing local may unlock a thread the server still
      // considers away.
      //
      // orphaned is different and keeps the frozen-but-readable presentation.
      // The file was deleted outright, so there is no return, and locking the
      // thread would put the team's own messages permanently out of reach.
      st.state = this._ftIsOrphanReason(payload.reason) ? "away" : "revoked";
      st.fileNid = `${payload.file_nid || ""}`;
      st.fileThreadId = `${payload.file_thread_id || ""}`;
      if (this._ftIsOrphanReason(payload.reason)) {
        return this._onFileThreadMovedAway(payload, key);
      }
      return this._onFileThreadRevoked(payload, key);
    }
    if (payload.state === "restored") {
      st.state = "active";
      st.fileNid = `${payload.file_nid || ""}`;
      st.fileThreadId = `${payload.file_thread_id || ""}`;
      return this._onFileThreadRestored(payload, key);
    }
    if (payload.state === "orphaned") {
      st.state = "away";
      st.fileNid = `${payload.file_nid || ""}`;
      st.fileThreadId = `${payload.file_thread_id || ""}`;
      return this._onFileThreadMovedAway(payload, key);
    }
  },

  // The one reason a thread stays open after losing its file: the file was
  // deleted, so it is never coming back, and locking the thread would put the
  // team's own messages permanently out of reach. Everything else — a move
  // included — locks and returns to General.
  _ftIsOrphanReason(reason) {
    return `${reason || ""}` === "orphaned";
  },

  // Is this revoked file the one currently mounted, in either presentation?
  // The wide panel stores its identity on the DOM (panel.el.dataset.ftNid); the
  // in-place scope lives on _scopedFileNid.
  _ftIsMountedFile(fileNid) {
    const nid = `${fileNid || ""}`;
    if (!nid) return false;
    if (`${this._scopedFileNid || ""}` === nid) return true;
    const panel = this._fileThreadPanelPart;
    if (
      panel &&
      panel.el &&
      !(panel.isDestroyed && panel.isDestroyed()) &&
      panel.el.dataset.open === "1" &&
      `${panel.el.dataset.ftNid || ""}` === nid
    ) {
      return true;
    }
    return false;
  },

  // ── revocation ──────────────────────────────────────────────────────────
  _onFileThreadRevoked(payload = {}, key) {
    // Mounted cards for this file become unclickable everywhere, even when the
    // revoked thread is not the one currently open.
    this._ftInvalidateCards(payload.file_nid);
    // The thread list is now stale in both the rail and the header dropdown.
    this._ftBumpThreadRequests();

    if (!this._ftIsMountedFile(payload.file_nid)) {
      // Not on screen — refresh navigation only. No freeze, no popup.
      return this._ftRefreshThreadNavigation();
    }

    // Capture identity BEFORE anything can repaint it away.
    const captured = {
      key,
      fileNid: `${payload.file_nid || ""}`,
      fileThreadId: `${payload.file_thread_id || ""}`,
      revision: Number(payload.access_revision),
      filename: this._ftCapturedFilename(payload),
      actor: this._ftActorName(payload.actor),
    };

    // The person who moved or deleted the file is not told about it: they just
    // did it, and the notice would only name them to themselves. Everything
    // else is identical to any other viewer — writes refused, thread locked,
    // window back to General — so the announcement is the only difference.
    //
    // The event reaches them because it is addressed to every socket in the
    // workspace (entity_sockets, media.js), which has no notion of who acted;
    // the actor id it carries is what makes the distinction possible here.
    const self = this._ftIsSelfActor(payload.actor);

    // 1. Freeze synchronously. Nothing below this line may run before the
    //    guards are in place — the popup renders async, and the user still has
    //    keyboard focus in the composer until it does.
    //
    //    The blur half only exists to make a dead thread read as inert BEHIND
    //    the notice, so the actor takes writes-only: with no notice to explain
    //    it, blurring would be a flash of unexplained grey on the way to
    //    General.
    this._ftFreeze(captured.fileNid, !self);

    // 2. Exactly one warning per accepted revoke. A second event for the same
    //    thread (duplicate socket, both presentations open) must not stack.
    if (this._ftRevoked && this._ftRevoked.key === key) return;
    this._ftRevoked = captured;

    if (self) return this._finalizeRevokedFileThread();
    return this._ftShowRevokedNotice(captured);
  },

  // Did this viewer cause the transition? Compared on the server-supplied actor
  // id (media.js _fileMoveActor sends the acting uid), never on a name: two
  // people can share a display name, and the actor falls back to a generic
  // label when the name is empty. Same self-check idiom the chat widget uses
  // to tell its own messages from everyone else's.
  _ftIsSelfActor(actor) {
    const id = `${(actor && actor.id) || ""}`;
    if (!id) return false;
    return id === `${Visitor.id || ""}`;
  },

  // ── file deleted outright (orphaned) ────────────────────────────────────
  // The conversation stays where it was written and stays readable. The file is
  // gone for good, so nothing is torn down: no card invalidation, no warning
  // dialog, no return to General. The thread is frozen against new messages and
  // its info card is repainted to say the file was deleted.
  //
  // A move takes the locked path instead (_onFileThreadRevoked): that file can
  // come back, and until it does the thread must not be reopened.
  _onFileThreadMovedAway(payload = {}, key) {
    // The rail and the dropdown still list this thread, but its row now needs
    // the frozen presentation, so both are stale.
    this._ftBumpThreadRequests();

    const fileNid = `${payload.file_nid || ""}`;
    // Writes refused, nothing blurred: the point is that these messages stay
    // readable. The card is marked so a click resolves nothing — the node id it
    // carries belongs to another workspace now.
    this._ftFreeze(fileNid, false);
    this._ftSetCardAway(fileNid, payload);

    if (this._ftIsMountedFile(fileNid)) {
      // Repaint the open thread's own info card from the server, which is what
      // knows the holding workspace's name.
      this._refreshFileThreadInfoCard(fileNid, payload.file_thread_id);
    }
    return this._ftRefreshThreadNavigation();
  },

  // Mounted cards for a file that has left: not clickable (the file is not in
  // this workspace), but NOT struck through — the row is not deleted, and the
  // thread behind it still opens.
  _ftSetCardAway(fileNid, payload = {}) {
    const state = `${payload.state || ""}` === "orphaned" ? "orphaned" : "away";
    this._ftEachCard(fileNid, (card) => {
      card.dataset.ft_available = "0";
      card.dataset.ft_away = state;
      const row = card.closest(".widget-chatItem__ui");
      if (!row) return;
      row.classList.remove("ftc-unavailable");
      row.classList.add("ftc-away");
    });
  },

  _ftClearCardAway(fileNid) {
    this._ftEachCard(fileNid, (card) => {
      delete card.dataset.ft_away;
      const row = card.closest(".widget-chatItem__ui");
      if (row) row.classList.remove("ftc-away");
    });
  },

  // Re-fetch file_thread_info and re-run the card hydration, which is where the
  // lineage state turns into the visible "moved to X" line.
  _refreshFileThreadInfoCard(fileNid, fileThreadId) {
    if (!_.isFunction(this._fillFileInfoCard)) return;
    const nid = `${fileNid || ""}`;
    const ftId = `${fileThreadId || ""}`;
    if (!nid && !ftId) return;
    const generation = this._ftThreadRequestGeneration();
    const hub_id = this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    const svc =
      (SERVICE.channel && SERVICE.channel.file_thread_info) ||
      "channel.file_thread_info";
    return this.fetchService(
      { service: svc, hub_id, file_nid: nid, file_thread_id: ftId },
      { async: 1 },
    )
      .then((info) => {
        if (this.isDestroyed && this.isDestroyed()) return;
        if (generation !== this._ftThreadRequestGeneration()) return;
        if (!info) return;
        const grp = this.fig.group;
        // Both presentations carry the same card markup, so whichever is
        // mounted gets repainted.
        const roots = [this._fileThreadPanelPart && this._fileThreadPanelPart.el, this.el];
        for (const root of roots) {
          if (!root || !root.querySelector(`.${grp}__ft-info-card`)) continue;
          this._fillFileInfoCard(root, nid, hub_id, info);
        }
      })
      .catch(() => { });
  },

  // Filename for the notice: prefer the server snapshot (authoritative at the
  // moment of deletion), fall back to what the UI currently shows.
  _ftCapturedFilename(payload = {}) {
    const fromServer = `${payload.filename || ""}`.trim();
    if (fromServer) return fromServer;
    const panel = this._fileThreadPanelPart;
    const grp = this.fig.group;
    const read = (root, cls) => {
      if (!root) return "";
      const el = root.querySelector(`.${grp}__${cls}`);
      return el ? `${el.textContent || ""}`.trim() : "";
    };
    return (
      read(panel && panel.el, "ft-info-name") ||
      read(this.el, "chat-header-file-name") ||
      read(this.el, "ft-info-name") ||
      ""
    );
  },

  // Server-built fullname is `firstname + " " + lastname` even when lastname is
  // empty — trim so the sentence never reads "by Name .". Falls back to the
  // localized generic actor rather than leaving a hole in the message.
  _ftActorName(actor) {
    if (!actor) return LOCALE.SOMEONE;
    const name = `${
      actor.fullname || _.compact([actor.firstname, actor.lastname]).join(" ")
    }`.trim();
    return name || LOCALE.SOMEONE;
  },

  // Refuse every write into this scope, in both presentations. This is the real
  // guard — CSS cannot stop a keyboard send, a queued retry, or a programmatic
  // service call.
  _ftFreezeWrites(nid) {
    // Wide panel: its own chat widget instance.
    const panel = this._fileThreadPanelPart;
    if (panel && panel.el && !(panel.isDestroyed && panel.isDestroyed())) {
      this._ftWalkChats(panel, (chat) => chat.freezeFileScope(nid));
    }
    // In-place: the single folder chat.
    if (`${this._scopedFileNid || ""}` === nid) {
      this.ensurePart("folder-chat")
        .then((chat) => {
          if (chat && _.isFunction(chat.freezeFileScope)) {
            chat.freezeFileScope(nid);
          }
        })
        .catch(() => { });
    }
  },

  // Freeze the revoked scope: writes refused, plus the blur/pointer-block that
  // makes a dead thread read as inert while the notice is up.
  //
  // `blur` false is the moved-away case: writes are refused just the same, but
  // the messages stay sharp and scrollable, because the conversation is still
  // this team's to read — only the file left.
  _ftFreeze(fileNid, blur = true) {
    const nid = `${fileNid || ""}`;
    if (!nid) return;
    this._ftFreezeWrites(nid);
    if (!blur) return;
    // `dataset.ftRevoked` renders as data-ft-revoked (camelCase → hyphen); the
    // panel flag keeps a literal underscore to match the sibling gating
    // attributes (data-chat_gated, data-open). Both selectors are spelled
    // accordingly in skin/index.scss.
    if (this.el) this.el.dataset.ftRevoked = nid;
    const panel = this._fileThreadPanelPart;
    if (panel && panel.el && !(panel.isDestroyed && panel.isDestroyed())) {
      panel.el.dataset.ft_revoked = "1";
    }
  },

  // Release the freeze placed by _ftFreeze. Mirrors it exactly: the same two
  // presentations, the same nid. Safe to call for a nid that was never frozen.
  _ftUnfreeze(fileNid) {
    const nid = `${fileNid || ""}`;
    if (!nid) return;
    if (this.el && this.el.dataset.ftRevoked === nid) {
      delete this.el.dataset.ftRevoked;
    }
    const panel = this._fileThreadPanelPart;
    if (panel && panel.el && !(panel.isDestroyed && panel.isDestroyed())) {
      if (`${panel.el.dataset.ftNid || ""}` === nid) {
        panel.el.dataset.ft_revoked = "0";
      }
      this._ftWalkChats(panel, (chat) => chat.unfreezeFileScope(nid));
    }
    this.ensurePart("folder-chat")
      .then((chat) => {
        if (chat && _.isFunction(chat.unfreezeFileScope)) {
          chat.unfreezeFileScope(nid);
        }
      })
      .catch(() => { });
  },

  // Reach the chat widget mounted inside the side panel. It is fed as a child
  // of the panel part rather than being a named part of the window, so walk the
  // panel's children instead of ensurePart. Detection is by capability
  // (freezeFileScope present) rather than kind, so it keeps working if the
  // panel's internal composition changes.
  _ftWalkChats(panel, fn) {
    const visit = (view) => {
      if (!view) return;
      if (_.isFunction(view.freezeFileScope)) return fn(view);
      const kids = view.children;
      if (!kids || !_.isFunction(kids.each)) return;
      kids.each(visit);
    };
    visit(panel);
  },

  // Has this file's thread been revoked and not yet restored? Consulted by
  // scopeChatToFile so a stale card, rail row, or cross-window launch cannot
  // re-open a thread the server already took away — including after the notice
  // was dismissed, when _ftRevoked is back to null.
  _ftIsFileRevoked(fileNid) {
    const nid = `${fileNid || ""}`;
    if (!nid || !this._ftAccess) return false;
    for (const key of Object.keys(this._ftAccess)) {
      const st = this._ftAccess[key];
      if (st.state === "revoked" && `${st.fileNid || ""}` === nid) return true;
    }
    return false;
  },

  // onUiEvent services refused while a revoked thread is still on screen. The
  // OK button ("file-thread-revoked-ack") is deliberately absent — it is the
  // one action that must still work. Built lazily: _e.* are runtime globals.
  _ftIsRevokedService(service) {
    if (!service) return false;
    if (!this._ftBlockedServices) {
      this._ftBlockedServices = {
        "open-file-from-thread": 1,
        "open-file-thread": 1,
        "open-chat-search": 1,
        "chat-search-typed": 1,
        "search-result-jump": 1,
        "open-thread-menu": 1,
        "thread-menu-file": 1,
        "download-chat-history": 1,
        "download-file-chat": 1,
        [_a.chat]: 1,
      };
    }
    return !!this._ftBlockedServices[service];
  },

  // ── warning + finalize ──────────────────────────────────────────────────
  _ftShowRevokedNotice(captured) {
    const msg = LOCALE.FILE_THREAD_ACCESS_REVOKED.format(
      captured.filename || LOCALE.FILE,
      captured.actor,
    );
    // Local window warning primitive (window/utils.js) — no second modal
    // framework. Retain the live child so the finalizer removes THIS notice and
    // not whatever dialog the user opened afterwards.
    this._ftNoticeView = this.warning(msg, "file-thread-revoked-ack");
    if (this._ftNoticeTimer) clearTimeout(this._ftNoticeTimer);
    this._ftNoticeTimer = setTimeout(() => {
      this._ftNoticeTimer = null;
      this._finalizeRevokedFileThread();
    }, REVOKE_NOTICE_MS);
  },

  // OK and the timeout both land here. Safe to call repeatedly, after the panel
  // closed, after a tab change, and after the window was destroyed.
  _finalizeRevokedFileThread() {
    const captured = this._ftRevoked;
    // Always clear the timer first: a second call (OK racing the timeout in the
    // same tick) must not leave a pending callback pointed at a torn-down view.
    if (this._ftNoticeTimer) {
      clearTimeout(this._ftNoticeTimer);
      this._ftNoticeTimer = null;
    }
    this._ftRevoked = null;
    this._ftDismissNotice();
    if (!captured) return;
    if (this.isDestroyed && this.isDestroyed()) return;

    // Any in-flight hydrate/list/rail response captured before this point is
    // now stale and must not repaint the thread we are dismantling.
    this._ftBumpThreadRequests();

    // Close thread menus / search and drop the rail highlight before the scope
    // itself goes away, so nothing is left pointing at the dead thread.
    this._closeThreadMenu();
    this._hideChatSearchResults();
    this._chatSearchRestore = null;
    this._setThreadRailActive("");

    const revokedNid = captured.fileNid;
    // Wide Chat tab: destroy the scoped chat with its WS binding.
    const panel = this._fileThreadPanelPart;
    if (
      panel &&
      panel.el &&
      !(panel.isDestroyed && panel.isDestroyed()) &&
      `${panel.el.dataset.ftNid || ""}` === revokedNid
    ) {
      panel.el.dataset.ft_revoked = "0";
      panel.el.dataset.ftNid = "";
      this._closeFileThreadPanel();
    }

    // In-place Files tab: drop the file scope, its header, and its info card,
    // then re-assert the folder scope so the same window shows # General.
    if (`${this._scopedFileNid || ""}` === revokedNid) {
      this._ftFiletype = "";
      this.scopeChatToFile(null);
      this.scopeChatToFolder(this.mget(_a.nid));
      // The Chat tab's middle chat uses the "# General" header variant; the
      // Files tab uses the plain folder one.
      const general = this.activeTab === _a.chat && !this._isCompactChat();
      this._updateChatHeader(null, "", general);
      this._updateChatInfoCard(null);
    }

    if (this.el) delete this.el.dataset.ftRevoked;
    // Navigation can be refreshed now that the dead scope is gone.
    this._ftRefreshThreadNavigation();
  },

  // Dismiss through closeDialog (window/interact) — the same path the built-in
  // "close-dialog" service uses. It softClears the overlay wrapper AND lets the
  // wrapper's removeChild handler reset `data-dialog`, which a direct
  // destroy/goodbye on the child would leave stuck at "open" (the window then
  // keeps a dialog-mode chrome with nothing in it).
  //
  // Not goodbye(): that defaults to timeout 2000ms + a 0.5s tween, so the
  // notice would linger ~2.5s after OK. softClear's softDestroy uses timeout
  // 20ms, so the redirect reads as immediate.
  _ftDismissNotice() {
    const view = this._ftNoticeView;
    this._ftNoticeView = null;
    if (!view) return;
    if (_.isFunction(this.closeDialog)) return this.closeDialog();
    if (view.isDestroyed && view.isDestroyed()) return;
    if (_.isFunction(view.softDestroy)) return view.softDestroy();
  },

  // ── recovery ────────────────────────────────────────────────────────────
  // Same-nid restore, or a server-confirmed cross-hub rebind to a new nid.
  // Recovery never auto-opens the thread: it invalidates caches, revalidates
  // through the server, and refreshes navigation.
  _onFileThreadRestored(payload = {}, key) {
    this._ftBumpThreadRequests();

    // A restore landing while the warning is still up does NOT cancel it: the
    // window is mid-teardown and the user was already told. Finalize first
    // (returning to General), then refresh navigation.
    if (this._ftRevoked && this._ftRevoked.key === key) {
      this._finalizeRevokedFileThread();
    }

    // A cross-hub rebind changes the file nid behind the same thread. Rewrite
    // mounted cards so a click resolves the CURRENT node, never the dead one.
    const prev = `${payload.previous_file_nid || ""}`;
    const next = `${payload.file_nid || ""}`;
    if (prev && next && prev !== next) this._ftRebindCards(prev, next);

    // Drop the "file is elsewhere" presentation for both ids: the card may have
    // been marked under the old nid and rebound to the new one just above.
    this._ftClearCardAway(prev);
    this._ftClearCardAway(next);
    this._refreshFileThreadInfoCard(next, payload.file_thread_id);

    // Release the widget-level freeze for both the old and the new nid. A chat
    // widget that is still mounted (recovery arriving before the teardown ran,
    // or a same-nid restore with nothing torn down) would otherwise keep
    // refusing sends for a file the server has just made readable again.
    this._ftUnfreeze(prev);
    this._ftUnfreeze(next);

    // Re-enable cards only after the server confirms the thread is readable
    // again; a restore event alone is not proof this viewer may read it.
    this._ftRevalidateCards(next, payload.file_thread_id);
    return this._ftRefreshThreadNavigation();
  },

  // ── thread navigation refresh + request ordering ────────────────────────
  // One generation shared by the rail and the header dropdown. Bumped on
  // navigation, revoke, and recovery so a slow earlier response — success OR
  // failure — can never overwrite a newer refresh.
  _ftBumpThreadRequests() {
    this._threadListRequestGeneration =
      (this._threadListRequestGeneration || 0) + 1;
    return this._threadListRequestGeneration;
  },

  _ftThreadRequestGeneration() {
    return this._threadListRequestGeneration || 0;
  },

  // Repopulate whichever thread navigation is currently mounted. The rail only
  // exists in the wide Chat tab; the dropdown is rebuilt on next open, so an
  // open one is simply closed rather than refetched underneath the user.
  _ftRefreshThreadNavigation() {
    if (this.isDestroyed && this.isDestroyed()) return;
    this._closeThreadMenu();
    // Cached rows are stale the moment access changed — drop them so
    // _setThreadRailActive cannot repaint a removed thread from memory.
    this._threadRailItems = [];
    if (this.activeTab === _a.chat && !this._isCompactChat()) {
      return this._populateThreadRail();
    }
  },

  // ── General-chat file-thread cards ──────────────────────────────────────
  // Cards live inside chat-item rows (widget/chat-item), which own their own
  // availability flag. The window drives them by nid because a revoke can
  // arrive while dozens of rows are mounted across both chats.
  _ftEachCard(fileNid, fn) {
    if (!this.el) return;
    const nid = `${fileNid || ""}`;
    const sel = nid
      ? `[data-service="open-file-thread"][data-file_nid="${nid}"]`
      : '[data-service="open-file-thread"]';
    for (const card of this.el.querySelectorAll(sel)) fn(card);
  },

  // Availability is carried by TWO things that must move together:
  //   - `data-ft_available` on the card (the click guard), and
  //   - `ftc-unavailable` on the chat-item ROW (the greyed, struck-through
  //     filename — the row is the card's ancestor, not the card itself).
  // Setting only the first left a restored card clickable but still painted as
  // deleted until the next full reload.
  //
  // Key matches the card template's `data-ft_available` exactly: dataset keeps
  // an underscore as-is, so `ftAvailable` would write a second, unread
  // attribute and leave the guard reading a stale value.
  _ftSetCardAvailability(fileNid, available) {
    this._ftEachCard(fileNid, (card) => {
      card.dataset.ft_available = available ? "1" : "0";
      const row = card.closest(".widget-chatItem__ui");
      if (!row) return;
      row.classList.toggle("ftc-unavailable", !available);
    });
  },

  _ftInvalidateCards(fileNid) {
    this._ftSetCardAvailability(fileNid, false);
  },

  // Repaint the card's filename from a freshly validated file_thread_info. The
  // name node is stamped with the chat-item's widget id, so find it relative to
  // the card rather than guessing the id here.
  _ftRefreshCardLabels(fileNid, info) {
    const name = `${info.user_filename || info.filename || ""}`.trim();
    if (!name) return;
    this._ftEachCard(fileNid, (card) => {
      const row = card.closest(".widget-chatItem__ui");
      const nameEl =
        (row || card).querySelector('[id^="ftc-name-"]');
      if (nameEl) nameEl.textContent = name;
    });
  },

  _ftRebindCards(prevNid, nextNid) {
    this._ftEachCard(prevNid, (card) => {
      card.dataset.file_nid = `${nextNid}`;
    });
  },

  // Ask the server whether this viewer may read the thread again. Only an
  // authoritative yes re-enables the cards; NOT_FOUND, NO_PERMISSION, a missing
  // thread, and a failed fetch all leave them disabled.
  _ftRevalidateCards(fileNid, fileThreadId) {
    const nid = `${fileNid || ""}`;
    const ftId = `${fileThreadId || ""}`;
    if (!nid && !ftId) return;
    const generation = this._ftThreadRequestGeneration();
    const hub_id = this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    const svc =
      (SERVICE.channel && SERVICE.channel.file_thread_info) ||
      "channel.file_thread_info";
    return this.fetchService(
      { service: svc, hub_id, file_nid: nid, file_thread_id: ftId },
      { async: 1 },
    )
      .then((info) => {
        if (this.isDestroyed && this.isDestroyed()) return;
        // A newer revoke/recovery superseded this check while it was in flight.
        if (generation !== this._ftThreadRequestGeneration()) return;
        if (!info || Number(info.exists_thread) !== 1) return;
        if (info.media_status && info.media_status !== "active") return;
        const canonical = `${info.file_nid || nid}`;
        this._ftSetCardAvailability(canonical, true);
        // A cross-hub rebind renames the node: the card's own label still shows
        // the pre-move filename until something refreshes it.
        this._ftRefreshCardLabels(canonical, info);
      })
      .catch(() => { });
  },

  // ── cleanup ─────────────────────────────────────────────────────────────
  // Called from __window_folder.onBeforeDestroy: no timer may outlive the view
  // it would otherwise finalize.
  _ftTeardown() {
    if (this._ftNoticeTimer) {
      clearTimeout(this._ftNoticeTimer);
      this._ftNoticeTimer = null;
    }
    this._ftNoticeView = null;
    this._ftRevoked = null;
  },
};
