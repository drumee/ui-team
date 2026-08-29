const { supportContactId, isSupportEntity } = require("libs/support");

class __chat_p2p extends LetcBox {
  constructor(...args) {
    super(...args);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.getContactsApi = this.getContactsApi.bind(this);
    this.openChat = this.openChat.bind(this);
    this.openPeer = this.openPeer.bind(this);
    this._onDocClick = this._onDocClick.bind(this);
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
    opt.dataset = { ...opt.dataset, anim: "in", mview: "sidebar" };
    super.initialize(opt);
    this.declareHandlers();
    this._radioId = `peer-${this.mget(_a.widgetId)}`;
    this._filter = _a.contact;
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
    clearTimeout(this._settleTimer);
    this.unbindEvent(_a.live);
    document.removeEventListener("mousedown", this._onDocClick);
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

    const list = this._contactList;
    if (list && list.getItemsByAttr) {
      const items = list.getItemsByAttr(_a.entity_id, peerId) || [];
      items.forEach((item) => {
        if (!item) return;
        item.mset && item.mset(_a.online, status);
        if (item.el) item.el.dataset.online = status == null ? "" : status;
      });
    }
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
    if (this._roomScope === "workspace") {
      return {
        service: SERVICE.chat.share_rooms,
        hub_id: Visitor.get(_a.id),
      };
    }
    return {
      service: SERVICE.chat.chat_rooms,
      flag: _a.contact,
      option: _a.active,
      hub_id: Visitor.get(_a.id),
    };
  }

