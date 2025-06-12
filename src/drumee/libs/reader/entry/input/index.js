// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : libs/reader/entry/input/input
//   TYPE :
// ==================================================================== *

const __compliances = {
  email: {
    regexp: /(^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$)/,
    explain: LOCALE.REQUIRE_EMAIL
  },
  email_or_id: {
    regexp: /(^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$)|(^([a-zA-Z0-9_\.\-])+$)/,
    explain: LOCALE.REQUIRE_EMAIL_OR_ID
  },
  phone: {
    regexp: /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/,  ///(^([0-9\. \-\+,]{1,15})$)/
    explain: LOCALE.REQUIRE_PHONE
  },
  ident: {
    regexp: /^([a-zA-Z0-9_\-])([a-zA-Z0-9_\.\-])([a-zA-Z0-9_\.\-])*$/,
    explain: LOCALE.REQUIRE_IDENT
  },
  folder: {
    regexp: /(^([ ,:a-zA-Z0-9_\.\-])+$)/,
    explain: LOCALE.REQUIRE_ID
  },
  hashtag: {
    //regexp:/(^(?!^--)([a-zA-Z0-9_\.\-])+$)/ #/(^([a-zA-Z0-9_\.\-])+$)/
    regexp: /(^(?!^(--|\#|\!|\?))[^(\/|\&)]+$)/,
    explain: LOCALE.REQUIRE_HASHTAG
  },
  specials: {
    regexp: /[\/!~\"\'\|\^°&]+/,
    explain: LOCALE.REQUIRE_ID
  },
  date: {
    regexp: /^\d\d?\/\d\d?\/\d\d\d\d$/,
    explain: LOCALE.REQUIRE_DATE
  },
  name: {
    regexp: /^([a-zA-Z0-9_\.\-\'\ xC0-\xFF])+$/,
    explain: LOCALE.REQUIRE_THIS_FIELD
  },
  string: {
    regexp: /\w+/,
    explain: LOCALE.REQUIRE_STRING
  },
  dns: {
    regexp: /^$|^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/,
    explain: LOCALE.REQUIRE_DNS_NAME
  },
  number: {
    regexp: /^[0-9]+$/,
    explain: LOCALE.REQUIRE_NUMBER
  },
  decimal: {
    regexp: /^(([0-9]*(\.){0,1}[0-9]{0,2})|([0-9]+(\.){0,1}[0-9]*)|[0-9]+)$/,
    explain: LOCALE.REQUIRE_NUMBER
  },
  none: {
    regexp: /^.+$/,
    explain: LOCALE.REQUIRE_THIS_FIELD
  },
  any: {
    regexp: /^([\x20-\x7E\x80-\xFF])+$/,
    explain: LOCALE.REQUIRE_STRING
  },
  text: {
    regexp: /([\x20-\x7E\x80-\xFF])+/,
    explain: LOCALE.REQUIRE_TEXT
  },
  gender: {
    regexp: /^[MFX]$/,
    explain: LOCALE.REQUIRE_THIS_FIELD
  },
  answer: {
    regexp: /^[(yes)|(no)|(maybe)|(dontknow)]$/i,
    explain: LOCALE.REQUIRE_THIS_FIELD
  },
  password: {
    // regexp : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d{1})(?!.*\d{5})(?=.*[#$@!%&*?])[A-Za-z\d#$@!%&*?]{8,}$/
    regexp: /^((.+){2,} *(.+){4,})|((.+){12,})$/, ///(.+){12,}/ #/(.+){2,} *(.+){4,}/
    explain: 'REQUIRE_PASSWORD'
  }
};


const _default_class = "drumee-widget entry";

class __drumee_entry_input extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this.reload = this.reload.bind(this);
    this.mould = this.mould.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._onKeyup = this._onKeyup.bind(this);
    this.withinRange = this.withinRange.bind(this);
    this.commit = this.commit.bind(this);
    this.checkSanity = this.checkSanity.bind(this);
    this._runApi = this._runApi.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onSelect = this._onSelect.bind(this);
    this.select = this.select.bind(this);
    this.focus = this.focus.bind(this);
    this.focusAt = this.focusAt.bind(this);
    this.clear = this.clear.bind(this);
    this._mousedown = this._mousedown.bind(this);
    this._acknowledge = this._acknowledge.bind(this);
    this._reset = this._reset.bind(this);
    this.onResetError = this.onResetError.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this._reject = this._reject.bind(this);
    this.showError = this.showError.bind(this);
    this.hideError = this.hideError.bind(this);
    this.set = this.set.bind(this);
    this.lock = this.lock.bind(this);
    this.unlock = this.unlock.bind(this);
    this.setValue = this.setValue.bind(this);
    this.getValue = this.getValue.bind(this);
    this._sync = this._sync.bind(this);
    this.getData = this.getData.bind(this);
    this.onArrowUp = this.onArrowUp.bind(this);
    this.onArrowDown = this.onArrowDown.bind(this);
    this._pace = this._pace.bind(this);
  }

  static initClass() {
    this.prototype.nativeClassName = _default_class;

    // ============================
    //
    // ============================
    this.prototype.events = {
      'keydown input': '_onKeydown',
      'keydown textarea': '_onKeydown',
      'keyup   input': '_onKeyup',
      'keyup   textarea': '_onKeyup',
      'blur    input': '_onBlur',
      'select  input': '_onSelect',
      'submit  form': '_nop',
      click: '_onClick',
      mousedown: '_mousedown'
    };
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this._require = this.mget(_a.require);
    this._comply = __compliances[this._require] || {};
    const ph = this.mget(_a.placeholder) || LOCALE.FORM_ENTRY;
    this.model.atLeast({
      flow: _a.x,
      placeholder: LOCALE[ph],
      label: _K.char.empty,
      value: _K.char.empty,
      inpputClass: _K.char.empty,
      labelClass: _K.char.empty,
      name: _a.name,
      type: _a.text,
      service: _e.interactive,
      minlength: this.mget(_a.minlength) || 0,
      maxlength: this.mget(_a.maxlength) || 524288, // The maximum number of characters allowed in the <input> element. Default value is 524288
      rows: 1,
      cols: 40,
      volatility: 0
    });
    this._initial = this.mget(_a.value);

    this._id = _.uniqueId();
    this.model.set(_a.widgetId, this._id);

    if (_.isEmpty(this.mget(_a.label))) {
      this.model.set(_a.no_label, 1);
    }

    this.name = this.mget(_a.name);
    const range = this.mget(_a.range) || {};
    this._min = this.mget(_a.min) || range.min;
    this._max = this.mget(_a.max) || range.max;

    if ((this.mget(_a.mode) === _a.interactive) || this.mget(_a.interactive)) {
      this._interactive = 1;
    }

    this._inputReady = 0;
    this.declareHandlers();
  }

  /**
   * 
   * @returns 
   */
  onRender() {
    super.onRender();
    this.$el.addClass(_default_class);
    if (this.mget(_a.hidden)) {
      return this.el.style.display = _a.none;
    }
  }

  /**
   * 
   * @returns 
   */
  reload() {
    if (this.mget(_a.hidden)) {
      this.el.style.display = _a.none;
    }
    this.el.innerHTML = '';
    this.$el.append(require('./template')(this));
    this.el.setAttribute(_a.data.state, this.mget(_a.initialState));
    const value = this.mget(_a.value);
    this._lastValue = value;
    this._done = false;
    this._input = this.$el.find(`#${this._id}-input`);
    const f = () => {
      this._input.val(value);
      if (this.mget(_a.inputOpt) != null) {
        this._input.attr(this.mget(_a.inputOpt));
      }
      if (this.mget(_a.no_label)) {
        this.$el.find(`#${this._id}-label`).css({ display: _a.none });
      }
      this.trigger("input:ready");
      this._inputReady = 1;
      if (this.mget('preselect')) {
        this.select();
      }
      if (this.mget(_a.locked)) {
        return this.lock();
      }

    };
    return this.waitElement(this._input[0], f);
  }

  /**
   * 
   */
  isReaddy() {
    return this._inputReady;
  }

  /**
   * 
   */
  _nop() {
    return false;
  }

  /**
   * 
   */
  mould() {
    this.reload();
  }

  /**
   * 
   */
  onDomRefresh() {
    this.reload();
  }

  /**
 * 
 */
  _status(name, key) {
    return { __inputStatus: name, key };
  }

  /**
   * 
   */
  changed() {
    return this._changed;
  }
  /**
   * 
   */

  _onKeydown(e) {
    this.ignoreEnter = this.mget('ignoreEnter');
    if (e.key === _e.Enter && this.ignoreEnter) {
      e.preventDefault();
      return false;
    }
  }

  /**
   * 
   */
  _onKeyup(e) {
    e.stopPropagation();
    this._currentEvent = e;
    this._eventType = _e.keyup;
    this.status = e.key;
    this._done = false;
    this.trigger(_e.keyup, e);
    this._changed = true;
    if (e.key === _e.Escape) {
      this.triggerHandlers(this._status(_e.cancel, e.key));
      if (this.mget('removeOnEscape')) {
        this.goodbye();
      }
      return true;
    }
    if (this.mget('uppercase')) {
      this._input.val(this._input.val().toUpperCase())
    } else if (this.mget('capitalize')) {
      this._input.val(this._input.val().ucFirst())
    }
    switch (this.mget(_a.mode)) {
      case _a.passthroughs:
        return true;
      case _a.commit:
        if (e.key === _e.Enter) {
          this.commit(1);
          if (this.ignoreEnter) return false;
          return true;
        }

        if (!this._interactive) {
          return true;
        }
        break;

      default:
        if (!this._interactive) {
          return;
        }
    }

    if (!this.withinRange()) {
      e.preventDefault();
      return false;
    }

    switch (e.key) {
      case _e.Enter:
        if (this.mget(_a.mode) == _a.commit) {
          this.triggerHandlers(this._status(_a.commit, e.key));
        } else {
          this.triggerHandlers(this._status(_e.Enter, e.key));
        }
        return true;

      case 'ArrowUp':
      case 'ArrowDown':
        if (_.isFinite(~~this.getValue())) {
          return this.triggerHandlers(this._status('arrow', e.key));
        }
        break;

      case 'ArrowLeft':
      case 'ArrowRight':
        return this.triggerHandlers(this._status('arrow', e.key));

      case 'Shift': case 'Alt': case 'Control': case 'Control':
        return;

      default:
        if (!this._interactive) {
          return;
        }
        if (this.checkSanity()) {
          if (this.mget(_a.api) != null) {
            this._runApi();
          } else {
            this.getValue(true);
          }
          this.hideError();
        } else {
          this.status = _a.error;
        }
        this.triggerHandlers(this._status(_e.interactive));
    }
  }

  /**
   * 
   * @returns 
   */
  withinRange() {
    if ((this._min == null) && (this._max == null)) {
      return true;
    }

    const val = ~~this.getValue();

    if (parseFloat(val) < this._min) {
      if (this._interactive) {
        this._reject(`_reject ${val} : out of range`);
      }
      return false;
    }

    if (parseFloat(val) > this._max) {
      if (this._interactive) {
        this._reject(`_reject ${val} : out of range`);
      }
      return false;
    }

    return true;
  }

  /**
   * 
   * @param {*} show_err 
   * @returns 
   */
  commit(show_err) {
    if (show_err == null) { show_err = 0; }
    const val = this.getValue(true);
    this.status = _a.commit;
    this.el.dataset.status = _a.error;
    if (!this.checkSanity()) {
      return;
    }
    if (this._done) {
      return;
    }
    if (this.mget(_a.api) != null) {
      return this._runApi();
    } else {
      this.triggerHandlers(this._status(_a.commit));
      this._done = true;
    }
  }

  /**
   * 
   * @param {*} show_err 
   * @returns 
   */
  checkSanity(show_err) {
    if (show_err == null) { show_err = 0; }
    const val = this.getValue();

    // validations logics 
    const e = this.mget('errorHandler');
    if (this.mget('validators')) {
      this.mset(_a.value, val);
      for (let v of Array.from(this.mget('validators'))) {
        if (!v.comply(val)) {
          this.status = _a.error;
          this.reason = v.reason;
          this._reject(this.reason, show_err);
          return false;
        }
      }
    }

    if (_.isEmpty(this._require)) {
      this.mset(_a.value, val);
    }

    if (this._require === _a.none) {
      this.mset(_a.value, val);
      return true;
    }

    if (this._comply.regexp != null) {
      if (!this._comply.regexp.test(val)) {
        let reason;
        if (this._comply.explain != null) {
          reason = this._comply.explain;
        } else {
          reason = LOCALE.REQUIRE_THIS_FIELD;
        }
        this._reject(reason, show_err);
        return false;
      }
      this._reset();
      this.mset(_a.value, val);
    }
    return true;
  }

  /**
   * 
   * @returns 
   */
  _runApi() {
    let request;
    if ((this.status === null) || (this.status === _a.error)) {
      return;
    }

    const val = this.getValue(1);

    const min = this.mget('minLength');
    if ((min != null) && (val.length < ~~min)) {
      return;
    }
    let api = this.mget(_a.api);
    if (_.isString(api)) {
      request = {
        service: api,
        name: this.name,
        value: val
      };
    } else if (_.isFunction(api)) {
      request = api();
      request.value = val;
    } else if (_.isObject(api)) {
      request = _.clone(api);
      request.value = val;
    } else {
      return;
    }

    if (this.name != null) {
      request[this.name] = val;
    }
    let service = request.service;
    delete request.service;
    this.postService(service, request).then((data) => {
      this.status = _a.results;
      this.results = data;
      this.triggerHandlers({
        results: data,
        ...this._status(_a.results)
      });
    });
  }



  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _onClick(e) {
    e.stopPropagation();
    this.el.setAttribute(_a.data.status, _a.ok);
    this.status = _e.click;
    return false;
  }

  /**
   * 
   * @param {*} e 
   */
  _onBlur(e) {
    this.status = _e.blur;
    this._done = false;
    this.model.set(_a.value, this.getValue());
    this.trigger(_e.blur);
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _onSelect(e) {
    this.status = _e.select;
    return this.getValue(true);
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  select(e) {
    this.status = _e.select;
    let value = this.getValue(true);
    this.ensureElement(this._input[0]).then((p) => {
      if (this._inputReady) {
        p.select();
      } else {
        this.once("input:ready", () => {
          p.select();
        })
      }
    });
    return value;
  }

  /**
   * 
   * @param {*} e 
   */
  focus(e) {
    this.status = _e.focus;
    this._input.focus();
    this._done = false;
  }

  /**
   * 
   * @param {*} pos 
   * @returns 
   */
  focusAt(pos) {
    const el = this._input[0];
    if (!el) {
      return;
    }

    pos = pos || this.getValue().length;
    if (el.createTextRange) {
      const range = el.createTextRange();
      range.move('character', pos);
      return range.select();
    } else {
      if (_.isFunction(el.setSelectionRange)) {
        el.focus();
        return el.setSelectionRange(pos, pos);
      } else {
        return el.focus();
      }
    }
  }

  /**
   * 
   * @returns 
   */
  clear() {
    this._done = false;
    this.hideError();
    return this._input.val('');
  }

  /**
   * 
   * @param {*} e 
   */
  _mousedown(e) {
    this.status = null;
    this._done = false;
    this.trigger(_e.mousedown);
    this.hideError();
    true;
  }

  /**
   * 
   * @param {*} e 
   */
  _acknowledge(e) {
    this.el.setAttribute(_a.data.status, _a.ok);
    this.triggerHandlers({ __status: 'acknowledge' });
  }

  /**
   * 
   * @returns 
   */
  _reset() {
    this.el.setAttribute(_a.data.status, _a.ok);
    return this.hideError();
  }

  /**
   * 
   * @param {*} val 
   * @returns 
   */
  onResetError(val) {
    return this._reset();
  }

  /**
   * 
   * @param {*} val 
   * @returns 
   */
  onChildBubble(val) {
    return this._reset();
  }

  /**
   * 
   * @param {*} reason 
   * @param {*} show_err 
   */
  _reject(reason, show_err) {
    this.status = _a.error;
    this.reason = reason || "Error occured";

    this.showError(this.reason);
    this.trigger(_e.reject);

    const handler = this.mget(_a.handler) || this.mget(_a.handlers) || {};
    let errorHandler = this.mget(_a.errorHandler) || handler.errorHandler || handler.error;

    const arg = { ...this._status('reject'), source: this, reson: this.reason, event: this._currentEvent };
    this.trigger('validate:error', this.reason);

    if (errorHandler) {
      if (!_.isArray(errorHandler)) {
        errorHandler = [errorHandler];
      }
      for (let h of Array.from(errorHandler)) {
        if (_.isFunction(h.triggerMethod)) {
          h.triggerMethod("validate:error", this, arg);
        }
      }
    }
  }

  /**
   * 
   * @param {*} reason 
   */
  showError(reason) {
    let v = this.mget('validators')
    if (!v) {
      reason = reason || this.reason;
    } else {
      if (!_.isArray(v)) v = [v];
      reason = _.last(v).reason || reason || this.reason;
    }
    if (this.__refError) {
      this.__refError.set({ content: reason });
    }
    this.el.setAttribute(_a.data.status, _a.error);
  }

  /**
   * 
   */
  hideError() {
    this.el.setAttribute(_a.data.status, _a.ok);
    const handler = this.mget(_a.handler) || this.mget(_a.handlers) || {};
    let errorHandler = this.mget(_a.errorHandler) || handler.errorHandler || handler.error;

    this.trigger('hide:error');
    this.trigger("validate:success");
    if (errorHandler) {
      if (!_.isArray(errorHandler)) {
        errorHandler = [errorHandler];
      }
      for (let h of Array.from(errorHandler)) {
        if (_.isFunction(h.triggerMethod)) {
          h.triggerMethod("validate:success");
          h.service = 'validate_success';
          this.service = 'validate_success';
          h.triggerHandlers(this._status('validate'));
        }
      }
    }
  }

  /**
   * 
   * @param {*} val 
   * @returns 
   */
  set(val) {
    if (this.mget(_a.locked)) {
      return;
    }
    this.model.set(_a.value, val);
    try {
      return this._input.val(val);
    } catch (error) { }
  }

  /**
   * 
   */
  lock() {
    this.model.set(_a.locked, 1);
    this.el.dataset.locked = 1;
  }

  /**
   * 
   * @returns 
   */
  unlock() {
    this.model.set(_a.locked, 0);
    this.el.dataset.locked = 0;
  }

  /**
   * 
   * @param {*} val 
   */
  setValue(val) {
    this._input.val(val);
    this.model.set(_a.value, val);
  }

  /**
   * 
   * @param {*} sync 
   * @returns 
   */
  getValue(sync) {
    if (sync == null) { sync = false; }
    const val = this._input.val();
    if (sync) {
      this.model.set(_a.value, val);
    }
    this._changed = false;
    return val;
  }


  /**
   * 
   * @returns 
   */
  _sync() {
    if (this.status === _a.error) {
      this._input.val(this._lastValue);
      return;
    }
    const val = this.getValue();
    const range = this.mget(_a.range);
    if (range) {
      if (parseFloat(val) < range.min) {
        this.set(range.min);
        return this._reject(`_reject ${val} : out of range`, range);
      }
      if (parseFloat(val) > range.max) {
        this.set(range.max);
        return this._reject(`_reject ${val} : out of range`, range);
      }
    }

    this.model.set(_a.value, val);
    this._lastValue = val;
    const persistent = this.mget(_a.persistent) || this.mget('localStorage');
    if (persistent != null) {
      return localStorage[persistent] = val.toString();
    }
  }

  /**
   * 
   * @param {*} nocheck 
   * @returns 
   */
  getData(nocheck) {
    if (nocheck == null) { nocheck = 0; }
    const name = this.mget(_a.name) || _a.name;
    return { name, value: this.getValue() };
  }


  /**
   * 
   * @returns 
   */
  onArrowUp() {
    let p = 1;
    if (this.mget(_a.pace) != null) {
      p = this.mget(_a.pace);
    }
    return this._pace(p);
  }

  /**
   * 
   * @returns 
   */
  onArrowDown() {
    let p = -1;
    if (this.mget(_a.pace) != null) {
      p = -this.mget(_a.pace);
    }
    return this._pace(p);
  }

  /**
   * 
   * @param {*} delta 
   * @returns 
   */
  _pace(delta) {
    let val = this.getValue() || 0;
    val = parseFloat(val) + parseFloat(delta);
    this.model.set(_a.value, val);
    return this._input.val(val);
  }
}
__drumee_entry_input.initClass();


module.exports = __drumee_entry_input;
