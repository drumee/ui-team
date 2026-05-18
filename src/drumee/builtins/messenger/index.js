const { dataTransfer } = require("@drumee/ui-essentials")

class __lib_messenger extends LetcBox {
  constructor(...args) {
    super(...args);
    this.sendMsg = this.sendMsg.bind(this);
    this.resetMessage = this.resetMessage.bind(this);
    this.showSend = this.showSend.bind(this);
    this.hideSend = this.hideSend.bind(this);
    this._upload = this._upload.bind(this);
    this._emoji = this._emoji.bind(this);
    this.getPlaceholder = this.getPlaceholder.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    this.canUpload = this.canUpload.bind(this);
    this._onMentionSelect = this._onMentionSelect.bind(this);
    this._closeMentionPopup = this._closeMentionPopup.bind(this);
    this._mentionActive = false;
    this._mentionFilter = '';
  }

  static initClass() {

    this.prototype.events = {
      drop: 'send',
      dragenter: 'fileDragEnter',
      dragover: 'fileDragOver'
    };
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.model.atLeast({
      flow: _a.y
    });
    this.declareHandlers();
    this.recentEmojis = [];
    try {
      this.recentEmojis = JSON.parse(localStorage.recentEmojis);
    } catch (e) {
      this.recentEmojis = [];
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this._lastRange = null;
    this._trackSelection = () => this._saveCursorPosition();
    this._trackEmojiMouseDown = (e) => {
      const target = e.target;
      if (target.closest && target.closest('.emoji')) {
        this._saveCursorPosition();
      }
      if (target.dataset && target.dataset.service === 'emoji') {
        e.preventDefault();
      }
    };
    document.addEventListener('selectionchange', this._trackSelection);
    this.el.addEventListener('mousedown', this._trackEmojiMouseDown, true);
  }

  onBeforeDestroy() {
    if (this._trackSelection) {
      document.removeEventListener('selectionchange', this._trackSelection);
    }
    if (this._trackEmojiMouseDown) {
      this.el.removeEventListener('mousedown', this._trackEmojiMouseDown, true);
    }
  }

  /**
   * 
   * @param {*} args 
   */
  onChildBubble(args) {
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  sendMsg(cmd) {
    if (!this.mget(_a.api)) {
      return;
    }
    const api = this.mget(_a.api);
    api.message = cmd.getText();
    return this.postService(api);
  }


  /**
   * 
   * @returns 
   */
  getMessage() {
    if (!this.__content) return '';
    return this.__content.getText();
  }

  /**
   * 
   * @returns 
   */
  resetMessage() {
    this.__content.reset();
    this.__submit.el.dataset.state = _a.idle;
    this.__wrapperPopup.clear();
    // The editable template renders whitespace ("\n    \n  ") inside the
    // contenteditable when content is empty, which the browser briefly lays
    // out as 3 lines (~72px). Strip it so the input stays at its single-line
    // height during reset.
    const inner = this.__content && this.__content.el && this.__content.el.querySelector(".note-content");
    if (inner && !inner.textContent.trim()) {
      inner.innerHTML = "";
    }
  }

  /**
   *
   * @returns
   */
  showSend() {
    this.__submit.el.dataset.state = _a.active;
  }

  /**
   *
   * @returns
   */
  hideSend() {
    if (this.hasAttachment()) return;
    this.__submit.el.dataset.state = _a.idle;
  }

  /**
   * 
   */
  hasAttachment() {
    try {
      let h = this.getHandlers(_a.ui)[0];
      if (h && _.isFunction(h.hasAttachment)) {
        return h.hasAttachment();
      }
    } catch (e) {
      this.warn("Failed to determine hasAttachment", e)
    }
    return false;
  }

  /**
   * 
   * @param {*} e 
   */
  _upload(e) {
    e.stopPropagation();
    this.triggerHandlers({ service: _e.upload, sourceEvent: e });
    this.service = '';
  }

  _showAttachMenu() {
    const menu = this.__wrapperAttachMenu;
    if (!menu) return;
    if (!menu.isEmpty()) {
      menu.clear();
      return;
    }
    const fig = this.fig.family;
    menu.feed([
      Skeletons.Note({
        className: `${fig}__attach-option`,
        content: LOCALE.FROM_DEVICE,
        service: 'attach-from-device',
        uiHandler: [this]
      }),
      Skeletons.Note({
        className: `${fig}__attach-option`,
        content: LOCALE.FROM_WORKSPACE,
        service: 'attach-from-workspace',
        uiHandler: [this]
      })
    ]);
  }

  /**
   * 
   * @param {*} id 
   * @param {*} msg 
   * @returns 
   */
  _emoji(id, msg) {
    this._saveCursorPosition();
    if (this.__wrapperPopup.isEmpty()) {
      this.__wrapperPopup.feed(require('assets/emojis')(this));
      return;
    }
    return this.__wrapperPopup.clear();
  }

  _saveCursorPosition() {
    const noteEl = this.__content && this.__content.$el.find('.note-content')[0];
    if (!noteEl) return;
    const sel = window.getSelection();
    const isInContent = sel.anchorNode && noteEl.contains(sel.anchorNode);
    if (sel.rangeCount > 0 && isInContent) {
      this._lastRange = sel.getRangeAt(0).cloneRange();
    }
  }


  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "emoji":
        return this._emoji(cmd);

      case 'paste-text':

      case _a.interactive:
        if (args.text && args.text.length) {
          this.showSend();
          this._handleMentionInput(args.text);
          this.triggerHandlers(args);
        } else {
          this._closeMentionPopup();
          this.hideSend();
        }
        return;

      case _e.raise:
        this.triggerHandlers({ service });
        return;

      case _e.attach:
        return this._showAttachMenu();

      case 'attach-from-device':
        if (this.__wrapperAttachMenu) this.__wrapperAttachMenu.clear();
        return this.__fileselector.open(this._upload.bind(this));

      case 'attach-from-workspace':
        if (this.__wrapperAttachMenu) this.__wrapperAttachMenu.clear();
        return this.triggerHandlers({ service: 'attach-from-desk' });

      case _e.submit:
        return this.triggerHandlers({
          ...args,
          service: this.mget(_a.service),
        });

      case 'paste-base64':
      case 'paste-file':
        this.showSend();
        return this.triggerHandlers(args);

      case _a.insert:
      case undefined:
      case null:
        if (args.target.dataset.service == 'emoji') {
          const noteEl = this.__content.$el.find('.note-content')[0];
          if (!noteEl) break;

          let char = args.target.innerText;

          const sel = window.getSelection();
          let range;
          const isInContent = sel.anchorNode && noteEl.contains(sel.anchorNode);

          if (this._lastRange) {
            range = this._lastRange;
          } else if (sel.rangeCount > 0 && isInContent) {
            range = sel.getRangeAt(0).cloneRange();
          } else {
            range = document.createRange();
            range.selectNodeContents(noteEl);
            range.collapse(false);
          }

          noteEl.focus();
          sel.removeAllRanges();
          sel.addRange(range);

          const textNode = document.createTextNode(char);
          range.deleteContents();
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          sel.removeAllRanges();
          sel.addRange(range);

          this._lastRange = range.cloneRange();
          this.__content.sync();

          if (!this.recentEmojis.includes(char)) {
            this.recentEmojis.unshift(char);
            if (this.recentEmojis.length > 8) this.recentEmojis.pop();
          }
          localStorage.recentEmojis = JSON.stringify(this.recentEmojis);

          if (this.__content.isEmpty()) {
            this.hideSend();
          } else {
            this.showSend();
            this.triggerHandlers({
              service: _a.interactive,
              text: this.__content.mget(_a.value)
            });
          }
        }
    }
  }

