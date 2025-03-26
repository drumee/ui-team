/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/trigger
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// __skl_btn_trigger
//
// @param [Object] key
//
// @return [Object] 
//
// ===========================================================
const __skl_btn_trigger = function(key, text, ext, style) {
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
    form_soc: {
      label  : _I.SOC_NET
    },
    base: {
      picto  : _K.char.empty,
      label  : _K.char.empty
    },
    info: {
      label  : _K.char.empty,
      picto  : _p.info
    },
    lnk_vdo: {
      label  : _I.VIDEO
    },
    lnk_site: {
      label  : _I.SITE
    },
    lnk_soc: {
      label  : _I.SOC_NET
    },
    logout: {
      picto  : _p.power_off
    },
    misc: {
      label  : _I.MISC
    },
    redraw: {
      label  : _I.REDRAW,
      picto  : _p.refresh
    },
    sign_up: {
      label  : _I.LOGIN
    },
    blank: {
      picto  : _K.char.empty,
      label  : _K.char.empty
    },
    login    : {
      picto  : _p.power_off,
      signal : _e.submit,
      justify: _a.center,
      className : "entry-form__btn u-jc-center u-ai-center",
      sys_pn  : _a.trigger,
      label : "Log in"
    }, //_K.char.empty
    close    : {
      picto  : _p.check_circle,
      signal : _e.close,
      sys_pn  : "acknowledge",
      className : "box-shadow margin-5",
      styleOpt: {
        width: _a.auto,
        height: "36px",
        'border-radius': _K.size.px5,
        padding: _K.size.px10
      }
    },
    png: {
      picto  : `static/images/drumee/pictos/${service}-large@3x.png`,
      //service:  ext?.label?.toLocaleLowerCase() || _K.char.empty
      innerClass : "label-center font-size-18",
      templateName:"#--button-trigger-new"
    },
    other : {
      picto  : _p.power_off,
      signal : _e.submit,
      justify: _a.center,
      className : "login-btn",
      sys_pn    : _a.trigger,
      label     : text
    }
  };
  const target = a[key] || a.other;
  target.label = target.label || _I[key.toUpperCase()] || key || text || _K.char.empty;
  //if not target.picto?
  //  target.picto = Utils.getPicto(key)
  target.service = key;
  target.kind = KIND.button.trigger;
  target.signal = target.signal || _e.ui.event;
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  return target;
  if (_.isObject(style)) {
    target.styleOpt = target.styleOpt || {};
    return _.extend(target.styleOpt, style);
  }
};
module.exports = __skl_btn_trigger;