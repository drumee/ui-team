/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/reader/input
//   TYPE :
// ==================================================================== *


const _default_class = "drumee-widget inut-reader";
//-------------------------------------
// 
//-------------------------------------
class __input extends WPP_Entry {
  static initClass() {
    this.prototype.templateName = _T.wrapper.input_label;
    this.prototype.nativeClassName = _default_class;
  }

// ===========================================================
// initialize
//
// ===========================================================
  initialize(opt) {
    //@options.slurp = 1
    super.initialize(opt);
    return this.model.atLeast({
      type         : _a.text,
      chartId      : _K.char.empty,
      content      : _K.char.empty,
      labelClass   : _K.char.empty,
      entryClass   : _K.char.empty,
      value        : _K.char.empty
    });
  }
}
__input.initClass();
    //@debug "KKJJJSJSSJSJ", @model.get(_a.belongTo), @model.get(_a.belongTo)

// # ===========================================================
// # _onAlsoClick
// #
// # @param [Object] e
// #
// # ===========================================================
//   _onAlsoClick: (e) ->
//     @triggerMethod _e.also.click, e

module.exports = __input;
