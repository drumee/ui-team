const { supportContactId, isSupportEntity } = require("libs/support");
// Preview text for a row's last message — shared with chat_contact_item's
// skeleton so the line reads the same on load and on a live push.
const {
  chatPreview,
  findMeetingRow,
  meetingStatusOf,
} = require("libs/chat-preview");
const { armItemsReady, markItemsReady } = require("libs/items-ready");

class __chat_p2p extends LetcBox {
  constructor(...args) {
    super(...args);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.getDirectApi = this.getDirectApi.bind(this);
    this.getWorkspaceApi = this.getWorkspaceApi.bind(this);
    this.getContactsApi = this.getContactsApi.bind(this);
    this.openChat = this.openChat.bind(this);
    this.openPeer = this.openPeer.bind(this);
    this._onDocClick = this._onDocClick.bind(this);
    this._onLightboxKey = this._onLightboxKey.bind(this);
  }

  initialize(opt = {}) {
    require("./skin");
    // `mview` drives the single-pane mobile/tablet layout (≤ 1024px):
    // "sidebar" shows the inbox, "chat" shows the conversation. On wider
    // screens both panes show side-by-side and the attribute is ignored.
    //
    // anim starts "in", NOT "out". As a slide-out this mounted parked
    // off-screen and slid in later, so "out" was the right initial state. It
    // is now a full-canvas screen mounted on demand into settings-main-slot
    // (desk INBOX_SLOT) — it is created precisely because the user asked to
    // see it, so it must be visible from the first frame.
    //
    // Load-bearing: the skin maps data-anim="out" to display:none, and in
    // that slot nothing flips it to "in" — _loadKind only feeds the kind.
    // Mounting "out" left the Inbox rendered but invisible; the only thing
    // that ever revealed it was the contact list's `eod`, so an empty or slow
    // list showed a blank screen. "out" now means only one thing: the desk is
    // closing this screen (_hidePanel / togglePanel's animate-then-destroy).
    //
    // `loading` gates BOTH loading skeletons (see skin). Seeded here rather
    // than flipped on later, so the FIRST paint is already the skeleton: the
    // inbox mounts with an empty list and a chat_rooms fetch in flight, and
    // the list's own spinner option draws nothing in ui-team. Failing closed
    // matters more than the switch case — an unstamped root reads as ready
    // and shows the blank screen this exists to replace.
    //
    // One flag for both columns, not one each: that is what makes them move
    // together (see _raiseSkeletons).
    opt.dataset = { ...opt.dataset, anim: "in", mview: "sidebar", loading: 1, scope: "direct" };
    super.initialize(opt);
    armItemsReady(this);
    this.declareHandlers();
    this._radioId = `peer-${this.mget(_a.widgetId)}`;
    this._filter = _a.contact;
    // One inbox list per SOURCE and one conversation per scope tab, kept
    // alive across tab switches (see _selectScope). Switching used to throw
    // both away and rebuild them through four serial round trips.
    //   _lists: { direct, workspace }   — Support narrows the direct list
    //   _panes: { direct, workspace, support } → { peer, type, contact, widget }
    this._lists = {};
    this._panes = {};
    this._openSeq = {};
    // media.home per hub_id. Immutable for the life of this screen, and the
    // personal one was refetched on EVERY direct conversation opened.
    this._homeCache = new Map();
    this.bindEvent(_a.live);
    this._onOutsideClick = this._onOutsideClick.bind(this);
    this._onPeerData = this._onPeerData.bind(this);
    RADIO_BROADCAST.on(_e.peerData, this._onPeerData);
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
    // A click inside an active call window (window_connect for 1:1, window_meeting
    // for share rooms) must not dismiss the chat panel — the call is usually
    // started from this very panel (_startCall → Wm.launch), and the two are
    // meant to stay open together. Without this the panel reads the call-window
    // click as "outside" and closes.
    if (
      e.target &&
      e.target.closest &&
      e.target.closest(".window-connect, .window-meeting")
    )
      return;
    // Opening the desk's mobile sidebar/drawer via a topbar button must not
    // dismiss the chat panel — the drawer overlays on top and the chat
    // stays open behind it. Bail on those clicks (they read as "outside").
    if (
      e.target &&
      e.target.closest &&
      e.target.closest(".desk-module__mobile-topbar-btn")
    )
      return;
    // Likewise on mobile/tablet, interacting with the desk sidebar drawer or
    // tapping its close-backdrop must not close the chat behind it.
    if (this._isMobile()) {
      if (svc === "mobile-close-drawer") return;
      if (
        e.target &&
        e.target.closest &&
        e.target.closest(".desk-module-sidebar__main")
      )
        return;
    }
    // Deliberately NOT self-hiding any more. As a slide-out this panel closed
    // itself on an outside click; as a FULL-CANVAS screen (Figma 43:32209) it
    // owns the whole centre column, so a click on the rail or the top bar —
    // both "outside" — would have blanked the screen the user is working in.
    // The desk opens and closes this slot now (INBOX_SLOT), the same way it
    // does Settings and Calendar.
  }

  onBeforeDestroy() {
    clearTimeout(this._searchDebounce);
    clearTimeout(this._composeSearchDebounce);
    clearTimeout(this._settleTimer);
    clearTimeout(this._skeletonFallback);
    if (this._paintWatcher) {
      this._paintWatcher.disconnect();
      this._paintWatcher = null;
    }
    this.unbindEvent(_a.live);
    document.removeEventListener("mousedown", this._onDocClick);
    document.removeEventListener("keydown", this._onLightboxKey, true);
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
    RADIO_BROADCAST.off(_e.peerData, this._onPeerData);
  }

  _onPeerData(data) {
    if (!data || data.id == null) return;
    const peerId = String(data.id);
    const status = data.status;

    if (this.activePeer && String(this.activePeer.entity_id) === peerId) {
      this.activePeer.online = status;
      const statusEl =
        this.el && this.el.querySelector(`.${this.fig.family}__header-status`);
      if (statusEl) {
        const s = ~~status;
        const label =
          s === 1 ? LOCALE.ACTIVE_NOW : s === 2 ? LOCALE.AWAY : LOCALE.OFFLINE;
        statusEl.textContent = label;
        statusEl.dataset.online = status == null ? "" : status;
      }
    }

    // Every live list, not just the one showing — a hidden one is shown
    // again as it is, without a refetch to correct it.
    Object.values(this._lists).forEach((list) => {
      if (!list || !list.getItemsByAttr) return;
      const items = list.getItemsByAttr(_a.entity_id, peerId) || [];
      items.forEach((item) => {
        if (!item) return;
        item.mset && item.mset(_a.online, status);
        if (item.el) item.el.dataset.online = status == null ? "" : status;
      });
    });
  }

