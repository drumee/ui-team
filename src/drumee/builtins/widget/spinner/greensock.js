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
    // KILL THE TWEEN, or it outlives the widget. `onDomRefresh` starts a
    // `repeat:-1` rotation, which never completes on its own: GSAP keeps its own
    // reference to the (now detached) element and goes on ticking it for the
    // life of the page. Every List.Smart with `spinner:true` mounts one of these
    // per fetch, so a long session accumulates one immortal tween per spinner
    // ever shown.
    //
    // The cost is not the rotation itself. Each tick re-initialises a transform
    // tween, and GSAP's init reads the computed matrix
    // (_getComputedProperty -> _getComputedTransformMatrixAsArray), which
    // FLUSHES PENDING STYLE for the whole document. Measured on a production
    // trace (2026-09-15): 492 forced style recalcs, ~7,400 elements each,
    // 36.5s of a 38s style-recalc budget, with _getComputedProperty alone at
    // 15.0s of self time.
    if (this._tween) {
      this._tween.kill();
      this._tween = null;
    }
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
    this.$el.parent().attr(_a.data.state, _a.open);
    // Held on `this` so onBeforeDestroy can kill it. It used to land in a local
    // `tween` that went out of scope immediately, which is why nothing could
    // ever stop it.
    this._tween = TweenMax.to(this.$el, 2, {rotation:355, repeat:-1, repeatDelay:0.1, ease:Linear.easeInOut});
    return this._tween;
  }
}
__spinner_greensock.initClass();

module.exports = __spinner_greensock;
