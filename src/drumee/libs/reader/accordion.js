/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/accordion
//   TYPE : 
// ==================================================================== *

//-------------------------------------
//
// Accordion
//-------------------------------------
class accordion extends LetcBox {
  static initClass() {
    this.prototype.className  = `${_a.box} qna reader`;
  }

// ===========================================================
// _childCreated
//
// @param [Object] child
//
// ===========================================================
  _childCreated(child) {
    if (child.model.get(_a.type) === _a.answer) {
      this.answer = child;
      child.$el.css({
        position : _a.absolute,
        visibility : _a.hidden,
        overflow   : _a.hidden
      });
      const anim = this.answer.model.get(_a.anim);
      if ((anim != null ? anim.settings : undefined) != null) {
        return this._accordion = eval(anim.settings.accordion);
      }
    }
  }

// ===========================================================
// onChildQuestion
//
// @param [Object] child
//
// @return [Object] 
//
// ===========================================================
  onChildQuestion(child) {
    _dbg("ZERZEZE", this._accordion, child);
    if (!this._accordion) {
      return;
    }
    return this.answer.triggerMethod('toggle');
  }
}
accordion.initClass();
module.exports = accordion;
