class __ticker extends LetcBox {
  constructor(...args) {
    this.initialize = this.initialize.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._channelEvent = this._channelEvent.bind(this);
    super(...args);
  }

  static initClass() {
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
    this._count = parseFloat(this.model.get(_a.start));
    return this.model.on(_e.change(a=> {}));
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    switch (this.model.get(_a.skeleton)) {
      case 'vertical-tickers':
        return this.feed(require('./skeleton/input')(this));
      case 'horizontal-tickers':
        return this.feed(require('./skeleton/input')(this));
      default:
        return this.feed(require('./skeleton/input')(this));
    }
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
      case "input":
        child.model.set(_a.value, this.model.get(_a.start));
        return this._input = child;
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
        this._input.set(this._count);
        return this.model.set(_a.value, this._count);
      case 'input':
        //value = @getPart(_a.value)
        this._count = parseFloat(btn.get(_a.value));
        this._input.set(this._count);
        return this.model.set(_a.value, this._count);
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
    this._input.set(this._count);
    return this.model.set(_a.value, this._count);
  }
}
__ticker.initClass();

module.exports = __ticker;
