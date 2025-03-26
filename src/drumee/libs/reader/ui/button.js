/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/ui/button
//   TYPE : 
// ==================================================================== *

//_state =
//  0         : 0
//  1         : 1
//  false     : 0
//  true      : 1
//  no        : 0
//  yes       : 1
//  undefined : 0
//-------------------------------------
//
// Mdia.svg
//-------------------------------------
class __button extends Marionette.View {
  static initClass() {
  // 
    this.prototype.templateName = "#--button-entry";
    this.prototype.className  = 'button-entry__widget';
    this.prototype.ui =
      {entry : ".button-entry"};
    this.prototype.events  = {
      click   : Backbone.View.prototype.triggerHandlers,
      'keyup .button-entry'      : '_keyup',
      'mouseleave .button-entry' : '_mouseleave'
    };
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    this._id = _.uniqueId('button-');
    this.model.set(_a.widgetId, this._id);
    return this.model.atLeast({
      innerClass : _K.char.empty,
      label      : _K.char.empty
    });
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    return this.declareHandlers(); //s()
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _keyup
//
// @param [Object] e
//
// ===========================================================
  _keyup(e) {
    return this.debug("_keyup", e);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _edit
//
// @param [Object] state
//
// ===========================================================
  _edit(state) {
    if (this.get(_a.editable)) {
      this._editing = state;
      return this.ui.entry.attr(_a.contenteditable, this._editing);
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _mouseleave
//
// @param [Object] e
//
// ===========================================================
  _mouseleave(e) {
    this.debug("_mouseleave", e);
    return this._edit(false);
  }

// ===========================================================
// _onAlsoClick
//
// @param [Object] e
//
// ===========================================================
  onAlsoClick(e) {
    return this._edit(true);
  }
}
__button.initClass();

module.exports = __button;
