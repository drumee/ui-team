class image extends Image.Base {
  constructor(...args) {
    super(...args);
    this._click = this._click.bind(this);
    this._mouseenter = this._mouseenter.bind(this);
    this._mouseleave = this._mouseleave.bind(this);
  }

  _click(e) {
    return e.stopPropagation();
  }
//============================
// _mouseenter
//===========================

// ===========================================================
// _mouseenter
//
// @param [Object] e
//
// ===========================================================
  _mouseenter(e) {
    return e.stopPropagation();
  }
//============================
// _mouseenter
//===========================

// ===========================================================
// _mouseleave
//
// @param [Object] e
//
// ===========================================================
  _mouseleave(e) {
    return e.stopPropagation();
  }
}
