
const { copyToClipboard, dataTransfer } = require("@drumee/ui-essentials")
require('./skin');

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
    if (opt == null) { opt = {}; }
    super.initialize();
    this.view = this.mget(_a.view);
    this._selectedMessages = [];
    this.peer = this.mget('peer') || null;
    this.updateChatUserStatus();
    this.queue = [];
    const area = this.mget(_a.area) || this.mget(_a.type);
    if (area === _a.personal || area === _a.privateRoom) {
      this.hubId = Visitor.id;
      this.peerId = this.mget(_a.peer_id) || (this.peer && (this.peer.drumate_id || this.peer.entity_id || this.peer.id)) || '';
      this.storageKey = `${area}-${this.hubId}-${this.peerId}`;
    } else {
      this.hubId = this.mget(_a.hub_id);
      this.peerId = '';
      const nid = this.mget(_a.nid) || '';
      this.scopedNid = this.mget('scope') === _a.folder ? nid : '';
      this.scopedFileNid = '';
      this.storageKey = nid ? `${area}-${this.hubId}-${nid}` : `${area}-${this.hubId}`;
    }

    this.hubId = this.hubId || this.mget(_a.hub_id);
    this.declareHandlers();
    this.bindEvent(_a.live);
    this._newMsgCount = 0;

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
    if (this.attachmentList) {
      this.attachmentList.off("uploaded", this.showSend);
    }
  }

  /**
   * Abstract -- Dont remove
   */
  syncOrder() { }

  /**
   * 
   * @returns 
   */
  updateChatUserStatus() {
    if (!this.peer || (this.mget(_a.area) !== _a.personal)) {
      return;
    }
    let isReadOnly = false;
    let readOnlyMsg = '';
    const status = this.peer.status;

    if ((status !== _a.active) || this.peer.is_blocked || this.peer.is_blocked_me) {
      isReadOnly = true;
      // don't change the order of the below condition 
      if (status === 'memory') {
        readOnlyMsg = LOCALE.CHAT_DEACTIVATED; //'Chat user is deactivated'
      }
      if (this.peer.is_blocked_me) {
        readOnlyMsg = LOCALE.CHAT_DEACTIVATED;//'Chat user is deactivated'
      }
      if (this.peer.is_blocked) {
        readOnlyMsg = LOCALE.CONTACT_BLOCKED; //'Blocked'
      }
      if (status === 'nocontact') {
        readOnlyMsg = LOCALE.CONTACT_DELETED; //'Deleted' 
      }
    }

    this.mset('isReadOnly', isReadOnly);
    this.mset('readOnlyMsg', readOnlyMsg);
  }


  /**
 * 
 */
  initStorage() {
    const key = this.storageKey;
    if (!sessionStorage.getItem(key)) {
      const data = {
        message: "",
        attachment: []
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
      attachment: []
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
      return '';
    }
    return JSON.parse(data).message || "";
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onInputChange(args) {
    this.saveMessage(args.text);
  }

  /**
   * 
   */
  async onFileListChange() {
    let content = this.findPart(_a.content);
    let uploads = [];
    if (content && content.collection) {
      uploads = content
        .collection
        .filter((row) =>
          (row.get(_a.filetype) != _a.pseudo)
          && (row.get(_a.service) != "remove-upload")
        )
        .map((row) => {
          let att = { ...row.attributes };
          delete att.uiHandler;
          delete att.logicalParent;
          return att;
        });
    }
    this.ensurePart('attachment-list').then((p) => {
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
      let { chat_upload_id: nid, hub_id, home_id } = this.mget(_a.home);
      let pm = {
        respawn: 'media_paste',
        area: args.area,
        src: args.src,
        home_id,
        nid,
        hub_id,
      };
      this.insertMedia(pm);
    }
    this.showSend();
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
    if (list.scrollDir == _a.down || (c.mget(_a.page) == 1 && last.mget(_a.page) == 1)) {
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
        })
        break;
      case _a.list:
        child.onAddKid = this.handleScroll.bind(this);
        child.once(_e.ready, () => this.scrollMessagesToBottom(child));
        break;
      case 'chat-content':
        this.waitElement(child.el, () => {
          this.setMessageSelectorState(0);
        });
        break;

    }
  }

  scrollMessagesToBottom(list) {
    setTimeout(() => {
      if (list && typeof list.scrollToBottom === "function") list.scrollToBottom();
    }, 100);
  }

  /**
   *
   */
  hasAttachment() {
    return this.attachmentList.hasAttachment()
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
    if (this.attachmentList && this.attachmentList.el && this.attachmentList.el.closest) {
      const wrapper = this.attachmentList.el.closest('.widget-chat__attachment-wrapper');
      if (wrapper) wrapper.dataset.hasAttachment = has ? '1' : '0';
    }
    if (has || this.getStoredMessage()) {
      this.showSend()
    } else {
      this.ensurePart(_a.message).then((p) => {
        p.hideSend();
      })
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.fetchService({
      service: SERVICE.media.home,
      hub_id: this.hubId
    }).then((data) => {
      this.mset(_a.home, data);
      this.mset(_a.nid, data.chat_upload_id);
      this.clear_notifications();
      if (this.__refWindowName != null) {
        return this.__refWindowName.set({ content: data.name });
      }
      this.feed(require('./skeleton')(this));
    })
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
    let children = this.__list.getItemsByKind('widget_chat_item');
    for (var c of children) {
      c.select(0);
    }
  }

  /**
   * 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'media-file-copied':
        setTimeout(this.onFileListChange.bind(this), 1000)
        break;
      case _e.upload:
        this.upload(args.sourceEvent);
        return this.showSend();

      case 'remove-upload':
        return this.removeUpload(cmd);

      case _a.interactive:
        return this.onInputChange(args);

      case 'mention-filter':
        return this._showMentionFiles(args.filter, args.mentionType);

      case 'mention-close':
        return this._closeMentionDropdown();

      case 'mention-select':
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

      case 'close-reply-message':
        return this.clearReplyMessage();

      case 'attachment-reponse':
        return this.__list.scrollToBottom();

      case 'chat-item-child':
        return this.handleScroll(cmd);

      case 'scroll-down':
        this._newMsgCount = 0;
        setTimeout(() => {
          this.__buttonScroll.el.dataset.count = this._newMsgCount;
          this.__list.scrollToBottom();
        }, 50);
        break;

      case 'show-message-selector':
        console.log('[widget-chat] show-message-selector', { type: args.type, hasActionButtons: !!this.getPart('message-action-buttons') });
        this.getPart('message-action-buttons').feed(require('./skeleton/action-buttons')(this, args.type));
        setTimeout(() => {
          this.showMsgCount(cmd);
        }, 300);
        return;// this.showMsgCount(cmd);

      case 'select-message':
        return this.showMsgCount(cmd);

      case 'delete-for-me':
        return this.deleteMessage(cmd, service);

      case 'delete-for-all':
        this.setMessageSelectorState(0);
        if (cmd.el.dataset.active === _a.yes) {
          return this.deleteMessage(cmd, service);
        }
        break;

      case 'cancel-message-selection':
        return this.disableMessageSelection();

      case 'paste-base64':
        if (_.isEmpty(args)) return;
        return this.onPasteBase64(args);

      case 'paste-file':
        if (args.file) {
          this.pasteFile(args.file);
        }
        return;

      case 'interactive':
        return;

      case 'media:eod':
        this.onFileListChange();

      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers(args);
        return this.service = '';
    }
  }


  /**
   * @param  {File} args
   */
  pasteFile(file) {
    let { chat_upload_id: nid, hub_id, home_id } = this.mget(_a.home);
    let pm = {
      kind: 'media_grid',
      phase: _a.upload,
      filetype: _a.pseudo,
      isAttachment: 1,
      origin: _a.chat,
      uiHandler: [this],
      file: file,
      destination: {
        destpath: "/",
        nid,
        hub_id,
        home_id
      }
    };
    this.insertMedia(pm);
  }

  /**
   * 
   * @param {*} e 
   * @param {*} token 
   * @returns 
   */
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
    if ((target == null)) {
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
      hub_id: this.hubId
    };
    this.removeUploadFromChat(api);
    return this.postService(api).then((data) => {
    }).catch((err) => {
      this.warn("Failed to remove", err);
    })
  }

  /**
   * 
   * @param {*} mkdir 
   * @returns 
   */
  getActiveWindow(mkdir) {
    if (mkdir == null) { mkdir = 0; }
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

    for (f of Array.from(r.files)) {
      pm = {
        kind: 'media_grid',
        phase: _a.upload,
        isAttachment: 1,
        origin: _a.chat,
        uiHandler: [this],
        file: f,
        destination: {
          nid: this.mget(_a.home).chat_upload_id,
          hub_id: this.hubId
        }
      };
      a.push(pm);
    }

    for (f of Array.from(r.folders)) {
      pm = {
        kind: 'media_grid',
        phase: _a.upload,
        isAttachment: 1,
        origin: _a.chat,
        uiHandler: [this],
        folder: f,
        destination: {
          nid: this.mget(_a.home).chat_upload_id,
          hub_id: this.hubId
        }
      };
      a.push(pm);
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
        if ([_a.hub, _a.folder].includes(o.filetype) || o.ext == 'lnk') {
          Wm.confirm({
            title: LOCALE.ACTION_NOT_PERMITTED,
            message: LOCALE.FILE_TYPE_NOT_SUPPORTED,
            cancel: LOCALE.OK,
            cancel_type: 'secondary',
            buttonClass: 'forbidden',
            mode: 'hbf1'
          });
          return;
        }
        o.kind = 'media_grid';
        o.phase = _a.copied;
        o.isAttachment = 1;
        o.origin = _a.chat;
        o.destination = {
          hub_id: this.hubId,
          nid: this.mget(_a.nodeId),
          home_id: this.mget(_a.home_id)
        };
        o.uiHandler = [this];
        o.logicalParent = this;
        items.push(o);
        this.showSend();
      } else {
        m.kind = m.respawn || 'media_grid';
        m.isAttachment = 1;
        m.origin = _a.chat;
        m.uiHandler = [this];
        items.push(m);
        this.showSend();
      }
      this.__message.__content.$el.find('.note-content').focus();
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
    this.hubId = data.hub_id
    this.peerId = data.drumate_id
    this.mset(data)
    this.ensurePart(_a.list).then((list) => {
      list.restart()
    })
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
        order: 'desc'
      };
      return api;
    }


    if (this.scopedFileNid) {
      // list_by_file returns the full thread in one response; a large
      // pagelength makes the list widget call `_eod` after the first page.
      return {
        service: SERVICE.channel.list_by_file,
        hub_id: this.hubId,
        file_nid: this.scopedFileNid,
        pagelength: 200
      };
    }

    api = {
      service: SERVICE.channel.messages,
      hub_id: this.hubId,
      order: 'desc'
    };
    if (this.getScopedNid()) {
      api.nid = this.getScopedNid();
    }
    return api;
  }

  // Update the folder scope so messages are filtered to a specific sub-folder.
  setScopedFolderNid(folderNid) {
    const next = folderNid ? `${folderNid}` : '';
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
  setScopedFileNid(fileNid) {
    const next = fileNid ? `${fileNid}` : '';
    if (this.scopedFileNid === next) return;

    this._scopedScroll = this._scopedScroll || {};
    if (this.__list && this.__list.__container) {
      this._scopedScroll[this.scopedFileNid || ''] = this.__list.__container.scrollTop;
    }
    if (this.threadId) this.clearReplyMessage();

    this.scopedFileNid = next;
    this.ensurePart(_a.list).then((list) => {
      if (!list || !_.isFunction(list.restart)) return;
      const prevSpinner = list.mget(_a.spinner);
      if (prevSpinner) list.mset(_a.spinner, false);
      list.restart();
      if (prevSpinner) list.mset(_a.spinner, prevSpinner);

      const targetScroll = this._scopedScroll && this._scopedScroll[next];
      if (typeof targetScroll === 'number') {
        list.once(_e.ready, () => {
          if (list.__container) list.__container.scrollTop = targetScroll;
        });
      }
    });
  }

  // Server stores the attachment field as a JSON string; normalise to array.
  parseAttachmentField(raw) {
    if (_.isArray(raw)) return raw;
    if (!raw) return [];
    if (_.isString(raw)) {
      try { return JSON.parse(raw); } catch (e) { return []; }
    }
    return [];
  }

  /**
   * 
   * @param {*} mkdir 
   */
  clear_notifications(mkdir) {
    if (mkdir == null) { mkdir = 0; }
  }

  /**
   *
   * @returns
   */
  getScopedNid() {
    return this.scopedNid || '';
  }

  /**
   *
   * @param {*} data
   * @returns
   */
  matchesScopedChannel(data = {}) {
    if (_.isArray(data)) data = data[0] || {};
    if (this.scopedFileNid) {
      const attachments = this.parseAttachmentField(data.attachment).map(String);
      return attachments.includes(`${this.scopedFileNid}`);
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
    let message = '';
    // Get message with encoded mentions if available
    const messenger = this.findPart(_a.message);
    if (messenger && _.isFunction(messenger.getMessageWithMentions)) {
      message = messenger.getMessageWithMentions();
    }
    if (!message) {
      message = args.text || this.getStorage().message;
    }
    const list = this.attachmentList;
    if (!list) {
      this.warn("Could not find attachment list", this);
      return;
    }

    const area = this.mget(_a.area) || this.mget(_a.type);
    if (list.hasPendingUpload()) {
      return this.showError(LOCALE.WAIT_UPLOAD, 'desktop_waiting');
    }

    const replaceChars = { '<': '&#60;', '>': '&#62;' };
    message = message.replace(/[<>]/g, m => replaceChars[m]);
    let attachments = list.getAttachmentIds() || [];
    // Promote file mentions into the attachment array so channel.list_by_file
    // (which searches that JSON column) can find this message.
    let mentionedFiles = [];
    if (messenger && _.isFunction(messenger.getMentionedFileNids)) {
      mentionedFiles = messenger.getMentionedFileNids();
    }
    if (mentionedFiles.length) {
      const seen = new Set(attachments.map(String));
      for (const nid of mentionedFiles) {
        if (!seen.has(`${nid}`)) {
          attachments.push(nid);
          seen.add(`${nid}`);
        }
      }
    }
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
      case 'supportTicket':
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
          hub_id: this.hubId
        };
        if (this.getScopedNid() && !this.scopedFileNid) {
          api.nid = this.getScopedNid();
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
      this.warn("Undefined API")
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
      data = data[0]
    }
    if (!data || _.isEmpty(data)) return;
    if (!this.__list) return;
    data.kind = 'widget_chat_item';
    data.logicalParent = this;
    data.uiHandler = this;
    let messageArr;
    if (data.echoId && this.echoId == data.echoId) {
      messageArr = this.__list.getItemsByAttr('echoId', data.echoId)[0];
      if (messageArr) {
        delete data.echoId;
        messageArr.mset(data);
        this.echoId = null;
        return;
      }
    }

    messageArr = this.__list.getItemsByAttr('message_id', data.message_id)[0];
    if (!messageArr) {
      this._newMsgCount++;
      this.__buttonScroll.el.dataset.count = this._newMsgCount;
      this.__list.append(data);
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
      kind: 'widget_chat_item',
      ...api,
      logicalParent: this,
      uiHandler: this,
      author_id: Visitor.id,
      ctime: 0,
      is_readed: 0,
      is_seen: 0,
    }
    if (api.thread_id && this.threadSnapshot) {
      tmp.thread = this.threadSnapshot;
    }
    delete tmp.service;
    if (this.__list) {
      this.__list.append(tmp);
      this.__list.scrollToBottom();
    }
    this.clearMessageBlock();
    this.postService(api).then(data => {
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
      this.handleReceivedMsg(data);
    }).catch(error => {
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
    this.__wrapperAck.feed(require('@drumee/ui-core/letc/preset/ack')(this, ackMsg, { height: this.$el.height() }));
    const f = () => {
      this.__wrapperAck.feed('');
      return this.__wrapperAck.el.dataset.state = _a.closed;
    };
    return setTimeout(f, Visitor.timeout());
  }


  /**
   * @param  {string} message
   */
  showError(message, icon = '') {
    this.__wrapperAck.feed(require('./skeleton/error')(this, message, icon, { height: this.$el.height() }));
    const f = () => {
      this.__wrapperAck.feed('');
      return this.__wrapperAck.el.dataset.state = _a.closed;
    };
    return setTimeout(f, Visitor.timeout());
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  replyMessage(cmd) {
    this.threadAttachment = '';
    const replyWrapper = this.getPart('reply-wrapper');
    this.threadId = cmd.mget('message_id');
    // Snapshot the parent so the optimistic placeholder shows the quote right
    // away. is_attachment stripped — chat-item#setThreadData would refetch.
    this.threadSnapshot = cmd.model ? cmd.model.toJSON() : null;
    if (this.threadSnapshot) delete this.threadSnapshot.is_attachment;

    if (cmd.mget('is_attachment')) {
      this.threadAttachment = cmd.__list.children != null ? cmd.__list.children.first() : undefined;
    }

    replyWrapper.feed(require('./skeleton/reply-message')(this, cmd));
    return replyWrapper.el.dataset.mode = _a.open;
  }

  /**
   *
   * @returns
   */
  clearReplyMessage() {
    const replyWrapper = this.getPart('reply-wrapper');
    this.threadId = null;
    this.threadSnapshot = null;
    replyWrapper.feed('');
    return replyWrapper.el.dataset.mode = _a.closed;
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  showMsgCount(cmd) {
    this._selectedMessages = [];
    const messages = this.__list.children.filter((e) => {
      if (e.mget('selected')) {
        this._selectedMessages.push(e.mget('message_id'))
      }
    })

    /* for enable/disable delte-for-all button */
    const delteForAllBtn = this.getPart('delete-for-all-button');
    if (delteForAllBtn) {
      delteForAllBtn.el.dataset.active = _a.yes;
      messages.filter(row => {
        if (row.author === 'other') {
          delteForAllBtn.el.dataset.active = _a.no;
          return row;
        }
      });
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
      content: (msgCount.printf(LOCALE.X_SELECTED_MESSAGES)) //#{msgCount} Messages selected"
    };

    this.getPart('selected-message-count').feed(counterText);
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} service 
   */
  deleteMessage(cmd, service) {
    let _service;
    const area = this.mget(_a.area);
    if (cmd == null) { cmd = {}; }
    const isPrivate = area === _a.personal || area === _a.privateRoom;
    console.log('[chat.deleteMessage]', { service, area, isPrivate, peerId: this.peerId, selected: this._selectedMessages });
    if (isPrivate) {
      _service = SERVICE.chat.delete;
    } else if (area === _a.share) {
      _service = SERVICE.channel.delete;
    }

    let _option = 'me';
    if (service === 'delete-for-all') {
      _option = 'all';
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

    this.postService(payload, { async: 1 }).then((data) => {
      this.disableMessageSelection(data);
      this.clearMessageFromChat(data);
    });
  }

  /**
   * Scroll to a specific message by ID, retrying until it appears in the list.
   * @param {string} message_id
   */
  scrollToMessage(message_id, retries = 25) {
    if (!message_id) return;
    const tryScroll = (r) => {
      const item = this.__list && this.__list.getItemsByAttr('message_id', message_id)[0];
      if (item && item.el) {
        item.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.el.dataset.highlighted = '1';
        setTimeout(() => { if (item.el) delete item.el.dataset.highlighted; }, 2500);
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
      data = [data]
    }
    for (let d of Array.from(data)) {
      let item = this.__list.getItemsByAttr('message_id', d.message_id)[0];
      if (item) item.goodbye();
    }
  }

  /**
* @param {*} data
*/
  acknowledge(data) {
    if (!this.__list) return;
    if (!_.isArray(data)) {
      data = [data];
    }
    for (let d of data) {
      let items = this.__list.getItemsByAttr('message_id', d.message_id);
      for (var item of items) {
        if (_.isFunction(item.acknowledge)) {
          item.acknowledge(d);
        }
      }
    }
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
        return this.getPart('chat-footer').feed(require('./skeleton/footer')(this));

      case SERVICE.channel.post:
      case SERVICE.chat.post:
      case SERVICE.chat.forward:
      case SERVICE.channel.post_ticket:
        var isChannel = [_a.dmz, _a.public, _a.share, _a.private].includes(area);
        var hubMatch = isChannel && (this.hubId === data.hub_id);
        var inScope = !hubMatch || this.matchesScopedChannel(data);
        // P2P message payload now carries peer_id (replaces entity_id).
        var privateMach = isPrivate && (this.peerId === data.peer_id);
        var ticketMach = (area === _a.ticket) && (data.ticket_id === this.mget('ticket_id'));
        if ((hubMatch && inScope) || privateMach || ticketMach) {
          this.handleReceivedMsg(data);
        }
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
        }, 2000)

        break;

      case SERVICE.chat.delete:
      case SERVICE.channel.delete:
        var dataArr = [data];
        this.clearMessageFromChat(dataArr);
        break;

      case SERVICE.channel.acknowledge:
      case SERVICE.chat.acknowledge:
        this.acknowledge(data);
        break;

    }
  }

  /**
   * Show mention dropdown filtered by text
   * @param {string} filter - text after trigger character
   * @param {string} mentionType - 'contact' (from @) or 'file' (from /)
   */
  _showMentionFiles(filter, mentionType) {
    const dropdown = this.getPart('mention-dropdown');
    if (!dropdown) return;

    const hubId = this.hubId;
    const home = this.mget(_a.home);
    if (!home) return;

    const mediaGridPreview = require('builtins/media/grid/template/preview');

    let filesPromise = Promise.resolve(null);
    let contactsPromise = Promise.resolve(null);
    let folderHubId = hubId;

    if (mentionType === 'file') {
      let folderNid = this.mget(_a.nid);
      try {
        const folderWindow = this.getParentByKind && (
          this.getParentByKind('window_folder') ||
          this.getParentByKind('window_team') ||
          this.getParentByKind('window_sharebox')
        );
        if (folderWindow) {
          const winNid = folderWindow.mget && folderWindow.mget(_a.nid);
          const winHubId = folderWindow.mget && folderWindow.mget(_a.hub_id);
          if (winNid) folderNid = winNid;
          if (winHubId) folderHubId = winHubId;
        }
      } catch (e) { }
      if (!folderNid) folderNid = home.home_id;

      filesPromise = this.fetchService({
        service: SERVICE.media.show_node_by,
        hub_id: folderHubId,
        nid: folderNid
      }).catch(() => null);
    }

    if (mentionType === 'contact') {
      contactsPromise = this.fetchService({
        service: SERVICE.chat.contact_rooms,
        hub_id: Visitor.get(_a.id),
        key: filter || ''
      }).catch(() => null);
    }

    Promise.all([filesPromise, contactsPromise]).then(([filesData, contactsData]) => {
      const toRows = (d) => {
        if (!d) return [];
        if (Array.isArray(d)) return d;
        return d.rows || d.data || [];
      };
      let files = toRows(filesData);
      let contacts = toRows(contactsData);

      files = files.filter(f => f.filetype !== _a.hub);

      contacts = contacts.filter((c) => {
        const firstname = c.firstname || c.surname || '';
        const lastname = c.lastname || '';
        const fullname = `${firstname} ${lastname}`.trim();
        return fullname.length > 0;
      });

      if (filter) {
        files = files.filter(f =>
          (f.filename || '').toLowerCase().includes(filter)
        );
        contacts = contacts.filter(c => {
          const name = `${c.firstname || ''} ${c.lastname || ''} ${c.surname || ''}`.toLowerCase();
          return name.includes(filter);
        });
      }

      let html = '';

      if (files.length) {
        const isImgCapable = (file) => {
          if (/^-/.test(file.capability || '')) return 0;
          if ((file.ext || '').toLowerCase() === 'svg') return 1;
          if ((file.ext || '').toLowerCase() === _a.pdf) return 0;
          if (/text/.test(file.mimetype || '')) return 0;
          if (/shell|script|text/.test(file.filetype || '')) return 0;
          return /^r/.test(file.capability || '') ? 1 : 0;
        };
        const previewUrl = (file) => file.url || file.vignette || file.thumbnail || file.src || file.preview || '';
        const renderFileIcon = (file) => {
          const url = previewUrl(file);
          const model = {
            ...file,
            _id: file._id || file.id || file.nid,
            area: file.area || this.mget(_a.area),
            role: file.filetype === _a.folder ? 'mention' : (file.role || 'desk'),
            imgCapable: url ? isImgCapable(file) : 0,
            url,
            widgetId: _.uniqueId('mention-preview-'),
            isAttachment: 1,
          };
          switch (model.filetype) {
            case _a.folder:
              return require('builtins/media/grid/template/folder')(model);
            case _a.audio:
              return require('builtins/media/grid/template/filetype/audio.txt').default;
            case _a.note:
            case 'markdown':
              return require('builtins/media/grid/template/filetype/note.txt').default;
            default:
              return mediaGridPreview(model);
          }
        };
        html += '<div class="mention-section-header">Files</div>';
        files.slice(0, 6).forEach(f => {
          html += `<div class="mention-item" data-nid="${_.escape(f.nid)}" data-hub_id="${_.escape(folderHubId)}" data-filename="${_.escape(f.filename)}" data-type="file" data-service="mention-select">
            <div class="mention-item__icon ${_.escape(f.area || '')}">${renderFileIcon(f)}</div>
            <div class="mention-item__name">${_.escape(f.filename)}</div>
          </div>`;
        });
      }

      if (contacts.length) {
        html += '<div class="mention-section-header">People</div>';
        contacts.slice(0, 6).forEach(c => {
          const drumate_id = c.drumate_id || c.entity_id || c.id;
          const firstname = c.firstname || c.surname || '';
          const lastname = c.lastname || '';
          const fullname = `${firstname} ${lastname}`.trim();
          const avatarUrl = Visitor.avatar(drumate_id, _a.vignette);

          html += `<div class="mention-item mention-item--contact" data-drumate_id="${drumate_id}" data-firstname="${_.escape(firstname)}" data-lastname="${_.escape(lastname)}" data-fullname="${_.escape(fullname)}" data-type="contact" data-service="mention-select">
            <div class="mention-item__avatar"><img class="mention-item__avatar-img" src="${avatarUrl}"></div>
            <div class="mention-item__name">${_.escape(fullname)}</div>
          </div>`;
        });
      }

      if (!html) {
        dropdown.el.dataset.state = _a.closed;
        return;
      }

      dropdown.el.innerHTML = html;
      dropdown.el.dataset.state = _a.open;

      const self = this;
      dropdown.el.querySelectorAll('.mention-item').forEach(el => {
        el.onclick = function (e) {
          e.stopPropagation();
          const d = this.dataset;
          let item;
          if (d.type === 'contact') {
            item = { type: 'contact', drumate_id: d.drumate_id, firstname: d.firstname, lastname: d.lastname, fullname: d.fullname };
          } else {
            item = { type: 'file', nid: d.nid, hub_id: d.hub_id, filename: d.filename };
          }
          self.ensurePart(_a.message).then((messenger) => {
            if (_.isFunction(messenger._onMentionSelect)) {
              messenger._onMentionSelect(item);
            }
          });
          self._closeMentionDropdown();
        };
      });
    }).catch((err) => {
      this.warn("Mention error:", err);
      this._closeMentionDropdown();
    });
  }

  /**
   * Close mention dropdown
   */
  _closeMentionDropdown() {
    const dropdown = this.getPart('mention-dropdown');
    if (!dropdown) return;
    dropdown.el.dataset.state = _a.closed;
    dropdown.el.innerHTML = '';
  }

  /**
   * Handle file or contact selection from mention dropdown
   */
  _onMentionFileSelect(cmd, args) {
    let item;

    if (cmd && cmd.el) {
      let el = cmd.el;
      if (!el.dataset.type) {
        el = el.closest('.mention-item') || el;
      }
      const d = el.dataset;
      if (d.type === 'contact') {
        item = {
          type: 'contact',
          drumate_id: d.drumate_id,
          firstname: d.firstname,
          lastname: d.lastname,
          fullname: d.fullname
        };
      } else {
        item = {
          type: 'file',
          nid: d.nid,
          hub_id: d.hub_id,
          filename: d.filename
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
      dragenter: '_onDragEnter',
      dragover:  '_onDragOver',
      dragleave: '_onDragLeave',
      drop:      '_onDrop',
    };
  }
}


__widget_chat.initClass();

module.exports = __widget_chat;
