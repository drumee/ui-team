/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/ui/button/broadcast
//   TYPE : 
// ==================================================================== *

//-------------------------------------
//
// btn_broadcast
//-------------------------------------
class __btn_broadcast extends Marionette.View {
  static initClass() {
    this.prototype.templateName = _T.button.trigger;
    this.prototype.className  = "widget button-broadcast";
  }
// ===========================================================
// onClick
//
// @param [Object] model
//
// ===========================================================
  onClick(model) {
    _dbg(">>MM onClick Button.Broadcast", this);
    const signal = this.get(_a.signal);
    const source = this.get(_a.source) || this;
    return RADIO_BROADCAST.trigger(signal, source);
  }
}
__btn_broadcast.initClass();
module.exports = __btn_broadcast;
