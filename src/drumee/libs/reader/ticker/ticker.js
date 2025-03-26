class __ticker extends LetcBox {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._channelEvent = this._channelEvent.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className: "ticker"
  //
  //   behaviorSet: PROXY_CORE.behaviors
  //
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "ticker";
  }
// =================== *
// Proxied
// =================== *
//__behaviorSet: PROXY_CORE.behaviors
// ========================
//
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      start : 2,
      label : "ticker"
    });
    this.declareHandlers(); //s {part: @}, {fork: yes, recycle: no}
    this._handler.error = this;
    return this._count = parseFloat(this.model.get(_a.start));
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    return this.feed(require('./skeleton/default')(this));
  }


// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// @return [Object]
//
// ===========================================================
  onPartReady(child, pn, section) {
    this.debug(">>2233 ticker CHILD READY WIDGET", pn, child);
    if (section !== _a.sys) {
      return;
    }
    switch (pn) {
      case _a.value:
        child.model.set(_a.value, this.model.get(_a.start));
        return this._value = child;
    }
  }

// ===========================================================
// onUiEvent
//
// @param [Object] btn
//
// ===========================================================
  onUiEvent(btn) {
    const service = btn.get(_a.service) || btn.get(_a.name);
    this.debug(`menuEvents service=${service}`, btn);
    switch (service) {
      case 'tick':
        //value = @getPart(_a.value)
        this._count = this._count + parseFloat(btn.get(_a.value));
        this.debug(`menuEvents val=${this._count}`, btn.get(_a.value));
        this._value.model.set(_a.value, this._count);
        this._value.model.set(_a.content, this._count);
        this._value.render();
        this.model.set(_a.value, this._count);
        try {
          return this._handler.client.triggerMethod(this.get(_a.signal), this, btn);
        } catch (e) {
          this.warn("Failed to forward service", e);
          return this.trigger(_e.bubble);
        }
      default:
        return this.warn("SERVICE undefined",  service);
    }
  }

// ===========================================================
// _channelEvent
//
// @param [Object] data
//
// ===========================================================
  _channelEvent(data){
    this.debug("_channelEvent", data, this);
    this._count = parseFloat(data[this.model.get(_a.name)]);
    this._value.model.set(_a.value, this._count);
    this._value.model.set(_a.content, this._count);
    this._value.render();
    return this.model.set(_a.value, this._count);
  }
}
__ticker.initClass();

module.exports = __ticker;
