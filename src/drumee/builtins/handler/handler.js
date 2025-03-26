
class handler_base extends Marionette.View {

  control(action) {
    if ((action == null)) {
      return this._state;
    }
    this._state = action;
    return this._state;
  }
// ======================================================
//
// ======================================================

// ===========================================================
// isRunning
//
// @return [Object] 
//
// ===========================================================
  isRunning() {
    return (this._state === _a.on);
  }
}
module.exports = handler_base;
