/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/button/blank
//   TYPE :
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// _exported
//
// @param [Object] key
//
// @return [Object]
//
// ===========================================================
const __skl_button_blank = function(key, ext) {
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
      simple: {
        picto  : _K.string.empty
      },
      raw: {
        picto  : _K.string.empty,
        templateName: _T.wrapper.raw,
        label: _K.string.empty
      },
      base: {
        picto  : _K.string.empty,
        className : "margin-auto-v"
      },
      round: {
        className : "margin-auto-v",
        templateName:"#--button-trigger-new",
        label   : _K.char.empty
      },
      png: {
        picto  : `static/images/drumee/pictos/${service}-large@3x.png`,
        //service:  ext?.label?.toLocaleLowerCase() || _K.char.empty
        innerClass : "label-center font-size-18",
        templateName:"#--button-trigger-new"
      },
      svg: {
        picto  : `static/images/drumee/pictos/${service}-large@3x.png`,
        //service:  ext?.label?.toLocaleLowerCase() || _K.char.empty
        innerClass : "label-center font-size-18",
        templateName:"#--button-trigger-new"
      }
    };
    let target = a[key];
    const label = _I[key.toUpperCase()] || _K.char.empty;
    if ((target == null)) {
      target =
        {label};
    } else if ((target.label == null)) {
      target.label = label;
    }
    target.kind = KIND.button.blank;
    if (_.isObject(ext)) {
      _.extend(target, ext);
    }
    return target;
  };
module.exports = __skl_button_blank;