  /**
   *
   */
  isHidden() {
    return this.el.dataset.anim === "out";
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

  /**
   * Returns the API config for the contact list.
   */
  /**
   * The inbox list source, chosen by the active scope tab (Figma 43:32209).
   *
   * Direct Chat  → chat.chat_rooms with flag=contact — person-to-person rooms.
   * Workspace chat → chat.share_rooms (group_chat_rooms) — the group rooms
   *   that belong to workspaces rather than to a contact pair.
   *
   * Support keeps the direct query: a support conversation IS a contact room;
   * that tab narrows it client-side in _applyFilter, exactly as before.
   */
  getCurrentApi() {
    return this._roomScope === "workspace"
      ? this.getWorkspaceApi()
      : this.getDirectApi();
  }

  /**
   * Each list is bound to its OWN source. They used to share getCurrentApi,
   * which reads the active tab — harmless while only one list existed, but
   * with both kept alive a page fetched by the hidden direct list (scrolling
   * it before the switch, paging on its way out) would have come back from
   * share_rooms.
   */
  getDirectApi() {
    return {
      service: SERVICE.chat.chat_rooms,
      flag: _a.contact,
      option: _a.active,
      hub_id: Visitor.get(_a.id),
    };
  }

  getWorkspaceApi() {
    // Empty until the tab is first visited. The Workspace list is in the
    // skeleton from the start, but group_chat_rooms is the expensive query
    // (it visits every workspace's database) and most visits to the inbox
    // never open this tab — an api without a service makes the list's fetch
    // a no-op, and _loadWorkspaceList restarts it for real.
    if (!this._wsActivated) return {};
    return {
      service: SERVICE.chat.share_rooms,
      hub_id: Visitor.get(_a.id),
    };
  }

  /**
   * Which list a scope reads. Support is a client-side narrowing of the
   * direct list (see _applyFilter), not a source of its own.
   */
  _listKey(scope) {
    return (scope || this._scopeKey()) === "workspace" ? "workspace" : "direct";
  }

  /**
   * media.home for a hub, fetched once per screen. The in-flight promise is
   * what is cached, so two opens racing share one request; a failure is
   * evicted so the next open retries instead of inheriting it.
   */
  _homeFor(hub_id) {
    const key = String(hub_id);
    let p = this._homeCache.get(key);
    if (!p) {
      p = this.fetchService(SERVICE.media.home, { hub_id }, { async: 1 });
      this._homeCache.set(key, p);
      p.then(
        (home) => {
          if (!home) this._homeCache.delete(key);
        },
        () => this._homeCache.delete(key),
      );
    }
    return p;
  }

  /**
   * A scope tab was pressed. No-op when the scope is unchanged, so re-clicking
   * the active tab (including Direct before any tab was ever pressed — the
   * unset scope IS Direct) costs nothing.
   */
  async _setRoomScope(scope) {
    return this._selectScope(scope || "direct", { land: true });
  }

  /**
   * Show a scope: its list, and its conversation.
   *
   * A SHOW/HIDE, not a refetch. This used to restart the one list against the
   * other service and remount the conversation — list fetch, media.home,
   * media.home again inside widget_chat, then the messages, all in series and
   * all under the skeleton — on every single press. Now each source keeps its
   * own list (kept current by onWsMessage, exactly as the visible one always
   * was) and each tab keeps its conversation parked, so only the FIRST visit to
   * Workspace chat loads anything.
   *
   * @param {String} next        direct | workspace | support
   * @param {Object} opt.land    open the scope's first row when it has no
   *                             conversation of its own yet (a tab press).
   *                             Off when a caller is about to open a specific
   *                             conversation itself (_openConversation).
   */
  async _selectScope(next, opt = {}) {
    const { land = false } = opt;
    if (this._scopeKey() === next) return;
    if (this._lightboxMedia) this._closeLightbox();
    this._roomScope = next;
    // Support narrows the direct list, so it shares that list.
    this._activeFilter = next === "support" ? "support" : "all";
    this._syncScopeTabs(next);
    const key = this._listKey(next);
    const list = this._lists[key];

    // Park every conversation except this scope's; brings its header and
    // active peer back with it (or empties them when it has none).
    this._showPane(next);

    if (key === "workspace" && (!this._wsActivated || !list || list._loadFailed)) {
      // First visit to Workspace chat (or a retry after a failed load): the
      // only case that still goes to the server.
      this._raiseSkeletons();
      this._showList(key);
      return this._loadWorkspaceList();
    }
    if (!list) {
      // The direct list is built by the mount's feed; a scope chosen before
      // it registered lands through its first-page handler.
      this._showList(key);
      return;
    }

    this._showList(key);
    // The Unreads toggle and the search term survive a scope switch, so the
    // shown list has to be re-gated for them.
    this._applyFilter();

    // Its first page has not landed yet: its own first-eod handler lands it
    // (and lowers the skeletons) when it does — it re-checks the scope then.
    if (!list._loaded) return;

    const pane = this._panes[next];
    if (pane) {
      // A skeleton raised by a first Workspace load still in flight covers
      // this scope too; this conversation is already here.
      if (this._isPanePainted(pane)) this._lowerSkeletons();
      return;
    }
    if (land) return this._landScope(list, next);
    if (this.el && this.el.dataset.loading === "1") this._lowerSkeletons();
  }

  /**
   * Reflect the active scope on the tab row. The tabs are a radio group that
   * flips itself on a click; a scope chosen in code (a conversation opened
   * from elsewhere into the other tab's list) has to set them itself.
   */
  _syncScopeTabs(scope) {
    ["direct", "workspace", "support"].forEach((key) => {
      const tab = this.getPart && this.getPart(`scope-tab-${key}`);
      if (tab && _.isFunction(tab.setState)) tab.setState(key === scope ? 1 : 0);
    });
  }

  /**
   * Show one list, hide the other. Driven from the root's data-scope (see
   * skin), so both lists — including one not yet registered — agree.
   */
  _showList(key) {
    if (this.el) this.el.dataset.scope = key;
    this._contactList = this._lists[key] || null;
  }

  /**
   * Start the Workspace chat list: on its first visit, or again after its
   * first page failed.
   */
  async _loadWorkspaceList() {
    // Warm the desk's workspace index BEFORE the rows arrive.
    // group_chat_rooms returns no area/kind, so the per-workspace icon is
    // resolved by joining on that index (see _workspaceMeta). prepareData is
    // synchronous, so the cache has to be populated by the time rows arrive or
    // every row falls back to the generic room glyph for that render.
    // Prefetched at mount (onDomRefresh), so this is normally already settled.
    await this._warmWorkspaceIndex();
    if (this.isDestroyed && this.isDestroyed()) return;
    const list = await this.ensurePart("contact-list-ws");
    if (!list || !_.isFunction(list.restart)) return;
    // Two presses while the index warmed: one start is enough.
    if (this._wsActivated && !list._loadFailed) return;
    this._wsActivated = 1;
    list._loadFailed = 0;
    list._loaded = 0;
    list.restart();
    // AFTER restart(), never before: restart() fires `eod` synchronously to
    // flush stale listeners, which would burn a handler armed earlier.
    this._armWorkspaceFirstPage(list);
  }

  _warmWorkspaceIndex() {
    if (typeof Desk === "undefined" || !Desk || !_.isFunction(Desk._fetchWorkspaces)) {
      return Promise.resolve();
    }
    if (!this._wsIndexWarm) {
      this._wsIndexWarm = Promise.resolve()
        .then(() => Desk._fetchWorkspaces())
        .catch((e) => {
          this._wsIndexWarm = null;
          this.warn && this.warn("[inbox] workspace index unavailable", e);
        });
    }
    return this._wsIndexWarm;
  }

  /**
   * The Workspace list's first page: register it as loaded and, if the user
   * is still on that tab, land on its first row.
   */
  _armWorkspaceFirstPage(list) {
    const opens = this._openCount || 0;
    list.once(_e.eod, () => {
      if (this.isDestroyed && this.isDestroyed()) return;
      list._loaded = 1;
      if (this._scopeKey() !== "workspace") return;
      this._applyFilter();
      if (this._panes.workspace || (this._openCount || 0) !== opens) {
        // Already has its conversation; just make sure nothing stays covered.
        if (this._isPanePainted(this._panes.workspace)) this._lowerSkeletons();
        return;
      }
      this._landScope(list, "workspace");
    });
    // A failed page fires `error`, never `eod` (ui-core list
    // onServerComplain). Nothing is coming that could paint, so reveal now
    // rather than at the 6s deadline, and retry on the next visit.
    list.once(_e.error, () => {
      if (this.isDestroyed && this.isDestroyed()) return;
      list._loadFailed = 1;
      if (this._scopeKey() === "workspace") this._lowerSkeletons();
    });
  }

  /**
   * Park every conversation but `scope`'s, and put that one's header and
   * active peer back. The parked ones stay mounted and current (they still
   * receive their messages) but hold their read-acks — see widget_chat park().
   */
  _showPane(scope) {
    Object.keys(this._panes).forEach((k) => {
      const pane = this._panes[k];
      if (!pane || !pane.widget) return;
      if (pane.widget.isDestroyed && pane.widget.isDestroyed()) {
        delete this._panes[k];
        return;
      }
      if (k !== scope && _.isFunction(pane.widget.park)) pane.widget.park();
    });
    const pane = this._panes[scope];
    if (pane && _.isFunction(pane.widget.unpark)) pane.widget.unpark();
    this.activePeer = pane ? pane.peer : null;
    this.activePeerType = pane ? pane.type : null;
    this.chatWidget = pane ? pane.widget : null;
    // Selection lives on the row; direct and support share one list, so the
    // row that was on is the other tab's.
    if (pane && pane.contact && pane.contact.el) {
      this._markSelected(this._lists[this._listKey(scope)], pane.contact);
    }
    this.ensurePart("chat-header").then((header) => {
      header.clear();
      header.feed(require("./skeleton/chat-header")(this, pane ? pane.contact : null));
    });
  }

  _isPanePainted(pane) {
    const el = pane && pane.widget && pane.widget.el;
    return !!(el && el.dataset && el.dataset.painted === "1");
  }

  /**
   * Put the selection mark on one row of a list and take it off the rest.
   */
  _markSelected(list, contact) {
    if (!list || !list.children) return;
    list.children.forEach((c) => {
      if (c.el) c.el.dataset.radio = c === contact ? "on" : "off";
    });
  }

  /**
   * The list a row view belongs to, or null (a compose-picker row, a shim).
   */
  _listOf(contact) {
    if (!contact) return null;
    return (
      Object.values(this._lists).find(
        (l) =>
          l &&
          l.children &&
          _.isFunction(l.children.toArray) &&
          l.children.toArray().includes(contact),
      ) || null
    );
  }

  /**
   * Which tab a conversation belongs under. A workspace room is Workspace
   * chat; anything else is a person — it stays under Support when that is the
   * tab showing, and goes to Direct otherwise.
   */
  _scopeForPeer(peer) {
    if (peer && peer.flag === _a.share) return "workspace";
    return this._scopeKey() === "support" ? "support" : "direct";
  }

  /**
   * Raise BOTH loading skeletons, for the length of one scope load.
   *
   * The inbox column deliberately does NOT lower on its own `eod`. It waits
   * for the conversation — the slower of the two — so the screen resolves in
   * one step instead of the list uncovering, sitting beside a blank pane, and
   * the pane uncovering a round trip later. One flag, so both columns raise on
   * the same frame and their pulses run in phase.
   *
   * The pane is cleared HERE rather than in _openConversation, which is where
   * it used to happen. Until the previous scope's widget_chat goes, the pane
   * has a painted conversation in it and there is nothing for a skeleton to
   * cover — the old conversation would simply stay on screen beside a
   * skeletonised list. Nothing is wasted by clearing early: _openConversation
   * clears the pane anyway, this only moves it a round trip forward.
   *
   * Only a scope load calls this. Clicking another conversation must not put
   * the inbox list under a skeleton — the list is fine, and the row the user
   * just clicked would disappear under it.
   */
  _raiseSkeletons() {
    if (this.el) this.el.dataset.loading = "1";
    // The conversation being left is PARKED, not destroyed (see _showPane,
    // which the caller has already run) — switching back must find it. The
    // header likewise is re-fed by _showPane, with nothing for a scope that
    // has no conversation yet.
    this._armSkeletonRelease();
  }

  /**
   * Arm the two things that bring the skeletons back down: the conversation's
   * paint, and a deadline in case it never comes.
   *
   * Split out of _raiseSkeletons so the FIRST mount can share it. At mount
   * there is no previous conversation to clear — the pane and header do not
   * exist yet, they are built by the feed in onDomRefresh — so that path wants
   * the arming without the clearing.
   */
  _armSkeletonRelease() {
    this._watchConversationPaint();
    clearTimeout(this._skeletonFallback);
    // The paint is the only thing that lowers these, and a chat_rooms request
    // that never answers means nothing ever opens, so nothing ever paints.
    // Without a deadline both columns would pulse for the rest of the session,
    // which reads far worse than the blank screen this replaces.
    this._skeletonFallback = setTimeout(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      this._lowerSkeletons();
    }, 6000);
  }

  /**
   * Lower both skeletons, revealing the two columns on the same frame.
   */
  _lowerSkeletons() {
    clearTimeout(this._skeletonFallback);
    this._skeletonFallback = null;
    if (this._paintWatcher) {
      this._paintWatcher.disconnect();
      this._paintWatcher = null;
    }
    if (this.el) this.el.dataset.loading = "0";
  }

