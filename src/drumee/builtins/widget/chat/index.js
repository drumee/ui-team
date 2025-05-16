
const { copyToClipboard, dataTransfer } = require("core/utils")
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
    const type = this.mget(_a.type);
    if (type === _a.private) {
      this.hubId = Visitor.id;
      this.entityId = this.mget(_a.hub_id);
      this.storageKey = `${type}-${this.hubId}-${this.entityId}`;
    }

    if (type === _a.share) {
      this.hubId = this.mget(_a.hub_id);
      this.entityId = '';
      this.storageKey = `${type}-${this.hubId}`;
    }

    if ((type === _a.ticket) || (type === _a.supportTicket)) {
      this.hubId = Visitor.id;
      this.entityId = this.mget(_a.hub_id);
      this.storageKey = `${type}-${this.hubId}-${this.mget('ticket_id')}`;
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
    if (!this.peer || (this.mget(_a.type) !== _a.private)) {
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
    if (args.type && /^data:image/.test(args.type)) {
      let { chat_upload_id: nid, hub_id, home_id } = this.mget(_a.home);
      let pm = {
        respawn: 'media_paste',
        type: args.type,
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
        const type = this.mget(_a.type);
        if (![_a.share, _a.private, _a.ticket, _a.supportTicket].includes(type)) {
          child.feed(Skeletons.Note("Invaild Chat Type"));
          this.warn(`Invaild Type Provided, valied types : ${_a.share} or ${_a.private}`);
          break;
        }

        child.onAddKid = this.handleScroll.bind(this);
        break;
      case 'chat-content':
        this.waitElement(child.el, () => {
          this.setMessageSelectorState(0);
        });
        break;

    }
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
    if (this.attachmentList.hasAttachment() || this.getStoredMessage()) {
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
    switch (e.type) {
      case _e.change:
        target = this.getActiveWindow();
        break;
      case _e.drop:
        target = this;
        break;
    }
    if ((target == null)) {
      Butler.say(LOCALE.WRONG_DROP_AREA);
      return;
    }

    let p = 0;
    if (e.type === _e.change) {
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
    this.debug("AAA:664", items)
    let list = this.attachmentList;
    if (list && !list.isDestroyed()) {
      list.addNewMedia(items);
      return;
    }
    //this.attachMediaWrapper(this.__wrapperAttachment, items);
  }

  /**
   * 
   * @returns 
   */
  getCurrentApi() {
    let api;
    const type = this.mget(_a.type);
    if (type === _a.private) {
      if (!this.entityId) return null;
      api = {
        service: SERVICE.chat.messages,
        entity_id: this.entityId,
        hub_id: this.hubId,
        order: 'desc'
      };
      return api;
    }

    if (!this.hubId) return null;
    if (type === _a.ticket) {
      api = {
        service: SERVICE.channel.show_ticket,
        hub_id: this.hubId,
        ticket_id: this.mget('ticket_id'),
        order: 'desc'
      };
      return api;
    }

    api = {
      service: SERVICE.channel.messages,
      hub_id: this.hubId,
      order: 'desc'
    };

    return api;
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
   * @param {*} args 
   * @returns 
   */
  sendMessage(args = {}) {
    let message = args.text || this.getStorage().message;
    const list = this.attachmentList;
    if (!list) {
      this.warn("Could not find attachment list", this);
      return;
    }

    const type = this.mget(_a.type);
    if (list.hasPendingUpload()) {
      return this.showError(LOCALE.WAIT_UPLOAD, 'hourglass');
    }

    const replaceChars = { '<': '&#60;', '>': '&#62;' };
    message = message.replace(/[<>]/g, m => replaceChars[m]);
    let attachments = list.getAttachmentIds();
    if (_.isEmpty(attachments) && _.isEmpty(message)) {
      return false;
    }

    let api = {};

    switch (type) {
      case _a.share:
        api = {
          service: SERVICE.channel.post,
          message,
          attachment: attachments,
          hub_id: this.hubId
        };
        break;

      case _a.private:
        api = {
          service: SERVICE.chat.post,
          entity_id: this.entityId,
          attachment: attachments,
          message,
          hub_id: this.hubId
        };
        break;

      case _a.ticket:
        api = {
          service: SERVICE.channel.post_ticket,
          ticket_id: this.mget('ticket_id'),
          attachment: attachments,
          message,
          hub_id: this.hubId
        };
        break;

      case _a.supportTicket:
        var data = this.getData(_a.formItem);
        var _category = [data.category];
        var _where = [data.where];
        var _alltime = 0;
        if (data.alltime === _a.yes) {
          _alltime = 1;
        }

        api = {
          service: SERVICE.channel.send_ticket,
          category: _category,
          where: _where,
          alltime: _alltime,
          attachment: attachments,
          message,
          hub_id: this.hubId
        };
        break;

      default:
        this.warn(` ${type} -- NOT SUPPORTED`);
    }

    if (_.isEmpty(api)) {
      this.warn("Undefined API")
      return false;
    }

    if (this.threadId) {
      api.thread_id = this.threadId;
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
    delete tmp.service;
    if (this.__list) {
      this.__list.append(tmp);
      this.__list.scrollToBottom();
    }
    this.clearMessageBlock();
    this.postService(api).then(data => {
      this.attachmentList.clearAttachment();
      if (_.isEmpty(data)) {
        this.showError(LOCALE.MESSAGE_NOT_SENT_RETRY);
        return;
      }
      this.handleReceivedMsg(data);
    }).catch(error => {
      this.queue.unshift(api);
      let errMessage = error.message || LOCALE.MESSAGE_NOT_SENT_RETRY;
      this.showError(errMessage);
      this.warn("AAA:787 -- Server error", error);
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
    this.__wrapperAck.feed(require('libs/preset/ack')(this, ackMsg, { height: this.$el.height() }));
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
    const type = this.mget(_a.type);
    if (cmd == null) { cmd = {}; }
    if (type === _a.private) {
      _service = SERVICE.chat.delete;
    } else if (type === _a.share) {
      _service = SERVICE.channel.delete;
    }

    let _option = 'me';
    if (service === 'delete-for-all') {
      _option = 'all';
    }

    this.postService({
      service: _service,
      messages: this._selectedMessages,
      option: _option,
      hub_id: this.hubId
    }, { async: 1 }).then((data) => {
      this.disableMessageSelection(data);
      this.clearMessageFromChat(data);
    });
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
    const type = this.mget(_a.type);
    switch (options.service) {
      case SERVICE.contact.block:
      case SERVICE.contact.unblock:
        if (!this.peer || (this.mget(_a.type) !== _a.private)) {
          return;
        }
        if (this.entityId !== data.entity) {
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
        var hubMatch = (type === _a.share) && (this.hubId === data.hub_id);
        var privateMach = (type === _a.private) && (this.entityId === data.entity_id);
        var ticketMach = (type === _a.ticket) && (data.ticket_id === this.mget('ticket_id'));
        if (hubMatch || privateMach || ticketMach) {
          this.handleReceivedMsg(data);

          if (type === _a.share) {
            service = SERVICE.channel.acknowledge;
          } else if (type === _a.private) {
            service = SERVICE.chat.acknowledge;
          } else if (type === _a.ticket) {
            service = SERVICE.channel.acknowledge_ticket;
          }

          if (Visitor.id !== data.author_id) {
            let postData = {
              service,
              hub_id: this.hubId,
              message_id: data.message_id
            }
            if (type === _a.ticket) {
              postData.ticket_id = data.ticket_id
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


}


__widget_chat.initClass();

module.exports = __widget_chat;
