class __bhv_scroll extends Marionette.Behavior {
// ========================
// onDomRefresh
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._scroll = this._scroll.bind(this);
  }

  onDomRefresh() {
    return this.$el.on(_e.scroll,  _.throttle(this._scroll, 200));
  }
// ========================
// _scroll
// ========================

// ===========================================================
// _scroll
//
// @param [Object] e
//
// ===========================================================
  _scroll(e){
    return this.view.fireEvent(_e.scroll, e);
  }
}
module.exports = __bhv_scroll;
