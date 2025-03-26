const { dataTransfer } = require("core/utils")

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
    this.__submit.el.hide();
    this.__wrapperPopup.clear();
  }

  /**
   * 
   * @returns 
   */
  showSend() {
    return this.__submit.el.show();
  }

  /**
   * 
   * @returns 
   */
  hideSend() {
    if (this.hasAttachment()) return;
    return this.__submit.el.hide();
  }

  /**
   * 
   */
  hasAttachment() {
    try {
      let h = this.getHandlers(_a.ui)[0];
      if(h && _.isFunction(h.hasAttachment)){
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
          this.triggerHandlers(args);
        } else {
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
