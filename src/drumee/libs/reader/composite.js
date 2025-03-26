class __composite extends LetcBox {

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "widget composite-box";
    behaviorSet({
      bhv_renderer : _K.char.empty});
  }
  onAfterInitialize(opt) {
    this.model.atLeast({
      state   : 0,
      justify : _a.center,
      picto   : _a.rss,
      menuClass : _K.char.empty,
      listClass : _K.char.empty,
      listFlow  : _a.vertical,
      flow      : _a.horizontal
    });
    return this.declareHandlers(); //s({ui:@})
  }
// ========================
//
// ========================

// ===========================================================
// onBeforeAddChild
//
// @param [Object] child
//
// ===========================================================
  onBeforeAddChild(child) {
    return child.initHandlers({ui:this});
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
__composite.initClass();
module.exports = __composite;
