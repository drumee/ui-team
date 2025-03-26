class __dropdown extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this.onChildCallback = this.onChildCallback.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "widget dropdown-box";
  }
//__behaviorSet: PROXY_CORE.behaviors
// ============================
//
// ===========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    //Type.setMapName(_a.reader)
    this.model.atLeast({
      label  : "label"});
    return this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this._state = _a.closed;
    if ((this.get(_a.skeleton) == null)) {
      const opt = {
        content:this.get(_a.label),
        className:"shower-toggle",
        templateName:   _T.wrapper.id
      };
      return this.feed(require('skeleton/box/dropdown')(this, opt));
    } else {
      return this.feed(this.get(_a.skeleton));
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onPartReady(child, pn, section) {
    this.debug(">>2233 CHILD READY WIDGET", pn, child, this);
    switch (pn) {
      case _a.list:
        this._list = child;
        if (this.get('listClass')) {
          child.$el.addClass(this.get('listClass'));
        }

// ===========================================================
// child._childCreated
//
// ===========================================================
        child._childCreated = function(){
          //_dbg ">>AA_childCreated", @
          return this.$el.attr(_a.data.state, _a.open);
        };
        return child.onChildDestroy = function(){
          //_dbg ">>AA_onChildDestroy", @
          return this.$el.attr(_a.data.state, _a.closed);
        };
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onChildCallback
//
// @param [Object] child
// @param [Object] origin
//
// ===========================================================
  onChildCallback(child, origin) {
    this.debug(">>A onChildCallback -->", child, origin, this, this._trigger);
    if (origin) {
      this._list.clear();
      return this._state = _a.closed;
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onUiEvent
//
// @param [Object] trigger
//
// ===========================================================
  onUiEvent(trigger) {
    const service = trigger.get(_a.service) || trigger.get(_a.name);
    this.debug(`>>A menuEvents service=${service}`, trigger, this, this._state, _a.closed);
    //Type.setMapName(_a.reader)
    switch (service) {
      case "dropdown":
        if (this._state === _a.closed) {
          this._state = _a.open;
          return this._list.feed(this.get(_a.items));
        } else {
          this._state = _a.closed;
          return this._list.clear();
        }
    }
  }
}
__dropdown.initClass();
module.exports = __dropdown;
