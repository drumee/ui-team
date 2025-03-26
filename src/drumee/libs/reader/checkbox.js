/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/reader/checkbox
//   TYPE :
// ==================================================================== *

const _default_class =  "drumee-box reader checkbox";
// ---------------- ************** --------------------
//
// ---------------- ************** --------------------
class __checkbox extends LetcBox {
  static initClass() { //_menu_wrapper
    this.prototype.className     = _default_class;
  //__behaviorSet: PROXY_CORE.behaviors
    this.prototype._serialize    = PROXY_CORE.serialize;
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    this.model.atLeast({
      radio       : _a.on});
    return super.initialize(opt);
  }


// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.debug("MKJKJJJJJ", this.el, this);
    this.declareHandlers(); //s({part:@, ui:@}, {recycle:yes})
    //@$el.append('<div id="menu-plus-icon" class="menu-plus-icon" data-hide="yes" >PLUS</>')
    this._hidden = [];
    return this.el.setAttribute(_a.data.node, this.model.get(_a.widgetId));
  }
}
__checkbox.initClass();


module.exports = __checkbox;
