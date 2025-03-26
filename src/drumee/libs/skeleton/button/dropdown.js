/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/dropdown
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// __skl_dropdown
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skl_dropdown = function(key, label, ext, style) {
    if (key == null) { key = _a.base; }
    const a= {
      base: {
        label  : _I.ALIGN
      },
      style: {
        label  : _I.STYLE
      }
    };
    label = label || _I[label] || _I[key] || _K.char.empty;
    const target = a[key] || {};
    target.label = label;
    target.template = _T.button.nested;
    //if not target.picto?
    //  target.picto = Utils.getPicto(key)
    target.service = key;
    target.justify = _a.left;
    target.kind = KIND.button.nested;
    target.signal = target.signal || _e.ui.event;
    if (_.isObject(ext)) {
      _.extend(target, ext);
    }
    if (_.isObject(style)) {
      target.styleOpt = target.styleOpt || {};
      _.extend(target.styleOpt, style);
    }
    return target;
  };
module.exports = __skl_dropdown;