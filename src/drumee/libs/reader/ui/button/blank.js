/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/ui/button/blank
//   TYPE :
// ==================================================================== *

//-------------------------------------
//
// UI.Button.Blank
//-------------------------------------
//########################################
//
//########################################
class __btn_blank extends Marionette.View {
  static initClass() {
    this.prototype.templateName = _T.button.trigger;
    this.prototype.figName  = "btn_blank";
  }

// ===========================================================
//
// ===========================================================
  initialize() {
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    //_dbg "Button.Reader.Blank", @, @model, @options
    return this.model.atLeast({
      listClass : _K.char.empty,
      flow      : _a.horizontal,
      label     : _K.char.empty,
      picto     : _K.char.empty,
      justify   : _a.left,
      active    : false
    });
  }
}
__btn_blank.initClass();
module.exports = __btn_blank;
