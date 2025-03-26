/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/menu/wrapper
//   TYPE : 
// ==================================================================== *

const _default_class = "checkbox drumee-widget";
class __checkbox extends LetcBox {
  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = _default_class;
    this.prototype.options    =
      {radio   : _a.parent};
  }

 
// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    return this.model.set({
      radio        : _a.on});
  }


// ===========================================================
// onRenderCollection
//
// ===========================================================
  // onRenderCollection: () ->
  //   @children.each (c)=>
  //     c._wrapper = @


// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    //@debug "MKJKJJJJJ", @el, @
    this.declareHandlers(); //s({part:@, ui:@}, {recycle:yes})
    return this.el.setAttribute(_a.id, this._id);
  }
}
__checkbox.initClass();



module.exports = __checkbox;
