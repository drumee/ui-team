/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/behavior/bubble
//   TYPE : 
// ==================================================================== *

//########################################
// CLASS : Behavior.modal
// Common behaviors for modal windows
//########################################
class __bhv_bubble extends Marionette.Behavior {
// ============================================
// pass upstream the event
// ============================================

// ===========================================================
// onChildCallback
//
// @param [Object] child
//
// ===========================================================
  onChildCallback(child) {
    return this.view.trigger(_e.callback, child);
  }
// ============================================
// pass upstream the event
// ============================================

// ===========================================================
// onChildNewline
//
// @param [Object] child
//
// ===========================================================
  onChildNewline(child) {
    return this.view.trigger(_e.newline, child);
  }
// ============================================
// pass upstream the event
// ============================================

// ===========================================================
// onChildUpdate
//
// @param [Object] child
// @param [Object] s
//
// ===========================================================
  onChildUpdate(child, s) {
    return this.view.trigger(_e.update, child);
  }
// ============================================
// pass upstream the event
// ============================================

// ===========================================================
// onChildClose
//
// @param [Object] child
//
// ===========================================================
  onChildClose(child) {
    return this.view.trigger(_e.close, child);
  }
// ============================================
// pass upstream the event
// ============================================

// ===========================================================
// onChildEscape
//
// @param [Object] child
//
// ===========================================================
  onChildEscape(child) {
    return this.view.trigger(_e.escape, child);
  }
// ============================================
// pass upstream the event
// ============================================

// ===========================================================
// onChildCancel
//
// @param [Object] child
//
// ===========================================================
  onChildCancel(child) {
    return this.view.trigger(_e.cancel, child);
  }
// ============================================
// pass upstream the event
// ============================================

// ===========================================================
// onChildEnter
//
// @param [Object] child
//
// ===========================================================
  onChildEnter(child) {
    return this.view.trigger(_e.enter, child);
  }
// ============================================
// pass upstream the event
// ============================================

// ===========================================================
// onChildSubmit
//
// @param [Object] child
//
// ===========================================================
  onChildSubmit(child) {
    return this.view.trigger(_e.submit, child);
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildBubble
//
// @param [Object] child
//
// @return [Object] 
//
// ===========================================================
  onChildBubble(child) {
    const handler = child != null ? child._handler.ui : undefined;
    if ((handler == null)) {
      this.view.trigger(_e.buble, child);
      return;
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildError
//
// @param [Object] child
//
// ===========================================================
  onChildError(child) {
    //@debug ">>2 BOX onChildError", child
    return this.view.trigger(_e.error, child);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onChildRadio
//
// @param [Object] child
//
// @return [Object] 
//
// ===========================================================
  onChildRadio(child) {
    if ((child == null)) {
      this.view.children.each(c => c.$el.attr(_a.data.radio, _a.off));
      return;
    }
    return this.view.children.each(function(c){
      if (c.model.cid === child.model.cid) {
        return c.$el.attr(_a.data.radio, _a.on);
      } else {
        return c.$el.attr(_a.data.radio, _a.off);
      }
    });
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onRadioReset
//
// @param [Object] state=_a.off
//
// ===========================================================
  onRadioReset(state) {
    if (state == null) { state = _a.off; }
    return this.view.children.each(function(c){
      c.$el.attr(_a.data.radio, state);
      return c.triggerMethod(_e.radio.reset, state);
    });
  }
}
module.exports = __bhv_bubble;
