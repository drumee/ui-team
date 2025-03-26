// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/popup
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_form_popup
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const __skl_form_popup = function(model) {
  const mini_opt = {
    kind:KIND.button.trigger,
    picto:_p.times,
    signal : _e.close,
    styleOpt: {
      color: "red"
    }
  };
  const a = {
    kind:KIND.form,
    flow:_a.vertical,
    persistence: model.get(_a.persistence) || _a.none,
    className : `${_C.box_shadow} ${_C.bg.white}`,
    justify: 'between',
    showIn : _a.modal,
    styleOpt: {
      width  : _K.size.full,
      height : _a.auto,
      "min-width": _K.size.px200,
      padding : _K.size.px10,
      position : _a.absolute
    },
    kids:[{
      kind:KIND.box,
      flow:_a.horizontal,
      className:'popup-header',
      sys_pn: _a.header,//_a.front
      justify   : _a.end,
      styleOpt: {
        width:_K.size.full,
        height:_K.size.px50
      },
      kids:[SKL_Button_TriggerMini(_e.close, mini_opt)]
    },{
      kind:KIND.box,
      flow:_a.vertical,
      className:'popup-body',
      sys_pn: _a.body,//_a.front
      styleOpt: {
        width:_K.size.full,
        height:_a.auto
      },
      kids:[{
        kind:KIND.note,
        className : model.get(_a.className),
        content   : model.get(_a.content),
        flow      : _a.horizontal,
        justify   : _a.center,
        styleOpt: {
          width:_K.size.full,
          height:_a.auto
        }
      }]
    },{
      kind    : KIND.box,
      flow      : _a.horizontal,
      className : 'popup-footer',
      sys_pn  : _a.footer, //_a.back
      justify   : _a.center,
      styleOpt: {
        width:_K.size.full,
        height:_K.size.px50
      },
      kids:[SKL_Button_Trigger(_e.close)]
    }]
  };
  return a;
};
module.exports = __skl_form_popup;