  /**
   * Lower both skeletons once the conversation has painted.
   *
   * widget_chat stamps data-painted on itself when its message list first
   * readies, with a 4s fallback of its own (widget/chat) — but it announces
   * that stamp to nobody, so there is no event to subscribe to and the DOM is
   * the only place the fact exists. Hence an observer, scoped to the pane and
   * to that one attribute, disconnected the moment it fires.
   *
   * Not expressible as `:has([data-painted="1"])` in the stylesheet, which was
   * the previous shape: that condition is equally true while the user is
   * merely switching conversations, and would drag the inbox list under a
   * skeleton on every click.
   */
  _watchConversationPaint() {
    if (this._paintWatcher) {
      this._paintWatcher.disconnect();
      this._paintWatcher = null;
    }
    this.ensurePart("chat-panel").then((panel) => {
      if (!panel || !panel.el) return;
      if (this.isDestroyed && this.isDestroyed()) return;
      // Already painted: the conversation beat the observer here. Nothing
      // would ever mutate, so the skeletons would sit up until the fallback.
      // A PARKED conversation (the other tab's, kept mounted) is painted
      // too, and must not count: it is not the one the skeleton is covering.
      const painted = () =>
        Array.from(panel.el.querySelectorAll('[data-painted="1"]')).some(
          (el) => !el.closest('[data-parked="1"]'),
        );
      if (painted()) {
        return this._lowerSkeletons();
      }
      const watcher = new MutationObserver(() => {
        if (!painted()) return;
        this._lowerSkeletons();
      });
      // subtree, because the widget_chat that will carry the stamp is fed
      // into this pane AFTER the observer starts.
      watcher.observe(panel.el, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-painted"],
      });
      this._paintWatcher = watcher;
    });
  }

  /**
   * The active scope, normalised.
   *
   * `_roomScope` is UNSET until the first tab press — getCurrentApi reads the
   * absence as Direct — so comparing it raw would make every first-load guard
   * a comparison against undefined, which is never equal to the "direct" a
   * later press sets. Everything that captures or checks a scope goes through
   * here so both spellings of Direct are the same value.
   */
  _scopeKey() {
    return this._roomScope || "direct";
  }

  /**
   * Open a scope's first conversation, now that its list has rows.
   *
   * Runs when a scope with a loaded list but no conversation of its own is
   * shown (a tab press, or the Workspace list's first page landing). Without
   * it the pane would keep showing nothing beside a list full of rows.
   *
   * @param {View} list    the scope's list
   * @param {String} scope the scope this landing belongs to
   */
  async _landScope(list, scope) {
    if (this.isDestroyed && this.isDestroyed()) return;
    if (this._scopeKey() !== scope) return;
    const opens = this._openCount || 0;
    const row = this._landingRow(list);
    // Nothing to open: the pane must not keep showing the scope we just
    // left. Cleared even on mobile, where the pane is behind the sidebar —
    // the back button would otherwise reveal a stale conversation. This also
    // lowers the skeletons — nothing is coming that could ever paint.
    if (!row) return this._clearConversation();
    // Mobile/tablet stays on the inbox. The user just tapped a tab THERE,
    // and opening flips data-mview to "chat" and hides it — same reason the
    // first-load landing bails (see onPartReady). Lower on the way out for
    // the same reason as above: nothing will paint, so nothing else would.
    if (this._isMobile()) return this._lowerSkeletons();
    await Kind.waitFor("widget_chat");
    // Re-checked after the await: the wait is a suspension point, and a tab
    // press during it must win.
    if (this._scopeKey() !== scope) return;
    if (this.isDestroyed && this.isDestroyed()) return;
    // Something else opened a conversation meanwhile (a click).
    if (this._panes[scope] || (this._openCount || 0) !== opens) return;
    this.openChat(row);
  }

  /**
   * Put the conversation pane back to its empty state.
   *
   * Used when a scope has nothing to land on. chat-header renders its
   * `--empty` variant when it is fed a null contact (see skeleton/chat-header),
   * and dropping chatWidget matters as much as clearing the pane: a live
   * widget_chat left mounted keeps acknowledging messages in a scope the user
   * is no longer looking at.
   */
  _clearConversation() {
    this.activePeer = null;
    this.activePeerType = null;
    this.chatWidget = null;
    if (this.el) this.el.dataset.mview = "sidebar";
    // Empty ON PURPOSE, not waiting for anything: no conversation is coming,
    // so nothing would ever paint and lower these. Both columns reveal here.
    this._lowerSkeletons();
    this.ensurePart("chat-header").then((header) => {
      header.clear();
      header.feed(require("./skeleton/chat-header")(this, null));
    });
    // Only THIS scope's conversation. The other tab's stays parked for when
    // the user switches back.
    this._dropPane(this._scopeKey());
  }

  /**
   * Destroy a scope's conversation. Dropping it matters as much as hiding
   * it: a live widget_chat keeps receiving that conversation's traffic.
   */
  _dropPane(scope) {
    const pane = this._panes[scope];
    delete this._panes[scope];
    const w = pane && pane.widget;
    if (w && !(w.isDestroyed && w.isDestroyed())) {
      // Now, not animated: the replacement mounts into the same pane on this
      // tick, and selfDestroy also takes it out of the pane's collection.
      if (_.isFunction(w.selfDestroy)) w.selfDestroy({ now: 1 });
      else if (_.isFunction(w.destroy)) w.destroy();
    }
  }

  /**
   * The desk's cached desk.home row for a hub, or null.
   *
   * That payload is where `area` and `kind` live — the two fields the
   * workspace glyph is chosen from, and the two group_chat_rooms does not
   * return.
   */
  _workspaceMeta(hubId) {
    if (typeof Desk === "undefined" || !Desk || !hubId) return null;
    const rows = Desk._workspaces || [];
    // Indexed, not scanned. This is called once PER ROW while normalising a
    // page, so a linear find made it O(rows x workspaces). The index is
    // rebuilt only when the underlying array identity changes, which is
    // whenever the desk refetches.
    if (this._wsIndexSrc !== rows) {
      this._wsIndexSrc = rows;
      this._wsIndex = new Map();
      rows.forEach((r) => {
        if (r) this._wsIndex.set(String(r.hub_id || r.id), r);
      });
    }
    return this._wsIndex.get(String(hubId)) || null;
  }

  /**
   * Returns the API config for the compose popup's contact list.
   * Reuses chat_rooms so we get the same data shape as the inbox list,
   * which feeds straight into openChat().
   */
  getContactsApi() {
    const api = {
      service: SERVICE.chat.chat_rooms,
      flag: _a.contact,
      option: _a.active,
      hub_id: Visitor.get(_a.id),
    };
    // THE SEARCH MUST GO TO THE SERVER, not stay a filter over the loaded rows.
    //
    // chat_rooms is paged (20 rows a page) and ordered
    // `IFNULL(ctime,0) DESC` — ctime being the last message exchanged with that
    // peer. A contact you have NEVER messaged has no p2p_time row, so ctime is
    // NULL and they sort to the very BOTTOM of the whole address book — which
    // is exactly the person you open this picker to find. Past ~20 contacts
    // they are never on page one.
    //
    // The proc takes `key` and filters every page with it, so handing the typed
    // text over is what makes an unmessaged contact reachable at all. `restart()`
    // re-runs this function (start() -> _initApi()), so the value is picked up
    // on the next fetch.
    const key = (this._composeQuery || "").trim();
    if (key) api[_a.key] = key;
    return api;
  }

  onDomRefresh() {
    // Re-stamped here, before the skeleton builds the columns, because the
    // seed in initialize rides opt.dataset — and a widget mounted as a FED kid
    // takes its model from the parent's descriptor, so an opt edit does not
    // always survive the trip. Writing the element directly costs one
    // assignment and removes the question; both paths target the same
    // attribute, so whichever landed first, the screen is never unstamped.
    if (this.el && !this.el.dataset.loading) this.el.dataset.loading = "1";
    this.feed(require("./skeleton")(this));
    // AFTER the feed, which is what builds the chat-panel this waits on. Not
    // _raiseSkeletons: at mount there is no previous conversation to clear,
    // and the skeleton has just fed the empty header itself.
    this._armSkeletonRelease();
    RADIO_CLICK.on(_e.click, this._onOutsideClick);
    // The Workspace tab joins its rows on the desk's workspace index (see
    // _loadWorkspaceList). Warm it now, off the critical path, so the first
    // press of that tab does not queue behind it. Usually already cached.
    setTimeout(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      this._warmWorkspaceIndex();
    }, 0);
  }

  /**
   * Workspace-chat rows arrive in a DIFFERENT shape from contact rows.
   * chat.share_rooms -> group_chat_rooms returns one row per hub
   * { id, group_name, room_count, message, ctime }, while every consumer
   * downstream (chat_contact_item, openChat, _openConversation) speaks
   * the contact shape { entity_id, fullname, flag, ... }.
   *
   * Normalised HERE, by wrapping prepareData, rather than by teaching
   * the shared row widget a second shape or by adding an itemsMap to the
   * list: itemsMap assigns unconditionally, so mapping id -> entity_id
   * would blank entity_id on ordinary contact rows. Same technique
   * desk/workspace-list uses to reshape its own mixed payload.
   *
   * Installed on BOTH lists, as it was on the one list both scopes shared:
   * a contact row (entity_id set, no group_name) passes through untouched.
   */
  _installRowShape(child) {
    if (!child._wsRowShapeInstalled) {
      child._wsRowShapeInstalled = 1;
      const original = child.prepareData.bind(child);
      child.prepareData = (data) => {
        let rows = original(data) || [];
        // A list service with exactly ONE row answers with the object
        // itself, not a one-element array — a user in a single workspace
        // would otherwise get an empty Workspace-chat tab.
        if (!_.isArray(rows)) rows = rows ? [rows] : [];
        return rows.map((r) => {
          if (!r || r.entity_id || !r.group_name) return r;
          // area/kind come from the desk's workspace index, not from the
          // chat payload — group_chat_rooms returns neither, so without
          // this join every workspace drew the same generic room glyph.
          const meta = this._workspaceMeta(r.id) || {};
          return {
            ...r,
            entity_id: r.id,
            fullname: r.group_name,
            display: r.group_name,
            // `share` is what makes _openConversation resolve the hub's
            // home node (media.home -> home_id) and mount the conversation
            // rooted at the workspace — which IS its team chat.
            flag: _a.share,
            is_workspace: 1,
            area: meta.area,
            ws_kind: meta.kind,
            ws_filetype: meta.filetype,
          };
        });
      };
    }
    if (child.collection) {
      child.collection.comparator = (item) => -item.get(_a.ctime);
    }
  }

  /**
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "contact-list":
        this._lists.direct = child;
        if (this._listKey() === "direct") this._contactList = child;
        this._installRowShape(child);
        const opensAtArm = this._openCount || 0;
        child.once(_e.eod, async () => {
          // Loaded whichever tab is showing: a later switch back to Direct
          // finds it ready instead of waiting on an eod that already passed.
          child._loaded = 1;
          // The conversation list is painted (rows or none). A reload's screen
          // restore waits on this (libs/items-ready); it does not wait for the
          // first conversation to open.
          markItemsReady(this);
          // Deliberately NOT awaited: resolving the support account is a
          // network call, and putting it in front of the landing below would
          // mean a slow or hanging lookup leaves the inbox with nothing open.
          // It pins its own row and opens it only if nothing else did.
          // Always into THIS list — the direct one — whichever tab is showing;
          // it opens the row only when Direct is the tab in view.
          this._ensureSupportRow();
          // The user pressed Workspace chat before this first page landed:
          // that tab owns the pane now, and _selectScope lands this list when
          // they come back to it.
          if (this._listKey() !== "direct") return;
          this.el.dataset.anim = "in";
          // NOT lowering the skeletons here, although this page has landed —
          // they come down together when the conversation paints. See
          // _raiseSkeletons.
          this._applyFilter();
          await Kind.waitFor("widget_chat");
          // Mounted with a conversation to open (Contact Support): honour it
          // instead of landing on the first row, on every screen size — the
          // user asked for this specific conversation, not the inbox.
          const pending = this.mget("open_peer");
          if (pending && pending.entity_id) {
            this.mset("open_peer", null);
            return this.openPeer(pending.entity_id, pending);
          }
          // Re-checked after the await: a tab press, or a conversation opened
          // meanwhile (a click, the support row), owns the pane now.
          if (this._listKey() !== "direct") return;
          if (this._panes[this._scopeKey()]) return;
          if ((this._openCount || 0) !== opensAtArm) return;
          // On mobile/tablet stay on the inbox — auto-opening the first
          // conversation would jump past the sidebar the user expects to
          // land on. They tap a contact to reveal the chat pane. Lower on the
          // way out: nothing is opening, so nothing will ever paint.
          if (this._isMobile()) return this._lowerSkeletons();
          const landing = this._landingRow(child);
          // An account with NO conversations at all. _ensureSupportRow above
          // may still pin one and open it — but it may equally find nothing
          // configured, and then no paint is coming and only the deadline
          // would uncover the screen. Reveal the empty inbox now; a support
          // row arriving later opens into an already-revealed pane.
          if (!landing) return this._lowerSkeletons();
          this.openChat(landing);
        });
        // A failed first page fires `error`, never `eod` (ui-core list
        // onServerComplain) — and a failed load is still a finished one.
        child.once(_e.error, () => {
          child._loaded = 1;
          markItemsReady(this);
        });
        break;

      case "contact-list-ws":
        // Started lazily — see getWorkspaceApi / _loadWorkspaceList.
        this._lists.workspace = child;
        if (this._listKey() === "workspace") this._contactList = child;
        this._installRowShape(child);
        break;

      case "sidebar":
        break;

      case "lightbox-img": {
        // `slide` is not generated yet for a fresh upload: fall back to the
        // original once.
        const img = child.el && (child.el.tagName === "IMG" ? child.el : child.el.querySelector("img"));
        if (img) {
          img.addEventListener("error", () => {
            const orig = img.dataset.orig || (child.el.dataset && child.el.dataset.orig);
            if (orig && !img.dataset.fellBack) {
              img.dataset.fellBack = "1";
              img.src = orig;
            }
          });
        }
        break;
      }

      case "lightbox-video": {
        // A codec the browser cannot play: say so, and leave Download.
        const video = child.el && (child.el.tagName === "VIDEO" ? child.el : child.el.querySelector("video"));
        if (video) {
          video.addEventListener("error", () => {
            this.ensurePart("lightbox-stage").then((stage) => {
              if (!stage || !this._lightboxMedia) return;
              stage.feed(
                Skeletons.Note({
                  className: `${this.fig.family}__lightbox-error`,
                  content: LOCALE.UNABLE_TO_GENERATE_PREVIEW,
                }),
              );
            });
          });
        }
        break;
      }

      case "compose-popup":
        this._composePopup = child;
        document.addEventListener("mousedown", this._onDocClick);
        break;

      case "compose-list":
        this._composeList = child;
        if (child.collection) {
          // `~~` before negating, because a contact you have never messaged
          // has NO ctime: plain `-undefined` is NaN, and a NaN comparator
          // compares false against everything, so those rows landed in an
          // arbitrary order instead of a predictable one. Coercing to 0 first
          // mirrors the server's own `ORDER BY IFNULL(ctime,0) DESC`, so the
          // merged pages keep exactly the order they were fetched in.
          child.collection.comparator = (item) => -~~item.get(_a.ctime);
        }
        break;

      case "compose-search": {
        this._composeSearch = child;
        // The Entry widget does NOT fire `service` on every keystroke,
        // so wire a native `input` listener that drives the live filter.
        const inputEl = child.el && child.el.querySelector("input");
        if (inputEl) {
          inputEl.addEventListener("input", () => {
            this._filterComposeList(inputEl.value || "");
          });
        }
        break;
      }

      case "all-read-empty":
        this._allReadEmpty = child;
        if (child.el) child.el.dataset.state = 0;
        break;

      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Show a chat image / video inside the Inbox.
   *
   * Called by the desk window manager (Wm.openContent) for a tile that lives
   * in this screen: the regular viewer is launched into the window-manager
   * layers, which this full-canvas screen covers, so it opened invisibly
   * behind the Inbox — and every further click stacked another one there.
   *
   * @param {View} media  the media_grid tile that was clicked
   */
  previewMedia(media) {
    if (!media || !_.isFunction(media.actualNode)) return;
    // Every picture / video of this conversation, oldest first, so the
    // viewer can step through them (arrows, ← →) the way the full viewer
    // steps through a folder.
    this._gallery = this._galleryFor(media);
    this._galleryIndex = Math.max(0, this._gallery.indexOf(media));
    this._renderLightbox();
  }

  /**
   * The conversation's inline pictures / videos, in reading order, or just
   * `media` when it is not one of them (a reply quote's thumbnail).
   */
  _galleryFor(media) {
    const out = [];
    const chat = _.isFunction(media.getParentByKind)
      ? media.getParentByKind("widget_chat")
      : null;
    const rows = chat && chat.__list && chat.__list.children;
    if (rows && _.isFunction(rows.forEach)) {
      rows.forEach((row) => {
        const tiles = row && row.__list && row.__list.children;
        if (!tiles || !_.isFunction(tiles.forEach)) return;
        tiles.forEach((t) => {
          if (!t || !_.isFunction(t.mget) || !_.isFunction(t.actualNode)) return;
          if (t.isDestroyed && t.isDestroyed()) return;
          const ft = t.mget(_a.filetype);
          if (ft === _a.image || ft === _a.video) out.push(t);
        });
      });
    }
    return out.includes(media) ? out : [media];
  }

  _renderLightbox() {
    const gallery = this._gallery || [];
    const media = gallery[this._galleryIndex];
    if (!media || (media.isDestroyed && media.isDestroyed())) {
      return this._closeLightbox();
    }
    const type = media.mget(_a.filetype);
    const name = _.isFunction(media.fullname)
      ? media.fullname()
      : media.mget(_a.filename) || "";
    const slide = media.actualNode(_a.slide).url;
    const orig = media.actualNode(_a.orig).url;
    const count = gallery.length;
    const index = this._galleryIndex;
    this._lightboxMedia = media;
    this.ensurePart("wrapper-lightbox").then((w) => {
      if (!w || (this.isDestroyed && this.isDestroyed())) return;
      if (this._lightboxMedia !== media) return;
      // One viewer at a time: opening another replaces it.
      w.feed(
        require("./skeleton/lightbox")(this, {
          type,
          name,
          slide,
          orig,
          position: count > 1 ? `${index + 1} / ${count}` : "",
          hasPrev: index > 0,
          hasNext: index < count - 1,
        }),
      );
      document.removeEventListener("keydown", this._onLightboxKey, true);
      document.addEventListener("keydown", this._onLightboxKey, true);
    });
  }

  /**
   * Step the viewer to the previous (-1) / next (+1) picture. Stops at the
   * ends rather than wrapping: the conversation has a first and a last.
   */
  _stepLightbox(delta) {
    const gallery = this._gallery || [];
    const next = this._galleryIndex + delta;
    if (next < 0 || next >= gallery.length) return;
    this._galleryIndex = next;
    this._renderLightbox();
  }

  _closeLightbox() {
    this._lightboxMedia = null;
    this._gallery = null;
    document.removeEventListener("keydown", this._onLightboxKey, true);
    const w = this.getPart && this.getPart("wrapper-lightbox");
    if (w && _.isFunction(w.clear)) w.clear();
  }

  /**
   * Escape closes the viewer — and only the viewer: taken in the capture
   * phase so the conversation's own Escape handling (reply, edit) does not
   * also act on the same key.
   */
  _onLightboxKey(e) {
    if (!e || !this._lightboxMedia) return;
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (e.key !== "Escape" && !step) return;
    // A video's own controls take the arrows (seek) while they have focus.
    if (step && e.target && e.target.tagName === "VIDEO") return;
    e.stopPropagation();
    e.preventDefault();
    if (step) return this._stepLightbox(step);
    this._closeLightbox();
  }

  _toggleComposePopup(force) {
    if (!this._composePopup || !this._composePopup.el) return;
    const cur = this._composePopup.el.dataset.state === "1";
    const next = typeof force === "boolean" ? force : !cur;
    this._composePopup.el.dataset.state = next ? 1 : 0;
    if (next) {
      // The popup uses position:fixed (escapes the sidebar's overflow:hidden
      // box). Place it under the compose button vertically, but anchor its
      // right edge to the SIDEBAR's right edge (not the button's). The
      // sidebar header has 24px padding, so anchoring to the button would
      // overflow the 320px popup past the sidebar's LEFT edge by 24px.
      const btn =
        this.el && this.el.querySelector(`.${this.fig.family}__compose-btn`);
      const sidebar =
        this.el && this.el.querySelector(`.${this.fig.family}__sidebar`);
      if (btn) {
        const btnRect = btn.getBoundingClientRect();
        const sidebarRect = sidebar && sidebar.getBoundingClientRect();
        const rightAnchor = sidebarRect ? sidebarRect.right : btnRect.right;
        this._composePopup.el.style.top = `${Math.round(btnRect.bottom + 8)}px`;
        this._composePopup.el.style.right = `${Math.round(Math.max(0, window.innerWidth - rightAnchor))}px`;
      }
      const inputEl =
        this._composeSearch &&
        this._composeSearch.el &&
        this._composeSearch.el.querySelector("input");
      if (inputEl) {
        inputEl.value = "";
        setTimeout(() => inputEl.focus(), 0);
      }
      // Clear the term BEFORE restarting: getContactsApi reads it, so leaving
      // it set would reopen the picker still filtered by the last search.
      this._composeQuery = "";
      this._restartComposeList();
    }
  }

  _onDocClick(e) {
    if (!this._composePopup || !this._composePopup.el) return;
    if (this._composePopup.el.dataset.state !== "1") return;
    if (this._composePopup.el.contains(e.target)) return;
    if (
      this.el &&
      this.el
        .querySelector(`.${this.fig.family}__compose-btn`)
        ?.contains(e.target)
    )
      return;
    this._toggleComposePopup(false);
  }

  /**
   * Search the compose picker.
   *
   * This used to hide non-matching rows with `display:none`, which could only
   * ever find someone already loaded — and it also DEADLOCKED paging: once
   * every row is hidden the scroll container has no height, so neither
   * `_onScroll` nor `_onMouseWheel` can fire and the list can never reach the
   * page the contact is actually on. Refetching with the term instead searches
   * the whole address book and leaves the rows real, so scrolling still pages.
   *
   * Server-side matching is a PREFIX match on firstname / lastname / surname /
   * source, so a mid-name fragment no longer matches the way the old local
   * `includes()` did over page one. That is the deliberate trade: reaching
   * every contact beats substring-matching the first twenty.
   */
  _filterComposeList(text) {
    const next = (text || "").trim();
    if (next === (this._composeQuery || "")) return;
    this._composeQuery = next;
    clearTimeout(this._composeSearchDebounce);
    // The entry is `interactive`, so this arrives on every keystroke and each
    // restart is a round trip — debounce before going to the server.
    this._composeSearchDebounce = setTimeout(
      () => this._restartComposeList(),
      250,
    );
  }

  _restartComposeList() {
    clearTimeout(this._composeSearchDebounce);
    if (this._composeList && _.isFunction(this._composeList.restart)) {
      this._composeList.restart();
    }
  }

  /**
   * Opens the chat for the selected contact/room.
   * Mirrors window_bigchat / chat-room behaviour: peer/share/support are all
   * rendered inside this panel using widget_chat with the matching type.
   * @param {View} contact - The selected chat_contact_item view
   */
  async openChat(contact) {
    if (!contact || !contact.mget) return;

    if (_.isFunction(contact.resetNotification)) {
      contact.resetNotification();
    }

    // Unread / Mentions are "inbox to work through" filters: opening a row
    // consumes it, so it drops out of the list. Support is a category, not a
    // queue — a support row stays put once read.
    const filter = this._activeFilter || "all";
    if (filter !== "all" && filter !== "support" && contact.el) {
      contact.el.style.display = "none";
    }

    // Selection is marked in the list the row lives in. A row from the
    // compose picker lives in neither, and only clears the selection of the
    // list its conversation will show under — as it always did.
    const ownList = this._listOf(contact);
    if (ownList) {
      this._markSelected(ownList, contact);
    } else {
      const flag0 = contact.mget && contact.mget(_a.flag);
      const scope0 = this._scopeForPeer({ flag: flag0 });
      this._markSelected(this._lists[this._listKey(scope0)], contact);
    }

    const peer = contact.toLETC
      ? contact.toLETC()
      : { ...contact.model.toJSON() };
    delete peer.kids;
    delete peer.uiHandler;

    // toLETC filters fields, so anything the header or the conversation needs
    // is re-read from the model below. `area` joins them: it is what tints a
    // workspace row's folder icon, and a peer built by _peerShim reads it
    // straight off this object.
    if (contact.mget && contact.mget(_a.area)) peer.area = contact.mget(_a.area);
    // Ensure flag survives toLETC filtering — read directly from model
    const flag = (contact.mget && contact.mget(_a.flag)) || peer.flag;
    peer.flag = flag;
    // Same for the support marker: it drives the header treatment and the
    // conversation's empty state, and toLETC would otherwise drop it.
    if (contact.mget && contact.mget("is_support")) peer.is_support = 1;

    return this._openConversation(peer, contact);
  }

  /**
   * Open a conversation with a peer identified by id, whether or not the
   * inbox list has loaded a row for them.
   *
   * openChat() can only open a conversation the list already rendered — it
   * reads the peer out of a chat_contact_item view. Contact Support has no
   * such row to click (the support account is usually not in the user's
   * address book at all), so this builds the peer from the id and selects
   * the matching row afterwards if one happens to exist.
   *
   * @param {String} entity_id  peer's entity id
   * @param {Object} meta       display fields + presentation flags (is_support)
   */
  async openPeer(entity_id, meta = {}) {
    if (!entity_id) return;
    if (entity_id === Visitor.id) {
      // There is no conversation with yourself. Callers should not reach
      // here (the support entry point hides for the support account), but a
      // stale configuration must not mount a self-chat.
      return this.warn("chat_p2p.openPeer: refusing to open a self conversation");
    }

    // Re-entrancy guard: the entry point is a button, and mounting the
    // conversation is async. A second click while the first is in flight
    // would feed the chat panel twice.
    if (this._openingPeer === entity_id) return;
    this._openingPeer = entity_id;

    try {
      const list = this.getPart && this.getPart("contact-list");
      const rows =
        (list && list.getItemsByAttr && list.getItemsByAttr(_a.entity_id, entity_id)) || [];
      const row = rows[0];

      // A placeholder row is one WE drew because the server did not return
      // the conversation — which is exactly what an archived conversation
      // looks like. Un-archive before opening, or the thread comes back
      // while the inbox keeps hiding it on every reload. Idempotent when it
      // was never archived.
      if (meta.is_support && (!row || row.mget("is_placeholder"))) {
        await this._unarchivePeer(entity_id);
      }

      // A row exists (the conversation is already in the inbox) — go through
      // the normal path so notification counts and selection state are reset
      // exactly as a click would, then layer the presentation flags on top.
      if (row) {
        if (meta.is_support) row.mset("is_support", 1);
        await this.openChat(row);
        if (meta.is_support && this.activePeer) this.activePeer.is_support = 1;
        return;
      }

      const peer = {
        ...meta,
        entity_id,
        drumate_id: meta.drumate_id || entity_id,
        flag: _a.contact,
      };
      // `display` is what the header and the inbox row both label the peer
      // with; without it the conversation opens under a blank name.
      if (!peer.display) {
        peer.display =
          `${meta.firstname || ""} ${meta.lastname || ""}`.trim() || entity_id;
      }

      // Give the conversation a row straight away rather than open a chat the
      // sidebar has no trace of. Nothing is written server-side until the user
      // posts, so a row for an unused conversation simply does not come back
      // on the next load.
      this._addOpenedContactRow(peer);

      await this._openConversation(peer, this._peerShim(peer));
    } finally {
      this._openingPeer = null;
    }
  }

  /**
   * Bring a conversation out of the archive. Failure is non-fatal: the
   * conversation still opens, it just stays hidden in the inbox listing.
   * @param {String} entity_id
   */
  async _unarchivePeer(entity_id) {
    try {
      await this.postService(SERVICE.chat.change_status, {
        entity_id,
        status: _a.active,
      });
    } catch (e) {
      this.warn("chat_p2p: could not unarchive the conversation", e);
    }
  }

  /**
   * Pin a "Drumee Support" row at the top of the inbox, so support is always
   * reachable from the conversation list rather than only from the Get help
   * screen.
   *
   * The server cannot supply this row: chat_rooms lists a peer once there is
   * a conversation, and pre-loads same-domain colleagues only when
   * `_domain_id > 1` — so on the main domain a support account nobody has
   * written to yet appears in neither branch. The row is therefore drawn
   * client-side until the first message makes it real, at which point the
   * server returns it and this becomes a no-op.
   */
  async _ensureSupportRow() {
    if (typeof Desk === "undefined" || !_.isFunction(Desk.supportContact)) return;

    let support;
    try {
      support = await Desk.supportContact();
    } catch (e) {
      return;
    }
    // Nothing configured, or the viewer IS support — their inbox is the
    // support queue, so a row pointing at themselves is meaningless.
    if (!support || !support.entity_id || ~~support.is_self === 1) return;
    if (support.entity_id === Visitor.id) return;

    const list = this.getPart && this.getPart("contact-list");
    if (!list) return;
    const existing =
      (list.getItemsByAttr &&
        list.getItemsByAttr(_a.entity_id, support.entity_id)) || [];
    // A real conversation already exists — leave the server's row alone.
    if (existing.length) return;

    const item = this._addOpenedContactRow(
      {
        entity_id: support.entity_id,
        drumate_id: support.entity_id,
        firstname: support.firstname || "",
        lastname: support.lastname || "",
        display: support.display || LOCALE.SUPPORT_CHAT_TITLE,
        flag: _a.contact,
        is_support: 1,
      },
      // Drawn by us, not the server: it must not steal the selection from a
      // real conversation the landing already opened.
      { select: false, placeholder: true },
    );

    // An account with no conversations at all lands on nothing, because the
    // landing above ran before this row existed. Support is then the only
    // thing in the inbox, and the right first screen.
    // Only while Direct is the tab in view: opening it from anywhere else
    // would yank the user off the tab they chose.
    if (
      item &&
      this._scopeKey() === "direct" &&
      !this._panes.direct &&
      !this._openCount &&
      !this._isMobile()
    ) {
      this.openChat(item);
    }
  }

  /**
   * Which row to open when the inbox lands with nothing specific requested.
   *
   * Prefers a real conversation over a placeholder — landing on the pinned
   * support row would bury the conversation the user actually came back for.
   * Falls back to the placeholder when it is all there is, which is the right
   * first screen for an account with no conversations yet.
   *
   * "Placeholder" is overloaded here and the two senses are unrelated:
   * `is_placeholder` marks the support row WE draw (a real, openable
   * conversation), while an EMPTY list has the ui-core smart list's own
   * NO_CONTACT note sitting in `children` as `__placeholder` — a Note, not a
   * conversation. Only the first is landable, so the note is dropped by
   * requiring an entity_id, which every conversation row carries (contact rows
   * from chat_rooms directly, workspace rows via the prepareData normaliser in
   * onPartReady). Without that, an empty scope lands on the note and openChat
   * runs until _openConversation bails on a missing hub_id.
   *
   * @param {View} list
   * @returns {View|null}
   */
  _landingRow(list) {
    const children = list && list.children;
    if (!children) return null;
    const kids = [];
    if (_.isFunction(children.toArray)) {
      kids.push(...children.toArray());
    } else if (_.isFunction(children.forEach)) {
      children.forEach((c) => kids.push(c));
    } else if (_.isFunction(children.first)) {
      // Last resort: only the head is reachable, which is the pre-existing
      // behaviour this method replaced.
      return children.first() || null;
    }
    const visible = kids.filter(
      (c) =>
        c &&
        c.el &&
        c.el.style.display !== "none" &&
        c !== list.__placeholder &&
        _.isFunction(c.mget) &&
        c.mget(_a.entity_id),
    );
    return visible.find((c) => !c.mget("is_placeholder")) || visible[0] || null;
  }

  /**
   * Add an inbox row for a conversation the list has no row for.
   * @param {Object} peer
   * @param {Object} opt   select: also make it the active row (default true)
   *                       placeholder: drawn by us, not returned by the server
   */
  _addOpenedContactRow(peer, opt = {}) {
    const list = this.getPart && this.getPart("contact-list");
    if (!list || !_.isFunction(list.prepend)) return;

    const { select = true, placeholder = false } = opt;
    const itemsOpt = list.mget(_a.itemsOpt) || {};
    const item = list.prepend({
      ...itemsOpt,
      ...peer,
      // No history yet: an empty preview reads better than a stale one, and
      // no timestamp is truthful until the first message exists.
      message: peer.message || LOCALE.SUPPORT_START_CONVERSATION,
      room_count: 0,
      is_placeholder: placeholder ? 1 : 0,
    });

    // Select it, and drop whatever was selected before — openChat() does this
    // for a clicked row, and this path bypasses it.
    if (select && list.children) {
      list.children.forEach((c) => {
        if (c.el) c.el.dataset.radio = c === item ? "on" : "off";
      });
    }
    this._applyFilter();
    return item;
  }

  /**
   * chat-header reads its fields through `mget`, which a plain peer object
   * does not answer. Wrap one so a synthesised peer renders the same header
   * a list-item-backed peer does.
   */
  _peerShim(peer) {
    return {
      mget: (k) => peer[k],
      mset: (k, v) => {
        peer[k] = v;
      },
      model: { toJSON: () => ({ ...peer }) },
    };
  }

  /**
   * Seed the support conversation with its greeting, the first time it is
   * opened. The text is the server's — it is posted AS the support account,
   * and a client-supplied body would let anyone write in support's name.
   *
   * The server is idempotent (a conversation that already has messages is a
   * no-op), so the once-per-panel latch here is only about not paying for a
   * round trip on every reopen. Failure is silent: the conversation still
   * opens, it just opens empty.
   */
  async _greetSupport() {
    // Latched before the await, not after: two opens racing would otherwise
    // both find it unset and post twice.
    if (this._greeted) return;
    this._greeted = true;
    try {
      const res = await this.postService(SERVICE.support.greet, {});
      if (!res || ~~res.posted !== 1) return;
      // The pinned row still reads "Start a conversation" — it was drawn
      // before the greeting existed. Show what the thread now actually says.
      this._setSupportPreview(res.message);
    } catch (e) {
      // Unlatch, so the next open tries again rather than leaving the thread
      // permanently blank on one dropped request. Safe to retry: the server
      // is idempotent, so at worst this costs a round trip.
      this._greeted = false;
      this.warn("chat_p2p: could not seed the support greeting", e);
    }
  }

  /**
   * Update the inbox preview of the support row after the greeting lands.
   * @param {String} message
   */
  _setSupportPreview(message) {
    if (!message) return;
    const id = supportContactId();
    const list = this.getPart && this.getPart("contact-list");
    if (!id || !list || !_.isFunction(list.getItemsByAttr)) return;
    const row = (list.getItemsByAttr(_a.entity_id, id) || [])[0];
    if (!row || !_.isFunction(row.mset)) return;
    row.mset(_a.message, message);
    const note = row.el && row.el.querySelector(`.${row.fig.family}__note.message`);
    if (note) note.textContent = message;
  }

  /**
   * Mount the conversation for a resolved peer.
   * @param {Object} peer     plain peer data (entity_id, display, flag…)
   * @param {Object} contact  view (or shim) the header reads its fields from
   */
  async _openConversation(peer, contact) {
    const flag = peer.flag;
    const hub_id = peer.entity_id;
    if (!hub_id) return;

    // The conversation goes under the tab it belongs to. Normally that is the
    // tab showing; a DM opened while Workspace chat is up (compose picker,
    // Contact Support, a mention link) switches to Direct rather than mount a
    // person's conversation under a list of workspaces.
    // Counted for the automatic landings (first page, tab press): they open a
    // row only if nothing was opened since they were armed, so they never
    // replace a conversation the user or a caller asked for.
    this._openCount = (this._openCount || 0) + 1;
    const scope = this._scopeForPeer(peer);
    if (scope !== this._scopeKey()) await this._selectScope(scope, { land: false });
    // Last open wins. Opens are async (media.home), and two quick clicks used
    // to mount whichever answered last — not necessarily the one clicked last.
    const seq = (this._openSeq[scope] = (this._openSeq[scope] || 0) + 1);
    const stale = () =>
      this._openSeq[scope] !== seq || (this.isDestroyed && this.isDestroyed());
    // Resolved alongside media.home rather than after it. Needed before the
    // append below: an unresolved kind mounts a failover view in its place,
    // and the pane has to hold the real widget_chat to park it later.
    const kindReady = Kind.waitFor("widget_chat");

    // Already this tab's conversation (tapping the same row again — on mobile
    // that is how you go back into it from the list): show it rather than
    // remount it. It is live, so a remount would only reload what is there.
    const mounted = this._panes[scope];
    if (
      mounted &&
      mounted.widget &&
      !(mounted.widget.isDestroyed && mounted.widget.isDestroyed()) &&
      mounted.peer &&
      String(mounted.peer.entity_id) === String(hub_id) &&
      mounted.peer.flag === flag &&
      !peer.is_support
    ) {
      mounted.contact = contact || mounted.contact;
      if (scope === this._scopeKey()) {
        this._showPane(scope);
        this.el.dataset.mview = "chat";
      }
      return;
    }

    // Support opens with support having already said hello (Figma
    // 58186-204873). Awaited on purpose: widget_chat loads its messages as it
    // mounts, so a greeting written after that point would not appear until
    // the next reload.
    //
    // The id check is what makes this fire on EVERY route into the thread.
    // `is_support` is only carried by rows we drew ourselves; once the
    // conversation is real the server returns an ordinary row, and clicking
    // it — or landing on it — would otherwise skip the greeting entirely.
    if (isSupportEntity(hub_id)) peer.is_support = 1;
    if (peer.is_support) await this._greetSupport();

    let type;
    let home = null;
    let nid = null;
    switch (flag) {
      case _a.share:
        type = _a.share;
        try {
          home = await this._homeFor(hub_id);
          peer.home = home;
          peer.nid = home && home.home_id;
          nid = peer.nid;
        } catch (e) {
          this.warn("Failed to fetch share home", e);
          return;
        }
        break;
      case _a.support:
        type = _a.supportTicket;
        break;
      case _a.contact:
      default:
        type = _a.privateRoom;
        try {
          home = await this._homeFor(Visitor.id);
          nid = home && home.home_id;
        } catch (e) {
          this.warn("Failed to fetch personal home", e);
        }
    }

    const widget_chat = {
      kind: "widget_chat",
      className: "share-room-widget__chat",
      type,
      area: type,
      view: "bigChat",
      hub_id,
      peer_id: type === _a.privateRoom ? peer.drumate_id || peer.entity_id : "",
      peer,
      home,
      nid,
      widgetId: `chat-p2p-${type}-${hub_id}`,
      // The Inbox attaches from the device only: the attach icon opens the
      // file picker straight away instead of a From device / From workspace
      // menu.
      no_workspace_attach: 1,
    };
    // The same media.home widget_chat would otherwise refetch as it mounts —
    // for the SAME hub: its hubId is Visitor.id for a private room (what the
    // default branch fetched) and hub_id for a share room. A copy, since the
    // cached answer is shared by every conversation that follows.
    if (home && (type === _a.privateRoom || type === _a.share)) {
      widget_chat.prefetched_home = { ...home };
    }

    if (type === _a.supportTicket && peer.ticket_id) {
      widget_chat.ticket_id = peer.ticket_id;
    }

    try {
      await kindReady;
    } catch (e) {}
    // A newer open for this tab superseded this one while it resolved.
    if (stale()) return;
    // The user left this tab meanwhile: mount it anyway, parked, so it is
    // there when they come back — but do not touch what is on screen.
    const current = scope === this._scopeKey();

    if (current) {
      this.activePeer = peer;
      this.activePeerType = type;
      // Single-pane mobile/tablet: reveal the chat pane (no effect ≥ 1024px).
      this.el.dataset.mview = "chat";
    }
    // Deliberately NOT raising a skeleton here. This runs for every
    // conversation the user clicks, and skeletonising on a click would take
    // the inbox list down with it — including the row just clicked. The
    // skeletons belong to a scope LOAD; _raiseSkeletons owns that, and the
    // observer it armed is still watching this pane for the paint below.

    if (current) {
      this.ensurePart("chat-header").then((header) => {
        header.clear();
        header.feed(require("./skeleton/chat-header")(this, contact));
      });
    }

    const panel = await this.ensurePart("chat-panel");
    if (stale() || !panel) return;
    // Replaces THIS tab's conversation only; the other tab's stays parked —
    // unless it is this very conversation (Direct and Support share rows):
    // two live copies would share one widgetId and both hold its traffic.
    this._dropPane(scope);
    Object.keys(this._panes).forEach((k) => {
      const p = this._panes[k];
      if (p && p.type === type && p.peer && String(p.peer.entity_id) === String(hub_id)) {
        this._dropPane(k);
      }
    });
    const widget = panel.append(widget_chat);
    this._panes[scope] = { peer, type, contact, widget };
    if (scope === this._scopeKey()) {
      this.chatWidget = widget;
    } else if (widget && _.isFunction(widget.park)) {
      widget.park();
    }
  }

  /**
   * Start an audio or video call with the currently selected peer.
   * Routes 1:1 contacts to window_connect (ringing) and share rooms to window_meeting.
   * @param {Boolean} isVideo
   */
  _startCall(isVideo) {
    const peer = this.activePeer;
    if (!peer) return;

    const existing =
      Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting");
    if (existing) {
      Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
      return;
    }

    const name =
      peer.display ||
      peer.fullname ||
      `${peer.firstname || ""} ${peer.lastname || ""}`.trim();

    if (this.activePeerType === _a.share) {
      Wm.launch(
        {
          kind: "window_meeting",
          hub_id: peer.entity_id,
          nid: peer.nid,
          room_id: peer.nid,
          filename: name,
          display: name,
          video: isVideo ? 1 : 0,
          audio: 1,
        },
        { explicit: 1, singleton: 1 },
      );
      return;
    }

    // Contact items in chat-p2p often carry only `entity_id`; `drumate_id` is
    // null for users who chat with us but aren't saved as a contact yet.
    // window_connect uses callee.drumate_id verbatim as the server's
    // `guest_id`, so without this fallback the invite reaches the SQL proc
    // as guest_id=null → 0 active sockets → caller sees "is not currently
    // online" even when the peer is online. Mirror the same fallback used
    // for peer_id in openChat() above.
    const drumate_id = peer.drumate_id || peer.entity_id;
    Wm.launch(
      {
        kind: "window_connect",
        hub_id: Visitor.id,
        nid: (peer.home && peer.home.home_id) || peer.nid,
        filename: name,
        display: name,
        callee: { ...peer, drumate_id, uid: peer.uid || drumate_id },
        video: isVideo ? 1 : 0,
        audio: 1,
      },
      { explicit: 1, singleton: 1 },
    );
  }

  /**
   * Open the chat for a peer by drumate_id (used by external callers, e.g. mention click).
   * Waits for the contact list to load, then triggers the matching item.
   * @param {String} drumate_id
   */
  openChatByPeerId(drumate_id, message_id) {
    if (!drumate_id) return;
    const tryOpen = (retries = 20) => {
      this.ensurePart("contact-list").then((list) => {
        const items =
          list.children && list.children.toArray ? list.children.toArray() : [];
        const match = items.find(
          (it) => it.mget && it.mget(_a.drumate_id) == drumate_id,
        );
        if (match) {
          this.openChat(match);
          if (message_id) {
            setTimeout(() => {
              if (this.chatWidget && this.chatWidget.scrollToMessage) {
                this.chatWidget.scrollToMessage(message_id);
              }
            }, 800);
          }
          return;
        }
        if (retries > 0) setTimeout(() => tryOpen(retries - 1), 200);
      });
    };
    tryOpen();
  }

  /**
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    // trigger.service is the JS property set by widget_chat before calling
    // triggerHandlers — args.service is absent when widget_chat passes raw args.
    const service = args.service || trigger.get(_a.service) || trigger.service;
    switch (service) {
      case "load-conversation":
        return this.openChat(trigger);

      case "video-call":
        return this._startCall(true);

      case "audio-call":
        return this._startCall(false);

      case "close-chat":
        // The Inbox is a full-canvas screen in the desk's settings-main-slot,
        // not the "chat-panel" slide-out it once was. Toggling "chat-panel"
        // targeted a slot this screen is not in, so the X did nothing. Leave
        // it the way the rail leaves any section screen.
        if (typeof Desk !== "undefined" && _.isFunction(Desk.closeSectionScreen)) {
          Desk.closeSectionScreen();
        } else if (typeof Desk !== "undefined" && _.isFunction(Desk.closeMainPanels)) {
          Desk.closeMainPanels();
        }
        break;

      case "back-to-list":
        // Mobile/tablet: return from the chat pane to the inbox sidebar.
        this.el.dataset.mview = "sidebar";
        break;

      // Scope tabs (Figma 43:32209) — these switch the QUERY, see _setRoomScope.
      case "filter-direct":
        this._setRoomScope("direct");
        break;

      case "filter-workspace":
        this._setRoomScope("workspace");
        break;

      // Live conversation search (Figma 43:32209). Filters the ALREADY-LOADED
      // rows rather than refetching: the list is a paged smart list, so a
      // server round-trip per keystroke would fight pagination and flicker.
      case "inbox-search-typed": {
        const next = String((args && args.value) || "").trim().toLowerCase();
        if (next === this._searchTerm) break;   // key that changed nothing
        this._searchTerm = next;
        // Debounced: `watch` fires per keystroke and _applyFilter walks every
        // loaded row writing style.display. Typing "marketing" would run that
        // nine times in ~400ms, each pass forcing a style recalc over the list.
        // One pass 120ms after the user stops is indistinguishable to them and
        // an order of magnitude less work.
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => this._applyFilter(), 120);
        break;
      }

      // Unreads is now a header toggle rather than a tab, so it layers on top
      // of whichever scope is showing instead of replacing it.
      case "toggle-unreads":
        this._unreadOnly = this._unreadOnly ? 0 : 1;
        this.ensurePart("unread-toggle").then((p) => {
          if (p && p.el) p.el.dataset.state = this._unreadOnly ? "1" : "0";
        });
        this._applyFilter();
        break;

      // Retained for callers outside the tab row (deep links, tests).
      case "filter-all":
        this._activeFilter = "all";
        this._applyFilter();
        break;

      case "filter-unread":
        this._activeFilter = "unread";
        this._applyFilter();
        break;

      case "filter-mentions":
        this._activeFilter = "mentions";
        this._applyFilter();
        break;

      case "filter-support":
        // A support room is a contact room, so this shares the direct query
        // and narrows it in _applyFilter — but it is still a scope TAB, so it
        // goes through _setRoomScope to keep the tab state coherent.
        this._setRoomScope("support");
        this._applyFilter();
        break;

      case "toggle-compose":
        this._toggleComposePopup();
        break;

      case "compose-search": {
        const v =
          (args && (args.value || (args.target && args.target.value))) ||
          (trigger.getValue && trigger.getValue()) ||
          "";
        this._filterComposeList(v);
        break;
      }

      case "compose-pick":
        this._toggleComposePopup(false);
        return this.openChat(trigger);

      case "forward-message": {
        // In chat-p2p there is no intermediate chat_room widget, so `trigger`
        // is widget_chat itself (it holds _selectedMessages, hubId, peerId).
        // window_bigchat uses cmd.source because chat_room sets source=widget_chat
        // before bubbling up; here we skip that extra hop.
        const chatWidget = trigger;
        if (!chatWidget || !chatWidget._selectedMessages) return;
        this.ensurePart("overlay-wrapper").then((overlay) => {
          overlay.el.dataset.mode = _a.open;
          this.ensurePart("wrapper-chat-overlay").then((chatOverlay) => {
            chatOverlay.feed({
              kind: "widget_chat_item_forward",
              source: trigger,
              messages: chatWidget._selectedMessages,
              msghubID: chatWidget.hubId,
              peer_id: chatWidget.peerId || "",
            });
          });
        });
        return;
      }

      case "lightbox-close":
        return this._closeLightbox();

      case "lightbox-prev":
        return this._stepLightbox(-1);

      case "lightbox-next":
        return this._stepLightbox(1);

      case "lightbox-download": {
        const media = this._lightboxMedia;
        if (media && !(media.isDestroyed && media.isDestroyed()) && _.isFunction(media.download)) {
          media.download();
        }
        return;
      }

      case "close-overlay": {
        this.ensurePart("overlay-wrapper").then((overlay) => {
          overlay.el.dataset.mode = _a.closed;
          this.ensurePart("wrapper-chat-overlay").then((chatOverlay) => {
            chatOverlay.clear();
            chatOverlay.el.dataset.state = _a.closed;
          });
        });
        return;
      }

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  onWsMessage(service, data, options = {}) {
    // THE REAL SERVICE IS IN `options.service`, WITH THE FIRST ARG AS FALLBACK.
    //
    // A server push built with `payload(data, {service})` carries the service
    // inside `options` and NOTHING at the top level, so the push router stamps
    // the envelope name there instead — `payload.service = "live.update"`
    // (server-team router/push/index.js) — and that envelope name is exactly
    // what the dispatcher hands over as the first argument
    // (router/websocket/index.js reads `payload.service || msg.service`).
    //
    // So switching on the first argument alone matched "live.update" every
    // time: chat.post, channel.post AND the acknowledge cases all fell to
    // `default`, and live inbox updates were dead — an incoming message never
    // moved a conversation up the list, never refreshed its preview line and
    // never bumped its unread badge, so the inbox stayed frozen until a
    // reload. (The earlier `const { service } = options || svc` was broken for
    // its own reason: it destructured `options` and dropped the fallback, so a
    // sender that DOES label the frame itself was missed.) This form is the one
    // widget_chat, window_tasks, panel_calendar and window_folder all use.
    const svc = (options && options.service) || service;
    switch (svc) {
      case SERVICE.chat.post:
      case SERVICE.channel.post:
        this._updateContactItemOnPost(data);
        break;
      case SERVICE.chat.acknowledge:
      case SERVICE.channel.acknowledge:
        this._resetContactItemCount(data);
        break;
      // A meeting that ends posts nothing: channel.meeting_end flips the start
      // card's metadata and re-broadcasts that same row. Literal service name —
      // SERVICE.channel.meeting_end is undefined against an older server.
      case "channel.meeting_end":
        this._endMeetingPreview(data);
        break;
      default:
        if (super.onWsMessage) super.onWsMessage(service, data, options);
    }
  }

  /**
   * Turn a row's preview from "X started a meeting" into "X ended the meeting"
   * when the card it is previewing is the one that just ended.
   *
   * The status is stored on the row as well as painted: the workspace rows are
   * reloaded from group_chat_rooms, which returns only
   * {id, group_name, room_count, message, ctime}, so a re-render with nothing
   * kept would resurrect the "started" wording.
   *
   * @param {Object} data the re-broadcast message row
   */
  _endMeetingPreview(data) {
    // findMeetingRow owns the payload's shape (the hub is in `key_id` on this
    // service) and picks the row by body — see libs/chat-preview. Both lists
    // are live, so the row may be in the one not showing.
    const { direct, workspace } = this._lists;
    const item =
      (workspace && findMeetingRow(workspace, data)) ||
      (direct && findMeetingRow(direct, data));
    if (!item) return;
    item.mset("meeting_status", "ended");
    if (item.__message) {
      item.__message.set(
        _a.content,
        chatPreview(data.message, {
          metadata: data.metadata,
          meetingStatus: "ended",
        })
      );
    }
  }

  _updateContactItemOnPost(data) {
    if (!data) return;
    const direct = this._lists.direct;
    const workspace = this._lists.workspace;
    if (!direct && !workspace) return;
    // Both lists stay mounted and are kept current here, the hidden one too —
    // that is what lets a tab switch show them without a refetch. Same keys
    // in the same order as when one list served both tabs; each lookup just
    // asks the list whose rows can carry that key.
    const find = (l, attr, v) => {
      if (!l || !_.isFunction(l.getItemsByAttr) || v == null || v === "") return null;
      const r = l.getItemsByAttr(attr, v);
      return (r && r[0]) || null;
    };
    let list = direct;

    // Message payload now has peer_id, but contact items (from chat_rooms)
    // still carry entity_id. Match by value.
    let item = find(direct, _a.entity_id, data.peer_id);
    // A WORKSPACE row is keyed by the hub ITSELF — the group_chat_rooms
    // normaliser in onPartReady maps its `id` onto entity_id, and the row
    // carries no hub_id of its own — so neither key below could ever find one:
    // a workspace post moved nothing in the inbox until it was remounted.
    //
    // Asked BEFORE the hub_id sweep, because that one is the loose match: the
    // only rows carrying a hub_id are CONTACT rows, and it is the visitor's own
    // hub, so a post into the PERSONAL workspace (whose hub is that same hub)
    // matches an arbitrary contact row. An entity_id equal to the posting hub
    // can only be that hub's own row.
    // `key_id` is the same hub under another name on the services that answer
    // with a bare channel row (see findMeetingRow); channel.post stamps hub_id.
    // NEVER pass an absent key to getItemsByAttr: it compares strict-equal, so
    // `undefined` collects every row that merely lacks the attribute.
    const hub = data.hub_id || data.key_id;
    if (!item && hub) {
      item = find(workspace, _a.entity_id, hub);
      if (item) list = workspace;
    }
    if (!item && hub) item = find(direct, _a.entity_id, hub);
    if (!item && hub) item = find(direct, "hub_id", hub);
    // A new conversation's first message is a person's: it belongs in the
    // direct list, whichever tab is showing.
    if (!item) return direct ? this._addContactItemOnPost(direct, data) : undefined;

    let room_count = item.mget("room_count") || 0;
    if (item.mget(_a.state) === 1) {
      room_count = 0;
    } else if (data.author_id !== Visitor.id) {
      room_count += 1;
    }

    // Preview text, not the raw body: a meeting posts a
    // [[MEETING:start:{json}]] sentinel (channel.post drops a custom
    // message_type, so the payload rides in the body) and this path used to
    // print it verbatim next to the workspace whose chat renders it as a card.
    // Same helper the row's own skeleton uses, so the line reads the same on
    // load and on a push — which also gets this path the mention strip it never
    // had ("[@Bob](user:xxx)" previewed literally).
    const msg = chatPreview(data.message, {
      metadata: data.metadata,
      messageType: data.message_type,
      isAttachment: data.is_attachment === 1,
    });

    item.mset("room_count", room_count);
    // The model keeps the RAW body — _endMeetingPreview matches on it.
    item.mset(_a.message, data.message);
    item.mset("meeting_status", meetingStatusOf(data));
    item.mset(_a.ctime, data.ctime);
    // The pinned support row stops being a placeholder the moment it carries
    // a real message, so it can be landed on like any other conversation.
    if (item.mget("is_placeholder")) item.mset("is_placeholder", 0);

    // Track has_mention: increment if this message mentions current user.
    // mention_ids may arrive as a JSON string from the DB — normalise first.
    if (data.author_id !== Visitor.id) {
      let mentionIds = data.mention_ids || [];
      if (typeof mentionIds === "string") {
        try {
          mentionIds = JSON.parse(mentionIds);
        } catch (e) {
          mentionIds = [];
        }
      }
      const isMentioned = Array.isArray(mentionIds)
        ? mentionIds.some((id) => String(id) === String(Visitor.id))
        : false;
      if (isMentioned) {
        item.mset("has_mention", ~~(item.mget("has_mention") || 0) + 1);
        const senderName = (data.firstname || data.surname || "").trim();
        const msg = senderName
          ? `${senderName} ${LOCALE.MENTIONED_YOU}`
          : LOCALE.MENTIONS;
        Wm.alert(msg, 3000);
      }
    }

    if (item.__message) item.__message.set(_a.content, msg);
    if (item.__msgTime) {
      const t = Dayjs.unix(data.ctime)
        .locale(Visitor.language())
        .format("HH:mm");
      item.__msgTime.set(_a.content, t);
    }
    if (_.isFunction(item.updateNotification)) item.updateNotification();

    this._scheduleListSettle(list);
  }

  /**
   * Coalesce the re-sort + re-filter that follows an incoming message.
   *
   * Both are whole-list operations (sort is O(n log n), _applyFilter walks
   * every row), and chat traffic is BURSTY — a busy workspace delivers several
   * posts in the same tick, and each one used to trigger its own pass. Now the
   * last event in a burst pays for all of them, one frame later.
   *
   * This only started to matter once the WS handler was fixed: with the
   * service misread the whole path was dead, so the cost never showed up.
   */
  _scheduleListSettle(list) {
    // A set: with both lists live, one burst can touch both, and each needs
    // its own re-sort.
    if (!this._pendingSettle) this._pendingSettle = new Set();
    if (list) this._pendingSettle.add(list);
    if (this._settleTimer) return;
    this._settleTimer = setTimeout(() => {
      this._settleTimer = null;
      const lists = this._pendingSettle;
      this._pendingSettle = null;
      if (!lists || (this.isDestroyed && this.isDestroyed())) return;
      lists.forEach((l) => {
        if (l && !(l.isDestroyed && l.isDestroyed()) && l.collection && l.collection.sort) {
          l.collection.sort();
        }
      });
      // Filters the list on screen; a hidden one is re-gated when shown.
      this._applyFilter();
    }, 80);
  }

  /**
   * A message arrived from someone the inbox has no row for — the first
   * contact of a brand-new conversation, which is exactly what a support
   * request is. Without this the row only appears when the panel is next
   * remounted, so an admin sitting on an open inbox never sees the request
   * land.
   *
   * The WS payload carries everything a row needs: `peer_id` is the sender
   * (the server rewrites it to the sender's id on the recipient's copy),
   * plus their name, the message and the unread count.
   */
  _addContactItemOnPost(list, data) {
    const peer_id = data.peer_id;
    // Own echo from a sibling session, or a payload with no peer to key on.
    if (!peer_id || peer_id === Visitor.id || data.author_id === Visitor.id) return;
    if (!_.isFunction(list.prepend)) return;

    const firstname = data.firstname || "";
    const lastname = data.lastname || "";
    const display = `${firstname} ${lastname}`.trim() || peer_id;

    const itemsOpt = list.mget(_a.itemsOpt) || {};
    list.prepend({
      ...itemsOpt,
      entity_id: peer_id,
      drumate_id: peer_id,
      firstname,
      lastname,
      display,
      flag: _a.contact,
      // Not in the address book — this is what marks it a support request
      // on the admin's side (see _isSupportRow).
      status: "nocontact",
      // Raw body: chat_contact_item's skeleton derives the preview from it.
      message: data.message,
      meeting_status: meetingStatusOf(data),
      ctime: data.ctime,
      room_count: ~~(data.room || 1),
      is_attachment: data.is_attachment === 1 ? 1 : 0,
    });

    this._scheduleListSettle(list);
  }

  /**
   * Is this inbox row a support conversation?
   *
   * Two different questions depending on which side you are on, both
   * answered from data the inbox already returns:
   *  - as a user, the row IS the support account;
   *  - as the admin who answers support, the row is someone with no address
   *    book entry — chat_rooms reports them `status: 'nocontact'`. The
   *    feature targets external users, so a stranger with a conversation is
   *    a support request.
   *
   * @param {View|Object} item  a chat_contact_item (or anything with mget)
   */
  _isSupportRow(item) {
    if (!item || !_.isFunction(item.mget)) return false;
    if (item.mget("is_support")) return true;

    if (isSupportEntity(item.mget(_a.entity_id))) return true;

    const supportId = supportContactId();

    // Admin side: only meaningful for the account that answers support.
    if (!supportId || supportId !== Visitor.id) return false;
    return item.mget(_a.status) === "nocontact";
  }

  _applyFilter() {
    const list = this._contactList;
    if (!list || !list.children) return;
    const filter = this._activeFilter || "all";
    // The Unreads header toggle layers on top of the scope tab: a row must
    // satisfy BOTH to stay visible. Applied first so every branch below sees
    // the same gate rather than each re-implementing it.
    const unreadGate = (item) =>
      !this._unreadOnly || ~~(item.mget("room_count") || 0) > 0;
    // Name match, case-insensitive. Reads the same fields the row DISPLAYS
    // (display / fullname / first+last), so what you type matches what you see
    // — including workspace rows, whose name arrives as group_name and is
    // normalised onto fullname/display in prepareData.
    const term = this._searchTerm || "";
    const searchGate = (item) => {
      if (!term) return true;
      // Built once per row and cached on the view. The name does not change
      // while the user types, so recomputing four mget()s, a join and a
      // toLowerCase for every row on every keystroke was pure waste.
      // _updateContactItemOnPost clears it if a row is renamed.
      if (item._searchName == null) {
        item._searchName = [
          item.mget("display"),
          item.mget(_a.fullname),
          `${item.mget(_a.firstname) || ""} ${item.mget(_a.lastname) || ""}`,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
      }
      return item._searchName.indexOf(term) !== -1;
    };
    // Write only on CHANGE. Assigning style.display invalidates style for the
    // element even when the value is identical, so the old unconditional
    // writes dirtied every row on every pass — including the common case where
    // nothing moved.
    const show = (item, on) => {
      const want = on ? "" : "none";
      if (item.el.style.display !== want) item.el.style.display = want;
      return on;
    };
    let visible = 0;
    list.children.forEach((item) => {
      if (!item.el) return;
      if (!unreadGate(item) || !searchGate(item)) {
        show(item, false);
        return;
      }
      if (filter === "all") {
        show(item, true);
        visible += 1;
        return;
      }
      const count = ~~(item.mget("room_count") || 0);
      if (filter === "unread") {
        if (show(item, count > 0)) visible += 1;
      } else if (filter === "mentions") {
        const hasMention = ~~(item.mget("has_mention") || 0) > 0;
        show(item, hasMention);
        if (hasMention) visible += 1;
      } else if (filter === "support") {
        // Named isSupport, not `show`: that shadowed the show() helper above
        // and bypassed its write-on-change guard for this branch.
        const isSupport = this._isSupportRow(item);
        if (show(item, isSupport)) visible += 1;
      }
    });
    // Show "All read" only while unread-only is in force and nothing matches
    // (i.e. there ARE rooms, just none with unread messages). Now keyed on the
    // header toggle as well as the retained 'unread' filter value, since the
    // Unread tab became a toggle.
    if (this._allReadEmpty && this._allReadEmpty.el) {
      const unreadMode = !!this._unreadOnly || filter === "unread";
      const showAllRead =
        unreadMode && visible === 0 && list.children.length > 0;
      this._allReadEmpty.el.dataset.state = showAllRead ? 1 : 0;
    }
  }

  _resetContactItemCount(data) {
    if (!data || data.peer_id == null || data.peer_id === "") return;
    // Message payload has peer_id, contact items have entity_id. Both lists
    // are live; a workspace row is keyed by its hub, never by a peer.
    let item = null;
    [this._lists.direct, this._lists.workspace].some((list) => {
      if (!list || !_.isFunction(list.getItemsByAttr)) return false;
      const r = list.getItemsByAttr(_a.entity_id, data.peer_id);
      item = (r && r[0]) || null;
      return !!item;
    });
    if (!item) return;
    item.mset("room_count", 0);
    item.mset("has_mention", 0);
    if (_.isFunction(item.updateNotification)) item.updateNotification();
    this._applyFilter();
  }
}

module.exports = __chat_p2p;
