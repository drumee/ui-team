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

  /**
   * 
   * @param {*} id 
   * @param {*} msg 
   * @returns 
   */
  _emoji(id, msg) {
    if (this.__wrapperPopup.isEmpty()) {
      this.__wrapperPopup.feed(require('assets/emojis')(this));
      return;
    }
    return this.__wrapperPopup.clear();
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
        return this.__fileselector.open(this._upload.bind(this));

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
          var cnode = window.getSelection().containsNode(this.__content.el, true);
          if (!cnode) {
            this.__content.$el.find('.note-content').focus();
          }
          let char = args.target.innerText;
          if (!this.recentEmojis.includes(char)) {
            this.recentEmojis.unshift(char);
            if (this.recentEmojis.length > 8) this.recentEmojis.pop();
          }
          localStorage.recentEmojis = JSON.stringify(this.recentEmojis);
          this.__content.insert(char);
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
   * Detect @ in text and manage mention popup
   */
  _handleMentionInput(text) {
    if (!text) {
      this._closeMentionPopup();
      return;
    }

    // Simple detection: find last @word pattern in the text
    const mentionMatch = text.match(/@(\S*)$/);

    if (mentionMatch) {
      this._mentionActive = true;
      this._mentionFilter = mentionMatch[1].toLowerCase();
      this._showMentionPopup();
    } else if (this._mentionActive) {
      this._closeMentionPopup();
    }
  }

  /**
   * Show file mention dropdown
   */
  _showMentionPopup() {
    this.triggerHandlers({
      service: 'mention-filter',
      filter: this._mentionFilter
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

    // Remove the @filter text from the end
    const replaced = text.replace(/@\S*$/, '');
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
        return this.__content.reset();
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
