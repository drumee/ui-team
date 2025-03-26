/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/popup
//   TYPE : 
// ==================================================================== *

//-------------------------------------
//
//
//-------------------------------------
class __popup_ extends LetcBox {
  static initClass() {
    this.prototype.className  = "widget popup";
    this.prototype.behaviorSet =
      {popup    : _K.char.empty};
  }

// ===========================================================
// onDomRefresh
//
// @param [Object] child
//
// ===========================================================
  onDomRefresh(child) {
    return this.$el.css({
      overflow : _a.hidden});
  }

// ===========================================================
// onClose
//
// ===========================================================
  onClose() {
    return this.children.each(c => {
      return c.triggerMethod("die");
    });
  }
}
__popup_.initClass();
module.exports = __popup_;
