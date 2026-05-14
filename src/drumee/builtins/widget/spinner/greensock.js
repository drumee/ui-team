class __spinner_greensock extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.onRender = this.onRender.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.image
  //   className: "xia-spinner"
  //   ui:
  //     image : 'img'
  // 
    this.prototype.templateName = _T.wrapper.image;
    this.prototype.className = "xia-spinner";
    this.prototype.ui =
      {image : 'img'};
  }
// ============================
//
// ============================

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this.model.set(_a.src, "images/icons/drumee-smiley-184.png");
    return this._size  = this.getOption(_a.size)  || this.model.get(_a.size) || _a.small;
  }

// ===========================================================
//
// ===========================================================
  onBeforeDestroy() {
    return this.$el.parent().attr(_a.data.state, _a.closed);
  }

// ============================
//
// ============================
  onRender() {
    super.onRender();
    TweenMax.set(this.$el, dui.request(_REQ.ui.gsSpinner, this._size));
    return this.ui.image.css(dui.request(_REQ.ui.gsSpinner, this._size));
  }
    
// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    let tween;
    this.$el.parent().attr(_a.data.state, _a.open);
    return tween = TweenMax.to(this.$el, 2, {rotation:355, repeat:-1, repeatDelay:0.1, ease:Linear.easeInOut});
  }
}
__spinner_greensock.initClass();

module.exports = __spinner_greensock;
