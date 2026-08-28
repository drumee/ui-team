const { copyToClipboard, dataTransfer } = require("@drumee/ui-essentials");
require("./skin");

const cleanMentionText = (value) =>
  value == null ? "" : String(value).trim();

const mentionMemberLabel = (member = {}) => {
  const fullname = cleanMentionText(member.fullname);
  if (fullname) return fullname;

  const firstname = cleanMentionText(member.firstname);
  const lastname = cleanMentionText(member.lastname);
  const fullNameFromParts = [firstname, lastname].filter(Boolean).join(" ");
  if (fullNameFromParts) return fullNameFromParts;

  const surname = cleanMentionText(member.surname);
  if (surname) return surname;

  const email = cleanMentionText(member.email);
  if (email) return email;

  return cleanMentionText(member.drumate_id || member.entity_id || member.id);
};

const mentionMemberSearchText = (member = {}) =>
  [
    mentionMemberLabel(member),
    member.email,
    member.firstname,
    member.lastname,
    member.surname,
    member.fullname,
  ]
    .map(cleanMentionText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const mentionMemberDebugRow = (member = {}) => ({
  id: cleanMentionText(member.id),
  uid: cleanMentionText(member.uid),
  entity_id: cleanMentionText(member.entity_id),
  drumate_id: cleanMentionText(member.drumate_id),
  firstname: cleanMentionText(member.firstname),
  lastname: cleanMentionText(member.lastname),
  surname: cleanMentionText(member.surname),
  fullname: cleanMentionText(member.fullname),
  email: cleanMentionText(member.email),
  label: mentionMemberLabel(member),
});

/**
 *
 */
class __widget_chat extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.removeUpload = this.removeUpload.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.disableMessageSelection = this.disableMessageSelection.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.copyMessage = this.copyMessage.bind(this);
    this.replyMessage = this.replyMessage.bind(this);
    this.clearReplyMessage = this.clearReplyMessage.bind(this);
    this.showMsgCount = this.showMsgCount.bind(this);
    this.deleteMessage = this.deleteMessage.bind(this);
    this.confirmDeleteForAll = this.confirmDeleteForAll.bind(this);
    this.showSend = this.showSend.bind(this);
    this.clearMessageFromChat = this.clearMessageFromChat.bind(this);
    this.removeUploadFromChat = this.removeUploadFromChat.bind(this);
    this._onMentionDropdownKeydown = this._onMentionDropdownKeydown.bind(this);
    this._onMentionDropdownKeyup = this._onMentionDropdownKeyup.bind(this);
    this._onClipboardPaste = this._onClipboardPaste.bind(this);
    this.initStorage();
  }

  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    if (opt == null) {
      opt = {};
    }
    super.initialize();
    this.view = this.mget(_a.view);
    this._selectedMessages = [];
    this._selectedViews = [];
    this.peer = this.mget("peer") || null;
    this.updateChatUserStatus();
    this.queue = [];
    // SCOPE_GONE freeze state (chat-scope-cross-hub-move phase 3): set to the
    // frozen scope key (see _currentScopeKey) once a post reports the scoped
    // folder/file no longer exists; cleared when the user navigates to a
    // different scope (setScopedFileNid/setScopedFolderNid).
    this._scopeFrozen = null;
    // Proactive hard freeze (file-thread access revocation): set by the owning
    // folder window BEFORE any popup, when the server announces the scoped file
    // left the workspace. Unlike _scopeFrozen — which is reactive, set only
    // after a post came back SCOPE_GONE — this one is silent and blocks every
    // action path, not just sends. Keyed by scope so an unrelated scope stays
    // usable; see _isScopeHardFrozen.
    this._hardFrozenScopes = null;
    const area = this.mget(_a.area) || this.mget(_a.type);
    if (area === _a.personal || area === _a.privateRoom) {
      this.hubId = Visitor.id;
      this.peerId =
        this.mget(_a.peer_id) ||
        (this.peer &&
          (this.peer.drumate_id || this.peer.entity_id || this.peer.id)) ||
        "";
      this.storageKey = `${area}-${this.hubId}-${this.peerId}`;
    } else {
      this.hubId = this.mget(_a.hub_id);
      this.peerId = "";
      const nid = this.mget(_a.nid) || "";
      this.scopedNid = this.mget("scope") === _a.folder ? nid : "";
      // Optional initial file scope: lets a second chat instance mount already
      // scoped to a file thread (the full Chat-tab side panel) so its first
      // list load is the thread itself — no General-then-thread flash.
      this.scopedFileNid = this.mget("scoped_file_nid")
        ? `${this.mget("scoped_file_nid")}`
        : "";
      this.scopedFileLabel = this.mget("scoped_file_label") || "";
      this.fileThreadId = "";
      this.fileThreadInfoLoaded = false;
      // storage_key override keeps a coexisting second instance's messenger
      // draft separate from the folder/General chat (same area+hub+nid would
      // otherwise collide on one sessionStorage key).
      this.storageKey =
        this.mget("storage_key") ||
        (nid ? `${area}-${this.hubId}-${nid}` : `${area}-${this.hubId}`);
    }

    this.hubId = this.hubId || this.mget(_a.hub_id);
    this.declareHandlers();
    this.bindEvent(_a.live);
    // Mounted already file-scoped (side panel) → resolve the thread id up front
    // for realtime WS matching (getCurrentApi loads the list by file_nid alone).
    if (this.scopedFileNid) this._loadFileThreadInfo();
    this._newMsgCount = 0;

    // Reply-in-thread label flag: true while the current reply quote was set by a
    // "reply in thread" action, so its header reads "Reply to X in thread".
    this._replyInThread = false;

    // A side-panel chat (full Chat tab) mounts already scoped to a file and may
    // carry a captured reply quote to restore once its reply-wrapper is ready.
    const replyData = this.mget("reply_data");
    if (replyData) {
      this.ensurePart("reply-wrapper").then(() => this._applyReplyData(replyData));
    }

    // Typing indicator state.
    // _typers: author_id -> { name, timer } for remote users currently typing.
    // _typingSentAt / _typingIdleTimer: throttle + idle-stop for the local user.
    this._typers = new Map();
    this._typingSentAt = 0;
    this._typingIdleTimer = null;
    // author_id of the typer whose avatar is currently shown in the bubble —
    // lets _renderTypers skip re-feeding the avatar on every keystroke.
    this._typingLeadId = null;

    // Mark this conversation read when its workspace/folder is clicked in the
    // window manager (Wm fires "chat:read" with the focused hub context).
    this._onReadContext = this._onReadContext.bind(this);
    RADIO_BROADCAST.on("chat:read", this._onReadContext);

    // Sync own posts to sibling chat widgets on the same channel in this client
    // (the server doesn't WS-echo your own posts, so e.g. the team chat would
    // stay stale while you type in the meeting chat). See _onPeerChatPosted.
    this._onPeerChatPosted = this._onPeerChatPosted.bind(this);
    RADIO_BROADCAST.on("chat:posted", this._onPeerChatPosted);
  }

  /**
   *
   */
  sameFilename() {
    /** DO NOT DELETE */
    return false;
  }

  /**
   *
   */
  getViewMode() {
    return _a.icon;
  }

  /**
   *
   */
  onBeforeDestroy() {
    this._closeMentionDropdown();
    this.unbindEvent(_a.live);
    RADIO_BROADCAST.off("chat:read", this._onReadContext);
    RADIO_BROADCAST.off("chat:posted", this._onPeerChatPosted);
    clearTimeout(this._folderContentSyncTimer);
    clearTimeout(this._initStickTimer);
    this._cleanupUnsentAttachments();
    if (this.attachmentList) {
      this.attachmentList.off("uploaded", this.showSend);
    }
    // Tell the peer(s) we stopped typing and clear all typing timers.
    this._stopTyping();
    if (this._typers) {
      for (const t of this._typers.values()) {
        if (t && t.timer) clearTimeout(t.timer);
      }
      this._typers.clear();
    }
    if (this._mentionKeyboardBound && this.el) {
      this.el.removeEventListener("keydown", this._onMentionDropdownKeydown, true);
      this.el.removeEventListener("keyup", this._onMentionDropdownKeyup, true);
      this._mentionKeyboardBound = false;
    }
    if (this._clipboardPasteBound && this.el) {
      this.el.removeEventListener("paste", this._onClipboardPaste, true);
      this._clipboardPasteBound = false;
    }
  }

  /**
   * Abstract -- Dont remove
   */
  syncOrder() {}

  /**
   *
   * @returns
   */
  updateChatUserStatus() {
    if (!this.peer || this.mget(_a.area) !== _a.personal) {
      return;
    }
    let isReadOnly = false;
    let readOnlyMsg = "";
    const status = this.peer.status;

    if (
      status !== _a.active ||
      this.peer.is_blocked ||
      this.peer.is_blocked_me
    ) {
      isReadOnly = true;
      // don't change the order of the below condition
      if (status === "memory") {
        readOnlyMsg = LOCALE.CHAT_DEACTIVATED; //'Chat user is deactivated'
      }
      if (this.peer.is_blocked_me) {
        readOnlyMsg = LOCALE.CHAT_DEACTIVATED; //'Chat user is deactivated'
      }
      if (this.peer.is_blocked) {
        readOnlyMsg = LOCALE.CONTACT_BLOCKED; //'Blocked'
      }
      if (status === "nocontact") {
        readOnlyMsg = LOCALE.CONTACT_DELETED; //'Deleted'
      }
    }

    this.mset("isReadOnly", isReadOnly);
    this.mset("readOnlyMsg", readOnlyMsg);
  }

  /**
   *
   */
  initStorage() {
    const key = this.storageKey;
    if (!sessionStorage.getItem(key)) {
      const data = {
        message: "",
        attachment: [],
      };
      sessionStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   *
   * @returns
   */
  getStorage() {
    const data = sessionStorage.getItem(this.storageKey);
    if (_.isEmpty(data)) {
      return {};
    }
    return JSON.parse(data);
  }

  /**
   *
   * @returns
   */
  saveMessage(message) {
    const key = this.storageKey;
    let data = JSON.parse(sessionStorage.getItem(key));
    data.message = message;
    sessionStorage.setItem(key, JSON.stringify(data));
  }

  /**
   *
   */
  clearStorage() {
    const data = {
      message: "",
      attachment: [],
    };
    sessionStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   *
   * @returns
   */
  getStoredMessage() {
    const data = sessionStorage.getItem(this.storageKey);
    if (_.isEmpty(data)) {
      return "";
    }
    return JSON.parse(data).message || "";
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  onInputChange(args) {
    const text = args && args.text;
    // Persist a draft only while the input holds an unsent value. When the
    // input is emptied, drop the message draft (keeping any pending
    // attachments, since saveMessage only touches the message field) so stale
    // text is never restored on reopen or sent on Enter. A successful send
    // clears the draft separately via clearStorage().
    if (text && String(text).trim()) {
      this.saveMessage(text);
    } else {
      this.saveMessage("");
    }
    this._handleTypingInput(text);
  }

  /**
   * Window-manager "chat:read" signal — fired when a workspace (or a folder
   * within it) is clicked/raised. Mark this conversation read when the focused
   * hub matches ours.
   * @param {Object} ctx { hub_id, nid, area }
   */
  _onReadContext(ctx = {}) {
    if (!ctx || ctx.hub_id == null) return;
    if (`${ctx.hub_id}` !== `${this.hubId}`) return;
    this.markConversationRead();
  }

  /**
   * Mark the conversation as read up to the latest message. Triggered when the
   * user focuses the message input or when its workspace/folder is clicked.
   * Reuses the existing acknowledge services;
   * the server advances the read cursor and (for channels) broadcasts the
   * updated reader set so other participants' read-receipt avatars update.
   * Throttled so repeated focus events don't spam the server.
   */
  markConversationRead() {
    const now = Date.now();
    if (this._lastReadAt && now - this._lastReadAt < 2000) return;
    if (!this.__list || !this.__list.children) return;
    const last = _.isFunction(this.__list.children.last)
      ? this.__list.children.last()
      : null;
    if (!last || !last.model) return;
    const data = last.model.toJSON();
    const area = this.mget(_a.area) || this.mget(_a.type);
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    const postData = { hub_id: this.hubId };
    if (area === _a.share) {
      postData.service = SERVICE.channel.acknowledge;
    } else if (isPrivate) {
      postData.service = SERVICE.chat.acknowledge;
    } else if (area === _a.ticket) {
      postData.service = SERVICE.channel.acknowledge_ticket;
    } else {
      postData.service = SERVICE.channel.acknowledge;
    }
    if (isPrivate) {
      if (!this.peerId) return;
      postData.peer_id = this.peerId;
      if (data.ctime) postData.ref_ctime = data.ctime;
    } else {
      if (!data.message_id) return;
      postData.message_id = data.message_id;
      if (area === _a.ticket) postData.ticket_id = data.ticket_id;
    }
    this._lastReadAt = now;
    this.postService(postData);
  }

  /**
   * Resolve the typing service + payload for the current conversation mode.
   * Returns null when typing should not be signalled (no peer/hub, blocked
   * peer, or the service is unavailable in this platform).
   * @param {Number} state 1 = typing, 0 = stopped
   */
  _typingApi(state) {
    const area = this.mget(_a.area) || this.mget(_a.type);
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    if (isPrivate) {
      if (!this.peerId) return null;
      if (this.peer && (this.peer.is_blocked || this.peer.is_blocked_me))
        return null;
      return {
        service: "chat.typing",
        hub_id: this.hubId,
        entity_id: this.peerId,
        state,
      };
    }
    if (!this.hubId) return null;
    return { service: "channel.typing", hub_id: this.hubId, state };
  }

  /**
   * Fire-and-forget the typing signal. Ephemeral — failures are non-critical.
   * @param {Number} state 1 = typing, 0 = stopped
   */
  _sendTyping(state) {
    const api = this._typingApi(state);
    if (!api || !api.service) return;
    try {
      const p = this.postService(api);
      if (p && _.isFunction(p.catch)) p.catch(() => {});
    } catch (e) {
      /* noop — ephemeral signal */
    }
  }

  /**
   * Called on every keystroke. Sends a throttled typing signal (at most once
   * per 3s) and (re)arms a 4s idle timer that sends the stop signal.
   * @param {String} text current draft text
   */
  _handleTypingInput(text) {
    if (_.isEmpty(text) || !String(text).trim()) {
      this._stopTyping();
      return;
    }
    const now = Date.now();
    if (!this._typingSentAt || now - this._typingSentAt > 3000) {
      this._typingSentAt = now;
      this._sendTyping(1);
    }
    if (this._typingIdleTimer) clearTimeout(this._typingIdleTimer);
    this._typingIdleTimer = setTimeout(() => this._stopTyping(), 4000);
  }

  /**
   * Send the stop signal (once) and clear the idle timer.
   */
  _stopTyping() {
    if (this._typingIdleTimer) {
      clearTimeout(this._typingIdleTimer);
      this._typingIdleTimer = null;
    }
    if (this._typingSentAt) {
      this._typingSentAt = 0;
      this._sendTyping(0);
    }
  }

  /**
   * Handle an incoming typing signal from a remote user.
   * @param {Object} data { author_id, firstname, lastname, peer_id|hub_id, state }
   */
  _onTyping(data = {}) {
    if (!data || _.isEmpty(data)) return;
    const authorId = data.author_id;
    if (!authorId || authorId === Visitor.id) return; // ignore self
    const area = this.mget(_a.area) || this.mget(_a.type);
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    if (isPrivate) {
      if (this.peerId !== data.peer_id) return;
    } else if (this.hubId !== data.hub_id) {
      return;
    }
    if (Number(data.state) === 0) {
      return this._removeTyper(authorId);
    }
    const name = this._typerName(data);
    const existing = this._typers.get(authorId);
    if (existing && existing.timer) clearTimeout(existing.timer);
    // Auto-expire in case a stop signal is lost.
    const timer = setTimeout(() => this._removeTyper(authorId), 6000);
    this._typers.set(authorId, {
      name,
      authorId,
      firstname: data.firstname,
      lastname: data.lastname,
      timer,
    });
    this._renderTypers();
  }

  /**
   * @returns {String} display name for a typing remote user
   */
  _typerName(data) {
    const fn = (data.firstname || "").trim();
    const ln = (data.lastname || "").trim();
    const name = `${fn} ${ln}`.trim();
    return name || data.fullname || data.name || LOCALE.SOMEONE || "Someone";
  }

  /**
   * Remove a user from the typing set and re-render.
   * @param {String} authorId
   */
  _removeTyper(authorId) {
    if (!this._typers) return;
    const existing = this._typers.get(authorId);
    if (!existing) return;
    if (existing.timer) clearTimeout(existing.timer);
    this._typers.delete(authorId);
    this._renderTypers();
  }

  /**
   * Render the typing indicator (incoming-message bubble) from the current
   * _typers set. Shows the most-recent typer's avatar beside the animated dots;
   * the bubble itself carries no name text (Figma 2370-70205).
   */
  _renderTypers() {
    this.ensurePart("typing-indicator")
      .then((part) => {
        if (!part || !part.el) return;
        const typers = Array.from(this._typers.values());
        if (!typers.length) {
          this._typingLeadId = null;
          if (_.isFunction(part.setState)) part.setState(0);
          else part.el.dataset.state = "0";
          return;
        }
        // Single bubble — show the most-recent typer's avatar. Re-feed only when
        // the lead typer changes, so a burst of keystrokes doesn't thrash the
        // UserProfile (which fetches the avatar).
        const lead = typers[typers.length - 1];
        if (lead && lead.authorId && lead.authorId !== this._typingLeadId) {
          this._typingLeadId = lead.authorId;
          this.ensurePart("typing-avatar")
            .then((slot) => {
              if (!slot || !slot.el || !_.isFunction(slot.feed)) return;
              slot.feed(
                Skeletons.UserProfile({
                  className: `${this.fig.family}__typing-avatar-img`,
                  id: lead.authorId,
                  firstname: lead.firstname,
                  lastname: lead.lastname,
                  auto_color: 1,
                }),
              );
            })
            .catch(() => {});
        }
        if (_.isFunction(part.setState)) part.setState(1);
        else part.el.dataset.state = "1";
      })
      .catch(() => {});
  }

  /**
   *
   */
  async onFileListChange() {
    let content = this.findPart(_a.content);
    let uploads = [];
    if (content && content.collection) {
      uploads = content.collection
        .filter(
          (row) =>
            row.get(_a.filetype) != _a.pseudo &&
            row.get(_a.service) != "remove-upload",
        )
        .map((row) => {
          let att = { ...row.attributes };
          delete att.uiHandler;
          delete att.logicalParent;
          return att;
        });
    }
    this.ensurePart("attachment-list").then((p) => {
      p.saveAttachment(uploads);
    });
  }

  /**
   *
   */
  showSend() {
    this.ensurePart(_a.message).then((p) => {
      p.showSend();
    });
  }

  /**
   *
   * @returns
   */
  onPasteBase64(args) {
    if (args.area && /^data:image/.test(args.area)) {
      const { nid, hub_id, home_id } = this._getUploadDestination();
      if (!nid) {
        this.warn("[chat] paste before staging folder is known, ignoring");
        return;
      }
      let pm = {
        respawn: "media_paste",
        area: args.area,
        src: args.src,
        from_device: 1,
        home_id,
        nid,
        hub_id,
      };
      this.insertMedia(pm);
    }
    this.showSend();
  }

  _getUploadDestination() {
    // Every attachment uploads into the hub's hidden chat staging
    // (/__chat__/__upload__/) — never straight into the scoped folder.
    // A file must not show up in the folder's Files tab before the
    // message is sent; channel.post promotes staged device uploads
    // (folder_attachment) into the folder at send time.
    const home = this.mget(_a.home) || {};
    return {
      nid: home.chat_upload_id,
      hub_id: home.hub_id || this.hubId,
      home_id: home.home_id,
      destpath: "/",
    };
  }

  _scopePrivilege() {
    const folderWindow =
      this.getParentByKind && this.getParentByKind("window_folder");
    const sources = [folderWindow, this];
    if (this.getHandlers) {
      const handlers = this.getHandlers(_a.ui) || [];
      sources.push(...handlers);
    }
    for (const source of sources) {
      if (!source || !source.mget) continue;
      const privilege = source.mget(_a.privilege);
      if (privilege != null) return privilege;
      const permission = source.mget(_a.permission);
      if (permission != null) return permission;
    }
    return 0;
  }

  canPromoteDeviceAttachmentsToFolder() {
    if (!this.getScopedNid()) return false;
    return !!(_K.permission.write & this._scopePrivilege());
  }

  getPromotableDeviceAttachmentIds(list) {
    if (!list || !this.canPromoteDeviceAttachmentsToFolder()) return [];
    return list.getDeviceAttachmentIds ? list.getDeviceAttachmentIds() || [] : [];
  }

  /**
   *
   */
  handleScroll(c) {
    let list = this.__list;
    let last = list.children.last();
    let first = list.children.first();
    let timer = null;
    let scroll = list.scrollToBottom.bind(list);
    if (c.mget(_a.ctime) == 0) {
      setTimeout(scroll, 50);
      return;
    }
    if (c.mget(_a.ctime) > first.mget(_a.ctime)) {
      if (list.scrollDir == _a.up && list.scrolledY() > last.$el.height()) {
        this.__buttonScroll.setState(1);
      } else {
        timer = setTimeout(scroll, 500);
      }
      return;
    }
    if (
      list.scrollDir == _a.down ||
      (c.mget(_a.page) == 1 && last.mget(_a.page) == 1)
    ) {
      timer = setTimeout(scroll, 500);
      return;
    }
  }

  /**
   *
   * @returns
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "attachment-list":
        this.attachmentList = child;
        this.checkPendingContent();
        child.on(_e.update, () => {
          this.checkPendingContent();
        });
        break;
      case _a.list:
        // Personal-hub folder chat: channel.messages keeps legacy rows with
        // no metadata._scope_nid visible in EVERY folder (workspace
        // back-compat), but in the user's own hub those rows are hub-level
        // invites/calls that belong to no folder — every personal folder
        // rendered the same conversation. Drop them so the initial load
        // matches the WS filter (matchesScopedChannel), which already
        // rejects nid mismatches. Workspace hubs keep the back-compat
        // pass-through; file-thread mode uses its own service and metadata
        // shape, so it must bypass this filter.
        if (
          this.getScopedNid() &&
          `${this.hubId}` === `${Visitor.id}` &&
          !child._strictScopeInstalled
        ) {
          child._strictScopeInstalled = 1;
          const original = child.prepareData.bind(child);
          const chat = this;
          child.prepareData = function (data) {
            const prepared = original(data) || [];
            const nid = chat.getScopedNid();
            if (!nid || chat.isFileThreadMode()) return prepared;
            return prepared.filter((m) => {
              if (!m) return false;
              try {
                const meta =
                  typeof m.metadata === "string"
                    ? JSON.parse(m.metadata)
                    : m.metadata || {};
                return `${meta._scope_nid}` === `${nid}`;
              } catch (e) {
                return false;
              }
            });
          };
        }
        child.onAddKid = this.handleScroll.bind(this);
        child.once(_e.ready, () => {
          this.scrollMessagesToBottom(child);
          // Track whether the user is parked at the bottom. Content growth
          // (an attachment card loading inside an existing row) does NOT fire a
          // scroll event, so this flag keeps reflecting the user's last intent —
          // it only flips false when they actively scroll up to read history.
          // _restickBottomAfterGrowth() reads it to decide whether to re-pin.
          this._pinnedToBottom = true;
          child.on(_e.scroll, () => {
            const slack =
              typeof child.scrolledY === "function" ? child.scrolledY() : 0;
            this._pinnedToBottom = slack != null && slack <= 40;
          });
          // Render read-receipt avatars across every row once the list is fully
          // loaded. Items render incrementally, so an item mounted before its
          // newer sibling computes last-read placement against an incomplete
          // list; this pass re-renders them all with the complete collection so
          // read users always show on open.
          this.refreshAllReaders();
          // P2P has no per-message _seen_; place the peer's avatar from their
          // read cursor returned alongside the messages (peer_ref_ctime).
          this._applyPeerReadCursor();
        });
        break;
      case "chat-content":
        this.waitElement(child.el, () => {
          this.setMessageSelectorState(0);
        });
        break;
    }
  }

  scrollMessagesToBottom(list) {
    setTimeout(() => {
      if (list && typeof list.scrollToBottom === "function")
        list.scrollToBottom();
      // A single scroll lands short of the true bottom: attachment cards mount
      // AND THEN their images/media load, each growing a row after this runs.
      // Keep re-pinning until the height settles.
      this._pinBottomDuringInitialLoad(list);
    }, 100);
  }

  // On first open the conversation height keeps changing for a beat — attachment
  // cards mount, then their thumbnails/media load and grow the rows. An
  // event-driven (onAddKid) re-pin misses that post-mount image growth, so the
  // view ends up parked mid-list. Poll-and-re-pin to the bottom until
  // scrollHeight holds steady for a few ticks (settled) or a short cap elapses.
  // Bail the instant the user scrolls up (scrollDir up) so we never fight
  // someone reading history.
  _pinBottomDuringInitialLoad(list) {
    if (!list || !list.__container) return;
    clearTimeout(this._initStickTimer);
    const cap = 2000; // hard stop (ms) — never pin forever
    const step = 120; // poll interval (ms)
    const needStable = 3; // consecutive unchanged heights = settled
    const start = Date.now();
    let lastHeight = -1;
    let stable = 0;
    const tick = () => {
      if (this.isDestroyed && this.isDestroyed()) return;
      const c = list.__container;
      if (!c) return;
      // User scrolled up to read → stop pinning, leave their position alone.
      if (list.scrollDir === _a.up) return;
      const h = c.scrollHeight;
      if (typeof list.scrollToBottom === "function") list.scrollToBottom();
      if (h === lastHeight) stable += 1;
      else {
        stable = 0;
        lastHeight = h;
      }
      if (stable >= needStable || Date.now() - start > cap) return;
      this._initStickTimer = setTimeout(tick, step);
    };
    this._initStickTimer = setTimeout(tick, step);
  }

  // An attachment card finished loading inside an already-rendered message and
  // grew that row, shifting the true bottom below the viewport. Re-pin to the
  // bottom — but only if the user is still parked there (=== false means they
  // scrolled up to read history, so leave their position alone). Defer a beat so
  // the card's final height is laid out before we measure scrollHeight.
  _restickBottomAfterGrowth() {
    if (this._pinnedToBottom === false) return;
    const list = this.__list;
    if (!list || typeof list.scrollToBottom !== "function") return;
    setTimeout(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      if (this._pinnedToBottom !== false) list.scrollToBottom();
    }, 60);
  }

  /**
   *
   */
  hasAttachment() {
    return this.attachmentList.hasAttachment();
  }

  /**
   *
   */
  checkPendingContent() {
    const has = this.attachmentList && this.attachmentList.hasAttachment();
    // Toggle explicit state on the attachment-wrapper so CSS can collapse
    // it cleanly after clearAttachment() — `:has(.media-grid__ui)` was
    // proving unreliable across Marionette collection.reset() + browser
    // `:has()` invalidation timing.
    if (
      this.attachmentList &&
      this.attachmentList.el &&
      this.attachmentList.el.closest
    ) {
      const wrapper = this.attachmentList.el.closest(
        ".widget-chat__attachment-wrapper",
      );
      if (wrapper) wrapper.dataset.hasAttachment = has ? "1" : "0";
    }
    if (has || this.getStoredMessage()) {
      this.showSend();
    } else {
      this.ensurePart(_a.message).then((p) => {
        p.hideSend();
      });
    }
  }

  /**
   *
   * @returns
   */
  onDomRefresh() {
    this.fetchService({
      service: SERVICE.media.home,
      hub_id: this.hubId,
    }).then((data) => {
      // media.home can come back empty for a viewer with no chat home (e.g. a
      // secure-share recipient who is not a hub member) — guard so reading
      // chat_upload_id off undefined doesn't throw an unhandled rejection.
      data = data || {};
      this.mset(_a.home, data);
      this.mset(_a.nid, data.chat_upload_id);
      this.clear_notifications();
      if (this.__refWindowName != null) {
        return this.__refWindowName.set({ content: data.name });
      }
      this.feed(require("./skeleton")(this));
      this._bindMentionKeyboard();
      this._bindClipboardPaste();
    });
  }

  /**
   * Capture-phase paste listener on the chat root. Runs BEFORE the composer's
   * contenteditable `_onpaste` (ui-core text/editable), which bails on
   * `text/html` first and so drops images copied from a web page (they arrive
   * as an image blob alongside an HTML snippet). Here we look for an image item
   * regardless of any accompanying html/text and stage it as an attachment;
   * when there is no image we let the event fall through so normal text paste
   * keeps working.
   */
  _bindClipboardPaste() {
    if (this._clipboardPasteBound || !this.el) return;
    this.el.addEventListener("paste", this._onClipboardPaste, true);
    this._clipboardPasteBound = true;
  }

  /**
   * @param {ClipboardEvent} e
   */
  _onClipboardPaste(e) {
    const cd = e.clipboardData || window.clipboardData;
    if (!cd || !cd.items) return;
    // Collect image blobs only. A screenshot / "copy image" gives an image
    // item; a file copy gives kind==="file" with an image type too — both ok.
    const files = [];
    for (const item of cd.items) {
      if (item.kind === "file" && /^image\//.test(item.type || "")) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (!files.length) return; // no image → let text paste proceed as usual
    // We handled it: stop the contenteditable paste so the raw <img>/markup
    // never lands in the input, and stage each image into the attachment tray.
    e.preventDefault();
    e.stopPropagation();
    for (const f of files) this.pasteFile(f);
  }

  /**
   *
   */
  setMessageSelectorState(s) {
    this.__chatContent.el.dataset.selected = s;
    this.__chatContent.el.dataset.state = s;
  }

  /**
   *
   */
  disableMessageSelection() {
    this.setMessageSelectorState(0);
    let children = this.__list.getItemsByKind(this.itemKind());
    for (var c of children) {
      c.select(0);
    }
  }

  /**
   *
   * @returns
   */
  onUiEvent(cmd, args = {}) {
    if (args == null) {
      args = {};
    }
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    // Proactive hard freeze: the scoped file is gone from the workspace, so
    // every path that would write to (or upload into) its thread is refused
    // here, where they all converge. Read-only interactions — scrolling,
    // copying text, closing the reply box — stay available so the user can
    // still read what is on screen until the window returns to General.
    if (this.isScopeHardFrozen() && this._isBlockedWhileFrozen(service)) return;
    switch (service) {
      case "react":
        return this._sendReaction(args);

      case "media-file-copied":
        setTimeout(this.onFileListChange.bind(this), 1000);
        break;
      case _e.upload:
        this.upload(args.sourceEvent);
        return this.showSend();

      case "remove-upload":
        return this.removeUpload(cmd);

      case "attach-from-desk":
        return this._openDeskPicker();

      case "pick-desk-file":
        return this._pickDeskFile(cmd);

      case "close-desk-picker":
        return this._closeDeskPicker();

      case _a.interactive:
        return this.onInputChange(args);

      case "input-focus":
        return this.markConversationRead();

      case "mention-filter":
        return this._showMentionFiles(args.filter, args.mentionType);

      case "mention-close":
        return this._closeMentionDropdown();

      case "mention-select":
        return this._onMentionFileSelect(cmd, args);

      case _e.send:
      case _e.commit:
        return this.sendMessage(args);

      case "open-node":
        return Wm.launch(cmd);

      case _e.copy:
        return this.copyMessage(cmd);

      case "attachment-copied":
        // Bubbled up from a chat-item after it copied an attachment to the OS
        // clipboard (image blob or link) — show the same ack toast as text copy.
        return this._showAck(
          args.copied === "link"
            ? LOCALE.LINK_COPIED_CLIPBOARD
            : LOCALE.IMAGE_COPIED_CLIPBOARD,
        );

      case _e.reply:
        return this.replyMessage(cmd);

      case "close-reply-message":
        return this.clearReplyMessage();

      case "clear-file-scope":
        return this.setScopedFileNid(null, null);

      case "attachment-reponse":
        return this.__list.scrollToBottom();

      case "attachment-grown":
        return this._restickBottomAfterGrowth();

      case "chat-item-child":
        return this.handleScroll(cmd);

      case "scroll-down":
        this._newMsgCount = 0;
        setTimeout(() => {
          this.__buttonScroll.el.dataset.count = this._newMsgCount;
          this.__list.scrollToBottom();
        }, 50);
        break;

      case "show-message-selector":
        // Remember which flow (forward vs delete) so showMsgCount can re-render
        // the right action bar with the live count as the selection changes.
        this._selectorType = args.type;
        // The triggering chat-item already called select(1) synchronously, so the
        // selection is set — showMsgCount renders the bar with the count baked in.
        this.showMsgCount(cmd);
        return;

      case "select-message":
        return this.showMsgCount(cmd);

      case "delete-for-me":
        return this.deleteMessage(cmd, service);

      case "delete-for-all":
        // Destructive "delete for everyone" — confirm first (Figma 2308-115578)
        // instead of deleting immediately. Only the active (all-own-messages)
        // state can delete; selection is preserved if the user cancels.
        if (cmd.el.dataset.active === _a.yes) {
          return this.confirmDeleteForAll(cmd, service);
        }
        break;

      case "cancel-message-selection":
        return this.disableMessageSelection();

      case "paste-base64":
        if (_.isEmpty(args)) return;
        return this.onPasteBase64(args);

      case "paste-file":
        if (args.file) {
          this.pasteFile(args.file);
        }
        return;

      case "interactive":
        return;

      case "media:eod":
        this.onFileListChange();

      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers(args);
        return (this.service = "");
    }
  }

  /**
   * @param  {File} args
   */
  pasteFile(file) {
    const destination = this._getUploadDestination();
    if (!destination.nid) {
      this.warn("[chat] pasteFile before staging folder is known, ignoring");
      return;
    }
    let pm = {
      kind: "media_grid",
      phase: _a.upload,
      filetype: _a.pseudo,
      isAttachment: 1,
      from_device: 1,
      origin: _a.chat,
      uiHandler: [this],
      file: file,
      destination,
    };
    this.insertMedia(pm);
  }

  /**
   *
   * @param {*} e
   * @param {*} token
   * @returns
   */
  async _openDeskPicker() {
    const picker = await this.ensurePart("wrapper-desk-picker");
    if (!picker.isEmpty()) {
      picker.clear();
      return;
    }
    let home;
    try {
      home = await this.fetchService(SERVICE.media.home, {
        hub_id: Visitor.id,
      });
    } catch (e) {
      this.warn("[chat] _openDeskPicker: failed to fetch home", e);
      return;
    }
    if (!home || !home.home_id) return;
    const fig = this.fig.family;
    picker.feed(
      Skeletons.Box.Y({
        className: `${fig}__desk-picker-panel`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__desk-picker-header`,
            kids: [
              Skeletons.Note({
                className: `${fig}__desk-picker-title`,
                content: LOCALE.FROM_WORKSPACE,
              }),
            ],
          }),
          Skeletons.List.Smart({
            className: `${fig}__desk-picker-list`,
            api: {
              service: SERVICE.media.show_node_by,
              hub_id: home.hub_id || Visitor.id,
              nid: home.home_id,
              page: 1,
            },
            itemsOpt: {
              kind: KIND.note,
              service: "pick-desk-file",
              uiHandler: [this],
            },
            itemsMap: { filename: "content" },
            evArgs: Skeletons.Note(
              LOCALE.NO_FILES_YET || LOCALE.NO_DISCUSSIONS_YET,
              "no-content",
            ),
            vendorOpt: Preset.List.Orange_e,
            spinner: true,
            spinnerWait: 300,
          }),
          Skeletons.Note({
            className: `${fig}__desk-picker-cancel`,
            content: LOCALE.CANCEL,
            service: "close-desk-picker",
            uiHandler: [this],
          }),
        ],
      }),
    );
  }

  async _pickDeskFile(cmd) {
    const o = cmd.model.toJSON();
    const home = this.mget(_a.home);
    if ([_a.hub, _a.folder].includes(o.filetype) || o.ext === "lnk") {
      Wm.alert(LOCALE.FILE_TYPE_NOT_SUPPORTED || LOCALE.ACTION_NOT_PERMITTED);
      return;
    }
    this._closeDeskPicker();

    // Copy the file to the chat staging folder first, so the original stays on the desk.
    // move_attachemnt (in chat.post) will then move only the staging copy to the sbox.
    let stagedNid;
    try {
      const copyResult = await this.postService({
        service: SERVICE.media.copy,
        nid: o.nid,
        pid: home && home.chat_upload_id,
        action: _a.copy,
        // recipient_id = the entity that owns the staging folder (home.hub_id).
        // For P2P this is Visitor.id; for channel chats it is the channel hub.
        // Must match the DB where chat_upload_id lives.
        recipient_id: (home && home.hub_id) || this.hubId,
        hub_id: o.hub_id || this.hubId,
      });
      const first = Array.isArray(copyResult) ? copyResult[0] : copyResult;
      stagedNid = first && first.nid;
    } catch (e) {
      this.warn("[chat] _pickDeskFile: copy to staging failed", e);
    }

    if (!stagedNid) {
      Wm.alert(LOCALE.ACTION_NOT_PERMITTED);
      return;
    }

    const item = {
      ...o,
      nid: stagedNid,
      hub_id: (home && home.hub_id) || this.hubId,
      kind: "media_grid",
      // phase: _a.local prevents syncData from triggering another media.copy
      phase: _a.local,
      isAttachment: 1,
      origin: _a.chat,
      uiHandler: [this],
      logicalParent: this,
    };

    if (this.attachmentList && !this.attachmentList.isDestroyed()) {
      this.attachmentList.addNewMedia([item]);
      this.checkPendingContent();
      this.showSend();
    }
  }

  _closeDeskPicker() {
    this.ensurePart("wrapper-desk-picker").then((picker) => {
      if (picker && !picker.isDestroyed()) picker.clear();
    });
  }

  upload(e, token) {
    let target;
    switch (e.area) {
      case _e.change:
        target = this.getActiveWindow();
        break;
      case _e.drop:
        target = this;
        break;
      default:
        target = this.getActiveWindow();
        break;
    }
    if (target == null) {
      Butler.say(LOCALE.WRONG_DROP_AREA);
      return;
    }

    let p = 0;
    if (e.area === _e.change) {
      p = 0;
    }
    return this.sendTo(target, e, p, token);
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  removeUpload(cmd) {
    this.onFileListChange();
    const api = {
      service: SERVICE.chat.upload_remove,
      nid: cmd.mget(_a.nid),
      hub_id: this.hubId,
    };
    this.removeUploadFromChat(api);
    return this.postService(api)
      .then((data) => {
        // Backend refusals come back as data.status, not as an HTTP error —
        // surface them instead of silently leaving the file on the server.
        if (data && data.status === "INVALID_ATTACHMENT") {
          this.warn("[chat] upload_remove refused", api.nid, data);
        }
      })
      .catch((err) => {
        this.warn("Failed to remove", err);
      });
  }

  /**
   * Closing the chat with unsent attachments would otherwise leave their
   * staged uploads orphaned in /__chat__/__upload__/ — delete them.
   * Nids that are part of an in-flight send are skipped (the server is
   * still moving/copying them); a nid the server already moved out of
   * staging is refused with INVALID_ATTACHMENT, which is harmless.
   */
  _cleanupUnsentAttachments() {
    const list = this.attachmentList;
    if (!list || list.isDestroyed() || !_.isFunction(list.getAttachmentIds)) {
      return;
    }
    const sending = this._sendingNids || new Set();
    for (const nid of list.getAttachmentIds() || []) {
      if (!nid || sending.has(String(nid))) continue;
      this.postService({
        service: SERVICE.chat.upload_remove,
        nid,
        hub_id: this.hubId,
      }).catch(() => {});
    }
    // The staged files are gone — drop the persisted attachment draft too,
    // otherwise reopening this chat restores tray entries pointing at
    // deleted nodes and the next send produces an empty message.
    // Keep the message text: only the attachments were invalidated.
    // (A plain page reload never reaches this method, so its still-staged
    // files keep their restorable draft.)
    try {
      const data = this.getStorage();
      data.attachment = [];
      sessionStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      this.warn("[chat] failed to clear attachment draft", e);
    }
  }

  /**
   *
   * @param {*} mkdir
   * @returns
   */
  getActiveWindow(mkdir) {
    if (mkdir == null) {
      mkdir = 0;
    }
    return this;
  }

  /**
   *
   * @param {*} target
   * @param {*} e
   * @param {*} p
   * @param {*} token
   */
  sendTo(target, e, p, token) {
    let f, pm;
    const a = [];
    const r = dataTransfer(e);
    const destination = this._getUploadDestination();
    if (!destination.nid) {
      this.warn("[chat] upload before staging folder is known, ignoring");
      return;
    }

    for (f of Array.from(r.files)) {
      pm = {
        kind: "media_grid",
        phase: _a.upload,
        isAttachment: 1,
        from_device: 1,
        origin: _a.chat,
        uiHandler: [this],
        file: f,
        destination,
      };
      a.push(pm);
    }

    if (!_.isEmpty(Array.from(r.folders))) {
      // Folder trees cannot be staged/promoted as chat attachments in a
      // folder-scoped chat (remove_attachment rejects folders, and a
      // cross-hub tree move re-creates every nid).
      if (this.getScopedNid()) {
        Wm.alert(LOCALE.FILE_TYPE_NOT_SUPPORTED || LOCALE.ACTION_NOT_PERMITTED);
      } else {
        for (f of Array.from(r.folders)) {
          pm = {
            kind: "media_grid",
            phase: _a.upload,
            isAttachment: 1,
            from_device: 1,
            origin: _a.chat,
            uiHandler: [this],
            folder: f,
            destination,
          };
          a.push(pm);
        }
      }
    }

    if (!_.isEmpty(a)) {
      this.insertMedia(a);
    }
  }

  /**
   *
   * @param {*} media
   * @returns
   */
  insertMedia(media) {
    if (!_.isArray(media)) {
      media = [media];
    }

    const items = [];
    for (let m of Array.from(media)) {
      if (m.model) {
        const o = m.model.toJSON();
        if ([_a.hub, _a.folder].includes(o.filetype) || o.ext == "lnk") {
          Wm.confirm({
            title: LOCALE.ACTION_NOT_PERMITTED,
            message: LOCALE.FILE_TYPE_NOT_SUPPORTED,
            cancel: LOCALE.OK,
            cancel_type: "secondary",
            buttonClass: "forbidden",
            mode: "hbf1",
          });
          return;
        }
        o.kind = "media_grid";
        o.phase = _a.copied;
        o.isAttachment = 1;
        o.origin = _a.chat;
        o.destination = {
          hub_id: this.hubId,
          nid: this.mget(_a.nodeId),
          home_id: this.mget(_a.home_id),
        };
        o.uiHandler = [this];
        o.logicalParent = this;
        items.push(o);
        this.showSend();
      } else {
        m.kind = m.respawn || "media_grid";
        m.isAttachment = 1;
        m.origin = _a.chat;
        m.uiHandler = [this];
        items.push(m);
        this.showSend();
      }
      this.__message.__content.$el.find(".note-content").focus();
    }

    // Add the attachment in the second time
    if (!items.length) {
      return;
    }
    let list = this.attachmentList;
    if (list && !list.isDestroyed()) {
      list.addNewMedia(items);
      // Drive `data-has-attachment` directly — same deterministic path as
      // the post-send branch in postMessageAPI.
      this.checkPendingContent();
      return;
    }
    //this.attachMediaWrapper(this.__wrapperAttachment, items);
  }

  /**
   *
   * @param {*} peer
   */
  reload(peer) {
    this._closeMentionDropdown();
    let data = { ...peer.model.toJSON() };
    delete data.styleOpt;
    delete data.kids;
    delete data.widgetId;
    delete data.x;
    delete data.y;
    this.hubId = data.hub_id;
    this.peerId = data.drumate_id;
    this.mset(data);
    this.ensurePart(_a.list).then((list) => {
      list.restart();
    });
  }

  /**
   *
   * @returns
   */
  getCurrentApi() {
    let api;
    if (!this.hubId) return null;
    const area = this.mget(_a.area) || this.mget(_a.type);
    if (area === _a.personal || area === _a.privateRoom) {
      api = {
        service: SERVICE.chat.messages,
        peer_id: this.peerId,
        hub_id: this.hubId,
        order: "desc",
      };
      return api;
    }

    if (this.scopedFileNid) {
      // File-thread chat: list this file thread's child messages. The server
      // resolves the thread from file_nid and returns [] when none exists yet,
      // so opening a file chat never creates a thread (legacy attachment/mention
      // search list_thread_by_file is no longer used for the file chat view).
      return {
        service: this._ftSvc("messages"),
        hub_id: this.hubId,
        file_nid: this.scopedFileNid,
        order: "desc",
      };
    }

    api = {
      service: SERVICE.channel.messages,
      hub_id: this.hubId,
      order: "desc",
    };
    if (this.getScopedNid()) {
      api.nid = this.getScopedNid();
    }
    return api;
  }

  // Un-freeze once the user navigates away from the SCOPE_GONE scope (e.g.
  // back to General or a different folder/file). Restores the composer.
  _unfreezeIfScopeChanged() {
    if (!this._scopeFrozen) return;
    if (this._scopeFrozen === this._currentScopeKey()) return;
    this._scopeFrozen = null;
    this.ensurePart("chat-footer")
      .then((footer) => {
        if (footer && footer.el) footer.el.dataset.scopedHidden = "0";
      })
      .catch(() => {});
  }

  // Update the folder scope so messages are filtered to a specific sub-folder.
  setScopedFolderNid(folderNid) {
    const next = folderNid ? `${folderNid}` : "";
    if (this.scopedNid === next) return;
    this._closeMentionDropdown();
    this.scopedNid = next;
    this._unfreezeIfScopeChanged();
    this.ensurePart(_a.list).then((list) => {
      if (!list || !_.isFunction(list.restart)) return;
      const prevSpinner = list.mget(_a.spinner);
      if (prevSpinner) list.mset(_a.spinner, false);
      list.restart();
      if (prevSpinner) list.mset(_a.spinner, prevSpinner);
    });
  }

  // Switch the message list to a file-scoped thread; pass falsy to leave it.
  // `label` is the visible filename used by the scope chip; falsy hides chip.
  setScopedFileNid(fileNid, label, replyData) {
    const next = fileNid ? `${fileNid}` : "";
    if (this.scopedFileNid === next) {
      this._refreshScopeChip(next, label);
      // Already on this file's thread → still restore the carried reply quote.
      if (replyData) {
        this.ensurePart("reply-wrapper").then(() => this._applyReplyData(replyData));
      }
      return;
    }

    this._scopedScroll = this._scopedScroll || {};
    if (this.__list && this.__list.__container) {
      this._scopedScroll[this.scopedFileNid || ""] =
        this.__list.__container.scrollTop;
    }
    if (this.threadId) this.clearReplyMessage();

    this.scopedFileNid = next;
    this.scopedFileLabel = label || "";
    this._unfreezeIfScopeChanged();
    // Reset file-thread state for the new file; resolve its thread id (if any)
    // asynchronously. getCurrentApi uses file_nid directly, so the list restart
    // below does not wait on this.
    this.fileThreadId = "";
    this.fileThreadInfoLoaded = false;
    if (next) this._loadFileThreadInfo();
    this._refreshScopeChip(next, label);
    // Reply-in-thread: restore the captured quote on the now-scoped chat (runs
    // after the clearReplyMessage above, so it isn't wiped by the scope switch).
    if (replyData) {
      this.ensurePart("reply-wrapper").then(() => this._applyReplyData(replyData));
    }
    this.ensurePart(_a.list).then((list) => {
      if (!list || !_.isFunction(list.restart)) return;
      const prevSpinner = list.mget(_a.spinner);
      if (prevSpinner) list.mset(_a.spinner, false);
      list.restart();
      if (prevSpinner) list.mset(_a.spinner, prevSpinner);

      const targetScroll = this._scopedScroll && this._scopedScroll[next];
      if (typeof targetScroll === "number") {
        list.once(_e.ready, () => {
          if (list.__container) list.__container.scrollTop = targetScroll;
        });
      }
    });
  }

  // Toggle the visible scope chip showing what file the chat is filtered by.
  // Hide the messenger footer in scope mode so users can only chat in the
  // normal (unscoped) view. Parts register on nearest declareHandlers (this).
  _refreshScopeChip(fileNid, label) {
    const text = fileNid ? label || `#${String(fileNid).slice(-6)}` : "";
    const scoped = fileNid ? 1 : 0;
    this.ensurePart("scope-chip")
      .then((chip) => {
        if (chip && chip.el) {
          chip.el.dataset.state = String(scoped);
          if (_.isFunction(chip.setState)) chip.setState(scoped);
        }
      })
      .catch(() => {});
    this.ensurePart("scope-chip-label")
      .then((labelView) => {
        if (labelView && labelView.el) labelView.el.textContent = text;
      })
      .catch(() => {});
    this.ensurePart("chat-footer")
      .then((footer) => {
        if (footer && footer.el) {
          // Folder-scope normally hides the messenger (post in the unscoped view).
          // EXCEPTION: a secure-share recipient allowed to post (scoped_post, set
          // only by the DMZ sharebox chatPanel for authenticated + can_chat) keeps
          // the messenger visible. Desk/channel/window-folder chats never set
          // scoped_post → behaviour is byte-identical for them.
          // FILE-THREAD mode (scopedFileNid set) is a real per-file chat now, so
          // the messenger stays visible there; guests are still gated in sendMessage.
          const isFileThread = !!this.scopedFileNid;
          const keepForPost = scoped && this.mget('scoped_post') && !isFileThread;
          footer.el.dataset.scopedHidden =
            scoped && !isFileThread && !keepForPost ? "1" : "0";
        }
      })
      .catch(() => {});
  }

  // Server stores the attachment field as a JSON string; normalise to array.
  parseAttachmentField(raw) {
    if (_.isArray(raw)) return raw;
    if (!raw) return [];
    if (_.isString(raw)) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  _messageData(data = {}) {
    if (_.isArray(data)) return data[0] || {};
    return data || {};
  }

  _attachmentIds(data = {}, fallback = {}) {
    const messageData = this._messageData(data);
    const dataAttachment = this.parseAttachmentField(messageData.attachment);
    const fallbackAttachment = this.parseAttachmentField(fallback.attachment);
    const attachment = _.isEmpty(dataAttachment)
      ? fallbackAttachment
      : dataAttachment;
    return attachment
      .map((item) => {
        if (item && typeof item === "object") return item.nid || item.id;
        return item;
      })
      .filter((id) => id != null && id !== "");
  }

  _hasAttachmentPayload(data = {}, fallback = {}) {
    const messageData = this._messageData(data);
    return (
      messageData.is_attachment ||
      !_.isEmpty(this._attachmentIds(messageData, fallback))
    );
  }

  _matchesScopedFolder(data = {}) {
    const nid = this.getScopedNid();
    if (!nid) return false;
    const messageData = this._messageData(data);
    const messageNid =
      messageData.nid || messageData.parent_id || messageData.pid;
    return `${messageNid}` === `${nid}`;
  }

  _syncScopedFolderContent(data = {}, fallback = {}) {
    if (this.mget("scope") !== _a.folder) return;
    const messageData = this._messageData(data);
    const hasFolderAttachmentFallback =
      fallback && Object.prototype.hasOwnProperty.call(fallback, "folder_attachment");
    const attachmentIds = hasFolderAttachmentFallback
      ? this._attachmentIds({ attachment: fallback.folder_attachment })
      : this._attachmentIds(messageData);
    if (hasFolderAttachmentFallback && _.isEmpty(attachmentIds)) return;
    const payload = {
      ...messageData,
      attachment: attachmentIds,
      nid: messageData.nid || fallback.nid,
      is_attachment: messageData.is_attachment || !_.isEmpty(attachmentIds),
    };
    if (!this._hasAttachmentPayload(payload, fallback)) return;
    if (!this._matchesScopedFolder(payload)) return;

    const folderWindow =
      this.getParentByKind && this.getParentByKind("window_folder");
    if (
      !folderWindow ||
      (folderWindow.isDestroyed && folderWindow.isDestroyed())
    )
      return;
    const scopedNid = `${this.getScopedNid()}`;
    if (folderWindow.mget && `${folderWindow.mget(_a.nid)}` !== scopedNid)
      return;

    clearTimeout(this._folderContentSyncTimer);
    this._folderContentSyncTimer = setTimeout(() => {
      if (folderWindow.isDestroyed && folderWindow.isDestroyed()) return;
      if (this.getScopedNid && `${this.getScopedNid()}` !== scopedNid) return;
      if (folderWindow.mget && `${folderWindow.mget(_a.nid)}` !== scopedNid)
        return;
      if (
        !_.isEmpty(attachmentIds) &&
        _.isFunction(folderWindow.getItemsByAttr)
      ) {
        const allRendered = attachmentIds.every((id) => {
          return (
            !_.isEmpty(folderWindow.getItemsByAttr(_a.nid, id)) ||
            !_.isEmpty(folderWindow.getItemsByAttr(_a.nid, `${id}`))
          );
        });
        if (allRendered) return;
      }
      if (_.isFunction(folderWindow.loadContent)) folderWindow.loadContent();
    }, 700);
  }

  // The server sends the synthetic file.thread root card to other recipients
  // but suppresses it from the caller's socket. Refresh the owning folder's
  // General list when this caller creates the thread; the child payload must
  // remain scoped to the file thread and must not be mirrored into General.
  _notifyFileThreadCreated(data = {}) {
    const created = data.file_thread && data.file_thread.is_new;
    if (!(created === true || created === 1 || created === "1")) return;
    const folderWindow =
      this.getParentByKind && this.getParentByKind("window_folder");
    if (
      folderWindow &&
      !(folderWindow.isDestroyed && folderWindow.isDestroyed()) &&
      _.isFunction(folderWindow.onFileThreadCreated)
    ) {
      folderWindow.onFileThreadCreated(data);
    }
  }

  /**
   *
   * @param {*} mkdir
   */
  clear_notifications(mkdir) {
    if (mkdir == null) {
      mkdir = 0;
    }
  }

  /**
   *
   * @returns
   */
  getScopedNid() {
    return this.scopedNid || "";
  }

  // Scope identity used by the SCOPE_GONE freeze machinery: a file-thread
  // takes precedence over a folder scope (mirrors getCurrentApi/matchesScopedChannel
  // precedence). Empty string means "unscoped" — sendMessage never freezes
  // the unscoped/General view.
  _currentScopeKey() {
    return this.scopedFileNid || this.getScopedNid() || "";
  }

  // ── Proactive hard freeze (file-thread access revocation) ───────────────
  // Public, SILENT freeze/unfreeze used by the folder window the instant the
  // server announces the scoped file was deleted or moved out of the hub. It
  // must run synchronously, BEFORE the warning popup renders, so no keyboard,
  // queued, attachment, or programmatic send can slip through the gap between
  // the event and the user acknowledging it.
  //
  // Deliberately distinct from _freezeScope: that one is the reactive
  // SCOPE_GONE path and shows CHAT_SCOPE_MOVED. Here the folder window owns
  // the single user-facing message, so this shows nothing at all.
  freezeFileScope(fileNid) {
    const key = `${fileNid || ""}`;
    if (!key) return;
    if (!this._hardFrozenScopes) this._hardFrozenScopes = {};
    this._hardFrozenScopes[key] = 1;
    // Drop any queued sends for the dead scope: they can only come back
    // SCOPE_GONE, and draining here keeps their optimistic bubbles from
    // sitting in a thread that is about to be torn down.
    if (_.isArray(this.queue)) {
      this.queue = this.queue.filter((queued) => {
        if (`${queued._scopeKey || ""}` !== key) return true;
        this._removeOptimistic(queued.echoId);
        return false;
      });
    }
    // Same data-attribute the scope chip and SCOPE_GONE path already use — no
    // second CSS mechanism (chat/skin/index.scss [data-scoped-hidden="1"]).
    this.ensurePart("chat-footer")
      .then((footer) => {
        if (footer && footer.el) footer.el.dataset.scopedHidden = "1";
      })
      .catch(() => { });
  }

  unfreezeFileScope(fileNid) {
    const key = `${fileNid || ""}`;
    if (!key || !this._hardFrozenScopes) return;
    delete this._hardFrozenScopes[key];
    // Only restore the composer when the CURRENT scope is the one released —
    // the widget may already have moved on to another (still frozen) thread.
    if (this._currentScopeKey() !== key) return;
    if (this._scopeFrozen === key) return; // reactive freeze still owns it
    this.ensurePart("chat-footer")
      .then((footer) => {
        if (footer && footer.el) footer.el.dataset.scopedHidden = "0";
      })
      .catch(() => { });
  }

  // True when the scope the widget is currently showing has been hard-frozen.
  // Every action path (send, reply, react, attachment, open-file) consults this.
  isScopeHardFrozen() {
    const key = this._currentScopeKey();
    return !!(key && this._hardFrozenScopes && this._hardFrozenScopes[key]);
  }

  // onUiEvent services refused while the current scope is hard-frozen: anything
  // that writes to the thread, uploads into it, or stages content for a send.
  // Built lazily — _e.* are runtime globals, not available at module load.
  _isBlockedWhileFrozen(service) {
    if (!service) return false;
    if (!this._frozenBlockedServices) {
      this._frozenBlockedServices = {
        react: 1,
        [_e.upload]: 1,
        [_e.send]: 1,
        [_e.commit]: 1,
        [_e.reply]: 1,
        "attach-from-desk": 1,
        "pick-desk-file": 1,
        "remove-upload": 1,
        "mention-select": 1,
        "delete-for-me": 1,
        "delete-for-all": 1,
      };
    }
    return !!this._frozenBlockedServices[service];
  }

  // File-thread mode = a per-file chat thread is open (scopedFileNid set).
  // Distinct from folder scope (scopedNid): folder scope filters the hub chat to
  // one folder; file-thread mode is a separate chat thread backed by the
  // channel.file_thread_* services. thread_id (reply-to-message) is unrelated.
  isFileThreadMode() {
    return !_.isEmpty(this.scopedFileNid);
  }

  // Resolve a channel.file_thread_* service name with a literal fallback so the
  // UI keeps working during deploy skew (new UI shipped before the backend ACL
  // is bootstrapped into SERVICE.channel.*).
  _ftSvc(name) {
    const c = (SERVICE && SERVICE.channel) || {};
    return c[`file_thread_${name}`] || `channel.file_thread_${name}`;
  }

  // A Reply-in-thread action carries the originating General message as a
  // visual quote, but that message is not a child of the file thread. Sending
  // its id as `thread_id` makes channel.file_thread_post reject the post with
  // INVALID_REPLY_SCOPE. Normal replies made to a message already inside the
  // file thread still send their parent id as usual.
  _getSendThreadId() {
    if (!this.threadId) return "";
    if (this.isFileThreadMode() && this._replyInThread) return "";
    return this.threadId;
  }

  // Resolve thread info for the scoped file WITHOUT creating one. Stores
  // fileThreadId when a thread already exists (used for realtime matching + the
  // acknowledge service). Opening a file chat is side-effect free.
  async _loadFileThreadInfo() {
    if (_.isEmpty(this.scopedFileNid)) {
      this.fileThreadId = "";
      this.fileThreadInfoLoaded = false;
      return;
    }
    try {
      const info = await this.fetchService(this._ftSvc("info"), {
        hub_id: this.hubId,
        file_nid: this.scopedFileNid,
      });
      this.fileThreadId =
        info && Number(info.exists_thread) && info.file_thread_id
          ? `${info.file_thread_id}`
          : "";
    } catch (e) {
      this.fileThreadId = "";
    }
    this.fileThreadInfoLoaded = true;
  }

  /**
   *
   * @param {*} data
   * @returns
   */
  matchesScopedChannel(data = {}) {
    if (_.isArray(data)) data = data[0] || {};
    if (this.scopedFileNid) {
      // File-thread mode: a message belongs here only if it targets THIS thread.
      // The folder-visible root card (message_type file.thread) is broadcast on
      // channel.post but belongs in folder chat, not inside the file thread.
      if (data.message_type === "file.thread") return false;
      const ftid = `${data.file_thread_id ||
        (data.file_thread && data.file_thread.file_thread_id) ||
        ""}`;
      if (this.fileThreadId && ftid && ftid === `${this.fileThreadId}`) {
        return true;
      }
      // Until thread info resolves, accept the file's own first-post echo (the
      // child carries file_nid inside file_thread on the WS contract) so the
      // sender sees their message immediately. Never infer identity from the
      // thread id alone: every file-thread child in the workspace is broadcast
      // to this widget, including siblings that are open in another client.
      const fileNid = `${data.file_nid ||
        (data.file_thread && data.file_thread.file_nid) ||
        ""}`;
      if (!this.fileThreadId && fileNid === `${this.scopedFileNid}`) {
        return true;
      }
      return false;
    }
    // A file-thread CHILD (carries file_thread_id) belongs only in its file
    // panel, never in folder/General. The WS path already excludes them (they
    // post via channel.file_thread_post), but the in-client sibling-sync
    // (chat:posted) mirrors raw post data between coexisting widgets — and the
    // full Chat tab now keeps General + a file panel open at once — so guard
    // here. The folder-visible root card has file_thread_id NULL → not excluded.
    const ftChild = `${
      data.file_thread_id ||
      (data.file_thread && data.file_thread.file_thread_id) ||
      ""
    }`;
    if (ftChild) return false;
    const nid = this.getScopedNid();
    if (!nid) return true;
    // Folder scope: accept normal messages whose nid matches this folder.
    const messageNid = data.nid || data.parent_id || data.pid;
    return `${messageNid}` === `${nid}`;
  }

  // Mirror a message posted by another chat widget in THIS client onto our
  // list, when it targets the same channel/scope. Only handles the local
  // user's own posts (others' messages already arrive via WS); handleReceivedMsg
  // dedups by message_id, so a stray double-delivery is harmless.
  _onPeerChatPosted(payload = {}) {
    const { from, hub_id, data } = payload;
    if (!data || from === this.cid) return;
    if (`${hub_id}` !== `${this.hubId}`) return;
    if (data.author_id != null && `${data.author_id}` !== `${Visitor.id}`) return;
    const area = this.mget(_a.area) || this.mget(_a.type);
    const isChannel = [_a.dmz, _a.public, _a.share, _a.private].includes(area);
    if (!isChannel || !this.matchesScopedChannel(data)) return;
    this.handleReceivedMsg(data);
  }

  /**
   * May this viewer post into the conversation this widget is showing?
   *
   * Chat is granted at the "View & chat" tier and above — i.e. any privilege
   * carrying the download bit (roles compose as view 0b0011 · chat 0b0111 ·
   * edit 0b1111 · admin 0b11111, so only bare View lacks it). Mirrors the
   * folder window's _privilegeGrantsChat, which drives the visual gate.
   *
   * Scoped to workspace conversations. A P2P/personal chat, a support ticket
   * and a DMZ share have their own rules (the share's is the `guest_chat` /
   * `scoped_post` pair set by toolkit chatPanel), and their privilege values
   * do not follow the workspace role scale — gating them on it would silence
   * conversations that are working today.
   */
  _mayChatHere() {
    const area = this.mget(_a.area) || this.mget(_a.type);
    if (![_a.private, _a.public].includes(area)) return true;
    // A share-scoped folder window (pinned token) posts under the secure-share
    // rules above, not the member role scale.
    if (this.mget(_a.token)) return true;
    return !!(Number(this._scopePrivilege()) & _K.permission.download);
  }

  /**
   *
   * @param {*} args
   * @returns
   */
  sendMessage(args = {}) {
    // Proactive hard freeze: the server already told us this file left the
    // workspace. Refuse before anything else — this covers Enter, the send
    // button, and programmatic sends alike, and stays silent because the
    // folder window owns the single revocation notice.
    if (this.isScopeHardFrozen()) return;
    // SCOPE_GONE freeze (plan chat-scope-cross-hub-move phase 3): once a post
    // to this exact scope has reported the folder/file no longer exists, stop
    // accepting new sends into it silently — no repeat popup, no queue growth.
    // Un-frozen by navigating to a different scope (setScopedFileNid/Folder).
    if (this._scopeFrozen && this._scopeFrozen === this._currentScopeKey()) {
      return;
    }
    // DMZ guest gate (Figma "user chat → sign in required", screen 57): an
    // anonymous recipient of a shared link may READ the conversation but must
    // sign up / log in to post. On a send attempt, open the sharebox's sign-up
    // overlay instead of posting. `guest_chat`/`desk` are set only in the DMZ
    // guest context (toolkit chatPanel); authenticated chat is unaffected.
    if (this.mget("guest_chat")) {
      const desk = this.mget("desk");
      if (desk && _.isFunction(desk.showSignupRequiredOverlay)) {
        desk.showSignupRequiredOverlay();
      }
      return;
    }
    // Workspace chat requires the "View & chat" tier or above. The folder
    // window covers this visually (blurred composer + "need permission" card),
    // but a cover is not a gate: the blur is pointer-events only, so a member
    // downgraded WHILE typing still has keyboard focus in the composer and
    // Enter would post. Refuse here, where every send path converges.
    //
    // _scopePrivilege reads through to the folder window, so a live
    // hub.set_privilege push is reflected without this widget subscribing.
    if (!this._mayChatHere()) {
      return this.showError(LOCALE.CHAT_PERMISSION_REQUIRED);
    }
    // Sending ends the typing session.
    this._stopTyping();
    let message = "";
    // The live messenger content is the source of truth. When the user clears
    // the input it returns '', and we must NOT fall back to a stale
    // sessionStorage draft: the messenger does not emit an input-change event
    // when emptied, so the draft still holds the previously typed value, which
    // would otherwise get sent on Enter. Only fall back when no messenger
    // exists (e.g. programmatic sends).
    const messenger = this.findPart(_a.message);
    if (messenger && _.isFunction(messenger.getMessageWithMentions)) {
      message = messenger.getMessageWithMentions();
    } else {
      message = args.text || this.getStorage().message;
    }
    const list = this.attachmentList;
    if (!list) {
      this.warn("Could not find attachment list", this);
      return;
    }

    const area = this.mget(_a.area) || this.mget(_a.type);
    if (list.hasPendingUpload()) {
      return this.showError(LOCALE.WAIT_UPLOAD, "desktop_waiting");
    }

    const replaceChars = { "<": "&#60;", ">": "&#62;" };
    message = message.replace(/[<>]/g, (m) => replaceChars[m]);
    // let (not const): the scopedFileNid branch below reassigns it.
    let attachments = list.getAttachmentIds() || [];
    // DO NOT promote mentioned files into `attachments`. The server's
    // channel.post moves every attachment nid into a per-message chat
    // subfolder (mfs_move_all → physical move), which is correct for
    // uploaded files but DELETES mentioned files from their original
    // location. The mention stays as an inline anchor in the message
    // body; channel.list_thread_by_file indexes mentions via substring
    // match on `mention:hub_id:file_nid` so referenced files still show
    // up in scoped views without being physically moved.
    if (_.isEmpty(attachments) && _.isEmpty(message)) {
      return false;
    }

    let api = {};

    switch (area) {
      case _a.dmz:
      case _a.public:
      case _a.share:
      case _a.private:
      case _a.ticket:
      case "supportTicket":
        if (this.isFileThreadMode()) {
          // Per-file chat thread. Do NOT prepend the file nid into attachment —
          // the file is the thread subject, not an attachment (posting it would
          // let channel.post move the original file into the chat folder).
          api = {
            service: this._ftSvc("post"),
            file_nid: this.scopedFileNid,
            message,
            attachment: attachments,
            hub_id: this.hubId,
          };
          const ftFolderAttachment =
            this.getPromotableDeviceAttachmentIds(list);
          if (!_.isEmpty(ftFolderAttachment)) {
            api.folder_attachment = ftFolderAttachment;
          }
          break;
        }
        api = {
          service: SERVICE.channel.post,
          message,
          attachment: attachments,
          hub_id: this.hubId,
        };
        if (this.getScopedNid()) {
          api.nid = this.getScopedNid();
          // Staged device uploads the server should move into the folder
          // at send time (everything else stays link-only in the sbox).
          const folderAttachment = this.getPromotableDeviceAttachmentIds(list);
          if (!_.isEmpty(folderAttachment)) {
            api.folder_attachment = folderAttachment;
          }
        }
        break;

      case _a.privateRoom:
      case _a.personal:
        api = {
          service: SERVICE.chat.post,
          hub_id: this.hubId,
          entity_id: this.peerId,
          attachment: attachments,
          message,
        };
        break;

      default:
        this.warn(` ${area} -- NOT SUPPORTED`);
    }

    if (_.isEmpty(api)) {
      this.warn("Undefined API");
      return false;
    }

    const sendThreadId = this._getSendThreadId();
    if (sendThreadId) api.thread_id = sendThreadId;

    if (messenger && _.isFunction(messenger.getMentionUserIds)) {
      const mentionIds = messenger.getMentionUserIds();
      if (mentionIds.length) {
        api.mention_ids = mentionIds;
      }
    }

    this.echoId = _.uniqueId();
    // Capture the composer text + scope BEFORE clearMessageBlock (postMessageAPI
    // :~2093) wipes the live editor. SCOPE_GONE needs the exact text back to
    // restore it, and the scope key to drain sibling queued sends on freeze.
    this.queue.push({
      ...api,
      echoId: this.echoId,
      _restoreText: message,
      _scopeKey: this._currentScopeKey(),
    });
    this.postMessageAPI();
  }

  /**
   * Widget kind used to render each message row. Configurable via the `item_kind`
   * option so a host can swap in a variant (the DMZ share chat passes
   * "widget_chat_item_other" to render every message on the "other" side). Must
   * match the kind used by the list skeleton (see skeleton/index.js) so api-loaded
   * rows, server echoes and optimistic local posts all render with one widget.
   * @returns {String}
   */
  itemKind() {
    return this.mget("item_kind") || "widget_chat_item";
  }

  /**
   *
   * @param {*} data
   * @returns
   */
  handleReceivedMsg(data) {
    if (_.isArray(data)) {
      data = data[0];
    }
    if (!data || _.isEmpty(data)) return;
    if (!this.__list) return;
    data.kind = this.itemKind();
    data.logicalParent = this;
    data.uiHandler = this;
    // Propagate chat container's `type` to each message so the chat-item
    // template's `m.type == _a.share` gate renders the sender name
    // (otherwise rows arrive with `type` undefined and the username header
    // never appears in folder-chat / share-mode chats).
    if (data.type == null) data.type = this.mget(_a.type);
    let messageArr;
    if (data.echoId && this.echoId == data.echoId) {
      messageArr = this.__list.getItemsByAttr("echoId", data.echoId)[0];
      if (messageArr) {
        delete data.echoId;
        messageArr.mset(data);
        this.echoId = null;
        return;
      }
    }

    messageArr = this.__list.getItemsByAttr("message_id", data.message_id)[0];
    if (!messageArr) {
      this._newMsgCount++;
      this.__buttonScroll.el.dataset.count = this._newMsgCount;
      this.__list.append(data);
      // Genuinely new inbound message — own posts return above via the echoId /
      // message_id branches, so hosts can treat this as "someone else wrote".
      // Purely additive: hosts that don't listen are unaffected. The meeting
      // window uses it to light its unread badge while the chat pane is hidden.
      this.trigger("message-received", data);
      // RADIO_BROADCAST.trigger('activity:notify', {type:"chat", ...data});
      return;
    }
    messageArr.mset(data);
  }

  /**
   * @param  {Object} api
   */
  postMessageAPI() {
    let api = this.queue.shift();
    if (!api) return;
    // Proactive hard freeze: a send queued (or re-queued for retry) before the
    // revocation event landed must not reach the server for a scope we already
    // know is gone. Drop it silently — freezeFileScope drained the queue, but a
    // send already shifted out, or unshifted back by the retry path, can still
    // arrive here.
    const queuedScope = `${api._scopeKey || ""}`;
    if (
      queuedScope &&
      this._hardFrozenScopes &&
      this._hardFrozenScopes[queuedScope]
    ) {
      this._removeOptimistic(api.echoId);
      return;
    }
    let tmp = {
      kind: this.itemKind(),
      ...api,
      logicalParent: this,
      uiHandler: this,
      author_id: Visitor.id,
      ctime: 0,
      is_readed: 0,
      is_seen: 0,
    };
    // Same propagation as handleReceivedMsg — locally-posted optimistic
    // rows must also inherit the chat container's `type` so the username
    // header renders for them immediately (before the server echo).
    if (tmp.type == null) tmp.type = this.mget(_a.type);
    if (api.thread_id && this.threadSnapshot) {
      tmp.thread = this.threadSnapshot;
    }
    delete tmp.service;
    // UI-only fields carried on the queue entry for the SCOPE_GONE path below —
    // never send them to the server or leave them on the rendered bubble model.
    const restoreText = api._restoreText || "";
    const scopeKeyAtSend = api._scopeKey || "";
    delete tmp._restoreText;
    delete tmp._scopeKey;
    delete api._restoreText;
    delete api._scopeKey;
    if (this.__list) {
      this.__list.append(tmp);
      this.__list.scrollToBottom();
    }
    this.clearMessageBlock();
    // Guard for the destroy-time cleanup: nids belonging to an in-flight
    // send must not be upload_remove'd while the server may still be
    // moving/copying them out of staging.
    this._sendingNids = new Set((api.attachment || []).map(String));
    this.postService(api)
      .then((data) => {
        this._sendingNids = null;
        // SCOPE_GONE (chat-scope-cross-hub-move phase 3): the folder/file this
        // message targeted no longer exists — server wrote 0 rows and purged
        // any staged uploads. Must run BEFORE clearAttachment/checkPendingContent
        // and BEFORE _syncScopedFolderContent/handleReceivedMsg below, since none
        // of those apply to a post the server refused. Order matters (red-team F8).
        if (data && data.status === "SCOPE_GONE") {
          // Server purges staged uploads on SCOPE_GONE (Phase 2 contract) — the
          // local attachment tray must follow, or it shows stale pending files
          // that already vanished server-side.
          this.attachmentList.clearAttachment();
          this.checkPendingContent();
          this._removeOptimistic(api.echoId);
          this._freezeScope(scopeKeyAtSend, restoreText);
          return;
        }
        this.attachmentList.clearAttachment();
        // Deterministic — drive `data-has-attachment` directly instead of
        // relying on the `_e.update` event chain, which raced with Backbone's
        // built-in collection 'update' event and sometimes fired before
        // sessionStorage was actually cleared.
        this.checkPendingContent();
        if (_.isEmpty(data)) {
          this.showError(LOCALE.MESSAGE_NOT_SENT_RETRY);
          return;
        }
        this._syncScopedFolderContent(data, api);
        this._notifyFileThreadCreated(data);
        // First file-thread send returns the freshly-created thread id. The
        // server suppresses our own WS echo, so adopt it from the POST response
        // for realtime matching + subsequent sends (plan crit 4).
        if (this.isFileThreadMode() && !this.fileThreadId) {
          const ftid = `${
            (data.file_thread && data.file_thread.file_thread_id) ||
            data.file_thread_id ||
            ""
          }`;
          if (ftid) this.fileThreadId = ftid;
        }
        this.handleReceivedMsg(data);
        // Mirror to sibling chat widgets on the same channel in this client
        // (the server won't WS-echo our own post back to us).
        RADIO_BROADCAST.trigger("chat:posted", {
          from: this.cid,
          hub_id: this.hubId,
          data,
        });
      })
      .catch((error) => {
        this._sendingNids = null;
        // Re-attach the UI-only fields stripped above (:2116-2119) before
        // re-queuing — a retry that later resolves SCOPE_GONE needs
        // _restoreText/_scopeKey to give the user's text back and key the
        // freeze/drain to the right scope (red-team H3). Without this the
        // retried api carries neither field, so a later SCOPE_GONE would
        // restore '' (text lost) and freeze/drain against '' (mis-key).
        api._restoreText = restoreText;
        api._scopeKey = scopeKeyAtSend;
        this.queue.unshift(api);
        let errMessage = error.message || LOCALE.MESSAGE_NOT_SENT_RETRY;
        this.showError(errMessage);
        this.warn("Server error sending message", error);
      });
  }

  /**
   * Remove a locally-appended optimistic bubble by its echoId. There is no
   * existing removal path for optimistic rows (handleReceivedMsg only ever
   * mset()s or appends — see :2024/:2062) — SCOPE_GONE is the first caller
   * that needs one (red-team F8).
   *
   * goodbye()/selfDestroy remove the model with `{silent:true}` (see
   * removeUploadFromChat above), so anything relying on the collection's
   * `update`/`remove` event (e.g. `_e.update` listeners) will NOT fire.
   * `now:1` skips the fade animation + 2s delay so the bubble disappears
   * immediately — required for drain-queue, where several bubbles may be
   * removed back-to-back.
   * @param {String} echoId
   */
  _removeOptimistic(echoId) {
    if (!echoId || !this.__list) return;
    const items = this.__list.getItemsByAttr("echoId", echoId);
    for (const item of items) {
      if (item && _.isFunction(item.goodbye)) {
        item.goodbye({ now: 1 });
      }
    }
  }

  /**
   * Enter the SCOPE_GONE frozen state for `scopeKey` (the scope the rejected
   * post targeted): drain every other queued send for the same scope (removing
   * their optimistic bubbles too — they will never be delivered either, since
   * the scope is gone), restore all the drained text into the composer, hide
   * the messenger via the existing scope-chip visibility mechanism, and show
   * a neutral one-shot popup. No WS proactive hook exists or is wanted here
   * (Q4) — this is reachable only from the postMessageAPI response branch.
   * @param {String} scopeKey
   * @param {String} firstText text of the post that got SCOPE_GONE
   */
  _freezeScope(scopeKey, firstText) {
    // An empty scopeKey means the post targeted no scope at all (General
    // chat — see _currentScopeKey). SCOPE_GONE is only meaningful for an
    // actual folder/file scope: `this._scopeFrozen === ''` would be falsy
    // and never match the sendMessage guard (`if (this._scopeFrozen && ...)`),
    // so freezing would silently no-op the intended block, and the drain
    // filter `(queued._scopeKey || '') !== scopeKey` would match every
    // OTHER unscoped queued send and kill them too (red-team H3). Treat it
    // as a plain error instead: no freeze, no drain, just restore this one
    // message's text so the user doesn't lose it.
    if (!scopeKey) {
      const messenger = this.__message;
      if (firstText && messenger && messenger.__content && messenger.__content.content) {
        const current = messenger.__content.getText();
        const combined = current ? `${firstText}\n${current}` : firstText;
        messenger.__content.content.innerText = combined;
        messenger.__content.sync();
        this.saveMessage(combined);
        this.showSend();
      }
      this.showError(LOCALE.MESSAGE_NOT_SENT_RETRY);
      return;
    }
    // Already frozen for this exact scope (e.g. a second queued send for the
    // same scope resolves SCOPE_GONE too) — don't re-drain/re-popup.
    const alreadyFrozen = this._scopeFrozen === scopeKey;
    this._scopeFrozen = scopeKey;

    // Drain same-scope queued sends: they target a scope that no longer
    // exists, so they can never succeed — remove their optimistic bubbles and
    // fold their text back into the composer instead of silently posting them
    // (and getting another SCOPE_GONE) or leaving them stuck in the queue.
    const drainedTexts = [firstText].filter((t) => t);
    this.queue = this.queue.filter((queued) => {
      if ((queued._scopeKey || "") !== scopeKey) return true;
      this._removeOptimistic(queued.echoId);
      if (queued._restoreText) drainedTexts.push(queued._restoreText);
      return false;
    });

    if (drainedTexts.length) {
      const restored = drainedTexts.join("\n");
      const messenger = this.__message;
      if (messenger && messenger.__content && messenger.__content.content) {
        // Prepend to whatever the user is currently typing — never overwrite
        // in-progress input (risk noted in the phase plan).
        const current = messenger.__content.getText();
        const combined = current ? `${restored}\n${current}` : restored;
        messenger.__content.content.innerText = combined;
        messenger.__content.sync();
      }
      this.saveMessage(restored);
      this.showSend();
    }

    // Hide the composer through the same data-attribute the folder scope-chip
    // already uses (chat/skin/index.scss `[data-scoped-hidden="1"]`) — no
    // parallel CSS path (spec constraint). This piggybacks on _refreshScopeChip's
    // footer element rather than duplicating its ensurePart/dataset logic.
    this.ensurePart("chat-footer")
      .then((footer) => {
        if (footer && footer.el) footer.el.dataset.scopedHidden = "1";
      })
      .catch(() => {});

    if (!alreadyFrozen) {
      Wm.alert(LOCALE.CHAT_SCOPE_MOVED);
    }
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  copyMessage(cmd) {
    const _message = cmd.mget(_a.message);
    copyToClipboard(_message);
    return this._showAck(LOCALE.MESSAGE_COPIED_CLIPBOARD);
  }

  /**
   * Transient "copied" acknowledgement toast, reused by copyMessage (text) and
   * the copy-attachment (image/link) flow bubbled up from a chat-item.
   * @param {string} ackMsg
   */
  _showAck(ackMsg) {
    if (!this.__wrapperAck) return;
    this.__wrapperAck.feed(
      require("@drumee/ui-core/letc/preset/ack")(this, ackMsg, {
        height: this.$el.height(),
      }),
    );
    const f = () => {
      this.__wrapperAck.feed("");
      return (this.__wrapperAck.el.dataset.state = _a.closed);
    };
    return setTimeout(f, Visitor.timeout());
  }

  /**
   * @param  {string} message
   */
  showError(message, icon = "") {
    this.__wrapperAck.feed(
      require("./skeleton/error")(this, message, icon, {
        height: this.$el.height(),
      }),
    );
    const f = () => {
      this.__wrapperAck.feed("");
      return (this.__wrapperAck.el.dataset.state = _a.closed);
    };
    return setTimeout(f, Visitor.timeout());
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  replyMessage(cmd) {
    const replyWrapper = this.getPart("reply-wrapper");
    // Normal reply — not a reply-in-thread action, so no "in thread" suffix.
    this._replyInThread = false;
    this.threadId = cmd.mget("message_id");
    // Snapshot the parent so the optimistic placeholder shows the quote right
    // away. is_attachment stripped — chat-item#setThreadData would refetch.
    this.threadSnapshot = cmd.model ? cmd.model.toJSON() : null;
    if (this.threadSnapshot) delete this.threadSnapshot.is_attachment;

    // A file message signals its attachment via EITHER `is_attachment` or a
    // non-empty `attachment` field (folder-chat sends `attachment` only — see
    // chat-item/index.js#buildContent), so mirror that dual check here. Collect
    // EVERY rendered attachment card's data (getAttr → clean file fields incl.
    // ownpath/vhost, so the quote preview URL resolves) — a reply to a multi-file
    // message must quote all files, not just the first.
    this.threadAttachments = [];
    if (
      (cmd.mget("is_attachment") || !_.isEmpty(cmd.mget("attachment"))) &&
      cmd.__list &&
      cmd.__list.children
    ) {
      cmd.__list.children.each((view) => {
        if (view && typeof view.getAttr === "function") {
          this.threadAttachments.push(view.getAttr());
        }
      });
    }

    replyWrapper.feed(require("./skeleton/reply-message")(this, cmd));
    return (replyWrapper.el.dataset.mode = _a.open);
  }

  /**
   *
   * @returns
   */
  clearReplyMessage() {
    const replyWrapper = this.getPart("reply-wrapper");
    this.threadId = null;
    this.threadSnapshot = null;
    this.threadAttachments = [];
    // Reply cleared (cancel or post-send) → drop the in-thread label too.
    this._replyInThread = false;
    replyWrapper.feed("");
    return (replyWrapper.el.dataset.mode = _a.closed);
  }

  /**
   * Apply a reply quote from a captured snapshot (not a live message row). Used
   * by reply-in-thread: the original row is destroyed by the scope reload, so
   * the chat-item snapshots {message_id, snapshot, attachments} before scoping
   * and the now-scoped chat restores the quote here. Sets the in-thread flag so
   * the header reads "Reply to X in thread".
   * @param {{message_id:string, snapshot:object, attachments:array}} data
   */
  _applyReplyData(data) {
    if (!data || !data.message_id) return;
    const replyWrapper = this.getPart("reply-wrapper");
    if (!replyWrapper || (replyWrapper.isDestroyed && replyWrapper.isDestroyed())) {
      return;
    }
    this.threadId = data.message_id;
    this.threadSnapshot = data.snapshot || null;
    this.threadAttachments = _.isArray(data.attachments) ? data.attachments : [];
    this._replyInThread = true;
    // The reply-message skeleton reads the replied message via model.toJSON() /
    // getAttr() / mget — build a lightweight stand-in over the snapshot.
    const snap = this.threadSnapshot || {};
    const msgLike = {
      model: { toJSON: () => snap },
      getAttr: () => snap,
      mget: (k) => snap[k],
    };
    replyWrapper.feed(require("./skeleton/reply-message")(this, msgLike));
    return (replyWrapper.el.dataset.mode = _a.open);
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  showMsgCount(cmd) {
    this._selectedMessages = [];
    this._selectedViews = [];
    const chatItems = this.__list.getItemsByKind(this.itemKind());
    const selected = chatItems.filter((e) => e.mget("selected"));
    for (const e of selected) {
      const mid = e.mget("message_id");
      if (mid) this._selectedMessages.push(mid);
      this._selectedViews.push(e);
    }

    const msgCount = this._selectedMessages.length;
    if (msgCount === 0) {
      this.setMessageSelectorState(0);
      return;
    }
    this.setMessageSelectorState(1);

    // "For all" delete is only valid when every selected message is the user's
    // own — passed to the skeleton so the button renders disabled otherwise.
    const canForAll = selected.every((row) => row.mget("author") !== "other");

    // Re-render the action bar with the live count baked into the Forward/Delete
    // labels (replaces the old separate "N selected message(s)" counter).
    const buttons = this.getPart("message-action-buttons");
    if (buttons) {
      buttons.feed(
        require("./skeleton/action-buttons")(
          this,
          this._selectorType,
          msgCount,
          canForAll,
        ),
      );
    }
  }

  /**
   * Confirm a destructive "delete for everyone" before running it (Figma
   * 2308-115578). Reuses the shared window_confirm via Wm.confirm: a borderless
   * Cancel + a red (danger) Delete under the "Do you want to delete this
   * message?" prompt. Deletes only when the user confirms; on cancel/dismiss the
   * current selection is left intact so they can adjust or back out.
   * @param {*} cmd
   * @param {*} service
   */
  confirmDeleteForAll(cmd, service) {
    Wm.confirm({
      // Prompt rendered through the scoped chat-delete-confirm title so it picks
      // up the larger Figma type without touching other confirm dialogs.
      message: () =>
        Skeletons.Note({
          className: "chat-delete-confirm__title",
          content: LOCALE.DELETE_MESSAGE_CONFIRM,
        }),
      confirm: LOCALE.DELETE,
      confirm_type: "danger",
      cancel: LOCALE.CANCEL,
      cancel_type: "secondary",
      buttonClass: "chat-delete-confirm",
      mode: "bf",
    })
      .then(() => {
        this.setMessageSelectorState(0);
        this.deleteMessage(cmd, service);
      })
      .catch(() => {
        /* cancelled / dismissed — keep the current selection */
      });
  }

  /**
   *
   * @param {*} cmd
   * @param {*} service
   */
  deleteMessage(cmd, service) {
    let _service;
    const area = this.mget(_a.area);
    if (cmd == null) {
      cmd = {};
    }
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    if (isPrivate) {
      _service = SERVICE.chat.delete;
    } else if (area === _a.share) {
      _service = SERVICE.channel.delete;
    }

    let _option = "me";
    if (service === "delete-for-all") {
      _option = "all";
    }

    const payload = {
      service: _service,
      messages: this._selectedMessages,
      option: _option,
      hub_id: this.hubId,
    };
    // chat.delete requires peer_id for P2P path. If omitted, server falls
    // through to hub chat delete (legacy).
    if (isPrivate && this.peerId) {
      payload.peer_id = this.peerId;
    }

    const viewsToRemove = (this._selectedViews || []).slice();
    this.postService(payload, { async: 1 }).then((data) => {
      this.disableMessageSelection();
      for (const view of viewsToRemove) {
        if (view && _.isFunction(view.goodbye)) view.goodbye();
      }
    });
  }

  /**
   * Scroll to a specific message by ID, retrying until it appears in the list.
   * @param {string} message_id
   */
  scrollToMessage(message_id, retries = 25) {
    if (!message_id) return;
    const tryScroll = (r) => {
      const item =
        this.__list && this.__list.getItemsByAttr("message_id", message_id)[0];
      if (item && item.el) {
        item.el.scrollIntoView({ behavior: "smooth", block: "center" });
        item.el.dataset.highlighted = "1";
        setTimeout(() => {
          if (item.el) delete item.el.dataset.highlighted;
        }, 2500);
        return;
      }
      if (r > 0) setTimeout(() => tryScroll(r - 1), 200);
    };
    tryScroll(retries);
  }

  /**
   * @param {*} data
   */
  clearMessageFromChat(data) {
    if (!this.__list || !data) return;
    if (!_.isArray(data)) {
      data = [data];
    }
    for (let d of Array.from(data)) {
      let item = this.__list.getItemsByAttr("message_id", d.message_id)[0];
      if (item) item.goodbye();
    }
  }

  /**
   * @param {*} data
   */
  acknowledge(data, options = {}) {
    if (!this.__list) return;
    if (!_.isArray(data)) {
      data = [data];
    }
    for (let d of data) {
      let items = this.__list.getItemsByAttr("message_id", d.message_id);
      for (var item of items) {
        if (_.isFunction(item.acknowledge)) {
          item.acknowledge(d);
        }
      }
    }
    // Read receipts: the acknowledger has read up to the acknowledged message.
    // Apply their read cursor across the whole list so their avatar lands only
    // on their last-read message (Messenger-style), without a stale duplicate
    // remaining on an earlier message.
    const reader = options && options.sender && options.sender.uid;
    const refCtime = data.length ? data[data.length - 1].ctime : null;
    if (reader && refCtime != null) {
      this.applyReadReceipt(reader, refCtime);
    }
  }

  /**
   * Apply a reader's read cursor across all visible message rows, then re-render
   * every reader-avatar strip. Two passes because last-read placement depends on
   * the next row's _seen_, so all rows must be updated before any are rendered.
   * @param {String} readerUid
   * @param {Number} refCtime the reader has read every message with ctime <= this
   */
  applyReadReceipt(readerUid, refCtime) {
    if (!readerUid || readerUid === Visitor.id) return;
    if (!this.__list || !_.isFunction(this.__list.getItemsByKind)) return;
    const items = this.__list.getItemsByKind(this.itemKind()) || [];
    // Pass 1: update each row's _seen_ for this reader from the cursor.
    for (const item of items) {
      if (item && _.isFunction(item.updateReaderSeen)) {
        const ct = item.mget(_a.ctime);
        item.updateReaderSeen(readerUid, ct != null && ct <= refCtime);
      }
    }
    // Pass 2: re-render — last-read placement reads the next row's _seen_, so
    // every row must be updated before any render.
    for (const item of items) {
      if (item && _.isFunction(item.renderReaders)) item.renderReaders();
    }
  }

  /**
   * Re-render the read-receipt avatar row on every message item. Used once the
   * list has finished loading so last-read placement is computed against the
   * complete collection (each row's "next row" now exists). Reads the _seen_
   * the server returned on load — no mutation.
   */
  refreshAllReaders() {
    if (!this.__list || !_.isFunction(this.__list.getItemsByKind)) return;
    const items = this.__list.getItemsByKind(this.itemKind()) || [];
    for (const item of items) {
      if (item && _.isFunction(item.renderReaders)) item.renderReaders();
    }
  }

  /**
   * P2P only: place the peer's "seen" avatar from their read cursor, returned by
   * p2p_list_messages as `peer_ref_ctime` (the same scalar on every row). Feeds
   * the cursor into applyReadReceipt, which synthesises the per-row _seen_ the
   * renderer expects. The hub-channel path uses real per-message metadata._seen_
   * instead, so this is a no-op there (no peer_ref_ctime, not a private area).
   */
  _applyPeerReadCursor() {
    const area = this.mget(_a.area) || this.mget(_a.type);
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    if (!isPrivate || !this.peerId) return;
    if (!this.__list || !_.isFunction(this.__list.getItemsByKind)) return;
    const items = this.__list.getItemsByKind(this.itemKind()) || [];
    let cursor = 0;
    for (const item of items) {
      const c = item && item.mget ? ~~item.mget("peer_ref_ctime") : 0;
      if (c) {
        cursor = c;
        break;
      }
    }
    if (cursor > 0) this.applyReadReceipt(this.peerId, cursor);
  }

  /**
   *
   * @param {*} data
   */
  removeUploadFromChat(data) {
    let list = this.attachmentList;
    if (!list) return;
    let media = list.getItemsByAttr(_a.nid, data.nid)[0];
    if (!media) return;
    // `now:1` destroys the card immediately. Passing an opts object WITHOUT
    // `now` would drop goodbye()'s default `timeout:2` and fall back to
    // selfDestroy's 2000ms delay — the card would linger ~2.5s, reading as
    // "the X did nothing" and (because each re-click restarts that timer) the
    // reported "must click several times to delete".
    //
    // goodbye()/selfDestroy remove the model with {silent:true}, so
    // media-wrapper's onRemoveChild (rebuild persisted list + collapse tray)
    // never fires and its `_e.update` is a no-op. Do that work in the callback,
    // after the card has actually left the collection.
    media.goodbye({
      now: 1,
      callback: () => {
        if (_.isFunction(list.isDestroyed) && list.isDestroyed()) return;
        if (_.isFunction(list.updateAttachment)) list.updateAttachment();
        this.checkPendingContent();
      },
    });
  }

  /**
   * @param {String} service
   * @param {Object} data
   * @param {Object} options
   */
  onWsMessage(service, data, options) {
    const area = this.mget(_a.area) || this.mget(_a.type);
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    const liveService = (options && options.service) || service;
    if (typeof this._refreshFileMentionsAfterMutation === "function") {
      this._refreshFileMentionsAfterMutation(liveService, data);
    }
    switch (liveService) {
      case SERVICE.contact.block:
      case SERVICE.contact.unblock:
        if (!this.peer || !isPrivate) {
          return;
        }
        if (this.peerId !== data.entity) {
          return;
        }
        this.peer.is_blocked = data.is_blocked;
        this.peer.is_blocked_me = data.is_blocked_me;
        this.updateChatUserStatus();
        return this.getPart("chat-footer").feed(
          require("./skeleton/footer")(this),
        );

      case SERVICE.channel.post:
      case SERVICE.chat.post:
      case SERVICE.chat.forward:
      case SERVICE.channel.post_ticket:
        var isChannel = [_a.dmz, _a.public, _a.share, _a.private].includes(
          area,
        );
        var hubMatch = isChannel && this.hubId === data.hub_id;
        var inScope = !hubMatch || this.matchesScopedChannel(data);
        // P2P message payload now carries peer_id (replaces entity_id).
        var privateMach = isPrivate && this.peerId === data.peer_id;
        var ticketMach =
          area === _a.ticket && data.ticket_id === this.mget("ticket_id");
        if (hubMatch) {
          this._syncScopedFolderContent(data);
        }
        if ((hubMatch && inScope) || privateMach || ticketMach) {
          this.handleReceivedMsg(data);
        }
        // A received message means that author is no longer typing.
        if (data && data.author_id) this._removeTyper(data.author_id);

        // If the widget id hiddent, don't acknowledge
        try {
          if (this.getHandlers(_a.ui)[0].isHidden()) return;
        } catch (e) {}
        // Acknowledge only IN-SCOPE messages (the folder/thread currently in view) —
        // same predicate handleReceivedMsg uses above. Hub-wide acking marked
        // sibling-folder messages _seen_ on receipt, which suppressed their
        // per-folder mention notifications (notification_center_next treats not-_seen_
        // as unread). Out-of-scope folders now keep their unread state until their
        // own chat is viewed.
        if ((hubMatch && inScope) || privateMach || ticketMach) {
          if (area === _a.share) {
            service = SERVICE.channel.acknowledge;
          } else if (isPrivate) {
            service = SERVICE.chat.acknowledge;
          } else if (area === _a.ticket) {
            service = SERVICE.channel.acknowledge_ticket;
          }

          if (Visitor.id !== data.author_id) {
            let postData = {
              service,
              hub_id: this.hubId,
            };
            if (isPrivate) {
              // chat.acknowledge takes peer_id (required) + optional ref_ctime
              // — message_id is no longer used for P2P. ref_ctime advances the
              // read cursor for the whole conversation up to this message.
              postData.peer_id = this.peerId;
              if (data.ctime) postData.ref_ctime = data.ctime;
            } else {
              postData.message_id = data.message_id;
              if (area === _a.ticket) {
                postData.ticket_id = data.ticket_id;
              }
            }
            this.postService(postData);
          }
        }
        break;

      // File-thread child message (per-file chat). Separate service from
      // channel.post so folder/workspace chat never receives these. Literal
      // strings (not SERVICE.*) for deploy-skew safety, matching the typing case.
      case "channel.file_thread_post": {
        if (!this.isFileThreadMode()) return;
        if (this.hubId !== data.hub_id) return;
        const ftid = `${(data.file_thread && data.file_thread.file_thread_id) ||
          data.file_thread_id ||
          ""}`;
        // Validate against the mounted file before adopting an asynchronously
        // discovered thread id. Adopting first turns any sibling thread event
        // into a self-match and renders that message in the wrong conversation.
        if (!this.matchesScopedChannel(data)) return;
        if (!this.fileThreadId && ftid) this.fileThreadId = ftid;
        this.handleReceivedMsg(data);
        if (data && data.author_id) this._removeTyper(data.author_id);
        // Acknowledge scoped to this thread only when the chat is visible and
        // the message is not the caller's own.
        try {
          if (this.getHandlers(_a.ui)[0].isHidden()) return;
        } catch (e) {
          return;
        }
        if (Visitor.id !== data.author_id && (this.fileThreadId || ftid)) {
          this.postService({
            service: this._ftSvc("acknowledge"),
            hub_id: this.hubId,
            file_thread_id: this.fileThreadId || ftid,
            message_id: data.message_id,
          });
        }
        return;
      }

      case "channel.file_thread_acknowledge":
        // File-thread read receipts belong only to the file-thread widget. A
        // coexisting General chat (full Chat tab) must ignore them — acknowledge
        // → applyReadReceipt would otherwise mis-paint unrelated General rows by
        // ctime with that reader's avatar.
        if (!this.isFileThreadMode()) return;
        this.acknowledge(data, options);
        return;

      case SERVICE.media.copy:
        setTimeout(() => {
          this.onFileListChange();
        }, 2000);

        break;

      case SERVICE.chat.delete:
      case SERVICE.channel.delete:
        var dataArr = [data];
        this.clearMessageFromChat(dataArr);
        break;

      case SERVICE.channel.acknowledge:
      case SERVICE.chat.acknowledge:
        // Folder/General read receipts must not bleed into a coexisting
        // file-thread panel (its rows would be mis-painted by ctime); the panel
        // acks via channel.file_thread_acknowledge instead.
        if (this.isFileThreadMode()) break;
        this.acknowledge(data, options);
        break;

      // Literal service strings (not SERVICE.* constants): the platform may not
      // expose *.typing until env reload, which would make the constants
      // `undefined` and wrongly match service-less messages.
      case "chat.typing":
      case "channel.typing":
        this._onTyping(data);
        break;

      // Reaction broadcast — replace chip map on the matching message item.
      // channel.react: { message_id, reactions, key_id }
      // chat.react:    { message_id, peer_id, reactions }
      // Both expose the same `reactions` shape: { "<emoji>": ["uid", ...] }
      case SERVICE.channel.react:
      case "channel.react": {
        if (!data || !data.message_id || !data.reactions) break;
        var reactItem =
          this.__list &&
          this.__list.getItemsByAttr("message_id", data.message_id)[0];
        if (reactItem && _.isFunction(reactItem._patchReactions)) {
          reactItem._patchReactions(data.reactions);
        }
        break;
      }

      case SERVICE.chat.react:
      case "chat.react": {
        if (!data || !data.message_id || !data.reactions) break;
        var chatReactItem =
          this.__list &&
          this.__list.getItemsByAttr("message_id", data.message_id)[0];
        if (chatReactItem && _.isFunction(chatReactItem._patchReactions)) {
          chatReactItem._patchReactions(data.reactions);
        }
        break;
      }

      // A meeting ended: channel.meeting_end flipped the start card's row
      // metadata (meeting_status='ended') and the server echoes the updated
      // message row to every hub socket. Without this case nothing consumed it,
      // so an already-rendered card kept offering "Join meeting" until the chat
      // was reloaded — the meeting looked live forever. Pushing the new metadata
      // into the item's model fires chat-item._onDataChanged → the card
      // re-renders as "Meeting ended". Literal string alongside SERVICE.* for
      // deploy-skew safety (same pattern as the typing cases): a literal only —
      // SERVICE.channel.meeting_end can be undefined against an older server,
      // and `case undefined` would swallow every service-less message.
      case "channel.meeting_end": {
        if (!data || !data.message_id) break;
        var endedItem =
          this.__list &&
          this.__list.getItemsByAttr("message_id", data.message_id)[0];
        if (endedItem) endedItem.mset(_a.metadata, data.metadata || {});
        break;
      }
    }
  }

  /**
   * Route a reaction toggle request from a chat-item to the correct backend
   * service depending on the conversation area (channel vs P2P).
   * Payload from chat-item: { service:"react", message_id, emoji, socket_id }
   * @param {Object} args
   */
  async _sendReaction(args) {
    if (!args || !args.message_id || !args.emoji) return;
    const area = this.mget(_a.area) || this.mget(_a.type);
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    const socketId = Visitor.get(_a.socket_id) || "";

    let resp;
    if (isPrivate) {
      if (!this.peerId) return;
      // SERVICE.chat.react surfaces after BE phase 2 is deployed.
      // Fallback literal keeps the call shape correct even before that.
      const chatReactSvc = SERVICE.chat.react || "chat.react";
      resp = await this.postService(chatReactSvc, {
        message_id: args.message_id,
        emoji: args.emoji,
        entity_id: this.peerId,
        socket_id: socketId,
      });
    } else {
      // SERVICE.channel.react surfaces after BE phase 2 is deployed.
      const channelReactSvc = SERVICE.channel.react || "channel.react";
      resp = await this.postService(channelReactSvc, {
        message_id: args.message_id,
        emoji: args.emoji,
        hub_id: this.hubId,
        socket_id: socketId,
      });
    }

    // The acting user is excluded from the WS broadcast, so reconcile this item
    // from the authoritative response — corrects the optimistic chip when the
    // server rejected the add (distinct-emoji cap / invalid emoji) or otherwise
    // diverged. No-op when the optimistic map already matches the server.
    if (resp && resp.reactions && this.__list && _.isFunction(this.__list.getItemsByAttr)) {
      const item = this.__list.getItemsByAttr("message_id", args.message_id)[0];
      if (item && _.isFunction(item._patchReactions)) item._patchReactions(resp.reactions);
    }
  }

  _bindMentionKeyboard() {
    if (this._mentionKeyboardBound || !this.el) return;
    this._mentionDropdownIndex = -1;
    this.el.addEventListener("keydown", this._onMentionDropdownKeydown, true);
    this.el.addEventListener("keyup", this._onMentionDropdownKeyup, true);
    this._mentionKeyboardBound = true;
  }

  _getMentionDropdownEl() {
    const dropdown = this.getPart && this.getPart("mention-dropdown");
    if (dropdown && dropdown.el) return dropdown.el;
    if (!this.el) return null;
    return this.el.querySelector(`.${this.fig.family}__mention-dropdown`);
  }

  _getMentionItems() {
    const dropdownEl = this._getMentionDropdownEl();
    if (!dropdownEl || dropdownEl.dataset.state !== _a.open) return [];
    return Array.from(dropdownEl.querySelectorAll(".mention-item"));
  }

  _setMentionActiveIndex(index) {
    const items = this._getMentionItems();
    if (!items.length) {
      this._mentionDropdownIndex = -1;
      return null;
    }
    const next = ((index % items.length) + items.length) % items.length;
    items.forEach((item, i) => {
      const active = i === next ? "1" : "0";
      item.dataset.active = active;
      item.setAttribute("aria-selected", active === "1" ? "true" : "false");
    });
    this._mentionDropdownIndex = next;
    items[next].scrollIntoView({ block: "nearest" });
    return items[next];
  }

  _selectMentionDropdownItem(item) {
    if (!item) return false;
    this._onMentionFileSelect({ el: item }, { service: "mention-select" });
    return true;
  }

  _stopMentionKeyboardEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    if (_.isFunction(e.stopImmediatePropagation)) e.stopImmediatePropagation();
  }

  _onMentionDropdownKeydown(e) {
    const key = e.key || e.code;
    if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(key)) return true;

    const dropdownEl = this._getMentionDropdownEl();
    if (!dropdownEl || dropdownEl.dataset.state !== _a.open) return true;

    const items = this._getMentionItems();
    if (!items.length) {
      if (key !== "Escape") return true;
      this._stopMentionKeyboardEvent(e);
      this._mentionKeyboardSuppressKeyup = key;
      this._closeMentionDropdown();
      return false;
    }

    this._stopMentionKeyboardEvent(e);
    this._mentionKeyboardSuppressKeyup = key;

    if (key === "Escape") {
      this._closeMentionDropdown();
      return false;
    }

    if (key === "Enter") {
      const item = items[this._mentionDropdownIndex] ||
        this._setMentionActiveIndex(0);
      this._selectMentionDropdownItem(item);
      return false;
    }

    const delta = key === "ArrowDown" ? 1 : -1;
    const start = this._mentionDropdownIndex < 0
      ? (key === "ArrowDown" ? 0 : items.length - 1)
      : this._mentionDropdownIndex + delta;
    this._setMentionActiveIndex(start);
    return false;
  }

  _onMentionDropdownKeyup(e) {
    const key = e.key || e.code;
    if (!this._mentionKeyboardSuppressKeyup) return true;
    if (this._mentionKeyboardSuppressKeyup !== key) return true;
    this._mentionKeyboardSuppressKeyup = null;
    this._stopMentionKeyboardEvent(e);
    return false;
  }

  _resolveFileMentionScope() {
    const home = this.mget(_a.home);
    let hubId = this.hubId || this.mget(_a.hub_id) || "";
    let nid =
      (this.getScopedNid && this.getScopedNid()) ||
      this.scopedNid ||
      this.mget(_a.nid) ||
      "";

    try {
      const folderWindow =
        this.getParentByKind &&
        (this.getParentByKind("window_folder") ||
          this.getParentByKind("window_team") ||
          this.getParentByKind("window_sharebox"));
      if (folderWindow) {
        const actualNode =
          folderWindow.actualNode && folderWindow.actualNode();
        const actualNid =
          actualNode && (actualNode.nid || actualNode.id);
        const actualHubId =
          actualNode && (actualNode.actual_hub_id || actualNode.hub_id);
        const modelNid = folderWindow.mget && folderWindow.mget(_a.nid);
        const modelHubId =
          folderWindow.mget &&
          (folderWindow.mget(_a.actual_hub_id) ||
            folderWindow.mget(_a.hub_id));
        nid = actualNid || modelNid || nid;
        hubId = actualHubId || modelHubId || hubId;
      }
    } catch (e) {}

    if (!nid) nid = (home && home.home_id) || hubId;
    hubId = `${hubId || ""}`;
    nid = `${nid || ""}`;
    return { hubId, nid, key: `${hubId}:${nid}` };
  }

  _isFileMentionRequestCurrent(token) {
    if (!token) return true;
    if (this.isDestroyed && this.isDestroyed()) return false;
    if (this._mentionRequestSeq !== token.requestSeq) return false;
    const active = this._activeFileMention;
    if (!active || active.requestSeq !== token.requestSeq) return false;
    if (active.scopeKey !== token.scopeKey) return false;
    return this._resolveFileMentionScope().key === token.scopeKey;
  }

  _isFileMentionMutation(service) {
    switch (service) {
      case "media.new":
      case "media.remove":
      case "media.make_dir":
      case "media.upload":
      case "media.save":
      case "media.replace":
      case "media.copy":
      case "media.copy_all":
      case "media.move":
      case "media.move_all":
      case "media.relocate":
      case "media.workspace_move":
      case "media.rename":
      case "media.trash":
      case "media.restore":
      case "media.restore_into":
      case "media.purge":
        return true;
      default:
        return false;
    }
  }

  _refreshFileMentionsAfterMutation(service, data) {
    if (!this._isFileMentionMutation(service)) return;
    const active = this._activeFileMention;
    if (!active) return;

    // One socket carries pushes from every workspace the user belongs to.
    // Ignore a clearly foreign single-node event, but keep invalidating for
    // arrays/batches and payloads without a trustworthy hub identity.
    const eventHubIds = new Set();
    let hasAmbiguousHubPayload = Array.isArray(data);
    const addHubId = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        hasAmbiguousHubPayload = true;
        return;
      }
      const hubId = node.actual_hub_id || node.hub_id;
      if (hubId) eventHubIds.add(`${hubId}`);
    };
    if (data && !Array.isArray(data)) {
      addHubId(data);
      addHubId(data.src);
      addHubId(data.dest);
      if (data.args) {
        addHubId(data.args.src);
        addHubId(data.args.dest);
      }
    }
    if (
      !hasAmbiguousHubPayload &&
      eventHubIds.size &&
      !eventHubIds.has(`${active.hubId}`)
    ) {
      return;
    }

    const scope = this._resolveFileMentionScope();
    if (scope.key !== active.scopeKey) {
      this._closeMentionDropdown();
      return;
    }

    if (this._mentionRefreshTimer != null) {
      clearTimeout(this._mentionRefreshTimer);
      this._mentionRefreshTimer = null;
    }
    this._closeMentionDropdown({ preserveFileQuery: true });
    this._mentionRefreshTimer = setTimeout(() => {
      this._mentionRefreshTimer = null;
      if (this.isDestroyed && this.isDestroyed()) {
        this._closeMentionDropdown();
        return;
      }
      if (this._activeFileMention !== active) return;
      if (this._resolveFileMentionScope().key !== active.scopeKey) {
        this._closeMentionDropdown();
        return;
      }
      this._showMentionFiles(active.filter, "file");
    }, 120);
  }

  /**
   * Normalize media-service response envelopes before rows are rendered.
   */
  _mentionRows(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.data)) return data.data;
    if (data.data && Array.isArray(data.data.rows)) return data.data.rows;
    return [];
  }

  _mentionErrorCode(data) {
    if (!data) return "";
    if (data instanceof Error && data.code) return `${data.code}`;
    if (typeof data === "string") {
      return /^[A-Z][A-Z0-9_]+$/.test(data) ? data : "";
    }
    const direct = [data.error_code, data.error, data.code, data.reason]
      .find((value) => typeof value === "string" && value.length);
    if (direct) return `${direct}`;
    if (data.error && typeof data.error === "object") {
      return this._mentionErrorCode(data.error);
    }
    if (typeof data.status === "string" &&
      /^[A-Z][A-Z0-9_]+$/.test(data.status) &&
      !["OK", "SUCCESS"].includes(data.status)) {
      return data.status;
    }
    if (data.data && !Array.isArray(data.data) && typeof data.data === "object") {
      return this._mentionErrorCode(data.data);
    }
    return "";
  }

  async _searchMentionFiles(folderHubId, folderNid, filter, requestToken) {
    if (!this._isFileMentionRequestCurrent(requestToken)) return [];
    const query = (filter || "").trim().replace(/\s+/g, " ");
    const service = (SERVICE.media && SERVICE.media.search_names) ||
      "media.search_names";
    const response = await this.fetchService({
      service,
      hub_id: folderHubId,
      nid: folderNid,
      query,
      limit: 6,
    });
    if (!this._isFileMentionRequestCurrent(requestToken)) return [];

    const errorCode = this._mentionErrorCode(response);
    if (errorCode) {
      const error = new Error(errorCode);
      error.code = errorCode;
      error.error_code = errorCode;
      throw error;
    }

    const rows = this._mentionRows(response);
    if (rows.some((row) => !row || `${row.hub_id || ""}` !== `${folderHubId}`)) {
      const error = new Error("MENTION_HUB_MISMATCH");
      error.code = "MENTION_HUB_MISMATCH";
      throw error;
    }
    return { rows: rows.slice(0, 6), canonical: true };
  }

  async _fetchDirectMentionFiles(folderHubId, folderNid, requestToken) {
    const rows = [];
    const seen = new Set();
    const isCurrent = () =>
      !requestToken || this._isFileMentionRequestCurrent(requestToken);
    let page = 1;
    const pageFingerprints = new Set();

    while (rows.length < 6 && isCurrent()) {
      const data = await this.fetchService({
        service: SERVICE.media.show_node_by,
        hub_id: folderHubId,
        nid: folderNid,
        page,
        sort: "name",
        order: "asc",
      }).catch(() => null);
      if (!isCurrent()) return rows;
      const pageRows = this._mentionRows(data);
      if (!pageRows.length) break;
      const fingerprint = JSON.stringify(pageRows.map((item, index) => [
        item && (item.nid || item.id || "") || "empty",
        item && (item.filename || item.user_filename || "") || index,
        item && (item.filetype || item.ftype || "") || "",
      ]));
      if (pageFingerprints.has(fingerprint)) break;
      pageFingerprints.add(fingerprint);

      for (const item of pageRows) {
        if (!item) continue;
        const nid = item.nid || item.id;
        const filetype = item.filetype || item.ftype;
        if (!nid || filetype === _a.hub || filetype === "root" || seen.has(`${nid}`)) {
          continue;
        }
        seen.add(`${nid}`);
        const filename = item.filename || item.user_filename || "";
        rows.push({
          ...item,
          nid,
          hub_id: item.hub_id || folderHubId,
          filename,
          mention_path: filename,
        });
        if (rows.length >= 6) break;
      }
      page += 1;
    }
    return rows;
  }

  /**
   * Search files/folders under the current folder for mention suggestions.
   * Uses only read/list calls; sendMessage keeps mentions out of attachments.
   */
  async _fetchMentionFiles(
    folderHubId,
    folderNid,
    filter,
    requestToken,
    { boundedFallback = false } = {},
  ) {
    const query = (filter || "").trim().toLowerCase();
    if (!query) {
      return this._fetchDirectMentionFiles(
        folderHubId,
        folderNid,
        requestToken,
      );
    }
    const rows = [];
    const seen = new Set();
    const visitedFolders = new Set();
    // The listing path is retained only for the typed secure-share/DMZ
    // fallback. Keep its historical safety envelope there; direct tests and
    // the explicitly-authorized legacy helper retain their prior completeness
    // semantics when this flag is not set.
    const maxDepth = boundedFallback ? 4 : Number.POSITIVE_INFINITY;
    const maxFolders = boundedFallback ? 40 : Number.POSITIVE_INFINITY;
    const maxRows = boundedFallback ? 80 : Number.POSITIVE_INFINITY;
    const maxPages = boundedFallback ? 200 : Number.POSITIVE_INFINITY;
    const queue = [{ nid: folderNid, path: "", depth: 0 }];
    let pagesVisited = 0;

    const toRows = (d) => {
      if (!d) return [];
      if (Array.isArray(d)) return d;
      return d.rows || d.data || [];
    };

    const matches = (file) => {
      if (!query) return true;
      const name = (file.filename || file.user_filename || "").toLowerCase();
      const path = (file.mention_path || "").toLowerCase();
      return name.includes(query) || path.includes(query);
    };

    const isCurrent = () =>
      !requestToken || this._isFileMentionRequestCurrent(requestToken);

    while (
      queue.length &&
      visitedFolders.size < maxFolders &&
      rows.length < maxRows &&
      pagesVisited < maxPages &&
      isCurrent()
    ) {
      const folder = queue.shift();
      if (!folder || !folder.nid || visitedFolders.has(folder.nid)) continue;
      visitedFolders.add(folder.nid);

      const pageFingerprints = new Set();
      let page = 1;
      while (
        isCurrent() &&
        rows.length < maxRows &&
        pagesVisited < maxPages
      ) {
        pagesVisited += 1;
        const data = await this.fetchService({
          service: SERVICE.media.show_node_by,
          hub_id: folderHubId,
          nid: folder.nid,
          page,
          sort: "name",
          order: "asc",
        }).catch(() => null);
        if (!isCurrent()) return rows;

        const pageRows = toRows(data);
        if (!pageRows.length) break;
        const fingerprint = JSON.stringify(
          pageRows.map((item, index) => {
            if (!item) return ["empty", index];
            return [
              item.nid || item.id || "",
              item.filename || item.user_filename || "",
              item.filetype || item.ftype || "",
            ];
          }),
        );
        if (pageFingerprints.has(fingerprint)) break;
        pageFingerprints.add(fingerprint);

        for (const item of pageRows) {
          if (!item || item.filetype === _a.hub) continue;
          const filename = item.filename || item.user_filename || "";
          const mentionPath = folder.path
            ? `${folder.path}/${filename}`
            : filename;
          const normalized = {
            ...item,
            filename,
            mention_path: mentionPath,
          };
          const key = `${normalized.nid || ""}`;
          const isFolder =
            item.filetype === _a.folder || item.ftype === _a.folder;

          if (matches(normalized) && key && !seen.has(key)) {
            seen.add(key);
            rows.push(normalized);
          }

          if (
            query &&
            isFolder &&
            item.nid &&
            folder.depth < maxDepth &&
            visitedFolders.size + queue.length < maxFolders
          ) {
            queue.push({
              nid: item.nid,
              path: mentionPath,
              depth: folder.depth + 1,
            });
          }
        }
        page += 1;
      }
    }

    return rows;
  }

  /**
   * Show mention dropdown filtered by text
   * @param {string} filter - text after trigger character
   * @param {string} mentionType - 'contact' (from @) or 'file' (from /)
   */
  _showMentionFiles(filter, mentionType) {
    console.log("[mention] _showMentionFiles entry", {
      filter,
      mentionType,
      scope: this.mget("scope"),
      hubId: this.hubId,
      hasGetPart: !!this.getPart,
      fig: this.fig && this.fig.family,
    });
    // A new query must not leave rows from the previous query selectable while
    // its async traversal is running. This also cancels a delayed mutation
    // refresh when the user switches to a contact mention.
    this._closeMentionDropdown();
    // mention-dropdown is rendered nested inside chat-footer → getPart may
    // not resolve it through the part registry depending on partHandler
    // wiring. Fall back to a direct DOM lookup so folder-chat and bigchat
    // both find it. Downstream code touches `.el.dataset` and `.el.innerHTML`,
    // so we normalize on the DOM node.
    let dropdownEl;
    const dropdownPart = this.getPart && this.getPart("mention-dropdown");
    if (dropdownPart && dropdownPart.el) {
      dropdownEl = dropdownPart.el;
      console.log("[mention] dropdown via getPart ✓");
    } else if (this.el) {
      dropdownEl = this.el.querySelector(
        `.${this.fig.family}__mention-dropdown`,
      );
      console.log("[mention] dropdown via querySelector", {
        found: !!dropdownEl,
      });
    }
    if (!dropdownEl) {
      console.warn("[mention] NO DROPDOWN ELEMENT — aborting");
      return;
    }
    const dropdown = { el: dropdownEl };

    // Staleness guard.  A sequence token prevents any late list/search response
    // from reopening a dropdown that the user superseded or closed.
    const requestSeq = (this._mentionRequestSeq || 0) + 1;
    this._mentionRequestSeq = requestSeq;

    const hubId = this.hubId;
    const mediaGridPreview = require("builtins/media/grid/template/preview");

    let filesPromise = Promise.resolve(null);
    let contactsPromise = Promise.resolve(null);
    let folderHubId = hubId;
    let requestToken = null;

    if (mentionType === "file") {
      const fileScope = this._resolveFileMentionScope();
      folderHubId = fileScope.hubId;
      this._activeFileMention = {
        filter: filter || "",
        hubId: fileScope.hubId,
        nid: fileScope.nid,
        scopeKey: fileScope.key,
        requestSeq,
      };
      requestToken = {
        requestSeq,
        scopeKey: fileScope.key,
      };
      const searchFilter = (filter || "").trim().replace(/\s+/g, " ");
      if (!searchFilter) {
        filesPromise = this._fetchMentionFiles(
          fileScope.hubId,
          fileScope.nid,
          "",
          requestToken,
        );
      } else {
        // A settled non-blank filter maps to exactly one scoped server search.
        // The resolver is retained so closing/superseding the dropdown also
        // settles this pending Promise instead of leaking a timer-owned chain.
        filesPromise = new Promise((resolve, reject) => {
          this._mentionQueryCancel = () => resolve([]);
          this._mentionQueryTimer = setTimeout(async () => {
            this._mentionQueryTimer = null;
            this._mentionQueryCancel = null;
            if (!this._isFileMentionRequestCurrent(requestToken)) {
              resolve([]);
              return;
            }
            try {
              const result = await this._searchMentionFiles(
                fileScope.hubId,
                fileScope.nid,
                searchFilter,
                requestToken,
              );
              resolve(result);
            } catch (error) {
              // Secure-share/DMZ keeps its existing token-authoritative list
              // behavior.  Every other search failure stays fail-closed.
              if (this._mentionErrorCode(error) ===
                "SEARCH_NAMES_UNSUPPORTED_CONTEXT") {
                try {
                  resolve(await this._fetchMentionFiles(
                    fileScope.hubId,
                    fileScope.nid,
                    searchFilter,
                    requestToken,
                    { boundedFallback: true },
                  ));
                } catch (fallbackError) {
                  reject(fallbackError);
                }
                return;
              }
              reject(error);
            }
          }, 120);
        });
      }
    }

    if (mentionType === "contact") {
      // Folder-chat scope: mention workspace members (people who can see
      // this folder), not the visitor's personal chat rooms. Falls back to
      // contact_rooms when not in folder scope (bigchat / direct chat).
      if (this.mget("scope") === _a.folder && folderHubId) {
        const payload = {
          service: SERVICE.hub.get_members_by_type,
          hub_id: folderHubId,
          type: "all",
        };
        console.log("[mention-members] api request", {
          source: "hub.get_members_by_type",
          payload,
          filter,
          scope: this.mget("scope"),
          chatHubId: this.hubId,
          folderHubId,
          visitorId: Visitor.id,
        });
        contactsPromise = this.fetchService(payload).catch((e) => {
          console.warn("[mention] hub members fetch failed", e);
          return null;
        });
      } else {
        const payload = {
          service: SERVICE.chat.contact_rooms,
          hub_id: Visitor.get(_a.id),
          key: filter || "",
        };
        console.log("[mention-members] api request", {
          source: "chat.contact_rooms",
          payload,
          filter,
          scope: this.mget("scope"),
          chatHubId: this.hubId,
          visitorId: Visitor.id,
        });
        contactsPromise = this.fetchService(payload).catch((e) => {
          console.warn("[mention] contact_rooms fetch failed", e);
          return null;
        });
      }
    }

    Promise.all([filesPromise, contactsPromise])
      .then(([filesData, contactsData]) => {
        // A newer search started, or the dropdown was closed (e.g. the user
        // already selected a file), while this request was in flight — drop the
        // stale result instead of re-opening the popup.
        if (this._mentionRequestSeq !== requestSeq) return;
        if (
          requestToken &&
          !this._isFileMentionRequestCurrent(requestToken)
        ) {
          return;
        }
        console.log("[mention] fetch resolved", {
          filesRaw: filesData,
          contactsRaw: contactsData,
          contactsType: Array.isArray(contactsData)
            ? "array"
            : typeof contactsData,
        });
        const canonicalFileSearch = !!(filesData && filesData.canonical);
        let files = this._mentionRows(filesData);
        let contacts = this._mentionRows(contactsData);
        console.log("[mention] toRows", {
          files: files.length,
          contacts: contacts.length,
        });
        console.log("[mention-members] api rows", {
          count: contacts.length,
          rows: contacts.map(mentionMemberDebugRow),
        });

        files = files.filter((f) => f.filetype !== _a.hub);

        const contactsBeforeLabelFilter = contacts;
        contacts = contacts.filter((c) => mentionMemberLabel(c).length > 0);
        console.log("[mention-members] after label filter", {
          before: contactsBeforeLabelFilter.length,
          after: contacts.length,
          dropped: contactsBeforeLabelFilter
            .filter((c) => mentionMemberLabel(c).length === 0)
            .map(mentionMemberDebugRow),
        });

        const normalizedFilter = (filter || "").toLowerCase();
        if (normalizedFilter) {
          // The server has already searched and ranked the complete readable
          // subtree.  Re-filtering its six canonical rows in the browser can
          // apply a different Unicode/collation rule and hide valid results.
          if (!canonicalFileSearch) {
            files = files.filter((f) => {
              const name = (f.filename || "").toLowerCase();
              const path = (f.mention_path || "").toLowerCase();
              return name.includes(normalizedFilter) || path.includes(normalizedFilter);
            });
          }
          const contactsBeforeSearchFilter = contacts;
          contacts = contacts.filter((c) => {
            return mentionMemberSearchText(c).includes(normalizedFilter);
          });
          console.log("[mention-members] after search filter", {
            filter: normalizedFilter,
            before: contactsBeforeSearchFilter.length,
            after: contacts.length,
            dropped: contactsBeforeSearchFilter
              .filter((c) => !mentionMemberSearchText(c).includes(normalizedFilter))
              .map(mentionMemberDebugRow),
          });
        }

        let html = "";

        if (files.length) {
          const isImgCapable = (file) => {
            if (/^-/.test(file.capability || "")) return 0;
            if ((file.ext || "").toLowerCase() === "svg") return 1;
            if ((file.ext || "").toLowerCase() === _a.pdf) return 0;
            if (/text/.test(file.mimetype || "")) return 0;
            if (/shell|script|text/.test(file.filetype || "")) return 0;
            return /^r/.test(file.capability || "") ? 1 : 0;
          };
          const previewUrl = (file) =>
            file.url ||
            file.vignette ||
            file.thumbnail ||
            file.src ||
            file.preview ||
            "";
          const renderFileIcon = (file) => {
            const url = previewUrl(file);
            const model = {
              ...file,
              _id: file._id || file.id || file.nid,
              area: file.area || this.mget(_a.area),
              role:
                file.filetype === _a.folder ? "mention" : file.role || "desk",
              imgCapable: url ? isImgCapable(file) : 0,
              url,
              widgetId: _.uniqueId("mention-preview-"),
              isAttachment: 1,
            };
            switch (model.filetype) {
              case _a.folder:
                return require("builtins/media/grid/template/folder")(model);
              case _a.audio:
                return require("builtins/media/grid/template/filetype/audio.txt")
                  .default;
              case _a.note:
              case "markdown":
                return require("builtins/media/grid/template/filetype/note.txt")
                  .default;
              default:
                return mediaGridPreview(model);
            }
          };
          html += `<div class="mention-section-header">${LOCALE.MENTION_FILES}</div>`;
          files.slice(0, 6).forEach((f) => {
            const label = f.mention_path || f.filename;
            // File row: type icon + name + a single-select radio cue on the right
            // (filled on the active/hovered row). Click still mentions immediately.
            html += `<div class="mention-item mention-item--file" data-nid="${_.escape(f.nid)}" data-hub_id="${_.escape(folderHubId)}" data-filename="${_.escape(f.filename)}" data-type="file" data-service="mention-select">
            <div class="mention-item__icon ${_.escape(f.area || "")}">${renderFileIcon(f)}</div>
            <div class="mention-item__name">${_.escape(label)}</div>
            <span class="mention-item__radio" aria-hidden="true"></span>
          </div>`;
          });
        }

        if (contacts.length) {
          console.log("[mention-members] render contacts", {
            count: contacts.length,
            rendered: contacts.slice(0, 6).map(mentionMemberDebugRow),
          });
          html += `<div class="mention-section-header">${LOCALE.PEOPLE}</div>`;
          contacts.slice(0, 6).forEach((c) => {
            const drumate_id = c.drumate_id || c.entity_id || c.id;
            const fullname = mentionMemberLabel(c);
            const firstname =
              cleanMentionText(c.firstname) ||
              cleanMentionText(c.surname) ||
              fullname;
            const lastname = cleanMentionText(c.lastname);
            const avatarUrl = Visitor.avatar(drumate_id, _a.vignette);

            html += `<div class="mention-item mention-item--contact" data-drumate_id="${drumate_id}" data-firstname="${_.escape(firstname)}" data-lastname="${_.escape(lastname)}" data-fullname="${_.escape(fullname)}" data-type="contact" data-service="mention-select">
            <div class="mention-item__avatar"><img class="mention-item__avatar-img" src="${avatarUrl}"></div>
            <div class="mention-item__name">${_.escape(fullname)}</div>
          </div>`;
          });
        }

        console.log("[mention] html length", html.length);
        if (!html) {
          console.warn("[mention] empty html → closing dropdown");
          this._closeMentionDropdown();
          return;
        }

        dropdown.el.innerHTML = html;
        dropdown.el.dataset.state = _a.open;
        this._setMentionActiveIndex(0);
        console.log("[mention] dropdown OPENED", {
          state: dropdown.el.dataset.state,
          visible: dropdown.el.offsetParent !== null,
          rect: dropdown.el.getBoundingClientRect(),
        });

        const self = this;
        dropdown.el.querySelectorAll(".mention-item").forEach((el) => {
          el.onclick = function (e) {
            e.stopPropagation();
            self._selectMentionDropdownItem(this);
          };
        });
      })
      .catch((err) => {
        this.warn("Mention error:", err);
        this._closeMentionDropdown();
      });
  }

  /**
   * Close mention dropdown
   */
  _closeMentionDropdown({ preserveFileQuery = false } = {}) {
    // Invalidate any in-flight file search so a late resolve can't re-open the
    // popup after the dropdown is closed (see _showMentionFiles staleness guard).
    this._mentionRequestSeq = (this._mentionRequestSeq || 0) + 1;
    if (this._mentionQueryTimer != null) {
      clearTimeout(this._mentionQueryTimer);
      this._mentionQueryTimer = null;
    }
    if (this._mentionQueryCancel) {
      const cancel = this._mentionQueryCancel;
      this._mentionQueryCancel = null;
      cancel();
    }
    if (this._mentionRefreshTimer != null) {
      clearTimeout(this._mentionRefreshTimer);
      this._mentionRefreshTimer = null;
    }
    if (!preserveFileQuery) this._activeFileMention = null;
    this._mentionDropdownIndex = -1;
    const dropdownEl = this._getMentionDropdownEl();
    if (!dropdownEl) return;
    dropdownEl.dataset.state = _a.closed;
    dropdownEl.innerHTML = "";
  }

  /**
   * Handle file or contact selection from mention dropdown
   */
  _onMentionFileSelect(cmd, args) {
    let item;

    if (cmd && cmd.el) {
      let el = cmd.el;
      if (!el.dataset.type) {
        el = el.closest(".mention-item") || el;
      }
      const d = el.dataset;
      if (d.type === "contact") {
        item = {
          type: "contact",
          drumate_id: d.drumate_id,
          firstname: d.firstname,
          lastname: d.lastname,
          fullname: d.fullname,
        };
      } else {
        item = {
          type: "file",
          nid: d.nid,
          hub_id: d.hub_id,
          filename: d.filename,
        };
      }
    }

    if (!item) return;

    this.ensurePart(_a.message).then((messenger) => {
      if (_.isFunction(messenger._onMentionSelect)) {
        messenger._onMentionSelect(item);
      }
    });
    this._closeMentionDropdown();
  }

  /**
   */
  clearMessageBlock() {
    this.clearStorage();
    this.isMessageInQueue = false;
    if (this._attachmentContent && !this._attachmentContent.isDestroyed()) {
      this._attachmentContent.destroy();
    }
    this.__message.resetMessage();
    this.clearReplyMessage();
  }

  // ── Drag-and-drop onto the whole chat panel ──────────────────────────────
  // Uses a depth counter so enter/leave events from child elements don't
  // cause the overlay to flicker. The window-manager handles drops in
  // floating windows (window-bigchat, window-channel) via data-over; this
  // handles the panel context (chat-p2p sidebar) via data-dragging.

  _onDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    this._dragDepth = (this._dragDepth || 0) + 1;
    if (this._dragDepth === 1) this.el.dataset.dragging = 1;
  }

  _onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  _onDragLeave(e) {
    e.stopPropagation();
    this._dragDepth = Math.max(0, (this._dragDepth || 0) - 1);
    if (this._dragDepth === 0) this.el.dataset.dragging = 0;
  }

  _onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this._dragDepth = 0;
    this.el.dataset.dragging = 0;
    this.upload(e);
  }

  static initClass() {
    this.prototype.events = {
      dragenter: "_onDragEnter",
      dragover: "_onDragOver",
      dragleave: "_onDragLeave",
      drop: "_onDrop",
    };
  }
}

__widget_chat.initClass();

module.exports = __widget_chat;
