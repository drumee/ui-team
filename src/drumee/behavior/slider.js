/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/behavior/slider
//   TYPE :
// ==================================================================== *

// ===========================================================
//
//
// ===========================================================
const __bhv_slider = function() {
  return {
    onRender:() => {
      //_m.debug ">>==ee onRender  Behavior.Slider", @view
      const styleOpt = this.view.get(_a.styleOpt);
      if (styleOpt != null) {
        this.$el.css(styleOpt);
      }
      if (this.view._anim_data != null) {
        const anim = this.view.get(_a.anim);
        if (anim != null) {
          let str = '';
          for (var k in anim) {
            var v = anim[k];
            str = `${str}${k}: ${v}; `;
          }
          //_m.debug ">>==ee onRender ANIM", str
          return this.$el.attr(this.view._anim_data, str);
        }
      }
    }
  };
};

module.exports = __bhv_slider;
