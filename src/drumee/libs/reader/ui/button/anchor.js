class __btn_anchor extends Marionette.View {

  static initClass() {
    this.prototype.templateName = _T.button.anchor;
    this.prototype.className  = "widget button-anchor";
    this.prototype.tagName    = _K.tag.a;
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    if (this.getOption(_a.modelArgs)) {
      this.model.set(this.getOption(_a.modelArgs));
    }
    return this.model.atLeast({
      url   : _K.char.empty,
      label : _K.char.empty,
      picto : _K.char.empty,
      href  : _K.char.empty,
      innerClass : _C.margin.auto
    });
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    //@debug "ZERRRRé onDomRefresh", @get(_a.url), @template, @get(_a.template)
    return this.$el.attr(_a.href, this.get(_a.url));
  }
}
__btn_anchor.initClass();
module.exports = __btn_anchor;
