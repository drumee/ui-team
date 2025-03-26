/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/composite/picto
//   TYPE : 
// ==================================================================== *

//-------------------------------------
//
//
//-------------------------------------
class __composite_picto extends LetcBox {
  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className : "widget composite-picto"
  // 
  //   behaviorSet
  //     bhv_renderer : _K.char.empty
  // 
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "widget composite-picto";
    behaviorSet({
      bhv_renderer : _K.char.empty});
  }
// ============================
//
// ===========================

// ===========================================================
// onAfterInitialize
//
// @param [Object] opt
//
// ===========================================================
  onAfterInitialize(opt) {
    //Type.setMapName(_a.reader)
    this.model.atLeast({
      state   : 0,
      justify : _a.center,
      picto   : _a.rss,
      menuClass : _K.char.empty,
      listClass : _K.char.empty,
      listFlow  : _a.vertical
    });
    return this.declareHandlers(); //s {ui:@, part:@}
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    if ((this.get(_a.kids) == null)) {
      return this.feed(require("skeleton/picto/svg")(this));
    }
  }
}
__composite_picto.initClass();
module.exports = __composite_picto;