  /**
   * Detect @ (contacts) or / (files) in text and manage mention popup
   */
  _handleMentionInput(text) {
    if (!text) {
      this._closeMentionPopup();
      return;
    }

    const contactMatch = text.match(/@(\S*)$/);
    const fileMatch = text.match(/\/(\S*)$/);

    if (contactMatch) {
      this._mentionActive = true;
      this._mentionType = 'contact';
      this._mentionFilter = contactMatch[1].toLowerCase();
      this._showMentionPopup();
    } else if (fileMatch) {
      this._mentionActive = true;
      this._mentionType = 'file';
      this._mentionFilter = fileMatch[1].toLowerCase();
      this._showMentionPopup();
    } else if (this._mentionActive) {
      this._closeMentionPopup();
    }
  }

  /**
   * Show mention dropdown (contacts or files)
   */
  _showMentionPopup() {
    this.triggerHandlers({
      service: 'mention-filter',
      filter: this._mentionFilter,
      mentionType: this._mentionType
    });
  }

  /**
   * Close mention popup
   */
  _closeMentionPopup() {
    if (!this._mentionActive) return;
    this._mentionActive = false;
    this._mentionFilter = '';
    this.triggerHandlers({ service: 'mention-close' });
  }

  /**
   * Called when user selects a file or contact from mention dropdown
   */
  _onMentionSelect(item) {
    const content = this.__content;
    if (!content || !content.content) return;

    const el = content.content;
    const text = el.innerText;

    const replaced = text.replace(/[@/]\S*$/, '');
    el.innerText = replaced;

    const mention = document.createElement('a');
    mention.contentEditable = 'false';

    if (item.type === 'contact') {
      mention.className = 'user-mention';
      mention.dataset.drumate_id = item.drumate_id;
      mention.dataset.fullname = item.fullname;
      mention.textContent = `@${item.fullname}`;
    } else {
      mention.className = 'file-mention';
      mention.dataset.hub_id = item.hub_id;
      mention.dataset.nid = item.nid;
      mention.dataset.filename = item.filename;
      mention.textContent = `@${item.filename}`;
    }

    el.appendChild(mention);

    const space = document.createTextNode('\u00A0');
    el.appendChild(space);

    const range = document.createRange();
    range.setStartAfter(space);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    content.sync();
    this._closeMentionPopup();
    this.showSend();
  }