  /**
   * Switch the list SOURCE. Unlike the old filter tabs this is a refetch, not
   * a show/hide — the two scopes come from different services. No-op when the
   * scope is unchanged, so re-clicking the active tab doesn't refetch.
   */
  async _setRoomScope(scope) {
    const next = scope || "direct";
    if (this._roomScope === next) return;
    this._roomScope = next;
    // Support narrows the direct list, so it shares that query.
    this._activeFilter = next === "support" ? "support" : "all";
    // Warm the desk's workspace index BEFORE the list restarts.
    // group_chat_rooms returns no area/kind, so the per-workspace icon is
    // resolved by joining on that index (see _workspaceMeta). prepareData is
    // synchronous, so the cache has to be populated by the time rows arrive or
    // every row falls back to the generic room glyph for that render.
    if (next === "workspace" && typeof Desk !== "undefined" && _.isFunction(Desk._fetchWorkspaces)) {
      try {
        await Desk._fetchWorkspaces();
      } catch (e) {
        this.warn && this.warn("[inbox] workspace index unavailable", e);
      }
    }
    const list = await this.ensurePart("contact-list");
    if (list && _.isFunction(list.restart)) list.restart();
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
    return {
      service: SERVICE.chat.chat_rooms,
      flag: _a.contact,
      option: _a.active,
      hub_id: Visitor.get(_a.id),
    };
  }

  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    RADIO_CLICK.on(_e.click, this._onOutsideClick);
  }

  /**
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "contact-list":
        this._contactList = child;
        // Workspace-chat rows arrive in a DIFFERENT shape from contact rows.
        // chat.share_rooms -> group_chat_rooms returns one row per hub
        // { id, group_name, room_count, message, ctime }, while every consumer
        // downstream (chat_contact_item, openChat, _openConversation) speaks
        // the contact shape { entity_id, fullname, flag, ... }.
        //
        // Normalised HERE, by wrapping prepareData, rather than by teaching
        // the shared row widget a second shape or by adding an itemsMap to the
        // list: itemsMap assigns unconditionally, so mapping id -> entity_id
        // would blank entity_id on ordinary contact rows. Same technique
        // desk/workspace-list uses to reshape its own mixed payload.
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
        child.once(_e.eod, async () => {
          this.el.dataset.anim = "in";
          this._applyFilter();
          // Deliberately NOT awaited: resolving the support account is a
          // network call, and putting it in front of the landing below would
          // mean a slow or hanging lookup leaves the inbox with nothing open.
          // It pins its own row and opens it only if nothing else did.
          // Direct Chat only. This pins the Drumee Support conversation into
          // the list, and `eod` fires again on every restart — including the
          // one _setRoomScope triggers — so without the guard switching to
          // Workspace chat injected a person into a list of workspaces.
          if (this._roomScope !== "workspace") this._ensureSupportRow();
          await Kind.waitFor("widget_chat");
          // Mounted with a conversation to open (Contact Support): honour it
          // instead of landing on the first row, on every screen size — the
          // user asked for this specific conversation, not the inbox.
          const pending = this.mget("open_peer");
          if (pending && pending.entity_id) {
            this.mset("open_peer", null);
            return this.openPeer(pending.entity_id, pending);
          }
          // On mobile/tablet stay on the inbox — auto-opening the first
          // conversation would jump past the sidebar the user expects to
          // land on. They tap a contact to reveal the chat pane.
          if (this._isMobile()) return;
          this.openChat(this._landingRow(child));
        });
        break;

      case "compose-popup":
        this._composePopup = child;
        document.addEventListener("mousedown", this._onDocClick);
        break;

      case "compose-list":
        this._composeList = child;
        if (child.collection) {
          child.collection.comparator = (item) => -item.get(_a.ctime);
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
      if (this._composeList && _.isFunction(this._composeList.restart)) {
        this._composeList.restart();
      }
      this._filterComposeList("");
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

  _filterComposeList(text) {
    if (!this._composeList || !this._composeList.children) return;
    const q = (text || "").trim().toLowerCase();
    this._composeList.children.forEach((item) => {
      if (!item.el) return;
      if (!q) {
        item.el.style.display = "";
        return;
      }
      // Read the DISPLAYED name from the item's rendered DOM — this is the
      // ground truth no matter which model field fed it (firstname,
      // fullname, name, display_name, etc.). Fall back to a wide net of
      // common model keys to cover items rendered before their DOM is
      // ready or with non-text avatars.
      let haystack = "";
      const nameEl = item.el.querySelector(
        ".widget-chatcontactItem__note.name",
      );
      if (nameEl) haystack += " " + (nameEl.textContent || "");
      if (item.mget) {
        haystack +=
          " " +
          [
            item.mget(_a.firstname),
            item.mget(_a.lastname),
            item.mget(_a.fullname),
            item.mget(_a.name),
            item.mget(_a.email),
            item.mget("display_name"),
            item.mget("username"),
            item.mget("hubname"),
          ]
            .filter(Boolean)
            .join(" ");
      }
      item.el.style.display = haystack.toLowerCase().includes(q) ? "" : "none";
    });
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

    this.ensurePart("contact-list").then((list) => {
      if (list.children) {
        list.children.forEach((c) => {
          if (c.el) c.el.dataset.radio = c === contact ? "on" : "off";
        });
      }
    });

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
    if (item && !this.chatWidget && !this._isMobile()) {
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
      (c) => c && c.el && c.el.style.display !== "none",
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
          home = await this.fetchService(
            SERVICE.media.home,
            { hub_id },
            { async: 1 },
          );
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
          home = await this.fetchService(
            SERVICE.media.home,
            { hub_id: Visitor.id },
            { async: 1 },
          );
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
    };

    if (type === _a.supportTicket && peer.ticket_id) {
      widget_chat.ticket_id = peer.ticket_id;
    }

    this.activePeer = peer;
    this.activePeerType = type;

    // Single-pane mobile/tablet: reveal the chat pane (no effect ≥ 1024px).
    this.el.dataset.mview = "chat";

    this.ensurePart("chat-header").then((header) => {
      header.clear();
      header.feed(require("./skeleton/chat-header")(this, contact));
    });

    this.ensurePart("chat-panel").then((panel) => {
      panel.clear();
      panel.feed(widget_chat);
      this.chatWidget = panel.children.last();
    });
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
        Desk.togglePanel("chat_p2p", "chat-panel");
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
    // The dispatcher calls onWsMessage(service, model, options) — the SERVICE
    // IS THE FIRST ARGUMENT (router/websocket/index.js:41).
    //
    // This read it as `const { service } = options || svc`. `options` defaults
    // to {} and {} is truthy, so it destructured the empty object every time:
    // `service` came out undefined, the switch always fell to default, and
    // NEITHER case ever ran. Live inbox updates were dead — an incoming
    // message never moved a conversation up the list, never refreshed its
    // preview line and never bumped its unread badge, so the inbox looked
    // frozen until a reload. Same trap the project's framework-invariants
    // rule §7 calls out by name.
    switch (service) {
      case SERVICE.chat.post:
      case SERVICE.channel.post:
        this._updateContactItemOnPost(data);
        break;
      case SERVICE.chat.acknowledge:
      case SERVICE.channel.acknowledge:
        this._resetContactItemCount(data);
        break;
      default:
        if (super.onWsMessage) super.onWsMessage(service, data, options);
    }
  }

  _updateContactItemOnPost(data) {
    const list = this.getPart && this.getPart("contact-list");
    if (!list || !data) return;

    // Message payload now has peer_id, but contact items (from chat_rooms)
    // still carry entity_id. Match by value.
    let item =
      list.getItemsByAttr && list.getItemsByAttr(_a.entity_id, data.peer_id);
    item = item && item[0];
    if (!item && data.hub_id) {
      item = list.getItemsByAttr && list.getItemsByAttr("hub_id", data.hub_id);
      item = item && item[0];
    }
    if (!item) return this._addContactItemOnPost(list, data);

    let room_count = item.mget("room_count") || 0;
    if (item.mget(_a.state) === 1) {
      room_count = 0;
    } else if (data.author_id !== Visitor.id) {
      room_count += 1;
    }

    let msg = data.message;
    if (_.isEmpty(msg) && data.is_attachment === 1) {
      msg = LOCALE.ATTACHMENT;
    }

    item.mset("room_count", room_count);
    item.mset(_a.message, msg);
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
    this._pendingSettle = list;
    if (this._settleTimer) return;
    this._settleTimer = setTimeout(() => {
      this._settleTimer = null;
      const l = this._pendingSettle;
      this._pendingSettle = null;
      if (!l || (this.isDestroyed && this.isDestroyed())) return;
      if (l.collection && l.collection.sort) l.collection.sort();
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

    let msg = data.message;
    if (_.isEmpty(msg) && data.is_attachment === 1) msg = LOCALE.ATTACHMENT;

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
      message: msg,
      ctime: data.ctime,
      room_count: ~~(data.room || 1),
      is_attachment: data.is_attachment === 1 ? 1 : 0,
    });

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
    this._pendingSettle = list;
    if (this._settleTimer) return;
    this._settleTimer = setTimeout(() => {
      this._settleTimer = null;
      const l = this._pendingSettle;
      this._pendingSettle = null;
      if (!l || (this.isDestroyed && this.isDestroyed())) return;
      if (l.collection && l.collection.sort) l.collection.sort();
      this._applyFilter();
    }, 80);
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
    const list = this.getPart && this.getPart("contact-list");
    if (!list || !data) return;
    // Message payload has peer_id, contact items have entity_id.
    let item =
      list.getItemsByAttr && list.getItemsByAttr(_a.entity_id, data.peer_id);
    item = item && item[0];
    if (!item) return;
    item.mset("room_count", 0);
    item.mset("has_mention", 0);
    if (_.isFunction(item.updateNotification)) item.updateNotification();
    this._applyFilter();
  }
}

module.exports = __chat_p2p;
