// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/api/lib/popup/index.js
//   TYPE : Component
// ==================================================================== *

require('./skin');

class __drumee_api_popup extends LetcBox {
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    this._label = this.mget('btn-label') || this.mget(_a.label) || null;
    this._btnColor = this.mget(_a.color) || '#18a3ac';
    if (/LOCALE\..+/.test(this._label)) {
      let [a, key] = this._label.split('.');
      this._label = LOCALE[key] || this._label;
    }
    if (/popup.open/.test(location.hash)) {
      location.hash = location.hash.replace(/popup.open/, '');
    }
    window.onhashchange = this.route.bind(this);
    this._initialHash = location.hash || '';
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'body-container':
        if (!this._label) {
          this.openPopup();
        }
        break;

      default:
        this.debug("onPartReady");
    }
  }

  /**
   * 
   */
  clearMessage() {
    this.getPart('error-message-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message').set({ content: '' })
    this.getPart('go-button-wrapper').el.dataset.state = _a.open
  }

  /**
   * 
   * @param {*} msg 
   * @returns 
   */
  showErrorMessage(msg) {
    this.getPart('go-button-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message-wrapper').el.dataset.state = _a.open
    this.getPart('error-message').set({ content: msg })
    _.delay(this.clearMessage.bind(this), 2500)
    return;
  }

  /**
   * 
   * @param {*} msg 
   */
  showSuccessMessage(msg) {
    // this.getPart('body-container').feed(require('./skeleton/success-message')(this,msg))
  }

  /**
   * 
   * @param {*} error 
   * @returns 
   */
  updateError(error) { return null; }

  /**
   * 
   * @returns 
   */
  checkSanity() {
    return null;
  }

  /**
   * 
   * @returns 
   */
  route() {
    this.debug("ROUTE!!!", location.hash)
    if (/popup.open/.test(location.hash)) {
      this._hash = location.hash;
      this.openPopup();
    } else {
      this._initialHash = location.hash;
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    if (this.mget('autostart')) this.openPopup();
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    let service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    switch (service) {
      case 'open-popup':
        this.openPopup();
        break;
      case _e.close:
        this.closePopup();
        let cb = this.mget('onclose');
        if (cb) {
          if (_.isFunction(cb)) {
            this.debug("AAAA:111 onUiEvent", cb)
            cb();
          } else if (_.isString(cb)) {
            location.href = cb;
          }
        }
        break;
    }

    return cmd = null;
  }

  /**
   * 
   */
  openPopup() {
    if (!this.region) {
      this._modalId = _.uniqueId('drumee-modal-');
      const el = document.createElement(_K.tag.div);
      el.setAttribute(_a.id, this._modalId);
      el.classList.add(`${this.fig.family}__overlay`)
      document.body.appendChild(el);
      const { Region } = Marionette;
      this.region = new Region({ el });
      this.overlayEl = el;
    } else {
      this.region.empty();
    }
    let box = new LetcBox(require('./skeleton/popup')(this));
    this.region.show(box);
    this.overlayEl.setAttribute(_a.data.state, _a.open);
  }

  closePopup() {
    this.debug("close-popup", this)
    this.overlayEl.setAttribute(_a.data.state, _a.closed);
    if (this._hash) {
      location.hash = this._initialHash;
    }
    // let box = new LetcBox();
    // this.region.show(box);
    // this.region.reset();
    //this.__wrapperOverlay.clear()
  }

  /**
   * 
   * @param {*} method 
   * @param {*} data 
   */
  __dispatchRest(method, data) {
    // this.debug("SOOOOOOOOOOOO 96 0", method, data);
    switch (method) {
      case SERVICE.butler.signup:
        if (data.rejected) {
          let email = data.email || "";
          this.showErrorMessage(email.printf(LOCALE.EMAIL_ALREADY_EXISTS));
        } else {
          this.showSuccessMessage(LOCALE.B2B_REGISTRATION_SUCCESS_MESSAGE);
        }
    }
  }
}


module.exports = __drumee_api_popup;