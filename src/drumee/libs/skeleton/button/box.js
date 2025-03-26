/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/box
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
const _exported = function(key, ext) {
    let service;
    if (key == null) { key = _a.base; }
    if ((ext != null ? ext.service : undefined)) {
      ({
        service
      } = ext);
    } else {
      service = 'update';
    }
    const style = {
      width:_a.auto,
      height:_a.auto
    };
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
    let target = a[key];
    const label = _I[key.toUpperCase()] || _K.char.empty;
    if ((target == null)) {
      target =
        {label};
    } else if ((target.label == null)) {
      target.label = label;
    }
    //if not target.picto?
    //  target.picto = Utils.getPicto(key)
    target.service = key;
    target.justify = _a.left;
    target.kind = KIND.composite;
    target.signal = target.signal || _e.ui.event;
    target.styleOpt = target.styleOpt || style;
    if (_.isObject(ext)) {
      _.extend(target, ext);
    }
    return target;
  };
module.exports = _exported;
