class __exported__ extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this._changePicto = this._changePicto.bind(this);
    this.onSpinnerStart = this.onSpinnerStart.bind(this);
    this.onSpinnerStop = this.onSpinnerStop.bind(this);
    this.onClear = this.onClear.bind(this);
  }

  onRender(){
    this._pictoClass = this.view.model.get(_a.picto);
    if (this.ui.picto != null) {
      return this.ui.picto.on(_e.click, this.view._erase);
    }
  }
// ============================
//
// ============================

// ===========================================================
// _changePicto
//
// @param [Object] event
//
// @return [Object] 
//
// ===========================================================
  _changePicto(event) {
    if ((this.ui.picto == null)) {
      return;
    }
    _dbg('>>WWGET _changePicto = ', event);
    try {
      switch (event) {
        case _e.pipe.start:
          this.ui.picto.removeClass(this._pictoClass);
          this.ui.picto.removeClass(_p.times);
          return this.ui.picto.addClass(_p.spinner);
        case _e.pipe.end:
          this.ui.picto.removeClass(_p.spinner);
          if (this.view.model.get(_a.value).length) {
            this.ui.picto.removeClass(this._pictoClass);
            return this.ui.picto.addClass(_p.times);
          }
          break;
        default:
          this.ui.picto.removeClass(_p.times);
          this.ui.picto.removeClass(_p.spinner);
          return this.ui.picto.addClass(this._pictoClass);
      }
    } catch (error) {}
  }
// ============================
//
// ============================

// ===========================================================
// onSpinnerStart
//
// ===========================================================
  onSpinnerStart() {
    return this._changePicto(_e.pipe.start);
  }
// ============================
//
// ============================

// ===========================================================
// onSpinnerStop
//
// ===========================================================
  onSpinnerStop() {
    return this._changePicto(_e.pipe.end);
  }
// ============================
//
// ============================

// ===========================================================
// onClear
//
// ===========================================================
  onClear() {
    return this._changePicto();
  }
}
module.exports = __exported__;
