/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/nested
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// __skl_btn_nested
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skl_btn_nested = function(key, ext, style) {
    let service;
    if (key == null) { key = _a.base; }
    if ((ext != null ? ext.service : undefined)) {
      ({
        service
      } = ext);
    } else {
      service = 'update';
    }
    const a= {
      justify: {
        label  : _I.ALIGN
      },
      style: {
        label  : _I.STYLE
      },
      "font-family" : {
        label  : _I.FONT_FAMILY
      },
      "font-size" : {
        label  : _I.FONT_SIZE
      },
      lang    : {
        picto  : _p.check_circle,
        signal : _e.close
      },
      png: {
        picto  : `static/images/drumee/pictos/${service}-large@3x.png`,
        innerClass : "label-center font-size-18",
        templateName:"#--button-trigger-new"
      }
    };
    const target = a[key] || {};
    const label = _I[key.toUpperCase()] || _K.char.empty;
    if ((target.label == null)) {
      target.label = label;
    }
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
module.exports = __skl_btn_nested;