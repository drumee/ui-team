// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/modal
//   TYPE : 
// ==================================================================== *


// ===========================================================
// _exported
//
// @param [Object] letc
//
// @return [Object] 
//
// ===========================================================
const _exported = function(letc) {
  //button = require('skeleton/button/trigger')
  //mini_btn = require('skeleton/button/trigger-mini')
  try {
    letc.styleOpt[_a.maxHeight] = router.viewPortHeight - (100).px();
    letc.styleOpt[_a.minHeight] = (300).px();
  } catch (error) {}
  const mini_opt = {
    kind:KIND.button.trigger,
    picto:_p.times,
    signal : _e.close,
    styleOpt: {
      color: 'red'
    }
  };
  const a = {
    flow:_a.vertical,
    persistence: _a.none,
    className : `${_C.box_shadow} ${_C.bg.white}`,
    showIn : _a.modal,
    styleOpt: {
      width  : _K.size.full,
      height : _a.auto,
      "min-width": _K.size.px200,
      padding : _K.size.px10
    },
    kids:[{
      kind:KIND.box,
      flow:_a.horizontal,
      className:'popup-header',
      sys_pn: _a.header,//_a.front
      justify   : _a.end,
      styleOpt: {
        width:_K.size.full,
        height:_K.size.full
      },
      kids:[SKL_Button_TriggerMini(_e.close, mini_opt)]
    },{
      kind:KIND.box,
      flow:_a.vertical,
      className:'popup-body',
      sys_pn: _a.body,//_a.front
      styleOpt: {
        width:_K.size.full,
        height:_K.size.full
      },
      kids:[letc]
    },{
      kind    : KIND.box,
      flow      : _a.horizontal,
      className : 'popup-footer',
      sys_pn  : _a.footer, //_a.back
      justify   : _a.center,
      styleOpt: {
        width:_K.size.full,
        height:_K.size.full
      },
      kids:[SKL_Button_Trigger(_e.close)]
    }]
  };
  return a;
};
module.exports = _exported;