class __exported__ extends Marionette.Behavior {
  initialize(opt) {
    return $(document).on(_e.drop, this._forbiden);
  }

// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy(){
    return $(document).off(_e.drop, this._forbiden);
  }

// ===========================================================
// _forbiden
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  _forbiden(e){
    e.preventDefault();
    this.debug("Drop fallback");
    return false;
  }
}
    
module.exports = __exported__;