  /**
   * Get message text with encoded mentions for sending
   */
  getMessageWithMentions() {
    const content = this.__content;
    if (!content || !content.content) return '';

    const el = content.content;
    let result = '';

    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        result += node.textContent;
      } else if (node.nodeType === 1 && node.classList.contains('file-mention')) {
        const filename = node.dataset.filename || node.textContent.replace(/^@/, '');
        const hub_id = node.dataset.hub_id;
        const nid = node.dataset.nid;
        result += `[@${filename}](mention:${hub_id}:${nid})`;
      } else if (node.nodeType === 1 && node.classList.contains('user-mention')) {
        const fullname = node.dataset.fullname || node.textContent.replace(/^@/, '');
        const drumate_id = node.dataset.drumate_id;
        result += `[@${fullname}](user:${drumate_id})`;
      } else if (node.nodeType === 1) {
        result += node.textContent;
      }
    }

    return result.trim();
  }

  getMentionUserIds() {
    const content = this.__content;
    if (!content || !content.content) return [];
    const ids = [];
    for (const node of content.content.querySelectorAll('.user-mention')) {
      const id = node.dataset.drumate_id;
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }

  // File nids of every file mentioned in the input — used so chat.sendMessage
  // can auto-attach them; channel.list_by_file searches attachment, not text.
  getMentionedFileNids() {
    const content = this.__content;
    if (!content || !content.content) return [];
    const nids = [];
    for (const node of content.content.querySelectorAll('.file-mention')) {
      const nid = node.dataset.nid;
      if (nid && !nids.includes(nid)) nids.push(nid);
    }
    return nids;
  }

  /**
   *
   * @returns
   */
  getCurrentApi() {
    if (this.mget(_a.api)) {
      return this.mget(_a.api);
    }
    return req;
  }

  /**
   * 
   * @returns 
   */
  getPlaceholder() {
    return this.mget(_a.placeholder) || _a.message;
  }


  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(method, data, socket) {
    if (this.mget(_a.api) && (this.mget(_a.api).service === method)) {
      if (this.mget('autoclear')) {
        this.__content.reset();
        // See resetMessage(): the template's whitespace makes the input
        // briefly grow to 3 line-heights. Strip it.
        const inner = this.__content && this.__content.el && this.__content.el.querySelector(".note-content");
        if (inner && !inner.textContent.trim()) {
          inner.innerHTML = "";
        }
        return;
      }
    }
  }

  /**
   * 
   * @returns 
   */
  canUpload() {
    if (this.mget('no_upload')) {
      return false;
    }
    return true;
  }
}
__lib_messenger.initClass();

module.exports = __lib_messenger;
