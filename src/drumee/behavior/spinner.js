class __bhv_spin extends Marionette.Behavior {
  constructor(...args) {
    this.onDestroy = this.onDestroy.bind(this);
    this._start = this._start.bind(this);
    this._stop = this._stop.bind(this);
    super(...args);
  }

  initialize(opt){
    return RADIO_BROADCAST.on(_e.pipe.end, this._stop);
  }
// ============================================
//
// ============================================

// ===========================================================
// getSpinner
//
// ===========================================================
  getSpinner() {
    this.fullScreen = false;
    if (this.view.spinnerRegion != null) {
      //#_dbg "KKKK SSSOOOOOO"
      return this.spinner = this.view.spinnerRegion;
    } else {
      //#_dbg "KKKKSSS GGGGGG"
      this.spinner = dui.spinnerRegion;
      return this.fullScreen = true;
    }
  }
// ============================
//
// ============================

// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy() {
    RADIO_BROADCAST.off(_e.pipe.end, this._stop);
    this.getSpinner();
    //#_dbg "<<KKKK spinner ... DESTROY", @spinner
    //dui.debug.spinner
    if (this.spinner != null) {
      return this.spinner.empty();
    }
  }
// ============================
//
// ============================

// ===========================================================
// _start
//
// ===========================================================
  _start(){
    this.view.is_running = true;
//      if @view.ui?.spinner?
//        @view.ui.spinner.toggleClass("fa-spinner fa-spin")
    const spinner = new LightSpinner();
    this.getSpinner();
    this.spinner.show(spinner);
    return RADIO_BROADCAST.trigger(_e.pipe.start);
  }
// ============================
//
// ============================

// ===========================================================
// _stop
//
// ===========================================================
  _stop(){
//      _dbg "<<KKKK spinner ... _stop", @
//      if @view.ui?.spinner?
//        @view.ui.spinner.toggleClass("fa-spinner fa-spin")
    if (this.spinner != null) {
      this.spinner.empty();
    }
    return this.view.is_running = false;
  }
// ============================
//
// ============================

// ===========================================================
// onPipeStart
//
// ===========================================================
  onPipeStart(){
    _dbg("<<KKKK spinner... onPipeStart");
    return this._start();
  }
//  # ============================
//  #
//  # ============================

// ===========================================================
// #    onPipeSucceeded
//
// @param [Object] xhr
//
// ===========================================================
//    onPipeSucceeded:(xhr)->
//      #_dbg "<<KKKK spinner... onPipeSucceeded"
//      #@_stop()
// ============================
//
// ============================

// ===========================================================
// onPipeFailed
//
// @param [Object] xhr
//
// ===========================================================
  onPipeFailed(xhr){
//      _dbg ">>QQHH SPINNER onPipeFailed, hash=#{location.hash}", xhr
    this._stop();
    RADIO_BROADCAST.trigger(_e.spinner.stop);
    return RADIO_BROADCAST.trigger(_e.pipe.end);
  }
// ============================
//
// ============================

// ===========================================================
// onPipeEnd
//
// ===========================================================
  onPipeEnd(){
    //_dbg "KKKK spinner... onPipeEnd"
    this._stop();
    RADIO_BROADCAST.trigger(_e.spinner.stop);
    return RADIO_BROADCAST.trigger(_e.pipe.end);
  }
// ============================
//
// ============================

// ===========================================================
// onFormSucceeded
//
// ===========================================================
  onFormSucceeded(){
    //_dbg "KKKK spinner... onFormSucceeded"
    return this._stop();
  }
// ============================
//
// ============================

// ===========================================================
// onFormFailed
//
// ===========================================================
  onFormFailed(){
    return this._stop();
  }
}
    //_dbg "KKKK spinner... onFormFailed"
module.exports = __bhv_spin;
