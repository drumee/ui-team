class __modal extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onClose = this.onClose.bind(this);
    this._close = this._close.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className : "modal-box"
  // 
  // #  behaviorSet
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "modal-box";
  }
//  behaviorSet
//    bhv_anim : _K.char.empty
// ============================================
//
// ============================================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    if ((this.model == null)) {
      this.model = new Backbone.Model(opt);
    }
    if ((this.collection == null)) {
      this.collection = new Backbone.Collection();
    }
    this.model.atLeast({
      anim : require('options/anim/slide/up')(this)});
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
    const skl = this.get(_a.skeleton) || require('skeleton/popup/modal');
    return this.collection.set(skl(this.get(_a.kids)));
  }
// ============================================
//
// ============================================

// ===========================================================
// onClose
//
// ===========================================================
  onClose() {
    const tl = new TimelineMax({onComplete: this._close});
    return tl.to(this.$el, 1.5, {y:-50, autoAlpha:0});
  }
// ============================================
//
// ============================================

// ===========================================================
// _close
//
// ===========================================================
  _close() {
    return this.destroy();
  }
}
__modal.initClass();
module.exports = __modal;
