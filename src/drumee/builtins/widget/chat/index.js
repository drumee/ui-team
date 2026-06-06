const { copyToClipboard, dataTransfer } = require("@drumee/ui-essentials");
require("./skin");

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
    this.showSend = this.showSend.bind(this);
    this.clearMessageFromChat = this.clearMessageFromChat.bind(this);
    this.removeUploadFromChat = this.removeUploadFromChat.bind(this);
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
      this.scopedFileNid = "";
      this.storageKey = nid
        ? `${area}-${this.hubId}-${nid}`
        : `${area}-${this.hubId}`;
    }

    this.hubId = this.hubId || this.mget(_a.hub_id);
    this.declareHandlers();
    this.bindEvent(_a.live);
    this._newMsgCount = 0;

    // Typing indicator state.
    // _typers: author_id -> { name, timer } for remote users currently typing.
    // _typingSentAt / _typingIdleTimer: throttle + idle-stop for the local user.
    this._typers = new Map();
    this._typingSentAt = 0;
    this._typingIdleTimer = null;

    // Mark this conversation read when its workspace/folder is clicked in the
    // window manager (Wm fires "chat:read" with the focused hub context).
    this._onReadContext = this._onReadContext.bind(this);
    RADIO_BROADCAST.on("chat:read", this._onReadContext);
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
    this.unbindEvent(_a.live);
    RADIO_BROADCAST.off("chat:read", this._onReadContext);
    clearTimeout(this._folderContentSyncTimer);
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
    this._typers.set(authorId, { name, timer });
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
   * Render the typing indicator from the current _typers set.
   */
  _renderTypers() {
    this.ensurePart("typing-indicator")
      .then((part) => {
        if (!part || !part.el) return;
        const names = Array.from(this._typers.values()).map((t) => t.name);
        if (!names.length) {
          if (_.isFunction(part.setState)) part.setState(0);
          else part.el.dataset.state = "0";
          return;
        }
        let text;
        if (names.length === 1) {
          text = (LOCALE.IS_TYPING || "{0} is typing…").format(names[0]);
        } else if (names.length === 2) {
          text = (LOCALE.TWO_TYPING || "{0} and {1} are typing…").format(
            names[0],
            names[1],
          );
        } else {
          // 3+ typers: show at most the first two names, then "and more".
          text = (LOCALE.MANY_TYPING || "{0}, {1} and more are typing…").format(
            names[0],
            names[1],
          );
        }
        this.ensurePart("typing-text")
          .then((t) => {
            if (t && t.el) t.el.textContent = text;
          })
          .catch(() => {});
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
        child.onAddKid = this.handleScroll.bind(this);
        child.once(_e.ready, () => {
          this.scrollMessagesToBottom(child);
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
    }, 100);
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
      this.mset(_a.home, data);
      this.mset(_a.nid, data.chat_upload_id);
      this.clear_notifications();
      if (this.__refWindowName != null) {
        return this.__refWindowName.set({ content: data.name });
      }
      this.feed(require("./skeleton")(this));
    });
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
    let children = this.__list.getItemsByKind("widget_chat_item");
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
    switch (service) {
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

      case _e.reply:
        return this.replyMessage(cmd);

      case "close-reply-message":
        return this.clearReplyMessage();

      case "clear-file-scope":
        return this.setScopedFileNid(null, null);

      case "attachment-reponse":
        return this.__list.scrollToBottom();

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
        console.log("[widget-chat] show-message-selector", {
          type: args.type,
          hasActionButtons: !!this.getPart("message-action-buttons"),
        });
        this.getPart("message-action-buttons").feed(
          require("./skeleton/action-buttons")(this, args.type),
        );
        setTimeout(() => {
          this.showMsgCount(cmd);
        }, 300);
        return; // this.showMsgCount(cmd);

      case "select-message":
        return this.showMsgCount(cmd);

      case "delete-for-me":
        return this.deleteMessage(cmd, service);

      case "delete-for-all":
        this.setMessageSelectorState(0);
        if (cmd.el.dataset.active === _a.yes) {
          return this.deleteMessage(cmd, service);
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
      // list_thread_by_file returns attachment hits UNION mention hits
      // (server merges channel_list_by_file + channel_search on the
      // `mention:hub_id:file_nid` literal pattern, dedupes by message_id).
      // Large pagelength makes the list widget call `_eod` after the first page.
      return {
        service: SERVICE.channel.list_thread_by_file,
        hub_id: this.hubId,
        file_nid: this.scopedFileNid,
        pagelength: 200,
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

  // Update the folder scope so messages are filtered to a specific sub-folder.
  setScopedFolderNid(folderNid) {
    const next = folderNid ? `${folderNid}` : "";
    if (this.scopedNid === next) return;
    this.scopedNid = next;
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
  setScopedFileNid(fileNid, label) {
    const next = fileNid ? `${fileNid}` : "";
    if (this.scopedFileNid === next) {
      this._refreshScopeChip(next, label);
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
    this._refreshScopeChip(next, label);
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
          footer.el.dataset.scopedHidden = scoped ? "1" : "0";
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
    const attachmentIds = this._attachmentIds(messageData, fallback);
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

  /**
   *
   * @param {*} data
   * @returns
   */
  matchesScopedChannel(data = {}) {
    if (_.isArray(data)) data = data[0] || {};
    if (this.scopedFileNid) {
      const attachments = this.parseAttachmentField(data.attachment).map(
        String,
      );
      if (attachments.includes(`${this.scopedFileNid}`)) return true;
      const body = data.message || "";
      return body.includes(`mention:${this.hubId}:${this.scopedFileNid}`);
    }
    const nid = this.getScopedNid();
    if (!nid) return true;
    const messageNid = data.nid || data.parent_id || data.pid;
    return `${messageNid}` === `${nid}`;
  }

  /**
   *
   * @param {*} args
   * @returns
   */
  sendMessage(args = {}) {
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
        if (this.scopedFileNid) {
          attachments = attachments || [];
          if (!attachments.map(String).includes(`${this.scopedFileNid}`)) {
            attachments = [this.scopedFileNid, ...attachments];
          }
        }
        api = {
          service: SERVICE.channel.post,
          message,
          attachment: attachments,
          hub_id: this.hubId,
        };
        if (this.getScopedNid() && !this.scopedFileNid) {
          api.nid = this.getScopedNid();
          // Staged device uploads the server should move into the folder
          // at send time (everything else stays link-only in the sbox).
          api.folder_attachment = list.getDeviceAttachmentIds
            ? list.getDeviceAttachmentIds() || []
            : [];
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

    if (this.threadId) {
      api.thread_id = this.threadId;
    }

    if (messenger && _.isFunction(messenger.getMentionUserIds)) {
      const mentionIds = messenger.getMentionUserIds();
      if (mentionIds.length) {
        api.mention_ids = mentionIds;
      }
    }

    this.echoId = _.uniqueId();
    this.queue.push({ ...api, echoId: this.echoId });
    this.postMessageAPI();
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
    data.kind = "widget_chat_item";
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
    let tmp = {
      kind: "widget_chat_item",
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
        this.handleReceivedMsg(data);
      })
      .catch((error) => {
        this._sendingNids = null;
        this.queue.unshift(api);
        let errMessage = error.message || LOCALE.MESSAGE_NOT_SENT_RETRY;
        this.showError(errMessage);
        this.warn("Server error sending message", error);
      });
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  copyMessage(cmd) {
    const _message = cmd.mget(_a.message);
    const ackMsg = LOCALE.MESSAGE_COPIED_CLIPBOARD;
    copyToClipboard(_message);
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
    this.threadAttachment = "";
    const replyWrapper = this.getPart("reply-wrapper");
    this.threadId = cmd.mget("message_id");
    // Snapshot the parent so the optimistic placeholder shows the quote right
    // away. is_attachment stripped — chat-item#setThreadData would refetch.
    this.threadSnapshot = cmd.model ? cmd.model.toJSON() : null;
    if (this.threadSnapshot) delete this.threadSnapshot.is_attachment;

    if (cmd.mget("is_attachment")) {
      this.threadAttachment =
        cmd.__list.children != null ? cmd.__list.children.first() : undefined;
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
    replyWrapper.feed("");
    return (replyWrapper.el.dataset.mode = _a.closed);
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  showMsgCount(cmd) {
    this._selectedMessages = [];
    this._selectedViews = [];
    const chatItems = this.__list.getItemsByKind("widget_chat_item");
    const selected = chatItems.filter((e) => e.mget("selected"));
    for (const e of selected) {
      const mid = e.mget("message_id");
      if (mid) this._selectedMessages.push(mid);
      this._selectedViews.push(e);
    }

    /* for enable/disable delte-for-all button */
    const delteForAllBtn = this.getPart("delete-for-all-button");
    if (delteForAllBtn) {
      delteForAllBtn.el.dataset.active = _a.yes;
      for (const row of selected) {
        if (row.mget("author") === "other") {
          delteForAllBtn.el.dataset.active = _a.no;
          break;
        }
      }
    }

    const msgCount = this._selectedMessages.length;
    if (msgCount === 0) {
      this.setMessageSelectorState(0);
      return;
    }
    this.setMessageSelectorState(1);
    const counterText = {
      kind: KIND.note,
      className: "widget-chat__note counter",
      content: msgCount.printf(LOCALE.X_SELECTED_MESSAGES), //#{msgCount} Messages selected"
    };

    this.getPart("selected-message-count").feed(counterText);
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
    console.log("[chat.deleteMessage]", {
      service,
      area,
      isPrivate,
      peerId: this.peerId,
      selected: this._selectedMessages,
    });
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
    const items = this.__list.getItemsByKind("widget_chat_item") || [];
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
    const items = this.__list.getItemsByKind("widget_chat_item") || [];
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
    const items = this.__list.getItemsByKind("widget_chat_item") || [];
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
    media.goodbye();
  }

  /**
   * @param {String} service
   * @param {Object} data
   * @param {Object} options
   */
  onWsMessage(service, data, options) {
    const area = this.mget(_a.area) || this.mget(_a.type);
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    switch (options.service) {
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
        // Ack even when out-of-scope so unread counters in the folder feed
        // don't accumulate while the user views a file-scoped thread.
        if (hubMatch || privateMach || ticketMach) {
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
        this.acknowledge(data, options);
        break;

      // Literal service strings (not SERVICE.* constants): the platform may not
      // expose *.typing until env reload, which would make the constants
      // `undefined` and wrongly match service-less messages.
      case "chat.typing":
      case "channel.typing":
        this._onTyping(data);
        break;

      // Literal service strings (not SERVICE.* constants): the platform may not
      // expose *.typing until env reload, which would make the constants
      // `undefined` and wrongly match service-less messages.
      case "chat.typing":
      case "channel.typing":
        this._onTyping(data);
        break;
    }
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

    const hubId = this.hubId;
    // `home` may be unset in folder-chat (toolkit/index.js passes `home_id`
    // as a primitive, not the full `home` object). Don't early-return —
    // `home` is only used as a fallback for file-mention's folderNid below,
    // and that path is safely guarded.
    const home = this.mget(_a.home);

    const mediaGridPreview = require("builtins/media/grid/template/preview");

    let filesPromise = Promise.resolve(null);
    let contactsPromise = Promise.resolve(null);
    let folderHubId = hubId;

    if (mentionType === "file") {
      let folderNid = this.mget(_a.nid);
      try {
        const folderWindow =
          this.getParentByKind &&
          (this.getParentByKind("window_folder") ||
            this.getParentByKind("window_team") ||
            this.getParentByKind("window_sharebox"));
        if (folderWindow) {
          const winNid = folderWindow.mget && folderWindow.mget(_a.nid);
          const winHubId = folderWindow.mget && folderWindow.mget(_a.hub_id);
          if (winNid) folderNid = winNid;
          if (winHubId) folderHubId = winHubId;
        }
      } catch (e) {}
      if (!folderNid) folderNid = (home && home.home_id) || folderHubId;

      filesPromise = this.fetchService({
        service: SERVICE.media.show_node_by,
        hub_id: folderHubId,
        nid: folderNid,
      }).catch(() => null);
    }

    if (mentionType === "contact") {
      // Folder-chat scope: mention workspace members (people who can see
      // this folder), not the visitor's personal chat rooms. Falls back to
      // contact_rooms when not in folder scope (bigchat / direct chat).
      if (this.mget("scope") === _a.folder && folderHubId) {
        console.log("[mention] fetching hub members", { hub_id: folderHubId });
        contactsPromise = this.fetchService({
          service: SERVICE.hub.get_members_by_type,
          hub_id: folderHubId,
          type: "all",
        }).catch((e) => {
          console.warn("[mention] hub members fetch failed", e);
          return null;
        });
      } else {
        console.log("[mention] fetching contact_rooms", {
          hub_id: Visitor.get(_a.id),
        });
        contactsPromise = this.fetchService({
          service: SERVICE.chat.contact_rooms,
          hub_id: Visitor.get(_a.id),
          key: filter || "",
        }).catch((e) => {
          console.warn("[mention] contact_rooms fetch failed", e);
          return null;
        });
      }
    }

    Promise.all([filesPromise, contactsPromise])
      .then(([filesData, contactsData]) => {
        console.log("[mention] fetch resolved", {
          filesRaw: filesData,
          contactsRaw: contactsData,
          contactsType: Array.isArray(contactsData)
            ? "array"
            : typeof contactsData,
        });
        const toRows = (d) => {
          if (!d) return [];
          if (Array.isArray(d)) return d;
          return d.rows || d.data || [];
        };
        let files = toRows(filesData);
        let contacts = toRows(contactsData);
        console.log("[mention] toRows", {
          files: files.length,
          contacts: contacts.length,
        });

        files = files.filter((f) => f.filetype !== _a.hub);

        contacts = contacts.filter((c) => {
          const firstname = c.firstname || c.surname || "";
          const lastname = c.lastname || "";
          const fullname = `${firstname} ${lastname}`.trim();
          return fullname.length > 0;
        });

        if (filter) {
          files = files.filter((f) =>
            (f.filename || "").toLowerCase().includes(filter),
          );
          contacts = contacts.filter((c) => {
            const name =
              `${c.firstname || ""} ${c.lastname || ""} ${c.surname || ""}`.toLowerCase();
            return name.includes(filter);
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
          html += '<div class="mention-section-header">Files</div>';
          files.slice(0, 6).forEach((f) => {
            html += `<div class="mention-item" data-nid="${_.escape(f.nid)}" data-hub_id="${_.escape(folderHubId)}" data-filename="${_.escape(f.filename)}" data-type="file" data-service="mention-select">
            <div class="mention-item__icon ${_.escape(f.area || "")}">${renderFileIcon(f)}</div>
            <div class="mention-item__name">${_.escape(f.filename)}</div>
          </div>`;
          });
        }

        if (contacts.length) {
          html += '<div class="mention-section-header">People</div>';
          contacts.slice(0, 6).forEach((c) => {
            const drumate_id = c.drumate_id || c.entity_id || c.id;
            const firstname = c.firstname || c.surname || "";
            const lastname = c.lastname || "";
            const fullname = `${firstname} ${lastname}`.trim();
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
          dropdown.el.dataset.state = _a.closed;
          return;
        }

        dropdown.el.innerHTML = html;
        dropdown.el.dataset.state = _a.open;
        console.log("[mention] dropdown OPENED", {
          state: dropdown.el.dataset.state,
          visible: dropdown.el.offsetParent !== null,
          rect: dropdown.el.getBoundingClientRect(),
        });

        const self = this;
        dropdown.el.querySelectorAll(".mention-item").forEach((el) => {
          el.onclick = function (e) {
            e.stopPropagation();
            const d = this.dataset;
            let item;
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
            self.ensurePart(_a.message).then((messenger) => {
              if (_.isFunction(messenger._onMentionSelect)) {
                messenger._onMentionSelect(item);
              }
            });
            self._closeMentionDropdown();
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
  _closeMentionDropdown() {
    const dropdown = this.getPart("mention-dropdown");
    if (!dropdown) return;
    dropdown.el.dataset.state = _a.closed;
    dropdown.el.innerHTML = "";
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
