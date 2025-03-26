/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/toggle-v2
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// __btn_toogle_v2
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __btn_toogle_v2 = function(key, ext, style) {
  if (key == null) { key = _a.toggle; }
  const a= {
    slide: {
      className : "cursor-pointer",
      label:_K.string.empty,
      service : _e.slide,
      state: 1,
      pictos: {
        1: _p.angle.left,
        0: _p.angle.right
      }
    },
    toggle: {
      label:LOCALE.CONTEXTMENU,
      state: 0,
      service : _e.toggle,
      pictos: {
        0: _p.toggle_off,
        1: _p.toggle_on
      }
    }
  };
  const target = a[key] || {};
  target.kind = KIND.button.toggle;
  target.signal = _e.ui.event;
  target.className = target.className || "padding-10";
  if ((target.service == null)) {
    target.service = key;
  }
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  if (_.isObject(style)) {
    target.styleOpt = target.styleOpt || {};
    _.extend(target.styleOpt, style);
  }
  return target;
};
module.exports = __btn_toogle_v2;