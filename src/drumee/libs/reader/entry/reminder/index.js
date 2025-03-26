
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : libs/reader/entry/search/search
//   TYPE :
// ==================================================================== *

class __entry_reminder extends LetcBox {
  constructor(...args) {
    super(...args);
    this._reset = this._reset.bind(this);
    this.getValue = this.getValue.bind(this);
    this.focus = this.focus.bind(this);
    this.hideError = this.hideError.bind(this);
    this.commit = this.commit.bind(this);
    this.status = this.status.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.getData = this.getData.bind(this);
    this.showError = this.showError.bind(this);
    this.hideError = this.hideError.bind(this);
    this.checkSanity = this.checkSanity.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.dispatchService = this.dispatchService.bind(this);
    this.setValue = this.setValue.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    this.declareHandlers({ part: _a.multiple, ui: _a.multiple });
    super.initialize(opt);
    this.model.atLeast({
      type: _a.text,
      signal: _e.ui.event,
      flow: _a.none
    },

      this.model.on('change:validators', () => {
        this.__refEntry.mset('validators', this.mget('validators'));
      })
    );
  }

  /**
   * 
   */
  _reset() { }


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require("./skeleton/main")(this));
  }


  /**
   * 
   * @returns 
   */
  getValue() {
    if (!this._entry) return;
    return this._entry.getValue();
  }

  /**
   * 
   * @returns 
   */
  focus() {
    if (!this._entry) return;
    this._entry.focusAt();
  }

  /**
   * 
   * @returns 
   */
  hideError() {
    if (this._show != null) {
      this._show.el.dataset.shift = 0;
    }
    if (!this._entry) return;
    this._entry.hideError();
  }

  /**
   * 
   * @returns 
   */
  commit() {
    if (!this._entry) return;
    this._entry.isCompliant(1);
  }


  status() {
    if (!this._entry) return;
    return this._entry.el.dataset.status;
  }

  /**
   * 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "ref-entry":
        this._entry = child;
        child.on(_e.blur, () => {
          return this.trigger(_e.blur);
        });
        child.on(_e.keyup, () => {
          this.trigger(_e.keyup);
          if (child.el.dataset.status === _a.error) {
            child.hideError();
          }
          if ((this._reminder == null)) {
            return;
          }
          if (_.isEmpty(child.getValue())) {
            return this._reminder.el.dataset.state = 0;
          } else {
            return this._reminder.el.dataset.state = 1;
          }
        });
        child.on('validate:error', reason => {
          this.reason = reason;
          this.showError(reason);
          return this.trigger('validate:error', reason);
        });

        child.on('hide:error', () => {
          this.reason = '';
          this.hideError();
          return this.trigger('hide:error');
        });
        return child.on('validate:success', () => {
          this.reason = '';
          return this.trigger('validate:success');
        });

      case "ref-reminder":
        return this._reminder = child;

      case "ref-shower":
        return this._show = child;
    }
  }


  /**
   * 
   * @param {*} nocheck 
   * @returns 
   */
  getData(nocheck) {
    if (nocheck == null) { nocheck = 0; }
    const name = this.__refEntry.mget(_a.name) || _a.name;
    return { name, value: this.__refEntry.getValue() };
  }

  /**
   * 
   * @returns 
   */
  showError(reason) {
    this.debug("__entry_reminder showError", this, reason);
    reason = reason || this.reason;
    this.el.setAttribute(_a.data.status, _a.error);
    if (this.mget('showError')) {
      this.__refError.set(_a.content, reason);
    }
    if (this._show != null) {
      this._show.el.dataset.shift = 1;
    }
    return this._entry.showError();
  }

  /**
   * 
   * @returns 
   */
  hideError() {
    this.el.setAttribute(_a.data.status, _a.ok);
    if (this.mget('showError')) {
      return this.__refError.set(_a.content, '');
    }
  }

  /**
   * 
   * @returns 
   */
  checkSanity(show_err) {
    if (show_err == null) { show_err = 0; }
    if (this.__refEntry.checkSanity()) {
      this.__refEntry.hideError();
      return false;
    }
    return true;
  }


  /**
   * 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const status = args.__inputStatus;
    this.status = status;
    switch (status) {
      case _e.commit:
      case _e.Enter:
      case 'arrow':
      case _e.cancel:
      case _a.results:
        if (this.mget(_a.service)) {
          args.service = this.mget(_a.service);
          this.dispatchService(cmd, args);
        } else {
          this.triggerHandlers(args);
        }
        return;

      case _a.interactive: case 'arrow':
        if (this.mget(_a.mode) === _a.commit) {
          return;
        }
        if (this.mget(_a.service)) {
          args.service = this.mget(_a.service);
          this.dispatchService(cmd, args);
        } else {
          this.triggerHandlers(args);
        }
        return;

      case _e.click:
      case _e.reject:
        return;

      default:
        this.dispatchService(cmd, args);
        if (!this._reminder) {
          return;
        }
        if (_.isEmpty(this.getValue())) {
          return this._reminder.el.dataset.state = 0;
        } else {
          return this._reminder.el.dataset.state = 1;
        }
    }
  }

  /**
   * 
   * @returns 
   */
  dispatchService(cmd, args) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.mget(_a.service);
    const status = args.__inputStatus;
    switch (service) {
      case _e.show:
        if (cmd.mget(_a.state)) {
          this._entry.mset(_a.type, _a.password);
        } else {
          this._entry.mset(_a.type, _a.text);
        }
        this._entry.reload();
        this._entry.focusAt();
        return this.hideError();

      case _e.clear:
        this._entry.clear();
        if (this._reminder) {
          this._reminder.el.dataset.state = 0;
        }
        this.trigger(_e.keyup);
        this.hideError();
        return this._entry.focusAt();

      default:
        if (this.mget(_a.service)) {
          args.service = this.mget(_a.service);
        }
        return this.triggerHandlers(cmd, args);
    }
  }


  /**
   * 
   * @returns 
   */
  setValue(val) {
    this.ensurePart('ref-entry').then((p) => {
      p.setValue(val);
    })
  }
}
__entry_reminder.initClass();

module.exports = __entry_reminder;
